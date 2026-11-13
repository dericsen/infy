import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ContextualizeRequestSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.string().min(1).max(20),
  weatherForecast: z.object({
    condition: z.string().min(1).max(60),
    temperatureC: z.number().min(-40).max(55),
    precipitationProbability: z.number().min(0).max(100)
  }),
  eventContext: z.string().max(240),
  bounds: z
    .object({
      maxDecreasePct: z.number().min(0).max(60).default(30),
      maxIncreasePct: z.number().min(0).max(60).default(35)
    })
    .optional(),
  dishes: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        station: z.enum(['Grill', 'Saute', 'Garde Manger', 'Bakery']),
        category: z.string().min(1),
        baseSales: z.number().min(0),
        recentAverage: z.number().min(0)
      })
    )
    .min(1)
    .max(100)
});

export const GeminiAdjustmentOutputSchema = z.object({
  generalAssessment: z.string().min(1),
  adjustments: z.array(
    z.object({
      dishId: z.string().min(1),
      suggestedMultiplier: z.number().finite(),
      rationale: z.string().min(1),
      riskOfWaste: z.enum(['Low', 'Medium', 'High'])
    })
  )
});

export type ContextualizeRequestPayload = z.infer<typeof ContextualizeRequestSchema>;

export interface GeminiClientLike {
  models: {
    generateContent: (params: Record<string, unknown>) => Promise<{ text?: string }>;
  };
}

export function clampMultiplier(
  rawValue: number,
  maxDecreasePct: number,
  maxIncreasePct: number
): number {
  if (!Number.isFinite(rawValue)) return 0;
  const minVal = -1 * (maxDecreasePct / 100);
  const maxVal = maxIncreasePct / 100;
  const clamped = Math.max(minVal, Math.min(maxVal, rawValue));
  return Math.round(clamped * 1000) / 1000;
}

export function createGeminiClient(apiKey: string): GeminiClientLike {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export async function runContextualForecastWithGemini(
  payload: ContextualizeRequestPayload,
  aiClient: GeminiClientLike,
  timeoutMs: number = 12000
) {
  const maxDecreasePct = payload.bounds?.maxDecreasePct ?? 30;
  const maxIncreasePct = payload.bounds?.maxIncreasePct ?? 35;

  const minMult = -(maxDecreasePct / 100);
  const maxMult = maxIncreasePct / 100;

  const prompt = [
    `Analyze next-day restaurant demand context for The Rustic Table on ${payload.targetDate} (${payload.dayOfWeek}).`,
    `Weather: ${payload.weatherForecast.condition}, ${payload.weatherForecast.temperatureC}C, precipitation chance ${payload.weatherForecast.precipitationProbability}%.`,
    `Local events & calendar context: ${payload.eventContext || 'Regular Service'}.`,
    `Allowed multiplier bounds: [${minMult.toFixed(2)}, +${maxMult.toFixed(2)}].`,
    `Do NOT invent sales unit totals. Return only bounded percentage modifiers relative to the provided 4-week statistical base.`,
    `Dishes: ${JSON.stringify(payload.dishes)}`
  ].join('\n');

  const modelName = 'gemini-4-hydrogen';

  const geminiPromise = aiClient.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction:
        'You are a culinary operations analyst advising on restaurant prep par adjustments. Return strict JSON matching the schema. Never invent raw sales figures; output only bounded relative multipliers and concise kitchen rationales.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          generalAssessment: {
            type: Type.STRING,
            description: 'One concise paragraph summarizing expected weather and event impacts across stations.'
          },
          adjustments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dishId: { type: Type.STRING },
                suggestedMultiplier: {
                  type: Type.NUMBER,
                  description: `Decimal modifier between ${minMult.toFixed(2)} and ${maxMult.toFixed(2)}, e.g. 0.15 for +15% or -0.12 for -12%.`
                },
                rationale: { type: Type.STRING },
                riskOfWaste: {
                  type: Type.STRING,
                  enum: ['Low', 'Medium', 'High']
                }
              },
              required: ['dishId', 'suggestedMultiplier', 'rationale', 'riskOfWaste']
            }
          }
        },
        required: ['generalAssessment', 'adjustments']
      }
    }
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Gemini contextual forecast request timed out')), timeoutMs);
  });

  const response = await Promise.race([geminiPromise, timeoutPromise]);
  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response payload');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini returned malformed JSON output');
  }

  const validated = GeminiAdjustmentOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('Gemini JSON response failed schema validation');
  }

  const byId = new Map(validated.data.adjustments.map(a => [a.dishId, a]));

  const normalizedAdjustments = payload.dishes.map(dish => {
    const item = byId.get(dish.id);
    if (!item) {
      return {
        dishId: dish.id,
        suggestedMultiplier: 0,
        clampedMultiplier: 0,
        rationale: 'No contextual shift suggested for this item.',
        riskOfWaste: 'Low' as const
      };
    }

    const clamped = clampMultiplier(item.suggestedMultiplier, maxDecreasePct, maxIncreasePct);
    return {
      dishId: dish.id,
      suggestedMultiplier: item.suggestedMultiplier,
      clampedMultiplier: clamped,
      rationale: item.rationale,
      riskOfWaste: item.riskOfWaste
    };
  });

  return {
    modelVersion: modelName,
    generalAssessment: validated.data.generalAssessment,
    adjustments: normalizedAdjustments,
    isOfflineFallback: false
  };
}

export function createApiApp(clientOverride?: GeminiClientLike | null) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/forecast/contextualize', async (req: Request, res: Response) => {
    const parsed = ContextualizeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid forecast contextualization request payload',
        details: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const activeClient = clientOverride !== undefined
      ? clientOverride
      : apiKey
      ? createGeminiClient(apiKey)
      : null;

    if (!activeClient) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server; client should use deterministic fallback.',
        fallbackRequired: true
      });
      return;
    }

    try {
      const result = await runContextualForecastWithGemini(parsed.data, activeClient);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upstream Gemini failure';
      res.status(502).json({
        error: message,
        fallbackRequired: true
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`WasteLess server listening on http://0.0.0.0:${port}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer();
}
