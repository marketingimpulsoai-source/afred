import React from 'react';
import { Globe, Volume2, VolumeX, Shield, UserRound, Sparkles, Orbit, Cpu, RadioTower, Mic2 } from 'lucide-react';
import { Language, SecurityLevel, CoreState, TabId } from '../types';

interface Props {
  language: Language;
  setLanguage: (l: Language) => void;
  securityLevel: SecurityLevel;
  setSecurityLevel: (s: SecurityLevel) => void;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  coreState: CoreState;
  audioMuted: boolean;
  setAudioMuted: (m: boolean) => void;
  activeAgentsCount: number;
}

const TABS_ES: Record<TabId, string> = {
  core: 'CORE V3',
  agents: 'AGENTES',
  business: 'NEGOCIOS',
  media: 'MEDIA AI',
  tools: 'TOOLS',
  policies: 'SEGURIDAD',
  observability: 'OBSERVA',
  architecture: 'ARQ',
  biometric: 'BIOMETRÍA',
  settings: 'AJUSTES',
  docs: 'ARCHIVO',
  network: 'NEURAL',
  mobile: 'MÓVIL',
  memory: 'MEMORIA',
};
const TABS_EN: Record<TabId, string> = {
  core: 'CORE V3',
  agents: 'AGENTS',
  business: 'BUSINESS',
  media: 'MEDIA AI',
  tools: 'TOOLS',
  policies: 'SECURITY',
  observability: 'OBSERVE',
  architecture: 'ARCH',
  biometric: 'BIOMETRIC',
  settings: 'SETTINGS',
  docs: 'ARCHIVE',
  network: 'NEURAL',
  mobile: 'MOBILE',
  memory: 'MEMORY',
};

export const HeaderHUD: React.FC<Props> = ({
  language, setLanguage, securityLevel, setSecurityLevel,
  activeTab, setActiveTab, coreState, audioMuted, setAudioMuted, activeAgentsCount,
}) => {
  const labels = language === 'es' ? TABS_ES : TABS_EN;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  const stateLabel = coreState === 'IDLE' ? (language === 'es' ? 'HANDS-FREE READY' : 'HANDS-FREE READY') : coreState;

  return (
    <header className="alfred-v3-header sticky top-0 z-50">
      <div className="v3-header-shell max-w-[1920px] mx-auto px-4 py-4">
        <div className="flex flex-col 2xl:flex-row gap-4 2xl:items-center 2xl:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="v3-logo-orb" aria-label="ALFRED CORP V3">
              <div className="v3-logo-ring one" />
              <div className="v3-logo-ring two" />
              <span>A</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="v3-brand-title">
                  ALFRED <span>CORP V3</span>
                </h1>
                <div className="v3-version-pill"><Sparkles size={12} /> OBSIDIAN COMMAND</div>
                <div className="v3-version-pill gold"><Mic2 size={12} /> REAL-TIME VOICE</div>
              </div>
              <p className="v3-brand-subtitle">
                {language === 'es'
                  ? 'Mayordomo IA manos libres · MiniMax · Gemini Nano Banana · Stitch MCP · Seedance'
                  : 'Hands-free AI butler · MiniMax · Gemini Nano Banana · Stitch MCP · Seedance'}
              </p>
            </div>
          </div>

          <div className="v3-top-metrics">
            <div className="v3-metric"><Cpu size={13} /><span>{stateLabel}</span></div>
            <label className="v3-select-wrap">
              <Shield size={13} />
              <select value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value as SecurityLevel)}>
                <option value="STRICT">STRICT</option>
                <option value="BALANCED">BALANCED</option>
                <option value="DEV">DEV MODE</option>
              </select>
            </label>
            <div className="v3-metric"><Orbit size={13} /><span>{now}</span></div>
            <button onClick={() => setAudioMuted(!audioMuted)} className="v3-control-button" data-voice-command="toggle voice">
              {audioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />} {audioMuted ? 'VOICE OFF' : 'VOICE ON'}
            </button>
            <div className="v3-master-pill"><UserRound size={13} /> JEFE MAESTRO</div>
            <div className="v3-agent-pill"><RadioTower size={13} /> {activeAgentsCount}/12 ONLINE</div>
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="v3-control-button"
              title={language === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish'}
              data-voice-command="change language"
            >
              <Globe size={13} /> {language === 'es' ? 'ES' : 'EN'}
            </button>
          </div>
        </div>

        <nav className="v3-nav-rail" aria-label="ALFRED CORP V3 navigation">
          {Object.entries(labels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabId)}
              className={`v3-nav-chip ${activeTab === key ? 'active' : ''}`}
              data-voice-command={`open ${label.toLowerCase()}`}
            >
              <span className="v3-nav-dot" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
