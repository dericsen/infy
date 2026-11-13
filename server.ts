import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GEMINI_TIMEOUT_MS = 12000;

interface DishInput {
  id: string;
  name: string;
  station: string;
  category: string;
  baseSales: number;
}

interface ContextualizeBody {
  targetDate: string;
  dayOfWeek: string;
  weatherForecast: {
    condition: string;
    temperatureC: number;
    precipitationProbability: number;
  };
  eventContext: string;
  adjustmentLimitPct?: number;
  dishes: DishInput[];
}

function validateContextualizeBody(body: unknown): { valid: true; data: ContextualizeBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const b = body as Record<string, unknown>;
  if (typeof b.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.targetDate)) {
    return { valid: false, error: 'targetDate must be a valid YYYY-MM-DD string.' };
  }

  if (typeof b.dayOfWeek !== 'string' || b.dayOfWeek.trim().length === 0) {
    return { valid: false, error: 'dayOfWeek is required.' };
  }

  if (!b.weatherForecast || typeof b.weatherForecast !== 'object') {
    return { valid: false, error: 'weatherForecast object is required.' };
  }

  const wf = b.weatherForecast as Record<string, unknown>;
  if (typeof wf.condition !== 'string' || typeof wf.temperatureC !== 'number' || typeof wf.precipitationProbability !== 'number') {
    return { valid: false, error: 'weatherForecast must include condition, temperatureC, and precipitationProbability.' };
  }

  if (!Array.isArray(b.dishes) || b.dishes.length === 0 || b.dishes.length > 100) {
    return { valid: false, error: 'dishes must be a non-empty array of at most 100 menu items.' };
  }

  for (const d of b.dishes) {
    if (!d || typeof d !== 'object') {
      return { valid: false, error: 'Each dish must be an object.' };
    }
    const item = d as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.station !== 'string' || typeof item.baseSales !== 'number' || item.baseSales < 0) {
      return { valid: false, error: 'Each dish requires valid id, name, station, and non-negative baseSales.' };
    }
  }

  const rawLimit = typeof b.adjustmentLimitPct === 'number' ? b.adjustmentLimitPct : 15;
  const clampedLimit = Math.max(5, Math.min(35, rawLimit));

  return {
    valid: true,
    data: {
      targetDate: b.targetDate,
      dayOfWeek: b.dayOfWeek,
      weatherForecast: {
        condition: wf.condition,
        temperatureC: wf.temperatureC,
        precipitationProbability: wf.precipitationProbability
      },
      eventContext: typeof b.eventContext === 'string' ? b.eventContext.slice(0, 200) : 'Regular Service',
      adjustmentLimitPct: clampedLimit,
      dishes: b.dishes as DishInput[]
    }
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/forecast/contextualize', async (req, res) => {
    const validation = validateContextualizeBody(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error, fallbackRequired: true });
      return;
    }

    const payload = validation.data;
    const limitRatio = (payload.adjustmentLimitPct || 15) / 100;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        fallbackRequired: true
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = JSON.stringify({
      targetDate: payload.targetDate,
      dayOfWeek: payload.dayOfWeek,
      weatherForecast: payload.weatherForecast,
      eventContext: payload.eventContext,
      adjustmentBounds: {
        minMultiplier: -limitRatio,
        maxMultiplier: limitRatio
      },
      dishes: payload.dishes.map(d => ({
        id: d.id,
        name: d.name,
        station: d.station,
        category: d.category,
        statisticalBaseSales: d.baseSales
      }))
    });

    const systemInstruction = [
      'You are an operations analyst assisting a single-location restaurant kitchen.',
      'Analyze ONLY the provided JSON context: targetDate, dayOfWeek, weatherForecast, eventContext, and dishes.',
      'Do NOT invent events, holidays, weather conditions, or historical sales numbers not present in the input.',
      `For each dish, recommend a bounded demand multiplier between -${limitRatio.toFixed(2)} and +${limitRatio.toFixed(2)} (representing percentage change from statisticalBaseSales).`,
      'Provide a concise, plain-English operational rationale per dish explaining how the provided weather, temperature, day of week, or event affects customer ordering.',
      'Assign riskOfWaste as Low, Medium, or High considering perishability and demand uncertainty.'
    ].join(' ');

    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Gemini contextualization request timed out.')), GEMINI_TIMEOUT_MS);
      });

      const generatePromise = ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              generalAssessment: {
                type: Type.STRING,
                description: 'Concise 1-2 sentence kitchen briefing summarizing the provided contextual factors.'
              },
              adjustments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dishId: { type: Type.STRING },
                    suggestedMultiplier: { type: Type.NUMBER },
                    rationale: { type: Type.STRING },
                    riskOfWaste: { type: Type.STRING }
                  },
                  required: ['dishId', 'suggestedMultiplier', 'rationale', 'riskOfWaste']
                }
              }
            },
            required: ['generalAssessment', 'adjustments']
          }
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini model.', fallbackRequired: true });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        generalAssessment?: unknown;
        adjustments?: unknown[];
      };

      if (typeof parsed.generalAssessment !== 'string' || !Array.isArray(parsed.adjustments)) {
        res.status(502).json({ error: 'Invalid structured response schema from Gemini.', fallbackRequired: true });
        return;
      }

      const validDishIds = new Set(payload.dishes.map(d => d.id));
      const boundedAdjustments = parsed.adjustments
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .filter(item => typeof item.dishId === 'string' && validDishIds.has(item.dishId))
        .map(item => {
          const rawMult = typeof item.suggestedMultiplier === 'number' && Number.isFinite(item.suggestedMultiplier)
            ? item.suggestedMultiplier
            : 0;
          const clampedMult = Math.round(Math.max(-limitRatio, Math.min(limitRatio, rawMult)) * 1000) / 1000;
          const risk = item.riskOfWaste === 'High' || item.riskOfWaste === 'Medium' || item.riskOfWaste === 'Low'
            ? item.riskOfWaste
            : 'Medium';
          const rationale = typeof item.rationale === 'string' && item.rationale.trim().length > 0
            ? item.rationale.trim().slice(0, 280)
            : 'Contextual adjustment bounded within safety limits.';

          return {
            dishId: item.dishId as string,
            suggestedMultiplier: clampedMult,
            rationale,
            riskOfWaste: risk as 'Low' | 'Medium' | 'High'
          };
        });

      res.json({
        modelVersion: 'gemini-4-hydrogen',
        adjustmentLimitPct: payload.adjustmentLimitPct,
        generalAssessment: parsed.generalAssessment.slice(0, 500),
        adjustments: boundedAdjustments,
        isFallback: false,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected server error during contextualization.';
      const status = message.includes('timed out') ? 504 : 502;
      res.status(status).json({
        error: message,
        fallbackRequired: true
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WasteLess server listening on port ${PORT}`);
  });
}

startServer();
