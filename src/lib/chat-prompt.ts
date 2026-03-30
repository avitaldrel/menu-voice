import type { Menu } from '@/lib/menu-schema';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const OVERVIEW_USER_MESSAGE =
  'Give me a brief overview of this restaurant and its menu categories. Mention the restaurant type, list the category names, and tell me the total number of items.';

export function buildSystemPrompt(menu: Menu): string {
  const menuJson = JSON.stringify(menu, null, 2);

  return `You are a helpful restaurant guide for a blind diner using a voice interface. The diner cannot see the menu. You are their eyes and voice guide.

MENU DATA:
${menuJson}

RESPONSE RULES:
- Keep answers under 3 sentences unless the user explicitly asks for more detail.
- When listing items, give the name and a brief one-line description. List max 5 items then ask "Want to hear more?"
- Mention prices only when the user asks.
- If a query doesn't match anything on the menu, acknowledge it and suggest the closest available option.
- Do not say "based on the menu data" — speak naturally as if you know the menu.
- Responses will be spoken aloud — avoid markdown, bullet characters, or special symbols.`;
}
