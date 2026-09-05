import React, { useState, useMemo } from 'react';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Target,
  ArrowRight,
  ArrowUpDown,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  BarChart3,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Copy,
  Info,
  Dice5,
  Rocket,
  Diamond,
  CircleDot,
  Grid3X3,
  Compass,
  Trophy,
  History,
  Check,
  ExternalLink,
  Flame,
  Award,
  Activity,
  Shield
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { BettingStrategy, BetResult, StakeGameType, RiskLevel } from '../types';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { simulateGameOutcome } from '../utils/provablyFair';
import { calculateAiStrategyScore, AiStrategyScore } from '../utils/aiStrategyScorer';
import { 
  evaluateConditionTrigger, 
  applyConditionAction, 
  ConditionEvaluationContext 
} from '../utils/stakeConditionEngine';

interface StrategyComparatorProps {
  currentStrategy: BettingStrategy;
  onSelectStrategy: (strat: BettingStrategy) => void;
  currency: string;
  balance: number;
  bets: BetResult[];
  onStartAutoBet?: () => void;
  isAutobetting?: boolean;
}

interface BacktestStepResult {
  step: number;
  rollDisplay: string;
  // Strat A
  betA: number;
  wonA: boolean;
  profitA: number;
  bankrollA: number;
  netProfitA: number;
  drawdownA: number;
  ruleA?: string;
  // Strat B
  betB: number;
  wonB: boolean;
  profitB: number;
  bankrollB: number;
  netProfitB: number;
  drawdownB: number;
  ruleB?: string;
}

