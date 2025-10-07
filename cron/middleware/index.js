/**
 * Middleware Index
 * Exports all middleware functions for easy importing
 */


const brandContext = require('./brandContext');
const validation = require('./validation');
const rateLimit = require('./rateLimit');
const errorHandler = require('./errorHandler');
const cache = require('./cache');
const queryOptimization = require('./queryOptimization');

module.exports = {

  brandContext,
  validation,
  rateLimit,
  errorHandler,
  cache,
  queryOptimization
};