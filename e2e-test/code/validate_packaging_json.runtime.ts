const response = $input.first().json;
function fail(message) { throw new Error('Validate Packaging JSON: ' + message); }
function textFromLlm(res) {
  if (typeof res === 'string') return res;
  if (typeof res?.content?.[0]?.text === 'string') return res.content[0].text;
  if (typeof res?.message?.content === 'string') return res.message.content;
  if (typeof res?.response === 'string') return res.response;
  fail('missing LLM text response at Anthropic content[0].text or Ollama message.content');
}
let packaging;
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
packaging = parseStrictJson(textFromLlm(response), fail);
if (!packaging || typeof packaging !== 'object' || Array.isArray(packaging)) fail('root must be an object');
if (typeof packaging.core_value !== 'string' || !packaging.core_value.trim()) fail('core_value must be a non-empty string');
if (!Array.isArray(packaging.angles) || packaging.angles.length < 3 || packaging.angles.length > 5) fail('angles must contain 3 to 5 items');
const seoHeat = ['low', 'medium', 'high'];
const recommendations = ['reject', 'test', 'prefer'];
for (const [index, angle] of packaging.angles.entries()) {
  for (const field of ['name', 'audience_hint', 'problem_statement', 'differentiation']) {
    if (typeof angle?.[field] !== 'string' || !angle[field].trim()) fail('angles[' + index + '].' + field + ' must be a non-empty string');
  }
  if (!seoHeat.includes(angle.seo_heat)) fail('angles[' + index + '].seo_heat must be low, medium, or high');
  if (!recommendations.includes(angle.recommendation)) fail('angles[' + index + '].recommendation must be reject, test, or prefer');
}
if (typeof packaging.selected_angle?.name !== 'string' || !packaging.selected_angle.name.trim()) fail('selected_angle.name must be a non-empty string');
if (typeof packaging.selected_angle?.why !== 'string' || !packaging.selected_angle.why.trim()) fail('selected_angle.why must be a non-empty string');
if (typeof packaging.repackaging_needed !== 'boolean') fail('repackaging_needed must be boolean');
const base = $('Normalize Market Insights').first().json;
return [{ json: { ...base, packaging } }];
