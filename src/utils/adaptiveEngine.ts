import { BettingStrategy, BetResult } from '../types';
import { PREDEFINED_STRATEGIES } from './predefinedStrategies';

export interface AdaptiveStrategySettings {
  enabled: boolean;
  // Trigger thresholds
  maxLossStreakTrigger: number; // e.g. 4 consecutive losses
  drawdownPercentTrigger: number; // e.g. 8% drawdown from peak
  lossAmountTrigger: number; // e.g. 10 USDT net loss
  // Fallback Action
  action: 'auto_switch_strategy' | 'switch_to_custom' | 'reduce_bet_only' | 'pause_cool_down';
  customFallbackStrategyId?: string; // e.g. 'strat-dice-oscars-grind'
  reduceBetPercent: number; // e.g. 50%
  autoRotateSeedOnPivot: boolean; // Shuffles client seed to break RNG clustering
  // Recovery Condition
  recoveryMode: 'on_win_streak' | 'on_profit_recovered' | 'fixed_bets';
  recoveryWinStreakCount: number; // e.g. 2 wins in a row
  recoveryBetsCount: number; // e.g. 10 bets
  recoveryTargetProfitPercent: number; // e.g. recover 80% of deficit
}

export interface AdaptiveState {
  isPivoted: boolean;
  primaryStrategy: BettingStrategy;
  activeStrategy: BettingStrategy;
  pivotReason: string | null;
  pivotTimestamp: number | null;
  pivotCount: number;
  betsSincePivot: number;
  winsSincePivot: number;
  lossStreakAtPivot: number;
  profitAtPivot: number;
  deficitToRecover: number;
  intelligentLog: Array<{
    id: string;
    timestamp: number;
    type: 'pivot' | 'recovery' | 'seed_rotation' | 'warning' | 'info';
    message: string;
    fromStrategy?: string;
    toStrategy?: string;
  }>;
}

export const DEFAULT_ADAPTIVE_SETTINGS: AdaptiveStrategySettings = {
  enabled: true,
  maxLossStreakTrigger: 4,
  drawdownPercentTrigger: 7.5,
  lossAmountTrigger: 5.0,
  action: 'auto_switch_strategy',
  customFallbackStrategyId: 'strat-dice-oscars-grind',
  reduceBetPercent: 50,
  autoRotateSeedOnPivot: true,
  recoveryMode: 'on_win_streak',
  recoveryWinStreakCount: 2,
  recoveryBetsCount: 8,
  recoveryTargetProfitPercent: 75,
};

/**
 * Automatically select the most effective mathematical counter-strategy
 * to defend the bankroll and recover from drawdowns based on game type.
 */
export function findBestDefensiveStrategy(
  currentGame: string,
  currentRiskLevel: string,
  preferredFallbackId?: string
): BettingStrategy {
  // 1. If user provided a specific fallback strategy that exists, use it
  if (preferredFallbackId) {
    const custom = PREDEFINED_STRATEGIES.find((s) => s.id === preferredFallbackId);
    if (custom) return custom;
  }

  // 2. Game-specific optimal defensive recovery strategies
  const gameStrats = PREDEFINED_STRATEGIES.filter((s) => s.game === currentGame);

  if (currentGame === 'dice') {
    // Oscar's grind or D'Alembert linear are mathematically the safest for recovery
    const oscars = gameStrats.find((s) => s.id.includes('oscars-grind'));
    if (oscars) return oscars;
    const dalembert = gameStrats.find((s) => s.id.includes('dalembert'));
    if (dalembert) return dalembert;
    const fibo = gameStrats.find((s) => s.id.includes('fibonacci-doux'));
    if (fibo) return fibo;
    const scalper = gameStrats.find((s) => s.id.includes('high-prob') || s.riskLevel === 'ultra_safe');
    if (scalper) return scalper;
  }

  if (currentGame === 'limbo') {
    const lowRiskLimbo = gameStrats.find((s) => s.targetMultiplier <= 1.5 || s.riskLevel === 'low' || s.riskLevel === 'ultra_safe');
    if (lowRiskLimbo) return lowRiskLimbo;
  }

  if (currentGame === 'plinko') {
    const safePlinko = gameStrats.find((s) => s.gameConfig?.plinkoRisk === 'low' || s.riskLevel === 'low');
    if (safePlinko) return safePlinko;
  }

  if (currentGame === 'mines') {
    const safeMines = gameStrats.find((s) => (s.gameConfig?.minesCount || 3) <= 2 || s.riskLevel === 'low');
    if (safeMines) return safeMines;
  }

  // Generic fallback: pick lowest risk level strategy for that game
  const ultraSafe = gameStrats.find((s) => s.riskLevel === 'ultra_safe');
  if (ultraSafe) return ultraSafe;
  const lowSafe = gameStrats.find((s) => s.riskLevel === 'low');
  if (lowSafe) return lowSafe;

  // Ultimate fallback: First available for that game or current
  return gameStrats[0] || PREDEFINED_STRATEGIES[0];
}

export interface AdaptiveDecisionResult {
  shouldPivot: boolean;
  shouldRecover: boolean;
  shouldRotateSeed: boolean;
  targetStrategy?: BettingStrategy;
  logMessage?: string;
  reason?: string;
}

