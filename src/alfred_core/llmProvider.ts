// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Proveedor LLM Abstracto
// Permite intercambiar el motor de lenguaje (Gemini / OpenAI / OpenRouter)
// sin tocar el resto del sistema. Prioridad de detección automática:
//   1. GEMINI_API_KEY   → Google Gemini (gemini-2.0-flash-exp o superior)
//   2. OPENAI_API_KEY   → OpenAI (gpt-4o-mini por defecto)
//   3. OPENROUTER_API_KEY → OpenRouter (cualquier modelo)
//   4. Ninguna disponible → modo offline (fallback determinista, sin LLM)
// ═══════════════════════════════════════════════════════════════════════
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export interface LLMProvider {
  isAvailable(): boolean;
  name(): string;
  modelName(): string;
  generateText(systemPrompt: string, history: { role: 'user' | 'model'; text: string }[], userMessage: string): Promise<string>;
  generateJSON(prompt: string): Promise<string>;
}

class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI | null = null;
  private model = process.env.ALFRED_LLM_MODEL || 'gemini-2.0-flash-exp';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  isAvailable() { return this.client !== null; }
  name() { return 'Google Gemini'; }
  modelName() { return this.model; }

  async generateText(systemPrompt: string, history: { role: 'user' | 'model'; text: string }[], userMessage: string): Promise<string> {
    if (!this.client) throw new Error('Gemini client not initialized');
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      config: { systemInstruction: systemPrompt, temperature: 0.4 },
    });
    return response.text || '';
  }

  async generateJSON(prompt: string): Promise<string> {
    if (!this.client) throw new Error('Gemini client not initialized');
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: 'application/json' },
    });
    return response.text || '{}';
  }
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null;
  private model = process.env.ALFRED_LLM_MODEL || 'gpt-4o-mini';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  isAvailable() { return this.client !== null; }
  name() { return 'OpenAI'; }
  modelName() { return this.model; }

  async generateText(systemPrompt: string, history: { role: 'user' | 'model'; text: string }[], userMessage: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user', content: h.text })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
    });
    return completion.choices[0]?.message?.content || '';
  }

  async generateJSON(prompt: string): Promise<string> {
    if (!this.client) throw new Error('OpenAI client not initialized');
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content || '{}';
  }
}

class OpenRouterProvider implements LLMProvider {
  private client: OpenAI | null = null;
  private model = process.env.ALFRED_LLM_MODEL || 'anthropic/claude-sonnet-4';

  constructor() {
    if (process.env.OPENROUTER_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });
    }
  }

  isAvailable() { return this.client !== null; }
  name() { return 'OpenRouter'; }
  modelName() { return this.model; }

  async generateText(systemPrompt: string, history: { role: 'user' | 'model'; text: string }[], userMessage: string): Promise<string> {
    if (!this.client) throw new Error('OpenRouter client not initialized');
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user', content: h.text })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
    });
    return completion.choices[0]?.message?.content || '';
  }

  async generateJSON(prompt: string): Promise<string> {
    if (!this.client) throw new Error('OpenRouter client not initialized');
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt + '\n\nResponde ÚNICAMENTE con JSON válido.' }],
      temperature: 0.1,
    });
    const content = completion.choices[0]?.message?.content || '{}';
    // Extraer JSON aunque venga envuelto en markdown ```json ... ```
    const match = content.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}

class OfflineProvider implements LLMProvider {
  isAvailable() { return false; }
  name() { return 'Offline (sin motor LLM configurado)'; }
  modelName() { return 'none'; }
  async generateText(): Promise<string> { throw new Error('No LLM provider available'); }
  async generateJSON(): Promise<string> { throw new Error('No LLM provider available'); }
}

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  if (process.env.GEMINI_API_KEY) {
    cachedProvider = new GeminiProvider();
  } else if (process.env.OPENAI_API_KEY) {
    cachedProvider = new OpenAIProvider();
  } else if (process.env.OPENROUTER_API_KEY) {
    cachedProvider = new OpenRouterProvider();
  } else {
    cachedProvider = new OfflineProvider();
  }

  return cachedProvider;
}
