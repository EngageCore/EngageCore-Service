/**
 * Repositories Index
 * Exports all repository classes for easy importing
 */

const BaseRepository = require('./BaseRepository');
const BrandRepository = require('./BrandRepository');
const MemberRepository = require('./MemberRepository');
const TransactionRepository = require('./TransactionRepository');


module.exports = {
  BaseRepository,
  BrandRepository,
  TransactionRepository,
  MemberRepository
};