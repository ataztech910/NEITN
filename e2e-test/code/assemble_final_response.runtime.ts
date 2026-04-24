const data = $input.first().json;
const finalDecision = data.final_decision;
return [{
  json: {
    input: data.input,
    llm: data.llm,
    idea_classification: data.idea_classification,
    seo_context: data.seo_context,
    market_insights: data.market_insights ?? { status: 'insufficient_data' },
    roi_estimate: data.roi_estimate ?? { status: 'insufficient_data' },
    privacy_context: data.privacy_context ?? { status: 'limited_signal', applicable_regimes: [], launch_status: 'clear', required_actions: [], risk_flags: [] },
    packaging: data.packaging,
    product: data.product,
    validation: finalDecision.synthetic_validation,
    result: {
      decision: finalDecision.decision,
      confidence: finalDecision.confidence,
      reasoning: finalDecision.reasoning,
      action_plan: finalDecision.action_plan,
    },
    repackage_options: finalDecision.repackage_options ?? [],
  },
}];
