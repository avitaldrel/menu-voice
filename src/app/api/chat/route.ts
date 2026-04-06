import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, type ChatMessage } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';
import type { UserProfile } from '@/lib/indexeddb';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Validate Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return Response.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  let body: { messages: ChatMessage[]; menu: Menu; profile?: UserProfile | null };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { messages, menu, profile } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: 'Messages array is required and must not be empty' },
      { status: 400 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  console.log(JSON.stringify({
    event: 'chat_turn',
    ip,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  }));

  const client = new Anthropic();
  const systemPrompt = buildSystemPrompt(menu, profile);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      stream.on('text', (textDelta) => {
        controller.enqueue(encoder.encode(textDelta));
      });
      try {
        await stream.finalMessage();
      } catch (err) {
        // Stream error — close with error unless already cancelled
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`\n[Error: ${message}]`));
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
