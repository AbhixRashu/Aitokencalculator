#!/usr/bin/env node
/* ============================================================
 * sync-prices.mjs — Pull latest model pricing from OpenRouter
 * and patch src/scripts/models.js in place.
 *
 * Run:  npm run sync
 * CI:   .github/workflows/sync-prices.yml (weekly cron)
 *
 * Only fields OpenRouter provides are updated: in/out prices
 * (per 1M tokens), contextWindow. Fields like cacheWrite,
 * cacheRead, reasoning are left untouched.
 * ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS_PATH = path.join(ROOT, 'src', 'scripts', 'models.js');
const OR_URL = 'https://openrouter.ai/api/v1/models';

/* our model id -> OpenRouter id (exact, no :batch/:free variants) */
const MAP = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'o1': 'openai/o1',
  'o1-mini': 'openai/o1-mini',
  'o3': 'openai/o3',
  'o3-mini': 'openai/o3-mini',
  'gpt-4-1': 'openai/gpt-4.1',
  'gpt-4-1-mini': 'openai/gpt-4.1-mini',
  'gpt-5-5': 'openai/gpt-5.5',
  'gpt-5-6-sol': 'openai/gpt-5.6-sol',
  'gpt-5-6-terra': 'openai/gpt-5.6-terra',
  'gpt-5-6-luna': 'openai/gpt-5.6-luna',
  'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3-5-haiku': 'anthropic/claude-3.5-haiku',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4.6',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
  'claude-sonnet-5': 'anthropic/claude-sonnet-5',
  'claude-opus-5': 'anthropic/claude-opus-5',
  'claude-fable-5': 'anthropic/claude-fable-5',
  'gemini-1-5-pro': 'google/gemini-1.5-pro',
  'gemini-1-5-flash': 'google/gemini-1.5-flash',
  'gemini-2-0-flash': 'google/gemini-2.0-flash',
  'gemini-ultra': null,
  'gemini-2-5-flash': 'google/gemini-2.5-flash',
  'gemini-3-5-flash': 'google/gemini-3.5-flash',
  'gemini-3-1-pro': 'google/gemini-3.1-pro-preview',
  'gemini-3-6-flash': 'google/gemini-3.6-flash',
  'gemini-3-7-flash': 'google/gemini-3.7-flash',
  'mistral-large': 'mistralai/mistral-large',
  'mistral-small': 'mistralai/mistral-small-2603',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b',
  'mistral-large-3': 'mistralai/mistral-large-2512',
  'mistral-small-4': 'mistralai/mistral-small-2603',
  'llama-3-1-405b': 'meta-llama/llama-3.1-405b-instruct',
  'llama-3-1-70b': 'meta-llama/llama-3.1-70b-instruct',
  'llama-3-1-8b': 'meta-llama/llama-3.1-8b-instruct',
  'grok-4-6': 'x-ai/grok-4.6',
  'grok-4-3': 'x-ai/grok-4.3',
  'grok-build': 'x-ai/grok-build-0.1',
  'minimax-m3': 'minimax/minimax-m3',
  'minimax-m2-7': 'minimax/minimax-m2.7',
  'minimax-m2': 'minimax/minimax-m2',
  'kimi-k3': 'moonshotai/kimi-k3',
  'kimi-k2-6': 'moonshotai/kimi-k2.6',
  'kimi-k2-5': 'moonshotai/kimi-k2.5',
  'deepseek-v4-flash': 'deepseek/deepseek-v4-flash-0731',
  'deepseek-v4-pro': 'deepseek/deepseek-v4-pro-0813'
};

/* per-token USD -> per-1M-token, trimmed to 6 significant decimals */
function perM(x) {
  if (x == null || isNaN(x)) return null;
  const v = x * 1e6;
  return Math.round(v * 1e6) / 1e6;
}

const res = await fetch(OR_URL);
if (!res.ok) {
  console.error(`OpenRouter fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const { data: orModels } = await res.json();
const byId = new Map(orModels.map(m => [m.id, m]));
const today = new Date().toISOString().slice(0, 10);

let source = readFileSync(MODELS_PATH, 'utf8');
const updates = [];

for (const [ourId, orId] of Object.entries(MAP)) {
  if (!orId) { console.log(`skip ${ourId}: no OpenRouter mapping`); continue; }
  const or = byId.get(orId);
  if (!or) { console.log(`skip ${ourId}: ${orId} not found on OpenRouter`); continue; }

  const inP = perM(or.pricing?.prompt);
  const outP = perM(or.pricing?.completion);
  const ctx = or.context_length || null;
  if (inP == null || outP == null) { console.log(`skip ${ourId}: no pricing on OpenRouter`); continue; }

  /* locate the model block and patch fields inside it only */
  const blockStart = source.indexOf(`  '${ourId}': {`);
  if (blockStart < 0) { console.log(`skip ${ourId}: block not found in models.js`); continue; }
  const blockEnd = source.indexOf('\n  },', blockStart);
  const blockRawEnd = source.indexOf('\n  }', blockStart);
  const end = blockEnd > 0 && blockEnd < blockRawEnd ? blockEnd : blockRawEnd;
  const block = source.slice(blockStart, end);

  let next = block
    .replace(/in: [\d.]+,\s*out: [\d.]+,/, `in: ${inP}, out: ${outP},`)
    .replace(/contextWindow: \d+/, `contextWindow: ${ctx ?? 'null'}`)
    .replace(/updated: '\d{4}-\d{2}-\d{2}'/, `updated: '${today}'`);

  if (next !== block) {
    source = source.slice(0, blockStart) + next + source.slice(end);
    updates.push(`${ourId}: $${inP}/M in, $${outP}/M out${ctx ? `, ${ctx.toLocaleString()} ctx` : ''}`);
  }
}

if (!updates.length) {
  console.log('No pricing changes.');
  process.exit(0);
}

/* keep last-updated header line fresh */
source = source.replace(/ \* Last updated: \d{4}-\d{2}-\d{2}\./, ` * Last updated: ${today}.`);

writeFileSync(MODELS_PATH, source);
console.log(`Updated ${updates.length} models:\n- ` + updates.join('\n- '));