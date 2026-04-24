const previous = $input.first().json;
const market = previous?.market_insights ?? {};

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

if (market.status !== 'ok' || !Number.isFinite(Number(market.estimated_cpl))) {
  return [{
    json: {
      ...previous,
      roi_estimate: {
        status: 'insufficient_data',
      },
    },
  }];
}

const estimatedCpl = Number(market.estimated_cpl);
const marketType = String(market.market_type ?? 'unknown');
const leadValueByType = {
  informational: 40,
  mixed: 80,
  transactional: 120,
};
const leadValueEstimate = leadValueByType[marketType] ?? 60;
const roiRatio = round(leadValueEstimate / estimatedCpl, 2);

let roiScore = 1;
if (roiRatio >= 3) roiScore = 5;
else if (roiRatio >= 2) roiScore = 4;
else if (roiRatio >= 1.2) roiScore = 3;
else if (roiRatio >= 0.8) roiScore = 2;

const verdict = roiScore >= 4 ? 'promising' : roiScore >= 3 ? 'borderline' : 'weak';

return [{
  json: {
    ...previous,
    roi_estimate: {
      status: 'ok',
      lead_value_estimate: leadValueEstimate,
      estimated_cpl: estimatedCpl,
      roi_ratio: roiRatio,
      roi_score: roiScore,
      verdict,
    },
  },
}];
