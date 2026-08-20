/* ============================================================
 * calculator.js — Core calculation logic
 * Everything is computed in USD; the UI converts for display.
 * Token counts are estimates from tokenizers.js unless manually
 * supplied.
 * ============================================================ */

import { inputPricePerMToken, outputPricePerMToken } from './models.js';

/* Effective pricing entry: honors Google-style tier thresholds. */
function effInputPrice(model, tokenCount) {
  return inputPricePerMToken(model, tokenCount);
}

/* ---------- Standard text cost ---------- */

// tokens: {input, output}; model: MODELS entry.
// Returns detailed breakdown so charts/UI can render parts.
function calculateTextCost(tokens, model, options = {}) {
  const batch = !!options.batch;
  const batchMult = batch && model.batchSupported ? (model.batchDiscount || 1) : 1;

  const inputPrice = effInputPrice(model, tokens.input) * batchMult;
  const outputPrice = outputPricePerMToken(model) * batchMult;

  const inputCost = (tokens.input / 1e6) * inputPrice;
  const outputCost = (tokens.output / 1e6) * outputPrice;

  return {
    model: model.id,
    batch,
    tokens: { input: tokens.input, output: tokens.output },
    unitPrices: { input: inputPrice, output: outputPrice },
    inputCost,
    outputCost,
    total: inputCost + outputCost
  };
}

/* ---------- Caching ---------- */

// cacheHitRate: 0..1. Models that don't support caching simply
// pay the full input price on the cached share.
function calculateWithCaching(tokens, model, cacheHitRate = 0) {
  const base = calculateTextCost(tokens, model, {});
  const share = Math.min(1, Math.max(0, cacheHitRate));

  if (!model.cacheRead && !model.cacheWrite) {
    return { ...base, cacheable: false, cacheHitRate: share, cachedInputCost: 0, cacheSavings: 0 };
  }

  const cachedTokens = tokens.input * share;
  const uncachedTokens = tokens.input * (1 - share);
  const cacheReadPrice = model.cacheRead ?? model.in;
  const cacheWritePrice = model.cacheWrite ?? model.in;

  // Assume one write per batch window amortized at the hit rate.
  const inputCost = (uncachedTokens / 1e6) * model.in
                  + (cachedTokens / 1e6) * cacheReadPrice
                  + (tokens.input / 1e6) * (cacheWritePrice - model.in) * share;
  const outputCost = (tokens.output / 1e6) * model.out;
  const baseInputCost = (tokens.input / 1e6) * model.in;

  return {
    ...base,
    cacheable: true,
    cacheHitRate: share,
    inputCost,
    cachedInputCost: (cachedTokens / 1e6) * cacheReadPrice,
    cacheSavings: Math.max(0, baseInputCost - inputCost),
    total: inputCost + outputCost
  };
}

/* ---------- Reasoning overhead ---------- */

const REASONING_LEVELS = { low: 0.5, medium: 1.0, high: 2.0, extreme: 4.0 };

// reasoningEffort: 'low' | 'medium' | 'high' | 'extreme'
function calculateReasoning(tokens, model, reasoningEffort = 'medium') {
  const base = calculateTextCost(tokens, model, {});
  if (!model.reasoning) {
    return { ...base, reasoningApplied: false, reasoningTokens: 0, reasoningCost: 0 };
  }
  const mult = REASONING_LEVELS[reasoningEffort] ?? 1;
  const reasoningTokens = Math.round(tokens.output * mult);
  const reasoningCost = (reasoningTokens / 1e6) * model.out;
  const outputCost = base.outputCost + reasoningCost;
  return {
    ...base,
    reasoningApplied: true,
    reasoningEffort,
    reasoningTokens,
    reasoningCost,
    outputCost,
    total: base.inputCost + outputCost
  };
}

/* ---------- Multimodal: image ---------- */

