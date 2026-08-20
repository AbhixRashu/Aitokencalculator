/* ============================================================
 * ui.js — UI interactions, state, rendering, events
 * ============================================================ */

import {
  CURRENCIES,
  PROVIDERS,
  getModel,
  getProvider,
  allModels,
  providerModels,
  formatMoney,
  formatCompact
} from './models.js';
import { Tokenizers } from './tokenizers.js';
import { Calculator } from './calculator.js';
import { Charts } from './charts.js';
import { Exporter } from './export.js';

const SAMPLE_TEXT = `The transformer architecture introduced in "Attention Is All You Need" made large language models practical. Each token — typically a few characters — is mapped to a vector, and self-attention lets every position look at every other position. This is why context windows matter: a 128K context can hold a small novel.

When estimating cost, remember that pricing is per million tokens. A 2,000-character English paragraph is roughly 500 tokens, while the same paragraph in Chinese might approach 1,300 tokens. Code is denser still, with punctuation and indent structure producing more tokens per character.`;

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const state = {
  model: 'gpt-4o',
  tab: 'text',
  currency: 'USD',
  theme: 'dark',
  compareModels: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2-0-flash']
};

/* ---------------- Toast ---------------- */
function toast(message, type = '') {
  const box = $('#toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
}

/* ---------------- Preferences ---------------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('tokencalc-theme', state.theme);
}

function applyCurrency() {
  window.__cur = CURRENCIES[state.currency].symbol;
  localStorage.setItem('tokencalc-currency', state.currency);
  renderActive();
}

/* ---------------- Model select ---------------- */
function populateModelSelect() {
  const sel = $('#model-select');
  const groups = Object.entries(PROVIDERS).map(([id, p]) => {
    const models = providerModels(id).map(m =>
      `<option value="${m.id}">${m.name} — $${m.in} / $${m.out} per M</option>`).join('');
    return `<optgroup label="${p.name}">${models}</optgroup>`;
  }).join('');
  sel.innerHTML = groups;
  sel.value = state.model;
  sel.addEventListener('change', e => {
    state.model = e.target.value;
    updateModelHint();
    renderActive();
  });
}

function updateModelHint() {
  const m = getModel(state.model);
  if (!m) return;
  const hint = $('#model-price-hint');
  const tier = m.inHigh ? `$${m.in}→$${m.inHigh}` : `$${m.in}`;
  hint.textContent = `Input ${tier}/M · Output $${m.out}/M`;
  hint.title = m.note || '';
}

/* ---------------- Compare selects ---------------- */
function populateCompareSelects() {
  const groups = Object.entries(PROVIDERS).map(([id, p]) => {
    const models = providerModels(id).map(m =>
      `<option value="${m.id}">${m.name}</option>`).join('');
    return `<optgroup label="${p.name}">${models}</optgroup>`;
  }).join('');
  ['compare-model-a', 'compare-model-b', 'compare-model-c'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.innerHTML = groups;
    el.value = state.compareModels[i];
    el.addEventListener('change', () => {
      state.compareModels[i] = el.value;
      renderActive();
    });
  });
}

/* ---------------- Tabs ---------------- */
function switchTab(tab) {
  state.tab = tab;
  $$('.seg-btn').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
  });
  $$('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-pane-' + tab));
  const adv = $('#advanced');
  adv.style.display = (tab === 'text' || tab === 'manual') ? '' : 'none';
  renderActive();
}

/* ---------------- Compute per tab ---------------- */
function currentModel() {
  return getModel(state.model);
}

function advancedOptions() {
  return {
    batch: $('#adv-batch').checked,
    reasoningEffort: $('#adv-reasoning').value,
    cacheHitRate: parseInt($('#adv-cache').value) / 100
  };
}

function computeTextTab() {
  const m = currentModel();
  const inputTokens = Math.max(0, parseInt($('#token-estimate').dataset.tokens) || 0);
  const outputTokens = Math.max(0, parseInt($('#text-output-tokens').value) || 0);
  const result = Calculator.calculateFullCost({ input: inputTokens, output: outputTokens }, m, advancedOptions());
  return { model: m, result };
}

