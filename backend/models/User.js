const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  avatar: {
    type: String,
    default: null
  },
  passwordHash: {
    type: String,
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  interests: [{
    type: String,
    maxlength: 50
  }],
  stats: {
    articlesCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    totalClaps: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 }
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    emailNotifications: {
      newFollower: { type: Boolean, default: true },
      newComment: { type: Boolean, default: true },
      articlePublished: { type: Boolean, default: true }
    }
  },
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});


// Virtual for full profile
userSchema.virtual('publicProfile').get(function() {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    bio: this.bio,
    avatar: this.avatar,
    stats: this.stats,
    createdAt: this.createdAt
  };
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
