import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Shield,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Sliders,
  DollarSign,
  Play,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Flame,
  Layers,
  ArrowRight,
  Calculator,
  Search,
  Filter,
  RefreshCw,
  Award,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookmarkPlus
} from 'lucide-react';
import { BettingStrategy, StakeGameType, BetResult } from '../types';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { getCurrencyInfo } from '../utils/stakeCurrencies';
import { useTranslation } from '../i18n/LanguageContext';

export interface SmartStrategyPanelProps {
  currentStrategy?: BettingStrategy;
  balance: number;
  currency: string;
  onSelectStrategy: (strategy: BettingStrategy) => void;
  onStartAutoBet?: () => void;
  isAutobetting?: boolean;
}

export type StrategyCategoryFilter = 
  | 'all'
  | 'shield'      // Capital preservation, Oscar's grind, D'Alembert
  | 'scalping'    // High-probability scalping, Fractional Kelly, Paroli
  | 'asymmetric'  // High multiplier hunting, Moonshot 5x-50x
  | 'extreme'     // Mega multiplier hunting 1000x-10000x across originals
  | 'mines'       // Specific Mines patterns
  | 'vip'         // Wager farming & VIP rake
  | 'dice'        // Dedicated dice algorithms
  | 'limbo';      // Dedicated limbo algorithms

interface ExtendedStrategyInfo {
  mathModel: string;
  riskRating: number; // 1 (Safe) to 5 (Ultra Volatile)
  recommendedBankrollUnits: number;
  category: StrategyCategoryFilter;
  badge: string;
  badgeColor: string;
  volatility: 'Faible' | 'Modérée' | 'Élevée' | 'Extrême';
  drawdownTolerance: string;
  recommendedDuration: string;
}

