const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// 1. Load environment variables from .env file
dotenv.config();

// 2. Initialize Express application
const app = express();

// 3. Built-in and third-party middleware
// Enables Cross-Origin Resource Sharing so our frontend can communicate with backend
app.use(cors());

// Parses incoming JSON payloads into JavaScript objects accessible via req.body
app.use(express.json());

// Parses URL-encoded data from standard HTML forms
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// 4. API Routes
// Health check route - good for verifying API server status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Campus Lost and Found API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Primary resource routes
app.use('/api/items', itemRoutes);

// 5. Error handling middleware (must be registered AFTER all routes)
app.use(notFound);
app.use(errorHandler);

// 6. Start server function
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[Server] Campus Lost & Found backend listening at http://localhost:${PORT}`);
    });
    return server;
  } catch (error) {
    console.error(`[Server Error] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Start automatically when run directly (e.g. node src/server.js)
if (require.main === module) {
  startServer();
}

// Export app and startServer for testing
module.exports = { app, startServer };
