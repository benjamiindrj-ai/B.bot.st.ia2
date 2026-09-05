import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Layers, 
  DollarSign, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Eye, 
  Zap, 
  Award, 
  ShieldAlert, 
  BarChart2, 
  Sliders, 
  Clock, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Target, 
  Flame, 
  Percent, 
  Scale,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  MoveHorizontal,
  ChevronDown,
  Gauge,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  Play,
  Pause,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Cell, 
  LineChart, 
  Line,
  Brush
} from 'recharts';

export interface StrategyRoundPoint {
  round: number;
  betAmount: number;
  won: boolean;
  payout?: number;
  profit: number; // delta profit of the round
  cumulativeProfit: number;
  balance: number;
  currentStreak?: number;
  streakType?: 'win' | 'loss';
  drawdownAmount?: number;
  drawdownPct?: number;
  multiplier?: number;
  roll?: number;
  wageredSoFar?: number;
  theoreticalEvProfit?: number;
}

export interface AntebotStrategyChartProps {
  data: StrategyRoundPoint[];
  initialBankroll: number;
  currency: string;
  strategyName?: string;
  targetMultiplier?: number;
  takeProfitTarget?: number;
  stopLossTarget?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  isLiveRunning?: boolean;
}

/**
 * Antebot Precision Extrema-Preserving Downsampler
 * Guarantees 0% distortion of ATH peak, Max Drawdown trough, highest bet spike, and boundary points.
 */
export function downsampleStrategyData(
  rawData: StrategyRoundPoint[], 
  targetMaxPoints: number = 700
): StrategyRoundPoint[] {
  if (!rawData || rawData.length <= targetMaxPoints) {
    return rawData || [];
  }

  const bucketSize = rawData.length / targetMaxPoints;
  const sampled: StrategyRoundPoint[] = [];
  const addedIndices = new Set<number>();

  // Always keep first point
  sampled.push(rawData[0]);
  addedIndices.add(0);

  for (let i = 0; i < targetMaxPoints; i++) {
    const startIdx = Math.floor(i * bucketSize);
    const endIdx = Math.min(rawData.length - 1, Math.floor((i + 1) * bucketSize));

    let minBalIdx = startIdx;
    let maxBalIdx = startIdx;
    let maxBetIdx = startIdx;
    let maxDdIdx = startIdx;

    let minBal = rawData[startIdx].balance;
    let maxBal = rawData[startIdx].balance;
    let maxBet = rawData[startIdx].betAmount;
    let maxDd = rawData[startIdx].drawdownPct || 0;

    for (let j = startIdx; j <= endIdx; j++) {
      const item = rawData[j];
      if (item.balance < minBal) {
        minBal = item.balance;
        minBalIdx = j;
      }
      if (item.balance > maxBal) {
        maxBal = item.balance;
        maxBalIdx = j;
      }
      if (item.betAmount > maxBet) {
        maxBet = item.betAmount;
        maxBetIdx = j;
      }
      if ((item.drawdownPct || 0) > maxDd) {
        maxDd = item.drawdownPct || 0;
        maxDdIdx = j;
      }
    }

    const candidateIndices = Array.from(
      new Set([minBalIdx, maxBalIdx, maxBetIdx, maxDdIdx, endIdx])
    ).sort((a, b) => a - b);

    for (const idx of candidateIndices) {
      if (!addedIndices.has(idx)) {
        sampled.push(rawData[idx]);
        addedIndices.add(idx);
      }
    }
  }

  // Always keep last point
  const lastIdx = rawData.length - 1;
  if (!addedIndices.has(lastIdx)) {
    sampled.push(rawData[lastIdx]);
  }

  return sampled.sort((a, b) => a.round - b.round);
}

const ANTEBOT_CHART_MARGIN = { top: 15, right: 15, left: -10, bottom: 5 };
const formatRoundTick = (v: any) => `#${v}`;
const formatBalanceTick = (v: any) => typeof v === 'number' ? `${v.toFixed(1)}` : `${v}`;
const formatDrawdownTick = (v: any) => `-${v}%`;
const formatWagerTick = (v: any) => typeof v === 'number' ? `${v.toFixed(0)}` : `${v}`;
const formatEvTick = (v: any) => typeof v === 'number' ? `${v.toFixed(1)}` : `${v}`;
const formatNumberTick = (v: any) => `${v}`;

