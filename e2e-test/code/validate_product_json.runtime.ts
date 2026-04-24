const response = $input.first().json;
function fail(message) { throw new Error('Validate Product JSON: ' + message); }
function textFromLlm(res) {
  if (typeof res === 'string') return res;
  if (typeof res?.content?.[0]?.text === 'string') return res.content[0].text;
  if (typeof res?.message?.content === 'string') return res.message.content;
  if (typeof res?.response === 'string') return res.response;
  fail('missing LLM text response at Anthropic content[0].text or Ollama message.content');
}
let product;
function extractJsonText(text) {
  const raw = String(text ?? '').trim();
  const fenced = raw.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return candidate;
  return candidate.slice(start, end + 1);
}
function parseStrictJson(text, fail) {
  const candidate = extractJsonText(text);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const preview = candidate.slice(0, 500).replace(/\s+/g, ' ');
    fail('LLM returned invalid JSON: ' + error.message + '. Preview: ' + preview);
  }
}
product = parseStrictJson(textFromLlm(response), fail);
function getAt(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
function setAt(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
}
function stringAt(obj, path) {
  const value = getAt(obj, path);
  if (typeof value !== 'string' || !value.trim()) fail(path + ' must be a non-empty string');
}
function defaultStringAt(obj, path, value) {
  const current = getAt(obj, path);
  if (typeof current !== 'string' || !current.trim()) setAt(obj, path, value);
}
if (!product || typeof product !== 'object' || Array.isArray(product)) fail('root must be an object');
product.product_summary = product.product_summary && typeof product.product_summary === 'object' ? product.product_summary : {};
product.primary_icp = product.primary_icp && typeof product.primary_icp === 'object' ? product.primary_icp : {};
defaultStringAt(product, 'product_summary.monetization_hint', 'Unknown: requires validation through willingness-to-pay tests.');
for (const path of ['product_summary.category', 'product_summary.job_to_be_done', 'product_summary.value_proposition', 'primary_icp.segment', 'primary_icp.pain', 'primary_icp.trigger', 'primary_icp.buying_motivation', 'primary_icp.region_fit']) stringAt(product, path);
if (!Array.isArray(product.secondary_icp)) fail('secondary_icp must be an array');
for (const [index, icp] of product.secondary_icp.entries()) {
  if (typeof icp?.segment !== 'string' || !icp.segment.trim()) fail('secondary_icp[' + index + '].segment must be a non-empty string');
  if (typeof icp?.pain !== 'string' || !icp.pain.trim()) fail('secondary_icp[' + index + '].pain must be a non-empty string');
}
if (!Array.isArray(product.risks) || product.risks.length === 0) fail('risks must be a non-empty array');
for (const [index, risk] of product.risks.entries()) {
  if (typeof risk !== 'string' || !risk.trim()) fail('risks[' + index + '] must be a non-empty string');
}
const previous = $('Validate Packaging JSON').first().json;
return [{ json: { ...previous, product } }];
