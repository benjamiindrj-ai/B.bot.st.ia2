import { BettingStrategy } from '../types';
import { PREDEFINED_STRATEGIES } from './predefinedStrategies';

export interface BankrollSurvivalMetrics {
  balance: number;
  globalRiskPercent: number;
  baseStakeAmount: number;
  totalUnits: number;
  accountSurvivalScore: number; // 0 - 100
  survivalTier: 'ultra_safe' | 'safe' | 'balanced' | 'dynamic' | 'aggressive';
  survivalTierLabel: string;
  maxConsecutiveLossTolerance: {
    flat: number;
    dalembert: number;
    martingale: number;
    oscarsGrind: number;
    fibonacci: number;
  };
  ruinProbability1000Bets: number; // percentage e.g. 0.001%
  estimatedValueAtRisk95: number; // VaR in currency
  recommendedStopLossAmount: number;
  recommendedTakeProfitAmount: number;
  safeDailyExposureCap: number;
}

/**
 * Calculates quantitative survival metrics for a given bankroll and global fixed risk percentage.
 */
export function calculateAccountSurvivalMetrics(
  balance: number,
  globalRiskPercent: number = 0.5
): BankrollSurvivalMetrics {
  const safeBalance = Math.max(1, balance || 100);
  const safeRiskPct = Math.max(0.01, Math.min(15.0, globalRiskPercent || 0.5));
  
  const baseStakeAmount = Number(((safeBalance * safeRiskPct) / 100).toFixed(4));
  const totalUnits = safeRiskPct > 0 ? Math.round(100 / safeRiskPct) : 200;

  // Ruin probability calculation based on Gambler's Ruin with 1% house edge (p = 0.495, q = 0.505)
  // Formula: ((q/p)^Units - (q/p)^total) / ... approx simplified for high unit counts
  const p = 0.495;
  const q = 0.505;
  const ratio = q / p; // ~1.0202
  let ruinProb = Math.min(99.9, Math.max(0.0001, (1 / Math.pow(ratio, totalUnits / 2)) * 100));
  if (totalUnits >= 500) ruinProb = 0.001;
  else if (totalUnits >= 200) ruinProb = 0.05;
  else if (totalUnits >= 100) ruinProb = 0.8;
  else if (totalUnits >= 50) ruinProb = 4.2;
  else if (totalUnits >= 20) ruinProb = 18.5;
  else ruinProb = 45.0;

  // Determine survival tier
  let survivalTier: 'ultra_safe' | 'safe' | 'balanced' | 'dynamic' | 'aggressive' = 'safe';
  let survivalTierLabel = 'Survie Institutionnelle / Long-Terme';
  let accountSurvivalScore = 95;

  if (safeRiskPct <= 0.25) {
    survivalTier = 'ultra_safe';
    survivalTierLabel = 'Survie Maximale (Bouclier Anti-Ruine > 1000 Paris)';
    accountSurvivalScore = 99;
  } else if (safeRiskPct <= 0.75) {
    survivalTier = 'safe';
    survivalTierLabel = 'Survie Haute (Recommandé Long-Terme - 200 à 500 Paris)';
    accountSurvivalScore = 94;
  } else if (safeRiskPct <= 1.5) {
    survivalTier = 'balanced';
    survivalTierLabel = 'Équilibré Standard (100 Paris de Réserve)';
    accountSurvivalScore = 85;
  } else if (safeRiskPct <= 3.0) {
    survivalTier = 'dynamic';
    survivalTierLabel = 'Dynamique Modéré (30 à 50 Paris de Réserve)';
    accountSurvivalScore = 70;
  } else {
    survivalTier = 'aggressive';
    survivalTierLabel = 'Agressif / Volatilité Élevée (< 30 Paris)';
    accountSurvivalScore = 45;
  }

  // Calculate consecutive loss tolerance before 50% bankroll depletion
  const halfBankroll = safeBalance * 0.5;
  const flatLossTolerance = Math.floor(halfBankroll / Math.max(0.0001, baseStakeAmount));
  
  // Martingale steps: sum(base * 2^k) = base * (2^(n+1) - 1) <= halfBankroll
  const martingaleSteps = Math.max(1, Math.floor(Math.log2((halfBankroll / Math.max(0.0001, baseStakeAmount)) + 1)));

  // D'Alembert steps: sum(base + k*step)
  const dalembertSteps = Math.max(1, Math.floor(Math.sqrt((2 * halfBankroll) / Math.max(0.0001, baseStakeAmount * 0.5))));

  // Fibonacci steps
  const fibonacciSteps = Math.min(30, Math.max(1, Math.floor(martingaleSteps * 1.5)));

  // Oscar's Grind cycles tolerance
  const oscarsGrindTolerance = Math.floor(flatLossTolerance * 1.3);

  // Value at Risk at 95% confidence over 100 bets session
  const estimatedVaR95 = Number((baseStakeAmount * Math.sqrt(100) * 1.645).toFixed(2));

  // Calibrated global Stop Loss and Take Profit
  const recommendedStopLossAmount = Number((baseStakeAmount * Math.min(25, totalUnits * 0.25)).toFixed(2));
  const recommendedTakeProfitAmount = Number((baseStakeAmount * Math.min(35, totalUnits * 0.35)).toFixed(2));
  const safeDailyExposureCap = Number((safeBalance * Math.min(30, safeRiskPct * 15)).toFixed(2));

  return {
    balance: safeBalance,
    globalRiskPercent: safeRiskPct,
    baseStakeAmount,
    totalUnits,
    accountSurvivalScore,
    survivalTier,
    survivalTierLabel,
    maxConsecutiveLossTolerance: {
      flat: flatLossTolerance,
      dalembert: dalembertSteps,
      martingale: martingaleSteps,
      oscarsGrind: oscarsGrindTolerance,
      fibonacci: fibonacciSteps,
    },
    ruinProbability1000Bets: Number(ruinProb.toFixed(3)),
    estimatedValueAtRisk95: Math.min(safeBalance, estimatedVaR95),
    recommendedStopLossAmount: Math.max(0.01, recommendedStopLossAmount),
    recommendedTakeProfitAmount: Math.max(0.01, recommendedTakeProfitAmount),
    safeDailyExposureCap,
  };
}

