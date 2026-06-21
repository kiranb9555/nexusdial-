import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { Extraction, extractionSchema } from './extraction.schema';

export interface AiExtractor {
  readonly name: string;
  extract(transcript: string): Promise<Extraction>;
}

const SYSTEM_PROMPT =
  'You extract structured data from a voicemail transcript (which may mix Hindi and English). ' +
  'Respond ONLY with strict JSON matching: ' +
  '{"name": string|null, "intent": string (max 20 words)|null, ' +
  '"sentiment": "positive"|"neutral"|"negative", "callbackRequested": boolean}. ' +
  'Use null when a field is not present. Do not include any prose.';

class OpenAiExtractor implements AiExtractor {
  public readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async extract(transcript: string): Promise<Extraction> {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n"""${transcript}"""` },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('OpenAI returned empty content');
    }
    const parsed: unknown = JSON.parse(raw);
    // Validate before trusting the model output.
    return extractionSchema.parse(parsed);
  }
}

/**
 * Deterministic offline extractor. Used when AI_PROVIDER=mock or no key is set,
 * so the whole pipeline runs without external API calls or cost.
 */
class MockExtractor implements AiExtractor {
  public readonly name = 'mock';

  async extract(transcript: string): Promise<Extraction> {
    const lower = transcript.toLowerCase();

    const negative = /(bad|damaged|refund|der ho|complain|worst|nahi mila)/.test(lower);
    const positive = /(thank|excellent|great|recommend|good)/.test(lower);
    const sentiment: Extraction['sentiment'] = negative
      ? 'negative'
      : positive
        ? 'positive'
        : 'neutral';

    const callbackRequested = /(call ?back|callback|call me|reply|update|please call)/.test(lower);

    let intent: string | null = null;
    if (/order|quotation|bulk|catering/.test(lower)) intent = 'wants to place an order';
    else if (/refund|damaged|complain/.test(lower)) intent = 'complaint about delivery';
    else if (/appointment|book/.test(lower)) intent = 'wants to book an appointment';
    else if (/pricing|plan|jaankari|information/.test(lower)) intent = 'asking for product information';
    else if (/invoice|payment/.test(lower)) intent = 'payment or invoice query';
    else if (/plumbing|kaam/.test(lower)) intent = 'requesting a service visit';

    const nameMatch = transcript.match(/\b(?:main|this is|main hoon|bol raha hoon|bol rahi hoon)\s+([A-Z][a-z]+)/);
    const altName = transcript.match(/\bI'?m\s+([A-Z][a-z]+)/);
    const name = nameMatch?.[1] ?? altName?.[1] ?? null;

    return extractionSchema.parse({ name, intent, sentiment, callbackRequested });
  }
}

let extractorSingleton: AiExtractor | null = null;

export function getExtractor(): AiExtractor {
  if (extractorSingleton) return extractorSingleton;

  if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    extractorSingleton = new OpenAiExtractor(env.OPENAI_API_KEY);
  } else {
    if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
      logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY missing; falling back to mock extractor');
    }
    extractorSingleton = new MockExtractor();
  }
  logger.info('ai extractor initialised', { provider: extractorSingleton.name });
  return extractorSingleton;
}

/** Test seam to inject a custom extractor. */
export function setExtractor(extractor: AiExtractor | null): void {
  extractorSingleton = extractor;
}
