import { measurementZScore } from './whoZScores.js'
import en from '../locales/en/translations.js'

export const WHO_WARNING_SOURCE = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/software/anthro-pc-manual-v322.pdf?sfvrsn=c4e76522_2'
export const WHO_WARNING_RULES = {
  weightKg: { lower: -6, upper: 5, id: 'WHO-ANTHRO-3.4.2-WAZ' },
  heightCm: { lower: -6, upper: 6, id: 'WHO-ANTHRO-3.4.2-HAZ' },
  headCircumferenceCm: { lower: -5, upper: 5, id: 'WHO-ANTHRO-3.4.2-HCZ' },
}

// Messages are translated at the boundary; no diagnosis or automatic rejection.
export function evaluateGrowthMeasurement(dataset, child, measurement, metric, t = (key) => en.growth[key.split('.')[1]]) {
  const result = measurementZScore(dataset, child, measurement, metric)
  if (!result) return { status: 'unavailable', zScore: null, warning: null }
  const rule = WHO_WARNING_RULES[metric]
  const implausible = result.zScore < rule.lower || result.zScore > rule.upper
  const review = result.zScore < -3 || result.zScore > 3
  const category = implausible ? 'potential_error' : 'clinical_review'
  const messageKey = implausible ? 'growth.warningPotentialError' : 'growth.warningClinicalReview'
  return {
    status: 'evaluated', ...result,
    warning: review ? {
      measurementType: metric, category, severity: implausible ? 'warning' : 'caution',
      messageKey, message: t(messageKey), source: WHO_WARNING_SOURCE,
      ruleId: implausible ? rule.id : 'WHO-ANTHRO-3.4.2-REVIEW-3SD',
    } : null,
  }
}
