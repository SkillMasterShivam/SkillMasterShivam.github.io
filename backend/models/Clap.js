const mongoose = require('mongoose');

const clapSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  count: {
    type: Number,
    min: 1,
    max: 50,
    default: 1
  }
}, {
  timestamps: true
});

// Unique compound index - one clap record per user per article
clapSchema.index({ articleId: 1, userId: 1 }, { unique: true });

// Index for finding user's claps
clapSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Clap', clapSchema);