const IMAGE_TOKEN_LIMITS = {
  low: 85, high: 1105, fit: 765
};
const OPENAI_TILE_SIZE = 512;
const OPENAI_TILE_TOKENS = 170;
const OPENAI_BASE_TOKENS = 85;

function calculateImage(width, height, detail, model) {
  if (!model.vision || model.imageTokenMode !== 'tiles') {
    // Flat token counting (Anthropic/Google): ~800 tokens per image.
    if (!model.vision) return { tokens: 0, tiles: 0, mode: 'unsupported' };
    return { tokens: 800, tiles: 0, mode: 'flat' };
  }

  if (detail === 'low') {
    return { tokens: IMAGE_TOKEN_LIMITS.low, tiles: 0, mode: 'tiles', detail };
  }

  // OpenAI "high" detail tiling.
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const short = Math.min(w, h);
  const scale = short > 2048 ? 2048 / short : 1;
  const scaledW = Math.round(w * scale);
  const scaledH = Math.round(h * scale);
  const long = Math.max(scaledW, scaledH);
  const scale2 = long > 768 ? 768 / long : 1;
  const finalW = Math.round(scaledW * scale2);
  const finalH = Math.round(scaledH * scale2);
  const tiles = Math.ceil(finalW / OPENAI_TILE_SIZE) * Math.ceil(finalH / OPENAI_TILE_SIZE);
  const tokens = OPENAI_BASE_TOKENS + tiles * OPENAI_TILE_TOKENS;
  return { tokens, tiles, mode: 'tiles', detail, dimensions: { finalW, finalH } };
}

/* ---------- Multimodal: audio ---------- */

// GPT-4o audio ≈ 32 tokens/sec input. Gemini audio ≈ 0.6 tokens/sec.
function calculateAudio(durationSeconds, model) {
  if (!model.audio) return { tokens: 0, mode: 'unsupported', durationSeconds };
  if (model.provider === 'google') {
    const tokens = Math.round(durationSeconds * 0.6);
    return { tokens, mode: 'gemini-audio', durationSeconds };
  }
  const tokens = Math.round(durationSeconds * 32);
  return { tokens, mode: 'openai-audio', durationSeconds };
}

/* ---------- Unified full cost (batch + reasoning + caching) ---------- */

  // tokens: {input, output}; model: MODELS entry.
  // options: { batch, reasoningEffort, cacheHitRate }
  function calculateFullCost(tokens, model, options = {}) {
    const batch = !!options.batch;
    const batchMult = batch && model.batchSupported ? (model.batchDiscount || 1) : 1;
    const cacheRate = Math.min(1, Math.max(0, options.cacheHitRate ?? 0));
    const reasoningEffort = options.reasoningEffort || 'medium';

    const reasoningMult = model.reasoning ? (REASONING_LEVELS[reasoningEffort] ?? 1) : 0;
    const reasoningTokens = model.reasoning ? Math.round(tokens.output * reasoningMult) : 0;
    const effectiveOutput = tokens.output + reasoningTokens;

    const inPrice = effInputPrice(model, tokens.input) * batchMult;
    const outPrice = model.out * batchMult;

    const baseInputCost = (tokens.input / 1e6) * inPrice;
    const visibleOutputCost = (tokens.output / 1e6) * outPrice;
    const reasoningCost = (reasoningTokens / 1e6) * outPrice;
    const outputCost = visibleOutputCost + reasoningCost;

    const cacheable = !!(model.cacheRead || model.cacheWrite);
    let inputCost = baseInputCost;
    let cacheSavings = 0;
    let cacheWriteCost = 0;
    if (cacheable && cacheRate > 0) {
      const cachedTokens = tokens.input * cacheRate;
      const readPrice = (model.cacheRead ?? model.in) * batchMult;
      // Steady-state blend: hits are served at the read price, misses at
      // the base price. Cache *writes* are one-time per distinct prompt, so
      // they're amortized over the cache lifetime and surfaced separately
      // rather than charged on every request.
      inputCost = ((tokens.input - cachedTokens) / 1e6) * inPrice
                + (cachedTokens / 1e6) * readPrice;
      cacheWriteCost = (cachedTokens / 1e6) * ((model.cacheWrite ?? model.in) * batchMult);
      cacheSavings = Math.max(0, baseInputCost - inputCost);
    }

    return {
      model: model.id,
      batch,
      cacheRate,
      reasoningEffort,
      cacheable,
      tokens: { input: tokens.input, output: tokens.output, reasoning: reasoningTokens, effectiveOutput },
      unitPrices: {
        input: inPrice, output: outPrice,
        read: model.cacheRead != null ? model.cacheRead * batchMult : null,
        write: model.cacheWrite != null ? model.cacheWrite * batchMult : null
      },
      inputCost,
      outputCost,
      visibleOutputCost,
      reasoningCost,
      cacheWriteCost,
      cacheSavings,
      total: inputCost + outputCost
    };
  }

