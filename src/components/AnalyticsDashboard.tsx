import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Award, 
  ShieldAlert, 
  Download, 
  Sparkles, 
  Filter, 
  Search, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Layers,
  History,
  Clock,
  Calendar,
  Activity,
  Maximize2,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  LineChart as LineChartIcon,
  Scale,
  Gauge,
  HelpCircle,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { BotStatistics, BetResult, StakeGameType, BettingStrategy, ManualSession } from '../types';
import { EvCalculatorTool } from './EvCalculatorTool';
import { MonteCarloSimulationTool } from './MonteCarloSimulationTool';
import { StakeLiveChart } from './StakeLiveChart';
import { SimulatedBalanceLineChart } from './SimulatedBalanceLineChart';
import { SessionProfitDistributionBarChart } from './SessionProfitDistributionBarChart';
import { SessionRoiDrawdownAreaChart } from './SessionRoiDrawdownAreaChart';
import { CalendarHeatmap } from './CalendarHeatmap';
import { SuggestStrategyOptimizationButton } from './SuggestStrategyOptimizationButton';
import { useTranslation } from '../i18n/LanguageContext';
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

interface AnalyticsDashboardProps {
  stats: BotStatistics;
  bets: BetResult[];
  currency: string;
  strategy: BettingStrategy;
  manualSessions?: ManualSession[];
  onUpdateStrategy?: (updates: Partial<BettingStrategy>) => void;
  onSelectStrategy?: (strat: BettingStrategy) => void;
  balance?: number;
  onStartAutoBet?: () => void;
  onUpdateBalance?: (newBalance: number) => void;
  onResetBalance?: () => void;
  credentials?: { apiKey?: string; domain?: string; isLiveMode?: boolean };
  wallets?: Record<string, number>;
}

// Framer Motion Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 320,
    },
  },
};

const chartContainerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 280,
    },
  },
};

