import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Dice5, 
  Rocket, 
  Diamond, 
  CircleDot, 
  Grid3X3, 
  Layers, 
  ShieldAlert, 
  Check, 
  ArrowRight,
  Info,
  Sliders,
  Play,
  Shuffle,
  ShieldCheck,
  TrendingUp,
  Target,
  Gauge,
  Calculator,
  Compass,
  CheckCircle2,
  Search,
  Filter,
  Zap,
  Crown,
  Coins,
  Flame,
  Award,
  Copy,
  ToggleLeft,
  ToggleRight,
  ListTree,
  Workflow,
  Scale,
  Lock,
  Wallet,
  AlertCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Lightbulb,
  X,
  Code2,
  Terminal,
  Cpu,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Download,
  Share2,
  Activity
} from 'lucide-react';
import { BettingStrategy, StakeGameType, RiskLevel, StrategyCondition, BetResult, BotStatistics } from '../types';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { 
  generateRandomConstructiveStrategy, 
  generateRandomWagerStrategy, 
  generateRandomWagerRecoveryStrategy,
  generateStakeDiceMultiConditionStrategy,
  STAKE_DICE_CONDITIONS_30_POOL,
  CONSTRUCTIVE_ARCHETYPES,
  WAGER_ARCHETYPES,
  WAGER_RECOVERY_ARCHETYPES
} from '../utils/constructiveStrategies';
import { STAKE_ORIGINALS_SPECS } from '../utils/stakeGameSpecs';
import { StrategyComparator } from './StrategyComparator';
import { KellyCriterionCalculator } from './KellyCriterionCalculator';
import { SuggestStrategyOptimizationButton } from './SuggestStrategyOptimizationButton';
import { DiceCustomConditionStudio } from './DiceCustomConditionStudio';
import { useTranslation } from '../i18n/LanguageContext';

export interface ParamTooltipProps {
  id?: string;
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
  badge?: string;
  align?: 'left' | 'right' | 'center';
}

