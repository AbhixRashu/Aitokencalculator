/* Curated high-value model matchup pages for /vs/[pair]/
 * Each entry generates a static, fully-written comparison page.
 * note = unique analyst take shown on that page (avoids thin content). */

export const COMPARISONS = [
  {
    a: 'gpt-4o', b: 'claude-sonnet-4-6',
    note: 'The default flagship showdown. OpenAI wins on price and ecosystem breadth; Claude typically wins on long-document reasoning, coding quality and safer refusals. Teams doing RAG over big corpora lean Claude; product teams needing multimodal + wide tooling lean GPT-4o.'
  },
  {
    a: 'gpt-4o', b: 'gemini-2-0-flash',
    note: 'Speed-vs-depth trade. Gemini Flash is dramatically cheaper and faster for high-volume pipelines (classification, extraction, chat); GPT-4o holds an edge on nuanced reasoning and complex instruction following. Many teams run Flash for 90% of traffic and escalate hard cases.'
  },
  {
    a: 'gpt-4o', b: 'o3',
    note: 'Generalist vs reasoner. o3 spends hidden reasoning tokens to solve math, science and planning problems GPT-4o fumbles — but every reasoning token is billed as output, so costs can balloon. Use o3 selectively behind a router; default to GPT-4o for conversation and summarization.'
  },
  {
    a: 'gpt-4o-mini', b: 'gemini-2-5-flash',
    note: 'The budget workhorses. Both are priced for scale; Gemini Flash usually offers the larger context window for document-heavy jobs, while GPT-4o mini matches OpenAI tooling and batch discounts. For pure cost-per-token at volume, check the scenarios below — margins are thin.'
  },
  {
    a: 'claude-sonnet-4-6', b: 'gemini-3-1-pro',
    note: 'Long-context specialists. Gemini Pro brings the bigger window for whole-repository or multi-file analysis; Claude Sonnet counters with stronger instruction adherence and code editing. If your prompts exceed 200K tokens the choice makes itself.'
  },
  {
    a: 'deepseek-v4-pro', b: 'gpt-4o',
    note: 'The value play. DeepSeek undercuts frontier pricing by multiples while remaining competitive on coding and math benchmarks — with automatic caching that makes repetitive workloads nearly free. Trade-offs: smaller ecosystem, and data-residency policies differ from US providers.'
  },
  {
    a: 'claude-opus-5', b: 'gpt-4o',
    note: 'Premium intelligence vs balanced cost. Opus-class models are the strongest reasoners Anthropic ships and price accordingly — expect several times GPT-4o\u2019s output bill. Reserve it for agentic workflows and hard analysis where failure cost exceeds token cost.'
  },
  {
    a: 'grok-4-6', b: 'gpt-4o',
    note: 'xAI\u2019s challenger against the incumbent. Grok competes on raw capability and real-time knowledge from X; OpenAI answers with maturity, tooling and enterprise compliance. Pricing shifts often here — verify current rates before committing either way.'
  },
  {
    a: 'llama-3-1-405b', b: 'gpt-4o',
    note: 'Open weights vs closed API. Hosted Llama 405B undercuts GPT-4o on price and removes vendor lock-in — you can even self-host. Expect a gap on multimodal polish and tool-calling reliability; strong pick for text-heavy, cost-sensitive pipelines.'
  },
  {
    a: 'kimi-k3', b: 'claude-sonnet-4-6',
    note: 'Moonshot\u2019s flagship against Claude\u2019s workhorse. Kimi aggressively prices long-context tasks and handles very large inputs well; Claude remains the safer bet for production coding assistants and nuanced writing. Worth benchmarking on your own evals before switching.'
  }
];
