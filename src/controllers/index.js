/**
 * Controllers Index
 * Exports all controller modules
 */

const AuthController = require('./AuthController');
const BrandController = require('./BrandController');
const MemberController = require('./MemberController');
const WheelController = require('./WheelController');
const MissionController = require('./MissionController');
const TransactionController = require('./TransactionController');
const UserController = require('./UserController');
const AdminController = require('./AdminController');

module.exports = {
  AuthController,
  BrandController,
  MemberController,
  WheelController,
  MissionController,
  TransactionController,
  UserController,
  AdminController
};