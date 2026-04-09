const express = require('express');
const { query } = require('express-validator');
const { Article, User, Follow, Clap } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: Calculate article score for personalization
function calculateArticleScore(article, user, followedUsers) {
  let score = 0;
  
  // Recency (exponential decay over 30 days)
  const daysOld = Math.min(30, (Date.now() - new Date(article.publishedAt)) / (24 * 60 * 60 * 1000));
  score += Math.exp(-daysOld / 7) * 100;
  
  // Engagement weight
  score += (article.stats.claps || 0) * 0.5;
  score += (article.stats.comments || 0) * 1;
  score += (article.stats.views || 0) * 0.01;
  
  // Following bonus
  if (followedUsers.some(id => id.equals(article.authorId._id))) {
    score += 150;
  }
  
  // Interest match (if user has interests)
  if (user && user.interests && user.interests.length > 0) {
    const tagOverlap = article.tags.filter(tag => 
      user.interests.includes(tag)
    ).length;
    score += tagOverlap * 30;
  }
  
  return score;
}

// Personalized "For You" feed
router.get('/for-you', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 50 }).default(20)
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get user's followed users
    let followedUserIds = [];
    if (req.user) {
      const follows = await Follow.find({ 
        followerId: req.user._id,
        type: 'user'
      });
      followedUserIds = follows.map(f => f.followingId);
    }
    
    // Get candidate articles (published in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const candidates = await Article.find({
      status: 'published',
      publishedAt: { $gte: thirtyDaysAgo }
    })
      .populate('authorId', 'username displayName avatar')
      .lean();
    
    // Score and sort articles
    const scored = candidates.map(article => ({
      article,
      score: calculateArticleScore(article, req.user, followedUserIds)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Paginate
    const paginated = scored.slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      data: paginated.map(s => s.article),
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: skip + paginated.length < scored.length,
        total: scored.length
      }
    });
  } catch (error) {
    console.error('For you feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate feed'
    });
  }
});

// Trending feed
router.get('/trending', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 50 }).default(20),
  query('period').optional().isIn(['day', 'week', 'month']).default('week')
], async (req, res) => {
  try {
    const { page = 1, limit = 20, period = 'week' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Calculate time window
    const periods = {
      day: 1,
      week: 7,
      month: 30
    };
    const daysAgo = periods[period];
    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Get articles with high engagement
    const articles = await Article.find({
      status: 'published',
      publishedAt: { $gte: cutoffDate }
    })
      .populate('authorId', 'username displayName avatar')
      .lean();
    
    // Score by engagement rate (claps + comments per view)
    const scored = articles.map(article => {
      const engagement = (article.stats.claps || 0) + (article.stats.comments || 0) * 2;
      const views = article.stats.views || 1;
      const engagementRate = engagement / views;
      
      // Weight by recency
      const daysOld = (Date.now() - new Date(article.publishedAt)) / (24 * 60 * 60 * 1000);
      const recencyBoost = Math.exp(-daysOld / 3);
      
      return {
        article,
        score: engagementRate * 100 + recencyBoost * 50
      };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const paginated = scored.slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      data: paginated.map(s => s.article),
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: skip + paginated.length < scored.length,
        total: scored.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending'
    });
  }
});

// Following feed
router.get('/following', authMiddleware, [
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 50 }).default(20)
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get followed users
    const follows = await Follow.find({
      followerId: req.user._id,
      type: 'user'
    });
    const followedIds = follows.map(f => f.followingId);
    
    if (followedIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { page: 1, limit: 20, hasMore: false, total: 0 }
      });
    }
    
    const articles = await Article.find({
      status: 'published',
      authorId: { $in: followedIds }
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('authorId', 'username displayName avatar')
      .lean();
    
    const total = await Article.countDocuments({
      status: 'published',
      authorId: { $in: followedIds }
    });
    
    res.json({
      success: true,
      data: articles,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: skip + articles.length < total,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following feed'
    });
  }
});

module.exports = router;
