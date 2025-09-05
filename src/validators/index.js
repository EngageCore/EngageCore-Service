/**
 * Validators Index
 * Exports all validator schemas for easy importing
 */

const adminValidators = require('./adminValidators');
const authValidators = require('./authValidators');
const brandValidators = require('./brandValidators');
const memberValidators = require('./memberValidators');
const missionValidators = require('./missionValidators');
const tierValidators = require('./tierValidators');
const transactionValidators = require('./transactionValidators');
const userValidators = require('./userValidators');
const wheelValidators = require('./wheelValidators');

module.exports = {
  adminValidators,
  authValidators,
  brandValidators,
  memberValidators,
  missionValidators,
  tierValidators,
  transactionValidators,
  userValidators,
  wheelValidators
};