interface StrategyBacktestSummary {
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

// Popular comparison presets
const POPULAR_COMPARISON_PRESETS = [
  {
    title: "Oscar's Grind vs Paroli",
    desc: "Méthode conservative (+1 unité par cycle) vs Capitalisation agressive sur séries de victoires",
    stratAId: 'strat-dice-oscars-grind',
    stratBId: 'strat-dice-paroli-streak',
  },
  {
    title: "D'Alembert Linéaire vs Wager VIP Safe",
    desc: "Progression arithmétique douce vs Farming de volume à 95% de winrate",
    stratAId: 'strat-dice-dalembert',
    stratBId: 'strat-dice-wager-silver-farming',
  },
  {
    title: "Multi-Conditions 12 Règles vs Martingale Classique",
    desc: "Architecture intelligente avec coupe-circuits vs Doublement géométrique brut",
    stratAId: 'strat-dice-master-tactical-matrix',
    stratBId: 'strat-dice-martingale-soft',
  },
  {
    title: "Limbo Sniper (10x) vs Limbo Safe (1.5x)",
    desc: "Chasse aux multiplicateurs élevés vs Accumulation à haute probabilité",
    stratAId: 'strat-limbo-sniper-10x',
    stratBId: 'strat-limbo-ultra-safe-15x',
  },
];

export const StrategyComparator: React.FC<StrategyComparatorProps> = ({
  currentStrategy,
  onSelectStrategy,
  currency,
  balance,
  bets,
  onStartAutoBet,
  isAutobetting = false,
}) => {
  // Strategy A & Strategy B State
  const [strategyA, setStrategyA] = useState<BettingStrategy>(() => {
    return currentStrategy || PREDEFINED_STRATEGIES[0];
  });

  const [strategyB, setStrategyB] = useState<BettingStrategy>(() => {
    const defaultB = PREDEFINED_STRATEGIES.find((s) => s.id !== currentStrategy.id && s.game === currentStrategy.game)
      || PREDEFINED_STRATEGIES[1]
      || PREDEFINED_STRATEGIES[0];
    return defaultB;
  });

  // Filters & Customization
  const [gameFilterA, setGameFilterA] = useState<string>('all');
  const [gameFilterB, setGameFilterB] = useState<string>('all');
  const [backtestBankroll, setBacktestBankroll] = useState<number>(balance > 0 ? balance : 100);
  const [sampleSizeOption, setSampleSizeOption] = useState<'all_history' | 'last_50' | 'last_100' | 'synthetic_100' | 'synthetic_250'>('all_history');
  const [showAuditTable, setShowAuditTable] = useState<boolean>(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'divergent' | 'win_a_only' | 'win_b_only'>('all');
  const [activeMetricTab, setActiveMetricTab] = useState<'profit' | 'drawdown' | 'bets'>('profit');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Quick swap A and B
  const handleSwapStrategies = () => {
    const temp = strategyA;
    setStrategyA(strategyB);
    setStrategyB(temp);
  };

  // Quick preset loading
  const handleLoadPreset = (stratAId: string, stratBId: string) => {
    const sA = PREDEFINED_STRATEGIES.find((s) => s.id === stratAId);
    const sB = PREDEFINED_STRATEGIES.find((s) => s.id === stratBId);
    if (sA) setStrategyA(sA);
    if (sB) setStrategyB(sB);
  };

  // Resolve roll items to backtest on
  const resolvedRolls = useMemo(() => {
    // 1. If using live history
    if (bets && bets.length > 0 && (sampleSizeOption === 'all_history' || sampleSizeOption === 'last_50' || sampleSizeOption === 'last_100')) {
      const sortedHistory = [...bets].reverse(); // from oldest to newest
      let sliceCount = sortedHistory.length;
      if (sampleSizeOption === 'last_50') sliceCount = Math.min(50, sortedHistory.length);
      if (sampleSizeOption === 'last_100') sliceCount = Math.min(100, sortedHistory.length);
      const selected = sortedHistory.slice(-sliceCount);
      return selected.map((b, idx) => ({
        id: b.id || `hist-${idx}`,
        nonce: b.nonce || idx + 1,
        serverSeed: b.serverSeedHash || 'server_seed_historical_test',
        clientSeed: b.clientSeed || 'client_seed_user_test',
        game: b.game,
        actualPayout: b.payoutMultiplier,
        wonOriginal: b.won,
        details: b.gameDetails || {},
        diceRoll: b.gameDetails?.roll !== undefined ? b.gameDetails.roll : Number((Math.random() * 100).toFixed(2)),
        limboMult: b.gameDetails?.limboMultiplier !== undefined ? b.gameDetails.limboMultiplier : (b.payoutMultiplier > 0 ? b.payoutMultiplier : 1.15),
      }));
    }

    // 2. Synthetic Provably Fair Sequence (either requested or fallback when history is empty)
    const count = sampleSizeOption === 'synthetic_250' ? 250 : 100;
    const synthetic = [];
    const serverSeed = 'stake_provably_fair_benchmark_seed_2026';
    const clientSeed = 'client_comparator_eval_777';

    for (let i = 1; i <= count; i++) {
      // Deterministic outcome evaluation
      const diceRes = simulateGameOutcome('dice', 2.0, { diceCondition: 'above', diceTarget: 50.49 }, serverSeed, clientSeed, i);
      const limboRes = simulateGameOutcome('limbo', 2.0, {}, serverSeed, clientSeed, i);
      
      synthetic.push({
        id: `synth-${i}`,
        nonce: i,
        serverSeed,
        clientSeed,
        game: 'dice' as StakeGameType,
        actualPayout: diceRes.actualMultiplier,
        wonOriginal: diceRes.won,
        details: diceRes.gameDetails,
        diceRoll: diceRes.gameDetails.roll,
        limboMult: limboRes.gameDetails?.limboMultiplier || 1.98,
      });
    }
    return synthetic;
  }, [bets, sampleSizeOption]);

  // Backtesting Execution Function for a Single Strategy over the resolved rolls sequence
  const simulateStrategyBacktest = (
    strat: BettingStrategy,
    initialBankroll: number,
    rolls: typeof resolvedRolls
  ): { summary: StrategyBacktestSummary; steps: Array<{
    step: number;
    betPlaced: number;
    won: boolean;
    profit: number;
    bankroll: number;
    netProfit: number;
    drawdown: number;
    rule?: string;
  }> } => {
    let currentBankroll = initialBankroll;
    let currentBet = strat.baseBet;
    let currentStreak = 0;
    let consecutiveLosses = 0;
    let consecutiveWins = 0;
    let totalBets = 0;
    let totalWon = 0;
    let totalLost = 0;
    let totalWagered = 0;
    let peakProfit = 0;
    let maxDrawdown = 0;
    let maxBetPlaced = strat.baseBet;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let isStoppedEarly = false;
    let stopReason: string | undefined = undefined;

    // Fibonacci helper
    const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    let fibIndex = 0;

    const steps = [];
    const profitSeries: number[] = [];

    for (let i = 0; i < rolls.length; i++) {
      if (isStoppedEarly) break;

      const roll = rolls[i];
      const stepNumber = i + 1;

      // Ensure bet does not exceed current bankroll or maxBetLimit
      let betToPlace = currentBet;
      if (strat.maxBetLimit && betToPlace > strat.maxBetLimit) {
        betToPlace = strat.maxBetLimit;
      }
      if (betToPlace > currentBankroll) {
        betToPlace = currentBankroll;
      }

      if (betToPlace <= 0) {
        isStoppedEarly = true;
        stopReason = 'Solde insuffisant';
        break;
      }

      maxBetPlaced = Math.max(maxBetPlaced, betToPlace);
      totalWagered += betToPlace;
      totalBets++;

      // Evaluate Win / Loss for this specific strategy
      let won = false;
      let payoutMultiplier = strat.targetMultiplier;

      if (strat.game === 'dice') {
        const condition = strat.gameConfig?.diceCondition || 'above';
        const target = strat.gameConfig?.diceTarget !== undefined 
          ? strat.gameConfig.diceTarget 
          : (condition === 'above' ? 50.49 : 49.50);
        const diceVal = roll.diceRoll;
        won = condition === 'above' ? diceVal > target : diceVal < target;
        const winChance = condition === 'above' ? (100 - target) : target;
        payoutMultiplier = Number((99 / winChance).toFixed(4));
      } else if (strat.game === 'limbo') {
        const limboVal = roll.limboMult;
        won = limboVal >= strat.targetMultiplier;
        payoutMultiplier = strat.targetMultiplier;
      } else {
        // General game fallback: evaluate against target multiplier with 99% RTP
        const requiredWinRate = (99 / strat.targetMultiplier) / 100;
        won = (roll.diceRoll / 100) < requiredWinRate;
        payoutMultiplier = strat.targetMultiplier;
      }

      // Calculate step profit
      const stepProfit = won ? Number((betToPlace * (payoutMultiplier - 1)).toFixed(4)) : -betToPlace;
      currentBankroll = Number((currentBankroll + stepProfit).toFixed(4));
      const netProfit = Number((currentBankroll - initialBankroll).toFixed(4));
      profitSeries.push(stepProfit);

      if (won) {
        totalWon++;
        grossWins += (betToPlace * (payoutMultiplier - 1));
        consecutiveWins++;
        consecutiveLosses = 0;
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, consecutiveWins);
      } else {
        totalLost++;
        grossLosses += betToPlace;
        consecutiveLosses++;
        consecutiveWins = 0;
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        maxLossStreak = Math.max(maxLossStreak, consecutiveLosses);
      }

      // Update Peak Profit & Drawdown
      peakProfit = Math.max(peakProfit, netProfit);
      const currentDrawdown = Math.max(0, Number((peakProfit - netProfit).toFixed(4)));
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown);

      let ruleTriggered = '';

      // --- 1. Custom Conditions Evaluation (Stake.com 100% Identical Multi-Condition Engine) ---
      let customRuleMatched = false;
      if (strat.customConditions && strat.customConditions.length > 0) {
        const activeConds = strat.customConditions.filter((c) => c.isActive !== false);
        const evalContext: ConditionEvaluationContext = {
          won,
          totalBets,
          currentStreak: won ? consecutiveWins : -consecutiveLosses,
          previousStreak: won ? -consecutiveLosses : consecutiveWins,
          currentLossStreak: consecutiveLosses,
          currentWinStreak: consecutiveWins,
          prevLossStreak: won ? consecutiveLosses : 0,
          prevWinStreak: !won ? consecutiveWins : 0,
          currentBet: betToPlace,
          baseBet: strat.baseBet,
          currentMultiplier: strat.targetMultiplier,
          baseMultiplier: strat.targetMultiplier,
          sessionProfit: netProfit,
          diceCondition: strat.gameConfig?.diceCondition || 'above',
          diceTarget: strat.gameConfig?.diceTarget || 50.49
        };

        const actionState = {
          nextBet: currentBet,
          targetMultiplier: strat.targetMultiplier,
          winChance: strat.winChance,
          diceCondition: strat.gameConfig?.diceCondition || 'above',
          diceTarget: strat.gameConfig?.diceTarget || 50.49,
          shouldStopAutobet: false,
          resetStreak: false
        };

        for (const cond of activeConds) {
          if (evaluateConditionTrigger(cond, evalContext)) {
            customRuleMatched = true;
            ruleTriggered = cond.description || cond.stakeUiCode || `${cond.triggerType} -> ${cond.actionType}`;
            applyConditionAction(cond, evalContext, actionState);
            currentBet = actionState.nextBet;

            if (actionState.shouldStopAutobet) {
              isStoppedEarly = true;
              stopReason = `Règle de coupure Stake : ${cond.description || cond.stakeUiCode || 'Stop'}`;
            }
            break;
          }
        }
      }

      // --- 2. Standard Logic if No Custom Condition matched ---
      if (!customRuleMatched && !isStoppedEarly) {
        if (won) {
          switch (strat.onWinAction) {
            case 'reset':
              currentBet = strat.baseBet;
              ruleTriggered = 'Reset Base';
              fibIndex = 0;
              break;
            case 'increase_fixed':
              // Oscar's Grind: add +1 unit upon win, unless cycle completed
              const inc = strat.onWinValue !== undefined ? strat.onWinValue : strat.baseBet;
              currentBet = Number((currentBet + inc).toFixed(4));
              ruleTriggered = `+${inc} sur gain`;
              break;
            case 'increase_pct':
              // Paroli: double/increase on win
              const pct = strat.onWinValue !== undefined ? strat.onWinValue : 100;
              currentBet = Number((currentBet * (1 + pct / 100)).toFixed(4));
              ruleTriggered = `+${pct}% sur gain (Paroli)`;
              break;
            case 'custom':
              // D'Alembert: decrease 1 unit on win
              const dec = strat.onWinValue !== undefined ? strat.onWinValue : strat.baseBet;
              currentBet = Number((Math.max(strat.baseBet, currentBet - dec)).toFixed(4));
              ruleTriggered = `-${dec} après gain (D'Alembert)`;
              break;
          }
        } else {
          switch (strat.onLossAction) {
            case 'reset':
              currentBet = strat.baseBet;
              ruleTriggered = 'Mise plate / Reset';
              fibIndex = 0;
              break;
            case 'multiply':
              const mult = strat.onLossValue !== undefined ? strat.onLossValue : 2.0;
              currentBet = Number((currentBet * mult).toFixed(4));
              ruleTriggered = `x${mult} sur perte`;
              break;
            case 'increase_fixed':
              // D'Alembert: add 1 unit on loss
              const addVal = strat.onLossValue !== undefined ? strat.onLossValue : strat.baseBet;
              currentBet = Number((currentBet + addVal).toFixed(4));
              ruleTriggered = `+${addVal} après perte (D'Alembert)`;
              break;
            case 'increase_pct':
              const addPct = strat.onLossValue !== undefined ? strat.onLossValue : 50;
              currentBet = Number((currentBet * (1 + addPct / 100)).toFixed(4));
              ruleTriggered = `+${addPct}% sur perte`;
              break;
            case 'fibonacci':
              fibIndex = Math.min(fibSequence.length - 1, fibIndex + 1);
              currentBet = Number((strat.baseBet * fibSequence[fibIndex]).toFixed(4));
              ruleTriggered = `Fibonacci #${fibIndex + 1} (${fibSequence[fibIndex]}x)`;
              break;
            case 'custom':
              // Oscar's Grind: keep constant bet on loss!
              ruleTriggered = 'Mise constante (Anti-Martingale)';
              break;
          }
        }
      }

      // --- 3. Safety Limits Check ---
      if (strat.stopOnProfit && netProfit >= strat.stopOnProfit) {
        isStoppedEarly = true;
        stopReason = `Take Profit atteint (+${strat.stopOnProfit} ${strat.currency})`;
      }
      if (strat.stopOnLoss && netProfit <= -strat.stopOnLoss) {
        isStoppedEarly = true;
        stopReason = `Stop Loss atteint (-${strat.stopOnLoss} ${strat.currency})`;
      }
      if (strat.trailingStopLoss?.enabled && peakProfit >= strat.trailingStopLoss.activationProfit) {
        const pullback = peakProfit - netProfit;
        if (pullback >= strat.trailingStopLoss.trailDistance) {
          isStoppedEarly = true;
          stopReason = `Trailing Stop déclenché (Pic: +${peakProfit.toFixed(2)}, Rebond: -${pullback.toFixed(2)})`;
        }
      }
      if (strat.maxConsecutiveLosses && consecutiveLosses >= strat.maxConsecutiveLosses) {
        isStoppedEarly = true;
        stopReason = `Limite de ${strat.maxConsecutiveLosses} défaites consécutives atteinte`;
      }

      steps.push({
        step: stepNumber,
        betPlaced: betToPlace,
        won,
        profit: stepProfit,
        bankroll: currentBankroll,
        netProfit,
        drawdown: currentDrawdown,
        rule: ruleTriggered,
      });
    }

    // Calculate Sharpe Proxy (Mean / StdDev of returns)
    let sharpeProxy = 0;
    if (profitSeries.length > 1) {
      const mean = profitSeries.reduce((a, b) => a + b, 0) / profitSeries.length;
      const variance = profitSeries.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / profitSeries.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        sharpeProxy = Number(((mean / stdDev) * Math.sqrt(profitSeries.length)).toFixed(2));
      }
    }

