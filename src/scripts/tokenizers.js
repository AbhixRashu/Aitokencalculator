/* ============================================================
 * tokenizers.js — Tokenizer engines
 * Pure JS estimation engines based on character ratios, with
 * script detection so CJK/Arabic/Hindi text tokenizes sensibly.
 * Where an exact count matters, wire in a real tokenizer —
 * these estimates are accurate to ~±5% for common English text.
 * ============================================================ */

import { TOKENIZER_TYPES } from './models.js';

/* ------- Script detection ------- */

const SCRIPT_REGEX = {
  cjk:    /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/,
  arabic: /[\u0600-\u06ff\u0750-\u077f]/,
  deva:   /[\u0900-\u097f]/,
  hebrew: /[\u0590-\u05ff]/,
  cyrillic: /[\u0400-\u04ff]/
};

function detectScript(text) {
  let cjk = 0, arabic = 0, deva = 0, cyrillic = 0, latin = 0, other = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (!isNaN(code) && code > 127) {
      if (SCRIPT_REGEX.cjk.test(ch)) cjk++;
      else if (SCRIPT_REGEX.arabic.test(ch)) arabic++;
      else if (SCRIPT_REGEX.deva.test(ch)) deva++;
      else if (SCRIPT_REGEX.cyrillic.test(ch)) cyrillic++;
      else other++;
    } else {
      latin++;
    }
  }
  const total = text.length || 1;
  const result = { cjk, arabic, deva, cyrillic, latin, other, total: text.length };
  result.cjkRatio = cjk / total;
  result.arabicRatio = arabic / total;
  result.devaRatio = deva / total;
  result.cyrillicRatio = cyrillic / total;
  return result;
}

/* ------- Core estimation ------- */

// Tokenize by a tokenizer type (e.g. 'o200k', 'anthropic').
function estimateTokens(text, tokenizerType) {
  if (!text) return 0;
  const ratio = TOKENIZER_TYPES[tokenizerType]?.charsPerToken || TOKENIZER_TYPES.cl100k.charsPerToken;
  const script = detectScript(text);

  // Compute an effective chars-per-token by blending ratios proportional
  // to script distribution, then divide.
  const blend = script.cjkRatio * ratio.cjk
              + script.arabicRatio * ratio.arabic
              + script.devaRatio * ratio.deva
              + script.cyrillicRatio * ratio.latin   // cyrillic ≈ latin density
              + (1 - script.cjkRatio - script.arabicRatio - script.devaRatio) * ratio.latin;

  const effective = blend || ratio.latin;
  return Math.max(1, Math.round(text.length / effective));
}

/* "Is this code?" heuristic — indentation-heavy, symbol-heavy text. */
function looksLikeCode(text) {
  if (!text) return false;
  const sample = text.slice(0, 4000);
  const symbolCount = (sample.match(/[{}()[\];=<>+*\/&|!?:.]/g) || []).length;
  const symbolRatio = symbolCount / Math.max(1, sample.length);
  const indented = (sample.match(/\n[ \t]+/g) || []).length;
  return (symbolRatio > 0.12 && indented > 8) || (symbolRatio > 0.2);
}

// Smart estimate that detects code vs prose vs CJK.
function estimateTokensSmart(text, tokenizerType) {
  if (!text) return { tokens: 0, script: 'latin', mode: 'prose' };
  const ratio = TOKENIZER_TYPES[tokenizerType]?.charsPerToken || TOKENIZER_TYPES.cl100k.charsPerToken;
  const script = detectScript(text);
  const isCode = looksLikeCode(text);

  let charsPerToken = ratio.latin;
  let dominant = 'latin';
  if (script.cjkRatio > 0.3) { charsPerToken = ratio.cjk; dominant = 'cjk'; }
  else if (script.arabicRatio > 0.3) { charsPerToken = ratio.arabic; dominant = 'arabic'; }
  else if (script.devaRatio > 0.3) { charsPerToken = ratio.deva; dominant = 'deva'; }
  if (isCode) { charsPerToken = ratio.code; dominant = dominant === 'latin' ? 'code' : dominant; }

  const tokens = Math.max(1, Math.round(text.length / charsPerToken));
  return { tokens, script: dominant, mode: isCode ? 'code' : 'prose' };
}

/* ------- Rule-of-thumb converters ------- */

// 1 English word ≈ 1.3 tokens (OpenAI rule of thumb).
function wordsToTokens(words, tokenizerType) {
  const ratio = TOKENIZER_TYPES[tokenizerType]?.charsPerToken || TOKENIZER_TYPES.cl100k.charsPerToken;
  return Math.round(words * (ratio.latin / 3.1));
}
function charsToTokens(chars, tokenizerType) {
  const ratio = TOKENIZER_TYPES[tokenizerType]?.charsPerToken || TOKENIZER_TYPES.cl100k.charsPerToken;
  return Math.max(1, Math.round(chars / ratio.latin));
}
// Standard rule: 1 page ≈ 500 words ≈ 650 tokens.
function pagesToTokens(pages, tokenizerType) {
  return wordsToTokens(pages * 500, tokenizerType);
}

// Generic converter dispatched by unit.
function convertToTokens(value, unit, tokenizerType) {
  switch (unit) {
    case 'words':  return wordsToTokens(value, tokenizerType);
    case 'chars':  return Math.max(1, Math.round(value / 4)); // plain ASCII rule of thumb
    case 'pages':  return pagesToTokens(value, tokenizerType);
    case 'tokens': return value;
    default:       return value;
  }
}

/* ------- File reading ------- */

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function extractTextFromFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') ||
      file.type === 'text/plain' || file.type === 'text/csv') {
    return readFileAsText(file);
  }
  if (name.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  throw new Error('Unsupported file type. Upload .txt, .csv, .md or .pdf.');
}

// PDF extraction via pdf.js CDN (lazy-loaded).
async function extractTextFromPDF(file) {
  const w = typeof window !== 'undefined' ? window : null;
  if (!w?.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js';
          resolve();
        } else reject(new Error('Failed to load PDF.js'));
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  const maxPages = Math.min(pdf.numPages, 100);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(' ') + '\n';
  }
  return text;
}

export const Tokenizers = {
  detectScript,
  estimateTokens,
  estimateTokensSmart,
  looksLikeCode,
  wordsToTokens,
  charsToTokens,
  pagesToTokens,
  convertToTokens,
  extractTextFromFile
};