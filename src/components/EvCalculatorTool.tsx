import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  DollarSign, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  Zap, 
  RefreshCw, 
  Sliders, 
  Layers, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Flame,
  Target
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { BetResult, StakeGameType, BettingStrategy } from '../types';

export interface EvCalculatorToolProps {
  bets: BetResult[];
  currency: string;
  strategy?: BettingStrategy;
  onApplyBetSize?: (amount: number) => void;
  onApplyMultiplier?: (multiplier: number) => void;
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

export const EvCalculatorTool: React.FC<EvCalculatorToolProps> = ({
  bets,
  currency,
  strategy,
  onApplyBetSize,
  onApplyMultiplier,
}) => {
  // Tab states inside the EV Tool
  const [activeEvSubTab, setActiveEvSubTab] = useState<'historical' | 'simulator' | 'projections' | 'breakdown'>('historical');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(false);

  // Interactive What-If Simulator States
  const [simBetAmount, setSimBetAmount] = useState<number>(strategy?.baseBet || 1.0);
  const [simMultiplier, setSimMultiplier] = useState<number>(strategy?.targetMultiplier || 2.0);
  const [simHouseEdgePct, setSimHouseEdgePct] = useState<number>(1.0); // 1%
  const [simBetsPerMinute, setSimBetsPerMinute] = useState<number>(30); // 30 bets/min

  // Projection Horizon States
  const [projectionCount, setProjectionCount] = useState<number>(1000);

  // 1. Core Historical EV Calculations
  const historicalEv = useMemo(() => {
    // Filter bets if game filter is active
    const targetBets = selectedGameFilter === 'all' 
      ? bets 
      : bets.filter(b => b.game === selectedGameFilter);

    const totalBets = targetBets.length;
    if (totalBets === 0) {
      return {
        totalBets: 0,
        totalWagered: 0,
        totalProfit: 0,
        winsCount: 0,
        lossesCount: 0,
        winRate: 0,
        realizedEvPerBet: 0,
        realizedEvPct: 0,
        theoreticalEvPerBet: 0,
        theoreticalEvPct: -1.0,
        totalTheoreticalEv: 0,
        luckDifferentialVal: 0,
        luckDifferentialPct: 0,
        avgWinProfit: 0,
        avgLossAmount: 0,
        stdDev: 0,
        standardError: 0,
        zScore: 0,
        confidenceIntervalLow: 0,
        confidenceIntervalHigh: 0,
        evaluationStatus: 'no_data' as const,
        statusText: 'Aucun historique',
        statusColor: 'text-slate-400',
        chartData: [] as any[],
        perGameEv: {} as Record<string, any>,
        perMultiplierRange: {} as Record<string, any>
      };
    }

    let totalWagered = 0;
    let totalProfit = 0;
    let winsCount = 0;
    let lossesCount = 0;
    let totalWinProfit = 0;
    let totalLossAmount = 0;
    let totalTheoreticalEv = 0;

    const returnPercentages: number[] = [];
    const unitReturns: number[] = [];

    // Cumulative EV progression chart data
    let runningCumulativeRealProfit = 0;
    let runningCumulativeTheoEv = 0;
    let runningWagered = 0;
    const chartData: any[] = [];

    // Per-game EV tracking
    const perGameStats: Record<string, {
      bets: number;
      wagered: number;
      profit: number;
      wins: number;
      theoreticalEv: number;
    }> = {};

    // Per-multiplier range tracking
    const perMultiplierStats: Record<string, {
      label: string;
      bets: number;
      wagered: number;
      profit: number;
      wins: number;
      theoreticalEv: number;
    }> = {
      safe: { label: 'Safe (< 2.0x)', bets: 0, wagered: 0, profit: 0, wins: 0, theoreticalEv: 0 },
      balanced: { label: 'Équilibré (2.0x - 4.99x)', bets: 0, wagered: 0, profit: 0, wins: 0, theoreticalEv: 0 },
      aggressive: { label: 'Agressif (5.0x - 19.99x)', bets: 0, wagered: 0, profit: 0, wins: 0, theoreticalEv: 0 },
      moonshot: { label: 'Moonshot (≥ 20.0x)', bets: 0, wagered: 0, profit: 0, wins: 0, theoreticalEv: 0 },
    };

    targetBets.forEach((b, idx) => {
      const wager = Math.max(0.00000001, b.betAmount);
      const profit = b.profit;
      const won = b.won;
      const game = b.game || 'dice';
      const mult = Math.max(1.01, b.targetMultiplier || b.payoutMultiplier || 2.0);
      const houseEdge = GAME_HOUSE_EDGES[game] ?? 0.01;

      totalWagered += wager;
      totalProfit += profit;
      runningWagered += wager;

      if (won) {
        winsCount++;
        totalWinProfit += profit;
      } else {
        lossesCount++;
        totalLossAmount += Math.abs(profit);
      }

      // Theoretical EV for this bet: -HouseEdge * Bet
      const betTheoEv = -houseEdge * wager;
      totalTheoreticalEv += betTheoEv;

      // Returns tracking
      const retPct = (profit / wager) * 100;
      returnPercentages.push(retPct);
      unitReturns.push(profit);

      // Running accumulation
      runningCumulativeRealProfit += profit;
      runningCumulativeTheoEv += betTheoEv;

      // Sample chart points (max 100 points for smooth performance)
      if (totalBets <= 100 || idx % Math.ceil(totalBets / 100) === 0 || idx === totalBets - 1) {
        chartData.push({
          betNumber: b.betNumber || idx + 1,
          realProfit: Number(runningCumulativeRealProfit.toFixed(4)),
          theoEv: Number(runningCumulativeTheoEv.toFixed(4)),
          realEvRatePct: Number(((runningCumulativeRealProfit / runningWagered) * 100).toFixed(2)),
          theoEvRatePct: Number(((runningCumulativeTheoEv / runningWagered) * 100).toFixed(2)),
          wagered: Number(runningWagered.toFixed(2))
        });
      }

      // Per-Game aggregation
      if (!perGameStats[game]) {
        perGameStats[game] = { bets: 0, wagered: 0, profit: 0, wins: 0, theoreticalEv: 0 };
      }
      perGameStats[game].bets++;
      perGameStats[game].wagered += wager;
      perGameStats[game].profit += profit;
      if (won) perGameStats[game].wins++;
      perGameStats[game].theoreticalEv += betTheoEv;

      // Per-Multiplier Range aggregation
      if (mult < 2.0) {
        perMultiplierStats.safe.bets++;
        perMultiplierStats.safe.wagered += wager;
        perMultiplierStats.safe.profit += profit;
        if (won) perMultiplierStats.safe.wins++;
        perMultiplierStats.safe.theoreticalEv += betTheoEv;
      } else if (mult < 5.0) {
        perMultiplierStats.balanced.bets++;
        perMultiplierStats.balanced.wagered += wager;
        perMultiplierStats.balanced.profit += profit;
        if (won) perMultiplierStats.balanced.wins++;
        perMultiplierStats.balanced.theoreticalEv += betTheoEv;
      } else if (mult < 20.0) {
        perMultiplierStats.aggressive.bets++;
        perMultiplierStats.aggressive.wagered += wager;
        perMultiplierStats.aggressive.profit += profit;
        if (won) perMultiplierStats.aggressive.wins++;
        perMultiplierStats.aggressive.theoreticalEv += betTheoEv;
      } else {
        perMultiplierStats.moonshot.bets++;
        perMultiplierStats.moonshot.wagered += wager;
        perMultiplierStats.moonshot.profit += profit;
        if (won) perMultiplierStats.moonshot.wins++;
        perMultiplierStats.moonshot.theoreticalEv += betTheoEv;
      }
    });

    const winRate = (winsCount / totalBets) * 100;
    const realizedEvPerBet = totalProfit / totalBets;
    const realizedEvPct = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;
    const theoreticalEvPerBet = totalTheoreticalEv / totalBets;
    const theoreticalEvPct = totalWagered > 0 ? (totalTheoreticalEv / totalWagered) * 100 : -1.0;

    const luckDifferentialVal = totalProfit - totalTheoreticalEv;
    const luckDifferentialPct = realizedEvPct - theoreticalEvPct;

    const avgWinProfit = winsCount > 0 ? totalWinProfit / winsCount : 0;
    const avgLossAmount = lossesCount > 0 ? totalLossAmount / lossesCount : 0;

    // Standard deviation and Standard Error of EV
    const meanReturn = realizedEvPerBet;
    const variance = unitReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / Math.max(1, totalBets - 1);
    const stdDev = Math.sqrt(variance);
    const standardError = totalBets > 1 ? stdDev / Math.sqrt(totalBets) : stdDev;

    // Z-Score: (Realized EV - Theoretical EV) / Standard Error
    const zScore = standardError > 0 ? (realizedEvPerBet - theoreticalEvPerBet) / standardError : 0;

    // 95% Confidence Interval for EV per bet: EV +- 1.96 * SE
    const confidenceIntervalLow = realizedEvPerBet - 1.96 * standardError;
    const confidenceIntervalHigh = realizedEvPerBet + 1.96 * standardError;

    // Statistical & Qualitative Status
    let evaluationStatus: 'alpha_run' | 'positive_variance' | 'statistical_norm' | 'negative_friction' | 'critical_drawdown' = 'statistical_norm';
    let statusText = 'Aligné avec les lois statistiques';
    let statusColor = 'text-blue-400';

    if (totalBets >= 10) {
      if (zScore > 2.0 && realizedEvPct > 0) {
        evaluationStatus = 'alpha_run';
        statusText = 'Super-Run de Variance Positive (Statistiquement Significatif)';
        statusColor = 'text-emerald-400';
      } else if (zScore > 0.5 && realizedEvPct > 0) {
        evaluationStatus = 'positive_variance';
        statusText = 'Surperformance Modérée (Variance Favorable)';
        statusColor = 'text-teal-400';
      } else if (zScore < -2.0) {
        evaluationStatus = 'critical_drawdown';
        statusText = 'Variance Négative Critique (Série Noire Dépassant la Norme)';
        statusColor = 'text-rose-400';
      } else if (zScore < -0.5 || realizedEvPct < -3.0) {
        evaluationStatus = 'negative_friction';
        statusText = 'Frottement de l\'Avantage Maison & Variance Défavorable';
        statusColor = 'text-amber-400';
      }
    }

    // Per-game final matrix
    const perGameEv: Record<string, any> = {};
    Object.entries(perGameStats).forEach(([game, g]) => {
      const gRealEvPct = g.wagered > 0 ? (g.profit / g.wagered) * 100 : 0;
      const gTheoEvPct = g.wagered > 0 ? (g.theoreticalEv / g.wagered) * 100 : -1.0;
      perGameEv[game] = {
        bets: g.bets,
        wagered: g.wagered,
        profit: g.profit,
        winRate: (g.wins / g.bets) * 100,
        realEvPerBet: g.profit / g.bets,
        realEvPct: gRealEvPct,
        theoEvPct: gTheoEvPct,
        luckDelta: g.profit - g.theoreticalEv,
        luckDeltaPct: gRealEvPct - gTheoEvPct,
      };
    });

    // Per-multiplier final matrix
    const perMultiplierRange: Record<string, any> = {};
    Object.entries(perMultiplierStats).forEach(([key, m]) => {
      if (m.bets > 0) {
        const mRealEvPct = m.wagered > 0 ? (m.profit / m.wagered) * 100 : 0;
        const mTheoEvPct = m.wagered > 0 ? (m.theoreticalEv / m.wagered) * 100 : -1.0;
        perMultiplierRange[key] = {
          label: m.label,
          bets: m.bets,
          wagered: m.wagered,
          profit: m.profit,
          winRate: (m.wins / m.bets) * 100,
          realEvPct: mRealEvPct,
          theoEvPct: mTheoEvPct,
          luckDelta: m.profit - m.theoreticalEv,
        };
      }
    });

    return {
      totalBets,
      totalWagered,
      totalProfit,
      winsCount,
      lossesCount,
      winRate,
      realizedEvPerBet,
      realizedEvPct,
      theoreticalEvPerBet,
      theoreticalEvPct,
      totalTheoreticalEv,
      luckDifferentialVal,
      luckDifferentialPct,
      avgWinProfit,
      avgLossAmount,
      stdDev,
      standardError,
      zScore,
      confidenceIntervalLow,
      confidenceIntervalHigh,
      evaluationStatus,
      statusText,
      statusColor,
      chartData,
      perGameEv,
      perMultiplierRange,
    };
  }, [bets, selectedGameFilter]);

  // 2. Interactive What-If Simulator Calculations
  const simulatorCalc = useMemo(() => {
    const bet = Math.max(0.00000001, simBetAmount);
    const mult = Math.max(1.01, simMultiplier);
    const houseEdgeFraction = Math.max(0.0001, simHouseEdgePct / 100);

    // Theoretical Win Probability for this game: (1 - HouseEdge) / Multiplier
    const theoWinProbability = (1 - houseEdgeFraction) / mult;
    const theoWinRatePct = theoWinProbability * 100;

    // Breakeven Win Rate: 1 / Multiplier
    const breakevenWinRatePct = (1 / mult) * 100;

    // Theoretical EV per single bet: (P(Win) * (Multiplier - 1) * Bet) - ((1 - P(Win)) * Bet) = -HouseEdge * Bet
    const theoEvPerBet = -houseEdgeFraction * bet;
    const theoEvPct = -houseEdgeFraction * 100;

    // Hourly and Daily Projections based on bet rate
    const betsPerHour = simBetsPerMinute * 60;
    const betsPerDay = betsPerHour * 24;

    const hourlyTheoEv = theoEvPerBet * betsPerHour;
    const dailyTheoEv = theoEvPerBet * betsPerDay;
    const hourlyWager = bet * betsPerHour;

    // Optimal Kelly fraction for this scenario
    // f* = (P * (M - 1) - (1 - P)) / (M - 1)
    const kellyNumerator = theoWinProbability * (mult - 1) - (1 - theoWinProbability);
    const kellyDenominator = mult - 1;
    const kellyFull = kellyDenominator > 0 ? (kellyNumerator / kellyDenominator) * 100 : 0;

    // Empirical comparison against historical session performance
    const historicalMatch = historicalEv.totalBets > 0 ? {
      realizedWinRate: historicalEv.winRate,
      winRateDeltaVsBreakeven: historicalEv.winRate - breakevenWinRatePct,
      realizedEvPct: historicalEv.realizedEvPct,
    } : null;

    return {
      bet,
      mult,
      houseEdgeFraction,
      theoWinProbability,
      theoWinRatePct,
      breakevenWinRatePct,
      theoEvPerBet,
      theoEvPct,
      betsPerHour,
      betsPerDay,
      hourlyTheoEv,
      dailyTheoEv,
      hourlyWager,
      kellyFull,
      historicalMatch,
    };
  }, [simBetAmount, simMultiplier, simHouseEdgePct, simBetsPerMinute, historicalEv]);

  // 3. Multi-Horizon Projections Model
  const projectionsData = useMemo(() => {
    const horizons = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
    const baseWager = historicalEv.totalBets > 0 
      ? historicalEv.totalWagered / historicalEv.totalBets 
      : strategy?.baseBet || 1.0;
    
    const realEvPerBet = historicalEv.totalBets >= 5 
      ? historicalEv.realizedEvPerBet 
      : simulatorCalc.theoEvPerBet;
    
    const theoEvPerBet = historicalEv.totalBets > 0 
      ? historicalEv.theoreticalEvPerBet 
      : simulatorCalc.theoEvPerBet;
    
    const stdDevPerBet = historicalEv.totalBets > 1 
      ? historicalEv.stdDev 
      : baseWager * 1.5;

    return horizons.map(n => {
      const totalVolume = baseWager * n;
      const expectedRealProfit = realEvPerBet * n;
      const expectedTheoProfit = theoEvPerBet * n;
      
      // Standard Error of total profit after n bets: sigma * sqrt(n)
      const marginOfError95 = 1.96 * stdDevPerBet * Math.sqrt(n);
      const confLow = expectedRealProfit - marginOfError95;
      const confHigh = expectedRealProfit + marginOfError95;

      return {
        betsCount: n,
        totalVolume: Number(totalVolume.toFixed(2)),
        expectedRealProfit: Number(expectedRealProfit.toFixed(4)),
        expectedTheoProfit: Number(expectedTheoProfit.toFixed(4)),
        confLow: Number(confLow.toFixed(4)),
        confHigh: Number(confHigh.toFixed(4)),
        marginOfError: Number(marginOfError95.toFixed(4)),
      };
    });
  }, [historicalEv, simulatorCalc, strategy]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5"
    >
      {/* 1. Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Calculateur & Auditeur d'Espérance Mathématique (EV)
              </h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border font-mono ${
                historicalEv.evaluationStatus === 'alpha_run'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : historicalEv.evaluationStatus === 'positive_variance'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : historicalEv.evaluationStatus === 'critical_drawdown'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                {historicalEv.totalBets >= 5 
                  ? `EV Réelle : ${historicalEv.realizedEvPct >= 0 ? '+' : ''}${historicalEv.realizedEvPct.toFixed(2)}%` 
                  : 'Mode Enregistrement'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyse de l'EV réelle vs théorique, détection de variance statistique ($Z$-score) et projections futures.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFormulaGuide(!showFormulaGuide)}
            className="text-xs text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showFormulaGuide ? 'Masquer la Théorie' : 'Comprendre l\'EV'}</span>
            {showFormulaGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Educational & Formula Guide Accordion */}
      {showFormulaGuide && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 text-xs text-slate-300 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Target className="w-4 h-4" />
                <span>1. Espérance Réelle (Empirique)</span>
              </div>
              <p className="text-[11px] font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                EV_réelle = (Σ Profits) / (Σ Mises)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Reflète le rendement net effectif généré par votre session. Décomposé en : <code className="text-slate-300 font-mono">(P_win × Gain_moyen) - (P_loss × Perte_moyenne)</code>.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Espérance Théorique (House Edge)</span>
              </div>
              <p className="text-[11px] font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                EV_théorique = -AvantageMaison × Mise
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sur Stake Originals (1% House Edge / 99% RTP), l'EV théorique est strictement de <strong className="text-slate-200 font-mono">-1.00%</strong> par tirage sur le long terme.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                <Activity className="w-4 h-4" />
                <span>3. Z-Score & Facteur Chance</span>
              </div>
              <p className="text-[11px] font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                Z = (EV_réelle - EV_théo) / (σ / √N)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mesure si votre profit actuel est attribuable à un <strong className="text-purple-300">Super-Run de variance (Z &gt; +1.96)</strong> ou à une déviation statistique normale.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveEvSubTab('historical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeEvSubTab === 'historical'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Historique EV ({historicalEv.totalBets})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEvSubTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeEvSubTab === 'simulator'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulateur "What-If"</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEvSubTab('projections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeEvSubTab === 'projections'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Projections Long-Terme</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveEvSubTab('breakdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeEvSubTab === 'breakdown'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matrices par Jeu & Multiplicateur</span>
          </button>
        </div>

        {/* Optional Game filter */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Filtrer par jeu :</span>
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Tous les jeux ({bets.length})</option>
            {Array.from(new Set(bets.map(b => b.game || 'dice'))).map(g => (
              <option key={g} value={g}>{g.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Tab 1: Historical EV Audit */}
      {activeEvSubTab === 'historical' && (
        <div className="space-y-4">
          {/* 4.1 Summary Top KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Realized EV % */}
            <div className={`p-4 rounded-xl border transition-colors ${
              historicalEv.realizedEvPct >= 0 
                ? 'bg-slate-950/80 border-emerald-500/30' 
                : 'bg-slate-950/80 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold">EV Réelle (% du volume)</span>
                <Percent className={`w-4 h-4 ${historicalEv.realizedEvPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold font-mono ${
                historicalEv.realizedEvPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {historicalEv.realizedEvPct >= 0 ? '+' : ''}{historicalEv.realizedEvPct.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                Par pari : {historicalEv.realizedEvPerBet >= 0 ? '+' : ''}{historicalEv.realizedEvPerBet.toFixed(4)} {currency}
              </span>
            </div>

            {/* Theoretical EV % */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold">EV Théorique (Benchmark)</span>
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-slate-200">
                {historicalEv.theoreticalEvPct.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                Attendu : {historicalEv.totalTheoreticalEv.toFixed(4)} {currency}
              </span>
            </div>

            {/* Luck Differential (Variance Edge) */}
            <div className={`p-4 rounded-xl border transition-colors ${
              historicalEv.luckDifferentialVal >= 0 
                ? 'bg-slate-950/80 border-teal-500/30' 
                : 'bg-slate-950/80 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold">Différentiel Chance (Δ EV)</span>
                <Flame className={`w-4 h-4 ${historicalEv.luckDifferentialVal >= 0 ? 'text-teal-400' : 'text-amber-400'}`} />
              </div>
              <div className={`text-2xl font-extrabold font-mono ${
                historicalEv.luckDifferentialVal >= 0 ? 'text-teal-400' : 'text-amber-400'
              }`}>
                {historicalEv.luckDifferentialVal >= 0 ? '+' : ''}{historicalEv.luckDifferentialVal.toFixed(4)} {currency}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                Surperformance : {historicalEv.luckDifferentialPct >= 0 ? '+' : ''}{historicalEv.luckDifferentialPct.toFixed(2)}%
              </span>
            </div>

            {/* Z-Score & Statistical Significance */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-semibold">Z-Score de Variance</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className={`text-2xl font-extrabold font-mono ${
                historicalEv.zScore > 1.96 
                  ? 'text-purple-400' 
                  : historicalEv.zScore < -1.96 
                  ? 'text-rose-400' 
                  : 'text-slate-300'
              }`}>
                {historicalEv.zScore >= 0 ? '+' : ''}{historicalEv.zScore.toFixed(2)} σ
              </div>
              <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate">
                {historicalEv.totalBets >= 10 ? historicalEv.statusText : 'Min. 10 paris pour Z-Score'}
              </span>
            </div>

          </div>

          {/* 4.2 Statistical Diagnostics & Probability Formula Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-2.5">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Décomposition Probabiliste Réelle de la Session</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Volume Analysé : <strong className="text-slate-200">{historicalEv.totalWagered.toFixed(2)} {currency}</strong> sur <strong className="text-slate-200">{historicalEv.totalBets} paris</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Poids des Victoires :</span>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {historicalEv.winRate.toFixed(1)}% × +{historicalEv.avgWinProfit.toFixed(4)} {currency}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Contribution : +{( (historicalEv.winRate / 100) * historicalEv.avgWinProfit ).toFixed(4)} {currency} / tirage
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Poids des Défaites :</span>
                <div className="text-sm font-bold font-mono text-rose-400">
                  {(100 - historicalEv.winRate).toFixed(1)}% × -{historicalEv.avgLossAmount.toFixed(4)} {currency}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Friction : -{( ((100 - historicalEv.winRate) / 100) * historicalEv.avgLossAmount ).toFixed(4)} {currency} / tirage
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] font-medium block">Intervalle de Confiance (95%) :</span>
                <div className="text-sm font-bold font-mono text-blue-300">
                  [{historicalEv.confidenceIntervalLow.toFixed(4)} ; {historicalEv.confidenceIntervalHigh.toFixed(4)}] {currency}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Erreur standard (SE) : ±{historicalEv.standardError.toFixed(4)} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* 4.3 Cumulative EV vs Real Profit Evolution Chart */}
          {historicalEv.chartData.length > 1 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Trajectoire Cumulative : Profit Réel Réalisé vs Courbe d'EV Théorique
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full"></span>
                    <span>Profit Réel ({historicalEv.totalProfit >= 0 ? '+' : ''}{historicalEv.totalProfit.toFixed(2)} {currency})</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-2.5 h-0.5 bg-blue-400 border-b border-dashed"></span>
                    <span>EV Théorique Attendue ({historicalEv.totalTheoreticalEv.toFixed(2)} {currency})</span>
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalEv.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="betNumber" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={(val) => `#${val}`}
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
                        `${Number(val).toFixed(4)} ${currency}`,
                        name === 'realProfit' ? 'Profit Réel' : 'EV Théorique'
                      ]}
                      labelFormatter={(label) => `Pari #${label}`}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                    <Line 
                      type="monotone" 
                      dataKey="realProfit" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={false}
                      name="realProfit"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="theoEv" 
                      stroke="#3b82f6" 
                      strokeWidth={1.8} 
                      strokeDasharray="4 4" 
                      dot={false}
                      name="theoEv"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Interactive "What-If" EV Simulator */}
      {activeEvSubTab === 'simulator' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Simulator Inputs Column */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-slate-200 font-bold text-xs">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Paramètres de Simulation</span>
              </div>

              {/* Bet Amount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Mise par Pari ({currency})</span>
                  <span className="font-mono text-purple-400">{simBetAmount.toFixed(4)} {currency}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.0001"
                    value={simBetAmount}
                    onChange={(e) => setSimBetAmount(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                  {onApplyBetSize && (
                    <button
                      type="button"
                      onClick={() => onApplyBetSize(simBetAmount)}
                      className="px-2.5 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-bold hover:bg-purple-600/30 transition whitespace-nowrap cursor-pointer"
                    >
                      Appliquer
                    </button>
                  )}
                </div>
              </div>

              {/* Target Multiplier */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Cote / Multiplicateur Visé</span>
                  <span className="font-mono text-purple-400">{simMultiplier.toFixed(2)}x</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="1.01"
                    value={simMultiplier}
                    onChange={(e) => setSimMultiplier(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                  {onApplyMultiplier && (
                    <button
                      type="button"
                      onClick={() => onApplyMultiplier(simMultiplier)}
                      className="px-2.5 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-bold hover:bg-purple-600/30 transition whitespace-nowrap cursor-pointer"
                    >
                      Appliquer
                    </button>
                  )}
                </div>
              </div>

              {/* House Edge */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Avantage Maison (%)</span>
                  <span className="font-mono text-purple-400">{simHouseEdgePct.toFixed(2)}%</span>
                </label>
                <select
                  value={simHouseEdgePct}
                  onChange={(e) => setSimHouseEdgePct(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                >
                  <option value={1.0}>1.00% (Stake Originals : Dice, Limbo, Mines, Plinko)</option>
                  <option value={0.5}>0.50% (Blackjack Stratégie Optimale)</option>
                  <option value={2.7}>2.70% (Roulette Européenne Simple Zéro)</option>
                  <option value={3.5}>3.50% (Paris Sportifs Marge Bookmaker)</option>
                  <option value={5.0}>5.00% (Casino Slots & Live Shows)</option>
                </select>
              </div>

              {/* Bet Speed Rate */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span>Cadence de Paris (par minute)</span>
                  <span className="font-mono text-purple-400">{simBetsPerMinute} / min</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={simBetsPerMinute}
                  onChange={(e) => setSimBetsPerMinute(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            {/* Simulator Output Grid (2 Columns) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Theoretical Win Chance & Breakeven */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold">Probabilité de Victoire Théorique</span>
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {simulatorCalc.theoWinRatePct.toFixed(2)}%
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Seuil de rentabilité (Breakeven) :</span>
                    <strong className="text-slate-200 font-mono">{simulatorCalc.breakevenWinRatePct.toFixed(2)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Écart House Edge :</span>
                    <strong className="text-rose-400 font-mono">-{(simulatorCalc.breakevenWinRatePct - simulatorCalc.theoWinRatePct).toFixed(2)}%</strong>
                  </div>
                </div>
              </div>

              {/* EV per single bet */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold">Espérance Unitaire par Tirage</span>
                  <DollarSign className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-400">
                  {simulatorCalc.theoEvPerBet.toFixed(4)} {currency}
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Taux d'EV (%) :</span>
                    <strong className="text-rose-400 font-mono">{simulatorCalc.theoEvPct.toFixed(2)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Gain en cas de Victoire :</span>
                    <strong className="text-emerald-400 font-mono">+{(simulatorCalc.bet * (simulatorCalc.mult - 1)).toFixed(4)} {currency}</strong>
                  </div>
                </div>
              </div>

              {/* Hourly Projected House Friction */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold">Friction Mathématique Horaire (1h)</span>
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {simulatorCalc.hourlyTheoEv.toFixed(2)} {currency}
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Volume brassé / heure :</span>
                    <strong className="text-slate-200 font-mono">{simulatorCalc.hourlyWager.toFixed(2)} {currency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nombre de paris / heure :</span>
                    <strong className="text-slate-200 font-mono">{simulatorCalc.betsPerHour} paris</strong>
                  </div>
                </div>
              </div>

              {/* 24h Daily Turnover Projection */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold">Volume & Coût Théorique (24h)</span>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-200">
                  {(simulatorCalc.hourlyWager * 24).toFixed(2)} {currency}
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Perte mathématique (24h) :</span>
                    <strong className="text-rose-400 font-mono">{simulatorCalc.dailyTheoEv.toFixed(2)} {currency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Rakeback estimé (10%) :</span>
                    <strong className="text-emerald-400 font-mono">+{(Math.abs(simulatorCalc.dailyTheoEv) * 0.1).toFixed(2)} {currency}</strong>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Multi-Horizon Long-Term Projections */}
      {activeEvSubTab === 'projections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="font-bold">
                Simulation de Trajectoire Multi-Horizons (Modèle Statistique de Dispersion)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Basé sur la variance empirique de votre historique ({historicalEv.stdDev > 0 ? `σ = ${historicalEv.stdDev.toFixed(3)}` : 'Modèle Standard'})
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-3.5">Horizon (Paris)</th>
                  <th className="py-3 px-3.5">Volume Estimé</th>
                  <th className="py-3 px-3.5 text-blue-400">EV Théorique (House Edge)</th>
                  <th className="py-3 px-3.5 text-emerald-400">EV Projetée (Tendance Actuelle)</th>
                  <th className="py-3 px-3.5">Cône d'Incertitude 95% (±1.96σ)</th>
                  <th className="py-3 px-3.5">Intervalle [Min ; Max]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {projectionsData.map((p) => {
                  return (
                    <tr key={p.betsCount} className="hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-3.5 font-bold text-slate-200">
                        {p.betsCount.toLocaleString()} paris
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300">
                        {p.totalVolume.toFixed(2)} {currency}
                      </td>
                      <td className="py-2.5 px-3.5 text-rose-400 font-semibold">
                        {p.expectedTheoProfit.toFixed(2)} {currency}
                      </td>
                      <td className={`py-2.5 px-3.5 font-bold ${p.expectedRealProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {p.expectedRealProfit >= 0 ? '+' : ''}{p.expectedRealProfit.toFixed(2)} {currency}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-400">
                        ±{p.marginOfError.toFixed(2)} {currency}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300">
                        [{p.confLow.toFixed(2)} ; +{p.confHigh.toFixed(2)}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Breakdown by Game & Multiplier Range */}
      {activeEvSubTab === 'breakdown' && (
        <div className="space-y-4">
          
          {/* Per-Game Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Espérance Mathématique par Jeu / Catégorie :</span>
            </span>

            {Object.keys(historicalEv.perGameEv).length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                    <tr>
                      <th className="py-2.5 px-3.5">Jeu</th>
                      <th className="py-2.5 px-3.5">Paris</th>
                      <th className="py-2.5 px-3.5">Volume Misé</th>
                      <th className="py-2.5 px-3.5">Taux Victoire</th>
                      <th className="py-2.5 px-3.5">Profit Réalisé</th>
                      <th className="py-2.5 px-3.5 text-emerald-400">EV Réelle (%)</th>
                      <th className="py-2.5 px-3.5 text-blue-400">EV Théorique (%)</th>
                      <th className="py-2.5 px-3.5 text-teal-400">Δ Chance (Edge)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {Object.entries(historicalEv.perGameEv).map(([game, g]) => (
                      <tr key={game} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3.5 font-bold uppercase text-slate-200">
                          {game}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-300">{g.bets}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{g.wagered.toFixed(2)} {currency}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{g.winRate.toFixed(1)}%</td>
                        <td className={`py-2.5 px-3.5 font-bold ${g.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {g.profit >= 0 ? '+' : ''}{g.profit.toFixed(4)} {currency}
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${g.realEvPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {g.realEvPct >= 0 ? '+' : ''}{g.realEvPct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-400">{g.theoEvPct.toFixed(2)}%</td>
                        <td className={`py-2.5 px-3.5 font-bold ${g.luckDelta >= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                          {g.luckDelta >= 0 ? '+' : ''}{g.luckDelta.toFixed(4)} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 p-4 bg-slate-950 rounded-xl border border-slate-800">
                Aucun pari enregistré dans l'historique pour le moment.
              </p>
            )}
          </div>

          {/* Per Multiplier Range Breakdown */}
          {Object.keys(historicalEv.perMultiplierRange).length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>Espérance Mathématique par Tranche de Multiplicateur :</span>
              </span>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                    <tr>
                      <th className="py-2.5 px-3.5">Palier de Risque</th>
                      <th className="py-2.5 px-3.5">Paris</th>
                      <th className="py-2.5 px-3.5">Volume Misé</th>
                      <th className="py-2.5 px-3.5">Taux Victoire</th>
                      <th className="py-2.5 px-3.5">Profit Total</th>
                      <th className="py-2.5 px-3.5 text-emerald-400">EV Réelle (%)</th>
                      <th className="py-2.5 px-3.5 text-teal-400">Δ Chance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {Object.entries(historicalEv.perMultiplierRange).map(([key, m]) => (
                      <tr key={key} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3.5 font-bold text-slate-200">{m.label}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{m.bets}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{m.wagered.toFixed(2)} {currency}</td>
                        <td className="py-2.5 px-3.5 text-slate-300">{m.winRate.toFixed(1)}%</td>
                        <td className={`py-2.5 px-3.5 font-bold ${m.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.profit >= 0 ? '+' : ''}{m.profit.toFixed(4)} {currency}
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${m.realEvPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.realEvPct >= 0 ? '+' : ''}{m.realEvPct.toFixed(2)}%
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${m.luckDelta >= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                          {m.luckDelta >= 0 ? '+' : ''}{m.luckDelta.toFixed(4)} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </motion.div>
  );
};
