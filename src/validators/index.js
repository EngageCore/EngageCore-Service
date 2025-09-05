/**
 * Validators Index
 * Exports all validator schemas for easy importing
 */

const authValidators = require('./authValidators');
const brandValidators = require('./brandValidators');
const memberValidators = require('./memberValidators');
const wheelValidators = require('./wheelValidators');
const missionValidators = require('./missionValidators');
const transactionValidators = require('./transactionValidators');

module.exports = {
  auth: authValidators,
  brand: brandValidators,
  member: memberValidators,
  wheel: wheelValidators,
  mission: missionValidators,
  transaction: transactionValidators
};