    const netProfitFinal = Number((currentBankroll - initialBankroll).toFixed(4));
    const roiPercent = Number(((netProfitFinal / initialBankroll) * 100).toFixed(2));
    const winRate = totalBets > 0 ? Number(((totalWon / totalBets) * 100).toFixed(2)) : 0;
    const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 99.9 : 0;
    const maxDrawdownPercent = initialBankroll > 0 ? Number(((maxDrawdown / initialBankroll) * 100).toFixed(2)) : 0;
    const estimatedRakeback = Number((totalWagered * 0.01 * (strat.estimatedRakebackPercent ? strat.estimatedRakebackPercent / 100 : 0.10)).toFixed(2));

    const summary: StrategyBacktestSummary = {
      strategy: strat,
      finalBankroll: currentBankroll,
      netProfit: netProfitFinal,
      roiPercent,
      winRate,
      totalBets,
      totalWon,
      totalLost,
      totalWagered: Number(totalWagered.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      maxDrawdownPercent,
      profitFactor,
      averageBet: totalBets > 0 ? Number((totalWagered / totalBets).toFixed(3)) : strat.baseBet,
      maxBetPlaced: Number(maxBetPlaced.toFixed(3)),
      maxWinStreak,
      maxLossStreak,
      estimatedRakeback,
      sharpeProxy,
      isStoppedEarly,
      stopReason,
    };

    return { summary, steps };
  };

  // Run backtests for both Strategy A & Strategy B
  const backtestA = useMemo(() => {
    return simulateStrategyBacktest(strategyA, backtestBankroll, resolvedRolls);
  }, [strategyA, backtestBankroll, resolvedRolls]);

  const backtestB = useMemo(() => {
    return simulateStrategyBacktest(strategyB, backtestBankroll, resolvedRolls);
  }, [strategyB, backtestBankroll, resolvedRolls]);

  // Compute Deterministic AI Strategy Scores (0-100) based on Profit Stability & Max Drawdown
  const aiScoreA = useMemo(() => {
    return calculateAiStrategyScore(backtestA.summary, backtestA.steps, backtestBankroll);
  }, [backtestA, backtestBankroll]);

  const aiScoreB = useMemo(() => {
    return calculateAiStrategyScore(backtestB.summary, backtestB.steps, backtestBankroll);
  }, [backtestB, backtestBankroll]);

