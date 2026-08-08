export interface RevenueCatMcpCapability {
  category: string;
  tools: Array<{ name: string; access: 'read' | 'write' | 'mixed'; description: string }>;
}

export interface RevenueCatMcpStatus {
  name: 'RevenueCat MCP';
  mcpUrl: string;
  configured: boolean;
  authMethod: 'bearer' | 'oauth';
  secretPresent: boolean;
  secretStoredInCode: false;
  recommendedForAgents: string[];
  capabilities: RevenueCatMcpCapability[];
  guardrails: string[];
}

export const REVENUECAT_MCP_URL = process.env.REVENUECAT_MCP_URL || 'https://mcp.revenuecat.ai/mcp';

export const REVENUECAT_CAPABILITIES: RevenueCatMcpCapability[] = [
  {
    category: 'Projects and apps',
    tools: [
      { name: 'list-projects', access: 'read', description: 'List RevenueCat projects accessible to the configured account.' },
      { name: 'list-apps', access: 'read', description: 'List apps inside a project.' },
      { name: 'create-project', access: 'write', description: 'Create a new RevenueCat project.' },
      { name: 'create-app', access: 'write', description: 'Create iOS, Android, Stripe, Web Billing, or other app records.' },
    ],
  },
  {
    category: 'Products and prices',
    tools: [
      { name: 'list-products', access: 'read', description: 'List subscription and in-app purchase products.' },
      { name: 'create-product', access: 'write', description: 'Register products in the RevenueCat catalog.' },
      { name: 'create-product-prices', access: 'write', description: 'Configure prices for products.' },
      { name: 'submit-products-to-store', access: 'write', description: 'Submit App Store products for review when ready.' },
    ],
  },
  {
    category: 'Entitlements',
    tools: [
      { name: 'list-entitlements', access: 'read', description: 'List access levels customers unlock.' },
      { name: 'create-entitlement', access: 'write', description: 'Create a new entitlement.' },
      { name: 'attach-products-to-entitlement', access: 'write', description: 'Attach products so purchases unlock access.' },
    ],
  },
  {
    category: 'Offerings and packages',
    tools: [
      { name: 'list-offerings', access: 'read', description: 'List available offerings.' },
      { name: 'create-offering', access: 'write', description: 'Create a subscription offering.' },
      { name: 'create-packages', access: 'write', description: 'Create packages inside offerings.' },
      { name: 'get-offering-prices', access: 'read', description: 'Inspect package pricing by currency/country.' },
    ],
  },
  {
    category: 'Paywalls and experiments',
    tools: [
      { name: 'create-paywall-ai', access: 'write', description: 'Create an unpublished AI-assisted RevenueCat paywall.' },
      { name: 'edit-paywall-ai', access: 'write', description: 'Update an existing paywall using AI.' },
      { name: 'render-paywall-screenshot', access: 'read', description: 'Render a paywall screenshot for review.' },
    ],
  },
  {
    category: 'Analytics, customers and webhooks',
    tools: [
      { name: 'list-audit-logs', access: 'read', description: 'Inspect configuration changes.' },
      { name: 'list-collaborators', access: 'read', description: 'List people and roles on the project.' },
      { name: 'create-webhook-integration', access: 'write', description: 'Create webhook integrations for subscription events.' },
    ],
  },
];

export function getRevenueCatMcpStatus(): RevenueCatMcpStatus {
  const secretPresent = Boolean(process.env.REVENUECAT_API_KEY);
  return {
    name: 'RevenueCat MCP',
    mcpUrl: REVENUECAT_MCP_URL,
    configured: secretPresent && REVENUECAT_MCP_URL.includes('revenuecat'),
    authMethod: (process.env.REVENUECAT_AUTH_METHOD === 'oauth' ? 'oauth' : 'bearer'),
    secretPresent,
    secretStoredInCode: false,
    recommendedForAgents: ['Alfred-SaaSArchitect', 'Alfred-MarketingArchitect', 'Alfred-ClientStudio', 'Alfred-OperationsCFO', 'Thomas', 'Sterling', 'Leonardo'],
    capabilities: REVENUECAT_CAPABILITIES,
    guardrails: [
      'Never print, log, commit, package, or persist the RevenueCat API key.',
      'Read-only operations may run after explicit user request; write operations require confirmation from Jefe Maestro.',
      'Creating products, offerings, paywalls, entitlements, or webhooks can affect production subscription infrastructure.',
      'Prefer a dedicated RevenueCat API v2 key with the minimum permission level needed.',
      'Use OAuth when available; otherwise keep REVENUECAT_API_KEY only in local .env or Hermes secret storage.',
    ],
  };
}

export function buildHermesRevenueCatMcpConfigTemplate(): string {
  return `mcp_servers:\n  revenuecat:\n    url: "${REVENUECAT_MCP_URL}"\n    headers:\n      Authorization: "Bearer \${REVENUECAT_API_KEY}"\n    timeout: 180\n    connect_timeout: 60\n    sampling:\n      enabled: false`;
}