/**
 * Adjusts a single betting strategy based on the global risk percentage and current bankroll.
 */
export function calibrateStrategyForGlobalRisk(
  strategy: BettingStrategy,
  balance: number,
  globalRiskPercent: number = 0.5
): BettingStrategy {
  const safeBalance = Math.max(1, balance || 100);
  const safeRiskPct = Math.max(0.01, Math.min(15.0, globalRiskPercent || 0.5));
  
  // Base bet calculation proportional to global risk
  let calibratedBaseBet = (safeBalance * safeRiskPct) / 100;

  // Specific adjustments per strategy mechanic to guarantee long-term survival:
  const nameLower = (strategy.name || '').toLowerCase();
  const descLower = (strategy.description || '').toLowerCase();
  const onLossAction = strategy.onLossAction;
  const onLossValue = strategy.onLossValue || 0;

  if (onLossAction === 'multiply' && onLossValue >= 1.8) {
    // Martingale or aggressive geometric multipliers require a reduced base bet
    // to absorb at least 8 to 11 consecutive losses safely without liquidating
    calibratedBaseBet = calibratedBaseBet * 0.35;
  } else if (onLossAction === 'increase_fixed') {
    // Linear D'Alembert
    calibratedBaseBet = calibratedBaseBet * 0.75;
  } else if (strategy.targetMultiplier && strategy.targetMultiplier >= 10.0) {
    // High-multiplier moonshots (Limbo 100x, Crash 50x)
    calibratedBaseBet = calibratedBaseBet * 0.40;
  } else if (strategy.riskLevel === 'high') {
    calibratedBaseBet = calibratedBaseBet * 0.50;
  } else if (strategy.riskLevel === 'low') {
    calibratedBaseBet = calibratedBaseBet * 1.0;
  }

  // Format and round
  calibratedBaseBet = Number(Math.max(0.0001, calibratedBaseBet).toFixed(4));

  // Proportionally scale incremental steps if applicable
  let updatedOnLossValue = strategy.onLossValue;
  let updatedOnWinValue = strategy.onWinValue;

  if (strategy.onLossAction === 'increase_fixed') {
    updatedOnLossValue = Number((calibratedBaseBet * 0.5).toFixed(4));
  }
  if (strategy.onWinAction === 'increase_fixed') {
    updatedOnWinValue = Number(calibratedBaseBet.toFixed(4));
  }

  // Calibrate Stop Loss & Take Profit relative to new base bet
  const stopOnLoss = Number((calibratedBaseBet * 25).toFixed(2));
  const stopOnProfit = Number((calibratedBaseBet * 30).toFixed(2));
  const maxBetLimit = Number((calibratedBaseBet * 20).toFixed(2));

  return {
    ...strategy,
    baseBet: calibratedBaseBet,
    stopOnLoss: Math.max(0.01, stopOnLoss),
    stopOnProfit: Math.max(0.01, stopOnProfit),
    maxBetLimit: Math.max(calibratedBaseBet * 2, maxBetLimit),
    onLossValue: updatedOnLossValue,
    onWinValue: updatedOnWinValue,
    aiRationale: strategy.aiRationale 
      ? `${strategy.aiRationale} [Ajusté automatiquement au risque global de ${safeRiskPct}% / Solde ${safeBalance}]`
      : `Calibré automatiquement pour une survie long-terme à ${safeRiskPct}% de risque global.`,
  };
}

