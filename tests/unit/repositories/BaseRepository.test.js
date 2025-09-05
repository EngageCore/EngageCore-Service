/**
 * Unit tests for BaseRepository
 * Tests the base repository pattern and common database operations
 */

const BaseRepository = require('../../../src/repositories/BaseRepository');
const db = require('../../../src/config/database');

// Mock database
jest.mock('../../../src/config/database');

describe('BaseRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock database
    mockDb = {
      query: jest.fn()
    };
    
    db.query = mockDb.query;
    
    // Create repository instance
    repository = new BaseRepository('test_table');
  });

  describe('constructor', () => {
    it('should set table name correctly', () => {
      // Act
      const repo = new BaseRepository('users');
      
      // Assert
      expect(repo.tableName).toBe('users');
    });
  });

  describe('findById', () => {
    it('should find record by ID successfully', async () => {
      // Arrange
      const id = 'test-id';
      const mockResult = {
        rows: [{ id: 'test-id', name: 'Test Record' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        [id]
      );
    });

    it('should return null when record not found', async () => {
      // Arrange
      const id = 'non-existent-id';
      const mockResult = { rows: [] };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findById(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const id = 'test-id';
      const error = new Error('Database error');
      
      mockDb.query.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findById(id)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should find all records with default pagination', async () => {
      // Arrange
      const mockResult = {
        rows: [
          { id: '1', name: 'Record 1' },
          { id: '2', name: 'Record 2' }
        ]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual(mockResult.rows);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table LIMIT $1 OFFSET $2',
        [100, 0]
      );
    });

    it('should find records with conditions', async () => {
      // Arrange
      const conditions = { active: true, type: 'premium' };
      const mockResult = {
        rows: [{ id: '1', name: 'Active Premium Record' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findAll(conditions, 50, 10);

      // Assert
      expect(result).toEqual(mockResult.rows);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE active = $1 AND type = $2 LIMIT $3 OFFSET $4',
        [true, 'premium', 50, 10]
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockResult = { rows: [] };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create new record successfully', async () => {
      // Arrange
      const data = {
        name: 'New Record',
        email: 'test@example.com',
        active: true
      };
      const mockResult = {
        rows: [{ id: 'new-id', ...data }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.create(data);

      // Assert
      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, email, active) VALUES ($1, $2, $3) RETURNING *',
        ['New Record', 'test@example.com', true]
      );
    });

    it('should handle creation errors', async () => {
      // Arrange
      const data = { name: 'Test' };
      const error = new Error('Constraint violation');
      
      mockDb.query.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.create(data)).rejects.toThrow('Constraint violation');
    });
  });

  describe('update', () => {
    it('should update record successfully', async () => {
      // Arrange
      const id = 'test-id';
      const data = {
        name: 'Updated Record',
        email: 'updated@example.com'
      };
      const mockResult = {
        rows: [{ id, ...data, updated_at: new Date() }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.update(id, data);

      // Assert
      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE test_table SET name = $2, email = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id, 'Updated Record', 'updated@example.com']
      );
    });

    it('should return null when record not found for update', async () => {
      // Arrange
      const id = 'non-existent-id';
      const data = { name: 'Updated' };
      const mockResult = { rows: [] };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.update(id, data);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete record successfully', async () => {
      // Arrange
      const id = 'test-id';
      const mockResult = {
        rows: [{ id, name: 'Deleted Record' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.delete(id);

      // Assert
      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1 RETURNING *',
        [id]
      );
    });

    it('should return null when record not found for deletion', async () => {
      // Arrange
      const id = 'non-existent-id';
      const mockResult = { rows: [] };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.delete(id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all records without conditions', async () => {
      // Arrange
      const mockResult = {
        rows: [{ count: '25' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(25);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM test_table',
        []
      );
    });

    it('should count records with conditions', async () => {
      // Arrange
      const conditions = { active: true };
      const mockResult = {
        rows: [{ count: '10' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.count(conditions);

      // Assert
      expect(result).toBe(10);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM test_table WHERE active = $1',
        [true]
      );
    });

    it('should return 0 for empty table', async () => {
      // Arrange
      const mockResult = {
        rows: [{ count: '0' }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should log and rethrow database errors', async () => {
      // Arrange
      const error = new Error('Connection timeout');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockDb.query.mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findById('test-id')).rejects.toThrow('Connection timeout');
      
      consoleSpy.mockRestore();
    });
  });

  describe('query building', () => {
    it('should build WHERE clause correctly with multiple conditions', async () => {
      // Arrange
      const conditions = {
        status: 'active',
        type: 'premium',
        created_at: '2024-01-01'
      };
      const mockResult = { rows: [] };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      await repository.findAll(conditions);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE status = $1 AND type = $2 AND created_at = $3 LIMIT $4 OFFSET $5',
        ['active', 'premium', '2024-01-01', 100, 0]
      );
    });

    it('should handle special characters in data', async () => {
      // Arrange
      const data = {
        name: "O'Connor",
        description: 'Text with "quotes" and special chars: @#$%'
      };
      const mockResult = {
        rows: [{ id: 'new-id', ...data }]
      };
      
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      await repository.create(data);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, description) VALUES ($1, $2) RETURNING *',
        ["O'Connor", 'Text with "quotes" and special chars: @#$%']
      );
    });
  });

  describe('pagination', () => {
    it('should calculate offset correctly for different pages', async () => {
      // Arrange
      const mockResult = { rows: [] };
      mockDb.query.mockResolvedValue(mockResult);

      // Act
      await repository.findAll({}, 20, 40); // limit=20, offset=40 (page 3)

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table LIMIT $1 OFFSET $2',
        [20, 40]
      );
    });
  });
});