  // Merge step-by-step data for Recharts Chart & Audit Table
  const mergedChartData = useMemo(() => {
    const maxSteps = Math.max(backtestA.steps.length, backtestB.steps.length);
    const data: BacktestStepResult[] = [];

    // Starting point (Step 0)
    data.push({
      step: 0,
      rollDisplay: 'Départ',
      betA: strategyA.baseBet,
      wonA: true,
      profitA: 0,
      bankrollA: backtestBankroll,
      netProfitA: 0,
      drawdownA: 0,
      betB: strategyB.baseBet,
      wonB: true,
      profitB: 0,
      bankrollB: backtestBankroll,
      netProfitB: 0,
      drawdownB: 0,
    });

    for (let i = 0; i < maxSteps; i++) {
      const stepA = backtestA.steps[i];
      const stepB = backtestB.steps[i];
      const roll = resolvedRolls[i];

      const rollDisplay = roll ? (
        roll.game === 'dice' ? `🎲 ${roll.diceRoll}` :
        roll.game === 'limbo' ? `🚀 ${roll.limboMult}x` :
        `Tirage #${i + 1}`
      ) : `Step #${i + 1}`;

      data.push({
        step: i + 1,
        rollDisplay,
        betA: stepA?.betPlaced || 0,
        wonA: stepA?.won || false,
        profitA: stepA?.profit || 0,
        bankrollA: stepA?.bankroll !== undefined ? stepA.bankroll : (data[data.length - 1]?.bankrollA || backtestBankroll),
        netProfitA: stepA?.netProfit !== undefined ? stepA.netProfit : (data[data.length - 1]?.netProfitA || 0),
        drawdownA: stepA?.drawdown || 0,
        ruleA: stepA?.rule,
        betB: stepB?.betPlaced || 0,
        wonB: stepB?.won || false,
        profitB: stepB?.profit || 0,
        bankrollB: stepB?.bankroll !== undefined ? stepB.bankroll : (data[data.length - 1]?.bankrollB || backtestBankroll),
        netProfitB: stepB?.netProfit !== undefined ? stepB.netProfit : (data[data.length - 1]?.netProfitB || 0),
        drawdownB: stepB?.drawdown || 0,
        ruleB: stepB?.rule,
      });
    }

    return data;
  }, [backtestA, backtestB, backtestBankroll, resolvedRolls, strategyA, strategyB]);

  // Determine overall winner & comparison insights with AI Score weighting
  const comparisonVerdict = useMemo(() => {
    const sumA = backtestA.summary;
    const sumB = backtestB.summary;

    let winner: 'A' | 'B' | 'TIE' = 'TIE';
    const scoreDiff = aiScoreA.totalScore - aiScoreB.totalScore;

    if (scoreDiff >= 2) {
      winner = 'A';
    } else if (scoreDiff <= -2) {
      winner = 'B';
    } else {
      // Very close tiebreaker on net profit then drawdown
      if (sumA.netProfit > sumB.netProfit + 0.1) winner = 'A';
      else if (sumB.netProfit > sumA.netProfit + 0.1) winner = 'B';
      else if (sumA.maxDrawdown < sumB.maxDrawdown) winner = 'A';
      else if (sumB.maxDrawdown < sumA.maxDrawdown) winner = 'B';
    }

    const profitDiff = Math.abs(sumA.netProfit - sumB.netProfit).toFixed(2);
    const ddDiff = Math.abs(sumA.maxDrawdown - sumB.maxDrawdown).toFixed(2);
    const aiScoreDiff = Math.abs(scoreDiff);

    return {
      winner,
      scoreA: aiScoreA.totalScore,
      scoreB: aiScoreB.totalScore,
      aiScoreDiff,
      profitDiff,
      ddDiff,
      profitWinner: sumA.netProfit >= sumB.netProfit ? 'A' : 'B',
      safetyWinner: sumA.maxDrawdown <= sumB.maxDrawdown ? 'A' : 'B',
      volumeWinner: sumA.totalWagered >= sumB.totalWagered ? 'A' : 'B',
      sharpeWinner: sumA.sharpeProxy >= sumB.sharpeProxy ? 'A' : 'B',
      stabilityWinner: aiScoreA.profitStabilityScore >= aiScoreB.profitStabilityScore ? 'A' : 'B',
      drawdownWinner: aiScoreA.drawdownResilienceScore >= aiScoreB.drawdownResilienceScore ? 'A' : 'B',
    };
  }, [backtestA, backtestB, aiScoreA, aiScoreB]);

