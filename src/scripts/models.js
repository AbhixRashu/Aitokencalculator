/* ============================================================
 * models.js — Model registry with pricing data
 * All prices are USD per million tokens unless noted otherwise.
 * Last updated: 2026-08-20. Prices change frequently — verify
 * against each provider's official pricing page before relying
 * on output for financial decisions.
 * ============================================================ */

export const PROVIDERS = {
  openai:    { name: 'OpenAI',     color: '#10a37f', icon: '/assets/icons/openai.svg',    url: 'https://openai.com/api/pricing/' },
  anthropic: { name: 'Anthropic',  color: '#d97757', icon: '/assets/icons/anthropic.svg', url: 'https://www.anthropic.com/pricing' },
  google:    { name: 'Google',     color: '#4285f4', icon: '/assets/icons/google.svg',    url: 'https://ai.google.dev/pricing' },
  mistral:   { name: 'Mistral',    color: '#f9a03f', icon: '/assets/icons/mistral.svg',   url: 'https://mistral.ai/technology/#pricing' },
  meta:      { name: 'Meta / Llama', color: '#0866ff', icon: '/assets/icons/meta.svg',   url: 'https://together.ai/pricing' },
  xai:       { name: 'xAI / Grok', color: '#111111', icon: '/assets/icons/grok.svg',     url: 'https://docs.x.ai/developers/pricing' },
  minimax:   { name: 'MiniMax',    color: '#5b7cfa', icon: '/assets/icons/minimax.svg',  url: 'https://platform.minimax.io/docs/guides/pricing-paygo' },
  moonshot:  { name: 'Moonshot / Kimi', color: '#0ea5e9', icon: '/assets/icons/kimi.svg', url: 'https://platform.moonshot.ai/docs/pricing' },
  deepseek:  { name: 'DeepSeek',   color: '#4d6bfe', icon: '/assets/icons/deepseek.svg', url: 'https://api-docs.deepseek.com/quick_start/pricing' }
};

export const TOKENIZER_TYPES = {
  cl100k:   { label: 'cl100k_base',   charsPerToken: { latin: 4.0, cjk: 1.5, code: 2.5, arabic: 2.5, deva: 2.0 } },
  o200k:    { label: 'o200k_base',    charsPerToken: { latin: 4.0, cjk: 1.5, code: 2.5, arabic: 2.5, deva: 2.0 } },
  anthropic:{ label: 'Claude BPE',    charsPerToken: { latin: 4.0, cjk: 1.4, code: 2.5, arabic: 2.5, deva: 2.0 } },
  gemini:   { label: 'SentencePiece', charsPerToken: { latin: 3.7, cjk: 1.3, code: 2.4, arabic: 2.3, deva: 1.9 } },
  llama:    { label: 'Llama BPE',     charsPerToken: { latin: 4.0, cjk: 1.5, code: 2.5, arabic: 2.5, deva: 2.0 } }
};

/* Cost model fields:
 *   in / out              : USD per million tokens (base tier)
 *   contextWindow         : max supported context (tokens)
 *   contextThreshold      : optional tier breakpoint for higher price
 *   inHigh / outHigh      : USD per million tokens above threshold
 *   batchDiscount         : multiplier when batch mode is enabled
 *   batchSupported        : whether batch applies
 *   cacheWrite / cacheRead: USD per million tokens (optional)
 *   reasoning             : boolean, does model spend hidden tokens
 *   reasoningMult         : output-token multiplier for "High" reasoning
 *   vision / audio        : multimodal support flags
 *   imageTokenMode        : 'tiles' (OpenAI) | 'flat' | 'fixed'
 *   tokenizer             : tokenizerType key
 *   updated               : date price last verified
 *   note                  : optional annotation shown in UI
 */
