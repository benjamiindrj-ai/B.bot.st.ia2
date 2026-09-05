import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Filter, 
  Calendar, 
  SlidersHorizontal, 
  Info, 
  Target, 
  Award, 
  Zap, 
  Clock, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieIcon,
  Activity,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  Legend, 
  Brush 
} from 'recharts';
import { BetResult, ManualSession } from '../types';

export interface SessionProfitDistributionBarChartProps {
  bets: BetResult[];
  manualSessions?: ManualSession[];
  currency: string;
}

export type DistributionViewMode = 'profit_brackets' | 'per_session' | 'game_breakdown';

export const SessionProfitDistributionBarChart: React.FC<SessionProfitDistributionBarChartProps> = ({
  bets = [],
  manualSessions = [],
  currency = 'USDT',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<DistributionViewMode>('profit_brackets');
  const [dataSource, setDataSource] = useState<'all' | 'sessions' | 'bot_batches'>('all');
  const [batchSize, setBatchSize] = useState<number>(20); // for dividing bot bets into virtual sessions
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [showBrush, setShowBrush] = useState<boolean>(false);

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

  // 1. Synthesize sessions from manualSessions and bot bet batches
  const combinedSessions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      timestamp: number;
      dateStr: string;
      profit: number;
      betsCount: number;
      game: string;
      category: 'manual' | 'bot';
      roi?: number;
      startingBalance?: number;
      endingBalance?: number;
    }> = [];

    // Add manual sessions
    if (dataSource === 'all' || dataSource === 'sessions') {
      manualSessions.forEach((s, idx) => {
        const p = s.profit !== undefined ? s.profit : (s.profitOrLoss || 0);
        const dateObj = new Date(s.timestamp || Date.now());
        list.push({
          id: s.id || `manual-${idx}`,
          title: s.strategyName || `Session #${idx + 1}`,
          timestamp: s.timestamp || Date.now(),
          dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          profit: Number(p.toFixed(4)),
          betsCount: s.estimatedBets || s.estimatedBetsCount || 1,
          game: s.game || 'multi',
          category: 'manual',
          startingBalance: s.startingBalance,
          endingBalance: s.endingBalance,
        });
      });
    }

    // Add bot bet batches (grouping bets into sequential session chunks)
    if ((dataSource === 'all' || dataSource === 'bot_batches') && bets.length > 0) {
      const sortedBets = [...bets].sort((a, b) => a.timestamp - b.timestamp);
      const chunksCount = Math.ceil(sortedBets.length / batchSize);

      for (let i = 0; i < chunksCount; i++) {
        const slice = sortedBets.slice(i * batchSize, (i + 1) * batchSize);
        if (slice.length === 0) continue;

        const sliceProfit = slice.reduce((acc, b) => acc + b.profit, 0);
        const earliestTime = slice[0].timestamp || Date.now();
        const dateObj = new Date(earliestTime);
        const dominantGame = slice[0].game;
        const startBal = slice[0].runningBalance !== undefined ? (slice[0].runningBalance - slice[0].profit) : undefined;
        const endBal = slice[slice.length - 1].runningBalance;

        list.push({
          id: `bot-batch-${i + 1}`,
          title: `Bot Session #${i + 1} (${slice.length} paris)`,
          timestamp: earliestTime,
          dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          profit: Number(sliceProfit.toFixed(4)),
          betsCount: slice.length,
          game: dominantGame,
          category: 'bot',
          startingBalance: startBal,
          endingBalance: endBal,
        });
      }
    }

    // Filter by game if requested
    if (selectedGame !== 'all') {
      return list.filter((s) => s.game.toLowerCase() === selectedGame.toLowerCase());
    }

    return list;
  }, [manualSessions, bets, dataSource, batchSize, selectedGame]);

  // 2. Data for Mode A: Profitability Brackets (Distribution des plages de gains)
  const bracketData = useMemo(() => {
    if (combinedSessions.length === 0) return [];

    // Define adaptive bracket thresholds based on session magnitudes
    const profits = combinedSessions.map((s) => s.profit);
    const maxVal = Math.max(...profits, 10);
    const minVal = Math.min(...profits, -10);

    // Standard financial brackets for casino sessions
    const brackets = [
      { id: 'heavy_loss', label: '< -15 ' + currency, min: -Infinity, max: -15, color: '#e11d48', bgClass: 'text-rose-500' },
      { id: 'medium_loss', label: '-15 à -5 ' + currency, min: -15, max: -5, color: '#f43f5e', bgClass: 'text-rose-400' },
      { id: 'small_loss', label: '-5 à 0 ' + currency, min: -5, max: 0, color: '#fb7185', bgClass: 'text-rose-300' },
      { id: 'small_win', label: '0 à +5 ' + currency, min: 0, max: 5, color: '#34d399', bgClass: 'text-emerald-300' },
      { id: 'medium_win', label: '+5 à +15 ' + currency, min: 5, max: 15, color: '#10b981', bgClass: 'text-emerald-400' },
      { id: 'heavy_win', label: '> +15 ' + currency, min: 15, max: Infinity, color: '#059669', bgClass: 'text-emerald-500' },
    ];

    const totalSessions = combinedSessions.length;

    return brackets.map((b) => {
      const inBucket = combinedSessions.filter((s) => {
        if (b.min === -Infinity) return s.profit < b.max;
        if (b.max === Infinity) return s.profit >= b.min;
        return s.profit >= b.min && s.profit < b.max;
      });

      const count = inBucket.length;
      const pct = totalSessions > 0 ? Number(((count / totalSessions) * 100).toFixed(1)) : 0;
      const totalProfitInBracket = Number(inBucket.reduce((acc, s) => acc + s.profit, 0).toFixed(2));
      const totalBetsInBracket = inBucket.reduce((acc, s) => acc + s.betsCount, 0);

      return {
        id: b.id,
        range: b.label,
        count,
        percentage: pct,
        totalProfit: totalProfitInBracket,
        totalBets: totalBetsInBracket,
        color: b.color,
        isPositive: b.min >= 0,
      };
    });
  }, [combinedSessions, currency]);

  // 3. Data for Mode B: Per-Session Chronological Bar Chart
  const perSessionData = useMemo(() => {
    return combinedSessions.map((s, idx) => {
      const isPositive = s.profit >= 0;
      return {
        id: s.id,
        index: idx + 1,
        title: s.title,
        date: s.dateStr,
        profit: s.profit,
        positiveProfit: isPositive ? s.profit : 0,
        negativeProfit: !isPositive ? s.profit : 0,
        betsCount: s.betsCount,
        game: s.game,
        category: s.category,
        color: isPositive ? '#10b981' : '#f43f5e',
      };
    });
  }, [combinedSessions]);

  // 4. Data for Mode C: Breakdown by Game
  const gameBreakdownData = useMemo(() => {
    const map: Record<string, { count: number; totalProfit: number; wins: number; losses: number; totalBets: number }> = {};

    combinedSessions.forEach((s) => {
      const g = (s.game || 'autre').toUpperCase();
      if (!map[g]) {
        map[g] = { count: 0, totalProfit: 0, wins: 0, losses: 0, totalBets: 0 };
      }
      map[g].count += 1;
      map[g].totalProfit += s.profit;
      map[g].totalBets += s.betsCount;
      if (s.profit >= 0) map[g].wins += 1;
      else map[g].losses += 1;
    });

    return Object.entries(map).map(([game, data]) => {
      const winRate = data.count > 0 ? Number(((data.wins / data.count) * 100).toFixed(1)) : 0;
      return {
        game,
        count: data.count,
        totalProfit: Number(data.totalProfit.toFixed(2)),
        wins: data.wins,
        losses: data.losses,
        winRate,
        totalBets: data.totalBets,
        color: data.totalProfit >= 0 ? '#10b981' : '#f43f5e',
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [combinedSessions]);

  // Overview Metrics
  const summaryStats = useMemo(() => {
    const total = combinedSessions.length;
    const wins = combinedSessions.filter((s) => s.profit > 0).length;
    const losses = combinedSessions.filter((s) => s.profit < 0).length;
    const breakevens = combinedSessions.filter((s) => s.profit === 0).length;
    const winRate = total > 0 ? Number(((wins / total) * 100).toFixed(1)) : 0;
    const totalNetProfit = Number(combinedSessions.reduce((acc, s) => acc + s.profit, 0).toFixed(2));
    const avgProfitPerSession = total > 0 ? Number((totalNetProfit / total).toFixed(2)) : 0;

    const winningProfits = combinedSessions.filter((s) => s.profit > 0).map((s) => s.profit);
    const losingProfits = combinedSessions.filter((s) => s.profit < 0).map((s) => Math.abs(s.profit));
    const sumWins = winningProfits.reduce((a, b) => a + b, 0);
    const sumLosses = losingProfits.reduce((a, b) => a + b, 0);
    const profitFactor = sumLosses > 0 ? Number((sumWins / sumLosses).toFixed(2)) : sumWins > 0 ? 99 : 1.0;

    const bestSession = profitsOrFallback(winningProfits, 'max');
    const worstSession = profitsOrFallback(losingProfits, 'min');

    return {
      total,
      wins,
      losses,
      breakevens,
      winRate,
      totalNetProfit,
      avgProfitPerSession,
      profitFactor,
      bestSession,
      worstSession,
    };
  }, [combinedSessions]);

  function profitsOrFallback(arr: number[], type: 'max' | 'min') {
    if (arr.length === 0) return 0;
    return type === 'max' ? Math.max(...arr) : -Math.max(...arr);
  }

  // Custom Recharts Tooltip for Profit Brackets
  const CustomBracketTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: data.color }} />
              <span>Plage : {data.range}</span>
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Nombre de Sessions :</span>
              <span className="font-mono font-bold text-slate-100">{data.count} ({data.percentage}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Profit Cumulé :</span>
              <span className={`font-mono font-bold ${data.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.totalProfit >= 0 ? '+' : ''}{data.totalProfit} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-0.5">
              <span>Volume Total Paris :</span>
              <span className="font-mono text-slate-300">{data.totalBets} paris</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Per-Session Bars
  const CustomSessionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPos = data.profit >= 0;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[220px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 font-mono">{data.title}</span>
            <span className="text-[10px] text-slate-400">{data.date}</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Résultat Net :</span>
              <span className={`font-mono font-bold text-xs flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isPos ? '+' : ''}{data.profit.toFixed(4)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Jeu & Catégorie :</span>
              <span className="uppercase text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40 text-[10px]">
                {data.game} • {data.category === 'manual' ? 'Manuel' : 'Bot'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Nombre de Paris :</span>
              <span className="font-mono text-slate-300">{data.betsCount} paris</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Game Breakdown
  const CustomGameTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px] pointer-events-none">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 uppercase text-cyan-300">
            Jeu : {data.game}
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Profit Net Total :</span>
              <span className={`font-mono font-bold ${data.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.totalProfit >= 0 ? '+' : ''}{data.totalProfit} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Taux de Victoire :</span>
              <span className="font-mono font-semibold text-slate-200">{data.winRate}% ({data.wins}W / {data.losses}L)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Sessions Analysées :</span>
              <span className="font-mono text-slate-300">{data.count}</span>
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
        id="session-profit-distribution-barchart-panel" 
        className={`transition-all duration-300 ${
          isExpanded 
            ? 'fixed inset-2 sm:inset-6 z-50 bg-slate-900/98 border border-emerald-500/50 shadow-2xl p-4 sm:p-6 overflow-y-auto flex flex-col justify-between backdrop-blur-xl rounded-2xl ring-1 ring-emerald-500/30' 
            : 'bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        
        {/* Header & Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Distribution des Gains par Session (BarChart)</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                {summaryStats.total} sessions analysées
              </span>
              {isExpanded && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono uppercase tracking-wider">
                  Mode Plein Écran
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Histogramme et analyse des plages de profitabilité pour identifier visuellement les zones de rentabilité ({currency})
            </p>
          </div>

          {/* Action Controls & Mode Selector */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            
            {/* Main Visual Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('profit_brackets')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'profit_brackets'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Plages (Histogramme)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('per_session')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'per_session'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Par Session</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('game_breakdown')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'game_breakdown'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieIcon className="w-3 h-3" />
                <span>Par Jeu</span>
              </button>
            </div>

            {/* Data Source Filter (Sessions Manuelles vs Bot Batches vs Tous) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              {([
                { key: 'all', label: 'Toutes' },
                { key: 'sessions', label: 'Journal' },
                { key: 'bot_batches', label: 'Bot Auto' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDataSource(key)}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                    dataSource === key ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Agrandir / Plein Écran Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isExpanded
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 border-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40'
              }`}
              title={isExpanded ? "Réduire l'affichage (Échap)" : "Agrandir en plein écran"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isExpanded ? 'Réduire' : 'Agrandir'}</span>
            </motion.button>

          </div>
        </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Win Rate */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Taux de Succès</span>
            <Target className="w-3 h-3 text-emerald-400" />
          </span>
          <div className="mt-1">
            <span className={`text-base sm:text-lg font-bold font-mono ${summaryStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {summaryStats.winRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {summaryStats.wins}G / {summaryStats.losses}P
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Profit Net Global</span>
            <TrendingUp className="w-3 h-3 text-cyan-400" />
          </span>
          <div className="mt-1">
            <span className={`text-base sm:text-lg font-bold font-mono ${summaryStats.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {summaryStats.totalNetProfit >= 0 ? '+' : ''}{summaryStats.totalNetProfit} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Cumul des sessions
          </span>
        </div>

        {/* Average Profit per Session */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Moyenne / Session</span>
            <Scale className="w-3 h-3 text-indigo-400" />
          </span>
          <div className="mt-1">
            <span className={`text-base sm:text-lg font-bold font-mono ${summaryStats.avgProfitPerSession >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
              {summaryStats.avgProfitPerSession >= 0 ? '+' : ''}{summaryStats.avgProfitPerSession} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Espérance moyenne
          </span>
        </div>

        {/* Profit Factor */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Profit Factor</span>
            <Zap className="w-3 h-3 text-amber-400" />
          </span>
          <div className="mt-1">
            <span className={`text-base sm:text-lg font-bold font-mono ${summaryStats.profitFactor >= 1.5 ? 'text-emerald-400' : summaryStats.profitFactor >= 1.0 ? 'text-blue-300' : 'text-rose-400'}`}>
              {summaryStats.profitFactor.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Ratio Gains / Pertes
          </span>
        </div>

        {/* Best Session */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Meilleure Session</span>
            <Award className="w-3 h-3 text-emerald-400" />
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
              +{summaryStats.bestSession.toFixed(2)} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Gain record
          </span>
        </div>

        {/* Worst Session */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Pire Session</span>
            <TrendingDown className="w-3 h-3 text-rose-400" />
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-bold font-mono text-rose-400">
              {summaryStats.worstSession.toFixed(2)} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Perte max session
          </span>
        </div>

      </div>

      {/* Main Recharts BarChart Canvas */}
      <div className={`w-full pt-2 relative transition-all duration-300 ${isExpanded ? 'h-[460px] sm:h-[580px] lg:h-[650px]' : 'h-72'}`}>
        <AnimatePresence mode="wait">
          {combinedSessions.length > 0 ? (
            <motion.div
              key={`distribution-barchart-${viewMode}-${dataSource}-${selectedGame}`}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                
                {/* Mode 1: Profit Brackets Histogram */}
                {viewMode === 'profit_brackets' ? (
                  <BarChart data={bracketData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="range" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      allowDecimals={false}
                      label={{ value: 'Nb Sessions', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomBracketTooltip />} />
                    <Bar dataKey="count" name="Nombre de Sessions" radius={[6, 6, 0, 0]}>
                      {bracketData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    {bracketData.length > 10 && isExpanded && (
                      <Brush dataKey="range" height={26} stroke="#10b981" fill="#0f172a" />
                    )}
                  </BarChart>
                ) : viewMode === 'per_session' ? (
                  /* Mode 2: Per-Session Gains/Losses BarChart */
                  <BarChart data={perSessionData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="index" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }} 
                      tickFormatter={(val) => `S#${val}`}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Tooltip content={<CustomSessionTooltip />} />
                    <Bar dataKey="profit" name={`Gain / Perte (${currency})`} radius={[4, 4, 4, 4]}>
                      {perSessionData.map((entry, index) => (
                        <Cell key={`session-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    {(perSessionData.length > 15 || isExpanded) && (
                      <Brush dataKey="index" height={26} stroke="#10b981" fill="#0f172a" />
                    )}
                  </BarChart>
                ) : (
                  /* Mode 3: Breakdown by Game */
                  <BarChart data={gameBreakdownData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="game" 
                      stroke="#64748b" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 11, fill: '#94a3b8' }} 
                      tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                    <Tooltip content={<CustomGameTooltip />} />
                    <Bar dataKey="totalProfit" name={`Profit Cumulé (${currency})`} radius={[6, 6, 0, 0]}>
                      {gameBreakdownData.map((entry, index) => (
                        <Cell key={`game-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}

              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div 
              key="empty-distribution"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col items-center justify-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40"
            >
              <div className="p-3 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-300">Aucune session enregistrée pour le moment.</p>
              <span className="text-[11px] text-slate-500 text-center px-4 max-w-sm">
                Enregistrez des sessions dans le Journal Manuel ou lancez l'Auto-Bet pour générer automatiquement la distribution des plages de profitabilité.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend & Analytical Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
        
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block text-[11px]">Plages Gagnantes Dominantes</span>
            <p className="text-[10px] text-slate-400 leading-snug">
              {summaryStats.wins > summaryStats.losses 
                ? `Majorité de sessions profitables (${summaryStats.winRate}%). Les gains réguliers surpassent les creux de variance.` 
                : `Volume de gains modéré. Concentrez-vous sur des objectifs de Take Profit plus stricts.`}
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
          <div className="p-1 rounded bg-blue-500/20 text-blue-400 mt-0.5">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block text-[11px]">Contrôle du Risque Asymétrique</span>
            <p className="text-[10px] text-slate-400 leading-snug">
              Profit Factor à <strong>{summaryStats.profitFactor.toFixed(2)}</strong>. Une valeur &gt; 1.3 garantit une robustesse mathématique sur le long terme.
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2 sm:col-span-2 lg:col-span-1">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-200 block text-[11px]">Segmentation des Données</span>
            <p className="text-[10px] text-slate-400 leading-snug">
              Les tirages continus du bot sont automatiquement découpés par lots de {batchSize} paris pour une granularité optimale.
            </p>
          </div>
        </div>

      </div>

      {isExpanded && (
        <div className="flex justify-end pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Fermer le Plein Écran (Échap)</span>
          </button>
        </div>
      )}

    </motion.div>
    </>
  );
};
