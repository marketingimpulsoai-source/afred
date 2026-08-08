export type Language = 'es' | 'en';
export type SecurityLevel = 'STRICT' | 'BALANCED' | 'DEV';
export type CoreState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ROUTING' | 'SPEAKING' | 'ERROR';
export type AgentStatus = 'ACTIVE' | 'BUSY' | 'STANDBY' | 'OFFLINE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SafetyAction = 'ALLOW' | 'REQUIRE_CONFIRMATION' | 'BLOCK';
export type TabId =
  | 'core'
  | 'agents'
  | 'business'
  | 'media'
  | 'tools'
  | 'policies'
  | 'observability'
  | 'architecture'
  | 'biometric'
  | 'settings'
  | 'docs'
  | 'network'
  | 'mobile'
  | 'memory';

export interface SubAgent {
  id: string;
  code: string;
  nameES: string;
  nameEN: string;
  roleES: string;
  roleEN: string;
  categoryES: string;
  categoryEN: string;
  iconName: string;
  neonColor: string;
  status: AgentStatus;
  cpuLoad: number;
  memoryUsageMb: number;
  descriptionES: string;
  descriptionEN: string;
  systemPromptES: string;
  systemPromptEN: string;
  tools: string[];
  keywords: string[];
  sampleQueriesES: string[];
  sampleQueriesEN: string[];
  delegatesTo: string[];
}

export interface BusinessPlaybook {
  id: string;
  titleES: string;
  titleEN: string;
  objectiveES: string;
  objectiveEN: string;
  stepsES: string[];
  stepsEN: string[];
  outputs: string[];
}

export interface BusinessAgent {
  id: string;
  code: string;
  name: string;
  businessIds: string[];
  division: 'AI Systems & Agents' | 'Digital Products & EdTech' | 'Vertical SaaS & Marketplaces' | 'Client Delivery Studio' | 'Risk & Finance';
  priority: number;
  cashflowScore: number;
  supervisingAgentId: string;
  roleES: string;
  roleEN: string;
  descriptionES: string;
  descriptionEN: string;
  markets: string[];
  clientTypes: string[];
  pageTypes: string[];
  videoTypes: string[];
  skills: string[];
  keywords: string[];
  deliverablesES: string[];
  deliverablesEN: string[];
  guardrailsES: string[];
  guardrailsEN: string[];
  playbooks: BusinessPlaybook[];
}

export interface BusinessRoutingMatch {
  specialist: BusinessAgent;
  score: number;
  matchedKeywords: string[];
}

export interface AgentTool {
  id: string;
  agentId: string;
  nameES: string;
  nameEN: string;
  descriptionES: string;
  descriptionEN: string;
  riskLevel: RiskLevel;
  parametersSchema: Record<string, { type: string; description: string; required?: boolean }>;
  handler?: (params: Record<string, any>) => Promise<any> | any;
}

export interface SafetyPolicy {
  id: string;
  code: string;
  titleES: string;
  titleEN: string;
  descriptionES: string;
  descriptionEN: string;
  riskLevel: RiskLevel;
  action: SafetyAction;
  isEnabled: boolean;
}

export interface ToolCallTrace {
  toolId: string;
  toolName?: string;
  agentId?: string;
  parameters?: Record<string, any>;
  result?: any;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR' | 'BLOCKED' | 'REQUIRES_CONFIRMATION';
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  executionTimeMs?: number;
  input?: Record<string, any>;
  output?: any;
  error?: string;
}

export interface RoutingDecision {
  query: string;
  chosenAgentId: string | null;
  chosenAgentName: string | null;
  confidence: number;
  reasoningES: string;
  reasoningEN: string;
  candidates: Array<{ agentId: string; score: number; reason?: string }>;
  latencyMs: number;
  method: 'llm_semantic' | 'llm_classification' | 'keyword_fallback' | 'manual' | 'direct';
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'user' | 'alfred' | 'subagent' | 'system';
  agentId?: string;
  agentName?: string;
  text: string;
  timestamp: string;
  createdAt: number;
  language: Language;
  toolCalls?: ToolCallTrace[];
  routingDecision?: RoutingDecision;
  confidenceScore?: number;
}

export interface MemoryRecord {
  id: string;
  sessionId: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'fact';
  kind?: 'episodic' | 'semantic' | 'procedural' | 'fact';
  content: string;
  summary?: string;
  source?: 'conversation' | 'document' | 'tool' | 'manual';
  tags: string[];
  createdAt: number;
  updatedAt?: string;
  agentId?: string;
  importance?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface MemorySearchResult {
  record: MemoryRecord;
  similarity: number;
}

export interface SystemMetrics {
  coreStatus: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  cpuTotalUsage: number;
  memoryTotalUsageMb: number;
  activeAgentsCount: number;
  totalQueriesProcessed: number;
  averageResponseMs: number;
  securityProtocol: SecurityLevel;
  voiceSynthesisEngine: string;
  uptimeSeconds: number;
  llmProvider: string;
  llmModel: string;
  latencyMs?: number;
  encryption?: string;
  quantumLink?: string;
}

export interface AlfredSettings {
  voiceEnabled: boolean;
  autoSpeak: boolean;
  locale: Language;
  securityLevel: SecurityLevel;
  showReasoning: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface BiometricStatus {
  available: boolean;
  verified: boolean;
  method: 'webauthn' | 'simulated' | 'unavailable';
  lastVerifiedAt?: string;
  message: string;
}

export interface ChatRequest {
  message: string;
  language: Language;
  securityLevel: SecurityLevel;
  sessionId: string;
  history?: Array<{ role: 'user' | 'model' | 'system'; text: string }>;
}

export interface ChatResponse {
  id: string;
  text: string;
  assignedAgent?: SubAgent;
  routingDecision?: RoutingDecision;
  toolCallTraces?: ToolCallTrace[];
  confidenceScore: number;
  latencyMs: number;
  language: Language;
  memoryContextUsed: Array<MemoryRecord | string>;
}
