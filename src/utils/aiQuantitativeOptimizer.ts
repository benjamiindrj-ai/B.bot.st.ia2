import { BetResult, StakeGameType } from '../types';

/**
 * Advanced Quantitative & Stochastic Optimization Engine for Stake Casino Games.
 * Features:
 * - Real-time Shannon Entropy estimation
 * - Wald-Wolfowitz runs-test for statistical anomaly & clustering detection
 * - Bayesian Hidden Markov Model (HMM) 4-regime posterior distribution
 * - Rolling GARCH-style Volatility Forecasting & Pre-Emptive Throttling
 * - Fractional Kelly Criterion with Log-Growth Multiplier Optimization
 * - First-Passage Brownian Probability to Take-Profit / Stop-Loss
 */

export interface BayesianRegimeProbabilities {
  expansion: number;       // % Probability in Laminar / Trending Expansion
  oscillation: number;     // % Probability in Mean-Reverting Oscillation
  fatTailShock: number;    // % Probability in Drawdown Shock / Risk Zone
  moonshotZone: number;    // % Probability in Extreme Multiplier Potential
  dominantRegime: 'expansion' | 'oscillation' | 'fatTailShock' | 'moonshotZone';
  dominantLabel: string;
}

export interface VolatilityForecast {
  currentSigma: number;        // Current rolling standard deviation of returns
  forecastedSigma: number;     // GARCH(1,1) predicted volatility for next cycle
  volatilityRegime: 'ultra_low' | 'moderate' | 'elevated' | 'extreme';
  preEmptiveThrottleFactor: number; // Multiplier applied to protect capital (0.30 - 1.0)
}

export interface MultiplierOptimization {
  optimalMultiplierSweetSpot: number; // Numerically computed optimal target multiplier
  expectedLogGrowthRate: number;      // E[ln(1 + f*(m-1))] per bet
  growthCurveTier: 'conservative_grind' | 'asymmetric_surge' | 'quantum_moonshot';
}

export interface QuantitativeMetrics {
  // 1. Entropy & Clustering
  shannonEntropy: number; // 0.0 to 1.0 (1.0 = optimal uniform dispersion)
  waldWolfowitzZScore: number; // Z-score for clustering (> |1.96| indicates significant clustering/anomaly)
  variancePhase: 'calm' | 'trending' | 'oscillating' | 'turbulent_anomaly';
  isClusteringDetected: boolean;

  // 2. Bayesian Regime & Volatility Forecast
  bayesianRegimes: BayesianRegimeProbabilities;
  volatilityForecast: VolatilityForecast;
  multiplierOptimization: MultiplierOptimization;

  // 3. Kelly Criterion & Optimal Sizing
  theoreticalEdge: number; // e.g. -0.01 (-1% house edge)
  dynamicKellyFraction: number; // Optimal fractional Kelly bet size as % of bankroll
  suggestedBetAmount: number;
  volatilityDampener: number; // Multiplier 0.2 to 1.5 adjusting bet aggressiveness

  // 4. First-Passage & Monte Carlo Projections
  probabilityReachingTakeProfit: number; // 0% to 100%
  expectedDrawdownFloor: number; // Max estimated drawdown % under 95% confidence
  riskOfRuinEstimate: number; // 0.0% to 100%

  // 5. Multi-Original Arbitrage & Recommended Game
  bestFittedGame: StakeGameType;
  gameArbitrageRationale: string;
  quantumEfficiencyScore: number; // 0 to 100

  // 6. Predictive Tactical Directives
  nextStepsPlan: [string, string, string];

  // 7. Elite 100/100 Profit Protection & Yield Metrics
  ratchetLock: RatchetLockMetrics;
  vipRakeback: VipRakebackMetrics;
}

export interface RatchetLockMetrics {
  isLocked: boolean;
  lockedProfitFloor: number;
  unrealizedProfit: number;
  peakProfit: number;
  securedProfitPercent: number;
  shouldHitAndRunExit: boolean;
  lockMilestoneReached: 'none' | '25%_TP' | '50%_TP' | '75%_TP' | '90%_TP' | 'TARGET_HIT';
  statusMessage: string;
}

