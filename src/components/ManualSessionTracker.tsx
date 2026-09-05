import React, { useState } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  Trash2, 
  Download, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  BookOpen, 
  BarChart3, 
  Filter, 
  Smile, 
  Meh, 
  Frown, 
  Target,
  RotateCcw,
  RefreshCw,
  Trophy,
  Dices,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Calculator,
  ExternalLink
} from 'lucide-react';
import { ManualSession, StakeGameType, BettingStrategy, TrackedSportBet } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { useTranslation } from '../i18n/LanguageContext';

interface ManualSessionTrackerProps {
  sessions: ManualSession[];
  onAddSession: (session: Omit<ManualSession, 'id' | 'timestamp' | 'startingBalance' | 'endingBalance'>) => void;
  onDeleteSession: (id: string) => void;
  onClearSessions?: () => void;
  onRefreshSessions?: () => void;
  currentBalance: number;
  currency: string;
  currentStrategy?: BettingStrategy;
  trackedSportBets?: TrackedSportBet[];
  onImportResolvedBets?: (bets: TrackedSportBet[]) => void;
}

export const ManualSessionTracker: React.FC<ManualSessionTrackerProps> = ({
  sessions,
  onAddSession,
  onDeleteSession,
  onClearSessions,
  onRefreshSessions,
  currentBalance,
  currency,
  currentStrategy,
  trackedSportBets = [],
}) => {
  const { t } = useTranslation();

  // Activity Mode Selector: 'sports' (Paris Sportifs) vs 'casino' (Originaux / Jeux)
  const [activeCategory, setActiveCategory] = useState<'sports' | 'casino'>('sports');

  // Shared Form State
  const [resultType, setResultType] = useState<'profit' | 'loss' | 'void'>('profit');
  const [amountStr, setAmountStr] = useState<string>('');
  const [mood, setMood] = useState<'disciplined' | 'calm' | 'tilted' | 'target_hit'>('disciplined');
  const [notes, setNotes] = useState<string>('');

  // Casino Specific Form State
  const [selectedGame, setSelectedGame] = useState<StakeGameType>(currentStrategy?.game || 'dice');
  const [strategyName, setStrategyName] = useState<string>(currentStrategy?.name || "Oscar's Grind Cycle Discipliné");
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [estimatedBets, setEstimatedBets] = useState<number>(50);

  // Sports Betting Specific Form State
  const [sport, setSport] = useState<'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey' | 'baseball' | 'rugby' | 'other'>('football');
  const [matchName, setMatchName] = useState<string>('');
  const [leagueName, setLeagueName] = useState<string>('');
  const [marketName, setMarketName] = useState<string>('');
  const [oddsStr, setOddsStr] = useState<string>('1.85');
  const [stakeStr, setStakeStr] = useState<string>('10');
  const [betType, setBetType] = useState<'single' | 'parlay' | 'live' | 'future'>('single');
  const [bookmaker, setBookmaker] = useState<string>('Stake');
  const [calculationMode, setCalculationMode] = useState<'auto_odds' | 'manual_amount'>('auto_odds');

  // Filtering View State
  const [viewFilterCategory, setViewFilterCategory] = useState<'all' | 'sports' | 'casino'>('all');
  const [filterType, setFilterType] = useState<'all' | 'profit' | 'loss'>('all');
  const [filterSpecificGameOrSport, setFilterSpecificGameOrSport] = useState<string>('all');

  // AI Coaching State
  const [isAnalyzingCoach, setIsAnalyzingCoach] = useState(false);
  const [coachAnalysis, setCoachAnalysis] = useState<string | null>(null);
  const [trackerToast, setTrackerToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setTrackerToast({ text, type });
    setTimeout(() => setTrackerToast(null), 4000);
  };

  // Sports list helper
  const sportsList = [
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
    { id: 'mma', label: 'MMA / UFC', icon: '🥊' },
    { id: 'esports', label: 'E-Sports', icon: '🎮' },
    { id: 'hockey', label: 'Hockey', icon: '🏒' },
    { id: 'baseball', label: 'Baseball', icon: '⚾' },
    { id: 'rugby', label: 'Rugby', icon: '🏉' },
    { id: 'other', label: 'Autre Sport', icon: '🏆' },
  ];

  // Helper to safely get profit value from session
  const getSessionProfit = (s: ManualSession): number => {
    if (typeof s.profit === 'number' && !isNaN(s.profit)) return s.profit;
    if (typeof s.profitOrLoss === 'number' && !isNaN(s.profitOrLoss)) return s.profitOrLoss;
    return 0;
  };

  const getSessionEnding = (s: ManualSession): number => {
    if (typeof s.endingBalance === 'number' && !isNaN(s.endingBalance)) return s.endingBalance;
    if (typeof s.startingBalance === 'number' && !isNaN(s.startingBalance)) {
      return s.startingBalance + getSessionProfit(s);
    }
    return currentBalance;
  };

  // Determine category of session
  const isSportSession = (s: ManualSession): boolean => {
    return s.category === 'sports' || s.game === 'sports' || !!s.sport || !!s.match;
  };

  // Compute computed profit for Sports form
  const parsedStake = parseFloat(stakeStr) || 0;
  const parsedOdds = parseFloat(oddsStr) || 1.0;
  
  let computedSportsProfit = 0;
  if (resultType === 'profit') {
    computedSportsProfit = Number((parsedStake * Math.max(parsedOdds - 1, 0)).toFixed(2));
  } else if (resultType === 'loss') {
    computedSportsProfit = Number((-parsedStake).toFixed(2));
  } else {
    computedSportsProfit = 0; // Void / Push
  }

  // Filtered Sessions for calculations based on viewFilterCategory
  const sessionsInSelectedCategory = sessions.filter((s) => {
    if (viewFilterCategory === 'sports') return isSportSession(s);
    if (viewFilterCategory === 'casino') return !isSportSession(s);
    return true;
  });

  // Compute global and categorized stats
  const totalSessions = sessionsInSelectedCategory.length;
  const winningSessions = sessionsInSelectedCategory.filter((s) => getSessionProfit(s) > 0).length;
  const losingSessions = sessionsInSelectedCategory.filter((s) => getSessionProfit(s) < 0).length;
  const sessionWinRate = totalSessions > 0 ? Number(((winningSessions / totalSessions) * 100).toFixed(1)) : 0;
  const totalNetProfit = Number(sessionsInSelectedCategory.reduce((sum, s) => sum + getSessionProfit(s), 0).toFixed(2));
  const bestSession = sessionsInSelectedCategory.length > 0 ? Math.max(...sessionsInSelectedCategory.map((s) => getSessionProfit(s)), 0) : 0;
  const worstSession = sessionsInSelectedCategory.length > 0 ? Math.min(...sessionsInSelectedCategory.map((s) => getSessionProfit(s)), 0) : 0;
  const averageProfitPerSession = totalSessions > 0 ? Number((totalNetProfit / totalSessions).toFixed(2)) : 0;

  // Specific Sports Stats
  const sportsSessions = sessions.filter(isSportSession);
  const totalSportsStake = sportsSessions.reduce((sum, s) => sum + (s.stakeAmount || Math.abs(getSessionProfit(s))), 0);
  const totalSportsProfit = Number(sportsSessions.reduce((sum, s) => sum + getSessionProfit(s), 0).toFixed(2));
  const sportsRoi = totalSportsStake > 0 ? Number(((totalSportsProfit / totalSportsStake) * 100).toFixed(1)) : 0;
  const sportsWins = sportsSessions.filter((s) => getSessionProfit(s) > 0).length;
  const sportsLosses = sportsSessions.filter((s) => getSessionProfit(s) < 0).length;
  const sportsWinRate = sportsSessions.length > 0 ? Number(((sportsWins / sportsSessions.length) * 100).toFixed(1)) : 0;

  // Specific Casino Stats
  const casinoSessions = sessions.filter((s) => !isSportSession(s));
  const totalCasinoProfit = Number(casinoSessions.reduce((sum, s) => sum + getSessionProfit(s), 0).toFixed(2));

  // Compute streak
  let currentStreak = 0;
  for (let i = sessionsInSelectedCategory.length - 1; i >= 0; i--) {
    const p = getSessionProfit(sessionsInSelectedCategory[i]);
    if (i === sessionsInSelectedCategory.length - 1) {
      currentStreak = p >= 0 ? 1 : -1;
    } else {
      if (p >= 0 && currentStreak > 0) currentStreak++;
      else if (p < 0 && currentStreak < 0) currentStreak--;
      else break;
    }
  }

  // Quick Preset values
  const quickProfitAmounts = [2, 5, 10, 20, 50, 100];
  const quickLossAmounts = [2, 5, 10, 20, 30, 50];

  const handleCasinoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) return;

    const actualProfit = Number((resultType === 'profit' ? val : -val).toFixed(2));

    onAddSession({
      category: 'casino',
      game: selectedGame,
      strategyName: strategyName.trim() || 'Session Casino',
      profit: actualProfit,
      profitOrLoss: actualProfit,
      currency,
      durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
      estimatedBetsCount: estimatedBets > 0 ? estimatedBets : undefined,
      notes: notes.trim() || undefined,
      mood,
    });

    // Reset input
    setAmountStr('');
    setNotes('');
  };

  const handleSportsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let actualProfit = 0;
    let actualStake = parseFloat(stakeStr) || 0;
    let actualOdds = parseFloat(oddsStr) || 1.0;

    if (calculationMode === 'auto_odds') {
      if (actualStake <= 0) return;
      if (resultType === 'profit') {
        actualProfit = Number((actualStake * Math.max(actualOdds - 1, 0)).toFixed(2));
      } else if (resultType === 'loss') {
        actualProfit = Number((-actualStake).toFixed(2));
      } else {
        actualProfit = 0; // Void
      }
    } else {
      const val = parseFloat(amountStr);
      if (isNaN(val)) return;
      actualProfit = Number((resultType === 'profit' ? Math.abs(val) : resultType === 'loss' ? -Math.abs(val) : 0).toFixed(2));
    }

    const sportObj = sportsList.find(s => s.id === sport);
    const sportIcon = sportObj?.icon || '⚽';
    const displayMatch = matchName.trim() || `${sportIcon} Pari ${sportObj?.label || 'Sport'}`;
    const displayMarket = marketName.trim() || (actualOdds > 1 ? `Cote @${actualOdds.toFixed(2)}` : 'Pari Simple');

    onAddSession({
      category: 'sports',
      game: 'sports',
      sport,
      strategyName: `${sportIcon} ${displayMatch} - ${displayMarket}`,
      match: displayMatch,
      league: leagueName.trim() || undefined,
      market: displayMarket,
      odds: actualOdds > 1 ? actualOdds : undefined,
      stakeAmount: actualStake > 0 ? actualStake : undefined,
      betType,
      bookmaker: bookmaker.trim() || 'Stake',
      profit: actualProfit,
      profitOrLoss: actualProfit,
      currency,
      notes: notes.trim() || undefined,
      mood,
    });

    // Reset inputs
    setMatchName('');
    setLeagueName('');
    setMarketName('');
    setNotes('');
    setAmountStr('');
  };

  // Sync resolved tracked bets into the journal
  const handleSyncTrackedBets = () => {
    const resolvedBets = trackedSportBets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'void');
    if (resolvedBets.length === 0) {
      showToast("Aucun pari sportif résolu à importer pour l'instant dans l'onglet Paris Sportifs IA.", 'info');
      return;
    }

    let importedCount = 0;
    resolvedBets.forEach((b) => {
      // Check if already in sessions by match and timestamp
      const exists = sessions.some(s => s.match === b.match && Math.abs(s.timestamp - b.createdAt) < 60000);
      if (!exists) {
        const sportObj = sportsList.find(s => s.id === b.sport);
        const sportIcon = sportObj?.icon || '⚽';
        onAddSession({
          category: 'sports',
          game: 'sports',
          sport: b.sport,
          strategyName: `${sportIcon} ${b.match} - ${b.market}`,
          match: b.match,
          league: b.league,
          market: b.market,
          odds: b.odds,
          stakeAmount: b.stakeAmount,
          betType: 'single',
          bookmaker: 'Stake (IA Value Bet)',
          profit: b.profit,
          profitOrLoss: b.profit,
          currency: b.currency || currency,
          notes: b.finalScore ? `Résultat : ${b.finalScore}. EV: +${b.expectedValue}%` : undefined,
          mood: b.profit >= 0 ? 'target_hit' : 'disciplined',
        });
        importedCount++;
      }
    });

    if (importedCount > 0) {
      showToast(`${importedCount} pari(s) sportif(s) résolu(s) importé(s) avec succès dans le Journal (+/-) !`, 'success');
    } else {
      showToast("Tous les paris sportifs résolus sont déjà synchronisés dans votre Journal.", 'info');
    }
  };

  // Chart data (running bankroll across manual sessions)
  let cumulativeProfit = 0;
  const chartData = sessionsInSelectedCategory.map((s, idx) => {
    const p = getSessionProfit(s);
    cumulativeProfit += p;
    return {
      sessionIndex: `#${idx + 1}`,
      date: new Date(s.timestamp || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      profit: p,
      cumProfit: Number(cumulativeProfit.toFixed(2)),
      endingBalance: getSessionEnding(s),
      activity: isSportSession(s) ? `⚽ ${s.sport || 'SPORT'}` : `🎰 ${(s.game || 'DICE').toUpperCase()}`,
    };
  });

  // Calculate gradient offset for positive/negative split
  const cumProfitValues = chartData.map(d => d.cumProfit);
  const maxCumProfit = cumProfitValues.length > 0 ? Math.max(...cumProfitValues, 0) : 0;
  const minCumProfit = cumProfitValues.length > 0 ? Math.min(...cumProfitValues, 0) : 0;
  const cumGradientOffset = maxCumProfit <= minCumProfit 
    ? (maxCumProfit > 0 ? 1 : 0) 
    : maxCumProfit / (maxCumProfit - minCumProfit);

  // Filtered Sessions List
  const filteredSessions = sessions.filter((s) => {
    const p = getSessionProfit(s);
    const isSport = isSportSession(s);

    // Category filter
    if (viewFilterCategory === 'sports' && !isSport) return false;
    if (viewFilterCategory === 'casino' && isSport) return false;

    // Outcome filter
    if (filterType === 'profit' && p <= 0) return false;
    if (filterType === 'loss' && p >= 0) return false;

    // Specific game/sport filter
    if (filterSpecificGameOrSport !== 'all') {
      if (isSport && s.sport !== filterSpecificGameOrSport) return false;
      if (!isSport && s.game !== filterSpecificGameOrSport) return false;
    }

    return true;
  });

  // Export CSV
  const handleExportCsv = () => {
    if (sessions.length === 0) return;
    const headers = [
      'ID #',
      'Catégorie',
      'Date',
      'Sport/Jeu',
      'Match/Stratégie',
      'Marché',
      'Cote',
      'Mise',
      'Résultat Net',
      'Devise',
      'Solde Fin',
      'Bookmaker',
      'Discipline',
      'Notes'
    ];
    
    const rows = sessions.map((s, idx) => [
      idx + 1,
      isSportSession(s) ? 'Paris Sportifs' : 'Casino / Originaux',
      new Date(s.timestamp || Date.now()).toISOString(),
      isSportSession(s) ? (s.sport || 'Sport') : (s.game || 'Jeu'),
      `"${(s.match || s.strategyName || '').replace(/"/g, '""')}"`,
      `"${(s.market || '').replace(/"/g, '""')}"`,
      s.odds || '',
      s.stakeAmount || '',
      getSessionProfit(s),
      s.currency,
      getSessionEnding(s),
      `"${(s.bookmaker || '').replace(/"/g, '""')}"`,
      s.mood || '',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stake_journal_bilan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Session Coach Analysis
  const handleAnalyzeCoach = async () => {
    setIsAnalyzingCoach(true);
    try {
      const res = await fetch('/api/gemini/analyze-manual-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions,
          stats: {
            totalSessions,
            winningSessions,
            losingSessions,
            sessionWinRate,
            totalNetProfit,
            bestSession,
            worstSession,
            averageProfitPerSession,
            currentStreak,
            sportsStats: {
              totalSportsProfit,
              sportsRoi,
              sportsWinRate,
              totalSportsSessions: sportsSessions.length,
            },
            casinoStats: {
              totalCasinoProfit,
              totalCasinoSessions: casinoSessions.length,
            }
          },
          currentBankroll: currentBalance,
          currency,
        }),
      });

      const data = await res.json();
      setCoachAnalysis(data.analysis || 'Analyse indisponible.');
    } catch (err: any) {
      setCoachAnalysis(`Erreur d'analyse : ${err.message}`);
    } finally {
      setIsAnalyzingCoach(false);
    }
  };

  return (
    <div id="manual-sessions-container" className="space-y-6">

      {/* Toast Notification Banner */}
      {trackerToast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
          trackerToast.type === 'success' ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' :
          trackerToast.type === 'error' ? 'bg-rose-950/70 border-rose-500/40 text-rose-300' :
          'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {trackerToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{trackerToast.text}</span>
          </div>
          <button onClick={() => setTrackerToast(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-orange-950/40 border border-blue-800/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-orange-500/30 border border-blue-500/40 flex items-center justify-center text-orange-400 shadow-md shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
              {t('manual.title', 'Journal de Bord & Bilan Financier (+/-)')}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ⚽ {t('manual.sportsBadge', 'Paris Sportifs')}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                🎰 {t('manual.casinoBadge', 'Casino')}
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {t('manual.subtitle', 'Consignez vos gains, pertes et cotes en temps réel sur les paris sportifs et les sessions jeux pour un suivi rigoureux de votre bankroll globale.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {trackedSportBets.length > 0 && (
            <button
              onClick={handleSyncTrackedBets}
              className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-bold border border-blue-500/40 transition flex items-center gap-1.5 shadow-md shadow-blue-950/40"
              title={t('manual.importResolvedBets', 'Importer automatiquement les paris résolus depuis l\'onglet Paris Sportifs IA')}
            >
              <Trophy className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('manual.syncBets', 'Sync Paris IA')}</span>
            </button>
          )}

          {onRefreshSessions && (
            <button
              onClick={onRefreshSessions}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-orange-500/30 transition flex items-center gap-1.5"
              title={t('manual.refresh', 'Actualiser le journal')}
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
              <span>{t('manual.refresh', 'Actualiser')}</span>
            </button>
          )}

          {onClearSessions && (
            <div>
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-800/60 p-1 rounded-xl">
                  <span className="text-[10px] text-rose-300 font-bold px-1">{t('manual.confirmClear', 'Effacer tout ?')}</span>
                  <button
                    onClick={() => {
                      onClearSessions();
                      setShowClearConfirm(false);
                      showToast(t('manual.journalReset', 'Journal réinitialisé à 0.'), 'info');
                    }}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                  >
                    {t('common.yes', 'Oui')}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px]"
                  >
                    {t('common.no', 'Non')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={sessions.length === 0}
                  className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/40 transition flex items-center gap-1.5 disabled:opacity-40"
                  title={t('manual.clearSessions', 'Remettre tout le journal à zéro')}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('manual.clearSessions', 'Remettre à 0')}</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleExportCsv}
            disabled={sessions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-blue-500/40 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('manual.exportCsv', 'Exporter CSV')}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards with Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Net Profit Global */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t('manual.globalNet', 'Bilan Net Global')}</span>
            {totalNetProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-lg sm:text-xl font-bold font-mono ${
            totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {totalNetProfit >= 0 ? '+' : ''}{totalNetProfit.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{currency} ({t('manual.totalBalance', 'Total Bilan')})</span>
        </div>

        {/* Sportsbook Net Profit & ROI */}
        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-800/50 hover:border-blue-500/50 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-blue-300 font-bold">
              ⚽ {t('manual.sportsBadge', 'Paris Sportifs')}
            </span>
            <Trophy className="w-4 h-4 text-blue-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold font-mono ${
            totalSportsProfit >= 0 ? 'text-blue-400' : 'text-rose-400'
          }`}>
            {totalSportsProfit >= 0 ? '+' : ''}{totalSportsProfit.toFixed(2)} {currency}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 mt-0.5">
            <span>ROI: <strong className={sportsRoi >= 0 ? 'text-blue-300 font-bold' : 'text-rose-400'}>{sportsRoi >= 0 ? '+' : ''}{sportsRoi}%</strong></span>
            <span>•</span>
            <span>{sportsWins}W / {sportsLosses}L</span>
          </div>
        </div>

        {/* Casino Net Profit */}
        <div className="bg-gradient-to-br from-orange-950/30 via-slate-900 to-slate-950 border border-orange-800/40 hover:border-orange-500/50 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1 text-orange-300 font-bold">
              🎰 {t('manual.casinoBadge', 'Casino & Originaux')}
            </span>
            <Dices className="w-4 h-4 text-orange-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold font-mono ${
            totalCasinoProfit >= 0 ? 'text-orange-400' : 'text-rose-400'
          }`}>
            {totalCasinoProfit >= 0 ? '+' : ''}{totalCasinoProfit.toFixed(2)} {currency}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{casinoSessions.length} {t('manual.sessionsPlayed', 'sessions jouées')}</span>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t('manual.winRate', 'Taux de Réussite')}</span>
            <Target className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-100">
            {sessionWinRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {winningSessions} {t('common.won', 'Gagnés')} / {losingSessions} {t('common.lost', 'Perdus')}
          </span>
        </div>

        {/* Best Outcome */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t('manual.bestOutcome', 'Meilleur Gain')}</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            +{bestSession.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{currency} ({t('manual.peakRecorded', 'Pic enregistré')})</span>
        </div>

        {/* Current Streak */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t('manual.currentStreak', 'Série Actuelle')}</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold font-mono ${
            currentStreak >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {currentStreak > 0 ? `+${currentStreak}W` : currentStreak < 0 ? `${currentStreak}L` : '0'}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">{t('manual.recentMomentum', 'Dynamique récente')}</span>
        </div>

      </div>

      {/* 3. Main Action Section: Form on Left, Progression Chart + AI Coach on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Entry Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          {/* Category Selector Tabs (Sports vs Casino) */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">
              {t('manual.whatToLog', 'Que souhaitez-vous consigner dans le Journal ?')}
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveCategory('sports')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeCategory === 'sports'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-4 h-4 text-blue-200" />
                <span>⚽ {t('manual.sportsTab', 'Pari Sportif')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('casino')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeCategory === 'casino'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dices className="w-4 h-4 text-emerald-200" />
                <span>🎰 {t('manual.casinoTab', 'Session Casino')}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* A. SPORTS BETTING ENTRY FORM */}
          {/* ========================================================================= */}
          {activeCategory === 'sports' && (
            <form onSubmit={handleSportsSubmit} className="space-y-4 pt-1">
              
              {/* Outcome Selection: Gain (+) / Perte (-) / Nul (0) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('manual.resultOutcome', 'Résultat du Pari Sportif')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResultType('profit')}
                    className={`py-2 px-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                      resultType === 'profit'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{t('manual.winPlus', 'Gagné (+)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultType('loss')}
                    className={`py-2 px-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                      resultType === 'loss'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5 text-rose-300" />
                    <span>{t('manual.lossMinus', 'Perdu (-)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultType('void')}
                    className={`py-2 px-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition ${
                      resultType === 'void'
                        ? 'bg-slate-700 text-white border-slate-600 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>⚪ {t('manual.voidZero', 'Remboursé (0)')}</span>
                  </button>
                </div>
              </div>

              {/* Sport Selection Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('manual.sportConcerned', 'Sport')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {sportsList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSport(s.id as any)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                        sport === s.id
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Match & League */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.matchEvent', 'Affiche / Match')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    placeholder="Ex: Arsenal vs Chelsea"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.competitionLeague', 'Ligue / Compétition')}
                  </label>
                  <input
                    type="text"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="Ex: Premier League, NBA, LDC..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Market / Pick */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('manual.marketSelection', 'Intitulé du Pari / Pronostic')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  placeholder="Ex: Plus de 2.5 Buts, Victoire Domicile & BTTS, Spread -4.5..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-600"
                />
              </div>

              {/* Calculation Mode Toggle (Auto via Cote & Mise vs Direct Profit) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-blue-400" />
                    {t('manual.calcAuto', 'Calcul Automatique (Mise & Cote)')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalculationMode(calculationMode === 'auto_odds' ? 'manual_amount' : 'auto_odds')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    {calculationMode === 'auto_odds' ? t('manual.calcManual', 'Saisie manuelle directe') : t('manual.calcAuto', 'Calculer via Cote')}
                  </button>
                </div>

                {calculationMode === 'auto_odds' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        {t('manual.stakeAmount', 'Mise')} ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={stakeStr}
                        onChange={(e) => setStakeStr(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold font-mono text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        {t('manual.odds', 'Cote Décimale')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        required
                        value={oddsStr}
                        onChange={(e) => setOddsStr(e.target.value)}
                        placeholder="Ex: 1.85"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold font-mono text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      {t('manual.netAmount', 'Montant Net')} {resultType === 'profit' ? t('common.won', 'Gagné') : t('common.lost', 'Perdu')} ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="Ex: 8.50"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold font-mono text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Net Profit Summary Preview Box */}
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono font-bold ${
                  resultType === 'profit' 
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' 
                    : resultType === 'loss'
                    ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}>
                  <span className="font-sans font-semibold">{t('manual.netImpact', 'Impact Solde Net')} :</span>
                  <span className="text-sm">
                    {calculationMode === 'auto_odds' ? (
                      `${computedSportsProfit >= 0 ? '+' : ''}${computedSportsProfit.toFixed(2)} ${currency}`
                    ) : (
                      `${resultType === 'profit' ? '+' : resultType === 'loss' ? '-' : ''}${amountStr || '0'} ${currency}`
                    )}
                  </span>
                </div>
              </div>

              {/* Bet Type & Bookmaker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.betType', 'Type de Pari')}
                  </label>
                  <select
                    value={betType}
                    onChange={(e) => setBetType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="single">{t('manual.single', 'Pari Simple')}</option>
                    <option value="parlay">{t('manual.parlay', 'Combiné (Multibet)')}</option>
                    <option value="live">{t('manual.live', 'Live In-Play')}</option>
                    <option value="future">{t('manual.future', 'Long Terme')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.bookmaker', 'Bookmaker / Plateforme')}
                  </label>
                  <input
                    type="text"
                    value={bookmaker}
                    onChange={(e) => setBookmaker(e.target.value)}
                    placeholder="Ex: Stake, Betclic, Winamax..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Discipline Mood */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('manual.discipline', 'Gestion de Bankroll & Discipline')}
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'disciplined', label: t('manual.disciplined', '1-2% Bankroll'), icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
                    { id: 'target_hit', label: t('manual.targetHit', 'Value Bet'), icon: <Target className="w-3 h-3 text-blue-400" /> },
                    { id: 'calm', label: t('manual.calm', 'Plan Suivi'), icon: <Smile className="w-3 h-3 text-amber-400" /> },
                    { id: 'tilted', label: t('manual.tilted', 'Hors Plan'), icon: <Frown className="w-3 h-3 text-rose-400" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id as any)}
                      className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 font-semibold transition ${
                        mood === m.id
                          ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.icon}
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('manual.notes', 'Notes & Analyse (Optionnel)')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('manual.notesPlaceholder', 'Ex: Modèle xG validé en 2ème mi-temps, cote value captée tôt...')}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                  resultType === 'profit'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : resultType === 'loss'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {t('manual.submitSports', 'Consigner le Pari Sportif')} (
                  {calculationMode === 'auto_odds' 
                    ? `${computedSportsProfit >= 0 ? '+' : ''}${computedSportsProfit.toFixed(2)} ${currency}`
                    : `${resultType === 'profit' ? '+' : resultType === 'loss' ? '-' : ''}${amountStr || '0'} ${currency}`
                  })
                </span>
              </button>

            </form>
          )}

          {/* ========================================================================= */}
          {/* B. CASINO / ORIGINAUX ENTRY FORM */}
          {/* ========================================================================= */}
          {activeCategory === 'casino' && (
            <form onSubmit={handleCasinoSubmit} className="space-y-4 pt-1">
              
              {/* Outcome Selection: Gain (+) / Perte (-) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('manual.resultOutcome', 'Résultat de la Session Casino')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResultType('profit')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition ${
                      resultType === 'profit'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-300" />
                    <span>{t('manual.winSession', 'Session Gagnante (+)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResultType('loss')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition ${
                      resultType === 'loss'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-rose-300" />
                    <span>{t('manual.lossSession', 'Session Déficitaire (-)')}</span>
                  </button>
                </div>
              </div>

              {/* Amount Input & Quick Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('manual.netAmount', 'Montant Net')} {resultType === 'profit' ? t('common.won', 'Gagné') : t('common.lost', 'Perdu')} ({currency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="Ex: 15.50"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-base font-bold font-mono text-white focus:outline-none focus:ring-2 ${
                      resultType === 'profit'
                        ? 'border-emerald-700/60 focus:ring-emerald-500'
                        : 'border-rose-700/60 focus:ring-rose-500'
                    }`}
                  />
                  <span className={`absolute right-3.5 top-2.5 text-xs font-bold ${
                    resultType === 'profit' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {resultType === 'profit' ? '+' : '-'}{amountStr || '0'} {currency}
                  </span>
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-semibold mr-1">{t('manual.quickChips', 'Raccourcis :')}</span>
                  {(resultType === 'profit' ? quickProfitAmounts : quickLossAmounts).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountStr(amt.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition"
                    >
                      {resultType === 'profit' ? '+' : '-'}{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Played & Strategy Applied */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.casinoGame', 'Jeu Joué')}
                  </label>
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value as StakeGameType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="dice">Dice</option>
                    <option value="mines">Mines</option>
                    <option value="limbo">Limbo</option>
                    <option value="plinko">Plinko</option>
                    <option value="keno">Keno</option>
                    <option value="hilo">Hilo</option>
                    <option value="roulette">Roulette</option>
                    <option value="blackjack">Blackjack</option>
                    <option value="crash">Crash</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.appliedStrategy', 'Stratégie Appliquée')}
                  </label>
                  <input
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="Ex: Oscar's Grind, Paroli..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration & Estimated Bets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {t('manual.durationMin', 'Durée (Minutes)')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('manual.estimatedBets', 'Nombre de Tours Est.')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedBets}
                    onChange={(e) => setEstimatedBets(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Discipline Mood */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('manual.discipline', 'Discipline & Respect du Plan')}
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { id: 'disciplined', label: t('manual.disciplined', 'Discipliné'), icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
                    { id: 'target_hit', label: t('manual.targetHit', 'Cible TP'), icon: <Target className="w-3 h-3 text-blue-400" /> },
                    { id: 'calm', label: t('manual.calm', 'Calme'), icon: <Smile className="w-3 h-3 text-amber-400" /> },
                    { id: 'tilted', label: t('manual.tilted', 'Difficile'), icon: <Frown className="w-3 h-3 text-rose-400" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id as any)}
                      className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 font-semibold transition ${
                        mood === m.id
                          ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('manual.notes', 'Observations & Notes (Optionnel)')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('manual.notesPlaceholderCasino', 'Ex: Take-profit atteint à +15 USDT, session arrêtée sans forcer...')}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                  resultType === 'profit'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('manual.submitCasino', 'Enregistrer la Session')} ({resultType === 'profit' ? '+' : '-'}{amountStr || '0'} {currency})</span>
              </button>

            </form>
          )}

        </div>

        {/* Right Column: Running Capital Chart & AI Coach Advisor */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Progression Curve */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  {t('manual.chartTitle', 'Progression du Capital')} ({viewFilterCategory === 'sports' ? t('manual.sportsBadge', 'Paris Sportifs') : viewFilterCategory === 'casino' ? t('manual.casinoBadge', 'Casino') : t('manual.globalNet', 'Global')})
                </h4>
                <p className="text-xs text-slate-400">{t('manual.chartSubtitle', 'Évolution nette cumulée de votre bankroll')} ({currency})</p>
              </div>

              {/* Chart Scope Filters */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  onClick={() => setViewFilterCategory('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    viewFilterCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('manual.allFilter', 'Tout')}
                </button>
                <button
                  onClick={() => setViewFilterCategory('sports')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    viewFilterCategory === 'sports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚽ {t('manual.sportsBadge', 'Paris Sportifs')}</span>
                </button>
                <button
                  onClick={() => setViewFilterCategory('casino')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    viewFilterCategory === 'casino' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🎰 {t('manual.casinoBadge', 'Casino')}</span>
                </button>
              </div>
            </div>

            <div className="h-56 w-full pt-2 bg-[#1a2c38]/70 border border-[#213743] rounded-xl p-2 relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={0} stopColor="#00e701" stopOpacity={0.45} />
                        <stop offset={cumGradientOffset} stopColor="#00e701" stopOpacity={0.10} />
                        <stop offset={cumGradientOffset} stopColor="#e9113c" stopOpacity={0.10} />
                        <stop offset={1} stopColor="#e9113c" stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#213743" vertical={false} opacity={0.5} />
                    <XAxis dataKey="sessionIndex" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f212e', borderColor: '#2f4553', borderRadius: '12px', fontSize: '11px' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(val: any) => [`${val >= 0 ? '+' : ''}${val} ${currency}`, t('manual.cumProfit', 'Profit Cumulé')]}
                    />
                    <ReferenceLine y={0} stroke="#2f4553" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="cumProfit"
                      stroke={totalNetProfit >= 0 ? '#00e701' : '#e9113c'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cumProfitGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 space-y-1">
                  <BookOpen className="w-8 h-8 text-slate-700 mb-1" />
                  <p>{t('manual.noEntriesInCat', 'Aucune entrée enregistrée dans cette catégorie.')}</p>
                  <p className="text-[11px] text-slate-600">{t('manual.enterFirstBet', 'Renseignez votre premier pari ou session à gauche.')}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Coach & Discipline Advisor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">
                  {t('manual.coachTitle', 'Coach Quantitatif IA Gemini 3.7')}
                </h4>
              </div>

              <button
                onClick={handleAnalyzeCoach}
                disabled={isAnalyzingCoach || sessions.length === 0}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-950/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAnalyzingCoach ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('manual.auditInProgress', 'Audit en cours...')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>{t('manual.auditResults', 'Auditer mes Résultats')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 text-xs text-slate-300 min-h-[120px] leading-relaxed max-h-72 overflow-y-auto">
              {coachAnalysis ? (
                <div className="whitespace-pre-wrap font-sans">{coachAnalysis}</div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  {t('manual.coachPlaceholder', 'Cliquez sur "Auditer mes Résultats" pour recevoir un diagnostic personnalisé sur votre gestion de bankroll, votre rentabilité sur les paris sportifs par rapport au casino, et des conseils de discipline quantitatifs.')}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. Detailed Manual Sessions & Bets Logbook Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              {t('manual.historyTitle', 'Historique Complet du Journal')} ({filteredSessions.length})
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View category filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewFilterCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  viewFilterCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('manual.allFilter', 'Tout')}
              </button>
              <button
                onClick={() => setViewFilterCategory('sports')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  viewFilterCategory === 'sports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚽ {t('manual.sportsBadge', 'Paris Sportifs')}</span>
              </button>
              <button
                onClick={() => setViewFilterCategory('casino')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  viewFilterCategory === 'casino' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🎰 {t('manual.casinoBadge', 'Casino')}</span>
              </button>
            </div>

            {/* Outcome Filter */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['all', 'profit', 'loss'] as const).map((tVal) => (
                <button
                  key={tVal}
                  onClick={() => setFilterType(tVal)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition ${
                    filterType === tVal
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tVal === 'all' ? t('manual.allFilter', 'Tous') : tVal === 'profit' ? t('manual.winners', 'Gagnants') : t('manual.losers', 'Déficitaires')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Smartphone Portrait Card View (< md) */}
        <div className="md:hidden space-y-2.5">
          {filteredSessions.slice().reverse().map((s, idx) => {
            const isSport = isSportSession(s);
            const profitVal = getSessionProfit(s);
            const sportObj = isSport ? sportsList.find(sp => sp.id === s.sport) : null;

            return (
              <div 
                key={s.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-500 font-bold">
                      #{filteredSessions.length - idx}
                    </span>
                    {isSport ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        <span>{sportObj?.icon || '⚽'}</span>
                        <span className="capitalize">{s.sport || 'Sport'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
                        <span>🎰</span>
                        <span>{s.game || 'Casino'}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Net Result Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg border ${
                      profitVal > 0 
                        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30' 
                        : profitVal < 0 
                        ? 'bg-rose-950/70 text-rose-400 border-rose-500/30' 
                        : 'bg-slate-850 text-slate-300 border-slate-700'
                    }`}>
                      {profitVal > 0 ? '+' : ''}{profitVal.toFixed(2)} {s.currency}
                    </span>
                    <button
                      onClick={() => onDeleteSession(s.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title={t('common.delete', 'Supprimer')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Event / Strategy Name & Market */}
                <div className="text-xs font-semibold text-slate-200">
                  <div>{s.match ? s.match : s.strategyName}</div>
                  {s.league && (
                    <div className="text-[10px] text-slate-400 font-normal">{s.league}</div>
                  )}
                </div>

                {/* Market & Odds & Balance Pill */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {s.market && (
                      <span className="text-slate-300 font-medium">{s.market}</span>
                    )}
                    {s.odds && (
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-[10px]">
                        @{s.odds.toFixed(2)}
                      </span>
                    )}
                    {s.stakeAmount && (
                      <span className="text-[10px] text-slate-400">
                        {t('manual.stakeAmount', 'Mise')}: {s.stakeAmount} {s.currency}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {t('manual.endingBalance', 'Solde')}: <span className="text-slate-200 font-bold">{getSessionEnding(s).toFixed(2)} {s.currency}</span>
                  </div>
                </div>

                {s.notes && (
                  <p className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/60 italic">
                    "{s.notes}"
                  </p>
                )}
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
              {t('manual.noEntryFilter', 'Aucune entrée dans ce filtre.')}
            </div>
          )}
        </div>

        {/* Logbook Desktop & Tablet Table (>= md) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">{t('manual.tableType', 'Type')}</th>
                <th className="py-3 px-4">{t('manual.tableDateTime', 'Date / Heure')}</th>
                <th className="py-3 px-4">{t('manual.tableEvent', 'Événement / Stratégie')}</th>
                <th className="py-3 px-4">{t('manual.tableMarketOdds', 'Marché & Cote')}</th>
                <th className="py-3 px-4">{t('manual.tableNetResult', 'Résultat Net')}</th>
                <th className="py-3 px-4">{t('manual.tableEndBalance', 'Solde Fin')}</th>
                <th className="py-3 px-4">{t('manual.tableNotes', 'Plateforme & Notes')}</th>
                <th className="py-3 px-4 text-right">{t('manual.tableAction', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSessions.slice().reverse().map((s, idx) => {
                const isSport = isSportSession(s);
                const profitVal = getSessionProfit(s);
                const sportObj = isSport ? sportsList.find(sp => sp.id === s.sport) : null;

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-400 text-[11px]">
                      #{filteredSessions.length - idx}
                    </td>
                    
                    {/* Activity Badge */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {isSport ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          <span>{sportObj?.icon || '⚽'}</span>
                          <span className="capitalize">{s.sport || 'Sport'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
                          <span>🎰</span>
                          <span>{s.game || 'Casino'}</span>
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      <span className="text-[10px] opacity-60">
                        {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Event / Match / Strategy */}
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      <div>
                        {s.match ? s.match : s.strategyName}
                      </div>
                      {s.league && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          {s.league}
                        </span>
                      )}
                    </td>

                    {/* Market & Odds */}
                    <td className="py-2.5 px-4 text-slate-300">
                      {s.market ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-200">{s.market}</span>
                          {s.odds && (
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px]">
                              @{s.odds.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          {s.durationMinutes ? `${s.durationMinutes} min` : '-'} / {s.estimatedBetsCount ? `${s.estimatedBetsCount} tours` : '-'}
                        </span>
                      )}
                    </td>

                    {/* Net Result */}
                    <td className={`py-2.5 px-4 font-mono font-bold text-xs whitespace-nowrap ${
                      profitVal > 0 ? 'text-emerald-400' : profitVal < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {profitVal > 0 ? '+' : ''}{profitVal.toFixed(2)} {s.currency}
                    </td>

                    {/* Ending Balance */}
                    <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {getSessionEnding(s).toFixed(2)} {s.currency}
                    </td>

                    {/* Notes & Platform */}
                    <td className="py-2.5 px-4 max-w-xs text-slate-300">
                      <div className="truncate">
                        {s.notes || <span className="text-slate-600 italic">{t('manual.noNotes', 'Aucune note')}</span>}
                      </div>
                      {s.bookmaker && (
                        <span className="text-[9px] text-slate-500 uppercase font-semibold">
                          {s.bookmaker}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onDeleteSession(s.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title={t('manual.deleteEntry', 'Supprimer cette entrée')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-500 font-sans">
                    {t('manual.noEntryFilterHelp', 'Aucune entrée enregistrée dans ce filtre. Utilisez le formulaire ci-dessus pour consigner votre premier pari sportif ou session casino.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
