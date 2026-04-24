const data = $input.first().json;
const analyzer_guardrails = {
  analyzer_role: 'idea evaluation pipeline',
  analyzed_object: 'the user business idea in input.idea',
  separation_rule: 'The analyzer is NOT the product being analyzed. Do not reinterpret the user idea as this workflow, an idea-to-plan system, a decision-support engine, or an AI product strategist unless the input explicitly says so.',
  category_preservation: [
    'If the user idea is a physical product, keep it as a physical product.',
    'If the user idea is a local service, keep it as a local service.',
    'If the user idea is ecommerce, marketplace, offline business, or event service, keep that category.',
    'Do not transform physical/offline ideas into SaaS, AI assistant, decision engine, or software product unless explicitly implied by the input.'
  ],
  output_focus: [
    'packaging and repositioning of the user idea',
    'product breakdown of the user idea',
    'behavioral ICP for the user idea',
    'lightweight validation of the user idea',
    'go/no-go decision for the user idea',
    'test-first action plan for the user idea'
  ],
  forbidden_drift: [
    'analyzing the analyzer itself',
    'generic digital transformation',
    'generic AI for organizations',
    'defaulting to founders, indie makers, or consultants when the idea is a consumer/local/physical business',
    'inventing schools, hospitals, or government agencies unless explicitly implied'
  ],
  scoring_policy: {
    default_stance: 'skeptical',
    high_score_rule: 'Scores 8-10 require explicit evidence from the idea itself.',
    confidence_cap_without_evidence: 0.75
  }
};
return [{ json: { ...data, analyzer_guardrails } }];
