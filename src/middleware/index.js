/**
 * Middleware Index
 * Exports all middleware functions for easy importing
 */

const auth = require('./auth');
const brandContext = require('./brandContext');
const validation = require('./validation');
const rateLimit = require('./rateLimit');
const errorHandler = require('./errorHandler');

module.exports = {
  auth,
  brandContext,
  validation,
  rateLimit,
  errorHandler
};