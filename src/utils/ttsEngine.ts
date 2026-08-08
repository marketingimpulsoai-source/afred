// ═══════════════════════════════════════════════════════════════════════
// MOTOR TTS — Voz masculina, formal, estilo mayordomo británico.
// Prioridad: ElevenLabs Rupert/Alfred → Gemini TTS → Web Speech API local.
// Config principal recibida del agente ElevenLabs:
//   agent_id: agent_0001kzhcg3anecc9xmf62eceh6m9
//   voice_id: 89gcX1AeMGgcsN8ypHLu
//   model_id: eleven_v3_conversational
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
const ELEVENLABS_MODEL = process.env.ALFRED_TTS_MODEL_ID || 'eleven_v3_conversational';
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
    const audioStream = await client.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
      text: text.slice(0, 2500),
      modelId: ELEVENLABS_MODEL,
      outputFormat: ELEVENLABS_OUTPUT_FORMAT as any,
      optimizeStreamingLatency: 3,
      voiceSettings: {
        stability: Number(process.env.ALFRED_TTS_STABILITY || 0.5),
        similarityBoost: Number(process.env.ALFRED_TTS_SIMILARITY_BOOST || 0.8),
        speed: Number(process.env.ALFRED_TTS_SPEED || 1),
        style: Number(process.env.ALFRED_TTS_STYLE || 0.35),
        useSpeakerBoost: true,
      },
      // En v3 conversational dejamos que el modelo detecte el idioma cuando conviene.
      // Para modelos que lo soportan, esta pista ayuda a mantener ES/EN correcto.
      languageCode: language === 'es' ? 'es' : 'en',
    });

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

export async function synthesizeSpeech(text: string, language: Language): Promise<TTSResult> {
  const elevenLabsResult = await tryElevenLabs(text, language);
  if (elevenLabsResult) return elevenLabsResult;

  const geminiResult = await tryGeminiTTS(text);
  if (geminiResult) return geminiResult;

  return { audioBase64: null, useWebSpeechFallback: true, provider: 'web_speech' };
}
