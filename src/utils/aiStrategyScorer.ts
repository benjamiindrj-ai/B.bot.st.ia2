import { BettingStrategy, RiskLevel } from '../types';

export interface AiStrategyScore {
  totalScore: number; // 0 to 100
  grade: 'S+' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  gradeBg: string;
  gradeBorder: string;
  // Sub-scores
  profitStabilityScore: number; // 0 to 50
  drawdownResilienceScore: number; // 0 to 50
  // Detailed metrics
  details: {
    profitFactorRating: number; // 0 to 15
    trendSmoothnessRating: number; // 0 to 15
    winConsistencyRating: number; // 0 to 20
    drawdownDepthRating: number; // 0 to 35
    exposureSafetyRating: number; // 0 to 15
    maxDrawdownPercent: number;
    maxBetMultiplier: number;
    sharpeRatio: number;
    verdictSummary: string;
    keyStrength: string;
    keyVulnerability: string;
  };
}

export interface BacktestSummaryInput {
  strategy: BettingStrategy;
  finalBankroll: number;
  netProfit: number;
  roiPercent: number;
  winRate: number;
  totalBets: number;
  totalWon: number;
  totalLost: number;
  totalWagered: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  averageBet: number;
  maxBetPlaced: number;
  maxWinStreak: number;
  maxLossStreak: number;
  estimatedRakeback: number;
  sharpeProxy: number;
  isStoppedEarly: boolean;
  stopReason?: string;
}

export interface BacktestStepInput {
  step: number;
  betPlaced: number;
  won: boolean;
  profit: number;
  bankroll: number;
  netProfit: number;
  drawdown: number;
  rule?: string;
}

/**
 * AI Strategy Scoring Algorithm (0-100)
 * Evaluates strategy performance deterministically based on:
 * 1. Profit Stability & Consistency (50 pts max)
 * 2. Maximum Drawdown & Capital Preservation (50 pts max)
 */
