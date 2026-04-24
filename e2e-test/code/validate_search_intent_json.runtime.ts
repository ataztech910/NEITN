const response = $input.first().json;
function fail(message) { throw new Error('Validate Search Intent JSON: ' + message); }
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

const aliases = {
  'problem diagnosis': 'problem_diagnosis',
  problem_diagnosis: 'problem_diagnosis',
  diagnosis: 'problem_diagnosis',
  'finding specialist': 'finding_specialist',
  finding_specialist: 'finding_specialist',
  specialist: 'finding_specialist',
  'booking service': 'booking_service',
  booking_service: 'booking_service',
  booking: 'booking_service',
  'learning how to do something': 'learning_how_to_do',
  'learning how to do': 'learning_how_to_do',
  learning_how_to_do: 'learning_how_to_do',
  learning: 'learning_how_to_do',
  'buying product': 'buying_product',
  buying_product: 'buying_product',
  buying: 'buying_product',
};
const rawIntent = String(parsed.search_intent ?? '').trim().toLowerCase();
parsed.search_intent = aliases[rawIntent] ?? rawIntent.replace(/[\s-]+/g, '_');
const allowed = ['problem_diagnosis', 'finding_specialist', 'booking_service', 'learning_how_to_do', 'buying_product'];
if (!allowed.includes(parsed.search_intent)) fail('search_intent must be one of: ' + allowed.join(', '));

if (typeof parsed.intent_description !== 'string' || !parsed.intent_description.trim()) {
  parsed.intent_description = 'Dominant market search intent for the original user idea.';
}
if (typeof parsed.search_persona !== 'string' || !parsed.search_persona.trim()) {
  parsed.search_persona = 'A real buyer or user searching for help with the problem.';
}
for (const field of ['must_include', 'must_exclude']) {
  if (!Array.isArray(parsed[field])) parsed[field] = [];
  parsed[field] = parsed[field].map((value) => String(value).trim()).filter(Boolean).slice(0, 8);
}

const idea = String($('Normalize Input').first().json.input.idea ?? '').toLowerCase();
const repairSignals = ['ремонт', 'прораб', 'renov', 'repair', 'handwerker', 'сан', 'электрик', 'стро', 'bau', 'wohnung', 'specialist'];
if (repairSignals.some((signal) => idea.includes(signal)) && parsed.search_intent === 'booking_service') {
  parsed.search_intent = 'problem_diagnosis';
  parsed.intent_description = 'User needs to understand the repair or renovation problem and which specialist or first step is needed.';
  parsed.must_exclude = [...new Set([...parsed.must_exclude, 'booking appointments', 'consultation booking'])];
}

const base = $('Idea Framing').first().json;
return [{ json: { ...base, search_intent: parsed } }];
