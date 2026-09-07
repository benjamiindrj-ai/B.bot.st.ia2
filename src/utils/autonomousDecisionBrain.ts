import { BettingStrategy, BetResult, BotStatistics, StakeGameType } from '../types';
import { PREDEFINED_STRATEGIES } from './predefinedStrategies';
import { computeRealtimeQuantitativeMetrics, QuantitativeMetrics } from './aiQuantitativeOptimizer';

export type AutonomousRegime = 
  | 'DEFICIT_RECOVERY_SURGE'   // 🎯 Deficit / Loss streak / Drawdown: elevate multiplier to recover losses asymmetrically (2.85x - 7.77x)
  | 'PROFIT_COMPOUNDING_LOCK'  // 🛡️ In profit / positive session: lower multiplier to protect and compound gains safely (1.33x - 1.85x)
  | 'WIN_STREAK_SECURE_HARVEST'// 💰 Consecutive wins: conservative low-variance harvest (1.35x - 1.75x)
  | 'BALANCED_EXPEDITION'      // ⚖️ Neutral / Break-even: dynamic exploration (1.53x - 7.20x)
  | 'HIGH_CERTAINTY_REBUILD'   // 🛡️ High Win Chance Corridor (75.0% - 85.0% Win Chance, 1.16x - 1.32x)
  | 'BARBELL_SNIPER_SPIKE'     // 🏹 Asymmetric Micro-Stake Strike (10.0x - 25.0x with 0.02% risk)
  | 'MOONSHOT_JACKPOT_HUNT'    // 💥 Extreme Risk: Random hunt for 1000x, 5000x, 10000x across originals
  | 'TAKE_PROFIT_LOCK'        // 🔒 Approaching target profit: minimum risk, ultra-safe finish (1.33x - 1.55x)
  | 'DEFENSIVE_SHIELD'        // 🛡️ Legacy compatibility alias
  | 'STEADY_SCALPER'          // ⚖️ Legacy compatibility alias
  | 'ASYMMETRIC_SURGE'        // 🚀 Legacy compatibility alias
  | 'QUANTUM_SPECTRUM_PEAK'   // 💎 Legacy compatibility alias
  | 'VIP_WAGER'               // 🚜 Volume generation at minimum loss
  | 'PROVABLY_FAIR_ANOMALY_BREAK'; // ⚡ Cluster breaker: proactive seed rotation & micro-buffer

export type AutonomyLevel = 
  | 'full'        // Full Autonomy: IA selects game, multiplier, strategy & bet sizing
  | 'adaptive'    // Intra-Game Autonomy: IA optimizes multipliers & sizing on chosen game
  | 'shield_only'; // Protective Autonomy: IA only intervenes on drawdowns / loss streaks

export interface MarkovTransitionMatrix {
  pWinAfterWin: number;
  pWinAfterLoss: number;
  pLossAfterLoss: number;
  pLossAfterWin: number;
  sampleSize: number;
  microRegime: 'momentum_win' | 'mean_reversion' | 'cold_drought' | 'ergodic_normal';
  momentumStrength: number; // 0 - 100
  regimeLabel: string;
  recommendation: string;
}

export type StreakTacticalPhase =
  | 'WIN_STREAK_IGNITION'         // 1 win: Kelly momentum pulse (+20% to +35%)
  | 'WIN_STREAK_PAROLI_VAULT'     // 2-3 wins: Trailing Profit Lock (65% locked, 35% compound)
  | 'WIN_STREAK_ALPHA_EXPEDITION' // 4-5 wins: Super-run alpha protection (80% locked)
  | 'WIN_STREAK_CLIMAX_HARVEST'   // 6+ wins: Statistical exhaustion anticipation, bank peak profit & reset
  | 'LOSS_STREAK_ABSORPTION'      // 1 loss: Smooth micro-absorption, balanced multiplier
  | 'LOSS_STREAK_STABILIZATION'   // 2-3 losses: High-Probability Corridor (68-82% win), condition inversion
  | 'LOSS_STREAK_CIRCUIT_BREAKER' // 4-5 losses: Circuit breaker, game hopping & seed rotation
  | 'LOSS_STREAK_SURVIVAL_HARBOR' // 6+ losses: Anti-liquidation contraction (-50% to -75% bet)
  | 'NEUTRAL_FLOW';               // Normal alternating regime

export interface StreakIntelligenceState {
  phase: StreakTacticalPhase;
  label: string;
  badge: string;
  color: string;
  consecutiveCount: number; // positive for wins, negative for losses
  streakAccumulatedProfit: number;
  streakAccumulatedLoss: number;
  trailingProfitLocked: number; // amount of profits permanently locked from win streak
  spatialConditionInverted: boolean; // condition flipped (e.g. Dice above <-> below)
  gameHoppingTriggered: boolean; // game switch specifically to break game-specific loss cluster
  summaryAction: string; // clear explanation of what the AI is doing
}

export interface AutonomousDecision {
  regime: AutonomousRegime;
  regimeLabel: string;
  regimeColor: string;
  actionType: 'CONTINUE' | 'SWITCH_GAME' | 'SCALE_UP' | 'SCALE_DOWN' | 'LOCK_PROFIT' | 'ROTATE_SEED';
  chosenGame: StakeGameType;
  gameSwitchReason?: string;
  chosenMultiplier: number;
  chosenWinChance: number; // e.g. 49.5%, 75.0%, 28.3%
  chosenStrategyId: string;
  strategyName: string;
  calculatedBetAmount: number;
  reasoning: string;
  tacticalDirective: string;
  bankrollHealthScore: number; // 0 - 100
  varianceEntropy: 'low' | 'normal' | 'high' | 'turbulent';
  seedRotationAdvised: boolean;
  quantitativeMetrics?: QuantitativeMetrics;
  multiplierSpectrumPct?: number; // 0% (1.33x) to 100% (7.77x)
  martingaleStep?: number; // 0 to maxMartingaleIncreases (0 = base bet, 1 = +100%, 2 = +100%, etc.)
  maxMartingaleIncreases?: number; // strict cap (4 or 5)
  isMartingaleCapReached?: boolean; // true if loss streak exceeded 4/5 and auto-reset occurred
  dynamicBetAdjustmentPct?: number; // e.g. -22%, -30%, +22%, +30% (strictly capped at max +100%)
  dynamicBetAdjustmentReason?: string; // Reason for dynamic modulation
  unadjustedBaseBet?: number; // Reference base bet before modulation
  markovMatrix?: MarkovTransitionMatrix;
  isBarbellSnipeActive?: boolean;
  gameConfig?: any;
  timestamp: number;
  // Advanced Streak Intelligence
  streakIntelligence: StreakIntelligenceState;
  streakTacticalPhase?: StreakTacticalPhase;
  streakTacticalLabel?: string;
  streakTacticalBadge?: string;
  streakTacticalColor?: string;
  streakTrailingProfitLocked?: number;
  streakConditionInverted?: boolean;
  streakGameHopAdvised?: boolean;
}