function computeManualTab() {
  const m = currentModel();
  const inputTokens = Math.max(0, parseInt($('#manual-input-tokens').value) || 0);
  const outputTokens = Math.max(0, parseInt($('#manual-output-tokens').value) || 0);
  const result = Calculator.calculateFullCost({ input: inputTokens, output: outputTokens }, m, advancedOptions());
  return { model: m, result };
}

function computeMultimodalTab() {
  const m = currentModel();
  const imgW = Math.max(1, parseInt($('#img-width').value) || 1);
  const imgH = Math.max(1, parseInt($('#img-height').value) || 1);
  const detail = $('#img-detail').value;
  const imgCount = Math.max(1, parseInt($('#img-count').value) || 1);
  const audioSec = Math.max(0, parseInt($('#audio-duration').value) || 0);
  const audioCount = Math.max(0, parseInt($('#audio-count').value) || 0);
  const outputTokens = Math.max(0, parseInt($('#mm-output-tokens').value) || 0);

  const img = Calculator.calculateImage(imgW, imgH, detail, m);
  const audio = Calculator.calculateAudio(audioSec, m);
  const inputTokens = img.tokens * imgCount + audio.tokens * audioCount;
  const result = Calculator.calculateFullCost(
    { input: inputTokens, output: outputTokens }, m,
    { batch: false, reasoningEffort: 'medium', cacheHitRate: 0 }
  );

  const note = [];
  if (!m.vision) note.push('This model does not accept images.');
  if (!m.audio) note.push('This model does not accept audio.');
  $('#mm-support-note').textContent = note.join(' ');
  $('#mm-support-note').style.color = note.length ? 'var(--warn)' : '';

  return { model: m, result, img, audio, imgCount, audioCount };
}

function computeMultiTurnTab() {
  const m = currentModel();
  const turns = Math.max(1, parseInt($('#mt-turns').value) || 1);
  const msgTokens = Math.max(1, parseInt($('#mt-msg-tokens').value) || 1);
  const mt = Calculator.calculateMultiTurn(turns, msgTokens, m, { batch: false, reasoningEffort: 'medium', cacheHitRate: 0 });
  $('#mt-note').textContent =
    `Total context pushed into the window across ${turns} turns: ${mt.totalInputTokens.toLocaleString()} tokens. ` +
    `Peak context ${mt.growth[mt.growth.length - 1].toLocaleString()} of ${m.contextWindow.toLocaleString()} window.`;
  return { model: m, mt, turns, msgTokens };
}

function computeCompareTab() {
  const inputTokens = Math.max(0, parseInt($('#compare-input-tokens').value) || 0);
  const outputTokens = Math.max(0, parseInt($('#compare-output-tokens').value) || 0);
  return state.compareModels.map((id, i) => {
    const m = getModel(id);
    const result = Calculator.calculateFullCost({ input: inputTokens, output: outputTokens }, m, { batch: false, reasoningEffort: 'medium', cacheHitRate: 0 });
    return { model: m, result, label: ['A', 'B', 'C'][i] };
  });
}

function computeRankingTab() {
  const inputTokens = Math.max(0, parseInt($('#rank-input-tokens').value) || 0);
  const outputTokens = Math.max(0, parseInt($('#rank-output-tokens').value) || 0);
  return allModels()
    .map(m => {
      const result = Calculator.calculateFullCost({ input: inputTokens, output: outputTokens }, m, { batch: false, reasoningEffort: 'medium', cacheHitRate: 0 });
      return { model: m, result };
    })
    .sort((a, b) => a.result.total - b.result.total);
}

/* ---------------- Formatting ---------------- */
function fmt(usd) {
  return formatMoney(usd, state.currency);
}
function fmtCompact(usd) {
  return formatCompact(usd, state.currency);
}

/* ---------------- Result rendering ---------------- */
function hero(usd, sub) {
  return `
    <div class="cost-hero">
      <span class="cost-label">Estimated cost</span>
      <div class="cost-value" data-cost="${usd}">${fmt(usd)}</div>
      <div class="cost-sub">${sub}</div>
    </div>`;
}

