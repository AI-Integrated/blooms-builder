import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../ui/button';

describe('Button', () => {
  it('should render button with text', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    let clicked = false;
    const handleClick = () => {
      clicked = true;
    };

    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = getByRole('button');
    await userEvent.click(button);
    
    expect(clicked).toBe(true);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button')).toBeDisabled();
  });

  it('should apply variant classes', () => {
    const { getByRole, rerender } = render(<Button variant="default">Default</Button>);
    expect(getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByRole('button')).toHaveClass('border');
  });

  it('should apply size classes', () => {
    const { getByRole, rerender } = render(<Button size="default">Default</Button>);
    expect(getByRole('button')).toHaveClass('h-10');

    rerender(<Button size="sm">Small</Button>);
    expect(getByRole('button')).toHaveClass('h-9');

    rerender(<Button size="lg">Large</Button>);
    expect(getByRole('button')).toHaveClass('h-11');
  });
});