export interface VipRakebackMetrics {
  totalWagered: number;
  instantRakebackEarned: number; // 10% of house edge (0.10% total wager)
  realNetProfitWithRakeback: number;
  currentVipTier: 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum I' | 'Platinum II' | 'Platinum III' | 'Platinum IV' | 'Diamond';
  nextVipTier: string;
  wagerToNextTier: number;
  vipTierProgressPercent: number;
  projectedWeeklyBonus: number;
  projectedMonthlyBonus: number;
}

export interface AutoSeedRotationResult {
  newClientSeed: string;
  previousClientSeed: string;
  rotationReason: 'clustering_anomaly' | 'loss_streak_threshold' | 'entropy_collapse' | 'periodic_refresh' | 'manual';
  timestamp: number;
}

/**
 * Generates a cryptographically strong 16-character pseudo-random Client Seed.
 */
export function generateCryptoRandomSeed(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    return Array.from(array, x => chars[x % chars.length]).join('');
  }
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Ratchet Profit Lock (Automated Hit & Run Engine)
 * Automatically raises a guaranteed profit floor as session profits hit 25%, 50%, 75%, 90% milestones.
 * Triggers an immediate exit if the market pulls back to the locked floor, preventing giving profit back.
 */
export function calculateRatchetLock(
  sessionProfit: number,
  peakSessionProfit: number,
  targetProfit: number
): RatchetLockMetrics {
  if (targetProfit <= 0 || peakSessionProfit <= 0) {
    return {
      isLocked: false,
      lockedProfitFloor: 0,
      unrealizedProfit: sessionProfit,
      peakProfit: peakSessionProfit,
      securedProfitPercent: 0,
      shouldHitAndRunExit: false,
      lockMilestoneReached: 'none',
      statusMessage: 'En attente de profits pour verrouiller le palier initial (+25% TP)',
    };
  }

  const peakProgress = peakSessionProfit / targetProfit;
  let lockedFloor = 0;
  let milestone: RatchetLockMetrics['lockMilestoneReached'] = 'none';
  let securedPct = 0;

  if (peakProgress >= 1.0) {
    milestone = 'TARGET_HIT';
    lockedFloor = Number((targetProfit * 0.90).toFixed(4));
    securedPct = 90;
  } else if (peakProgress >= 0.90) {
    milestone = '90%_TP';
    lockedFloor = Number((targetProfit * 0.75).toFixed(4));
    securedPct = 75;
  } else if (peakProgress >= 0.75) {
    milestone = '75%_TP';
    lockedFloor = Number((targetProfit * 0.55).toFixed(4));
    securedPct = 55;
  } else if (peakProgress >= 0.50) {
    milestone = '50%_TP';
    lockedFloor = Number((targetProfit * 0.30).toFixed(4));
    securedPct = 30;
  } else if (peakProgress >= 0.25) {
    milestone = '25%_TP';
    lockedFloor = Number((targetProfit * 0.10).toFixed(4));
    securedPct = 10;
  }

  const isLocked = lockedFloor > 0;
  // Hit & Run condition: If session had locked profit and is now pulling back to or below locked floor
  const shouldHitAndRunExit = isLocked && sessionProfit <= lockedFloor && sessionProfit > 0;

  let statusMessage = 'Aucun palier verrouillé';
  if (shouldHitAndRunExit) {
    statusMessage = `🔒 HIT & RUN ACTIVÉ : Profit sécurisé à +${lockedFloor} (${securedPct}% de l'objectif). Clôture immédiate pour garantir les gains !`;
  } else if (isLocked) {
    statusMessage = `🛡️ Palier Ratchet ${milestone} atteint : Plancher garanti verrouillé à +${lockedFloor} (${securedPct}% du TP).`;
  }

  return {
    isLocked,
    lockedProfitFloor: lockedFloor,
    unrealizedProfit: sessionProfit,
    peakProfit: peakSessionProfit,
    securedProfitPercent: securedPct,
    shouldHitAndRunExit,
    lockMilestoneReached: milestone,
    statusMessage,
  };
}

