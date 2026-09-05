import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Award, 
  DollarSign, 
  Activity, 
  ShieldCheck, 
  BarChart2, 
  Filter,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Zap,
  Sparkles,
  Bot,
  Calendar,
  Flame,
  Radio,
  Check,
  Search,
  CheckSquare,
  ExternalLink,
  Calculator,
  ChevronDown,
  ChevronUp,
  X,
  Trophy,
  SlidersHorizontal
} from 'lucide-react';
import { TrackedSportBet } from '../types';
import { formatParisTime, formatParisDateTime, formatKickoffCountdown } from '../utils/parisTime';
import { KellyCalculator, calculateKelly } from './KellyCalculator';
import { ReliabilityAnalysisSection } from './ReliabilityAnalysisSection';

export interface SportFilterItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}

export const KNOWN_SPORTS: SportFilterItem[] = [
  { id: 'all', label: 'Tous les sports', icon: '🏆', color: 'text-blue-400', activeColor: 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20' },
  { id: 'football', label: 'Football', icon: '⚽', color: 'text-emerald-400', activeColor: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20' },
  { id: 'basketball', label: 'Basketball', icon: '🏀', color: 'text-amber-400', activeColor: 'bg-amber-600 text-white border-amber-400 shadow-amber-500/20' },
  { id: 'tennis', label: 'Tennis', icon: '🎾', color: 'text-lime-400', activeColor: 'bg-lime-600 text-white border-lime-400 shadow-lime-500/20' },
  { id: 'mma', label: 'MMA / UFC', icon: '🥊', color: 'text-rose-400', activeColor: 'bg-rose-600 text-white border-rose-400 shadow-rose-500/20' },
  { id: 'esports', label: 'E-Sports', icon: '🎮', color: 'text-purple-400', activeColor: 'bg-purple-600 text-white border-purple-400 shadow-purple-500/20' },
  { id: 'hockey', label: 'Hockey', icon: '🏒', color: 'text-cyan-400', activeColor: 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-500/20' },
  { id: 'baseball', label: 'Baseball', icon: '⚾', color: 'text-orange-400', activeColor: 'bg-orange-600 text-white border-orange-400 shadow-orange-500/20' },
];

export const getSportBadgeConfig = (sportId: string) => {
  const normalized = (sportId || '').toLowerCase();
  switch (normalized) {
    case 'football': 
      return { icon: '⚽', label: 'Football', badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'basketball': 
      return { icon: '🏀', label: 'Basketball', badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'tennis': 
      return { icon: '🎾', label: 'Tennis', badgeStyle: 'bg-lime-500/20 text-lime-300 border-lime-500/30' };
    case 'mma': 
      return { icon: '🥊', label: 'MMA / UFC', badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    case 'esports': 
      return { icon: '🎮', label: 'E-Sports', badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 'hockey': 
      return { icon: '🏒', label: 'Hockey', badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    case 'baseball': 
      return { icon: '⚾', label: 'Baseball', badgeStyle: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    default: 
      return { icon: '🏆', label: sportId.toUpperCase() || 'SPORT', badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  }
};

interface BetAccuracyTrackerProps {
  trackedBets: TrackedSportBet[];
  onUpdateStatus: (id: string, status: 'won' | 'lost' | 'void' | 'pending', finalScore?: string, notes?: string) => void;
  onBatchUpdateStatus?: (updates: Array<{ id: string; status: 'won' | 'lost' | 'void' | 'pending'; finalScore?: string; resolutionNotes?: string; autoResolved?: boolean }>) => void;
  onUpdateStake?: (id: string, stakePercent: number, stakeAmount: number) => void;
  onDeleteBet: (id: string) => void;
  onClearAll: () => void;
  currency: string;
}

export const BetAccuracyTracker: React.FC<BetAccuracyTrackerProps> = ({
  trackedBets,
  onUpdateStatus,
  onBatchUpdateStatus,
  onUpdateStake,
  onDeleteBet,
  onClearAll,
  currency,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'won' | 'lost' | 'void'>('all');
  const [filterSport, setFilterSport] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [tempScore, setTempScore] = useState<string>('');
  const [tempNotes, setTempNotes] = useState<string>('');

  // Kelly Criterion calculator states
  const [isKellyGlobalOpen, setIsKellyGlobalOpen] = useState<boolean>(false);
  const [activeKellyBetId, setActiveKellyBetId] = useState<string | null>(null);
  const [isReliabilityOpen, setIsReliabilityOpen] = useState<boolean>(false);
  
  // Status transition detection for Framer Motion highlight effects
  const previousStatusesRef = useRef<Map<string, 'won' | 'lost' | 'void' | 'pending'>>(new Map());
  const [recentTransitions, setRecentTransitions] = useState<Record<string, { to: 'won' | 'lost' | 'void' | 'pending'; from: 'won' | 'lost' | 'void' | 'pending'; timestamp: number }>>({});

  // Detect when any bet transitions from 'pending' to 'won' or 'lost'
  useEffect(() => {
    const newTransitions: Record<string, { to: 'won' | 'lost' | 'void' | 'pending'; from: 'won' | 'lost' | 'void' | 'pending'; timestamp: number }> = {};
    let hasNewWon = false;

    trackedBets.forEach((bet) => {
      const prevStatus = previousStatusesRef.current.get(bet.id);
      if (prevStatus && prevStatus !== bet.status) {
        // Status transitioned!
        newTransitions[bet.id] = {
          from: prevStatus,
          to: bet.status,
          timestamp: Date.now(),
        };

        if (prevStatus === 'pending' && bet.status === 'won') {
          hasNewWon = true;
        }
      }
      // Record latest status
      previousStatusesRef.current.set(bet.id, bet.status);
    });

    if (Object.keys(newTransitions).length > 0) {
      setRecentTransitions((prev) => ({ ...prev, ...newTransitions }));

      if (hasNewWon) {
        try {
          confetti({
            particleCount: 70,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#60A5FA'],
          });
        } catch {
          // ignore if canvas-confetti is not supported in environment
        }
      }

      // Automatically clear highlight animation state after 4.5 seconds
      const timer = setTimeout(() => {
        setRecentTransitions({});
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [trackedBets]);

  // Auto-Resolution State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [singleSyncingId, setSingleSyncingId] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);

  // Live Paris Time clock state
  const [currentParisTime, setCurrentParisTime] = useState<string>(formatParisTime(Date.now(), true));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentParisTime(formatParisTime(Date.now(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute sport counts dynamically from tracked bets
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { all: trackedBets.length };
    trackedBets.forEach((b) => {
      const s = (b.sport || 'other').toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [trackedBets]);

  // Build the sports list to display in the filter bar
  const displaySports = useMemo(() => {
    const list = [...KNOWN_SPORTS];
    // Check if any tracked bet has a custom sport not in KNOWN_SPORTS
    const knownIds = new Set(KNOWN_SPORTS.map((s) => s.id));
    Object.keys(sportCounts).forEach((sportKey) => {
      if (!knownIds.has(sportKey) && sportCounts[sportKey] > 0) {
        list.push({
          id: sportKey,
          label: sportKey.charAt(0).toUpperCase() + sportKey.slice(1),
          icon: '🏅',
          color: 'text-indigo-400',
          activeColor: 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/20',
        });
      }
    });
    return list;
  }, [sportCounts]);

  // Calculations for AI Reliability & Performance (scoped to active sport filter or global)
  const activeTrackedBets = useMemo(() => {
    if (filterSport === 'all') return trackedBets;
    return trackedBets.filter((b) => (b.sport || '').toLowerCase() === filterSport.toLowerCase());
  }, [trackedBets, filterSport]);

  const resolvedBets = activeTrackedBets.filter((b) => b.status === 'won' || b.status === 'lost');
  const wonBets = activeTrackedBets.filter((b) => b.status === 'won');
  const lostBets = activeTrackedBets.filter((b) => b.status === 'lost');
  const pendingBets = activeTrackedBets.filter((b) => b.status === 'pending');
  const voidBets = activeTrackedBets.filter((b) => b.status === 'void');

  const winRate = resolvedBets.length > 0 
    ? Number(((wonBets.length / resolvedBets.length) * 100).toFixed(1)) 
    : 0;

  const totalWageredResolved = resolvedBets.reduce((acc, b) => acc + (b.stakeAmount || 0), 0);
  const netProfit = activeTrackedBets.reduce((acc, b) => acc + (b.profit || 0), 0);
  
  const roi = totalWageredResolved > 0 
    ? Number(((netProfit / totalWageredResolved) * 100).toFixed(1)) 
    : 0;

  // Average odds of bets
  const avgOdds = activeTrackedBets.length > 0 
    ? (activeTrackedBets.reduce((acc, b) => acc + b.odds, 0) / activeTrackedBets.length).toFixed(2)
    : '0.00';

  // AI Calibration: Compare Predicted Confidence with Actual Win Rate
  const avgConfidence = resolvedBets.length > 0
    ? (resolvedBets.reduce((acc, b) => acc + (b.confidenceScore || 0), 0) / resolvedBets.length).toFixed(1)
    : '0';

  // Filtered List combining Status, Sport, and Search Text
  const filteredList = useMemo(() => {
    return trackedBets.filter((b) => {
      // 1. Status Filter
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;

      // 2. Sport Filter
      if (filterSport !== 'all' && (b.sport || '').toLowerCase() !== filterSport.toLowerCase()) return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchMatch = (b.match || '').toLowerCase().includes(q);
        const matchLeague = (b.league || '').toLowerCase().includes(q);
        const matchMarket = (b.market || '').toLowerCase().includes(q);
        const matchSport = (b.sport || '').toLowerCase().includes(q);
        const matchNotes = (b.notes || '').toLowerCase().includes(q);
        if (!matchMatch && !matchLeague && !matchMarket && !matchSport && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [trackedBets, filterStatus, filterSport, searchQuery]);

  const hasActiveFilters = filterStatus !== 'all' || filterSport !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterSport('all');
    setSearchQuery('');
  };

  // Automated Result Resolution Function (calls server endpoint)
  const handleResolveResults = useCallback(async (forceResolve = false, targetBetId?: string, forceAuditAll = false) => {
    let targetBets: TrackedSportBet[] = [];
    if (targetBetId) {
      targetBets = trackedBets.filter((b) => b.id === targetBetId);
    } else if (forceAuditAll) {
      // Re-audit ALL tracked bets against genuine real-world scoreboard feeds
      targetBets = trackedBets;
    } else if (forceResolve) {
      targetBets = trackedBets.filter((b) => b.status === 'pending');
    } else {
      targetBets = pendingBets;
    }

    if (targetBets.length === 0) {
      setLastSyncStatus('Tous les paris suivis sont déjà à jour.');
      return;
    }

    if (targetBetId) {
      setSingleSyncingId(targetBetId);
    } else {
      setIsSyncing(true);
    }
    setLastSyncStatus(null);

    try {
      const response = await fetch('/api/gemini/resolve-sports-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bets: targetBets,
          forceResolve: forceResolve || forceAuditAll,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des scores sportifs');
      }

      const data = await response.json();
      const resolvedList = data.resolvedBets || [];

      if (resolvedList.length > 0) {
        if (onBatchUpdateStatus) {
          onBatchUpdateStatus(resolvedList);
        } else {
          resolvedList.forEach((item: any) => {
            if (item.status && item.status !== 'pending') {
              onUpdateStatus(item.id, item.status, item.finalScore, item.resolutionNotes);
            }
          });
        }

        const resolvedCount = resolvedList.filter((r: any) => r.isMatchFinished || r.status !== 'pending').length;
        if (resolvedCount > 0) {
          setLastSyncStatus(`✨ ${resolvedCount} résultat(s) officiel(s) vérifié(s) et clôturé(s) avec exactitude.`);
        } else {
          setLastSyncStatus('Les matchs sélectionnés sont encore à venir ou en cours de jeu.');
        }
      } else {
        setLastSyncStatus(data.summary || 'Synchronisation terminée.');
      }

      setLastSyncTime(Date.now());
    } catch (err: any) {
      console.error('Error resolving sports bets:', err);
      setLastSyncStatus(`Erreur de synchronisation : ${err.message || 'Problème réseau'}`);
    } finally {
      setIsSyncing(false);
      setSingleSyncingId(null);
    }
  }, [trackedBets, pendingBets, onBatchUpdateStatus, onUpdateStatus]);

  // Periodic background check every 60 seconds if auto-sync is on
  useEffect(() => {
    if (!autoSyncEnabled || pendingBets.length === 0) return;

    const interval = setInterval(() => {
      // Check silently in background if any pending match has passed its start time
      const hasPotentiallyFinished = pendingBets.some((b) => {
        const kickoff = b.kickoffTimestamp || (b.createdAt + 60 * 60 * 1000);
        return Date.now() >= kickoff;
      });

      if (hasPotentiallyFinished) {
        handleResolveResults(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [autoSyncEnabled, pendingBets, handleResolveResults]);

  const handleScoreSubmit = (id: string, currentStatus: 'won' | 'lost' | 'void' | 'pending') => {
    onUpdateStatus(id, currentStatus, tempScore.trim(), tempNotes.trim() || undefined);
    setEditingScoreId(null);
    setTempScore('');
    setTempNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Automated Sync & Live Audit Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-4.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Récupération Automatique des Scores & Bilan IA
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  Auto-Sync Actif
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                L'IA analyse les coups d'envoi et interroge les scores finaux pour clôturer les paris et recalculer le Winrate et le ROI sans saisie manuelle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
            {/* Main Auto-Resolve Button */}
            <button
              onClick={() => handleResolveResults(false)}
              disabled={isSyncing || pendingBets.length === 0}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-2 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Récupération...' : `Vérifier les Scores (${pendingBets.length} en attente)`}</span>
            </button>

            {/* Re-audit all bets button (to fix any previously skewed scores) */}
            {trackedBets.length > 0 && (
              <button
                onClick={() => handleResolveResults(false, undefined, true)}
                disabled={isSyncing}
                title="Interroge les flux officiels ESPN pour vérifier et corriger tous les scores et recalculer fidèlement le bilan"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ré-auditer tout le bilan (ESPN)</span>
              </button>
            )}

            {/* Fast Simulation / Test Clôture Button */}
            {pendingBets.length > 0 && (
              <button
                onClick={() => handleResolveResults(true)}
                disabled={isSyncing}
                title="Clôture immédiatement les matchs en attente avec des scores réalistes pour auditer le bilan sans attendre"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Simuler Clôture Immédiate</span>
              </button>
            )}

            {/* Auto-Sync Toggle */}
            <button
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                autoSyncEnabled 
                  ? 'bg-slate-900 border-indigo-500/40 text-indigo-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="Activer/Désactiver la vérification d'arrière-plan automatique toutes les minutes"
            >
              <CheckSquare className={`w-3.5 h-3.5 ${autoSyncEnabled ? 'text-indigo-400' : 'text-slate-600'}`} />
              <span className="text-[11px]">En tâche de fond</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner Feedback */}
        {lastSyncStatus && (
          <div className="bg-slate-950/80 border border-indigo-800/40 px-3.5 py-2 rounded-xl text-xs text-indigo-200 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>{lastSyncStatus}</span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] text-slate-400 font-mono">
                Dernier audit : {formatParisTime(lastSyncTime, true)} (Paris)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Global AI Accuracy Scorecard */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Indice de Fiabilité & Performance des Pronostics IA
              </h3>
              {filterSport !== 'all' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <span>Filtre Sport :</span>
                  <strong>{displaySports.find(s => s.id === filterSport)?.icon} {displaySports.find(s => s.id === filterSport)?.label}</strong>
                  <button 
                    onClick={() => setFilterSport('all')} 
                    className="hover:text-white ml-0.5"
                    title="Retirer le filtre sport"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {filterSport === 'all'
                ? "Suivi statistique en direct de tous les paris proposés par l'IA pour auditer son Winrate et son ROI réel."
                : `Bilan statistique spécifique aux paris IA sur ${displaySports.find(s => s.id === filterSport)?.label || filterSport}.`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition"
                title="Effacer tous les filtres appliqués"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser filtres
              </button>
            )}

            {trackedBets.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 self-start sm:self-center transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Réinitialiser l'historique
              </button>
            )}
          </div>
        </div>

        {/* 4 KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Win Rate */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Taux de Réussite (Winrate)</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
              <span className={winRate >= 55 ? 'text-emerald-400' : winRate >= 50 ? 'text-blue-400' : 'text-amber-400'}>
                {winRate}%
              </span>
              <span className="text-[10px] text-slate-500 font-normal">({wonBets.length}V / {lostBets.length}D)</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Sur {resolvedBets.length} pari(s) clôturé(s) {filterSport !== 'all' ? `en ${displaySports.find(s => s.id === filterSport)?.label}` : ''}
            </div>
          </div>

          {/* ROI / Net Profit */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Bilan Net Cumulé</span>
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className={`text-2xl font-black font-mono flex items-baseline gap-1.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-normal">{currency}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              ROI : <strong className={roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{roi >= 0 ? '+' : ''}{roi}%</strong>
            </div>
          </div>

          {/* Average Odds */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Cote Moyenne Suivie</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black font-mono text-indigo-300">
              @{avgOdds}
            </div>
            <div className="text-[10px] text-slate-500">
              {pendingBets.length} pari(s) en cours
            </div>
          </div>

          {/* AI Calibration Index */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Calibration Confiance IA</span>
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-300">
              {avgConfidence}%
            </div>
            <div className="text-[10px] text-slate-500">
              Score de confiance moyen
            </div>
          </div>

        </div>

      </div>

      {/* 3. Sport & Status Filter & Search Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-sm">
        
        {/* Top row: Sport Filter Title, Match Search, and Global Kelly toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-slate-200">
              Filtrer les Paris Suivis par Sport
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 font-mono">
              {filteredList.length} / {trackedBets.length} affiché(s)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick search input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher équipe, ligue, marché..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/60 focus:border-orange-500/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Reliability Analysis Market Breakdown Toggle Button */}
            <button
              type="button"
              onClick={() => setIsReliabilityOpen(!isReliabilityOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm ${
                isReliabilityOpen
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
              }`}
              title="Afficher l'analyse de fiabilité et le Win Rate par type de marché (1N2, Over/Under, BTTS...)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Fiabilité / Marchés</span>
              {isReliabilityOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            {/* Kelly Criterion Calculator Toggle Button */}
            <button
              type="button"
              onClick={() => setIsKellyGlobalOpen(!isKellyGlobalOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm ${
                isKellyGlobalOpen
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/20'
                  : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/60'
              }`}
              title="Ouvrir le calculateur de mise Critère de Kelly"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden md:inline">Calculateur</span>
              <span>Kelly (f*)</span>
              {isKellyGlobalOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Row 1: Sport Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
          {displaySports.map((s) => {
            const count = sportCounts[s.id] || 0;
            const isSelected = filterSport.toLowerCase() === s.id.toLowerCase();

            // Only show sports that have bets OR standard common sports
            if (count === 0 && s.id !== 'all' && s.id !== 'football' && s.id !== 'basketball' && s.id !== 'tennis') {
              return null;
            }

            return (
              <button
                key={s.id}
                onClick={() => setFilterSport(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  isSelected
                    ? `${s.activeColor} scale-[1.02]`
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected 
                    ? 'bg-slate-950/80 text-white border border-white/20' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Status Filter Pills Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs flex-wrap">
            <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Statut :
            </span>
            {[
              { id: 'all', label: `Tous (${activeTrackedBets.length})` },
              { id: 'pending', label: `En attente (${pendingBets.length})`, color: 'text-amber-400' },
              { id: 'won', label: `Gagnés (${wonBets.length})`, color: 'text-emerald-400' },
              { id: 'lost', label: `Perdus (${lostBets.length})`, color: 'text-rose-400' },
              { id: 'void', label: `Annulés (${voidBets.length})`, color: 'text-slate-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filterStatus === tab.id
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={tab.color}>{tab.label}</span>
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <X className="w-3 h-3" />
              <span>Effacer les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Kelly Criterion Calculator Panel */}
      <AnimatePresence>
        {isKellyGlobalOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <KellyCalculator
              initialOdds={Number(avgOdds) || 1.95}
              initialConfidence={Number(avgConfidence) || 68}
              initialBankroll={1000}
              currency={currency}
              matchTitle="Calculateur Généraliste Sportsbook"
              marketTitle="Dimensionnement Optimal du Bankroll"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Reliability Analysis Section */}
      <AnimatePresence>
        {isReliabilityOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <ReliabilityAnalysisSection
              trackedBets={trackedBets}
              currency={currency}
              onFilterMarketInTracker={(kw) => {
                setSearchQuery(kw);
                setIsReliabilityOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Tracked Bets List */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            {trackedBets.length === 0
              ? "Aucun pronostic IA n'est actuellement suivi."
              : `Aucun pari ne correspond à vos filtres actuels.`}
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            {trackedBets.length === 0
              ? "Depuis l'onglet 'Pronostics IA & Value', cliquez sur 'Suivre ce pari' pour enregistrer une recommandation de l'IA. Le bot récupérera automatiquement son résultat dès la fin du match pour calculer votre bilan réel."
              : `Filtres actifs : ${filterSport !== 'all' ? `Sport (${displaySports.find(s => s.id === filterSport)?.label || filterSport}) ` : ''}${filterStatus !== 'all' ? `Statut (${filterStatus}) ` : ''}${searchQuery ? `Recherche ("${searchQuery}")` : ''}`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredList.map((bet, betIdx) => {
              const potentialProfit = (bet.stakeAmount * (bet.odds - 1)).toFixed(2);
              const isEditing = editingScoreId === bet.id;
              const isSingleResolving = singleSyncingId === bet.id;
              const transitionInfo = recentTransitions[bet.id];
              const isJustWon = transitionInfo?.to === 'won';
              const isJustLost = transitionInfo?.to === 'lost';
              const isJustVoid = transitionInfo?.to === 'void';
              const isJustPending = transitionInfo?.to === 'pending';

              return (
                <motion.div
                  key={bet.id ? `${bet.id}-${betIdx}` : `bet-${betIdx}`}
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isJustWon ? [1, 1.025, 1] : 1,
                    x: isJustLost ? [0, -6, 6, -4, 4, 0] : 0,
                    boxShadow: isJustWon
                      ? [
                          '0 0 0px rgba(16,185,129,0)',
                          '0 0 35px rgba(16,185,129,0.7)',
                          '0 0 15px rgba(16,185,129,0.3)',
                        ]
                      : isJustLost
                      ? [
                          '0 0 0px rgba(244,63,94,0)',
                          '0 0 30px rgba(244,63,94,0.65)',
                          '0 0 12px rgba(244,63,94,0.25)',
                        ]
                      : bet.status === 'won'
                      ? '0 0 12px rgba(16,185,129,0.15)'
                      : bet.status === 'lost'
                      ? '0 0 12px rgba(244,63,94,0.15)'
                      : '0 0 0px rgba(0,0,0,0)',
                  }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{
                    duration: isJustWon ? 1.2 : isJustLost ? 0.8 : 0.3,
                    ease: 'easeOut',
                    layout: { duration: 0.3 }
                  }}
                  className={`bg-slate-900 border rounded-2xl p-4.5 shadow-sm transition space-y-3 relative overflow-hidden ${
                    bet.status === 'won'
                      ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-950/25 via-slate-900 to-slate-900'
                      : bet.status === 'lost'
                      ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/25 via-slate-900 to-slate-900'
                      : bet.status === 'void'
                      ? 'border-slate-700 bg-slate-950/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Subtle animated status glow bar on the left edge */}
                  <motion.div 
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      bet.status === 'won'
                        ? 'bg-emerald-400'
                        : bet.status === 'lost'
                        ? 'bg-rose-500'
                        : bet.status === 'void'
                        ? 'bg-slate-600'
                        : 'bg-amber-400'
                    }`}
                    layoutId={`edge-bar-${bet.id}`}
                  />

                  {/* Header info & Highlight Banners */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                          {bet.league}
                        </span>
                        {bet.kickoffTime ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono">
                            <Clock className="w-2.5 h-2.5 text-cyan-400" />
                            {formatKickoffCountdown(bet.kickoffTimestamp, bet.kickoffTime).badgeText}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            • Enregistré le {formatParisDateTime(bet.createdAt)}
                          </span>
                        )}
                        {/* Interactive Sport Badge */}
                        {(() => {
                          const sportCfg = getSportBadgeConfig(bet.sport);
                          const isCurrentSportFilter = filterSport.toLowerCase() === (bet.sport || '').toLowerCase();
                          return (
                            <button
                              type="button"
                              onClick={() => setFilterSport(isCurrentSportFilter ? 'all' : bet.sport.toLowerCase())}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 hover:brightness-125 ${
                                isCurrentSportFilter
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                  : sportCfg.badgeStyle
                              }`}
                              title={isCurrentSportFilter ? "Cliquer pour réinitialiser le filtre sport" : `Filtrer uniquement les paris ${sportCfg.label}`}
                            >
                              <span>{sportCfg.icon}</span>
                              <span>{sportCfg.label}</span>
                            </button>
                          );
                        })()}
                        {bet.autoResolved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5 text-indigo-400" />
                            Validé par l'IA
                          </span>
                        )}

                        {/* Stake.com Match Direct Link */}
                        {bet.stakeUrl && (
                          <a
                            href={bet.stakeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-300 bg-orange-950/80 border border-orange-500/40 hover:bg-orange-900/60 px-2 py-0.5 rounded-full transition"
                            title="Voir cette rencontre sur Stake.com"
                          >
                            <span>⚡ Stake.com</span>
                            <ExternalLink className="w-2.5 h-2.5 text-orange-400" />
                          </a>
                        )}

                        {/* Kelly Sizing Button & Badge */}
                        {(() => {
                          const betKelly = calculateKelly(bet.odds, bet.confidenceScore || 65, 1000, 0.5, 5.0);
                          return (
                            <button
                              type="button"
                              onClick={() => setActiveKellyBetId(activeKellyBetId === bet.id ? null : bet.id)}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                                activeKellyBetId === bet.id
                                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                                  : betKelly.riskRating === 'negative_ev'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/30 hover:bg-rose-900/60'
                                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30 hover:bg-indigo-900/60'
                              }`}
                              title="Ouvrir le calculateur Kelly pour ajuster la mise recommandée"
                            >
                              <Calculator className="w-2.5 h-2.5 text-indigo-300" />
                              <span>Kelly : {betKelly.recommendedStakePct}%</span>
                              {activeKellyBetId === bet.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          );
                        })()}

                        {/* Framer Motion Live Transition Highlight Pill */}
                        <AnimatePresence>
                          {isJustWon && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.7, x: -5 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              className="inline-flex items-center gap-1 text-[10px] font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 px-2.5 py-0.5 rounded-full shadow-md shadow-emerald-500/50 border border-emerald-200 animate-pulse"
                            >
                              <Sparkles className="w-3 h-3 text-slate-950" />
                              <span>RÉSULTAT : VICTOIRE (+{(bet.stakeAmount * (bet.odds - 1)).toFixed(2)} {bet.currency}) !</span>
                            </motion.span>
                          )}
                          {isJustLost && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.7, x: -5 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-0.5 rounded-full shadow-md shadow-rose-500/50 border border-rose-300"
                            >
                              <XCircle className="w-3 h-3 text-white" />
                              <span>RÉSULTAT : PERDU (-{bet.stakeAmount.toFixed(2)} {bet.currency})</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <h4 className="text-sm font-black text-white mt-1">
                        {bet.match}
                      </h4>
                    </div>

                    {/* Odds & EV */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        @{bet.odds.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 inline-block font-mono">
                        +{bet.expectedValue}% EV
                      </div>
                    </div>
                  </div>

                  {/* Market & Status details with Framer Motion visual transition */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Marché sélectionné par l'IA :</div>
                      <div className="text-xs font-bold text-emerald-300">{bet.market}</div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px]">Mise : </span>
                        <strong className="text-white">{bet.stakeAmount} {bet.currency} ({bet.stakePercent}%)</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px]">Résultat : </span>
                        <AnimatePresence mode="wait">
                          {bet.status === 'won' && (
                            <motion.span
                              key="status-won"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="text-emerald-400 font-black inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                              <span>+{bet.profit.toFixed(2)} {bet.currency}</span>
                            </motion.span>
                          )}
                          {bet.status === 'lost' && (
                            <motion.span
                              key="status-lost"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="text-rose-400 font-black inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400 inline" />
                              <span>-{bet.stakeAmount.toFixed(2)} {bet.currency}</span>
                            </motion.span>
                          )}
                          {bet.status === 'void' && (
                            <motion.span
                              key="status-void"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="text-slate-400"
                            >
                              0.00 {bet.currency} (Remboursé)
                            </motion.span>
                          )}
                          {bet.status === 'pending' && (
                            <motion.span
                              key="status-pending"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="text-amber-300 inline-flex items-center gap-1"
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span>En attente (+{potentialProfit} {bet.currency})</span>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Score & Notes Display */}
                  {(bet.finalScore || bet.resolutionNotes) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 space-y-1"
                    >
                      {bet.finalScore && (
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Score final : <strong className="text-white">{bet.finalScore}</strong></span>
                          </span>
                          <button
                            onClick={() => {
                              setEditingScoreId(bet.id);
                              setTempScore(bet.finalScore || '');
                              setTempNotes(bet.resolutionNotes || '');
                            }}
                            className="text-[10px] text-blue-400 hover:underline"
                          >
                            Modifier
                          </button>
                        </div>
                      )}
                      {bet.resolutionNotes && (
                        <div className="text-[11px] text-slate-400 pl-5">
                          💡 {bet.resolutionNotes}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Edit Score form */}
                  {isEditing && (
                    <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-700">
                      <input
                        type="text"
                        placeholder="Score (Ex: Arsenal 2 - 2 Manchester City)"
                        value={tempScore}
                        onChange={(e) => setTempScore(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Note d'analyse (Ex: Plus de 2.5 buts validé car 4 buts marqués)"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleScoreSubmit(bet.id, bet.status)}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEditingScoreId(null)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Kelly Criterion Calculator for this specific bet */}
                  <AnimatePresence>
                    {activeKellyBetId === bet.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-1"
                      >
                        <KellyCalculator
                          isInlineCard
                          initialOdds={bet.odds}
                          initialConfidence={bet.confidenceScore || 65}
                          initialBankroll={1000}
                          currency={bet.currency || currency}
                          matchTitle={bet.match}
                          marketTitle={bet.market}
                          onApplyStake={(newPct, newAmount) => {
                            if (onUpdateStake) {
                              onUpdateStake(bet.id, newPct, newAmount);
                            }
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons to Validate Win / Loss / Auto-Sync */}
                  <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      
                      {/* Check Button for Bet (Pending or Re-verify) */}
                      <button
                        onClick={() => handleResolveResults(true, bet.id)}
                        disabled={isSingleResolving}
                        title="Interroge le flux officiel ESPN pour vérifier le score exact et clôturer ce pari"
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSingleResolving ? 'animate-spin' : ''}`} />
                        <span>{isSingleResolving ? 'Vérification...' : bet.status === 'pending' ? '⚡ Vérifier résultat' : '🔄 Re-vérifier score'}</span>
                      </button>

                      <span className="text-[11px] text-slate-400 font-medium ml-1">Clôture manuelle :</span>
                      
                      <button
                        onClick={() => onUpdateStatus(bet.id, 'won')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          bet.status === 'won'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Gagné (+{(bet.stakeAmount * (bet.odds - 1)).toFixed(2)} {bet.currency})
                      </button>

                      <button
                        onClick={() => onUpdateStatus(bet.id, 'lost')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          bet.status === 'lost'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/60'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Perdu (-{bet.stakeAmount.toFixed(2)} {bet.currency})
                      </button>

                      <button
                        onClick={() => onUpdateStatus(bet.id, 'void')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          bet.status === 'void'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Nul
                      </button>

                      <button
                        onClick={() => onUpdateStatus(bet.id, 'pending')}
                        className={`px-2 py-1 rounded-lg text-xs transition ${
                          bet.status === 'pending'
                            ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Remettre en attente"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!bet.finalScore && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingScoreId(bet.id);
                            setTempScore('');
                            setTempNotes('');
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                        >
                          + Score
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteBet(bet.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Supprimer ce pari du suivi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
