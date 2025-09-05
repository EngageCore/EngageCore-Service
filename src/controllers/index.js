/**
 * Controllers Index
 * Exports all controller modules
 */

const AdminController = require('./AdminController');
const AuthController = require('./AuthController');
const MemberController = require('./MemberController');
const MissionController = require('./MissionController');
const TierController = require('./TierController');
const TransactionController = require('./TransactionController');
const UserController = require('./UserController');
const WheelController = require('./WheelController');
const BrandController = require('./brandController');

module.exports = {
  AdminController,
  AuthController,
  MemberController,
  MissionController,
  TierController,
  TransactionController,
  UserController,
  WheelController,
  BrandController
};