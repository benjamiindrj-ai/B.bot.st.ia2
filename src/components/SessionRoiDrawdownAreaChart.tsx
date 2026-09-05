import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldAlert, 
  Layers, 
  SlidersHorizontal, 
  Calendar, 
  Clock, 
  Scale, 
  Award, 
  Zap, 
  Maximize2, 
  Minimize2, 
  X, 
  Info,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  RotateCcw,
  Percent
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
  Legend, 
  Brush 
} from 'recharts';
import { BetResult, ManualSession } from '../types';

export interface SessionRoiDrawdownAreaChartProps {
  bets: BetResult[];
  manualSessions?: ManualSession[];
  currency: string;
  initialBankroll?: number;
}

export type RoiDrawdownViewMode = 'dual' | 'underwater' | 'session_roi';

export const SessionRoiDrawdownAreaChart: React.FC<SessionRoiDrawdownAreaChartProps> = ({
  bets = [],
  manualSessions = [],
  currency = 'USDT',
  initialBankroll = 100,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<RoiDrawdownViewMode>('dual');
  const [dataSource, setDataSource] = useState<'all' | 'sessions' | 'bot_batches'>('all');
  const [batchSize, setBatchSize] = useState<number>(25);
  const [showBrush, setShowBrush] = useState<boolean>(false);

  // Close on Escape key when fullscreen overlay is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // 1. Synthesize individual sessions from manual journal and/or bot bet batches
  const rawSessions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      timestamp: number;
      dateStr: string;
      profit: number;
      startBalance: number;
      endBalance: number;
      roi: number;
      category: 'manual' | 'bot';
      game: string;
      betsCount: number;
    }> = [];

    // Add manual sessions
    if (dataSource === 'all' || dataSource === 'sessions') {
      manualSessions.forEach((s, idx) => {
        const profit = s.profit !== undefined ? s.profit : (s.profitOrLoss || 0);
        const sBal = s.startingBalance && s.startingBalance > 0 ? s.startingBalance : initialBankroll;
        const eBal = s.endingBalance !== undefined ? s.endingBalance : (sBal + profit);
        const computedRoi = sBal > 0 ? (profit / sBal) * 100 : 0;
        const dateObj = new Date(s.timestamp || Date.now());

        list.push({
          id: s.id || `manual-${idx}`,
          title: s.strategyName || `Session #${idx + 1}`,
          timestamp: s.timestamp || Date.now() - (manualSessions.length - idx) * 3600000,
          dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          profit: Number(profit.toFixed(4)),
          startBalance: Number(sBal.toFixed(2)),
          endBalance: Number(eBal.toFixed(2)),
          roi: Number(computedRoi.toFixed(2)),
          category: 'manual',
          game: s.game || 'Casino / Live',
          betsCount: s.estimatedBets || s.estimatedBetsCount || 1,
        });
      });
    }

    // Add grouped bot bet batches
    if ((dataSource === 'all' || dataSource === 'bot_batches') && bets.length > 0) {
      const sortedBets = [...bets].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      const chunkCount = Math.ceil(sortedBets.length / batchSize);

      for (let i = 0; i < chunkCount; i++) {
        const chunk = sortedBets.slice(i * batchSize, (i + 1) * batchSize);
        if (chunk.length === 0) continue;

        const batchProfit = chunk.reduce((acc, b) => acc + (b.profit || 0), 0);
        const firstBet = chunk[0];
        const lastBet = chunk[chunk.length - 1];
        const sBal = firstBet.runningBalance !== undefined ? (firstBet.runningBalance - firstBet.profit) : initialBankroll;
        const eBal = lastBet.runningBalance !== undefined ? lastBet.runningBalance : (sBal + batchProfit);
        const safeStartBal = sBal > 0 ? sBal : initialBankroll;
        const batchRoi = (batchProfit / safeStartBal) * 100;
        const ts = lastBet.timestamp || Date.now() - (chunkCount - i) * 600000;
        const dateObj = new Date(ts);

        list.push({
          id: `bot-batch-${i}`,
          title: `Bot Batch #${i + 1} (${chunk.length} paris)`,
          timestamp: ts,
          dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          profit: Number(batchProfit.toFixed(4)),
          startBalance: Number(safeStartBal.toFixed(2)),
          endBalance: Number(eBal.toFixed(2)),
          roi: Number(batchRoi.toFixed(2)),
          category: 'bot',
          game: chunk[0].game || 'Auto-Bet',
          betsCount: chunk.length,
        });
      }
    }

    // Sort chronologically ascending
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [bets, manualSessions, dataSource, batchSize, initialBankroll]);

  // 2. Compute Cumulative Metrics, Peaks, and Drawdowns for Area Chart
  const { chartData, summaryStats } = useMemo(() => {
    if (rawSessions.length === 0) {
      return {
        chartData: [],
        summaryStats: {
          totalCumulativeRoi: 0,
          totalProfit: 0,
          maxPeakRoi: 0,
          maxDrawdownPct: 0,
          maxDrawdownAmount: 0,
          currentDrawdownPct: 0,
          currentDrawdownAmount: 0,
          maxDrawdownSessions: 0,
          currentDrawdownSessions: 0,
          calmarRatio: 0,
          winRate: 0,
          profitableSessions: 0,
          totalSessions: 0,
        },
      };
    }

    let runningCumulativeProfit = 0;
    let runningPeakProfit = 0;
    let runningPeakRoi = 0;
    let maxDrawdownPct = 0;
    let maxDrawdownAmount = 0;
    let maxDrawdownSessions = 0;
    let currentDrawdownLength = 0;
    let profitableCount = 0;

    const baseCapital = rawSessions[0]?.startBalance > 0 ? rawSessions[0].startBalance : initialBankroll;

    const data = rawSessions.map((session, idx) => {
      runningCumulativeProfit += session.profit;
      if (session.profit > 0) profitableCount++;

      const cumulativeRoi = (runningCumulativeProfit / baseCapital) * 100;
      
      // Peak detection
      const isNewAth = runningCumulativeProfit > runningPeakProfit;
      if (isNewAth) {
        runningPeakProfit = runningCumulativeProfit;
        runningPeakRoi = cumulativeRoi;
        currentDrawdownLength = 0;
      } else {
        currentDrawdownLength++;
        if (currentDrawdownLength > maxDrawdownSessions) {
          maxDrawdownSessions = currentDrawdownLength;
        }
      }

      // Drawdown depth
      const drawdownAmount = Math.max(0, runningPeakProfit - runningCumulativeProfit);
      const denominator = baseCapital + runningPeakProfit;
      const drawdownPct = runningPeakProfit > 0 && denominator > 0
        ? -((drawdownAmount / denominator) * 100)
        : (runningCumulativeProfit < 0 ? ((runningCumulativeProfit / baseCapital) * 100) : 0);

      // Track max drawdown
      if (Math.abs(drawdownPct) > Math.abs(maxDrawdownPct)) {
        maxDrawdownPct = drawdownPct;
        maxDrawdownAmount = drawdownAmount;
      }

      // Determine state label
      let statusLabel = 'Nouveau Sommet ATH';
      if (drawdownPct < -0.01) {
        statusLabel = `Drawdown (${drawdownPct.toFixed(1)}%)`;
      }

      return {
        index: idx + 1,
        label: `S#${idx + 1}`,
        title: session.title,
        dateStr: session.dateStr,
        game: session.game,
        category: session.category,
        betsCount: session.betsCount,
        sessionProfit: session.profit,
        sessionRoi: session.roi,
        cumulativeProfit: Number(runningCumulativeProfit.toFixed(4)),
        cumulativeRoi: Number(cumulativeRoi.toFixed(2)),
        peakProfit: Number(runningPeakProfit.toFixed(4)),
        peakRoi: Number(runningPeakRoi.toFixed(2)),
        drawdownAmount: Number(drawdownAmount.toFixed(4)),
        drawdownPct: Number(drawdownPct.toFixed(2)),
        isAth: isNewAth,
        statusLabel,
        // Helper offset for bi-gradient
        posSessionRoi: session.roi >= 0 ? session.roi : 0,
        negSessionRoi: session.roi < 0 ? session.roi : 0,
      };
    });

    const lastPoint = data[data.length - 1];
    const totalCumulativeRoi = lastPoint ? lastPoint.cumulativeRoi : 0;
    const currentDrawdownPct = lastPoint ? lastPoint.drawdownPct : 0;
    const currentDrawdownAmount = lastPoint ? lastPoint.drawdownAmount : 0;
    const calmar = maxDrawdownPct !== 0 ? Math.abs(totalCumulativeRoi / maxDrawdownPct) : totalCumulativeRoi > 0 ? 99.9 : 0;
    const winRate = rawSessions.length > 0 ? (profitableCount / rawSessions.length) * 100 : 0;

    return {
      chartData: data,
      summaryStats: {
        totalCumulativeRoi,
        totalProfit: runningCumulativeProfit,
        maxPeakRoi: runningPeakRoi,
        maxDrawdownPct,
        maxDrawdownAmount,
        currentDrawdownPct,
        currentDrawdownAmount,
        maxDrawdownSessions,
        currentDrawdownSessions: currentDrawdownLength,
        calmarRatio: calmar,
        winRate,
        profitableSessions: profitableCount,
        totalSessions: rawSessions.length,
      },
    };
  }, [rawSessions, initialBankroll]);

  // Gradient offset calculation for bi-directional Session ROI area
  const gradientOffset = useMemo(() => {
    if (chartData.length === 0) return 0;
    const rois = chartData.map((d) => d.sessionRoi);
    const max = Math.max(...rois);
    const min = Math.min(...rois);

    if (max <= 0) return 0;
    if (min >= 0) return 1;
    return max / (max - min);
  }, [chartData]);

  // Custom Enriched Tooltip
  const CustomAreaTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProfitable = data.sessionProfit >= 0;
      const isCumulProfitable = data.cumulativeProfit >= 0;
      const isAth = data.isAth;

      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs pointer-events-none z-50">
          
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>{data.title}</span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isAth
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : data.drawdownPct < -0.01
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {isAth ? '★ NOUVEAU SOMMET' : data.statusLabel}
            </span>
          </div>

          {/* Session Metrics */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">ROI de la Session :</span>
              <span className={`font-bold text-xs ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfitable ? '+' : ''}{data.sessionRoi.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {isProfitable ? '+' : ''}{data.sessionProfit.toFixed(4)} {currency}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">ROI Cumulé :</span>
              <span className={`font-bold text-xs ${isCumulProfitable ? 'text-indigo-400' : 'text-rose-400'}`}>
                {isCumulProfitable ? '+' : ''}{data.cumulativeRoi.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Gain: {data.cumulativeProfit >= 0 ? '+' : ''}{data.cumulativeProfit.toFixed(4)} {currency}
              </span>
            </div>
          </div>

          {/* Drawdown Indicator Bar */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Écart au Sommet (ATH) :</span>
              <span className={`font-bold font-mono ${data.drawdownPct === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.drawdownPct.toFixed(2)}% ({data.drawdownAmount.toFixed(4)} {currency})
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-300 ${
                  data.drawdownPct === 0 
                    ? 'bg-emerald-500 w-full' 
                    : Math.abs(data.drawdownPct) > 20 
                    ? 'bg-rose-500' 
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(4, Math.min(100, 100 - Math.abs(data.drawdownPct)))}%` }}
              />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>{data.game} • {data.betsCount} paris</span>
            <span>{data.dateStr}</span>
          </div>

        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div 
        id="session-roi-drawdown-area-chart-container"
        className={`${
          isExpanded 
            ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto flex flex-col justify-between' 
            : 'bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4'
        }`}
      >
        
        {/* 1. Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600/30 to-rose-600/20 border border-indigo-500/40 text-indigo-400 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Évolution du ROI & Cartographie des Drawdowns</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {chartData.length} sessions analysées
                </span>
                {summaryStats.currentDrawdownPct < -0.1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    DD Actuel : {summaryStats.currentDrawdownPct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualisation en aires superposées : trajectoire de profitabilité (%) et phases de creux sous le pic historique (ATH).
              </p>
            </div>
          </div>

          {/* Right Controls: View Mode & Source Filter & Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              {(
                [
                  { id: 'dual', label: 'Dual : ROI & Drawdown' },
                  { id: 'underwater', label: 'Underwater %' },
                  { id: 'session_roi', label: 'ROI / Session' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === mode.id
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Data Source Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              {(
                [
                  { id: 'all', label: 'Tout' },
                  { id: 'sessions', label: 'Journal' },
                  { id: 'bot_batches', label: 'Bot Auto' },
                ] as const
              ).map((src) => (
                <button
                  key={src.id}
                  onClick={() => setDataSource(src.id)}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    dataSource === src.id
                      ? 'bg-slate-800 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Batch Size Selector (When Bot data is active) */}
            {dataSource !== 'sessions' && (
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-semibold rounded-xl px-2 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                title="Taille des lots de paris pour le mode Bot"
              >
                <option value={10}>10 paris / lot</option>
                <option value={25}>25 paris / lot</option>
                <option value={50}>50 paris / lot</option>
                <option value={100}>100 paris / lot</option>
              </select>
            )}

            {/* Expand / Minimize Fullscreen Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white transition cursor-pointer"
              title={isExpanded ? 'Réduire (Echap)' : 'Agrandir en plein écran'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4 text-orange-400" /> : <Maximize2 className="w-4 h-4" />}
            </motion.button>

          </div>

        </div>

        {/* 2. Top Analytical KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          
          {/* Total Cumulative ROI */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>ROI Total Cumulé</span>
              <Percent className="w-3 h-3 text-indigo-400" />
            </div>
            <div className={`text-base font-bold font-mono mt-1 ${summaryStats.totalCumulativeRoi >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
              {summaryStats.totalCumulativeRoi >= 0 ? '+' : ''}{summaryStats.totalCumulativeRoi.toFixed(2)}%
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              Net: {summaryStats.totalProfit >= 0 ? '+' : ''}{summaryStats.totalProfit.toFixed(2)} {currency}
            </span>
          </div>

          {/* Peak All-Time High ROI */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Pic Max (ATH)</span>
              <Award className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-base font-bold font-mono text-amber-400 mt-1">
              +{summaryStats.maxPeakRoi.toFixed(2)}%
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              Sommet historique
            </span>
          </div>

          {/* Maximum Drawdown */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Max Drawdown (MDD)</span>
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            </div>
            <div className="text-base font-bold font-mono text-rose-400 mt-1">
              {summaryStats.maxDrawdownPct.toFixed(2)}%
            </div>
            <span className="text-[9px] text-rose-400/80 font-mono">
              Creux: -{summaryStats.maxDrawdownAmount.toFixed(2)} {currency}
            </span>
          </div>

          {/* Current Drawdown */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Drawdown Actuel</span>
              <TrendingDown className="w-3 h-3 text-orange-400" />
            </div>
            <div className={`text-base font-bold font-mono mt-1 ${summaryStats.currentDrawdownPct === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {summaryStats.currentDrawdownPct === 0 ? '0.00% (Au Sommet)' : `${summaryStats.currentDrawdownPct.toFixed(2)}%`}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              {summaryStats.currentDrawdownPct === 0 ? 'Aucune perte latente' : `Sous le pic de ${summaryStats.currentDrawdownAmount.toFixed(2)} ${currency}`}
            </span>
          </div>

          {/* Calmar Ratio (Recovery Factor) */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Ratio de Calmar</span>
              <Scale className="w-3 h-3 text-blue-400" />
            </div>
            <div className={`text-base font-bold font-mono mt-1 ${summaryStats.calmarRatio >= 1.5 ? 'text-emerald-400' : summaryStats.calmarRatio > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
              {summaryStats.calmarRatio.toFixed(2)}x
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              Rendement / Risque Max
            </span>
          </div>

          {/* Profitable Sessions Ratio */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>Sessions Gagnantes</span>
              <Zap className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {summaryStats.winRate.toFixed(1)}%
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              {summaryStats.profitableSessions} / {summaryStats.totalSessions} sessions
            </span>
          </div>

        </div>

        {/* 3. Recharts Area Chart Canvas */}
        <div className={`w-full relative ${isExpanded ? 'h-[65vh] min-h-[400px]' : 'h-80'}`}>
          <AnimatePresence mode="wait">
            {chartData.length > 0 ? (
              <motion.div
                key={`area-chart-${viewMode}-${dataSource}-${batchSize}`}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                    
                    {/* Linear Gradients */}
                    <defs>
                      {/* Emerald Cumulative ROI Gradient */}
                      <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>

                      {/* Crimson Underwater Drawdown Gradient */}
                      <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.05} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.55} />
                      </linearGradient>

                      {/* Bi-Color Split Gradient for Individual Session ROI */}
                      <linearGradient id="splitSessionRoiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.65} />
                        <stop offset={gradientOffset} stopColor="#f43f5e" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                    <XAxis 
                      dataKey="label" 
                      stroke="#64748b" 
                      tick={{ fontSize: 11 }} 
                      minTickGap={15}
                    />

                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 11 }} 
                      domain={['auto', 'auto']}
                      unit="%"
                    />

                    {/* Zero Break-Even Baseline */}
                    <ReferenceLine 
                      y={0} 
                      stroke="#475569" 
                      strokeDasharray="4 4" 
                      label={{ value: '0.00% Baseline', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }} 
                    />

                    {/* Max Drawdown Reference Line when in Underwater or Dual mode */}
                    {summaryStats.maxDrawdownPct < -1 && (viewMode === 'dual' || viewMode === 'underwater') && (
                      <ReferenceLine 
                        y={summaryStats.maxDrawdownPct} 
                        stroke="#f43f5e" 
                        strokeDasharray="3 3" 
                        label={{ value: `Max DD (${summaryStats.maxDrawdownPct.toFixed(1)}%)`, fill: '#f43f5e', fontSize: 10, position: 'insideBottomRight' }} 
                      />
                    )}

                    <Tooltip content={<CustomAreaTooltip />} />

                    {/* DUAL MODE: Cumulative ROI (Green Area) & Underwater Drawdown (Red Area) */}
                    {viewMode === 'dual' && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="cumulativeRoi"
                          name="ROI Cumulé (%)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#roiGradient)"
                          dot={chartData.length <= 25 ? { r: 3, fill: '#10b981' } : false}
                          activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                          isAnimationActive={true}
                          animationDuration={600}
                        />
                        <Area
                          type="monotone"
                          dataKey="drawdownPct"
                          name="Drawdown (% sous ATH)"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#drawdownGradient)"
                          dot={false}
                          activeDot={{ r: 5, fill: '#f43f5e' }}
                          isAnimationActive={true}
                          animationDuration={600}
                        />
                      </>
                    )}

                    {/* UNDERWATER MODE: Pure Drawdown Map */}
                    {viewMode === 'underwater' && (
                      <Area
                        type="monotone"
                        dataKey="drawdownPct"
                        name="Drawdown (% sous ATH)"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#drawdownGradient)"
                        dot={chartData.length <= 25 ? { r: 3, fill: '#f43f5e' } : false}
                        activeDot={{ r: 6, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}

                    {/* SESSION ROI MODE: Individual Session ROI Curve */}
                    {viewMode === 'session_roi' && (
                      <Area
                        type="monotone"
                        dataKey="sessionRoi"
                        name="ROI par Session (%)"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#splitSessionRoiGradient)"
                        dot={chartData.length <= 25 ? { r: 3, fill: '#38bdf8' } : false}
                        activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={600}
                      />
                    )}

                    {chartData.length > 20 && showBrush && (
                      <Brush dataKey="label" height={25} stroke="#6366f1" fill="#0f172a" />
                    )}

                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 p-6 text-center"
              >
                <Layers className="w-8 h-8 text-slate-700 animate-pulse" />
                <p className="font-semibold text-slate-300">Aucune donnée de session disponible.</p>
                <span className="text-[11px] text-slate-500 max-w-sm">
                  Enregistrez des sessions dans le Journal Manuel ou effectuez des paris en mode Auto-Bot pour générer la courbe de ROI et analyser les drawdowns.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Bottom Legend, Zoom Toggle & Contextual Guidance */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
          
          {/* Custom Visual Legend */}
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            {viewMode === 'dual' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-300 font-medium">Aire Verte : ROI Cumulé (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-rose-500"></span>
                  <span className="text-slate-300 font-medium">Aire Rouge : Drawdown (% sous le pic ATH)</span>
                </div>
              </>
            )}
            {viewMode === 'underwater' && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-300 font-medium">Courbe Underwater : Profondeur de la perte latente sous l'ATH</span>
              </div>
            )}
            {viewMode === 'session_roi' && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-sky-400"></span>
                <span className="text-slate-300 font-medium">ROI individuel par session (%)</span>
              </div>
            )}
          </div>

          {/* Zoom Toggle */}
          {chartData.length > 20 && (
            <button
              type="button"
              onClick={() => setShowBrush(!showBrush)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{showBrush ? 'Masquer curseur de zoom' : 'Activer zoom temporel'}</span>
            </button>
          )}

        </div>

      </div>
    </>
  );
};
