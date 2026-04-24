const response = $input.first().json;
function fail(message) { throw new Error('Validate Final Decision JSON: ' + message); }
function textFromLlm(res) {
  if (typeof res === 'string') return res;
  if (typeof res?.content?.[0]?.text === 'string') return res.content[0].text;
  if (typeof res?.message?.content === 'string') return res.message.content;
  if (typeof res?.response === 'string') return res.response;
  fail('missing LLM text response at Anthropic content[0].text or Ollama message.content');
}
let finalDecision;
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
finalDecision = parseStrictJson(textFromLlm(response), fail);
if (!finalDecision || typeof finalDecision !== 'object' || Array.isArray(finalDecision)) fail('root must be an object');
const validation = finalDecision.synthetic_validation;
if (!validation || typeof validation !== 'object' || Array.isArray(validation)) fail('synthetic_validation must be an object');
for (const field of ['pain_intensity', 'clarity_of_value', 'regional_fit']) {
  if (!Number.isInteger(validation[field]) || validation[field] < 1 || validation[field] > 10) fail('synthetic_validation.' + field + ' must be an integer from 1 to 10');
}
if (typeof validation.commentary !== 'string' || !validation.commentary.trim()) fail('synthetic_validation.commentary must be a non-empty string');
if (!['GO', 'NO_GO', 'REPACKAGE'].includes(finalDecision.decision)) fail('decision must be GO, NO_GO, or REPACKAGE');
if (typeof finalDecision.confidence !== 'number' || finalDecision.confidence < 0 || finalDecision.confidence > 1) fail('confidence must be a number from 0 to 1');
if (!Array.isArray(finalDecision.reasoning) || finalDecision.reasoning.length === 0) fail('reasoning must be a non-empty array');
for (const [index, reason] of finalDecision.reasoning.entries()) {
  if (typeof reason !== 'string' || !reason.trim()) fail('reasoning[' + index + '] must be a non-empty string');
}
if (!Array.isArray(finalDecision.action_plan) || finalDecision.action_plan.length === 0) fail('action_plan must be a non-empty array');
for (const [index, item] of finalDecision.action_plan.entries()) {
  if (!Number.isInteger(item?.week) || item.week < 1 || item.week > 3) fail('action_plan[' + index + '].week must be an integer from 1 to 3');
  if (typeof item.goal !== 'string' || !item.goal.trim()) fail('action_plan[' + index + '].goal must be a non-empty string');
  if (!Array.isArray(item.tasks) || item.tasks.length === 0) fail('action_plan[' + index + '].tasks must be a non-empty array');
  for (const [taskIndex, task] of item.tasks.entries()) {
    if (typeof task !== 'string' || !task.trim()) fail('action_plan[' + index + '].tasks[' + taskIndex + '] must be a non-empty string');
  }
}
if (!Array.isArray(finalDecision.repackage_options)) finalDecision.repackage_options = [];
if (finalDecision.decision !== 'REPACKAGE') {
  finalDecision.repackage_options = [];
} else {
  if (finalDecision.repackage_options.length < 2 || finalDecision.repackage_options.length > 3) fail('repackage_options must contain 2 to 3 items when decision is REPACKAGE');
  const required = ['label', 'what_changes', 'new_icp', 'new_positioning', 'why_better'];
  for (const [index, option] of finalDecision.repackage_options.entries()) {
    if (!option || typeof option !== 'object' || Array.isArray(option)) fail('repackage_options[' + index + '] must be an object');
    for (const field of required) {
      if (typeof option[field] !== 'string' || !option[field].trim()) fail('repackage_options[' + index + '].' + field + ' must be a non-empty string');
    }
    if (!Array.isArray(option.tradeoffs) || option.tradeoffs.length === 0) fail('repackage_options[' + index + '].tradeoffs must be a non-empty array');
    for (const [tradeoffIndex, tradeoff] of option.tradeoffs.entries()) {
      if (typeof tradeoff !== 'string' || !tradeoff.trim()) fail('repackage_options[' + index + '].tradeoffs[' + tradeoffIndex + '] must be a non-empty string');
    }
    if (!Array.isArray(option.test_next) || option.test_next.length === 0) fail('repackage_options[' + index + '].test_next must be a non-empty array');
    for (const [testIndex, test] of option.test_next.entries()) {
      if (typeof test !== 'string' || !test.trim()) fail('repackage_options[' + index + '].test_next[' + testIndex + '] must be a non-empty string');
    }
  }
}
const previous = $('Compute Privacy Context').first().json;
return [{ json: { ...previous, final_decision: finalDecision } }];