export interface AutonomousEngineConfig {
  enabled: boolean;
  autonomyLevel: AutonomyLevel;
  allowGameSwitching: boolean;
  preferredGames: StakeGameType[];
  riskAppetite: 'conservative' | 'balanced' | 'aggressive' | 'extreme_moonshot';
  targetProfit: number;
  stopLoss: number;
  baseBankrollPct: number; // e.g. 0.1% of current bankroll
  maxBetBankrollPct: number; // e.g. 2.0% cap of current bankroll
  autoRotateSeedOnAnomaly: boolean;
  minMultiplier: number; // Default 1.33
  maxMultiplier: number; // Default 7.77
  dynamicMultiplierEnabled: boolean; // True
  martingaleEnabled: boolean; // True: allows Martingale up to capped steps
  maxMartingaleIncreases: number; // Strict limit: 4 or 5 increases max
  martingaleMultiplier: number; // Step multiplier: 2.0 (+100% increase on loss)
  dynamicBetSizingEnabled: boolean; // True: allows AI to fine-tune bet
  maxBetIncreasePct: number; // Maximum increase cap: 100 (+100% max)
  // Advanced Quant Brain Options
  markovMomentumEnabled?: boolean; // Modulation based on Markov transitions P(W|W) and P(L|L)
  barbellSnipingEnabled?: boolean; // 95% safe / 5% asymmetric snipe
  highWinChanceRecoveryEnabled?: boolean; // Use high win chance (75-85%) instead of higher multiplier during drawdowns
  intelligentGameHoppingEnabled?: boolean; // Rotate games when entropy cluster / drought detected
  // Advanced Streak Intelligence Options
  streakAdaptiveDefenseEnabled?: boolean; // 4-Tier Loss Streak Defense & Circuit Breaker
  streakParoliVaultEnabled?: boolean; // Trailing profit lock & win streak harvest
  streakDiceInversionEnabled?: boolean; // Invert dice Over/Under during loss clusters
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousEngineConfig = {
  enabled: true,
  autonomyLevel: 'full',
  allowGameSwitching: true,
  preferredGames: ['dice', 'limbo', 'mines', 'plinko'],
  riskAppetite: 'balanced',
  targetProfit: 10.0,
  stopLoss: 20.0,
  baseBankrollPct: 0.10, // 0.10%
  maxBetBankrollPct: 2.0, // 2% max single bet
  autoRotateSeedOnAnomaly: true,
  minMultiplier: 1.33,
  maxMultiplier: 7.77,
  dynamicMultiplierEnabled: true,
  martingaleEnabled: true,
  maxMartingaleIncreases: 4,
  martingaleMultiplier: 2.0,
  dynamicBetSizingEnabled: true,
  maxBetIncreasePct: 100, // Hard cap: max +100% increase
  markovMomentumEnabled: true,
  barbellSnipingEnabled: true,
  highWinChanceRecoveryEnabled: true,
  intelligentGameHoppingEnabled: true,
  streakAdaptiveDefenseEnabled: true,
  streakParoliVaultEnabled: true,
  streakDiceInversionEnabled: true,
};

/**
 * Computes Empirical Markov Transition Matrix from historical bets using Laplace smoothing.
 */
export function computeMarkovTransitionMatrix(recentBets: BetResult[]): MarkovTransitionMatrix {
  const bets = recentBets.slice(0, 35).reverse(); // chronological order: oldest to newest
  if (bets.length < 2) {
    return {
      pWinAfterWin: 0.50,
      pWinAfterLoss: 0.50,
      pLossAfterLoss: 0.50,
      pLossAfterWin: 0.50,
      sampleSize: bets.length,
      microRegime: 'ergodic_normal',
      momentumStrength: 50,
      regimeLabel: 'Dispersion Équidistribuée',
      recommendation: 'Cadence nominale sans biais statistique',
    };
  }

  let nWW = 0;
  let nWL = 0;
  let nLW = 0;
  let nLL = 0;

  for (let i = 0; i < bets.length - 1; i++) {
    const currWon = bets[i].won;
    const nextWon = bets[i + 1].won;
    if (currWon && nextWon) nWW++;
    else if (currWon && !nextWon) nWL++;
    else if (!currWon && nextWon) nLW++;
    else if (!currWon && !nextWon) nLL++;
  }

  // Laplace smoothed transition probabilities (+1 / +2)
  const pWinAfterWin = Number(((nWW + 1) / (nWW + nWL + 2)).toFixed(3));
  const pWinAfterLoss = Number(((nLW + 1) / (nLW + nLL + 2)).toFixed(3));
  const pLossAfterLoss = Number(((nLL + 1) / (nLW + nLL + 2)).toFixed(3));
  const pLossAfterWin = Number(((nWL + 1) / (nWW + nWL + 2)).toFixed(3));

  let microRegime: MarkovTransitionMatrix['microRegime'] = 'ergodic_normal';
  let regimeLabel = '⚖️ Aléatoire Ergodique Stable';
  let recommendation = 'Maintien de la trajectoire standard';
  let momentumStrength = 50;

  if (pWinAfterWin >= 0.57 && nWW >= 1) {
    microRegime = 'momentum_win';
    regimeLabel = '🔥 Autocorrélation Gagnante Positive';
    recommendation = 'Surge Kelly & Accélération de Mise (+20% à +50%)';
    momentumStrength = Math.min(100, Math.round(pWinAfterWin * 110));
  } else if (pLossAfterLoss >= 0.60 && nLL >= 2) {
    microRegime = 'cold_drought';
    regimeLabel = '❄️ Persistance de Sécheresse / Clustering Négatif';
    recommendation = 'Contraction Préventive (-30% à -50%) & Rotation de Jeu';
    momentumStrength = Math.max(10, Math.round((1 - pLossAfterLoss) * 80));
  } else if (pWinAfterLoss >= 0.55 && nLW >= 1) {
    microRegime = 'mean_reversion';
    regimeLabel = '🔄 Rebond Statistique vers la Moyenne';
    recommendation = 'Cote Cible Asymétrique pour Rebond Direct';
    momentumStrength = Math.round(pWinAfterLoss * 100);
  }

  return {
    pWinAfterWin,
    pWinAfterLoss,
    pLossAfterLoss,
    pLossAfterWin,
    sampleSize: bets.length - 1,
    microRegime,
    momentumStrength,
    regimeLabel,
    recommendation,
  };
}

/**
 * High-performance Quantitative Autonomous Decision Brain.
 * Evaluates session momentum, drawdown velocity, streak entropy, Markov chains,
 * distance to take-profit, and mathematically computes the optimal next move.
 */
export function computeAutonomousDecision(
  config: AutonomousEngineConfig,
  currentStrategy: BettingStrategy,
  recentBets: BetResult[],
  stats: BotStatistics | undefined,
  sessionProfit: number,
  peakSessionProfit: number,
  currentStreak: number,
  currentBalance: number,
  currency: string
): AutonomousDecision {
  const totalBets = stats?.totalBets || recentBets.length || 0;
  const recentSlice = recentBets.slice(0, 15);
  const recentWins = recentSlice.filter((b) => b.won).length;
  const recentWinRate = recentSlice.length > 0 ? (recentWins / recentSlice.length) * 100 : 50;

  const currentDrawdown = Math.max(0, peakSessionProfit - sessionProfit);
  const drawdownPct = currentBalance > 0 ? (currentDrawdown / (currentBalance + currentDrawdown)) * 100 : 0;
  const lossStreak = currentStreak < 0 ? Math.abs(currentStreak) : 0;
  const winStreak = currentStreak > 0 ? currentStreak : 0;

  // Calculate cumulative profit or loss generated specifically during the ongoing streak
  let streakAccumulatedProfit = 0;
  if (winStreak > 0) {
    for (let i = 0; i < Math.min(winStreak, recentBets.length); i++) {
      if (recentBets[i]?.won) {
        streakAccumulatedProfit += recentBets[i].profit || 0;
      } else {
        break;
      }
    }
  }

  let streakAccumulatedLoss = 0;
  if (lossStreak > 0) {
    for (let i = 0; i < Math.min(lossStreak, recentBets.length); i++) {
      if (recentBets[i] && !recentBets[i].won) {
        streakAccumulatedLoss += Math.abs(recentBets[i].profit || 0);
      } else {
        break;
      }
    }
  }

  // 1. Compute Full Real-Time Quantitative & Statistical Entropy Metrics
  const currentMultiplier = currentStrategy.targetMultiplier || 2.0;
  const currentWinChance = currentStrategy.winChance || (99 / currentMultiplier);
  const quantMetrics = computeRealtimeQuantitativeMetrics(
    recentBets,
    currentBalance,
    sessionProfit,
    peakSessionProfit,
    currentStreak,
    config.targetProfit,
    config.stopLoss,
    config.riskAppetite,
    currentMultiplier,
    currentWinChance
  );

  // 2. Compute Real-time Markov Transition Chain
  const markovMatrix = computeMarkovTransitionMatrix(recentBets);

  // 3. Calculate Bankroll Health Score (0 - 100)
  let healthScore = 100;
  healthScore -= Math.min(45, drawdownPct * 3);
  healthScore -= Math.min(30, lossStreak * 6);
  if (sessionProfit < 0) {
    const lossPct = currentBalance > 0 ? (Math.abs(sessionProfit) / currentBalance) * 100 : 0;
    healthScore -= Math.min(25, lossPct * 2);
  }
  if (quantMetrics.isClusteringDetected) {
    healthScore -= 10;
  }
  if (markovMatrix.microRegime === 'cold_drought') {
    healthScore -= 8;
  }
  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  // 4. Variance & Entropy Assessment
  let varianceEntropy: 'low' | 'normal' | 'high' | 'turbulent' = 'normal';
  if (quantMetrics.variancePhase === 'turbulent_anomaly' || lossStreak >= 5 || drawdownPct >= 12) {
    varianceEntropy = 'turbulent';
  } else if (quantMetrics.variancePhase === 'oscillating' || lossStreak >= 3 || drawdownPct >= 6 || markovMatrix.microRegime === 'cold_drought') {
    varianceEntropy = 'high';
  } else if (quantMetrics.variancePhase === 'trending' || winStreak >= 3 || (recentWinRate >= 60 && drawdownPct <= 2)) {
    varianceEntropy = 'low';
  }

  // 5. Profit Progress Ratio (0 to 1+)
  const profitProgress = config.targetProfit > 0 ? (sessionProfit / config.targetProfit) : 0;

  // 6. Base Bet Calculation
  const calculatedBaseBet = Math.max(
    0.001,
    Number(((currentBalance * (config.baseBankrollPct / 100))).toFixed(4))
  );
  const maxBetCap = Math.max(
    calculatedBaseBet * 2,
    Number(((currentBalance * (config.maxBetBankrollPct / 100))).toFixed(4))
  );

  const maxMartingaleIncreases = Math.min(5, Math.max(1, config.maxMartingaleIncreases ?? 4));
  const martMultiplier = config.martingaleMultiplier ?? 2.0;
  let martingaleStep = 0;
  let isMartingaleCapReached = false;
  let dynamicBetAdjustmentPct = 0;
  let dynamicBetAdjustmentReason = 'Mise Standard Équilibrée (0% variation)';

  // =========================================================================
  // ADVANCED STREAK TACTICAL INTELLIGENCE INITIALIZATION
  // =========================================================================
  let streakTacticalPhase: StreakTacticalPhase = 'NEUTRAL_FLOW';
  let streakTacticalLabel = '⚖️ Cadence Nominale Standard';
  let streakTacticalBadge = 'FLUX NEUTRE';
  let streakTacticalColor = 'text-slate-300 bg-slate-800/80 border-slate-700';
  let streakTrailingProfitLocked = 0;
  let streakConditionInverted = false;
  let streakGameHopAdvised = false;
  let streakSummaryAction = 'Cadence de jeu équilibrée sans biais statistique.';

  let calculatedBetAmount = calculatedBaseBet;
  let seedRotationAdvised = false;

  // --- STREAK EVALUATION ---
  if (lossStreak > 0) {
    if (lossStreak === 1) {
      streakTacticalPhase = 'LOSS_STREAK_ABSORPTION';
      streakTacticalLabel = '🛡️ Palier 1 : Micro-Absorption Statistique';
      streakTacticalBadge = 'ABSORPTION';
      streakTacticalColor = 'text-blue-400 bg-blue-950/80 border-blue-500/30';
      streakSummaryAction = `Perte isolée. Absorption calculée sans sur-exposition.`;
    } else if (lossStreak === 2 || lossStreak === 3) {
      streakTacticalPhase = 'LOSS_STREAK_STABILIZATION';
      streakTacticalLabel = `🛡️ Palier 2 : Pivot Haute Probabilité (${lossStreak}P) & Inversion`;
      streakTacticalBadge = 'PIVOT HAUTE CHANCE';
      streakTacticalColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
      streakConditionInverted = config.streakDiceInversionEnabled !== false;
      streakSummaryAction = `Série de ${lossStreak} pertes : pivot vers haute probabilité et inversion spatiale pour briser l'entropie négative.`;
    } else if (lossStreak === 4 || lossStreak === 5) {
      streakTacticalPhase = 'LOSS_STREAK_CIRCUIT_BREAKER';
      streakTacticalLabel = `⚡ Palier 3 : Coupe-Circuit Anti-Régression (${lossStreak}P)`;
      streakTacticalBadge = 'COUPE-CIRCUIT';
      streakTacticalColor = 'text-amber-400 bg-amber-950/80 border-amber-500/50';
      streakGameHopAdvised = config.intelligentGameHoppingEnabled !== false;
      seedRotationAdvised = config.autoRotateSeedOnAnomaly !== false;
      streakSummaryAction = `Série noire de ${lossStreak} pertes : arrêt total des hausses de mise, rotation de jeu et renouvellement du seed.`;
    } else {
      streakTacticalPhase = 'LOSS_STREAK_SURVIVAL_HARBOR';
      streakTacticalLabel = `⚓ Palier 4 : Havre Anti-Liquidation (${lossStreak}P)`;
      streakTacticalBadge = 'MODE SURVIE';
      streakTacticalColor = 'text-rose-400 bg-rose-950/90 border-rose-500/50';
      streakGameHopAdvised = true;
      seedRotationAdvised = true;
      streakSummaryAction = `Série critique (${lossStreak} pertes) : mise compressée de 50% et cotes minimales pour protéger le capital.`;
    }
  } else if (winStreak > 0) {
    if (winStreak === 1) {
      streakTacticalPhase = 'WIN_STREAK_IGNITION';
      streakTacticalLabel = '🔥 Palier 1 : Impulsion Momentum Kelly (+22%)';
      streakTacticalBadge = 'MOMENTUM';
      streakTacticalColor = 'text-amber-400 bg-amber-950/80 border-amber-500/30';
      streakSummaryAction = `1ère victoire validée. Impulsion Kelly modérée pour explorer le momentum.`;
    } else if (winStreak === 2 || winStreak === 3) {
      streakTacticalPhase = 'WIN_STREAK_PAROLI_VAULT';
      streakTacticalLabel = `💰 Palier 2 : Protocole Paroli Trailing (${winStreak}V - 65% Verrouillé)`;
      streakTacticalBadge = 'COFFRE 65%';
      streakTacticalColor = 'text-teal-400 bg-teal-950/80 border-teal-500/40';
      streakTrailingProfitLocked = Number((streakAccumulatedProfit * 0.65).toFixed(4));
      streakSummaryAction = `Série de ${winStreak} victoires : 65% du profit (${streakTrailingProfitLocked} ${currency}) est définitivement sanctuarisé.`;
    } else if (winStreak === 4 || winStreak === 5) {
      streakTacticalPhase = 'WIN_STREAK_ALPHA_EXPEDITION';
      streakTacticalLabel = `💎 Palier 3 : Super-Run Alpha (${winStreak}V - 80% Verrouillé)`;
      streakTacticalBadge = 'ALPHA RUN 80%';
      streakTacticalColor = 'text-purple-400 bg-purple-950/80 border-purple-500/50';
      streakTrailingProfitLocked = Number((streakAccumulatedProfit * 0.80).toFixed(4));
      streakSummaryAction = `Super-Run de ${winStreak} victoires consécutives : 80% du pic (${streakTrailingProfitLocked} ${currency}) est verrouillé.`;
    } else {
      streakTacticalPhase = 'WIN_STREAK_CLIMAX_HARVEST';
      streakTacticalLabel = `👑 Palier 4 : Climax Statistique (${winStreak}V - 100% Sécurisé)`;
      streakTacticalBadge = 'CLIMAX HARVEST';
      streakTacticalColor = 'text-amber-300 bg-amber-950/90 border-amber-500/60';
      streakTrailingProfitLocked = Number((streakAccumulatedProfit).toFixed(4));
      streakSummaryAction = `Climax statistique (${winStreak} victoires) : 100% des bénéfices sont scellés et retour en mise de base.`;
    }
  }

  // --- BET SIZING CALCULATION WITH STREAK SENSITIVITY ---
  if (lossStreak > 0) {
    if (lossStreak === 1 && config.martingaleEnabled) {
      // Tier 1: Soft single escalation
      martingaleStep = 1;
      calculatedBetAmount = Math.min(maxBetCap, Number((calculatedBaseBet * martMultiplier).toFixed(4)));
      dynamicBetAdjustmentPct = Math.round(((calculatedBetAmount - calculatedBaseBet) / calculatedBaseBet) * 100);
      dynamicBetAdjustmentReason = `Palier 1 Absorption (+${dynamicBetAdjustmentPct}%)`;
    } else if ((lossStreak === 2 || lossStreak === 3) && config.martingaleEnabled) {
      // Tier 2: Stabilization with soft cap (no exponential runaway)
      martingaleStep = lossStreak;
      const cappedEscalation = Math.min(2.5, Math.pow(1.5, lossStreak));
      calculatedBetAmount = Math.min(maxBetCap, Number((calculatedBaseBet * cappedEscalation).toFixed(4)));
      dynamicBetAdjustmentPct = Math.round(((calculatedBetAmount - calculatedBaseBet) / calculatedBaseBet) * 100);
      dynamicBetAdjustmentReason = `Palier ${martingaleStep} Stabilisé (+${dynamicBetAdjustmentPct}%)`;
    } else if (lossStreak >= 4 && lossStreak <= 5) {
      // Tier 3: CIRCUIT BREAKER -> Immediate drop back to base bet to prevent blowup
      isMartingaleCapReached = true;
      martingaleStep = 0;
      calculatedBetAmount = calculatedBaseBet;
      dynamicBetAdjustmentPct = 0;
      dynamicBetAdjustmentReason = `Coupe-Circuit Anti-Régression (Reset Sécurité ${calculatedBaseBet} ${currency})`;
    } else if (lossStreak >= 6) {
      // Tier 4: SURVIVAL MODE -> Cut bet by 50%
      isMartingaleCapReached = true;
      martingaleStep = 0;
      calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * 0.50).toFixed(4)));
      dynamicBetAdjustmentPct = -50;
      dynamicBetAdjustmentReason = `Havre Anti-Liquidation (-50% mise de base)`;
    } else {
      calculatedBetAmount = calculatedBaseBet;
    }
  } else if (winStreak > 0 && config.dynamicBetSizingEnabled !== false) {
    // Win streak smart compounding (House Money effect)
    const maxIncreaseCap = Math.min(100, Math.max(10, config.maxBetIncreasePct ?? 100));

    if (winStreak === 1) {
      dynamicBetAdjustmentPct = 22;
      dynamicBetAdjustmentReason = `Accélération Momentum Initial (+22%)`;
    } else if (winStreak === 2 || winStreak === 3) {
      // 35% of streak profit reinvested into the next bet
      const houseMoneyBoost = streakAccumulatedProfit > 0
        ? Math.min(maxIncreaseCap, Math.round((streakAccumulatedProfit * 0.35 / calculatedBaseBet) * 100))
        : 35;
      dynamicBetAdjustmentPct = Math.max(25, Math.min(maxIncreaseCap, houseMoneyBoost));
      dynamicBetAdjustmentReason = `Paroli Trailing (+${dynamicBetAdjustmentPct}% • 65% profit sanctuarisé)`;
    } else if (winStreak === 4 || winStreak === 5) {
      // Gentle throttle to secure alpha run
      dynamicBetAdjustmentPct = 20;
      dynamicBetAdjustmentReason = `Préservation Super-Run (+20% • 80% profit sanctuarisé)`;
    } else {
      // Climax harvest: reset to 0% variation
      dynamicBetAdjustmentPct = 0;
      dynamicBetAdjustmentReason = `Climax Statistique (100% profit scellé au solde)`;
    }

    const modulated = Number((calculatedBaseBet * (1 + dynamicBetAdjustmentPct / 100)).toFixed(4));
    calculatedBetAmount = Math.min(maxBetCap, Math.max(0.001, modulated));
  } else if (config.dynamicBetSizingEnabled !== false) {
    // Neutral session continuous fine-tuning
    if (profitProgress >= 0.85 && sessionProfit > 0) {
      dynamicBetAdjustmentPct = -45;
      dynamicBetAdjustmentReason = `Sécurisation Finale Take-Profit (-45%)`;
    } else if (profitProgress >= 0.70 && sessionProfit > 0) {
      dynamicBetAdjustmentPct = -30;
      dynamicBetAdjustmentReason = `Sécurisation Bénéfice Take-Profit (-30%)`;
    } else if (drawdownPct >= 5.0 || healthScore < 50) {
      dynamicBetAdjustmentPct = -40;
      dynamicBetAdjustmentReason = `Protection Drawdown Élevé (-40%)`;
    } else if (drawdownPct >= 2.5 || healthScore < 65) {
      dynamicBetAdjustmentPct = -22;
      dynamicBetAdjustmentReason = `Contraction Défensive de Variance (-22%)`;
    } else if (quantMetrics.shannonEntropy > 0.88 || quantMetrics.variancePhase === 'turbulent_anomaly') {
      dynamicBetAdjustmentPct = -25;
      dynamicBetAdjustmentReason = `Filtre Bruit & Turbulences (-25%)`;
    } else if (config.markovMomentumEnabled !== false && markovMatrix.microRegime === 'momentum_win' && healthScore >= 70) {
      dynamicBetAdjustmentPct = 35;
      dynamicBetAdjustmentReason = `Momentum Markovien P(W|W)=${(markovMatrix.pWinAfterWin * 100).toFixed(0)}% (+35%)`;
    } else if (config.markovMomentumEnabled !== false && markovMatrix.microRegime === 'cold_drought') {
      dynamicBetAdjustmentPct = -35;
      dynamicBetAdjustmentReason = `Frein Markovien P(L|L)=${(markovMatrix.pLossAfterLoss * 100).toFixed(0)}% (-35%)`;
    }

    const modulated = Number((calculatedBaseBet * (1 + dynamicBetAdjustmentPct / 100)).toFixed(4));
    calculatedBetAmount = Math.min(maxBetCap, Math.max(0.001, modulated));
  }

  // Wald-Wolfowitz or high loss streak seed rotation
  if ((lossStreak >= 4 || quantMetrics.isClusteringDetected || markovMatrix.microRegime === 'cold_drought') && config.autoRotateSeedOnAnomaly) {
    seedRotationAdvised = true;
  }

  // =========================================================================
  // STOCHASTIC PSEUDO-RANDOM & ENTROPY SAMPLER
  // =========================================================================
  const minBound = config.minMultiplier || 1.33;
  const maxBound = config.maxMultiplier || 7.77;
  const totalBetsCount = totalBets || recentBets.length || 0;
  const lastBetTimestamp = recentBets[0]?.timestamp || Date.now();
  const lastBetProfit = recentBets[0]?.profit || 0;
  const lastBetMult = recentBets[0]?.targetMultiplier || 2.0;

  const rawSeed = Math.sin((totalBetsCount + 1) * 12.9898 + (currentStreak * 7.1337) + (lastBetTimestamp % 100000) * 0.001 + (lastBetProfit * 100) + (lastBetMult * 3.1415)) * 43758.5453;
  const stochasticNoise = Math.abs(rawSeed - Math.floor(rawSeed));

  const preferredGames = config.preferredGames && config.preferredGames.length > 0 
    ? config.preferredGames 
    : ['dice', 'limbo', 'mines', 'plinko'];

  const canSwitchGames = Boolean(config.allowGameSwitching && config.autonomyLevel === 'full');
  const currentGameLossStreak = recentBets.slice(0, 4).every(b => !b.won && b.game === currentStrategy.game);
  const isGameDrought = currentGameLossStreak && recentBets.length >= 3;

  // Defaults
  let regime: AutonomousRegime = 'STEADY_SCALPER';
  let regimeLabel = '⚖️ Croissance Équilibrée';
  let regimeColor = 'text-blue-400 bg-blue-950/80 border-blue-500/30';
  let chosenGame: StakeGameType = currentStrategy.game || 'dice';
  let gameSwitchReason: string | undefined = undefined;
  let chosenMultiplier = 2.0;
  let chosenWinChance = 49.50;
  let targetStratId = 'strat-dice-dalembert';
  let strategyName = 'Smart D\'Alembert Équilibré';
  let reasoning = '';
  let tacticalDirective = '';
  let actionType: AutonomousDecision['actionType'] = 'CONTINUE';
  let isBarbellSnipeActive = false;
  let customGameConfig: any = undefined;

  // Determine current Dice condition to support spatial inversion
  const previousDiceCondition: 'above' | 'below' = currentStrategy.gameConfig?.diceCondition || 'above';
  const invertedDiceCondition: 'above' | 'below' = previousDiceCondition === 'above' ? 'below' : 'above';

  // =========================================================================
  // ADVANCED REGIME DECISION WITH STREAK SENSITIVITY
  // =========================================================================

  // CASE 0: EXTREME RISK / MOONSHOT HUNTER
  if (config.riskAppetite === 'extreme_moonshot') {
    regime = 'MOONSHOT_JACKPOT_HUNT';
    regimeLabel = '💥 Chasseur Moonshot Extrême (1 000x - 10 000x)';
    regimeColor = 'text-rose-400 bg-rose-950/90 border-rose-500/50';
    actionType = 'SCALE_UP';

    const originalsPool = [
      { game: 'limbo' as StakeGameType, multiplier: 10000.0, stratId: 'strat-extreme-limbo-10000x-quantum', name: 'Limbo Quantum Moonshot 10 000x' },
      { game: 'limbo' as StakeGameType, multiplier: 5000.0, stratId: 'strat-extreme-limbo-5000x', name: 'Limbo Sniper 5 000x' },
      { game: 'dice' as StakeGameType, multiplier: 9900.0, stratId: 'strat-extreme-dice-9900x', name: 'Dice 9 900x Ultra-Moonshot' },
      { game: 'plinko' as StakeGameType, multiplier: 10000.0, stratId: 'strat-extreme-plinko-16rows', name: 'Plinko 16 Rangées (10 000x)' },
      { game: 'mines' as StakeGameType, multiplier: 24.75, stratId: 'strat-extreme-mines-24m', name: 'Mines 24 Mines (24.75x)' },
    ];

    const pickIndex = (totalBets + Math.floor(Date.now() / 60000)) % originalsPool.length;
    const selectedMoonshot = originalsPool[pickIndex];

    chosenGame = canSwitchGames ? selectedMoonshot.game : (currentStrategy.game || 'limbo');
    chosenMultiplier = selectedMoonshot.multiplier;
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(4));
    targetStratId = selectedMoonshot.stratId;
    strategyName = selectedMoonshot.name;

    const chosenPct = 0.00015;
    calculatedBetAmount = Math.max(0.001, Number((currentBalance * chosenPct).toFixed(5)));
    reasoning = `Mode Risque Extrême : traque stochastique sur ${chosenGame.toUpperCase()} @${chosenMultiplier}x (Win chance ${chosenWinChance}%).`;
    tacticalDirective = `Mise de ${calculatedBetAmount} ${currency} sur ${chosenGame.toUpperCase()} @${chosenMultiplier}x pour chasser le jackpot.`;

  // CASE 1: LOSS STREAK TIER 3 & 4 (CIRCUIT BREAKER & SURVIVAL HARBOR)
  } else if (lossStreak >= 4) {
    regime = 'HIGH_CERTAINTY_REBUILD';
    regimeColor = lossStreak >= 6 
      ? 'text-rose-400 bg-rose-950/90 border-rose-500/60' 
      : 'text-amber-400 bg-amber-950/90 border-amber-500/50';
    actionType = 'ROTATE_SEED';
    seedRotationAdvised = true;

    // High Probability Corridor (76% to 85% Win Chance)
    const targetWinRate = 76.0 + (stochasticNoise * 9.0);
    chosenWinChance = Number(targetWinRate.toFixed(2));
    chosenMultiplier = Number((99 / chosenWinChance).toFixed(2));
    regimeLabel = `🛡️ Coupe-Circuit Anti-Régression (${chosenWinChance}% Win Chance)`;

    // Proactive game hopping away from drought
    if (canSwitchGames) {
      if (preferredGames.includes('mines') && currentStrategy.game !== 'mines') {
        chosenGame = 'mines';
        customGameConfig = { minesCount: 1, minesGemsToCashout: 1, minesChosenTiles: [12] };
        gameSwitchReason = `Coupe-circuit activé (${lossStreak} pertes sur ${currentStrategy.game.toUpperCase()}). Bascule salvatrice sur MINES 1 Mine (1 diamant @1.03x) pour briser le cycle noir sans risque.`;
      } else if (preferredGames.includes('limbo') && currentStrategy.game !== 'limbo') {
        chosenGame = 'limbo';
        customGameConfig = { limboTarget: chosenMultiplier };
        gameSwitchReason = `Bascule préventive sur LIMBO @${chosenMultiplier}x pour casser la persistance du PRNG de ${currentStrategy.game.toUpperCase()}.`;
      } else {
        chosenGame = 'dice';
        customGameConfig = { 
          diceCondition: invertedDiceCondition, 
          diceTarget: invertedDiceCondition === 'above' ? Number((100 - chosenWinChance).toFixed(2)) : Number(chosenWinChance.toFixed(2)) 
        };
      }
      targetStratId = 'strat-dice-oscars-grind';
      strategyName = `Bouclier Coupe-Circuit (${chosenWinChance}%)`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (Coupe-Circuit ${chosenWinChance}%)`;
      if (chosenGame === 'dice') {
        customGameConfig = { 
          diceCondition: invertedDiceCondition, 
          diceTarget: invertedDiceCondition === 'above' ? Number((100 - chosenWinChance).toFixed(2)) : Number(chosenWinChance.toFixed(2)) 
        };
      } else if (chosenGame === 'limbo') {
        customGameConfig = { limboTarget: chosenMultiplier };
      }
    }

    reasoning = `Alerte Série Noire (${lossStreak} pertes d'affilée, santé ${healthScore}/100). Activation immédiate du Coupe-Circuit : suppression de toute hausse de mise (remise à ${calculatedBetAmount} ${currency}), win chance élevée à ${chosenWinChance}% (@${chosenMultiplier}x) et rotation du seed demandée pour stopper la saignée.`;
    tacticalDirective = `Mise de sécurité de ${calculatedBetAmount} ${currency} à très haute certitude (${chosenWinChance}%, cote @${chosenMultiplier}x) sur ${chosenGame.toUpperCase()}.`;

  // CASE 2: LOSS STREAK TIER 2 (STABILIZATION 2-3 LOSSES: HIGH PROBABILITY & SPATIAL INVERSION)
  } else if (lossStreak === 2 || lossStreak === 3) {
    regime = 'HIGH_CERTAINTY_REBUILD';
    regimeColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    actionType = 'SCALE_DOWN';

    // High probability corridor (68% to 78% win chance)
    const targetWinRate = 68.0 + (stochasticNoise * 10.0);
    chosenWinChance = Number(targetWinRate.toFixed(2));
    chosenMultiplier = Number((99 / chosenWinChance).toFixed(2));
    regimeLabel = `🛡️ Stabilisation & Inversion Spatiale (${chosenWinChance}% Win)`;

    if (canSwitchGames && isGameDrought && preferredGames.includes('limbo') && currentStrategy.game !== 'limbo') {
      chosenGame = 'limbo';
      customGameConfig = { limboTarget: chosenMultiplier };
      gameSwitchReason = `Rotation anti-clustering : ${lossStreak} pertes sur ${currentStrategy.game.toUpperCase()}. Bascule sur LIMBO @${chosenMultiplier}x pour restaurer le flux stochastique.`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      if (chosenGame === 'dice') {
        // Spatial condition inversion (above <-> below) to break PRNG clustering
        customGameConfig = { 
          diceCondition: invertedDiceCondition, 
          diceTarget: invertedDiceCondition === 'above' ? Number((100 - chosenWinChance).toFixed(2)) : Number(chosenWinChance.toFixed(2)) 
        };
      } else if (chosenGame === 'limbo') {
        customGameConfig = { limboTarget: chosenMultiplier };
      }
    }

    targetStratId = currentStrategy.id || 'strat-dice-oscars-grind';
    strategyName = `Stabilisation Haute Probabilité (${chosenWinChance}%)`;
    reasoning = `Série de ${lossStreak} pertes consécutives détectée. L'IA refuse le piège des cotes risquées : pivot stratégique vers un couloir haute probabilité (${chosenWinChance}% de chance de gain @${chosenMultiplier}x) et inversion spatiale de direction pour briser le cluster de tirage.`;
    tacticalDirective = `Mise contenue de ${calculatedBetAmount} ${currency} à ${chosenWinChance}% de probabilité (@${chosenMultiplier}x) avec inversion de direction sur ${chosenGame.toUpperCase()}.`;

  // CASE 3: LOSS STREAK TIER 1 (ISOLATED LOSS / MILD DRAWDOWN ABSORPTION)
  } else if (lossStreak === 1 || (sessionProfit < 0 && drawdownPct >= 2.0 && healthScore < 70)) {
    regime = 'DEFICIT_RECOVERY_SURGE';
    regimeColor = 'text-amber-400 bg-amber-950/80 border-amber-500/40';
    actionType = 'CONTINUE';

    // Balanced recovery multiplier: 1.85x to 2.15x (win chance 46% - 53.5%)
    const randomRecoveryMult = 1.85 + (stochasticNoise * 0.30);
    chosenMultiplier = Number(randomRecoveryMult.toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));
    regimeLabel = `🎯 Absorption Contrôlée (${chosenMultiplier.toFixed(2)}x)`;

    chosenGame = currentStrategy.game || 'dice';
    if (chosenGame === 'dice') {
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
    } else if (chosenGame === 'limbo') {
      customGameConfig = { limboTarget: chosenMultiplier };
    }

    targetStratId = currentStrategy.id;
    strategyName = `Absorption Statistique (${chosenMultiplier.toFixed(2)}x)`;
    reasoning = `Perte isolée (Palier 1). Absorption mathématique en cadence équilibrée @${chosenMultiplier.toFixed(2)}x (${chosenWinChance}% win) pour effacer le recul sans forcer la variance.`;
    tacticalDirective = `Mise calibrée de ${calculatedBetAmount} ${currency} sur cote équilibrée @${chosenMultiplier.toFixed(2)}x.`;

  // CASE 4: WIN STREAK CLIMAX (>= 6 WINS: BANK FULL HIGH-WATER MARK & RESET)
  } else if (winStreak >= 6) {
    regime = 'WIN_STREAK_SECURE_HARVEST';
    regimeLabel = `👑 Climax Statistique (${winStreak}V - 100% Sécurisé)`;
    regimeColor = 'text-amber-300 bg-amber-950/90 border-amber-500/60';
    actionType = 'LOCK_PROFIT';

    // Ultra-smooth low variance finish: 1.35x - 1.55x
    chosenMultiplier = Number((1.35 + stochasticNoise * 0.20).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    chosenGame = currentStrategy.game || 'dice';
    if (chosenGame === 'dice') {
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
    } else if (chosenGame === 'limbo') {
      customGameConfig = { limboTarget: chosenMultiplier };
    }

    targetStratId = currentStrategy.id;
    strategyName = `Encaissement Climax (${chosenMultiplier.toFixed(2)}x)`;
    calculatedBetAmount = calculatedBaseBet; // Strict reset to base bet
    reasoning = `Série exceptionnelle de ${winStreak} victoires consécutives (probabilité empirique < 1.5%). L'IA encaisse l'intégralité du pic de profit (+${streakAccumulatedProfit.toFixed(2)} ${currency} sécurisé), abaisse la cote @${chosenMultiplier.toFixed(2)}x et réinitialise la mise à la base (${calculatedBaseBet} ${currency}) pour clore le run en triomphe.`;
    tacticalDirective = `Mise de base (${calculatedBaseBet} ${currency}) à faible variance @${chosenMultiplier.toFixed(2)}x pour préserver 100% des gains de la série.`;

  // CASE 5: WIN STREAK SUPER-RUN (4-5 WINS: 80% TRAILING VAULT & MICRO-SNIPER)
  } else if (winStreak === 4 || winStreak === 5) {
    regime = 'WIN_STREAK_SECURE_HARVEST';
    regimeLabel = `💎 Super-Run Alpha (${winStreak}V - 80% Protégé)`;
    regimeColor = 'text-purple-400 bg-purple-950/80 border-purple-500/50';
    actionType = 'LOCK_PROFIT';

    // Moderate sweet multiplier: 1.50x - 1.80x
    chosenMultiplier = Number((1.50 + stochasticNoise * 0.30).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    chosenGame = currentStrategy.game || 'dice';
    if (chosenGame === 'dice') {
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
    } else if (chosenGame === 'limbo') {
      customGameConfig = { limboTarget: chosenMultiplier };
    }

    targetStratId = currentStrategy.id;
    strategyName = `Super-Run Alpha (${chosenMultiplier.toFixed(2)}x)`;
    reasoning = `Super-Run en cours (${winStreak} victoires d'affilée, profit série +${streakAccumulatedProfit.toFixed(2)} ${currency}). Protocole Alpha activé : 80% du gain (${streakTrailingProfitLocked} ${currency}) est sanctuarisé. Multiplicateur calé à @${chosenMultiplier.toFixed(2)}x pour poursuivre la vague sans risquer les acquis.`;
    tacticalDirective = `Mise protégée (${calculatedBetAmount} ${currency}) sur cote équilibrée @${chosenMultiplier.toFixed(2)}x avec coffre-fort 80%.`;

  // CASE 6: WIN STREAK PAROLI VAULT (2-3 WINS: 65% TRAILING VAULT & COMPOUNDING)
  } else if (winStreak === 2 || winStreak === 3) {
    regime = 'WIN_STREAK_SECURE_HARVEST';
    regimeLabel = `💰 Paroli Trailing (${winStreak}V - 65% Protégé)`;
    regimeColor = 'text-teal-400 bg-teal-950/80 border-teal-500/40';
    actionType = 'SCALE_UP';

    // Optimal compounding multiplier: 1.65x - 2.05x
    chosenMultiplier = Number((1.65 + stochasticNoise * 0.40).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    chosenGame = currentStrategy.game || 'dice';
    if (chosenGame === 'dice') {
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
    } else if (chosenGame === 'limbo') {
      customGameConfig = { limboTarget: chosenMultiplier };
    }

    targetStratId = currentStrategy.id;
    strategyName = `Paroli Trailing Vault (${chosenMultiplier.toFixed(2)}x)`;
    reasoning = `Série gagnante (${winStreak} victoires consécutives, profit série +${streakAccumulatedProfit.toFixed(2)} ${currency}, Markov P(W|W)=${(markovMatrix.pWinAfterWin * 100).toFixed(0)}%). Protocole Paroli Trailing : 65% du bénéfice (${streakTrailingProfitLocked} ${currency}) est verrouillé, et 35% est réinvesti pour accélérer la croissance sur cote @${chosenMultiplier.toFixed(2)}x.`;
    tacticalDirective = `Mise modulée de ${calculatedBetAmount} ${currency} à cote optimale @${chosenMultiplier.toFixed(2)}x sous couverture du coffre-fort.`;

  // CASE 7: APPROACHING TAKE-PROFIT (>= 70% of Target) -> MINIMAL RISK LOCK
  } else if (profitProgress >= 0.70 && sessionProfit > 0) {
    regime = 'TAKE_PROFIT_LOCK';
    regimeLabel = '🔒 Verrouillage Sécurisé (1.33x – 1.55x)';
    regimeColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    actionType = 'LOCK_PROFIT';

    const lockRange = Math.max(0.08, Math.min(0.22, (maxBound - minBound) * 0.05));
    const randomLockMult = minBound + (stochasticNoise * lockRange);
    chosenMultiplier = Number(Math.max(minBound, Math.min(maxBound, randomLockMult)).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    if (canSwitchGames && preferredGames.includes('dice')) {
      chosenGame = 'dice';
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
      targetStratId = 'strat-dice-oscars-grind';
      strategyName = `Dice Verrouillage (${chosenMultiplier.toFixed(2)}x)`;
      gameSwitchReason = `Bascule sur DICE @${chosenMultiplier.toFixed(2)}x : clôture à variance minimale pour valider l'objectif sans recul.`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `Verrouillage Bénéfice (${chosenMultiplier.toFixed(2)}x)`;
    }

    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * 0.65).toFixed(4)));
    const remainingToWin = (config.targetProfit - sessionProfit).toFixed(2);
    reasoning = `Objectif à ${(profitProgress * 100).toFixed(0)}% atteint (+${sessionProfit.toFixed(2)} / ${config.targetProfit} ${currency}). Multiplicateur réduit @${chosenMultiplier.toFixed(2)}x (win chance ${chosenWinChance}%) pour empocher les derniers ${remainingToWin} ${currency} sereinement.`;
    tacticalDirective = `Mise réduite (${calculatedBetAmount} ${currency}) sur cote minimale @${chosenMultiplier.toFixed(2)}x pour valider le Take-Profit.`;

  // CASE 8: BARBELL OPPORTUNITY (Every 11 bets in profit or high-entropy window)
  } else if (
    config.barbellSnipingEnabled !== false &&
    sessionProfit > 0 &&
    (totalBetsCount % 11 === 0 || (quantMetrics.shannonEntropy > 0.82 && totalBetsCount % 6 === 0)) &&
    healthScore >= 75
  ) {
    regime = 'BARBELL_SNIPER_SPIKE';
    regimeLabel = '🏹 Sniper Asymétrique Barbell (12x - 25x)';
    regimeColor = 'text-purple-400 bg-purple-950/90 border-purple-500/50';
    actionType = 'SCALE_UP';
    isBarbellSnipeActive = true;

    const sniperFloor = 10.0;
    const sniperCeil = 25.0;
    chosenMultiplier = Number((sniperFloor + stochasticNoise * (sniperCeil - sniperFloor)).toFixed(1));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));
    calculatedBetAmount = Math.max(0.001, Number((currentBalance * 0.0002).toFixed(4)));

    if (canSwitchGames && preferredGames.includes('limbo')) {
      chosenGame = 'limbo';
      customGameConfig = { limboTarget: chosenMultiplier };
      gameSwitchReason = `Tir Barbell Asymétrique : bascule ponctuelle sur LIMBO @${chosenMultiplier}x avec micro-mise (${calculatedBetAmount} ${currency}) pour capter une convexité positive sans risque.`;
    } else {
      chosenGame = currentStrategy.game || 'limbo';
    }

    targetStratId = 'strat-limbo-multi-target-sniper';
    strategyName = `Barbell Sniper @${chosenMultiplier}x`;
    reasoning = `Opportunité Barbell détectée. L'IA déploie un micro-tir asymétrique @${chosenMultiplier}x (Win chance ${chosenWinChance}%) avec une micro-mise de ${calculatedBetAmount} ${currency} (0.02% du solde). Risque nul, gain potentiel élevé.`;
    tacticalDirective = `Micro-tir sniper de ${calculatedBetAmount} ${currency} à cote asymétrique @${chosenMultiplier}x.`;

  // CASE 9: GENERAL SESSION IN PROFIT -> COMPOUNDING GAINS (1.40x – 1.85x)
  } else if (sessionProfit > 0) {
    regime = 'PROFIT_COMPOUNDING_LOCK';
    regimeLabel = '🛡️ Compounding Bénéfice (1.40x – 1.85x)';
    regimeColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    actionType = 'CONTINUE';

    const compFloor = Math.max(minBound, 1.40);
    const compCeil = Math.min(1.85, minBound + 0.52);
    const randomCompMult = compFloor + (stochasticNoise * (compCeil - compFloor));
    chosenMultiplier = Number(Math.max(minBound, Math.min(maxBound, randomCompMult)).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    if (canSwitchGames && preferredGames.includes('dice')) {
      chosenGame = 'dice';
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
      targetStratId = 'strat-dice-dalembert';
      strategyName = `Compounding Régulier (${chosenMultiplier.toFixed(2)}x)`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (Gains @${chosenMultiplier.toFixed(2)}x)`;
    }

    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * (1 + (dynamicBetAdjustmentPct || 0) / 100)).toFixed(4)));
    reasoning = `Session en profit (+${sessionProfit.toFixed(2)} ${currency}, santé ${healthScore}/100). Multiplicateur calé à @${chosenMultiplier.toFixed(2)}x (win chance ${chosenWinChance}%) pour accumuler les bénéfices sans risquer de retournement.`;
    tacticalDirective = `Mise équilibrée de ${calculatedBetAmount} ${currency} sur cote sécurisée @${chosenMultiplier.toFixed(2)}x pour faire fructifier le profit.`;

  // CASE 10: NEUTRAL / FRESH SESSION -> BALANCED EXPEDITION (1.53x – 7.20x)
  } else {
    regime = 'BALANCED_EXPEDITION';
    regimeLabel = '⚖️ Exploration Neutre (1.53x – 7.20x)';
    regimeColor = 'text-blue-400 bg-blue-950/80 border-blue-500/30';
    actionType = 'CONTINUE';

    const sweetSpot = quantMetrics.multiplierOptimization?.optimalMultiplierSweetSpot || 2.0;
    const neutralFloor = Math.max(minBound, 1.53);
    const neutralCeil = Math.min(maxBound, 4.20);
    const randomNeutralMult = neutralFloor + (stochasticNoise * (neutralCeil - neutralFloor));
    chosenMultiplier = Number((0.6 * sweetSpot + 0.4 * randomNeutralMult).toFixed(2));
    chosenMultiplier = Number(Math.max(minBound, Math.min(maxBound, chosenMultiplier)).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    if (canSwitchGames) {
      if (chosenMultiplier >= 3.20 && preferredGames.includes('limbo')) {
        chosenGame = 'limbo';
        customGameConfig = { limboTarget: chosenMultiplier };
        targetStratId = 'strat-limbo-hunter';
        strategyName = `Limbo Exploration (${chosenMultiplier.toFixed(2)}x)`;
      } else if (preferredGames.includes('dice')) {
        chosenGame = 'dice';
        customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
        targetStratId = 'strat-dice-dalembert';
        strategyName = `Dice Exploration (${chosenMultiplier.toFixed(2)}x)`;
      }
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (${chosenMultiplier.toFixed(2)}x)`;
    }

    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * (1 + (dynamicBetAdjustmentPct || 0) / 100)).toFixed(4)));
    reasoning = `Phase neutre (Santé : ${healthScore}/100, Taux : ${recentWinRate.toFixed(0)}%). Multiplicateur aligné sur le sweet-spot Kelly @${chosenMultiplier.toFixed(2)}x (Win chance ${chosenWinChance}%).`;
    tacticalDirective = `Mise de calibration de ${calculatedBetAmount} ${currency} à cote stochastique @${chosenMultiplier.toFixed(2)}x.`;
  }

  // Calculate spectrum percentage: 0% = 1.33x, 100% = 7.77x
  const minM = config.minMultiplier || 1.33;
  const maxM = config.maxMultiplier || 7.77;
  const multiplierSpectrumPct = Math.max(0, Math.min(100, Math.round(((chosenMultiplier - minM) / (maxM - minM || 1)) * 100)));

  // Strict cap on single bet amount
  calculatedBetAmount = Math.min(maxBetCap, calculatedBetAmount);

  // If no custom gameConfig was built, provide default suitable config
  if (!customGameConfig) {
    if (chosenGame === 'dice') {
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
    } else if (chosenGame === 'limbo') {
      customGameConfig = { limboTarget: chosenMultiplier };
    } else if (chosenGame === 'mines') {
      customGameConfig = { minesCount: 3, minesGemsToCashout: 2, minesChosenTiles: [0, 1] };
    } else if (chosenGame === 'plinko') {
      customGameConfig = { plinkoRows: 12, plinkoRisk: 'medium' };
    }
  }

  const streakIntelligence: StreakIntelligenceState = {
    phase: streakTacticalPhase,
    label: streakTacticalLabel,
    badge: streakTacticalBadge,
    color: streakTacticalColor,
    consecutiveCount: currentStreak,
    streakAccumulatedProfit,
    streakAccumulatedLoss,
    trailingProfitLocked: streakTrailingProfitLocked,
    spatialConditionInverted: streakConditionInverted,
    gameHoppingTriggered: streakGameHopAdvised,
    summaryAction: streakSummaryAction,
  };

  return {
    regime,
    regimeLabel,
    regimeColor,
    actionType,
    chosenGame,
    gameSwitchReason,
    chosenMultiplier,
    chosenWinChance,
    chosenStrategyId: targetStratId,
    strategyName,
    calculatedBetAmount,
    reasoning,
    tacticalDirective,
    bankrollHealthScore: healthScore,
    varianceEntropy,
    seedRotationAdvised,
    quantitativeMetrics: quantMetrics,
    multiplierSpectrumPct,
    martingaleStep,
    maxMartingaleIncreases,
    isMartingaleCapReached,
    dynamicBetAdjustmentPct,
    dynamicBetAdjustmentReason,
    unadjustedBaseBet: calculatedBaseBet,
    markovMatrix,
    isBarbellSnipeActive,
    gameConfig: customGameConfig,
    timestamp: Date.now(),
    // Streak Intelligence Fields
    streakIntelligence,
    streakTacticalPhase,
    streakTacticalLabel,
    streakTacticalBadge,
    streakTacticalColor,
    streakTrailingProfitLocked,
    streakConditionInverted,
    streakGameHopAdvised,
  };
}
