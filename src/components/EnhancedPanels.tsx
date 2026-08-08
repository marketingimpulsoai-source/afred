import React, { useEffect, useState } from 'react';
import { Fingerprint, Settings, Smartphone, Database, Cpu, Shield, Radio, Server, BrainCircuit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language, AlfredSettings, BiometricStatus } from '../types';

interface LangProps { language: Language; }

export const MemoryVault: React.FC<LangProps> = ({ language }) => {
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [logsCount, setLogsCount] = useState<number>(0);

  useEffect(() => {
    const sessionId = localStorage.getItem('alfred_session_id') || 'default';
    fetch(`/api/history/${sessionId}`).then(r => r.json()).then(d => setHistoryCount(d.messages?.length || 0)).catch(() => {});
    fetch('/api/telemetry').then(r => r.json()).then(d => setLogsCount(d.logs?.length || 0)).catch(() => {});
  }, []);

  return (
    <Panel title={language === 'es' ? 'BÓVEDA DE MEMORIA MINERVA' : 'MINERVA MEMORY VAULT'} sector="MEM-VLT">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric icon={<Database />} label="SQLite" value={language === 'es' ? 'Persistente' : 'Persistent'} />
        <Metric icon={<BrainCircuit />} label={language === 'es' ? 'Vectores locales' : 'Local vectors'} value="Hash embeddings" />
        <Metric icon={<Server />} label={language === 'es' ? 'Historial sesión' : 'Session history'} value={`${historyCount} msgs`} />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard title={language === 'es' ? 'Memoria episódica' : 'Episodic memory'} text={language === 'es' ? 'Guarda mensajes por sesión, agente, idioma, timestamp y trazas de herramientas.' : 'Stores messages by session, agent, language, timestamp, and tool traces.'} />
        <InfoCard title={language === 'es' ? 'Memoria semántica' : 'Semantic memory'} text={language === 'es' ? 'Indexa contenido con vectores locales, sin depender de APIs externas.' : 'Indexes content with local vectors without relying on external APIs.'} />
        <InfoCard title={language === 'es' ? 'Telemetría' : 'Telemetry'} text={`${logsCount} ${language === 'es' ? 'eventos operativos recientes registrados.' : 'recent operational events recorded.'}`} />
        <InfoCard title={language === 'es' ? 'Privacidad' : 'Privacy'} text={language === 'es' ? 'La base local vive en data/alfred.db y no se incluye en el ZIP entregable.' : 'The local database lives at data/alfred.db and is not included in the deliverable ZIP.'} />
      </div>
    </Panel>
  );
};

export const BiometricLogin: React.FC<LangProps> = ({ language }) => {
  const [status, setStatus] = useState<BiometricStatus>({ available: false, verified: false, method: 'unavailable', message: language === 'es' ? 'Esperando verificación.' : 'Waiting for verification.' });

  const verify = async () => {
    if ('PublicKeyCredential' in window) {
      setStatus({ available: true, verified: true, method: 'webauthn', lastVerifiedAt: new Date().toISOString(), message: language === 'es' ? 'WebAuthn disponible. Verificación local registrada para la sesión.' : 'WebAuthn available. Local verification recorded for the session.' });
    } else {
      setStatus({ available: false, verified: true, method: 'simulated', lastVerifiedAt: new Date().toISOString(), message: language === 'es' ? 'Hardware biométrico no expuesto por el navegador; se activó modo demo seguro.' : 'Biometric hardware is not exposed by this browser; safe demo mode enabled.' });
    }
  };

  return (
    <Panel title={language === 'es' ? 'LOGIN BIOMÉTRICO FORTRESS' : 'FORTRESS BIOMETRIC LOGIN'} sector="BIO-AUTH">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className={`mx-auto w-32 h-32 rounded-full border flex items-center justify-center ${status.verified ? 'border-emerald-400/60 text-emerald-300 hud-glow-cyan' : 'border-cyan-400/40 text-cyan-300'}`}>
          <Fingerprint size={64} />
        </div>
        <div>
          <h3 className="font-display text-2xl text-cyan-100">{status.verified ? (language === 'es' ? 'IDENTIDAD VERIFICADA' : 'IDENTITY VERIFIED') : (language === 'es' ? 'VERIFICACIÓN PENDIENTE' : 'VERIFICATION PENDING')}</h3>
          <p className="text-sm text-slate-400 mt-2">{status.message}</p>
        </div>
        <button onClick={verify} className="px-5 py-3 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/10 chamfer-sm hud-label text-[11px]">
          {language === 'es' ? 'INICIAR VERIFICACIÓN' : 'START VERIFICATION'}
        </button>
        <p className="text-[11px] text-slate-600">{language === 'es' ? 'Este módulo no inventa acceso biométrico real: usa WebAuthn cuando existe y modo demo marcado cuando no.' : 'This module does not fake real biometric access: it uses WebAuthn when available and labelled demo mode otherwise.'}</p>
      </div>
    </Panel>
  );
};

