const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['user', 'publication'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Unique index - can't follow same thing twice
followSchema.index({ followerId: 1, followingId: 1, type: 1 }, { unique: true });

// Indexes for queries
followSchema.index({ followerId: 1, type: 1, createdAt: -1 });
followSchema.index({ followingId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
