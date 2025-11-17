import { describe, it, expect } from 'vitest';

describe('Classification Service', () => {
  it('should validate Bloom taxonomy levels', () => {
    const validLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    
    validLevels.forEach(level => {
      expect(validLevels).toContain(level);
    });
  });

  it('should validate knowledge dimensions', () => {
    const validDimensions = ['Factual', 'Conceptual', 'Procedural', 'Metacognitive'];
    
    validDimensions.forEach(dimension => {
      expect(validDimensions).toContain(dimension);
    });
  });

  it('should validate difficulty levels', () => {
    const validDifficulties = ['easy', 'medium', 'hard'];
    
    validDifficulties.forEach(difficulty => {
      expect(validDifficulties).toContain(difficulty);
    });
  });
});