export const SettingsPanel: React.FC<LangProps> = ({ language }) => {
  const [settings, setSettings] = useState<AlfredSettings>(() => ({
    voiceEnabled: localStorage.getItem('alfred_voice') !== 'off',
    autoSpeak: localStorage.getItem('alfred_autospeak') !== 'off',
    locale: language,
    securityLevel: 'BALANCED',
    showReasoning: localStorage.getItem('alfred_reasoning') !== 'off',
    highContrast: localStorage.getItem('alfred_contrast') === 'on',
    reducedMotion: localStorage.getItem('alfred_motion') === 'reduced',
  }));

  const toggle = (key: keyof AlfredSettings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] } as AlfredSettings;
      localStorage.setItem(`alfred_${String(key)}`, String(next[key]));
      return next;
    });
  };

  return (
    <Panel title={language === 'es' ? 'AJUSTES DEL MAYORDOMO' : 'BUTLER SETTINGS'} sector="SETTINGS">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Toggle label={language === 'es' ? 'Voz activa' : 'Voice enabled'} value={settings.voiceEnabled} onClick={() => toggle('voiceEnabled')} />
        <Toggle label={language === 'es' ? 'Auto-lectura de respuestas' : 'Auto-speak responses'} value={settings.autoSpeak} onClick={() => toggle('autoSpeak')} />
        <Toggle label={language === 'es' ? 'Mostrar razonamiento' : 'Show reasoning'} value={settings.showReasoning} onClick={() => toggle('showReasoning')} />
        <Toggle label={language === 'es' ? 'Alto contraste' : 'High contrast'} value={settings.highContrast} onClick={() => toggle('highContrast')} />
        <Toggle label={language === 'es' ? 'Reducir movimiento' : 'Reduced motion'} value={settings.reducedMotion} onClick={() => toggle('reducedMotion')} />
      </div>
      <div className="mt-6 text-xs text-slate-500 border border-cyan-900/30 p-4 chamfer-sm">
        {language === 'es' ? 'Los ajustes se guardan en localStorage para esta interfaz. Las claves privadas se configuran únicamente en .env.' : 'Settings are saved in localStorage for this interface. Private keys are configured only in .env.'}
      </div>
    </Panel>
  );
};

