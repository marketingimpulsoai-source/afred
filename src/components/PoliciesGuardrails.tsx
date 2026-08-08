import React, { useEffect, useState } from 'react';
import { Language, SafetyPolicy } from '../types';
import { ShieldAlert } from 'lucide-react';

interface Props { language: Language; }

const actionColor: Record<string, string> = {
  ALLOW: '#22D3EE', REQUIRE_CONFIRMATION: '#EAB308', BLOCK: '#EF4444',
};

export const PoliciesGuardrails: React.FC<Props> = ({ language }) => {
  const [policies, setPolicies] = useState<SafetyPolicy[]>([]);

  useEffect(() => {
    fetch('/api/policies').then(r => r.json()).then(d => setPolicies(d.policies)).catch(console.error);
  }, []);

  return (
    <div className="hud-card chamfer p-6" data-sector="SEC-POLICY">
      <h2 className="font-display text-lg text-cyan-200 mt-2 mb-6 flex items-center gap-2">
        <ShieldAlert size={16} /> {language === 'es' ? 'POLÍTICAS DE SEGURIDAD' : 'SAFETY POLICIES'}
      </h2>
      <div className="space-y-3">
        {policies.map((pol) => (
          <div key={pol.id} className="hud-card chamfer-sm p-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="hud-label text-[9px] text-slate-500">{pol.code}</span>
                <span className="hud-data text-sm text-cyan-200">{language === 'es' ? pol.titleES : pol.titleEN}</span>
              </div>
              <p className="text-[11px] text-slate-500">{language === 'es' ? pol.descriptionES : pol.descriptionEN}</p>
            </div>
            <span className="hud-label text-[8px] px-2 py-1 shrink-0" style={{ color: actionColor[pol.action], border: `1px solid ${actionColor[pol.action]}40` }}>
              {pol.action.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
