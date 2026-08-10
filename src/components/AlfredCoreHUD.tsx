import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Send, Loader2, ChevronDown, ChevronUp, Activity, Radio, ShieldCheck,
  Sparkles, BrainCircuit, Aperture, Waves, Network, Shield, Zap, Mic2, Keyboard,
  RadioTower, Wand2, Palette, Clapperboard, BadgeDollarSign, Bot, Cpu, Power,
  Gauge, HardDrive, ServerCog, Clock3, CheckCircle2, CalendarDays, Download,
  Globe2, ExternalLink, X, Search, Copy, Volume2, VolumeX, Pause, Play, Paperclip, FolderDown,
} from 'lucide-react';
import { Language, CoreState, Message, SubAgent, SecurityLevel, AttachmentRecord } from '../types';
import { AlfredWorldOrb3D } from './AlfredWorldOrb3D';
import { NeuralNetworkMap } from './NeuralNetworkMap';
import { playTypingTick } from '../utils/audioTTS';

interface Props {
  language: Language;
  coreState: CoreState;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onCoreStateChange: (state: CoreState) => void;
  subAgents: SubAgent[];
  securityLevel: SecurityLevel;
  audioMuted: boolean;
  embeddedMediaUrl: string | null;
  embeddedMediaMuted: boolean;
  onToggleEmbeddedMediaMute: (muted: boolean) => void;
  onCloseEmbeddedMedia: () => void;
  embeddedWebPanel: { url: string; label: string; query?: string } | null;
  onNavigateWeb: (panel: { url: string; label: string; query?: string }) => void;
  onCloseEmbeddedWeb: () => void;
  sessionId?: string;
}

type PermissionStateLabel = 'unknown' | 'granted' | 'prompt' | 'denied' | 'unsupported';
type MicDiagnostic = {
  permission: PermissionStateLabel;
  speechRecognition: boolean;
  mediaDevices: boolean;
  deviceCount: number;
  message: string;
};
type ConversationDay = { day: string; messageCount: number; sessionCount: number };
type MicDevice = { deviceId: string; label: string };
type WebCoreResult = { title: string; url: string; snippet: string };
type OperationalBriefing = {
  generatedAt: string;
  mission: string;
  localSystem: {
    platform: string;
    uptimeSeconds: number;
    cpuCores: number;
    loadAverage: number[];
    memory: { totalGb: number; usedGb: number; freeGb: number; usedPct: number };
  };
  alfred: {
    version: string;
    activeBaseAgents: number;
    businessAgents: number;
    mediaAgents: number;
    primaryVideoProvider: string;
  };
  integrations: {
    configuredPipelines: number;
    totalPipelines: number;
    mediaRouter: { providers: number; seedanceTools: number };
  };
  nextImprovements: string[];
  safety: { secretsInCode: boolean; writeActionsRequireConfirmation: boolean; promptInjectionAware: boolean };
};

const QUICK_ES = [
  'Alfred, estatus general del sistema',
  'Alfred, activa mi rutina diaria',
  'Alfred, resume mis prioridades de hoy',
  'Alfred, revisa la memoria operativa',
  'Alfred, verifica permisos del micrófono',
  'Alfred, orquesta los subagentes para una tarea completa',
];
const QUICK_EN = [
  'Alfred, system status report',
  'Alfred, activate my daily routine',
  'Alfred, summarize today\'s priorities',
  'Alfred, review operational memory',
  'Alfred, check microphone permissions',
  'Alfred, orchestrate the sub-agents for a full task',
];

const WAKE_WORDS = ['alfred', 'hey alfred', 'oye alfred', 'que mundo', 'qué mundo', 'llego papi', 'jefe maestro'];
const AUTO_HANDS_FREE_KEY = 'alfred_auto_hands_free_enabled';
const CHAT_RECENT_LIMIT = 6;

function normalizeVoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAlfredGreetingCommand(text: string): boolean {
  const normalized = normalizeVoiceText(text);
  const hasAlfred = /\b(alfred|jefe maestro)\b/.test(normalized);
  const hasGreeting = /\b(buenos dias|buen dia|buenas tardes|buenas noches)\b/.test(normalized);
  return hasAlfred && hasGreeting;
}

function textOverlapScore(a: string, b: string): number {
  const aWords = new Set(a.split(' ').filter(word => word.length > 3));
  const bWords = b.split(' ').filter(word => word.length > 3);
  if (!aWords.size || !bWords.length) return 0;
  const hits = bWords.filter(word => aWords.has(word)).length;
  return hits / Math.max(aWords.size, bWords.length);
}

function looksLikeAlfredEcho(recognized: string, messages: Message[]): boolean {
  const spoken = normalizeVoiceText(recognized);
  if (spoken.length < 10) return false;
  const echoLead = /^(entendido|comprendido|buenos dias|buenas tardes|buenas noches|jefe maestro|estoy listo|estoy aqui|he registrado|activare|abrire)\b/.test(spoken);
  const repeatedSystemPhrase = /\b(motor de lenguaje principal no esta disponible|configure una clave de api|que activo en especifico|webb verifique|api de binance|estoy listo y a su servicio|estoy aqui con usted|solicitar[eé] confirmaci[oó]n humana)\b/.test(spoken);
  const recentAlfred = [...messages].reverse().filter(msg => msg.sender !== 'user').slice(0, 6);
  if (!recentAlfred.length) return repeatedSystemPhrase;
  const spokenHead = spoken.slice(0, Math.min(120, spoken.length));
  return recentAlfred.some((msg) => {
    const alfred = normalizeVoiceText(msg.text);
    const alfredHead = alfred.slice(0, Math.min(120, alfred.length));
    return (
      (echoLead && (alfred.includes(spokenHead) || spoken.includes(alfredHead))) ||
      (echoLead && textOverlapScore(alfred, spoken) > 0.42) ||
      (repeatedSystemPhrase && textOverlapScore(alfred, spoken) > 0.28)
    );
  });
}

