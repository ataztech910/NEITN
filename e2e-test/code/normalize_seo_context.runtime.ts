const response = $input.first().json;
const previous = $('Validate SEO Keywords JSON').first().json;

const results = [];
for (const task of response?.tasks ?? []) {
  for (const item of task?.result ?? []) {
    if (!item || typeof item !== 'object') continue;
    results.push({
      keyword: item.keyword,
      search_volume: Number(item.search_volume ?? 0),
      competition: item.competition ?? null,
      competition_index: item.competition_index === null || item.competition_index === undefined ? null : Number(item.competition_index),
      cpc: item.cpc === null || item.cpc === undefined ? null : Number(item.cpc),
    });
  }
}

const seedKeywords = Array.isArray(previous.seo_keywords?.keywords)
  ? previous.seo_keywords.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
  : [];
const seedKeywordCount = seedKeywords.length;
const totalSearchVolume = results.reduce((sum, item) => sum + (Number.isFinite(item.search_volume) ? item.search_volume : 0), 0);
const maxSearchVolume = results.reduce((max, item) => Math.max(max, Number.isFinite(item.search_volume) ? item.search_volume : 0), 0);
const zeroVolumeResultCount = results.filter((item) => !Number.isFinite(item.search_volume) || item.search_volume === 0).length;
const competitionValues = results.map((item) => item.competition_index).filter((value) => Number.isFinite(value));
const averageCompetitionIndex = competitionValues.length
  ? Math.round(competitionValues.reduce((sum, value) => sum + value, 0) / competitionValues.length)
  : null;

function demandLevel(total, max, resultCount, seedCount) {
  if (seedCount > 0 && (resultCount === 0 || total === 0)) return 'unknown';
  if (seedCount > 0 && total < 100 && resultCount < 5) return 'unknown';
  if (total >= 10000 || max >= 3000) return 'high';
  if (total >= 1000 || max >= 300) return 'medium';
  return 'low';
}

function competitionLevel(avg, resultCount) {
  if (resultCount === 0 || !Number.isFinite(avg)) return 'unknown';
  if (avg >= 65) return 'high';
  if (avg >= 35) return 'medium';
  return 'low';
}

const top_keywords = results
  .slice()
  .sort((a, b) => b.search_volume - a.search_volume)
  .slice(0, 5);

const demand_level = demandLevel(totalSearchVolume, maxSearchVolume, results.length, seedKeywordCount);
const competition_level = competitionLevel(averageCompetitionIndex, results.length);
const data_status = demand_level === 'unknown'
  ? 'insufficient_or_zero_volume_suggestions'
  : 'suggestions_with_volume';

const seo_context = {
  keywords: seedKeywords,
  demand_level,
  competition_level,
  data_status,
  source_endpoint: 'keywords_data/google_ads/keywords_for_keywords/live',
  seed_keyword_count: seedKeywordCount,
  rejected_seed_keywords: previous.seo_keywords?.rejected_keywords ?? [],
  search_intent: previous.search_intent,
  total_search_volume: totalSearchVolume,
  max_search_volume: maxSearchVolume,
  average_competition_index: averageCompetitionIndex,
  keyword_count: results.length,
  zero_volume_result_count: zeroVolumeResultCount,
  top_keywords,
};

return [{ json: { ...previous, dataforseo_raw: response, seo_context } }];
