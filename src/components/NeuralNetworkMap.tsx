import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, RefreshCw, Activity } from 'lucide-react';
import { Language, SubAgent } from '../types';

interface Props { language: Language; subAgents: SubAgent[]; activityVersion: number; }
interface WorkItem { createdAt: number; query: string; agentId: string; agentName: string; status: string; latencyMs: number; toolsInvokedCount: number; summary: string; }

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const NeuralNetworkMap: React.FC<Props> = ({ language, subAgents, activityVersion }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(isoDay(new Date()));
  const [work, setWork] = useState<WorkItem[]>([]);
  const es = language === 'es';

  const loadWork = () => fetch(`/api/agent-work?from=${from}&to=${to}`).then(r => r.json()).then(data => setWork(data.work || [])).catch(() => setWork([]));
  useEffect(() => { loadWork(); }, [from, to, activityVersion]);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = 800, height = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const centerNode = { id: 'alfred', name: 'ALFRED', x: width / 2, y: height / 2 };
    const nodes = [centerNode, ...subAgents.map((a, i) => {
      const angle = (i / subAgents.length) * 2 * Math.PI;
      const radius = 190;
      return { id: a.id, name: es ? a.nameES : a.nameEN, color: a.neonColor, status: a.status, x: width / 2 + radius * Math.cos(angle), y: height / 2 + radius * Math.sin(angle) };
    })];
    const links = subAgents.map(a => ({ source: centerNode, target: nodes.find(n => n.id === a.id)! }));
    const linkSelection = svg.append('g').selectAll('line').data(links).join('line')
      .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)
      .attr('stroke', (d: any) => d.target.color || '#22D3EE').attr('stroke-opacity', 0.25).attr('stroke-width', 1);
    const centerG = svg.append('g').attr('transform', `translate(${centerNode.x}, ${centerNode.y})`);
    const centerCircle = centerG.append('circle').attr('r', 28).attr('fill', 'rgba(234,179,8,0.1)').attr('stroke', '#EAB308').attr('stroke-width', 1.5);
    centerG.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', '#EAB308').attr('font-family', 'Playfair Display, serif').attr('font-size', 12).text('ALFRED');
    const agentNodes = svg.append('g').selectAll('g').data(nodes.filter(n => n.id !== 'alfred')).join('g').attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    agentNodes.append('circle').attr('r', 18).attr('fill', (d: any) => `${d.color}20`).attr('stroke', (d: any) => d.color).attr('stroke-width', (d: any) => d.status === 'ACTIVE' ? 1.5 : 0.75).attr('opacity', (d: any) => d.status === 'ACTIVE' ? 1 : 0.4);
    agentNodes.append('text').attr('text-anchor', 'middle').attr('dy', 32).attr('fill', (d: any) => d.color).attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 9).text((d: any) => d.name.toUpperCase());
    const pulse = d3.interval(() => {
      centerCircle.transition().duration(360).attr('r', 36).attr('stroke-width', 3).transition().duration(520).attr('r', 28).attr('stroke-width', 1.5);
      linkSelection.transition().duration(360).attr('stroke-opacity', 0.82).attr('stroke-width', 2).transition().duration(680).attr('stroke-opacity', 0.25).attr('stroke-width', 1);
    }, activityVersion > 0 ? 900 : 2400);
    return () => pulse.stop();
  }, [subAgents, language, activityVersion, es]);

  return (
    <div className="hud-card chamfer p-6" data-sector="NET-MAP">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="v3-eyebrow small"><Activity size={14} /> {es ? 'Actividad de subagentes' : 'Sub-agent activity'}</div>
          <h2 className="font-display text-lg text-cyan-200 mt-2 mb-1">{es ? 'NEURAL · CENTRO DE OPERACIONES' : 'NEURAL · OPERATIONS CENTER'}</h2>
          <p className="text-sm text-slate-400">{es ? 'La red se anima cuando Alfred delega, recibe y completa trabajo.' : 'The network animates when Alfred delegates, receives and completes work.'}</p>
        </div>
        <button className="v3-control-button" onClick={loadWork}><RefreshCw size={14} /> {es ? 'Actualizar' : 'Refresh'}</button>
      </div>
      <div className="w-full overflow-x-auto mt-4"><svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto min-w-[600px]" /></div>
      <section className="mt-5 border-t border-cyan-300/15 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-cyan-100 font-semibold">{es ? 'Trabajos realizados' : 'Completed work'}</h3><p className="text-xs text-slate-400">{work.length} {es ? 'registros en el periodo' : 'records in period'}</p></div>
          <a className="v3-control-button" href={`/api/agent-work.pdf?from=${from}&to=${to}`} download><Download size={14} /> PDF</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <label className="text-xs text-slate-400">{es ? 'Desde' : 'From'}<input className="block w-full mt-1 bg-black/30 border border-cyan-300/20 rounded px-2 py-1 text-cyan-100" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-xs text-slate-400">{es ? 'Hasta' : 'To'}<input className="block w-full mt-1 bg-black/30 border border-cyan-300/20 rounded px-2 py-1 text-cyan-100" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
          {work.length === 0 && <p className="text-sm text-slate-500">{es ? 'Aún no hay trabajos delegados en este periodo.' : 'No delegated work in this period yet.'}</p>}
          {work.map((item, index) => <article key={`${item.createdAt}-${index}`} className="border border-cyan-300/10 rounded p-3 bg-black/20"><div className="flex justify-between gap-2 text-xs"><strong className="text-cyan-200">{item.agentName}</strong><span className="text-emerald-300">{item.status}</span></div><p className="text-sm text-slate-200 mt-1">{item.query}</p><p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString()} · {item.latencyMs} ms · {item.toolsInvokedCount} tools</p><p className="text-xs text-slate-400 mt-1">{item.summary}</p></article>)}
        </div>
      </section>
    </div>
  );
};
