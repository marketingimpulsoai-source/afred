import React, { useEffect, useMemo, useState } from 'react';
import { Clapperboard, GraduationCap, LineChart, Network, Store } from 'lucide-react';
import { BusinessAgent, Language } from '../types';
import { BUSINESS_AGENTS, CLIENT_SEGMENTS, PAGE_VIDEO_FACTORY } from '../data/businessAgents';

interface Props {
  language: Language;
}

const divisionColors: Record<BusinessAgent['division'], string> = {
  'AI Systems & Agents': '#22D3EE',
  'Digital Products & EdTech': '#A855F7',
  'Vertical SaaS & Marketplaces': '#10B981',
  'Client Delivery Studio': '#F59E0B',
  'Risk & Finance': '#EF4444',
};

export const BusinessAgentsCommand: React.FC<Props> = ({ language }) => {
  const [query, setQuery] = useState('páginas y videos para clientes SaaS, clínicas e inmobiliarias');
  const [selectedDivision, setSelectedDivision] = useState<'ALL' | BusinessAgent['division']>('ALL');
  const [matches, setMatches] = useState<string[]>([]);
  const isES = language === 'es';

  const divisions = useMemo(() => Array.from(new Set(BUSINESS_AGENTS.map((a) => a.division))), []);
  const visibleAgents = BUSINESS_AGENTS.filter((agent) => selectedDivision === 'ALL' || agent.division === selectedDivision);
  const topCashflow = [...BUSINESS_AGENTS].sort((a, b) => b.cashflowScore - a.cashflowScore || a.priority - b.priority).slice(0, 5);

  useEffect(() => {
    const q = query.toLowerCase();
    const ids = BUSINESS_AGENTS
      .map((agent) => ({
        id: agent.id,
        score: agent.keywords.filter((kw) => q.includes(kw.toLowerCase())).length + agent.clientTypes.filter((c) => q.includes(c.toLowerCase())).length,
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((m) => m.id);
    setMatches(ids);
  }, [query]);

  return (
    <div className="space-y-6">
      <section className="hud-card chamfer p-6" data-sector="BUSINESS-COMMAND">
        <div className="flex flex-col xl:flex-row gap-5 justify-between mt-3">
          <div className="max-w-4xl">
            <p className="hud-label text-[10px] text-amber-300 mb-2">HERMES AGENT BUSINESS COMMAND LAYER</p>
            <h2 className="font-display text-2xl text-cyan-100">
              {isES ? 'Subagentes completos para cartera, páginas y videos' : 'Complete subagents for portfolio, pages and videos'}
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              {isES
                ? 'Esta capa adapta Alfred al portafolio de negocios: Salesmaster, LaunchLab, CreativeForge, TravelBridge, PropTech, AutoHub, CraneConnect, trading, educación infantil, e-commerce y entrega universal de páginas/videos para clientes.'
                : 'This layer adapts Alfred to the business portfolio: Salesmaster, LaunchLab, CreativeForge, TravelBridge, PropTech, AutoHub, CraneConnect, trading, kids education, e-commerce and universal page/video delivery for clients.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[320px]">
            <Kpi label={isES ? 'Especialistas' : 'Specialists'} value={String(BUSINESS_AGENTS.length)} />
            <Kpi label={isES ? 'Segmentos' : 'Segments'} value={String(CLIENT_SEGMENTS.length)} />
            <Kpi label={isES ? 'Páginas' : 'Pages'} value={String(PAGE_VIDEO_FACTORY.pageTypes.length)} />
            <Kpi label={isES ? 'Videos' : 'Videos'} value={String(PAGE_VIDEO_FACTORY.videoTypes.length)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="hud-card chamfer-sm p-5 xl:col-span-2" data-sector="CLIENT-ROUTER">
          <h3 className="font-display text-lg text-cyan-200 mb-3">{isES ? 'Router de cliente y entregables' : 'Client and deliverables router'}</h3>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-h-24 bg-slate-950/60 border border-cyan-900/40 p-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
            placeholder={isES ? 'Describe el cliente, industria, página o video requerido...' : 'Describe the client, industry, page or video needed...'}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {matches.length === 0 ? (
              <span className="text-xs text-slate-500">{isES ? 'Sin match aún. Alfred-Core procesará o pedirá más contexto.' : 'No match yet. Alfred-Core will process or ask for context.'}</span>
            ) : matches.map((id) => {
              const agent = BUSINESS_AGENTS.find((a) => a.id === id)!;
              return <span key={id} className="hud-label text-[10px] border px-2 py-1" style={{ borderColor: `${divisionColors[agent.division]}66`, color: divisionColors[agent.division] }}>{agent.name}</span>;
            })}
          </div>
        </div>

        <div className="hud-card chamfer-sm p-5" data-sector="CASHFLOW">
          <h3 className="font-display text-lg text-emerald-200 mb-3">{isES ? 'Prioridad cash-flow' : 'Cash-flow priority'}</h3>
          <div className="space-y-2">
            {topCashflow.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between border border-slate-800/80 px-3 py-2 bg-slate-950/40">
                <span className="text-xs text-slate-300">{agent.name}</span>
                <span className="hud-data text-emerald-300">{agent.cashflowScore}/10</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hud-card chamfer-sm p-5" data-sector="FACTORY">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FactoryList title={isES ? 'Tipos de páginas' : 'Page types'} items={PAGE_VIDEO_FACTORY.pageTypes} color="cyan" />
          <FactoryList title={isES ? 'Tipos de videos' : 'Video types'} items={PAGE_VIDEO_FACTORY.videoTypes} color="purple" />
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-2">
          {(isES ? PAGE_VIDEO_FACTORY.universalWorkflowES : PAGE_VIDEO_FACTORY.universalWorkflowEN).map((step, index) => (
            <div key={step} className="border border-cyan-900/30 bg-cyan-950/10 p-3">
              <span className="hud-data text-cyan-400 text-xs">{String(index + 1).padStart(2, '0')}</span>
              <p className="text-xs text-slate-300 mt-1">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedDivision('ALL')} className={`hud-label text-[10px] px-3 py-1.5 border ${selectedDivision === 'ALL' ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-500'}`}>ALL</button>
        {divisions.map((division) => (
          <button key={division} onClick={() => setSelectedDivision(division)} className={`hud-label text-[10px] px-3 py-1.5 border ${selectedDivision === division ? 'border-cyan-400 text-cyan-300' : 'border-slate-800 text-slate-500'}`}>{division}</button>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleAgents.map((agent) => <BusinessCard key={agent.id} agent={agent} language={language} />)}
      </section>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="hud-card chamfer-sm p-3 text-center">
    <div className="hud-data text-xl text-cyan-200">{value}</div>
    <div className="hud-label text-[9px] text-slate-500">{label}</div>
  </div>
);

const FactoryList: React.FC<{ title: string; items: string[]; color: 'cyan' | 'purple' }> = ({ title, items, color }) => (
  <div>
    <h3 className={`font-display text-base ${color === 'cyan' ? 'text-cyan-200' : 'text-purple-200'} mb-3`}>{title}</h3>
    <div className="flex flex-wrap gap-2">
      {items.map((item) => <span key={item} className={`text-[10px] border px-2 py-1 ${color === 'cyan' ? 'border-cyan-800/60 text-cyan-300' : 'border-purple-800/60 text-purple-300'}`}>{item}</span>)}
    </div>
  </div>
);

const BusinessCard: React.FC<{ agent: BusinessAgent; language: Language }> = ({ agent, language }) => {
  const isES = language === 'es';
  const color = divisionColors[agent.division];
  const Icon = agent.division === 'Risk & Finance' ? LineChart : agent.division === 'Client Delivery Studio' ? Clapperboard : agent.division === 'Vertical SaaS & Marketplaces' ? Store : agent.division === 'Digital Products & EdTech' ? GraduationCap : Network;
  return (
    <article className="hud-card chamfer-sm p-4 relative" data-sector={agent.code} style={{ borderColor: `${color}44` }}>
      <div className="flex items-start justify-between mt-3 gap-3">
        <div className="flex gap-3">
          <div className="w-9 h-9 chamfer-sm flex items-center justify-center" style={{ border: `1px solid ${color}66`, background: `${color}18` }}><Icon size={17} style={{ color }} /></div>
          <div>
            <h3 className="font-display text-sm" style={{ color }}>{agent.name}</h3>
            <p className="text-[10px] text-slate-500">{agent.code} · {agent.businessIds.join(' / ')}</p>
          </div>
        </div>
        <span className="hud-data text-xs text-emerald-300">{agent.cashflowScore}/10</span>
      </div>
      <p className="text-xs text-slate-300 mt-3 font-semibold">{isES ? agent.roleES : agent.roleEN}</p>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{isES ? agent.descriptionES : agent.descriptionEN}</p>
      <div className="mt-3">
        <p className="hud-label text-[9px] text-slate-500 mb-1">{isES ? 'Entregables' : 'Deliverables'}</p>
        <div className="flex flex-wrap gap-1.5">
          {(isES ? agent.deliverablesES : agent.deliverablesEN).slice(0, 5).map((item) => <span key={item} className="text-[9px] border border-slate-800 px-1.5 py-0.5 text-slate-400">{item}</span>)}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
        <span>{agent.markets.slice(0, 3).join(' · ')}</span>
        <span>{isES ? 'Supervisor' : 'Supervisor'}: {agent.supervisingAgentId.replace(/_.*/, '')}</span>
      </div>
    </article>
  );
};