function stackedBar(parts) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  if (total <= 0) {
    return '<div class="bar"><div class="seg-cost" style="width:100%;background:var(--line-strong)"></div></div>';
  }
  const segs = parts.map(p => {
    const w = (Math.max(0, p.value) / total * 100).toFixed(1);
    return `<div class="seg-cost" style="width:${w}%;background:${p.color}" title="${p.label}: ${fmt(p.value)}"></div>`;
  }).join('');
  return `<div class="bar">${segs}</div>`;
}

function breakLine(label, detail, value, color, cls = '') {
  return `
    <div class="break-line">
      <span class="bl-label"><span class="bl-dot" style="background:${color}"></span>${label}</span>
      <span class="bl-val ${cls}">${detail} · ${value}</span>
    </div>`;
}

function resultActions() {
  return `
    <div class="result-actions">
      <button class="btn-pill primary sm" id="btn-copy">Copy summary</button>
      <button class="btn-pill secondary sm" id="btn-export-csv">CSV</button>
      <button class="btn-pill secondary sm" id="btn-export-json">JSON</button>
    </div>`;
}

function renderStandardResult(parts, total, sub, summaryObj) {
  const html = hero(total, sub)
    + stackedBar(parts)
    + '<div class="breakdown">' + parts.map(p => breakLine(
        p.label,
        p.detail,
        p.value < 0 ? '-' + fmt(-p.value) : fmt(p.value),
        p.color,
        p.value < 0 ? 'good' : ''
      )).join('') + '</div>'
    + resultActions();
  return { html, summaryObj };
}