export const ParamTooltip: React.FC<ParamTooltipProps> = ({
  id,
  title,
  description,
  impact,
  recommendation,
  badge = 'Paramètre Clé',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const alignClasses = 
    align === 'right' 
      ? 'right-0 sm:-right-4' 
      : align === 'center' 
      ? 'left-1/2 -translate-x-1/2' 
      : 'left-0 sm:-left-2';

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        id={id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        className={`p-1 rounded-full text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
          isOpen ? 'text-emerald-300 bg-slate-800 ring-1 ring-emerald-500/50' : ''
        }`}
        aria-label={`Explication: ${title}`}
        title={`En savoir plus sur : ${title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 bottom-full mb-2 w-72 sm:w-80 max-w-[90vw] p-3.5 rounded-xl bg-slate-900/98 backdrop-blur-md border border-emerald-500/40 text-slate-200 shadow-2xl shadow-slate-950/90 text-left font-normal ${alignClasses}`}
          >
            {/* Arrow */}
            <div 
              className={`absolute top-full -mt-1 w-2.5 h-2.5 bg-slate-900 border-r border-b border-emerald-500/40 rotate-45 ${
                align === 'right' ? 'right-4' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-3'
              }`} 
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-white leading-tight">
                  {title}
                </span>
                {badge && (
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-slate-300">
                {description}
              </p>

              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Impact sur la Simulation :
                </span>
                <p className="text-slate-300 text-[10.5px]">
                  {impact}
                </p>
              </div>

              {recommendation && (
                <div className="flex items-start gap-1.5 text-emerald-300 text-[10.5px] bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                  <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <span><strong>Recommandation :</strong> {recommendation}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StrategyGeneratorProps {
  currentStrategy: BettingStrategy;
  onSelectStrategy: (strat: BettingStrategy) => void;
  onUpdateStrategy: (updates: Partial<BettingStrategy>) => void;
  currency: string;
  balance: number;
  onStartAutoBet: () => void;
  isAutobetting: boolean;
  bets?: BetResult[];
  stats?: BotStatistics;
}

export const StrategyGenerator: React.FC<StrategyGeneratorProps> = ({
  currentStrategy,
  onSelectStrategy,
  onUpdateStrategy,
  currency,
  balance,
  onStartAutoBet,
  isAutobetting,
  bets = [],
  stats,
}) => {
  const { t } = useTranslation();

  // Antebot Style Top Navigation Tabs
  const [activeTab, setActiveTab] = useState<'matrix' | 'conditions' | 'ai_architect' | 'presets' | 'comparator'>('matrix');
  const [activeGame, setActiveGame] = useState<StakeGameType>(currentStrategy.game || 'dice');
  const [generatorMode, setGeneratorMode] = useState<'constructive' | 'wager' | 'wager_recovery' | 'dice_conditions'>('constructive');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiRisk, setAiRisk] = useState<RiskLevel>('low');
  const [aiTargetProfitPct, setAiTargetProfitPct] = useState(15);
  const [aiMethodology, setAiMethodology] = useState<'oscars_grind' | 'paroli' | 'dalembert' | 'kelly' | 'fibonacci' | 'wager' | 'wager_recovery' | 'custom'>('oscars_grind');
  const [wagerTargetVolumeInput, setWagerTargetVolumeInput] = useState<number>(25000);
  const [recoveryDeficitInput, setRecoveryDeficitInput] = useState<number>(15);
  const [recoveryWinrateBand, setRecoveryWinrateBand] = useState<'all' | 'high_multiplier' | 'balanced' | 'safe'>('all');
  const [constructiveWinrateBand, setConstructiveWinrateBand] = useState<'all' | 'sniper_10_20' | 'dynamic_25_40' | 'balanced_45_60' | 'safe_65_85'>('all');
  const [diceConditionCount, setDiceConditionCount] = useState<number>(12);
  const [diceArchetypeStyle, setDiceArchetypeStyle] = useState<'anti_streak' | 'oscillator' | 'tactical_matrix' | 'vip_volume' | 'master_30'>('oscillator');
  const [copiedScript, setCopiedScript] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [showKellyCalculator, setShowKellyCalculator] = useState<boolean>(false);

  // Sync game when currentStrategy changes
  useEffect(() => {
    if (currentStrategy.game && currentStrategy.game !== activeGame) {
      setActiveGame(currentStrategy.game);
    }
  }, [currentStrategy.game]);

  const gameList: Array<{ id: StakeGameType; name: string; icon: React.ReactNode; maxMultBadge: string; rtpBadge: string; color: string }> = [
    { id: 'dice', name: 'Dice', icon: <Dice5 className="w-4 h-4" />, maxMultBadge: 'Max x9,900', rtpBadge: 'RTP 99%', color: 'emerald' },
    { id: 'limbo', name: 'Limbo', icon: <Rocket className="w-4 h-4" />, maxMultBadge: 'Max x1,000,000', rtpBadge: 'RTP 99%', color: 'purple' },
    { id: 'mines', name: 'Mines', icon: <Diamond className="w-4 h-4" />, maxMultBadge: 'Max x5,148,297', rtpBadge: 'RTP 99%', color: 'cyan' },
    { id: 'plinko', name: 'Plinko', icon: <CircleDot className="w-4 h-4" />, maxMultBadge: 'Max x10,000', rtpBadge: 'RTP 99%', color: 'rose' },
    { id: 'crash', name: 'Crash', icon: <TrendingUp className="w-4 h-4" />, maxMultBadge: 'Max x1,000,000', rtpBadge: 'RTP 99%', color: 'amber' },
    { id: 'keno', name: 'Keno', icon: <Grid3X3 className="w-4 h-4" />, maxMultBadge: 'Max x1,000', rtpBadge: 'RTP 99%', color: 'amber' },
    { id: 'hilo', name: 'Hilo', icon: <Layers className="w-4 h-4" />, maxMultBadge: 'Max x1,000,000', rtpBadge: 'RTP 99%', color: 'indigo' },
    { id: 'wheel', name: 'Wheel', icon: <Compass className="w-4 h-4" />, maxMultBadge: 'Max x49.5', rtpBadge: 'RTP 99%', color: 'teal' },
    { id: 'blackjack', name: 'Blackjack', icon: <CheckCircle2 className="w-4 h-4" />, maxMultBadge: 'RTP 99.43%', rtpBadge: 'Max x2.5', color: 'blue' },
    { id: 'roulette', name: 'Roulette', icon: <Compass className="w-4 h-4" />, maxMultBadge: 'Max x36', rtpBadge: 'RTP 97.3%', color: 'emerald' },
  ];

  const handleGameSelect = (gameId: StakeGameType) => {
    setActiveGame(gameId);
    const matchingPreset = PREDEFINED_STRATEGIES.find((s) => {
      if (s.game !== gameId) return false;
      if (generatorMode === 'wager_recovery') return s.isRecoveryStrategy;
      if (generatorMode === 'wager') return s.isWagerStrategy && !s.isRecoveryStrategy;
      return !s.isWagerStrategy && !s.isRecoveryStrategy;
    }) || PREDEFINED_STRATEGIES.find((s) => s.game === gameId);
    
    if (matchingPreset) {
      onSelectStrategy({ ...matchingPreset, currency });
    } else {
      onUpdateStrategy({
        game: gameId,
        name: `Stratégie Constructive ${gameId.toUpperCase()}`,
        targetMultiplier: gameId === 'limbo' ? 2.0 : gameId === 'mines' ? 1.74 : 2.0,
        winChance: Number((99 / (gameId === 'limbo' ? 2.0 : gameId === 'mines' ? 1.74 : 2.0)).toFixed(2)),
      });
    }
  };

  const handleGenerateRandomConstructive = () => {
    const strat = generateRandomConstructiveStrategy(
      activeGame,
      balance > 0 ? balance : 100,
      currency,
      constructiveWinrateBand
    );
    onSelectStrategy(strat);
  };

  const handleGenerateRandomWager = () => {
    const strat = generateRandomWagerStrategy(activeGame, balance > 0 ? balance : 100, currency, wagerTargetVolumeInput);
    onSelectStrategy(strat);
  };

  const handleGenerateRandomWagerRecovery = () => {
    const strat = generateRandomWagerRecoveryStrategy(
      activeGame,
      balance > 0 ? balance : 100,
      currency,
      recoveryDeficitInput,
      recoveryWinrateBand
    );
    onSelectStrategy(strat);
  };

  const handleGenerateDiceMultiConditions = () => {
    const strat = generateStakeDiceMultiConditionStrategy(
      balance > 0 ? balance : 100,
      currency,
      diceConditionCount,
      diceArchetypeStyle
    );
    onSelectStrategy(strat);
    setActiveTab('conditions');
  };

  const handleCopyAntebotScript = () => {
    const scriptJson = {
      name: currentStrategy.name,
      game: currentStrategy.game,
      baseBet: currentStrategy.baseBet,
      targetMultiplier: currentStrategy.targetMultiplier,
      winChance: currentStrategy.winChance,
      onLoss: { action: currentStrategy.onLossAction, factor: currentStrategy.onLossValue || 1 },
      onWin: { action: currentStrategy.onWinAction },
      stopLoss: currentStrategy.stopOnLoss,
      takeProfit: currentStrategy.stopOnProfit,
      trailingStop: currentStrategy.trailingStopLoss,
      autoVault: currentStrategy.autoVaultWithdraw,
      customConditions: currentStrategy.customConditions || [],
      exportedAt: new Date().toISOString(),
      platform: 'Stake.com / Antebot Compatible'
    };

    navigator.clipboard.writeText(JSON.stringify(scriptJson, null, 2));
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleGenerateAiStrategy = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const isRecoveryMode = generatorMode === 'wager_recovery' || aiMethodology === 'wager_recovery';
      const isWagerMode = generatorMode === 'wager' || aiMethodology === 'wager';
      const response = await fetch('/api/gemini/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: activeGame,
          riskLevel: isRecoveryMode || isWagerMode ? 'ultra_safe' : aiRisk,
          bankroll: balance > 0 ? balance : 100,
          targetProfit: isRecoveryMode ? (recoveryDeficitInput / (balance > 0 ? balance : 100)) * 100 : aiTargetProfitPct,
          methodology: aiMethodology,
          isWager: isWagerMode,
          isWagerRecovery: isRecoveryMode,
          wagerTargetVolume: wagerTargetVolumeInput,
          userPrompt: aiPrompt 
            ? `${aiPrompt} (Méthode: ${aiMethodology})` 
            : isRecoveryMode 
              ? `Stratégie de récupération post stop-loss : combler un déficit de ${recoveryDeficitInput} ${currency} sans martingale`
              : `Méthode: ${aiMethodology}`,
          currency,
        }),
      });

      const data = await response.json();
      if (data.strategy) {
        onSelectStrategy(data.strategy);
        setActiveTab('matrix');
      } else if (data.error) {
        setAiError(data.error);
      }
    } catch (err: any) {
      setAiError(err.message || 'Erreur lors de la génération IA');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const filteredPresets = useMemo(() => {
    return PREDEFINED_STRATEGIES.filter((s) => {
      if (s.game !== activeGame) return false;
      if (selectedRiskFilter === 'conditions') {
        if (!s.customConditions || s.customConditions.length === 0) return false;
      } else if (selectedRiskFilter === 'wager_recovery') {
        if (!s.isRecoveryStrategy) return false;
      } else if (selectedRiskFilter === 'wager') {
        if (!s.isWagerStrategy || s.isRecoveryStrategy) return false;
      } else if (selectedRiskFilter !== 'all') {
        if (s.riskLevel !== selectedRiskFilter) return false;
      }
      if (presetSearch.trim()) {
        const q = presetSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.aiRationale && s.aiRationale.toLowerCase().includes(q)) ||
          (s.vipTierTarget && s.vipTierTarget.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeGame, selectedRiskFilter, presetSearch]);

  const effectiveBankroll = balance > 0 ? balance : 100;
  const estimatedWagerVolume = currentStrategy.wagerTargetVolume || (effectiveBankroll * (currentStrategy.estimatedWagerTurnover || 300));
  const estimatedRakeback = (estimatedWagerVolume * 0.01 * (currentStrategy.estimatedRakebackPercent ? currentStrategy.estimatedRakebackPercent / 100 : 0.10)).toFixed(2);

  // Real-time Visual Validation Rules
  const maxGameMultiplier = STAKE_ORIGINALS_SPECS[currentStrategy.game]?.maxMultiplier || 1000000;

  // Base Bet Validation
  const baseBetError = useMemo(() => {
    if (currentStrategy.baseBet === undefined || currentStrategy.baseBet === null || isNaN(currentStrategy.baseBet)) {
      return 'Montant de mise requis';
    }
    if (currentStrategy.baseBet <= 0) {
      return 'La mise doit être strictement positive (> 0, min 0.0001)';
    }
    if (balance > 0 && currentStrategy.baseBet > balance) {
      return `Mise trop élevée (${currentStrategy.baseBet} ${currency}) : dépasse votre solde disponible (${balance.toFixed(2)} ${currency})`;
    }
    return null;
  }, [currentStrategy.baseBet, balance, currency]);

  const baseBetWarning = useMemo(() => {
    if (baseBetError) return null;
    if (balance > 0 && currentStrategy.baseBet > balance * 0.25) {
      return `Mise élevée (${((currentStrategy.baseBet / balance) * 100).toFixed(1)}% du solde) : risque élevé de variance`;
    }
    return null;
  }, [baseBetError, currentStrategy.baseBet, balance]);

  // Target Multiplier Validation
  const multiplierError = useMemo(() => {
    if (!currentStrategy.targetMultiplier || isNaN(currentStrategy.targetMultiplier)) {
      return 'Multiplicateur cible requis';
    }
    if (currentStrategy.targetMultiplier < 1.01) {
      return 'Multiplicateur minimum sur Stake : 1.01x';
    }
    if (currentStrategy.targetMultiplier > maxGameMultiplier) {
      return `Plafond dépassé : max ${maxGameMultiplier.toLocaleString()}x sur ${STAKE_ORIGINALS_SPECS[currentStrategy.game]?.name || currentStrategy.game}`;
    }
    return null;
  }, [currentStrategy.targetMultiplier, maxGameMultiplier, currentStrategy.game]);

  // Stop Loss Validation
  const stopLossError = useMemo(() => {
    if (currentStrategy.stopOnLoss === undefined || currentStrategy.stopOnLoss === null || isNaN(currentStrategy.stopOnLoss)) {
      return 'Stop Loss requis';
    }
    if (currentStrategy.stopOnLoss <= 0) {
      return 'Le Stop Loss doit être supérieur à 0';
    }
    return null;
  }, [currentStrategy.stopOnLoss]);

  const stopLossWarning = useMemo(() => {
    if (stopLossError) return null;
    if (balance > 0 && currentStrategy.stopOnLoss > balance) {
      return `Le Stop Loss (${currentStrategy.stopOnLoss} ${currency}) dépasse votre solde total (${balance.toFixed(2)} ${currency})`;
    }
    return null;
  }, [stopLossError, currentStrategy.stopOnLoss, balance, currency]);

  // Take Profit Validation
  const takeProfitError = useMemo(() => {
    if (currentStrategy.stopOnProfit === undefined || currentStrategy.stopOnProfit === null || isNaN(currentStrategy.stopOnProfit)) {
      return 'Take Profit requis';
    }
    if (currentStrategy.stopOnProfit <= 0) {
      return 'Le Take Profit doit être supérieur à 0';
    }
    return null;
  }, [currentStrategy.stopOnProfit]);

  // Auto Vault Withdraw Validation
  const autoVaultError = useMemo(() => {
    if (!currentStrategy.autoVaultWithdraw?.enabled) return null;
    const { threshold, keepBalance } = currentStrategy.autoVaultWithdraw;
    if (threshold <= 0) return 'Le seuil de transfert doit être supérieur à 0';
    if (keepBalance !== undefined && keepBalance > threshold) {
      return 'Le solde conservé ne peut excéder le seuil de déclenchement';
    }
    return null;
  }, [currentStrategy.autoVaultWithdraw]);

  // Check if strategy has any blocking validation errors
  const hasBlockingValidationErrors = Boolean(baseBetError || multiplierError || stopLossError || takeProfitError || autoVaultError);

  // Consecutive loss tolerance before stop-loss
  const maxLossStreakTolerance = useMemo(() => {
    if (!currentStrategy.baseBet || currentStrategy.baseBet <= 0 || !currentStrategy.stopOnLoss) return 0;
    if (currentStrategy.onLossAction === 'reset' || currentStrategy.onLossAction === 'custom') {
      return Math.floor(currentStrategy.stopOnLoss / currentStrategy.baseBet);
    }
    if (currentStrategy.onLossAction === 'multiply') {
      const factor = currentStrategy.onLossValue || 2;
      let cumLoss = 0;
      let currentB = currentStrategy.baseBet;
      let streak = 0;
      while (cumLoss + currentB <= currentStrategy.stopOnLoss && streak < 30) {
        cumLoss += currentB;
        currentB *= factor;
        streak++;
      }
      return streak;
    }
    return Math.floor(currentStrategy.stopOnLoss / currentStrategy.baseBet);
  }, [currentStrategy.baseBet, currentStrategy.stopOnLoss, currentStrategy.onLossAction, currentStrategy.onLossValue]);

  return (
    <div id="strategy-generator-container" className="space-y-4">

      {/* 1. ANTEBOT PRO TACTICAL HUD HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 shadow-2xl p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-96 h-48 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          
          {/* Left: Active Strategy Info & Antebot Live Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>ANTEBOT STAKE MATRIX</span>
              </span>

              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono font-bold uppercase border border-slate-700">
                {currentStrategy.game}
              </span>

              {currentStrategy.isRecoveryStrategy ? (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[11px] font-extrabold border border-cyan-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Récupération Wager
                </span>
              ) : currentStrategy.isWagerStrategy ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-extrabold border border-amber-500/40 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> Wager VIP Volume
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Constructive Anti-Ruin
                </span>
              )}

              {currentStrategy.customConditions && currentStrategy.customConditions.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold border border-purple-500/30">
                  {currentStrategy.customConditions.filter(c => c.isActive !== false).length} Règles Actives
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {currentStrategy.name}
              </h2>
              <button
                type="button"
                onClick={handleCopyAntebotScript}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                title="Copier le script / JSON Antebot"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-xs text-slate-400 max-w-2xl line-clamp-1">
              {currentStrategy.description || "Stratégie algorithmique avancée calibrée pour les originaux Stake avec gestion dynamique du risque."}
            </p>
          </div>

          {/* Right: Quick Action Controls & Live Bankroll Telemetry */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            
            {/* Bankroll Pill */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Solde Actif</span>
              <span className="text-sm sm:text-base font-mono font-black text-emerald-400">
                {balance.toFixed(2)} <span className="text-xs text-emerald-500 font-bold">{currency}</span>
              </span>
            </div>

            {/* Smart Optimization Button */}
            <SuggestStrategyOptimizationButton
              strategy={currentStrategy}
              onUpdateStrategy={onUpdateStrategy}
              onSelectStrategy={onSelectStrategy}
              balance={balance}
              currency={currency}
              stats={stats}
              bets={bets}
              variant="compact"
              onStartAutoBet={onStartAutoBet}
            />

            {/* Start Autobet / Sandbox Button */}
            <button
              id="btn-quick-start-autobet"
              onClick={onStartAutoBet}
              disabled={isAutobetting || hasBlockingValidationErrors}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center gap-2 transition active:scale-95 ${
                hasBlockingValidationErrors
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                  : isAutobetting
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950/50 cursor-pointer animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 cursor-pointer ring-1 ring-emerald-400/40'
              }`}
            >
              {hasBlockingValidationErrors ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Corriger Paramètres</span>
                </>
              ) : isAutobetting ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Bot en Cours...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lancer Sandbox (Autobet)</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Real-time Telemetry Strip (Antebot Matrix Bars) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-4 pt-3.5 border-t border-slate-800/80 text-xs">
          
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Mise de Base</span>
            <span className="font-mono font-bold text-slate-100">
              {currentStrategy.baseBet} <span className="text-[10px] text-slate-400">{currency}</span>
            </span>
            <span className="text-[9px] text-slate-500 block font-mono">
              ({(balance > 0 ? (currentStrategy.baseBet / balance) * 100 : 0).toFixed(2)}% solde)
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Multiplicateur & Cote</span>
            <span className="font-mono font-bold text-amber-400">
              {currentStrategy.targetMultiplier}x
            </span>
            <span className="text-[9px] text-emerald-400 block font-mono">
              {currentStrategy.winChance || (99 / currentStrategy.targetMultiplier).toFixed(2)}% chance
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Progression sur Perte</span>
            <span className="font-mono font-bold text-cyan-300 capitalize truncate block">
              {currentStrategy.onLossAction === 'reset' ? 'Mise Plate (0x)' : currentStrategy.onLossAction === 'custom' ? "Oscar's Grind" : currentStrategy.onLossAction === 'multiply' ? `Martingale (x${currentStrategy.onLossValue || 2})` : currentStrategy.onLossAction}
            </span>
            <span className="text-[9px] text-slate-400 block font-mono">
              Max {maxLossStreakTolerance} pertes d'affilée
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Stop Loss</span>
            <span className="font-mono font-bold text-rose-400">
              -{currentStrategy.stopOnLoss} <span className="text-[10px] text-slate-400">{currency}</span>
            </span>
            <span className="text-[9px] text-slate-500 block font-mono">
              Coupe-circuit strict
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Take Profit</span>
            <span className="font-mono font-bold text-emerald-400">
              +{currentStrategy.stopOnProfit} <span className="text-[10px] text-slate-400">{currency}</span>
            </span>
            <span className="text-[9px] text-slate-500 block font-mono">
              Clôture session
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Volume / Rakeback</span>
            <span className="font-mono font-bold text-purple-300">
              ~{estimatedWagerVolume.toLocaleString()} {currency}
            </span>
            <span className="text-[9px] text-emerald-400 block font-mono">
              +{estimatedRakeback} {currency} VIP
            </span>
          </div>

        </div>
      </div>

      {/* 2. ANTEBOT MASTER TAB NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Paramètres & Matrice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conditions')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'conditions'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-400/40'
                : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>2. Conditions Stake (4 à 30 Règles)</span>
            {currentStrategy.customConditions && currentStrategy.customConditions.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                {currentStrategy.customConditions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_architect')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ai_architect'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 ring-1 ring-pink-400/40'
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. Architecte IA Gemini 3.7</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'presets'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>4. Catalogue ({PREDEFINED_STRATEGIES.length} Presets)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparator')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'comparator'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>5. Comparateur & Kelly</span>
          </button>

        </div>

        {/* Mode Fast Filter Pills */}
        <div className="flex items-center gap-1.5 px-2">
          <button
            type="button"
            onClick={() => {
              setGeneratorMode('constructive');
              handleGenerateRandomConstructive();
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/20 transition flex items-center gap-1"
            title="Générer une stratégie constructive aléatoire"
          >
            <Shuffle className="w-3 h-3" />
            <span>Random Strat</span>
          </button>
        </div>

      </div>

      {/* 3. STAKE GAME SELECTOR RIBBON */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Dice5 className="w-3.5 h-3.5 text-emerald-400" />
            Originaux Stake.com & Jeux Casino
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Sélectionné : <strong className="text-emerald-400 uppercase">{activeGame}</strong> (RTP {STAKE_ORIGINALS_SPECS[activeGame]?.rtp || 99}%)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
          {gameList.map((g) => {
            const isSelected = activeGame === g.id;
            const count = PREDEFINED_STRATEGIES.filter((s) => s.game === g.id).length;
            return (
              <button
                key={g.id}
                id={`game-btn-${g.id}`}
                onClick={() => handleGameSelect(g.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all relative ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/60'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span className="absolute top-1 right-1 text-[8px] font-mono font-bold px-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {count}
                </span>
                <div className={`p-1.5 rounded-lg mb-1 ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {g.icon}
                </div>
                <span className="font-bold text-[11px] truncate">{g.name}</span>
                <span className="text-[8.5px] text-amber-400 font-mono mt-0.5 font-bold truncate">{g.maxMultBadge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA ACCORDING TO ACTIVE TAB */}

      {/* TAB 1: PARAMÈTRES & MATRICE DE LA STRATÉGIE (ANTEBOT CORE INPUTS) */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          
          {/* Validation Alert Banner if errors exist */}
          {hasBlockingValidationErrors && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200 shadow-md shadow-rose-950/30">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-300">Paramètres invalides détectés dans la configuration :</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 font-mono">
                  {baseBetError && <li>{baseBetError}</li>}
                  {multiplierError && <li>{multiplierError}</li>}
                  {stopLossError && <li>{stopLossError}</li>}
                  {takeProfitError && <li>{takeProfitError}</li>}
                  {autoVaultError && <li>{autoVaultError}</li>}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Card: Mise de Base, Multiplicateur & Kelly (6 Cols) */}
            <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  Mise Initiale & Cote Cible
                </h3>
                <button
                  type="button"
                  onClick={() => setShowKellyCalculator(!showKellyCalculator)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition flex items-center gap-1 ${
                    showKellyCalculator 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-slate-800 text-emerald-400 border-emerald-800/40 hover:bg-slate-700'
                  }`}
                >
                  <Calculator className="w-3 h-3" />
                  <span>Dimensionnement Kelly</span>
                </button>
              </div>

              {/* Base Bet Input with Quick Percentage Multiplier Chips */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                baseBetError 
                  ? 'bg-rose-950/20 border-rose-500/70' 
                  : baseBetWarning 
                  ? 'bg-amber-950/20 border-amber-500/70' 
                  : 'bg-slate-950/70 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-200">
                      Mise de Base ({currency})
                    </label>
                    <ParamTooltip
                      id="tooltip-matrix-base-bet"
                      title="Mise de Base (Base Bet)"
                      badge="Unité Initiale"
                      description="Montant engagé au premier lancer de chaque cycle ou après réinitialisation."
                      impact="Une mise sous 1% du capital permet d'absorber les séries noires de variance sans déclencher le stop-loss."
                      recommendation="0.1% à 1% de la bankroll (ex: 0.10 USDT pour 100 USDT)."
                    />
                  </div>

                  {baseBetError ? (
                    <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Invalide
                    </span>
                  ) : baseBetWarning ? (
                    <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Élevée
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Optimal
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={currentStrategy.baseBet}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      onUpdateStrategy({ baseBet: isNaN(raw) ? 0 : raw });
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-black focus:outline-none ${
                      baseBetError
                        ? 'bg-rose-950/40 border border-rose-500 text-rose-100'
                        : baseBetWarning
                        ? 'bg-amber-950/40 border border-amber-500 text-amber-100'
                        : 'bg-slate-900 border border-slate-700 text-white focus:ring-1 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                {/* Quick Multiplier & Percentage Chips (Antebot Style) */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 mt-2.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: 0.0001 })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-800"
                    title="Mise minimale Stake"
                  >
                    Min
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(Math.max(0.0001, currentStrategy.baseBet / 2).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-cyan-300 border border-slate-800"
                    title="Diviser par 2"
                  >
                    1/2
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number((currentStrategy.baseBet * 2).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-amber-300 border border-slate-800"
                    title="Doubler la mise"
                  >
                    2X
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(((balance > 0 ? balance : 100) * 0.005).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-800"
                    title="0.5% du solde"
                  >
                    0.5%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(((balance > 0 ? balance : 100) * 0.01).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-emerald-400 border border-slate-800"
                    title="1% du solde"
                  >
                    1%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(((balance > 0 ? balance : 100) * 0.05).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-800"
                    title="5% du solde"
                  >
                    5%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(((balance > 0 ? balance : 100) * 0.10).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-800"
                    title="10% du solde"
                  >
                    10%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStrategy({ baseBet: Number(((balance > 0 ? balance : 100) * 0.25).toFixed(4)) })}
                    className="py-1 px-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-[10px] font-mono font-bold text-rose-300 border border-rose-800/40"
                    title="25% du solde (Risque élevé)"
                  >
                    25%
                  </button>
                </div>
              </div>

              {/* Target Multiplier Input & Payout Presets */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                multiplierError ? 'bg-rose-950/20 border-rose-500/70' : 'bg-slate-950/70 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-200">
                      Multiplicateur Cible (Payout)
                    </label>
                    <ParamTooltip
                      id="tooltip-matrix-multiplier"
                      title="Multiplicateur Cible (Cote)"
                      badge="Probabilité & Gain"
                      description="Multiplicateur visé. Sur Stake, Win% = 99 / Multiplicateur."
                      impact="1.01x-1.30x favorise le volume Wager sans volatilité. 2.0x convient aux cycles +1u. 3x-10x correspond à du sniping asymétrique."
                      recommendation="1.98x - 2.00x pour du jeu équilibré, 1.05x pour du VIP Volume."
                    />
                  </div>

                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {currentStrategy.winChance || (99 / currentStrategy.targetMultiplier).toFixed(2)}% Win Chance
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={currentStrategy.targetMultiplier}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      const val = isNaN(raw) ? 0 : raw;
                      const winChance = val > 0 ? Number((99 / val).toFixed(2)) : 0;
                      onUpdateStrategy({ targetMultiplier: val, winChance });
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-black focus:outline-none ${
                      multiplierError
                        ? 'bg-rose-950/40 border border-rose-500 text-rose-100'
                        : 'bg-slate-900 border border-slate-700 text-amber-300 focus:ring-1 focus:ring-amber-500'
                    }`}
                  />
                </div>

                {/* Multiplier Presets */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mt-2.5 pt-2 border-t border-slate-800/80">
                  {[1.01, 1.10, 1.50, 2.00, 3.00, 5.00, 10.00].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const winChance = Number((99 / preset).toFixed(2));
                        onUpdateStrategy({ targetMultiplier: preset, winChance });
                      }}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold transition border ${
                        currentStrategy.targetMultiplier === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Kelly Interactive Embed if activated */}
              {showKellyCalculator && (
                <div className="pt-2">
                  <KellyCriterionCalculator
                    currentMultiplier={currentStrategy.targetMultiplier || 2.0}
                    currentBalance={balance}
                    currency={currency}
                    onApplyBet={(recBet) => onUpdateStrategy({ baseBet: recBet })}
                    onApplyMultiplier={(newM) => onUpdateStrategy({ targetMultiplier: newM, winChance: Number((99 / newM).toFixed(2)) })}
                  />
                </div>
              )}

            </div>

            {/* Right Card: Progression & Sécurité Stop/Take/Vault (6 Cols) */}
            <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Progression & Verrous de Sécurité
                </h3>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                  Protocole Anti-Ruine
                </span>
              </div>

              {/* Loss & Win Action Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* On Loss Action */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Action sur Perte
                  </label>
                  <select
                    value={currentStrategy.onLossAction}
                    onChange={(e) => onUpdateStrategy({ onLossAction: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="reset">Mise plate / Réinitialiser (Wager)</option>
                    <option value="custom">Mise constante (Oscar's Grind)</option>
                    <option value="increase_fixed">Ajouter 1 unité (+D'Alembert)</option>
                    <option value="fibonacci">Suite de Fibonacci douce</option>
                    <option value="multiply">Multiplier la mise (Martingale)</option>
                  </select>
                  {currentStrategy.onLossAction === 'multiply' && (
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Facteur :</span>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        value={currentStrategy.onLossValue || 2.0}
                        onChange={(e) => onUpdateStrategy({ onLossValue: parseFloat(e.target.value) || 2.0 })}
                        className="w-20 rounded px-2 py-0.5 bg-slate-900 border border-slate-700 text-xs font-mono text-white text-right"
                      />
                    </div>
                  )}
                </div>

                {/* On Win Action */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Action sur Victoire
                  </label>
                  <select
                    value={currentStrategy.onWinAction}
                    onChange={(e) => onUpdateStrategy({ onWinAction: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="reset">Réinitialiser à la base (Wager)</option>
                    <option value="increase_fixed">Augmenter d'1 unité (Oscar's Grind)</option>
                    <option value="increase_pct">Doubler / Capitaliser (Paroli)</option>
                    <option value="custom">Diminuer de 1 unité (D'Alembert)</option>
                  </select>
                </div>

              </div>

              {/* Stop Loss & Take Profit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Stop Loss */}
                <div className={`p-3 rounded-xl border ${stopLossError ? 'bg-rose-950/20 border-rose-500' : 'bg-slate-950/70 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-rose-300">
                      Stop Loss Max ({currency})
                    </label>
                    <span className="text-[9px] font-mono text-rose-400 font-bold">Arrêt Strict</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={currentStrategy.stopOnLoss}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      onUpdateStrategy({ stopOnLoss: isNaN(raw) ? 0 : raw });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {[0.10, 0.25, 0.50, 1.0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => onUpdateStrategy({ stopOnLoss: Number(((balance > 0 ? balance : 100) * pct).toFixed(2)) })}
                        className="py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] font-mono font-bold text-slate-300 border border-slate-800"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Take Profit */}
                <div className={`p-3 rounded-xl border ${takeProfitError ? 'bg-rose-950/20 border-rose-500' : 'bg-slate-950/70 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-emerald-300">
                      Take Profit Cible ({currency})
                    </label>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">Verrouillage</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={currentStrategy.stopOnProfit}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      onUpdateStrategy({ stopOnProfit: isNaN(raw) ? 0 : raw });
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {[0.10, 0.25, 0.50, 1.0].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => onUpdateStrategy({ stopOnProfit: Number(((balance > 0 ? balance : 100) * pct).toFixed(2)) })}
                        className="py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] font-mono font-bold text-emerald-400 border border-slate-800"
                      >
                        +{pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Trailing Stop Loss & Auto-Vault Quick Controls */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">Trailing Stop-Loss Dynamique</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const isEnabled = currentStrategy.trailingStopLoss?.enabled;
                      onUpdateStrategy({
                        trailingStopLoss: {
                          enabled: !isEnabled,
                          activationProfit: currentStrategy.trailingStopLoss?.activationProfit || 5,
                          trailDistance: currentStrategy.trailingStopLoss?.trailDistance || 2.5,
                        }
                      });
                    }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      currentStrategy.trailingStopLoss?.enabled
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {currentStrategy.trailingStopLoss?.enabled ? '✓ Actif' : 'Désactivé'}
                  </button>
                </div>

                {currentStrategy.trailingStopLoss?.enabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Armement si profit &gt;</span>
                      <input
                        type="number"
                        step="0.5"
                        value={currentStrategy.trailingStopLoss.activationProfit}
                        onChange={(e) => onUpdateStrategy({
                          trailingStopLoss: { ...currentStrategy.trailingStopLoss!, activationProfit: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full rounded px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Distance de repli (Trail)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={currentStrategy.trailingStopLoss.trailDistance}
                        onChange={(e) => onUpdateStrategy({
                          trailingStopLoss: { ...currentStrategy.trailingStopLoss!, trailDistance: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full rounded px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Stake Auto-Vault Withdraw */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">Auto-Withdraw Coffre Stake</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const isEnabled = currentStrategy.autoVaultWithdraw?.enabled;
                      onUpdateStrategy({
                        autoVaultWithdraw: {
                          enabled: !isEnabled,
                          threshold: currentStrategy.autoVaultWithdraw?.threshold || (balance > 0 ? Number((balance * 1.3).toFixed(2)) : 150),
                          keepBalance: currentStrategy.autoVaultWithdraw?.keepBalance || (balance > 0 ? Number(balance.toFixed(2)) : 100),
                        }
                      });
                    }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      currentStrategy.autoVaultWithdraw?.enabled
                        ? 'bg-purple-500 text-slate-950 border-purple-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {currentStrategy.autoVaultWithdraw?.enabled ? '✓ Coffre Actif' : 'Désactivé'}
                  </button>
                </div>

                {currentStrategy.autoVaultWithdraw?.enabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Transférer si solde &gt;</span>
                      <input
                        type="number"
                        value={currentStrategy.autoVaultWithdraw.threshold}
                        onChange={(e) => onUpdateStrategy({
                          autoVaultWithdraw: { ...currentStrategy.autoVaultWithdraw!, threshold: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full rounded px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono text-purple-300"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Solde actif conservé</span>
                      <input
                        type="number"
                        value={currentStrategy.autoVaultWithdraw.keepBalance}
                        onChange={(e) => onUpdateStrategy({
                          autoVaultWithdraw: { ...currentStrategy.autoVaultWithdraw!, keepBalance: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full rounded px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-300"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: CONDITIONS STAKE MATRIX (DICE & MULTI-RULES STUDIO) */}
      {activeTab === 'conditions' && (
        <div className="space-y-4">
          
          {/* Fast Generator for Dice Matrix */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-indigo-950/80 border border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Générateur d'Arbre Décisionnel (4 à 30 Règles Stake)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                100% Compatible Stake.com
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {[
                { id: 'anti_streak', name: '🛡️ Anti-Streak Matrix', desc: 'Inversion Over/Under' },
                { id: 'oscillator', name: '⚡ Oscillateur Asymétrique', desc: 'Cotes variables' },
                { id: 'tactical_matrix', name: '⚖️ Grind Tactique', desc: 'Amortisseurs doux' },
                { id: 'vip_volume', name: '👑 VIP Volume Safe', desc: 'Max Turnover' },
                { id: 'master_30', name: '🌌 Master 30 Quant', desc: '30 Conditions Max' },
              ].map((arch) => (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => {
                    setDiceArchetypeStyle(arch.id as any);
                    if (arch.id === 'master_30') setDiceConditionCount(30);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    diceArchetypeStyle === arch.id
                      ? 'bg-purple-500/25 border-purple-400 text-white font-bold ring-1 ring-purple-400/40'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-purple-300 truncate">{arch.name}</div>
                  <div className="text-[9px] text-slate-400 truncate">{arch.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <span>Règles : <strong>{diceConditionCount}</strong></span>
                <input
                  type="range"
                  min="4"
                  max="30"
                  value={diceConditionCount}
                  onChange={(e) => setDiceConditionCount(Number(e.target.value))}
                  className="w-32 accent-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateDiceMultiConditions}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/50 transition flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Compiler & Appliquer la Matrice ({diceConditionCount} Conditions)</span>
              </button>
            </div>
          </div>

          {/* Condition Studio Component */}
          <DiceCustomConditionStudio
            strategy={currentStrategy}
            onUpdateStrategy={onUpdateStrategy}
            currency={currency}
            balance={balance}
            onStartSandboxTest={onStartAutoBet}
          />
        </div>
      )}

      {/* TAB 3: ARCHITECTE IA GEMINI 3.7 */}
      {activeTab === 'ai_architect' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-md shadow-purple-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[9px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Architecte IA Gemini 3.7 (Optimisation Quant & Anti-Ruine)
                </h3>
                <p className="text-xs text-slate-400">
                  Génère des modèles probabilistes sans martingale destructrice adaptés à votre solde ({balance.toFixed(2)} {currency}).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Methodology selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Méthodologie Algorithmique
              </label>
              <select
                value={aiMethodology}
                onChange={(e) => setAiMethodology(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="oscars_grind">Oscar's Grind (+1 unité nette par cycle, zéro hausse sur défaite)</option>
                <option value="wager">⚡ WAGER Gros Volume VIP (Mise plate 98% Winrate & Rakeback)</option>
                <option value="wager_recovery">🛡️ WAGER Récupération (Post-Stop Loss / Micro-Mises)</option>
                <option value="dalembert">D'Alembert Doux (+1u sur perte / -1u sur gain)</option>
                <option value="paroli">Paroli Positif (Capitalisation sur séries gagnantes)</option>
                <option value="fibonacci">Suite Amortie de Fibonacci</option>
                <option value="kelly">Fractional Kelly Criterion</option>
              </select>
            </div>

            {/* Risk profile */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Profil de Risque
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ultra_safe', 'low', 'medium'] as RiskLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setAiRisk(lvl)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold capitalize border transition ${
                      aiRisk === lvl
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {lvl === 'ultra_safe' ? 'Ultra Sûr (Wager)' : lvl === 'low' ? 'Faible (Grind)' : 'Modéré (Croissance)'}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Prompt Pill Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-semibold block">Suggestions de directives :</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                "Objectif volume VIP 50,000 USDT sur Dice avec cotes 1.05x",
                "Récupérer un déficit de 15 USDT avec des micro-mises sans martingale",
                "Oscar's Grind avec Stop-Loss strict à 15% du capital",
                "Sniping asymétrique cote 5x avec mises à 0.2%",
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAiPrompt(p)}
                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-purple-300 hover:border-purple-800 transition"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt text area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Instructions Spécifiques (Optionnel)
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Optimise pour un volume rapide avec une cote à 1.10x, arrêt dès +20 USDT de profit net..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>

          {aiError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateAiStrategy}
            disabled={isGeneratingAi || isAutobetting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Calcul & Optimisation Quant en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Générer Stratégie avec Gemini 3.7</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 4: CATALOGUE DE STRATÉGIES & PRESETS (105+) */}
      {activeTab === 'presets' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Catalogue {activeGame.toUpperCase()} ({filteredPresets.length} stratégies disponibles)
              </h3>
              <p className="text-xs text-slate-400">
                Toutes les stratégies sont vérifiées et 100% constructives (zéro risque d'emballement incontrôlé).
              </p>
            </div>
          </div>

          {/* Search & Filter Chips */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Rechercher par nom, multiplicateur..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'conditions', label: '🎲 Multi-Conditions' },
                { id: 'wager', label: '⚡ WAGER VIP' },
                { id: 'wager_recovery', label: '🛡️ Récupération' },
                { id: 'ultra_safe', label: 'Ultra Sûr' },
                { id: 'low', label: 'Faible' },
                { id: 'medium', label: 'Modéré' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedRiskFilter(f.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition border ${
                    selectedRiskFilter === f.id
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredPresets.map((strat) => {
              const isSelected = currentStrategy.id === strat.id;
              return (
                <div
                  key={strat.id}
                  onClick={() => {
                    onSelectStrategy({ ...strat, currency });
                    setActiveTab('matrix');
                  }}
                  className={`p-3.5 rounded-xl border text-xs transition cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {strat.isRecoveryStrategy ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            🛡️ RECUP
                          </span>
                        ) : strat.isWagerStrategy ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            WAGER
                          </span>
                        ) : null}
                        <span className="font-bold text-white text-xs truncate">{strat.name}</span>
                      </div>
                      {isSelected && (
                        <span className="p-0.5 rounded-full bg-emerald-500 text-slate-950 flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                      {strat.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        {strat.targetMultiplier}x
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {strat.winChance}% win
                      </span>
                    </div>

                    <button
                      type="button"
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>Appliquer</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 5: COMPARATEUR & KELLY */}
      {activeTab === 'comparator' && (
        <StrategyComparator
          currentStrategy={currentStrategy}
          onSelectStrategy={onSelectStrategy}
          currency={currency}
          balance={balance}
          bets={bets}
          onStartAutoBet={onStartAutoBet}
          isAutobetting={isAutobetting}
        />
      )}

    </div>
  );
};
