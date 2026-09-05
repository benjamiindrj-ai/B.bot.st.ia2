import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  Calendar,
  SlidersHorizontal,
  MoveHorizontal,
  ChevronDown,
  Gauge,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  Play,
  Pause
} from 'lucide-react';
import { BetResult, BotStatistics } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  LineChart, 
  Line,
  Brush
} from 'recharts';

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const formatBetIndexTick = (val: any) => `#${val}`;
const formatDrawdownTick = (val: any) => `-${val}%`;
const formatNumberTick = (val: any) => `${val}`;

// Top-Level Memoized HUD Tooltip
const StakeChartTooltip = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;
    const won = data.won;
    const curr = data.currency || '$';

    return (
      <div className="bg-[#0b121b]/98 border border-[#213743] rounded-xl p-3.5 shadow-2xl text-xs space-y-2 font-sans min-w-[240px] backdrop-blur-md z-50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#213743] pb-1.5 font-mono">
          <span className="text-slate-300 text-[11px] font-bold">Pari #{data.betIndex}</span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            won 
              ? 'bg-[#00e701]/20 text-[#00e701] border border-[#00e701]/40' 
              : 'bg-[#e9113c]/20 text-[#e9113c] border border-[#e9113c]/40'
          }`}>
            {won ? '✓ GAGNÉ' : '✗ PERDU'}
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center bg-[#13222d] p-1.5 rounded-lg border border-[#213743]">
            <span className="text-slate-400">Profit de ce Pari :</span>
            <span className={`font-mono font-black text-xs ${data.deltaProfit >= 0 ? 'text-[#00e701]' : 'text-[#e9113c]'}`}>
              {data.deltaProfit >= 0 ? '+' : ''}{Number(data.deltaProfit || 0).toFixed(4)} {curr}
            </span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Mise :</span>
            <span className="font-mono font-bold text-white">{data.betAmount} {curr}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Multiplicateur :</span>
            <span className="font-mono font-bold text-amber-400">
              {data.multiplier ? `${Number(data.multiplier).toFixed(2)}x` : `${data.targetMultiplier}x`}
            </span>
          </div>

          {data.roll !== undefined && (
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tirage Provably Fair :</span>
              <span className="font-mono font-semibold text-cyan-300">{Number(data.roll).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-[#213743] pt-1 font-semibold">
            <span className="text-slate-400">Profit Cumulé :</span>
            <span className={`font-mono font-bold text-xs ${data.profit >= 0 ? 'text-[#00e701]' : 'text-[#e9113c]'}`}>
              {data.profit >= 0 ? '+' : ''}{Number(data.profit || 0).toFixed(4)} {curr}
            </span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Solde :</span>
            <span className="font-mono font-bold text-cyan-300">{Number(data.balance || 0).toFixed(4)} {curr}</span>
          </div>

          {data.drawdownPct > 0 && (
            <div className="flex justify-between text-[10px] text-rose-400 border-t border-[#213743] pt-1">
              <span>Drawdown :</span>
              <span className="font-mono font-bold">-{data.drawdownPct}% ({data.drawdownAmount} {curr})</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
});

export interface StakeLiveChartProps {
  bets: BetResult[];
  stats?: BotStatistics;
  currency: string;
  strategyName?: string;
  isAutobetting?: boolean;
  isLiveMode?: boolean;
  startingBalance?: number;
  currentBalance?: number;
  sessionProfit?: number;
  onClearHistory?: () => void;
  compact?: boolean;
  gameTitle?: string;
  takeProfitTarget?: number;
  stopLossTarget?: number;
  betSpeedMs?: number;
}

export const StakeLiveChart: React.FC<StakeLiveChartProps> = ({
  bets,
  stats,
  currency,
  strategyName,
  isAutobetting = false,
  isLiveMode = false,
  startingBalance = 100,
  currentBalance,
  sessionProfit = 0,
  onClearHistory,
  compact = false,
  gameTitle = 'Dice',
  takeProfitTarget,
  stopLossTarget,
  betSpeedMs,
}) => {
  const [chartMode, setChartMode] = useState<'profit' | 'balance' | 'drawdown' | 'wager' | 'bets'>('profit');
  const [curveStyle, setCurveStyle] = useState<'monotone' | 'stepAfter'>('monotone');
  const [timePeriod, setTimePeriod] = useState<'all' | '25' | '50' | '100' | '250' | '500' | '1000' | '1h' | '24h' | '7d'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showGuideLines, setShowGuideLines] = useState<boolean>(true);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [showBrush, setShowBrush] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Session Timer State (Antebot Style live counter - accurately tracks active running session time)
  const [sessionElapsedSec, setSessionElapsedSec] = useState<number>(0);
  const activeElapsedRef = useRef<number>(0);
  const lastActiveTimestampRef = useRef<number | null>(null);

  // Sync / reset session timing when bets change or are cleared
  useEffect(() => {
    if (bets.length === 0) {
      setSessionElapsedSec(0);
      activeElapsedRef.current = 0;
      lastActiveTimestampRef.current = null;
    } else if (activeElapsedRef.current === 0 && bets.length >= 2) {
      // If initialized with existing bet history
      const oldestTimestamp = bets[bets.length - 1]?.timestamp;
      const newestTimestamp = bets[0]?.timestamp;
      if (oldestTimestamp && newestTimestamp && newestTimestamp >= oldestTimestamp) {
        const span = Math.max(1, Math.floor((newestTimestamp - oldestTimestamp) / 1000));
        activeElapsedRef.current = span;
        setSessionElapsedSec(span);
      }
    }
  }, [bets.length]);

  // Live timer interval: ONLY increments actively while autobetting is running
  useEffect(() => {
    if (!isAutobetting) {
      lastActiveTimestampRef.current = null;
      return;
    }

    lastActiveTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      if (lastActiveTimestampRef.current !== null) {
        const deltaSec = (now - lastActiveTimestampRef.current) / 1000;
        lastActiveTimestampRef.current = now;
        activeElapsedRef.current += deltaSec;
        setSessionElapsedSec(Math.floor(activeElapsedRef.current));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      lastActiveTimestampRef.current = null;
    };
  }, [isAutobetting]);

  // Format Elapsed Time as HH:MM:SS
  const formattedTimer = useMemo(() => {
    const totalSec = Math.max(0, sessionElapsedSec);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [sessionElapsedSec]);

  // Chronological bets sequence (left-to-right from Bet #1 to latest)
  const chronologicalBets = useMemo(() => {
    return [...bets].reverse();
  }, [bets]);

  // Filtered bets slice based on selected timeframe
  const displayBets = useMemo(() => {
    if (chronologicalBets.length === 0) return [];
    
    if (timePeriod === '1h') {
      const cutoff = Date.now() - 3600 * 1000;
      const filtered = chronologicalBets.filter(b => (b.timestamp || Date.now()) >= cutoff);
      return filtered.length > 0 ? filtered : chronologicalBets.slice(-50);
    }
    if (timePeriod === '24h') {
      const cutoff = Date.now() - 24 * 3600 * 1000;
      const filtered = chronologicalBets.filter(b => (b.timestamp || Date.now()) >= cutoff);
      return filtered.length > 0 ? filtered : chronologicalBets.slice(-200);
    }
    if (timePeriod === '7d') {
      const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
      const filtered = chronologicalBets.filter(b => (b.timestamp || Date.now()) >= cutoff);
      return filtered.length > 0 ? filtered : chronologicalBets;
    }
    if (timePeriod === 'all') {
      return chronologicalBets;
    }
    const count = parseInt(timePeriod, 10);
    return chronologicalBets.slice(-count);
  }, [chronologicalBets, timePeriod]);

  // --------------------------------------------------------------------------
  // ANTEBOT METRICS MATHEMATICAL ENGINE
  // --------------------------------------------------------------------------

  // 1. Total Bets & Outomes
  const totalBetsCount = bets.length;
  const winsCount = useMemo(() => bets.filter(b => b.won).length, [bets]);
  const lossesCount = useMemo(() => bets.filter(b => !b.won).length, [bets]);
  const winRatePct = totalBetsCount > 0 ? ((winsCount / totalBetsCount) * 100).toFixed(2) : '0.00';
  const lossRatePct = totalBetsCount > 0 ? ((lossesCount / totalBetsCount) * 100).toFixed(2) : '0.00';

  // 2. Net Profit & ROI
  const effectiveNetProfit = bets.length > 0 ? bets[0].runningProfit : sessionProfit;
  const baseBankroll = startingBalance > 0 
    ? startingBalance 
    : (currentBalance !== undefined ? Math.max(1, currentBalance - effectiveNetProfit) : 100);
  const profitPct = ((effectiveNetProfit / baseBankroll) * 100).toFixed(2);
  const isProfitable = effectiveNetProfit >= 0;

  // 3. Balance
  const effectiveBalance = currentBalance !== undefined ? currentBalance : (baseBankroll + effectiveNetProfit);

  // 4. Wagered & Turnover Multiplier
  const totalWagered = useMemo(() => {
    return bets.reduce((acc, b) => acc + b.betAmount, 0);
  }, [bets]);
  const turnoverRatio = (totalWagered / baseBankroll).toFixed(2);

  // 5. Bet Speed (Antebot throughput per sec / min / hour)
  const betSpeed = useMemo(() => {
    if (totalBetsCount === 0) {
      return { perSec: '0.0', perMin: '0', perHour: '0' };
    }

    if (totalBetsCount === 1) {
      const fallbackPerSec = betSpeedMs && betSpeedMs > 0 ? (1000 / betSpeedMs) : 1.0;
      return {
        perSec: fallbackPerSec.toFixed(1),
        perMin: Math.round(fallbackPerSec * 60).toLocaleString(),
        perHour: Math.round(fallbackPerSec * 3600).toLocaleString(),
      };
    }

    // Measure time span from actual bet timestamps
    const newestTime = bets[0]?.timestamp || 0;
    const oldestTime = bets[bets.length - 1]?.timestamp || 0;
    const historySpanSec = (newestTime > 0 && oldestTime > 0 && newestTime >= oldestTime)
      ? (newestTime - oldestTime) / 1000
      : 0;

    // Use active elapsed session seconds if actively betting, or history span
    const effectiveSec = Math.max(
      1,
      isAutobetting ? Math.max(sessionElapsedSec, historySpanSec) : (historySpanSec > 0 ? historySpanSec : sessionElapsedSec)
    );

    let perSecNum = totalBetsCount / effectiveSec;

    // When autobetting is actively running and we have recent bets, compute rolling recent speed
    if (isAutobetting && bets.length >= 3) {
      const windowSize = Math.min(20, bets.length);
      const recentSlice = bets.slice(0, windowSize);
      const recentNewest = recentSlice[0]?.timestamp || 0;
      const recentOldest = recentSlice[recentSlice.length - 1]?.timestamp || 0;
      const recentDeltaSec = (recentNewest > 0 && recentOldest > 0 && recentNewest > recentOldest)
        ? (recentNewest - recentOldest) / 1000
        : 0;

      if (recentDeltaSec >= 0.5) {
        perSecNum = (recentSlice.length - 1) / recentDeltaSec;
      }
    }

    // Cap between realistic physical limits
    perSecNum = Math.max(0, Math.min(50, perSecNum));

    const perSec = perSecNum.toFixed(1);
    const perMin = Math.round(perSecNum * 60).toLocaleString();
    const perHour = Math.round(perSecNum * 3600).toLocaleString();

    return { perSec, perMin, perHour };
  }, [totalBetsCount, sessionElapsedSec, isAutobetting, bets, betSpeedMs]);

  // 6. Streaks (Current & Max for Win and Loss)
  const streaksData = useMemo(() => {
    let currentStreak = 0;
    let maxWin = 0;
    let maxLoss = 0;

    for (const b of chronologicalBets) {
      if (b.won) {
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        if (currentStreak > maxWin) maxWin = currentStreak;
      } else {
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        if (Math.abs(currentStreak) > maxLoss) maxLoss = Math.abs(currentStreak);
      }
    }

    return {
      currentWin: currentStreak > 0 ? currentStreak : 0,
      currentLoss: currentStreak < 0 ? Math.abs(currentStreak) : 0,
      maxWin: Math.max(maxWin, stats?.maxWinStreak || 0),
      maxLoss: Math.max(maxLoss, stats?.maxLossStreak || 0),
    };
  }, [chronologicalBets, stats?.maxWinStreak, stats?.maxLossStreak]);

  // 7. Max Drawdown (True Peak-to-Trough Drop)
  const drawdownData = useMemo(() => {
    let peak = 0;
    let maxDd = 0;
    let peakAtMax = 0;

    for (const b of chronologicalBets) {
      if (b.runningProfit > peak) {
        peak = b.runningProfit;
      }
      const currentDd = peak - b.runningProfit;
      if (currentDd > maxDd) {
        maxDd = currentDd;
        peakAtMax = peak;
      }
    }

    const denom = baseBankroll + peakAtMax;
    const maxDdPct = denom > 0 ? ((maxDd / denom) * 100).toFixed(2) : '0.00';

    return {
      amount: maxDd,
      percentage: maxDdPct,
    };
  }, [chronologicalBets, baseBankroll]);

  // 8. Lowest Profit Point
  const lowestProfitData = useMemo(() => {
    if (bets.length === 0) return { amount: 0, percentage: '0.00' };
    const lowest = Math.min(0, ...bets.map(b => b.runningProfit));
    const lowestPct = ((lowest / baseBankroll) * 100).toFixed(2);
    return { amount: lowest, percentage: lowestPct };
  }, [bets, baseBankroll]);

  // 9. Highest Peak Profit (ATH)
  const highestProfitData = useMemo(() => {
    if (bets.length === 0) return { amount: 0, percentage: '0.00' };
    const highest = Math.max(0, ...bets.map(b => b.runningProfit));
    const highestPct = ((highest / baseBankroll) * 100).toFixed(2);
    return { amount: highest, percentage: highestPct };
  }, [bets, baseBankroll]);

  // 10. Realized RTP (Return to Player)
  const realizedRtp = useMemo(() => {
    if (totalWagered <= 0) return '100.00%';
    const returned = totalWagered + effectiveNetProfit;
    const rtp = (returned / totalWagered) * 100;
    return `${rtp.toFixed(2)}%`;
  }, [totalWagered, effectiveNetProfit]);

  // 11. Vaulted Funds
  const vaultedAmount = stats?.vaultedAmount || 0;
  const vaultedPct = ((vaultedAmount / baseBankroll) * 100).toFixed(2);

  // 12. Top 5 Highest Winning Multipliers Hit
  const topWinningMultipliers = useMemo(() => {
    const wins = bets.filter(b => b.won && (b.payoutMultiplier || b.targetMultiplier));
    const sorted = wins
      .map(b => b.payoutMultiplier || b.targetMultiplier)
      .sort((a, b) => b - a);
    return sorted.slice(0, 5);
  }, [bets]);

  // --------------------------------------------------------------------------
  // CHART DATA GENERATION
  // --------------------------------------------------------------------------

  const chartData = useMemo(() => {
    if (displayBets.length === 0) {
      const initialBal = currentBalance !== undefined ? currentBalance : baseBankroll;
      return [
        {
          betIndex: 0,
          profit: 0,
          deltaProfit: 0,
          balance: initialBal,
          wager: 0,
          betAmount: 0,
          won: true,
          multiplier: 1,
          targetMultiplier: 2,
          game: (gameTitle.toLowerCase() as any) || 'dice',
          currency,
          strategyName: strategyName || 'Antebot Strategy',
          timestamp: Date.now(),
          drawdownPct: 0,
          drawdownAmount: 0,
          roll: undefined,
        },
        {
          betIndex: 1,
          profit: 0,
          deltaProfit: 0,
          balance: initialBal,
          wager: 0,
          betAmount: 0,
          won: true,
          multiplier: 1,
          targetMultiplier: 2,
          game: (gameTitle.toLowerCase() as any) || 'dice',
          currency,
          strategyName: strategyName || 'Antebot Strategy',
          timestamp: Date.now(),
          drawdownPct: 0,
          drawdownAmount: 0,
          roll: undefined,
        },
      ];
    }

    let runningWager = 0;
    let localPeak = 0;

    return displayBets.map((b, idx) => {
      runningWager += b.betAmount;
      if (b.runningProfit > localPeak) {
        localPeak = b.runningProfit;
      }
      const ddAmount = localPeak - b.runningProfit;
      const ddPct = localPeak > 0 ? Number(((ddAmount / (baseBankroll + localPeak)) * 100).toFixed(2)) : 0;

      return {
        betIndex: b.betNumber || idx + 1,
        profit: Number(b.runningProfit.toFixed(4)),
        deltaProfit: Number(b.profit.toFixed(4)),
        balance: Number(b.runningBalance.toFixed(4)),
        wager: Number(runningWager.toFixed(4)),
        betAmount: Number(b.betAmount.toFixed(4)),
        won: b.won,
        multiplier: b.payoutMultiplier || b.targetMultiplier,
        targetMultiplier: b.targetMultiplier,
        game: b.game,
        currency,
        strategyName: strategyName || 'Antebot Strategy',
        timestamp: b.timestamp,
        roll: b.gameDetails?.roll,
        drawdownPct: ddPct,
        drawdownAmount: Number(ddAmount.toFixed(4)),
      };
    });
  }, [displayBets, baseBankroll, gameTitle, strategyName, currency]);

  // Active rendered chart data with interactive zoom slice & Antebot Extrema-Preserving Downsampler
  const renderedChartData = useMemo(() => {
    let baseSlice = chartData;
    if (zoomRange && chartData.length > 0) {
      const start = Math.max(0, Math.min(zoomRange.startIndex, chartData.length - 1));
      const end = Math.max(start, Math.min(zoomRange.endIndex, chartData.length - 1));
      baseSlice = chartData.slice(start, end + 1);
    }

    // Downsample if over 650 points while preserving ATH peaks, worst dips & big bet spikes
    if (baseSlice.length <= 650) return baseSlice;

    const targetPoints = 650;
    const bucketSize = baseSlice.length / targetPoints;
    const sampled: typeof chartData = [];
    const addedIndices = new Set<number>();

    sampled.push(baseSlice[0]);
    addedIndices.add(0);

    for (let i = 0; i < targetPoints; i++) {
      const startIdx = Math.floor(i * bucketSize);
      const endIdx = Math.min(baseSlice.length - 1, Math.floor((i + 1) * bucketSize));

      let minProfitIdx = startIdx;
      let maxProfitIdx = startIdx;
      let maxBetIdx = startIdx;

      let minProfit = baseSlice[startIdx].profit;
      let maxProfit = baseSlice[startIdx].profit;
      let maxBet = baseSlice[startIdx].betAmount;

      for (let j = startIdx; j <= endIdx; j++) {
        const item = baseSlice[j];
        if (item.profit < minProfit) {
          minProfit = item.profit;
          minProfitIdx = j;
        }
        if (item.profit > maxProfit) {
          maxProfit = item.profit;
          maxProfitIdx = j;
        }
        if (item.betAmount > maxBet) {
          maxBet = item.betAmount;
          maxBetIdx = j;
        }
      }

      const candidateIndices = Array.from(
        new Set([minProfitIdx, maxProfitIdx, maxBetIdx, endIdx])
      ).sort((a, b) => a - b);

      for (const idx of candidateIndices) {
        if (!addedIndices.has(idx)) {
          sampled.push(baseSlice[idx]);
          addedIndices.add(idx);
        }
      }
    }

    const lastIdx = baseSlice.length - 1;
    if (!addedIndices.has(lastIdx)) {
      sampled.push(baseSlice[lastIdx]);
    }

    return sampled.sort((a, b) => a.betIndex - b.betIndex);
  }, [chartData, zoomRange]);

  // Dynamic Split-Gradient Offset Calculation for Recharts
  const gradientOffset = useMemo(() => {
    if (renderedChartData.length === 0) return 0.5;
    const dataMax = Math.max(...renderedChartData.map((i) => i.profit));
    const dataMin = Math.min(...renderedChartData.map((i) => i.profit));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  }, [renderedChartData]);

  // Min and Max values for Y axis scales with graceful padding
  const profitExtremes = useMemo(() => {
    if (bets.length === 0) return { min: -1, max: 1 };
    const values = renderedChartData.map(d => d.profit);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(0, ...values);
    const padding = Math.max(0.1, (maxVal - minVal) * 0.12);
    return {
      min: Number((minVal - padding).toFixed(2)),
      max: Number((maxVal + padding).toFixed(2)),
    };
  }, [bets.length, renderedChartData]);

  const yDomain = useMemo(() => [profitExtremes.min, profitExtremes.max], [profitExtremes.min, profitExtremes.max]);
  const autoDomain = useMemo(() => ['auto', 'auto'], []);

  // Stable Reference Line Vertical Percentage Calculations
  const { zeroTopPct, tpTopPct, slTopPct } = useMemo(() => {
    const range = Math.max(0.0001, profitExtremes.max - profitExtremes.min);
    const zeroPct = Math.max(8, Math.min(92, ((profitExtremes.max - 0) / range) * 100));
    const tpPct = (takeProfitTarget && takeProfitTarget > 0)
      ? Math.max(8, Math.min(92, ((profitExtremes.max - takeProfitTarget) / range) * 100))
      : null;
    const slPct = (stopLossTarget && stopLossTarget > 0)
      ? Math.max(8, Math.min(92, ((profitExtremes.max - (-stopLossTarget)) / range) * 100))
      : null;
    return { zeroTopPct: zeroPct, tpTopPct: tpPct, slTopPct: slPct };
  }, [profitExtremes, takeProfitTarget, stopLossTarget]);

  // Interactive Zoom Handlers
  const handleZoomIn = useCallback(() => {
    if (chartData.length <= 4) return;
    const currentStart = zoomRange ? zoomRange.startIndex : 0;
    const currentEnd = zoomRange ? zoomRange.endIndex : chartData.length - 1;
    const currentSpan = currentEnd - currentStart;
    if (currentSpan <= 4) return;
    const shrink = Math.max(1, Math.floor(currentSpan * 0.25));
    const newStart = Math.min(currentStart + shrink, currentEnd - 3);
    const newEnd = Math.max(currentEnd - shrink, newStart + 3);
    setZoomRange({ startIndex: newStart, endIndex: newEnd });
  }, [chartData.length, zoomRange]);

  const handleZoomOut = useCallback(() => {
    if (!zoomRange || chartData.length === 0) return;
    const currentSpan = zoomRange.endIndex - zoomRange.startIndex;
    const expand = Math.max(1, Math.floor(currentSpan * 0.3));
    const newStart = Math.max(0, zoomRange.startIndex - expand);
    const newEnd = Math.min(chartData.length - 1, zoomRange.endIndex + expand);
    if (newStart === 0 && newEnd === chartData.length - 1) {
      setZoomRange(null);
    } else {
      setZoomRange({ startIndex: newStart, endIndex: newEnd });
    }
  }, [chartData.length, zoomRange]);

  const handleResetZoom = useCallback(() => {
    setZoomRange(null);
  }, []);

  const handleBrushChange = useCallback((range: any) => {
    if (range && range.startIndex !== undefined && range.endIndex !== undefined) {
      if (range.startIndex === 0 && range.endIndex === chartData.length - 1) {
        setZoomRange(null);
      } else {
        setZoomRange({ startIndex: range.startIndex, endIndex: range.endIndex });
      }
    }
  }, [chartData.length]);

  const handleTimePeriodChange = useCallback((period: 'all' | '25' | '50' | '100' | '250' | '500' | '1000' | '1h' | '24h' | '7d') => {
    setTimePeriod(period);
    setZoomRange(null);
  }, []);

  // Copy Summary to Clipboard
  const handleCopySummary = useCallback(() => {
    const text = [
      `🎰 [ANTEBOT / STAKE SESSION REPORT]`,
      `• Jeu : ${gameTitle.toUpperCase()}`,
      `• Durée : ${formattedTimer} (${betSpeed.perSec}/s)`,
      `• Paris Totaux : ${totalBetsCount} (${winsCount}W / ${lossesCount}L - ${winRatePct}%)`,
      `• Profit Net : ${isProfitable ? '+' : ''}${effectiveNetProfit.toFixed(4)} ${currency} (${isProfitable ? '+' : ''}${profitPct}%)`,
      `• Wager Total : ${totalWagered.toFixed(2)} ${currency} (${turnoverRatio}x)`,
      `• RTP Réalisé : ${realizedRtp}`,
      `• Max Drawdown : -${drawdownData.amount.toFixed(4)} ${currency} (-${drawdownData.percentage}%)`,
      `• Pic ATH : +${highestProfitData.amount.toFixed(4)} ${currency} (+${highestProfitData.percentage}%)`,
      `• Point le plus bas : ${lowestProfitData.amount.toFixed(4)} ${currency} (${lowestProfitData.percentage}%)`,
      `• Solde Actuel : ${effectiveBalance.toFixed(4)} ${currency}`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    });
  }, [gameTitle, formattedTimer, betSpeed.perSec, totalBetsCount, winsCount, lossesCount, winRatePct, isProfitable, effectiveNetProfit, currency, profitPct, totalWagered, turnoverRatio, realizedRtp, drawdownData, highestProfitData, lowestProfitData, effectiveBalance]);

  // CSV Export
  const handleDownloadCsv = () => {
    if (bets.length === 0) return;
    const headers = ['Bet #', 'Game', 'Bet Amount', 'Target Multiplier', 'Payout Multiplier', 'Won', 'Profit/Loss', 'Running Profit', 'Balance', 'Time'];
    const rows = chronologicalBets.map(b => [
      b.betNumber,
      b.game,
      b.betAmount,
      b.targetMultiplier,
      b.payoutMultiplier,
      b.won ? 'WIN' : 'LOSS',
      b.profit,
      b.runningProfit,
      b.runningBalance,
      new Date(b.timestamp).toISOString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `antebot_session_${gameTitle}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recent 15 Bets Live Pill Streamer
  const recentPills = useMemo(() => {
    return bets.slice(0, 15);
  }, [bets]);

  // Currency Badge
  const CurrencyBadge = () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#26a17b]/20 border border-[#26a17b]/40 text-[#26a17b] text-[9px] font-mono font-black shrink-0">
      {currency}
    </span>
  );

  return (
    <div 
      id="antebot-live-chart-container"
      className={`rounded-2xl border transition-all duration-300 ${
        isExpanded 
          ? 'fixed inset-2 sm:inset-6 z-50 bg-[#080d15] border-[#2f4553] shadow-2xl p-4 sm:p-6 overflow-y-auto flex flex-col justify-between'
          : 'bg-[#080d15] border-[#1a2c38] p-3 sm:p-4 shadow-2xl relative'
      }`}
    >
      {/* -------------------------------------------------------------------- */}
      {/* 1. ANTEBOT TOP HEADER BAR                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#213743]">
        
        {/* Left Section: Game Icon + Game Name + Timer Badge + Bets Counter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Game Badge */}
          <div className="flex items-center gap-2 bg-[#121e29] border border-[#213743] px-3 py-1.5 rounded-xl shadow-inner">
            <div className="w-5 h-5 rounded-lg bg-[#00e701]/15 border border-[#00e701]/30 flex items-center justify-center text-[#00e701]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-black text-white capitalize tracking-tight">
              {gameTitle}
            </span>
          </div>

          {/* Session Timer Badge */}
          <div className="flex items-center gap-1.5 bg-[#121e29] border border-[#213743] px-2.5 py-1.5 rounded-xl font-mono text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white tracking-wider">{formattedTimer}</span>
            {isAutobetting && (
              <span className="w-2 h-2 rounded-full bg-[#00e701] animate-ping ml-1" />
            )}
          </div>

          {/* Total Bets Counter Badge */}
          <div className="flex items-center gap-1 bg-[#121e29] border border-[#213743] px-2.5 py-1.5 rounded-xl font-mono text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold text-white">{totalBetsCount.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400">paris</span>
          </div>

        </div>

        {/* Right Section: Prominent Balance Display + Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          
          {/* Big Balance Box (Antebot Style) */}
          <div className="flex items-center gap-2 bg-[#121e29] border border-[#213743] px-3 py-1 rounded-xl shadow-inner">
            {isLiveMode && <span className="text-xs">🟢</span>}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isLiveMode ? 'Solde Réel :' : 'Balance :'}</span>
            <span className="text-sm sm:text-base font-mono font-black text-white">
              {effectiveBalance.toFixed(4)}
            </span>
            <CurrencyBadge />
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <select
              value={timePeriod}
              onChange={(e) => handleTimePeriodChange(e.target.value as any)}
              className="bg-[#121e29] hover:bg-[#1a2c38] text-white border border-[#213743] rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer appearance-none pr-6 focus:outline-none focus:border-[#00e701]"
            >
              <option value="all">Tout</option>
              <option value="50">50p</option>
              <option value="100">100p</option>
              <option value="250">250p</option>
              <option value="500">500p</option>
              <option value="1000">1000p</option>
              <option value="1h">1h</option>
              <option value="24h">24h</option>
              <option value="7d">7j</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Curve Style Mode */}
          <button
            type="button"
            onClick={() => setCurveStyle(curveStyle === 'monotone' ? 'stepAfter' : 'monotone')}
            title={curveStyle === 'monotone' ? 'Passer en mode Escalier (Step)' : 'Passer en mode Lissé (Smooth)'}
            className={`px-2 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
              curveStyle === 'stepAfter' 
                ? 'bg-[#00e701]/20 border-[#00e701]/50 text-[#00e701]' 
                : 'bg-[#121e29] border-[#213743] text-slate-300 hover:text-white'
            }`}
          >
            {curveStyle === 'stepAfter' ? 'STEP' : 'SMOOTH'}
          </button>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={bets.length === 0}
            title="Exporter l'historique en CSV"
            className="p-1.5 rounded-xl bg-[#121e29] hover:bg-[#1a2c38] text-slate-300 hover:text-white border border-[#213743] transition disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Copy Summary */}
          <button
            type="button"
            onClick={handleCopySummary}
            disabled={bets.length === 0}
            title="Copier le rapport Antebot"
            className="p-1.5 rounded-xl bg-[#121e29] hover:bg-[#1a2c38] text-slate-300 hover:text-white border border-[#213743] transition disabled:opacity-40 cursor-pointer"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#00e701]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Session */}
          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Réinitialiser la session de test"
              className="p-1.5 rounded-xl bg-[#121e29] hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-[#213743] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Réduire' : 'Plein écran'}
            className="p-1.5 rounded-xl bg-[#121e29] hover:bg-[#1a2c38] text-slate-300 hover:text-white border border-[#213743] transition cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

        </div>

      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. ANTEBOT EXACT 2-COLUMN METRIC TILES GRID                          */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 my-3">
        
        {/* LEFT COLUMN */}
        <div className="space-y-1.5">
          
          {/* Bet Speed Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Bet Speed</span>
            <span className="text-xs font-mono font-bold text-slate-200">
              <strong className="text-cyan-300">{betSpeed.perSec}/s</strong> | {betSpeed.perMin}/m | {betSpeed.perHour}/h
            </span>
          </div>

          {/* Profit Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Profit</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`text-xs font-black ${isProfitable ? 'text-[#00e701]' : 'text-[#e9113c]'}`}>
                ({isProfitable ? '+' : ''}{profitPct}%)
              </span>
              <span className={`text-xs sm:text-sm font-black ${isProfitable ? 'text-[#00e701]' : 'text-[#e9113c]'}`}>
                {currency} {isProfitable ? '' : ''}{effectiveNetProfit.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Wagered Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Wagered</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-purple-400 font-bold">({turnoverRatio}x)</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {currency} {totalWagered.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Vaulted Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Vaulted</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-purple-400 font-semibold">({vaultedPct}%)</span>
              <span className="text-xs font-bold text-slate-200">
                {currency} {vaultedAmount.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Max Drawdown Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Max. Drawdown</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs font-bold text-[#e9113c]">
                ({drawdownData.percentage}%)
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#e9113c]">
                {currency} {drawdownData.amount.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Highest Profit Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Highest Profit</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs font-bold text-[#00e701]">
                (+{highestProfitData.percentage}%)
              </span>
              <span className="text-xs font-bold text-[#00e701]">
                {currency} +{highestProfitData.amount.toFixed(4)}
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-1.5">
          
          {/* Streaks Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Streaks</span>
            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              <span className="text-slate-300">
                Win: <strong className="text-[#00e701]">{streaksData.currentWin} / {streaksData.maxWin}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">
                Loss: <strong className="text-[#e9113c]">{streaksData.currentLoss} / {streaksData.maxLoss}</strong>
              </span>
            </div>
          </div>

          {/* Wins Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Wins</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs sm:text-sm font-black text-[#00e701]">
                {winsCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">({winRatePct}%)</span>
            </div>
          </div>

          {/* Losses Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Losses</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs sm:text-sm font-black text-[#e9113c]">
                {lossesCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">({lossRatePct}%)</span>
            </div>
          </div>

          {/* RTP Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">RTP</span>
            <span className="text-xs sm:text-sm font-mono font-black text-cyan-300">
              {realizedRtp}
            </span>
          </div>

          {/* Lowest Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Lowest</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs font-bold text-rose-400">
                ({lowestProfitData.percentage}%)
              </span>
              <span className="text-xs font-bold text-rose-400">
                {currency} {lowestProfitData.amount.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Highest Multipliers Card */}
          <div className="bg-[#0e1722] border border-[#213743] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Highest Multipliers</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-amber-400">
              {topWinningMultipliers.length > 0 ? (
                topWinningMultipliers.map((m, idx) => (
                  <span key={idx} className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {Number(m).toFixed(2)}x{idx < topWinningMultipliers.length - 1 ? '' : ''}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">-</span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. RECENT BETS PILL TICKER                                           */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 my-1 border-y border-[#213743]/60 min-h-[38px] scrollbar-none">
        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider flex-shrink-0 pl-1">
          Derniers Paris :
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {recentPills.length === 0 ? (
            <span className="text-[10px] text-slate-600 italic font-mono">En attente des premiers tours...</span>
          ) : (
            recentPills.map((b) => (
              <div
                key={b.id}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap border flex items-center gap-1 transition ${
                  b.won
                    ? (b.payoutMultiplier || b.targetMultiplier) >= 5
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm shadow-amber-950/50'
                      : 'bg-[#00e701]/20 border-[#00e701]/50 text-[#00e701]'
                    : 'bg-[#e9113c]/15 border-[#e9113c]/40 text-[#e9113c]'
                }`}
                title={`Pari #${b.betNumber} : ${b.won ? 'Gagné' : 'Perdu'} (${b.profit >= 0 ? '+' : ''}${b.profit.toFixed(4)} ${currency})`}
              >
                <span>{(b.payoutMultiplier || b.targetMultiplier) ? `${Number(b.payoutMultiplier || b.targetMultiplier).toFixed(2)}x` : '1.00x'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. MAIN ANTEBOT CHART CANVAS                                         */}
      {/* -------------------------------------------------------------------- */}
      <div className="my-2 flex items-center justify-between gap-2">
        
        {/* Chart View Modes */}
        <div className="flex items-center gap-1 bg-[#121e29] p-1 rounded-xl border border-[#213743] text-[11px]">
          {[
            { id: 'profit', label: 'Courbe Profit' },
            { id: 'balance', label: 'Solde' },
            { id: 'drawdown', label: 'Drawdown' },
            { id: 'wager', label: 'Wager' },
            { id: 'bets', label: 'Mises' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setChartMode(mode.id as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                chartMode === mode.id
                  ? 'bg-[#00e701] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom Avant"
            className="p-1.5 rounded-lg bg-[#121e29] hover:bg-[#1a2c38] text-slate-300 hover:text-white border border-[#213743] text-xs transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Arrière"
            className="p-1.5 rounded-lg bg-[#121e29] hover:bg-[#1a2c38] text-slate-300 hover:text-white border border-[#213743] text-xs transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoomRange && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-[10px] font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-700/50 px-2 py-1 rounded-lg hover:bg-cyan-900/50 transition cursor-pointer"
            >
              Reset 100%
            </button>
          )}
        </div>

      </div>

      <div className={`w-full bg-[#080d15] border border-[#213743] rounded-2xl p-2 sm:p-3 relative ${isExpanded ? 'h-[520px]' : compact ? 'h-52 sm:h-64' : 'h-64 sm:h-80'}`}>
        
        {bets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080d15]/85 backdrop-blur-[2px] z-10 rounded-2xl">
            <div className="p-3 rounded-full bg-[#121e29] text-slate-400 mb-2 border border-[#213743]">
              <Activity className="w-6 h-6 text-[#00e701] animate-pulse" />
            </div>
            <span className="text-sm font-bold text-white">En attente de paris Antebot...</span>
            <span className="text-xs text-slate-400 mt-1 text-center max-w-xs">
              Démarrez l'auto-bet ou exécutez un test batch pour tracer la courbe chronologique.
            </span>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'bets' ? (
            <BarChart data={renderedChartData} margin={CHART_MARGIN} accessibilityLayer={false}>
              <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.4} />
              <XAxis dataKey="betIndex" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatBetIndexTick} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} width={48} />
              <Tooltip content={StakeChartTooltip} />
              <Bar dataKey="betAmount" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {renderedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.won ? '#00e701' : '#e9113c'} opacity={0.85} />
                ))}
              </Bar>
              {showBrush && (
                <Brush dataKey="betIndex" height={20} stroke="#00e701" fill="#080d15" tickFormatter={formatBetIndexTick} onChange={handleBrushChange} travellerWidth={6} />
              )}
            </BarChart>
          ) : chartMode === 'drawdown' ? (
            <AreaChart data={renderedChartData} margin={CHART_MARGIN} accessibilityLayer={false}>
              <defs>
                <linearGradient id="antebotDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e9113c" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#e9113c" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.4} />
              <XAxis dataKey="betIndex" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatBetIndexTick} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatDrawdownTick} width={48} />
              <Tooltip content={StakeChartTooltip} />
              <Area type={curveStyle} dataKey="drawdownPct" stroke="#e9113c" strokeWidth={2.5} fill="url(#antebotDrawdownGrad)" isAnimationActive={false} />
              {showBrush && (
                <Brush dataKey="betIndex" height={20} stroke="#e9113c" fill="#080d15" tickFormatter={formatBetIndexTick} onChange={handleBrushChange} travellerWidth={6} />
              )}
            </AreaChart>
          ) : chartMode === 'balance' ? (
            <AreaChart data={renderedChartData} margin={CHART_MARGIN} accessibilityLayer={false}>
              <defs>
                <linearGradient id="antebotBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.4} />
              <XAxis dataKey="betIndex" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatBetIndexTick} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={autoDomain} width={48} />
              <Tooltip content={StakeChartTooltip} />
              <Area type={curveStyle} dataKey="balance" stroke="#06b6d4" strokeWidth={2.5} fill="url(#antebotBalanceGrad)" isAnimationActive={false} />
              {showBrush && (
                <Brush dataKey="betIndex" height={20} stroke="#06b6d4" fill="#080d15" tickFormatter={formatBetIndexTick} onChange={handleBrushChange} travellerWidth={6} />
              )}
            </AreaChart>
          ) : chartMode === 'wager' ? (
            <AreaChart data={renderedChartData} margin={CHART_MARGIN} accessibilityLayer={false}>
              <defs>
                <linearGradient id="antebotWagerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.4} />
              <XAxis dataKey="betIndex" stroke="#64748b" fontSize={9} tickLine={false} tickFormatter={formatBetIndexTick} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={autoDomain} width={48} />
              <Tooltip content={StakeChartTooltip} />
              <Area type={curveStyle} dataKey="wager" stroke="#a855f7" strokeWidth={2.5} fill="url(#antebotWagerGrad)" isAnimationActive={false} />
              {showBrush && (
                <Brush dataKey="betIndex" height={20} stroke="#a855f7" fill="#080d15" tickFormatter={formatBetIndexTick} onChange={handleBrushChange} travellerWidth={6} />
              )}
            </AreaChart>
          ) : (
            <AreaChart data={renderedChartData} margin={CHART_MARGIN} accessibilityLayer={false}>
              <defs>
                {/* Dynamic Antebot Split Gradient (Green above 0, Red below 0) */}
                <linearGradient id="antebotProfitSplitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="#00e701" stopOpacity={0.55} />
                  <stop offset={gradientOffset} stopColor="#00e701" stopOpacity={0.12} />
                  <stop offset={gradientOffset} stopColor="#e9113c" stopOpacity={0.12} />
                  <stop offset={1} stopColor="#e9113c" stopOpacity={0.55} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.4} />

              <XAxis 
                dataKey="betIndex" 
                stroke="#64748b" 
                fontSize={9} 
                tickLine={false}
                tickFormatter={formatBetIndexTick}
              />

              <YAxis 
                stroke="#64748b" 
                fontSize={9} 
                tickLine={false}
                domain={yDomain}
                tickFormatter={formatNumberTick}
                width={48}
              />

              <Tooltip content={StakeChartTooltip} />

              <Area 
                type={curveStyle} 
                dataKey="profit" 
                stroke={isProfitable ? '#00e701' : '#e9113c'} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#antebotProfitSplitGrad)"
                isAnimationActive={false}
              />

              {showBrush && (
                <Brush 
                  dataKey="betIndex" 
                  height={20} 
                  stroke="#00e701" 
                  fill="#080d15" 
                  tickFormatter={formatBetIndexTick}
                  onChange={handleBrushChange}
                  travellerWidth={6}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>

        {/* Stable HTML/CSS Zero & TP/SL Guidelines Overlay */}
        {chartMode === 'profit' && bets.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden pl-10 pr-4 pt-2.5 pb-5">
            {/* Zero Demarcation Baseline */}
            <div 
              className="absolute left-10 right-4 border-t border-slate-600/70 border-dashed z-0 flex items-center justify-end"
              style={{ top: `${zeroTopPct}%` }}
            >
              <span className="text-[9px] font-mono text-slate-400 font-bold bg-[#080d15]/90 px-1 py-0.2 rounded -top-2.5 relative border border-slate-700/50">
                0.00
              </span>
            </div>

            {/* Take Profit Guideline */}
            {tpTopPct !== null && showGuideLines && (
              <div 
                className="absolute left-10 right-4 border-t border-emerald-500/60 border-dashed z-0 flex items-center justify-between"
                style={{ top: `${tpTopPct}%` }}
              >
                <span className="text-[9px] font-mono font-black text-emerald-400 bg-[#080d15]/95 px-1.5 py-0.2 rounded -top-2.5 relative border border-emerald-500/40">
                  TP (+{takeProfitTarget})
                </span>
              </div>
            )}

            {/* Stop Loss Guideline */}
            {slTopPct !== null && showGuideLines && (
              <div 
                className="absolute left-10 right-4 border-t border-rose-500/60 border-dashed z-0 flex items-center justify-between"
                style={{ top: `${slTopPct}%` }}
              >
                <span className="text-[9px] font-mono font-black text-rose-400 bg-[#080d15]/95 px-1.5 py-0.2 rounded -top-2.5 relative border border-rose-500/40">
                  SL (-{stopLossTarget})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 5. ANTEBOT FOOTER BAR                                                */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 mt-2 border-t border-[#213743] text-[10px] text-slate-400 font-mono gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00e701] inline-block shadow-sm shadow-[#00e701]/50" />
            <strong className="text-slate-200">Vert (#00e701)</strong> = En Profit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e9113c] inline-block shadow-sm shadow-[#e9113c]/50" />
            <strong className="text-slate-200">Rouge (#e9113c)</strong> = Drawdown
          </span>
          <span className="text-slate-500 hidden md:inline">
            Courbe : <strong className="text-slate-300">{curveStyle === 'monotone' ? 'Lissage Spline' : 'Escalier Step-After'}</strong>
          </span>
        </div>

        {bets.length > 0 && onClearHistory && (
          <button
            type="button"
            onClick={onClearHistory}
            className="text-slate-400 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer font-bold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser la session</span>
          </button>
        )}
      </div>

    </div>
  );
};
