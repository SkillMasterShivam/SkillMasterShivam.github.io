const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Unique index - can't bookmark same article twice
bookmarkSchema.index({ userId: 1, articleId: 1 }, { unique: true });

// Index for fetching user's bookmarks
bookmarkSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
