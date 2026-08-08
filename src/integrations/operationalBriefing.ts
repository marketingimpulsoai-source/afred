import os from 'os';
import { SUB_AGENTS } from '../data/alfredData';
import { BUSINESS_AGENTS } from '../data/businessAgents';
import { getMediaRouterStatus } from '../data/mediaRouter';
import { getRevenueCatMcpStatus } from './revenueCatMcp';
import { getAlfredV3ApiStatus } from './alfredV3Apis';

const bytesToGb = (bytes: number) => Number((bytes / 1024 / 1024 / 1024).toFixed(2));
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

export function getOperationalBriefing() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();
  const load = os.loadavg?.() || [0, 0, 0];
  const apiPipelines = getAlfredV3ApiStatus();
  const configuredPipelines = apiPipelines.filter(p => p.configured).length;
  const mediaRouter = getMediaRouterStatus();
  const revenueCat = getRevenueCatMcpStatus();

  return {
    generatedAt: new Date().toISOString(),
    greetingDirective: 'Entendido, Jefe Maestro',
    mission: 'Mejora continua visual, técnica, funcional y de voz para ALFRED dentro de Hermes Agent.',
    localSystem: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptimeSeconds: Math.round(os.uptime()),
      cpuModel: cpus[0]?.model || 'unknown',
      cpuCores: cpus.length,
      loadAverage: load.map(n => Number(n.toFixed(2))),
      memory: {
        totalGb: bytesToGb(totalMem),
        usedGb: bytesToGb(usedMem),
        freeGb: bytesToGb(freeMem),
        usedPct: pct(usedMem, totalMem),
      },
    },
    alfred: {
      version: 'ALFRED CORP V3.5',
      designSystem: 'ALFRED Mayordomo Digital Nexus · Aether Core Interface',
      stitchFusion: {
        importedZipPacks: 10,
        referenceUrl: 'https://alfred-ai-butle.ai.studio/',
      },
      baseAgents: SUB_AGENTS.length,
      activeBaseAgents: SUB_AGENTS.filter(a => a.status === 'ACTIVE').length,
      businessAgents: BUSINESS_AGENTS.length,
      mediaAgents: mediaRouter.agents.length,
      primaryVideoProvider: mediaRouter.primaryProvider,
      handsFree: {
        enabledInBrowser: true,
        wakeCommands: ['Alfred', 'Hey Alfred', 'Oye Alfred'],
        permissionRequired: 'microphone',
      },
    },
    integrations: {
      configuredPipelines,
      totalPipelines: apiPipelines.length,
      apiPipelines: apiPipelines.map(p => ({
        id: p.id,
        label: p.label,
        configured: p.configured,
        statusLabel: p.statusLabel,
        secretStoredInCode: p.secretStoredInCode,
      })),
      revenueCat: {
        configured: revenueCat.configured,
        capabilityGroups: revenueCat.capabilities.length,
        secretStoredInCode: revenueCat.secretStoredInCode,
      },
      mediaRouter: {
        primaryProvider: mediaRouter.primaryProvider,
        providers: mediaRouter.providers.length,
        seedanceTools: mediaRouter.seedanceTools.length,
      },
    },
    nextImprovements: [
      'Integrar voz nativa de Alfred para latencia baja e interrupciones naturales.',
      'Profundizar memoria operativa y preferencias del Jefe Maestro.',
      'Añadir más automatizaciones seguras para rutinas diarias y briefing.',
      'Agregar Google Workspace/Notion MCP para briefing diario real.',
      'Añadir permisos granulares y auditoría para acciones externas.',
    ],
    safety: {
      secretsInCode: false,
      writeActionsRequireConfirmation: true,
      externalSendsRequireConfirmation: true,
      promptInjectionAware: true,
    },
  };
}
