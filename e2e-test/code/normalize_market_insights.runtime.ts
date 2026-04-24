const previous = $('Normalize SEO Context').first().json;
const cpcResponse = $('DataForSEO CPC Competition').first().json;
const serpResponse = $input.first().json;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseDomain(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./, '').toLowerCase();
  }
}

function extractDomain(item) {
  return parseDomain(item?.domain) || parseDomain(item?.url) || parseDomain(item?.breadcrumb);
}

function extractText(item) {
  return [item?.title, item?.description, item?.pre_snippet, item?.url, item?.domain]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();
}

function classifyPage(item) {
  const domain = extractDomain(item);
  const text = extractText(item);
  const combined = domain + ' ' + text;

  if (/(reddit\.com|quora\.com|stackexchange\.com|forum|community|gutefrage|discuss)/.test(combined)) return 'forum';
  if (/(yelp\.|thumbtack\.|angi\.|houzz\.|checkatrade\.|myhammer\.|trustpilot\.|tripadvisor\.|yellowpages\.|capterra\.|g2\.|booking\.|airbnb\.|amazon\.|etsy\.|ebay\.)/.test(domain)) return 'marketplace';
  if (/(directory|marketplace|listing|compare|comparison|reviews|best|top\s*\d|anbieter|vergleich|preise\s+vergleichen|rankings)/.test(combined)) return 'aggregator';
  if (/(blog|guide|tips|article|news|academy|learn|wiki|magazin|magazine|insights|resources|how\s+to|was\s+ist|what\s+is|why)/.test(combined)) return 'blog';
  if (/(service|services|repair|plumber|electrician|agency|consulting|beratung|installateur|handwerker|contact|quote|pricing|book|appointment|termin|buchen)/.test(combined)) return 'service';
  return 'brand';
}

function marketTypeFromKeywords(keywords, searchIntent) {
  const joined = keywords.join(' ').toLowerCase();
  const transactionalPatterns = [
    /\bbuy\b/, /\bhire\b/, /\bservice\b/, /near\s+me/, /\bbook\b/, /\bbooking\b/, /\bprice\b/, /\bquote\b/, /\bfind\b/, /\bfinder\b/, /\bagency\b/, /\bappointment\b/, /\bconsultation\b/,
    /\bkaufen\b/, /\bservice\b/, /\btermin\b/, /\bbuchen\b/, /\bfinden\b/, /\bhandwerker\b/, /\binstallateur\b/, /\belektriker\b/,
    /\bacheter\b/, /\bservice\b/, /près\s+de\s+moi/, /\bréserver\b/, /\bdevis\b/
  ];
  const informationalPatterns = [
    /\bhow\b/, /\bwhat\b/, /\bwhy\b/, /\bwhen\b/, /\bwhich\b/, /\bguide\b/, /\btips\b/,
    /\bwie\b/, /\bwas\b/, /\bwarum\b/, /\bwann\b/, /\bwelche[nrsm]?\b/, /\breihenfolge\b/, /\bzuerst\b/,
    /\bcomment\b/, /\bquoi\b/, /\bpourquoi\b/, /\bquand\b/, /\bquel(?:le)?\b/
  ];

  let transactionalHits = transactionalPatterns.reduce((sum, pattern) => sum + (pattern.test(joined) ? 1 : 0), 0);
  let informationalHits = informationalPatterns.reduce((sum, pattern) => sum + (pattern.test(joined) ? 1 : 0), 0);

  if (['buying_product', 'booking_service', 'finding_specialist'].includes(searchIntent)) transactionalHits += 2;
  if (searchIntent === 'learning_how_to_do') informationalHits += 2;
  if (searchIntent === 'problem_diagnosis') informationalHits += 1;

  if (transactionalHits > 0 && informationalHits === 0) return 'transactional';
  if (informationalHits > 0 && transactionalHits === 0) return 'informational';
  if (transactionalHits > informationalHits && ['buying_product', 'booking_service', 'finding_specialist'].includes(searchIntent)) return 'transactional';
  if (informationalHits > transactionalHits && searchIntent === 'learning_how_to_do') return 'informational';
  return 'mixed';
}

function audienceProfile(keywords, idea, marketType) {
  const joined = keywords.join(' ') + ' ' + String(idea ?? '');
  const normalized = joined.toLowerCase();
  if (/(emergency|urgent|sofort|notfall|leak|water\s+damage|burst|stromausfall|rohrbruch)/.test(normalized)) {
    return 'Urgent buyers trying to solve a time-sensitive problem quickly';
  }
  if (/(diy|selber|selbst|anleitung|tutorial|how\s+to|guide)/.test(normalized) && marketType !== 'transactional') {
    return 'Low-budget users researching how to handle the problem themselves before paying';
  }
  if (/(renov|repair|wohnung|haus|home|apartment|wall|electric|plumb|handwerker|sanier|artisan|travaux|maison)/.test(normalized)) {
    return 'Homeowners dealing with renovation or repair decisions';
  }
  if (/(book|booking|appointment|consult|beratung|termin|buchung|reserve|consultation|rendez)/.test(normalized)) {
    return 'Service buyers comparing options and getting ready to book';
  }
  if (/(saas|pricing|crm|lead|revops|b2b|software)/.test(normalized)) {
    return 'Commercial buyers comparing tools with active budget intent';
  }
  if (marketType === 'transactional') return 'Users with active purchase intent who are comparing providers or solutions';
  if (marketType === 'informational') return 'Users researching the problem and clarifying what to do next';
  return 'Users moving from early research into provider or solution comparison';
}