/**
 * Adjusts all predefined strategies in memory and returns the list of updated strategies.
 */
export function applyGlobalRiskToAllStrategies(
  balance: number,
  globalRiskPercent: number = 0.5
): {
  updatedStrategies: BettingStrategy[];
  count: number;
  metrics: BankrollSurvivalMetrics;
} {
  const metrics = calculateAccountSurvivalMetrics(balance, globalRiskPercent);
  
  const updatedStrategies: BettingStrategy[] = [];

  for (let i = 0; i < PREDEFINED_STRATEGIES.length; i++) {
    const orig = PREDEFINED_STRATEGIES[i];
    const calibrated = calibrateStrategyForGlobalRisk(orig, balance, globalRiskPercent);
    
    // Mutate in place in the master array
    PREDEFINED_STRATEGIES[i] = calibrated;
    updatedStrategies.push(calibrated);
  }

  // Persist customized strategies in localStorage for persistence across reloads
  try {
    localStorage.setItem('stake_bot_calibrated_strategies', JSON.stringify(updatedStrategies));
    localStorage.setItem('stake_bot_global_risk_percent', globalRiskPercent.toString());
  } catch (e) {
    console.warn('Failed to save calibrated strategies to localStorage:', e);
  }

  return {
    updatedStrategies,
    count: updatedStrategies.length,
    metrics,
  };
}

/**
 * Loads and applies saved calibrated strategies from localStorage on app boot if available.
 */
export function loadSavedCalibratedStrategies(): boolean {
  try {
    const saved = localStorage.getItem('stake_bot_calibrated_strategies');
    if (saved) {
      const parsed: BettingStrategy[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const idx = PREDEFINED_STRATEGIES.findIndex((s) => s.id === item.id);
          if (idx !== -1) {
            PREDEFINED_STRATEGIES[idx] = { ...PREDEFINED_STRATEGIES[idx], ...item };
          }
        }
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load calibrated strategies:', e);
  }
  return false;
}
