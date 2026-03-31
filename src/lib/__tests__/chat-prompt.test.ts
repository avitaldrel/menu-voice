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

describe('buildSystemPrompt with allergy profile', () => {
  it('Test 1: no profile argument returns prompt WITHOUT allergy section', () => {
    const prompt = buildSystemPrompt(testMenu);
    expect(prompt).not.toContain('ALLERGY & PREFERENCE PROFILE');
    expect(prompt).not.toContain('ALLERGY RESPONSE RULES');
  });

  it('Test 2: null profile returns prompt WITHOUT allergy section', () => {
    const prompt = buildSystemPrompt(testMenu, null);
    expect(prompt).not.toContain('ALLERGY & PREFERENCE PROFILE');
    expect(prompt).not.toContain('ALLERGY RESPONSE RULES');
  });

  it('Test 3: empty profile (no allergies or dislikes) returns prompt WITHOUT allergy section', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: [], preferences: [], dislikes: [] });
    expect(prompt).not.toContain('ALLERGY & PREFERENCE PROFILE');
    expect(prompt).not.toContain('ALLERGY RESPONSE RULES');
  });

  it('Test 4: profile with allergies includes allergen names in prompt', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy', 'nuts'], preferences: [], dislikes: [] });
    expect(prompt).toContain('dairy');
    expect(prompt).toContain('nuts');
  });

  it('Test 5: prompt with allergies contains "safety-critical"', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['peanuts'], preferences: [], dislikes: [] });
    expect(prompt).toContain('safety-critical');
  });

  it('Test 6: profile with dislikes includes dislike item in prompt', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: [], preferences: [], dislikes: ['cilantro'] });
    expect(prompt).toContain('cilantro');
  });

  it('Test 7: prompt with dislikes contains "preference only"', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: [], preferences: [], dislikes: ['cilantro'] });
    expect(prompt).toContain('preference only');
  });

  it('Test 8: prompt with allergies contains proactive warning rule ("warn" or "heads up" keyword)', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    const lowerPrompt = prompt.toLowerCase();
    expect(lowerPrompt.includes('warn') || lowerPrompt.includes('heads up')).toBe(true);
  });

  it('Test 9: prompt with allergies contains modification suggestion ("ask" and "server" keywords)', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('ask');
    expect(prompt).toContain('server');
  });

  it('Test 10: prompt with allergies contains once-per-session safety disclaimer ("confirm with your server" or "confirm with" keyword)', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('confirm with');
  });

  it('Test 11: prompt with allergies contains "once" keyword for disclaimer frequency', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('once');
  });

  it('Test 12: prompt contains marker emission instruction "[ALLERGY:"', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('[ALLERGY:');
  });

  it('Test 13: prompt contains marker emission instruction "[DISLIKE:"', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('[DISLIKE:');
  });

  it('Test 14: prompt contains instruction to distinguish allergy vs. dislike ("allergy or" and "preference" keywords)', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt.toLowerCase()).toContain('allergy or');
    expect(prompt).toContain('preference');
  });

  it('Test 15: prompt contains instruction to confirm before capturing ("confirm" keyword)', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    expect(prompt).toContain('confirm');
  });

  it('Test 16: prompt contains instruction to mention noted allergies in overview', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy', 'nuts'], preferences: [], dislikes: [] });
    expect(prompt.toLowerCase()).toMatch(/overview|noted|mention/);
  });

  it('Test 17: prompt contains instruction to place markers at end of response', () => {
    const prompt = buildSystemPrompt(testMenu, { allergies: ['dairy'], preferences: [], dislikes: [] });
    const lowerPrompt = prompt.toLowerCase();
    expect(lowerPrompt.includes('end of') || lowerPrompt.includes('at the end')).toBe(true);
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
