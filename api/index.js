const server = require('../server');

// Export the handler for Vercel
module.exports = async (req, res) => {
  const app = await server.getApp();
  return app(req, res);
};