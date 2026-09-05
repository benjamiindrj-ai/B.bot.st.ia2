import { BetResult, StakeGameType } from '../types';

export interface BayesianPosteriorStats {
  alpha: number;                     // Posterior Beta parameter Alpha (effective successes)
  beta: number;                      // Posterior Beta parameter Beta (effective failures)
  posteriorMeanProbability: number;  // E[p] as percentage (e.g. 49.8%)
  credibleIntervalLow: number;       // 2.5th percentile of win probability %
  credibleIntervalHigh: number;      // 97.5th percentile of win probability %
  confidenceLevel: number;           // Sample credibility weight (0 to 100%)
  sampleSize: number;
}

export interface BayesianOptimalMultiplier {
  optimalMultiplier: number;         // Mathematically optimized target multiplier (e.g. 1.95x)
  currentMultiplier: number;
  multiplierAdjustmentDelta: number; // e.g. +0.05x or -0.05x
  expectedGrowthRatePerBet: number;  // E[ln(1 + f*(m-1))]
  recommendationReason: string;
  regimeState: 'favorable_expansion' | 'neutral_oscillation' | 'high_variance_hedge' | 'protective_grind';
}

export interface ContinuousKellySizing {
  rawKellyFraction: number;          // Full Kelly % (e.g. 2.4%)
  fractionalMultiplier: number;      // e.g. 0.25 (Quarter-Kelly)
  drawdownPenaltyFactor: number;     // Throttling factor (0.3 to 1.0)
  entropySafetyFactor: number;       // Entropy throttle (0.5 to 1.0)
  finalKellyFractionPercent: number; // Final safe bet % of bankroll (e.g. 0.65%)
  recommendedBetAmount: number;      // Exact amount in currency
  baseBetComparisonRatio: number;    // Ratio compared to static baseBet (e.g. 1.1x)
}

export interface BayesianOptimizationReport {
  posterior: BayesianPosteriorStats;
  multiplierOptimization: BayesianOptimalMultiplier;
  continuousKelly: ContinuousKellySizing;
  timestamp: number;
}

/**
 * Computes Bayesian Posterior Distribution using Beta-Binomial Conjugate Prior.
 */
export function computeBayesianPosterior(
  recentBets: BetResult[],
  game: StakeGameType,
  targetMultiplier: number = 2.0,
  windowSize: number = 50
): BayesianPosteriorStats {
  const sample = recentBets.slice(0, windowSize);
  const houseWinChance = game === 'dice' || game === 'limbo' 
    ? (99.0 / Math.max(1.01, targetMultiplier)) 
    : 49.5;

  const priorSuccesses = 10 * (houseWinChance / 100);
  const priorFailures = 10 * (1 - houseWinChance / 100);

  const observedWins = sample.filter(b => b.won).length;
  const observedLosses = sample.length - observedWins;

  const alpha = priorSuccesses + observedWins;
  const beta = priorFailures + observedLosses;

  const posteriorMean = (alpha / (alpha + beta)) * 100;
  
  // Normal approximation for Beta credible interval
  const posteriorVariance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
  const posteriorStdDev = Math.sqrt(posteriorVariance) * 100;

  const ciLow = Math.max(0.1, Number((posteriorMean - 1.96 * posteriorStdDev).toFixed(2)));
  const ciHigh = Math.min(99.9, Number((posteriorMean + 1.96 * posteriorStdDev).toFixed(2)));

  const confidenceLevel = Math.min(100, Math.round((sample.length / windowSize) * 100));

  return {
    alpha: Number(alpha.toFixed(2)),
    beta: Number(beta.toFixed(2)),
    posteriorMeanProbability: Number(posteriorMean.toFixed(2)),
    credibleIntervalLow: ciLow,
    credibleIntervalHigh: ciHigh,
    confidenceLevel,
    sampleSize: sample.length,
  };
}

/**
 * Numerically finds the optimal target multiplier maximizing log-utility growth.
 */
