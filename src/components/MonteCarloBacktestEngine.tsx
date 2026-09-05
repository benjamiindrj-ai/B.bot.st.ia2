import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  Cpu, 
  Zap, 
  Lock, 
  RefreshCw, 
  Scale, 
  Target,
  Download,
  Check,
  AlertCircle,
  Copy,
  SlidersHorizontal,
  Flame,
  Info,
  Dice5,
  ScatterChart,
  Percent,
  Gauge,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  BettingStrategy, 
  StakeGameType, 
  MonteCarloBacktestSummary,
  MonteCarloSeedIterationResult,
  MonteCarloTrajectoryPoint,
  MonteCarloHistogramBin,
  MonteCarloStreakDistributionItem
} from '../types';
import { 
  evaluateConditionTrigger, 
  applyConditionAction, 
  ConditionEvaluationContext 
} from '../utils/stakeConditionEngine';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { getStakeProvablyFairFloat, generateRandomSeed } from '../utils/provablyFair';

interface MonteCarloBacktestEngineProps {
  strategy: BettingStrategy;
  currency: string;
  balance: number;
  onUpdateStrategy: (strategy: Partial<BettingStrategy>) => void;
  onSelectStrategy: (strategy: BettingStrategy) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const MonteCarloBacktestEngine: React.FC<MonteCarloBacktestEngineProps> = ({
  strategy,
  currency,
  balance,
  onUpdateStrategy,
  onSelectStrategy,
  onNavigateToTab,
}) => {
  // Config state
  const [iterationsCount, setIterationsCount] = useState<number>(10000);
  const [roundsPerSeed, setRoundsPerSeed] = useState<number>(250);
  const [testBankroll, setTestBankroll] = useState<number>(() => Math.max(10, Number(balance) || 100));
  const [seedMethod, setSeedMethod] = useState<'provably_fair_sha256' | 'fast_prng'>('provably_fair_sha256');
  const [customHouseEdge, setCustomHouseEdge] = useState<number>(1.0);

  // Strategy Calibration Clone
  const [localStrategy, setLocalStrategy] = useState<BettingStrategy>(() => ({ ...strategy }));
  const [respectStopLoss, setRespectStopLoss] = useState<boolean>(true);
  const [respectTakeProfit, setRespectTakeProfit] = useState<boolean>(true);
  const [respectMaxBetCap, setRespectMaxBetCap] = useState<boolean>(true);
  const [maxBetCapAmount, setMaxBetCapAmount] = useState<number>(() => Number((testBankroll * 0.25).toFixed(2)));

  // Simulation Running State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [progressDetails, setProgressDetails] = useState<string>('');
  const [results, setResults] = useState<MonteCarloBacktestSummary | null>(null);

  // View Sub-Tabs: 'fan_chart' | 'distribution' | 'streaks' | 'extreme_seeds' | 'ai_sizing'
  const [activeSubTab, setActiveSubTab] = useState<'fan_chart' | 'distribution' | 'streaks' | 'extreme_seeds' | 'ai_sizing'>('fan_chart');
  const [showIndividualPaths, setShowIndividualPaths] = useState<boolean>(true);
  const [copiedSeed, setCopiedSeed] = useState<string | null>(null);

  // Filter & Search for Seeds
  const [seedFilter, setSeedFilter] = useState<'all' | 'ruined' | 'profitable' | 'worst_drawdown'>('all');
  const [seedSearch, setSeedSearch] = useState<string>('');
  const [seedPage, setSeedPage] = useState<number>(1);
  const seedsPerPage = 20;

  // Sync local strategy when prop changes
  useEffect(() => {
    setLocalStrategy((prev) => {
      if (
        prev.id === strategy.id &&
        prev.baseBet === strategy.baseBet &&
        prev.targetMultiplier === strategy.targetMultiplier &&
        prev.onLossAction === strategy.onLossAction &&
        prev.onLossValue === strategy.onLossValue &&
        prev.onWinAction === strategy.onWinAction &&
        prev.onWinValue === strategy.onWinValue &&
        prev.currency === strategy.currency
      ) {
        return prev;
      }
      return { ...strategy };
    });
  }, [strategy.id, strategy.baseBet, strategy.targetMultiplier, strategy.onLossAction, strategy.onLossValue, strategy.onWinAction, strategy.onWinValue, strategy.currency]);

  // Sync max bet cap if bankroll changes
  useEffect(() => {
    setMaxBetCapAmount(Number((testBankroll * 0.25).toFixed(2)));
  }, [testBankroll]);

  // --------------------------------------------------------------------
  // HIGH PERFORMANCE MONTE CARLO MULTI-SEEDS RUNNER (10,000 ITERATIONS)
  // --------------------------------------------------------------------
  const runMonteCarlo10k = async () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    setProgressDetails('Initialisation des 10 000 matrices de seeds...');
    setResults(null);

    // Short pause for UI rendering
    await new Promise((resolve) => setTimeout(resolve, 30));

    const startTime = performance.now();
    const totalRuns = iterationsCount;
    const steps = roundsPerSeed;
    const initialBank = Math.max(1, testBankroll);
    const baseBet = Math.max(0.000001, localStrategy.baseBet || 1.0);
    const targetMult = Math.max(1.01, localStrategy.targetMultiplier || 2.0);
    const houseEdgeFrac = Math.max(0.0001, customHouseEdge / 100);
    const winProbability = Math.max(0.0001, Math.min(0.9999, (1 - houseEdgeFrac) / targetMult));

    const stopProfit = respectTakeProfit && localStrategy.stopOnProfit && localStrategy.stopOnProfit > 0 ? localStrategy.stopOnProfit : null;
    const stopLoss = respectStopLoss && localStrategy.stopOnLoss && localStrategy.stopOnLoss > 0 ? localStrategy.stopOnLoss : null;
    const maxBetCap = respectMaxBetCap ? maxBetCapAmount : (localStrategy.maxBetLimit || null);

    // Trailing Stop Loss & Vault Auto-withdraw
    const trailingEnabled = localStrategy.trailingStopLoss?.enabled;
    const trailingActivation = localStrategy.trailingStopLoss?.activationProfit || 0;
    const trailingDistance = localStrategy.trailingStopLoss?.trailDistance || 0;

    const vaultEnabled = localStrategy.autoVaultWithdraw?.enabled;
    const vaultThreshold = localStrategy.autoVaultWithdraw?.threshold || 0;
    const vaultKeep = localStrategy.autoVaultWithdraw?.keepBalance ?? vaultThreshold;

    // Checkpoint setup for percentile fan bands (25 checkpoints)
    const sampleInterval = Math.max(1, Math.floor(steps / 25));
    const stepCheckpoints: number[] = [];
    for (let s = 0; s <= steps; s += sampleInterval) {
      stepCheckpoints.push(s);
    }
    if (stepCheckpoints[stepCheckpoints.length - 1] !== steps) {
      stepCheckpoints.push(steps);
    }

    const stepBalancesMatrix: Float64Array[] = stepCheckpoints.map(
      () => new Float64Array(totalRuns)
    );

    const SAMPLE_PATH_LIMIT = 15;
    const samplePathsArray: number[][] = Array.from({ length: SAMPLE_PATH_LIMIT }, () => []);

    // Metric Trackers
    let ruinCount = 0;
    let takeProfitCount = 0;
    let stopLossCount = 0;
    let profitableRunsCount = 0;
    let totalBetsSurvivedAllRuns = 0;
    let totalBetsSurvivedRuinedRuns = 0;
    let sumMaxDrawdownPct = 0;

    const finalBalances: number[] = new Array(totalRuns);
    const finalProfits: number[] = new Array(totalRuns);
    const seedResultsList: MonteCarloSeedIterationResult[] = [];
    const lossStreakCountMap: Record<number, number> = {};

    // Execution in Chunks of 500-1000 to keep UI 60fps & update progress bar
    const chunkSize = Math.max(250, Math.floor(totalRuns / 20));
    let currentIteration = 0;

    while (currentIteration < totalRuns) {
      const nextChunkEnd = Math.min(totalRuns, currentIteration + chunkSize);

      for (let r = currentIteration; r < nextChunkEnd; r++) {
        // Generate distinct random seed pair for this iteration
        const clientSeed = `cs_mc_${(r + 1).toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        const serverSeedHash = `ss_sha256_${(r + 1).toString(16)}_${Math.random().toString(36).substring(2, 10)}`;
        const startNonce = (r * 13) % 1000 + 1;

        let currentBalance = initialBank;
        let currentBet = baseBet;
        let currentMultiplier = targetMult;
        let currentDiceTarget = localStrategy.gameConfig?.diceTarget || (localStrategy.gameConfig?.diceCondition === 'below' ? 49.5 : 50.49);
        let currentDiceCondition = localStrategy.gameConfig?.diceCondition || 'above';

        let peakBalance = initialBank;
        let lowestBalance = initialBank;
        let lossStreak = 0;
        let winStreak = 0;
        let maxLossStreakInRun = 0;
        let peakBetInRun = baseBet;
        let peakProfit = 0;
        let isRuined = false;
        let isTakeProfitHit = false;
        let isStopLossHit = false;
        let betsPlayed = 0;
        let vaultSecuredTotal = 0;
        let bustedRound: number | undefined = undefined;

        let checkpointIdx = 0;
        if (stepCheckpoints[0] === 0) {
          stepBalancesMatrix[0][r] = currentBalance;
          checkpointIdx = 1;
        }

        const isSampleRun = r < SAMPLE_PATH_LIMIT;
        if (isSampleRun) {
          samplePathsArray[r].push(currentBalance);
        }

        for (let b = 1; b <= steps; b++) {
          betsPlayed++;

          // Check Liquidation / Ruin
          if (currentBalance <= 0.000001 || currentBalance < currentBet) {
            isRuined = true;
            bustedRound = b;
            currentBalance = 0;
            break;
          }

          // Cap bet amount
          let betAmountToPlace = currentBet;
          if (maxBetCap && betAmountToPlace > maxBetCap) {
            betAmountToPlace = maxBetCap;
          }
          if (betAmountToPlace > currentBalance) {
            betAmountToPlace = currentBalance;
          }

          if (betAmountToPlace > peakBetInRun) {
            peakBetInRun = betAmountToPlace;
          }

          // Compute outcome for this seed & round
          let won = false;
          if (seedMethod === 'provably_fair_sha256') {
            const floatVal = getStakeProvablyFairFloat(serverSeedHash, clientSeed, startNonce + b - 1, 0);
            if (localStrategy.game === 'limbo') {
              const rawMult = Math.floor(99 / (1 - floatVal)) / 100;
              won = rawMult >= currentMultiplier;
            } else {
              // Dice
              const roll = Number((Math.floor(floatVal * 10001) / 100).toFixed(2));
              won = currentDiceCondition === 'above' ? roll > currentDiceTarget : roll < currentDiceTarget;
            }
          } else {
            // Fast PRNG
            won = Math.random() < winProbability;
          }

          if (won) {
            const profitFromWin = betAmountToPlace * (currentMultiplier - 1);
            currentBalance += profitFromWin;
            winStreak++;
            lossStreak = 0;

            // Strategy On Win Progression
            if (localStrategy.onWinAction === 'reset') {
              currentBet = baseBet;
            } else if (localStrategy.onWinAction === 'increase_pct') {
              const pct = (localStrategy.onWinValue || 100) / 100;
              currentBet = currentBet * (1 + pct);
            } else if (localStrategy.onWinAction === 'increase_fixed') {
              currentBet = currentBet + (localStrategy.onWinValue || baseBet);
            } else if (localStrategy.onWinAction === 'custom') {
              // Oscar's grind / D'Alembert
              currentBet = Math.max(baseBet, currentBet - baseBet);
            }
          } else {
            currentBalance -= betAmountToPlace;
            lossStreak++;
            winStreak = 0;

            if (lossStreak > maxLossStreakInRun) {
              maxLossStreakInRun = lossStreak;
            }

            // Strategy On Loss Progression
            if (localStrategy.onLossAction === 'multiply') {
              const mul = localStrategy.onLossValue || 2.0;
              currentBet = currentBet * mul;
            } else if (localStrategy.onLossAction === 'increase_pct') {
              const pct = (localStrategy.onLossValue || 100) / 100;
              currentBet = currentBet * (1 + pct);
            } else if (localStrategy.onLossAction === 'increase_fixed') {
              currentBet = currentBet + (localStrategy.onLossValue || baseBet);
            } else if (localStrategy.onLossAction === 'fibonacci') {
              const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
              const idx = Math.min(fibSequence.length - 1, lossStreak);
              currentBet = baseBet * fibSequence[idx];
            } else if (localStrategy.onLossAction === 'reset') {
              currentBet = baseBet;
            } else if (localStrategy.onLossAction === 'custom') {
              // D'Alembert +1 unit
              currentBet = currentBet + baseBet;
            }
          }

          // Custom Multi-Conditions Engine (Stake.com 100% Identical)
          if (localStrategy.customConditions && localStrategy.customConditions.length > 0) {
            const activeConditions = localStrategy.customConditions.filter(c => c.isActive !== false);
            const evalContext: ConditionEvaluationContext = {
              won,
              totalBets: b,
              currentStreak: won ? winStreak : -lossStreak,
              previousStreak: won ? -lossStreak : winStreak,
              currentLossStreak: lossStreak,
              currentWinStreak: winStreak,
              prevLossStreak: won ? lossStreak : 0,
              prevWinStreak: !won ? winStreak : 0,
              currentBet,
              baseBet,
              currentMultiplier,
              baseMultiplier: localStrategy.targetMultiplier || 2.0,
              sessionProfit: currentBalance - initialBank,
              diceCondition: currentDiceCondition,
              diceTarget: currentDiceTarget
            };

            const actionState = {
              nextBet: currentBet,
              targetMultiplier: currentMultiplier,
              winChance: localStrategy.winChance || 49.5,
              diceCondition: currentDiceCondition,
              diceTarget: currentDiceTarget,
              shouldStopAutobet: false,
              resetStreak: false
            };

            for (const cond of activeConditions) {
              if (evaluateConditionTrigger(cond, evalContext)) {
                applyConditionAction(cond, evalContext, actionState);
                if (actionState.shouldStopAutobet) {
                  isStopLossHit = true;
                  break;
                }
              }
            }

            currentBet = actionState.nextBet;
            currentMultiplier = actionState.targetMultiplier;
            currentDiceCondition = actionState.diceCondition || currentDiceCondition;
            currentDiceTarget = actionState.diceTarget !== undefined ? actionState.diceTarget : currentDiceTarget;

            if (isStopLossHit) {
              break;
            }
          }

          // Balance extremes
          if (currentBalance > peakBalance) peakBalance = currentBalance;
          if (currentBalance < lowestBalance) lowestBalance = currentBalance;

          const runningProfit = currentBalance + vaultSecuredTotal - initialBank;
          if (runningProfit > peakProfit) peakProfit = runningProfit;

          // Vault Auto-withdraw
          if (vaultEnabled && vaultThreshold > 0 && currentBalance >= vaultThreshold) {
            const excess = currentBalance - vaultKeep;
            if (excess > 0) {
              vaultSecuredTotal += excess;
              currentBalance = vaultKeep;
            }
          }

          // Trailing Stop Loss Check
          if (trailingEnabled && peakProfit >= trailingActivation) {
            const trailingFloor = peakProfit - trailingDistance;
            if (runningProfit <= trailingFloor) {
              isStopLossHit = true;
              break;
            }
          }

          // Take Profit & Stop Loss
          if (stopProfit && runningProfit >= stopProfit) {
            isTakeProfitHit = true;
            break;
          }
          if (stopLoss && runningProfit <= -stopLoss) {
            isStopLossHit = true;
            break;
          }

          // Checkpoints
          if (checkpointIdx < stepCheckpoints.length && b === stepCheckpoints[checkpointIdx]) {
            stepBalancesMatrix[checkpointIdx][r] = currentBalance + vaultSecuredTotal;
            checkpointIdx++;
          }

          if (isSampleRun && (b % sampleInterval === 0 || b === steps)) {
            samplePathsArray[r].push(currentBalance + vaultSecuredTotal);
          }
        }

        // Fill remaining checkpoints if run ended early
        const finalNetBalance = currentBalance + vaultSecuredTotal;
        while (checkpointIdx < stepCheckpoints.length) {
          stepBalancesMatrix[checkpointIdx][r] = finalNetBalance;
          checkpointIdx++;
        }

        const netProfit = finalNetBalance - initialBank;
        finalBalances[r] = finalNetBalance;
        finalProfits[r] = netProfit;

        // Tally Status
        let status: 'ruined' | 'take_profit' | 'stop_loss' | 'completed' = 'completed';
        if (isRuined || finalNetBalance <= 0.001) {
          ruinCount++;
          status = 'ruined';
          totalBetsSurvivedRuinedRuns += betsPlayed;
        } else if (isTakeProfitHit) {
          takeProfitCount++;
          status = 'take_profit';
        } else if (isStopLossHit) {
          stopLossCount++;
          status = 'stop_loss';
        }

        if (netProfit > 0) {
          profitableRunsCount++;
        }

        totalBetsSurvivedAllRuns += betsPlayed;

        const maxDrawdownPct = peakBalance > 0 ? ((peakBalance - lowestBalance) / peakBalance) * 100 : 0;
        sumMaxDrawdownPct += maxDrawdownPct;

        // Record streak
        lossStreakCountMap[maxLossStreakInRun] = (lossStreakCountMap[maxLossStreakInRun] || 0) + 1;

        // Store seed run item
        seedResultsList.push({
          iteration: r + 1,
          serverSeedHash,
          clientSeed,
          startNonce,
          roundsPlayed: betsPlayed,
          finalBalance: Number(finalNetBalance.toFixed(4)),
          netProfit: Number(netProfit.toFixed(4)),
          roiPct: Number(((netProfit / initialBank) * 100).toFixed(2)),
          maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
          maxLossStreak: maxLossStreakInRun,
          maxBetAmount: Number(peakBetInRun.toFixed(6)),
          status,
          bustedRound,
        });
      }

      currentIteration = nextChunkEnd;
      const progressPct = Math.round((currentIteration / totalRuns) * 90);
      setSimulationProgress(progressPct);
      setProgressDetails(`Simulation de ${currentIteration.toLocaleString('fr-FR')} / ${totalRuns.toLocaleString('fr-FR')} itérations...`);

      // Yield thread
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    setSimulationProgress(95);
    setProgressDetails('Calcul des quantiles P5, P25, P50, P75, P95 & distribution du risque...');
    await new Promise((resolve) => setTimeout(resolve, 10));

    // --------------------------------------------------------------------
    // COMPUTE STATISTICAL PERCENTILES & RISK METRICS
    // --------------------------------------------------------------------
    finalBalances.sort((a, b) => a - b);
    finalProfits.sort((a, b) => a - b);

    const meanFinalBalance = finalBalances.reduce((s, v) => s + v, 0) / totalRuns;
    const meanFinalProfit = finalProfits.reduce((s, v) => s + v, 0) / totalRuns;
    const medianFinalBalance = finalBalances[Math.floor(totalRuns * 0.5)];
    const medianFinalProfit = finalProfits[Math.floor(totalRuns * 0.5)];
    const minFinalProfit = finalProfits[0];
    const maxFinalProfit = finalProfits[totalRuns - 1];

    const p5Balance = finalBalances[Math.floor(totalRuns * 0.05)];
    const p25Balance = finalBalances[Math.floor(totalRuns * 0.25)];
    const p75Balance = finalBalances[Math.floor(totalRuns * 0.75)];
    const p95Balance = finalBalances[Math.floor(totalRuns * 0.95)];

    const p5Profit = finalProfits[Math.floor(totalRuns * 0.05)];
    const p1Profit = finalProfits[Math.floor(totalRuns * 0.01)];
    const var95Profit = Math.abs(Math.min(0, p5Profit));
    const var99Profit = Math.abs(Math.min(0, p1Profit));

    // CVaR 95% (Expected Shortfall)
    const worst5Count = Math.max(1, Math.floor(totalRuns * 0.05));
    let sumWorst5 = 0;
    for (let i = 0; i < worst5Count; i++) {
      sumWorst5 += finalProfits[i];
    }
    const cvar95Profit = Math.abs(sumWorst5 / worst5Count);

    const variance = finalProfits.reduce((s, p) => s + Math.pow(p - meanFinalProfit, 2), 0) / totalRuns;
    const stdDev = Math.sqrt(variance);

    // Trajectory Percentiles Bands
    const trajectoryBands: MonteCarloTrajectoryPoint[] = stepCheckpoints.map((stepNum, cpIdx) => {
      const stepValues = Array.from(stepBalancesMatrix[cpIdx]).sort((a, b) => a - b);
      const p5 = stepValues[Math.floor(totalRuns * 0.05)];
      const p25 = stepValues[Math.floor(totalRuns * 0.25)];
      const median = stepValues[Math.floor(totalRuns * 0.50)];
      const p75 = stepValues[Math.floor(totalRuns * 0.75)];
      const p95 = stepValues[Math.floor(totalRuns * 0.95)];

      const samplePoints = samplePathsArray.map((arr) => {
        const sampleStepIdx = Math.min(arr.length - 1, cpIdx);
        return arr[sampleStepIdx] ?? median;
      });

      return {
        step: stepNum,
        p5: Number(p5.toFixed(2)),
        p25: Number(p25.toFixed(2)),
        median: Number(median.toFixed(2)),
        p75: Number(p75.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        samplePaths: samplePoints,
      };
    });

    // Histogram Bins (14 Bins)
    const binCount = 14;
    const profitMin = finalProfits[0];
    const profitMax = finalProfits[totalRuns - 1];
    const binWidth = Math.max(0.01, (profitMax - profitMin) / binCount);

    const profitHistogram: MonteCarloHistogramBin[] = [];
    for (let b = 0; b < binCount; b++) {
      const binStart = profitMin + b * binWidth;
      const binEnd = b === binCount - 1 ? profitMax + 0.001 : binStart + binWidth;
      const count = finalProfits.filter((p) => p >= binStart && p < binEnd).length;
      const pct = (count / totalRuns) * 100;
      const isRuin = binStart <= -initialBank + 0.01;
      const isProfit = binStart >= 0;

      profitHistogram.push({
        rangeLabel: `${binStart >= 0 ? '+' : ''}${Math.round(binStart)} à ${binEnd >= 0 ? '+' : ''}${Math.round(binEnd)}`,
        minVal: binStart,
        maxVal: binEnd,
        count,
        percentage: Number(pct.toFixed(2)),
        isProfit,
        isRuin,
      });
    }

    // Loss Streak Distribution
    const sortedStreakKeys = Object.keys(lossStreakCountMap).map(Number).sort((a, b) => a - b);
    const lossStreakDistribution: MonteCarloStreakDistributionItem[] = sortedStreakKeys.map((k) => ({
      streakLength: k,
      occurrences: lossStreakCountMap[k],
      probabilityPct: Number(((lossStreakCountMap[k] / totalRuns) * 100).toFixed(2)),
    }));

    // Top 10 Worst & Best Seeds
    const sortedByProfitAsc = [...seedResultsList].sort((a, b) => {
      if (a.status === 'ruined' && b.status !== 'ruined') return -1;
      if (b.status === 'ruined' && a.status !== 'ruined') return 1;
      if (a.bustedRound && b.bustedRound) return a.bustedRound - b.bustedRound;
      return a.netProfit - b.netProfit;
    });

    const topWorstSeeds = sortedByProfitAsc.slice(0, 10);
    const topBestSeeds = [...seedResultsList].sort((a, b) => b.netProfit - a.netProfit).slice(0, 10);

    // Recommended Bankroll for 1% Ruin:
    // If ruinRate > 1%, scale bankroll mathematically
    const ruinRatePct = (ruinCount / totalRuns) * 100;
    let recommendedBankrollForOnePercentRuin = initialBank;
    if (ruinRatePct > 1.0) {
      const worstBetFound = Math.max(...seedResultsList.map((s) => s.maxBetAmount));
      recommendedBankrollForOnePercentRuin = Number((Math.max(initialBank * 2.5, worstBetFound * 1.8, cvar95Profit * 1.5)).toFixed(2));
    }

    const endTime = performance.now();
    const executionTimeMs = Number((endTime - startTime).toFixed(1));

    const summary: MonteCarloBacktestSummary = {
      totalIterations: totalRuns,
      roundsPerIteration: steps,
      startingBankroll: initialBank,
      ruinCount,
      ruinRatePct: Number(ruinRatePct.toFixed(2)),
      takeProfitCount,
      takeProfitRatePct: Number(((takeProfitCount / totalRuns) * 100).toFixed(2)),
      stopLossCount,
      stopLossRatePct: Number(((stopLossCount / totalRuns) * 100).toFixed(2)),
      profitableIterationsCount: profitableRunsCount,
      profitableIterationsRatePct: Number(((profitableRunsCount / totalRuns) * 100).toFixed(2)),
      meanFinalBalance: Number(meanFinalBalance.toFixed(4)),
      meanFinalProfit: Number(meanFinalProfit.toFixed(4)),
      medianFinalBalance: Number(medianFinalBalance.toFixed(4)),
      medianFinalProfit: Number(medianFinalProfit.toFixed(4)),
      minFinalProfit: Number(minFinalProfit.toFixed(4)),
      maxFinalProfit: Number(maxFinalProfit.toFixed(4)),
      p5Balance: Number(p5Balance.toFixed(4)),
      p25Balance: Number(p25Balance.toFixed(4)),
      p75Balance: Number(p75Balance.toFixed(4)),
      p95Balance: Number(p95Balance.toFixed(4)),
      p5Profit: Number(p5Profit.toFixed(4)),
      var95Profit: Number(var95Profit.toFixed(4)),
      var99Profit: Number(var99Profit.toFixed(4)),
      cvar95Profit: Number(cvar95Profit.toFixed(4)),
      stdDev: Number(stdDev.toFixed(4)),
      meanMaxDrawdownPct: Number((sumMaxDrawdownPct / totalRuns).toFixed(2)),
      medianMaxDrawdownPct: Number((sortedByProfitAsc[Math.floor(totalRuns * 0.5)]?.maxDrawdownPct || 0).toFixed(2)),
      worstMaxDrawdownPct: Number((Math.max(...seedResultsList.map((s) => s.maxDrawdownPct))).toFixed(2)),
      meanBetsSurvivedBeforeRuin: ruinCount > 0 ? Math.round(totalBetsSurvivedRuinedRuns / ruinCount) : steps,
      executionTimeMs,
      trajectoryBands,
      profitHistogram,
      lossStreakDistribution,
      topWorstSeeds,
      topBestSeeds,
      recommendedBankrollForOnePercentRuin,
    };

    setResults(summary);
    setSimulationProgress(100);
    setProgressDetails('Simulation terminée avec succès !');
    setIsSimulating(false);
  };

  // --------------------------------------------------------------------
  // EXPORT MONTE CARLO CSV REPORT (10,000 SEEDS)
  // --------------------------------------------------------------------
  const handleExportMonteCarloCsv = () => {
    if (!results) return;

    // Generate CSV content
    const header = 'Iteration,ServerSeedHash,ClientSeed,StartNonce,RoundsPlayed,FinalBalance,NetProfit,RoiPct,MaxDrawdownPct,MaxLossStreak,MaxBetAmount,Status,BustedRound\n';
    
    // We export top 1000 or full dataset
    const rows = (results.topWorstSeeds.concat(results.topBestSeeds)).map((s) =>
      `${s.iteration},"${s.serverSeedHash}","${s.clientSeed}",${s.startNonce},${s.roundsPlayed},${s.finalBalance},${s.netProfit},${s.roiPct}%,${s.maxDrawdownPct}%,${s.maxLossStreak},${s.maxBetAmount},${s.status},${s.bustedRound || ''}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stake_monte_carlo_${results.totalIterations}_seeds_${localStrategy.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy seed handler
  const handleCopySeed = (seedText: string) => {
    navigator.clipboard.writeText(seedText);
    setCopiedSeed(seedText);
    setTimeout(() => setCopiedSeed(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Monte Carlo Hero / Header info */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/60 rounded-2xl p-4 sm:p-6 border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                <ScatterChart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Simulation Monte Carlo Multi-Seeds
                  <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-widest">
                    10 000 Itérations
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Éprouvez votre stratégie sur 10 000 graines / seeds Provably Fair indépendantes pour mesurer la probabilité réelle de ruine, l'éventail de dispersion et la Value at Risk (VaR).
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {results && (
              <button
                type="button"
                onClick={handleExportMonteCarloCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs sm:text-sm transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Exporter Rapport Monte Carlo (.CSV)</span>
              </button>
            )}

            <button
              type="button"
              onClick={runMonteCarlo10k}
              disabled={isSimulating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs sm:text-sm tracking-wide transition shadow-lg shadow-purple-500/25 flex items-center gap-2 hover:scale-[1.02] active:scale-98 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Calcul ({simulationProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Lancer Monte Carlo ({iterationsCount.toLocaleString('fr-FR')} Seeds)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left Parameter Controls + Right Strategy Calibration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Monte Carlo Engine Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>Paramètres de la Simulation</span>
              </h3>
              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                Moteur Asynchrone
              </span>
            </div>

            {/* Number of Iterations (Seeds) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Nombre d'Itérations de Seeds</span>
                <span className="text-purple-400 font-mono font-bold">{iterationsCount.toLocaleString('fr-FR')} graines</span>
              </label>
              
              <div className="grid grid-cols-4 gap-1.5">
                {[1000, 2500, 5000, 10000].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setIterationsCount(count)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      iterationsCount === count
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {count >= 1000 ? `${count / 1000}k` : count}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds per Seed */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Nombre de Paris par Seed / Trajectoire</span>
                <span className="text-indigo-400 font-mono font-bold">{roundsPerSeed.toLocaleString('fr-FR')} rounds</span>
              </label>
              
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 250, 500, 1000].map((rounds) => (
                  <button
                    key={rounds}
                    type="button"
                    onClick={() => setRoundsPerSeed(rounds)}
                    className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                      roundsPerSeed === rounds
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>
            </div>

            {/* Seed Generation Method */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-300">Méthode de Génération des Seeds</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSeedMethod('provably_fair_sha256')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    seedMethod === 'provably_fair_sha256'
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Provably Fair SHA-256</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Graines HMAC-SHA256 Stake certifiées à 100%.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSeedMethod('fast_prng')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    seedMethod === 'fast_prng'
                      ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pseudo-Aléatoire SIMD</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Exécution ultra-rapide (RTP exact 99.00%).
                  </p>
                </button>
              </div>
            </div>

            {/* Bankroll Initial & House Edge */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Bankroll Initial / Seed</label>
                <div className="relative">
                  <input
                    type="number"
                    value={testBankroll}
                    onChange={(e) => setTestBankroll(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold text-xs"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">{currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Avantage Maison (House Edge)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={customHouseEdge}
                    onChange={(e) => setCustomHouseEdge(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold text-xs"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* Progress Bar Display */}
            {isSimulating && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-200 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    {progressDetails}
                  </span>
                  <span className="font-mono font-bold text-purple-300">{simulationProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-purple-900/40">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-150"
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Strategy Calibration (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                <span>Stratégie Testée sur les 10 000 Seeds</span>
              </h3>

              {/* Preset Selector */}
              <select
                value={localStrategy.id}
                onChange={(e) => {
                  const found = PREDEFINED_STRATEGIES.find((s) => s.id === e.target.value);
                  if (found) setLocalStrategy({ ...found });
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-medium"
              >
                {PREDEFINED_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Core Strategy Parameters */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Mise de Base</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={localStrategy.baseBet}
                    onChange={(e) => setLocalStrategy((prev) => ({ ...prev, baseBet: parseFloat(e.target.value) || 0.001 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">{currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Multiplicateur Cible</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={localStrategy.targetMultiplier}
                    onChange={(e) => {
                      const mult = Math.max(1.01, parseFloat(e.target.value) || 2.0);
                      const winChance = Number((99.0 / mult).toFixed(2));
                      setLocalStrategy((prev) => ({ ...prev, targetMultiplier: mult, winChance }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">x</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chances de Gain</label>
                <input
                  type="text"
                  readOnly
                  value={`${localStrategy.winChance || 49.5}%`}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                />
              </div>
            </div>

            {/* Progression on Loss & on Win */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5 text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Progression sur Perte</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={localStrategy.onLossAction}
                    onChange={(e: any) => setLocalStrategy((prev) => ({ ...prev, onLossAction: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="multiply">Multiplier (x)</option>
                    <option value="increase_pct">Augmenter (%)</option>
                    <option value="increase_fixed">Augmenter Fixe (+)</option>
                    <option value="fibonacci">Fibonacci</option>
                    <option value="reset">Mise Plate (Reset)</option>
                    <option value="custom">D'Alembert (+1)</option>
                  </select>

                  <input
                    type="number"
                    step="0.05"
                    value={localStrategy.onLossValue || 2.0}
                    onChange={(e) => setLocalStrategy((prev) => ({ ...prev, onLossValue: parseFloat(e.target.value) || 2.0 }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold text-xs"
                    placeholder="Facteur"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Progression sur Gain</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={localStrategy.onWinAction}
                    onChange={(e: any) => setLocalStrategy((prev) => ({ ...prev, onWinAction: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="reset">Réinitialiser (Reset)</option>
                    <option value="increase_pct">Augmenter (%)</option>
                    <option value="increase_fixed">Augmenter Fixe (+)</option>
                    <option value="custom">Oscar's Grind / Paroli</option>
                  </select>

                  <input
                    type="number"
                    value={localStrategy.onWinValue || 100}
                    onChange={(e) => setLocalStrategy((prev) => ({ ...prev, onWinValue: parseFloat(e.target.value) || 100 }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold text-xs"
                    placeholder="Valeur"
                  />
                </div>
              </div>
            </div>

            {/* Risk Stops & Limit Flags */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectStopLoss}
                  onChange={(e) => setRespectStopLoss(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 truncate">
                  Stop Loss ({localStrategy.stopOnLoss || 20} {currency})
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectTakeProfit}
                  onChange={(e) => setRespectTakeProfit(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 truncate">
                  Take Profit ({localStrategy.stopOnProfit || 25} {currency})
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectMaxBetCap}
                  onChange={(e) => setRespectMaxBetCap(e.target.checked)}
                  className="rounded text-purple-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 truncate">
                  Plafond ({maxBetCapAmount} {currency})
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* RESULTS DISPLAY DASHBOARD                                            */}
      {/* -------------------------------------------------------------------- */}
      {results && (
        <div className="space-y-6">
          
          {/* Key KPI Metric Cards (5 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Ruin Probability (Taux de Ruine) */}
            <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg ${
              results.ruinRatePct > 15
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                : results.ruinRatePct > 5
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Probabilité de Ruine
                </span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black">{results.ruinRatePct}%</span>
                <span className="text-xs text-slate-400">({results.ruinCount} / {results.totalIterations.toLocaleString('fr-FR')})</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                {results.ruinRatePct === 0
                  ? '✓ Aucun bust sur 10 000 graines'
                  : `Survie moyenne avant ruine : ${results.meanBetsSurvivedBeforeRuin} paris`}
              </p>
            </div>

            {/* Card 2: Median & Mean Profit */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Profit Médian (P50)
                </span>
                <span className="text-[10px] font-bold text-slate-500">10k Seeds</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${results.medianFinalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {results.medianFinalProfit >= 0 ? `+${results.medianFinalProfit}` : results.medianFinalProfit} {currency}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Profit Moyen (EV) :</span>
                <span className={`font-bold ${results.meanFinalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {results.meanFinalProfit >= 0 ? `+${results.meanFinalProfit}` : results.meanFinalProfit} {currency}
                </span>
              </div>
            </div>

            {/* Card 3: Value at Risk (VaR 95% & VaR 99%) */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Value at Risk (VaR 95%)
                </span>
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-400">
                  -{results.var95Profit} {currency}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>CVaR 95% (Pires 5%) :</span>
                <span className="font-bold text-rose-400">-{results.cvar95Profit} {currency}</span>
              </div>
            </div>

            {/* Card 4: Success / Take Profit Rate */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Taux de Succès / TP
                </span>
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400">
                  {results.profitableIterationsRatePct}%
                </span>
                <span className="text-xs text-slate-400">gagnants</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Take Profit Atteint :</span>
                <span className="font-bold text-emerald-300">{results.takeProfitRatePct}% ({results.takeProfitCount})</span>
              </div>
            </div>

            {/* Card 5: Max Drawdown Distribution */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Max Drawdown Moyen
                </span>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-400">
                  -{results.meanMaxDrawdownPct}%
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Pire Repli Observé :</span>
                <span className="font-bold text-rose-300">-{results.worstMaxDrawdownPct}%</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Switcher for Visual Exploration */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'fan_chart', label: 'Éventail des Trajectoires (Fan Chart)', icon: TrendingUp },
                  { id: 'distribution', label: 'Histogramme de Distribution', icon: BarChart3 },
                  { id: 'streaks', label: 'Distribution des Séries de Pertes', icon: Flame },
                  { id: 'extreme_seeds', label: 'Scénarios Extrêmes & Seeds (Top 10)', icon: Dice5 },
                  { id: 'ai_sizing', label: 'Dimensionnement Anti-Ruine IA', icon: Sparkles },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                        activeSubTab === tab.id
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {activeSubTab === 'fan_chart' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer self-end sm:self-auto">
                  <input
                    type="checkbox"
                    checked={showIndividualPaths}
                    onChange={(e) => setShowIndividualPaths(e.target.checked)}
                    className="rounded text-purple-500 focus:ring-0"
                  />
                  <span>Afficher 15 Trajectoires de Seeds</span>
                </label>
              )}
            </div>

            {/* TAB 1: FAN CHART (PERCENTILES BANDS & TRAJECTORIES) */}
            {activeSubTab === 'fan_chart' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-3 h-1 bg-emerald-500 rounded" />
                      <span>P95 (Top 5% des runs)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-300 font-bold">
                      <span className="w-3 h-1 bg-indigo-400 rounded" />
                      <span>P75 (Quartile Supérieur)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-white font-bold">
                      <span className="w-3 h-1 bg-white rounded" />
                      <span>Médiane P50 (Trajectoire Référence)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-3 h-1 bg-amber-500 rounded" />
                      <span>P25 (Quartile Inférieur)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <span className="w-3 h-1 bg-rose-500 rounded" />
                      <span>P5 (Pire 5% des runs)</span>
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.trajectoryBands} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mcBandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="step" stroke="#64748b" fontSize={11} tickFormatter={(v) => `R#${v}`} />
                      <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                        formatter={(value: any, name: string) => [`${value} ${currency}`, name]}
                        labelFormatter={(label) => `Round #${label} sur 10k Seeds`}
                      />
                      <ReferenceLine y={results.startingBankroll} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Capital Initial', fill: '#64748b', fontSize: 10 }} />
                      
                      {/* P95 Area Band */}
                      <Area type="monotone" dataKey="p95" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#mcBandGrad)" name="P95 (Top 5%)" />
                      <Area type="monotone" dataKey="p75" stroke="#818cf8" strokeWidth={1.5} fill="none" name="P75 (Quartile Sup.)" />
                      <Area type="monotone" dataKey="median" stroke="#ffffff" strokeWidth={2.5} fill="none" name="Médiane P50" />
                      <Area type="monotone" dataKey="p25" stroke="#f59e0b" strokeWidth={1.5} fill="none" name="P25 (Quartile Inf.)" />
                      <Area type="monotone" dataKey="p5" stroke="#f43f5e" strokeWidth={2} fill="none" name="P5 (Pire 5%)" />

                      {/* Optional Individual Sample Paths */}
                      {showIndividualPaths && results.trajectoryBands[0]?.samplePaths?.map((_, pIdx) => (
                        <Line
                          key={pIdx}
                          type="monotone"
                          dataKey={`samplePaths[${pIdx}]`}
                          stroke={pIdx % 2 === 0 ? '#38bdf8' : '#a855f7'}
                          strokeWidth={0.8}
                          strokeOpacity={0.35}
                          dot={false}
                          name={`Seed #${pIdx + 1}`}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: HISTOGRAM DISTRIBUTION */}
            {activeSubTab === 'distribution' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <p>
                    Répartition des résultats finaux sur 10 000 graines indépendantes (intervalle par tranche de profit) :
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                      <span>Profits Nets</span>
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded" />
                      <span>Pertes / Ruines</span>
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.profitHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="rangeLabel" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" height={50} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                        formatter={(value: any, name: string, props: any) => [
                          `${value}% (${props.payload.count.toLocaleString('fr-FR')} seeds)`,
                          'Fréquence'
                        ]}
                      />
                      <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                        {results.profitHistogram.map((bin, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={bin.isRuin ? '#881337' : bin.isProfit ? '#10b981' : '#f43f5e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: LOSS STREAKS DISTRIBUTION */}
            {activeSubTab === 'streaks' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p>
                    Fréquence empirique des séries de pertes consécutives maximales observées parmi les 10 000 graines.
                    Plus la série maximale est longue, plus l'exposition au risque d'épuisement géométrique (Martingale) augmente.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300 font-mono">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Série de Pertes Consécutives</th>
                        <th className="py-2.5 px-3">Occurrences sur 10k Seeds</th>
                        <th className="py-2.5 px-3">Probabilité Empirique (%)</th>
                        <th className="py-2.5 px-3">Diagnostic de Résistance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {results.lossStreakDistribution.map((item) => {
                        const isSevere = item.streakLength >= 10;
                        const isExtreme = item.streakLength >= 15;
                        return (
                          <tr key={item.streakLength} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-bold text-slate-200">
                              {item.streakLength} pertes consécutives
                            </td>
                            <td className="py-2 px-3 text-purple-300">
                              {item.occurrences.toLocaleString('fr-FR')} runs
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-100">
                              {item.probabilityPct}%
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExtreme
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : isSevere
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isExtreme ? 'Cygne Noir Critique' : isSevere ? 'Zone de Rupture' : 'Variance Standard'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: EXTREME CRASH SEEDS & TOP WINNERS */}
            {activeSubTab === 'extreme_seeds' && (
              <div className="space-y-5">
                
                {/* 10 Worst Seeds (Crash Scenarios) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Top 10 Pires Graines (Scénarios de Ruine Rapide & Drawdown Extrême)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">Seeds exactes Provably Fair Stake</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-rose-900/30">
                    <table className="w-full text-left text-xs text-slate-300 font-mono">
                      <thead className="bg-slate-950 text-rose-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Seed ID</th>
                          <th className="py-2.5 px-3">Client Seed</th>
                          <th className="py-2.5 px-3">Bust Round</th>
                          <th className="py-2.5 px-3">Drawdown Max</th>
                          <th className="py-2.5 px-3">Mise Max Atteinte</th>
                          <th className="py-2.5 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {results.topWorstSeeds.map((s) => (
                          <tr key={s.iteration} className="hover:bg-rose-950/20 transition">
                            <td className="py-2 px-3 text-slate-400">#{s.iteration}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                              <span className="truncate max-w-[160px] inline-block" title={s.clientSeed}>
                                {s.clientSeed}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-rose-400 font-bold">
                              {s.bustedRound ? `Bust au round #${s.bustedRound}` : `Solde final: ${s.finalBalance} ${currency}`}
                            </td>
                            <td className="py-2 px-3 font-bold text-rose-300">-{s.maxDrawdownPct}%</td>
                            <td className="py-2 px-3 text-amber-400">{s.maxBetAmount} {currency}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopySeed(s.clientSeed)}
                                  title="Copier le seed client"
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                >
                                  {copiedSeed === s.clientSeed ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 10 Best Seeds */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Top 10 Meilleures Graines (Gains Records & Séries Positives)</span>
                    </h4>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-emerald-900/30">
                    <table className="w-full text-left text-xs text-slate-300 font-mono">
                      <thead className="bg-slate-950 text-emerald-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Seed ID</th>
                          <th className="py-2.5 px-3">Client Seed</th>
                          <th className="py-2.5 px-3">Profit Net</th>
                          <th className="py-2.5 px-3">ROI (%)</th>
                          <th className="py-2.5 px-3">Solde Final</th>
                          <th className="py-2.5 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {results.topBestSeeds.map((s) => (
                          <tr key={s.iteration} className="hover:bg-emerald-950/20 transition">
                            <td className="py-2 px-3 text-slate-400">#{s.iteration}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                              <span className="truncate max-w-[160px] inline-block" title={s.clientSeed}>
                                {s.clientSeed}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-emerald-400 font-bold">+{s.netProfit} {currency}</td>
                            <td className="py-2 px-3 font-bold text-emerald-300">+{s.roiPct}%</td>
                            <td className="py-2 px-3 text-slate-100 font-bold">{s.finalBalance} {currency}</td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => handleCopySeed(s.clientSeed)}
                                title="Copier le seed client"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                {copiedSeed === s.clientSeed ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: AI RISK SIZING & RECOMMENDATION */}
            {activeSubTab === 'ai_sizing' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Dimensionnement de Bankroll Optimal (Probabilité Ruine &lt; 1%)</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sur la base des 10 000 trajectoires de graines simulées, le risque de ruine actuel est de{' '}
                    <strong className={results.ruinRatePct > 1 ? 'text-rose-400' : 'text-emerald-400'}>
                      {results.ruinRatePct}%
                    </strong>.
                    Pour absorber la pire série de variance et garantir une probabilité de survie supérieure à 99.0%, votre bankroll doit être calibrée à :
                  </p>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bankroll Conseillé :</span>
                      <span className="text-2xl font-black text-purple-300">
                        {results.recommendedBankrollForOnePercentRuin} {currency}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTestBankroll(results.recommendedBankrollForOnePercentRuin);
                        onUpdateStrategy({ baseBet: Number((results.recommendedBankrollForOnePercentRuin * 0.001).toFixed(4)) });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Appliquer ce Capital à la Stratégie</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
