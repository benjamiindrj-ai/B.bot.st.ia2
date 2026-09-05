import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Sparkles, 
  Layers, 
  Filter, 
  Award, 
  AlertTriangle, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Zap,
  BarChart2
} from 'lucide-react';
import { BetResult, ManualSession } from '../types';

export interface CalendarHeatmapProps {
  bets: BetResult[];
  manualSessions?: ManualSession[];
  currency: string;
}

type HeatmapViewMode = 'day_of_week_matrix' | 'monthly_grid' | 'weekly_summary';
type HeatmapMetric = 'profit' | 'winrate' | 'volume';

interface DaySummary {
  dayIndex: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  shortName: string;
  totalProfit: number;
  totalBets: number;
  totalSessions: number;
  wins: number;
  losses: number;
  winRate: number;
  timeSlots: {
    night: { profit: number; bets: number; sessions: number };     // 00h - 06h
    morning: { profit: number; bets: number; sessions: number };   // 06h - 12h
    afternoon: { profit: number; bets: number; sessions: number }; // 12h - 18h
    evening: { profit: number; bets: number; sessions: number };   // 18h - 24h
  };
}

interface CalendarDayData {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  dayOfWeek: number;
  dayOfMonth: number;
  monthName: string;
  totalProfit: number;
  totalBets: number;
  totalSessions: number;
  wins: number;
  losses: number;
  winRate: number;
  hasActivity: boolean;
}

const DAYS_ORDERED_FR = [
  { index: 1, name: 'Lundi', short: 'Lun' },
  { index: 2, name: 'Mardi', short: 'Mar' },
  { index: 3, name: 'Mercredi', short: 'Mer' },
  { index: 4, name: 'Jeudi', short: 'Jeu' },
  { index: 5, name: 'Vendredi', short: 'Ven' },
  { index: 6, name: 'Samedi', short: 'Sam' },
  { index: 0, name: 'Dimanche', short: 'Dim' },
];

