# Testing Guide

This project uses Vitest as the testing framework along with React Testing Library for component testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Running Full System Checks

```bash
# Run all checks (lint, type-check, format, test)
npm run check:all
```

## Writing Tests

### Unit Tests

Place unit tests next to the file being tested with `.test.ts` or `.test.tsx` extension:

```
src/
  lib/
    utils.ts
    __tests__/
      utils.test.ts
```

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Tests

Place integration tests in `src/test/integration/`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

describe('Feature Integration', () => {
  it('should work end-to-end', async () => {
    // Test implementation
  });
});
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Wait for async operations** - Use `waitFor`, `findBy*` for async updates
4. **Clean tests** - Each test should be independent and clean up after itself
5. **Descriptive test names** - Use clear, descriptive test names that explain the expected behavior

## Coverage Goals

- **Unit Tests**: Aim for 80%+ coverage on utility functions and services
- **Component Tests**: Cover critical user interactions and edge cases
- **Integration Tests**: Test key user workflows end-to-end

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
