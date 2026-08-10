import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { AlfredCoreHUD } from './components/AlfredCoreHUD';
import { ToastNotification, Toast } from './components/ToastNotification';
import { Language, SecurityLevel, CoreState, Message, SubAgent, TabId, UiAction } from './types';
import { SUB_AGENTS } from './data/alfredData';
import { playAudioTTS, playAcknowledgmentChime } from './utils/audioTTS';
import { timeBasedGreeting } from './alfred_core/personality';
import './styles/alfredV2.css';

// Paneles secundarios en carga diferida: el arranque solo descarga el HUD
// principal, no d3/three/paneles de negocio.
const SubAgentsGrid = lazy(() => import('./components/SubAgentsGrid').then(m => ({ default: m.SubAgentsGrid })));
const ToolsEngine = lazy(() => import('./components/ToolsEngine').then(m => ({ default: m.ToolsEngine })));
const PoliciesGuardrails = lazy(() => import('./components/PoliciesGuardrails').then(m => ({ default: m.PoliciesGuardrails })));
const ObservabilityDashboard = lazy(() => import('./components/ObservabilityDashboard').then(m => ({ default: m.ObservabilityDashboard })));
const DocsArchitecture = lazy(() => import('./components/DocsArchitecture').then(m => ({ default: m.DocsArchitecture })));
const NeuralNetworkMap = lazy(() => import('./components/NeuralNetworkMap').then(m => ({ default: m.NeuralNetworkMap })));
const BusinessAgentsCommand = lazy(() => import('./components/BusinessAgentsCommand').then(m => ({ default: m.BusinessAgentsCommand })));
const MediaCommandCenter = lazy(() => import('./components/MediaCommandCenter').then(m => ({ default: m.MediaCommandCenter })));
const MemoryVault = lazy(() => import('./components/EnhancedPanels').then(m => ({ default: m.MemoryVault })));
const SettingsPanel = lazy(() => import('./components/EnhancedPanels').then(m => ({ default: m.SettingsPanel })));
const ArchitectureDeepDive = lazy(() => import('./components/EnhancedPanels').then(m => ({ default: m.ArchitectureDeepDive })));

function getSpokenText(text: string): string {
  const seen = new Set<string>();
  const sentences: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (/^\s*(razonamiento|reasoning|voz|voice|confidence|confianza)\b/i.test(line)) continue;
    const pieces = line.split(/(?<=[.!?])\s+/);
    for (const piece of pieces) {
      const normalized = piece.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      sentences.push(piece.trim());
    }
  }

  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}

type EmbeddedWebPanel = { url: string; label: string; query?: string };

function withMediaMuteParam(url: string, muted: boolean): string {
  if (!url.startsWith('/youtube-routine-player.html')) return url;
  const [path, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  params.set('muted', muted ? '1' : '0');
  return `${path}?${params.toString()}`;
}

function internalWebSearchFromAction(url: string, fallback: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (!['duckduckgo.com', 'google.com', 'bing.com'].includes(host)) return null;
    const query = parsed.searchParams.get('q') || parsed.searchParams.get('query') || fallback;
    return `/api/web-core/search?q=${encodeURIComponent(query || fallback || host)}`;
  } catch {
    return null;
  }
}

