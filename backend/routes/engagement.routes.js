const express = require('express');
const { body } = require('express-validator');
const { Clap, Comment, Bookmark, Article, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ===== CLAPS =====

// Add or update clap
router.post('/articles/:id/clap', authMiddleware, [
  body('count').optional().isInt({ min: 1, max: 50 }).default(1)
], async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const articleId = req.params.id;
    const userId = req.user._id;
    
    // Find existing clap
    let clap = await Clap.findOne({ articleId, userId });
    
    if (clap) {
      // Update existing clap
      const diff = count - clap.count;
      clap.count = count;
      await clap.save();
      
      // Update article stats
      await Article.findByIdAndUpdate(articleId, {
        $inc: { 'stats.claps': diff }
      });
    } else {
      // Create new clap
      clap = new Clap({ articleId, userId, count });
      await clap.save();
      
      // Update article stats
      await Article.findByIdAndUpdate(articleId, {
        $inc: { 'stats.claps': count }
      });
    }
    
    res.json({
      success: true,
      data: { clap }
    });
  } catch (error) {
    console.error('Clap error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process clap'
    });
  }
});

// Remove clap
router.delete('/articles/:id/clap', authMiddleware, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.user._id;
    
    const clap = await Clap.findOneAndDelete({ articleId, userId });
    
    if (clap) {
      await Article.findByIdAndUpdate(articleId, {
        $inc: { 'stats.claps': -clap.count }
      });
    }
    
    res.json({
      success: true,
      message: 'Clap removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove clap'
    });
  }
});

// ===== BOOKMARKS =====

// Add bookmark
router.post('/articles/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.user._id;
    
    const existing = await Bookmark.findOne({ articleId, userId });
    if (existing) {
      return res.json({
        success: true,
        message: 'Already bookmarked'
      });
    }
    
    const bookmark = new Bookmark({ articleId, userId });
    await bookmark.save();
    
    // Update article stats
    await Article.findByIdAndUpdate(articleId, {
      $inc: { 'stats.bookmarks': 1 }
    });
    
    res.json({
      success: true,
      data: { bookmark }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bookmark'
    });
  }
});

// Remove bookmark
router.delete('/articles/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.user._id;
    
    const bookmark = await Bookmark.findOneAndDelete({ articleId, userId });
    
    if (bookmark) {
      await Article.findByIdAndUpdate(articleId, {
        $inc: { 'stats.bookmarks': -1 }
      });
    }
    
    res.json({
      success: true,
      message: 'Bookmark removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove bookmark'
    });
  }
});

// ===== COMMENTS =====

// Get comments for article
router.get('/articles/:id/comments', async (req, res) => {
  try {
    const articleId = req.params.id;
    
    // Get top-level comments
    const comments = await Comment.find({
      articleId,
      parentId: null
    })
      .sort({ createdAt: -1 })
      .populate('authorId', 'username displayName avatar')
      .lean();
    
    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentId: comment._id
        })
          .sort({ createdAt: 1 })
          .populate('authorId', 'username displayName avatar')
          .lean();
        
        return {
          ...comment,
          replies
        };
      })
    );
    
    res.json({
      success: true,
      data: commentsWithReplies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
});

// Add comment
router.post('/articles/:id/comments', authMiddleware, [
  body('content').trim().isLength({ min: 1, max: 2000 }),
  body('parentId').optional().isMongoId()
], async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const articleId = req.params.id;
    
    const comment = new Comment({
      articleId,
      authorId: req.user._id,
      parentId: parentId || null,
      content
    });
    
    await comment.save();
    
    // Update article comment count
    await Article.findByIdAndUpdate(articleId, {
      $inc: { 'stats.comments': 1 }
    });
    
    // If reply, update parent's reply count
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { 'stats.replies': 1 }
      });
    }
    
    await comment.populate('authorId', 'username displayName avatar');
    
    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// Delete comment
router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Mark as deleted rather than actually delete
    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();
    
    // Update article comment count
    await Article.findByIdAndUpdate(comment.articleId, {
      $inc: { 'stats.comments': -1 }
    });
    
    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
});

module.exports = router;
