import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden');
      expect(result).toBe('base-class conditional-class');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });
  });
});
