import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuSummary } from '@/components/MenuSummary';
import type { Menu } from '@/lib/menu-schema';

const mockMenu: Menu = {
  restaurantName: 'Pizza Palace',
  menuType: 'dinner',
  categories: [
    {
      name: 'Pizzas',
      description: 'Hand-tossed',
      items: [
        {
          name: 'Margherita',
          description: 'Tomato, mozzarella, basil',
          price: '$14',
          allergens: ['dairy', 'gluten'],
          dietaryFlags: ['vegetarian'],
          modifications: null,
          portionSize: null,
          confidence: 0.95,
        },
        {
          name: 'Pepperoni',
          description: 'Classic pepperoni',
          price: '$16',
          allergens: ['dairy', 'gluten'],
          dietaryFlags: [],
          modifications: null,
          portionSize: null,
          confidence: 0.9,
        },
      ],
    },
    {
      name: 'Drinks',
      description: null,
      items: [
        {
          name: 'Cola',
          description: null,
          price: '$3',
          allergens: [],
          dietaryFlags: [],
          modifications: null,
          portionSize: null,
          confidence: 0.99,
        },
      ],
    },
  ],
  extractionConfidence: 0.92,
  warnings: [],
};

describe('MenuSummary', () => {
  it('displays restaurant name', () => {
    render(<MenuSummary menu={mockMenu} />);
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
  });

  it('displays category count and item count', () => {
    render(<MenuSummary menu={mockMenu} />);
    expect(screen.getByText(/2 categories, 3 items/)).toBeInTheDocument();
  });

  it('renders category buttons with aria-expanded attribute', () => {
    render(<MenuSummary menu={mockMenu} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-expanded');
    });
  });

  it('expanding a category reveals item names and prices', async () => {
    render(<MenuSummary menu={mockMenu} />);
    const pizzaButton = screen.getByRole('button', { name: /pizzas/i });
    await userEvent.click(pizzaButton);
    expect(screen.getByText('Margherita')).toBeInTheDocument();
    expect(screen.getByText('$14')).toBeInTheDocument();
  });

  it('shows dietary flags on items', async () => {
    render(<MenuSummary menu={mockMenu} />);
    await userEvent.click(screen.getByRole('button', { name: /pizzas/i }));
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
  });

  it('shows warnings when present', () => {
    const menuWithWarnings = { ...mockMenu, warnings: ['Page 2 was blurry'] };
    render(<MenuSummary menu={menuWithWarnings} />);
    expect(screen.getByText('Page 2 was blurry')).toBeInTheDocument();
  });

  it('falls back to "Restaurant Menu" when restaurantName is null', () => {
    const menuNoName = { ...mockMenu, restaurantName: null };
    render(<MenuSummary menu={menuNoName} />);
    expect(screen.getByText('Restaurant Menu')).toBeInTheDocument();
  });
});
