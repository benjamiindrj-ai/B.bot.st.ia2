import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Target 
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
import { BettingStrategy, StakeGameType } from '../types';

export interface MonteCarloSimulationToolProps {
  strategy: BettingStrategy;
  currency: string;
  initialBankroll?: number;
  onApplyStrategyParams?: (params: Partial<BettingStrategy>) => void;
}

interface TrajectoryPoint {
  step: number;
  p5: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  samplePaths: number[];
}

interface HistogramBin {
  rangeLabel: string;
  minVal: number;
  maxVal: number;
  count: number;
  percentage: number;
  isProfit: boolean;
  isRuin: boolean;
}

interface MonteCarloResults {
  totalRuns: number;
  betsPerRun: number;
  startingBankroll: number;
  ruinCount: number;
  ruinRatePct: number;
  takeProfitCount: number;
  takeProfitRatePct: number;
  stopLossCount: number;
  stopLossRatePct: number;
  profitableRunsCount: number;
  profitableRunsRatePct: number;
  finalBalances: number[];
  finalProfits: number[];
  meanFinalBalance: number;
  meanFinalProfit: number;
  medianFinalBalance: number;
  medianFinalProfit: number;
  minFinalBalance: number;
  maxFinalBalance: number;
  p5Balance: number;
  p25Balance: number;
  p75Balance: number;
  p95Balance: number;
  stdDev: number;
  var95Profit: number; // Value at Risk 95%
  cvar95Profit: number; // Conditional Value at Risk (Expected Shortfall)
  meanBetsSurvived: number;
  meanMaxDrawdownPct: number;
  trajectoryBands: TrajectoryPoint[];
  histogramData: HistogramBin[];
  simulationDurationMs: number;
  samplePathCount: number;
}

// Default house edges for Stake games
const GAME_HOUSE_EDGES: Record<string, number> = {
  dice: 0.01,
  limbo: 0.01,
  mines: 0.01,
  plinko: 0.01,
  keno: 0.01,
  hilo: 0.01,
  roulette: 0.027,
  wheel: 0.01,
  blackjack: 0.005,
  crash: 0.01,
  sports: 0.035,
};

