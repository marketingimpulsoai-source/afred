import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Send, Loader2, Volume2, ChevronDown, ChevronUp, Activity, Radio, ShieldCheck,
  Sparkles, BrainCircuit, Aperture, Waves, Network, Shield, Zap, Mic2, Keyboard,
  RadioTower, Wand2, Palette, Clapperboard, BadgeDollarSign, Bot, Cpu, Power,
  Gauge, HardDrive, ServerCog, Clock3, CheckCircle2,
} from 'lucide-react';
import { Language, CoreState, Message, SubAgent, SecurityLevel } from '../types';
import { playAudioTTS, playAcknowledgmentChime } from '../utils/audioTTS';
import { AlfredWorldOrb3D } from './AlfredWorldOrb3D';

interface Props {
  language: Language;
  coreState: CoreState;
  messages: Message[];
  onSendMessage: (text: string) => void;
  subAgents: SubAgent[];
  securityLevel: SecurityLevel;
  audioMuted: boolean;
}

type PermissionStateLabel = 'unknown' | 'granted' | 'prompt' | 'denied' | 'unsupported';
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

export const AlfredCoreHUD: React.FC<Props> = ({ language, coreState, messages, onSendMessage, subAgents, securityLevel, audioMuted }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionStateLabel>('unknown');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [briefing, setBriefing] = useState<OperationalBriefing | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const handsFreeRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/briefing')
      .then(res => res.json())
      .then(data => setBriefing(data.briefing || null))
      .catch(() => setBriefing(null));
  }, []);

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

  const activeCount = subAgents.filter(a => a.status === 'ACTIVE').length;
  const quickPrompts = language === 'es' ? QUICK_ES : QUICK_EN;

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      localStorage.setItem(AUTO_HANDS_FREE_KEY, 'true');
      setPermissionState('granted');
      return true;
    } catch {
      setPermissionState('denied');
      return false;
    }
  };

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
    if (normalized.includes('silencio') || normalized.includes('mute') || normalized.includes('voice off')) {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-voice-command]')).find(btn => btn.textContent?.toLowerCase().includes('voice'));
      button?.click();
      return true;
    }
    return false;
  }, [handleSend]);

  const startRecognition = useCallback(async (continuous = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionState('unsupported');
      setLiveTranscript(language === 'es' ? 'Reconocimiento de voz no soportado en este navegador.' : 'Speech recognition is not supported in this browser.');
      return false;
    }
    const ok = permissionState === 'granted' || await requestMicAccess();
    if (!ok) return false;

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
        const lower = finalText.toLowerCase();
        const isGreetingCommand = isAlfredGreetingCommand(finalText);
        const withoutWake = WAKE_WORDS.reduce((text, wake) => text.replace(wake, ''), lower).trim();
        const isWakeCommand = WAKE_WORDS.some(w => lower.includes(w));
        if (!isGreetingCommand && runVoiceShortcut(withoutWake || finalText)) return;
        if (continuous && !isWakeCommand && !isGreetingCommand) return;
        const spoken = isGreetingCommand ? finalText.trim() : (isWakeCommand ? withoutWake : finalText.trim());
        if (spoken) {
          setInput(spoken);
          handleSend(spoken);
        }
      }
    };
    recognition.onerror = (event: any) => {
      const error = event?.error || 'unknown';
      setLiveTranscript(language === 'es' ? `Micrófono: ${error}` : `Microphone: ${error}`);
      setIsListening(false);
      if (!continuous || ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
        handsFreeRef.current = false;
        if (error === 'not-allowed' || error === 'service-not-allowed') setPermissionState('denied');
        if (!continuous) setHandsFree(false);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (continuous && handsFreeRef.current) {
        setTimeout(() => startRecognition(true), 350);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setLiveTranscript(language === 'es' ? 'Alfred escuchando. Diga “Buenos días Alfred”, “Buenas tardes Alfred” o “Buenas noches Alfred”.' : 'Alfred is listening. Say “Good morning Alfred”, “Good afternoon Alfred”, or “Good evening Alfred”.');
      return true;
    } catch (error) {
      console.warn('[Alfred Voice] recognition.start failed', error);
      setIsListening(false);
      return false;
    }
  }, [language, permissionState, handleSend, runVoiceShortcut]);

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
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    localStorage.setItem(AUTO_HANDS_FREE_KEY, 'true');
    const started = await startRecognition(true);
    if (!started) {
      handsFreeRef.current = false;
      setHandsFree(false);
    }
  };

  const coreStateLabel = {
    IDLE: language === 'es' ? 'V3 / MANOS LIBRES' : 'V3 / HANDS-FREE',
    LISTENING: language === 'es' ? 'ESCUCHANDO EN TIEMPO REAL' : 'REAL-TIME LISTENING',
    PROCESSING: language === 'es' ? 'PROCESANDO' : 'PROCESSING',
    ROUTING: language === 'es' ? 'ENRUTANDO' : 'ROUTING',
    SPEAKING: language === 'es' ? 'RESPONDIENDO' : 'SPEAKING',
    ERROR: 'ERROR',
  }[coreState];

  const speak = (text: string) => {
    playAcknowledgmentChime();
    playAudioTTS(text, language, () => undefined);
  };

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
            <AlfredWorldOrb3D size="hero" active={isListening || coreState === 'PROCESSING' || coreState === 'ROUTING' || coreState === 'SPEAKING'} label="ALFRED 3D world orb" />
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
        </div>
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

      <section className="v3-live-grid">
        <div className="v3-chat-shell">
          <div className="v3-chat-header">
            <div>
              <div className="v3-eyebrow small">REAL-TIME LIVE CONVERSATION</div>
              <h3>{language === 'es' ? 'Canal operativo con acceso por voz y texto' : 'Operational channel with voice and text access'}</h3>
            </div>
            <div className="v3-signal"><Waves size={15} /> {audioMuted ? 'VOICE MUTED' : 'VOICE READY'}</div>
          </div>

          <div ref={scrollRef} className="v3-message-stream">
            {messages.map((msg) => {
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
                    {msg.sender !== 'user' && (
                      <div className="v3-message-actions">
                        {hasReasoning && (
                          <button onClick={() => setExpandedReasoning(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))} data-voice-command="show reasoning">
                            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {language === 'es' ? 'Razonamiento' : 'Reasoning'}
                          </button>
                        )}
                        <button onClick={() => speak(msg.text)} data-voice-command="play voice"><Volume2 size={12} /> {language === 'es' ? 'Voz' : 'Voice'}</button>
                        {msg.confidenceScore && <span>CONFIDENCE {msg.confidenceScore}%</span>}
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
            {(coreState === 'PROCESSING' || coreState === 'ROUTING') && (
              <div className="v3-thinking-line">
                <Loader2 size={13} className="animate-spin" />
                {language === 'es' ? 'Alfred está seleccionando el mejor agente...' : 'Alfred is selecting the best agent...'}
              </div>
            )}
          </div>

          <div className="v3-composer">
            <AudioSpectrum active={coreState === 'SPEAKING' || isListening} />
            <div className="v3-live-transcript">
              <RadioTower size={13} />
              <span>{liveTranscript || lastVoiceCommand || (language === 'es' ? 'Diga “Buenos días Alfred”, “Buenas tardes Alfred” o “Buenas noches Alfred”.' : 'Say “Good morning Alfred”, “Good afternoon Alfred”, or “Good evening Alfred”.')}</span>
            </div>
            <div className="v3-composer-row">
              <button onClick={toggleMic} aria-label={language === 'es' ? 'Activar micrófono' : 'Activate microphone'} className={`v3-mic-button ${isListening ? 'listening' : ''}`} data-voice-command="microphone">
                <Mic size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={language === 'es' ? 'Ordene algo a Alfred Corp V3.5...' : 'Command Alfred Corp V3.5...'}
                aria-label={language === 'es' ? 'Comando para Alfred Corp V3.5' : 'Command for Alfred Corp V3.5'}
              />
              <button onClick={() => handleSend()} className="v3-send-button" data-voice-command="execute">
                <Send size={16} /> {language === 'es' ? 'EJECUTAR' : 'EXECUTE'}
              </button>
            </div>
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
            <AudioSpectrum active={coreState === 'SPEAKING' || isListening} tall />
            <p>{coreStateLabel}</p>
          </div>
          <div className="v3-mini-panel">
            <div className="v3-eyebrow small"><Keyboard size={13} /> Run from correct folder</div>
            <code>cd "$HOME/Desktop/afred"</code>
            <code>npm run lint && npm run build && npm run test</code>
          </div>
        </aside>
      </section>
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
