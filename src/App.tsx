import React, { useState, useEffect, useCallback } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { AlfredCoreHUD } from './components/AlfredCoreHUD';
import { SubAgentsGrid } from './components/SubAgentsGrid';
import { ToolsEngine } from './components/ToolsEngine';
import { PoliciesGuardrails } from './components/PoliciesGuardrails';
import { ObservabilityDashboard } from './components/ObservabilityDashboard';
import { DocsArchitecture } from './components/DocsArchitecture';
import { NeuralNetworkMap } from './components/NeuralNetworkMap';
import { ToastNotification, Toast } from './components/ToastNotification';
import { MemoryVault, SettingsPanel, ArchitectureDeepDive } from './components/EnhancedPanels';
import { BusinessAgentsCommand } from './components/BusinessAgentsCommand';
import { MediaCommandCenter } from './components/MediaCommandCenter';
import { Language, SecurityLevel, CoreState, Message, SubAgent, TabId, UiAction } from './types';
import { SUB_AGENTS } from './data/alfredData';
import { playAudioTTS, playAcknowledgmentChime } from './utils/audioTTS';
import { timeBasedGreeting } from './alfred_core/personality';
import './styles/alfredV2.css';

function getSpokenText(text: string): string {
  return text
    .split(/\r?\n/)
    .filter(line => !/^\s*(razonamiento|reasoning|voz|voice|confidence|confianza)\b/i.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
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
          setEmbeddedMediaUrl(action.url);
          addToast(`${action.label}${action.volume ? ` · volumen ${action.volume}` : ''}`, 'ALFRED');
          return;
        }
        const opened = window.open(action.url, '_blank', 'noopener,noreferrer');
        addToast(
          opened
            ? `${action.label}${action.volume ? ` · volumen ${action.volume}` : ''}`
            : `El navegador bloqueó la apertura automática. Abra manualmente: ${action.url}`,
          'ALFRED'
        );
      }
    });
  }, []);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language,
          securityLevel,
          sessionId,
          history: messages.slice(-10).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

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

      if (!audioMuted) {
        playAudioTTS(spokenText, language, () => setCoreState('IDLE'));
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
          ? 'Comprendido, Jefe Maestro. Ha ocurrido un problema de conexión con el núcleo. Por favor, verifique que el servidor esté en ejecución.'
          : 'Understood, Jefe Maestro. There was a connection issue with the core. Please verify the server is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
        language,
      };
      setMessages(prev => [...prev, fallbackMsg]);
      setCoreState('ERROR');
      setTimeout(() => setCoreState('IDLE'), 2000);
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
            messages={messages}
            onSendMessage={handleSendMessage}
            subAgents={subAgents}
            securityLevel={securityLevel}
            audioMuted={audioMuted}
            embeddedMediaUrl={embeddedMediaUrl}
            onCloseEmbeddedMedia={() => setEmbeddedMediaUrl(null)}
          />
        )}
        {activeTab === 'agents' && <SubAgentsGrid subAgents={subAgents} language={language} />}
        {activeTab === 'business' && <BusinessAgentsCommand language={language} />}
        {activeTab === 'media' && <MediaCommandCenter language={language} />}
        {activeTab === 'tools' && <ToolsEngine language={language} />}
        {activeTab === 'policies' && <PoliciesGuardrails language={language} />}
        {activeTab === 'observability' && <ObservabilityDashboard language={language} />}
        {activeTab === 'architecture' && <ArchitectureDeepDive language={language} />}
        {activeTab === 'settings' && <SettingsPanel language={language} />}
        {activeTab === 'network' && <NeuralNetworkMap language={language} subAgents={subAgents} activityVersion={agentActivityVersion} />}
        {activeTab === 'memory' && <MemoryVault language={language} />}
        {activeTab === 'docs' && <DocsArchitecture language={language} />}
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
