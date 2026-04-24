const item = $input.first();
const body = item.json.body ?? item.json;
for (const field of ['idea', 'region', 'language']) {
  if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
    throw new Error('Normalize Input: missing required field ' + field);
  }
}
function normalizeSeoLanguage(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw.split(/[-_]/)[0];
}
function deriveSeoLanguage(region) {
  const normalized = String(region ?? '').trim().toLowerCase();
  const compact = normalized.replace(/\s+/g, ' ');
  const mapping = [
    { matches: ['austria', 'österreich', 'osterreich'], code: 'de' },
    { matches: ['germany', 'deutschland'], code: 'de' },
    { matches: ['switzerland', 'schweiz', 'suisse'], code: 'de' },
    { matches: ['france'], code: 'fr' },
    { matches: ['usa', 'united states', 'united states of america', 'us'], code: 'en' },
    { matches: ['uk', 'united kingdom', 'great britain', 'england'], code: 'en' },
  ];
  for (const entry of mapping) {
    if (entry.matches.some((match) => compact === match || compact.includes(match))) return entry.code;
  }
  return 'en';
}
const provider = String(body.provider ?? body.llm_provider ?? 'claude').trim().toLowerCase();
if (!['claude', 'ollama'].includes(provider)) {
  throw new Error('Normalize Input: provider must be claude or ollama');
}
const modelRaw = body.model ?? body.llm_model ?? '';
let model = String(modelRaw).trim() || (provider === 'ollama' ? 'mistral:instruct' : 'claude-sonnet-4-6');
const modelAliases = { 'mistral:7b-instruct': 'mistral:instruct', 'mistral:latest': 'mistral:instruct' };
model = modelAliases[model] ?? model;
const region = String(body.region).trim();
const seoLanguage = normalizeSeoLanguage(body.seo_language ?? body.seoLanguage) || deriveSeoLanguage(region);
const input = {
  idea: String(body.idea).trim(),
  region,
  language: String(body.language).trim(),
  seo_language: seoLanguage,
  request_id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10),
  received_at: new Date().toISOString(),
};
const ollamaHost = String(body.ollama_host ?? body.ollamaHost ?? 'http://host.docker.internal:11434').trim().replace(/\/$/, '');
return [{ json: { input, llm: { provider, model, ollama_host: ollamaHost } } }];