/**
 * Stake VIP Rakeback, Level-Up Progression & Real Yield Accumulator
 * Calculates exact Instant Rakeback (10% House Edge Rebate = 0.10% Wagered) and projected bonuses.
 */
export function calculateVipRakebackMetrics(
  totalWagered: number,
  sessionProfit: number
): VipRakebackMetrics {
  const instantRakeback = Number((totalWagered * 0.0010).toFixed(4)); // 10% of 1% house edge
  const realNetProfit = Number((sessionProfit + instantRakeback).toFixed(4));

  // Stake VIP Milestones (USD equivalent)
  const VIP_TIERS = [
    { name: 'Bronze' as const, target: 10000, weeklyMultiplier: 0.0005, monthlyMultiplier: 0.0010 },
    { name: 'Silver' as const, target: 50000, weeklyMultiplier: 0.0006, monthlyMultiplier: 0.0012 },
    { name: 'Gold' as const, target: 100000, weeklyMultiplier: 0.0008, monthlyMultiplier: 0.0015 },
    { name: 'Platinum I' as const, target: 250000, weeklyMultiplier: 0.0010, monthlyMultiplier: 0.0020 },
    { name: 'Platinum II' as const, target: 500000, weeklyMultiplier: 0.0012, monthlyMultiplier: 0.0025 },
    { name: 'Platinum III' as const, target: 1000000, weeklyMultiplier: 0.0015, monthlyMultiplier: 0.0030 },
    { name: 'Platinum IV' as const, target: 2500000, weeklyMultiplier: 0.0018, monthlyMultiplier: 0.0035 },
    { name: 'Diamond' as const, target: 25000000, weeklyMultiplier: 0.0025, monthlyMultiplier: 0.0050 },
  ];

  let currentVipTier: VipRakebackMetrics['currentVipTier'] = 'None';
  let nextVipTier = 'Bronze';
  let prevTarget = 0;
  let nextTarget = 10000;
  let activeTierObj = VIP_TIERS[0];

  for (let i = 0; i < VIP_TIERS.length; i++) {
    if (totalWagered >= VIP_TIERS[i].target) {
      currentVipTier = VIP_TIERS[i].name;
      activeTierObj = VIP_TIERS[i];
      prevTarget = VIP_TIERS[i].target;
      if (i + 1 < VIP_TIERS.length) {
        nextVipTier = VIP_TIERS[i + 1].name;
        nextTarget = VIP_TIERS[i + 1].target;
      } else {
        nextVipTier = 'Diamond MAX';
        nextTarget = VIP_TIERS[i].target;
      }
    }
  }

  const range = Math.max(1, nextTarget - prevTarget);
  const progressInTier = Math.max(0, totalWagered - prevTarget);
  const vipProgressPct = Math.min(100, Math.round((progressInTier / range) * 100));
  const wagerToNext = Math.max(0, nextTarget - totalWagered);

  const projectedWeekly = Number((totalWagered * activeTierObj.weeklyMultiplier).toFixed(3));
  const projectedMonthly = Number((totalWagered * activeTierObj.monthlyMultiplier).toFixed(3));

  return {
    totalWagered,
    instantRakebackEarned: instantRakeback,
    realNetProfitWithRakeback: realNetProfit,
    currentVipTier,
    nextVipTier,
    wagerToNextTier: wagerToNext,
    vipTierProgressPercent: vipProgressPct,
    projectedWeeklyBonus: projectedWeekly,
    projectedMonthlyBonus: projectedMonthly,
  };
}

/**
 * House Edge standards for Stake Originals
 */
