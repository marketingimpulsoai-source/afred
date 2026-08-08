import React from 'react';
import { Language } from '../types';
import { FileText } from 'lucide-react';

interface Props { language: Language; }

export const DocsArchitecture: React.FC<Props> = ({ language }) => {
  return (
    <div className="hud-card chamfer p-6" data-sector="ARCHIVE">
      <h2 className="font-display text-lg text-cyan-200 mt-2 mb-6 flex items-center gap-2">
        <FileText size={16} /> {language === 'es' ? 'ARQUITECTURA Y DOCUMENTACIÓN' : 'ARCHITECTURE & DOCUMENTATION'}
      </h2>

      <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
        <section>
          <h3 className="hud-label text-cyan-400 mb-2">{language === 'es' ? 'LOS 4 PILARES' : 'THE 4 PILLARS'}</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[13px]">
            <li><strong className="text-cyan-200">{language === 'es' ? 'Orquestador Central' : 'Central Orchestrator'}</strong> — src/alfred_core/supervisor.ts</li>
            <li><strong className="text-purple-200">{language === 'es' ? 'Router Semántico' : 'Semantic Router'}</strong> — src/alfred_core/router.ts</li>
            <li><strong className="text-yellow-200">{language === 'es' ? 'Memoria Compartida' : 'Shared Memory'}</strong> — src/alfred_core/memory.ts (SQLite persistente)</li>
            <li><strong className="text-cyan-200">{language === 'es' ? 'Gestor de Skills' : 'Skills Manager'}</strong> — src/skills/toolRegistry.ts</li>
          </ul>
        </section>

        <section>
          <h3 className="hud-label text-cyan-400 mb-2">{language === 'es' ? 'DOCUMENTACIÓN COMPLETA' : 'FULL DOCUMENTATION'}</h3>
          <p className="text-[13px] text-slate-400">
            {language === 'es'
              ? 'Consulte docs/ARCHITECTURE.md para el documento técnico exhaustivo, docs/AGENTS.md para la especificación de cada sub-agente, y README.md para la guía de instalación y uso.'
              : 'See docs/ARCHITECTURE.md for the comprehensive technical document, docs/AGENTS.md for each sub-agent specification, and README.md for the installation and usage guide.'}
          </p>
        </section>
      </div>
    </div>
  );
};