export const MonteCarloSimulationTool: React.FC<MonteCarloSimulationToolProps> = ({
  strategy,
  currency,
  initialBankroll = 100,
  onApplyStrategyParams,
}) => {
  // Configuration States
  const [numSimulations, setNumSimulations] = useState<number>(10000);
  const [betsPerSession, setBetsPerSession] = useState<number>(250);
  const [bankroll, setBankroll] = useState<number>(initialBankroll > 0 ? initialBankroll : 100);
  const [customHouseEdge, setCustomHouseEdge] = useState<number>(
    (GAME_HOUSE_EDGES[strategy.game] ?? 0.01) * 100
  );
  const [activeViewTab, setActiveViewTab] = useState<'fan_chart' | 'distribution' | 'risk_matrix'>('fan_chart');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);
  const [results, setResults] = useState<MonteCarloResults | null>(null);

  // Sync bankroll if external initialBankroll changes and hasn't been modified
  useEffect(() => {
    if (initialBankroll > 0 && Math.abs(bankroll - initialBankroll) > 0.01 && !results) {
      setBankroll(initialBankroll);
    }
  }, [initialBankroll]);

  // Fast Deterministic / Pseudo-Random Monte Carlo Engine
  const runMonteCarloEngine = useCallback(() => {
    setIsSimulating(true);

    // Run in requestAnimationFrame or microtask to avoid freezing UI
    setTimeout(() => {
      const startTime = performance.now();

      const totalRuns = numSimulations;
      const steps = betsPerSession;
      const startBank = Math.max(1, bankroll);
      const baseBet = Math.max(0.00000001, strategy.baseBet || 1.0);
      const mult = Math.max(1.01, strategy.targetMultiplier || 2.0);
      const houseEdgeFrac = Math.max(0.0001, customHouseEdge / 100);

      // Win probability for this game: (1 - houseEdge) / Multiplier
      const winProbability = Math.max(0.0001, Math.min(0.9999, (1 - houseEdgeFrac) / mult));

      // Stop Conditions
      const stopProfit = strategy.stopOnProfit && strategy.stopOnProfit > 0 ? strategy.stopOnProfit : null;
      const stopLoss = strategy.stopOnLoss && strategy.stopOnLoss > 0 ? strategy.stopOnLoss : null;
      const maxBetCap = strategy.maxBetLimit && strategy.maxBetLimit > 0 ? strategy.maxBetLimit : null;

      // Trailing stop loss config
      const trailingEnabled = strategy.trailingStopLoss?.enabled;
      const trailingActivation = strategy.trailingStopLoss?.activationProfit || 0;
      const trailingDistance = strategy.trailingStopLoss?.trailDistance || 0;

      // Vault Auto-Withdraw config
      const vaultEnabled = strategy.autoVaultWithdraw?.enabled;
      const vaultThreshold = strategy.autoVaultWithdraw?.threshold || 0;
      const vaultKeep = strategy.autoVaultWithdraw?.keepBalance ?? vaultThreshold;

      // Tracking variables
      let ruinCount = 0;
      let takeProfitCount = 0;
      let stopLossCount = 0;
      let profitableRunsCount = 0;
      let totalBetsSurvived = 0;
      let sumMaxDrawdownPct = 0;

      const finalBalances: number[] = new Array(totalRuns);
      const finalProfits: number[] = new Array(totalRuns);

      // We will record sampled trajectory points along the step path
      // Sampling 20-30 discrete step intervals for percentile lines
      const sampleInterval = Math.max(1, Math.floor(steps / 25));
      const stepCheckpoints: number[] = [];
      for (let s = 0; s <= steps; s += sampleInterval) {
        stepCheckpoints.push(s);
      }
      if (stepCheckpoints[stepCheckpoints.length - 1] !== steps) {
        stepCheckpoints.push(steps);
      }

      // Matrix to store balances at step checkpoints across runs for quantile calculation
      // stepCheckpoints.length rows x totalRuns columns
      const stepBalancesMatrix: Float64Array[] = stepCheckpoints.map(
        () => new Float64Array(totalRuns)
      );

      // Save raw trajectory for up to 12 sample representative paths
      const SAMPLE_PATH_LIMIT = 12;
      const samplePathsArray: number[][] = Array.from({ length: SAMPLE_PATH_LIMIT }, () => []);

      // Execute 10,000 Runs
      for (let r = 0; r < totalRuns; r++) {
        let currentBalance = startBank;
        let currentBet = baseBet;
        let peakBalance = startBank;
        let lowestBalance = startBank;
        let lossStreak = 0;
        let winStreak = 0;
        let peakProfit = 0;
        let isRuined = false;
        let isTakeProfitHit = false;
        let isStopLossHit = false;
        let betsPlayed = 0;
        let vaultSecuredTotal = 0;

        // Track checkpoints indices
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

          // Check if can afford bet
          if (currentBalance <= 0.000001 || currentBalance < currentBet) {
            isRuined = true;
            currentBalance = 0;
            break;
          }

          // Cap bet if maxBetCap is defined
          let betAmountToPlace = currentBet;
          if (maxBetCap && betAmountToPlace > maxBetCap) {
            betAmountToPlace = maxBetCap;
          }
          if (betAmountToPlace > currentBalance) {
            betAmountToPlace = currentBalance;
          }

          // Generate outcome
          const outcomeRand = Math.random();
          const won = outcomeRand < winProbability;

          if (won) {
            const wonAmount = betAmountToPlace * (mult - 1);
            currentBalance += wonAmount;
            winStreak++;
            lossStreak = 0;

            // Handle On Win Action
            if (strategy.onWinAction === 'reset') {
              currentBet = baseBet;
            } else if (strategy.onWinAction === 'increase_pct') {
              const pct = (strategy.onWinValue || 100) / 100;
              currentBet = currentBet * (1 + pct);
            } else if (strategy.onWinAction === 'increase_fixed') {
              currentBet = currentBet + (strategy.onWinValue || baseBet);
            }
          } else {
            currentBalance -= betAmountToPlace;
            lossStreak++;
            winStreak = 0;

            // Handle On Loss Action
            if (strategy.onLossAction === 'multiply') {
              const mul = strategy.onLossValue || 2.0;
              currentBet = currentBet * mul;
            } else if (strategy.onLossAction === 'increase_pct') {
              const pct = (strategy.onLossValue || 100) / 100;
              currentBet = currentBet * (1 + pct);
            } else if (strategy.onLossAction === 'increase_fixed') {
              currentBet = currentBet + (strategy.onLossValue || baseBet);
            } else if (strategy.onLossAction === 'reset') {
              currentBet = baseBet;
            }
          }

          // Update Peaks & Drawdown tracking
          if (currentBalance > peakBalance) {
            peakBalance = currentBalance;
          }
          if (currentBalance < lowestBalance) {
            lowestBalance = currentBalance;
          }

          const runningProfit = currentBalance + vaultSecuredTotal - startBank;
          if (runningProfit > peakProfit) {
            peakProfit = runningProfit;
          }

          // Stake Vault Auto-Withdraw Check
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

          // Hard Take Profit Check
          if (stopProfit && runningProfit >= stopProfit) {
            isTakeProfitHit = true;
            break;
          }

          // Hard Stop Loss Check
          if (stopLoss && runningProfit <= -stopLoss) {
            isStopLossHit = true;
            break;
          }

          // Checkpoint record
          if (checkpointIdx < stepCheckpoints.length && b === stepCheckpoints[checkpointIdx]) {
            stepBalancesMatrix[checkpointIdx][r] = currentBalance + vaultSecuredTotal;
            checkpointIdx++;
          }

          if (isSampleRun && (b % sampleInterval === 0 || b === steps)) {
            samplePathsArray[r].push(currentBalance + vaultSecuredTotal);
          }
        }

        // Fill remaining checkpoints if run ended early (ruin, TP, SL)
        const finalNetBalance = currentBalance + vaultSecuredTotal;
        while (checkpointIdx < stepCheckpoints.length) {
          stepBalancesMatrix[checkpointIdx][r] = finalNetBalance;
          checkpointIdx++;
        }

        const netProfit = finalNetBalance - startBank;
        finalBalances[r] = finalNetBalance;
        finalProfits[r] = netProfit;

        if (isRuined || finalNetBalance <= 0.001) {
          ruinCount++;
        }
        if (isTakeProfitHit) {
          takeProfitCount++;
        }
        if (isStopLossHit) {
          stopLossCount++;
        }
        if (netProfit > 0) {
          profitableRunsCount++;
        }

        totalBetsSurvived += betsPlayed;

        // Max Drawdown calculation for this run
        const maxDdPct = peakBalance > 0 ? ((peakBalance - lowestBalance) / peakBalance) * 100 : 0;
        sumMaxDrawdownPct += maxDdPct;
      }

      // Statistical Percentile Computations
      finalBalances.sort((a, b) => a - b);
      finalProfits.sort((a, b) => a - b);

      const meanFinalBalance = finalBalances.reduce((sum, v) => sum + v, 0) / totalRuns;
      const meanFinalProfit = finalProfits.reduce((sum, v) => sum + v, 0) / totalRuns;
      const medianFinalBalance = finalBalances[Math.floor(totalRuns * 0.5)];
      const medianFinalProfit = finalProfits[Math.floor(totalRuns * 0.5)];

      const minFinalBalance = finalBalances[0];
      const maxFinalBalance = finalBalances[totalRuns - 1];

      const p5Balance = finalBalances[Math.floor(totalRuns * 0.05)];
      const p25Balance = finalBalances[Math.floor(totalRuns * 0.25)];
      const p75Balance = finalBalances[Math.floor(totalRuns * 0.75)];
      const p95Balance = finalBalances[Math.floor(totalRuns * 0.95)];

      const p5Profit = finalProfits[Math.floor(totalRuns * 0.05)];
      const var95Profit = Math.abs(Math.min(0, p5Profit));

      // CVaR (Expected Shortfall in worst 5% cases)
      const worst5Count = Math.max(1, Math.floor(totalRuns * 0.05));
      let sumWorst5 = 0;
      for (let i = 0; i < worst5Count; i++) {
        sumWorst5 += finalProfits[i];
      }
      const cvar95Profit = Math.abs(sumWorst5 / worst5Count);

      // Variance & StdDev
      const variance = finalProfits.reduce((sum, p) => sum + Math.pow(p - meanFinalProfit, 2), 0) / totalRuns;
      const stdDev = Math.sqrt(variance);

      // Trajectory Percentiles Fan Bands Construction
      const trajectoryBands: TrajectoryPoint[] = stepCheckpoints.map((stepNum, cpIdx) => {
        const stepValues = Array.from(stepBalancesMatrix[cpIdx]).sort((a, b) => a - b);
        const p5 = stepValues[Math.floor(totalRuns * 0.05)];
        const p25 = stepValues[Math.floor(totalRuns * 0.25)];
        const median = stepValues[Math.floor(totalRuns * 0.50)];
        const p75 = stepValues[Math.floor(totalRuns * 0.75)];
        const p95 = stepValues[Math.floor(totalRuns * 0.95)];

        const samplePoints = samplePathsArray.map(arr => {
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

      // Distribution Histogram Construction (12-16 Bins)
      const binCount = 14;
      const profitMin = finalProfits[0];
      const profitMax = finalProfits[totalRuns - 1];
      const binWidth = Math.max(1, (profitMax - profitMin) / binCount);

      const histogramData: HistogramBin[] = [];
      for (let b = 0; b < binCount; b++) {
        const binStart = profitMin + b * binWidth;
        const binEnd = b === binCount - 1 ? profitMax + 0.001 : binStart + binWidth;
        const count = finalProfits.filter(p => p >= binStart && p < binEnd).length;
        const isRuinBin = binStart <= -startBank + 0.01;
        const isProfit = binStart >= 0;

        histogramData.push({
          rangeLabel: `${binStart >= 0 ? '+' : ''}${binStart.toFixed(0)} à ${binEnd >= 0 ? '+' : ''}${binEnd.toFixed(0)}`,
          minVal: binStart,
          maxVal: binEnd,
          count,
          percentage: Number(((count / totalRuns) * 100).toFixed(1)),
          isProfit,
          isRuin: isRuinBin,
        });
      }

      const durationMs = Math.round(performance.now() - startTime);

      setResults({
        totalRuns,
        betsPerRun: steps,
        startingBankroll: startBank,
        ruinCount,
        ruinRatePct: (ruinCount / totalRuns) * 100,
        takeProfitCount,
        takeProfitRatePct: (takeProfitCount / totalRuns) * 100,
        stopLossCount,
        stopLossRatePct: (stopLossCount / totalRuns) * 100,
        profitableRunsCount,
        profitableRunsRatePct: (profitableRunsCount / totalRuns) * 100,
        finalBalances,
        finalProfits,
        meanFinalBalance,
        meanFinalProfit,
        medianFinalBalance,
        medianFinalProfit,
        minFinalBalance,
        maxFinalBalance,
        p5Balance,
        p25Balance,
        p75Balance,
        p95Balance,
        stdDev,
        var95Profit,
        cvar95Profit,
        meanBetsSurvived: Math.round(totalBetsSurvived / totalRuns),
        meanMaxDrawdownPct: sumMaxDrawdownPct / totalRuns,
        trajectoryBands,
        histogramData,
        simulationDurationMs: durationMs,
        samplePathCount: SAMPLE_PATH_LIMIT,
      });

      setIsSimulating(false);
    }, 10);
  }, [strategy, numSimulations, betsPerSession, bankroll, customHouseEdge]);

  // Run automatically on first load or when key strategy/simulation parameters change
  useEffect(() => {
    runMonteCarloEngine();
  }, [strategy.id, strategy.baseBet, strategy.targetMultiplier, strategy.onLossAction, strategy.onLossValue]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5"
    >
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Simulateur Monte-Carlo Multi-Trajectoires
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                {numSimulations.toLocaleString()} SÉRIES INDÉPENDANTES
              </span>
              {results && (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Calculé en {results.simulationDurationMs} ms
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyse stochastique exhaustive des risques, du taux de ruine et de la dispersion des bénéfices pour <strong className="text-slate-200">{strategy.name}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowTheoryGuide(!showTheoryGuide)}
            className="text-xs text-slate-300 hover:text-purple-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>{showTheoryGuide ? 'Masquer Guide' : 'Comprendre Monte-Carlo'}</span>
            {showTheoryGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            disabled={isSimulating}
            onClick={runMonteCarloEngine}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-950/50 transition cursor-pointer"
          >
            {isSimulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isSimulating ? 'Calcul en cours...' : 'Relancer 10 000 Sims'}</span>
          </button>
        </div>
      </div>

      {/* 2. Educational & Methodological Guide */}
      {showTheoryGuide && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 text-xs text-slate-300 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                <Cpu className="w-4 h-4" />
                <span>1. Qu'est-ce que Monte-Carlo ?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Au lieu de tester un seul run de paris, Monte-Carlo exécute simultanément <strong>10 000 sessions distinctes</strong> soumises aux vraies lois probabilistes de Stake (RTP, streaks, martingales, stop-loss).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>2. Risque de Ruine Réel</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Le taux de ruine quantifie le pourcentage exact de sessions où la bankroll tombe à zéro avant d'atteindre le volume prévu. Un taux supérieur à <strong className="text-rose-300">5%</strong> requiert un ajustement des mises.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <BarChart3 className="w-4 h-4" />
                <span>3. Value at Risk (VaR 95%)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                La VaR 95% est la perte maximale encourue dans <strong className="text-blue-300">95% des cas normaux</strong>. Le CVaR (Expected Shortfall) évalue la sévérité moyenne des 5% de pires catastrophes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Parameter Controls Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Paramètres du Moteur Stochastique</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-normal">
            Mise de base : <strong className="text-slate-200">{strategy.baseBet} {currency}</strong> | Multiplicateur : <strong className="text-slate-200">{strategy.targetMultiplier}x</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Number of Simulations */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Nombre de Simulations :</span>
              <span className="text-purple-400 font-mono font-bold">{numSimulations.toLocaleString()}</span>
            </label>
            <select
              value={numSimulations}
              onChange={(e) => setNumSimulations(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            >
              <option value={1000}>1 000 Sessions (Rapide)</option>
              <option value={5000}>5 000 Sessions (Standard)</option>
              <option value={10000}>10 000 Sessions (Haute Précision)</option>
              <option value={25000}>25 000 Sessions (Extrême)</option>
            </select>
          </div>

          {/* Horizon (Bets per Session) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Paris par Session :</span>
              <span className="text-purple-400 font-mono font-bold">{betsPerSession} tirages</span>
            </label>
            <select
              value={betsPerSession}
              onChange={(e) => setBetsPerSession(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            >
              <option value={50}>50 Paris (Sprint Court)</option>
              <option value={100}>100 Paris (Session Standard)</option>
              <option value={250}>250 Paris (Endurance)</option>
              <option value={500}>500 Paris (Marathon Wager)</option>
              <option value={1000}>1 000 Paris (Farming Intensif)</option>
            </select>
          </div>

          {/* Initial Bankroll */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Bankroll de Départ ({currency}) :</span>
              <span className="text-purple-400 font-mono font-bold">{bankroll.toFixed(2)}</span>
            </label>
            <input
              type="number"
              min="1"
              step="10"
              value={bankroll}
              onChange={(e) => setBankroll(Math.max(1, parseFloat(e.target.value) || 100))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* House Edge Override */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Avantage Maison (%) :</span>
              <span className="text-purple-400 font-mono font-bold">{customHouseEdge.toFixed(2)}%</span>
            </label>
            <select
              value={customHouseEdge}
              onChange={(e) => setCustomHouseEdge(parseFloat(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-purple-500 focus:outline-none"
            >
              <option value={1.0}>1.00% (Stake Originals : Dice/Limbo/Plinko/Mines)</option>
              <option value={0.5}>0.50% (Blackjack)</option>
              <option value={2.7}>2.70% (Roulette Européenne)</option>
              <option value={3.5}>3.50% (Paris Sportifs)</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. Core Statistical Outcome Summary Cards */}
      {results && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Ruin Probability */}
          <div className={`p-4 rounded-xl border transition-colors ${
            results.ruinRatePct > 10 
              ? 'bg-slate-950/80 border-rose-500/40' 
              : results.ruinRatePct > 2
              ? 'bg-slate-950/80 border-amber-500/40'
              : 'bg-slate-950/80 border-emerald-500/40'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="font-semibold">Probabilité de Ruine</span>
              <ShieldAlert className={`w-4 h-4 ${
                results.ruinRatePct > 10 ? 'text-rose-400' : results.ruinRatePct > 2 ? 'text-amber-400' : 'text-emerald-400'
              }`} />
            </div>
            <div className={`text-2xl font-extrabold font-mono ${
              results.ruinRatePct > 10 ? 'text-rose-400' : results.ruinRatePct > 2 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {results.ruinRatePct.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              {results.ruinCount} sessions liquidées sur {results.totalRuns.toLocaleString()}
            </span>
          </div>

          {/* Profitable Sessions Rate */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="font-semibold">Sessions Gagnantes</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              {results.profitableRunsRatePct.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              {results.profitableRunsCount} / {results.totalRuns} en profit net
            </span>
          </div>

          {/* Median Profit/Balance */}
          <div className={`p-4 rounded-xl border transition-colors ${
            results.medianFinalProfit >= 0 
              ? 'bg-slate-950/80 border-teal-500/30' 
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="font-semibold">Médiane Solde Final</span>
              <Scale className="w-4 h-4 text-teal-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono ${
              results.medianFinalProfit >= 0 ? 'text-teal-400' : 'text-slate-300'
            }`}>
              {results.medianFinalBalance.toFixed(2)} {currency}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              Profit Médian : {results.medianFinalProfit >= 0 ? '+' : ''}{results.medianFinalProfit.toFixed(2)} {currency}
            </span>
          </div>

          {/* Value at Risk (VaR 95%) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="font-semibold">VaR 95% (Pire cas à 95%)</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-300">
              -{results.var95Profit.toFixed(2)} {currency}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-1">
              CVaR (Pire 5%) : -{results.cvar95Profit.toFixed(2)} {currency}
            </span>
          </div>

        </div>
      )}

      {/* 5. Sub-Navigation Tabs for Visualizations */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveViewTab('fan_chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeViewTab === 'fan_chart'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Éventail des Trajectoires (Percentiles)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('distribution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeViewTab === 'distribution'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Distribution des Résultats (Densité)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('risk_matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeViewTab === 'risk_matrix'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matrice de Dispersion & Recommandations</span>
          </button>
        </div>

        {results && (
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>Drawdown Moyen : <strong className="text-amber-400 font-mono">-{results.meanMaxDrawdownPct.toFixed(1)}%</strong></span>
            <span>Paris moyens survécus : <strong className="text-slate-200 font-mono">{results.meanBetsSurvived} / {results.betsPerRun}</strong></span>
          </div>
        )}
      </div>

      {/* 6. Visualization View 1: Fan Chart (Percentile Bands) */}
      {activeViewTab === 'fan_chart' && results && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-slate-200">
                Corridors de Dispersion des 10 000 Trajectoires (P5, P25, Médiane, P75, P95)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/40"></span>
                <span>P95 (Top 5%)</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40"></span>
                <span>P75 (Top 25%)</span>
              </span>
              <span className="flex items-center gap-1 text-teal-300">
                <span className="w-3 h-0.5 bg-teal-400"></span>
                <span>Médiane (P50)</span>
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40"></span>
                <span>P25 (Bottom 25%)</span>
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40"></span>
                <span>P5 (Bottom 5%)</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.trajectoryBands}>
                <defs>
                  <linearGradient id="p95Band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p75Band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p25Band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="step" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(val) => `Pari #${val}`}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(val: any, name: string) => [
                    `${Number(val).toFixed(2)} ${currency}`,
                    name === 'p95' ? 'P95 (Top 5%)'
                    : name === 'p75' ? 'P75 (Top 25%)'
                    : name === 'median' ? 'Médiane (P50)'
                    : name === 'p25' ? 'P25 (Worst 25%)'
                    : name === 'p5' ? 'P5 (Worst 5%)'
                    : name
                  ]}
                  labelFormatter={(label) => `Étape #${label} de la session`}
                />
                <ReferenceLine 
                  y={results.startingBankroll} 
                  stroke="#94a3b8" 
                  strokeDasharray="3 3" 
                  label={{ value: `Start (${results.startingBankroll} ${currency})`, fill: '#94a3b8', fontSize: 10, position: 'right' }} 
                />

                {/* Shaded Corridor Areas */}
                <Area type="monotone" dataKey="p95" stroke="#a855f7" strokeWidth={1.5} fill="url(#p95Band)" name="p95" />
                <Area type="monotone" dataKey="p75" stroke="#10b981" strokeWidth={1.5} fill="url(#p75Band)" name="p75" />
                <Line type="monotone" dataKey="median" stroke="#14b8a6" strokeWidth={2.5} dot={false} name="median" />
                <Area type="monotone" dataKey="p25" stroke="#f59e0b" strokeWidth={1.5} fill="url(#p25Band)" name="p25" />
                <Line type="monotone" dataKey="p5" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="2 2" dot={false} name="p5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 7. Visualization View 2: Distribution Histogram */}
      {activeViewTab === 'distribution' && results && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">
                Histogramme de Densité des Profits & Pertes Finaux ({results.totalRuns.toLocaleString()} runs)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Moyenne : <strong className={results.meanFinalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {results.meanFinalProfit >= 0 ? '+' : ''}{results.meanFinalProfit.toFixed(2)} {currency}
              </strong> | Écart-Type (σ) : <strong className="text-purple-300">±{results.stdDev.toFixed(2)} {currency}</strong>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results.histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="rangeLabel" 
                  stroke="#64748b" 
                  fontSize={9} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                  formatter={(val: any, name: string, props: any) => [
                    `${val} sessions (${props.payload.percentage}%)`,
                    'Fréquence'
                  ]}
                  labelFormatter={(label) => `Intervalle de Profit : ${label} ${currency}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {results.histogramData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isRuin ? '#f43f5e' : entry.isProfit ? '#10b981' : '#f59e0b'} 
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 8. Visualization View 3: Risk Matrix & Actionable Diagnostics */}
      {activeViewTab === 'risk_matrix' && results && (
        <div className="space-y-4">
          
          {/* Detailed Percentile Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5">Niveau de Percentile</th>
                  <th className="py-2.5 px-3.5">Solde Final</th>
                  <th className="py-2.5 px-3.5">Profit Net</th>
                  <th className="py-2.5 px-3.5">ROI %</th>
                  <th className="py-2.5 px-3.5">Interprétation Statistique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-rose-400 font-bold">Pire Cas (Min)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.minFinalBalance.toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-rose-400 font-bold">{(results.minFinalBalance - results.startingBankroll).toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-rose-400">{(((results.minFinalBalance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Série noire extrême (Run ruiné ou liquidé)</td>
                </tr>

                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-rose-300 font-bold">5ème Percentile (VaR 95%)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.p5Balance.toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-rose-300 font-bold">{(results.p5Balance - results.startingBankroll).toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-rose-300">{(((results.p5Balance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Seuil de perte maximale dans 95% des cas normaux</td>
                </tr>

                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-amber-300 font-bold">25ème Percentile (Q1)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.p25Balance.toFixed(2)} {currency}</td>
                  <td className={`py-2 px-3.5 font-bold ${results.p25Balance >= results.startingBankroll ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(results.p25Balance - results.startingBankroll).toFixed(2)} {currency}
                  </td>
                  <td className="py-2 px-3.5 text-slate-300">{(((results.p25Balance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Phase de friction modérée de variance</td>
                </tr>

                <tr className="hover:bg-slate-900/40 bg-teal-950/20">
                  <td className="py-2.5 px-3.5 text-teal-300 font-bold">50ème Percentile (Médiane)</td>
                  <td className="py-2.5 px-3.5 text-teal-300 font-bold">{results.medianFinalBalance.toFixed(2)} {currency}</td>
                  <td className={`py-2.5 px-3.5 font-extrabold ${results.medianFinalProfit >= 0 ? 'text-teal-400' : 'text-slate-300'}`}>
                    {results.medianFinalProfit >= 0 ? '+' : ''}{results.medianFinalProfit.toFixed(2)} {currency}
                  </td>
                  <td className="py-2.5 px-3.5 text-teal-300">{((results.medianFinalProfit / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-3.5 text-teal-200 font-sans text-[11px] font-semibold">Résultat typique le plus probable</td>
                </tr>

                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-emerald-300 font-bold">75ème Percentile (Q3)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.p75Balance.toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-emerald-400 font-bold">+{(results.p75Balance - results.startingBankroll).toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-emerald-400">+{(((results.p75Balance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Session favorable avec bonne régularité</td>
                </tr>

                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-purple-300 font-bold">95ème Percentile (Top 5%)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.p95Balance.toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-purple-400 font-bold">+{(results.p95Balance - results.startingBankroll).toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-purple-400">+{(((results.p95Balance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Super-Run de variance positive / Alpha streak</td>
                </tr>

                <tr className="hover:bg-slate-900/40">
                  <td className="py-2 px-3.5 text-emerald-400 font-bold">Meilleur Cas (Max)</td>
                  <td className="py-2 px-3.5 text-slate-300">{results.maxFinalBalance.toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-emerald-400 font-bold">+{(results.maxFinalBalance - results.startingBankroll).toFixed(2)} {currency}</td>
                  <td className="py-2 px-3.5 text-emerald-400">+{(((results.maxFinalBalance - results.startingBankroll) / results.startingBankroll) * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3.5 text-slate-400 font-sans text-[11px]">Plafond optimal observé sur les 10 000 simulations</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actionable Strategy Recommendations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span>Diagnostic de Bankroll & Dimensionnement</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {results.ruinRatePct > 5 ? (
                  <>
                    ⚠️ Le risque de ruine (<strong className="text-rose-400 font-mono">{results.ruinRatePct.toFixed(1)}%</strong>) est élevé pour une bankroll de {results.startingBankroll} {currency}. Il est recommandé de réduire la mise de base à <strong className="text-emerald-400 font-mono">{(strategy.baseBet * 0.5).toFixed(4)} {currency}</strong> ou d'augmenter votre capital initial à <strong className="text-emerald-400 font-mono">{(results.startingBankroll * 1.75).toFixed(0)} {currency}</strong>.
                  </>
                ) : (
                  <>
                    ✅ Le dimensionnement de votre bankroll est <strong className="text-emerald-400 font-semibold">optimal</strong> : le risque de liquidation est contenu à <strong className="text-emerald-400 font-mono">{results.ruinRatePct.toFixed(2)}%</strong> sur {results.betsPerRun} paris.
                  </>
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Sécurité & Clôture de Session</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {strategy.stopOnProfit ? (
                  <>
                    🎯 Le Take-Profit à +{strategy.stopOnProfit} {currency} est atteint dans <strong className="text-emerald-400 font-mono">{results.takeProfitRatePct.toFixed(1)}%</strong> des sessions.
                  </>
                ) : (
                  <>
                    💡 Aucun Take-Profit fixe n'est configuré. Définir un palier à <strong className="text-teal-300 font-mono">+{(results.startingBankroll * 0.15).toFixed(2)} {currency}</strong> permettrait de sécuriser vos gains plus fréquemment.
                  </>
                )}
              </p>
            </div>
          </div>

        </div>
      )}

    </motion.div>
  );
};