const fadeTransition = {
  initial: { opacity: 0, scale: 0.99 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  bets,
  currency,
  strategy,
  manualSessions = [],
  onUpdateStrategy,
  onSelectStrategy,
  balance = 100,
  onStartAutoBet,
  onUpdateBalance,
  onResetBalance,
  credentials,
  wallets,
}) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<'all' | 'won' | 'lost'>('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Quick Inline Balance Editing State (Synchronized with Header & Wallets)
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceInput, setEditBalanceInput] = useState(balance.toString());

  useEffect(() => {
    if (!isEditingBalance) {
      setEditBalanceInput(balance.toString());
    }
  }, [balance, isEditingBalance]);

  const handleSaveBalance = () => {
    const val = parseFloat(editBalanceInput.replace(',', '.'));
    if (!isNaN(val) && val >= 0 && onUpdateBalance) {
      onUpdateBalance(val);
    }
    setIsEditingBalance(false);
  };

  // Line Chart Controls
  const [chartTheme, setChartTheme] = useState<'balance' | 'stake' | 'standard'>('balance');
  const [chartDisplayMode, setChartDisplayMode] = useState<'line' | 'area'>('line');
  const [chartMetric, setChartMetric] = useState<'profit' | 'balance' | 'both'>('profit');
  const [axisMode, setAxisMode] = useState<'time' | 'index'>('time');
  const [timeHorizon, setTimeHorizon] = useState<'all' | '1h' | '24h' | '7d'>('all');
  const [showBrush, setShowBrush] = useState(false);
  const [showSharpeHelp, setShowSharpeHelp] = useState(false);

  // Sharpe Ratio, Triana Ratio and Advanced Risk-Adjusted Return Metrics
  const riskAdjustedMetrics = useMemo(() => {
    if (bets.length < 2) {
      return {
        sharpeRatio: 0,
        annualizedSharpe: 0,
        trianaRatio: 0,
        annualizedTriana: 0,
        mad: 0,
        meanReturnPct: 0,
        meanProfitPerBet: 0,
        stdDev: 0,
        sortinoRatio: 0,
        downsideDeviation: 0,
        profitFactor: stats.profitFactor || 0,
        rating: 'Données insuffisantes (min. 2 paris)',
        trianaRating: 'Données insuffisantes',
        color: 'slate',
        perGameSharpe: {} as Record<string, { count: number; sharpe: number; triana: number; profit: number; winRate: number; stdDev: number; mad: number; meanReturn: number }>,
        theoreticalSharpe: 0,
        totalReturnsCount: bets.length
      };
    }

    // 1. Normalized returns per bet: R_i = profit_i / betAmount_i
    const returns = bets.map((b) => (b.betAmount > 0 ? b.profit / b.betAmount : 0));
    const n = returns.length;

    // Mean return (E[R])
    const sumReturns = returns.reduce((acc, r) => acc + r, 0);
    const meanReturn = sumReturns / n;
    const meanReturnPct = meanReturn * 100;
    const meanProfitPerBet = bets.reduce((acc, b) => acc + b.profit, 0) / n;

    // Sample Standard Deviation (sigma - quadratic dispersion)
    const sumSquaredDiffs = returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0);
    const variance = sumSquaredDiffs / (n - 1);
    const stdDev = Math.sqrt(variance);

    // Mean Absolute Deviation (MAD - linear robust volatility for Triana Ratio)
    const sumAbsDiffs = returns.reduce((acc, r) => acc + Math.abs(r - meanReturn), 0);
    const mad = sumAbsDiffs / n;

    // Triana Ratio (T = meanReturn / MAD - robust to casino fat tails and large multipliers)
    const trianaRatio = mad > 0 ? meanReturn / mad : 0;
    const annualizedTriana = trianaRatio * 10;

    // Sample Sharpe Ratio (S = meanReturn / stdDev, assuming Risk-Free Rate Rf = 0)
    const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
    // Scaled Sharpe (normalized per 100-bet session volume: S * sqrt(100))
    const annualizedSharpe = sharpeRatio * 10;

    // Downside deviation & Sortino Ratio (penalizes only losing volatility)
    const negativeReturns = returns.filter((r) => r < 0);
    const sumSquaredDownside = negativeReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0);
    const downsideDeviation = negativeReturns.length > 0 ? Math.sqrt(sumSquaredDownside / n) : 0;
    const sortinoRatio = downsideDeviation > 0 ? meanReturn / downsideDeviation : 0;

    // Qualitative Rating & Color
    let rating = 'Neutre';
    let color = 'slate';
    if (sharpeRatio >= 0.4) {
      rating = 'Alpha Exceptionnel (Excellente efficience)';
      color = 'emerald';
    } else if (sharpeRatio > 0.12) {
      rating = 'Très Bon Rendement / Risque';
      color = 'teal';
    } else if (sharpeRatio > 0) {
      rating = 'Positif Modéré (Rentable mais volatil)';
      color = 'blue';
    } else if (sharpeRatio > -0.15) {
      rating = 'Sous-optimal (Légère dégradation)';
      color = 'amber';
    } else {
      rating = 'Critique (Volatilité destructive)';
      color = 'rose';
    }

    let trianaRating = 'Neutre';
    if (trianaRatio >= 0.4) {
      trianaRating = 'Alpha Robuste (Linéaire optimal)';
    } else if (trianaRatio > 0.15) {
      trianaRating = 'Forte Efficience Anti-Variance';
    } else if (trianaRatio > 0) {
      trianaRating = 'Rentabilité Linéaire Modérée';
    } else if (trianaRatio > -0.15) {
      trianaRating = 'Frottement de Maison';
    } else {
      trianaRating = 'Pertes Asymétriques Fortes';
    }

    // Breakdown per Game / Strategy type
    const perGameMap: Record<string, BetResult[]> = {};
    bets.forEach((b) => {
      if (!perGameMap[b.game]) perGameMap[b.game] = [];
      perGameMap[b.game].push(b);
    });

    const perGameSharpe: Record<string, { count: number; sharpe: number; triana: number; profit: number; winRate: number; stdDev: number; mad: number; meanReturn: number }> = {};
    Object.entries(perGameMap).forEach(([game, gameBets]) => {
      if (gameBets.length < 2) {
        const wins = gameBets.filter((b) => b.won).length;
        perGameSharpe[game] = {
          count: gameBets.length,
          sharpe: 0,
          triana: 0,
          profit: Number(gameBets.reduce((acc, b) => acc + b.profit, 0).toFixed(4)),
          winRate: Number(((wins / gameBets.length) * 100).toFixed(1)),
          stdDev: 0,
          mad: 0,
          meanReturn: 0
        };
        return;
      }
      const gReturns = gameBets.map((b) => (b.betAmount > 0 ? b.profit / b.betAmount : 0));
      const gMean = gReturns.reduce((acc, r) => acc + r, 0) / gReturns.length;
      const gSumSq = gReturns.reduce((acc, r) => acc + Math.pow(r - gMean, 2), 0);
      const gStdDev = Math.sqrt(gSumSq / (gReturns.length - 1));
      const gSharpe = gStdDev > 0 ? gMean / gStdDev : 0;
      
      const gSumAbs = gReturns.reduce((acc, r) => acc + Math.abs(r - gMean), 0);
      const gMad = gSumAbs / gReturns.length;
      const gTriana = gMad > 0 ? gMean / gMad : 0;

      const gWins = gameBets.filter((b) => b.won).length;

      perGameSharpe[game] = {
        count: gameBets.length,
        sharpe: Number(gSharpe.toFixed(3)),
        triana: Number(gTriana.toFixed(3)),
        profit: Number(gameBets.reduce((acc, b) => acc + b.profit, 0).toFixed(4)),
        winRate: Number(((gWins / gameBets.length) * 100).toFixed(1)),
        stdDev: Number(gStdDev.toFixed(3)),
        mad: Number(gMad.toFixed(3)),
        meanReturn: Number((gMean * 100).toFixed(2))
      };
    });

    // Theoretical Sharpe for the current strategy (based on targetMultiplier and winChance)
    const targetMult = strategy.targetMultiplier || 2.0;
    const winProb = (strategy.winChance || 49.5) / 100;
    const theoMean = winProb * targetMult - 1;
    const theoStd = targetMult * Math.sqrt(winProb * (1 - winProb));
    const theoreticalSharpe = theoStd > 0 ? theoMean / theoStd : 0;

    return {
      sharpeRatio: Number(sharpeRatio.toFixed(3)),
      annualizedSharpe: Number(annualizedSharpe.toFixed(2)),
      trianaRatio: Number(trianaRatio.toFixed(3)),
      annualizedTriana: Number(annualizedTriana.toFixed(2)),
      mad: Number(mad.toFixed(3)),
      meanReturnPct: Number(meanReturnPct.toFixed(2)),
      meanProfitPerBet: Number(meanProfitPerBet.toFixed(4)),
      stdDev: Number(stdDev.toFixed(3)),
      sortinoRatio: Number(sortinoRatio.toFixed(3)),
      downsideDeviation: Number(downsideDeviation.toFixed(3)),
      profitFactor: stats.profitFactor || 0,
      rating,
      trianaRating,
      color,
      perGameSharpe,
      theoreticalSharpe: Number(theoreticalSharpe.toFixed(3)),
      totalReturnsCount: n
    };
  }, [bets, stats.profitFactor, strategy]);

  // Prepare and filter chart data over time
  const chartData = useMemo(() => {
    if (bets.length === 0) return [];

    const now = Date.now();
    const timestamps = bets.map(b => b.timestamp || 0).filter(t => t > 0);
    const refTime = timestamps.length > 0 ? Math.max(now, ...timestamps) : now;
    let filteredByTime = bets;

    if (timeHorizon === '1h') {
      filteredByTime = bets.filter((b) => (b.timestamp || refTime) >= refTime - 3600 * 1000);
      if (filteredByTime.length === 0 && bets.length > 0) filteredByTime = bets.slice(-50);
    } else if (timeHorizon === '24h') {
      filteredByTime = bets.filter((b) => (b.timestamp || refTime) >= refTime - 24 * 3600 * 1000);
      if (filteredByTime.length === 0 && bets.length > 0) filteredByTime = bets.slice(-200);
    } else if (timeHorizon === '7d') {
      filteredByTime = bets.filter((b) => (b.timestamp || refTime) >= refTime - 7 * 24 * 3600 * 1000);
    }

    // Sort chronologically ascending
    const sorted = [...filteredByTime].sort((a, b) => a.timestamp - b.timestamp);

    return sorted.map((b, idx) => {
      const dateObj = new Date(b.timestamp);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const fullDateTime = `${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} à ${timeStr}`;

      return {
        id: b.id,
        betIndex: idx + 1,
        betNumber: b.betNumber || idx + 1,
        timestamp: b.timestamp,
        time: timeStr,
        fullDateTime,
        profit: Number(b.runningProfit.toFixed(4)),
        instantProfit: Number(b.profit.toFixed(4)),
        balance: Number(b.runningBalance.toFixed(4)),
        betAmount: Number(b.betAmount.toFixed(4)),
        won: b.won,
        game: b.game,
        multiplier: b.payoutMultiplier,
        targetMultiplier: b.targetMultiplier,
        strategyName: strategy?.name || 'Stratégie Dynamique',
      };
    });
  }, [bets, timeHorizon, strategy]);

  // Derived Chart Metrics
  const chartStats = useMemo(() => {
    if (chartData.length === 0) {
      return { peak: 0, lowest: 0, latest: 0 };
    }
    const profits = chartData.map((d) => d.profit);
    return {
      peak: Math.max(...profits),
      lowest: Math.min(...profits),
      latest: chartData[chartData.length - 1].profit,
    };
  }, [chartData]);

  // Filter bets table
  const filteredBets = bets.filter((b) => {
    if (filterType === 'won' && !b.won) return false;
    if (filterType === 'lost' && b.won) return false;
    if (selectedGameFilter !== 'all' && b.game !== selectedGameFilter) return false;
    return true;
  });

  // Export to CSV
  const handleExportCsv = () => {
    if (bets.length === 0) return;
    const headers = ['Bet #', 'Timestamp', 'Game', 'Bet Amount', 'Target Multiplier', 'Payout Multiplier', 'Won', 'Profit', 'Running Balance'];
    const rows = bets.map((b) => [
      b.betNumber,
      new Date(b.timestamp).toISOString(),
      b.game,
      b.betAmount,
      b.targetMultiplier,
      b.payoutMultiplier,
      b.won ? 'YES' : 'NO',
      b.profit,
      b.runningBalance,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stake_bot_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run AI Session Analysis
  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/gemini/analyze-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          recentBets: bets.slice(-20),
          currentStrategy: strategy,
          riskAdjustedMetrics: {
            trianaRatio: riskAdjustedMetrics.trianaRatio,
            sharpeRatio: riskAdjustedMetrics.sharpeRatio,
            sortinoRatio: riskAdjustedMetrics.sortinoRatio,
            mad: riskAdjustedMetrics.mad,
            stdDev: riskAdjustedMetrics.stdDev,
            meanReturnPct: riskAdjustedMetrics.meanReturnPct,
            rating: riskAdjustedMetrics.rating,
            trianaRating: riskAdjustedMetrics.trianaRating
          }
        }),
      });
      const data = await res.json();
      setAiAnalysisResult(data.analysis || 'Analyse indisponible.');
    } catch (err: any) {
      setAiAnalysisResult(`Erreur d'analyse : ${err.message}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Custom Recharts Tooltip Component
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProfitPositive = data.profit >= 0;
      const isBetWin = data.won;

      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[250px] pointer-events-none animate-in fade-in duration-150 z-50">
          
          {/* Header with Bet # & Timestamp */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span>{data.fullDateTime || data.time}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
              Pari #{data.betNumber || data.betIndex}
            </span>
          </div>

          {/* Strategy Name Banner */}
          {data.strategyName && (
            <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/20 px-2 py-1 rounded-lg text-[11px]">
              <span className="text-indigo-300/80 text-[10px] uppercase font-bold">Stratégie :</span>
              <span className="font-bold text-indigo-200 truncate max-w-[150px]">{data.strategyName}</span>
            </div>
          )}

          {/* Core Metrics List */}
          <div className="space-y-1.5 text-[11px]">
            
            {/* Instant Net Profit for this Bet */}
            <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Profit Net du Tirage :</span>
              <span className={`font-mono font-black text-xs flex items-center gap-0.5 ${
                isBetWin ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isBetWin ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isBetWin ? '+' : ''}{data.instantProfit.toFixed(4)} {currency}
              </span>
            </div>

            {/* Bet Amount (Montant Misé) */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Montant Misé :</span>
              <span className="font-mono font-bold text-slate-100">{data.betAmount} {currency}</span>
            </div>

            {/* Multiplier Achieved vs Target */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Multiplicateur :</span>
              <span className="font-mono font-semibold text-amber-300">
                {data.multiplier !== undefined ? `${data.multiplier.toFixed(2)}x` : '-'}
                {data.targetMultiplier && (
                  <span className="text-slate-500 text-[10px] ml-1">(visé: {data.targetMultiplier}x)</span>
                )}
              </span>
            </div>

            {/* Cumulative Profit */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Profit Cumulé Session :</span>
              <span className={`font-mono font-bold text-xs ${
                isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {isProfitPositive ? '+' : ''}{data.profit.toFixed(4)} {currency}
              </span>
            </div>

            {/* Running Balance */}
            {data.balance !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Solde Portefeuille :</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  {data.balance.toFixed(4)} {currency}
                </span>
              </div>
            )}

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
    <motion.div 
      id="analytics-dashboard-panel" 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      
      {/* Strategy Optimization AI Banner (Risk Management & Drawdown Minimizer) */}
      {strategy && onUpdateStrategy && (
        <SuggestStrategyOptimizationButton
          strategy={strategy}
          onUpdateStrategy={onUpdateStrategy}
          onSelectStrategy={onSelectStrategy}
          balance={balance}
          currency={currency}
          stats={stats}
          bets={bets}
          variant="banner"
          onStartAutoBet={onStartAutoBet}
        />
      )}

      {/* 1. High-Level KPI Cards with Smooth Stagger and Hover/Tap feedback */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        
        {/* Solde Actuel (Synchronisé Header / Wallets) */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          className="bg-slate-900/90 border border-orange-500/40 hover:border-orange-500/60 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-orange-400 font-bold">
              <Wallet className="w-3.5 h-3.5" />
              <span>Solde Actuel</span>
            </span>
            <div className="flex items-center gap-1" title="Synchronisé en direct avec le solde en haut à gauche">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase font-mono tracking-wider">Sync</span>
            </div>
          </div>

          {isEditingBalance ? (
            <div className="flex items-center gap-1 my-0.5">
              <input
                type="number"
                step="any"
                min="0"
                value={editBalanceInput}
                onChange={(e) => setEditBalanceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBalance();
                  if (e.key === 'Escape') setIsEditingBalance(false);
                }}
                autoFocus
                className="w-full bg-slate-950 border border-orange-500 text-slate-100 text-xs font-mono font-bold rounded px-1.5 py-0.5 focus:outline-none"
              />
              <button
                onClick={handleSaveBalance}
                className="p-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                title="Enregistrer"
              >
                ✓
              </button>
            </div>
          ) : (
            <div 
              onClick={() => onUpdateBalance && setIsEditingBalance(true)}
              className={onUpdateBalance ? "cursor-pointer group py-0.5" : "py-0.5"}
              title={onUpdateBalance ? "Cliquez pour modifier le solde directement" : undefined}
            >
              <motion.div 
                key={`stat-balance-${balance}`}
                initial={{ scale: 0.95, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-lg sm:text-xl font-bold font-mono text-orange-300 group-hover:text-orange-200 transition truncate"
              >
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </motion.div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1 pt-1 border-t border-slate-800/80">
            <span className="text-orange-400 font-bold">{currency}</span>
            <div className="flex items-center gap-1.5">
              {onResetBalance && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Réinitialiser le solde à 100.00 ' + currency + ' ?')) {
                      onResetBalance();
                    }
                  }}
                  className="text-slate-400 hover:text-orange-300 transition text-[10px] cursor-pointer"
                  title="Réinitialiser à 100"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              )}
              <span className="text-[9px] text-slate-400 font-mono">
                {credentials?.isLiveMode ? 'Live' : 'Simu'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Net Profit */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Profit Net</span>
            {stats.netProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <motion.div 
            key={`stat-profit-${stats.netProfit}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`text-lg sm:text-xl font-bold font-mono ${
              stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(4)}
          </motion.div>
          <span className="text-[10px] text-slate-500 font-semibold">{currency}</span>
        </motion.div>

        {/* Win Rate */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Taux Victoire</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <motion.div 
            key={`stat-winrate-${stats.winRate}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-lg sm:text-xl font-bold font-mono text-slate-100"
          >
            {stats.winRate.toFixed(1)}%
          </motion.div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {stats.totalWon} W / {stats.totalLost} L
          </span>
        </motion.div>

        {/* Total Wagered */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Volume Misé</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <motion.div 
            key={`stat-wagered-${stats.totalWagered}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-lg sm:text-xl font-bold font-mono text-slate-100"
          >
            {stats.totalWagered.toFixed(2)}
          </motion.div>
          <span className="text-[10px] text-slate-500 font-semibold">{currency} (Total)</span>
        </motion.div>

        {/* Sharpe & Triana Risk-Adjusted Ratio */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`border rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200 ${
            riskAdjustedMetrics.trianaRatio > 0
              ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/60'
              : riskAdjustedMetrics.trianaRatio < 0
              ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/60'
              : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ratio Triana</span>
            </span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase font-mono ${
              riskAdjustedMetrics.trianaRatio > 0.3
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : riskAdjustedMetrics.trianaRatio > 0
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : riskAdjustedMetrics.trianaRatio < 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {riskAdjustedMetrics.trianaRatio > 0.3 ? 'Alpha' : riskAdjustedMetrics.trianaRatio > 0 ? 'Positif' : 'Risque'}
            </span>
          </div>
          <motion.div 
            key={`stat-triana-${riskAdjustedMetrics.trianaRatio}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`text-lg sm:text-xl font-bold font-mono ${
              riskAdjustedMetrics.trianaRatio > 0
                ? 'text-emerald-400'
                : riskAdjustedMetrics.trianaRatio < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {riskAdjustedMetrics.trianaRatio > 0 ? '+' : ''}{riskAdjustedMetrics.trianaRatio.toFixed(3)}
          </motion.div>
          <span className="text-[10px] text-slate-400 font-semibold block truncate">
            {riskAdjustedMetrics.totalReturnsCount >= 2 ? `S: ${riskAdjustedMetrics.sharpeRatio > 0 ? '+' : ''}${riskAdjustedMetrics.sharpeRatio.toFixed(2)} | MAD: ${riskAdjustedMetrics.mad.toFixed(2)}` : 'Min. 2 paris'}
          </span>
        </motion.div>

        {/* Total Bets */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Total Paris</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <motion.div 
            key={`stat-bets-${stats.totalBets}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-lg sm:text-xl font-bold font-mono text-slate-100"
          >
            {stats.totalBets}
          </motion.div>
          <span className="text-[10px] text-slate-500 font-semibold">Tirages exécutés</span>
        </motion.div>

        {/* Max Drawdown */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <motion.div 
            key={`stat-dd-${stats.maxDrawdown}`}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-lg sm:text-xl font-bold font-mono text-rose-400"
          >
            -{stats.maxDrawdown.toFixed(1)}%
          </motion.div>
          <span className="text-[10px] text-slate-500 font-semibold">Creux maximal</span>
        </motion.div>

        {/* Max Streaks */}
        <motion.div 
          variants={cardVariants}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-xs transition-colors duration-200"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>Séries Max</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-200">
            <span className="text-emerald-400">+{stats.maxWinStreak}W</span> / <span className="text-rose-400">-{stats.maxLossStreak}L</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Pics de variance</span>
        </motion.div>

      </div>

      {/* 2. Charts & AI Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recharts Line Chart : Profit Progression Over Time */}
        <motion.div 
          variants={chartContainerVariants}
          className="lg:col-span-8 space-y-3"
        >
          {/* Engine Selector Bar (Balance Curve vs Stake vs Multi-Axes) */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2 px-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Graphique :</span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px] font-mono font-bold whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setChartTheme('balance')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    chartTheme === 'balance'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>PERFORMANCE CUMULÉE & SOLDE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartTheme('stake')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    chartTheme === 'stake'
                      ? 'bg-[#00e701] text-slate-950 shadow-sm shadow-[#00e701]/30 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  <span>STAKE.COM &bull; ANTEBOT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartTheme('standard')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    chartTheme === 'standard'
                      ? 'bg-indigo-600 text-white shadow-sm font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LineChartIcon className="w-3 h-3" />
                  <span>Multi-Axes & Profit</span>
                </button>
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline whitespace-nowrap">
              {bets.length} paris enregistrés
            </span>
          </div>

          {chartTheme === 'balance' ? (
            <SimulatedBalanceLineChart
              bets={bets}
              currency={currency}
              strategyName={strategy?.name}
              startingBalance={bets.length > 0 && bets[bets.length - 1]?.runningBalance !== undefined ? (bets[bets.length - 1].runningBalance - bets[bets.length - 1].profit) : balance}
              currentBalance={balance}
            />
          ) : chartTheme === 'stake' ? (
            <StakeLiveChart
              bets={bets}
              stats={stats}
              currency={currency}
              strategyName={strategy?.name}
              gameTitle={strategy.game}
              takeProfitTarget={strategy.stopOnProfit}
              stopLossTarget={strategy.stopOnLoss}
              startingBalance={bets.length > 0 && bets[bets.length - 1]?.runningBalance !== undefined ? (bets[bets.length - 1].runningBalance - bets[bets.length - 1].profit) : balance}
              currentBalance={balance}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              
              {/* Chart Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <LineChartIcon className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Progression du Profit au Fil du Temps
                </h4>
                <motion.span 
                  layout
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono"
                >
                  {chartData.length} points
                </motion.span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Courbe d'équité en temps réel avec suivi chronologique ({currency})
              </p>
            </div>

            {/* Top Right Quick Toggles with mobile friendly touches */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Time Range Horizon */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                {([
                  { key: 'all', label: 'Tout' },
                  { key: '1h', label: '1H' },
                  { key: '24h', label: '24H' },
                  { key: '7d', label: '7J' },
                ] as const).map(({ key, label }) => (
                  <motion.button
                    key={key}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimeHorizon(key)}
                    className={`px-2.5 py-1 sm:py-0.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                      timeHorizon === key
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>

              {/* Chart Mode (Line vs Area) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setChartDisplayMode('line')}
                  className={`px-2.5 py-1 sm:py-0.5 rounded-lg transition-colors duration-150 ${
                    chartDisplayMode === 'line'
                      ? 'bg-slate-800 text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ligne
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setChartDisplayMode('area')}
                  className={`px-2.5 py-1 sm:py-0.5 rounded-lg transition-colors duration-150 ${
                    chartDisplayMode === 'area'
                      ? 'bg-slate-800 text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Aire
                </motion.button>
              </div>

              {/* Axis Switcher (Time vs Index) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAxisMode('time')}
                  className={`px-2.5 py-1 sm:py-0.5 rounded-lg transition-colors duration-150 ${
                    axisMode === 'time'
                      ? 'bg-slate-800 text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Horodatage
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAxisMode('index')}
                  className={`px-2.5 py-1 sm:py-0.5 rounded-lg transition-colors duration-150 ${
                    axisMode === 'index'
                      ? 'bg-slate-800 text-indigo-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  # Paris
                </motion.button>
              </div>

            </div>
          </div>

          {/* Key Stat Badges along the Top of Chart */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col"
            >
              <span className="text-[10px] text-slate-400">Profit Actuel</span>
              <span className={`font-mono font-bold text-xs sm:text-sm ${chartStats.latest >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {chartStats.latest >= 0 ? '+' : ''}{chartStats.latest.toFixed(4)} {currency}
              </span>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col"
            >
              <span className="text-[10px] text-slate-400">Pic ATH</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
                +{chartStats.peak.toFixed(4)} {currency}
              </span>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col"
            >
              <span className="text-[10px] text-slate-400">Creux Min</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-rose-400">
                {chartStats.lowest <= 0 ? '' : '+'}{chartStats.lowest.toFixed(4)} {currency}
              </span>
            </motion.div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 hidden sm:flex flex-col">
              <span className="text-[10px] text-slate-400">Affichage Métrique</span>
              <div className="flex items-center gap-1 mt-0.5">
                {(['profit', 'balance', 'both'] as const).map((m) => (
                  <motion.button
                    key={m}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setChartMetric(m)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors duration-150 ${
                      chartMetric === m ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m === 'both' ? 'Double' : m}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Recharts Canvas with Fluid Framer Motion Crossfade */}
          <div className="h-72 w-full pt-2 relative">
            <AnimatePresence mode="wait">
              {chartData.length > 0 ? (
                <motion.div
                  key={`chart-${chartDisplayMode}-${timeHorizon}-${axisMode}-${chartMetric}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {chartDisplayMode === 'line' ? (
                      <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        
                        <XAxis 
                          dataKey={axisMode === 'time' ? 'time' : 'betIndex'} 
                          stroke="#64748b" 
                          tick={{ fontSize: 11 }} 
                          minTickGap={20}
                        />
                        
                        <YAxis 
                          yAxisId="left"
                          stroke="#64748b" 
                          tick={{ fontSize: 11 }} 
                          domain={['auto', 'auto']}
                        />

                        {chartMetric === 'both' && (
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#06b6d4" 
                            tick={{ fontSize: 11 }} 
                            domain={['auto', 'auto']}
                          />
                        )}

                        {/* Zero Break-Even Baseline */}
                        <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeDasharray="4 4" label={{ value: '0.00', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }} />

                        <Tooltip content={<CustomChartTooltip />} />

                        {/* Primary Profit Progression Line */}
                        {(chartMetric === 'profit' || chartMetric === 'both') && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="profit"
                            name="Profit Net Cumulé"
                            stroke={stats.netProfit >= 0 ? '#10b981' : '#f43f5e'}
                            strokeWidth={2.5}
                            dot={chartData.length <= 30 ? { r: 3, fill: '#10b981', strokeWidth: 1 } : false}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                            isAnimationActive={true}
                            animationDuration={600}
                          />
                        )}

                        {/* Secondary Balance Line */}
                        {(chartMetric === 'balance' || chartMetric === 'both') && (
                          <Line
                            yAxisId={chartMetric === 'both' ? 'right' : 'left'}
                            type="monotone"
                            dataKey="balance"
                            name="Solde Total"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            strokeDasharray={chartMetric === 'both' ? '4 4' : undefined}
                            dot={false}
                            activeDot={{ r: 5, fill: '#06b6d4' }}
                          />
                        )}

                        {chartData.length > 40 && showBrush && (
                          <Brush dataKey={axisMode === 'time' ? 'time' : 'betIndex'} height={25} stroke="#3b82f6" fill="#0f172a" />
                        )}
                      </LineChart>
                    ) : (
                      <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="profitGradProgression" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stats.netProfit >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={stats.netProfit >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                          dataKey={axisMode === 'time' ? 'time' : 'betIndex'} 
                          stroke="#64748b" 
                          tick={{ fontSize: 11 }} 
                          minTickGap={20}
                        />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke={stats.netProfit >= 0 ? '#10b981' : '#f43f5e'}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#profitGradProgression)"
                          isAnimationActive={true}
                          animationDuration={600}
                        />
                      </AreaChart>
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
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  >
                    <LineChartIcon className="w-8 h-8 text-slate-700" />
                  </motion.div>
                  <p className="font-semibold text-slate-400">Aucun pari enregistré pour le moment.</p>
                  <span className="text-[11px] text-slate-600 text-center px-4">Lancez un pari ou activez l'Auto-Bet pour tracer la courbe de profit en direct.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Zoom & Range Controls */}
          {chartData.length > 40 && (
            <div className="flex items-center justify-end pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBrush(!showBrush)}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors duration-150 cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showBrush ? 'Masquer le curseur de zoom' : 'Afficher le curseur de zoom temporel'}</span>
              </motion.button>
            </div>
          )}
            </div>
          )}

        </motion.div>

        {/* Gemini AI Performance Review with Smooth Transitions */}
        <motion.div 
          variants={chartContainerVariants}
          className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-bold text-white">
                Audit IA de Session
              </h4>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 text-xs text-slate-300 min-h-[180px] leading-relaxed overflow-y-auto">
              <AnimatePresence mode="wait">
                {aiAnalysisResult ? (
                  <motion.div 
                    key="ai-result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="whitespace-pre-wrap"
                  >
                    {aiAnalysisResult}
                  </motion.div>
                ) : (
                  <motion.p 
                    key="ai-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-slate-500 text-[11px]"
                  >
                    Cliquez sur "Analyser la session" pour obtenir un diagnostic mathématique par Gemini 3.7 (volatilité, déviation standard, recommandation de cashout).
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.button
            id="btn-run-ai-analysis"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAi || bets.length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzingAi ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Audit en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyser la Session avec l'IA</span>
              </>
            )}
          </motion.button>
        </motion.div>

      </div>

      {/* 3. Risk-Adjusted Return & Triana/Sharpe Analysis Matrix */}
      <motion.div
        variants={chartContainerVariants}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white">
                  Évaluation du Rendement Ajusté au Risque (Ratios de Triana & Sharpe)
                </h4>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border font-mono ${
                  riskAdjustedMetrics.trianaRatio > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : riskAdjustedMetrics.trianaRatio < 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  Triana : {riskAdjustedMetrics.trianaRating}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Mesure de performance robuste aux queues de distribution épaisses (fat tails) et aux gains asymétriques de casino.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSharpeHelp(!showSharpeHelp)}
            className="text-xs text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showSharpeHelp ? 'Masquer les formules' : 'Comparer Triana vs Sharpe'}</span>
            {showSharpeHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Explanatory accordion */}
        {showSharpeHelp && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 text-xs text-slate-300 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Ratio de Triana (Pablo Triana - Optimisé Casino) :</span>
                </div>
                <p className="text-[11px] font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  Triana = E[R] / MAD = E[R] / ( (1/N) * Σ |R_i - E[R]| )
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-emerald-300">Pourquoi est-il plus robuste au casino ?</strong> Le ratio de Triana divise par la <em>volatilité absolue moyenne (MAD)</em> plutôt que par l'écart-type quadratique. Il ne sur-pénalise pas les gros multiplicateurs gagnants (ex: x50, x100) comme le ferait Sharpe.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <Gauge className="w-4 h-4" />
                  <span>Ratio de Sharpe Classique (William Sharpe) :</span>
                </div>
                <p className="text-[11px] font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800">
                  Sharpe = ( E[R] - Rf ) / σ_R
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Basé sur la variance quadratique σ = √( (1/N) * Σ(R_i - E[R])² ). Idéal pour des distributions gaussiennes classiques, mais sensible aux pics asymétriques de multiplicateurs de casino.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[10px] text-slate-400">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <strong className="text-emerald-400 block mb-0.5">&gt; +0.40 (Alpha Robuste)</strong>
                Excellente régularité, gain moyen élevé par rapport aux oscillations de bankroll.
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <strong className="text-teal-400 block mb-0.5">0.15 à 0.40 (Solide)</strong>
                Rendement positif équilibré face à la volatilité moyenne des mises.
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <strong className="text-amber-400 block mb-0.5">-0.15 à 0.00 (Frottement)</strong>
                Gains insuffisants pour dépasser l'avantage mathématique du jeu.
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <strong className="text-rose-400 block mb-0.5">&lt; -0.15 (Critique)</strong>
                Variance destructrice, pertes asymétriques fréquentes.
              </div>
            </div>
          </div>
        )}

        {/* 5 Core Financial Risk Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Triana Ratio */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold text-emerald-300">Ratio de Triana (T)</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              riskAdjustedMetrics.trianaRatio > 0 ? 'text-emerald-400' : riskAdjustedMetrics.trianaRatio < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {riskAdjustedMetrics.trianaRatio > 0 ? '+' : ''}{riskAdjustedMetrics.trianaRatio.toFixed(3)}
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono block">
              Normalisé (x100) : {riskAdjustedMetrics.annualizedTriana > 0 ? '+' : ''}{riskAdjustedMetrics.annualizedTriana.toFixed(2)}
            </span>
          </div>

          {/* Sharpe Ratio */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Ratio de Sharpe (S)</span>
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              riskAdjustedMetrics.sharpeRatio > 0 ? 'text-blue-400' : riskAdjustedMetrics.sharpeRatio < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {riskAdjustedMetrics.sharpeRatio > 0 ? '+' : ''}{riskAdjustedMetrics.sharpeRatio.toFixed(3)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              Normalisé (x100) : {riskAdjustedMetrics.annualizedSharpe > 0 ? '+' : ''}{riskAdjustedMetrics.annualizedSharpe.toFixed(2)}
            </span>
          </div>

          {/* Sortino Ratio */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Ratio de Sortino</span>
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              riskAdjustedMetrics.sortinoRatio > 0 ? 'text-purple-400' : riskAdjustedMetrics.sortinoRatio < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {riskAdjustedMetrics.sortinoRatio > 0 ? '+' : ''}{riskAdjustedMetrics.sortinoRatio.toFixed(3)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block truncate">
              Downside σ : {riskAdjustedMetrics.downsideDeviation.toFixed(2)}
            </span>
          </div>

          {/* Realized Volatility: MAD vs Sigma */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Volatilité (MAD / σ)</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-200">
              {riskAdjustedMetrics.mad.toFixed(2)} <span className="text-xs text-slate-500 font-normal">/ {riskAdjustedMetrics.stdDev.toFixed(2)}σ</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              MAD (Linéaire) vs σ (Quadratique)
            </span>
          </div>

          {/* Mean Return per Bet */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Rendement Moyen / Pari</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className={`text-xl font-bold font-mono ${
              riskAdjustedMetrics.meanReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {riskAdjustedMetrics.meanReturnPct >= 0 ? '+' : ''}{riskAdjustedMetrics.meanReturnPct.toFixed(2)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono block truncate">
              Moy: {riskAdjustedMetrics.meanProfitPerBet >= 0 ? '+' : ''}{riskAdjustedMetrics.meanProfitPerBet.toFixed(4)} {currency}
            </span>
          </div>

        </div>

        {/* Per-Game / Strategy Breakdown Table */}
        {Object.keys(riskAdjustedMetrics.perGameSharpe).length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between flex-wrap gap-1">
              <span>Performance Ajustée au Risque par Jeu (Comparatif Triana vs Sharpe) :</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Stratégie active : <strong className="text-slate-300 font-mono">{strategy.name}</strong> (Théorique S : {riskAdjustedMetrics.theoreticalSharpe > 0 ? '+' : ''}{riskAdjustedMetrics.theoreticalSharpe})
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">Jeu / Catégorie</th>
                    <th className="py-2.5 px-3.5">Paris Joués</th>
                    <th className="py-2.5 px-3.5">Taux Victoire</th>
                    <th className="py-2.5 px-3.5">Rendement Moyen</th>
                    <th className="py-2.5 px-3.5">Vol. Linéaire (MAD)</th>
                    <th className="py-2.5 px-3.5">Écart-Type (σ)</th>
                    <th className="py-2.5 px-3.5">Profit Total</th>
                    <th className="py-2.5 px-3.5 text-emerald-400">Ratio de Triana (T)</th>
                    <th className="py-2.5 px-3.5">Ratio de Sharpe (S)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {Object.entries(riskAdjustedMetrics.perGameSharpe).map(([game, data]) => {
                    const isTrianaPositive = data.triana > 0;
                    const isSharpePositive = data.sharpe > 0;
                    return (
                      <tr key={game} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3.5 font-bold uppercase text-slate-200 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>{game}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-300 font-semibold">
                          {data.count}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-300">
                          {data.winRate.toFixed(1)}%
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${data.meanReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.meanReturn >= 0 ? '+' : ''}{data.meanReturn.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-300">
                          {data.mad.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-400">
                          {data.stdDev.toFixed(3)}
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.profit >= 0 ? '+' : ''}{data.profit.toFixed(4)} {currency}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[11px] ${
                            isTrianaPositive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : data.triana < 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isTrianaPositive ? '+' : ''}{data.triana.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                            isSharpePositive
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : data.sharpe < 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isSharpePositive ? '+' : ''}{data.sharpe.toFixed(3)}
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
      </motion.div>

      {/* 4. Realized vs Theoretical Expected Value (EV) Analysis & Simulation Tool */}
      <EvCalculatorTool 
        bets={bets} 
        currency={currency} 
        strategy={strategy} 
      />

      {/* 5. 10,000-Run Monte Carlo Stochastic Risk & Trajectory Simulation */}
      <MonteCarloSimulationTool
        strategy={strategy}
        currency={currency}
        initialBankroll={balance}
      />

      {/* 6. Session ROI Evolution & Drawdown Mapping AreaChart */}
      <SessionRoiDrawdownAreaChart
        bets={bets}
        manualSessions={manualSessions}
        currency={currency}
        initialBankroll={bets.length > 0 && bets[bets.length - 1]?.runningBalance !== undefined ? (bets[bets.length - 1].runningBalance - bets[bets.length - 1].profit) : balance}
      />

      {/* 7. Session Profit Distribution BarChart & Profitability Brackets */}
      <SessionProfitDistributionBarChart
        bets={bets}
        manualSessions={manualSessions}
        currency={currency}
      />

      {/* 8. Calendar Heatmap & Day-of-Week Performance Cycles */}
      <CalendarHeatmap
        bets={bets}
        manualSessions={manualSessions}
        currency={currency}
      />

      {/* 6. Live Bet Log Table with Smooth Transitions */}
      <motion.div 
        variants={chartContainerVariants}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
      >
        
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Historique Détaillé des Paris ({filteredBets.length})
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['all', 'won', 'lost'] as const).map((t) => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize transition-colors duration-150 cursor-pointer ${
                    filterType === t
                      ? 'bg-slate-800 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'Tous' : t === 'won' ? 'Gagnés' : 'Perdus'}
                </motion.button>
              ))}
            </div>

            {/* Export CSV */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCsv}
              disabled={bets.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </motion.button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4"># Paris</th>
                <th className="py-3 px-4">Jeu</th>
                <th className="py-3 px-4">Mise ({currency})</th>
                <th className="py-3 px-4">Cote Cible</th>
                <th className="py-3 px-4">Multiplicateur</th>
                <th className="py-3 px-4">Profit ({currency})</th>
                <th className="py-3 px-4">Solde</th>
                <th className="py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <AnimatePresence initial={false}>
                {filteredBets.slice(-50).reverse().map((b, idx) => {
                  const isNewest = bets.length > 0 && b.id === bets[0]?.id && (Date.now() - b.timestamp < 2500);
                  const rowAnimationClass = isNewest
                    ? b.won
                      ? 'animate-bet-win border-emerald-500/60 font-semibold'
                      : 'animate-bet-loss border-rose-500/60 font-semibold'
                    : 'hover:bg-slate-800/40 transition-colors duration-150';

                  return (
                    <motion.tr 
                      key={b.id} 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={`transition-all duration-300 ${rowAnimationClass}`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-300">
                        #{b.betNumber}
                      </td>
                      <td className="py-2.5 px-4 uppercase text-[11px] font-bold text-slate-400">
                        {b.game}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200">
                        {b.betAmount.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {b.targetMultiplier.toFixed(2)}x
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 font-bold">
                        {b.payoutMultiplier.toFixed(2)}x
                      </td>
                      <td className={`py-2.5 px-4 font-bold ${
                        b.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {b.profit >= 0 ? '+' : ''}{b.profit.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {b.runningBalance.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        {b.won ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Gagné
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Perdu
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {filteredBets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-sans">
                    Aucun pari correspondant dans l'historique.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </motion.div>

    </motion.div>
  );
};
