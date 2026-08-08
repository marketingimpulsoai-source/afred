import React, { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Film, Sparkles, Video, Wand2, Gauge, ShieldCheck, Zap, Boxes, RotateCw } from 'lucide-react';
import { Language } from '../types';
import { MEDIA_AGENTS, getMediaRouterStatus, routeMediaRequest } from '../data/mediaRouter';

interface Props { language: Language }

type MediaRouterStatus = ReturnType<typeof getMediaRouterStatus>;

const demoPrompts = [
  'Crear video de producto ecommerce en Seedance para campaña TikTok',
  'Generar avatar virtual explicando un SaaS de suscripciones',
  'Video de hotel y destino turístico con cámara cinematográfica',
  'Recorrido visual de propiedad inmobiliaria para Reels',
];

export const MediaCommandCenter: React.FC<Props> = ({ language }) => {
  const [status, setStatus] = useState<MediaRouterStatus>(getMediaRouterStatus());
  const [query, setQuery] = useState(demoPrompts[0]);
  const matches = useMemo(() => routeMediaRequest(query, 4), [query]);

  useEffect(() => {
    fetch('/api/media-router')
      .then(r => r.json())
      .then(data => data.mediaRouter && setStatus(data.mediaRouter))
      .catch(() => setStatus(getMediaRouterStatus()));
  }, []);

  return (
    <div className="space-y-6 media-grid-bg">
      <section className="relative overflow-hidden hud-card ultra-panel p-6 md:p-8">
        <div className="absolute inset-0 opacity-60 pointer-events-none holo-orb" />
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div>
            <div className="hud-label text-[10px] text-fuchsia-300 mb-3 flex items-center gap-2"><Sparkles size={14} /> ALFRED CORE / MEDIA ROUTER</div>
            <h2 className="font-display text-4xl md:text-6xl leading-none text-white tracking-tight">
              Seedance <span className="text-cyan-300">2.5</span>
              <span className="block text-xl md:text-2xl mt-3 text-slate-300">{language === 'es' ? 'Núcleo audiovisual futurista para campañas, SaaS y clientes' : 'Futuristic media core for campaigns, SaaS, and clients'}</span>
            </h2>
            <p className="mt-5 max-w-3xl text-sm md:text-base text-slate-300 leading-relaxed">
              {language === 'es'
                ? 'Alfred enruta cada solicitud audiovisual entre Seedance 2.5, MiniMax, PixVerse, Luma, fal.ai, Runware y ComfyUI según calidad, coste, privacidad, velocidad y formato final.'
                : 'Alfred routes each media request across Seedance 2.5, MiniMax, PixVerse, Luma, fal.ai, Runware, and ComfyUI based on quality, cost, privacy, speed, and final format.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {status.seedanceTools.slice(0, 5).map(tool => <Chip key={tool}>{tool}</Chip>)}
            </div>
          </div>
          <div className="relative min-h-[280px] flex items-center justify-center">
            <div className="media-reactor">
              <div className="reactor-ring ring-a" />
              <div className="reactor-ring ring-b" />
              <div className="reactor-ring ring-c" />
              <div className="reactor-core"><Film size={44} /></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-3">
              <Metric label="AGENTS" value={String(status.agents.length)} />
              <Metric label="TOOLS" value={String(status.seedanceTools.length)} />
              <Metric label="PROVIDERS" value={String(status.providers.length)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="hud-card ultra-panel p-5">
          <h3 className="font-display text-2xl text-cyan-100 mb-4 flex items-center gap-2"><Gauge size={22} /> Cost & Quality Router</h3>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-h-28 bg-black/30 border border-cyan-400/25 focus:border-cyan-300/70 outline-none p-4 text-sm text-slate-100 rounded-2xl"
            placeholder={language === 'es' ? 'Describa un video, anuncio o campaña...' : 'Describe a video, ad, or campaign...'}
          />
          <div className="mt-4 grid gap-3">
            {matches.map(match => (
              <div key={match.agent.id} className="glass-row p-4 rounded-2xl border border-cyan-400/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="hud-label text-[9px] text-fuchsia-300">{match.provider.name}</div>
                    <div className="text-cyan-100 font-semibold">{match.agent.name}</div>
                  </div>
                  <span className="hud-data text-emerald-300">SCORE {match.score.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{language === 'es' ? match.agent.useES : match.agent.useEN}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {match.agent.outputFormats.slice(0, 4).map(format => <Chip key={format}>{format}</Chip>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {status.providers.map(provider => (
            <div key={provider.id} className="provider-card rounded-3xl p-5 border border-cyan-400/15 bg-slate-950/55">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="hud-label text-[9px] text-slate-500">MEDIA PROVIDER</div>
                  <h3 className="font-display text-xl text-white">{provider.name}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] hud-label border ${provider.secretPresent ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' : 'border-yellow-400/30 text-yellow-300 bg-yellow-500/10'}`}>
                  {provider.secretPresent ? 'CONFIGURED' : 'SECRET PENDING'}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400 min-h-10">{provider.role}</p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>Cost: <b className="text-cyan-300">{provider.costTier}</b></span>
                <span>Quality: <b className="text-fuchsia-300">{provider.qualityTier}</b></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {provider.strengths.slice(0, 3).map(item => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hud-card ultra-panel p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-2xl text-cyan-100 flex items-center gap-2"><Boxes size={22} /> {language === 'es' ? 'Agentes audiovisuales especializados' : 'Specialized media agents'}</h3>
          <div className="hud-label text-[10px] text-emerald-300 flex items-center gap-2"><ShieldCheck size={14} /> SECRET-SAFE</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {MEDIA_AGENTS.map(agent => (
            <div key={agent.id} className="agent-media-tile p-4 rounded-2xl border border-cyan-400/15 bg-black/25">
              <div className="flex items-center justify-between">
                <Clapperboard size={17} className="text-cyan-300" />
                <RotateCw size={13} className="text-fuchsia-300 animate-spin-slow" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-white">{agent.name}</h4>
              <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{language === 'es' ? agent.useES : agent.useEN}</p>
              <div className="mt-3 hud-label text-[9px] text-cyan-300">{agent.defaultProvider}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={<Video />} title="Seedance 2.5" body="Text-to-video, image-to-video, reference-to-video, edit, extend, status, cancel, download and cost estimate." />
        <InfoCard icon={<Zap />} title="MiniMax" body="Social variants, character motion and campaign cutdowns with subscription/API credentials stored only in .env." />
        <InfoCard icon={<Wand2 />} title="Modern HUD" body="Animated holographic panels, reactor core, provider cards, routing intelligence and futuristic motion-safe effects." />
      </section>
    </div>
  );
};

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-1 rounded-full border border-cyan-400/20 bg-cyan-500/8 text-[10px] text-cyan-200 hud-label">{children}</span>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-cyan-400/20 bg-black/45 p-3 text-center backdrop-blur">
    <div className="hud-data text-xl text-cyan-100">{value}</div>
    <div className="hud-label text-[9px] text-slate-500">{label}</div>
  </div>
);

const InfoCard = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="hud-card ultra-panel p-5 flex gap-4">
    <div className="text-fuchsia-300 mt-1">{icon}</div>
    <div>
      <h4 className="font-display text-lg text-cyan-100">{title}</h4>
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{body}</p>
    </div>
  </div>
);