export function computeOptimalBayesianMultiplier(
  posterior: BayesianPosteriorStats,
  currentMultiplier: number,
  drawdownPct: number,
  currentStreak: number,
  riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
): BayesianOptimalMultiplier {
  const p = posterior.posteriorMeanProbability / 100;
  let candidateMultipliers: number[] = [];

  // Search space around current target
  const minM = Math.max(1.10, currentMultiplier * 0.7);
  const maxM = Math.min(25.0, currentMultiplier * 1.5);
  const step = 0.05;

  for (let m = minM; m <= maxM; m += step) {
    candidateMultipliers.push(Number(m.toFixed(2)));
  }

  let bestMultiplier = currentMultiplier;
  let maxGrowth = -Infinity;
  const testFraction = 0.01; // 1% sizing test

  candidateMultipliers.forEach((m) => {
    // Probability of winning at multiplier m
    // Estimated using house edge ~1% and Bayesian deviation factor
    const fairProb = (0.99 / m);
    const deviationRatio = p / (0.99 / currentMultiplier);
    const adjustedProb = Math.min(0.98, Math.max(0.01, fairProb * deviationRatio));

    // Log-Growth: E[ln(1 + f*(m-1))] = p*ln(1 + f*(m-1)) + (1-p)*ln(1 - f)
    const winTerm = adjustedProb * Math.log(Math.max(0.001, 1 + testFraction * (m - 1)));
    const lossTerm = (1 - adjustedProb) * Math.log(Math.max(0.001, 1 - testFraction));
    const growth = winTerm + lossTerm;

    if (growth > maxGrowth) {
      maxGrowth = growth;
      bestMultiplier = m;
    }
  });

  // Smooth adjustment: don't jump more than 0.20x per adjustment cycle
  const rawDelta = bestMultiplier - currentMultiplier;
  const boundedDelta = Number(Math.max(-0.20, Math.min(0.20, rawDelta)).toFixed(2));
  const finalOptimalMultiplier = Number((currentMultiplier + boundedDelta).toFixed(2));

  let regimeState: BayesianOptimalMultiplier['regimeState'] = 'neutral_oscillation';
  let recommendationReason = 'Multiplicateur calibré en équilibre stochastique.';

  if (currentStreak <= -3 || drawdownPct >= 6.0) {
    regimeState = 'protective_grind';
    recommendationReason = 'Régime défensif : réduction du multiplicateur pour augmenter la probabilité de gain immédiate.';
  } else if (p > 54 && currentStreak >= 2 && drawdownPct <= 1.0) {
    regimeState = 'favorable_expansion';
    recommendationReason = 'Momentum favorable : expansion dynamique du multiplicateur pour maximiser l\'espérance asymétrique.';
  } else if (riskProfile === 'aggressive') {
    regimeState = 'high_variance_hedge';
    recommendationReason = 'Optimisation asymétrique à fort effet de levier.';
  }

  return {
    optimalMultiplier: Math.max(1.05, finalOptimalMultiplier),
    currentMultiplier,
    multiplierAdjustmentDelta: boundedDelta,
    expectedGrowthRatePerBet: Number(maxGrowth.toFixed(5)),
    recommendationReason,
    regimeState,
  };
}

/**
 * Continuous Adaptive Fractional Kelly Sizing Engine.
 */
export function computeContinuousKellySizing(
  posterior: BayesianPosteriorStats,
  targetMultiplier: number,
  currentBankroll: number,
  baseBet: number,
  drawdownPct: number,
  shannonEntropy: number = 0.95,
  kellyFractionSetting: number = 0.25 // Default Quarter-Kelly
): ContinuousKellySizing {
  const p = posterior.posteriorMeanProbability / 100;
  const b = Math.max(0.01, targetMultiplier - 1);
  const q = 1 - p;

  // Standard Kelly: (b*p - q) / b
  let rawKelly = (b * p - q) / b;
  if (rawKelly <= 0) {
    rawKelly = 0.005; // Base minimum 0.5% floor
  }

  // Drawdown throttle factor: reduce bet up to 70% as drawdown increases
  const maxSafeDrawdown = 15.0; // 15% max acceptable drawdown
  const drawdownPenaltyFactor = Number(Math.max(0.30, 1.0 - (drawdownPct / maxSafeDrawdown) * 0.70).toFixed(2));

  // Entropy safety factor: if entropy drops below 0.85 (clustering), throttle down
  let entropySafetyFactor = 1.0;
  if (shannonEntropy < 0.75) {
    entropySafetyFactor = 0.55;
  } else if (shannonEntropy < 0.88) {
    entropySafetyFactor = 0.80;
  }

  // Combined safe Kelly fraction as % of bankroll
  const finalFractionPercent = Number(
    Math.max(0.05, Math.min(5.0, rawKelly * 100 * kellyFractionSetting * drawdownPenaltyFactor * entropySafetyFactor)).toFixed(3)
  );

  const effectiveBankroll = currentBankroll > 0 ? currentBankroll : 100;
  let recommendedBetAmount = Number(((effectiveBankroll * finalFractionPercent) / 100).toFixed(4));

  // Safety floor with respect to baseBet
  if (recommendedBetAmount <= 0) {
    recommendedBetAmount = baseBet > 0 ? baseBet : 0.001;
  }

  const baseBetComparisonRatio = baseBet > 0 
    ? Number((recommendedBetAmount / baseBet).toFixed(2)) 
    : 1.0;

  return {
    rawKellyFraction: Number(rawKelly.toFixed(4)),
    fractionalMultiplier: kellyFractionSetting,
    drawdownPenaltyFactor,
    entropySafetyFactor,
    finalKellyFractionPercent: finalFractionPercent,
    recommendedBetAmount,
    baseBetComparisonRatio,
  };
}

/**
 * Master Bayesian Optimization Generator.
 */
export function generateBayesianOptimizationReport(
  recentBets: BetResult[],
  game: StakeGameType,
  currentMultiplier: number,
  currentBankroll: number,
  baseBet: number,
  drawdownPct: number,
  currentStreak: number,
  shannonEntropy: number = 0.95
): BayesianOptimizationReport {
  const posterior = computeBayesianPosterior(recentBets, game, currentMultiplier, 50);
  const multiplierOptimization = computeOptimalBayesianMultiplier(
    posterior,
    currentMultiplier,
    drawdownPct,
    currentStreak,
    'balanced'
  );
  const continuousKelly = computeContinuousKellySizing(
    posterior,
    multiplierOptimization.optimalMultiplier,
    currentBankroll,
    baseBet,
    drawdownPct,
    shannonEntropy,
    0.25
  );

  return {
    posterior,
    multiplierOptimization,
    continuousKelly,
    timestamp: Date.now(),
  };
}