/* ---------------- Main render ---------------- */
function renderResult() {
  const panel = $('#result');
  let html = '';
  let summaryObj = null;
  let chartPlan = { kind: null, title: 'Monthly cost', payload: null };

  const standardParts = result => {
    const parts = [
      { label: 'Input', value: result.inputCost, detail: result.tokens.input.toLocaleString(), color: 'var(--accent)' },
      { label: 'Output', value: result.visibleOutputCost, detail: result.tokens.output.toLocaleString(), color: 'var(--accent-2)' }
    ];
    if (result.tokens.reasoning > 0) {
      parts.push({ label: 'Reasoning', value: result.reasoningCost, detail: result.tokens.reasoning.toLocaleString(), color: 'var(--warn)' });
    }
    if (result.cacheSavings > 0) {
      parts.push({ label: 'Cache savings', value: -result.cacheSavings, detail: `${Math.round(result.cacheRate * 100)}% read hit`, color: 'var(--good)' });
    }
    return parts;
  };

  const stdSummary = (model, result) => ({
    tool: 'TokenCalc',
    generated: new Date().toISOString(),
    currency: state.currency,
    model: model.id,
    modelName: model.name,
    tokens: { input: result.tokens.input, output: result.tokens.output, reasoning: result.tokens.reasoning, effectiveOutput: result.tokens.effectiveOutput },
    batch: result.batch,
    cacheHitRate: result.cacheRate,
    cacheSavingsUSD: result.cacheSavings,
    unitPricesUSD: result.unitPrices,
    cost: { inputUSD: result.inputCost, outputUSD: result.outputCost, reasoningUSD: result.reasoningCost, totalUSD: result.total }
  });

  switch (state.tab) {
    case 'text': {
      const { model, result } = computeTextTab();
      const parts = standardParts(result);
      const r = renderStandardResult(parts, result.total, `${model.name} · ${result.tokens.input.toLocaleString()} in · ${result.tokens.effectiveOutput.toLocaleString()} out`, null);
      html = r.html; summaryObj = stdSummary(model, result);
      const dau = Math.max(1, parseInt($('#adv-dau').value) || 1);
      const labels = Array.from({ length: 12 }, (_, i) => 'M' + (i + 1));
      const mk = cost => {
        const m = cost * dau * 30.4375;
        return labels.map((_, i) => +(m * (i + 1)).toFixed(4));
      };
      chartPlan = {
        kind: 'projection', title: 'Monthly cost',
        payload: {
          labels,
          symbol: CURRENCIES[state.currency].symbol,
          series: [
            { label: 'Total', data: mk(result.total), color: 'ink', fill: false },
            { label: 'Input', data: mk(result.inputCost), color: '#0070f3', fill: true },
            { label: 'Output', data: mk(result.outputCost), color: '#29bc9b', fill: true }
          ]
        }
      };
      break;
    }
    case 'manual': {
      const { model, result } = computeManualTab();
      const parts = standardParts(result);
      const r = renderStandardResult(parts, result.total, `${model.name} · ${result.tokens.input.toLocaleString()} in · ${result.tokens.effectiveOutput.toLocaleString()} out`, null);
      html = r.html; summaryObj = stdSummary(model, result);
      const dau = Math.max(1, parseInt($('#adv-dau').value) || 1);
      const labels = Array.from({ length: 12 }, (_, i) => 'M' + (i + 1));
      const mk = cost => {
        const m = cost * dau * 30.4375;
        return labels.map((_, i) => +(m * (i + 1)).toFixed(4));
      };
      chartPlan = {
        kind: 'projection', title: 'Monthly cost',
        payload: {
          labels,
          symbol: CURRENCIES[state.currency].symbol,
          series: [
            { label: 'Total', data: mk(result.total), color: 'ink', fill: false },
            { label: 'Input', data: mk(result.inputCost), color: '#0070f3', fill: true },
            { label: 'Output', data: mk(result.outputCost), color: '#29bc9b', fill: true }
          ]
        }
      };
      break;
    }
    case 'multimodal': {
      const { model, result, img, audio, imgCount, audioCount } = computeMultimodalTab();
      const imageCost = (img.tokens * imgCount / 1e6) * result.unitPrices.input;
      const audioCost = (audio.tokens * audioCount / 1e6) * result.unitPrices.input;
      const parts = [
        { label: 'Images', value: imageCost, detail: (img.tokens * imgCount).toLocaleString() + ' tok', color: 'var(--accent)' },
        { label: 'Audio', value: audioCost, detail: (audio.tokens * audioCount).toLocaleString() + ' tok', color: 'var(--accent-2)' },
        { label: 'Text output', value: result.visibleOutputCost, detail: result.tokens.output.toLocaleString() + ' tok', color: 'var(--warn)' }
      ].filter(p => p.value > 0 || p.label === 'Images');
      const r = renderStandardResult(parts, result.total, `${model.name} · ${result.tokens.input.toLocaleString()} input tokens`, null);
      html = r.html;
      summaryObj = {
        tool: 'TokenCalc', generated: new Date().toISOString(), currency: state.currency,
        model: model.id, modelName: model.name,
        media: {
          image: { width: parseInt($('#img-width').value), height: parseInt($('#img-height').value), detail: $('#img-detail').value, count: imgCount, tokens: img.tokens * imgCount },
          audio: { durationSec: parseInt($('#audio-duration').value), count: audioCount, tokens: audio.tokens * audioCount }
        },
        outputTokens: result.tokens.output, totalInputTokens: result.tokens.input,
        totalUSD: result.total
      };
      chartPlan = { kind: null };
      break;
    }
    case 'multiturn': {
      const { model, mt } = computeMultiTurnTab();
      let inputCost = 0;
      for (const t of mt.turns) {
        const inOnly = Calculator.calculateTextCost({ input: t.contextTokens, output: 0 }, model, {});
        inputCost += inOnly.total;
      }
      const parts = [
        { label: 'All input traffic', value: inputCost, detail: mt.totalInputTokens.toLocaleString() + ' tok', color: 'var(--accent)' },
        { label: 'All output', value: mt.totalCost - inputCost, detail: mt.totalOutputTokens.toLocaleString() + ' tok', color: 'var(--accent-2)' }
      ];
      const r = renderStandardResult(parts, mt.totalCost, `${model.name} · ${mt.totalTurns} turns · peak ${mt.growth[mt.growth.length - 1].toLocaleString()} ctx`, null);
      html = r.html;
      summaryObj = {
        tool: 'TokenCalc', generated: new Date().toISOString(), currency: state.currency,
        model: model.id, modelName: model.name,
        turns: mt.totalTurns, avgMsgTokens: parseInt($('#mt-msg-tokens').value) || 1,
        totalInputTokens: mt.totalInputTokens, totalOutputTokens: mt.totalOutputTokens,
        peakContextTokens: mt.growth[mt.growth.length - 1], totalUSD: mt.totalCost
      };
      chartPlan = {
        kind: 'growth',
        title: 'Context growth',
        payload: { labels: mt.turns.map(t => 'T' + t.turn), data: mt.turns.map(t => t.contextTokens) }
      };
      break;
    }
    case 'compare': {
      const results = computeCompareTab();
      const best = Math.min(...results.map(r => r.result.total));
      const cards = results.map(r => `
        <div class="cc ${r.result.total === best ? 'best' : ''}">
          ${r.result.total === best ? '<span class="cc-badge">Cheapest</span>' : ''}
          <div class="cc-name"><span class="bl-dot" style="background:${getProvider(r.model.provider).color}"></span>${r.model.name}</div>
          <div class="cc-cost">${fmt(r.result.total)}</div>
          <div class="cc-meta">${r.result.tokens.input.toLocaleString()} in · ${r.result.tokens.effectiveOutput.toLocaleString()} out</div>
        </div>`).join('');
      html = `<div class="compare-cards">${cards}</div>` + resultActions();
      summaryObj = {
        tool: 'TokenCalc', generated: new Date().toISOString(), currency: state.currency,
        inputTokens: parseInt($('#compare-input-tokens').value) || 0,
        outputTokens: parseInt($('#compare-output-tokens').value) || 0,
        models: results.map(r => ({ id: r.model.id, name: r.model.name, totalUSD: r.result.total })),
        totalUSD: best
      };
      chartPlan = {
        kind: 'compare',
        title: 'Cost per request',
        payload: {
          models: results.map(r => r.model),
          data: results.map(r => +r.result.total.toFixed(6)),
          colors: results.map(r => getProvider(r.model.provider).color)
        }
      };
      break;
    }
    case 'ranking': {
      const rows = computeRankingTab();
      const best = rows[0];
      const medal = ['🥇', '🥈', '🥉'];
      const rowsHtml = rows.map((r, i) => `
        <div class="rank-row ${i < 3 ? 'rank-top' : ''}">
          <span class="rank-no">${medal[i] || (i + 1)}</span>
          <span class="bl-dot" style="background:${getProvider(r.model.provider).color}"></span>
          <span class="rank-name">${r.model.name}</span>
          <span class="rank-meta mono">$${r.model.in} / $${r.model.out}·M</span>
          <span class="rank-cost">${fmt(r.result.total)}</span>
        </div>`).join('');
      html = `
        <div class="rank-podium">
          <div class="rank-hero">
            <span class="eyebrow">Cheapest for this workload</span>
            <div class="rank-hero-name">${best.model.name}</div>
            <div class="rank-hero-cost">${fmt(best.result.total)}</div>
            <div class="rank-hero-meta">${best.result.tokens.input.toLocaleString()} in · ${best.result.tokens.effectiveOutput.toLocaleString()} out</div>
          </div>
        </div>
        <div class="rank-list">${rowsHtml}</div>` + resultActions();
      summaryObj = {
        tool: 'TokenCalc', generated: new Date().toISOString(), currency: state.currency,
        inputTokens: parseInt($('#rank-input-tokens').value) || 0,
        outputTokens: parseInt($('#rank-output-tokens').value) || 0,
        models: rows.map(r => ({ id: r.model.id, name: r.model.name, totalUSD: r.result.total })),
        cheapest: best.model.id,
        cheapestUSD: best.result.total
      };
      chartPlan = {
        kind: 'ranking',
        title: 'All models by cost',
        payload: {
          rows,
          symbol: CURRENCIES[state.currency].symbol
        }
      };
      break;
    }
  }

  panel.innerHTML = html;
  window.__summary = summaryObj;
  window.__chartPlan = chartPlan;

  const nameEl = $('#result-model-name');
  if (nameEl) {
    nameEl.textContent = state.tab === 'compare'
      ? '3 models'
      : state.tab === 'ranking'
        ? 'All models ranked'
        : getModel(state.model)?.name || '';
  }
}