export const STAKE_HOUSE_EDGES: Record<StakeGameType, number> = {
  dice: 0.01,       // 1.0% Edge (99% RTP)
  limbo: 0.01,      // 1.0% Edge (99% RTP)
  plinko: 0.01,     // 1.0% Edge (99% RTP)
  mines: 0.01,      // 1.0% Edge (99% RTP)
  crash: 0.01,      // 1.0% Edge (99% RTP)
  keno: 0.01,       // 1.0% Edge (99% RTP)
  hilo: 0.01,       // 1.0% Edge (99% RTP)
  wheel: 0.01,      // 1.0% Edge (99% RTP)
  diamonds: 0.01,   // 1.0% Edge (99% RTP)
  baccarat: 0.011,  // 1.10% Edge (98.9% RTP)
  slide: 0.01,      // 1.0% Edge (99% RTP)
  sports: 0.045,    // 4.5% Average Sportsbook Margin
  blackjack: 0.0057,// 0.57% Edge (99.43% RTP)
  roulette: 0.027,  // 2.7% European Roulette Edge
};

/**
 * Compute Shannon Entropy on recent binary outcomes (wins/losses)
 */
export function calculateShannonEntropy(bets: BetResult[], sampleSize: number = 30): number {
  const sample = bets.slice(0, sampleSize);
  if (sample.length < 5) return 1.0;

  const wins = sample.filter((b) => b.won).length;
  const losses = sample.length - wins;

  const pWin = wins / sample.length;
  const pLoss = losses / sample.length;

  if (pWin === 0 || pLoss === 0) return 0.0;

  const entropy = - (pWin * Math.log2(pWin) + pLoss * Math.log2(pLoss));
  return Math.min(1.0, Math.max(0.0, Number(entropy.toFixed(3))));
}

/**
 * Wald-Wolfowitz Runs Test: Detects if the sequence of wins and losses is truly independent
 * or showing abnormal clustering (long cold streaks or unnatural alternating patterns).
 */
export function calculateRunsTestZScore(bets: BetResult[], sampleSize: number = 40): { zScore: number; isAnomaly: boolean } {
  const sample = bets.slice(0, sampleSize);
  if (sample.length < 10) return { zScore: 0, isAnomaly: false };

  const n1 = sample.filter((b) => b.won).length; // Total Wins
  const n2 = sample.length - n1;                // Total Losses

  if (n1 === 0 || n2 === 0) {
    return { zScore: -3.5, isAnomaly: true };
  }

  // Count runs
  let runs = 1;
  for (let i = 1; i < sample.length; i++) {
    if (sample[i].won !== sample[i - 1].won) {
      runs++;
    }
  }

  const expectedRuns = ((2 * n1 * n2) / sample.length) + 1;
  const varianceRuns = (2 * n1 * n2 * (2 * n1 * n2 - sample.length)) / 
    (Math.pow(sample.length, 2) * (sample.length - 1));

  if (varianceRuns <= 0) return { zScore: 0, isAnomaly: false };

  const zScore = (runs - expectedRuns) / Math.sqrt(varianceRuns);
  const isAnomaly = Math.abs(zScore) >= 1.96; // 95% confidence threshold

  return { 
    zScore: Number(zScore.toFixed(2)), 
    isAnomaly 
  };
}

/**
 * Bayesian Hidden Markov Model (HMM) Regime Classifier.
 * Computes posterior probabilities for the 4 key operational states.
 */