const TIME_SLOTS = [
  { id: 'night', label: 'Nuit (00h-06h)', icon: Moon, desc: 'Session nocturne' },
  { id: 'morning', label: 'Matin (06h-12h)', icon: Sunrise, desc: 'Début de journée' },
  { id: 'afternoon', label: 'Après-midi (12h-18h)', icon: Sun, desc: 'Plein jour' },
  { id: 'evening', label: 'Soirée (18h-00h)', icon: Sunset, desc: 'Heures de pointe' },
] as const;

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  bets = [],
  manualSessions = [],
  currency = 'USDT',
}) => {
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('day_of_week_matrix');
  const [metricMode, setMetricMode] = useState<HeatmapMetric>('profit');
  const [dataSource, setDataSource] = useState<'all' | 'sessions' | 'bot'>('all');
  const [selectedCell, setSelectedCell] = useState<{
    title: string;
    subtitle: string;
    profit: number;
    bets: number;
    sessions: number;
    winRate: number;
    details?: string;
  } | null>(null);

  // Normalize all activity items into timestamps with profit and bet volume
  const activityItems = useMemo(() => {
    const list: Array<{
      timestamp: number;
      profit: number;
      bets: number;
      isWin: boolean;
      source: 'session' | 'bot';
      game?: string;
    }> = [];

    // Manual sessions
    if (dataSource === 'all' || dataSource === 'sessions') {
      manualSessions.forEach((s) => {
        const p = s.profit !== undefined ? s.profit : (s.profitOrLoss || 0);
        list.push({
          timestamp: s.timestamp || Date.now(),
          profit: p,
          bets: s.estimatedBets || s.estimatedBetsCount || 1,
          isWin: p > 0,
          source: 'session',
          game: s.game,
        });
      });
    }

    // Bot bets
    if (dataSource === 'all' || dataSource === 'bot') {
      bets.forEach((b) => {
        list.push({
          timestamp: b.timestamp || Date.now(),
          profit: b.profit,
          bets: 1,
          isWin: b.won,
          source: 'bot',
          game: b.game,
        });
      });
    }

    return list;
  }, [manualSessions, bets, dataSource]);

  // Aggregate by Day of the Week (0 to 6) and 4 Time Slots
  const daysSummaryMap = useMemo(() => {
    const map = new Map<number, DaySummary>();

    DAYS_ORDERED_FR.forEach((d) => {
      map.set(d.index, {
        dayIndex: d.index,
        dayName: d.name,
        shortName: d.short,
        totalProfit: 0,
        totalBets: 0,
        totalSessions: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        timeSlots: {
          night: { profit: 0, bets: 0, sessions: 0 },
          morning: { profit: 0, bets: 0, sessions: 0 },
          afternoon: { profit: 0, bets: 0, sessions: 0 },
          evening: { profit: 0, bets: 0, sessions: 0 },
        },
      });
    });

    activityItems.forEach((item) => {
      const date = new Date(item.timestamp);
      const dayIdx = date.getDay(); // 0 is Sunday
      const hour = date.getHours();
      const dayObj = map.get(dayIdx);

      if (dayObj) {
        dayObj.totalProfit += item.profit;
        dayObj.totalBets += item.bets;
        dayObj.totalSessions += 1;
        if (item.isWin) dayObj.wins += 1;
        else dayObj.losses += 1;

        let slotKey: 'night' | 'morning' | 'afternoon' | 'evening' = 'evening';
        if (hour >= 0 && hour < 6) slotKey = 'night';
        else if (hour >= 6 && hour < 12) slotKey = 'morning';
        else if (hour >= 12 && hour < 18) slotKey = 'afternoon';
        else slotKey = 'evening';

        dayObj.timeSlots[slotKey].profit += item.profit;
        dayObj.timeSlots[slotKey].bets += item.bets;
        dayObj.timeSlots[slotKey].sessions += 1;
      }
    });

    // Compute win rates and round profits
    DAYS_ORDERED_FR.forEach((d) => {
      const dayObj = map.get(d.index);
      if (dayObj) {
        dayObj.totalProfit = Number(dayObj.totalProfit.toFixed(2));
        dayObj.winRate = dayObj.totalSessions > 0 ? Number(((dayObj.wins / dayObj.totalSessions) * 100).toFixed(1)) : 0;
        
        dayObj.timeSlots.night.profit = Number(dayObj.timeSlots.night.profit.toFixed(2));
        dayObj.timeSlots.morning.profit = Number(dayObj.timeSlots.morning.profit.toFixed(2));
        dayObj.timeSlots.afternoon.profit = Number(dayObj.timeSlots.afternoon.profit.toFixed(2));
        dayObj.timeSlots.evening.profit = Number(dayObj.timeSlots.evening.profit.toFixed(2));
      }
    });

    return map;
  }, [activityItems]);

  // Aggregate past 35 days for the GitHub-style Calendar Grid
  const calendarGridData = useMemo(() => {
    const days: CalendarDayData[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Create a 35-day window ending on today
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      // Find all activity on this specific calendar date
      const daysItems = activityItems.filter((item) => {
        const itemDate = new Date(item.timestamp);
        return itemDate.toISOString().split('T')[0] === dateKey;
      });

      const totalProfit = Number(daysItems.reduce((acc, it) => acc + it.profit, 0).toFixed(2));
      const totalBets = daysItems.reduce((acc, it) => acc + it.bets, 0);
      const wins = daysItems.filter((it) => it.isWin).length;
      const losses = daysItems.length - wins;
      const winRate = daysItems.length > 0 ? Number(((wins / daysItems.length) * 100).toFixed(1)) : 0;

      days.push({
        dateKey,
        date: d,
        dayOfWeek: d.getDay(),
        dayOfMonth: d.getDate(),
        monthName: d.toLocaleDateString('fr-FR', { month: 'short' }),
        totalProfit,
        totalBets,
        totalSessions: daysItems.length,
        wins,
        losses,
        winRate,
        hasActivity: daysItems.length > 0,
      });
    }

    return days;
  }, [activityItems]);

  // Insights & Key Cycle Statistics
  const insights = useMemo(() => {
    const daysArray = DAYS_ORDERED_FR.map((d) => daysSummaryMap.get(d.index)!).filter(Boolean);
    const activeDays = daysArray.filter((d) => d.totalSessions > 0);

    if (activeDays.length === 0) {
      return {
        bestDay: { name: 'Aucune donnée', profit: 0, winRate: 0 },
        worstDay: { name: 'Aucune donnée', profit: 0, winRate: 0 },
        bestTimeSlot: { name: 'Soirée (18h-00h)', profit: 0 },
        activeDaysCount: 0,
        totalNetProfit: 0,
        weeklyConsistency: 0,
      };
    }

    // Sort by profit
    const sortedByProfit = [...activeDays].sort((a, b) => b.totalProfit - a.totalProfit);
    const bestDay = sortedByProfit[0];
    const worstDay = sortedByProfit[sortedByProfit.length - 1];

    // Compute best time slot across all days
    const slotTotals = {
      night: { name: 'Nuit (00h-06h)', profit: 0, sessions: 0 },
      morning: { name: 'Matin (06h-12h)', profit: 0, sessions: 0 },
      afternoon: { name: 'Après-midi (12h-18h)', profit: 0, sessions: 0 },
      evening: { name: 'Soirée (18h-00h)', profit: 0, sessions: 0 },
    };

    daysArray.forEach((d) => {
      slotTotals.night.profit += d.timeSlots.night.profit;
      slotTotals.night.sessions += d.timeSlots.night.sessions;
      slotTotals.morning.profit += d.timeSlots.morning.profit;
      slotTotals.morning.sessions += d.timeSlots.morning.sessions;
      slotTotals.afternoon.profit += d.timeSlots.afternoon.profit;
      slotTotals.afternoon.sessions += d.timeSlots.afternoon.sessions;
      slotTotals.evening.profit += d.timeSlots.evening.profit;
      slotTotals.evening.sessions += d.timeSlots.evening.sessions;
    });

    const bestSlot = Object.values(slotTotals).sort((a, b) => b.profit - a.profit)[0];
    const totalNetProfit = Number(daysArray.reduce((acc, d) => acc + d.totalProfit, 0).toFixed(2));
    const profitableDaysCount = activeDays.filter((d) => d.totalProfit > 0).length;
    const weeklyConsistency = activeDays.length > 0 ? Number(((profitableDaysCount / activeDays.length) * 100).toFixed(1)) : 0;

    return {
      bestDay: { name: bestDay.dayName, profit: bestDay.totalProfit, winRate: bestDay.winRate },
      worstDay: { name: worstDay.dayName, profit: worstDay.totalProfit, winRate: worstDay.winRate },
      bestTimeSlot: { name: bestSlot.name, profit: Number(bestSlot.profit.toFixed(2)) },
      activeDaysCount: activeDays.length,
      totalNetProfit,
      weeklyConsistency,
    };
  }, [daysSummaryMap]);

  // Color mapper helper for matrix & grid cells
  const getCellColorStyle = (profit: number, sessionsCount: number, winRate: number) => {
    if (sessionsCount === 0) {
      return 'bg-slate-950/70 border-slate-800/60 text-slate-600 hover:border-slate-700';
    }

    if (metricMode === 'profit') {
      if (profit > 15) return 'bg-emerald-500/80 border-emerald-400 text-white shadow-emerald-500/20 shadow-md font-bold';
      if (profit > 5) return 'bg-emerald-600/60 border-emerald-500/80 text-emerald-100 font-semibold';
      if (profit > 0) return 'bg-emerald-800/40 border-emerald-600/50 text-emerald-200';
      if (profit === 0) return 'bg-slate-800/80 border-slate-600 text-slate-300';
      if (profit > -5) return 'bg-rose-900/40 border-rose-700/50 text-rose-200';
      if (profit > -15) return 'bg-rose-700/60 border-rose-500/80 text-rose-100 font-semibold';
      return 'bg-rose-600/80 border-rose-400 text-white shadow-rose-500/20 shadow-md font-bold';
    }

    if (metricMode === 'winrate') {
      if (winRate >= 75) return 'bg-cyan-500/80 border-cyan-400 text-white font-bold';
      if (winRate >= 55) return 'bg-cyan-600/60 border-cyan-500 text-cyan-100';
      if (winRate >= 40) return 'bg-blue-900/50 border-blue-700 text-blue-200';
      return 'bg-amber-900/50 border-amber-700 text-amber-200';
    }

    // Volume mode (sessions or bets)
    if (sessionsCount > 10) return 'bg-indigo-600/80 border-indigo-400 text-white font-bold';
    if (sessionsCount > 4) return 'bg-indigo-700/60 border-indigo-500 text-indigo-100';
    return 'bg-indigo-900/40 border-indigo-700/50 text-indigo-200';
  };

  return (
    <motion.div
      id="calendar-heatmap-dashboard-card"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Calendar Heatmap & Cycles de Performance</span>
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 font-mono">
              7 Jours &bull; 4 Tranches Horaires
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cartographie thermique des gains, pertes et régularité selon les jours de la semaine et les plages horaires
          </p>
        </div>

        {/* Action Controls & View Mode Selectors */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          
          {/* Main Visual Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('day_of_week_matrix')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'day_of_week_matrix'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Matrice Hebdo</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('monthly_grid')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'monthly_grid'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Grille 35 Jours</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('weekly_summary')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'weekly_summary'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Classement Jours</span>
            </button>
          </div>

          {/* Metric Selector (Profit vs Win Rate vs Volume) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
            {([
              { key: 'profit', label: 'Gains Net' },
              { key: 'winrate', label: '% Win' },
              { key: 'volume', label: 'Activité' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetricMode(key)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  metricMode === key ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* KPI Performance Cycle Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* Best Performing Day */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Meilleur Jour</span>
            <Award className="w-3 h-3 text-emerald-400" />
          </span>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-bold text-slate-100 block">
              {insights.bestDay.name}
            </span>
            <span className={`text-xs font-mono font-bold ${insights.bestDay.profit >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {insights.bestDay.profit >= 0 ? '+' : ''}{insights.bestDay.profit} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 font-semibold">
            {insights.bestDay.winRate}% de succès
          </span>
        </div>

        {/* Most Volatile / Risky Day */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Jour à Risque</span>
            <AlertTriangle className="w-3 h-3 text-rose-400" />
          </span>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-bold text-slate-100 block">
              {insights.worstDay.name}
            </span>
            <span className={`text-xs font-mono font-bold ${insights.worstDay.profit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {insights.worstDay.profit < 0 ? '' : '+'}{insights.worstDay.profit} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 font-semibold">
            Plus forte variance baissière
          </span>
        </div>

        {/* Best Time Slot */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Créneau Optimal</span>
            <Clock className="w-3 h-3 text-amber-400" />
          </span>
          <div className="mt-1">
            <span className="text-sm font-bold text-slate-100 block truncate">
              {insights.bestTimeSlot.name}
            </span>
            <span className={`text-xs font-mono font-bold ${insights.bestTimeSlot.profit >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {insights.bestTimeSlot.profit >= 0 ? '+' : ''}{insights.bestTimeSlot.profit} {currency}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 font-semibold">
            Heure de pointe profitable
          </span>
        </div>

        {/* Weekly Consistency */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Régularité Hebdo</span>
            <Flame className="w-3 h-3 text-orange-400" />
          </span>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-bold text-slate-100 block">
              {insights.weeklyConsistency}%
            </span>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {insights.activeDaysCount} jours actifs
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 font-semibold">
            Jours positifs vs total
          </span>
        </div>

      </div>

      {/* Main Heatmap Visualization Viewport */}
      <div className="relative">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: DAY OF WEEK × TIME SLOTS MATRIX */}
          {viewMode === 'day_of_week_matrix' && (
            <motion.div
              key="view-day-of-week-matrix"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="overflow-x-auto pb-1">
                <table className="w-full text-xs text-left border-separate border-spacing-1.5 min-w-[580px]">
                  <thead>
                    <tr>
                      <th className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-28">
                        Jour
                      </th>
                      {TIME_SLOTS.map((slot) => {
                        const Icon = slot.icon;
                        return (
                          <th key={slot.id} className="p-2 text-center text-slate-300 font-bold bg-slate-950/60 rounded-xl border border-slate-800/80">
                            <div className="flex items-center justify-center gap-1 text-[11px]">
                              <Icon className="w-3 h-3 text-amber-400" />
                              <span>{slot.label}</span>
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-2 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider w-24">
                        Total Jour
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_ORDERED_FR.map((d) => {
                      const dayData = daysSummaryMap.get(d.index);
                      if (!dayData) return null;

                      const isDayProfitable = dayData.totalProfit >= 0;

                      return (
                        <tr key={d.index} className="group">
                          
                          {/* Day Label */}
                          <td className="p-2.5 font-bold text-slate-200 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                            <span>{d.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{dayData.totalSessions}s</span>
                          </td>

                          {/* 4 Time Slots Columns */}
                          {(['night', 'morning', 'afternoon', 'evening'] as const).map((slotKey) => {
                            const slot = dayData.timeSlots[slotKey];
                            const colorClass = getCellColorStyle(slot.profit, slot.sessions, dayData.winRate);

                            return (
                              <td key={slotKey} className="p-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCell({
                                    title: `${d.name} • ${TIME_SLOTS.find(s => s.id === slotKey)?.label}`,
                                    subtitle: `Activité enregistrée sur cette tranche`,
                                    profit: slot.profit,
                                    bets: slot.bets,
                                    sessions: slot.sessions,
                                    winRate: slot.sessions > 0 ? dayData.winRate : 0,
                                    details: slot.sessions > 0 
                                      ? `${slot.sessions} session(s) totalisant ${slot.bets} paris.` 
                                      : 'Aucune session enregistrée sur ce créneau horaire.',
                                  })}
                                  className={`w-full h-12 rounded-xl border p-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-[1.03] active:scale-95 ${colorClass}`}
                                >
                                  {slot.sessions > 0 ? (
                                    <>
                                      <span className="font-mono text-xs font-bold leading-tight">
                                        {metricMode === 'profit' 
                                          ? `${slot.profit > 0 ? '+' : ''}${slot.profit}` 
                                          : metricMode === 'winrate'
                                          ? `${dayData.winRate}%`
                                          : `${slot.sessions} sess.`}
                                      </span>
                                      <span className="text-[9px] opacity-75 font-mono">
                                        {slot.bets} paris
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-700 text-xs">&bull;</span>
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Day Row Total */}
                          <td className="p-2.5 text-right font-mono font-bold bg-slate-950/80 rounded-xl border border-slate-800">
                            <span className={dayData.totalSessions > 0 ? (isDayProfitable ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600'}>
                              {dayData.totalSessions > 0 ? `${isDayProfitable ? '+' : ''}${dayData.totalProfit}` : '-'}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-normal">
                              {dayData.winRate}% win
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* VIEW 2: GITHUB-STYLE 35-DAYS CALENDAR GRID */}
          {viewMode === 'monthly_grid' && (
            <motion.div
              key="view-monthly-grid"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Historique continu des 35 derniers jours</span>
                <span className="font-mono text-[11px] text-amber-400 font-semibold">
                  Cliquez sur un jour pour inspecter
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {DAYS_ORDERED_FR.map((d) => (
                  <div key={`header-${d.short}`} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                    {d.short}
                  </div>
                ))}

                {calendarGridData.map((day) => {
                  const colorClass = getCellColorStyle(day.totalProfit, day.totalSessions, day.winRate);

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => setSelectedCell({
                        title: `Date : ${day.dateKey}`,
                        subtitle: `${day.dayOfMonth} ${day.monthName} (${day.wins} Victoires / ${day.losses} Défaites)`,
                        profit: day.totalProfit,
                        bets: day.totalBets,
                        sessions: day.totalSessions,
                        winRate: day.winRate,
                        details: day.hasActivity 
                          ? `${day.totalSessions} sessions complétées avec ${day.totalBets} paris.` 
                          : 'Aucune activité ce jour-ci.',
                      })}
                      className={`h-14 sm:h-16 rounded-xl border p-1.5 flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.04] active:scale-95 text-left ${colorClass}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold opacity-80">{day.dayOfMonth}</span>
                        <span className="text-[9px] opacity-60 uppercase">{day.monthName}</span>
                      </div>

                      <div className="w-full text-right">
                        {day.hasActivity ? (
                          <span className="font-mono text-[11px] font-bold block leading-tight">
                            {metricMode === 'profit' 
                              ? `${day.totalProfit >= 0 ? '+' : ''}${day.totalProfit}` 
                              : metricMode === 'winrate'
                              ? `${day.winRate}%`
                              : `${day.totalBets}p`}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-xs block text-center">&ndash;</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* VIEW 3: WEEKLY SUMMARY & RANKING CARDS */}
          {viewMode === 'weekly_summary' && (
            <motion.div
              key="view-weekly-summary"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5"
            >
              {DAYS_ORDERED_FR.map((d) => {
                const dayData = daysSummaryMap.get(d.index);
                if (!dayData) return null;
                const isPos = dayData.totalProfit >= 0;

                return (
                  <div 
                    key={`summary-card-${d.index}`}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between space-y-2.5 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isPos && dayData.totalSessions > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-200 text-xs">{d.name}</span>
                          <span className="text-[10px] text-slate-500 block">{dayData.totalSessions} session(s)</span>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${isPos && dayData.totalSessions > 0 ? 'text-emerald-400' : dayData.totalSessions > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                        {dayData.totalSessions > 0 ? `${isPos ? '+' : ''}${dayData.totalProfit} ${currency}` : '0.00'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Taux de Réussite :</span>
                        <span className="font-mono font-semibold text-slate-200">{dayData.winRate}% ({dayData.wins}W/{dayData.losses}L)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Volume Total Paris :</span>
                        <span className="font-mono text-slate-300">{dayData.totalBets} paris</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/50 text-[10px]">
                        <span>Créneau Clé :</span>
                        <span className="text-amber-300 font-semibold">
                          {dayData.timeSlots.evening.profit >= dayData.timeSlots.afternoon.profit ? 'Soirée' : 'Après-midi'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Interactive Detail Modal / Inspector Drawer */}
      <AnimatePresence>
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="p-3.5 rounded-xl bg-slate-950 border border-orange-500/30 text-xs space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-orange-500/5"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-orange-500/20 text-orange-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-slate-100 text-xs">{selectedCell.title}</span>
                <span className="text-[10px] text-slate-400">&bull; {selectedCell.subtitle}</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-6">
                {selectedCell.details}
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Résultat Net :</span>
                <span className={`font-mono font-bold text-sm ${selectedCell.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedCell.profit >= 0 ? '+' : ''}{selectedCell.profit} {currency}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heatmap Scale Legend & Strategy Insights */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
        
        {/* Heat Legend Scale */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Échelle :</span>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-400 inline-block" title="Perte sévère" />
            <span className="w-3.5 h-3.5 rounded bg-rose-900/50 border border-rose-700/50 inline-block" title="Petite perte" />
            <span className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800 inline-block" title="Inactif" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-800/50 border border-emerald-600/50 inline-block" title="Petit gain" />
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400 inline-block" title="Gros gain" />
          </div>
          <span className="text-[10px] text-slate-500">Pertes &harr; Neutre &harr; Gains</span>
        </div>

        {/* Actionable tip */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Conseil Quantitatif : Évitez de forcer les mises lors des jours et créneaux identifiés en zone rouge.</span>
        </div>

      </div>

    </motion.div>
  );
};