/* ---------- Multi-turn chat ---------- */

// Models O(N) token growth of context in multi-turn chats.
// Returns per-turn cumulative input tokens.
function multiTurnContextGrowth(turns, avgMsgTokens, maxContext) {
  const out = [];
  let cumulative = 0;
  for (let i = 0; i < turns; i++) {
    // Each turn: user message + assistant reply (2 * avgMsgTokens),
    // all previous turns resent into context each round.
    const thisTurnTokens = avgMsgTokens * 2;
    cumulative += thisTurnTokens;
    out.push(Math.min(cumulative, maxContext || Infinity));
  }
  return out;
}

function calculateMultiTurn(turns, avgMsgTokens, model, options = {}) {
  const growth = multiTurnContextGrowth(turns, avgMsgTokens, model.contextWindow);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  const perTurn = [];

  for (let i = 0; i < turns; i++) {
    const contextTokens = growth[i];
    const outputTokens = avgMsgTokens; // model reply length
    const cost = calculateFullCost({ input: contextTokens, output: outputTokens }, model, options);
    totalInputTokens += contextTokens;
    totalOutputTokens += outputTokens;
    totalCost += cost.total;
    perTurn.push({
      turn: i + 1,
      contextTokens,
      outputTokens,
      cost: cost.total,
      cumulativeCost: totalCost
    });
  }
  return {
    turns: perTurn,
    totalTurns: turns,
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    growth
  };
}

/* ---------- Scale projection (MRC) ---------- */

// Monthly recurring cost at a given request volume & cache hit rate.
function calculateScale(perRequestCost, dailyRequests, cacheHitRate, model, tokens) {
  const daily = dailyRequests * perRequestCost;
  const monthly = daily * 30.4375; // avg days/month
  const annual = monthly * 12;

  // If caching applies, recompute per-request cost with blended cache.
  let effectivePerRequest = perRequestCost;
  if (model && tokens && (model.cacheRead || model.cacheWrite)) {
    const cached = calculateWithCaching(tokens, model, cacheHitRate);
    effectivePerRequest = cached.total;
  }

  return {
    perRequest: effectivePerRequest,
    dailyRequests,
    daily: effectivePerRequest * dailyRequests,
    monthly: effectivePerRequest * dailyRequests * 30.4375,
    annual: effectivePerRequest * dailyRequests * 365,
    series: buildMonthlySeries(effectivePerRequest * dailyRequests)
  };
}

function buildMonthlySeries(monthlyCost) {
  const labels = [];
  const data = [];
  for (let m = 1; m <= 12; m++) {
    labels.push('M' + m);
    data.push(+(monthlyCost * m).toFixed(4));
  }
  return { labels, data };
}

/* ---------- Helpers ---------- */

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

export const Calculator = {
  calculateTextCost,
  calculateWithCaching,
  calculateReasoning,
  calculateFullCost,
  calculateImage,
  calculateAudio,
  calculateMultiTurn,
  calculateScale,
  multiTurnContextGrowth,
  REASONING_LEVELS,
  formatNumber
};