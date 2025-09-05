/**
 * Repositories Index
 * Exports all repository classes for easy importing
 */

const BaseRepository = require('./BaseRepository');
const BrandRepository = require('./BrandRepository');
const UserRepository = require('./UserRepository');
const MemberRepository = require('./MemberRepository');
const WheelRepository = require('./WheelRepository');
const MissionRepository = require('./MissionRepository');
const MissionCompletionRepository = require('./MissionCompletionRepository');
const TransactionRepository = require('./TransactionRepository');
const AuditLogRepository = require('./AuditLogRepository');

module.exports = {
  BaseRepository,
  BrandRepository,
  UserRepository,
  MemberRepository,
  WheelRepository,
  MissionRepository,
  MissionCompletionRepository,
  TransactionRepository,
  AuditLogRepository
};