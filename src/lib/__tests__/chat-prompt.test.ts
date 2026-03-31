import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, type ChatMessage, OVERVIEW_USER_MESSAGE } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';

const testMenu: Menu = {
  restaurantName: 'Bella Italia',
  menuType: 'dinner',
  categories: [
    {
      name: 'Appetizers',
      description: 'Start your meal',
      items: [
        {
          name: 'Bruschetta',
          description: 'Toasted bread with tomatoes',
          price: '$8',
          allergens: ['gluten'],
          dietaryFlags: ['vegetarian'],
          modifications: null,
          portionSize: null,
          confidence: 0.95,
        },
        {
          name: 'Calamari',
          description: 'Fried squid rings',
          price: '$12',
          allergens: ['gluten', 'shellfish'],
          dietaryFlags: [],
          modifications: null,
          portionSize: null,
          confidence: 0.9,
        },
      ],
    },
    {
      name: 'Pasta',
      description: null,
      items: [
        {
          name: 'Spaghetti Carbonara',
          description: 'Egg, pancetta, parmesan',
          price: '$16',
          allergens: ['gluten', 'dairy', 'eggs'],
          dietaryFlags: [],
          modifications: ['can be made with gluten-free pasta'],
          portionSize: null,
          confidence: 0.92,
        },
      ],
    },
  ],
  extractionConfidence: 0.93,
  warnings: [],
};

describe('buildSystemPrompt', () => {
  it('includes full JSON.stringify output — restaurantName, category names, and item names appear', () => {
    const prompt = buildSystemPrompt(testMenu);
    // Verify the full JSON is included
    expect(prompt).toContain('Bella Italia');
    expect(prompt).toContain('Appetizers');
    expect(prompt).toContain('Pasta');
    expect(prompt).toContain('Spaghetti Carbonara');
    expect(prompt).toContain('Bruschetta');
    expect(prompt).toContain('Calamari');
  });

  it('includes the persona instruction "helpful restaurant guide"', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('helpful restaurant guide');
  });

  it('includes the "3 sentences" constraint', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('3 sentences');
  });

  it('includes the "5 items" listing limit rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('5 items');
  });

  it('includes the "prices only when asked" rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('prices only when the user asks');
  });

  it('includes the "no markdown" rule for spoken output', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('avoid markdown');
  });

  it('includes the recommendation clarifying question rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('clarifying question');
  });

  it('includes the conversation interest carry-forward rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toMatch(/interest.*earlier|earlier.*interest/is);
  });

  it('includes the ordinal reference resolution rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('prior responses');
  });

  it('includes the contrastive comparison format rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('comparing items');
  });

  it('includes price in comparison rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('price');
    expect(prompt).toMatch(/compar.*price|price.*compar/is);
  });

  it('includes the proactive narrowing trigger rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain('narrowing it down');
  });

  it('includes the clear final recommendation rule', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain("I'd suggest");
  });

  it('includes the single-recommendation rule for undecided users', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).toContain("can't decide");
  });
});

describe('ChatMessage', () => {
  it('has role: "user" | "assistant" and content: string', () => {
    // Type-level test — if this compiles, the type is correct
    const userMsg: ChatMessage = { role: 'user', content: 'hello' };
    const assistantMsg: ChatMessage = { role: 'assistant', content: 'hi there' };
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
    expect(userMsg.content).toBe('hello');
  });
});

describe('OVERVIEW_USER_MESSAGE', () => {
  it('is a non-empty string prompting for a menu overview', () => {
    expect(typeof OVERVIEW_USER_MESSAGE).toBe('string');
    expect(OVERVIEW_USER_MESSAGE.length).toBeGreaterThan(0);
  });
});
