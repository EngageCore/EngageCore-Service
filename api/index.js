/**
 * Vercel Entry Point
 * This file exports the Express app in a format compatible with Vercel's serverless functions
 */

const server = require('../server');

// Export a function that returns the initialized Express app
module.exports = async (req, res) => {
  try {
    const app = await server.getApp();
    return app(req, res);
  } catch (error) {
    console.error('Error initializing app:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Also export the app directly for compatibility
module.exports.default = module.exports;