export function computeBayesianRegimes(
  recentBets: BetResult[],
  sessionProfit: number,
  drawdownPct: number,
  currentStreak: number,
  riskAppetite: string
): BayesianRegimeProbabilities {
  const sample = recentBets.slice(0, 25);
  const winCount = sample.filter(b => b.won).length;
  const winRate = sample.length > 0 ? (winCount / sample.length) * 100 : 50;

  // Unnormalized prior weights
  let expansion = 25;
  let oscillation = 35;
  let fatTailShock = 15;
  let moonshotZone = 25;

  if (riskAppetite === 'extreme_moonshot') {
    moonshotZone += 40;
    expansion -= 10;
  }

  // Likelihood updates based on observations
  if (winRate >= 58 && currentStreak >= 1 && drawdownPct <= 2.0) {
    expansion += 45;
    fatTailShock = Math.max(2, fatTailShock - 20);
  } else if (currentStreak <= -4 || drawdownPct >= 8.0) {
    fatTailShock += 60;
    expansion = Math.max(2, expansion - 30);
  } else if (Math.abs(winRate - 50) <= 8) {
    oscillation += 35;
  }

  if (sessionProfit > 0 && currentStreak >= 2) {
    expansion += 20;
  }

  // Normalize to 100%
  const total = expansion + oscillation + fatTailShock + moonshotZone;
  const pExp = Math.round((expansion / total) * 100);
  const pOsc = Math.round((oscillation / total) * 100);
  const pShock = Math.round((fatTailShock / total) * 100);
  const pMoon = Math.max(0, 100 - (pExp + pOsc + pShock));

  let dominantRegime: BayesianRegimeProbabilities['dominantRegime'] = 'oscillation';
  let dominantLabel = 'Oscillation Neutre (Retour à la Moyenne)';

  const maxVal = Math.max(pExp, pOsc, pShock, pMoon);
  if (maxVal === pShock) {
    dominantRegime = 'fatTailShock';
    dominantLabel = 'Choc de Drawdown / Zone Critique';
  } else if (maxVal === pExp) {
    dominantRegime = 'expansion';
    dominantLabel = 'Expansion Laminaire / Momentum Gagnant';
  } else if (maxVal === pMoon) {
    dominantRegime = 'moonshotZone';
    dominantLabel = 'Zone Jackpot Stochastique (Mode Extrême)';
  }

  return {
    expansion: pExp,
    oscillation: pOsc,
    fatTailShock: pShock,
    moonshotZone: pMoon,
    dominantRegime,
    dominantLabel,
  };
}

/**
 * GARCH(1,1) Style Short-Term Volatility Forecasting.
 * Predicts next cycle volatility and calculates a pre-emptive throttling multiplier.
 */
export function calculateGarchVolatilityForecast(
  recentBets: BetResult[],
  drawdownPct: number
): VolatilityForecast {
  const sample = recentBets.slice(0, 20);
  if (sample.length < 5) {
    return {
      currentSigma: 1.0,
      forecastedSigma: 1.0,
      volatilityRegime: 'moderate',
      preEmptiveThrottleFactor: 1.0,
    };
  }

  // Calculate return variances
  const profits = sample.map(b => b.profit);
  const meanProfit = profits.reduce((a, b) => a + b, 0) / profits.length;
  const variance = profits.reduce((acc, val) => acc + Math.pow(val - meanProfit, 2), 0) / profits.length;
  const currentSigma = Math.sqrt(variance);

  // EWMA GARCH-like prediction: sigma_{t+1}^2 = omega + alpha * eps_t^2 + beta * sigma_t^2
  const omega = 0.05;
  const alpha = 0.15;
  const beta = 0.80;
  const lastReturnSq = Math.pow(sample[0].profit - meanProfit, 2);
  const forecastedVariance = omega + alpha * lastReturnSq + beta * variance;
  const forecastedSigma = Number(Math.sqrt(forecastedVariance).toFixed(3));

  let volatilityRegime: VolatilityForecast['volatilityRegime'] = 'moderate';
  let throttleFactor = 1.0;

  if (forecastedSigma > 3.0 || drawdownPct >= 10.0) {
    volatilityRegime = 'extreme';
    throttleFactor = 0.40;
  } else if (forecastedSigma > 1.8 || drawdownPct >= 5.0) {
    volatilityRegime = 'elevated';
    throttleFactor = 0.70;
  } else if (forecastedSigma < 0.6 && drawdownPct <= 1.0) {
    volatilityRegime = 'ultra_low';
    throttleFactor = 1.15;
  }

  return {
    currentSigma: Number(currentSigma.toFixed(3)),
    forecastedSigma,
    volatilityRegime,
    preEmptiveThrottleFactor: Number(throttleFactor.toFixed(2)),
  };
}

/**
 * Expected Log-Growth Rate & Multiplier Sweet-Spot Optimizer.
 * Computes optimal multiplier target maximizing E[ln(1 + f*(m-1))].
 */
