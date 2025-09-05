/**
 * Basic Test
 * Simple test to verify Jest setup is working
 */

describe('Basic Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should work with objects', () => {
    const testObj = {
      name: 'test',
      value: 123
    };
    
    expect(testObj).toHaveProperty('name', 'test');
    expect(testObj).toHaveProperty('value', 123);
  });

  test('should work with arrays', () => {
    const testArray = [1, 2, 3, 4, 5];
    
    expect(testArray).toHaveLength(5);
    expect(testArray).toContain(3);
    expect(testArray[0]).toBe(1);
  });
});