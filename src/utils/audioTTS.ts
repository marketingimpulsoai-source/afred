// ═══════════════════════════════════════════════════════════════════════
// CLIENTE TTS — Reproduce audio del servidor o sintetiza localmente
// con Web Speech API forzando selección de voz MASCULINA en ES/EN.
// ═══════════════════════════════════════════════════════════════════════

export const playAudioTTS = async (
  text: string,
  language: string,
  onEnd: () => void,
  onStart?: () => void
) => {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) throw new Error(`TTS endpoint returned ${res.status}`);
    const data = await res.json();

    if (data.useWebSpeechFallback || !data.audioBase64) {
      fallbackTTS(text, language, onEnd, onStart);
      return;
    }

    onStart?.();

    if (data.format === 'mp3') {
      // ElevenLabs devuelve MP3 directamente reproducible
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audio.onended = onEnd;
      audio.onerror = onEnd;
      await audio.play();
      return;
    }

    // Formato PCM crudo (Gemini TTS)
    const binaryString = atob(data.audioBase64);
    const len = binaryString.length;
    const numSamples = len / 2;
    const audioData = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const low = binaryString.charCodeAt(i * 2);
      const high = binaryString.charCodeAt(i * 2 + 1);
      let sample = (high << 8) | low;
      if (sample >= 0x8000) sample -= 0x10000;
      audioData[i] = sample / 0x8000;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const audioBuffer = ctx.createBuffer(1, numSamples, data.sampleRate || 24000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
    compressor.knee.setValueAtTime(10, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.value = 1.15;

    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(ctx.destination);

    source.onended = () => {
      onEnd();
      ctx.close().catch(console.error);
    };

    source.start(0);
  } catch (err) {
    console.error('[Alfred Voice] Fallo de reproducción TTS:', err);
    fallbackTTS(text, language, onEnd, onStart);
  }
};

/**
 * Fallback local con Web Speech API. Fuerza explícitamente una voz
 * MASCULINA — nunca deja la selección de voz al azar del navegador.
 */
const fallbackTTS = (text: string, language: string, onEnd: () => void, onStart?: () => void) => {
  if (!('speechSynthesis' in window)) {
    setTimeout(onEnd, 1500);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'es' ? 'es-ES' : 'en-GB';

  const selectVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language === 'es' ? 'es' : 'en';

    // Orden de preferencia: nombres masculinos conocidos por idioma
    const maleNamesEs = ['Jorge', 'Diego', 'Pablo', 'Carlos', 'Google español'];
    const maleNamesEn = ['David', 'Daniel', 'Google UK English Male', 'Microsoft David', 'Arthur', 'James'];
    const preferredNames = language === 'es' ? maleNamesEs : maleNamesEn;

    let selected = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && preferredNames.some(n => v.name.includes(n)));

    if (!selected) {
      selected = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && v.name.toLowerCase().includes('male'));
    }
    if (!selected) {
      // último recurso: cualquier voz del idioma correcto, con pitch reducido para grave
      selected = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
    }
    if (selected) utterance.voice = selected;
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    selectVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = selectVoice;
  }

  // Pitch grave y ritmo pausado — carácter de mayordomo británico formal
  utterance.pitch = 0.75;
  utterance.rate = 0.92;
  utterance.onstart = () => onStart?.();
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
};

export const playAcknowledgmentChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn('AudioContext no soportado o bloqueado', e);
  }
};
