import OpenAI from 'openai';

const openai = new OpenAI(); // reads OPENAI_API_KEY from env automatically

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
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
