const mongoose = require('mongoose');
require('dotenv').config();

// Fallback config if .env file is missing
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.log('⚠️  No .env file found, using fallback MongoDB config');
  MONGODB_URI = 'mongodb+srv://shivamchaudhary5987_db_user:l4J1s7tgCJs1zWBN@blogmedium.tsfkx00.mongodb.net/ideapress?retryWrites=true&w=majority';
}

async function testConnection() {
  console.log('\n========================================');
  console.log('  IdeaPress MongoDB Connection Test');
  console.log('========================================\n');
  
  if (!MONGODB_URI || MONGODB_URI.includes('xxxx') || MONGODB_URI.includes('USERNAME')) {
    console.log('❌ ERROR: MONGODB_URI not configured properly\n');
    console.log('Please follow these steps:\n');
    console.log('1. Go to https://cloud.mongodb.com');
    console.log('2. Click on your cluster');
    console.log('3. Click "Connect" → "Drivers" → "Node.js"');
    console.log('4. Copy the connection string');
    console.log('5. Create a file named ".env" in the backend folder');
    console.log('6. Add: MONGODB_URI=your_connection_string\n');
    console.log('========================================\n');
    process.exit(1);
  }
  
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('URI:', MONGODB_URI.replace(/:([^@]+)@/, ':****@')); // Hide password
    
    // Add timeout to prevent hanging
    const connectPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 10000,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout - check your IP whitelist')), 15000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log('\n✅ SUCCESS! Connected to MongoDB Atlas\n');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    console.log('========================================\n');
    process.exit(0);
  } catch (error) {
    console.log('\n❌ CONNECTION FAILED\n');
    console.log('Error:', error.message);
    console.log('\nPossible issues:');
    console.log('1. IP address not whitelisted in Atlas');
    console.log('   → Go to MongoDB Atlas → Network Access → Add IP Address');
    console.log('2. Wrong username or password');
    console.log('   → Check Database Access → Users');
    console.log('3. Cluster still initializing');
    console.log('   → Wait 2-3 minutes and try again');
    console.log('\n========================================\n');
    process.exit(1);
  }
}

testConnection();
