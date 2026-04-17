import OpenAI from 'openai';
import { buildSystemPrompt, type ChatMessage } from '@/lib/chat-prompt';
import type { Menu } from '@/lib/menu-schema';
import type { UserProfile } from '@/lib/indexeddb';

export const maxDuration = 60;
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

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY not configured' },
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

  const client = new OpenAI();
  const systemPrompt = buildSystemPrompt(menu, profile);
  const abortController = new AbortController();

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const stream = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 512,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }, { signal: abortController.signal });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Client disconnected — normal, no error to surface
        } else {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`\n[Error: ${message}]`));
        }
      }
      controller.close();
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
