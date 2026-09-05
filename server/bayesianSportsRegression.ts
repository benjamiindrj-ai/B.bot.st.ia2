/**
 * Server-side Bayesian Sports Regression Module
 * Mirrors src/utils/bayesianSportsRegression.ts for zero-overhead backend processing.
 */

export const MIN_BAYESIAN_ODDS = 1.15;
export const MAX_BAYESIAN_ODDS = 1.85;
export const HIGH_CONFIDENCE_THRESHOLD = 75; // Confidence > 75%
export const BAYESIAN_ALERT_CONFIDENCE_THRESHOLD = 80; // Confidence > 80% (Alerte Visuelle Cible)

export interface BayesianSportsRegressionResult {
  odds: number;
  posteriorWinProbability: number;
  credibleIntervalLow: number;
  credibleIntervalHigh: number;
  bayesianConfidenceScore: number;
  bayesianExpectedValue: number;
  unviggedFairOdds: number;
  marketImpliedProb: number;
  bayesianEdgePct: number;
  isOddsValid: boolean;
  isHighConfidence: boolean;
  isAlertOver80?: boolean;
  isQualified: boolean;
  priorityRank: number;
  filterStatus: 'qualified_top_priority' | 'qualified_standard' | 'rejected_odds_too_low' | 'rejected_odds_too_high' | 'rejected_confidence_low';
  rejectionReason?: string;
  coefficients: {
    priorWeight: number;
    sharpBenchmarkWeight: number;
    xgPoissonWeight: number;
    microstructureWeight: number;
    trendMomentumWeight: number;
  };
  recommendedKellyFractionPct: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, x))));
}

function logit(p: number): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return Math.log(clamped / (1 - clamped));
}