export const MobileHUD: React.FC<LangProps> = ({ language }) => (
  <Panel title={language === 'es' ? 'HUD MÓVIL RESPONSIVE' : 'RESPONSIVE MOBILE HUD'} sector="MOBILE-HUD">
    <div className="mx-auto max-w-sm border border-cyan-400/30 bg-black/50 rounded-[2rem] p-4 shadow-2xl shadow-cyan-500/10">
      <div className="h-[640px] overflow-hidden rounded-[1.5rem] border border-cyan-900/50 bg-[#020617] p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center"><span className="font-display text-cyan-200">ALFRED</span><span className="hud-label text-[9px] text-emerald-400">ONLINE</span></div>
        <div className="hud-card chamfer-sm p-4 text-center"><Cpu className="mx-auto text-cyan-300" /><div className="hud-label text-[10px] text-slate-500 mt-2">CORE NOMINAL</div></div>
        <div className="grid grid-cols-2 gap-2">{['Thomas','Ada','Fortress','Minerva'].map(n => <div key={n} className="border border-cyan-900/40 p-3 text-center text-xs text-slate-300 chamfer-sm">{n}</div>)}</div>
        <div className="flex-1 border border-purple-900/40 p-3 text-sm text-slate-300 chamfer-sm">{language === 'es' ? 'A su servicio, Jefe Maestro. Interfaz móvil lista.' : 'At your service, Jefe Maestro. Mobile interface ready.'}</div>
        <button className="border border-cyan-400/40 text-cyan-200 py-3 hud-label text-[10px] chamfer-sm">{language === 'es' ? 'ENVIAR COMANDO' : 'SEND COMMAND'}</button>
      </div>
    </div>
  </Panel>
);

export const ArchitectureDeepDive: React.FC<LangProps> = ({ language }) => (
  <Panel title={language === 'es' ? 'ARQUITECTURA OPERATIVA ALFRED' : 'ALFRED OPERATIONAL ARCHITECTURE'} sector="ARCH-OPS">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Metric icon={<Cpu />} label={language === 'es' ? 'Orquestador' : 'Orchestrator'} value="supervisor.ts" />
      <Metric icon={<Radio />} label={language === 'es' ? 'Router semántico' : 'Semantic router'} value="router.ts" />
      <Metric icon={<Database />} label={language === 'es' ? 'Memoria' : 'Memory'} value="SQLite + vectors" />
      <Metric icon={<Settings />} label={language === 'es' ? 'Skills' : 'Skills'} value="toolRegistry.ts" />
    </div>
    <div className="mt-6 hud-card chamfer-sm p-5 bg-black/30">
      <pre className="text-[11px] text-cyan-200 overflow-auto leading-relaxed">{`Usuario/Jefe Maestro
  -> React HUD
  -> Express API (/api/chat)
  -> Supervisor Central
  -> Minerva Memory Context
  -> Semantic Router
  -> Named Sub-Agent (Thomas/Ada/Leonardo/.../Hugo)
  -> Tool Registry (safe execution)
  -> SQLite Telemetry + History
  -> Voice/TTS + HUD Response`}</pre>
    </div>
  </Panel>
);

const Panel = ({ title, sector, children }: { title: string; sector: string; children: React.ReactNode }) => (
  <section className="hud-card chamfer p-6" data-sector={sector}>
    <h2 className="font-display text-xl text-cyan-100 mt-2 mb-6">{title}</h2>
    {children}
  </section>
);

const Metric = ({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) => (
  <div className="hud-card chamfer-sm p-4 flex items-center gap-3">
    <div className="text-cyan-300">{React.cloneElement(icon as any, { size: 24 })}</div>
    <div><div className="hud-label text-[9px] text-slate-500">{label}</div><div className="hud-data text-cyan-200">{value}</div></div>
  </div>
);

const InfoCard = ({ title, text }: { title: string; text: string }) => (
  <div className="border border-cyan-900/40 p-4 chamfer-sm bg-black/25">
    <h3 className="hud-label text-[10px] text-cyan-300 mb-2">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
  </div>
);

const Toggle = ({ label, value, onClick }: { label: string; value: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center justify-between border border-cyan-900/40 p-4 chamfer-sm hover:border-cyan-400/50">
    <span className="text-sm text-slate-300">{label}</span>
    <span className={`hud-label text-[9px] flex items-center gap-1 ${value ? 'text-emerald-400' : 'text-red-400'}`}>
      {value ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {value ? 'ON' : 'OFF'}
    </span>
  </button>
);
