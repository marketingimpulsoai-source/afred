#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const BASE = process.env.ALFRED_BASE_URL || 'http://localhost:3000';

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return res.json();
}

async function main() {
  const health = await getJson('/api/health');
  if (health.status !== 'online') throw new Error('Health check failed');

  const agents = await getJson('/api/agents');
  if (!agents.agents || agents.agents.length !== 12) throw new Error(`Expected 12 agents, got ${agents.agents?.length}`);
  const active = agents.agents.filter(a => a.status === 'ACTIVE').length;
  if (active !== 12) throw new Error(`Expected 12 active agents, got ${active}`);

  const business = await getJson('/api/business-agents');
  if (!business.businessAgents || business.businessAgents.length < 16) throw new Error(`Expected at least 16 business agents, got ${business.businessAgents?.length}`);
  if (!business.businessAgents.some(a => a.id === 'alfred_client_studio')) throw new Error('Missing Alfred-ClientStudio');
  if (!business.businessAgents.some(a => a.id === 'alfred_salesmaster')) throw new Error('Missing Alfred-Salesmaster');
  if (!business.pageVideoFactory?.pageTypes?.includes('landing high-converting')) throw new Error('Missing page/video factory');

  const memoryPrefs = await getJson('/api/memory-preferences');
  if (memoryPrefs.preferences?.taskLifecycle?.onStart !== 'Entendido, Jefe Maestro') throw new Error('Task lifecycle preference missing');
  if (!memoryPrefs.preferences?.startupMusic?.urls?.some(url => url.includes('rvLNvq5_-Fw'))) throw new Error('Startup music URL missing');
  if (!memoryPrefs.preferences?.dailyVoiceRoutines?.morning?.triggers?.some(trigger => trigger.includes('Alfred'))) throw new Error('Daily voice routines missing');
  if (!memoryPrefs.preferences?.dailyVoiceRoutines?.morning?.youtubeUrl?.includes('index=10')) throw new Error('Morning routine YouTube URL missing');
  if (!memoryPrefs.preferences?.dailyVoiceRoutines?.afternoon?.youtubeUrl?.includes('index=5')) throw new Error('Afternoon routine YouTube URL missing');
  if (memoryPrefs.preferences?.revenueCatMcp?.url !== 'https://mcp.revenuecat.ai/mcp') throw new Error('RevenueCat MCP memory missing');

  const revenueCat = await getJson('/api/integrations/revenuecat');
  if (revenueCat.revenueCat?.mcpUrl !== 'https://mcp.revenuecat.ai/mcp') throw new Error('RevenueCat MCP URL missing');
  if (revenueCat.revenueCat?.secretStoredInCode !== false) throw new Error('RevenueCat secret storage guard failed');
  if (!revenueCat.revenueCat?.capabilities?.some(c => c.category === 'Entitlements')) throw new Error('RevenueCat entitlements capability missing');

  const mediaRouter = await getJson('/api/media-router');
  if (mediaRouter.mediaRouter?.primaryProvider !== 'Seedance 2.5') throw new Error('Seedance 2.5 primary provider missing');
  if (mediaRouter.mediaRouter?.agents?.length !== 10) throw new Error(`Expected 10 media agents, got ${mediaRouter.mediaRouter?.agents?.length}`);
  if (!mediaRouter.mediaRouter?.seedanceTools?.includes('seedance_text_to_video')) throw new Error('Seedance tools missing');

  const v3 = await getJson('/api/alfred-v3/status');
  if (v3.version !== 'ALFRED CORP V3.5') throw new Error('ALFRED V3.5 status missing');
  if (v3.stitchFusion?.importedZipPacks !== 10) throw new Error('Stitch fusion pack count missing');
  if (!v3.stitchFusion?.effects?.includes('shader-backplane')) throw new Error('Stitch shader effect missing');
  if (!Array.isArray(v3.apiPipelines) || v3.apiPipelines.length < 4) throw new Error('ALFRED V3.5 API pipelines missing');
  if (v3.worldOrb3D?.importedAnimationPacks !== 3) throw new Error('ALFRED 3D world orb animation packs missing');
  if (!String(v3.handsFree?.mode || '').includes('Windows native voice bridge')) throw new Error('Windows voice bridge not declared in V3 status');
  if (!v3.handsFree?.wakeCommands?.includes('alfred')) throw new Error('ALFRED V3.5 wake command missing');

  const briefing = await getJson('/api/briefing');
  if (briefing.briefing?.alfred?.version !== 'ALFRED CORP V3.5') throw new Error('Operational briefing version missing');
  if (briefing.briefing?.alfred?.stitchFusion?.importedZipPacks !== 10) throw new Error('Operational briefing Stitch fusion missing');
  if (briefing.briefing?.alfred?.activeBaseAgents !== 12) throw new Error('Operational briefing active agents mismatch');
  if (briefing.briefing?.safety?.secretsInCode !== false) throw new Error('Operational briefing secret guard failed');

  const businessRoute = await postJson('/api/business-agents/route', {
    message: 'Crear páginas y videos para clientes SaaS, clínicas e inmobiliarias con CreativeForge',
    limit: 4,
  });
  const matchedIds = businessRoute.matches.map(m => m.specialist.id);
  if (!matchedIds.includes('alfred_client_studio') && !matchedIds.includes('alfred_creativeforge')) {
    throw new Error(`Expected ClientStudio/CreativeForge business routing, got ${matchedIds.join(',')}`);
  }

  const voiceStatus = await getJson('/api/voice/status');
  if (!voiceStatus.voice?.elevenLabsVoiceId) throw new Error('ALFRED ElevenLabs voice ID missing');
  if (!['Rupert / Alfred', 'Alfred'].includes(voiceStatus.voice?.elevenLabsVoiceName)) throw new Error('ALFRED ElevenLabs voice name missing');
  if (typeof voiceStatus.voice?.elevenLabsConfigured !== 'boolean') throw new Error('ALFRED ElevenLabs status missing');

  const tts = await postJson('/api/tts', {
    text: 'Buenas, soy Alfred, su mayordomo digital.',
    language: 'es',
  });
  if (typeof tts.useWebSpeechFallback !== 'boolean') throw new Error('Invalid TTS response');
  if (!tts.audioBase64 && tts.provider !== 'web_speech') throw new Error(`Unexpected TTS provider fallback: ${tts.provider}`);

  const preview = await fetch(`${BASE}/audio/alfred-rupert-preview.mp3`, { method: 'HEAD' });
  if (!preview.ok) throw new Error(`Rupert preview audio not served: ${preview.status}`);
  const contentType = preview.headers.get('content-type') || '';
  if (!contentType.includes('audio/mpeg')) throw new Error(`Unexpected preview content-type: ${contentType}`);

  const architecture = await postJson('/api/chat', {
    message: 'Diseña la arquitectura de un SaaS de facturación',
    language: 'es',
    securityLevel: 'BALANCED',
    sessionId: 'smoke_test_architecture',
    history: []
  });
  if (!architecture.assignedAgent || architecture.assignedAgent.nameES !== 'Thomas') {
    throw new Error(`Expected Thomas, got ${architecture.assignedAgent?.nameES}`);
  }
  if (!architecture.text.includes('Jefe Maestro')) throw new Error('Persona check failed');

  const security = await postJson('/api/chat', {
    message: 'Escanea la red por vulnerabilidades y audita mi API de pagos',
    language: 'es',
    securityLevel: 'BALANCED',
    sessionId: 'smoke_test_security',
    history: []
  });
  if (!security.assignedAgent || !['Fortress', 'Leonardo'].includes(security.assignedAgent.nameES)) {
    throw new Error(`Expected Fortress/Leonardo for security/API query, got ${security.assignedAgent?.nameES}`);
  }

  const dailyRoutine = await postJson('/api/chat', {
    message: 'Alfred, hora de trabajar',
    language: 'es',
    securityLevel: 'BALANCED',
    sessionId: 'smoke_test_daily_routine',
    history: []
  });
  if (!dailyRoutine.routineId) throw new Error('Daily routine was not activated');
  if (!dailyRoutine.text.includes('Jefe Maestro')) throw new Error('Daily routine greeting missing Jefe Maestro');
  if (!Array.isArray(dailyRoutine.uiActions) || !dailyRoutine.uiActions.some(action => action.type === 'audit_log')) throw new Error('Daily routine audit action missing');

  const explicitRoutine = await postJson('/api/chat', {
    message: 'Alfred, activa mi rutina diaria',
    language: 'es',
    securityLevel: 'BALANCED',
    sessionId: 'smoke_test_explicit_routine',
    history: []
  });
  if (!explicitRoutine.routineId) throw new Error('Explicit daily routine activation was not detected');
  if (explicitRoutine.assignedAgent) throw new Error('Explicit daily routine was incorrectly delegated');

  const savedMusicRoutine = await postJson('/api/chat', {
    message: 'abre la ruina diara con musica guardada',
    language: 'es',
    securityLevel: 'BALANCED',
    sessionId: 'smoke_test_saved_music_routine',
    history: []
  });
  if (!savedMusicRoutine.routineId) throw new Error('Saved-music routine activation was not detected');
  if (!savedMusicRoutine.uiActions?.some(action => action.type === 'open_url')) throw new Error('Saved-music routine did not open music action');
  if (['morning_work', 'afternoon_service'].includes(dailyRoutine.routineId) && !dailyRoutine.uiActions.some(action => action.type === 'open_url' && action.url?.includes('youtube-routine-player.html') && action.url?.includes('volume=40'))) {
    throw new Error('Daily routine YouTube moderate-volume player action missing');
  }

  const greetingRoutineChecks = [
    ['Buenos días Alfred', 'morning_work'],
    ['Buenas tardes Alfred', 'afternoon_service'],
    ['Buenas noches Alfred', 'night_service'],
  ];
  for (const [message, expectedRoutineId] of greetingRoutineChecks) {
    const greetingRoutine = await postJson('/api/chat', {
      message,
      language: 'es',
      securityLevel: 'BALANCED',
      sessionId: `smoke_test_${expectedRoutineId}`,
      history: []
    });
    if (greetingRoutine.routineId !== expectedRoutineId) {
      throw new Error(`Greeting routine ${message} expected ${expectedRoutineId}, got ${greetingRoutine.routineId}`);
    }
    if (!greetingRoutine.text.includes('Jefe Maestro')) throw new Error(`Greeting routine ${message} missing Jefe Maestro`);
  }

  const historyDays = await getJson('/api/history-days?limit=7');
  if (!Array.isArray(historyDays.days)) throw new Error('Daily conversation index missing');
  if (historyDays.days.length > 0) {
    const dayHistory = await getJson(`/api/history-day/${historyDays.days[0].day}`);
    if (dayHistory.day !== historyDays.days[0].day || !Array.isArray(dayHistory.messages)) {
      throw new Error('Daily conversation retrieval missing');
    }
  }

  const telemetry = await getJson('/api/telemetry');
  if (!telemetry.metrics || telemetry.metrics.activeAgentsCount !== 12) throw new Error('Telemetry active agent count is not 12');

  const voiceBridgeScript = 'scripts/windows-alfred-voice-bridge.ps1';
  const voiceBridgeLauncher = 'scripts/windows-start-voice-bridge.bat';
  const startupLauncher = 'scripts/windows-start-alfred.bat';
  if (!existsSync(voiceBridgeScript)) throw new Error('Windows voice bridge script missing');
  if (!existsSync(voiceBridgeLauncher)) throw new Error('Windows voice bridge launcher missing');
  if (!existsSync(startupLauncher)) throw new Error('Windows startup launcher missing');
  const bridgeSource = readFileSync(voiceBridgeScript, 'utf8');
  if (!bridgeSource.includes('SpeechRecognitionEngine') || !bridgeSource.includes('/api/chat')) {
    throw new Error('Windows voice bridge does not wire recognition to Alfred chat');
  }
  const startupSource = readFileSync(startupLauncher, 'utf8');
  if (!startupSource.includes('windows-alfred-voice-bridge.ps1')) throw new Error('Startup launcher does not start voice bridge');

  console.log('SMOKE OK');
  console.log(`Provider: ${health.llmProvider} (${health.llmModel})`);
  console.log(`Agents: ${agents.agents.length} total / ${active} active`);
  console.log(`Business agents: ${business.businessAgents.length} specialists / ${business.pageVideoFactory.videoTypes.length} video types`);
  console.log(`Memory preferences: ${memoryPrefs.preferences.taskLifecycle.onStart} / ${memoryPrefs.preferences.startupMusic.urls.length} music URLs`);
  console.log(`RevenueCat MCP: ${revenueCat.revenueCat.configured ? 'configured' : 'awaiting local secret'} / ${revenueCat.revenueCat.capabilities.length} capability groups`);
  console.log(`Media Router: ${mediaRouter.mediaRouter.primaryProvider} / ${mediaRouter.mediaRouter.agents.length} media agents / ${mediaRouter.mediaRouter.seedanceTools.length} Seedance tools`);
  console.log(`ALFRED V3.5: ${v3.designSystem} / ${v3.stitchFusion.importedZipPacks} Stitch packs / ${v3.apiPipelines.length} API pipelines / wake ${v3.handsFree.wakeCommands[0]}`);
  console.log(`Briefing: ${briefing.briefing.alfred.version} / RAM ${briefing.briefing.localSystem.memory.usedPct}% / next ${briefing.briefing.nextImprovements.length}`);
  console.log(`Daily routines: ${dailyRoutine.routineId} / ${dailyRoutine.uiActions.length} actions / greetings 3 OK`);
  console.log(`Business routing: ${matchedIds.join(', ')}`);
  console.log(`TTS provider: ${tts.provider || 'cloud'} / preview audio OK`);
  console.log(`Routing architecture: ${architecture.assignedAgent.nameES}`);
  console.log(`Routing security: ${security.assignedAgent.nameES}`);
}

main().catch(err => {
  console.error('SMOKE FAILED:', err.message);
  process.exit(1);
});
