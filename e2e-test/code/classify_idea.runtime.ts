const data = $input.first().json;
const text = [data.input.idea, data.input.region, data.input.language].join(' ').toLowerCase();

function hasAny(words) {
  return words.some((word) => text.includes(word));
}

let idea_type = 'mixed';
const signals = [];

if (hasAny(['saas', 'software', 'app', 'platform', 'api', 'dashboard', 'automation', 'workflow', 'ai ', 'ki ', 'agent'])) {
  signals.push('software');
}
if (hasAny(['marketplace', 'booking', 'directory', 'two-sided', 'two sided', 'aggregator'])) {
  signals.push('marketplace');
}
if (hasAny(['course', 'newsletter', 'community', 'template', 'ebook', 'content', 'info product'])) {
  signals.push('info_product');
}
if (hasAny(['local', 'service', 'delivery', 'party', 'event', 'repair', 'cleaning', 'installation', 'birthday', 'children', 'детск', 'праздник', 'доставка', 'услуг'])) {
  signals.push('local_service');
}
if (hasAny(['product', 'ecommerce', 'shop', 'store', 'retail', 'balloon', 'helium', 'шар', 'гелиев'])) {
  signals.push('physical_product');
}

if (signals.includes('marketplace')) idea_type = 'marketplace';
else if (signals.includes('software')) idea_type = 'software';
else if (signals.includes('physical_product') && signals.includes('local_service')) idea_type = 'mixed';
else if (signals.includes('physical_product')) idea_type = 'physical_product';
else if (signals.includes('local_service')) idea_type = 'local_service';
else if (signals.includes('info_product')) idea_type = 'info_product';

const idea_classification = {
  idea_type,
  detected_signals: [...new Set(signals)],
  category_preservation_rule: 'Analyze the user idea in this category. Do not convert it into SaaS, AI assistant, startup tooling, or decision-support software unless the input explicitly says so.'
};

return [{ json: { ...data, idea_classification } }];
