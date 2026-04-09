const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { User, Article, Clap, Comment, Bookmark } = require('../models');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// List articles (feed)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).default(1),
  query('limit').optional().isInt({ min: 1, max: 50 }).default(20),
  query('tag').optional().trim(),
  query('author').optional().trim(),
  query('status').optional().isIn(['draft', 'published']),
  handleValidationErrors
], optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, tag, author, status = 'published' } = req.query;
    
    // Build query
    const query = { status };
    
    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    }
    
    if (author) {
      const authorUser = await User.findOne({ username: author.toLowerCase() });
      if (authorUser) {
        query.authorId = authorUser._id;
      }
    }
    
    // If requesting drafts, only show own drafts
    if (status === 'draft' && req.user) {
      query.authorId = req.user._id;
    } else if (status === 'draft') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view drafts'
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const articles = await Article.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('authorId', 'username displayName avatar')
      .lean();
    
    const total = await Article.countDocuments(query);
    
    // Check if user has bookmarked/clapped
    let userInteractions = {};
    if (req.user) {
      const articleIds = articles.map(a => a._id.toString());
      const [bookmarks, claps] = await Promise.all([
        Bookmark.find({ userId: req.user._id, articleId: { $in: articleIds } }),
        Clap.find({ userId: req.user._id, articleId: { $in: articleIds } })
      ]);
      
      bookmarks.forEach(b => userInteractions[b.articleId] = { ...userInteractions[b.articleId], bookmarked: true });
      claps.forEach(c => userInteractions[c.articleId] = { ...userInteractions[c.articleId], clapped: true, clapCount: c.count });
    }
    
    const articlesWithMeta = articles.map(a => ({
      ...a,
      userInteractions: userInteractions[a._id.toString()] || {}
    }));
    
    res.json({
      success: true,
      data: articlesWithMeta,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + articles.length < total
      }
    });
  } catch (error) {
    console.error('List articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles'
    });
  }
});

// Get single article by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const article = await Article.findOne({ 
      slug: req.params.slug,
      status: 'published'
    })
      .populate('authorId', 'username displayName avatar bio stats');
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Increment view count
    article.stats.views += 1;
    await article.save();
    
    // Check user interactions
    let userInteractions = {};
    if (req.user) {
      const [bookmark, clap] = await Promise.all([
        Bookmark.findOne({ userId: req.user._id, articleId: article._id }),
        Clap.findOne({ userId: req.user._id, articleId: article._id })
      ]);
      
      userInteractions = {
        bookmarked: !!bookmark,
        clapped: !!clap,
        clapCount: clap?.count || 0
      };
    }
    
    res.json({
      success: true,
      data: {
        article: article.toPublicJSON(),
        author: article.authorId,
        userInteractions
      }
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article'
    });
  }
});

// Create article (draft)
router.post('/', authMiddleware, [
  body('title').optional().trim().isLength({ max: 200 }),
  body('content').optional().isArray().withMessage('Content must be an array of blocks'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { title = 'Untitled Draft', subtitle = '', content = [], tags = [], coverImage } = req.body;
    
    const article = new Article({
      authorId: req.user._id,
      title,
      subtitle,
      content: content.map((block, idx) => ({
        id: block.id || `block-${idx}`,
        type: block.type || 'paragraph',
        content: block.content || '',
        metadata: block.metadata || {},
        order: idx
      })),
      tags: tags.map(t => t.toLowerCase().trim()).slice(0, 5),
      coverImage,
      status: 'draft'
    });
    
    await article.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.articlesCount': 1 }
    });
    
    res.status(201).json({
      success: true,
      data: article.toPublicJSON()
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create article'
    });
  }
});

// Update article (draft)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    const { title, subtitle, content, tags, coverImage } = req.body;
    
    if (title !== undefined) article.title = title;
    if (subtitle !== undefined) article.subtitle = subtitle;
    if (content !== undefined) {
      article.content = content.map((block, idx) => ({
        id: block.id || `block-${idx}`,
        type: block.type || 'paragraph',
        content: block.content || '',
        metadata: block.metadata || {},
        order: idx
      }));
    }
    if (tags !== undefined) article.tags = tags.map(t => t.toLowerCase().trim()).slice(0, 5);
    if (coverImage !== undefined) article.coverImage = coverImage;
    
    article.lastSavedAt = new Date();
    await article.save();
    
    res.json({
      success: true,
      data: article.toPublicJSON()
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update article'
    });
  }
});

// Publish article
router.put('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    if (article.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Article already published'
      });
    }
    
    article.status = 'published';
    article.publishedAt = new Date();
    await article.save();
    
    res.json({
      success: true,
      data: article.toPublicJSON()
    });
  } catch (error) {
    console.error('Publish article error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to publish article'
    });
  }
});

// Delete article
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    await article.deleteOne();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.articlesCount': -1 }
    });
    
    res.json({
      success: true,
      message: 'Article deleted'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article'
    });
  }
});

module.exports = router;