/* ---------------- Charts ---------------- */
function renderCharts() {
  const plan = window.__chartPlan || { kind: null };
  const card = $('#chart-card');
  const box = $('.chart-box');
  if (!plan.kind || !Charts.ready()) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  if (box) box.classList.toggle('tall', plan.kind === 'ranking');
  $('#chart-title').textContent = plan.title;
  const legend = $('#chart-legend');
  if (legend) {
    legend.innerHTML = (plan.payload.series || []).map(s =>
      `<span class="lg-item"><span class="lg-dot" style="background:${s.color === 'ink' ? getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#171717' : s.color}"></span>${s.label}</span>`
    ).join('');
  }
  Charts.renderMain(plan.kind, plan.payload);
}

function renderActive() {
  renderResult();
  renderCharts();
  animateCost();
}

/* ---------------- Hero cost animation ---------------- */
function animateCost() {
  const el = $('.cost-value');
  if (!el) return;
  const target = parseFloat(el.dataset.cost || 0);
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmt(target);
    return;
  }
  if (el.__anim) cancelAnimationFrame(el.__anim);
  const start = performance.now();
  const duration = 350;
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) el.__anim = requestAnimationFrame(step);
  };
  el.__anim = requestAnimationFrame(step);
}

/* ---------------- Text helpers ---------------- */
function updateTextEstimate() {
  const m = currentModel();
  const text = $('#text-input').value;
  const est = Tokenizers.estimateTokensSmart(text, m.tokenizer);
  $('#token-estimate').dataset.tokens = est.tokens;
  $('#token-estimate').textContent = `≈ ${est.tokens.toLocaleString()} tokens`;
  renderActive();
}