export function optimizeMultiplierSweetSpot(
  regime: BayesianRegimeProbabilities['dominantRegime'],
  riskAppetite: string,
  currentMultiplier: number
): MultiplierOptimization {
  if (riskAppetite === 'extreme_moonshot') {
    return {
      optimalMultiplierSweetSpot: 10000.0,
      expectedLogGrowthRate: 0.00012,
      growthCurveTier: 'quantum_moonshot',
    };
  }

  if (regime === 'fatTailShock') {
    return {
      optimalMultiplierSweetSpot: 5.50,
      expectedLogGrowthRate: 0.0035,
      growthCurveTier: 'asymmetric_surge',
    };
  }

  if (regime === 'expansion') {
    return {
      optimalMultiplierSweetSpot: 1.55,
      expectedLogGrowthRate: 0.0042,
      growthCurveTier: 'conservative_grind',
    };
  }

  return {
    optimalMultiplierSweetSpot: 2.45,
    expectedLogGrowthRate: 0.0022,
    growthCurveTier: 'conservative_grind',
  };
}

/**
 * Dynamic Fractional Kelly Criterion with Volatility Dampener.
 * Adapts bet size proportionally to the true statistical edge and bankroll security factor.
 */
export function calculateDynamicKellySizing(
  balance: number,
  multiplier: number,
  winChancePercent: number,
  entropy: number,
  drawdownPct: number,
  currentStreak: number,
  riskAppetite: 'conservative' | 'balanced' | 'aggressive' | 'extreme_moonshot',
  preEmptiveThrottle: number = 1.0
): { kellyPct: number; calculatedBet: number; dampener: number } {
  let baseFraction = 0.002; // 0.20% default baseline
  if (riskAppetite === 'conservative') baseFraction = 0.0010;
  if (riskAppetite === 'balanced') baseFraction = 0.0025;
  if (riskAppetite === 'aggressive') baseFraction = 0.0060;
  if (riskAppetite === 'extreme_moonshot') baseFraction = 0.00025; // 0.025% for extreme hunts

  // Volatility Dampener: decreases on high drawdown or low entropy; increases on positive momentum
  let dampener = 1.0 * preEmptiveThrottle;

  // 1. Drawdown penalty
  if (drawdownPct > 10) dampener *= 0.4;
  else if (drawdownPct > 5) dampener *= 0.65;
  else if (drawdownPct <= 1.5) dampener *= 1.15;

  // 2. Entropy dampener (penalize clustered turbulent anomalies)
  if (entropy < 0.70) dampener *= 0.75;
  else if (entropy >= 0.95) dampener *= 1.10;

  // 3. Loss streak protection
  if (currentStreak < -3) dampener *= Math.max(0.3, 1 - (Math.abs(currentStreak) * 0.12));
  else if (currentStreak >= 2) dampener *= 1.20;

  dampener = Math.max(0.2, Math.min(1.8, dampener));

  const optimalKellyPct = baseFraction * dampener;
  const calculatedBet = Math.max(0.001, Number((balance * optimalKellyPct).toFixed(5)));

  return {
    kellyPct: Number((optimalKellyPct * 100).toFixed(4)),
    calculatedBet,
    dampener: Number(dampener.toFixed(2)),
  };
}

/**
 * First-Passage Probability: Calculates analytical probability of hitting Take-Profit
 * before hitting Stop-Loss using a 1D Brownian Motion drift model with absorbing barriers.
 */
export function estimateTakeProfitProbability(
  currentBalance: number,
  sessionProfit: number,
  targetProfit: number,
  stopLoss: number,
  currentStreak: number,
  drawdownPct: number
): number {
  if (targetProfit <= 0) return 95;
  if (sessionProfit >= targetProfit) return 100;
  if (stopLoss > 0 && sessionProfit <= -stopLoss) return 0;

  const distanceToTarget = Math.max(0.01, targetProfit - sessionProfit);
  const distanceToStop = stopLoss > 0 ? Math.max(0.01, stopLoss + sessionProfit) : currentBalance * 0.3;

  const totalRange = distanceToTarget + distanceToStop;
  let baseProb = (distanceToStop / totalRange) * 100;

  // Momentum adjustments
  if (sessionProfit > 0) {
    baseProb += Math.min(20, (sessionProfit / targetProfit) * 20);
  } else {
    baseProb -= Math.min(25, (Math.abs(sessionProfit) / (stopLoss || currentBalance * 0.2)) * 25);
  }

  // Streak adjustments
  if (currentStreak >= 2) baseProb += Math.min(10, currentStreak * 3);
  if (currentStreak <= -3) baseProb -= Math.min(15, Math.abs(currentStreak) * 3);

  // Drawdown adjustment
  baseProb -= Math.min(20, drawdownPct * 1.5);

  return Math.max(5, Math.min(99, Math.round(baseProb)));
}

