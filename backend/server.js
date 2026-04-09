const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Fallback configuration if .env file not present
if (!process.env.MONGODB_URI) {
  console.log('⚠️  No .env file found, using fallback config');
  process.env.MONGODB_URI = 'mongodb+srv://shivamchaudhary5987_db_user:l4J1s7tgCJs1zWBN@blogmedium.tsfkx00.mongodb.net/ideapress?retryWrites=true&w=majority';
  process.env.JWT_SECRET = 'a8f4c9e2b1d7f3a6e5c0b9d8f4e1a7c3b5d9f0e2c6a8b4d1f7e3c9a5b0d8f6e2c4a0';
  process.env.JWT_REFRESH_SECRET = 'b7d3f9e1c8a4b0d6f2e9c5a1b8d4f0e7c3a9b5d1f8e4c0a6b2d9f5e1c7a3b9d5f1e3c7';
}

const authRoutes = require('./routes/auth.routes');
const articleRoutes = require('./routes/article.routes');
const userRoutes = require('./routes/user.routes');
const feedRoutes = require('./routes/feed.routes');
const engagementRoutes = require('./routes/engagement.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173'
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('dev'));

// Database connection
const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ideapress';
    
    // Try to connect with timeout
    const connectPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ MongoDB Atlas connected');
  } catch (err) {
    console.log('⚠️  MongoDB Atlas connection failed, using in-memory database');
    console.log('   Reason:', err.message);
    
    // Fallback to in-memory MongoDB
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ In-memory MongoDB connected (for local testing)');
  }
};
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/engagement', engagementRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`IdeaPress API running on port ${PORT}`);
});

module.exports = app;
