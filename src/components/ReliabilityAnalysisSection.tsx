import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart2, 
  Layers, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Zap, 
  Sparkles, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info, 
  Scale, 
  PieChart, 
  Activity,
  Flame,
  HelpCircle
} from 'lucide-react';
import { TrackedSportBet } from '../types';

export type MarketCategoryKey = 
  | '1x2'
  | 'over_under'
  | 'btts'
  | 'handicap'
  | 'double_chance'
  | 'player_props'
  | 'combos'
  | 'other';

export interface MarketReliabilityStats {
  key: MarketCategoryKey;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  totalBets: number;
  resolvedBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  voidBets: number;
  winRate: number; // in %
  totalWagered: number;
  totalReturn: number;
  netProfit: number;
  roi: number; // in %
  avgOdds: number;
  avgConfidence: number;
  profitFactor: number;
  rating: 'elite' | 'profitable' | 'neutral' | 'unprofitable' | 'insufficient_data';
  examples: TrackedSportBet[];
}

interface ReliabilityAnalysisSectionProps {
  trackedBets: TrackedSportBet[];
  currency: string;
  onFilterMarketInTracker?: (marketKeyword: string) => void;
}

// Helper to categorize any bet's market name into standardized buckets
export const categorizeBetMarket = (bet: TrackedSportBet): MarketCategoryKey => {
  const text = `${bet.market || ''} ${bet.stakeMarketName || ''} ${bet.notes || ''}`.toLowerCase();

  // 1. Over / Under & Totals
  if (
    text.includes('over') || 
    text.includes('under') || 
    text.includes('plus de') || 
    text.includes('moins de') || 
    text.includes('+ de') || 
    text.includes('- de') || 
    text.includes('total buts') || 
    text.includes('total points') || 
    text.includes('total goals') ||
    text.includes('total over') ||
    text.includes('total under') ||
    text.includes('totals')
  ) {
    return 'over_under';
  }

  // 2. BTTS (Both Teams To Score / Les 2 équipes marquent)
  if (
    text.includes('btts') || 
    text.includes('deux équipes') || 
    text.includes('2 équipes') || 
    text.includes('both teams to score') || 
    text.includes('les deux marquent') ||
    text.includes('les 2 marquent')
  ) {
    return 'btts';
  }

  // 3. Handicap & Spreads
  if (
    text.includes('handicap') || 
    text.includes('spread') || 
    text.includes('asian') || 
    text.includes('écart')
  ) {
    return 'handicap';
  }

  // 4. Double Chance
  if (
    text.includes('double chance') || 
    text.includes('1x') || 
    text.includes('x2') || 
    text.includes('12')
  ) {
    return 'double_chance';
  }

  // 5. Player Props / Buteurs / Points individuels
  if (
    text.includes('buteur') || 
    text.includes('props') || 
    text.includes('passeur') || 
    text.includes('points joueur') || 
    text.includes('rebonds') || 
    text.includes('player') || 
    text.includes('goalscorer')
  ) {
    return 'player_props';
  }

  // 6. Combinés & Accas
  if (
    text.includes('combiné') || 
    text.includes('combo') || 
    text.includes('acca') || 
    text.includes('parlay') || 
    text.includes('multibet')
  ) {
    return 'combos';
  }

  // 7. 1N2 / Moneyline / Vainqueur du Match
  if (
    text.includes('1n2') || 
    text.includes('1x2') || 
    text.includes('victoire') || 
    text.includes('moneyline') || 
    text.includes('vainqueur') || 
    text.includes('match winner') || 
    text.includes('draw no bet') || 
    text.includes('dnb') || 
    text.includes('nul') || 
    text.includes('résultat final')
  ) {
    return '1x2';
  }

  return 'other';
};