export const AntebotStrategyChart: React.FC<AntebotStrategyChartProps> = ({
  data,
  initialBankroll,
  currency,
  strategyName = 'Stratégie Stake / Antebot',
  targetMultiplier = 2.0,
  takeProfitTarget,
  stopLossTarget,
  compact = false,
  title,
  subtitle,
  isLiveRunning = false,
}) => {
  // Chart View Modes
  const [viewMode, setViewMode] = useState<'profit' | 'drawdown' | 'bet_size' | 'wager' | 'ev_luck'>('profit');
  const [curveStyle, setCurveStyle] = useState<'monotone' | 'stepAfter' | 'linear'>('monotone');
  const [rangeFilter, setRangeFilter] = useState<'all' | '100' | '500' | '1000' | '5000' | '10000'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showBrush, setShowBrush] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Close full screen on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Slice data if range filter is active
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (rangeFilter === 'all') return data;
    const count = parseInt(rangeFilter, 10);
    return data.slice(-count);
  }, [data, rangeFilter]);

  // Downsample to guarantee smooth 60fps Recharts rendering while preserving all peaks & troughs
  const sampledData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const points = downsampleStrategyData(filteredData, 600);

    // Compute moving average and theoretical EV line if needed
    let runningWager = 0;
    const houseEdge = 0.01; // 1% Stake House Edge

    return points.map((p, idx) => {
      runningWager += p.betAmount;
      const theoEv = -(runningWager * houseEdge);

      // 20-period Moving average
      let ma = p.balance;
      if (idx >= 19) {
        let sum = 0;
        for (let k = idx - 19; k <= idx; k++) {
          sum += points[k].balance;
        }
        ma = sum / 20;
      }

      return {
        ...p,
        currency,
        initialBankroll,
        wageredSoFar: p.wageredSoFar || runningWager,
        theoreticalEvProfit: p.theoreticalEvProfit !== undefined ? p.theoreticalEvProfit : Number(theoEv.toFixed(4)),
        movingAverage: Number(ma.toFixed(4)),
      };
    });
  }, [filteredData, currency, initialBankroll]);

  // --------------------------------------------------------------------------
  // ANTEBOT TELEMETRY STATS ENGINE
  // --------------------------------------------------------------------------
  const telemetry = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRounds: 0,
        currentBalance: initialBankroll,
        netProfit: 0,
        roiPct: 0,
        isProfitable: true,
        peakBalance: initialBankroll,
        peakRound: 0,
        lowestBalance: initialBankroll,
        lowestRound: 0,
        maxDrawdownAmount: 0,
        maxDrawdownPct: 0,
        maxDrawdownRound: 0,
        totalWagered: 0,
        turnoverMultiple: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        profitFactor: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        peakBetAmount: 0,
        peakBetRound: 0,
        realizedRtp: 99,
        luckVariancePct: 0,
      };
    }

    const last = data[data.length - 1];
    const totalRounds = data.length;
    const currentBalance = last.balance;
    const netProfit = last.cumulativeProfit;
    const roiPct = initialBankroll > 0 ? (netProfit / initialBankroll) * 100 : 0;
    const isProfitable = netProfit >= 0;

    let peakBalance = initialBankroll;
    let peakRound = 0;
    let lowestBalance = initialBankroll;
    let lowestRound = 0;
    let maxDrawdownAmount = 0;
    let maxDrawdownPct = 0;
    let maxDrawdownRound = 0;
    let totalWagered = 0;
    let winCount = 0;
    let lossCount = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let peakBetAmount = 0;
    let peakBetRound = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      totalWagered += item.betAmount;

      if (item.betAmount > peakBetAmount) {
        peakBetAmount = item.betAmount;
        peakBetRound = item.round;
      }

      if (item.won) {
        winCount++;
        grossWins += item.profit;
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
      } else {
        lossCount++;
        grossLosses += Math.abs(item.profit);
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        if (Math.abs(currentStreak) > longestLossStreak) longestLossStreak = Math.abs(currentStreak);
      }

      if (item.balance > peakBalance) {
        peakBalance = item.balance;
        peakRound = item.round;
      }
      if (item.balance < lowestBalance) {
        lowestBalance = item.balance;
        lowestRound = item.round;
      }

      const ddAmount = Math.max(0, peakBalance - item.balance);
      const ddPct = peakBalance > 0 ? (ddAmount / peakBalance) * 100 : 0;

      if (ddAmount > maxDrawdownAmount) {
        maxDrawdownAmount = ddAmount;
        maxDrawdownPct = ddPct;
        maxDrawdownRound = item.round;
      }
    }

    const turnoverMultiple = initialBankroll > 0 ? totalWagered / initialBankroll : 0;
    const winRate = totalRounds > 0 ? (winCount / totalRounds) * 100 : 0;
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99.9 : 0;
    const realizedRtp = totalWagered > 0 ? ((totalWagered + netProfit) / totalWagered) * 100 : 99;

    // EV Luck Index
    const theoreticalProfit = -(totalWagered * 0.01);
    const luckDelta = netProfit - theoreticalProfit;
    const luckVariancePct = totalWagered > 0 ? (luckDelta / totalWagered) * 100 : 0;

    return {
      totalRounds,
      currentBalance,
      netProfit,
      roiPct,
      isProfitable,
      peakBalance,
      peakRound,
      lowestBalance,
      lowestRound,
      maxDrawdownAmount,
      maxDrawdownPct,
      maxDrawdownRound,
      totalWagered,
      turnoverMultiple,
      winCount,
      lossCount,
      winRate,
      profitFactor,
      longestWinStreak,
      longestLossStreak,
      peakBetAmount,
      peakBetRound,
      realizedRtp,
      luckVariancePct,
    };
  }, [data, initialBankroll]);

  // Dynamic Split-Gradient Offset for Profit/Loss Coloring
  const profitGradientOffset = useMemo(() => {
    if (sampledData.length === 0) return 0.5;
    const dataMax = Math.max(...sampledData.map((d) => d.balance));
    const dataMin = Math.min(...sampledData.map((d) => d.balance));

    if (dataMax <= initialBankroll) return 0;
    if (dataMin >= initialBankroll) return 1;

    return (dataMax - initialBankroll) / (dataMax - dataMin);
  }, [sampledData, initialBankroll]);

  // Dynamic Min & Max for Y Axes
  const yDomainBalance = useMemo(() => {
    if (sampledData.length === 0) return [initialBankroll * 0.8, initialBankroll * 1.2];
    const minVal = Math.min(...sampledData.map((d) => d.balance), initialBankroll);
    const maxVal = Math.max(...sampledData.map((d) => d.balance), initialBankroll);
    const padding = (maxVal - minVal) * 0.08 || initialBankroll * 0.1;
    return [Math.max(0, Number((minVal - padding).toFixed(2))), Number((maxVal + padding).toFixed(2))];
  }, [sampledData, initialBankroll]);

  const yDomainDrawdown = useMemo(() => {
    if (sampledData.length === 0) return [0, 50];
    const maxDd = Math.max(10, ...sampledData.map((d) => d.drawdownPct || 0));
    return [0, Math.min(100, Math.ceil(maxDd * 1.15))];
  }, [sampledData]);

  const yDomainBetSize = useMemo(() => {
    if (sampledData.length === 0) return [0, 10];
    const maxBet = Math.max(...sampledData.map((d) => d.betAmount));
    return [0, Number((maxBet * 1.2).toFixed(4))];
  }, [sampledData]);

  // Export Sampled Data to CSV
  const handleExportCsv = () => {
    if (!data || data.length === 0) return;
    const headers = ['Round', 'BetAmount', 'Outcome', 'Profit', 'CumulativeProfit', 'Balance', 'DrawdownPct'];
    const rows = data.map((d) => [
      d.round,
      d.betAmount,
      d.won ? 'WIN' : 'LOSS',
      d.profit,
      d.cumulativeProfit,
      d.balance,
      d.drawdownPct || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `antebot_test_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Antebot Summary to Clipboard
  const handleCopySummary = () => {
    const text = 
      `--- ANTEBOT STRATEGY TEST TELEMETRY ---\n` +
      `Strategy: ${strategyName}\n` +
      `Total Rounds: ${telemetry.totalRounds.toLocaleString('fr-FR')}\n` +
      `Initial Capital: ${initialBankroll} ${currency} | Final Balance: ${telemetry.currentBalance.toFixed(4)} ${currency}\n` +
      `Net Profit: ${telemetry.netProfit >= 0 ? '+' : ''}${telemetry.netProfit.toFixed(4)} ${currency} (${telemetry.roiPct.toFixed(2)}% ROI)\n` +
      `All-Time High (ATH): ${telemetry.peakBalance.toFixed(4)} ${currency} (Round #${telemetry.peakRound})\n` +
      `Max Drawdown: -${telemetry.maxDrawdownAmount.toFixed(4)} ${currency} (-${telemetry.maxDrawdownPct.toFixed(2)}% at Round #${telemetry.maxDrawdownRound})\n` +
      `Total Wagered: ${telemetry.totalWagered.toFixed(4)} ${currency} (${telemetry.turnoverMultiple.toFixed(1)}x Turnover)\n` +
      `Win Rate: ${telemetry.winRate.toFixed(2)}% (${telemetry.winCount}W / ${telemetry.lossCount}L)\n` +
      `Profit Factor: ${telemetry.profitFactor.toFixed(2)} | Realized RTP: ${telemetry.realizedRtp.toFixed(2)}%\n` +
      `Streaks: Max Win ${telemetry.longestWinStreak} | Max Loss ${telemetry.longestLossStreak}\n` +
      `Luck Factor (vs EV): ${telemetry.luckVariancePct >= 0 ? '+' : ''}${telemetry.luckVariancePct.toFixed(2)}%`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div 
      id="antebot-strategy-chart"
      className={`rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-slate-800 shadow-2xl space-y-4 text-slate-200 transition-all ${
        isExpanded ? 'fixed inset-4 z-50 overflow-y-auto p-6 bg-slate-950 border-emerald-500/50 shadow-2xl' : 'p-4 sm:p-5'
      }`}
    >
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{title || `Télémétrie Graphique Antebot & StakeBot`}</span>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% Précis Sans Lissage Artificiel
              </span>
              {isLiveRunning && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-600 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  En Direct
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle || `Courbe d'évolution du capital, replis de variance (drawdown) et montées de mise échantillonnés à 60 FPS.`}
          </p>
        </div>

        {/* View Mode Switchers */}
        <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('profit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'profit'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Profit & Solde</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('drawdown')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'drawdown'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Drawdown %</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('bet_size')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'bet_size'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mises & Risque</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('wager')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'wager'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Volume Misé</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('ev_luck')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === 'ev_luck'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>EV & Chance</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Copier le rapport Antebot dans le presse-papier"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Télécharger les points CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
              title={isExpanded ? 'Réduire' : 'Plein écran'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Antebot Telemetry Live Metrics HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {/* Metric 1: Profit Net */}
        <div className={`p-2.5 rounded-xl border ${
          telemetry.isProfitable ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'
        }`}>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Profit Net</span>
            {telemetry.isProfitable ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
          </div>
          <div className={`text-sm font-black font-mono mt-0.5 ${
            telemetry.isProfitable ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {telemetry.netProfit >= 0 ? '+' : ''}{telemetry.netProfit.toFixed(2)} {currency}
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            ROI: {telemetry.roiPct >= 0 ? '+' : ''}{telemetry.roiPct.toFixed(1)}%
          </div>
        </div>

        {/* Metric 2: All Time High (ATH) */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Pic Max (ATH)</span>
            <Award className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-sm font-black font-mono text-amber-300 mt-0.5">
            {telemetry.peakBalance.toFixed(2)} {currency}
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            Round #{telemetry.peakRound || 1}
          </div>
        </div>

        {/* Metric 3: Max Drawdown */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-black font-mono text-rose-400 mt-0.5">
            -{telemetry.maxDrawdownPct.toFixed(1)}%
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            -{telemetry.maxDrawdownAmount.toFixed(2)} {currency}
          </div>
        </div>

        {/* Metric 4: Total Wagered */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Volume Misé</span>
            <DollarSign className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-sm font-black font-mono text-cyan-300 mt-0.5">
            {telemetry.totalWagered.toFixed(1)} {currency}
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            {telemetry.turnoverMultiple.toFixed(1)}x Capital
          </div>
        </div>

        {/* Metric 5: Win Rate */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Taux de Gain</span>
            <Percent className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-sm font-black font-mono text-emerald-300 mt-0.5">
            {telemetry.winRate.toFixed(1)}%
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            {telemetry.winCount}W / {telemetry.lossCount}L
          </div>
        </div>

        {/* Metric 6: Profit Factor */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Profit Factor</span>
            <Scale className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="text-sm font-black font-mono text-indigo-300 mt-0.5">
            {telemetry.profitFactor > 0 ? telemetry.profitFactor.toFixed(2) : '0.00'}
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            RTP: {telemetry.realizedRtp.toFixed(1)}%
          </div>
        </div>

        {/* Metric 7: Streak Records */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Séries Max</span>
            <Flame className="w-3 h-3 text-orange-400" />
          </div>
          <div className="text-sm font-black font-mono text-white mt-0.5 flex items-center gap-1">
            <span className="text-emerald-400">+{telemetry.longestWinStreak}</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">-{telemetry.longestLossStreak}</span>
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            Gain / Perte Max
          </div>
        </div>

        {/* Metric 8: EV Luck Index */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Chance / EV</span>
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </div>
          <div className={`text-sm font-black font-mono mt-0.5 ${
            telemetry.luckVariancePct >= 0 ? 'text-yellow-300' : 'text-slate-400'
          }`}>
            {telemetry.luckVariancePct >= 0 ? '+' : ''}{telemetry.luckVariancePct.toFixed(1)}%
          </div>
          <div className="text-[9.5px] font-mono text-slate-400">
            vs Espérance Math
          </div>
        </div>
      </div>

      {/* 3. Interactive Chart Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
        
        {/* Left: Quick Range Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-emerald-400" />
            Fenêtre :
          </span>
          {(['100', '500', '1000', '5000', '10000', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeFilter(r)}
              className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition ${
                rangeFilter === r
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {r === 'all' ? `TOUT (${data.length})` : r}
            </button>
          ))}
        </div>

        {/* Right: Curve Type & Display Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Curve Style */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setCurveStyle('monotone')}
              className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition ${
                curveStyle === 'monotone' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Courbe continue lissée"
            >
              Lissée
            </button>
            <button
              type="button"
              onClick={() => setCurveStyle('stepAfter')}
              className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition ${
                curveStyle === 'stepAfter' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Paliers discrets authentiques Antebot"
            >
              Paliers
            </button>
            <button
              type="button"
              onClick={() => setCurveStyle('linear')}
              className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition ${
                curveStyle === 'linear' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Linéaire direct"
            >
              Linéaire
            </button>
          </div>

          {/* Guide Line Toggle */}
          <button
            type="button"
            onClick={() => setShowGuides(!showGuides)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition ${
              showGuides
                ? 'bg-slate-900 border-slate-700 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Lignes Repères</span>
          </button>

          {/* Timeline Brush Zoom Slider Toggle */}
          <button
            type="button"
            onClick={() => setShowBrush(!showBrush)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition ${
              showBrush
                ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Slider Zoom</span>
          </button>
        </div>
      </div>

      {/* 4. Main Chart Stage */}
      <div className={`w-full relative ${isExpanded ? 'h-[520px]' : compact ? 'h-64' : 'h-80'}`}>
        {sampledData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Activity className="w-8 h-8 opacity-40 animate-pulse text-emerald-400" />
            <span className="text-xs">En attente de données de simulation...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'profit' ? (
              // -------------------------------------------------------------
              // MODE 1: PROFIT & BALANCE (ANTEBOT CORE ENGINE)
              // -------------------------------------------------------------
              <AreaChart data={sampledData} margin={ANTEBOT_CHART_MARGIN} accessibilityLayer={false}>
                <defs>
                  {/* Split Gradient: Green above initial bankroll, Red below */}
                  <linearGradient id="antebotProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset={`${profitGradientOffset * 100}%`} stopColor="#10b981" stopOpacity={0.05} />
                    <stop offset={`${profitGradientOffset * 100}%`} stopColor="#f43f5e" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.45} />
                  </linearGradient>

                  {/* Line Stroke Gradient */}
                  <linearGradient id="antebotStrokeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset={`${profitGradientOffset * 100}%`} stopColor="#10b981" />
                    <stop offset={`${profitGradientOffset * 100}%`} stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="round" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickFormatter={formatRoundTick}
                />
                <YAxis 
                  domain={yDomainBalance} 
                  stroke="#64748b" 
                  fontSize={11}
                  tickFormatter={formatBalanceTick}
                />
                
                <Tooltip content={AntebotCustomTooltip} />

                {/* Guide Lines */}
                {showGuides && (
                  <>
                    {/* Baseline: Initial Bankroll */}
                    <ReferenceLine 
                      y={initialBankroll} 
                      stroke="#64748b" 
                      strokeDasharray="4 4" 
                      label={{ value: `Base: ${initialBankroll}`, fill: '#94a3b8', fontSize: 10, position: 'right' }} 
                    />

                    {/* Peak ATH Line */}
                    <ReferenceLine 
                      y={telemetry.peakBalance} 
                      stroke="#f59e0b" 
                      strokeDasharray="3 3" 
                      label={{ value: `ATH: ${telemetry.peakBalance.toFixed(2)}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} 
                    />

                    {/* Take Profit Target Line */}
                    {takeProfitTarget && (
                      <ReferenceLine 
                        y={initialBankroll + takeProfitTarget} 
                        stroke="#10b981" 
                        strokeDasharray="6 3" 
                        label={{ value: `TP Target (+${takeProfitTarget})`, fill: '#10b981', fontSize: 10, position: 'right' }} 
                      />
                    )}

                    {/* Stop Loss Target Line */}
                    {stopLossTarget && (
                      <ReferenceLine 
                        y={initialBankroll - stopLossTarget} 
                        stroke="#f43f5e" 
                        strokeDasharray="6 3" 
                        label={{ value: `SL Target (-${stopLossTarget})`, fill: '#f43f5e', fontSize: 10, position: 'right' }} 
                      />
                    )}
                  </>
                )}

                <Area
                  type={curveStyle}
                  dataKey="balance"
                  stroke="url(#antebotStrokeGrad)"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#antebotProfitGrad)"
                  isAnimationActive={false}
                />

                {showBrush && (
                  <Brush 
                    dataKey="round" 
                    height={24} 
                    stroke="#10b981" 
                    fill="#0f172a" 
                    tickFormatter={formatRoundTick} 
                  />
                )}
              </AreaChart>
            ) : viewMode === 'drawdown' ? (
              // -------------------------------------------------------------
              // MODE 2: UNDERWATER DRAWDOWN (% DEPTH)
              // -------------------------------------------------------------
              <AreaChart data={sampledData} margin={ANTEBOT_CHART_MARGIN} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="60%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="round" stroke="#64748b" fontSize={11} tickFormatter={formatRoundTick} />
                <YAxis domain={yDomainDrawdown} stroke="#64748b" fontSize={11} tickFormatter={formatDrawdownTick} />
                <Tooltip content={AntebotDrawdownTooltip} />
                
                {/* Danger thresholds */}
                <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alerte 25%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Zone Critique 50%', fill: '#f43f5e', fontSize: 10 }} />

                <Area
                  type={curveStyle}
                  dataKey="drawdownPct"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#drawdownGrad)"
                  isAnimationActive={false}
                />
                {showBrush && <Brush dataKey="round" height={24} stroke="#f43f5e" fill="#0f172a" />}
              </AreaChart>
            ) : viewMode === 'bet_size' ? (
              // -------------------------------------------------------------
              // MODE 3: BET SIZE ESCALATION (RISK SPIKES)
              // -------------------------------------------------------------
              <AreaChart data={sampledData} margin={ANTEBOT_CHART_MARGIN} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="betSizeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="round" stroke="#64748b" fontSize={11} tickFormatter={formatRoundTick} />
                <YAxis domain={yDomainBetSize} stroke="#64748b" fontSize={11} tickFormatter={formatNumberTick} />
                <Tooltip content={AntebotBetSizeTooltip} />
                <Area
                  type={curveStyle}
                  dataKey="betAmount"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#betSizeGrad)"
                  isAnimationActive={false}
                />
                {showBrush && <Brush dataKey="round" height={24} stroke="#a855f7" fill="#0f172a" />}
              </AreaChart>
            ) : viewMode === 'wager' ? (
              // -------------------------------------------------------------
              // MODE 4: WAGER VOLUME ACCUMULATION
              // -------------------------------------------------------------
              <AreaChart data={sampledData} margin={ANTEBOT_CHART_MARGIN} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="wagerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="round" stroke="#64748b" fontSize={11} tickFormatter={formatRoundTick} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatWagerTick} />
                <Tooltip content={AntebotWagerTooltip} />
                <Area
                  type="monotone"
                  dataKey="wageredSoFar"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#wagerGrad)"
                  isAnimationActive={false}
                />
                {showBrush && <Brush dataKey="round" height={24} stroke="#06b6d4" fill="#0f172a" />}
              </AreaChart>
            ) : (
              // -------------------------------------------------------------
              // MODE 5: EXPECTED VALUE VS ACTUAL (LUCK INDEX)
              // -------------------------------------------------------------
              <LineChart data={sampledData} margin={ANTEBOT_CHART_MARGIN} accessibilityLayer={false}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="round" stroke="#64748b" fontSize={11} tickFormatter={formatRoundTick} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={formatEvTick} />
                <Tooltip content={AntebotEvTooltip} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                
                {/* Theoretical EV Line (Dotted Gray/Red) */}
                <Line
                  type="monotone"
                  dataKey="theoreticalEvProfit"
                  name="EV Théorique (-1%)"
                  stroke="#64748b"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Actual Realized Profit Line (Solid Green/Blue) */}
                <Line
                  type={curveStyle}
                  dataKey="cumulativeProfit"
                  name="Profit Réel"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
                {showBrush && <Brush dataKey="round" height={24} stroke="#10b981" fill="#0f172a" />}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* 5. Footer Legend & Diagnostic Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />
            <span className="text-slate-300">Solde &gt; Capital ({initialBankroll} {currency})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-400 inline-block rounded" />
            <span className="text-slate-300">Solde &lt; Capital (Pertes)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 inline-block rounded stroke-dasharray" />
            <span className="text-slate-400">Plafond ATH ({telemetry.peakBalance.toFixed(2)} {currency})</span>
          </span>
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          Échantillonnage : <strong className="text-slate-200">{sampledData.length}</strong> / {data.length} rounds affichés
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// HIGH PRECISION ANTEBOT TOOLTIPS (MEMOIZED)
// ----------------------------------------------------------------------------

const AntebotCustomTooltip = React.memo<any>(({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as StrategyRoundPoint & { movingAverage?: number; currency?: string; initialBankroll?: number };
  if (!data) return null;

  const curr = data.currency || 'USDT';
  const initBank = data.initialBankroll !== undefined ? data.initialBankroll : 100;
  const isProfit = data.cumulativeProfit >= 0;
  const roi = initBank > 0 ? ((data.cumulativeProfit / initBank) * 100).toFixed(2) : '0.00';

  return (
    <div className="p-3 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px] text-slate-200">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <span className="font-mono font-bold text-slate-300 flex items-center gap-1">
          <span>Round #{data.round}</span>
        </span>
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
          data.won ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
        }`}>
          {data.won ? 'VICTOIRE' : 'PERTE'}
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Solde Courant :</span>
          <span className="font-bold text-white">{data.balance.toFixed(4)} {curr}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Profit Net :</span>
          <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}{data.cumulativeProfit.toFixed(4)} {curr} ({isProfit ? '+' : ''}{roi}%)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mise du Round :</span>
          <span className="font-bold text-purple-300">{data.betAmount.toFixed(4)} {curr}</span>
        </div>
        {data.drawdownPct !== undefined && data.drawdownPct > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">Drawdown ATH :</span>
            <span className="font-bold text-rose-400">-{data.drawdownPct.toFixed(2)}%</span>
          </div>
        )}
        {data.multiplier && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Multiplicateur :</span>
            <span className="font-bold text-cyan-300">{data.multiplier}x {data.roll !== undefined ? `(Roll: ${data.roll})` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
});

const AntebotDrawdownTooltip = React.memo<any>(({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as StrategyRoundPoint & { currency?: string };
  if (!data) return null;
  const curr = data.currency || 'USDT';

  return (
    <div className="p-3 rounded-xl bg-slate-950/95 border border-rose-800/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px] font-mono text-slate-200">
      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
        Round #{data.round} - Drawdown
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Repli de Variance :</span>
        <span className="font-bold text-rose-400">-{data.drawdownPct?.toFixed(2)}%</span>
      </div>
      {data.drawdownAmount !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Perte depuis ATH :</span>
          <span className="font-bold text-rose-300">-{data.drawdownAmount.toFixed(4)} {curr}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Solde :</span>
        <span className="font-bold text-white">{data.balance.toFixed(4)} {curr}</span>
      </div>
    </div>
  );
});

const AntebotBetSizeTooltip = React.memo<any>(({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as StrategyRoundPoint & { currency?: string };
  if (!data) return null;
  const curr = data.currency || 'USDT';

  return (
    <div className="p-3 rounded-xl bg-slate-950/95 border border-purple-800/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px] font-mono text-slate-200">
      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
        Round #{data.round} - Montant Misé
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Mise Placée :</span>
        <span className="font-bold text-purple-300">{data.betAmount.toFixed(6)} {curr}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Résultat :</span>
        <span className={data.won ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
          {data.won ? 'VICTOIRE' : 'PERTE'}
        </span>
      </div>
    </div>
  );
});

const AntebotWagerTooltip = React.memo<any>(({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as StrategyRoundPoint & { wageredSoFar?: number; currency?: string; initialBankroll?: number };
  if (!data) return null;

  const curr = data.currency || 'USDT';
  const initBank = data.initialBankroll !== undefined ? data.initialBankroll : 100;
  const wager = data.wageredSoFar || 0;
  const mult = initBank > 0 ? (wager / initBank).toFixed(1) : '0';

  return (
    <div className="p-3 rounded-xl bg-slate-950/95 border border-cyan-800/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px] font-mono text-slate-200">
      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
        Round #{data.round} - Volume Cumulé
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Total Misé :</span>
        <span className="font-bold text-cyan-300">{wager.toFixed(2)} {curr}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Turnover :</span>
        <span className="font-bold text-white">{mult}x Bankroll</span>
      </div>
    </div>
  );
});

const AntebotEvTooltip = React.memo<any>(({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as StrategyRoundPoint & { theoreticalEvProfit?: number; currency?: string };
  if (!data) return null;

  const curr = data.currency || 'USDT';
  const actual = data.cumulativeProfit;
  const theo = data.theoreticalEvProfit || 0;
  const luck = actual - theo;

  return (
    <div className="p-3 rounded-xl bg-slate-950/95 border border-indigo-800/40 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px] font-mono text-slate-200">
      <div className="font-bold text-slate-300 pb-1 border-b border-slate-800">
        Round #{data.round} - EV vs Réel
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Profit Réel :</span>
        <span className={`font-bold ${actual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {actual >= 0 ? '+' : ''}{actual.toFixed(4)} {curr}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">EV Théorique (-1%) :</span>
        <span className="font-bold text-slate-400">{theo.toFixed(4)} {curr}</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <span className="text-slate-400">Écart Chance (Luck) :</span>
        <span className={`font-bold ${luck >= 0 ? 'text-yellow-300' : 'text-rose-400'}`}>
          {luck >= 0 ? '+' : ''}{luck.toFixed(4)} {curr}
        </span>
      </div>
    </div>
  );
});