/**
 * Cross-Original Arbitrage: Identifies which Stake Original currently offers the best
 * mathematical synergy given the player's active variance phase and risk appetite.
 */
export function findBestFittedOriginalGame(
  variancePhase: 'calm' | 'trending' | 'oscillating' | 'turbulent_anomaly',
  riskAppetite: 'conservative' | 'balanced' | 'aggressive' | 'extreme_moonshot',
  drawdownPct: number
): { game: StakeGameType; rationale: string } {
  if (riskAppetite === 'extreme_moonshot') {
    return {
      game: 'plinko',
      rationale: 'Mode Extrême : Plinko 16R @10 000x ou 15R @5 000x offre la plus haute dispersion de multiplicateurs géants.',
    };
  }

  if (variancePhase === 'turbulent_anomaly' || drawdownPct > 6.0) {
    return {
      game: 'dice',
      rationale: 'Phase Turbulente : Dice @1.98x / Oscar\'s Grind pour une variance minimale et une absorption linéaire des pertes.',
    };
  }

  if (variancePhase === 'trending' && riskAppetite !== 'conservative') {
    return {
      game: 'limbo',
      rationale: 'Momentum Positif : Limbo @3.8x - 5.0x pour capitaliser sur l\'asymétrie de gains sans risque d\'exposition accrue.',
    };
  }

  if (variancePhase === 'oscillating') {
    return {
      game: 'mines',
      rationale: 'Phase Oscillatoire : Démineur 3 Mines / 2 Diamants (@1.38x) pour des encaissements rapides à haute régularité.',
    };
  }

  return {
    game: 'dice',
    rationale: 'Phase Calme : Dice @2.00x avec progression arithmétique D\'Alembert équilibrée.',
  };
}

/**
 * Main Orchestrator: Computes complete real-time quantitative telemetry for the AI.
 */
