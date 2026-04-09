const express = require('express');
const { body } = require('express-validator');
const { User, Article, Follow, Bookmark } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get public profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase()
    }).select('-passwordHash -refreshTokens -email -googleId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get recent articles
    const articles = await Article.find({
      authorId: user._id,
      status: 'published'
    })
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('title subtitle slug coverImage readTime stats publishedAt');
    
    res.json({
      success: true,
      data: {
        profile: user,
        articles
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update profile
router.put('/me', authMiddleware, [
  body('displayName').optional().trim().isLength({ max: 50 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('avatar').optional().isURL(),
  body('interests').optional().isArray().custom(arr => arr.length <= 20)
], async (req, res) => {
  try {
    const { displayName, bio, avatar, interests } = req.body;
    
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (interests !== undefined) updates.interests = interests.slice(0, 20).map(i => i.toLowerCase());
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-passwordHash -refreshTokens');
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get my articles (drafts + published)
router.get('/me/articles', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { authorId: req.user._id };
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const articles = await Article.find(query)
      .sort({ [status === 'draft' ? 'lastSavedAt' : 'publishedAt']: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content')
      .lean();
    
    const total = await Article.countDocuments(query);
    
    res.json({
      success: true,
      data: articles,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + articles.length < total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles'
    });
  }
});

// Get my bookmarks
router.get('/me/bookmarks', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bookmarks = await Bookmark.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'articleId',
        select: 'title subtitle slug coverImage readTime stats authorId publishedAt',
        populate: {
          path: 'authorId',
          select: 'username displayName avatar'
        }
      })
      .lean();
    
    const total = await Bookmark.countDocuments({ userId: req.user._id });
    
    res.json({
      success: true,
      data: bookmarks.map(b => b.articleId).filter(a => a),
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + bookmarks.length < total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookmarks'
    });
  }
});

// Follow a user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const userIdToFollow = req.params.id;
    
    if (userIdToFollow === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }
    
    // Check if already following
    const existing = await Follow.findOne({
      followerId: req.user._id,
      followingId: userIdToFollow,
      type: 'user'
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already following'
      });
    }
    
    const follow = new Follow({
      followerId: req.user._id,
      followingId: userIdToFollow,
      type: 'user'
    });
    await follow.save();
    
    // Update stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.followingCount': 1 } });
    await User.findByIdAndUpdate(userIdToFollow, { $inc: { 'stats.followersCount': 1 } });
    
    res.json({
      success: true,
      message: 'Followed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to follow'
    });
  }
});

// Unfollow a user
router.delete('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const userIdToUnfollow = req.params.id;
    
    const follow = await Follow.findOneAndDelete({
      followerId: req.user._id,
      followingId: userIdToUnfollow,
      type: 'user'
    });
    
    if (follow) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { 'stats.followingCount': -1 } });
      await User.findByIdAndUpdate(userIdToUnfollow, { $inc: { 'stats.followersCount': -1 } });
    }
    
    res.json({
      success: true,
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow'
    });
  }
});

// Get followers
router.get('/:id/followers', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const follows = await Follow.find({
      followingId: req.params.id,
      type: 'user'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('followerId', 'username displayName avatar');
    
    res.json({
      success: true,
      data: follows.map(f => f.followerId)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers'
    });
  }
});

// Get following
router.get('/:id/following', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const follows = await Follow.find({
      followerId: req.params.id,
      type: 'user'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('followingId', 'username displayName avatar');
    
    res.json({
      success: true,
      data: follows.map(f => f.followingId)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following'
    });
  }
});

module.exports = router;