export function runBayesianSportsRegression(params: {
  odds: number;
  confidenceScore: number;
  expectedValue?: number;
  market?: string;
  aiEstimatedTrueProbability?: number;
  bookmakerImpliedProbability?: number;
  droppingOddsAlert?: any;
  sharpBenchmark?: any;
  advancedMetrics?: any;
  poissonModelScore?: any;
  marketMicrostructure?: any;
}): BayesianSportsRegressionResult {
  const odds = Number(params.odds) || 1.50;
  const rawConfidence = Number(params.confidenceScore) || 75;

  const isOddsTooLow = odds < MIN_BAYESIAN_ODDS;
  const isOddsTooHigh = odds > MAX_BAYESIAN_ODDS;
  const isOddsValid = !isOddsTooLow && !isOddsTooHigh;

  const marketMargin = 0.032;
  const marketImpliedProb = Number(((1 / odds) * 100).toFixed(1));
  const unviggedPriorProb = Math.min(0.95, Math.max(0.05, (1 / odds) / (1 + marketMargin)));
  const priorLogit = logit(unviggedPriorProb);
  const priorVariance = 0.18;

  let xSharp = 0;
  if (params.sharpBenchmark?.pinnacleOdds) {
    const pinProb = 1 / params.sharpBenchmark.pinnacleOdds;
    const stakeProb = 1 / odds;
    xSharp = Math.max(-1.5, Math.min(1.5, (pinProb - stakeProb) * 6));
  } else if (params.expectedValue !== undefined) {
    xSharp = Math.max(-1.5, Math.min(1.5, (params.expectedValue - 4) * 0.12));
  }

  let xPoisson = 0;
  if (params.aiEstimatedTrueProbability) {
    const aiProb = params.aiEstimatedTrueProbability / 100;
    xPoisson = Math.max(-2.0, Math.min(2.0, (aiProb - unviggedPriorProb) * 5));
  }

  let xMicro = 0;
  if (params.marketMicrostructure?.sharpMoneyPct && params.marketMicrostructure?.publicTicketsPct) {
    const sharpDiv = (params.marketMicrostructure.sharpMoneyPct - params.marketMicrostructure.publicTicketsPct) / 100;
    xMicro = Math.max(-1.2, Math.min(1.2, sharpDiv * 2.0));
  }

  let xTrend = 0;
  if (params.droppingOddsAlert?.trend === 'dropping') {
    xTrend = 0.45;
  } else if (params.droppingOddsAlert?.trend === 'rising') {
    xTrend = -0.35;
  }

  let xMarketStructure = 0;
  const marketLower = (params.market || '').toLowerCase();
  if (marketLower.includes('ou nul') || marketLower.includes('double chance') || marketLower.includes('1x') || marketLower.includes('x2')) {
    xMarketStructure = 0.35;
  } else if (marketLower.includes('plus de 1.5') || marketLower.includes('over 1.5')) {
    xMarketStructure = 0.25;
  }

  const coefficients = {
    priorWeight: 0.85,
    sharpBenchmarkWeight: 0.38,
    xgPoissonWeight: 0.45,
    microstructureWeight: 0.25,
    trendMomentumWeight: 0.20,
  };

  const evidenceAdjustment = 
    coefficients.sharpBenchmarkWeight * xSharp +
    coefficients.xgPoissonWeight * xPoisson +
    coefficients.microstructureWeight * xMicro +
    coefficients.trendMomentumWeight * xTrend +
    xMarketStructure * 0.15;

  const posteriorLogit = priorLogit + evidenceAdjustment;
  const evidencePrecision = 0.35 + (Math.abs(xSharp) + Math.abs(xPoisson)) * 0.25;
  const posteriorVariance = 1 / ((1 / priorVariance) + evidencePrecision);
  const posteriorStdDev = Math.sqrt(posteriorVariance);

  const posteriorProbRaw = sigmoid(posteriorLogit);
  const posteriorWinProbability = Number(Math.min(92.0, Math.max(52.0, posteriorProbRaw * 100)).toFixed(1));

  const ciLow = Number(Math.min(posteriorWinProbability - 0.5, Math.max(45.0, sigmoid(posteriorLogit - 1.96 * posteriorStdDev) * 100)).toFixed(1));
  const ciHigh = Number(Math.max(posteriorWinProbability + 0.5, Math.min(97.0, sigmoid(posteriorLogit + 1.96 * posteriorStdDev) * 100)).toFixed(1));

  const ciSpread = ciHigh - ciLow;
  const precisionConfidence = Math.max(60, 100 - (ciSpread * 1.5));
  const bayesianConfidenceScore = Number(
    Math.min(98.5, Math.max(55.0, 0.45 * rawConfidence + 0.55 * precisionConfidence)).toFixed(1)
  );

  const isHighConfidence = bayesianConfidenceScore > HIGH_CONFIDENCE_THRESHOLD;
  const bayesianExpectedValue = Number((((posteriorWinProbability / 100) * odds - 1) * 100).toFixed(1));
  const unviggedFairOdds = Number((1 / (posteriorWinProbability / 100)).toFixed(2));
  const bayesianEdgePct = Number((posteriorWinProbability - marketImpliedProb).toFixed(1));

  const b = odds - 1;
  const p = posteriorWinProbability / 100;
  const q = 1 - p;
  const fullKelly = b > 0 ? (b * p - q) / b : 0;
  const safeQuarterKelly = Math.max(0.5, Math.min(3.5, fullKelly * 0.25 * 100));
  const recommendedKellyFractionPct = Number(safeQuarterKelly.toFixed(2));

  let filterStatus: BayesianSportsRegressionResult['filterStatus'] = 'qualified_top_priority';
  let rejectionReason: string | undefined = undefined;

  if (isOddsTooLow) {
    filterStatus = 'rejected_odds_too_low';
    rejectionReason = `Cote (${odds.toFixed(2)}) < ${MIN_BAYESIAN_ODDS} : Exclue systématiquement (gain asymétrique & risque résiduel élevé)`;
  } else if (isOddsTooHigh) {
    filterStatus = 'rejected_odds_too_high';
    rejectionReason = `Cote (${odds.toFixed(2)}) > ${MAX_BAYESIAN_ODDS} : Exclue systématiquement (variance et volatilité excessives)`;
  } else if (!isHighConfidence) {
    filterStatus = 'qualified_standard';
    rejectionReason = `Score de confiance (${bayesianConfidenceScore}%) ≤ ${HIGH_CONFIDENCE_THRESHOLD}% : Valide mais hors priorité haute`;
  } else {
    filterStatus = 'qualified_top_priority';
  }

  const isQualified = isOddsValid && isHighConfidence;
  const isAlertOver80 = isOddsValid && bayesianConfidenceScore > BAYESIAN_ALERT_CONFIDENCE_THRESHOLD;

  let priorityRank = 0;
  if (isOddsValid) priorityRank += 1000;
  if (isAlertOver80) priorityRank += 800;
  if (isHighConfidence) priorityRank += 500;
  priorityRank += bayesianConfidenceScore * 2 + bayesianExpectedValue;

  return {
    odds,
    posteriorWinProbability,
    credibleIntervalLow: ciLow,
    credibleIntervalHigh: ciHigh,
    bayesianConfidenceScore,
    bayesianExpectedValue,
    unviggedFairOdds,
    marketImpliedProb,
    bayesianEdgePct,
    isOddsValid,
    isHighConfidence,
    isAlertOver80,
    isQualified,
    priorityRank,
    filterStatus,
    rejectionReason,
    coefficients,
    recommendedKellyFractionPct,
  };
}
