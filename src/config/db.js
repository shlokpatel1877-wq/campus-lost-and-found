const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * 
 * Supports:
 * 1. Standard MongoDB URI (local or MongoDB Atlas in cloud)
 * 2. In-Memory database mode via `USE_MEMORY_DB=true` for easy development/testing
 */
const connectDB = async (customUri) => {
  try {
    if (process.env.USE_MEMORY_DB === 'true') {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to In-Memory MongoDB (${conn.connection.host})`);
      return conn;
    }

    const uri = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_lost_and_found';
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      console.warn('\n--- Database Troubleshooting ---');
      console.warn('1. Local MongoDB: Make sure the MongoDB service is running (e.g., net start MongoDB).');
      console.warn('2. MongoDB Atlas: Set MONGODB_URI in your .env file to your cloud connection string.');
      console.warn('3. In-Memory Mode: Add USE_MEMORY_DB=true to .env to run without installing MongoDB.\n');
    }
    throw error;
  }
};

module.exports = connectDB;
