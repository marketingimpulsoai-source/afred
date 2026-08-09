import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, RefreshCw, Activity, Network, Clock3, MessageSquareText, RadioTower } from 'lucide-react';
import { Language, Message, SubAgent } from '../types';

interface Props {
  language: Language;
  subAgents: SubAgent[];
  activityVersion: number;
  compact?: boolean;
  messages?: Message[];
}
interface WorkItem { createdAt: number; query: string; agentId: string; agentName: string; status: string; latencyMs: number; toolsInvokedCount: number; summary: string; }
interface AgentConversationItem {
  id: string;
  sessionId: string;
  sender: string;
  agentId?: string;
  agentName?: string;
  text: string;
  timestamp: string;
  createdAt: number;
  confidenceScore?: number;
  routingDecision?: { chosenAgentId?: string | null; chosenAgentName?: string | null; latencyMs?: number; confidence?: number; query?: string };
}

type GraphNode = {
  id: string;
  name: string;
  code?: string;
  role?: string;
  color: string;
  status?: string;
  x: number;
  y: number;
  active?: boolean;
};

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const initials = (name: string) => name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

function agentIdFromConversation(item: AgentConversationItem, subAgents: SubAgent[]): string | undefined {
  if (item.agentId) return item.agentId;
  const routedId = item.routingDecision?.chosenAgentId || undefined;
  if (routedId) return routedId;
  const routedName = item.routingDecision?.chosenAgentName || item.agentName;
  if (!routedName) return undefined;
  const lower = routedName.toLowerCase();
  return subAgents.find(agent => agent.nameES.toLowerCase() === lower || agent.nameEN.toLowerCase() === lower)?.id;
}