  // Copy summary report to clipboard
  const handleCopyComparisonReport = () => {
    const sA = backtestA.summary;
    const sB = backtestB.summary;
    const text = 
      `STAKE BOT - RAPPORT COMPARATIF THÉORIQUE & SCORING IA\n` +
      `----------------------------------------------------------------------\n` +
      `Échantillon : ${resolvedRolls.length} paris réels/simulés | Bankroll : ${backtestBankroll} ${currency}\n\n` +
      `STRATÉGIE A : ${strategyA.name} (${strategyA.game.toUpperCase()})\n` +
      `• NOTE IA GLOBALE : ${aiScoreA.totalScore}/100 (Grade ${aiScoreA.grade})\n` +
      `  - Stabilité du Profit : ${aiScoreA.profitStabilityScore}/50 pts\n` +
      `  - Résilience Drawdown : ${aiScoreA.drawdownResilienceScore}/50 pts\n` +
      `• Profit Net : ${sA.netProfit >= 0 ? '+' : ''}${sA.netProfit} ${currency} (${sA.roiPercent}% ROI)\n` +
      `• Drawdown Max : -${sA.maxDrawdown} ${currency} (${sA.maxDrawdownPercent}%)\n` +
      `• Taux Victoire : ${sA.winRate}%\n` +
      `• Volume Misé : ${sA.totalWagered} ${currency} (Rakeback: ~${sA.estimatedRakeback} ${currency})\n` +
      `• Mise Max : ${sA.maxBetPlaced} ${currency} | Facteur Profit : ${sA.profitFactor}\n\n` +
      `STRATÉGIE B : ${strategyB.name} (${strategyB.game.toUpperCase()})\n` +
      `• NOTE IA GLOBALE : ${aiScoreB.totalScore}/100 (Grade ${aiScoreB.grade})\n` +
      `  - Stabilité du Profit : ${aiScoreB.profitStabilityScore}/50 pts\n` +
      `  - Résilience Drawdown : ${aiScoreB.drawdownResilienceScore}/50 pts\n` +
      `• Profit Net : ${sB.netProfit >= 0 ? '+' : ''}${sB.netProfit} ${currency} (${sB.roiPercent}% ROI)\n` +
      `• Drawdown Max : -${sB.maxDrawdown} ${currency} (${sB.maxDrawdownPercent}%)\n` +
      `• Taux Victoire : ${sB.winRate}%\n` +
      `• Volume Misé : ${sB.totalWagered} ${currency} (Rakeback: ~${sB.estimatedRakeback} ${currency})\n` +
      `• Mise Max : ${sB.maxBetPlaced} ${currency} | Facteur Profit : ${sB.profitFactor}\n\n` +
      `VERDICT : Stratégie ${comparisonVerdict.winner === 'TIE' ? 'Égalité' : comparisonVerdict.winner} (${comparisonVerdict.winner === 'A' ? strategyA.name : strategyB.name})\n` +
      `Scoring IA : A (${aiScoreA.totalScore}/100) vs B (${aiScoreB.totalScore}/100)\n`;
    
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Filtered audit table rows
  const filteredAuditRows = useMemo(() => {
    return mergedChartData.slice(1).filter((row) => {
      if (auditFilter === 'divergent') return row.wonA !== row.wonB;
      if (auditFilter === 'win_a_only') return row.wonA && !row.wonB;
      if (auditFilter === 'win_b_only') return !row.wonA && row.wonB;
      return true;
    });
  }, [mergedChartData, auditFilter]);

  return (
    <div id="strategy-comparator-view" className="space-y-6">
      
      {/* 1. Header & Configuration Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Comparateur Théorique Côte à Côte
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  BACKTEST HISTORIQUE & IA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Rejouez fidèlement la séquence des tirages réels pour comparer la résilience, le profit et le drawdown de deux stratégies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="swap-strategies-btn"
              onClick={handleSwapStrategies}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Inverser Stratégie A et Stratégie B"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Inverser A ⇄ B</span>
            </button>

            <button
              type="button"
              id="copy-report-btn"
              onClick={handleCopyComparisonReport}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedSummary ? 'Copié !' : 'Exporter Rapport'}</span>
            </button>
          </div>
        </div>

        {/* Data Source & Bankroll Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Historical Data Source */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center justify-between">
              <span>Source de Données :</span>
              <span className="text-[10px] font-mono text-purple-300 font-bold">
                {bets && bets.length > 0 ? `${bets.length} paris en mémoire` : 'Générateur Provably Fair'}
              </span>
            </label>
            <select
              value={sampleSizeOption}
              onChange={(e) => setSampleSizeOption(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all_history" disabled={!bets || bets.length === 0}>
                {bets && bets.length > 0 ? `Tout l'Historique Récent (${bets.length} paris)` : 'Historique réel (Aucun pari en cours)'}
              </option>
              <option value="last_50" disabled={!bets || bets.length < 10}>
                Derniers 50 paris enregistrés
              </option>
              <option value="last_100" disabled={!bets || bets.length < 20}>
                Derniers 100 paris enregistrés
              </option>
              <option value="synthetic_100">
                Séquence Provably Fair 100 Tirages (RTP 99%)
              </option>
              <option value="synthetic_250">
                Épreuve de Résilience 250 Tirages (Stress Test)
              </option>
            </select>
          </div>

          {/* Initial Bankroll */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Bankroll de Départ ({currency})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="10"
                value={backtestBankroll}
                onChange={(e) => setBacktestBankroll(Math.max(1, parseFloat(e.target.value) || 100))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono font-bold focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setBacktestBankroll(balance > 0 ? balance : 100)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded font-semibold whitespace-nowrap"
                title="Synchroniser avec le solde actuel"
              >
                Solde
              </button>
            </div>
          </div>

          {/* Popular Matchup Presets */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Duels & Matchups Populaires en 1 Clic :
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_COMPARISON_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadPreset(p.stratAId, p.stratBId)}
                  className="text-left px-2 py-1 rounded bg-slate-900/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-600/40 text-[10px] text-slate-300 truncate transition group"
                  title={p.desc}
                >
                  <span className="font-bold text-slate-200 group-hover:text-purple-300 block truncate">
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 2. Side-by-Side Strategy Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Strategy A (Emerald / Violet) */}
        <div className="bg-gradient-to-b from-emerald-950/30 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                A
              </span>
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                STRATÉGIE A (RÉFÉRENCE)
              </span>
            </div>
            {currentStrategy.id === strategyA.id ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                ✓ Active en jeu
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectStrategy(strategyA)}
                className="text-[10px] bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 px-2 py-0.5 rounded-lg font-semibold border border-slate-700 transition"
              >
                Définir comme active
              </button>
            )}
          </div>

          {/* Strategy A Dropdown & Game Filter */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Jeu :</label>
              <select
                value={gameFilterA}
                onChange={(e) => setGameFilterA(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">Tous jeux</option>
                <option value="dice">Dice</option>
                <option value="limbo">Limbo</option>
                <option value="mines">Mines</option>
                <option value="plinko">Plinko</option>
                <option value="crash">Crash</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Sélectionner Stratégie :</label>
              <select
                value={strategyA.id}
                onChange={(e) => {
                  const found = PREDEFINED_STRATEGIES.find((s) => s.id === e.target.value);
                  if (found) setStrategyA(found);
                }}
                className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-2 py-1 text-xs text-emerald-200 font-bold focus:outline-none truncate"
              >
                {PREDEFINED_STRATEGIES
                  .filter((s) => gameFilterA === 'all' || s.game === gameFilterA)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.game.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* AI Scoring (0-100) Badge & Stability / Drawdown Breakdown for Strategy A */}
          <div className="bg-slate-950/90 p-3 rounded-xl border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Note IA Globale</span>
                <span className="text-[10px] text-slate-400">(0-100)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-black font-mono ${aiScoreA.gradeColor}`}>
                  {aiScoreA.totalScore}
                  <span className="text-xs text-slate-400">/100</span>
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${aiScoreA.gradeBg} ${aiScoreA.gradeColor} ${aiScoreA.gradeBorder}`}>
                  {aiScoreA.grade}
                </span>
              </div>
            </div>

            {/* Sub-Score Bars */}
            <div className="space-y-1.5 text-[11px] font-mono">
              {/* Stability Score Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    Stabilité du Profit :
                  </span>
                  <span className="text-emerald-300 font-bold">{aiScoreA.profitStabilityScore} / 50 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(aiScoreA.profitStabilityScore / 50) * 100}%` }}
                  />
                </div>
              </div>

              {/* Drawdown Resilience Score Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <Shield className="w-3 h-3 text-teal-400" />
                    Résilience Drawdown :
                  </span>
                  <span className="text-teal-300 font-bold">{aiScoreA.drawdownResilienceScore} / 50 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(aiScoreA.drawdownResilienceScore / 50) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Insights badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10px]">
              <div className="flex items-center gap-1 text-emerald-300 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/40 truncate" title={aiScoreA.details.keyStrength}>
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{aiScoreA.details.keyStrength}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/40 truncate" title={aiScoreA.details.keyVulnerability}>
                <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{aiScoreA.details.keyVulnerability}</span>
              </div>
            </div>
          </div>

          {/* Key Strategy A specs preview */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">{strategyA.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
                {strategyA.riskLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {strategyA.description}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block text-[9px]">Mise Base :</span>
                <span className="text-emerald-300 font-bold">{strategyA.baseBet} {currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Multiplicateur :</span>
                <span className="text-emerald-300 font-bold">{strategyA.targetMultiplier}x</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Progression :</span>
                <span className="text-slate-300 capitalize">{strategyA.onLossAction}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Strategy B (Cyan / Amber) */}
        <div className="bg-gradient-to-b from-cyan-950/30 via-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                B
              </span>
              <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                STRATÉGIE B (CHALLENGER)
              </span>
            </div>
            {currentStrategy.id === strategyB.id ? (
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                ✓ Active en jeu
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectStrategy(strategyB)}
                className="text-[10px] bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 px-2 py-0.5 rounded-lg font-semibold border border-slate-700 transition"
              >
                Définir comme active
              </button>
            )}
          </div>

          {/* Strategy B Dropdown & Game Filter */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Jeu :</label>
              <select
                value={gameFilterB}
                onChange={(e) => setGameFilterB(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">Tous jeux</option>
                <option value="dice">Dice</option>
                <option value="limbo">Limbo</option>
                <option value="mines">Mines</option>
                <option value="plinko">Plinko</option>
                <option value="crash">Crash</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Sélectionner Stratégie :</label>
              <select
                value={strategyB.id}
                onChange={(e) => {
                  const found = PREDEFINED_STRATEGIES.find((s) => s.id === e.target.value);
                  if (found) setStrategyB(found);
                }}
                className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-cyan-200 font-bold focus:outline-none truncate"
              >
                {PREDEFINED_STRATEGIES
                  .filter((s) => gameFilterB === 'all' || s.game === gameFilterB)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.game.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* AI Scoring (0-100) Badge & Stability / Drawdown Breakdown for Strategy B */}
          <div className="bg-slate-950/90 p-3 rounded-xl border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Note IA Globale</span>
                <span className="text-[10px] text-slate-400">(0-100)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-black font-mono ${aiScoreB.gradeColor}`}>
                  {aiScoreB.totalScore}
                  <span className="text-xs text-slate-400">/100</span>
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${aiScoreB.gradeBg} ${aiScoreB.gradeColor} ${aiScoreB.gradeBorder}`}>
                  {aiScoreB.grade}
                </span>
              </div>
            </div>

            {/* Sub-Score Bars */}
            <div className="space-y-1.5 text-[11px] font-mono">
              {/* Stability Score Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                    Stabilité du Profit :
                  </span>
                  <span className="text-cyan-300 font-bold">{aiScoreB.profitStabilityScore} / 50 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(aiScoreB.profitStabilityScore / 50) * 100}%` }}
                  />
                </div>
              </div>

              {/* Drawdown Resilience Score Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    Résilience Drawdown :
                  </span>
                  <span className="text-indigo-300 font-bold">{aiScoreB.drawdownResilienceScore} / 50 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(aiScoreB.drawdownResilienceScore / 50) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Insights badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[10px]">
              <div className="flex items-center gap-1 text-cyan-300 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-900/40 truncate" title={aiScoreB.details.keyStrength}>
                <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{aiScoreB.details.keyStrength}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/40 truncate" title={aiScoreB.details.keyVulnerability}>
                <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{aiScoreB.details.keyVulnerability}</span>
              </div>
            </div>
          </div>

          {/* Key Strategy B specs preview */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">{strategyB.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold">
                {strategyB.riskLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {strategyB.description}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block text-[9px]">Mise Base :</span>
                <span className="text-cyan-300 font-bold">{strategyB.baseBet} {currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Multiplicateur :</span>
                <span className="text-cyan-300 font-bold">{strategyB.targetMultiplier}x</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Progression :</span>
                <span className="text-slate-300 capitalize">{strategyB.onLossAction}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Global AI & Mathematical Verdict Banner */}
      <div className={`p-5 rounded-2xl border shadow-md transition-all ${
        comparisonVerdict.winner === 'A'
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50'
          : comparisonVerdict.winner === 'B'
            ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border-cyan-500/50'
            : 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-700'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-3 rounded-2xl border text-slate-950 shrink-0 ${
              comparisonVerdict.winner === 'A' ? 'bg-emerald-400 border-emerald-300' :
              comparisonVerdict.winner === 'B' ? 'bg-cyan-400 border-cyan-300' :
              'bg-amber-400 border-amber-300'
            }`}>
              <Trophy className="w-6 h-6 fill-current" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Verdict du Scoring IA & Analyse Comparative
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  comparisonVerdict.winner === 'A' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  comparisonVerdict.winner === 'B' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {comparisonVerdict.winner === 'A' ? `Gagnant : Stratégie A (${aiScoreA.totalScore}/100 vs ${aiScoreB.totalScore}/100)` :
                   comparisonVerdict.winner === 'B' ? `Gagnant : Stratégie B (${aiScoreB.totalScore}/100 vs ${aiScoreA.totalScore}/100)` :
                   `Égalité Parfaite (${aiScoreA.totalScore}/100)`}
                </span>
              </div>

              <p className="text-sm font-bold text-slate-100">
                {comparisonVerdict.winner === 'A' ? (
                  <span>
                    La <strong className="text-emerald-400">{strategyA.name}</strong> l'emporte avec une note IA de <strong className="text-emerald-300">{aiScoreA.totalScore}/100</strong>{' '}
                    ({aiScoreA.profitStabilityScore}/50 en stabilité, {aiScoreA.drawdownResilienceScore}/50 en résilience drawdown), face à {aiScoreB.totalScore}/100 pour la Stratégie B.
                  </span>
                ) : comparisonVerdict.winner === 'B' ? (
                  <span>
                    La <strong className="text-cyan-400">{strategyB.name}</strong> l'emporte avec une note IA de <strong className="text-cyan-300">{aiScoreB.totalScore}/100</strong>{' '}
                    ({aiScoreB.profitStabilityScore}/50 en stabilité, {aiScoreB.drawdownResilienceScore}/50 en résilience drawdown), face à {aiScoreA.totalScore}/100 pour la Stratégie A.
                  </span>
                ) : (
                  <span>
                    Les deux stratégies obtiennent une note équivalente de <strong className="text-amber-300">{aiScoreA.totalScore}/100</strong> avec un profil de risque et de gain très proche.
                  </span>
                )}
              </p>

              {/* Head-to-Head Comparative Bar */}
              <div className="pt-1.5 flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>A: <strong>{aiScoreA.totalScore} pts</strong> (Grade {aiScoreA.grade})</span>
                </div>
                <div className="flex-1 max-w-xs bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${(aiScoreA.totalScore / (aiScoreA.totalScore + aiScoreB.totalScore || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-cyan-500 h-full transition-all duration-500"
                    style={{ width: `${(aiScoreB.totalScore / (aiScoreA.totalScore + aiScoreB.totalScore || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>B: <strong>{aiScoreB.totalScore} pts</strong> (Grade {aiScoreB.grade})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const winStrat = comparisonVerdict.winner === 'B' ? strategyB : strategyA;
                onSelectStrategy(winStrat);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Adopter la Meilleure Stratégie ({comparisonVerdict.winner === 'B' ? 'B' : 'A'})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Interactive Performance Curve (Dual Recharts Chart) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Courbe d'Évolution Comparative du Solde ({currency})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              ({mergedChartData.length - 1} tirages rejoués)
            </span>
          </div>

          {/* Metric curve toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveMetricTab('profit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMetricTab === 'profit'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Profit Cumulé ($)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('drawdown')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMetricTab === 'drawdown'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drawdown Subi ($)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('bets')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                activeMetricTab === 'bets'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Taille des Mises ($)
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mergedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                {/* Gradient Strat A (Emerald) */}
                <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                {/* Gradient Strat B (Cyan) */}
                <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              
              <XAxis
                dataKey="step"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickLine={false}
                tickFormatter={(val) => `#${val}`}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickLine={false}
                domain={['auto', 'auto']}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0]?.payload as BacktestStepResult;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl text-xs font-mono space-y-2 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-slate-200">Étape #{d.step}</span>
                        <span className="text-[10px] text-purple-300 font-bold px-1.5 py-0.2 rounded bg-purple-950">
                          {d.rollDisplay}
                        </span>
                      </div>

                      {/* Strat A */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-emerald-400 font-bold">
                          <span>Stratégie A :</span>
                          <span>{d.netProfitA >= 0 ? '+' : ''}{d.netProfitA.toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Mise : {d.betA.toFixed(3)} {currency}</span>
                          <span className={d.wonA ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            {d.wonA ? '✓ Gain' : '✗ Perte'}
                          </span>
                        </div>
                        {d.ruleA && <span className="text-[9px] text-slate-500 block italic">{d.ruleA}</span>}
                      </div>

                      {/* Strat B */}
                      <div className="space-y-0.5 pt-1.5 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-cyan-400 font-bold">
                          <span>Stratégie B :</span>
                          <span>{d.netProfitB >= 0 ? '+' : ''}{d.netProfitB.toFixed(2)} {currency}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Mise : {d.betB.toFixed(3)} {currency}</span>
                          <span className={d.wonB ? 'text-cyan-400 font-bold' : 'text-rose-400'}>
                            {d.wonB ? '✓ Gain' : '✗ Perte'}
                          </span>
                        </div>
                        {d.ruleB && <span className="text-[9px] text-slate-500 block italic">{d.ruleB}</span>}
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => {
                  if (value === 'netProfitA' || value === 'drawdownA' || value === 'betA') {
                    return <span className="text-xs font-bold text-emerald-400">Stratégie A : {strategyA.name}</span>;
                  }
                  return <span className="text-xs font-bold text-cyan-400">Stratégie B : {strategyB.name}</span>;
                }}
              />

              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />

              {activeMetricTab === 'profit' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="netProfitA"
                    name="netProfitA"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorA)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netProfitB"
                    name="netProfitB"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorB)"
                  />
                </>
              )}

              {activeMetricTab === 'drawdown' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="drawdownA"
                    name="drawdownA"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="#f43f5e"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdownB"
                    name="drawdownB"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="#f59e0b"
                    fillOpacity={0.15}
                  />
                </>
              )}

              {activeMetricTab === 'bets' && (
                <>
                  <Area
                    type="stepAfter"
                    dataKey="betA"
                    name="betA"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="betB"
                    name="betB"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="#06b6d4"
                    fillOpacity={0.15}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Detailed Head-to-Head Comparative Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Profit Net & ROI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Profit Net & ROI
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              backtestA.summary.netProfit >= backtestB.summary.netProfit
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {backtestA.summary.netProfit >= backtestB.summary.netProfit ? 'Avantage A' : 'Avantage B'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Strat A */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-900/30">
              <span className="text-[10px] font-bold text-emerald-400 block">Stratégie A</span>
              <span className={`text-sm font-black font-mono block ${
                backtestA.summary.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}>
                {backtestA.summary.netProfit >= 0 ? '+' : ''}{backtestA.summary.netProfit} {currency}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {backtestA.summary.roiPercent}% ROI
              </span>
            </div>

            {/* Strat B */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-cyan-900/30">
              <span className="text-[10px] font-bold text-cyan-400 block">Stratégie B</span>
              <span className={`text-sm font-black font-mono block ${
                backtestB.summary.netProfit >= 0 ? 'text-cyan-300' : 'text-rose-400'
              }`}>
                {backtestB.summary.netProfit >= 0 ? '+' : ''}{backtestB.summary.netProfit} {currency}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {backtestB.summary.roiPercent}% ROI
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Max Drawdown Subi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Drawdown Max (Risque)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              backtestA.summary.maxDrawdown <= backtestB.summary.maxDrawdown
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-cyan-500/20 text-cyan-300'
            }`}>
              {backtestA.summary.maxDrawdown <= backtestB.summary.maxDrawdown ? 'Moins risqué A' : 'Moins risqué B'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Strat A */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-900/30">
              <span className="text-[10px] font-bold text-emerald-400 block">Stratégie A</span>
              <span className="text-sm font-black font-mono text-rose-300 block">
                -{backtestA.summary.maxDrawdown} {currency}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {backtestA.summary.maxDrawdownPercent}% du capital
              </span>
            </div>

            {/* Strat B */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-cyan-900/30">
              <span className="text-[10px] font-bold text-cyan-400 block">Stratégie B</span>
              <span className="text-sm font-black font-mono text-rose-300 block">
                -{backtestB.summary.maxDrawdown} {currency}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {backtestB.summary.maxDrawdownPercent}% du capital
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Volume Wager & Rakeback */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              Volume Misé & Rakeback
            </span>
            <span className="text-[10px] font-mono text-amber-300 font-bold">
              Farming VIP
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Strat A */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-900/30">
              <span className="text-[10px] font-bold text-emerald-400 block">Stratégie A</span>
              <span className="text-sm font-black font-mono text-slate-100 block">
                {backtestA.summary.totalWagered} {currency}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                ~{backtestA.summary.estimatedRakeback} {currency} RB
              </span>
            </div>

            {/* Strat B */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-cyan-900/30">
              <span className="text-[10px] font-bold text-cyan-400 block">Stratégie B</span>
              <span className="text-sm font-black font-mono text-slate-100 block">
                {backtestB.summary.totalWagered} {currency}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                ~{backtestB.summary.estimatedRakeback} {currency} RB
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Facteur de Profit & Sharpe */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-purple-400" />
              Facteur Profit & Sharpe
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-bold">
              Consistance
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Strat A */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-emerald-900/30">
              <span className="text-[10px] font-bold text-emerald-400 block">Stratégie A</span>
              <span className="text-sm font-black font-mono text-purple-300 block">
                {backtestA.summary.profitFactor}x PF
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Sharpe: {backtestA.summary.sharpeProxy}
              </span>
            </div>

            {/* Strat B */}
            <div className="p-2 rounded-xl bg-slate-950/70 border border-cyan-900/30">
              <span className="text-[10px] font-bold text-cyan-400 block">Stratégie B</span>
              <span className="text-sm font-black font-mono text-purple-300 block">
                {backtestB.summary.profitFactor}x PF
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Sharpe: {backtestB.summary.sharpeProxy}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 6. Comprehensive Matrix Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          Tableau Comparatif Détaillé des Indicateurs Mathématiques & Scoring IA
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2.5">Métrique d'Évaluation</th>
                <th className="pb-2.5 text-emerald-400 font-bold">Stratégie A : {strategyA.name}</th>
                <th className="pb-2.5 text-cyan-400 font-bold">Stratégie B : {strategyB.name}</th>
                <th className="pb-2.5 text-right">Delta / Écart Relatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {/* Row: Note IA Globale */}
              <tr className="bg-purple-950/20">
                <td className="py-2.5 text-purple-200 font-sans font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Note IA Globale (0-100)
                </td>
                <td className="py-2.5 text-emerald-300 font-black">
                  {aiScoreA.totalScore} / 100 <span className={`text-[10px] px-1.5 py-0.2 rounded border ml-1 ${aiScoreA.gradeBg} ${aiScoreA.gradeColor} ${aiScoreA.gradeBorder}`}>{aiScoreA.grade}</span>
                </td>
                <td className="py-2.5 text-cyan-300 font-black">
                  {aiScoreB.totalScore} / 100 <span className={`text-[10px] px-1.5 py-0.2 rounded border ml-1 ${aiScoreB.gradeBg} ${aiScoreB.gradeColor} ${aiScoreB.gradeBorder}`}>{aiScoreB.grade}</span>
                </td>
                <td className="py-2.5 text-right font-bold text-slate-300">
                  {aiScoreA.totalScore >= aiScoreB.totalScore ? `+${aiScoreA.totalScore - aiScoreB.totalScore} pts (A)` : `+${aiScoreB.totalScore - aiScoreA.totalScore} pts (B)`}
                </td>
              </tr>
              {/* Row: Sous-score Stabilité */}
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Stabilité du Profit (Pondération 50 pts)</td>
                <td className="py-2 text-emerald-300 font-bold">{aiScoreA.profitStabilityScore} / 50 pts</td>
                <td className="py-2 text-cyan-300 font-bold">{aiScoreB.profitStabilityScore} / 50 pts</td>
                <td className="py-2 text-right text-slate-400">
                  {aiScoreA.profitStabilityScore >= aiScoreB.profitStabilityScore ? `+${aiScoreA.profitStabilityScore - aiScoreB.profitStabilityScore} pts (A)` : `+${aiScoreB.profitStabilityScore - aiScoreA.profitStabilityScore} pts (B)`}
                </td>
              </tr>
              {/* Row: Sous-score Drawdown */}
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Résilience Drawdown (Pondération 50 pts)</td>
                <td className="py-2 text-emerald-300 font-bold">{aiScoreA.drawdownResilienceScore} / 50 pts</td>
                <td className="py-2 text-cyan-300 font-bold">{aiScoreB.drawdownResilienceScore} / 50 pts</td>
                <td className="py-2 text-right text-slate-400">
                  {aiScoreA.drawdownResilienceScore >= aiScoreB.drawdownResilienceScore ? `+${aiScoreA.drawdownResilienceScore - aiScoreB.drawdownResilienceScore} pts (A)` : `+${aiScoreB.drawdownResilienceScore - aiScoreA.drawdownResilienceScore} pts (B)`}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Taux de Victoire (Winrate)</td>
                <td className="py-2 text-emerald-300 font-bold">{backtestA.summary.winRate}% ({backtestA.summary.totalWon}/{backtestA.summary.totalBets})</td>
                <td className="py-2 text-cyan-300 font-bold">{backtestB.summary.winRate}% ({backtestB.summary.totalWon}/{backtestB.summary.totalBets})</td>
                <td className="py-2 text-right text-slate-400">
                  {(backtestA.summary.winRate - backtestB.summary.winRate).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Mise Moyenne vs Mise Maximale</td>
                <td className="py-2 text-slate-300">{backtestA.summary.averageBet} {currency} (Max: <strong className="text-emerald-300">{backtestA.summary.maxBetPlaced}</strong>)</td>
                <td className="py-2 text-slate-300">{backtestB.summary.averageBet} {currency} (Max: <strong className="text-cyan-300">{backtestB.summary.maxBetPlaced}</strong>)</td>
                <td className="py-2 text-right text-slate-400">
                  Max A: {backtestA.summary.maxBetPlaced > backtestB.summary.maxBetPlaced ? 'Plus élevé' : 'Plus faible'}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Pire Série de Défaites (Loss Streak)</td>
                <td className="py-2 text-rose-300">{backtestA.summary.maxLossStreak} pertes consécutives</td>
                <td className="py-2 text-rose-300">{backtestB.summary.maxLossStreak} pertes consécutives</td>
                <td className="py-2 text-right text-slate-400">
                  {backtestA.summary.maxLossStreak === backtestB.summary.maxLossStreak ? 'Égal' : backtestA.summary.maxLossStreak < backtestB.summary.maxLossStreak ? 'A plus résistant' : 'B plus résistant'}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Meilleure Série de Victoires (Win Streak)</td>
                <td className="py-2 text-emerald-300">{backtestA.summary.maxWinStreak} gains consécutifs</td>
                <td className="py-2 text-cyan-300">{backtestB.summary.maxWinStreak} gains consécutifs</td>
                <td className="py-2 text-right text-slate-400">
                  {backtestA.summary.maxWinStreak > backtestB.summary.maxWinStreak ? 'A (+)' : 'B (+)'}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-semibold">Statut d'Arrêt & Sécurités</td>
                <td className="py-2 text-slate-300">
                  {backtestA.summary.isStoppedEarly ? (
                    <span className="text-amber-400 font-bold">{backtestA.summary.stopReason}</span>
                  ) : (
                    <span className="text-emerald-400">Terminé normalement</span>
                  )}
                </td>
                <td className="py-2 text-slate-300">
                  {backtestB.summary.isStoppedEarly ? (
                    <span className="text-amber-400 font-bold">{backtestB.summary.stopReason}</span>
                  ) : (
                    <span className="text-cyan-400">Terminé normalement</span>
                  )}
                </td>
                <td className="py-2 text-right text-slate-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Step-by-Step Backtest Audit Table (Expandable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAuditTable(!showAuditTable)}
            className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-purple-300 transition"
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>Journal d'Audit Pas-à-Pas (Replay Déterministe)</span>
            {showAuditTable ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showAuditTable && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px]">Filtrer :</span>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">Tous les pas ({mergedChartData.length - 1})</option>
                <option value="divergent">Résultats divergents (Win/Loss opposés)</option>
                <option value="win_a_only">Victoires A uniquement</option>
                <option value="win_b_only">Victoires B uniquement</option>
              </select>
            </div>
          )}
        </div>

        {showAuditTable && (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/90">
            <table className="w-full text-xs text-left font-mono">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-semibold">
                <tr>
                  <th className="py-2 px-3"># Pas</th>
                  <th className="py-2 px-3">Tirage / Roll</th>
                  <th className="py-2 px-3 text-emerald-400">Strat A : Mise & Profit</th>
                  <th className="py-2 px-3 text-emerald-400">Solde A</th>
                  <th className="py-2 px-3 text-cyan-400">Strat B : Mise & Profit</th>
                  <th className="py-2 px-3 text-cyan-400">Solde B</th>
                  <th className="py-2 px-3 text-right">Règle Déclenchée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-[11px]">
                {filteredAuditRows.map((row) => (
                  <tr key={row.step} className="hover:bg-slate-900/50 transition">
                    <td className="py-1.5 px-3 font-bold text-slate-400">#{row.step}</td>
                    <td className="py-1.5 px-3 text-purple-300 font-bold">{row.rollDisplay}</td>
                    <td className="py-1.5 px-3">
                      <span className="text-slate-400">{row.betA.toFixed(3)} {currency} ➔ </span>
                      <span className={`font-bold ${row.profitA >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.profitA >= 0 ? '+' : ''}{row.profitA.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-emerald-300 font-bold">
                      {row.bankrollA.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-slate-400">{row.betB.toFixed(3)} {currency} ➔ </span>
                      <span className={`font-bold ${row.profitB >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {row.profitB >= 0 ? '+' : ''}{row.profitB.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-cyan-300 font-bold">
                      {row.bankrollB.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-[10px] text-slate-500 truncate max-w-[160px]">
                      {row.ruleA || row.ruleB || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
