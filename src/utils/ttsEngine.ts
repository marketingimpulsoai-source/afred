// ═══════════════════════════════════════════════════════════════════════
// MOTOR TTS — Voz masculina, formal, estilo mayordomo británico.
// Prioridad: ElevenLabs Rupert/Alfred → Gemini TTS → Web Speech API local.
// Config principal recibida del agente ElevenLabs:
//   agent_id: agent_0001kzhcg3anecc9xmf62eceh6m9
//   voice_id: 89gcX1AeMGgcsN8ypHLu
//   model_id: eleven_multilingual_v2
// ═══════════════════════════════════════════════════════════════════════
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { Language } from '../types';

interface TTSResult {
  audioBase64: string | null;
  format?: string;
  sampleRate?: number;
  useWebSpeechFallback: boolean;
  provider?: 'elevenlabs' | 'gemini' | 'web_speech';
  voiceId?: string;
  modelId?: string;
}

const ELEVENLABS_AGENT_ID = process.env.ALFRED_ELEVENLABS_AGENT_ID || 'agent_0001kzhcg3anecc9xmf62eceh6m9';
const ELEVENLABS_VOICE_ID = process.env.ALFRED_TTS_VOICE_ID || '89gcX1AeMGgcsN8ypHLu';
const ELEVENLABS_MODEL = process.env.ALFRED_TTS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ALFRED_TTS_OUTPUT_FORMAT || 'mp3_44100_128';

async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

async function tryElevenLabs(text: string, language: Language): Promise<TTSResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

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
    console.warn(`[TTS] Falla de ElevenLabs para agent ${ELEVENLABS_AGENT_ID}:`, err);
    return null;
  }
}

async function tryGeminiTTS(text: string): Promise<TTSResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    console.warn('[TTS] Falla de Gemini TTS:', err);
    return null;
  }
}

export function getTtsStatus() {
  return {
    provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : process.env.GEMINI_API_KEY ? 'gemini' : 'web_speech',
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
    elevenLabsAgentId: ELEVENLABS_AGENT_ID,
    elevenLabsVoiceId: ELEVENLABS_VOICE_ID,
    elevenLabsVoiceName: process.env.ALFRED_TTS_VOICE_NAME || 'Rupert / Alfred',
    elevenLabsModelId: ELEVENLABS_MODEL,
    browserFallback: !process.env.ELEVENLABS_API_KEY && !process.env.GEMINI_API_KEY,
    reason: process.env.ELEVENLABS_API_KEY ? 'ElevenLabs configured' : 'ELEVENLABS_API_KEY is not configured in the server environment',
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

  return { audioBase64: null, useWebSpeechFallback: true, provider: 'web_speech' };
}
