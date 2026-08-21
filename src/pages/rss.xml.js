import rss from '@astrojs/rss';
import { COMPARISONS } from '../data/comparisons.js';
import { MODELS } from '../scripts/models.js';
import { getModel } from '../scripts/models.js';

const DATE = '2026-08-21';

const guideItems = [
  {
    link: '/guides/what-are-ai-tokens/',
    title: 'What Are AI Tokens? Token Counting Explained',
    description: 'Tokens are the units AI models read and bill by — what they are, how they convert to words, and why they decide cost.'
  },
  {
    link: '/guides/prompt-caching/',
    title: 'Prompt Caching Guide — Save 50–90% on LLM API Costs',
    description: 'How prompt caching works across OpenAI, Anthropic, Google and DeepSeek, with real price math.'
  },
  {
    link: '/guides/reduce-llm-api-costs/',
    title: 'How to Reduce LLM API Costs — 10 Tactics That Actually Work',
    description: 'Model right-sizing, caching, batching, output caps and more, ranked by effort-to-savings ratio.'
  },
  {
    link: '/guides/context-window-comparison/',
    title: 'AI Context Window Comparison — Every Model Ranked',
    description: 'Context window sizes for 51 AI models with words, pages and codefiles that fit at each size.'
  },
  {
    link: '/methodology/',
    title: 'Methodology — How We Estimate Tokens & Verify Pricing',
    description: 'Our token estimation profiles, cost formulas, data sources and limitations.'
  }
];

const vsItems = COMPARISONS.map(({ a, b, note }) => {
  const A = MODELS[a], B = MODELS[b];
  return {
    link: `/vs/${a}-vs-${b}/`,
    title: `${A.name} vs ${B.name} — Pricing & Cost Comparison`,
    description: note.split('.')[0] + '.'
  };
});

export function GET(context) {
  return rss({
    title: 'AITokenCalculator — AI Token & Cost Guides',
    description: 'Guides, pricing references and model comparisons for LLM developers.',
    site: context.site,
    items: [...guideItems, ...vsItems].map((i) => ({ ...i, pubDate: new Date(DATE) })),
    customData: '<language>en-us</language>'
  });
}
