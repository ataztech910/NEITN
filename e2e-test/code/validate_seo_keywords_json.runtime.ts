const response = $input.first().json;
function fail(message) { throw new Error('Validate SEO Keywords JSON: ' + message); }
function textFromLlm(res) {
  if (typeof res === 'string') return res;
  if (typeof res?.content?.[0]?.text === 'string') return res.content[0].text;
  if (typeof res?.message?.content === 'string') return res.message.content;
  if (typeof res?.response === 'string') return res.response;
  fail('missing LLM text response at Anthropic content[0].text or Ollama message.content');
}
function extractJsonText(text) {
  const raw = String(text ?? '').trim();
  const fenced = raw.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return candidate;
  return candidate.slice(start, end + 1);
}
let parsed;
try {
  parsed = JSON.parse(extractJsonText(textFromLlm(response)));
} catch (error) {
  fail('LLM returned invalid JSON: ' + error.message);
}
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('root must be an object');
if (!Array.isArray(parsed.keywords)) fail('keywords must be an array');
const rawKeywords = [...new Set(parsed.keywords.map((keyword) => String(keyword).trim()).filter(Boolean))].slice(0, 12);
const seoLanguage = String($('Normalize Input').first().json.input.seo_language ?? '').toLowerCase();
const forbiddenPatterns = [
  /google\s*ads/i,
  /keyword/i,
  /dataforseo/i,
  /search\s*volume/i,
  /seo\s*tool/i,
  /api\s*provider/i,
  /marketing\s*tool/i,
  /\b(ai|ki|künstliche\s+intelligenz|artificial\s+intelligence)\b/i,
  /\b(startup|saas|platform|plattform|software|webapp)\b/i,
  /wie\s+(erstelle|programmiere|entwickle|baue)\s+(ich\s+)?(einen\s+|eine\s+)?(telegram\s+)?(bot|app|software|webapp)/i,
  /(telegram\s+bot|bot|app|software|webapp)\s+(erstellen|programmieren|entwickeln|bauen)/i,
  /\b(api|github|source\s*code|code\s*beispiel|tutorial|entwickler|developer|programmieren|coding)\b/i,
  /\bhow\s+to\s+(build|create|code|program|develop)\b/i,
  /\b(build|create|code|program|develop)\s+(a\s+|an\s+)?(telegram\s+)?(bot|app|software|webapp)\b/i,
];
function hasWrongScript(keyword) {
  const text = String(keyword);
  const hasCyrillic = /[\u0400-\u04FF]/u.test(text);
  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(text);
  const hasArabic = /[\u0600-\u06FF]/u.test(text);
  const hasGreek = /[\u0370-\u03FF]/u.test(text);
  if (['de', 'en', 'fr'].includes(seoLanguage)) return hasCyrillic || hasCjk || hasArabic || hasGreek;
  return false;
}
function hasMixedLatinAndCjk(keyword) {
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(keyword) && /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(keyword);
}
function looksEnglish(keyword) {
  const text = String(keyword).toLowerCase();
  return /\b(find|for|with|near|best|who|what|when|where|which|how|need|repair|renovation|contractor|electrician|plumber|wall|remove|removal|apartment|specialist|service|book|booking|pay|online)\b/i.test(text);
}
function looksGerman(keyword) {
  const text = String(keyword).toLowerCase();
  return /\b(welche|welcher|welchen|wer|was|wann|wo|wie|brauche|handwerker|renovierung|sanierung|wohnung|wand|entfernen|elektriker|installateur|zuerst|finden|wien|kosten|reihenfolge|termin|buchen|beratung|bezahlen|coach|konsultation)\b/i.test(text) || /[äöüß]/i.test(text);
}
function looksFrench(keyword) {
  const text = String(keyword).toLowerCase();
  return /\b(quel|quelle|qui|quoi|comment|où|trouver|réserver|payer|service|artisan|électricien|plombier|rénovation|appartement|conseil|consultation)\b/i.test(text) || /[àâçéèêëîïôûùüÿœ]/i.test(text);
}
function hasWrongLanguage(keyword) {
  if (seoLanguage === 'de') return looksEnglish(keyword) || looksFrench(keyword);
  if (seoLanguage === 'fr') return looksEnglish(keyword) || looksGerman(keyword);
  if (seoLanguage === 'en') return looksGerman(keyword) || looksFrench(keyword);
  return false;
}
function hasWrongPlace(keyword) {
  const region = String($('Normalize Input').first().json.input.region ?? '').toLowerCase();
  if (region.includes('austria') || region.includes('österreich') || region.includes('osterreich')) {
    return /\b(venice|venedig|venezia)\b/i.test(keyword);
  }
  return false;
}
function isRejected(keyword) {
  return forbiddenPatterns.some((pattern) => pattern.test(keyword))
    || hasWrongScript(keyword)
    || hasMixedLatinAndCjk(keyword)
    || hasWrongLanguage(keyword)
    || hasWrongPlace(keyword);
}
const rejected_keywords = rawKeywords.filter(isRejected);
const keywords = rawKeywords.filter((keyword) => !isRejected(keyword)).slice(0, 8);
if (keywords.length < 5) {
  fail('too few usable same-language human problem-intent keywords after filtering technical/mixed-language/wrong-language queries. Rejected: ' + rejected_keywords.join(', '));
}
const base = $('Validate Search Intent JSON').first().json;
return [{ json: { ...base, seo_keywords: { keywords, rejected_keywords } } }];