export function calculateAiStrategyScore(
  summary: BacktestSummaryInput,
  steps: BacktestStepInput[],
  initialBankroll: number
): AiStrategyScore {
  const bankroll = Math.max(1, initialBankroll);
  
  // ----------------------------------------------------
  // PART 1: PROFIT STABILITY & CONSISTENCY (Max 50 pts)
  // ----------------------------------------------------
  
  // 1.1 Profit Factor Rating (0 - 15 pts)
  let profitFactorRating = 0;
  if (summary.profitFactor >= 2.0) {
    profitFactorRating = 15;
  } else if (summary.profitFactor >= 1.5) {
    profitFactorRating = 12 + ((summary.profitFactor - 1.5) / 0.5) * 3;
  } else if (summary.profitFactor >= 1.1) {
    profitFactorRating = 8 + ((summary.profitFactor - 1.1) / 0.4) * 4;
  } else if (summary.profitFactor >= 1.0) {
    profitFactorRating = 6 + ((summary.profitFactor - 1.0) / 0.1) * 2;
  } else if (summary.profitFactor >= 0.7) {
    profitFactorRating = 2 + ((summary.profitFactor - 0.7) / 0.3) * 4;
  } else {
    profitFactorRating = Math.max(0, summary.profitFactor * 3);
  }

  // 1.2 Trend Smoothness & Sharpe Ratio (0 - 15 pts)
  let trendSmoothnessRating = 0;
  if (steps.length > 2) {
    // Calculate variance of incremental steps
    const profitSteps = steps.map((s) => s.profit);
    const avgStepProfit = profitSteps.reduce((a, b) => a + b, 0) / profitSteps.length;
    const variance = profitSteps.reduce((a, b) => a + Math.pow(b - avgStepProfit, 2), 0) / profitSteps.length;
    const stdDev = Math.sqrt(variance);

    // If profit is growing with low volatility
    const sharpe = summary.sharpeProxy;
    if (sharpe >= 2.5) {
      trendSmoothnessRating = 15;
    } else if (sharpe >= 1.5) {
      trendSmoothnessRating = 12 + ((sharpe - 1.5) / 1.0) * 3;
    } else if (sharpe >= 0.5) {
      trendSmoothnessRating = 8 + ((sharpe - 0.5) / 1.0) * 4;
    } else if (sharpe >= 0.0) {
      trendSmoothnessRating = 5 + (sharpe / 0.5) * 3;
    } else if (sharpe >= -1.0) {
      trendSmoothnessRating = Math.max(1, 5 + (sharpe * 3));
    } else {
      trendSmoothnessRating = 0;
    }

    // Adjust for net profit positivity
    if (summary.netProfit < 0) {
      trendSmoothnessRating = Math.max(0, trendSmoothnessRating - 4);
    }
  } else {
    trendSmoothnessRating = 7;
  }

  // 1.3 Win Consistency & Net Return Quality (0 - 20 pts)
  let winConsistencyRating = 0;
  const roi = summary.roiPercent;
  if (roi >= 15) {
    winConsistencyRating += 10;
  } else if (roi >= 5) {
    winConsistencyRating += 7 + ((roi - 5) / 10) * 3;
  } else if (roi > 0) {
    winConsistencyRating += 4 + (roi / 5) * 3;
  } else if (roi >= -5) {
    winConsistencyRating += 2;
  } else {
    winConsistencyRating += 0;
  }

  // Bonus for controlled winrate & low loss streak
  const maxLossStreak = summary.maxLossStreak;
  if (maxLossStreak <= 3) {
    winConsistencyRating += 10;
  } else if (maxLossStreak <= 6) {
    winConsistencyRating += 7;
  } else if (maxLossStreak <= 10) {
    winConsistencyRating += 4;
  } else if (maxLossStreak <= 15) {
    winConsistencyRating += 2;
  } else {
    winConsistencyRating += 0;
  }

  const profitStabilityScore = Math.min(50, Math.max(0, Number((profitFactorRating + trendSmoothnessRating + winConsistencyRating).toFixed(1))));

  // ----------------------------------------------------
  // PART 2: MAXIMUM DRAWDOWN & CAPITAL PRESERVATION (Max 50 pts)
  // ----------------------------------------------------

  // 2.1 Drawdown Depth Rating (0 - 35 pts)
  // Drawdown measured as % of starting bankroll
  const maxDrawdownPercent = summary.maxDrawdownPercent;
  let drawdownDepthRating = 0;

  if (maxDrawdownPercent <= 2.0) {
    drawdownDepthRating = 35;
  } else if (maxDrawdownPercent <= 5.0) {
    drawdownDepthRating = 32 + ((5.0 - maxDrawdownPercent) / 3.0) * 3;
  } else if (maxDrawdownPercent <= 10.0) {
    drawdownDepthRating = 26 + ((10.0 - maxDrawdownPercent) / 5.0) * 6;
  } else if (maxDrawdownPercent <= 20.0) {
    drawdownDepthRating = 18 + ((20.0 - maxDrawdownPercent) / 10.0) * 8;
  } else if (maxDrawdownPercent <= 35.0) {
    drawdownDepthRating = 10 + ((35.0 - maxDrawdownPercent) / 15.0) * 8;
  } else if (maxDrawdownPercent <= 50.0) {
    drawdownDepthRating = 4 + ((50.0 - maxDrawdownPercent) / 15.0) * 6;
  } else if (maxDrawdownPercent <= 80.0) {
    drawdownDepthRating = 1 + ((80.0 - maxDrawdownPercent) / 30.0) * 3;
  } else {
    drawdownDepthRating = 0; // Near-bust / liquidation
  }

  // 2.2 Exposure Safety Rating (0 - 15 pts)
  // Measures ratio between Max Bet Placed vs Base Bet (Martingale explosion risk)
  const baseBet = Math.max(0.0001, summary.strategy.baseBet);
  const maxBetMultiplier = summary.maxBetPlaced / baseBet;
  let exposureSafetyRating = 0;

  if (maxBetMultiplier <= 2.0) {
    exposureSafetyRating = 15; // Constant / mild progression
  } else if (maxBetMultiplier <= 5.0) {
    exposureSafetyRating = 13;
  } else if (maxBetMultiplier <= 10.0) {
    exposureSafetyRating = 10;
  } else if (maxBetMultiplier <= 20.0) {
    exposureSafetyRating = 7;
  } else if (maxBetMultiplier <= 50.0) {
    exposureSafetyRating = 4;
  } else if (maxBetMultiplier <= 100.0) {
    exposureSafetyRating = 2;
  } else {
    exposureSafetyRating = 0; // Dangerous 100x+ base bet spike
  }

  const drawdownResilienceScore = Math.min(50, Math.max(0, Number((drawdownDepthRating + exposureSafetyRating).toFixed(1))));

  // ----------------------------------------------------
  // TOTAL AI SCORE & GRADE ASSIGNMENT
  // ----------------------------------------------------
  const totalScore = Math.round(Math.min(100, Math.max(0, profitStabilityScore + drawdownResilienceScore)));

  let grade: 'S+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  let gradeColor = 'text-amber-400';
  let gradeBg = 'bg-amber-500/20';
  let gradeBorder = 'border-amber-500/40';

  if (totalScore >= 90) {
    grade = 'S+';
    gradeColor = 'text-emerald-400';
    gradeBg = 'bg-emerald-500/20';
    gradeBorder = 'border-emerald-500/50';
  } else if (totalScore >= 80) {
    grade = 'A';
    gradeColor = 'text-teal-400';
    gradeBg = 'bg-teal-500/20';
    gradeBorder = 'border-teal-500/40';
  } else if (totalScore >= 68) {
    grade = 'B';
    gradeColor = 'text-cyan-400';
    gradeBg = 'bg-cyan-500/20';
    gradeBorder = 'border-cyan-500/40';
  } else if (totalScore >= 50) {
    grade = 'C';
    gradeColor = 'text-amber-400';
    gradeBg = 'bg-amber-500/20';
    gradeBorder = 'border-amber-500/40';
  } else if (totalScore >= 35) {
    grade = 'D';
    gradeColor = 'text-orange-400';
    gradeBg = 'bg-orange-500/20';
    gradeBorder = 'border-orange-500/40';
  } else {
    grade = 'F';
    gradeColor = 'text-rose-400';
    gradeBg = 'bg-rose-500/20';
    gradeBorder = 'border-rose-500/50';
  }

  // ----------------------------------------------------
  // NATURAL LANGUAGE AI SUMMARY GENERATION
  // ----------------------------------------------------
  let keyStrength = '';
  let keyVulnerability = '';
  let verdictSummary = '';

  if (drawdownDepthRating >= 30) {
    keyStrength = `Excellente préservation du capital (DD max limité à ${maxDrawdownPercent}%)`;
  } else if (profitFactorRating >= 12) {
    keyStrength = `Rendement élevé avec un Profit Factor solide (${summary.profitFactor}x)`;
  } else if (exposureSafetyRating >= 12) {
    keyStrength = `Contrôle strict des mises (Pic de mise à ${maxBetMultiplier.toFixed(1)}x la base)`;
  } else {
    keyStrength = `Comportement prévisible sur cycles courts`;
  }

  if (maxDrawdownPercent >= 30) {
    keyVulnerability = `Forte exposition au drawdown (${maxDrawdownPercent}% du capital entamé)`;
  } else if (maxBetMultiplier >= 32) {
    keyVulnerability = `Emballement de la mise lors des séries de défaites (${maxBetMultiplier.toFixed(0)}x base bet)`;
  } else if (summary.netProfit < 0) {
    keyVulnerability = `Rendement net négatif (${summary.roiPercent}% ROI)`;
  } else if (summary.maxLossStreak >= 8) {
    keyVulnerability = `Sensibilité accrue aux séries de ${summary.maxLossStreak} défaites`;
  } else {
    keyVulnerability = `Régularité modérée nécessitant un suivi actif`;
  }

  if (totalScore >= 85) {
    verdictSummary = `Stratégie de très haute qualité avec une excellente stabilité de gains et une protection éprouvée contre le drawdown.`;
  } else if (totalScore >= 70) {
    verdictSummary = `Profil robuste et équilibré, convenant à des sessions de farming ou de jeu prolongées.`;
  } else if (totalScore >= 50) {
    verdictSummary = `Stratégie fonctionnelle mais sujette à des fluctuations notables de solde.`;
  } else {
    verdictSummary = `Profil à haut risque avec forte volatilité et danger d'érosion rapide du capital lors des séries défavorables.`;
  }

  return {
    totalScore,
    grade,
    gradeColor,
    gradeBg,
    gradeBorder,
    profitStabilityScore,
    drawdownResilienceScore,
    details: {
      profitFactorRating: Number(profitFactorRating.toFixed(1)),
      trendSmoothnessRating: Number(trendSmoothnessRating.toFixed(1)),
      winConsistencyRating: Number(winConsistencyRating.toFixed(1)),
      drawdownDepthRating: Number(drawdownDepthRating.toFixed(1)),
      exposureSafetyRating: Number(exposureSafetyRating.toFixed(1)),
      maxDrawdownPercent,
      maxBetMultiplier: Number(maxBetMultiplier.toFixed(1)),
      sharpeRatio: summary.sharpeProxy,
      verdictSummary,
      keyStrength,
      keyVulnerability,
    },
  };
}
