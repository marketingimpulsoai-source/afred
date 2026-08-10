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
    const maleNames = language === 'es'
      ? ['Jorge', 'Diego', 'Pablo', 'Carlos', 'Miguel', 'Raul', 'Google español masculino', 'Microsoft Raul']
      : ['David', 'Daniel', 'Google UK English Male', 'Microsoft David', 'Arthur', 'James', 'George', 'Ryan'];
    const femaleMarkers = ['female', ' mujer', ' mujer ', 'helena', 'zira', 'samantha', 'victoria', 'monica', 'paulina', 'laura', 'google español'];
    const isClearlyFemale = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      return femaleMarkers.some(marker => name.includes(marker));
    };
    const isMale = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      return !isClearlyFemale(voice) && (name.includes('male') || maleNames.some(candidate => name.includes(candidate.toLowerCase())));
    };

    // Alfred usa siempre una voz masculina; no elegimos una voz arbitraria del idioma.
    let selected = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && isMale(v));
    // Si Windows no tiene voz masculina española, preferimos una voz femenina española antes que cambiar a una voz inglesa.
    if (!selected && language === 'es') selected = voices.find(v => v.lang.toLowerCase().startsWith('es'));
    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    }
    return Boolean(selected);
  };

  let spoken = false;
  const speak = () => {
    if (spoken) return;
    spoken = true;
    selectVoice();
    // Timbre grave y ritmo natural de mayordomo.
    utterance.pitch = 0.75;
    utterance.rate = 0.92;
    utterance.onstart = () => onStart?.();
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    speak();
  } else {
    const loadVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      speak();
    };
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    window.setTimeout(() => {
      if (!spoken) speak();
    }, 1000);
  }
};

export const playTypingTick = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(700, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Typing tick no soportado o bloqueado', e);
  }
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