/* ---------------- Event wiring ---------------- */
function wireEvents() {
  $('#theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    toast(state.theme === 'dark' ? 'Dark mode on' : 'Light mode on');
    renderCharts();
  });

  $('#currency-select').addEventListener('change', e => {
    state.currency = e.target.value;
    applyCurrency();
    toast('Currency: ' + state.currency);
  });

  $$('.seg-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  $('#text-input').addEventListener('input', updateTextEstimate);
  $('#text-output-tokens').addEventListener('input', () => renderActive());
  $('#sample-btn').addEventListener('click', () => {
    $('#text-input').value = SAMPLE_TEXT;
    updateTextEstimate();
    toast('Sample text loaded');
  });
  $('#file-upload').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await Tokenizers.extractTextFromFile(file);
      $('#text-input').value = text;
      updateTextEstimate();
      toast(`Loaded ${file.name} (${text.length.toLocaleString()} chars)`);
    } catch (err) {
      toast(err.message, 'error');
    }
    e.target.value = '';
  });

  $('#manual-input-tokens').addEventListener('input', () => renderActive());
  $('#manual-output-tokens').addEventListener('input', () => renderActive());

  ['#img-width', '#img-height', '#img-count', '#audio-duration', '#audio-count', '#mm-output-tokens'].forEach(id => {
    $(id).addEventListener('input', () => renderActive());
  });
  $('#img-detail').addEventListener('change', () => renderActive());

  $('#mt-turns').addEventListener('input', () => {
    $('#mt-turns-val').textContent = $('#mt-turns').value;
    renderActive();
  });
  $('#mt-msg-tokens').addEventListener('input', () => renderActive());

  $('#compare-input-tokens').addEventListener('input', () => renderActive());
  $('#compare-output-tokens').addEventListener('input', () => renderActive());

  $('#rank-input-tokens').addEventListener('input', () => renderActive());
  $('#rank-output-tokens').addEventListener('input', () => renderActive());

  $('#adv-batch').addEventListener('change', () => renderActive());
  $('#adv-reasoning').addEventListener('change', () => renderActive());
  $('#adv-cache').addEventListener('input', () => {
    $('#adv-cache-val').textContent = $('#adv-cache').value + '%';
    renderActive();
  });
  $('#adv-dau').addEventListener('input', () => renderActive());

  $('#result').addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'btn-export-csv') {
      const rows = collectExportRows();
      if (rows.length) { Exporter.exportCSV(rows, 'tokencalc'); toast('CSV downloaded'); }
    } else if (id === 'btn-export-json') {
      if (window.__summary) { Exporter.exportJSON(window.__summary, 'tokencalc'); toast('JSON downloaded'); }
    } else if (id === 'btn-copy') {
      const text = buildSummaryText();
      Exporter.copyText(text, 'Copied').then(ok => toast(ok ? 'Summary copied' : 'Copy failed', ok ? '' : 'error'));
    }
  });

  window.addEventListener('resize', () => renderCharts());
}

