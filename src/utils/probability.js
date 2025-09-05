const logger = require('./logger');

/**
 * Weighted random selection for lucky wheel
 * @param {Array} items - Array of wheel items with probability weights
 * @returns {Object|null} Selected item or null if no items
 */
const weightedRandomSelection = (items) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      logger.warn('No items provided for weighted random selection');
      return null;
    }

    // Filter active items only
    const activeItems = items.filter(item => item.active !== false);
    
    if (activeItems.length === 0) {
      logger.warn('No active items available for selection');
      return null;
    }

    // Calculate total weight
    const totalWeight = activeItems.reduce((sum, item) => {
      const weight = parseFloat(item.probability) || 0;
      return sum + weight;
    }, 0);

    if (totalWeight <= 0) {
      logger.warn('Total weight is zero or negative', { totalWeight });
      return null;
    }

    // Generate random number between 0 and totalWeight
    const random = Math.random() * totalWeight;
    
    // Find the selected item
    let currentWeight = 0;
    for (const item of activeItems) {
      currentWeight += parseFloat(item.probability) || 0;
      if (random <= currentWeight) {
        logger.debug('Item selected by weighted random', {
          itemId: item.id,
          itemName: item.name,
          probability: item.probability,
          random,
          currentWeight
        });
        return item;
      }
    }

    // Fallback to last item (shouldn't happen with proper weights)
    const fallbackItem = activeItems[activeItems.length - 1];
    logger.warn('Fallback to last item in weighted selection', {
      itemId: fallbackItem.id,
      totalWeight,
      random
    });
    
    return fallbackItem;
  } catch (error) {
    logger.error('Error in weighted random selection:', error);
    return null;
  }
};

/**
 * Validate wheel item probabilities
 * @param {Array} items - Array of wheel items
 * @returns {Object} Validation result
 */
const validateWheelProbabilities = (items) => {
  const result = {
    isValid: false,
    totalProbability: 0,
    errors: [],
    warnings: []
  };

  try {
    if (!Array.isArray(items)) {
      result.errors.push('Items must be an array');
      return result;
    }

    if (items.length === 0) {
      result.errors.push('At least one item is required');
      return result;
    }

    const activeItems = items.filter(item => item.active !== false);
    
    if (activeItems.length === 0) {
      result.errors.push('At least one active item is required');
      return result;
    }

    // Check individual probabilities
    for (const item of activeItems) {
      const probability = parseFloat(item.probability);
      
      if (isNaN(probability)) {
        result.errors.push(`Item "${item.name}" has invalid probability: ${item.probability}`);
        continue;
      }
      
      if (probability < 0) {
        result.errors.push(`Item "${item.name}" has negative probability: ${probability}`);
        continue;
      }
      
      if (probability > 1) {
        result.warnings.push(`Item "${item.name}" has probability > 1: ${probability}`);
      }
      
      result.totalProbability += probability;
    }

    // Check total probability
    if (Math.abs(result.totalProbability - 1) > 0.001) {
      result.warnings.push(`Total probability is ${result.totalProbability.toFixed(6)}, should be close to 1.0`);
    }

    result.isValid = result.errors.length === 0 && result.totalProbability > 0;
    
    return result;
  } catch (error) {
    logger.error('Error validating wheel probabilities:', error);
    result.errors.push('Validation failed due to internal error');
    return result;
  }
};

/**
 * Normalize wheel item probabilities to sum to 1.0
 * @param {Array} items - Array of wheel items
 * @returns {Array} Items with normalized probabilities
 */
const normalizeWheelProbabilities = (items) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const activeItems = items.filter(item => item.active !== false);
    
    if (activeItems.length === 0) {
      return items;
    }

    // Calculate total weight
    const totalWeight = activeItems.reduce((sum, item) => {
      const weight = parseFloat(item.probability) || 0;
      return sum + Math.max(0, weight); // Ensure non-negative
    }, 0);

    if (totalWeight <= 0) {
      // If all weights are zero, distribute equally
      const equalProbability = 1 / activeItems.length;
      return items.map(item => {
        if (item.active === false) return item;
        return {
          ...item,
          probability: equalProbability
        };
      });
    }

    // Normalize probabilities
    const normalizedItems = items.map(item => {
      if (item.active === false) return item;
      
      const currentProbability = parseFloat(item.probability) || 0;
      const normalizedProbability = Math.max(0, currentProbability) / totalWeight;
      
      return {
        ...item,
        probability: normalizedProbability
      };
    });

    logger.debug('Wheel probabilities normalized', {
      originalTotal: totalWeight,
      normalizedTotal: 1.0,
      itemCount: activeItems.length
    });

    return normalizedItems;
  } catch (error) {
    logger.error('Error normalizing wheel probabilities:', error);
    return items;
  }
};