// Sesión persistente en localStorage — sobrevive recargas y cierres del navegador
function getOrCreateSessionId(): string {
  const KEY = 'alfred_session_id';
  let sessionId = localStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('es');
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('BALANCED');
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [coreState, setCoreState] = useState<CoreState>('IDLE');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [subAgents, setSubAgents] = useState<SubAgent[]>(SUB_AGENTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState<string>(getOrCreateSessionId());
  const [agentActivityVersion, setAgentActivityVersion] = useState(0);
  const [embeddedMediaUrl, setEmbeddedMediaUrl] = useState<string | null>(null);
  const [embeddedMediaMuted, setEmbeddedMediaMuted] = useState<boolean>(true);
  const [embeddedWebPanel, setEmbeddedWebPanel] = useState<EmbeddedWebPanel | null>(null);

  useEffect(() => {
    (window as any).__ALFRED_SESSION_ID = sessionId;
  }, [sessionId]);

  const addToast = (message: string, agentName?: string) => {
    setToasts(prev => [...prev, { id: Date.now().toString(), message, agentName }]);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const executeUiActions = useCallback((actions: UiAction[] = []) => {
    actions.forEach((action) => {
      if (action.type === 'toast' || action.type === 'audit_log') {
        const prefix = action.type === 'audit_log' ? 'AUDIT · ' : '';
        addToast(prefix + (action.message || action.label), 'ALFRED');
        if (action.type === 'audit_log') {
          const auditKey = 'alfred_daily_routine_audit';
          const current = JSON.parse(localStorage.getItem(auditKey) || '[]') as Array<Record<string, unknown>>;
          current.push({ at: new Date().toISOString(), ...action });
          localStorage.setItem(auditKey, JSON.stringify(current.slice(-100)));
        }
      }
      if (action.type === 'focus_tab' && action.tabId) {
        setActiveTab(action.tabId);
      }
      if (action.type === 'open_url' && action.url) {
        if (action.target === 'youtube' && action.url.startsWith('/youtube-routine-player.html')) {
          setEmbeddedMediaUrl(withMediaMuteParam(action.url, embeddedMediaMuted));
          addToast(`${action.label}${action.volume ? ` · volumen ${action.volume}` : ''}`, 'ALFRED');
          return;
        }
        if (action.target === 'browser') {
          const browserUrl = internalWebSearchFromAction(action.url, action.message || action.label || '') || action.url;
          const label = action.label || 'Web abierta';
          addToast(`${label} · Browser Worker ejecutando`, 'ALFRED');
          // El resultado del worker sí se muestra: éxito, bloqueo, confirmación o error.
          fetch('/api/browser-worker/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              action: 'open',
              url: browserUrl,
              allowPrivate: browserUrl.startsWith('/') || browserUrl.includes('localhost') || browserUrl.includes('127.0.0.1'),
              screenshot: true,
            }),
          })
            .then(res => res.json())
            .then((result: { status?: string; url?: string; title?: string; screenshotUrl?: string; message?: string; error?: string }) => {
              if (result.status === 'SUCCESS') {
                addToast(`${label} · verificado: ${result.title || result.url}`, 'ALFRED');
                if (result.screenshotUrl) {
                  setEmbeddedWebPanel({ url: result.screenshotUrl, label: `Evidencia · ${label}`, query: result.url });
                }
                return;
              }
              addToast(`${label} · ${result.status || 'ERROR'}: ${result.message || result.error || 'sin detalle'}`, 'ALFRED');
            })
            .catch(err => addToast(`${label} · Browser Worker no respondió: ${String(err)}`, 'ALFRED'));
          return;
        }
        const internalSearchUrl = internalWebSearchFromAction(action.url, action.message || action.label || '');
        setEmbeddedWebPanel({
          url: internalSearchUrl || action.url,
          label: internalSearchUrl ? 'Búsqueda interna Alfred' : (action.label || 'Navegación web de Alfred'),
          query: action.message || action.label,
        });
        addToast(
          `${action.label || 'Web abierta'} · abierto dentro de ALFRED WEB CORE`,
          'ALFRED'
        );
      }
    });
  }, [embeddedMediaMuted, sessionId]);

  // ── Cargar historial persistente real desde SQLite al montar ──────────
  useEffect(() => {
    fetch(`/api/history/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([welcomeMessage(language, sessionId)]);
        }
      })
      .catch(() => setMessages([welcomeMessage(language, sessionId)]));

    // Cargar estado real de agentes
    fetch('/api/agents').then(r => r.json()).then(d => {
      if (d.agents) setSubAgents(d.agents);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const refreshAgents = () => {
      fetch('/api/agents').then(r => r.json()).then(d => {
        if (d.agents) {
          setSubAgents(d.agents);
          setAgentActivityVersion(version => version + 1);
        }
      }).catch(() => {});
    };
    const timer = window.setInterval(refreshAgents, 2500);
    return () => window.clearInterval(timer);
  }, []);

  function welcomeMessage(lang: Language, sid: string): Message {
    return {
      id: 'msg_welcome',
      sessionId: sid,
      sender: 'alfred',
      agentName: 'ALFRED',
      text: lang === 'es'
        ? `${timeBasedGreeting('es')}. Soy Alfred, su mayordomo digital. Los 12 sub-agentes especializados se encuentran activos. ¿En qué puedo asistirlo hoy?`
        : `${timeBasedGreeting('en')}. I am Alfred, your digital butler. All 12 specialized sub-agents are active. How may I assist you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      language: lang,
    };
  }

  const handleSendMessage = useCallback(async (text: string) => {
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mediaAudioCommand = /\b(silencia|silencio|mute|calla|baja|pausa|para|deten|quita silencio|activa audio|activa musica|sube|unmute)\b.*\b(musica|youtube|reproductor|media|audio)\b|\b(musica|youtube|reproductor|media|audio)\b.*\b(silencia|silencio|mute|calla|baja|pausa|para|deten|quita silencio|activa audio|activa musica|sube|unmute)\b/.test(normalized);
    if (mediaAudioCommand) {
      const shouldUnmute = /\b(quita silencio|activa audio|activa musica|sube|unmute)\b/.test(normalized);
      const shouldPause = /\b(pausa|para|deten)\b/.test(normalized);
      const userMsg: Message = {
        id: 'usr_' + Date.now(),
        sessionId,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        language,
      };
      const response = shouldPause
        ? 'Entendido, Jefe Maestro. Pausé la música del panel para proteger el micrófono y mantener la conversación limpia.'
        : shouldUnmute
          ? 'Entendido, Jefe Maestro. Reactivé el audio de la música. Si el micrófono empieza a escuchar, Alfred volverá a silenciarla automáticamente.'
          : 'Entendido, Jefe Maestro. Silencié la música del panel de YouTube para que no interrumpa el micrófono ni nuestra conversación.';
      const alfredMsg: Message = {
        id: 'alfred_media_' + Date.now(),
        sessionId,
        sender: 'alfred',
        agentName: 'ALFRED',
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        language,
      };
      setEmbeddedMediaMuted(!shouldUnmute);
      window.setTimeout(() => {
        document.querySelector<HTMLIFrameElement>('iframe[title="Música de la rutina diaria de Alfred"]')?.contentWindow?.postMessage({ type: 'alfred-youtube-control', action: shouldPause ? 'pause' : shouldUnmute ? 'unmute' : 'mute', volume: 35 }, window.location.origin);
      }, 50);
      setMessages(prev => [...prev, userMsg, alfredMsg]);
      fetch('/api/local-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, language, userText: text, alfredText: response }),
      }).catch(() => {});
      return;
    }

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sessionId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      language,
    };

    setMessages(prev => [...prev, userMsg]);
    setCoreState('ROUTING');

    try {
      const payload = {
        message: text,
        language,
        securityLevel,
        sessionId,
        history: messages.slice(-10).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text,
        })),
      };

      let response: Response | null = null;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (response.ok) break;
          lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
          lastError = error;
        }
        if (attempt < 3) {
          await new Promise(resolve => window.setTimeout(resolve, 800 * attempt));
        }
      }

      if (!response || !response.ok) throw lastError || new Error('Chat request failed');
      const data = await response.json();
      setCoreState('PROCESSING');

      const alfredMsg: Message = {
        id: data.id || ('alfred_' + Date.now()),
        sessionId,
        sender: data.assignedAgent ? 'subagent' : 'alfred',
        agentId: data.assignedAgent?.id,
        agentName: data.assignedAgent ? (language === 'es' ? data.assignedAgent.nameES : data.assignedAgent.nameEN) : 'ALFRED',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        language,
        toolCalls: data.toolCallTraces,
        routingDecision: data.routingDecision,
        confidenceScore: data.confidenceScore,
      };

      if (data.assignedAgent) {
        setAgentActivityVersion(version => version + 1);
        const agentName = language === 'es' ? data.assignedAgent.nameES : data.assignedAgent.nameEN;
        addToast(
          language === 'es' ? `Delegando tarea a ${agentName}` : `Delegating task to ${agentName}`,
          agentName
        );
      }

      if (Array.isArray(data.uiActions) && data.uiActions.length > 0) {
        executeUiActions(data.uiActions);
      }

      setMessages(prev => [...prev, alfredMsg]);
      setCoreState('SPEAKING');

      const spokenText = getSpokenText(data.text);
      const lcText = spokenText.toLowerCase();
      if (lcText.includes('comprendido') || lcText.includes('entendido') || lcText.includes('understood')) {
        playAcknowledgmentChime();
      }
      const speechBody = spokenText.length > 320
        ? spokenText.replace(/^jefe maestro[^.]*\.\s*/i, '').replace(/^alfred[^.]*\.\s*/i, '')
        : spokenText;

      if (!audioMuted) {
        playAudioTTS(speechBody, language, () => setCoreState('IDLE'));
      } else {
        setTimeout(() => setCoreState('IDLE'), 1200);
      }
    } catch (err) {
      console.error('[Alfred] Chat API error:', err);
      const fallbackMsg: Message = {
        id: 'fallback_' + Date.now(),
        sessionId,
        sender: 'alfred',
        agentName: 'ALFRED',
        text: language === 'es'
          ? 'Comprendido, Jefe Maestro. El núcleo no respondió a tiempo. Reintentaré la conexión automáticamente.'
          : 'Understood, Jefe Maestro. The core did not respond in time. I will retry the connection automatically.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        language,
      };
      setMessages(prev => [...prev, fallbackMsg]);
      setCoreState('ERROR');
      setTimeout(() => setCoreState('IDLE'), 1200);
    }
  }, [messages, language, securityLevel, sessionId, audioMuted]);

  return (
    <div className="alfred-v2-shell min-h-screen flex flex-col text-cyan-100 font-sans selection:bg-fuchsia-500/30">
      <HeaderHUD
        language={language}
        setLanguage={setLanguage}
        securityLevel={securityLevel}
        setSecurityLevel={setSecurityLevel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        coreState={coreState}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
        activeAgentsCount={subAgents.filter(a => a.status === 'ACTIVE').length}
      />

      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        {activeTab === 'core' && (
          <AlfredCoreHUD
            language={language}
            coreState={coreState}
            onCoreStateChange={setCoreState}
            messages={messages}
            onSendMessage={handleSendMessage}
            subAgents={subAgents}
            securityLevel={securityLevel}
            audioMuted={audioMuted}
            embeddedMediaUrl={embeddedMediaUrl}
            embeddedMediaMuted={embeddedMediaMuted}
            onToggleEmbeddedMediaMute={setEmbeddedMediaMuted}
            onCloseEmbeddedMedia={() => setEmbeddedMediaUrl(null)}
            embeddedWebPanel={embeddedWebPanel}
            onNavigateWeb={(panel) => setEmbeddedWebPanel(panel)}
            onCloseEmbeddedWeb={() => setEmbeddedWebPanel(null)}
            sessionId={sessionId}
          />
        )}
        <Suspense fallback={<div className="v3-thinking-line" role="status">{language === 'es' ? 'Cargando módulo...' : 'Loading module...'}</div>}>
          {activeTab === 'agents' && <SubAgentsGrid subAgents={subAgents} language={language} />}
          {activeTab === 'business' && <BusinessAgentsCommand language={language} />}
          {activeTab === 'media' && <MediaCommandCenter language={language} />}
          {activeTab === 'tools' && <ToolsEngine language={language} />}
          {activeTab === 'policies' && <PoliciesGuardrails language={language} />}
          {activeTab === 'observability' && <ObservabilityDashboard language={language} />}
          {activeTab === 'architecture' && <ArchitectureDeepDive language={language} />}
          {activeTab === 'settings' && <SettingsPanel language={language} />}
          {activeTab === 'network' && <NeuralNetworkMap language={language} subAgents={subAgents} activityVersion={agentActivityVersion + messages.length} messages={messages} />}
          {activeTab === 'memory' && <MemoryVault language={language} />}
          {activeTab === 'docs' && <DocsArchitecture language={language} />}
        </Suspense>
      </main>

      <footer className="v2-footer relative z-10">
        <div className="max-w-[1880px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <p>ALFRED DIGITAL BUTLER V3.5</p>
          <span className="text-cyan-300/80">
            {language === 'es' ? 'VOZ · MEMORIA · RUTINAS · SUBAGENTES · SEGURIDAD' : 'VOICE · MEMORY · ROUTINES · SUB-AGENTS · SECURITY'}
          </span>
          <span>{language === 'es' ? 'ESTADO: OPERATIVO' : 'STATUS: OPERATIONAL'}</span>
        </div>
      </footer>

      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