/* ---------------- Export helpers ---------------- */
function collectExportRows() {
  const s = window.__summary;
  if (!s) return [];
  if (state.tab === 'ranking') {
    return (s.models || []).map((m, i) => ({
      'Rank': i + 1, Model: m.name, 'Total cost': formatMoney(m.totalUSD, state.currency),
      'Input tokens': s.inputTokens, 'Output tokens': s.outputTokens
    }));
  }
  if (state.tab === 'compare') {
    return (s.models || []).map(m => ({
      Model: m.name, 'Total cost': formatMoney(m.totalUSD, state.currency),
      'Input tokens': $('#compare-input-tokens').value, 'Output tokens': $('#compare-output-tokens').value
    }));
  }
  if (state.tab === 'multiturn') {
    return [{
      Model: s.modelName, 'Turns': s.turns, 'Avg msg tokens': s.avgMsgTokens,
      'Total input tokens': s.totalInputTokens, 'Total output tokens': s.totalOutputTokens,
      'Peak context': s.peakContextTokens, 'Total cost': formatMoney(s.totalUSD, state.currency)
    }];
  }
  if (state.tab === 'multimodal') {
    return [{
      Model: s.modelName,
      'Image tokens': s.media.image.tokens, 'Audio tokens': s.media.audio.tokens,
      'Total input tokens': s.totalInputTokens, 'Output tokens': s.outputTokens,
      'Total cost': formatMoney(s.totalUSD, state.currency)
    }];
  }
  return [{
    Model: s.modelName,
    'Input tokens': s.tokens.input, 'Output tokens': s.tokens.output,
    'Reasoning tokens': s.tokens.reasoning,
    'Input cost': formatMoney(s.cost.inputUSD, state.currency),
    'Output cost': formatMoney(s.cost.outputUSD, state.currency),
    'Reasoning cost': formatMoney(s.cost.reasoningUSD, state.currency),
    'Cache savings': formatMoney(s.cacheSavingsUSD, state.currency),
    'Total cost': formatMoney(s.totalUSD, state.currency),
    'Batch': s.batch ? 'yes' : 'no', 'Cache hit %': Math.round(s.cacheHitRate * 100)
  }];
}

function buildSummaryText() {
  const s = window.__summary;
  if (!s) return '';
  const lines = ['TokenCalc summary', `Model: ${s.modelName}`];
  if (s.tokens) {
    lines.push(`Input tokens: ${s.tokens.input}`);
    lines.push(`Output tokens: ${s.tokens.output}`);
    if (s.tokens.reasoning) lines.push(`Reasoning tokens: ${s.tokens.reasoning}`);
  }
  if (s.turns) lines.push(`Turns: ${s.turns}`, `Total input tokens: ${s.totalInputTokens}`);
  if (s.media) lines.push(`Image tokens: ${s.media.image.tokens}`, `Audio tokens: ${s.media.audio.tokens}`);
  lines.push(`Total cost: ${fmt(s.totalUSD ?? s.total)}`);
  return lines.join('\n');
}

/* ---------------- Init ---------------- */
function init() {
  if (window.__tokencalcInit) return;
  window.__tokencalcInit = true;

  state.theme = localStorage.getItem('tokencalc-theme') || 'light';
  state.currency = localStorage.getItem('tokencalc-currency') || 'USD';
  applyTheme();
  $('#currency-select').value = state.currency;
  window.__cur = CURRENCIES[state.currency].symbol;

  const lastUpdated = allModels()
    .map(m => m.updated)
    .filter(Boolean)
    .sort()
    .pop() || new Date().toISOString().slice(0, 10);
  $('#footer-updated').textContent = new Date(lastUpdated + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const navU = $('#nav-updated');
  if (navU) navU.textContent = 'PRICES VERIFIED ' + $('#footer-updated').textContent.toUpperCase();

  populateModelSelect();
  populateCompareSelects();
  updateModelHint();
  wireEvents();
  updateTextEstimate();
  renderActive();
}

function bootstrap() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
bootstrap();

export { init, state, buildSummaryText, collectExportRows }; // eslint-disable-line no-unused-vars