const STRATEGY_METADATA_MAP: Record<string, ExtendedStrategyInfo> = {
  'strat-extreme-dice-9900x-hyper-sniper': {
    mathModel: "Recherche du Fat-Tail Event : Roll > 99.98 à cote 9 900x avec mise stochastique (0.01% à 0.05% du solde).",
    riskRating: 5,
    recommendedBankrollUnits: 2500,
    category: 'extreme',
    badge: '9 900X JACKPOT SNIPER',
    badgeColor: 'text-rose-400 bg-rose-950/90 border-rose-500/50',
    volatility: 'Extrême',
    drawdownTolerance: 'Mise 0.01% - 0.05% (Stochastique)',
    recommendedDuration: 'Sessions automatiques de longue traîne',
  },
  'strat-extreme-multi-original-random-10000x': {
    mathModel: "Bascule stochastique multi-jeux : Permutation aléatoire (1 000x à 10 000x) avec mise dynamique 0.01% à 0.05% solde.",
    riskRating: 5,
    recommendedBankrollUnits: 3000,
    category: 'extreme',
    badge: 'RANDOM MULTI-ORIGINAUX',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/90 border-fuchsia-500/50',
    volatility: 'Extrême',
    drawdownTolerance: 'Répartition multi-générateurs Provably Fair',
    recommendedDuration: 'Chasse dynamique multi-serveurs',
  },
  'strat-extreme-limbo-10000x-quantum': {
    mathModel: "Cote cosmique Limbo @10 000.0x : Gain de 10 000x la mise avec modulation aléatoire 0.01% - 0.05% du capital.",
    riskRating: 5,
    recommendedBankrollUnits: 4000,
    category: 'extreme',
    badge: '10 000X MOONSHOT',
    badgeColor: 'text-purple-400 bg-purple-950/90 border-purple-500/50',
    volatility: 'Extrême',
    drawdownTolerance: 'Mise 0.01% - 0.05% (Anti-ruine)',
    recommendedDuration: 'Chasse au coup de grâce',
  },
  'strat-extreme-plinko-16rows-10000x': {
    mathModel: "Plinko 16 Rangées Mode Extrême : ciblage exclusif des poches latérales ultimes à 10 000.0x avec mise 0.01% - 0.05%.",
    riskRating: 5,
    recommendedBankrollUnits: 3500,
    category: 'extreme',
    badge: 'PLINKO 16R 10 000X',
    badgeColor: 'text-amber-400 bg-amber-950/90 border-amber-500/50',
    volatility: 'Extrême',
    drawdownTolerance: 'Mise stochastique (0.01% à 0.05%)',
    recommendedDuration: 'Tir en rafales continues',
  },
  'strat-extreme-plinko-15rows-5000x': {
    mathModel: "Plinko 15 Rangées Mode Extrême : poches extérieures à 5 000.0x avec mise stochastique 0.01% - 0.05% selon session.",
    riskRating: 5,
    recommendedBankrollUnits: 2500,
    category: 'extreme',
    badge: 'PLINKO 15R 5 000X',
    badgeColor: 'text-orange-400 bg-orange-950/90 border-orange-500/50',
    volatility: 'Extrême',
    drawdownTolerance: 'Mise stochastique (0.01% à 0.05%)',
    recommendedDuration: 'Tir en rafales rapides',
  },
  'strat-extreme-mines-24m-jackpot': {
    mathModel: "Grille extrême 24 Mines / 1 Diamant unique (24.75x dès le 1er hit, 4% de win chance, mise 0.01% - 0.05%).",
    riskRating: 4,
    recommendedBankrollUnits: 2000,
    category: 'extreme',
    badge: 'MINES 24.75X JACKPOT',
    badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-500/40',
    volatility: 'Extrême',
    drawdownTolerance: 'Absorbe 24 pertes par victoire',
    recommendedDuration: 'Sessions à haute intensité',
  },
  'strat-dice-oscars-grind': {
    mathModel: "Cycle de Martingale Inversée d'Oscar : +1 unité par cycle, zéro augmentation sur défaite.",
    riskRating: 1,
    recommendedBankrollUnits: 50,
    category: 'shield',
    badge: 'LE PLUS RÉSILIENT',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Excellente (Mise gelée)',
    recommendedDuration: 'Sessions moyennes à longues (100-500 tours)',
  },
  'strat-dice-dalembert': {
    mathModel: "Équilibre arithmétique de D'Alembert : +1u sur perte, -1u sur gain (Linear Delta).",
    riskRating: 2,
    recommendedBankrollUnits: 80,
    category: 'shield',
    badge: 'POPULAIRE QUANTITATIF',
    badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-500/30',
    volatility: 'Faible',
    drawdownTolerance: 'Très bonne',
    recommendedDuration: 'Sessions régulières',
  },
  'strat-dice-1326-milestone': {
    mathModel: "Progression séquentielle 1-3-2-6 : Verrouillage strict de +2u de profit au 2ème palier.",
    riskRating: 3,
    recommendedBankrollUnits: 60,
    category: 'scalping',
    badge: 'VERROUILLAGE SÉQUENTIEL',
    badgeColor: 'text-indigo-400 bg-indigo-950/80 border-indigo-500/40',
    volatility: 'Modérée',
    drawdownTolerance: 'Bonne (Pertes limitées à 1-2u)',
    recommendedDuration: 'Sessions courtes de scalping',
  },
  'strat-dice-high-prob-scalper': {
    mathModel: "Scalping haute fréquence à 82.5% de probabilité mathématique (Cote 1.20x).",
    riskRating: 1,
    recommendedBankrollUnits: 40,
    category: 'scalping',
    badge: '82.5% WINRATE',
    badgeColor: 'text-teal-400 bg-teal-950/80 border-teal-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Excellente',
    recommendedDuration: 'Sessions de farming continu',
  },
  'strat-dice-fibonacci-doux': {
    mathModel: "Suite arithmétique 1-1-2-3-5 sur pertes avec recul de 2 crans sur gain.",
    riskRating: 2,
    recommendedBankrollUnits: 90,
    category: 'shield',
    badge: 'AMORTISSEUR FIBONACCI',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-500/40',
    volatility: 'Modérée',
    drawdownTolerance: 'Amortissement géométrique',
    recommendedDuration: 'Sessions à variance modérée',
  },
  'strat-dice-fractional-kelly': {
    mathModel: "Critère de Kelly 25% (Fractional Sizing) à cote 1.40x pour croissance logarithmique maximale.",
    riskRating: 2,
    recommendedBankrollUnits: 50,
    category: 'scalping',
    badge: 'KELLY FRACTIONNÉ',
    badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Optimale',
    recommendedDuration: 'Toutes durées',
  },
  'strat-dice-vip-farming': {
    mathModel: "Ultra-Haute Probabilité 98.0% (Roll > 1.00) avec mise plate pour accumuler du Wager.",
    riskRating: 1,
    recommendedBankrollUnits: 30,
    category: 'vip',
    badge: 'FARMING VIP & WAGER',
    badgeColor: 'text-purple-400 bg-purple-950/80 border-purple-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Maximale',
    recommendedDuration: 'Grind intensif pour niveaux VIP',
  },
  'strat-dice-asymmetric-moonshot': {
    mathModel: "Asymétrie positive pure : micro-mise 0.05% visant cote 50.0x (1.98% win chance).",
    riskRating: 4,
    recommendedBankrollUnits: 200,
    category: 'asymmetric',
    badge: 'EXPLOSION ASYMÉTRIQUE 50X',
    badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-500/40',
    volatility: 'Élevée',
    drawdownTolerance: 'Pertes douces / Gains massifs',
    recommendedDuration: 'Sessions de chasse aux coefficients',
  },
  'strat-limbo-paroli-lock': {
    mathModel: "Anti-Martingale positive 1-2-4 : Capitalise sur les séries gagnantes et protège le capital sur perte.",
    riskRating: 3,
    recommendedBankrollUnits: 50,
    category: 'scalping',
    badge: 'PAROLI 1-2-4',
    badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40',
    volatility: 'Modérée',
    drawdownTolerance: 'Très bonne',
    recommendedDuration: 'Recherche de streaks positifs',
  },
  'strat-limbo-fractional-kelly': {
    mathModel: "Kelly 25% appliqué à Limbo 1.35x (73.33% winrate) pour progression constante.",
    riskRating: 1,
    recommendedBankrollUnits: 40,
    category: 'scalping',
    badge: 'KELLY 73.3% WIN',
    badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Excellente',
    recommendedDuration: 'Scalping régulier',
  },
  'strat-limbo-multi-target-sniper': {
    mathModel: "Chasseur asymétrique 5.0x : un succès compense instantanément 5 tours perdants.",
    riskRating: 3,
    recommendedBankrollUnits: 100,
    category: 'asymmetric',
    badge: 'SNIPER 5.0X',
    badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-500/40',
    volatility: 'Modérée',
    drawdownTolerance: 'Bonne',
    recommendedDuration: 'Sessions dynamiques',
  },
  'strat-mines-1mine-safe-hunter': {
    mathModel: "Grille 1-Mine / 3 Diamants (88.0% de succès). Encaissement systématique à cote 1.18x.",
    riskRating: 1,
    recommendedBankrollUnits: 30,
    category: 'mines',
    badge: '88% SUCCÈS SÉCURISÉ',
    badgeColor: 'text-teal-400 bg-teal-950/80 border-teal-500/40',
    volatility: 'Faible',
    drawdownTolerance: 'Maximale',
    recommendedDuration: 'Scalping ultra-sûr',
  },
  'strat-mines-3gem-fibonacci': {
    mathModel: "Grille 3 Mines / 3 Diamants (1.74x) avec gestion de mise amortie par Fibonacci.",
    riskRating: 2,
    recommendedBankrollUnits: 75,
    category: 'mines',
    badge: 'RADAR FIBONACCI',
    badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-500/30',
    volatility: 'Modérée',
    drawdownTolerance: 'Bonne',
    recommendedDuration: 'Mines tactique',
  },
};