export const MODELS = {
  /* ---------------- OpenAI ---------------- */
  'gpt-4o': {
    id: 'gpt-4o', name: 'GPT-4o', provider: 'openai',
    in: 2.5, out: 10,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 3.75, cacheRead: 1.25,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Flagship multimodal model. Cached input is 50% of base input price.'
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'openai',
    in: 0.15, out: 0.6,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 0.30, cacheRead: 0.075,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Cheapest OpenAI multimodal option.'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai',
    in: 10, out: 30,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 15.00, cacheRead: 5.00,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'cl100k',
    updated: '2026-08-20',
    note: 'Legacy flagship. Prefer GPT-4o for new work.'
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai',
    in: 0.5, out: 1.5,
    contextWindow: 16385, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'cl100k',
    updated: '2026-08-20',
    note: 'Deprecated model. Still available for legacy workloads.'
  },
  'o1': {
    id: 'o1', name: 'o1', provider: 'openai',
    in: 15, out: 60,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 22.50, cacheRead: 7.50,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Reasoning model — hidden chain-of-thought tokens are charged as output.'
  },
  'o1-mini': {
    id: 'o1-mini', name: 'o1-mini', provider: 'openai',
    in: 1.10, out: 4.40,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 1.65, cacheRead: 0.55,
    reasoning: true, reasoningMult: 2,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Faster, cheaper reasoning model.'
  },
  'o3': {
    id: 'o3', name: 'o3', provider: 'openai',
    in: 2, out: 8,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 3.00, cacheRead: 1.00,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Latest general reasoning model. Pricing set at launch levels.'
  },
  'o3-mini': {
    id: 'o3-mini', name: 'o3-mini', provider: 'openai',
    in: 1.1, out: 4.4,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 1.65, cacheRead: 0.55,
    reasoning: true, reasoningMult: 2,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Lightweight reasoning at budget price points.'
  },
  'gpt-4-1': {
    id: 'gpt-4-1', name: 'GPT-4.1', provider: 'openai',
    in: 2, out: 8,
    contextWindow: 1047576, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 3.00, cacheRead: 1.00,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Current production recommendation. 1M context, 50% batch, cached input up to 90% off.'
  },
  'gpt-4-1-mini': {
    id: 'gpt-4-1-mini', name: 'GPT-4.1 mini', provider: 'openai',
    in: 0.4, out: 1.6,
    contextWindow: 1047576, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: 0.60, cacheRead: 0.20,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Cheap 1M-context workhorse. Replaces GPT-4o mini for new builds.'
  },
  'gpt-5-5': {
    id: 'gpt-5-5', name: 'GPT-5.5', provider: 'openai',
    in: 5, out: 30,
    contextWindow: 1050000, contextThreshold: 200000,
    inHigh: 10.00, outHigh: 45.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.50,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Current frontier. Above 200K input the long-context meter applies; cache reads at $0.50/M.'
  },
  'gpt-5-6-sol': {
    id: 'gpt-5-6-sol', name: 'GPT-5.6 Sol', provider: 'openai',
    in: 2.5, out: 15,
    contextWindow: 1050000, contextThreshold: 200000,
    inHigh: 10.00, outHigh: 45.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.50,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'GPT-5.6 flagship tier (GA July 2026). 1.05M context; long-context rate above 200K.'
  },
  'gpt-5-6-terra': {
    id: 'gpt-5-6-terra', name: 'GPT-5.6 Terra', provider: 'openai',
    in: 2, out: 12,
    contextWindow: 1050000, contextThreshold: 200000,
    inHigh: 4.00, outHigh: 18.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.20,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'GPT-5.6 mid tier. Long-context doubles above 200K input.'
  },
  'gpt-5-6-luna': {
    id: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', provider: 'openai',
    in: 0.2, out: 1.2,
    contextWindow: 1050000, contextThreshold: 200000,
    inHigh: 0.40, outHigh: 1.80,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.02,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: true,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'GPT-5.6 budget tier. Long-context doubles above 200K input.'
  },

  /* ---------------- Anthropic ---------------- */
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic',
    in: 3.00, out: 15.00,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 3.75, cacheRead: 0.30,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Prompt caching: writes cost 1.25x, reads cost 0.1x of base input.'
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic',
    in: 0.80, out: 4.00,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 1.00, cacheRead: 0.08,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Fast, low-cost tier with vision support.'
  },
  'claude-3-opus': {
    id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic',
    in: 15.00, out: 75.00,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 18.75, cacheRead: 1.50,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Highest-tier Anthropic model. Expensive at scale.'
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic',
    in: 3.00, out: 15.00,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 3.75, cacheRead: 0.30,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Superseded by Claude 3.5 Sonnet at same price.'
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic',
    in: 3, out: 15,
    contextWindow: 1000000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 3.75, cacheRead: 0.30,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Current flagship. 1M context, 5x input for cache writes, 0.1x for cache reads.'
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic',
    in: 1, out: 5,
    contextWindow: 200000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 1.25, cacheRead: 0.10,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Low-cost current tier with vision support. 200K context.'
  },
  'claude-sonnet-5': {
    id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'anthropic',
    in: 2, out: 10,
    contextWindow: 1000000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 2.50, cacheRead: 0.20,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Current Sonnet tier. 1M context; cache reads at 0.1x base input.'
  },
  'claude-opus-5': {
    id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'anthropic',
    in: 5, out: 25,
    contextWindow: 1000000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 6.25, cacheRead: 0.50,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Flagship. 1M context, thinking-on-by-default; cache reads at $0.50/M.'
  },
  'claude-fable-5': {
    id: 'claude-fable-5', name: 'Claude Fable 5', provider: 'anthropic',
    in: 10, out: 50,
    contextWindow: 1000000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: 12.50, cacheRead: 1.00,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'anthropic',
    updated: '2026-08-20',
    note: 'Anthropic frontier tier. 1M context; cache reads at $1.00/M.'
  },

  /* ---------------- Google ---------------- */
  'gemini-1-5-pro': {
    id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', provider: 'google',
    in: 1.25, out: 5.00,
    contextWindow: 2000000, contextThreshold: 128000,
    inHigh: 2.50, outHigh: 10.00,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Prices double for prompts longer than 128K tokens. Supports 2M context.'
  },
  'gemini-1-5-flash': {
    id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', provider: 'google',
    in: 0.075, out: 0.30,
    contextWindow: 1000000, contextThreshold: 128000,
    inHigh: 0.15, outHigh: 0.60,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Lowest-cost tier — great for high-volume workloads.'
  },
  'gemini-2-0-flash': {
    id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', provider: 'google',
    in: 0.10, out: 0.40,
    contextWindow: 1000000, contextThreshold: 128000,
    inHigh: 0.20, outHigh: 0.80,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Current-generation flagship flash model. Multimodal input.'
  },
  'gemini-ultra': {
    id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'google',
    in: 7.50, out: 30.00,
    contextWindow: 1000000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Premium flagship tier. Estimate — official pricing varies by region.'
  },
  'gemini-2-5-flash': {
    id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', provider: 'google',
    in: 0.3, out: 2.5,
    contextWindow: 1048576, contextThreshold: 200000,
    inHigh: 0.60, outHigh: 5.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Thinking-enabled flash tier. Above 200K input tokens the rate doubles.'
  },
  'gemini-3-5-flash': {
    id: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash', provider: 'google',
    in: 1.5, out: 9,
    contextWindow: 1048576, contextThreshold: 200000,
    inHigh: 3.00, outHigh: 18.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Current-gen flash. Beats Gemini 3.1 Pro on coding at lower cost.'
  },
  'gemini-3-1-pro': {
    id: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro', provider: 'google',
    in: 2, out: 12,
    contextWindow: 1048576, contextThreshold: 200000,
    inHigh: 4.00, outHigh: 24.00,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Premium tier — thinking tokens billed as output.'
  },
  'gemini-3-6-flash': {
    id: 'gemini-3-6-flash', name: 'Gemini 3.6 Flash', provider: 'google',
    in: 0.75, out: 3.75,
    contextWindow: 1048576, contextThreshold: 200000,
    inHigh: 1.50, outHigh: 7.50,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Intro price $0.75/$3.75 through Dec 31, 2026. Doubles above 200K input.'
  },
  'gemini-3-7-flash': {
    id: 'gemini-3-7-flash', name: 'Gemini 3.7 Flash', provider: 'google',
    in: 0.375, out: 1.875,
    contextWindow: 1048576, contextThreshold: 200000,
    inHigh: 1.50, outHigh: 7.50,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: true,
    imageTokenMode: 'flat',
    tokenizer: 'gemini',
    updated: '2026-08-20',
    note: 'Latest Flash (Aug 2026). Intro $0.75/$3.75 through Dec 31, 2026.'
  },

  /* ---------------- Mistral ---------------- */
  'mistral-large': {
    id: 'mistral-large', name: 'Mistral Large', provider: 'mistral',
    in: 2, out: 6,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Flagship Mistral model with vision support (large 2411+).'
  },
  'mistral-small': {
    id: 'mistral-small', name: 'Mistral Small', provider: 'mistral',
    in: 0.15, out: 0.6,
    contextWindow: 262144, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Efficient mid-tier model (3.1) with vision support.'
  },
  'mixtral-8x7b': {
    id: 'mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'mistral',
    in: 0.70, out: 0.70,
    contextWindow: 32000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Symmetric in/out pricing. Open-weights via Le Chat.'
  },
  'mistral-large-3': {
    id: 'mistral-large-3', name: 'Mistral Large 3', provider: 'mistral',
    in: 0.5, out: 1.5,
    contextWindow: 262144, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Current flagship, 75% cheaper than Large 2. 256K context.'
  },
  'mistral-small-4': {
    id: 'mistral-small-4', name: 'Mistral Small 4', provider: 'mistral',
    in: 0.15, out: 0.6,
    contextWindow: 262144, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Budget mid-tier. Beats GPT-5.4 mini on price.'
  },

  /* ---------------- DeepSeek ---------------- */
  'deepseek-v4-flash': {
    id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'deepseek',
    in: 0.14, out: 0.28,
    contextWindow: 1310720, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.0028,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Extremely cheap frontier-adjacent tier. 1M context, auto cache hits ~$0.0028/M.'
  },
  'deepseek-v4-pro': {
    id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'deepseek',
    in: 1.188, out: 3.564,
    contextWindow: 1048576, contextThreshold: null,
    batchSupported: true, batchDiscount: 0.5,
    cacheWrite: null, cacheRead: 0.003625,
    reasoning: true, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Flagship reasoning tier. 1M context, 384K max output.'
  },

  /* ---------------- Meta / Llama ---------------- */
  'llama-3-1-405b': {
    id: 'llama-3-1-405b', name: 'Llama 3.1 405B', provider: 'meta',
    in: 3.50, out: 3.50,
    contextWindow: 128000, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Prices shown via Together AI — largest open-weight model.'
  },
  'llama-3-1-70b': {
    id: 'llama-3-1-70b', name: 'Llama 3.1 70B', provider: 'meta',
    in: 0.4, out: 0.4,
    contextWindow: 131072, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Hosted via Groq / Together / other providers.'
  },
  'llama-3-1-8b': {
    id: 'llama-3-1-8b', name: 'Llama 3.1 8B', provider: 'meta',
    in: 0.05, out: 0.08,
    contextWindow: 131072, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: false, audio: false,
    imageTokenMode: null,
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Fastest cheap open-weight option.'
  },

  /* ---------------- xAI / Grok ---------------- */
  'grok-4-6': {
    id: 'grok-4-6', name: 'Grok 4.6', provider: 'xai',
    in: 2, out: 6,
    contextWindow: 500000, contextThreshold: 200000,
    inHigh: 4.00, outHigh: 12.00,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.50,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Flagship Grok. Rates double above 200K input tokens; cached reads at $0.50/M.'
  },
  'grok-4-3': {
    id: 'grok-4-3', name: 'Grok 4.3', provider: 'xai',
    in: 1.25, out: 2.5,
    contextWindow: 1000000, contextThreshold: 200000,
    inHigh: 2.50, outHigh: 5.00,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.20,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'High-context tier. 1M context, cached reads at $0.20/M.'
  },
  'grok-build': {
    id: 'grok-build', name: 'Grok Build', provider: 'xai',
    in: 1, out: 2,
    contextWindow: 256000, contextThreshold: 200000,
    inHigh: 2.00, outHigh: 4.00,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.20,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'tiles',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Budget agentic tier for building tools and coding.'
  },

  /* ---------------- MiniMax ---------------- */
  'minimax-m3': {
    id: 'minimax-m3', name: 'MiniMax M3', provider: 'minimax',
    in: 0.3, out: 1.2,
    contextWindow: 1048576, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.06,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Current flagship. Up to 512K input tokens; cached reads at $0.06/M.'
  },
  'minimax-m2-7': {
    id: 'minimax-m2-7', name: 'MiniMax M2.7', provider: 'minimax',
    in: 0.3, out: 1.2,
    contextWindow: 204800, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Cost-efficient agentic model, 204.8K context.'
  },
  'minimax-m2': {
    id: 'minimax-m2', name: 'MiniMax M2', provider: 'minimax',
    in: 0.255, out: 1.02,
    contextWindow: 204800, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'llama',
    updated: '2026-08-20',
    note: 'Legacy flagship, still widely hosted.'
  },

  /* ---------------- Moonshot / Kimi ---------------- */
  'kimi-k3': {
    id: 'kimi-k3', name: 'Kimi K3', provider: 'moonshot',
    in: 3, out: 15,
    contextWindow: 1048576, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.30,
    reasoning: true, reasoningMult: 2,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Moonshot flagship reasoning model with 1M context.'
  },
  'kimi-k2-6': {
    id: 'kimi-k2-6', name: 'Kimi K2.6', provider: 'moonshot',
    in: 0.5605, out: 2.36,
    contextWindow: 262144, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: 0.19,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Agentic mid-tier. Cached reads at $0.19/M.'
  },
  'kimi-k2-5': {
    id: 'kimi-k2-5', name: 'Kimi K2.5', provider: 'moonshot',
    in: 0.45, out: 2.25,
    contextWindow: 262144, contextThreshold: null,
    batchSupported: false, batchDiscount: 1,
    cacheWrite: null, cacheRead: null,
    reasoning: false, reasoningMult: 1,
    vision: true, audio: false,
    imageTokenMode: 'flat',
    tokenizer: 'o200k',
    updated: '2026-08-20',
    note: 'Cheapest modern Kimi option, 256K context.'
  }
};

