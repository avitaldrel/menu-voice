import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

// Route Handler config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Validate API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
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

  const client = new Anthropic();

  // Build content blocks: label each page then its image
  const imageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = images.flatMap((img, i) => [
    { type: 'text' as const, text: `Menu page ${i + 1} of ${images.length}:` },
    {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: (img.mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: img.base64,
      },
    },
  ]);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
- Add warnings[] for any photo quality issues (blurry text, glare, partial visibility).`,
          },
        ],
      }],
    });

    // Extract text from response
    const textBlock = response.content.find(block => block.type === 'text');
    const raw = textBlock ? (textBlock as { type: 'text'; text: string }).text : '{}';

    // Strip accidental markdown fences (Pitfall 3)
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
