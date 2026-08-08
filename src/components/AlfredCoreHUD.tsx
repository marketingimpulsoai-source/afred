import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Send, Loader2, Volume2, ChevronDown, ChevronUp, Activity, Radio, ShieldCheck,
  Sparkles, BrainCircuit, Aperture, Waves, Network, Shield, Zap, Mic2, Keyboard,
  RadioTower, Wand2, Palette, Clapperboard, BadgeDollarSign, Bot, Cpu, Power,
  Gauge, HardDrive, ServerCog, Clock3, CheckCircle2,
} from 'lucide-react';
import { Language, CoreState, Message, SubAgent, SecurityLevel } from '../types';
import { playAudioTTS, playAcknowledgmentChime } from '../utils/audioTTS';

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
type ApiPipelineStatus = { id: string; label: string; purpose: string; configured: boolean; statusLabel: string };
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
  'Alfred, activa modo manos libres',
  'Crea un video MiniMax para una campaña SaaS',
  'Diseña con Gemini Nano Banana un dashboard futurista',
  'Abre Media AI y prepara Seedance 2.5',
  'Verifica permisos del micrófono en el browser',
  'Orquesta agentes para entregar una campaña completa',
];
const QUICK_EN = [
  'Alfred, activate hands-free mode',
  'Create a MiniMax video for a SaaS campaign',
  'Design a futuristic dashboard with Gemini Nano Banana',
  'Open Media AI and prepare Seedance 2.5',
  'Check browser microphone permissions',
  'Orchestrate agents to deliver a full campaign',
];

const WAKE_WORDS = ['alfred', 'hey alfred', 'oye alfred', 'que mundo', 'qué mundo', 'llego papi', 'jefe maestro'];

const STITCH_FUSION_PACKS = [
  { id: '00', name: 'Aether-Chassis HUD', source: 'base zip', effect: 'glass panel · chamfer · scanline' },
  { id: '01', name: 'Command Center Prime', source: '(1)', effect: 'data grid · JetBrains Mono · Playfair' },
  { id: '02', name: 'Reactive Nexus Core', source: '(2)', effect: 'cyan pulse · voice spectrum' },
  { id: '03', name: 'Agent Operations Rail', source: '(3)', effect: 'modular cards · telemetry lanes' },
  { id: '04', name: 'Fortress Tactical Core', source: '(4)', effect: 'flicker · security amber' },
  { id: '05', name: 'Creative Forge Deck', source: '(5)', effect: 'violet glow · media staging' },
  { id: '06', name: '12-Agent HUD Library', source: '(6)', effect: 'Thomas · Ada · Leonardo · Fortress · Minerva' },
  { id: '07', name: 'Shader Backplane', source: '(7)', effect: 'WebGL-inspired depth layer' },
  { id: '08', name: 'Minerva Memory Core', source: '(8)', effect: 'memory lattice · three.js orbital motif' },
  { id: '09', name: 'Quantum Link Mesh', source: '(9)', effect: 'shader mesh · particle halo' },
];

