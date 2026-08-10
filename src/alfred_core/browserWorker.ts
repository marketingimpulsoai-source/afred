import '../env';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type BrowserWorkerAction = 'open' | 'click' | 'fill' | 'submit' | 'extract' | 'download' | 'close';

export interface BrowserWorkerCommand {
  sessionId: string;
  action: BrowserWorkerAction;
  url?: string;
  selector?: string;
  value?: string;
  text?: string;
  confirm?: boolean;
  allowPrivate?: boolean;
  screenshot?: boolean;
  timeoutMs?: number;
}

export interface BrowserWorkerStatus {
  available: boolean;
  ready: boolean;
  browserExecutable?: string;
  headless: boolean;
  sessionCount: number;
  maxSessions: number;
  sessionIdleTimeoutMs: number;
  sessions: Array<{ sessionId: string; currentUrl?: string; title?: string; lastUsedAt: string }>;
  allowPrivateDefault: boolean;
  allowedDomains: string[];
}

export interface BrowserWorkerResult {
  ok: boolean;
  status: 'SUCCESS' | 'BLOCKED' | 'REQUIRES_CONFIRMATION' | 'ERROR';
  action: BrowserWorkerAction;
  sessionId: string;
  url?: string;
  title?: string;
  text?: string;
  html?: string;
  screenshotPath?: string;
  screenshotUrl?: string;
  downloadPath?: string;
  auditHash: string;
  timestamp: string;
  message?: string;
  error?: string;
}

interface SessionState {
  context: BrowserContext;
  page: Page;
  currentUrl?: string;
  title?: string;
  lastUsedAt: number;
}

const ARTIFACT_ROOT = path.join(process.cwd(), 'data', 'browser-worker');
const DEFAULT_TIMEOUT = 15000;
const SESSION_IDLE_TIMEOUT_MS = Math.max(Number(process.env.ALFRED_BROWSER_SESSION_TTL_MS) || 10 * 60 * 1000, 30_000);
const MAX_SESSIONS = Math.min(Math.max(Number(process.env.ALFRED_BROWSER_MAX_SESSIONS) || 6, 1), 32);
const SWEEP_INTERVAL_MS = 60_000;
const sessions = new Map<string, SessionState>();
let browserPromise: Promise<Browser> | null = null;
let resolvedBrowserExecutable: string | undefined;
let sweepTimer: NodeJS.Timeout | null = null;

function nowIso() {
  return new Date().toISOString();
}

function isHeadless(): boolean {
  // Modo agente visible: ALFRED_BROWSER_HEADLESS=false abre ventanas reales
  // de Chrome en el escritorio del Jefe Maestro.
  return process.env.ALFRED_BROWSER_HEADLESS !== 'false';
}

function allowPrivateDefault(): boolean {
  return process.env.ALFRED_BROWSER_ALLOW_PRIVATE === 'true';
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function isPrivateHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost' || host === 'localhost.localdomain' || host === '::1') return true;
  if (host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(part => Number(part));
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
  }
  return false;
}

function allowedDomainsFromEnv(): string[] {
  const raw = process.env.ALFRED_BROWSER_ALLOW_DOMAINS || '';
  return raw.split(',').map(s => normalizeHost(s.trim())).filter(Boolean);
}

function baseBrowserUrl(): string {
  const host = process.env.ALFRED_HOST && process.env.ALFRED_HOST !== '0.0.0.0' ? process.env.ALFRED_HOST : '127.0.0.1';
  const port = Number(process.env.PORT) || 3000;
  return process.env.ALFRED_BROWSER_BASE_URL || `http://${host}:${port}`;
}

function resolveUrl(input: string): URL {
  return new URL(input, baseBrowserUrl());
}

function validateUrl(input: string, allowPrivate = false): { ok: boolean; reason?: string; url?: URL } {
  let parsed: URL;
  try {
    parsed = resolveUrl(input);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, reason: 'Only http/https URLs are allowed' };
  if (!allowPrivate) {
    if (isPrivateHost(parsed.hostname)) return { ok: false, reason: 'Private or localhost URLs are blocked by default' };
    const allowlist = allowedDomainsFromEnv();
    if (allowlist.length > 0 && !allowlist.some(domain => normalizeHost(parsed.hostname) === domain || normalizeHost(parsed.hostname).endsWith(`.${domain}`))) {
      return { ok: false, reason: `Domain not in ALFRED_BROWSER_ALLOW_DOMAINS (${allowlist.join(', ')})` };
    }
  }
  return { ok: true, url: parsed };
}

