import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  SlidersHorizontal, 
  Clock, 
  Activity, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Layers,
  Award,
  Zap,
  RotateCcw,
  Play,
  Percent,
  DollarSign,
  ShieldAlert
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
  Legend, 
  Brush 
} from 'recharts';
import { BetResult } from '../types';

export interface SimulatedBalanceLineChartProps {
  bets: BetResult[];
  currency: string;
  strategyName?: string;
  startingBalance?: number;
  currentBalance?: number;
}

export const SimulatedBalanceLineChart: React.FC<SimulatedBalanceLineChartProps> = ({
  bets,
  currency,
  strategyName,
  startingBalance = 100,
  currentBalance,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [sliceCount, setSliceCount] = useState<'all' | '25' | '50' | '100' | '250' | '500'>('all');
  const [curveType, setCurveType] = useState<'monotone' | 'stepAfter' | 'linear'>('monotone');
  const [metricMode, setMetricMode] = useState<'balance' | 'roi' | 'profit' | 'dual'>('balance');
  const [renderType, setRenderType] = useState<'line' | 'area'>('area');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showStartingBaseline, setShowStartingBaseline] = useState(true);
  const [showAthLine, setShowAthLine] = useState(true);
  const [showBrush, setShowBrush] = useState(false);
  const [axisMode, setAxisMode] = useState<'index' | 'time'>('index');
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [animationDuration, setAnimationDuration] = useState<number>(1200);

  // Trigger animation replay
  const handleReplayAnimation = () => {
    setAnimationKey((prev) => prev + 1);
  };

  // Close on Escape key when expanded
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Compute effective initial balance from earliest bet or fallback to dynamic starting balance
  const effectiveStartingBalance = useMemo(() => {
    if (bets.length > 0) {
      const oldestBet = bets[bets.length - 1];
      if (oldestBet && oldestBet.runningBalance !== undefined && oldestBet.profit !== undefined) {
        return Number((oldestBet.runningBalance - oldestBet.profit).toFixed(4));
      }
    }
    return startingBalance;
  }, [bets, startingBalance]);

  // Compute processed chart points with cumulative performance
  const chartData = useMemo(() => {
    if (bets.length === 0) return [];

    // Filter by slice count if needed
    let workingBets = bets;
    if (sliceCount !== 'all') {
      const count = parseInt(sliceCount, 10);
      workingBets = bets.slice(-count);
    }

    // Sort chronologically
    const sorted = [...workingBets].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Calculate 10-period Simple Moving Average
    const maWindow = 10;

    let cumulativeProfitRunning = 0;

    return sorted.map((b, idx, arr) => {
      const dateObj = new Date(b.timestamp || Date.now());
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const fullDateTime = `${dateObj.toLocaleDateString()} ${timeStr}`;

      // Calculate SMA
      let smaVal: number | undefined = undefined;
      if (idx >= maWindow - 1) {
        const windowSlice = arr.slice(idx - maWindow + 1, idx + 1);
        const sum = windowSlice.reduce((acc, curr) => acc + curr.runningBalance, 0);
        smaVal = Number((sum / maWindow).toFixed(4));
      }

      const bal = Number(b.runningBalance.toFixed(4));
      const deltaFromStart = Number((bal - effectiveStartingBalance).toFixed(4));
      const roiPct = effectiveStartingBalance > 0 ? Number(((deltaFromStart / effectiveStartingBalance) * 100).toFixed(2)) : 0;
      cumulativeProfitRunning += b.profit;

      return {
        id: b.id,
        betNumber: b.betNumber || idx + 1,
        betIndex: idx + 1,
        timestamp: b.timestamp,
        time: timeStr,
        fullDateTime,
        balance: bal,
        sma: smaVal,
        profit: Number(b.profit.toFixed(4)),
        cumulativeProfit: Number(cumulativeProfitRunning.toFixed(4)),
        betAmount: Number(b.betAmount.toFixed(4)),
        won: b.won,
        game: b.game,
        multiplier: b.payoutMultiplier,
        targetMultiplier: b.targetMultiplier,
        strategyName: strategyName || 'Stratégie Active',
        deltaFromStart,
        roiPct,
      };
    });
  }, [bets, sliceCount, effectiveStartingBalance, strategyName]);

  // Overall Statistics from chartData
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      const activeCurrent = currentBalance !== undefined ? currentBalance : effectiveStartingBalance;
      return {
        current: activeCurrent,
        peak: activeCurrent,
        lowest: activeCurrent,
        totalChange: 0,
        roi: 0,
        maxDrawdownFromPeak: 0,
        isProfitable: true,
        peakRoi: 0,
        lowestRoi: 0,
      };
    }

    const balances = chartData.map((d) => d.balance);
    const current = currentBalance !== undefined ? currentBalance : chartData[chartData.length - 1].balance;
    const peak = Math.max(...balances, effectiveStartingBalance);
    const lowest = Math.min(...balances, effectiveStartingBalance);
    const totalChange = Number((current - effectiveStartingBalance).toFixed(4));
    const roi = effectiveStartingBalance > 0 ? Number(((totalChange / effectiveStartingBalance) * 100).toFixed(2)) : 0;
    const maxDrawdownFromPeak = peak > 0 ? Number((((peak - lowest) / peak) * 100).toFixed(2)) : 0;

    const rois = chartData.map((d) => d.roiPct);
    const peakRoi = Math.max(...rois, 0);
    const lowestRoi = Math.min(...rois, 0);

    return {
      current,
      peak,
      lowest,
      totalChange,
      roi,
      maxDrawdownFromPeak,
      isProfitable: totalChange >= 0,
      peakRoi,
      lowestRoi,
    };
  }, [chartData, currentBalance, effectiveStartingBalance]);

  // Gradient offset calculation for dynamic split area fill (Green in profit / Red in drawdown)
  const gradientOffset = useMemo(() => {
    if (chartData.length === 0) return 0.5;
    if (metricMode === 'roi') {
      const dataMax = Math.max(...chartData.map((i) => i.roiPct), 0);
      const dataMin = Math.min(...chartData.map((i) => i.roiPct), 0);
      if (dataMax <= 0) return 0;
      if (dataMin >= 0) return 1;
      return dataMax / (dataMax - dataMin);
    } else {
      const dataMax = Math.max(...chartData.map((i) => i.balance), effectiveStartingBalance);
      const dataMin = Math.min(...chartData.map((i) => i.balance), effectiveStartingBalance);
      if (dataMax <= effectiveStartingBalance) return 0;
      if (dataMin >= effectiveStartingBalance) return 1;
      return (dataMax - effectiveStartingBalance) / (dataMax - dataMin);
    }
  }, [chartData, effectiveStartingBalance, metricMode]);

  // Custom Tooltip for the Simulated Balance Curve
  const CustomBalanceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.deltaFromStart >= 0;
      const isBetWin = data.won;

      return (
        <div className="bg-slate-950/95 border border-cyan-500/40 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[260px] pointer-events-none z-50 animate-in fade-in duration-150">
          
          {/* Header with Bet # & Time */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>{data.fullDateTime}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
              Pari #{data.betNumber}
            </span>
          </div>

          {/* Strategy Name Badge */}
          {data.strategyName && (
            <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/20 px-2 py-1 rounded-lg text-[11px]">
              <span className="text-cyan-300/80 text-[10px] uppercase font-bold">Stratégie :</span>
              <span className="font-bold text-cyan-200 truncate max-w-[150px]">{data.strategyName}</span>
            </div>
          )}

          <div className="space-y-1.5 text-[11px]">
            {/* Simulated Balance */}
            <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                Solde Simulé :
              </span>
              <span className="font-mono font-bold text-sm text-cyan-300">
                {data.balance.toFixed(4)} {currency}
              </span>
            </div>

            {/* Performance Cumulée (ROI %) */}
            <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                Performance Cumulée :
              </span>
              <span className={`font-mono font-bold text-xs flex items-center gap-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isPositive ? '+' : ''}{data.roiPct}% ({isPositive ? '+' : ''}{data.deltaFromStart.toFixed(4)} {currency})
              </span>
            </div>

            {/* Bet Amount (Montant Misé) */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Montant Misé :</span>
              <span className="font-mono font-bold text-slate-100">{data.betAmount} {currency}</span>
            </div>

            {/* Multiplier Target vs Achieved */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Multiplicateur :</span>
              <span className="font-mono font-semibold text-amber-300">
                {data.multiplier !== undefined ? `${data.multiplier.toFixed(2)}x` : '-'}
                {data.targetMultiplier && (
                  <span className="text-slate-500 text-[10px] ml-1">(visé: {data.targetMultiplier}x)</span>
                )}
              </span>
            </div>

            {/* Net profit for this bet */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Profit Net du Tirage :</span>
              <span className={`font-mono font-bold ${isBetWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBetWin ? `+${data.profit.toFixed(4)}` : `-${data.betAmount.toFixed(4)}`} {currency}
              </span>
            </div>

            {/* Game Badge & Outcome */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="uppercase text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                {data.game}
              </span>
              <span className={`font-extrabold px-1.5 py-0.2 rounded uppercase ${
                isBetWin 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isBetWin ? '✓ GAGNÉ' : '✗ PERDU'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Dark backdrop overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 animate-in fade-in duration-200" 
          onClick={() => setIsExpanded(false)}
        />
      )}

      <motion.div 
        id="simulated-balance-line-chart-panel"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`transition-all duration-300 ${
          isExpanded 
            ? 'fixed inset-2 sm:inset-6 z-50 bg-slate-900/98 border border-cyan-500/50 shadow-2xl p-4 sm:p-6 overflow-y-auto flex flex-col justify-between backdrop-blur-xl rounded-2xl ring-1 ring-cyan-500/30' 
            : 'bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4'
        }`}
      >
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Wallet className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Courbe de Performance Cumulée & Solde Simulé</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                {chartData.length} tirages
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" />
                <span>Animation Progressive</span>
              </span>
              {isExpanded && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono uppercase tracking-wider">
                  Mode Plein Écran
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Progression dynamique du capital simulé et de la rentabilité cumulée en direct ({currency})
            </p>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            
            {/* Metric Mode Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setMetricMode('balance')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  metricMode === 'balance' ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Afficher le solde absolu"
              >
                <Wallet className="w-3 h-3" />
                <span>Solde</span>
              </button>

              <button
                type="button"
                onClick={() => setMetricMode('roi')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  metricMode === 'roi' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Afficher le rendement cumulé (%)"
              >
                <Percent className="w-3 h-3" />
                <span>ROI %</span>
              </button>

              <button
                type="button"
                onClick={() => setMetricMode('dual')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  metricMode === 'dual' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Double axe : Solde + ROI %"
              >
                <Layers className="w-3 h-3" />
                <span>Double</span>
              </button>
            </div>

            {/* Render Type (Line vs Area Fill) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setRenderType('area')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  renderType === 'area' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Remplissage en dégradé progressif"
              >
                Aire
              </button>
              <button
                type="button"
                onClick={() => setRenderType('line')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  renderType === 'line' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tracé linéaire simple"
              >
                Ligne
              </button>
            </div>

            {/* Slice Count Horizon */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              {([
                { key: '25', label: '25' },
                { key: '50', label: '50' },
                { key: '100', label: '100' },
                { key: '250', label: '250' },
                { key: 'all', label: 'Tout' },
              ] as const).map(({ key, label }) => (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSliceCount(key)}
                  className={`px-2 py-0.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                    sliceCount === key
                      ? 'bg-slate-800 text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {/* Curve Type Selector (Monotone / Step / Linear) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCurveType('monotone')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  curveType === 'monotone' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Courbe lissée"
              >
                Lisse
              </button>
              <button
                type="button"
                onClick={() => setCurveType('stepAfter')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  curveType === 'stepAfter' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Paliers discrets"
              >
                Paliers
              </button>
            </div>

            {/* Replay Progressive Animation Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleReplayAnimation}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
              title="Rejouer l'animation de tracé et de remplissage"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Rejouer</span>
            </motion.button>

            {/* Agrandir / Plein Écran Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isExpanded
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 border-slate-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40'
              }`}
              title={isExpanded ? "Réduire l'affichage (Échap)" : "Agrandir en plein écran"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isExpanded ? 'Réduire' : 'Agrandir'}</span>
            </motion.button>

          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
          {/* Current Balance */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Solde Actuel</span>
              <Wallet className="w-3 h-3 text-cyan-400" />
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-cyan-300">
                {stats.current.toFixed(4)} {currency}
              </span>
            </div>
            <span className={`text-[10px] font-mono font-semibold mt-0.5 ${stats.isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.isProfitable ? '+' : ''}{stats.totalChange.toFixed(4)} ({stats.isProfitable ? '+' : ''}{stats.roi}%)
            </span>
          </div>

          {/* Initial Balance */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Solde Départ</span>
              <Target className="w-3 h-3 text-slate-400" />
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-slate-200">
                {effectiveStartingBalance.toFixed(4)} {currency}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Ligne de base (Break-even)
            </span>
          </div>

          {/* Cumulative ROI % */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Performance Cumulée</span>
              <Percent className="w-3 h-3 text-emerald-400" />
            </span>
            <div className="mt-1">
              <span className={`text-base sm:text-lg font-bold font-mono ${stats.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono font-semibold mt-0.5">
              Pic : +{stats.peakRoi.toFixed(2)}%
            </span>
          </div>

          {/* Peak Bankroll (ATH) */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Pic Maximal (ATH)</span>
              <Award className="w-3 h-3 text-amber-400" />
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                {stats.peak.toFixed(4)} {currency}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Record de session
            </span>
          </div>

          {/* Max Drawdown */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Recul depuis Pic</span>
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-rose-400">
                -{stats.maxDrawdownFromPeak.toFixed(1)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Drawdown relatif
            </span>
          </div>

        </div>

        {/* Main Recharts Chart Area with Smooth Fade-in and Filling Transitions */}
        <div className={`w-full pt-1 relative transition-all duration-300 ${isExpanded ? 'h-[460px] sm:h-[580px] lg:h-[650px]' : 'h-80'}`}>
          <AnimatePresence mode="wait">
            {chartData.length > 0 ? (
              <motion.div
                key={`sim-bal-chart-${animationKey}-${curveType}-${sliceCount}-${axisMode}-${metricMode}-${renderType}-${showMovingAverage}`}
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  {renderType === 'area' && metricMode !== 'dual' ? (
                    <AreaChart data={chartData} margin={{ top: 12, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        {/* Dynamic Split gradient for progressive area fill */}
                        <linearGradient id="splitPerformanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                          <stop offset={`${Math.min(Math.max(gradientOffset * 100, 5), 95)}%`} stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset={`${Math.min(Math.max(gradientOffset * 100, 5), 95)}%`} stopColor="#f43f5e" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.65} />
                        </linearGradient>

                        {/* Positive Glowing Gradient */}
                        <linearGradient id="areaGlowGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      
                      <XAxis 
                        dataKey={axisMode === 'time' ? 'time' : 'betNumber'} 
                        stroke="#64748b" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        minTickGap={25}
                        tickFormatter={(val) => axisMode === 'index' ? `#${val}` : val}
                      />
                      
                      <YAxis 
                        stroke="#64748b" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => metricMode === 'roi' ? `${Number(val).toFixed(1)}%` : Number(val).toFixed(2)}
                      />

                      {/* Starting Baseline Reference Line */}
                      {showStartingBaseline && (
                        <ReferenceLine 
                          y={metricMode === 'roi' ? 0 : effectiveStartingBalance} 
                          stroke="#64748b" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ 
                            value: metricMode === 'roi' ? '0.00% (Départ)' : `Départ (${effectiveStartingBalance.toFixed(2)})`, 
                            fill: '#94a3b8', 
                            fontSize: 10, 
                            position: 'insideTopLeft' 
                          }} 
                        />
                      )}

                      {/* Peak Reference Line */}
                      {showAthLine && (
                        <ReferenceLine 
                          y={metricMode === 'roi' ? stats.peakRoi : stats.peak} 
                          stroke="#10b981" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                          label={{ 
                            value: metricMode === 'roi' ? `ATH +${stats.peakRoi.toFixed(2)}%` : `ATH +${stats.peak.toFixed(2)}`, 
                            fill: '#10b981', 
                            fontSize: 10, 
                            position: 'insideTopRight' 
                          }} 
                        />
                      )}

                      <Tooltip content={<CustomBalanceTooltip />} />

                      {/* Area Chart with progressive fade-in and smooth filling transition */}
                      <Area
                        type={curveType}
                        dataKey={metricMode === 'roi' ? 'roiPct' : 'balance'}
                        name={metricMode === 'roi' ? 'Performance Cumulée (%)' : `Solde Simulé (${currency})`}
                        stroke={stats.isProfitable ? '#10b981' : '#06b6d4'}
                        strokeWidth={2.5}
                        fill="url(#splitPerformanceGrad)"
                        dot={chartData.length <= 25 ? { r: 3.5, fill: '#06b6d4', strokeWidth: 1 } : false}
                        activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={animationDuration}
                        animationEasing="ease-out"
                        animationBegin={100}
                      />

                      {(chartData.length > 30 && (showBrush || isExpanded)) && (
                        <Brush 
                          dataKey={axisMode === 'time' ? 'time' : 'betNumber'} 
                          height={28} 
                          stroke="#06b6d4" 
                          fill="#0f172a" 
                        />
                      )}
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 12, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="balanceLineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      
                      <XAxis 
                        dataKey={axisMode === 'time' ? 'time' : 'betNumber'} 
                        stroke="#64748b" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        minTickGap={25}
                        tickFormatter={(val) => axisMode === 'index' ? `#${val}` : val}
                      />
                      
                      <YAxis 
                        yAxisId="left"
                        stroke="#64748b" 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => Number(val).toFixed(2)}
                      />

                      {metricMode === 'dual' && (
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#10b981" 
                          tick={{ fontSize: 11, fill: '#10b981' }} 
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `${Number(val).toFixed(1)}%`}
                        />
                      )}

                      {/* Starting Balance Break-even Reference Line */}
                      {showStartingBaseline && (
                        <ReferenceLine 
                          yAxisId="left"
                          y={effectiveStartingBalance} 
                          stroke="#64748b" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ 
                            value: `Départ (${effectiveStartingBalance.toFixed(2)})`, 
                            fill: '#94a3b8', 
                            fontSize: 10, 
                            position: 'insideTopLeft' 
                          }} 
                        />
                      )}

                      {/* Peak Balance Reference Line */}
                      {showAthLine && stats.peak > effectiveStartingBalance && (
                        <ReferenceLine 
                          yAxisId="left"
                          y={stats.peak} 
                          stroke="#10b981" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                          label={{ 
                            value: `ATH +${stats.peak.toFixed(2)}`, 
                            fill: '#10b981', 
                            fontSize: 10, 
                            position: 'insideTopRight' 
                          }} 
                        />
                      )}

                      <Tooltip content={<CustomBalanceTooltip />} />

                      {/* Moving Average Line */}
                      {showMovingAverage && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sma"
                          name="Moyenne Mobile SMA(10)"
                          stroke="#f59e0b"
                          strokeWidth={1.75}
                          strokeDasharray="4 4"
                          dot={false}
                          activeDot={{ r: 4, fill: '#f59e0b' }}
                          isAnimationActive={true}
                          animationDuration={animationDuration}
                          animationEasing="ease-out"
                        />
                      )}

                      {/* Main Simulated Balance Line */}
                      {(metricMode === 'balance' || metricMode === 'dual') && (
                        <Line
                          yAxisId="left"
                          type={curveType}
                          dataKey="balance"
                          name={`Solde Simulé (${currency})`}
                          stroke="url(#balanceLineGrad)"
                          strokeWidth={2.5}
                          dot={chartData.length <= 25 ? { r: 3.5, fill: '#06b6d4', strokeWidth: 1 } : false}
                          activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                          isAnimationActive={true}
                          animationDuration={animationDuration}
                          animationEasing="ease-out"
                          animationBegin={100}
                        />
                      )}

                      {/* Secondary Performance ROI % Line */}
                      {(metricMode === 'roi' || metricMode === 'dual') && (
                        <Line
                          yAxisId={metricMode === 'dual' ? 'right' : 'left'}
                          type={curveType}
                          dataKey="roiPct"
                          name="Performance Cumulée (%)"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray={metricMode === 'dual' ? '3 3' : undefined}
                          dot={false}
                          activeDot={{ r: 5, fill: '#10b981' }}
                          isAnimationActive={true}
                          animationDuration={animationDuration}
                          animationEasing="ease-out"
                          animationBegin={200}
                        />
                      )}

                      {/* Optional Brush for scrubbing */}
                      {(chartData.length > 30 && (showBrush || isExpanded)) && (
                        <Brush 
                          dataKey={axisMode === 'time' ? 'time' : 'betNumber'} 
                          height={28} 
                          stroke="#06b6d4" 
                          fill="#0f172a" 
                        />
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div 
                key="empty-chart"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col items-center justify-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40"
              >
                <div className="p-3 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-300">Aucun pari enregistré pour tracer la courbe de performance.</p>
                <span className="text-[11px] text-slate-500 text-center px-4 max-w-sm">
                  Exécutez des tirages manuels ou lancez l'Auto-Bet pour visualiser l'évolution dynamique de votre bankroll en temps réel.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Footer Details and Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition">
              <input 
                type="checkbox" 
                checked={showStartingBaseline} 
                onChange={(e) => setShowStartingBaseline(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Ligne de départ ({effectiveStartingBalance.toFixed(2)})</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300 transition">
              <input 
                type="checkbox" 
                checked={showAthLine} 
                onChange={(e) => setShowAthLine(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Ligne ATH</span>
            </label>

            <button
              type="button"
              onClick={() => setShowMovingAverage(!showMovingAverage)}
              className={`text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                showMovingAverage ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>SMA(10)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {chartData.length > 30 && (
              <button
                type="button"
                onClick={() => setShowBrush(!showBrush)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showBrush ? 'Masquer défilement' : 'Barre de défilement / Zoom'}</span>
              </button>
            )}

            {isExpanded && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fermer le Plein Écran (Échap)</span>
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </>
  );
};
