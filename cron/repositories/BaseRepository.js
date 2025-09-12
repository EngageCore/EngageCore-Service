/**
 * Base Repository Class
 * Provides common database operations for all repositories
 */

const { pool } = require('../config/database');
const { logger } = require('../utils');
const { v4: uuidv4 } = require('uuid');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * Execute a query with parameters
   * @param {string} query - SQL query
   * @param {array} params - Query parameters
   * @param {object} client - Database client (optional, for transactions)
   * @returns {object} - Query result
   */
  async query(query, params = [], client = null) {
    const dbClient = client || this.pool;
    const startTime = Date.now();
    
    try {
      logger.logQuery(query, params);
      const result = await dbClient.query(query, params);
      
      const duration = Date.now() - startTime;
      logger.performance('Database Query', duration, {
        query: query.substring(0, 100),
        rowCount: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', {
        error: error.message,
        query: query.substring(0, 100),
        params,
        duration,
        table: this.tableName
      });
      throw error;
    }
  }

  /**
   * Find all records with optional conditions
   * @param {object} options - Query options
   * @returns {array} - Array of records
   */
  async findAll(options = {}) {
    const {
      where = {},
      orderBy = 'created_at',
      order = 'DESC',
      limit = null,
      offset = null,
      select = '*'
    } = options;

    let query = `SELECT ${select} FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(where)) {
        if (value === null) {
          whereConditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    query += ` ORDER BY ${orderBy} ${order}`;

    // Add LIMIT and OFFSET
    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }
    if (offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Find a single record by conditions
   * @param {object} where - Where conditions
   * @param {string} select - Select clause
   * @returns {object|null} - Record or null
   */
  async findOne(where = {}, select = '*') {
    const records = await this.findAll({ where, limit: 1, select });
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Find a record by ID
   * @param {string} id - Record ID
   * @param {string} select - Select clause
   * @returns {object|null} - Record or null
   */
  async findById(id, select = '*') {
    return await this.findOne({ id }, select);
  }

  /**
   * Create a new record
   * @param {object} data - Record data
   * @param {object} client - Database client (optional, for transactions)
   * @returns {object} - Created record
   */
  async create(data, client = null) {
    const id = data.id || uuidv4();
    const now = new Date();
    
    const recordData = {
      id,
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };

    const columns = Object.keys(recordData);
    const values = Object.values(recordData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query(query, values, client);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {string} id - Record ID
   * @param {object} data - Update data
   * @param {object} client - Database client (optional, for transactions)
   * @returns {object|null} - Updated record or null
   */
  async update(id, data, client = null) {
    const updateData = {
      ...data,
      updated_at: new Date()
    };

    const columns = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $${columns.length + 1}
      RETURNING *
    `;

    const result = await this.query(query, [...values, id], client);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update records by conditions
   * @param {object} where - Where conditions
   * @param {object} data - Update data
   * @param {object} client - Database client (optional, for transactions)
   * @returns {array} - Updated records
   */
  async updateWhere(where, data, client = null) {
    const updateData = {
      ...data,
      updated_at: new Date()
    };

    const updateColumns = Object.keys(updateData);
    const updateValues = Object.values(updateData);
    let paramIndex = updateColumns.length + 1;

    const setClause = updateColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    let query = `UPDATE ${this.tableName} SET ${setClause}`;
    const params = [...updateValues];

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(where)) {
        if (value === null) {
          whereConditions.push(`${key} IS NULL`);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ' RETURNING *';

    const result = await this.query(query, params, client);
    return result.rows;
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @param {object} client - Database client (optional, for transactions)
   * @returns {boolean} - True if deleted, false if not found
   */
  async delete(id, client = null) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;
    const result = await this.query(query, [id], client);
    return result.rowCount > 0;
  }

  /**
   * Delete records by conditions
   * @param {object} where - Where conditions
   * @param {object} client - Database client (optional, for transactions)
   * @returns {number} - Number of deleted records
   */
  async deleteWhere(where, client = null) {
    let query = `DELETE FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(where)) {
        if (value === null) {
          whereConditions.push(`${key} IS NULL`);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await this.query(query, params, client);
    return result.rowCount;
  }

  /**
   * Count records with optional conditions
   * @param {object} where - Where conditions
   * @returns {number} - Record count
   */
  async count(where = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(where)) {
        if (value === null) {
          whereConditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          whereConditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await this.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if a record exists
   * @param {object} where - Where conditions
   * @returns {boolean} - True if exists
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Paginate records
   * @param {object} options - Pagination options
   * @returns {object} - Paginated result
   */
  async paginate(options = {}) {
    const {
      page = 1,
      limit = 20,
      where = {},
      orderBy = 'created_at',
      order = 'DESC',
      select = '*'
    } = options;

    const offset = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.findAll({ where, orderBy, order, limit, offset, select }),
      this.count(where)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Execute a raw SQL query
   * @param {string} sql - Raw SQL query
   * @param {array} params - Query parameters
   * @param {object} client - Database client (optional, for transactions)
   * @returns {object} - Query result
   */
  async raw(sql, params = [], client = null) {
    return await this.query(sql, params, client);
  }

  /**
   * Begin a database transaction
   * @returns {object} - Database client for transaction
   */
  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a database transaction
   * @param {object} client - Database client
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback a database transaction
   * @param {object} client - Database client
   */
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  /**
   * Execute operations within a transaction
   * @param {function} operations - Function containing operations
   * @returns {any} - Result of operations
   */
  async withTransaction(operations) {
    const client = await this.beginTransaction();
    
    try {
      const result = await operations(client);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

module.exports = BaseRepository;