export const SmartStrategyPanel: React.FC<SmartStrategyPanelProps> = ({
  currentStrategy,
  balance,
  currency,
  onSelectStrategy,
  onStartAutoBet,
  isAutobetting = false,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<StrategyCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(currentStrategy?.id || null);

  // Quick Backtest Simulation Modal / Drawer
  const [simulatingStratId, setSimulatingStratId] = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<{
    stratId: string;
    totalBets: number;
    wins: number;
    losses: number;
    winRate: number;
    profit: number;
    maxDrawdown: number;
    peakProfit: number;
  } | null>(null);

  // Filter strategies
  const filteredStrategies = useMemo(() => {
    return PREDEFINED_STRATEGIES.filter((strat) => {
      const meta = STRATEGY_METADATA_MAP[strat.id];
      
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'shield' && meta?.category !== 'shield') return false;
        if (selectedCategory === 'scalping' && meta?.category !== 'scalping') return false;
        if (selectedCategory === 'asymmetric' && meta?.category !== 'asymmetric') return false;
        if (selectedCategory === 'extreme' && meta?.category !== 'extreme') return false;
        if (selectedCategory === 'mines' && strat.game !== 'mines') return false;
        if (selectedCategory === 'vip' && meta?.category !== 'vip') return false;
        if (selectedCategory === 'dice' && strat.game !== 'dice') return false;
        if (selectedCategory === 'limbo' && strat.game !== 'limbo') return false;
      }

      // Game filter
      if (selectedGameFilter !== 'all' && strat.game !== selectedGameFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = strat.name.toLowerCase().includes(query);
        const matchesDesc = strat.description.toLowerCase().includes(query);
        const matchesGame = strat.game.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesGame) return false;
      }

      return true;
    });
  }, [selectedCategory, selectedGameFilter, searchQuery]);

  // Execute quick instant Monte Carlo backtest (150 rounds)
  const handleRunQuickSimulation = (strat: BettingStrategy) => {
    setSimulatingStratId(strat.id);

    // Simulate 150 rolls
    const rounds = 150;
    let simBalance = balance;
    let currentBet = strat.baseBet || 0.20;
    let profit = 0;
    let peakProfit = 0;
    let maxDrawdown = 0;
    let wins = 0;
    let losses = 0;

    const winChance = strat.winChance || (strat.targetMultiplier ? (99.0 / strat.targetMultiplier) : 49.5);

    for (let i = 0; i < rounds; i++) {
      const roll = Math.random() * 100;
      const isWin = roll < winChance;

      if (isWin) {
        wins++;
        const netWin = currentBet * ((strat.targetMultiplier || 2.0) - 1);
        profit += netWin;
        if (profit > peakProfit) peakProfit = profit;

        // Apply on win rules
        if (strat.onWinAction === 'reset') {
          currentBet = strat.baseBet || 0.20;
        } else if (strat.onWinAction === 'increase_pct') {
          currentBet = currentBet * (1 + (strat.onWinValue || 50) / 100);
        } else if (strat.onWinAction === 'increase_fixed') {
          currentBet += (strat.onWinValue || 0.10);
        }
      } else {
        losses++;
        profit -= currentBet;
        const currentDrawdown = peakProfit - profit;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

        // Apply on loss rules
        if (strat.onLossAction === 'reset' || strat.onLossAction === 'custom') {
          currentBet = strat.baseBet || 0.20;
        } else if (strat.onLossAction === 'increase_fixed') {
          currentBet += (strat.onLossValue || 0.10);
        } else if (strat.onLossAction === 'increase_pct') {
          currentBet = currentBet * (1 + (strat.onLossValue || 50) / 100);
        } else if (strat.onLossAction === 'multiply') {
          currentBet = currentBet * (strat.onLossValue || 2.0);
        }
      }

      // Check Stop loss or Profit
      if (strat.stopOnProfit && profit >= strat.stopOnProfit) break;
      if (strat.stopOnLoss && profit <= -strat.stopOnLoss) break;
    }

    setSimulationResults({
      stratId: strat.id,
      totalBets: wins + losses,
      wins,
      losses,
      winRate: Number(((wins / (wins + losses)) * 100).toFixed(1)),
      profit: Number(profit.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      peakProfit: Number(peakProfit.toFixed(2)),
    });

    setSimulatingStratId(null);
  };

  // 1-Click apply strategy with adaptive bankroll scaling
  const handleApplyStrategy = (strat: BettingStrategy, startImmediately = false) => {
    setActiveStrategyId(strat.id);

    // Auto-scale base bet proportionally to user's real balance (e.g. 0.1% or 0.2%)
    const meta = STRATEGY_METADATA_MAP[strat.id];
    const recommendedUnitPct = meta ? (100 / meta.recommendedBankrollUnits) : 0.2;
    const scaledBaseBet = Math.max(
      0.01,
      Number(((balance * (recommendedUnitPct / 100))).toFixed(4))
    );

    const readyStrategy: BettingStrategy = {
      ...strat,
      baseBet: scaledBaseBet,
      currency,
      stopOnProfit: strat.stopOnProfit || Number((balance * 0.1).toFixed(2)),
      stopOnLoss: strat.stopOnLoss || Number((balance * 0.2).toFixed(2)),
    };

    onSelectStrategy(readyStrategy);

    if (startImmediately && onStartAutoBet && !isAutobetting) {
      onStartAutoBet();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="smart-strategy-panel-hub">
      
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                {t('strategy.bannerBadge', 'PANEL DE STRATÉGIES QUANTITATIVES AVANCÉES')}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {PREDEFINED_STRATEGIES.length} {t('strategy.algorithmsAvailable', 'Algorithmes Disponibles')}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t('strategy.title', 'Bibliothèque de Modèles & Stratégies Mathématiques')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {t('strategy.subtitle', 'Explorez des architectures algorithmiques éprouvées (Critère de Kelly, D\'Alembert Linéaire, Oscar\'s Grind, 1-3-2-6 Milestone, Sniper Asymétrique). Chaque stratégie est automatiquement calibrée à la taille exacte de votre solde')} ({balance.toFixed(2)} {currency}).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">{t('strategy.calibratedBalance', 'Solde Calibré')}</div>
              <div className="text-sm font-mono font-bold text-amber-400">
                {balance.toFixed(2)} {currency}
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('strategy.searchPlaceholder', 'Rechercher par nom, modèle mathématique ou jeu (ex: Oscar, Kelly, Mines, 50x)...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Game Quick Selector */}
          <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-slate-400 font-semibold pr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              {t('strategy.gameFilter', 'Jeu :')}
            </span>
            {['all', 'dice', 'limbo', 'mines', 'plinko'].map((gameKey) => (
              <button
                key={gameKey}
                type="button"
                onClick={() => setSelectedGameFilter(gameKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                  selectedGameFilter === gameKey
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {gameKey === 'all' ? t('common.all', 'Tous') : gameKey}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* DYNAMIC 4-TIER RISK MATRIX & WAYS OF PLAYING */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {t('strategy.matrixTitle', 'Matrice Dynamique des 4 Paliers de Risque & Modes de Jeu')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('strategy.matrixSubtitle', 'Chaque palier possède des avantages mathématiques précis, des tactiques spécifiques et une gestion de bankroll adaptée.')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
            {t('strategy.clickToFilter', 'Cliquez pour filtrer')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* TIER 1: FAIBLE / ULTRA-SAFE */}
          <div
            onClick={() => setSelectedCategory('shield')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'shield'
                ? 'bg-emerald-950/70 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {t('strategy.tier1Title', '1. RISQUE FAIBLE')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  {t('strategy.ruinSafe', 'Ruine <0.001%')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>{t('strategy.advantagesLabel', 'Avantages :')}</strong> {t('strategy.tier1Advantages', 'Variance quasi nulle, mise gelée sur perte, protection absolue du capital.')}
              </p>
              
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="text-emerald-300 font-semibold">{t('strategy.waysToPlay', '4 Façons de Jouer :')}</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li><strong>Oscar's Grind</strong> (+1u net / cycle)</li>
                  <li><strong>Scalper 88%</strong> (Mines 1M / Dice 1.15x)</li>
                  <li><strong>Kelly Fractionné</strong> (10-25%)</li>
                  <li><strong>VIP Farmer 98%</strong> (Volume & Rake)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-emerald-400 font-bold flex items-center justify-between">
              <span>{t('strategy.stakeEst', 'Mise : ~0.10% à 0.25%')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* TIER 2: MODÉRÉ / ÉQUILIBRÉ */}
          <div
            onClick={() => setSelectedCategory('scalping')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'scalping'
                ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                : 'bg-slate-950/70 border-slate-800 hover:border-blue-500/50 hover:bg-slate-950'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  {t('strategy.tier2Title', '2. RISQUE MODÉRÉ')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/30">
                  {t('strategy.balancedBadge', 'Équilibré')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>{t('strategy.advantagesLabel', 'Avantages :')}</strong> {t('strategy.tier2Advantages', 'Progression arithmétique douce (+1u / -1u), positif même avec <50% de victoires.')}
              </p>
              
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="text-blue-300 font-semibold">{t('strategy.waysToPlay', '4 Façons de Jouer :')}</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li><strong>Smart D'Alembert</strong> (Delta linéaire)</li>
                  <li><strong>1-3-2-6 Milestone</strong> (Lock +2u)</li>
                  <li><strong>Fibonacci Doux</strong> (Recul 2 crans)</li>
                  <li><strong>Paroli Positif</strong> (Streaks 1-2-4)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-blue-400 font-bold flex items-center justify-between">
              <span>{t('strategy.stakeEstModerate', 'Mise : ~0.15% à 0.30%')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* TIER 3: AGRESSIF / VOLATILITÉ */}
          <div
            onClick={() => setSelectedCategory('asymmetric')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'asymmetric'
                ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-950'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  {t('strategy.tier3Title', '3. RISQUE AGRESSIF')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                  {t('strategy.odds5to50', 'Cotes 5x à 50x')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>{t('strategy.advantagesLabel', 'Avantages :')}</strong> {t('strategy.tier3Advantages', 'Convexité positive pure, 1 seul coup gagnant compense instantanément 5 à 50 défaites.')}
              </p>
              
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="text-amber-300 font-semibold">{t('strategy.waysToPlay', '4 Façons de Jouer :')}</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li><strong>Limbo Surge 5.0x</strong> (Sauts rapides)</li>
                  <li><strong>Mines Radar 5M/3G</strong> (Cote 5.85x)</li>
                  <li><strong>Dice Breakout 50x</strong> (Micro-mises)</li>
                  <li><strong>Pyramide Amortie</strong> (+35% sur perte)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-amber-400 font-bold flex items-center justify-between">
              <span>{t('strategy.stakeEstAggressive', 'Mise : ~0.02% à 0.08%')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* TIER 4: EXTRÊME / MOONSHOT HUNTER */}
          <div
            onClick={() => setSelectedCategory('extreme')}
            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'extreme'
                ? 'bg-rose-950/80 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                : 'bg-slate-950/70 border-slate-800 hover:border-rose-500/50 hover:bg-slate-950'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  {t('strategy.tier4Title', '4. RISQUE EXTRÊME')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500/30">
                  1 000x - 10 000x
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                <strong>{t('strategy.advantagesLabel', 'Avantages :')}</strong> {t('strategy.tier4Advantages', 'Chasse aux jackpots cosmiques sur tous les originaux. Gestion de mise stochastique (0.01% à 0.05% du solde) modulée selon la session.')}
              </p>
              
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="text-rose-300 font-semibold">{t('strategy.fiveWaysToPlay', '5 Façons de Jouer :')}</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li><strong>Random Multi-Originaux</strong> (1000x-10000x)</li>
                  <li><strong>Limbo Quantum 10 000x</strong></li>
                  <li><strong>Dice 9 900x Sniper</strong> (Roll &gt; 99.98)</li>
                  <li><strong>Plinko 16R 10 000x & 15R 5 000x</strong></li>
                  <li><strong>Mines 24M Jackpot</strong> (24.75x 1-Hit)</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-rose-400 font-bold flex items-center justify-between">
              <span>{t('strategy.stakeEstExtreme', 'Mise : ~0.010% à 0.050% (Stochastique)')}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'all', label: t('strategy.tabAll', '🌟 Toutes les Stratégies') },
          { id: 'shield', label: t('strategy.tabShield', '🛡️ Bouclier (Faible)') },
          { id: 'scalping', label: t('strategy.tabScalping', '⚖️ Modéré & Kelly') },
          { id: 'asymmetric', label: t('strategy.tabAsymmetric', '🚀 Agressif (5x à 50x)') },
          { id: 'extreme', label: t('strategy.tabExtreme', '💥 Extrême (1 000x - 10 000x)') },
          { id: 'mines', label: t('strategy.tabMines', '💎 Démineur & Grilles') },
          { id: 'vip', label: t('strategy.tabVip', '🚜 Farming VIP & Wager') },
        ].map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 flex items-center gap-2 border ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* STRATEGIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStrategies.map((strat) => {
          const meta = STRATEGY_METADATA_MAP[strat.id] || {
            mathModel: "Progression algorithmique standard",
            riskRating: 2,
            recommendedBankrollUnits: 50,
            category: 'shield',
            badge: 'STRATÉGIE OPTIMISÉE',
            badgeColor: 'text-blue-400 bg-blue-950/80 border-blue-500/30',
            volatility: 'Modérée',
            drawdownTolerance: 'Standard',
            recommendedDuration: 'Sessions moyennes',
          };

          const isCurrentActive = currentStrategy?.id === strat.id || activeStrategyId === strat.id;
          const recommendedUnitPct = (100 / meta.recommendedBankrollUnits);
          const dynamicBaseBet = Math.max(0.01, Number(((balance * (recommendedUnitPct / 100))).toFixed(4)));
          const targetProfitEst = strat.stopOnProfit || Number((balance * 0.1).toFixed(2));
          const stopLossEst = strat.stopOnLoss || Number((balance * 0.2).toFixed(2));

          return (
            <motion.div
              key={strat.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl border flex flex-col justify-between transition p-4 sm:p-5 relative ${
                isCurrentActive
                  ? 'bg-gradient-to-b from-slate-900 via-indigo-950/50 to-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
              }`}
            >
              <div>
                {/* Card Top: Badges & Game */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-slate-800 text-amber-400 border border-slate-700">
                      {strat.game}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${meta.badgeColor}`}>
                      {meta.badge}
                    </span>
                  </div>

                  {isCurrentActive && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('strategy.activeBadge', 'ACTIVE')}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                  {strat.name}
                </h3>

                {/* Mathematical Foundation Snippet */}
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                  <Calculator className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-mono text-[10px] text-indigo-200/90">
                    {meta.mathModel}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 mt-2.5 line-clamp-3 leading-relaxed">
                  {strat.description}
                </p>

                {/* Quantitative Metrics Matrix */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/70">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">{t('strategy.targetOdds', 'Cote Cible')}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {strat.targetMultiplier ? `${strat.targetMultiplier.toFixed(2)}x` : t('strategy.dynamic', 'Dynamique')}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/70">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">{t('strategy.winrate', 'Winrate')}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {strat.winChance ? `${strat.winChance.toFixed(1)}%` : '~50%'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/70">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">{t('strategy.volatility', 'Volatilité')}</span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {meta.volatility}
                    </span>
                  </div>
                </div>

                {/* Auto-Calibrated Parameters based on Bankroll */}
                <div className="mt-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-2 text-[11px] text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px]">{t('strategy.calibratedBet', 'Mise Calibrée')} ({recommendedUnitPct.toFixed(2)}% {t('strategy.balanceLabel', 'solde')}) :</span>
                    <div className="font-mono font-bold text-white text-xs">
                      {dynamicBaseBet} <span className="text-amber-400">{currency}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px]">{t('strategy.targetStop', 'Objectif / Arrêt')} :</span>
                    <div className="font-mono text-emerald-400 text-[11px] font-bold">
                      +{targetProfitEst} / -{stopLossEst} {currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunQuickSimulation(strat)}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
                  title={t('strategy.quickTestTooltip', 'Simuler 150 tours instantanés avec ce modèle')}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('strategy.quickTest', 'Test Rapide')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyStrategy(strat, false)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    isCurrentActive
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isCurrentActive ? t('strategy.selectedBtn', 'Sélectionné') : t('strategy.activateBtn', 'Activer Stratégie')}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* QUICK BACKTEST RESULTS MODAL */}
      <AnimatePresence>
        {simulationResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">
                    {t('strategy.simulationModalTitle', 'Résultat de Simulation Rapide (150 Tours Monte Carlo)')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulationResults(null)}
                  className="text-slate-400 hover:text-white text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('strategy.simProfit', 'Profit Simulé')}</span>
                  <div className={`text-sm font-mono font-bold mt-0.5 ${
                    simulationResults.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {simulationResults.profit >= 0 ? '+' : ''}{simulationResults.profit} {currency}
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('strategy.winRate', 'Win Rate')}</span>
                  <div className="text-sm font-mono font-bold text-white mt-0.5">
                    {simulationResults.winRate}%
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('strategy.maxDrawdown', 'Max Drawdown')}</span>
                  <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                    -{simulationResults.maxDrawdown} {currency}
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('strategy.peakProfit', 'Peak Profit')}</span>
                  <div className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                    +{simulationResults.peakProfit} {currency}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                💡 <strong>{t('strategy.analysisHeader', 'Analyse Statistique :')}</strong> {t('strategy.simExplanation', 'Cette simulation a testé la résilience du modèle face à 150 tirages aléatoires conformes aux probabilités du jeu. Le Drawdown maximum observé était de')} <strong>{simulationResults.maxDrawdown} {currency}</strong>{t('strategy.simExplanationEnd', ', ce qui démontre la capacité d\'absorption des creux de variance.')}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSimulationResults(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  {t('common.close', 'Fermer')}
                </button>

                {(() => {
                  const strat = PREDEFINED_STRATEGIES.find((s) => s.id === simulationResults.stratId);
                  if (!strat) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyStrategy(strat, false);
                        setSimulationResults(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('strategy.activateThisStrat', 'Activer cette Stratégie')}</span>
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
