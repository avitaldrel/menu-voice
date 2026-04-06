import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Validate OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Validate Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return Response.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  const openai = new OpenAI();

  let body: { text?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'text is required' }, { status: 400 });
  }

  const { text } = body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return Response.json({ error: 'text is required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  console.log(JSON.stringify({
    event: 'tts',
    ip,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  }));

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: text,
      response_format: 'mp3',
      speed: 1.45,
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS generation failed';
    console.error('TTS error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