export const NeuralNetworkMap: React.FC<Props> = ({ language, subAgents, activityVersion, compact = false, messages = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [work, setWork] = useState<WorkItem[]>([]);
  const [conversations, setConversations] = useState<AgentConversationItem[]>([]);
  const es = language === 'es';

  const latestLiveAgentId = useMemo(() => {
    const routed = [...messages].reverse().find(msg => msg.agentId || msg.routingDecision?.chosenAgentId);
    return routed?.agentId || routed?.routingDecision?.chosenAgentId || undefined;
  }, [messages]);

  const latestArchiveAgentId = useMemo(() => {
    const latest = conversations.find(item => agentIdFromConversation(item, subAgents));
    return latest ? agentIdFromConversation(latest, subAgents) : undefined;
  }, [conversations, subAgents]);

  const activeAgentId = latestLiveAgentId || latestArchiveAgentId || work[work.length - 1]?.agentId;

  const loadWork = () => {
    const workUrl = compact ? '/api/agent-work' : `/api/agent-work?from=${from}&to=${to}`;
    fetch(workUrl).then(r => r.json()).then(data => setWork(data.work || [])).catch(() => setWork([]));
    fetch(`/api/agent-conversations?limit=${compact ? 24 : 240}`).then(r => r.json()).then(data => setConversations(data.conversations || [])).catch(() => setConversations([]));
  };

  useEffect(() => { loadWork(); }, [from, to, activityVersion, compact]);

  const groupedConversations = useMemo(() => {
    return subAgents.map(agent => ({
      agent,
      items: conversations.filter(item => agentIdFromConversation(item, subAgents) === agent.id),
      latestWork: [...work].reverse().find(item => item.agentId === agent.id || item.agentName === agent.nameES || item.agentName === agent.nameEN),
    }));
  }, [conversations, subAgents, work]);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = compact ? 920 : 1100;
    const height = compact ? 420 : 620;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    defs.append('filter').attr('id', `neural-glow-${compact ? 'mini' : 'full'}`).html('<feGaussianBlur stdDeviation="3.4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>');
    const marker = defs.append('marker').attr('id', `arrow-neural-${compact ? 'mini' : 'full'}`).attr('markerWidth', 10).attr('markerHeight', 10).attr('refX', 8).attr('refY', 3).attr('orient', 'auto');
    marker.append('path').attr('d', 'M0,0 L0,6 L9,3 z').attr('fill', '#8aebff').attr('opacity', 0.72);

    const centerNode: GraphNode = { id: 'alfred', name: 'ALFRED', color: '#FFD882', x: width / 2, y: height / 2, active: true };
    const radiusX = compact ? 330 : 430;
    const radiusY = compact ? 150 : 230;
    const nodes: GraphNode[] = [centerNode, ...subAgents.map((a, i) => {
      const angle = (i / subAgents.length) * 2 * Math.PI - Math.PI / 2;
      return {
        id: a.id,
        name: es ? a.nameES : a.nameEN,
        code: a.code,
        role: es ? a.roleES : a.roleEN,
        color: a.neonColor,
        status: a.status,
        x: width / 2 + radiusX * Math.cos(angle),
        y: height / 2 + radiusY * Math.sin(angle),
        active: a.id === activeAgentId,
      };
    })];
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const hubLinks = subAgents.map(agent => ({ source: centerNode, target: nodeById.get(agent.id)!, kind: 'hub' }));
    const delegateLinks = subAgents.flatMap(agent => agent.delegatesTo.map(targetId => ({ source: nodeById.get(agent.id), target: nodeById.get(targetId), kind: 'delegate' })).filter(link => link.source && link.target));
    const links = [...hubLinks, ...delegateLinks];

    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', width).attr('height', height).attr('rx', 18).attr('fill', 'rgba(2,6,17,0.35)');
    svg.append('g').attr('opacity', 0.16).selectAll('circle').data(d3.range(38)).join('circle')
      .attr('cx', d => (d * 97) % width).attr('cy', d => (d * 53) % height).attr('r', d => 1 + (d % 3)).attr('fill', '#8aebff');

    const linkSelection = svg.append('g').selectAll('line').data(links).join('line')
      .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      .attr('stroke', (d: any) => d.kind === 'hub' ? d.target.color : '#DDB7FF')
      .attr('stroke-opacity', (d: any) => d.source.id === activeAgentId || d.target.id === activeAgentId ? 0.95 : d.kind === 'hub' ? 0.38 : 0.18)
      .attr('stroke-width', (d: any) => d.source.id === activeAgentId || d.target.id === activeAgentId ? 2.4 : d.kind === 'hub' ? 1.15 : 0.8)
      .attr('stroke-dasharray', (d: any) => d.kind === 'delegate' ? '4 6' : 'none')
      .attr('marker-end', (d: any) => d.kind === 'delegate' ? `url(#arrow-neural-${compact ? 'mini' : 'full'})` : null)
      .attr('filter', `url(#neural-glow-${compact ? 'mini' : 'full'})`);

    const packets = svg.append('g').selectAll('circle').data(links.filter((d: any) => d.kind === 'hub')).join('circle')
      .attr('r', (d: any) => d.target.id === activeAgentId ? 4.6 : 2.8)
      .attr('fill', (d: any) => d.target.color)
      .attr('opacity', 0.88)
      .attr('filter', `url(#neural-glow-${compact ? 'mini' : 'full'})`);

    const nodeGroups = svg.append('g').selectAll('g').data(nodes).join('g').attr('transform', (d: GraphNode) => `translate(${d.x}, ${d.y})`);
    nodeGroups.append('circle')
      .attr('r', (d: GraphNode) => d.id === 'alfred' ? (compact ? 42 : 54) : d.active ? 29 : 24)
      .attr('fill', (d: GraphNode) => d.id === 'alfred' ? 'rgba(255,216,130,0.16)' : `${d.color}20`)
      .attr('stroke', (d: GraphNode) => d.color)
      .attr('stroke-width', (d: GraphNode) => d.id === 'alfred' || d.active ? 2.7 : d.status === 'ACTIVE' ? 1.5 : 0.75)
      .attr('opacity', (d: GraphNode) => d.status === 'ACTIVE' || d.id === 'alfred' ? 1 : 0.42)
      .attr('filter', `url(#neural-glow-${compact ? 'mini' : 'full'})`);

    nodeGroups.append('circle')
      .attr('r', (d: GraphNode) => d.id === 'alfred' ? (compact ? 28 : 35) : 14)
      .attr('fill', (d: GraphNode) => d.id === 'alfred' ? 'rgba(2,6,17,0.90)' : 'rgba(2,6,17,0.80)')
      .attr('stroke', (d: GraphNode) => d.color)
      .attr('stroke-width', 0.7);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNode) => d.id === 'alfred' ? 5 : 4)
      .attr('fill', (d: GraphNode) => d.color)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', (d: GraphNode) => d.id === 'alfred' ? 13 : 10)
      .attr('font-weight', 800)
      .text((d: GraphNode) => d.id === 'alfred' ? 'ALFRED' : initials(d.name));

    nodeGroups.filter((d: GraphNode) => d.id !== 'alfred').append('text')
      .attr('text-anchor', 'middle').attr('dy', 40)
      .attr('fill', (d: GraphNode) => d.color)
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 9).attr('font-weight', 700)
      .text((d: GraphNode) => d.name.toUpperCase());
    nodeGroups.filter((d: GraphNode) => d.id !== 'alfred' && !compact).append('text')
      .attr('text-anchor', 'middle').attr('dy', 54)
      .attr('fill', 'rgba(220,225,251,0.62)')
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 7)
      .text((d: GraphNode) => d.code || 'AG');

    const centerPulse = nodeGroups.filter((d: GraphNode) => d.id === 'alfred').select('circle');
    const pulse = d3.interval((elapsed) => {
      centerPulse.transition().duration(300).attr('r', compact ? 49 : 62).transition().duration(520).attr('r', compact ? 42 : 54);
      linkSelection.transition().duration(280).attr('stroke-opacity', (d: any) => d.target.id === activeAgentId ? 1 : d.kind === 'hub' ? 0.58 : 0.26).transition().duration(760).attr('stroke-opacity', (d: any) => d.source.id === activeAgentId || d.target.id === activeAgentId ? 0.95 : d.kind === 'hub' ? 0.38 : 0.18);
      packets
        .attr('cx', (d: any) => {
          const t = ((elapsed / (d.target.id === activeAgentId ? 820 : 1500)) + (d.target.x % 11) / 11) % 1;
          return d.source.x + (d.target.x - d.source.x) * t;
        })
        .attr('cy', (d: any) => {
          const t = ((elapsed / (d.target.id === activeAgentId ? 820 : 1500)) + (d.target.x % 11) / 11) % 1;
          return d.source.y + (d.target.y - d.source.y) * t;
        });
    }, activityVersion > 0 ? 120 : 240);
    return () => pulse.stop();
  }, [subAgents, language, activityVersion, es, compact, activeAgentId]);

  const recentConversations = compact ? conversations.slice(0, 4) : conversations;

  return (
    <div className={compact ? 'v3-neural-core-card' : 'hud-card chamfer p-6'} data-sector="NET-MAP">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="v3-eyebrow small"><Activity size={14} /> {es ? 'Actividad de subagentes' : 'Sub-agent activity'}</div>
          <h2 className="font-display text-lg text-cyan-200 mt-2 mb-1">{es ? 'NEURAL · CENTRO DE OPERACIONES' : 'NEURAL · OPERATIONS CENTER'}</h2>
          <p className="text-sm text-slate-400">{es ? 'La red se anima cuando Alfred delega, recibe y completa trabajo. Todos los subagentes permanecen visibles con líneas de comunicación y latencia.' : 'The network animates when Alfred delegates, receives and completes work. Every sub-agent remains visible with communication links and latency.'}</p>
        </div>
        <div className="v3-neural-actions">
          {!compact && <a className="v3-control-button" href={`/api/agent-work.pdf?from=${from}&to=${to}`} download><Download size={14} /> PDF</a>}
          <button className="v3-control-button" onClick={loadWork}><RefreshCw size={14} /> {es ? 'Actualizar' : 'Refresh'}</button>
        </div>
      </div>

      <div className="v3-neural-layout">
        <div className="v3-neural-graph-shell">
          <svg ref={svgRef} className="v3-neural-svg" aria-label={es ? 'Mapa visual de comunicación entre Alfred y todos los subagentes' : 'Visual communication map between Alfred and all sub-agents'} />
        </div>
        <aside className="v3-neural-agent-roster" aria-label={es ? 'Imagen de todos los subagentes' : 'All sub-agent portraits'}>
          <div className="v3-neural-roster-head"><Network size={14} /> {subAgents.length}/12 {es ? 'subagentes visibles' : 'visible sub-agents'}</div>
          {groupedConversations.map(({ agent, items, latestWork }) => (
            <article key={agent.id} className={`v3-neural-agent-card ${agent.id === activeAgentId ? 'active' : ''}`} style={{ ['--agent-color' as any]: agent.neonColor }}>
              <div className="v3-neural-avatar">{initials(es ? agent.nameES : agent.nameEN)}</div>
              <div>
                <b>{es ? agent.nameES : agent.nameEN}</b>
                <span>{es ? agent.roleES : agent.roleEN}</span>
                <small>{items.length} {es ? 'conversaciones' : 'conversations'} · {latestWork ? `${latestWork.latencyMs} ms` : es ? 'sin latencia aún' : 'no latency yet'}</small>
              </div>
            </article>
          ))}
        </aside>
      </div>

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
          <label className="text-xs text-slate-400">{es ? 'Desde' : 'From'}<input className="block w-full mt-1 bg-black/30 border border-cyan-300/20 rounded px-2 py-1 text-cyan-100" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-xs text-slate-400">{es ? 'Hasta' : 'To'}<input className="block w-full mt-1 bg-black/30 border border-cyan-300/20 rounded px-2 py-1 text-cyan-100" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
      )}

      <section className="v3-neural-archive">
        <div className="v3-neural-archive-head">
          <div><h3>{es ? 'Archivo Neural de conversaciones de subagentes' : 'Neural archive of sub-agent conversations'}</h3><p>{recentConversations.length} {es ? 'registros visibles' : 'visible records'} · {work.length} {es ? 'trabajos en periodo' : 'work records'}</p></div>
          <div className="v3-neural-live-chip"><RadioTower size={13} /> {activeAgentId ? (subAgents.find(a => a.id === activeAgentId)?.nameES || activeAgentId) : 'ALFRED'}</div>
        </div>
        <div className={compact ? 'v3-neural-archive-list compact' : 'v3-neural-archive-list'}>
          {recentConversations.length === 0 && <p className="text-sm text-slate-500">{es ? 'Aún no hay conversaciones delegadas almacenadas en este periodo.' : 'No stored delegated conversations in this period yet.'}</p>}
          {recentConversations.map((item) => {
            const agentId = agentIdFromConversation(item, subAgents);
            const agent = subAgents.find(a => a.id === agentId);
            const latency = item.routingDecision?.latencyMs ?? work.find(w => w.agentId === agentId && Math.abs(w.createdAt - item.createdAt) < 30000)?.latencyMs;
            return (
              <article key={item.id} className="v3-neural-conversation-row" style={{ ['--agent-color' as any]: agent?.neonColor || '#22D3EE' }}>
                <div className="v3-neural-avatar small">{initials(agent ? (es ? agent.nameES : agent.nameEN) : (item.agentName || 'AG'))}</div>
                <div>
                  <div className="v3-neural-conv-meta">
                    <strong>{agent ? (es ? agent.nameES : agent.nameEN) : (item.agentName || 'Subagente')}</strong>
                    <span><Clock3 size={12} /> {new Date(item.createdAt).toLocaleString()} {latency !== undefined ? `· ${latency} ms` : ''}</span>
                  </div>
                  {item.routingDecision?.query && <p className="v3-neural-query"><MessageSquareText size={12} /> {item.routingDecision.query}</p>}
                  <p>{item.text.slice(0, compact ? 220 : 520)}{item.text.length > (compact ? 220 : 520) ? '…' : ''}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