const keywords = Array.isArray(previous?.seo_context?.keywords)
  ? previous.seo_context.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
  : [];
const searchIntent = String(previous?.seo_context?.search_intent?.search_intent ?? previous?.seo_context?.search_intent ?? 'unknown');

const cpcRows = [];
for (const task of cpcResponse?.tasks ?? []) {
  for (const item of task?.result ?? []) {
    if (!item || typeof item !== 'object') continue;
    cpcRows.push({
      keyword: String(item.keyword ?? '').trim(),
      cpc: finiteNumber(item.cpc),
      competition: item.competition ?? null,
      competition_index: finiteNumber(item.competition_index),
    });
  }
}
const cpcValues = cpcRows.map((item) => item.cpc).filter((value) => Number.isFinite(value));
const competitionValues = cpcRows.map((item) => item.competition_index).filter((value) => Number.isFinite(value));

const serpItems = [];
for (const task of serpResponse?.tasks ?? []) {
  for (const result of task?.result ?? []) {
    for (const item of result?.items ?? []) {
      if (item && typeof item === 'object') serpItems.push(item);
    }
  }
}

const adsPresence = serpItems.some((item) => {
  const type = String(item?.type ?? '').toLowerCase();
  return type.includes('paid') || type.includes('shopping') || type === 'ad' || item?.is_paid === true;
});

const organicSerp = serpItems.filter((item) => {
  const type = String(item?.type ?? '').toLowerCase();
  return !type.includes('paid') && !type.includes('shopping') && type !== 'ad';
}).slice(0, 10);

if (!keywords.length || cpcValues.length === 0 || organicSerp.length === 0) {
  return [{
    json: {
      ...previous,
      dataforseo_google_ads_raw: cpcResponse,
      dataforseo_serp_raw: serpResponse,
      market_insights: {
        status: 'insufficient_data',
      },
    },
  }];
}

const avgCpc = round(cpcValues.reduce((sum, value) => sum + value, 0) / cpcValues.length, 2);
const avgCompetitionIndex = competitionValues.length
  ? round(competitionValues.reduce((sum, value) => sum + value, 0) / competitionValues.length, 0)
  : finiteNumber(previous?.seo_context?.average_competition_index);
const classifiedSerp = organicSerp.map((item) => ({
  domain: extractDomain(item),
  type: classifyPage(item),
})).filter((item) => item.domain);
const uniqueDomains = [...new Set(classifiedSerp.map((item) => item.domain))].slice(0, 10);
const typeCounts = classifiedSerp.reduce((acc, item) => {
  acc[item.type] = (acc[item.type] ?? 0) + 1;
  return acc;
}, {});
const strongDomains = ['amazon', 'etsy', 'ebay', 'booking', 'airbnb', 'tripadvisor', 'checkatrade', 'thumbtack', 'angi', 'houzz', 'myhammer', 'yelp', 'capterra', 'g2'];
const strongHits = classifiedSerp.filter((item) => strongDomains.some((domain) => item.domain.includes(domain)) || item.type === 'marketplace' || item.type === 'aggregator').length;
const forumHits = typeCounts.forum ?? 0;
const blogHits = typeCounts.blog ?? 0;
const serviceHits = typeCounts.service ?? 0;
const lowQualityHits = classifiedSerp.filter((item) => /(blogspot|wordpress|wixsite|tumblr|freeforums)/.test(item.domain)).length;

let serpStrength = 'medium';
if (strongHits >= 5 || (typeCounts.marketplace ?? 0) + (typeCounts.aggregator ?? 0) >= 4) {
  serpStrength = 'strong';
} else if (forumHits >= 3 || lowQualityHits >= 3) {
  serpStrength = 'weak';
} else if (blogHits >= 2 && serviceHits >= 2) {
  serpStrength = 'medium';
}

const marketType = marketTypeFromKeywords(keywords, searchIntent);
const incomeProxy = avgCpc < 1 ? 'low' : avgCpc < 3 ? 'medium' : avgCpc < 10 ? 'medium-high' : 'high';
const conversionRate = marketType === 'transactional' ? 0.075 : marketType === 'informational' ? 0.02 : 0.045;
const estimatedCpl = round(avgCpc / conversionRate, 0);

let competitionScore = 0;
if (avgCpc >= 10) competitionScore += 3;
else if (avgCpc >= 3) competitionScore += 2;
else if (avgCpc >= 1) competitionScore += 1;
if (Number.isFinite(avgCompetitionIndex)) {
  if (avgCompetitionIndex >= 65) competitionScore += 3;
  else if (avgCompetitionIndex >= 35) competitionScore += 2;
  else if (avgCompetitionIndex >= 15) competitionScore += 1;
}
if (serpStrength === 'strong') competitionScore += 2;
else if (serpStrength === 'medium') competitionScore += 1;
if (adsPresence) competitionScore += 1;
const competitionLevel = competitionScore >= 6 ? 'high' : competitionScore >= 3 ? 'medium' : 'low';

const market_insights = {
  status: 'ok',
  audience_profile: audienceProfile(keywords, previous?.input?.idea, marketType),
  market_type: marketType,
  income_proxy: incomeProxy,
  avg_cpc: avgCpc,
  estimated_conversion_rate: conversionRate,
  estimated_cpl: estimatedCpl,
  competition_level: competitionLevel,
  serp_strength: serpStrength,
  ads_presence: adsPresence,
  top_domains: uniqueDomains,
};

return [{
  json: {
    ...previous,
    dataforseo_google_ads_raw: cpcResponse,
    dataforseo_serp_raw: serpResponse,
    market_insights,
  },
}];
