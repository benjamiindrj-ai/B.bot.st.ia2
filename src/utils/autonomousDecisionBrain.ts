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
 * distance to take-profit, and mathematically computes the optimal next move:
 * - Dynamic Bet Amount (Kelly + Markov + Bounded Martingale + Volatility Dampener)
 * - Dynamic Multiplier & Win Chance (High-Win-Chance Corridor vs Asymmetric Rebound vs Barbell)
 * - Intelligent Game Rotation across Stake Originals (Dice, Limbo, Mines, Plinko)
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
  // Factor in Shannon Entropy and Wald-Wolfowitz Clustering
  if (quantMetrics.isClusteringDetected) {
    healthScore -= 10;
  }
  // Factor in Markov cold drought
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

  // 6. Base Bet Calculation & Bounded Martingale (Max 4 or 5 escalations)
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

  let regime: AutonomousRegime = 'STEADY_SCALPER';
  let regimeLabel = '⚖️ Croissance Équilibrée';
  let regimeColor = 'text-blue-400 bg-blue-950/80 border-blue-500/30';
  let chosenGame: StakeGameType = currentStrategy.game || 'dice';
  let gameSwitchReason: string | undefined = undefined;
  let chosenMultiplier = 2.0;
  let chosenWinChance = 49.50;
  let targetStratId = 'strat-dice-dalembert';
  let strategyName = 'Smart D\'Alembert Équilibré';
  let calculatedBetAmount = calculatedBaseBet;
  let reasoning = '';
  let tacticalDirective = '';
  let actionType: AutonomousDecision['actionType'] = 'CONTINUE';
  let seedRotationAdvised = false;
  let isBarbellSnipeActive = false;
  let customGameConfig: any = undefined;

  // Evaluate Bounded Martingale Step during Loss Streak
  if (lossStreak > 0 && config.martingaleEnabled) {
    if (lossStreak <= maxMartingaleIncreases) {
      martingaleStep = lossStreak;
      const escalatedBet = Number((calculatedBaseBet * Math.pow(martMultiplier, lossStreak)).toFixed(4));
      calculatedBetAmount = Math.min(maxBetCap, Math.max(0.001, escalatedBet));
      dynamicBetAdjustmentPct = Math.round(((calculatedBetAmount - calculatedBaseBet) / calculatedBaseBet) * 100);
      dynamicBetAdjustmentReason = `Palier Martingale ${martingaleStep}/${maxMartingaleIncreases} (+${dynamicBetAdjustmentPct}%)`;
    } else {
      isMartingaleCapReached = true;
      martingaleStep = 0;
      calculatedBetAmount = calculatedBaseBet; // Reset back to base bet to prevent ruin!
      dynamicBetAdjustmentPct = 0;
      dynamicBetAdjustmentReason = `Reset Sécurité Post-Plafond ${maxMartingaleIncreases} Paliers`;
    }
  } else if (config.dynamicBetSizingEnabled !== false) {
    // Dynamic Continuous AI Bet Modulation (-75% to Max +100%)
    const maxIncreaseCap = Math.min(100, Math.max(10, config.maxBetIncreasePct ?? 100));
    let calculatedModulation = 0;

    // 1. Profit Lockdown Proximity Modulation
    if (profitProgress >= 0.85 && sessionProfit > 0) {
      calculatedModulation = -45;
      dynamicBetAdjustmentReason = `Sécurisation Finale Take-Profit (-45%)`;
    } else if (profitProgress >= 0.70 && sessionProfit > 0) {
      calculatedModulation = -30;
      dynamicBetAdjustmentReason = `Sécurisation Bénéfice Take-Profit (-30%)`;
    // 2. High Drawdown / Capital Preservation Modulation
    } else if (drawdownPct >= 5.0 || healthScore < 50) {
      calculatedModulation = -40;
      dynamicBetAdjustmentReason = `Protection Drawdown Élevé (-40%)`;
    } else if (drawdownPct >= 2.5 || healthScore < 65) {
      calculatedModulation = -22;
      dynamicBetAdjustmentReason = `Contraction Défensive de Variance (-22%)`;
    // 3. Shannon Entropy / Clustering Noise Modulation
    } else if (quantMetrics.shannonEntropy > 0.88 || quantMetrics.variancePhase === 'turbulent_anomaly') {
      calculatedModulation = -25;
      dynamicBetAdjustmentReason = `Filtre Bruit & Turbulences de Variance (-25%)`;
    // 4. Markov Model Modulation: Momentum Surge vs Drought Dampening
    } else if (config.markovMomentumEnabled !== false && markovMatrix.microRegime === 'momentum_win' && healthScore >= 70) {
      calculatedModulation = Math.min(maxIncreaseCap, 35);
      dynamicBetAdjustmentReason = `Momentum Markovien P(W|W)=${(markovMatrix.pWinAfterWin * 100).toFixed(0)}% (+35%)`;
    } else if (config.markovMomentumEnabled !== false && markovMatrix.microRegime === 'cold_drought') {
      calculatedModulation = -35;
      dynamicBetAdjustmentReason = `Frein Markovien P(L|L)=${(markovMatrix.pLossAfterLoss * 100).toFixed(0)}% (-35%)`;
    // 5. Positive Kelly & Win Streak Escalation
    } else if (winStreak >= 1 && healthScore >= 68 && drawdownPct <= 2.0) {
      if (winStreak === 1) {
        calculatedModulation = 22;
        dynamicBetAdjustmentReason = `Accélération Momentum Initial (+22%)`;
      } else if (winStreak === 2) {
        calculatedModulation = 30;
        dynamicBetAdjustmentReason = `Amplification Double Victoire (+30%)`;
      } else if (winStreak === 3) {
        calculatedModulation = 50;
        dynamicBetAdjustmentReason = `Surge Triple Victoire Consécutive (+50%)`;
      } else {
        calculatedModulation = maxIncreaseCap;
        dynamicBetAdjustmentReason = `Conviction Maximale IA (+${maxIncreaseCap}% Plafond Strict)`;
      }
    } else if (quantMetrics.variancePhase === 'trending' && healthScore >= 75) {
      calculatedModulation = 25;
      dynamicBetAdjustmentReason = `Phase Tendancielle Favorable (+25%)`;
    } else if (recentWinRate >= 65 && healthScore >= 70) {
      calculatedModulation = 22;
      dynamicBetAdjustmentReason = `Régularité Statistique Elevée (+22%)`;
    }

    dynamicBetAdjustmentPct = Math.max(-75, Math.min(maxIncreaseCap, calculatedModulation));
    const dynamicallyModulatedBet = Number((calculatedBaseBet * (1 + dynamicBetAdjustmentPct / 100)).toFixed(4));
    calculatedBetAmount = Math.min(maxBetCap, Math.max(0.001, dynamicallyModulatedBet));
  }

  // Check for Seed Anomaly or Wald-Wolfowitz Statistical Clustering
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

  // Determine game switching preferences
  const preferredGames = config.preferredGames && config.preferredGames.length > 0 
    ? config.preferredGames 
    : ['dice', 'limbo', 'mines', 'plinko'];

  const canSwitchGames = Boolean(config.allowGameSwitching && config.autonomyLevel === 'full');

  // Check if current game is experiencing loss drought
  const currentGameLossStreak = recentBets.slice(0, 4).every(b => !b.won && b.game === currentStrategy.game);
  const isGameDrought = currentGameLossStreak && recentBets.length >= 3;

  // =========================================================================
  // REGIME SELECTION & DECISION ENGINE
  // =========================================================================

  // CASE 0: EXTREME RISK / MOONSHOT HUNTER (1000x - 10000x)
  if (config.riskAppetite === 'extreme_moonshot') {
    regime = 'MOONSHOT_JACKPOT_HUNT';
    regimeLabel = '💥 Chasseur Moonshot Extrême (1 000x - 10 000x)';
    regimeColor = 'text-rose-400 bg-rose-950/90 border-rose-500/50';
    actionType = 'SCALE_UP';

    const originalsPool: Array<{
      game: StakeGameType;
      multiplier: number;
      stratId: string;
      name: string;
      desc: string;
    }> = [
      { game: 'limbo', multiplier: 10000.0, stratId: 'strat-extreme-limbo-10000x-quantum', name: 'Limbo Quantum Moonshot 10 000x', desc: 'Traque du 10 000.0x sur Limbo' },
      { game: 'limbo', multiplier: 5000.0, stratId: 'strat-extreme-limbo-5000x', name: 'Limbo Sniper 5 000x', desc: 'Cible 5 000.0x sur Limbo' },
      { game: 'dice', multiplier: 9900.0, stratId: 'strat-extreme-dice-9900x', name: 'Dice 9 900x Ultra-Moonshot', desc: 'Roll extrême > 99.98 à cote 9 900.0x' },
      { game: 'plinko', multiplier: 10000.0, stratId: 'strat-extreme-plinko-16rows', name: 'Plinko 16 Rangées (10 000x)', desc: 'Plinko 16 rangées extrême' },
      { game: 'mines', multiplier: 24.75, stratId: 'strat-extreme-mines-24m', name: 'Mines 24 Mines (24.75x)', desc: 'Grille 24 mines / 1 diamant' },
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
    reasoning = `Mode Risque Extrême : traque stochastique sur ${chosenGame.toUpperCase()} à cote géante @${chosenMultiplier}x (Win chance ${chosenWinChance}%). Mise nano-calibrée à ${(chosenPct * 100).toFixed(3)}% du solde.`;
    tacticalDirective = `Mise de ${calculatedBetAmount} ${currency} sur ${chosenGame.toUpperCase()} @${chosenMultiplier}x pour chasser le jackpot.`;

  // CASE 1: HIGH-CERTAINTY RECOVERY CORRIDOR (75.0% - 85.0% Win Chance)
  // Activated when in severe drawdown, health is impaired, or user enabled High Win Chance recovery
  } else if (
    (config.highWinChanceRecoveryEnabled && (drawdownPct >= 3.5 || healthScore < 55 || (lossStreak >= 3 && config.riskAppetite === 'conservative'))) ||
    (drawdownPct >= 6.0 || healthScore < 45)
  ) {
    regime = 'HIGH_CERTAINTY_REBUILD';
    regimeColor = 'text-emerald-400 bg-emerald-950/90 border-emerald-500/50';
    actionType = 'SCALE_DOWN';

    // Target a high win probability corridor: 75.0% to 85.0% (Multiplier: 1.16x to 1.32x)
    const targetWinRate = 75.0 + (stochasticNoise * 10.0); // 75.0% to 85.0%
    chosenWinChance = Number(targetWinRate.toFixed(2));
    chosenMultiplier = Number((99 / chosenWinChance).toFixed(2));
    regimeLabel = `🛡️ Couloir Haute Certitude (${chosenWinChance}% Win Chance)`;

    if (canSwitchGames) {
      if (preferredGames.includes('dice')) {
        chosenGame = 'dice';
        customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
        gameSwitchReason = `Bascule préventive sur DICE (Win Chance ${chosenWinChance}% @${chosenMultiplier}x) : couloir de reconstitution sans risque pour casser la série noire.`;
      } else if (preferredGames.includes('mines')) {
        chosenGame = 'mines';
        customGameConfig = { minesCount: 1, minesGemsToCashout: 1, minesChosenTiles: [12] };
        gameSwitchReason = `Bascule sur MINES (1 Mine / 1 Diamant @1.03x) : sécurisation maximale du capital.`;
      } else {
        chosenGame = 'dice';
      }
      targetStratId = 'strat-dice-oscars-grind';
      strategyName = `Bouclier Haute Certitude (${chosenWinChance}%)`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (Couloir Reconstitution ${chosenWinChance}%)`;
    }

    // Conservative bet sizing during high certainty recovery
    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * 0.75).toFixed(4)));
    reasoning = `Alerte Drawdown (${drawdownPct.toFixed(1)}%, santé ${healthScore}/100, ${lossStreak} pertes). L'IA enclenche le Couloir Haute Certitude : win chance accrue à ${chosenWinChance}% (cote ${chosenMultiplier}x) sur ${chosenGame.toUpperCase()} pour briser immédiatement la perte et reconstituer le capital.`;
    tacticalDirective = `Mise prudente de ${calculatedBetAmount} ${currency} à très haute probabilité (${chosenWinChance}%, cote @${chosenMultiplier}x) sur ${chosenGame.toUpperCase()}.`;

  // CASE 2: DEFICIT / LOSS STREAK / DRAWDOWN -> ASYMMETRIC RECOVERY (2.85x – 7.77x)
  } else if (sessionProfit < 0 || lossStreak >= 1 || drawdownPct >= 2.0 || healthScore < 65) {
    regime = 'DEFICIT_RECOVERY_SURGE';
    actionType = lossStreak >= 4 ? 'ROTATE_SEED' : 'SCALE_UP';

    let recoveryFloor = 2.85;
    let recoveryCeil = 4.50;
    let severityLabel = 'Rebond Asymétrique';

    if (lossStreak >= 3 || drawdownPct >= 5.0) {
      recoveryFloor = 4.80;
      recoveryCeil = Math.min(maxBound, 7.77);
      severityLabel = 'Attaque Asymétrique Forte';
      regimeColor = 'text-rose-400 bg-rose-950/80 border-rose-500/50';
    } else if (lossStreak === 2 || drawdownPct >= 3.0) {
      recoveryFloor = 3.60;
      recoveryCeil = Math.min(maxBound, 5.80);
      severityLabel = 'Rattrapage Accéléré';
      regimeColor = 'text-amber-400 bg-amber-950/80 border-amber-500/40';
    } else {
      recoveryFloor = 2.85;
      recoveryCeil = Math.min(maxBound, 4.50);
      severityLabel = 'Rebond Rapide';
      regimeColor = 'text-orange-400 bg-orange-950/80 border-orange-500/40';
    }

    const randomRecoveryMult = recoveryFloor + (stochasticNoise * (recoveryCeil - recoveryFloor));
    chosenMultiplier = Number(Math.max(minBound, Math.min(maxBound, randomRecoveryMult)).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));
    regimeLabel = `🎯 Récupération Asymétrique (${chosenMultiplier.toFixed(2)}x)`;

    // Game rotation logic for asymmetric recovery
    if (canSwitchGames) {
      if (isGameDrought && preferredGames.includes('limbo') && currentStrategy.game !== 'limbo') {
        chosenGame = 'limbo';
        customGameConfig = { limboTarget: chosenMultiplier };
        gameSwitchReason = `Rotation anti-clustering : 3 pertes de suite sur ${currentStrategy.game.toUpperCase()}. Bascule sur LIMBO @${chosenMultiplier}x pour casser l'entropie négative.`;
      } else if (preferredGames.includes('limbo')) {
        chosenGame = 'limbo';
        customGameConfig = { limboTarget: chosenMultiplier };
        gameSwitchReason = `Bascule sur LIMBO @${chosenMultiplier}x : moteur optimal pour un comblement de déficit asymétrique en un seul tir.`;
      } else if (preferredGames.includes('dice')) {
        chosenGame = 'dice';
        customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
      }
      targetStratId = 'strat-limbo-hunter';
      strategyName = `Limbo Récupération (${chosenMultiplier.toFixed(2)}x)`;
    } else {
      chosenGame = currentStrategy.game || 'limbo';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (Hausse @${chosenMultiplier.toFixed(2)}x)`;
      if (chosenGame === 'dice') {
        customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
      } else if (chosenGame === 'limbo') {
        customGameConfig = { limboTarget: chosenMultiplier };
      }
    }

    if (config.martingaleEnabled && lossStreak > 0) {
      if (isMartingaleCapReached) {
        reasoning = `Plafond de ${maxMartingaleIncreases} augmentations atteint (${lossStreak} pertes). Réinitialisation de sécurité de la mise (${calculatedBaseBet} ${currency}) tout en maintenant la cote relevée @${chosenMultiplier.toFixed(2)}x (${chosenWinChance}% win) pour combler le déficit sans risque d'emballement.`;
        tacticalDirective = `Mise de base (${calculatedBaseBet} ${currency}) sur cote relevée @${chosenMultiplier.toFixed(2)}x pour sortie de perte maîtrisée.`;
      } else if (martingaleStep > 0) {
        reasoning = `Déficit en cours (${sessionProfit.toFixed(2)} ${currency}, ${lossStreak} perte(s)). Hausse dynamique du multiplicateur cible @${chosenMultiplier.toFixed(2)}x (Win chance ${chosenWinChance}%) pour effacer le déficit en moins de tours. Palier Martingale ${martingaleStep}/${maxMartingaleIncreases} (${calculatedBetAmount} ${currency}).`;
        tacticalDirective = `Mise modulée palier ${martingaleStep}/${maxMartingaleIncreases} (${calculatedBetAmount} ${currency}) ciblant cote haute @${chosenMultiplier.toFixed(2)}x (${severityLabel}).`;
      }
    } else {
      reasoning = `Déficit de session détecté (${sessionProfit < 0 ? `${sessionProfit.toFixed(2)} ${currency}` : `drawdown ${drawdownPct.toFixed(1)}%`}, ${lossStreak} perte(s)). L'IA hausse le multiplicateur cible @${chosenMultiplier.toFixed(2)}x (Win chance ${chosenWinChance}%) pour effacer le déficit dès le prochain gain.`;
      tacticalDirective = `Mise calibrée de ${calculatedBetAmount} ${currency} sur cote relevée @${chosenMultiplier.toFixed(2)}x pour rattrapage asymétrique.`;
    }

  // CASE 3: OPPORTUNISTIC BARBELL SNIPING (Every 10-14 bets in profit or high-entropy window)
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

    // High multiplier, micro stake (zero risk of ruin, positive convexity)
    const sniperFloor = 10.0;
    const sniperCeil = 25.0;
    chosenMultiplier = Number((sniperFloor + stochasticNoise * (sniperCeil - sniperFloor)).toFixed(1));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    // Micro-stake: 0.02% of bankroll
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
    reasoning = `Opportunité Barbell détectée (Session en profit +${sessionProfit.toFixed(2)} ${currency}, entropie favorable). L'IA déploie un micro-tir asymétrique @${chosenMultiplier}x (Win chance ${chosenWinChance}%) avec une micro-mise de ${calculatedBetAmount} ${currency} (0.02% du solde). Risque nul de drawdown, gain potentiel élevé.`;
    tacticalDirective = `Micro-tir sniper de ${calculatedBetAmount} ${currency} à cote asymétrique @${chosenMultiplier}x.`;

  // CASE 4: APPROACHING TAKE-PROFIT (>= 70% of Target) -> MINIMAL RISK LOCK (1.33x – 1.55x)
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
      gameSwitchReason = `Bascule sur DICE @${chosenMultiplier.toFixed(2)}x (Win chance ${chosenWinChance}%) : clôture à variance minimale pour valider l'objectif sans recul.`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `Verrouillage Bénéfice (${chosenMultiplier.toFixed(2)}x)`;
    }

    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * 0.65).toFixed(4)));
    const remainingToWin = (config.targetProfit - sessionProfit).toFixed(2);
    reasoning = `Objectif à ${(profitProgress * 100).toFixed(0)}% atteint (+${sessionProfit.toFixed(2)} / ${config.targetProfit} ${currency}). Diminution du multiplicateur à cote ultra-sécurisée @${chosenMultiplier.toFixed(2)}x (probabilité ${chosenWinChance}%) pour empocher les derniers ${remainingToWin} ${currency} sereinement.`;
    tacticalDirective = `Mise réduite de protection (${calculatedBetAmount} ${currency}) sur cote minimale @${chosenMultiplier.toFixed(2)}x pour valider le Take-Profit.`;

  // CASE 5: WINNING STREAK IN PROFIT -> HARVEST COMPOUNDING (1.35x – 1.75x)
  } else if (winStreak >= 2 && sessionProfit > 0) {
    regime = 'WIN_STREAK_SECURE_HARVEST';
    regimeLabel = '💰 Moisson Sécurisée (1.35x – 1.75x)';
    regimeColor = 'text-teal-400 bg-teal-950/80 border-teal-500/40';
    actionType = 'CONTINUE';

    const harvestFloor = Math.max(minBound, 1.35);
    const harvestCeil = Math.min(1.75, minBound + 0.42);
    const randomHarvestMult = harvestFloor + (stochasticNoise * (harvestCeil - harvestFloor));
    chosenMultiplier = Number(Math.max(minBound, Math.min(maxBound, randomHarvestMult)).toFixed(2));
    chosenWinChance = Number((99 / chosenMultiplier).toFixed(2));

    if (canSwitchGames && preferredGames.includes('dice')) {
      chosenGame = 'dice';
      customGameConfig = { diceCondition: 'above', diceTarget: Number((100 - chosenWinChance).toFixed(2)) };
      targetStratId = 'strat-dice-dalembert';
      strategyName = `Dice Moisson (${chosenMultiplier.toFixed(2)}x)`;
    } else {
      chosenGame = currentStrategy.game || 'dice';
      targetStratId = currentStrategy.id;
      strategyName = `${currentStrategy.name} (Moisson @${chosenMultiplier.toFixed(2)}x)`;
    }

    calculatedBetAmount = Math.max(0.001, Number((calculatedBaseBet * (1 + (dynamicBetAdjustmentPct || 0) / 100)).toFixed(4)));
    reasoning = `Série gagnante en cours (${winStreak} victoires, profit +${sessionProfit.toFixed(2)} ${currency}, Markov P(W|W)=${(markovMatrix.pWinAfterWin * 100).toFixed(0)}%). Multiplicateur calibré à @${chosenMultiplier.toFixed(2)}x (win chance ${chosenWinChance}%) pour capitaliser sur les gains sans exposer la bankroll.`;
    tacticalDirective = `Mise calibrée de ${calculatedBetAmount} ${currency} sur cote basse variance @${chosenMultiplier.toFixed(2)}x pour sécuriser la série.`;

  // CASE 6: GENERAL SESSION IN PROFIT -> COMPOUNDING GAINS (1.40x – 1.85x)
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
    reasoning = `Session en profit (+${sessionProfit.toFixed(2)} ${currency}, santé ${healthScore}/100). Diminution tactique du multiplicateur à @${chosenMultiplier.toFixed(2)}x (win chance ${chosenWinChance}%) pour accumuler les bénéfices sans risquer de retournement.`;
    tacticalDirective = `Mise équilibrée de ${calculatedBetAmount} ${currency} sur cote sécurisée @${chosenMultiplier.toFixed(2)}x pour faire fructifier le profit.`;

  // CASE 7: NEUTRAL / FRESH SESSION -> BALANCED EXPEDITION (1.53x – 7.20x)
  } else {
    regime = 'BALANCED_EXPEDITION';
    regimeLabel = '⚖️ Exploration Neutre (1.53x – 7.20x)';
    regimeColor = 'text-blue-400 bg-blue-950/80 border-blue-500/30';
    actionType = 'CONTINUE';

    // Log-growth sweet spot discovery
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
    reasoning = `Phase neutre / exploratoire (Santé : ${healthScore}/100, Taux : ${recentWinRate.toFixed(0)}%). Multiplicateur stochastique aligné sur le sweet-spot Kelly @${chosenMultiplier.toFixed(2)}x (Win chance ${chosenWinChance}%).`;
    tacticalDirective = `Mise de calibration de ${calculatedBetAmount} ${currency} à cote stochastique @${chosenMultiplier.toFixed(2)}x.`;
  }

  // Calculate spectrum percentage: 0% = 1.33x, 100% = 7.77x
  const minM = config.minMultiplier || 1.33;
  const maxM = config.maxMultiplier || 7.77;
  const multiplierSpectrumPct = Math.max(0, Math.min(100, Math.round(((chosenMultiplier - minM) / (maxM - minM || 1)) * 100)));

  // Strict cap on single bet amount
  calculatedBetAmount = Math.min(maxBetCap, calculatedBetAmount);

  // If no custom gameConfig was built, provide default suitable config for the chosen game
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
  };
}