/**
 * Calculate win rate statistics
 * @param {Array} spinHistory - Array of spin history records
 * @param {Number} timeframeHours - Timeframe in hours (default: 24)
 * @returns {Object} Win rate statistics
 */
const calculateWinRate = (spinHistory, timeframeHours = 24) => {
  try {
    if (!Array.isArray(spinHistory)) {
      return {
        totalSpins: 0,
        wins: 0,
        winRate: 0,
        timeframe: timeframeHours
      };
    }

    const cutoffTime = new Date(Date.now() - (timeframeHours * 60 * 60 * 1000));
    
    const recentSpins = spinHistory.filter(spin => {
      const spinTime = new Date(spin.spun_at || spin.createdAt);
      return spinTime >= cutoffTime;
    });

    const totalSpins = recentSpins.length;
    const wins = recentSpins.filter(spin => spin.wheel_item_id !== null).length;
    const winRate = totalSpins > 0 ? (wins / totalSpins) : 0;

    return {
      totalSpins,
      wins,
      winRate: parseFloat(winRate.toFixed(4)),
      timeframe: timeframeHours,
      period: {
        from: cutoffTime.toISOString(),
        to: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error calculating win rate:', error);
    return {
      totalSpins: 0,
      wins: 0,
      winRate: 0,
      timeframe: timeframeHours,
      error: error.message
    };
  }
};

/**
 * Generate random outcome based on configured odds
 * @param {Number} winProbability - Probability of winning (0-1)
 * @returns {Boolean} True if win, false if loss
 */
const generateRandomOutcome = (winProbability = 0.5) => {
  try {
    const probability = Math.max(0, Math.min(1, parseFloat(winProbability) || 0.5));
    const random = Math.random();
    
    const isWin = random < probability;
    
    logger.debug('Random outcome generated', {
      winProbability: probability,
      random,
      isWin
    });
    
    return isWin;
  } catch (error) {
    logger.error('Error generating random outcome:', error);
    return false;
  }
};

/**
 * Calculate expected value for wheel items
 * @param {Array} items - Array of wheel items with values and probabilities
 * @returns {Number} Expected value
 */
const calculateExpectedValue = (items) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return 0;
    }

    const activeItems = items.filter(item => item.active !== false);
    
    const expectedValue = activeItems.reduce((sum, item) => {
      const probability = parseFloat(item.probability) || 0;
      const value = parseFloat(item.value?.points || item.value?.amount || 0);
      return sum + (probability * value);
    }, 0);

    logger.debug('Expected value calculated', {
      expectedValue: expectedValue.toFixed(2),
      itemCount: activeItems.length
    });

    return parseFloat(expectedValue.toFixed(2));
  } catch (error) {
    logger.error('Error calculating expected value:', error);
    return 0;
  }
};

/**
 * Simulate wheel spins for testing
 * @param {Array} items - Array of wheel items
 * @param {Number} spinCount - Number of spins to simulate
 * @returns {Object} Simulation results
 */
const simulateWheelSpins = (items, spinCount = 1000) => {
  try {
    const results = {
      totalSpins: spinCount,
      outcomes: {},
      winRate: 0,
      expectedValue: calculateExpectedValue(items)
    };

    // Initialize outcome counters
    items.forEach(item => {
      if (item.active !== false) {
        results.outcomes[item.id] = {
          name: item.name,
          count: 0,
          expectedCount: Math.round(spinCount * (parseFloat(item.probability) || 0)),
          actualProbability: 0
        };
      }
    });

    // Simulate spins
    let wins = 0;
    for (let i = 0; i < spinCount; i++) {
      const selectedItem = weightedRandomSelection(items);
      if (selectedItem) {
        results.outcomes[selectedItem.id].count++;
        if (selectedItem.type !== 'empty' && selectedItem.type !== 'nothing') {
          wins++;
        }
      }
    }

    // Calculate actual probabilities
    Object.keys(results.outcomes).forEach(itemId => {
      const outcome = results.outcomes[itemId];
      outcome.actualProbability = parseFloat((outcome.count / spinCount).toFixed(4));
    });

    results.winRate = parseFloat((wins / spinCount).toFixed(4));

    logger.debug('Wheel spin simulation completed', {
      spinCount,
      winRate: results.winRate,
      expectedValue: results.expectedValue
    });

    return results;
  } catch (error) {
    logger.error('Error simulating wheel spins:', error);
    return {
      totalSpins: 0,
      outcomes: {},
      winRate: 0,
      expectedValue: 0,
      error: error.message
    };
  }
};

module.exports = {
  weightedRandomSelection,
  validateWheelProbabilities,
  normalizeWheelProbabilities,
  calculateWinRate,
  generateRandomOutcome,
  calculateExpectedValue,
  simulateWheelSpins
};