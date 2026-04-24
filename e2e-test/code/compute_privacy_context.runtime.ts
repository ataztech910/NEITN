const previous = $input.first().json;
const input = previous?.input ?? {};
const product = previous?.product ?? {};

const region = String(input.region ?? '').toLowerCase();
const ideaText = String(input.idea ?? '').toLowerCase();
const category = String(product?.product_summary?.category ?? '').toLowerCase();
const combined = ideaText + ' ' + category;

const gdprRegions = ['austria', 'germany', 'france', 'italy', 'spain', 'portugal', 'netherlands', 'belgium', 'poland', 'sweden', 'norway', 'denmark', 'finland', 'ireland', 'eu', 'european union'];
let applicableRegimes = [];
if (gdprRegions.some((name) => region.includes(name))) applicableRegimes.push('GDPR');
if (region.includes('uk') || region.includes('united kingdom') || region.includes('britain')) applicableRegimes.push('UK GDPR');
if (region.includes('switzerland')) applicableRegimes.push('FADP');
applicableRegimes = [...new Set(applicableRegimes)];

const handlesPersonalData = /(software|marketplace|local service|booking|telegram|bot|webapp|consult|beratung|appointment|customer|user)/.test(combined) || applicableRegimes.length > 0;
const usesThirdParties = /(ai|telegram|bot|marketplace|software|webapp|platform|payment|stripe|paypal)/.test(combined);
const hasPayments = /(payment|pay|billing|checkout|stripe|paypal|оплат|платеж)/.test(combined);
const hasSensitiveSignals = /(medical|health|therapy|patient|child|children|kid|kids|school)/.test(combined);

const requiredActions = [];
if (applicableRegimes.length > 0 || handlesPersonalData) {
  requiredActions.push('privacy policy');
  requiredActions.push('data flow mapping');
}
if (usesThirdParties) {
  requiredActions.push('vendor review');
  requiredActions.push('processor contracts');
}
if (hasPayments) requiredActions.push('payment flow review');
requiredActions.splice(0, requiredActions.length, ...new Set(requiredActions));

const riskFlags = [];
if (handlesPersonalData) riskFlags.push('personal_data_processing');
if (usesThirdParties) riskFlags.push('third_party_processors');
if (hasPayments) riskFlags.push('payment_data_flow');
if (hasSensitiveSignals) riskFlags.push('sensitive_data_risk');

let launchStatus = 'clear';
if (hasSensitiveSignals && applicableRegimes.length > 0) launchStatus = 'high_risk';
else if (applicableRegimes.length > 0 || riskFlags.length > 0) launchStatus = 'caution';

return [{
  json: {
    ...previous,
    privacy_context: {
      status: applicableRegimes.length > 0 || riskFlags.length > 0 ? 'ok' : 'limited_signal',
      applicable_regimes: applicableRegimes,
      launch_status: launchStatus,
      required_actions: requiredActions,
      risk_flags: riskFlags,
      assessment_note: 'Heuristic only. Not legal advice.',
    },
  },
}];
