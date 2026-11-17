const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas or local MongoDB using Mongoose.
 * Connection string is read from process.env.MONGO_URI (or fallback MONGODB_URI).
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('\n[MongoDB Error] MONGO_URI is not defined in your backend/.env file.');
    console.error('Please configure your MongoDB Atlas connection string:');
    console.error('MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/assignment_reminder\n');
    return;
  }

  // Check if user still has placeholder in MONGO_URI
  if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    console.warn('\n[MongoDB Warning] MONGO_URI contains unreplaced placeholders (<username> or <password>).');
    console.warn('Please update backend/.env with your actual MongoDB Atlas credentials.\n');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB Connected] Host: ${conn.connection.host}`);
    console.log(`[MongoDB Connected] Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`\n[MongoDB Connection Error] ${error.message}`);
    console.error('Troubleshooting Tips:');
    console.error('1. Check that the username and password in MONGO_URI are correct.');
    console.error('2. In MongoDB Atlas -> "Network Access", ensure your current IP address (or 0.0.0.0/0) is whitelisted.');
    console.error('3. Verify that your MongoDB cluster is active and network access is permitted.\n');
  }
};

module.exports = connectDB;