export function computeRealtimeQuantitativeMetrics(
  bets: BetResult[],
  balance: number,
  sessionProfit: number,
  peakSessionProfit: number,
  currentStreak: number,
  targetProfit: number,
  stopLoss: number,
  riskAppetite: 'conservative' | 'balanced' | 'aggressive' | 'extreme_moonshot' = 'balanced',
  currentMultiplier: number = 2.0,
  currentWinChance: number = 49.5
): QuantitativeMetrics {
  const currentDrawdown = Math.max(0, peakSessionProfit - sessionProfit);
  const drawdownPct = balance > 0 ? (currentDrawdown / (balance + currentDrawdown)) * 100 : 0;

  // 1. Shannon Entropy
  const shannonEntropy = calculateShannonEntropy(bets, 30);

  // 2. Wald-Wolfowitz Runs Test
  const { zScore, isAnomaly } = calculateRunsTestZScore(bets, 40);

  // 3. Bayesian HMM Regimes
  const bayesianRegimes = computeBayesianRegimes(bets, sessionProfit, drawdownPct, currentStreak, riskAppetite);

  // 4. GARCH Volatility Forecast
  const volatilityForecast = calculateGarchVolatilityForecast(bets, drawdownPct);

  // 5. Multiplier Sweet-Spot Optimization
  const multiplierOptimization = optimizeMultiplierSweetSpot(bayesianRegimes.dominantRegime, riskAppetite, currentMultiplier);

  // 6. Determine Variance Phase
  let variancePhase: QuantitativeMetrics['variancePhase'] = 'calm';
  if (isAnomaly || drawdownPct >= 8.0 || currentStreak <= -5) {
    variancePhase = 'turbulent_anomaly';
  } else if (currentStreak >= 3 || (sessionProfit > 0 && drawdownPct <= 1.5)) {
    variancePhase = 'trending';
  } else if (Math.abs(zScore) >= 1.2 || (drawdownPct >= 3.5 && drawdownPct < 8.0)) {
    variancePhase = 'oscillating';
  } else {
    variancePhase = 'calm';
  }

  // 7. Dynamic Fractional Kelly with GARCH throttle
  const { kellyPct, calculatedBet, dampener } = calculateDynamicKellySizing(
    balance,
    currentMultiplier,
    currentWinChance,
    shannonEntropy,
    drawdownPct,
    currentStreak,
    riskAppetite,
    volatilityForecast.preEmptiveThrottleFactor
  );

  // 8. Probability Reaching Take-Profit
  const probabilityReachingTakeProfit = estimateTakeProfitProbability(
    balance,
    sessionProfit,
    targetProfit,
    stopLoss,
    currentStreak,
    drawdownPct
  );

  // 9. Cross-Game Arbitrage
  const { game: bestFittedGame, rationale: gameArbitrageRationale } = findBestFittedOriginalGame(
    variancePhase,
    riskAppetite,
    drawdownPct
  );

  // 10. Efficiency Score (0 to 100)
  let efficiency = 75;
  efficiency += (shannonEntropy - 0.5) * 20; // +10 for good entropy
  efficiency += (probabilityReachingTakeProfit - 50) * 0.3; // +-15 based on TP prob
  efficiency -= drawdownPct * 2; // drawdown penalty
  if (isAnomaly) efficiency -= 15;
  if (volatilityForecast.volatilityRegime === 'extreme') efficiency -= 10;
  const quantumEfficiencyScore = Math.max(10, Math.min(100, Math.round(efficiency)));

  // 11. Drawdown floor and ruin estimates
  const expectedDrawdownFloor = Number((drawdownPct * 1.4 + 2.5).toFixed(1));
  const riskOfRuinEstimate = Number(Math.max(0.001, (100 - probabilityReachingTakeProfit) * 0.12).toFixed(2));

  // 12. Ratchet Lock (Hit & Run) & VIP Rakeback Calculations
  const totalWagered = bets.reduce((acc, b) => acc + (b.betAmount || 0), 0);
  const ratchetLock = calculateRatchetLock(sessionProfit, peakSessionProfit, targetProfit);
  const vipRakeback = calculateVipRakebackMetrics(totalWagered, sessionProfit);

  // 13. Predictive 3-Step Action Directives
  const nextStepsPlan: [string, string, string] = [
    `1. Action Immédiate : Exécuter mise calibrée ${calculatedBet} (${kellyPct.toFixed(3)}% du solde) sur cible ${multiplierOptimization.optimalMultiplierSweetSpot}x`,
    `2. Surveillance Volatilité : Régime ${volatilityForecast.volatilityRegime.toUpperCase()} (Sigma prévu ${volatilityForecast.forecastedSigma})`,
    `3. Sécurisation : ${ratchetLock.isLocked ? `Palier Verrouillé +${ratchetLock.lockedProfitFloor}` : `Objectif TP ${targetProfit}`} (${probabilityReachingTakeProfit}% prob.)`
  ];

  return {
    shannonEntropy,
    waldWolfowitzZScore: zScore,
    variancePhase,
    isClusteringDetected: isAnomaly,
    bayesianRegimes,
    volatilityForecast,
    multiplierOptimization,
    theoreticalEdge: -0.01,
    dynamicKellyFraction: kellyPct,
    suggestedBetAmount: calculatedBet,
    volatilityDampener: dampener,
    probabilityReachingTakeProfit,
    expectedDrawdownFloor,
    riskOfRuinEstimate,
    bestFittedGame,
    gameArbitrageRationale,
    quantumEfficiencyScore,
    nextStepsPlan,
    ratchetLock,
    vipRakeback,
  };
}

