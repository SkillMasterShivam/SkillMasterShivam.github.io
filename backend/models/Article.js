const mongoose = require('mongoose');
const slugify = require('slugify');

const blockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['paragraph', 'heading', 'heading-1', 'heading-2', 'image', 'code', 'quote', 'list', 'divider'],
    required: true
  },
  content: String,
  metadata: {
    level: Number,
    language: String,
    src: String,
    alt: String,
    caption: String,
    items: [String],
    style: String
  },
  order: { type: Number, required: true }
}, { _id: false });

const articleSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  publicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publication',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [300, 'Subtitle cannot exceed 300 characters'],
    default: ''
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  content: [blockSchema],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  coverImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    maxlength: 50,
    lowercase: true,
    trim: true
  }],
  readTime: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  stats: {
    claps: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 }
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for feed queries
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ authorId: 1, status: 1, publishedAt: -1 });
articleSchema.index({ tags: 1, status: 1, publishedAt: -1 });

// Text search index
articleSchema.index({
  title: 'text',
  subtitle: 'text',
  'content.content': 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    subtitle: 5,
    'content.content': 2,
    tags: 3
  }
});

// Pre-save middleware to generate slug
articleSchema.pre('save', async function(next) {
  if (this.isModified('title') && this.title) {
    const baseSlug = slugify(this.title, { lower: true, strict: true }) || 'untitled';
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  
  // Calculate read time
  if (this.isModified('content')) {
    const textContent = this.content
      .filter(b => b.type === 'paragraph' || b.type === 'heading')
      .map(b => b.content || '')
      .join(' ');
    const wordCount = textContent.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  
  next();
});

// Method to get public article data
articleSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    id: this._id,
    title: this.title,
    subtitle: this.subtitle,
    slug: this.slug,
    content: this.content,
    coverImage: this.coverImage,
    tags: this.tags,
    readTime: this.readTime,
    status: this.status,
    stats: this.stats,
    authorId: this.authorId,
    publishedAt: this.publishedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Article', articleSchema);
