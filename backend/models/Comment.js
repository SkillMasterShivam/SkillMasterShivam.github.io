const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    trim: true
  },
  stats: {
    claps: { type: Number, default: 0 },
    replies: { type: Number, default: 0 }
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for fetching comments by article
commentSchema.index({ articleId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