const MARKET_CONFIGS: Record<MarketCategoryKey, { label: string; shortLabel: string; icon: string; description: string }> = {
  '1x2': {
    label: '1N2 / Résultat Match (Moneyline / 1X2)',
    shortLabel: '1N2 / Vainqueur',
    icon: '⚽',
    description: 'Paris sur le vainqueur sec de la rencontre (1, Nul ou 2) ou Moneyline en temps réglementaire.'
  },
  'over_under': {
    label: 'Over / Under (Totaux Buts & Points)',
    shortLabel: 'Over / Under',
    icon: '🎯',
    description: 'Plus / Moins de buts (+2.5, +3.5), paniers NBA (+218.5) ou points de jeu totaux.'
  },
  'btts': {
    label: 'Les 2 Équipes Marquent (BTTS - Oui/Non)',
    shortLabel: 'BTTS (Oui/Non)',
    icon: '🔥',
    description: 'Probabilité que chaque formation inscrive au moins un but durant le match.'
  },
  'handicap': {
    label: 'Handicaps Asiatiques & Spreads',
    shortLabel: 'Handicap & Spread',
    icon: '⚖️',
    description: 'Ajustement d\'écart virtuel (+1.5, -1.5) pour lisser les probabilités et sécuriser la valeur.'
  },
  'double_chance': {
    label: 'Double Chance (1X, X2, 12)',
    shortLabel: 'Double Chance',
    icon: '🛡️',
    description: 'Couverture sécurisée couvrant 2 issues sur 3 possibles (Victoire Domicile ou Nul, etc.).'
  },
  'player_props': {
    label: 'Performances Joueurs (Buteurs, Points)',
    shortLabel: 'Player Props',
    icon: '👤',
    description: 'Buteur à tout moment, points / rebonds / passes NBA individuels.'
  },
  'combos': {
    label: 'Combinés, Accas & Boosts',
    shortLabel: 'Combinés / Accas',
    icon: '⚡',
    description: 'Sélections multiples combinées générant de fortes cotes et des multiplicateurs EV+.'
  },
  'other': {
    label: 'Autres Marchés & Spécifiques',
    shortLabel: 'Autres Marchés',
    icon: '📊',
    description: 'Mi-temps, scores exacts, cartons et marchés de niche secondaires.'
  }
};