function detectChromeExecutable(): string | undefined {
  if (process.env.ALFRED_BROWSER_EXECUTABLE_PATH && existsSync(process.env.ALFRED_BROWSER_EXECUTABLE_PATH)) {
    return process.env.ALFRED_BROWSER_EXECUTABLE_PATH;
  }
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function launchBrowser(): Promise<Browser> {
  resolvedBrowserExecutable = detectChromeExecutable();
  const headless = isHeadless();
  try {
    return resolvedBrowserExecutable
      ? await chromium.launch({ headless, executablePath: resolvedBrowserExecutable, args: ['--disable-dev-shm-usage'] })
      : await chromium.launch({ headless, args: ['--disable-dev-shm-usage'] });
  } catch (error) {
    if (resolvedBrowserExecutable) {
      console.warn(`[BrowserWorker] Failed launching system Chrome at ${resolvedBrowserExecutable}; falling back to bundled Chromium.`, error);
      resolvedBrowserExecutable = undefined;
      return chromium.launch({ headless, args: ['--disable-dev-shm-usage'] });
    }
    throw error;
  }
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch(error => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

/** Cierra las sesiones inactivas para no acumular contextos de Chromium. */
async function sweepIdleSessions(): Promise<void> {
  const cutoff = Date.now() - SESSION_IDLE_TIMEOUT_MS;
  const expired = [...sessions.entries()].filter(([, state]) => state.lastUsedAt < cutoff).map(([id]) => id);
  await Promise.all(expired.map(id => closeSession(id)));
}

function ensureSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    void sweepIdleSessions();
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

function safeSessionDirName(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'default';
}

async function ensureArtifactDir(sessionId: string): Promise<string> {
  const dir = path.join(ARTIFACT_ROOT, safeSessionDirName(sessionId));
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Resuelve una ruta de artefacto verificando que quede dentro de
 * `data/browser-worker`. Evita path traversal al servirlos por HTTP.
 */
export function resolveArtifactPath(candidate: string): string | null {
  if (!candidate) return null;
  const absolute = path.resolve(ARTIFACT_ROOT, candidate);
  const root = path.resolve(ARTIFACT_ROOT);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return existsSync(absolute) ? absolute : null;
}

export function artifactUrl(absolutePath?: string): string | undefined {
  if (!absolutePath) return undefined;
  const relative = path.relative(path.resolve(ARTIFACT_ROOT), path.resolve(absolutePath));
  if (!relative || relative.startsWith('..')) return undefined;
  return `/api/browser-worker/artifact?path=${encodeURIComponent(relative.split(path.sep).join('/'))}`;
}

async function captureEvidence(sessionId: string, action: BrowserWorkerAction, page: Page, includeScreenshot = true): Promise<{ screenshotPath?: string; title: string; url: string; text: string; html: string }> {
  const [title, url, text, html] = await Promise.all([
    page.title().catch(() => ''),
    page.url(),
    page.locator('body').innerText({ timeout: 2500 }).catch(() => ''),
    page.content().catch(() => ''),
  ]);

  let screenshotPath: string | undefined;
  if (includeScreenshot) {
    const dir = await ensureArtifactDir(sessionId);
    screenshotPath = path.join(dir, `${Date.now()}-${action}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  }

  return {
    screenshotPath,
    title,
    url,
    text: text.slice(0, 6000),
    html: html.slice(0, 12000),
  };
}

function hashAudit(input: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

async function getSession(sessionId: string): Promise<SessionState> {
  ensureSweeper();
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing;
  }

  await sweepIdleSessions();
  while (sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt)[0];
    if (!oldest) break;
    await closeSession(oldest[0]);
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true,
    permissions: [],
    locale: 'es-ES',
    javaScriptEnabled: true,
  });
  const page = await context.newPage();
  const session = { context, page, lastUsedAt: Date.now() } satisfies SessionState;
  sessions.set(sessionId, session);
  return session;
}

async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  await session.context.close().catch(() => undefined);
}

function blockedResult(action: BrowserWorkerAction, sessionId: string, reason: string, extra: Partial<BrowserWorkerResult> = {}): BrowserWorkerResult {
  return {
    ok: false,
    status: 'BLOCKED',
    action,
    sessionId,
    auditHash: hashAudit({ action, sessionId, reason, extra, at: nowIso() }),
    timestamp: nowIso(),
    message: reason,
    ...extra,
  };
}

function confirmationResult(action: BrowserWorkerAction, sessionId: string, reason: string): BrowserWorkerResult {
  return {
    ok: false,
    status: 'REQUIRES_CONFIRMATION',
    action,
    sessionId,
    auditHash: hashAudit({ action, sessionId, reason, at: nowIso() }),
    timestamp: nowIso(),
    message: reason,
  };
}

function invalidResult(action: BrowserWorkerAction, sessionId: string, reason: string): BrowserWorkerResult {
  return {
    ok: false,
    status: 'ERROR',
    action,
    sessionId,
    auditHash: hashAudit({ action, sessionId, reason, at: nowIso() }),
    timestamp: nowIso(),
    error: reason,
  };
}

async function interact(action: BrowserWorkerAction, command: BrowserWorkerCommand): Promise<BrowserWorkerResult> {
  const sessionId = command.sessionId || 'default';
  const timeout = Math.min(Math.max(Number(command.timeoutMs) || DEFAULT_TIMEOUT, 1000), 30000);
  const allowPrivate = command.allowPrivate === true || allowPrivateDefault();

  try {
    if (action === 'close') {
      await closeSession(sessionId);
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        auditHash: hashAudit({ action, sessionId, at: nowIso() }),
        timestamp: nowIso(),
        message: 'Session closed',
      };
    }

    const session = await getSession(sessionId);
    const page = session.page;

    if (action === 'open') {
      if (!command.url) return invalidResult(action, sessionId, 'URL required');
      const validated = validateUrl(command.url, allowPrivate);
      if (!validated.ok || !validated.url) return blockedResult(action, sessionId, validated.reason || 'URL blocked');
      const targetUrl = validated.url.toString();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForLoadState('load', { timeout }).catch(() => undefined);
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      const result: BrowserWorkerResult = {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: evidence.text,
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        auditHash: hashAudit({ action, sessionId, url: evidence.url, title: evidence.title, text: evidence.text.slice(0, 400), at: nowIso() }),
        timestamp: nowIso(),
        message: `Opened ${targetUrl}`,
      };
      return result;
    }

    if (action === 'fill') {
      if (!command.selector || typeof command.value !== 'string') return invalidResult(action, sessionId, 'selector and value required');
      const locator = page.locator(command.selector).first();
      await locator.fill(command.value, { timeout });
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: evidence.text,
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        auditHash: hashAudit({ action, sessionId, selector: command.selector, value: command.value, url: evidence.url, at: nowIso() }),
        timestamp: nowIso(),
        message: `Filled ${command.selector}`,
      };
    }

    if (action === 'click') {
      if (!command.selector) return invalidResult(action, sessionId, 'selector required');
      const locator = page.locator(command.selector).first();
      await locator.click({ timeout });
      await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => undefined);
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: evidence.text,
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        auditHash: hashAudit({ action, sessionId, selector: command.selector, url: evidence.url, at: nowIso() }),
        timestamp: nowIso(),
        message: `Clicked ${command.selector}`,
      };
    }

    if (action === 'submit') {
      if (!command.confirm) return confirmationResult(action, sessionId, 'Submit actions require explicit confirmation');
      if (!command.selector) return invalidResult(action, sessionId, 'selector required');
      const locator = page.locator(command.selector).first();
      await locator.click({ timeout });
      await page.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: evidence.text,
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        auditHash: hashAudit({ action, sessionId, selector: command.selector, confirmed: command.confirm, url: evidence.url, at: nowIso() }),
        timestamp: nowIso(),
        message: `Submitted ${command.selector}`,
      };
    }

    if (action === 'extract') {
      let text = '';
      if (command.selector) {
        text = await page.locator(command.selector).first().innerText({ timeout }).catch(() => '');
      } else {
        text = await page.locator('body').innerText({ timeout }).catch(() => '');
      }
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: (text || evidence.text).slice(0, 6000),
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        auditHash: hashAudit({ action, sessionId, selector: command.selector, url: evidence.url, at: nowIso() }),
        timestamp: nowIso(),
        message: `Extracted ${command.selector || 'page text'}`,
      };
    }

    if (action === 'download') {
      if (!command.confirm) return confirmationResult(action, sessionId, 'Downloads require explicit confirmation');
      if (!command.selector) return invalidResult(action, sessionId, 'selector required');
      const dir = await ensureArtifactDir(sessionId);
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout }),
        page.locator(command.selector).first().click({ timeout }),
      ]);
      const suggestedName = download.suggestedFilename();
      const targetPath = path.join(dir, `${Date.now()}-${suggestedName}`);
      await download.saveAs(targetPath);
      const evidence = await captureEvidence(sessionId, action, page, command.screenshot !== false);
      session.currentUrl = evidence.url;
      session.title = evidence.title;
      return {
        ok: true,
        status: 'SUCCESS',
        action,
        sessionId,
        url: evidence.url,
        title: evidence.title,
        text: evidence.text,
        html: evidence.html,
        screenshotPath: evidence.screenshotPath,
        screenshotUrl: artifactUrl(evidence.screenshotPath),
        downloadPath: targetPath,
        auditHash: hashAudit({ action, sessionId, selector: command.selector, confirmed: command.confirm, url: evidence.url, downloadPath: targetPath, at: nowIso() }),
        timestamp: nowIso(),
        message: `Downloaded ${suggestedName}`,
      };
    }

    return invalidResult(action, sessionId, `Unsupported action: ${action}`);
  } catch (error: any) {
    return {
      ok: false,
      status: 'ERROR',
      action,
      sessionId: command.sessionId || 'default',
      auditHash: hashAudit({ action, sessionId: command.sessionId || 'default', error: String(error?.message || error), at: nowIso() }),
      timestamp: nowIso(),
      error: String(error?.message || error),
      message: 'Browser worker action failed',
    };
  }
}

export async function executeBrowserWorkerCommand(command: BrowserWorkerCommand): Promise<BrowserWorkerResult> {
  if (!command || typeof command !== 'object') {
    return invalidResult('open', 'default', 'Invalid browser worker command');
  }
  if (typeof command.sessionId !== 'string' || !command.sessionId.trim()) {
    return invalidResult(command.action || 'open', 'default', 'sessionId is required');
  }
  if (!['open', 'click', 'fill', 'submit', 'extract', 'download', 'close'].includes(command.action)) {
    return invalidResult(command.action as BrowserWorkerAction, command.sessionId, 'Unknown browser worker action');
  }
  if (command.action === 'open' && !command.url) return invalidResult('open', command.sessionId, 'url is required');
  return interact(command.action, command);
}

export async function getBrowserWorkerStatus(): Promise<BrowserWorkerStatus> {
  return {
    available: true,
    ready: true,
    browserExecutable: resolvedBrowserExecutable,
    headless: isHeadless(),
    sessionCount: sessions.size,
    maxSessions: MAX_SESSIONS,
    sessionIdleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
    sessions: await Promise.all([...sessions.entries()].map(async ([sessionId, state]) => ({
      sessionId,
      currentUrl: state.currentUrl || state.page.url(),
      title: state.title || await state.page.title().catch(() => ''),
      lastUsedAt: new Date(state.lastUsedAt).toISOString(),
    }))),
    allowPrivateDefault: allowPrivateDefault(),
    allowedDomains: allowedDomainsFromEnv(),
  };
}

export async function closeAllBrowserSessions(): Promise<void> {
  const ids = [...sessions.keys()];
  await Promise.all(ids.map(id => closeSession(id)));
}

/** Libera Chromium y el temporizador de limpieza al apagar el servidor. */
export async function shutdownBrowserWorker(): Promise<void> {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
  await closeAllBrowserSessions();
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  await pending.then(browser => browser.close()).catch(() => undefined);
}

export async function ensureBrowserFixtureReady(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const marker = path.join(ARTIFACT_ROOT, '.ready');
  if (!existsSync(marker)) {
    await writeFile(marker, nowIso(), 'utf8');
  }
}
