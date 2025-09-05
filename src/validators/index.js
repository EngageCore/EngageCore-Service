/**
 * Validators Index
 * Exports all validator schemas for easy importing
 */

const authValidators = require('./authValidators');
const brandValidators = require('./brandValidators');
const memberValidators = require('./memberValidators');
const missionValidators = require('./missionValidators');
const tierValidators = require('./tierValidators');
const transactionValidators = require('./transactionValidators');
const wheelValidators = require('./wheelValidators');

module.exports = {
  authValidators,
  brandValidators,
  memberValidators,
  missionValidators,
  tierValidators,
  transactionValidators,
  wheelValidators
};