import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Route Handler config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Validate Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  // Validate API key exists
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  let body: { images: Array<{ base64: string; mimeType: string }> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { images } = body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json(
      { error: 'At least one image is required' },
      { status: 400 }
    );
  }

  if (images.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 images per request' },
      { status: 400 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  console.log(JSON.stringify({
    event: 'menu_extract',
    ip,
    imageCount: images.length,
    timestamp: new Date().toISOString(),
  }));

  const client = new OpenAI();

  // Build content blocks: label each page then its image
  const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = images.flatMap((img, i) => [
    { type: 'text' as const, text: `Menu page ${i + 1} of ${images.length}:` },
    {
      type: 'image_url' as const,
      image_url: {
        url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`,
      },
    },
  ]);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Extract the complete restaurant menu from these ${images.length} page(s).
Return ONLY valid JSON — no markdown fences, no explanation — matching this exact schema:
{
  "restaurantName": string | null,
  "menuType": string | null,
  "categories": [
    {
      "name": string,
      "description": string | null,
      "items": [
        {
          "name": string,
          "description": string | null,
          "price": string | null,
          "allergens": string[],
          "dietaryFlags": string[],
          "modifications": string[] | null,
          "portionSize": string | null,
          "confidence": number
        }
      ]
    }
  ],
  "extractionConfidence": number,
  "warnings": string[]
}
Rules:
- Infer categories even if the menu has no section headers (e.g., a flat list of burgers, sides, drinks becomes separate categories).
- Extract every visible item. Include dietary flags inferred from descriptions (e.g., "cream sauce" -> allergens: ["dairy"]).
- Price stays as a string to handle "Market Price", "$12/$18" (half/full), etc.
- Set confidence 0-1 per item; lower for blurry or partially visible text.
- Merge all pages into one coherent menu — no duplicate category headers.
- warnings[] is ONLY for photo quality issues that make text unreadable (blurry, too dark, glare, cut off). Do NOT add warnings about menu content like "limited availability", "seasonal", "specials", or missing restaurant name — those are not photo problems.
- If all items are readable, warnings must be an empty array and extractionConfidence should be high (0.8+).`,
          },
        ],
      }],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';

    // Strip accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

    let menu;
    try {
      menu = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse menu data from AI response' },
        { status: 502 }
      );
    }

    return NextResponse.json(menu);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI extraction failed';
    console.error('Menu extraction error:', message);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
