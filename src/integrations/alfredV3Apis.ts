export interface AlfredV3ApiStatus {
  id: string;
  label: string;
  purpose: string;
  configured: boolean;
  secretPresent: boolean;
  secretStoredInCode: false;
  envVars: string[];
  statusLabel: string;
}

const hasSecret = (value?: string) => Boolean(value && value.trim() && !value.includes('***') && !value.includes('REDACTED'));

export function getAlfredV3ApiStatus(): AlfredV3ApiStatus[] {
  const minimaxConfigured = hasSecret(process.env.MINIMAX_API_KEY) || hasSecret(process.env.MINIMAX_SUBSCRIPTION_KEY);
  const geminiConfigured = hasSecret(process.env.GEMINI_API_KEY) || hasSecret(process.env.GOOGLE_API_KEY);
  const stitchConfigured = hasSecret(process.env.STITCH_MCP_API_KEY) || hasSecret(process.env.GOOGLE_API_KEY);
  const seedanceConfigured = hasSecret(process.env.SEEDANCE_API_KEY);

  return [
    {
      id: 'minimax',
      label: 'MiniMax API',
      purpose: 'Generación de video/audio/personajes y campañas multimedia.',
      configured: minimaxConfigured,
      secretPresent: minimaxConfigured,
      secretStoredInCode: false,
      envVars: ['MINIMAX_API_KEY', 'MINIMAX_SUBSCRIPTION_KEY', 'MINIMAX_GROUP_ID'],
      statusLabel: minimaxConfigured ? 'configured' : 'awaiting local secret',
    },
    {
      id: 'gemini_nano_banana',
      label: 'Gemini Nano Banana',
      purpose: 'Diseño visual, imagen, composición y apoyo creativo vía Gemini API.',
      configured: geminiConfigured,
      secretPresent: geminiConfigured,
      secretStoredInCode: false,
      envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_IMAGE_MODEL'],
      statusLabel: geminiConfigured ? 'configured' : 'awaiting local secret',
    },
    {
      id: 'stitch_mcp',
      label: 'Stitch MCP',
      purpose: 'Generación de pantallas, design systems y prototipos UI futuristas.',
      configured: stitchConfigured,
      secretPresent: stitchConfigured,
      secretStoredInCode: false,
      envVars: ['STITCH_MCP_API_KEY', 'GOOGLE_API_KEY'],
      statusLabel: stitchConfigured ? 'configured or MCP session active' : 'MCP session / local secret required',
    },
    {
      id: 'seedance_2_5',
      label: 'Seedance 2.5',
      purpose: 'Proveedor primario de video generativo para Alfred Media Router.',
      configured: seedanceConfigured,
      secretPresent: seedanceConfigured,
      secretStoredInCode: false,
      envVars: ['SEEDANCE_API_KEY', 'SEEDANCE_BASE_URL', 'SEEDANCE_MODEL'],
      statusLabel: seedanceConfigured ? 'configured' : 'awaiting local secret',
    },
  ];
}