export const ReliabilityAnalysisSection: React.FC<ReliabilityAnalysisSectionProps> = ({
  trackedBets,
  currency,
  onFilterMarketInTracker
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [expandedMarket, setExpandedMarket] = useState<MarketCategoryKey | null>(null);
  const [sortBy, setSortBy] = useState<'winrate' | 'roi' | 'bets' | 'profit'>('winrate');

  // Filter bets by sport if requested
  const scopedBets = useMemo(() => {
    if (selectedSport === 'all') return trackedBets;
    return trackedBets.filter((b) => (b.sport || '').toLowerCase() === selectedSport.toLowerCase());
  }, [trackedBets, selectedSport]);

  // Global KPIs calculation
  const globalStats = useMemo(() => {
    const total = scopedBets.length;
    const resolved = scopedBets.filter((b) => b.status === 'won' || b.status === 'lost');
    const won = scopedBets.filter((b) => b.status === 'won');
    const lost = scopedBets.filter((b) => b.status === 'lost');
    const pending = scopedBets.filter((b) => b.status === 'pending');
    const voidBets = scopedBets.filter((b) => b.status === 'void');

    const totalWageredResolved = resolved.reduce((acc, b) => acc + (b.stakeAmount || 0), 0);
    const netProfit = scopedBets.reduce((acc, b) => acc + (b.profit || 0), 0);
    
    const winRate = resolved.length > 0 ? Number(((won.length / resolved.length) * 100).toFixed(1)) : 0;
    const roi = totalWageredResolved > 0 ? Number(((netProfit / totalWageredResolved) * 100).toFixed(1)) : 0;
    
    const avgOdds = scopedBets.length > 0 
      ? Number((scopedBets.reduce((acc, b) => acc + b.odds, 0) / scopedBets.length).toFixed(2)) 
      : 0;

    const totalWonProfit = won.reduce((acc, b) => acc + (b.profit || 0), 0);
    const totalLostStake = lost.reduce((acc, b) => acc + (b.stakeAmount || 0), 0);
    const profitFactor = totalLostStake > 0 ? Number((totalWonProfit / totalLostStake).toFixed(2)) : totalWonProfit > 0 ? 99 : 0;

    return {
      total,
      resolved: resolved.length,
      won: won.length,
      lost: lost.length,
      pending: pending.length,
      voidBets: voidBets.length,
      totalWagered: totalWageredResolved,
      netProfit,
      winRate,
      roi,
      avgOdds,
      profitFactor
    };
  }, [scopedBets]);

  // Market-by-market breakdown
  const marketBreakdown = useMemo<MarketReliabilityStats[]>(() => {
    const buckets: Record<MarketCategoryKey, TrackedSportBet[]> = {
      '1x2': [],
      'over_under': [],
      'btts': [],
      'handicap': [],
      'double_chance': [],
      'player_props': [],
      'combos': [],
      'other': []
    };

    scopedBets.forEach((bet) => {
      const category = categorizeBetMarket(bet);
      buckets[category].push(bet);
    });

    const results: MarketReliabilityStats[] = (Object.keys(buckets) as MarketCategoryKey[]).map((key) => {
      const bets = buckets[key];
      const cfg = MARKET_CONFIGS[key];

      const resolved = bets.filter((b) => b.status === 'won' || b.status === 'lost');
      const won = bets.filter((b) => b.status === 'won');
      const lost = bets.filter((b) => b.status === 'lost');
      const pending = bets.filter((b) => b.status === 'pending');
      const voidBets = bets.filter((b) => b.status === 'void');

      const totalWageredResolved = resolved.reduce((acc, b) => acc + (b.stakeAmount || 0), 0);
      const netProfit = bets.reduce((acc, b) => acc + (b.profit || 0), 0);
      const totalReturn = totalWageredResolved + netProfit;

      const winRate = resolved.length > 0 ? Number(((won.length / resolved.length) * 100).toFixed(1)) : 0;
      const roi = totalWageredResolved > 0 ? Number(((netProfit / totalWageredResolved) * 100).toFixed(1)) : 0;

      const avgOdds = bets.length > 0 
        ? Number((bets.reduce((acc, b) => acc + b.odds, 0) / bets.length).toFixed(2)) 
        : 0;

      const avgConfidence = bets.length > 0
        ? Number((bets.reduce((acc, b) => acc + (b.confidenceScore || 0), 0) / bets.length).toFixed(1))
        : 0;

      const wonProfit = won.reduce((acc, b) => acc + (b.profit || 0), 0);
      const lostStake = lost.reduce((acc, b) => acc + (b.stakeAmount || 0), 0);
      const profitFactor = lostStake > 0 ? Number((wonProfit / lostStake).toFixed(2)) : wonProfit > 0 ? 99 : 0;

      let rating: MarketReliabilityStats['rating'] = 'insufficient_data';
      if (resolved.length >= 1) {
        if (winRate >= 65 || roi >= 15) rating = 'elite';
        else if (winRate >= 50 || roi > 0) rating = 'profitable';
        else if (winRate >= 45 && roi >= -5) rating = 'neutral';
        else rating = 'unprofitable';
      }

      return {
        key,
        label: cfg.label,
        shortLabel: cfg.shortLabel,
        icon: cfg.icon,
        description: cfg.description,
        totalBets: bets.length,
        resolvedBets: resolved.length,
        wonBets: won.length,
        lostBets: lost.length,
        pendingBets: pending.length,
        voidBets: voidBets.length,
        winRate,
        totalWagered: totalWageredResolved,
        totalReturn,
        netProfit,
        roi,
        avgOdds,
        avgConfidence,
        profitFactor,
        rating,
        examples: bets
      };
    });

    // Sorting
    return results.sort((a, b) => {
      // Put markets with bets first
      if (a.totalBets > 0 && b.totalBets === 0) return -1;
      if (a.totalBets === 0 && b.totalBets > 0) return 1;

      if (sortBy === 'winrate') return b.winRate - a.winRate;
      if (sortBy === 'roi') return b.roi - a.roi;
      if (sortBy === 'bets') return b.totalBets - a.totalBets;
      if (sortBy === 'profit') return b.netProfit - a.netProfit;
      return 0;
    });
  }, [scopedBets, sortBy]);

  // Top performing market summary
  const topMarket = useMemo(() => {
    const eligible = marketBreakdown.filter((m) => m.resolvedBets >= 1);
    if (eligible.length === 0) return null;
    return [...eligible].sort((a, b) => b.roi - a.roi)[0];
  }, [marketBreakdown]);

  const toggleExpand = (key: MarketCategoryKey) => {
    setExpandedMarket(expandedMarket === key ? null : key);
  };

  return (
    <div className="space-y-6" id="reliability-analysis-container">
      
      {/* 1. Header Card with Global ROI & Key Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 border border-indigo-400/40 flex items-center justify-center text-white shadow-md text-2xl shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  Analyse de Fiabilité & Performance par Marché
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Audit Quantitatif IA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Calcul automatique et dynamique du <strong>Taux de Réussite (Win Rate)</strong> par typologie de marché (1N2, Over/Under, BTTS, Handicap...) et consolidation du <strong>ROI Global</strong> en temps réel.
              </p>
            </div>
          </div>

          {/* Sport Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 self-start lg:self-center flex-wrap">
            {[
              { id: 'all', label: 'Tous Sports', icon: '🏆' },
              { id: 'football', label: 'Football', icon: '⚽' },
              { id: 'basketball', label: 'Basketball', icon: '🏀' },
              { id: 'tennis', label: 'Tennis', icon: '🎾' },
              { id: 'mma', label: 'MMA', icon: '🥊' },
            ].map((sport) => (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  selectedSport === sport.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{sport.icon}</span>
                <span>{sport.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Key Metrics Bar (4 Highlights) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-indigo-500/20">
          
          {/* Global ROI */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                ROI Global Consolidé
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Net / Misé</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${
                globalStats.roi > 0 ? 'text-emerald-400' : globalStats.roi < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {globalStats.roi > 0 ? '+' : ''}{globalStats.roi}%
              </span>
              {globalStats.roi !== 0 && (
                <span className={`text-xs font-bold flex items-center ${
                  globalStats.roi > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {globalStats.roi > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1">
              <span>Bilan : <strong className={globalStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {globalStats.netProfit >= 0 ? '+' : ''}{globalStats.netProfit.toFixed(2)} {currency}
              </strong></span>
              <span className="text-slate-500">sur {globalStats.totalWagered.toFixed(0)} {currency}</span>
            </div>
          </div>

          {/* Global Win Rate */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-blue-400" />
                Win Rate Global
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{globalStats.won}V - {globalStats.lost}D</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${
                globalStats.winRate >= 60 ? 'text-emerald-400' : globalStats.winRate >= 50 ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {globalStats.winRate}%
              </span>
              <span className="text-xs text-slate-400">
                sur {globalStats.resolved} match(s)
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  globalStats.winRate >= 60 ? 'bg-emerald-400' : globalStats.winRate >= 50 ? 'bg-blue-400' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, globalStats.winRate))}%` }}
              />
            </div>
          </div>

          {/* Profit Factor & Edge */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Facteur de Profit
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">Ratio Gains/Pertes</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${
                globalStats.profitFactor >= 1.5 ? 'text-emerald-400' : globalStats.profitFactor >= 1.0 ? 'text-indigo-300' : 'text-rose-400'
              }`}>
                {globalStats.profitFactor > 0 ? `${globalStats.profitFactor}x` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400">
                {globalStats.profitFactor >= 1.5 ? '🔥 Excellent' : globalStats.profitFactor >= 1.0 ? '✅ Positif' : '⚠️ En cours'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-1">
              Cote moyenne : <strong className="text-white">{globalStats.avgOdds > 0 ? `@${globalStats.avgOdds}` : '-'}</strong>
            </div>
          </div>

          {/* Top Category Insight */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Meilleur Marché (Alpha)
              </span>
              <span className="text-[10px] text-amber-300 font-mono">Top ROI</span>
            </div>
            {topMarket ? (
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                  <span>{topMarket.icon}</span>
                  <span className="truncate">{topMarket.shortLabel}</span>
                </div>
                <div className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-2">
                  <span>Winrate : {topMarket.winRate}%</span>
                  <span>•</span>
                  <span>ROI : +{topMarket.roi}%</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {topMarket.resolvedBets} pronostics clôturés
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-1">
                En attente de clôture de pronostics pour identifier le meilleur marché.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Market Breakdown Table & Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Controls and Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Détail de Fiabilité par Type de Marché</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                {marketBreakdown.filter(m => m.totalBets > 0).length} marchés actifs
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Classement comparatif de rentabilité et d'efficacité statistique selon la typologie du pari.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Trier par :</span>
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setSortBy('winrate')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sortBy === 'winrate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Win Rate
              </button>
              <button
                onClick={() => setSortBy('roi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sortBy === 'roi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ROI (%)
              </button>
              <button
                onClick={() => setSortBy('profit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sortBy === 'profit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Profit Net
              </button>
              <button
                onClick={() => setSortBy('bets')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sortBy === 'bets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Volume
              </button>
            </div>
          </div>
        </div>

        {/* Markets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {marketBreakdown.map((market) => {
            const isExpanded = expandedMarket === market.key;
            const hasData = market.totalBets > 0;
            const isTop = topMarket?.key === market.key && market.resolvedBets > 0;

            return (
              <div
                key={market.key}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isTop 
                    ? 'bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border-indigo-500/50 shadow-md'
                    : hasData
                    ? 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-70'
                }`}
              >
                {/* Main Card Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-lg shadow-sm shrink-0">
                        {market.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs sm:text-sm font-bold text-white">
                            {market.label}
                          </h5>
                          {isTop && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                              ⭐ Top Alpha
                            </span>
                          )}
                          {market.rating === 'elite' && !isTop && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                              Élite (&gt;65%)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {market.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-base sm:text-lg font-black font-mono ${
                        market.resolvedBets === 0
                          ? 'text-slate-500'
                          : market.winRate >= 60
                          ? 'text-emerald-400'
                          : market.winRate >= 50
                          ? 'text-blue-400'
                          : 'text-amber-400'
                      }`}>
                        {market.resolvedBets > 0 ? `${market.winRate}%` : 'N/A'}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {market.wonBets}V / {market.lostBets}D {market.pendingBets > 0 ? `(+${market.pendingBets} enc)` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Win Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Taux de Succès</span>
                      <span>{market.resolvedBets} pari(s) validé(s)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          market.resolvedBets === 0
                            ? 'bg-slate-700'
                            : market.winRate >= 60
                            ? 'bg-emerald-400'
                            : market.winRate >= 50
                            ? 'bg-blue-400'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${market.resolvedBets === 0 ? 0 : Math.min(100, Math.max(5, market.winRate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial & Odds Details Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">ROI Spécifique</span>
                      <span className={`font-mono font-bold ${
                        market.roi > 0 ? 'text-emerald-400' : market.roi < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {market.resolvedBets > 0 ? `${market.roi > 0 ? '+' : ''}${market.roi}%` : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Profit Net</span>
                      <span className={`font-mono font-bold ${
                        market.netProfit > 0 ? 'text-emerald-400' : market.netProfit < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {market.totalBets > 0 ? `${market.netProfit >= 0 ? '+' : ''}${market.netProfit.toFixed(1)} ${currency}` : '-'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Cote Moyenne</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {market.avgOdds > 0 ? `@${market.avgOdds}` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Actions / Expand Drawer Toggle */}
                  {market.totalBets > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => toggleExpand(market.key)}
                        className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 transition flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'Masquer les paris' : `Voir les ${market.totalBets} pari(s) de ce marché`}</span>
                      </button>

                      {onFilterMarketInTracker && (
                        <button
                          onClick={() => onFilterMarketInTracker(market.shortLabel)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          title="Filtrer ce marché dans le Suivi Détaillé"
                        >
                          <span>Filtrer dans Bilan</span>
                          <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Sub-List of Bets in this Market */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-800 bg-slate-900/90 p-3 space-y-2"
                    >
                      <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>Historique des prédictions ({market.examples.length}) :</span>
                        <span className="text-slate-500 font-mono text-[10px]">Cote / Statut / Résultat</span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {market.examples.map((bet) => (
                          <div
                            key={bet.id}
                            className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white truncate">
                                {bet.match}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                                <span className="text-cyan-300 font-medium">{bet.market}</span>
                                <span>•</span>
                                <span className="text-slate-500">{bet.league}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-indigo-300 text-xs">
                                @{bet.odds.toFixed(2)}
                              </span>

                              {bet.status === 'won' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Gagné (+{bet.profit.toFixed(1)})
                                </span>
                              )}
                              {bet.status === 'lost' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  Perdu (-{bet.stakeAmount.toFixed(1)})
                                </span>
                              )}
                              {bet.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  En cours
                                </span>
                              )}
                              {bet.status === 'void' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  Annulé
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>

      {/* 4. Strategic Recommendations & Predictive Takeaway */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-4.5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs sm:text-sm font-bold text-white">
            Synthèse Stratégique & Conseils d'Optimisation des Mises (Bankroll)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Marchés à Haute Fiabilité (Over/Under & BTTS)
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Ces marchés statistiques dépendent principalement des métriques xG et du rythme offensif. Ils offrent généralement une régularité supérieure et un Win Rate plus élevé (idéal pour du flat-betting ou quart de Kelly à 2%-3%).
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Gestion des Marchés 1N2 & Grosses Cotes
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Sur les victoires sèches et combinés à cotes élevées (&gt;2.20), la variance court terme est plus forte. Maintenez une exposition unitaire réduite (0.5% à 1.5% de votre bankroll) pour maximiser l'Expected Value long terme.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