/* ---------------- Currency support ---------------- */
export const CURRENCIES = {
  USD: { symbol: '$', rate: 1,        decimals: 2 },
  EUR: { symbol: '€', rate: 0.92,     decimals: 2 },
  GBP: { symbol: '£', rate: 0.78,     decimals: 2 },
  JPY: { symbol: '¥', rate: 149.5,    decimals: 0 },
  CNY: { symbol: '¥', rate: 7.15,     decimals: 2 },
  KRW: { symbol: '₩', rate: 1330,     decimals: 0 },
  INR: { symbol: '₹', rate: 83.5,     decimals: 2 }
};

/* ---------------- Helpers ---------------- */

export function getModel(id) {
  return MODELS[id] || null;
}

export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

export function allModels() {
  return Object.values(MODELS);
}

export function providerModels(providerId) {
  return Object.values(MODELS).filter(m => m.provider === providerId);
}

/* Effective input price for a token count, honoring the
 * context threshold tier (Google-style pricing). */
export function inputPricePerMToken(model, tokenCount) {
  if (model.contextThreshold && tokenCount > model.contextThreshold) {
    return model.inHigh ?? model.in;
  }
  return model.in;
}

export function outputPricePerMToken(model) {
  return model.out;
}

export function convertUSD(usd, currencyCode) {
  const cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return usd * cur.rate;
}

export function formatMoney(usd, currencyCode) {
  const cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const val = usd * cur.rate;
  const s = Math.abs(val) >= 1e6 ? val.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : Math.abs(val) >= 1    ? val.toLocaleString('en-US', { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals })
        : val.toLocaleString('en-US', { maximumSignificantDigits: 3 });
  return cur.symbol + s;
}

/* Numbers that never round to zero need a small-precision helper. */
export function formatCompact(usd, currencyCode) {
  const cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const val = usd * cur.rate;
  if (Math.abs(val) < 0.001) return cur.symbol + val.toExponential(1);
  return cur.symbol + val.toLocaleString('en-US', { maximumFractionDigits: Math.max(cur.decimals, 6) });
}