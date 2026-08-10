import React from 'react';
import {
  BarChart3, Bot, BrainCircuit, Building2, Code2, FileText, Headphones,
  Languages, Megaphone, Plug, Rocket, Server, ShieldCheck, type LucideIcon,
} from 'lucide-react';
import { Language, SubAgent } from '../types';

// Mapa explícito: evita importar todo lucide-react en el bundle.
const AGENT_ICONS: Record<string, LucideIcon> = {
  BarChart3, BrainCircuit, Building2, Code2, FileText, Headphones,
  Languages, Megaphone, Plug, Rocket, Server, ShieldCheck,
};

interface Props {
  subAgents: SubAgent[];
  language: Language;
}

export const SubAgentsGrid: React.FC<Props> = ({ subAgents, language }) => {
  return (
    <div className="hud-card chamfer p-6" data-sector="NODE-STATE">
      <div className="flex items-center justify-between mb-6 mt-2">
        <h2 className="font-display text-lg text-cyan-200">
          {language === 'es' ? '12 SUB-AGENTES ESPECIALIZADOS' : '12 SPECIALIZED SUB-AGENTS'}
        </h2>
        <span className="hud-label text-[10px] text-slate-500">
          {subAgents.filter(a => a.status === 'ACTIVE').length}/12 {language === 'es' ? 'ACTIVOS' : 'ACTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subAgents.map((agent) => {
          const IconComp = AGENT_ICONS[agent.iconName] || Bot;
          const name = language === 'es' ? agent.nameES : agent.nameEN;
          const role = language === 'es' ? agent.roleES : agent.roleEN;
          const desc = language === 'es' ? agent.descriptionES : agent.descriptionEN;

          return (
            <div
              key={agent.id}
              className="hud-card chamfer-sm p-4 relative group hover:border-opacity-60 transition-all"
              style={{ borderColor: `${agent.neonColor}40` }}
              data-sector={agent.code}
            >
              <div className="flex items-start justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 chamfer-sm flex items-center justify-center"
                    style={{ backgroundColor: `${agent.neonColor}15`, border: `1px solid ${agent.neonColor}50` }}
                  >
                    <IconComp size={16} style={{ color: agent.neonColor }} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm" style={{ color: agent.neonColor }}>{name}</h3>
                    <span className="text-[9px] text-slate-500">{role}</span>
                  </div>
                </div>
                <span className={`hud-label text-[8px] px-1.5 py-0.5 ${
                  agent.status === 'ACTIVE' ? 'text-emerald-400 border border-emerald-400/30' :
                  agent.status === 'BUSY' ? 'text-yellow-400 border border-yellow-400/30' :
                  'text-slate-500 border border-slate-600/30'
                }`}>
                  {agent.status}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed line-clamp-3">{desc}</p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                <span className="text-[9px] text-slate-600 hud-data">CPU {agent.cpuLoad}%</span>
                <span className="text-[9px] text-slate-600 hud-data">{agent.memoryUsageMb}MB</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
