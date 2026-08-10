import '../env';
// ═══════════════════════════════════════════════════════════════════════
// MOTOR TTS — Voz masculina, formal, estilo mayordomo británico.
// Prioridad: ElevenLabs Rupert/Alfred → Gemini TTS → Web Speech API local.
// Config principal recibida del agente ElevenLabs:
//   agent_id: agent_0001kzhcg3anecc9xmf62eceh6m9
//   voice_id: 89gcX1AeMGgcsN8ypHLu
//   model_id: eleven_multilingual_v2
// ═══════════════════════════════════════════════════════════════════════
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import OpenAI from 'openai';
import { Language } from '../types';

interface TTSResult {
  audioBase64: string | null;
  format?: string;
  sampleRate?: number;
  useWebSpeechFallback: boolean;
  provider?: 'elevenlabs' | 'gemini' | 'openai' | 'web_speech';
  voiceId?: string;
  modelId?: string;
}

const ELEVENLABS_AGENT_ID = process.env.ALFRED_ELEVENLABS_AGENT_ID || 'agent_0001kzhcg3anecc9xmf62eceh6m9';
const ELEVENLABS_VOICE_ID = process.env.ALFRED_TTS_VOICE_ID || '89gcX1AeMGgcsN8ypHLu';
const ELEVENLABS_MODEL = process.env.ALFRED_TTS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ALFRED_TTS_OUTPUT_FORMAT || 'mp3_44100_128';
const GEMINI_TTS_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ttsCooldownUntil: Record<string, number> = {};

function providerAvailable(provider: string): boolean {
  return (ttsCooldownUntil[provider] || 0) <= Date.now();
}

function coolDownProvider(provider: string, status: unknown): void {
  const code = Number(status);
  if ([400, 401, 402, 403, 429, 500, 503].includes(code)) {
    ttsCooldownUntil[provider] = Date.now() + (code === 429 ? 60_000 : 120_000);
  }
}

function statusCode(error: unknown): number | undefined {
  const candidate = error as { statusCode?: number; status?: number };
  return candidate?.statusCode || candidate?.status;
}

async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

async function tryElevenLabs(text: string, language: Language): Promise<TTSResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !providerAvailable('elevenlabs')) return null;

  try {
    const client = new ElevenLabsClient({ apiKey });
    const requestOptions: Record<string, unknown> = {
      text: text.slice(0, 2500),
      modelId: ELEVENLABS_MODEL,
      outputFormat: ELEVENLABS_OUTPUT_FORMAT as any,
      optimizeStreamingLatency: 2,
      voiceSettings: {
        stability: Number(process.env.ALFRED_TTS_STABILITY || 0.5),
        similarityBoost: Number(process.env.ALFRED_TTS_SIMILARITY_BOOST || 0.8),
        speed: Number(process.env.ALFRED_TTS_SPEED || 1),
        style: Number(process.env.ALFRED_TTS_STYLE || 0.25),
        useSpeakerBoost: true,
      },
    };
    if (ELEVENLABS_MODEL !== 'eleven_multilingual_v2') {
      requestOptions.languageCode = language === 'es' ? 'es' : 'en';
    }

    const audioStream = await client.textToSpeech.convert(ELEVENLABS_VOICE_ID, requestOptions as any);

    return {
      audioBase64: await streamToBase64(audioStream),
      format: 'mp3',
      useWebSpeechFallback: false,
      provider: 'elevenlabs',
      voiceId: ELEVENLABS_VOICE_ID,
      modelId: ELEVENLABS_MODEL,
    };
  } catch (err) {
    const code = statusCode(err);
    coolDownProvider('elevenlabs', code);
    console.warn(`[TTS] ElevenLabs unavailable (${code || 'request error'}); rotating provider.`);
    return null;
  }
}

