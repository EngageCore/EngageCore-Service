/**
 * Unit tests for WheelService
 * Tests wheel spinning logic, probability calculations, and spin validation
 */

const WheelService = require('../../../src/services/WheelService');
const WheelRepository = require('../../../src/repositories/WheelRepository');
const MemberRepository = require('../../../src/repositories/MemberRepository');
const TransactionService = require('../../../src/services/TransactionService');
const { wheelConfigs, wheelItems, members, spinHistory } = require('../../fixtures/testData');

// Mock dependencies
jest.mock('../../../src/repositories/WheelRepository');
jest.mock('../../../src/repositories/MemberRepository');
jest.mock('../../../src/services/TransactionService');

describe('WheelService', () => {
  let wheelService;
  let mockWheelRepository;
  let mockMemberRepository;
  let mockTransactionService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repositories
    mockWheelRepository = {
      findWheelById: jest.fn(),
      findWheelItems: jest.fn(),
      createSpinHistory: jest.fn(),
      getSpinHistory: jest.fn(),
      getDailySpinCount: jest.fn(),
      updateSpinClaim: jest.fn()
    };
    
    mockMemberRepository = {
      findById: jest.fn(),
      updatePoints: jest.fn()
    };
    
    mockTransactionService = {
      createTransaction: jest.fn()
    };
    
    WheelRepository.mockImplementation(() => mockWheelRepository);
    MemberRepository.mockImplementation(() => mockMemberRepository);
    TransactionService.mockImplementation(() => mockTransactionService);
    
    // Create service instance
    wheelService = new WheelService();
  });

  describe('spinWheel', () => {
    it('should successfully spin wheel and award prize', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const wheelId = wheelConfigs.validWheel.id;
      const mockWheel = wheelConfigs.validWheel;
      const mockMember = members.validMember;
      const mockItems = wheelItems;
      const selectedItem = wheelItems[0]; // 10 Points
      
      mockWheelRepository.findWheelById.mockResolvedValue(mockWheel);
      mockMemberRepository.findById.mockResolvedValue(mockMember);
      mockWheelRepository.findWheelItems.mockResolvedValue(mockItems);
      mockWheelRepository.getDailySpinCount.mockResolvedValue(1); // Under limit
      mockWheelRepository.createSpinHistory.mockResolvedValue({
        id: 'spin-id',
        wheel_item_id: selectedItem.id
      });
      mockTransactionService.createTransaction.mockResolvedValue({ success: true });
      
      // Mock random selection to return first item
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Should select first item (40% probability)

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('prize');
      expect(result.data.prize.name).toBe(selectedItem.name);
      expect(result.data).toHaveProperty('remainingSpins');
      expect(mockWheelRepository.createSpinHistory).toHaveBeenCalled();
      expect(mockTransactionService.createTransaction).toHaveBeenCalled();
      
      Math.random.mockRestore();
    });

    it('should fail when wheel not found', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const wheelId = 'non-existent-wheel';
      
      mockWheelRepository.findWheelById.mockResolvedValue(null);

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Wheel configuration not found');
    });

    it('should fail when member not found', async () => {
      // Arrange
      const memberId = 'non-existent-member';
      const wheelId = wheelConfigs.validWheel.id;
      
      mockWheelRepository.findWheelById.mockResolvedValue(wheelConfigs.validWheel);
      mockMemberRepository.findById.mockResolvedValue(null);

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Member not found');
    });

    it('should fail when daily spin limit exceeded', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const wheelId = wheelConfigs.validWheel.id;
      const mockWheel = wheelConfigs.validWheel;
      const mockMember = members.validMember;
      
      mockWheelRepository.findWheelById.mockResolvedValue(mockWheel);
      mockMemberRepository.findById.mockResolvedValue(mockMember);
      mockWheelRepository.getDailySpinCount.mockResolvedValue(mockWheel.daily_spin_limit);

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Daily spin limit exceeded');
    });

    it('should fail when member has insufficient points', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const wheelId = wheelConfigs.validWheel.id;
      const mockWheel = {
        ...wheelConfigs.validWheel,
        spin_requirements: { min_points: 2000 } // More than member has
      };
      const mockMember = members.validMember; // Has 1500 points
      
      mockWheelRepository.findWheelById.mockResolvedValue(mockWheel);
      mockMemberRepository.findById.mockResolvedValue(mockMember);
      mockWheelRepository.getDailySpinCount.mockResolvedValue(1);

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient points to spin');
    });

    it('should fail when wheel is inactive', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const wheelId = wheelConfigs.validWheel.id;
      const mockWheel = { ...wheelConfigs.validWheel, active: false };
      
      mockWheelRepository.findWheelById.mockResolvedValue(mockWheel);

      // Act
      const result = await wheelService.spinWheel(memberId, wheelId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Wheel is not active');
    });
  });

  describe('getSpinHistory', () => {
    it('should return member spin history with pagination', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const page = 1;
      const limit = 10;
      const mockHistory = [spinHistory.validSpin, spinHistory.claimedSpin];
      
      mockWheelRepository.getSpinHistory.mockResolvedValue(mockHistory);

      // Act
      const result = await wheelService.getSpinHistory(memberId, page, limit);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.spins).toEqual(mockHistory);
      expect(mockWheelRepository.getSpinHistory).toHaveBeenCalledWith(memberId, limit, 0);
    });

    it('should handle empty spin history', async () => {
      // Arrange
      const memberId = members.validMember.id;
      
      mockWheelRepository.getSpinHistory.mockResolvedValue([]);

      // Act
      const result = await wheelService.getSpinHistory(memberId, 1, 10);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.spins).toEqual([]);
    });
  });

  describe('claimPrize', () => {
    it('should successfully claim unclaimed prize', async () => {
      // Arrange
      const spinId = spinHistory.validSpin.id;
      const memberId = members.validMember.id;
      const mockSpin = { ...spinHistory.validSpin, claimed_at: null };
      const mockItem = wheelItems[0];
      
      mockWheelRepository.findSpinById.mockResolvedValue(mockSpin);
      mockWheelRepository.findWheelItemById.mockResolvedValue(mockItem);
      mockWheelRepository.updateSpinClaim.mockResolvedValue({ ...mockSpin, claimed_at: new Date() });
      mockTransactionService.createTransaction.mockResolvedValue({ success: true });

      // Act
      const result = await wheelService.claimPrize(spinId, memberId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Prize claimed successfully');
      expect(mockWheelRepository.updateSpinClaim).toHaveBeenCalledWith(spinId);
    });

    it('should fail to claim already claimed prize', async () => {
      // Arrange
      const spinId = spinHistory.claimedSpin.id;
      const memberId = members.validMember.id;
      const mockSpin = spinHistory.claimedSpin; // Already claimed
      
      mockWheelRepository.findSpinById.mockResolvedValue(mockSpin);

      // Act
      const result = await wheelService.claimPrize(spinId, memberId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Prize already claimed');
    });

    it('should fail when spin not found', async () => {
      // Arrange
      const spinId = 'non-existent-spin';
      const memberId = members.validMember.id;
      
      mockWheelRepository.findSpinById.mockResolvedValue(null);

      // Act
      const result = await wheelService.claimPrize(spinId, memberId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Spin record not found');
    });

    it('should fail when member tries to claim another member\'s prize', async () => {
      // Arrange
      const spinId = spinHistory.validSpin.id;
      const memberId = 'different-member-id';
      const mockSpin = spinHistory.validSpin;
      
      mockWheelRepository.findSpinById.mockResolvedValue(mockSpin);

      // Act
      const result = await wheelService.claimPrize(spinId, memberId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized to claim this prize');
    });
  });

  describe('selectWheelItem', () => {
    it('should select item based on probability distribution', () => {
      // Arrange
      const items = wheelItems;
      
      // Mock random to select second item (probability 0.3, cumulative 0.7)
      jest.spyOn(Math, 'random').mockReturnValue(0.6);

      // Act
      const selectedItem = wheelService.selectWheelItem(items);

      // Assert
      expect(selectedItem).toEqual(items[1]); // 50 Points item
      
      Math.random.mockRestore();
    });

    it('should select first item for very low random value', () => {
      // Arrange
      const items = wheelItems;
      
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      // Act
      const selectedItem = wheelService.selectWheelItem(items);

      // Assert
      expect(selectedItem).toEqual(items[0]); // 10 Points item
      
      Math.random.mockRestore();
    });

    it('should select last item for high random value', () => {
      // Arrange
      const items = wheelItems;
      
      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      // Act
      const selectedItem = wheelService.selectWheelItem(items);

      // Assert
      expect(selectedItem).toEqual(items[3]); // Free Coffee item
      
      Math.random.mockRestore();
    });
  });

  describe('validateSpinRequirements', () => {
    it('should validate member meets all spin requirements', () => {
      // Arrange
      const member = members.validMember;
      const requirements = {
        min_points: 100,
        member_only: true,
        min_level: 1
      };

      // Act
      const result = wheelService.validateSpinRequirements(member, requirements);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail validation for insufficient points', () => {
      // Arrange
      const member = { ...members.validMember, points: 50 };
      const requirements = { min_points: 100 };

      // Act
      const result = wheelService.validateSpinRequirements(member, requirements);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient points');
    });
  });

  describe('calculateRemainingSpins', () => {
    it('should calculate remaining spins correctly', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const dailyLimit = 3;
      const currentSpins = 1;
      
      mockWheelRepository.getDailySpinCount.mockResolvedValue(currentSpins);

      // Act
      const remaining = await wheelService.calculateRemainingSpins(memberId, dailyLimit);

      // Assert
      expect(remaining).toBe(2);
    });

    it('should return 0 when limit is reached', async () => {
      // Arrange
      const memberId = members.validMember.id;
      const dailyLimit = 3;
      const currentSpins = 3;
      
      mockWheelRepository.getDailySpinCount.mockResolvedValue(currentSpins);

      // Act
      const remaining = await wheelService.calculateRemainingSpins(memberId, dailyLimit);

      // Assert
      expect(remaining).toBe(0);
    });
  });

  describe('processPrizeReward', () => {
    it('should process points reward correctly', async () => {
      // Arrange
      const member = members.validMember;
      const prize = { type: 'points', value: { amount: 100 } };
      
      mockTransactionService.createTransaction.mockResolvedValue({ success: true });

      // Act
      const result = await wheelService.processPrizeReward(member, prize);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith({
        member_id: member.id,
        type: 'wheel_prize',
        amount: 100,
        description: 'Lucky wheel prize',
        reference_type: 'wheel_spin'
      });
    });

    it('should process reward prize correctly', async () => {
      // Arrange
      const member = members.validMember;
      const prize = { 
        type: 'reward', 
        value: { description: 'Free coffee', code: 'COFFEE2024' } 
      };

      // Act
      const result = await wheelService.processPrizeReward(member, prize);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('reward_code', 'COFFEE2024');
    });
  });
});