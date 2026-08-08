import React, { useEffect, useState } from 'react';
import { Language, SystemMetrics } from '../types';

interface Props { language: Language; }

export const ObservabilityDashboard: React.FC<Props> = ({ language }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        setMetrics(data.metrics);
        setLogs(data.logs);
      } catch (err) {
        console.error('Failed to fetch telemetry', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hud-card chamfer p-6" data-sector="OBS-01">
      <h2 className="font-display text-lg text-cyan-200 mt-2 mb-6">
        {language === 'es' ? 'TELEMETRÍA EN VIVO' : 'LIVE TELEMETRY'}
      </h2>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label={language === 'es' ? 'CARGA CPU' : 'CPU LOAD'} value={`${metrics.cpuTotalUsage}%`} color="#22D3EE" />
          <MetricCard label={language === 'es' ? 'MEMORIA' : 'MEMORY'} value={`${metrics.memoryTotalUsageMb}MB`} color="#A855F7" />
          <MetricCard label={language === 'es' ? 'AGENTES ACTIVOS' : 'ACTIVE AGENTS'} value={`${metrics.activeAgentsCount}/12`} color="#22D3EE" />
          <MetricCard label={language === 'es' ? 'CONSULTAS TOTALES' : 'TOTAL QUERIES'} value={String(metrics.totalQueriesProcessed)} color="#EAB308" />
          <MetricCard label={language === 'es' ? 'LATENCIA PROM.' : 'AVG LATENCY'} value={`${metrics.averageResponseMs}ms`} color="#22D3EE" />
          <MetricCard label={language === 'es' ? 'MOTOR LLM' : 'LLM ENGINE'} value={metrics.llmProvider} color="#A855F7" small />
          <MetricCard label={language === 'es' ? 'MODELO' : 'MODEL'} value={metrics.llmModel} color="#EAB308" small />
          <MetricCard label="UPTIME" value={`${Math.floor(metrics.uptimeSeconds / 60)}min`} color="#22D3EE" />
        </div>
      )}

      <h3 className="hud-label text-[10px] text-slate-500 mb-2">SYS_LOGS</h3>
      <div className="bg-black/40 border border-cyan-900/30 p-3 max-h-64 overflow-y-auto space-y-1">
        {logs.length === 0 && (
          <p className="text-[11px] text-slate-600">
            {language === 'es' ? 'Sin actividad registrada aún.' : 'No activity logged yet.'}
          </p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="text-[10px] text-slate-400 font-mono flex gap-2">
            <span className="text-cyan-500/70">{log.timestamp}</span>
            <span className="text-purple-400/70">{log.assigned_agent_name}</span>
            <span className="text-slate-500 truncate">{log.query}</span>
            <span className="text-emerald-500/70 ml-auto shrink-0">{log.latency_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; color: string; small?: boolean }> = ({ label, value, color, small }) => (
  <div className="hud-card chamfer-sm p-3" style={{ borderColor: `${color}30` }}>
    <div className="hud-label text-[8px] text-slate-500 mb-1">{label}</div>
    <div className={`hud-data ${small ? 'text-xs' : 'text-lg'}`} style={{ color }}>{value}</div>
  </div>
);