export const AlfredCoreHUD: React.FC<Props> = ({ language, coreState, messages, onSendMessage, subAgents, securityLevel, audioMuted }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionStateLabel>('unknown');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [apiPipelines, setApiPipelines] = useState<ApiPipelineStatus[]>([]);
  const [briefing, setBriefing] = useState<OperationalBriefing | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const handsFreeRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/alfred-v3/status')
      .then(res => res.json())
      .then(data => setApiPipelines(data.apiPipelines || []))
      .catch(() => setApiPipelines([]));

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
      alert(language === 'es' ? 'Reconocimiento de voz no soportado en este navegador.' : 'Speech recognition is not supported in this browser.');
      return;
    }
    const ok = permissionState === 'granted' || await requestMicAccess();
    if (!ok) return;

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
        const withoutWake = WAKE_WORDS.reduce((text, wake) => text.replace(wake, ''), lower).trim();
        const isWakeCommand = WAKE_WORDS.some(w => lower.includes(w));
        if (runVoiceShortcut(withoutWake || finalText)) return;
        if (continuous && !isWakeCommand) return;
        const spoken = isWakeCommand ? withoutWake : finalText;
        if (spoken) {
          setInput(spoken);
          handleSend(spoken);
        }
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      if (!continuous) setHandsFree(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (continuous && handsFreeRef.current) {
        setTimeout(() => startRecognition(true), 350);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [language, permissionState, handleSend, runVoiceShortcut]);

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
      setHandsFree(false);
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }
    handsFreeRef.current = true;
    setHandsFree(true);
    await startRecognition(true);
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
          <div className="v3-eyebrow"><Sparkles size={14} /> ALFRED CORP V3.5 / STITCH CYBERPUNK NEXUS</div>
          <h2>{language === 'es' ? 'Centro de mando cyberpunk con todos los diseños Stitch fusionados' : 'Cyberpunk command center with every Stitch design fused'}</h2>
          <p>
            {language === 'es'
              ? 'Nueva versión mejorada inspirada en alfred-ai-butle.ai.studio: estado CORE online, enlace cuántico, seguridad balanceada, audio en tiempo real, 12 subagentes y una matriz visual que incorpora los diez paquetes Stitch importados.'
              : 'Improved release inspired by alfred-ai-butle.ai.studio: CORE online status, quantum link, balanced security, real-time audio, 12 sub-agents, and a visual matrix incorporating the ten imported Stitch packs.'}
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
          <div className="v35-shader-backplane" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="v35-ai-studio-readout" aria-label="AI Studio system status">
            <b>SYSTEM STATUS</b>
            <span>CORE: ONLINE</span>
            <span>LATENCY: 12ms</span>
            <span>QUANTUM LINK: ESTABLISHED</span>
          </div>
          <button
            type="button"
            onClick={toggleHandsFree}
            className={`v3-permission-orb ${isListening ? 'listening' : ''} ${handsFree ? 'handsfree' : ''} permission-${permissionState}`}
            aria-label={language === 'es' ? 'Activar modo manos libres de Alfred' : 'Activate Alfred hands-free mode'}
            data-voice-command="activate hands free"
          >
            <span className="v3-orb-ring ring-a" />
            <span className="v3-orb-ring ring-b" />
            <span className="v3-orb-ring ring-c" />
            <span className="v3-orb-core"><Mic2 size={56} /><b>{handsFree ? 'LIVE' : 'V3'}</b></span>
          </button>
          <div className="v3-permission-readout">
            <Metric label="MIC" value={permissionState.toUpperCase()} />
            <Metric label="MODE" value={handsFree ? 'HANDS-FREE' : 'PUSH-TO-TALK'} />
            <Metric label="WAKE" value="ALFRED" />
          </div>
          <button onClick={requestMicAccess} className="v3-permission-button" data-voice-command="request microphone access">
            <ShieldCheck size={14} /> {language === 'es' ? 'DAR ACCESO AL MICRÓFONO' : 'GRANT MICROPHONE ACCESS'}
          </button>
        </div>
      </section>

      <section className="v3-pipeline-grid">
        <StatusCard icon={<Activity />} label="Latency fabric" value="12ms" tone="cyan" />
        <StatusCard icon={<Clapperboard />} label="MiniMax API" value={apiPipelines.find(p => p.id === 'minimax')?.statusLabel || 'awaiting local secret'} tone="violet" />
        <StatusCard icon={<Palette />} label="Gemini Nano Banana" value={apiPipelines.find(p => p.id === 'gemini_nano_banana')?.statusLabel || 'awaiting local secret'} tone="gold" />
        <StatusCard icon={<Wand2 />} label="Stitch MCP" value="10 packs fused" tone="emerald" />
        <StatusCard icon={<Aperture />} label="Seedance 2.5" value="primary video" tone="cyan" />
        <StatusCard icon={<BadgeDollarSign />} label="RevenueCat" value="monetization ready" tone="gold" />
        <StatusCard icon={<Bot />} label="Agents" value={`${activeCount}/12 base + 16 business`} tone="emerald" />
        <StatusCard icon={<Cpu />} label="Security" value={securityLevel} tone="violet" />
      </section>

      <section className="v35-fusion-panel" aria-label={language === 'es' ? 'Matriz de diseños Stitch fusionados' : 'Fused Stitch design matrix'}>
        <div className="v35-fusion-head">
          <div>
            <div className="v3-eyebrow small"><Network size={13} /> STITCH FUSION MATRIX</div>
            <h3>{language === 'es' ? 'Todos los diseños Stitch incorporados en ALFRED CORP V3.5' : 'Every Stitch design incorporated into ALFRED CORP V3.5'}</h3>
            <p>{language === 'es' ? 'La cabina combina el diseño público ai.studio con Aether-Chassis HUD, Nexus Core, librería de 12 agentes, backplanes shader y motivos Three.js, implementados como CSS/React seguros.' : 'The cockpit combines the public ai.studio design with Aether-Chassis HUD, Nexus Core, the 12-agent library, shader backplanes, and Three.js motifs implemented as safe CSS/React.'}</p>
          </div>
          <div className="v35-fusion-badge"><Sparkles size={14} /> 10 ZIP PACKS</div>
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
            <BriefingTile icon={<Bot />} label="Agents" value={`${briefing.alfred.activeBaseAgents}/12 + ${briefing.alfred.businessAgents}`} detail={`${briefing.alfred.mediaAgents} media · ${briefing.alfred.primaryVideoProvider}`} />
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
              <span>{liveTranscript || lastVoiceCommand || (language === 'es' ? 'Diga “Alfred” seguido de su orden...' : 'Say “Alfred” followed by your command...')}</span>
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
            <Detail label="Wake command" value="Alfred / Qué mundo / Llego papi" />
            <Detail label="Browser mic" value={permissionState} />
            <Detail label="Speech mode" value={handsFree ? 'continuous real-time' : 'push-to-talk'} />
            <Detail label="Stitch packs" value="10 fused" />
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