function webPanelUrlFromInput(rawInput: string): string {
  const input = rawInput.trim();
  if (!input) return 'https://duckduckgo.com/';
  if (/^https?:\/\//i.test(input)) return input;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input)) return `https://${input}`;
  return `/api/web-core/search?q=${encodeURIComponent(input)}`;
}

function labelFromUrl(url: string): string {
  if (url.startsWith('/api/web-core/search')) return 'BÚSQUEDA INTERNA ALFRED';
  try {
    return new URL(url).hostname.replace(/^www\./, '').toUpperCase();
  } catch {
    return 'NAVEGACIÓN WEB';
  }
}

const STITCH_FUSION_PACKS = [
  { id: '00', name: 'Alfred Core', source: 'núcleo', effect: 'estado operativo · respuesta central · control general' },
  { id: '01', name: 'Alfred Voice', source: 'voz', effect: 'escucha · habla · confirmación al Jefe Maestro' },
  { id: '02', name: 'Alfred Memory', source: 'memoria', effect: 'preferencias · rutinas · continuidad' },
  { id: '03', name: 'Alfred Routines', source: 'rutinas', effect: 'mañana · tarde · noche · madrugada' },
  { id: '04', name: 'Alfred Security', source: 'seguridad', effect: 'permisos · auditoría · confirmación humana' },
  { id: '05', name: 'Alfred Briefing', source: 'informe', effect: 'sistema · prioridades · estado operativo' },
  { id: '06', name: 'Alfred Sub-agents', source: '12 online', effect: 'Thomas · Ada · Minerva · Fortress · equipo completo' },
  { id: '07', name: 'Alfred Reasoning', source: 'razón', effect: 'routing · confianza · explicación visible' },
  { id: '08', name: 'Alfred Command', source: 'control', effect: 'texto · micrófono · botones accesibles' },
  { id: '09', name: 'Alfred Presence', source: 'mayordomo', effect: 'servicio formal · Jefe Maestro · atención continua' },
];

export const AlfredCoreHUD: React.FC<Props> = ({
  language,
  coreState,
  messages,
  onSendMessage,
  subAgents,
  securityLevel,
  audioMuted,
  embeddedMediaUrl,
  embeddedMediaMuted,
  onToggleEmbeddedMediaMute,
  onCloseEmbeddedMedia,
  embeddedWebPanel,
  onNavigateWeb,
  onCloseEmbeddedWeb,
  sessionId,
  onCoreStateChange,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionStateLabel>('unknown');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [briefing, setBriefing] = useState<OperationalBriefing | null>(null);
  const [micDiagnostic, setMicDiagnostic] = useState<MicDiagnostic | null>(null);
  const [conversationDays, setConversationDays] = useState<ConversationDay[]>([]);
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string>('live');
  const [dayMessages, setDayMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPreviousPreview, setShowPreviousPreview] = useState(false);
  const [webAddressInput, setWebAddressInput] = useState('');
  const [webReloadKey, setWebReloadKey] = useState(0);
  const [webResults, setWebResults] = useState<WebCoreResult[]>([]);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [micDevices, setMicDevices] = useState<MicDevice[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedMicDeviceId, setSelectedMicDeviceId] = useState('');
  const [micSignalLevel, setMicSignalLevel] = useState(0);
  const [voiceTestStatus, setVoiceTestStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionKey = sessionId || (window as any).__ALFRED_SESSION_ID || 'default';
  const mediaFrameRef = useRef<HTMLIFrameElement>(null);
  const webFrameRef = useRef<HTMLIFrameElement>(null);
  const recognitionRef = useRef<any>(null);
  const handsFreeRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const recognitionStartingRef = useRef(false);
  const routineActivationSentRef = useRef(false);
  const conversationUntilRef = useRef(0);
  const typingTickArmedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, dayMessages, selectedHistoryDay]);

  useEffect(() => {
    fetch('/api/history-days?limit=365')
      .then(res => res.json())
      .then(data => setConversationDays(Array.isArray(data.days) ? data.days : []))
      .catch(() => setConversationDays([]));
  }, [messages.length]);

  useEffect(() => {
    setShowPreviousPreview(false);
  }, [selectedHistoryDay]);

  useEffect(() => {
    if (selectedHistoryDay === 'live') {
      setDayMessages([]);
      return;
    }
    setHistoryLoading(true);
    fetch(`/api/history-day/${selectedHistoryDay}?limit=50000`)
      .then(res => res.json())
      .then(data => setDayMessages(Array.isArray(data.messages) ? data.messages : []))
      .catch(() => setDayMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedHistoryDay]);

  useEffect(() => {
    fetch('/api/briefing')
      .then(res => res.json())
      .then(data => setBriefing(data.briefing || null))
      .catch(() => setBriefing(null));
  }, []);

  useEffect(() => {
    fetch(`/api/attachments?sessionId=${encodeURIComponent(sessionKey)}`)
      .then(res => res.json())
      .then(data => setAttachments(Array.isArray(data.attachments) ? data.attachments : []))
      .catch(() => setAttachments([]));
  }, [sessionKey]);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (!navigator.permissions?.query) {
          setPermissionState(navigator.mediaDevices?.getUserMedia ? 'prompt' : 'unsupported');
          return;
        }
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionState(status.state as PermissionStateLabel);
        status.onchange = () => setPermissionState(status.state as PermissionStateLabel);
      } catch {
        setPermissionState(navigator.mediaDevices?.getUserMedia ? 'prompt' : 'unsupported');
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRestartTimerRef.current !== null) window.clearTimeout(recognitionRestartTimerRef.current);
      handsFreeRef.current = false;
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    if (embeddedWebPanel?.url) {
      setWebAddressInput(embeddedWebPanel.query || embeddedWebPanel.url);
    }
  }, [embeddedWebPanel?.url, embeddedWebPanel?.query]);

  useEffect(() => {
    if (!embeddedWebPanel?.url?.startsWith('/api/web-core/search')) {
      setWebResults([]);
      return;
    }
    setWebSearchLoading(true);
    fetch(embeddedWebPanel.url)
      .then(res => res.json())
      .then(data => setWebResults(Array.isArray(data.results) ? data.results : []))
      .catch(() => setWebResults([]))
      .finally(() => setWebSearchLoading(false));
  }, [embeddedWebPanel?.url, webReloadKey]);

  const refreshMicDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(device => device.kind === 'audioinput').map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Micrófono ${index + 1}`,
      }));
      setMicDevices(inputs);
      if (!selectedMicDeviceId && inputs[0]?.deviceId) setSelectedMicDeviceId(inputs[0].deviceId);
    } catch {}
  }, [selectedMicDeviceId]);

  useEffect(() => { refreshMicDevices(); }, [refreshMicDevices, permissionState]);

  const openWebInsidePanel = useCallback((rawInput: string) => {
    const url = webPanelUrlFromInput(rawInput);
    onNavigateWeb({ url, label: labelFromUrl(url), query: rawInput.trim() || url });
  }, [onNavigateWeb]);

  const submitWebNavigation = useCallback(() => {
    openWebInsidePanel(webAddressInput);
  }, [openWebInsidePanel, webAddressInput]);

  const sendMediaCommand = useCallback((action: 'mute' | 'unmute' | 'pause' | 'play' | 'volume', volume = 35) => {
    if (action === 'mute' || action === 'pause') onToggleEmbeddedMediaMute(true);
    if (action === 'unmute' || action === 'play') onToggleEmbeddedMediaMute(false);
    mediaFrameRef.current?.contentWindow?.postMessage({ type: 'alfred-youtube-control', action, volume }, window.location.origin);
    setLiveTranscript(action === 'mute' || action === 'pause' ? 'Audio del panel silenciado para proteger el micrófono.' : 'Audio del panel reactivado por orden del Jefe Maestro.');
  }, [onToggleEmbeddedMediaMute]);

  const copyCurrentWebLink = useCallback(async () => {
    if (!embeddedWebPanel?.url) return;
    const copyUrl = embeddedWebPanel.url.startsWith('/api/web-core/search')
      ? `https://duckduckgo.com/?q=${encodeURIComponent(embeddedWebPanel.query || webAddressInput || '')}`
      : embeddedWebPanel.url;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setLiveTranscript('Enlace copiado al portapapeles del Jefe Maestro.');
    } catch {
      setLiveTranscript(`Copie manualmente: ${copyUrl}`);
    }
  }, [embeddedWebPanel?.url, embeddedWebPanel?.query, webAddressInput]);

  const reloadWebPanel = useCallback(() => {
    if (webFrameRef.current) webFrameRef.current.dataset.reloadRequestedAt = String(Date.now());
    setWebReloadKey(value => value + 1);
    setLiveTranscript('Recargando panel ALFRED WEB CORE.');
  }, []);

  useEffect(() => {
    if (!isListening && !handsFree) return;
    if (embeddedMediaUrl && !embeddedMediaMuted) {
      sendMediaCommand('mute');
    }
  }, [isListening, handsFree, embeddedMediaUrl, embeddedMediaMuted, sendMediaCommand]);

  useEffect(() => {
    const draft = input.trim().length > 0;
    if (draft) {
      onCoreStateChange('TYPING');
      if (!typingTickArmedRef.current) {
        typingTickArmedRef.current = true;
        playTypingTick();
      }
    } else if (!isListening && coreState === 'TYPING') {
      onCoreStateChange('IDLE');
      typingTickArmedRef.current = false;
    }
  }, [input, isListening, coreState, onCoreStateChange]);

  const activeCount = subAgents.filter(a => a.status === 'ACTIVE').length;
  const quickPrompts = language === 'es' ? QUICK_ES : QUICK_EN;
  const visibleMessages = selectedHistoryDay === 'live' ? messages : dayMessages;
  const selectedDayCount = selectedHistoryDay === 'live' ? messages.length : dayMessages.length;
  const hiddenPreviousCount = Math.max(visibleMessages.length - CHAT_RECENT_LIMIT, 0);
  const previousPreviewMessages = visibleMessages.slice(0, hiddenPreviousCount);
  const currentMessages = showPreviousPreview ? visibleMessages : visibleMessages.slice(-CHAT_RECENT_LIMIT);

  const handleSend = useCallback((override?: string) => {
    const text = (override ?? input).trim();
    if (!text) return;
    onSendMessage(text);
    setInput('');
  }, [input, onSendMessage]);

  const requestMicAccess = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState('unsupported');
        return false;
      }
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedMicDeviceId ? { exact: selectedMicDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop());
      localStorage.setItem(AUTO_HANDS_FREE_KEY, 'true');
      setPermissionState('granted');
      onCoreStateChange('LISTENING');
      setMicDiagnostic(null);
      return true;
    } catch (error: any) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setPermissionState(denied ? 'denied' : 'prompt');
      setMicDiagnostic({
        permission: denied ? 'denied' : 'prompt',
        speechRecognition: Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
        mediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
        deviceCount: 0,
        message: denied
          ? 'El navegador bloqueó el micrófono para localhost:3000. Cambie el permiso del sitio a Permitir y recargue con Ctrl+F5.'
          : `No pude abrir el micrófono: ${error?.name || 'error desconocido'}`,
      });
      return false;
    }
  };

  const runMicDiagnostic = async () => {
    const speechRecognition = Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const mediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
    let permission = permissionState;
    let deviceCount = 0;
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permission = status.state as PermissionStateLabel;
        setPermissionState(permission);
      }
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        deviceCount = devices.filter(device => device.kind === 'audioinput').length;
        await refreshMicDevices();
      }
    } catch {}
    const message = permission === 'denied'
      ? 'MIC DENIED: Chrome no volverá a preguntar automáticamente. Abra permisos del sitio, cambie Micrófono a Permitir y recargue.'
      : permission === 'granted'
        ? `Micrófono permitido. Dispositivos de entrada detectados: ${deviceCount}. Use “Probar señal” para confirmar que la PC está enviando audio.`
        : `Permiso pendiente. Dispositivos detectados: ${deviceCount}. Pulse “Dar acceso al micrófono”.`;
    setMicDiagnostic({ permission, speechRecognition, mediaDevices, deviceCount, message });
    setLiveTranscript(message);
  };

  const testMicSignal = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MediaDevices no disponible');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicDeviceId ? { exact: selectedMicDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setPermissionState('granted');
      await refreshMicDevices();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      const started = Date.now();
      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        const level = buffer.reduce((sum, value) => sum + Math.abs(value - 128), 0) / buffer.length;
        maxLevel = Math.max(maxLevel, level);
        setMicSignalLevel(Math.min(100, Math.round(level * 5)));
        if (Date.now() - started < 3200) requestAnimationFrame(tick);
        else {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          const pct = Math.min(100, Math.round(maxLevel * 5));
          setMicSignalLevel(pct);
          setLiveTranscript(pct > 8 ? `Señal de micrófono detectada: ${pct}%. Alfred puede recibir audio desde la PC.` : 'No detecté señal suficiente. Revise micrófono predeterminado, volumen de entrada de Windows o seleccione otro dispositivo.');
        }
      };
      tick();
    } catch (error: any) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setPermissionState(denied ? 'denied' : 'prompt');
      setLiveTranscript(denied ? 'Permiso de micrófono denegado. Cambie localhost:3000 a Permitir en Chrome.' : `No pude probar el micrófono: ${error?.message || error?.name || 'error desconocido'}`);
    }
  };

  const testLocalVoice = () => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) throw new Error('speechSynthesis no disponible');
      synth.cancel();
      const voices = synth.getVoices();
      const preferred = voices.find(voice => /spanish|es-|sabina|pablo|jorge|diego|helena/i.test(`${voice.name} ${voice.lang}`)) || voices.find(voice => voice.lang?.startsWith('es')) || voices[0];
      const utterance = new SpeechSynthesisUtterance('Jefe Maestro, esta es una prueba de voz local de Alfred en esta PC.');
      if (preferred) utterance.voice = preferred;
      utterance.lang = preferred?.lang || 'es-ES';
      utterance.rate = 0.92;
      utterance.pitch = 0.78;
      utterance.volume = 1;
      utterance.onstart = () => setVoiceTestStatus(`Voz local reproduciendo: ${preferred?.name || 'voz del sistema'}`);
      utterance.onend = () => setVoiceTestStatus('Prueba de voz local completada.');
      utterance.onerror = () => setVoiceTestStatus('La voz local falló. Revise salida de audio de Windows/navegador.');
      synth.speak(utterance);
    } catch (error: any) {
      setVoiceTestStatus(`No pude probar voz local: ${error?.message || 'error desconocido'}`);
    }
  };


  const openMicSettings = () => {
    const opened = window.open('chrome://settings/content/microphone', '_blank');
    if (!opened) {
      setLiveTranscript('Abra manualmente Chrome → Configuración → Privacidad y seguridad → Configuración de sitios → Micrófono → localhost:3000 → Permitir.');
    }
  };

  useEffect(() => {
    if (autoStartAttemptedRef.current || window.location.protocol === 'file:') return;
    if (localStorage.getItem(AUTO_HANDS_FREE_KEY) === 'false') return;
    requestMicAccess().then(granted => {
      if (!granted) setLiveTranscript(language === 'es' ? 'Conceda acceso al micrófono para mantener a Alfred comunicado.' : 'Grant microphone access to keep Alfred connected.');
    });
  }, []);

  const runVoiceShortcut = useCallback((command: string) => {
    const normalized = command.toLowerCase().trim();
    setLastVoiceCommand(command);
    const navMap: Record<string, string> = {
      media: 'MEDIA', negocio: 'NEGOCIOS', negocios: 'NEGOCIOS', business: 'BUSINESS', memoria: 'MEMORIA', memory: 'MEMORY', agentes: 'AGENTES', agents: 'AGENTS', seguridad: 'SEGURIDAD', security: 'SECURITY', core: 'CORE', inicio: 'CORE', tools: 'TOOLS', herramientas: 'TOOLS', neural: 'NEURAL', arquitectura: 'ARQ', architecture: 'ARCH', ajustes: 'AJUSTES', settings: 'SETTINGS',
    };
    const match = Object.entries(navMap).find(([spoken]) => normalized.includes(`abre ${spoken}`) || normalized.includes(`open ${spoken}`) || normalized === spoken);
    if (match) {
      const [, label] = match;
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-voice-command]')).find(btn => btn.textContent?.toLowerCase().includes(label.toLowerCase()));
      button?.click();
      return true;
    }
    if (normalized.includes('ejecuta') || normalized.includes('execute') || normalized.includes('enviar') || normalized.includes('send')) {
      handleSend();
      return true;
    }
    if (/\b(copia|copiar|copy)\b.*\b(enlace|link|url)\b/.test(normalized)) {
      copyCurrentWebLink();
      return true;
    }
    if (/\b(busca|buscar|search|navega|abre en web core)\b/.test(normalized) && normalized.length > 8) {
      const query = normalized
        .replace(/\b(alfred|busca|buscar|search|navega|abre en web core|en web core|dentro del panel|jefe maestro)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (query) {
        openWebInsidePanel(query);
        return true;
      }
    }
    if (/\b(silencia|silencio|mute|calla|baja)\b.*\b(musica|youtube|reproductor|media|audio)\b|\b(musica|youtube|reproductor|media|audio)\b.*\b(silencia|silencio|mute|calla|baja)\b/.test(normalized)) {
      sendMediaCommand('mute');
      return true;
    }
    if (/\b(pausa|para|deten)\b.*\b(musica|youtube|reproductor|media|audio)\b|\b(musica|youtube|reproductor|media|audio)\b.*\b(pausa|para|deten)\b/.test(normalized)) {
      sendMediaCommand('pause');
      return true;
    }
    if (/\b(reactiva|activa|quita silencio|unmute|play)\b.*\b(musica|youtube|reproductor|media|audio)\b|\b(musica|youtube|reproductor|media|audio)\b.*\b(reactiva|activa|quita silencio|unmute|play)\b/.test(normalized)) {
      sendMediaCommand('unmute');
      return true;
    }
    if (normalized.includes('silencio') || normalized.includes('mute') || normalized.includes('voice off')) {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-voice-command]')).find(btn => btn.textContent?.toLowerCase().includes('voice'));
      button?.click();
      return true;
    }
    return false;
  }, [handleSend, copyCurrentWebLink, openWebInsidePanel, sendMediaCommand]);

  const startRecognition = useCallback(async (continuous = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionState('unsupported');
      setLiveTranscript(language === 'es' ? 'Reconocimiento de voz no soportado en este navegador.' : 'Speech recognition is not supported in this browser.');
      return false;
    }
    const ok = permissionState === 'granted' || await requestMicAccess();
    if (!ok || recognitionStartingRef.current) return false;

    recognitionRef.current?.stop?.();
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setLiveTranscript(interim || finalText);
      if (finalText.trim()) {
        if (looksLikeAlfredEcho(finalText, messages)) {
          setLiveTranscript('Eco de Alfred ignorado para evitar bucle.');
          return;
        }
        const lower = finalText.toLowerCase();
        const isGreetingCommand = isAlfredGreetingCommand(finalText);
        const withoutWake = WAKE_WORDS.reduce((text, wake) => text.replace(wake, ''), lower).trim();
        const isWakeCommand = WAKE_WORDS.some(w => lower.includes(w));
        const inConversationWindow = conversationUntilRef.current > Date.now();
        if (!isGreetingCommand && runVoiceShortcut(withoutWake || finalText)) return;
        if (isWakeCommand || isGreetingCommand) conversationUntilRef.current = Date.now() + 45_000;
        if (continuous && !isWakeCommand && !isGreetingCommand && !inConversationWindow) return;
        const spoken = isGreetingCommand ? finalText.trim() : (isWakeCommand ? withoutWake : finalText.trim());
        if (spoken) {
          setInput(spoken);
          handleSend(spoken);
        }
      }
    };
    recognition.onerror = (event: any) => {
      const error = event?.error || 'unknown';
      recognitionStartingRef.current = false;
      setLiveTranscript(language === 'es' ? `Micrófono: ${error}` : `Microphone: ${error}`);
      if (coreState === 'LISTENING' || coreState === 'TYPING') onCoreStateChange('IDLE');
      setIsListening(false);
      if (!continuous || ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
        handsFreeRef.current = false;
        if (error === 'not-allowed' || error === 'service-not-allowed') setPermissionState('denied');
        if (!continuous) setHandsFree(false);
      }
    };
    recognition.onend = () => {
      recognitionStartingRef.current = false;
      setIsListening(false);
      if (coreState === 'LISTENING' || coreState === 'TYPING') onCoreStateChange('IDLE');
      if (continuous && handsFreeRef.current) {
        if (recognitionRestartTimerRef.current !== null) window.clearTimeout(recognitionRestartTimerRef.current);
        recognitionRestartTimerRef.current = window.setTimeout(() => {
          if (!handsFreeRef.current || recognitionStartingRef.current) return;
          try {
            recognition.start();
            recognitionStartingRef.current = true;
            setIsListening(true);
          } catch {
            setIsListening(false);
          }
        }, 700);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognitionStartingRef.current = true;
      recognition.start();
      setIsListening(true);
      onCoreStateChange('LISTENING');
      setLiveTranscript(language === 'es' ? 'Alfred escuchando. Diga “Buenos días Alfred”, “Buenas tardes Alfred” o “Buenas noches Alfred”.' : 'Alfred is listening. Say “Good morning Alfred”, “Good afternoon Alfred”, or “Good evening Alfred”.');
      return true;
    } catch (error) {
      recognitionStartingRef.current = false;
      console.warn('[Alfred Voice] recognition.start failed', error);
      setIsListening(false);
      return false;
    }
  }, [language, permissionState, handleSend, runVoiceShortcut, messages]);

  useEffect(() => {
    if (permissionState !== 'granted' || handsFree || autoStartAttemptedRef.current) return;
    if (localStorage.getItem(AUTO_HANDS_FREE_KEY) === 'false') return;
    autoStartAttemptedRef.current = true;
    handsFreeRef.current = true;
    setHandsFree(true);
    startRecognition(true).then((started) => {
      if (!started) {
        handsFreeRef.current = false;
        setHandsFree(false);
        return;
      }
      if (!routineActivationSentRef.current) {
        routineActivationSentRef.current = true;
        handleSend('Alfred, activa mi rutina diaria');
      }
    });
  }, [permissionState, handsFree, startRecognition]);

  const toggleMic = () => {
    if (isListening && !handsFree) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    startRecognition(false);
  };

  const toggleHandsFree = async () => {
    if (handsFree) {
      handsFreeRef.current = false;
      localStorage.setItem(AUTO_HANDS_FREE_KEY, 'false');
      setHandsFree(false);
      recognitionRef.current?.stop?.();
      setIsListening(false);
      routineActivationSentRef.current = false;
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    localStorage.setItem(AUTO_HANDS_FREE_KEY, 'true');
    const started = await startRecognition(true);
    if (!started) {
      handsFreeRef.current = false;
      setHandsFree(false);
      return;
    }
    if (!routineActivationSentRef.current) {
      routineActivationSentRef.current = true;
      handleSend('Alfred, activa mi rutina diaria');
    }
  };

  const coreStateLabel = {
    IDLE: language === 'es' ? 'V3 / MANOS LIBRES' : 'V3 / HANDS-FREE',
    LISTENING: language === 'es' ? 'ESCUCHANDO EN TIEMPO REAL' : 'REAL-TIME LISTENING',
    TYPING: language === 'es' ? 'MODO AGENTE / ESCRIBIENDO' : 'AGENT MODE / TYPING',
    PROCESSING: language === 'es' ? 'PROCESANDO' : 'PROCESSING',
    ROUTING: language === 'es' ? 'ENRUTANDO' : 'ROUTING',
    SPEAKING: language === 'es' ? 'RESPONDIENDO' : 'SPEAKING',
    ERROR: 'ERROR',
  }[coreState];

  return (
    <div className="v3-command-bridge">
      <section className="v3-hero-bridge">
        <div className="v3-hero-copy">
          <div className="v3-eyebrow"><Sparkles size={14} /> ALFRED CORP V3.5 / MAYORDOMO DIGITAL NEXUS</div>
          <h2>{language === 'es' ? 'Centro de mando inteligente de Alfred para el Jefe Maestro' : 'Alfred intelligent command center for Jefe Maestro'}</h2>
          <p>
            {language === 'es'
              ? 'Nueva versión mejorada de Alfred: núcleo operativo en línea, voz en tiempo real, memoria persistente, seguridad balanceada, rutinas diarias, razonamiento visible y 12 subagentes listos para asistir al Jefe Maestro.'
              : 'Improved Alfred release: operational core online, real-time voice, persistent memory, balanced security, daily routines, visible reasoning, and 12 sub-agents ready to assist Jefe Maestro.'}
          </p>
          <div className="v3-quick-grid">
            {quickPrompts.map(prompt => (
              <button key={prompt} onClick={() => handleSend(prompt)} className="v3-quick-card" data-voice-command={prompt}>
                <Zap size={13} /> {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="v3-permission-stage">
          <button
            type="button"
            onClick={toggleHandsFree}
            className={`v3-permission-orb world ${isListening ? 'listening' : ''} ${handsFree ? 'handsfree' : ''} permission-${permissionState}`}
            aria-label={language === 'es' ? 'Activar mundo 3D manos libres de Alfred' : 'Activate Alfred hands-free 3D world'}
            data-voice-command="activate hands free"
          >
            <AlfredWorldOrb3D size="hero" active={coreState !== 'IDLE' || isListening || input.trim().length > 0} motion={coreState === 'ROUTING' || coreState === 'PROCESSING' || coreState === 'TYPING' ? 'working' : coreState === 'LISTENING' || coreState === 'SPEAKING' ? 'conversation' : input.trim().length > 0 ? 'working' : 'idle'} label="ALFRED 3D world orb" />
          </button>
          <div className="v3-permission-readout">
            <Metric label="MIC" value={permissionState.toUpperCase()} />
            <Metric label="MODE" value={handsFree ? 'HANDS-FREE' : 'PUSH-TO-TALK'} />
            <Metric label="WAKE" value="ALFRED" />
          </div>
          <button onClick={requestMicAccess} className="v3-permission-button" data-voice-command="request microphone access">
            <ShieldCheck size={14} /> {language === 'es' ? 'DAR ACCESO AL MICRÓFONO' : 'GRANT MICROPHONE ACCESS'}
          </button>
          <p className="v3-mic-note">
            {language === 'es'
              ? 'Conceda el permiso una vez. Después Alfred se autoactiva al abrir el panel o al iniciar Windows.'
              : 'Grant permission once. After that Alfred auto-activates when the panel opens or Windows starts.'}
          </p>
          <div className="v3-mic-repair">
            <button type="button" onClick={runMicDiagnostic}>Diagnóstico micrófono</button>
            <button type="button" onClick={testMicSignal}>Probar señal</button>
            <button type="button" onClick={testLocalVoice}>Probar voz local</button>
            <button type="button" onClick={openMicSettings}>Abrir permisos Chrome</button>
          </div>
          <div className="v3-mic-device-panel" aria-label="Diagnóstico PC de micrófono y voz">
            <label>
              Micrófono de la PC
              <select value={selectedMicDeviceId} onChange={(event) => setSelectedMicDeviceId(event.target.value)}>
                <option value="">Predeterminado de Windows / navegador</option>
                {micDevices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
              </select>
            </label>
            <div className="v3-mic-level"><span style={{ width: `${micSignalLevel}%` }} /></div>
            <small>Señal detectada: {micSignalLevel}% · {voiceTestStatus || 'Pulse “Probar voz local” para confirmar que Alfred puede hablar en esta PC.'}</small>
          </div>
          {micDiagnostic && (
            <div className="v3-mic-diagnostic" role="status">
              <b>{micDiagnostic.permission.toUpperCase()}</b>
              <span>{micDiagnostic.message}</span>
              <small>SpeechRecognition: {micDiagnostic.speechRecognition ? 'OK' : 'NO'} · MediaDevices: {micDiagnostic.mediaDevices ? 'OK' : 'NO'} · Entradas: {micDiagnostic.deviceCount}</small>
            </div>
          )}
        </div>
      </section>

      <section className="v3-live-grid">
        <div className="v3-chat-shell">
          <div className="v3-chat-header">
            <div>
              <div className="v3-eyebrow small">REAL-TIME LIVE CONVERSATION</div>
              <h3>{language === 'es' ? 'Canal operativo con voz, texto e historial diario' : 'Operational channel with voice, text and daily history'}</h3>
              <p className="v3-history-count">{selectedHistoryDay === 'live' ? 'Vista en vivo' : `Día ${selectedHistoryDay}`} · {selectedDayCount} mensajes guardados</p>
            </div>
            <div className="v3-history-tools" aria-label="Filtro diario de conversación">
              <label>
                <CalendarDays size={14} />
                <select value={selectedHistoryDay} onChange={(event) => setSelectedHistoryDay(event.target.value)}>
                  <option value="live">Conversación en vivo</option>
                  {conversationDays.map(day => (
                    <option key={day.day} value={day.day}>{day.day} · {day.messageCount} mensajes</option>
                  ))}
                </select>
              </label>
              {selectedHistoryDay !== 'live' && (
                <a className="v3-history-download" href={`/api/history-day/${selectedHistoryDay}.pdf`} target="_blank" rel="noreferrer">
                  <Download size={14} /> PDF
                </a>
              )}
              <div className="v3-signal"><Waves size={15} /> {audioMuted ? 'VOICE MUTED' : 'VOICE READY'}</div>
            </div>
          </div>

          <div ref={scrollRef} className="v3-message-stream">
            {hiddenPreviousCount > 0 && (
              <button type="button" className="v3-previous-preview-button" onClick={() => setShowPreviousPreview(prev => !prev)}>
                {showPreviousPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showPreviousPreview
                  ? 'Ocultar texto anterior'
                  : `Ver texto anterior (${hiddenPreviousCount} mensajes guardados)`}
              </button>
            )}
            {showPreviousPreview && previousPreviewMessages.length > 0 && (
              <div className="v3-previous-preview-panel" aria-label="Texto anterior guardado">
                {previousPreviewMessages.slice(-8).map((msg) => (
                  <div key={`preview_${msg.id}`} className="v3-preview-line">
                    <b>{msg.sender === 'user' ? 'JEFE MAESTRO' : (msg.agentName || 'ALFRED')}</b>
                    <span>{msg.text.slice(0, 180)}{msg.text.length > 180 ? '…' : ''}</span>
                  </div>
                ))}
                {previousPreviewMessages.length > 8 && <small>Mostrando últimos 8 del texto anterior. El PDF conserva todo el día completo.</small>}
              </div>
            )}
            {historyLoading && (
              <div className="v3-thinking-line">
                <Loader2 size={13} className="animate-spin" /> Cargando conversación completa del día...
              </div>
            )}
            {!historyLoading && visibleMessages.length === 0 && (
              <div className="v3-thinking-line">
                <CalendarDays size={13} /> No hay conversación guardada para este día.
              </div>
            )}
            {currentMessages.map((msg) => {
              const hasReasoning = !!msg.routingDecision || !!msg.confidenceScore || !!msg.toolCalls?.length;
              const expanded = expandedReasoning[msg.id];
              return (
                <div key={msg.id} className={`v3-message-row ${msg.sender === 'user' ? 'user' : 'alfred'}`}>
                  <article className="v3-message-bubble">
                    <div className="v3-message-meta">
                      <span>{msg.sender === 'user' ? 'JEFE MAESTRO' : (msg.agentName || 'ALFRED CORE')}</span>
                      <time>{msg.timestamp}</time>
                    </div>
                    <p>{msg.text}</p>
                    {msg.sender !== 'user' && hasReasoning && (
                      <div className="v3-message-actions compact">
                        <button onClick={() => setExpandedReasoning(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))} data-voice-command="show reasoning">
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {language === 'es' ? 'Detalles técnicos' : 'Technical details'}
                        </button>
                      </div>
                    )}
                    {expanded && msg.routingDecision && (
                      <div className="v3-reasoning-panel">
                        <div><b>METHOD:</b> {msg.routingDecision.method}</div>
                        <div><b>AGENT:</b> {msg.routingDecision.chosenAgentName}</div>
                        <div><b>CONFIDENCE:</b> {msg.routingDecision.confidence}%</div>
                        <div><b>REASON:</b> {language === 'es' ? msg.routingDecision.reasoningES : msg.routingDecision.reasoningEN}</div>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
            {selectedHistoryDay === 'live' && (coreState === 'PROCESSING' || coreState === 'ROUTING') && (
              <div className="v3-thinking-line">
                <Loader2 size={13} className="animate-spin" />
                {language === 'es' ? 'Alfred está seleccionando el mejor agente...' : 'Alfred is selecting the best agent...'}
              </div>
            )}
          </div>

          <div className="v3-composer">
            <AudioSpectrum active={coreState === 'SPEAKING' || isListening || coreState === 'TYPING' || input.trim().length > 0} />
            <div className="v3-live-transcript">
              <RadioTower size={13} />
              <span>{liveTranscript || lastVoiceCommand || (language === 'es' ? 'Diga “Buenos días Alfred”, “Buenas tardes Alfred” o “Buenas noches Alfred”.' : 'Say “Good morning Alfred”, “Good afternoon Alfred”, or “Good evening Alfred”.')}</span>
            </div>
            <div className="v3-composer-row">
              <button onClick={toggleMic} aria-label={language === 'es' ? 'Activar micrófono' : 'Activate microphone'} className={`v3-mic-button ${isListening ? 'listening' : ''}`} data-voice-command="microphone">
                <Mic size={18} />
              </button>
              <button type="button" className="v3-attach-button" aria-label={language === 'es' ? 'Adjuntar archivos' : 'Attach files'} onClick={() => document.getElementById('alfred-attachment-input')?.click()}>
                <Paperclip size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) onCoreStateChange('TYPING'); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'es' ? 'Ordene algo a Alfred Corp V3.5...' : 'Command Alfred Corp V3.5...'}
                aria-label={language === 'es' ? 'Comando para Alfred Corp V3.5' : 'Command for Alfred Corp V3.5'}
              />
              <button onClick={() => handleSend()} className="v3-send-button" data-voice-command="execute">
                <Send size={16} /> {language === 'es' ? 'EJECUTAR' : 'EXECUTE'}
              </button>
            </div>
            <input
              id="alfred-attachment-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,.json"
              style={{ display: 'none' }}
              onChange={async (event) => {
                const files = Array.from(event.currentTarget.files || []) as File[];
                event.currentTarget.value = '';
                if (!files.length) return;
                setUploadingAttachment(true);
                try {
                  await Promise.all(files.map(async (file: File) => {
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const reader: FileReader = new FileReader();
                      reader.onload = () => resolve(String(reader.result || ''));
                      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
                      reader.readAsDataURL(file);
                    });
                    const response = await fetch('/api/attachments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: sessionKey,
                        name: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        dataBase64: dataUrl.split(',')[1] || '',
                      }),
                    });
                    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
                    return response.json();
                  }));
                  const res = await fetch(`/api/attachments?sessionId=${encodeURIComponent(sessionKey)}`);
                  const data = await res.json();
                  setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
                  setLiveTranscript(language === 'es' ? 'Archivos guardados en la memoria de Alfred.' : 'Files stored in Alfred memory.');
                } catch (error: any) {
                  setLiveTranscript(language === 'es' ? `No pude adjuntar los archivos: ${error?.message || 'error'}` : `Could not attach files: ${error?.message || 'error'}`);
                } finally {
                  setUploadingAttachment(false);
                }
              }}
            />
          </div>
        </div>

        <aside className="v3-side-console">
          <div className="v3-mini-panel">
            <div className="v3-eyebrow small"><Power size={13} /> Hands-free controls</div>
            <Detail label="Wake command" value="Buenos días/tardes/noches Alfred" />
            <Detail label="Browser mic" value={permissionState} />
            <Detail label="Speech mode" value={handsFree ? 'continuous real-time' : 'push-to-talk'} />
            <Detail label="Alfred modules" value="10 activos" />
          </div>
          <div className="v3-mini-panel">
            <div className="v3-eyebrow small"><Radio size={13} /> Voice system</div>
            <AudioSpectrum active={coreState === 'SPEAKING' || isListening || coreState === 'TYPING' || input.trim().length > 0} tall />
            <p>{coreStateLabel}</p>
          </div>
          <div className="v3-mini-panel">
            <div className="v3-eyebrow small"><FolderDown size={13} /> Adjuntos recientes</div>
            {attachments.length === 0 ? (
              <p>{language === 'es' ? 'Todavía no hay archivos guardados en esta sesión.' : 'No files stored in this session yet.'}</p>
            ) : (
              <div className="v3-attachment-list">
                {attachments.slice(0, 5).map(file => (
                  <a key={file.id} href={`/api/attachments/${file.id}`} download={file.name} className="v3-attachment-pill">
                    <Paperclip size={12} /> {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="v3-mini-panel">
            <div className="v3-eyebrow small"><Keyboard size={13} /> Run from correct folder</div>
            <code>cd "$HOME/Desktop/afred"</code>
            <code>npm run lint && npm run build && npm run test</code>
          </div>
        </aside>
      </section>


      <section className="v3-pipeline-grid">
        <StatusCard icon={<Activity />} label="Alfred Core" value="online" tone="cyan" />
        <StatusCard icon={<Clapperboard />} label="Voice Butler" value="real-time ready" tone="violet" />
        <StatusCard icon={<Palette />} label="Memory" value="persistent" tone="gold" />
        <StatusCard icon={<Wand2 />} label="Design System" value="Alfred visual core" tone="emerald" />
        <StatusCard icon={<Aperture />} label="Daily Routines" value="voice activated" tone="cyan" />
        <StatusCard icon={<BadgeDollarSign />} label="Business Layer" value="16 specialists" tone="gold" />
        <StatusCard icon={<Bot />} label="Sub-agents" value={`${activeCount}/12 online`} tone="emerald" />
        <StatusCard icon={<Cpu />} label="Security" value={securityLevel} tone="violet" />
      </section>

      <NeuralNetworkMap language={language} subAgents={subAgents} activityVersion={messages.length + activeCount} compact messages={messages} />

      <section className="v35-fusion-panel" aria-label={language === 'es' ? 'Matriz visual de Alfred' : 'Alfred visual matrix'}>
        <div className="v35-fusion-head">
          <div>
            <div className="v3-eyebrow small"><Network size={13} /> ALFRED CORE MATRIX</div>
            <h3>{language === 'es' ? 'Sistema visual central de Alfred' : 'Alfred central visual system'}</h3>
            <p>{language === 'es' ? 'La cabina presenta a Alfred como mayordomo digital: núcleo, voz, memoria, seguridad, rutinas, subagentes, razonamiento, auditoría, briefing operativo y servicio continuo para el Jefe Maestro.' : 'The cockpit presents Alfred as a digital butler: core, voice, memory, security, routines, sub-agents, reasoning, audit, operational briefing, and continuous service for Jefe Maestro.'}</p>
          </div>
          <div className="v35-fusion-badge"><Sparkles size={14} /> ALFRED V3.5</div>
        </div>
        <div className="v35-fusion-grid">
          {STITCH_FUSION_PACKS.map(pack => (
            <article key={pack.id} className="v35-fusion-card">
              <div className="v35-pack-id">#{pack.id}</div>
              <div>
                <b>{pack.name}</b>
                <span>{pack.source}</span>
                <small>{pack.effect}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {briefing && (
        <section className="v3-briefing-panel" aria-label={language === 'es' ? 'Briefing operativo de Alfred' : 'Alfred operational briefing'}>
          <div className="v3-briefing-head">
            <div>
              <div className="v3-eyebrow small"><ServerCog size={13} /> OPERATIONAL BRIEFING</div>
              <h3>{language === 'es' ? 'Briefing operativo del sistema local' : 'Local system operational briefing'}</h3>
              <p>{briefing.mission}</p>
            </div>
            <time><Clock3 size={14} /> {new Date(briefing.generatedAt).toLocaleTimeString()}</time>
          </div>
          <div className="v3-briefing-grid">
            <BriefingTile icon={<Cpu />} label="CPU" value={`${briefing.localSystem.cpuCores} cores`} detail={`${briefing.localSystem.platform} · load ${briefing.localSystem.loadAverage[0] ?? 0}`} />
            <BriefingTile icon={<HardDrive />} label="RAM" value={`${briefing.localSystem.memory.usedPct}% used`} detail={`${briefing.localSystem.memory.usedGb}/${briefing.localSystem.memory.totalGb} GB`} />
            <BriefingTile icon={<Bot />} label="Agents" value={`${briefing.alfred.activeBaseAgents}/12 + ${briefing.alfred.businessAgents}`} detail="subagentes · especialistas Alfred" />
            <BriefingTile icon={<Gauge />} label="Pipelines" value={`${briefing.integrations.configuredPipelines}/${briefing.integrations.totalPipelines}`} detail={`${briefing.integrations.mediaRouter.providers} providers · ${briefing.integrations.mediaRouter.seedanceTools} tools`} />
            <BriefingTile icon={<ShieldCheck />} label="Safety" value={briefing.safety.secretsInCode ? 'review' : 'clean'} detail={briefing.safety.writeActionsRequireConfirmation ? 'confirm writes' : 'open writes'} />
            <BriefingTile icon={<CheckCircle2 />} label="Next" value="continuous" detail={briefing.nextImprovements[0]} />
          </div>
        </section>
      )}

      {embeddedWebPanel && (
        <section className="v3-web-deck" aria-label="Explorador web interno de Alfred">
          <div className="v3-web-deck-head">
            <div>
              <div className="v3-eyebrow small"><Globe2 size={13} /> ALFRED WEB CORE</div>
              <h3>Explorador web dentro del panel de Alfred</h3>
              <p>Buscador integrado · navegación interna · solo abre pestaña externa cuando el Jefe Maestro pulsa “Abrir fuera”.</p>
            </div>
            <div className="v3-web-actions">
              <button type="button" onClick={reloadWebPanel} className="v3-web-copy">
                <Activity size={14} /> Recargar
              </button>
              <button type="button" onClick={copyCurrentWebLink} className="v3-web-copy">
                <Copy size={14} /> Copiar enlace
              </button>
              <a href={embeddedWebPanel.url.startsWith('/api/web-core/search') ? `https://duckduckgo.com/?q=${encodeURIComponent(embeddedWebPanel.query || webAddressInput || '')}` : embeddedWebPanel.url} target="_blank" rel="noreferrer" className="v3-web-external">
                <ExternalLink size={14} /> Abrir fuera
              </a>
              <button type="button" onClick={onCloseEmbeddedWeb} aria-label="Cerrar explorador web"><X size={14} /> Cerrar</button>
            </div>
          </div>
          <div className="v3-web-toolbar">
            <div className="v3-web-current"><Globe2 size={14} /> <span>{embeddedWebPanel.label}</span></div>
            <div className="v3-web-address">
              <Search size={14} />
              <input
                value={webAddressInput}
                onChange={(event) => setWebAddressInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submitWebNavigation()}
                placeholder="Buscar en la web o pegar URL..."
                aria-label="Buscar o navegar dentro de Alfred Web Core"
              />
              <button type="button" onClick={submitWebNavigation}>Navegar</button>
            </div>
          </div>
          <div className="v3-web-frame-wrap">
            {embeddedWebPanel.url.startsWith('/api/web-core/search') ? (
              <div className="v3-web-results" aria-label="Resultados internos de Alfred Web Core">
                {webSearchLoading && <div className="v3-thinking-line"><Loader2 size={13} className="animate-spin" /> Buscando dentro de Alfred Web Core...</div>}
                {!webSearchLoading && webResults.length === 0 && <p>No encontré resultados internos. Use “Abrir fuera” solo si usted lo indica, Jefe Maestro.</p>}
                {webResults.map((result, index) => (
                  <article key={`${result.url}_${index}`} className="v3-web-result-card">
                    <b>{result.title}</b>
                    <p>{result.snippet}</p>
                    <div>
                      <span>{result.url}</span>
                      <button type="button" onClick={() => onNavigateWeb({ url: result.url, label: labelFromUrl(result.url), query: result.title })}>Ver dentro</button>
                      <button type="button" onClick={() => navigator.clipboard?.writeText(result.url).then(() => setLiveTranscript('Enlace copiado al portapapeles.')).catch(() => setLiveTranscript(result.url))}>Copiar</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <iframe
                ref={webFrameRef}
                key={`${embeddedWebPanel.url}_${webReloadKey}`}
                title="Explorador web interno de Alfred"
                src={embeddedWebPanel.url}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer-when-downgrade"
                className="v3-web-frame"
              />
            )}
            <div className="v3-web-frame-note">
              Las búsquedas se renderizan dentro de Alfred para evitar rechazos de iframe. Algunas páginas directas aún pueden bloquearse; use “Abrir fuera” solo cuando usted lo indique.
            </div>
          </div>
        </section>
      )}

      {embeddedMediaUrl && (
        <section className="v3-media-deck" aria-label="Reproductor de música de Alfred">
          <div className="v3-media-deck-head">
            <div>
              <div className="v3-eyebrow small"><Radio size={13} /> ALFRED MEDIA CORE</div>
              <h3>Música de la rutina diaria</h3>
              <p>{embeddedMediaMuted ? 'Silenciado por defecto para proteger el micrófono · Alfred lo reactiva solo por orden del Jefe Maestro.' : 'Reproductor completo abajo · YouTube integrado · volumen moderado cuando el navegador lo permite.'}</p>
            </div>
            <div className="v3-media-actions">
              <button type="button" onClick={() => sendMediaCommand(embeddedMediaMuted ? 'unmute' : 'mute')} aria-label={embeddedMediaMuted ? 'Activar audio de música' : 'Silenciar música'}>
                {embeddedMediaMuted ? <Volume2 size={14} /> : <VolumeX size={14} />} {embeddedMediaMuted ? 'Activar audio' : 'Silenciar'}
              </button>
              <button type="button" onClick={() => sendMediaCommand('pause')} aria-label="Pausar música"><Pause size={14} /> Pausar</button>
              <button type="button" onClick={() => sendMediaCommand('play')} aria-label="Reproducir música"><Play size={14} /> Play</button>
              <button type="button" onClick={onCloseEmbeddedMedia} aria-label="Cerrar reproductor">Cerrar</button>
            </div>
          </div>
          <iframe ref={mediaFrameRef} title="Música de la rutina diaria de Alfred" src={embeddedMediaUrl} allow="autoplay; encrypted-media" className="v3-media-frame" />
        </section>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="v3-metric-card"><span>{label}</span><b>{value}</b></div>
);

const StatusCard = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'cyan' | 'violet' | 'gold' | 'emerald' }) => (
  <div className={`v3-status-card ${tone}`}>
    <div className="v3-status-icon">{icon}</div>
    <div><span>{label}</span><b>{value}</b></div>
  </div>
);

const BriefingTile = ({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) => (
  <div className="v3-briefing-tile">
    <div className="v3-briefing-icon">{icon}</div>
    <div>
      <span>{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  </div>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="v3-detail-row"><span>{label}</span><b>{value}</b></div>
);

const AudioSpectrum = ({ active, tall = false }: { active: boolean; tall?: boolean }) => {
  const bars = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className={`v3-spectrum ${tall ? 'tall' : ''}`}>
      {bars.map(i => (
        <div
          key={i}
          style={{
            height: active ? `${18 + ((i * 23) % 82)}%` : `${7 + ((i * 11) % 24)}%`,
            animation: active ? `spectrum ${0.36 + (i % 10) * 0.05}s ease-in-out infinite alternate` : undefined,
          }}
        />
      ))}
    </div>
  );
};
