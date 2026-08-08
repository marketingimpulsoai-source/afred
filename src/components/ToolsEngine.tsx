import React, { useEffect, useState } from 'react';
import { Language, AgentTool } from '../types';
import { Wrench } from 'lucide-react';

interface Props { language: Language; }

const riskColor: Record<string, string> = {
  LOW: '#22D3EE', MEDIUM: '#EAB308', HIGH: '#EC4899', CRITICAL: '#EF4444',
};

export const ToolsEngine: React.FC<Props> = ({ language }) => {
  const [tools, setTools] = useState<AgentTool[]>([]);

  useEffect(() => {
    fetch('/api/tools').then(r => r.json()).then(d => setTools(d.tools)).catch(console.error);
  }, []);

  return (
    <div className="hud-card chamfer p-6" data-sector="TOOL-ENGINE">
      <h2 className="font-display text-lg text-cyan-200 mt-2 mb-6 flex items-center gap-2">
        <Wrench size={16} /> {language === 'es' ? 'GESTOR DE HERRAMIENTAS' : 'TOOLS ENGINE'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tools.map((tool) => (
          <div key={tool.id} className="hud-card chamfer-sm p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="hud-data text-sm text-cyan-200">{language === 'es' ? tool.nameES : tool.nameEN}</span>
              <span className="hud-label text-[8px] px-1.5 py-0.5" style={{ color: riskColor[tool.riskLevel], border: `1px solid ${riskColor[tool.riskLevel]}40` }}>
                {tool.riskLevel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{language === 'es' ? tool.descriptionES : tool.descriptionEN}</p>
            <span className="text-[9px] text-slate-600 mt-1 block">agent: {tool.agentId}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