/**
 * Intelligent Decision-Making Engine:
 * Analyzes the live session state, running drawdown, negative streaks,
 * and determines if a tactical strategy switch or recovery is required.
 */
export function evaluateAdaptiveDecision(
  settings: AdaptiveStrategySettings,
  adaptiveState: AdaptiveState,
  currentStrategy: BettingStrategy,
  sessionProfit: number,
  peakSessionProfit: number,
  currentStreak: number, // positive = win streak, negative = loss streak
  currentBalance: number
): AdaptiveDecisionResult {
  if (!settings.enabled) {
    return { shouldPivot: false, shouldRecover: false, shouldRotateSeed: false };
  }

  const lossStreak = currentStreak < 0 ? Math.abs(currentStreak) : 0;
  const winStreak = currentStreak > 0 ? currentStreak : 0;
  const currentDrawdown = peakSessionProfit - sessionProfit;
  const drawdownPercent = currentBalance > 0 ? (currentDrawdown / (currentBalance + currentDrawdown)) * 100 : 0;

  // CASE 1: Currently in Pivot (Defensive Mode) -> Check if we should recover
  if (adaptiveState.isPivoted) {
    let shouldRecover = false;
    let recoveryReason = '';

    if (settings.recoveryMode === 'on_win_streak' && winStreak >= settings.recoveryWinStreakCount) {
      shouldRecover = true;
      recoveryReason = `Régime stabilisé : ${winStreak} victoires consécutives validées en mode défensif.`;
    } else if (settings.recoveryMode === 'fixed_bets' && adaptiveState.betsSincePivot >= settings.recoveryBetsCount) {
      shouldRecover = true;
      recoveryReason = `Cycle de temporisation achevé (${adaptiveState.betsSincePivot} tours effectués).`;
    } else if (settings.recoveryMode === 'on_profit_recovered') {
      const recoveredAmount = sessionProfit - adaptiveState.profitAtPivot;
      const targetRecovery = adaptiveState.deficitToRecover * (settings.recoveryTargetProfitPercent / 100);
      if (recoveredAmount >= targetRecovery) {
        shouldRecover = true;
        recoveryReason = `Objectif de récupération atteint (+${recoveredAmount.toFixed(4)} ${currentStrategy.currency} regagnés).`;
      }
    }

    // Also auto-recover if session profit hits a new all-time peak
    if (sessionProfit > peakSessionProfit) {
      shouldRecover = true;
      recoveryReason = 'Nouveau sommet de profit atteint. Retour automatique à la stratégie principale.';
    }

    if (shouldRecover) {
      return {
        shouldPivot: false,
        shouldRecover: true,
        shouldRotateSeed: false,
        targetStrategy: adaptiveState.primaryStrategy,
        reason: recoveryReason,
        logMessage: `🎯 [RETOURS TACTIQUE] ${recoveryReason} Réactivation de « ${adaptiveState.primaryStrategy.name} ».`,
      };
    }

    return { shouldPivot: false, shouldRecover: false, shouldRotateSeed: false };
  }

  // CASE 2: Currently in Primary Strategy -> Check if adverse conditions trigger a Pivot
  let triggerPivot = false;
  let pivotReason = '';

  if (settings.maxLossStreakTrigger > 0 && lossStreak >= settings.maxLossStreakTrigger) {
    triggerPivot = true;
    pivotReason = `Série noire détectée : ${lossStreak} défaites consécutives (Seuil: ${settings.maxLossStreakTrigger}).`;
  } else if (settings.drawdownPercentTrigger > 0 && drawdownPercent >= settings.drawdownPercentTrigger) {
    triggerPivot = true;
    pivotReason = `Drawdown critique de ${drawdownPercent.toFixed(1)}% depuis le pic (+${peakSessionProfit.toFixed(2)} -> ${sessionProfit.toFixed(2)} ${currentStrategy.currency}).`;
  } else if (settings.lossAmountTrigger > 0 && sessionProfit <= -settings.lossAmountTrigger) {
    triggerPivot = true;
    pivotReason = `Perte cumulée de ${Math.abs(sessionProfit).toFixed(2)} ${currentStrategy.currency} (Seuil d'alerte: -${settings.lossAmountTrigger} ${currentStrategy.currency}).`;
  }

  if (triggerPivot) {
    const defensiveStrat = findBestDefensiveStrategy(
      currentStrategy.game,
      currentStrategy.riskLevel,
      settings.customFallbackStrategyId
    );

    const targetStrat: BettingStrategy = {
      ...defensiveStrat,
      currency: currentStrategy.currency,
      // Adjust base bet if reduceBetPercent is set
      baseBet: Number((currentStrategy.baseBet * (settings.reduceBetPercent / 100)).toFixed(4)) || defensiveStrat.baseBet,
    };

    return {
      shouldPivot: true,
      shouldRecover: false,
      shouldRotateSeed: settings.autoRotateSeedOnPivot,
      targetStrategy: targetStrat,
      reason: pivotReason,
      logMessage: `🛡️ [PIVOT INTELLIGENT] ${pivotReason} Bascule immédiate vers « ${targetStrat.name} » avec mise réduite à ${targetStrat.baseBet} ${targetStrat.currency}${settings.autoRotateSeedOnPivot ? ' & Rotation Provably Fair Seed' : ''}.`,
    };
  }

  return { shouldPivot: false, shouldRecover: false, shouldRotateSeed: false };
}