async function tryGeminiTTS(text: string): Promise<TTSResult | null> {
  if (!GEMINI_TTS_API_KEY || !providerAvailable('gemini')) return null;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_TTS_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text.slice(0, 900) }] }],
      config: {
        responseModalities: ['AUDIO'] as any,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
        },
      },
    } as any);

    const audioBase64 = (response as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      return { audioBase64, format: 'pcm', sampleRate: 24000, useWebSpeechFallback: false, provider: 'gemini', modelId: 'gemini-2.5-flash-preview-tts' };
    }
    return null;
  } catch (err) {
    const code = statusCode(err);
    coolDownProvider('gemini', code);
    console.warn(`[TTS] Gemini unavailable (${code || 'request error'}); rotating provider.`);
    return null;
  }
}

async function tryOpenAITTS(text: string, language: Language): Promise<TTSResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !providerAvailable('openai')) return null;
  try {
    const client = new OpenAI({ apiKey });
    const speech = await client.audio.speech.create({
      model: process.env.ALFRED_OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.ALFRED_OPENAI_TTS_VOICE || 'onyx',
      input: text.slice(0, 2500),
      instructions: language === 'es'
        ? 'Voz masculina natural, cálida, sobria y fluida. Habla como un mayordomo profesional llamado Alfred. Pronuncia español neutro con pausas humanas, sin sonar robótico.'
        : 'Natural, warm, calm masculine voice. Speak as a professional butler named Alfred, with human pacing and no robotic delivery.',
      response_format: 'mp3',
    } as any);
    const audioBase64 = Buffer.from(await speech.arrayBuffer()).toString('base64');
    return { audioBase64, format: 'mp3', useWebSpeechFallback: false, provider: 'openai', modelId: process.env.ALFRED_OPENAI_TTS_MODEL || 'gpt-4o-mini-tts' };
  } catch (err) {
    const code = statusCode(err);
    coolDownProvider('openai', code);
    console.warn(`[TTS] OpenAI unavailable (${code || 'request error'}); using browser fallback.`);
    return null;
  }
}

export function getTtsStatus() {
  return {
    provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : GEMINI_TTS_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : 'web_speech',
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    elevenLabsAgentId: ELEVENLABS_AGENT_ID,
    elevenLabsVoiceId: ELEVENLABS_VOICE_ID,
    elevenLabsVoiceName: process.env.ALFRED_TTS_VOICE_NAME || 'Rupert / Alfred',
    elevenLabsModelId: ELEVENLABS_MODEL,
    browserFallback: !process.env.ELEVENLABS_API_KEY && !GEMINI_TTS_API_KEY && !process.env.OPENAI_API_KEY,
    reason: process.env.ELEVENLABS_API_KEY
      ? 'ElevenLabs configured; Gemini remains the fallback'
      : GEMINI_TTS_API_KEY
        ? 'ElevenLabs unavailable; Gemini TTS configured as fallback'
        : process.env.OPENAI_API_KEY
          ? 'ElevenLabs and Gemini unavailable; OpenAI TTS configured as fallback'
          : 'No cloud TTS key is configured; browser Web Speech is the final fallback',
  };
}

export async function listElevenLabsVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { configured: false, voices: [], reason: 'ELEVENLABS_API_KEY is not configured in the server environment' };

  const response = await fetch('https://api.elevenlabs.io/v2/voices', {
    headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`ElevenLabs voices request failed with ${response.status}`);
  const data = await response.json() as { voices?: Array<Record<string, unknown>> };
  return {
    configured: true,
    voices: (data.voices || []).map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      previewUrl: voice.preview_url,
    })),
  };
}

export async function synthesizeSpeech(text: string, language: Language): Promise<TTSResult> {
  const elevenLabsResult = await tryElevenLabs(text, language);
  if (elevenLabsResult) return elevenLabsResult;

  const geminiResult = await tryGeminiTTS(text);
  if (geminiResult) return geminiResult;

  const openAIResult = await tryOpenAITTS(text, language);
  if (openAIResult) return openAIResult;

  return { audioBase64: null, useWebSpeechFallback: true, provider: 'web_speech' };
}
