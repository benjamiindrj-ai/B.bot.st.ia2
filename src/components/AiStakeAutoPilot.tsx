import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Zap,
  Play,
  Pause,
  Square,
  Shield,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Sliders,
  DollarSign,
  Lock,
  RotateCcw,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain,
  Layers,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Key,
  Wallet,
  FastForward,
  Activity,
  Compass,
  ArrowRight,
  Gauge,
  SlidersHorizontal,
  Dice5,
  Rocket,
  Diamond,
  CircleDot,
  Check,
  Info,
  Crown
} from 'lucide-react';
import { BettingStrategy, BetResult, BotStatistics, StakeApiCredentials, StakeGameType, UserLicenseState } from '../types';
import { StakeLiveChart } from './StakeLiveChart';
import { useTranslation } from '../i18n/LanguageContext';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { getCurrencyInfo } from '../utils/stakeCurrencies';
import { SmartStrategyPanel } from './SmartStrategyPanel';
import { BayesianOptimizerCard } from './BayesianOptimizerCard';
import { 
  AutonomousDecision, 
  AutonomousEngineConfig, 
  DEFAULT_AUTONOMOUS_CONFIG, 
  computeAutonomousDecision 
} from '../utils/autonomousDecisionBrain';
import confetti from 'canvas-confetti';

export interface AiStakeAutoPilotProps {
  strategy: BettingStrategy;
  balance: number;
  currency: string;
  currentBetAmount?: number;
  isAutobetting: boolean;
  onStartAutoBet: () => void;
  onStopAutoBet: () => void;
  onExecuteSingleBet: () => Promise<BetResult | null>;
  onExecuteBatchBets?: (count: number) => Promise<void>;
  lastBet: BetResult | null;
  currentStreak: number;
  betSpeedMs: number;
  setBetSpeedMs: (speed: number) => void;
  stopReason: string | null;
  sessionProfit: number;
  bets?: BetResult[];
  stats?: BotStatistics;
  onClearHistory?: () => void;
  onUpdateStrategy?: (updates: Partial<BettingStrategy>) => void;
  onSelectStrategy?: (strat: BettingStrategy) => void;
  credentials: StakeApiCredentials;
  onOpenStakeApiModal?: () => void;
  onUpdateWallet?: (currency: string, newBalance: number) => void;
  onRotateSeed?: (customClientSeed?: string) => void;
  licenseState?: UserLicenseState;
  onOpenLicenseModal?: () => void;
}

// Preset archetypes for 1-Click user choice
interface AiBotProfile {
  id: string;
  name: string;
  badge: string;
  icon: string;
  game: string;
  multiplier: number;
  risk: 'ultra-safe' | 'balanced' | 'aggressive' | 'vip-wager';
  riskLabel: string;
  riskColor: string;
  description: string;
  howItWorks: string;
  recommendedBankrollPct: number;
  defaultTakeProfit: number;
  defaultStopLoss: number;
  baseMultiplier: number;
  onWin: 'reset' | 'increase_fixed' | 'increase_pct';
  onLoss: 'constant' | 'd_alembert' | 'martingale_soft' | 'step_rebound';
  strategyTemplateId?: string;
}

const AI_BOT_PROFILES: AiBotProfile[] = [
  {
    id: 'profile-autonomous-brain',
    name: 'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
    badge: 'INTELLIGENCE MAX',
    icon: '🧠',
    game: 'auto',
    multiplier: 2.0,
    risk: 'balanced',
    riskLabel: 'Spectre Continu 1.33x ➔ 7.77x & Multi-Jeux',
    riskColor: 'text-amber-300 bg-amber-950/90 border-amber-500/50',
    description: 'Intelligence de pointe : matrice de transition Markov P(W|W)/P(L|L), modulation dynamique de mise (surge de momentum & frein préventif), couloir de reconstitution haute probabilité (75-85% win), micro-tirs Barbell asymétriques (10x-25x) et rotation anti-clustering entre Dice, Limbo, Mines et Plinko.',
    howItWorks: 'Analyse continue de l\'entropie et des séries : stabilise à 75-85% win sur repli, active un rebond asymétrique à 2.85x-7.77x sur déficit, compense la variance sur Dice/Limbo et verrouille le profit à faible volatilité.',
    recommendedBankrollPct: 0.1,
    defaultTakeProfit: 10.0,
    defaultStopLoss: 20.0,
    baseMultiplier: 2.0,
    onWin: 'reset',
    onLoss: 'martingale_soft',
    strategyTemplateId: 'strat-dice-bounded-martingale-4steps',
  },
  {
    id: 'profile-quantum-dynamic-multiplier',
    name: 'IA Quantum Spike (Cible Pivot 1.33x - 7.77x)',
    badge: 'MOMENTUM SPARK',
    icon: '⚡',
    game: 'limbo',
    multiplier: 3.33,
    risk: 'aggressive',
    riskLabel: 'Modulation Multiplicateur 1.33x - 7.77x',
    riskColor: 'text-cyan-400 bg-cyan-950/90 border-cyan-500/50',
    description: 'Bascule intelligente entre cotes ultra-sûres (1.33x pour sécuriser le capital) et cotes percutantes (7.77x pour capter des bonds de rentabilité sans risquer plus de 0.5% du solde).',
    howItWorks: 'Accumule des gains stables à 1.33x/2.0x puis réinvestit une fraction du bénéfice accumulé sur des tirs à 7.77x.',
    recommendedBankrollPct: 0.08,
    defaultTakeProfit: 15.0,
    defaultStopLoss: 20.0,
    baseMultiplier: 3.33,
    onWin: 'reset',
    onLoss: 'step_rebound',
    strategyTemplateId: 'strat-limbo-multi-target-sniper',
  },
  {
    id: 'profile-ultra-safe',
    name: 'Bouclier Anti-Perte (Capital Shield 1.33x - 1.98x)',
    badge: 'LE PLUS SÛR',
    icon: '🛡️',
    game: 'dice',
    multiplier: 1.98,
    risk: 'ultra-safe',
    riskLabel: 'Risque Très Faible',
    riskColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30',
    description: 'Objectif de sécurisation maximale. Jamais de multiplication brutale sur défaite. Chaque cycle vise un gain net régulier sans exposer votre bankroll.',
    howItWorks: 'Mise minimale constante sur perte (+0%). Augmente très légèrement sur victoire pour clore le cycle positif (Méthode Oscar\'s Grind).',
    recommendedBankrollPct: 0.1,
    defaultTakeProfit: 5.0,
    defaultStopLoss: 10.0,
    baseMultiplier: 1.98,
    onWin: 'increase_fixed',
    onLoss: 'constant',
    strategyTemplateId: 'strat-dice-oscars-grind',
  },
  {
    id: 'profile-steady-growth',
    name: 'Croissance Équilibrée (Smart D\'Alembert)',
    badge: 'POPULAIRE',
    icon: '⚖️',
    game: 'dice',
    multiplier: 2.05,
    risk: 'balanced',
    riskLabel: 'Risque Modéré',
    riskColor: 'text-blue-400 bg-blue-950/80 border-blue-500/30',
    description: 'Ajustement arithmétique linéaire (+1 unité sur perte, -1 unité sur gain). Permet de sortir gagnant même avec moins de 50% de victoires.',
    howItWorks: 'Progression linéaire douce : compense les défaites sans jamais doubler de manière exponentielle.',
    recommendedBankrollPct: 0.2,
    defaultTakeProfit: 8.0,
    defaultStopLoss: 15.0,
    baseMultiplier: 2.05,
    onWin: 'reset',
    onLoss: 'd_alembert',
    strategyTemplateId: 'strat-dice-dalembert',
  },
  {
    id: 'profile-limbo-surge',
    name: 'Chasseur de Multiplicateurs (Limbo 4.5x - 10x)',
    badge: 'RENDEMENT ASYMÉTRIQUE',
    icon: '🚀',
    game: 'limbo',
    multiplier: 5.0,
    risk: 'aggressive',
    riskLabel: 'Volatilité Élevée',
    riskColor: 'text-amber-400 bg-amber-950/80 border-amber-500/30',
    description: 'Micro-mises répétées ciblant un gros coefficient (5.00x). Un seul succès rapporte +4x la mise nette et absorbe instantanément plusieurs tours perdants.',
    howItWorks: 'Mises ultra-légères. Dès que le coefficient 5x tombe, le profit net bondit immédiatement.',
    recommendedBankrollPct: 0.05,
    defaultTakeProfit: 12.0,
    defaultStopLoss: 20.0,
    baseMultiplier: 5.0,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-limbo-moonshot-50x',
  },
  {
    id: 'profile-mines-radar',
    name: 'Démineur Radar (Mines 3 Mines / 2 Hits)',
    badge: 'GAIN CONSTANT',
    icon: '💎',
    game: 'mines',
    multiplier: 1.38,
    risk: 'ultra-safe',
    riskLabel: 'Risque Faible',
    riskColor: 'text-teal-400 bg-teal-950/80 border-teal-500/30',
    description: 'Grille 3 mines, encaissement automatique strict dès 2 diamants révélés (cote 1.38x, ~75% de réussite). Idéal pour accumuler des gains réguliers.',
    howItWorks: 'Le bot simule la sélection de 2 cases sûres et valide l\'encaissement sans risquer de sur-découverte.',
    recommendedBankrollPct: 0.25,
    defaultTakeProfit: 6.0,
    defaultStopLoss: 12.0,
    baseMultiplier: 1.38,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-mines-1mine-safe-hunter',
  },
  {
    id: 'profile-extreme-moonshot',
    name: 'Chasseur Moonshot Extrême (1 000x - 10 000x)',
    badge: 'MÉGA JACKPOT',
    icon: '💥',
    game: 'auto',
    multiplier: 5000.0,
    risk: 'aggressive',
    riskLabel: 'Risque Extrême (0.01% - 0.05% Solde)',
    riskColor: 'text-rose-400 bg-rose-950/90 border-rose-500/50',
    description: 'Chasse les multiplicateurs cosmiques (1 000x, 2 500x, 5 000x, 9 900x, 10 000x) en permutant aléatoirement entre tous les originaux Stake (Dice, Limbo, Plinko, Mines, Crash). Gestion de mise stochastique (0.01% à 0.05% du solde) selon la dynamique de session.',
    howItWorks: 'L\'algorithme tire aléatoirement un original Stake et une cible astronomique à chaque micro-cycle, en modulant la mise entre 0.01% et 0.05% du capital selon le déroulement.',
    recommendedBankrollPct: 0.025,
    defaultTakeProfit: 200.0,
    defaultStopLoss: 10.0,
    baseMultiplier: 5000.0,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-extreme-multi-original-random-10000x',
  },
  {
    id: 'profile-martingale-bounded',
    name: 'Martingale Bornée Sécurisée (Max 4-5 Paliers)',
    badge: 'DOUBLEMENT CONTRÔLÉ',
    icon: '📈',
    game: 'dice',
    multiplier: 2.0,
    risk: 'balanced',
    riskLabel: 'Martingale Max 4 Paliers (0.1 ➔ 1.6 Max)',
    riskColor: 'text-amber-400 bg-amber-950/80 border-amber-500/30',
    description: "Autorise le doublement sur perte (+100%) avec un verrouillage rigide à 4 augmentations maximum (ex: 0.1 ➔ 0.2 ➔ 0.4 ➔ 0.8 ➔ 1.6 max). En cas de 5ème perte consécutive, retour immédiat à 0.1 pour éliminer tout risque d'emballement géométrique ou de ruine.",
    howItWorks: 'Double la mise à chaque défaite jusqu\'au 4ème palier. Dès qu\'une victoire est décrochée ou que le 4ème palier est dépassé, la mise est automatiquement réinitialisée à sa base.',
    recommendedBankrollPct: 0.1,
    defaultTakeProfit: 10.0,
    defaultStopLoss: 20.0,
    baseMultiplier: 2.0,
    onWin: 'reset',
    onLoss: 'martingale_soft',
    strategyTemplateId: 'strat-dice-bounded-martingale-4steps',
  },
  {
    id: 'profile-extreme-plinko-16rows-10000x',
    name: 'Plinko Extrême 16 Rangées (10 000x)',
    badge: 'PLINKO 10 000X',
    icon: '🔴',
    game: 'plinko',
    multiplier: 10000.0,
    risk: 'aggressive',
    riskLabel: 'Plinko 16R Extrême (0.01% - 0.05%)',
    riskColor: 'text-amber-400 bg-amber-950/90 border-amber-500/50',
    description: 'Plinko 16 Rangées en Mode Extrême ciblant exclusivement les poches latérales extérieures à 10 000.0x. Mise stochastique de 0.01% à 0.05% du solde pour absorber des milliers de descentes.',
    howItWorks: 'Tirs de micro-billes en rafale vers les bordures extérieures à multiplicateur 10 000x.',
    recommendedBankrollPct: 0.02,
    defaultTakeProfit: 500.0,
    defaultStopLoss: 10.0,
    baseMultiplier: 10000.0,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-extreme-plinko-16rows-10000x',
  },
  {
    id: 'profile-extreme-plinko-15rows-5000x',
    name: 'Plinko Extrême 15 Rangées (5 000x)',
    badge: 'PLINKO 5 000X',
    icon: '🟠',
    game: 'plinko',
    multiplier: 5000.0,
    risk: 'aggressive',
    riskLabel: 'Plinko 15R Extrême (0.01% - 0.05%)',
    riskColor: 'text-orange-400 bg-orange-950/90 border-orange-500/50',
    description: 'Plinko 15 Rangées en Mode Extrême ciblant les poches latérales extérieures à 5 000.0x avec fréquence de capture 2x supérieure. Mise dynamique de 0.01% à 0.05%.',
    howItWorks: 'Parcours de 15 rangées à dispersion extrême ciblant le multiplicateur 5 000x.',
    recommendedBankrollPct: 0.03,
    defaultTakeProfit: 250.0,
    defaultStopLoss: 10.0,
    baseMultiplier: 5000.0,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-extreme-plinko-15rows-5000x',
  },
  {
    id: 'profile-vip-wager',
    name: 'Farming VIP & Volume (Plinko / Dice Low Risk)',
    badge: 'VOLUME / WAGER',
    icon: '🚜',
    game: 'plinko',
    multiplier: 1.10,
    risk: 'vip-wager',
    riskLabel: 'Spécial VIP & Rakeback',
    riskColor: 'text-purple-400 bg-purple-950/80 border-purple-500/30',
    description: 'Génère un volume de mise élevé pour monter les niveaux VIP Stake (Bronze, Silver, Gold, Platine) en minimisant la perte théorique.',
    howItWorks: 'Micro-mises continues en risque bas pour accumuler de l\'XP et débloquer les bonus Stake sans griller le capital.',
    recommendedBankrollPct: 0.08,
    defaultTakeProfit: 10.0,
    defaultStopLoss: 15.0,
    baseMultiplier: 1.10,
    onWin: 'reset',
    onLoss: 'constant',
    strategyTemplateId: 'strat-plinko-16rows-low-vip',
  },
];

export const AiStakeAutoPilot: React.FC<AiStakeAutoPilotProps> = ({
  strategy,
  balance,
  currency,
  currentBetAmount,
  isAutobetting,
  onStartAutoBet,
  onStopAutoBet,
  onExecuteSingleBet,
  onExecuteBatchBets,
  lastBet,
  currentStreak,
  betSpeedMs,
  setBetSpeedMs,
  stopReason,
  sessionProfit,
  bets = [],
  stats,
  onClearHistory,
  onUpdateStrategy,
  onSelectStrategy,
  credentials,
  onOpenStakeApiModal,
  onUpdateWallet,
  onRotateSeed,
  licenseState,
  onOpenLicenseModal,
}) => {
  const { t } = useTranslation();
  const currencyInfo = getCurrencyInfo(currency);

  // Profile & View selection
  const [selectedProfileId, setSelectedProfileId] = useState<string>('profile-autonomous-brain');
  const [activeSubTab, setActiveSubTab] = useState<'pilot' | 'smart-strategies'>('pilot');
  const [isSimplifiedMode, setIsSimplifiedMode] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'chart' | 'history' | 'thoughts'>('chart');
  const [showAllProfiles, setShowAllProfiles] = useState<boolean>(false);
  const [showAdvancedTelemetry, setShowAdvancedTelemetry] = useState<boolean>(false);
  const [showAdvancedSafety, setShowAdvancedSafety] = useState<boolean>(false);

  // Autonomous Engine Configuration & State
  const [autonomousConfig, setAutonomousConfig] = useState<AutonomousEngineConfig>(() => ({
    ...DEFAULT_AUTONOMOUS_CONFIG,
    targetProfit: strategy.stopOnProfit || 10.0,
    stopLoss: strategy.stopOnLoss || 20.0,
  }));

  const [showAutonomySettings, setShowAutonomySettings] = useState<boolean>(false);
  const [showGeminiAuditModal, setShowGeminiAuditModal] = useState<boolean>(false);
  const [isBayesianAutoTuning, setIsBayesianAutoTuning] = useState<boolean>(false);

  // Apply Bayesian Optimal Settings to active strategy
  const handleApplyBayesianSettings = (optimalMultiplier: number, optimalBetAmount: number) => {
    setBaseBetInput(optimalBetAmount);
    if (onUpdateStrategy) {
      onUpdateStrategy({
        targetMultiplier: optimalMultiplier,
        baseBet: optimalBetAmount,
        winChance: 99 / optimalMultiplier
      });
    }
  };

  // Simple Controls
  const [baseBetInput, setBaseBetInput] = useState<number>(() => {
    return Math.max(0.01, Number((balance * 0.001).toFixed(4))) || 0.10;
  });
  const [takeProfitInput, setTakeProfitInput] = useState<number>(() => strategy.stopOnProfit || 10.0);
  const [stopLossInput, setStopLossInput] = useState<number>(() => strategy.stopOnLoss || 20.0);
  const [autoVaultSweep, setAutoVaultSweep] = useState<boolean>(Boolean(strategy.autoVaultWithdraw?.enabled));
  const [autoVaultThreshold, setAutoVaultThreshold] = useState<number>(() => strategy.autoVaultWithdraw?.threshold || 50.0);

  // Peak session profit derived directly from stats and session profit to prevent effect loops
  const peakSessionProfit = Math.max(0, stats?.peakProfit || 0, sessionProfit);
  const lastRotatedTimeRef = useRef<number>(0);
  const lastProcessedBetCountRef = useRef<number>(0);

  // Gemini AI Live Advisor State
  const [isConsultingGemini, setIsConsultingGemini] = useState<boolean>(false);
  const [geminiDecisionData, setGeminiDecisionData] = useState<any>(null);
  const [autonomousThoughtLog, setAutonomousThoughtLog] = useState<Array<{
    id: string;
    timestamp: number;
    regime: string;
    action: string;
    game: string;
    multiplier: number;
    betAmount: number;
    reasoning: string;
  }>>([]);

  // Compute live real-time autonomous decision using the quantitative brain
  const liveAutonomousDecision: AutonomousDecision = useMemo(() => {
    return computeAutonomousDecision(
      {
        ...autonomousConfig,
        targetProfit: takeProfitInput,
        stopLoss: stopLossInput,
      },
      strategy,
      bets || [],
      stats,
      sessionProfit,
      peakSessionProfit,
      currentStreak,
      balance,
      currency
    );
  }, [
    autonomousConfig,
    takeProfitInput,
    stopLossInput,
    strategy,
    bets,
    stats,
    sessionProfit,
    peakSessionProfit,
    currentStreak,
    balance,
    currency
  ]);

  // Log autonomous thought changes & handle throttled seed rotation during active play
  useEffect(() => {
    if (selectedProfileId === 'profile-autonomous-brain' && liveAutonomousDecision) {
      setAutonomousThoughtLog((prev) => {
        const last = prev[0];
        if (last && last.regime === liveAutonomousDecision.regimeLabel && last.game === liveAutonomousDecision.chosenGame && last.multiplier === liveAutonomousDecision.chosenMultiplier) {
          return prev;
        }
        return [
          {
            id: `thought-${Date.now()}`,
            timestamp: Date.now(),
            regime: liveAutonomousDecision.regimeLabel,
            action: liveAutonomousDecision.actionType,
            game: liveAutonomousDecision.chosenGame,
            multiplier: liveAutonomousDecision.chosenMultiplier,
            betAmount: liveAutonomousDecision.calculatedBetAmount,
            reasoning: liveAutonomousDecision.reasoning,
          },
          ...prev.slice(0, 24),
        ];
      });

      // If seed rotation is advised on turbulence, trigger it ONLY once per bet progress and with cooldown
      const now = Date.now();
      const currentBetsCount = bets?.length || 0;
      if (
        isAutobetting &&
        liveAutonomousDecision.seedRotationAdvised && 
        onRotateSeed && 
        currentBetsCount !== lastProcessedBetCountRef.current &&
        now - lastRotatedTimeRef.current > 15000
      ) {
        lastRotatedTimeRef.current = now;
        lastProcessedBetCountRef.current = currentBetsCount;
        onRotateSeed();
      }
    }
  }, [
    selectedProfileId,
    liveAutonomousDecision.regimeLabel,
    liveAutonomousDecision.chosenGame,
    liveAutonomousDecision.chosenMultiplier,
    liveAutonomousDecision.actionType,
    liveAutonomousDecision.calculatedBetAmount,
    liveAutonomousDecision.reasoning,
    liveAutonomousDecision.seedRotationAdvised,
    isAutobetting,
    bets?.length,
    onRotateSeed,
  ]);

  // Automated Hit & Run Profit Lock Guardian (Advisory only - does not kill continuous auto-betting loop)
  // Continuous execution runs uninterrupted until user's defined Take-Profit or Stop-Loss is achieved.

  // Dynamically mutate strategy during active play in 100% Autonomous Brain Mode
  useEffect(() => {
    if (
      isAutobetting &&
      selectedProfileId === 'profile-autonomous-brain' &&
      liveAutonomousDecision &&
      onSelectStrategy
    ) {
      const targetStratId = liveAutonomousDecision.chosenStrategyId;
      const targetGame = liveAutonomousDecision.chosenGame as any;
      const targetMult = liveAutonomousDecision.chosenMultiplier;
      const targetBet = liveAutonomousDecision.calculatedBetAmount || baseBetInput;

      // Detect if game, multiplier, base bet, or strategy template changed according to live AI reasoning
      const hasStrategyShifted =
        strategy.game !== targetGame ||
        Math.abs((strategy.targetMultiplier || 2) - targetMult) > 0.001 ||
        strategy.id !== targetStratId ||
        Math.abs((strategy.baseBet || 0) - targetBet) > 0.0001;

      if (hasStrategyShifted) {
        const foundTemplate =
          PREDEFINED_STRATEGIES.find((s) => s.id === targetStratId) || PREDEFINED_STRATEGIES[0];

        onSelectStrategy({
          ...foundTemplate,
          id: targetStratId,
          isAutonomousBrain: true,
          autonomousConfig,
          name: `IA Autonome - ${liveAutonomousDecision.strategyName}`,
          game: targetGame,
          targetMultiplier: targetMult,
          winChance: liveAutonomousDecision.chosenWinChance,
          gameConfig: liveAutonomousDecision.gameConfig || foundTemplate.gameConfig,
          baseBet: targetBet,
          stopOnProfit: takeProfitInput > 0 ? takeProfitInput : undefined,
          stopOnLoss: stopLossInput > 0 ? stopLossInput : undefined,
          maxMartingaleIncreases: autonomousConfig.maxMartingaleIncreases || 4,
          martingaleMultiplier: autonomousConfig.martingaleMultiplier || 2.0,
          maxConsecutiveLosses: undefined, // Continuous execution: let AI handle variance recovery
          trailingStopLoss: undefined,
          maxDrawdownLimit: undefined,
          currency,
          autoVaultWithdraw: autoVaultSweep
            ? {
                enabled: true,
                threshold: autoVaultThreshold,
                keepBalance: autoVaultThreshold - 5,
              }
            : undefined,
        });
      }
    }
  }, [
    isAutobetting,
    selectedProfileId,
    liveAutonomousDecision?.chosenStrategyId,
    liveAutonomousDecision?.chosenGame,
    liveAutonomousDecision?.chosenMultiplier,
    liveAutonomousDecision?.strategyName,
    liveAutonomousDecision?.calculatedBetAmount,
    strategy.game,
    strategy.targetMultiplier,
    strategy.id,
    onSelectStrategy,
    baseBetInput,
    takeProfitInput,
    stopLossInput,
    currency,
    autoVaultSweep,
    autoVaultThreshold,
  ]);

  // Speed level (Calibrated for precision, Bayesian convergence & capital protection)
  const [speedLevel, setSpeedLevel] = useState<'safe' | 'normal' | 'fast'>('safe');

  const handleSpeedChange = (level: 'safe' | 'normal' | 'fast') => {
    setSpeedLevel(level);
    if (level === 'safe') setBetSpeedMs(1800); // 1.8s : Rythme réfléchi & précis pour calcul optimal et convergence bayésienne
    else if (level === 'normal') setBetSpeedMs(1200); // 1.2s : Rythme posé & équilibré
    else if (level === 'fast') setBetSpeedMs(700); // 700ms : Rythme standard fluide
  };

  // Sync inputs when profile changes
  const handleSelectProfile = (profile: AiBotProfile) => {
    setSelectedProfileId(profile.id);

    if (profile.id === 'profile-autonomous-brain') {
      const suggestedBet = liveAutonomousDecision.calculatedBetAmount || Math.max(
        0.01,
        Number(((balance * 0.001)).toFixed(4))
      );
      setBaseBetInput(suggestedBet);
      setTakeProfitInput(profile.defaultTakeProfit);
      setStopLossInput(profile.defaultStopLoss);

      // Apply initial autonomous strategy
      const foundStrat = PREDEFINED_STRATEGIES.find((s) => s.id === liveAutonomousDecision.chosenStrategyId) || PREDEFINED_STRATEGIES[0];
      if (onSelectStrategy) {
        onSelectStrategy({
          ...foundStrat,
          game: liveAutonomousDecision.chosenGame as any,
          targetMultiplier: liveAutonomousDecision.chosenMultiplier,
          baseBet: suggestedBet,
          stopOnProfit: profile.defaultTakeProfit,
          stopOnLoss: profile.defaultStopLoss,
          maxMartingaleIncreases: autonomousConfig.maxMartingaleIncreases || 4,
          martingaleMultiplier: autonomousConfig.martingaleMultiplier || 2.0,
          maxConsecutiveLosses: undefined,
          trailingStopLoss: undefined,
          maxDrawdownLimit: undefined,
          currency,
        });
      }
      return;
    }

    // Preset profile chosen
    const suggestedBet = Math.max(
      0.01,
      Number(((balance * (profile.recommendedBankrollPct / 100))).toFixed(4))
    );

    setBaseBetInput(suggestedBet);
    setTakeProfitInput(profile.defaultTakeProfit);
    setStopLossInput(profile.defaultStopLoss);

    const onWinAction: 'reset' | 'increase_fixed' | 'increase_pct' = profile.onWin;
    let onLossAction: 'multiply' | 'increase_fixed' | 'increase_pct' | 'reset' | 'fibonacci' | 'custom' = 'multiply';
    let onLossValue = 2.0;
    let onWinValue = 0;

    if (profile.onLoss === 'd_alembert') {
      onLossAction = 'increase_fixed';
      onLossValue = Number((suggestedBet * 0.5).toFixed(4)) || 0.1;
      onWinValue = Number((suggestedBet * 0.5).toFixed(4)) || 0.1;
    } else if (profile.onLoss === 'martingale_soft') {
      onLossAction = 'multiply';
      onLossValue = 2.0;
    } else if (profile.onLoss === 'constant') {
      onLossAction = 'custom';
      onLossValue = 0;
    } else if (profile.onLoss === 'step_rebound') {
      onLossAction = 'increase_pct';
      onLossValue = 50;
    }

    if (onSelectStrategy && profile.strategyTemplateId) {
      const foundStrat = PREDEFINED_STRATEGIES.find((s) => s.id === profile.strategyTemplateId);
      if (foundStrat) {
        onSelectStrategy({
          ...foundStrat,
          baseBet: suggestedBet,
          stopOnProfit: profile.defaultTakeProfit,
          stopOnLoss: profile.defaultStopLoss,
          onWinAction: foundStrat.onWinAction || onWinAction,
          onLossAction: foundStrat.onLossAction || onLossAction,
          onLossValue: foundStrat.onLossValue || onLossValue,
          onWinValue: foundStrat.onWinValue || onWinValue,
          maxMartingaleIncreases: foundStrat.maxMartingaleIncreases || autonomousConfig.maxMartingaleIncreases || 4,
          martingaleMultiplier: foundStrat.martingaleMultiplier || 2.0,
          maxConsecutiveLosses: undefined,
          trailingStopLoss: undefined,
          maxDrawdownLimit: undefined,
          currency,
        });
        return;
      }
    }

    if (onUpdateStrategy) {
      onUpdateStrategy({
        name: `Bot IA - ${profile.name}`,
        game: profile.game as any,
        targetMultiplier: profile.baseMultiplier,
        baseBet: suggestedBet,
        stopOnProfit: profile.defaultTakeProfit,
        stopOnLoss: profile.defaultStopLoss,
        onWinAction,
        onLossAction,
        onLossValue,
        onWinValue,
        maxMartingaleIncreases: autonomousConfig.maxMartingaleIncreases || 4,
        martingaleMultiplier: autonomousConfig.martingaleMultiplier || 2.0,
        maxConsecutiveLosses: undefined,
        trailingStopLoss: undefined,
        maxDrawdownLimit: undefined,
        currency,
      });
    }
  };

  // Quick calculate base bet as % of balance
  const handleApplyBankrollPct = (pct: number) => {
    const calculated = Math.max(0.01, Number(((balance * pct) / 100).toFixed(4)));
    setBaseBetInput(calculated);
    setAutonomousConfig((prev) => ({ ...prev, baseBankrollPct: pct }));
    if (onUpdateStrategy) {
      onUpdateStrategy({ baseBet: calculated });
    }
  };

  // Apply inputs to current strategy
  const applySettingsToStrategy = () => {
    if (selectedProfileId === 'profile-autonomous-brain') {
      const chosenStratTemplate = PREDEFINED_STRATEGIES.find(
        (s) => s.id === liveAutonomousDecision.chosenStrategyId
      ) || PREDEFINED_STRATEGIES[0];

      if (onSelectStrategy) {
        onSelectStrategy({
          ...chosenStratTemplate,
          id: 'strat-autonomous-brain',
          isAutonomousBrain: true,
          autonomousConfig,
          name: `IA Autonome - ${liveAutonomousDecision.strategyName}`,
          game: liveAutonomousDecision.chosenGame as any,
          targetMultiplier: liveAutonomousDecision.chosenMultiplier,
          winChance: liveAutonomousDecision.chosenWinChance,
          gameConfig: liveAutonomousDecision.gameConfig || chosenStratTemplate.gameConfig,
          baseBet: liveAutonomousDecision.calculatedBetAmount || baseBetInput,
          stopOnProfit: takeProfitInput > 0 ? takeProfitInput : undefined,
          stopOnLoss: stopLossInput > 0 ? stopLossInput : undefined,
          maxMartingaleIncreases: autonomousConfig.maxMartingaleIncreases || 4,
          martingaleMultiplier: autonomousConfig.martingaleMultiplier || 2.0,
          maxConsecutiveLosses: undefined,
          trailingStopLoss: undefined,
          maxDrawdownLimit: undefined,
          currency,
          autoVaultWithdraw: autoVaultSweep ? {
            enabled: true,
            threshold: autoVaultThreshold,
            keepBalance: autoVaultThreshold - 5,
          } : undefined,
        });
      }
      return;
    }

    if (onUpdateStrategy) {
      onUpdateStrategy({
        baseBet: baseBetInput,
        stopOnProfit: takeProfitInput > 0 ? takeProfitInput : undefined,
        stopOnLoss: stopLossInput > 0 ? stopLossInput : undefined,
        maxConsecutiveLosses: undefined,
        trailingStopLoss: undefined,
        maxDrawdownLimit: undefined,
        autoVaultWithdraw: autoVaultSweep ? {
          enabled: true,
          threshold: autoVaultThreshold,
          keepBalance: autoVaultThreshold - 5,
        } : undefined,
      });
    }
  };

  // Start Autobet with validation
  const handleStartBotWithValidation = () => {
    if (selectedProfileId === 'profile-autonomous-brain' && !licenseState?.isPro) {
      onOpenLicenseModal?.();
      return;
    }
    if (!licenseState?.isPro && (licenseState?.freeDailyBetsRemaining ?? 0) <= 0) {
      onOpenLicenseModal?.();
      return;
    }
    applySettingsToStrategy();
    onStartAutoBet();
  };

  // Deep Gemini Autonomous Strategy Decision Consultation
  const handleConsultGemini = async () => {
    setIsConsultingGemini(true);
    setShowGeminiAuditModal(true);
    try {
      const res = await fetch('/api/gemini/autonomous-strategy-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStrategy: {
            ...strategy,
            baseBet: baseBetInput,
            currency,
          },
          recentBets: bets.slice(0, 25),
          stats,
          currentBalance: balance,
          currency,
          sessionProfit,
          peakSessionProfit,
          currentStreak,
          autonomyConfig: {
            ...autonomousConfig,
            targetProfit: takeProfitInput,
            stopLoss: stopLossInput,
          },
        }),
      });

      const data = await res.json();
      if (data && data.regime) {
        setGeminiDecisionData(data);
      }
    } catch (err) {
      console.warn('Error contacting Gemini autonomous endpoint:', err);
    } finally {
      setIsConsultingGemini(false);
    }
  };

  const isLive = Boolean(credentials.isLiveMode && credentials.apiKey);
  const isAutonomousActive = selectedProfileId === 'profile-autonomous-brain';

  // Localized AI Bot Profiles
  const localizedProfiles: AiBotProfile[] = useMemo(() => {
    return AI_BOT_PROFILES.map((p) => {
      let profileKey = '';
      if (p.id === 'profile-autonomous-brain') profileKey = 'autonomous';
      else if (p.id === 'profile-ultra-safe') profileKey = 'ultraSafe';
      else if (p.id === 'profile-steady-growth') profileKey = 'steadyGrowth';
      else if (p.id === 'profile-limbo-surge') profileKey = 'limboHunter';
      else if (p.id === 'profile-mines-radar') profileKey = 'minesRadar';
      else if (p.id === 'profile-extreme-moonshot') profileKey = 'extremeMoonshot';
      else if (p.id === 'profile-extreme-plinko-16rows-10000x') profileKey = 'plinko16Rows';
      else if (p.id === 'profile-vip-wager') profileKey = 'vipWager';

      if (!profileKey) return p;

      const name = t(`aiBotPage.profiles.${profileKey}.name`) || p.name;
      const badge = t(`aiBotPage.profiles.${profileKey}.badge`) || p.badge;
      const riskLabel = t(`aiBotPage.profiles.${profileKey}.riskLabel`) || p.riskLabel;
      const description = t(`aiBotPage.profiles.${profileKey}.desc`) || p.description;
      const howItWorks = t(`aiBotPage.profiles.${profileKey}.how`) || p.howItWorks;

      return {
        ...p,
        name: name !== `aiBotPage.profiles.${profileKey}.name` ? name : p.name,
        badge: badge !== `aiBotPage.profiles.${profileKey}.badge` ? badge : p.badge,
        riskLabel: riskLabel !== `aiBotPage.profiles.${profileKey}.riskLabel` ? riskLabel : p.riskLabel,
        description: description !== `aiBotPage.profiles.${profileKey}.desc` ? description : p.description,
        howItWorks: howItWorks !== `aiBotPage.profiles.${profileKey}.how` ? howItWorks : p.howItWorks,
      };
    });
  }, [t]);

  const activeProfile = localizedProfiles.find((p) => p.id === selectedProfileId) || localizedProfiles[0];

  // Win/Loss Breakdown stats
  const totalBetsCount = stats?.totalBets || bets.length || 0;
  const totalWinsCount = stats?.totalWon || bets.filter((b) => b.won).length || 0;
  const totalLossesCount = stats?.totalLost || bets.filter((b) => !b.won).length || 0;
  const winRate = totalBetsCount > 0 ? Number(((totalWinsCount / totalBetsCount) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300" id="ai-stake-autopilot-container">
      
      {/* TOP HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 p-5 sm:p-7 shadow-xl shadow-black/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 text-xs font-black tracking-wider uppercase">
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                {t('aiBotPage.heroTag')}
              </span>

              {isLive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  <span>🟢</span>
                  <span>{t('aiBotPage.liveStakeConnected')} ({credentials.domain || 'stake.com'})</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{t('aiBotPage.heroTitle')}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {t('aiBotPage.heroDesc')}
            </p>
          </div>

          {/* Real Mode & Gemini Deep Audit Action */}
          <div className="flex items-center gap-2.5 self-start md:self-center flex-shrink-0">
            <button
              type="button"
              onClick={handleConsultGemini}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-850 hover:to-purple-850 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('aiBotPage.geminiDeepAudit')}</span>
            </button>

            {onOpenStakeApiModal && (
              <button
                type="button"
                onClick={onOpenStakeApiModal}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>{isLive ? t('aiBotPage.manageApiKey') : t('aiBotPage.realStakeMode')}</span>
              </button>
            )}
          </div>
        </div>

        {/* LIVE STATUS BAR / PULSE */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Status Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('aiBotPage.botStatus')}</span>
            <div className="flex items-center gap-2 mt-1">
              {isAutobetting ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400">{t('aiBotPage.running')}</span>
                </>
              ) : stopReason ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-300 truncate" title={stopReason}>
                    {stopReason}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-xs font-bold text-slate-400">{t('aiBotPage.idle')}</span>
                </>
              )}
            </div>
          </div>

          {/* Balance Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isLive && <span className="text-xs">🟢</span>}
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {isLive ? t('header.realBalance', 'Solde Réel') : t('header.balance', 'Balance')}
                </span>
              </div>
              <Wallet className="w-3 h-3 text-slate-500" />
            </div>
            <div className="mt-1 font-mono font-bold text-sm sm:text-base text-white">
              {balance.toFixed(2)} <span className="text-xs text-amber-400">{currency}</span>
            </div>
          </div>

          {/* Session Profit Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('aiBotPage.sessionProfit')}</span>
              {sessionProfit >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              )}
            </div>
            <div className={`mt-1 font-mono font-bold text-sm sm:text-base ${
              sessionProfit > 0 ? 'text-emerald-400' : sessionProfit < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toFixed(2)} <span className="text-xs">{currency}</span>
            </div>
          </div>

          {/* Win Rate & Total Bets */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('aiBotPage.winRate')}</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono font-bold text-sm sm:text-base text-white">{winRate}%</span>
              <span className="text-[11px] text-slate-400 font-mono">({totalBetsCount} {t('aiBotPage.rounds')})</span>
            </div>
          </div>

        </div>
      </div>

      {/* SUB-VIEW SELECTOR: PILOTE AUTOMATIQUE VS PANEL STRATÉGIES INTELLIGENTES */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('pilot')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'pilot'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t('aiBotPage.tabPilot')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('smart-strategies')}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'smart-strategies'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t('aiBotPage.tabSmartStrategies')}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30">
              {t('aiBotPage.advancedBadge')}
            </span>
          </button>
        </div>

        {activeSubTab === 'pilot' ? (
          <div className="flex items-center justify-end gap-1.5 self-end sm:self-center border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => setIsSimplifiedMode(!isSimplifiedMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                isSimplifiedMode
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
              }`}
            >
              {isSimplifiedMode ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mode Épuré</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mode Détaillé</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveSubTab('pilot')}
            className="hidden sm:flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 px-3 py-1 font-semibold transition cursor-pointer"
          >
            <span>{t('aiBotPage.backToPilot')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {activeSubTab === 'smart-strategies' ? (
        <SmartStrategyPanel
          currentStrategy={strategy}
          balance={balance}
          currency={currency}
          onSelectStrategy={(newStrat) => {
            onSelectStrategy(newStrat);
            setActiveSubTab('pilot');
          }}
          onStartAutoBet={onStartAutoBet}
          isAutobetting={isAutobetting}
        />
      ) : (
        <>
          {/* AUTONOMOUS BRAIN STATUS BANNER (When Autonomous Mode is selected) */}
      {isAutonomousActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border border-indigo-500/40 shadow-lg relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
                <Brain className="w-6 h-6 animate-pulse text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('aiBotPage.regimeTitle')}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${liveAutonomousDecision.regimeColor}`}>
                    {liveAutonomousDecision.regimeLabel}
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-mono border border-slate-700 flex items-center gap-1.5">
                    {t('aiBotPage.recommendedGame')} <strong className="text-amber-300 uppercase">{liveAutonomousDecision.chosenGame}</strong>
                    <span className="text-emerald-400 font-bold">({liveAutonomousDecision.chosenWinChance?.toFixed(1) || (99 / liveAutonomousDecision.chosenMultiplier).toFixed(1)}% Win)</span>
                    <span className="text-amber-300">@{liveAutonomousDecision.chosenMultiplier.toFixed(2)}x</span>
                  </span>
                  {liveAutonomousDecision.isBarbellSnipeActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-900/90 border border-purple-400 text-purple-200 animate-pulse flex items-center gap-1">
                      <span>🏹 BARBELL SNIPER (0.02% Risque)</span>
                    </span>
                  )}
                  {liveAutonomousDecision.markovMatrix && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-900 border border-slate-700 text-cyan-300 flex items-center gap-1">
                      <span>{liveAutonomousDecision.markovMatrix.regimeLabel}</span>
                      <span className="text-slate-400">P(W|W): {(liveAutonomousDecision.markovMatrix.pWinAfterWin * 100).toFixed(0)}%</span>
                    </span>
                  )}
                </div>

                {liveAutonomousDecision.gameSwitchReason && (
                  <div className="mt-1.5 py-1 px-2.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                    <span><strong className="text-amber-300">Pivot Stratégique :</strong> {liveAutonomousDecision.gameSwitchReason}</span>
                  </div>
                )}

                <div className="text-xs text-indigo-200/90 mt-1.5 leading-relaxed min-h-[44px] max-h-[44px] overflow-hidden flex items-center">
                  <p className="line-clamp-2 leading-tight">
                    <strong className="text-amber-300">💡 {t('aiBotPage.aiDecision')}</strong> {liveAutonomousDecision.reasoning}
                  </p>
                </div>
              </div>
            </div>

            {/* Health Meter, TP Probability & Config Button */}
            <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center flex-wrap">
              {liveAutonomousDecision.quantitativeMetrics && (
                <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 h-[44px] flex flex-col justify-center">
                  <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{t('aiBotPage.tpProbability')}</span>
                  </div>
                  <div className="text-sm font-mono font-black text-emerald-400">
                    {liveAutonomousDecision.quantitativeMetrics.probabilityReachingTakeProfit}%
                  </div>
                </div>
              )}

              <div className="text-right px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 h-[44px] flex flex-col justify-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">{t('aiBotPage.bankrollHealth')}</div>
                <div className="text-sm font-mono font-black text-amber-400">
                  {liveAutonomousDecision.bankrollHealthScore}/100
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedTelemetry(!showAdvancedTelemetry)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer h-[44px] ${
                  showAdvancedTelemetry || !isSimplifiedMode
                    ? 'bg-indigo-900/80 border-indigo-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showAdvancedTelemetry ? 'Masquer Détails' : 'Détails Télémétrie'}</span>
                {showAdvancedTelemetry ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Deep Telemetry & Multiplier Spectrum (Shown in Detailed Mode or when toggled) */}
          <AnimatePresence>
            {(showAdvancedTelemetry || !isSimplifiedMode) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3.5 pt-3.5 border-t border-indigo-500/20 space-y-3"
              >
                {/* REAL-TIME DYNAMIC MULTIPLIER SPECTRUM BAR (1.33x -> 7.77x) */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5 flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>Spectre Multiplicateur IA Dynamique :</span>
                      <span className="font-mono text-amber-300 font-black text-sm bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                        @{liveAutonomousDecision.chosenMultiplier.toFixed(2)}x
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        (Win Prob ~{(99 / liveAutonomousDecision.chosenMultiplier).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="text-emerald-400">Min: {autonomousConfig.minMultiplier || 1.33}x</span>
                      <span>•</span>
                      <span className="text-amber-400">Pivot: 2.00x</span>
                      <span>•</span>
                      <span className="text-rose-400">Max: {autonomousConfig.maxMultiplier || 7.77}x</span>
                    </div>
                  </div>

                  {/* Gradient Track with Active Cursor */}
                  <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 via-purple-500 to-amber-400 opacity-80" />
                    <motion.div
                      className="absolute top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_10px_#fff] border-2 border-slate-950 -ml-1.5"
                      initial={false}
                      animate={{
                        left: `${liveAutonomousDecision.multiplierSpectrumPct ?? Math.min(100, Math.max(0, ((liveAutonomousDecision.chosenMultiplier - (autonomousConfig.minMultiplier || 1.33)) / ((autonomousConfig.maxMultiplier || 7.77) - (autonomousConfig.minMultiplier || 1.33))) * 100))}%`
                      }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 font-mono">
                    <span className="text-emerald-400">🛡️ 1.33x (Bouclier ~74.4%)</span>
                    <span className="text-cyan-400">⚖️ 2.00x (Scalper ~49.5%)</span>
                    <span className="text-purple-400">🚀 4.44x (Surge ~22.3%)</span>
                    <span className="text-amber-300 font-bold">💎 7.77x (Pic Quantum ~12.7%)</span>
                  </div>

                  {/* LIVE MARTINGALE STATUS */}
                  {autonomousConfig.martingaleEnabled && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs min-h-[28px]">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-slate-300 text-[11px] shrink-0">Martingale Bornée :</span>
                        {liveAutonomousDecision.isMartingaleCapReached ? (
                          <span className="px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono font-bold text-[10px] truncate">
                            🛡️ Plafond {autonomousConfig.maxMartingaleIncreases || 4} Paliers Atteint ➔ Reset Sécurité ({baseBetInput.toFixed(2)} {currency})
                          </span>
                        ) : liveAutonomousDecision.martingaleStep && liveAutonomousDecision.martingaleStep > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300 font-mono font-bold text-[10px] animate-pulse truncate">
                            ⚡ Palier Actif {liveAutonomousDecision.martingaleStep} / {autonomousConfig.maxMartingaleIncreases || 4} (+100% : {liveAutonomousDecision.calculatedBetAmount.toFixed(4)} {currency})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[10px] truncate">
                            🟢 Base Stable ({baseBetInput.toFixed(2)} {currency}) • Plafond {autonomousConfig.maxMartingaleIncreases || 4} Paliers Max
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        Max {(baseBetInput * Math.pow(2, autonomousConfig.maxMartingaleIncreases || 4)).toFixed(2)} {currency}
                      </span>
                    </div>
                  )}

                  {/* LIVE DYNAMIC BET SIZING MODULATION */}
                  {autonomousConfig.dynamicBetSizingEnabled !== false && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs min-h-[28px]">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1 shrink-0">
                          🎯 Modulation IA Mise :
                        </span>
                        {liveAutonomousDecision.dynamicBetAdjustmentPct && liveAutonomousDecision.dynamicBetAdjustmentPct < 0 ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950/90 border border-blue-500/50 text-blue-300 font-mono font-bold text-[10px] truncate">
                            🛡️ {liveAutonomousDecision.dynamicBetAdjustmentPct}% ({liveAutonomousDecision.calculatedBetAmount.toFixed(4)} {currency}) • {liveAutonomousDecision.dynamicBetAdjustmentReason}
                          </span>
                        ) : liveAutonomousDecision.dynamicBetAdjustmentPct && liveAutonomousDecision.dynamicBetAdjustmentPct > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-[10px] animate-pulse truncate">
                            ⚡ +{liveAutonomousDecision.dynamicBetAdjustmentPct}% ({liveAutonomousDecision.calculatedBetAmount.toFixed(4)} {currency}) • {liveAutonomousDecision.dynamicBetAdjustmentReason}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono font-medium text-[10px] truncate">
                            ⚖️ 0% Variation ({liveAutonomousDecision.calculatedBetAmount.toFixed(4)} {currency}) • Base Stable
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        Base: {baseBetInput.toFixed(2)} {currency} ➔ Cible: {liveAutonomousDecision.calculatedBetAmount.toFixed(4)} {currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Real-Time Quantitative Gauges Bar */}
                {liveAutonomousDecision.quantitativeMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{t('aiBotPage.shannonEntropy')}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-black text-cyan-400">
                          {(liveAutonomousDecision.quantitativeMetrics.shannonEntropy * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          {liveAutonomousDecision.quantitativeMetrics.shannonEntropy >= 0.85 ? 'Dispersion Optimale' : 'Faible Dispersion'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{t('aiBotPage.runsTest')}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-xs font-mono font-black ${
                          Math.abs(liveAutonomousDecision.quantitativeMetrics.waldWolfowitzZScore) >= 1.96 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          Z = {liveAutonomousDecision.quantitativeMetrics.waldWolfowitzZScore.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          {liveAutonomousDecision.quantitativeMetrics.isClusteringDetected ? 'Séries Détectées' : 'Aléatoire Normal'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{t('aiBotPage.kellyFraction')}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-black text-amber-400">
                          {liveAutonomousDecision.quantitativeMetrics.dynamicKellyFraction.toFixed(3)}%
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          Amorti x{liveAutonomousDecision.quantitativeMetrics.volatilityDampener}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{t('aiBotPage.gameArbitrage')}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-black text-purple-400 uppercase">
                          {liveAutonomousDecision.quantitativeMetrics.bestFittedGame}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          Score {liveAutonomousDecision.quantitativeMetrics.quantumEfficiencyScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <span>🔒 Verrou Gain</span>
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className={`text-xs font-mono font-black ${
                          liveAutonomousDecision.quantitativeMetrics.ratchetLock.isLocked ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {liveAutonomousDecision.quantitativeMetrics.ratchetLock.isLocked
                            ? `+${liveAutonomousDecision.quantitativeMetrics.ratchetLock.lockedProfitFloor}`
                            : 'En veille'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          {liveAutonomousDecision.quantitativeMetrics.ratchetLock.isLocked
                            ? `${liveAutonomousDecision.quantitativeMetrics.ratchetLock.securedProfitPercent}% TP`
                            : 'Palier 0'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between h-[60px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <span>👑 Rakeback Net</span>
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-black text-amber-300">
                          +{liveAutonomousDecision.quantitativeMetrics.vipRakeback.instantRakebackEarned}
                        </span>
                        <span className="text-[9px] text-amber-500/80 font-medium truncate">
                          {liveAutonomousDecision.quantitativeMetrics.vipRakeback.currentVipTier}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Autonomy Customization Drawer */}
          <AnimatePresence>
            {showAutonomySettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-indigo-500/20 space-y-4"
              >
                {/* DYNAMIC MULTIPLIER BOUNDS CONFIG */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        Configuration Bornes Multiplicateur Dynamique (1.33x ➔ 7.77x)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Plage Active : <strong className="text-emerald-400">{autonomousConfig.minMultiplier || 1.33}x</strong> à <strong className="text-amber-400">{autonomousConfig.maxMultiplier || 7.77}x</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Multiplicateur Minimum (Bouclier) :
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          max="3.0"
                          value={autonomousConfig.minMultiplier ?? 1.33}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, minMultiplier: parseFloat(e.target.value) || 1.33 }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                        />
                        <span className="text-xs text-slate-400">x</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Multiplicateur Maximum (Pic Quantum) :
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="2.0"
                          max="100.0"
                          value={autonomousConfig.maxMultiplier ?? 7.77}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, maxMultiplier: parseFloat(e.target.value) || 7.77 }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold"
                        />
                        <span className="text-xs text-slate-400">x</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex flex-col justify-end">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                        Presets Rapides de Variation :
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setAutonomousConfig(prev => ({ ...prev, minMultiplier: 1.33, maxMultiplier: 7.77 }))}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer"
                        >
                          ⚡ 1.33x - 7.77x (Recommandé IA)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutonomousConfig(prev => ({ ...prev, minMultiplier: 1.20, maxMultiplier: 4.50 }))}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                        >
                          🛡️ 1.20x - 4.50x (Conservateur)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutonomousConfig(prev => ({ ...prev, minMultiplier: 1.50, maxMultiplier: 10.00 }))}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                        >
                          🚀 1.50x - 10.00x (Agressif)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {t('aiBotPage.riskAppetite')}
                    </label>
                    <select
                      value={autonomousConfig.riskAppetite}
                      onChange={(e) => setAutonomousConfig(prev => ({ ...prev, riskAppetite: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="conservative">{t('aiBotPage.riskConservative')}</option>
                      <option value="balanced">{t('aiBotPage.riskBalanced')}</option>
                      <option value="aggressive">{t('aiBotPage.riskAggressive')}</option>
                      <option value="extreme_moonshot">{t('aiBotPage.riskExtreme')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {t('aiBotPage.dynamicGameSwitch')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={autonomousConfig.allowGameSwitching}
                        onChange={(e) => setAutonomousConfig(prev => ({ ...prev, allowGameSwitching: e.target.checked }))}
                        className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-700"
                      />
                      <span>{t('aiBotPage.allowGameSwitch')}</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Rotation de Seed Provably Fair
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={autonomousConfig.autoRotateSeedOnAnomaly}
                        onChange={(e) => setAutonomousConfig(prev => ({ ...prev, autoRotateSeedOnAnomaly: e.target.checked }))}
                        className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-700"
                      />
                      <span>Changer de Seed si anomalie statistique (Z-Score)</span>
                    </label>
                  </div>
                </div>

                {/* ADVANCED QUANT BRAIN MODULES (Win Chance, Markov, Barbell, Game Hopping) */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        Intelligence Décisionnelle Avancée (Mises, Cotes & Multi-Jeux)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-950/80 border border-emerald-500/40">
                      Quant Engine v3.0 Actif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* High Win Chance Recovery Corridor */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>🛡️ Couloir Haute Certitude (75% - 85% Win)</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={autonomousConfig.highWinChanceRecoveryEnabled !== false}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, highWinChanceRecoveryEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Sur drawdown ou mauvaise passe, l'IA abaisse la cote cible à 1.16x - 1.32x (Win chance 75-85%) sur Dice ou Mines pour sécuriser et briser immédiatement la spirale négative.
                      </p>
                    </div>

                    {/* Markov Chain Momentum Modulation */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>🔥 Modulation Markovienne P(W|W)</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={autonomousConfig.markovMomentumEnabled !== false}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, markovMomentumEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Calcule la probabilité de transition conditionnelle : boost Kelly modéré (+35%) sur momentum de victoires et frein préventif (-35%) sur clustering de défaites.
                      </p>
                    </div>

                    {/* Barbell Multiplier Sniping */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>🏹 Sniper Asymétrique Barbell (10x - 25x)</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={autonomousConfig.barbellSnipingEnabled !== false}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, barbellSnipingEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-purple-500 bg-slate-950 border-slate-700"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        En session positive, déclenche ponctuellement un micro-tir sniper @10x-25x avec 0.02% du solde pour capter des gains asymétriques sans risque de perte de capital.
                      </p>
                    </div>

                    {/* Intelligent Game Hopping */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>🔄 Rotation Anti-Clustering de Jeux</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={autonomousConfig.intelligentGameHoppingEnabled !== false}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, intelligentGameHoppingEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Bascule automatiquement entre originaux Stake si 3 pertes consécutives surviennent sur le même jeu ou si le Z-Score indique une agglomération de tirages.
                      </p>
                    </div>
                  </div>

                  {/* Preferred Games Selector */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Jeux Originaux Stake Autorisés pour la Rotation :</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">{(autonomousConfig.preferredGames || ['dice', 'limbo', 'mines', 'plinko']).length} jeux sélectionnés</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['dice', 'limbo', 'mines', 'plinko'] as StakeGameType[]).map((g) => {
                        const currentPref = autonomousConfig.preferredGames || ['dice', 'limbo', 'mines', 'plinko'];
                        const isSelected = currentPref.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? currentPref.length > 1 ? currentPref.filter(item => item !== g) : currentPref
                                : [...currentPref, g];
                              setAutonomousConfig(prev => ({ ...prev, preferredGames: updated }));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 uppercase ${
                              isSelected
                                ? 'bg-indigo-950/80 border-indigo-500 text-amber-300 shadow-sm'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{g}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* BOUNDED MARTINGALE CONTROLS (Max 4-5 Steps) */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        Martingale Bornée IA Sécurisée (Plafond Strict 4 ou 5 Paliers)
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${autonomousConfig.martingaleEnabled ? 'text-amber-400 bg-amber-950/80 border-amber-500/40' : 'text-slate-400 bg-slate-900 border-slate-700'}`}>
                      {autonomousConfig.martingaleEnabled ? `Active (Max ${autonomousConfig.maxMartingaleIncreases || 4} Augmentations)` : 'Désactivée (Mise Plate)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Autoriser la Martingale dans l'IA :
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={autonomousConfig.martingaleEnabled}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, martingaleEnabled: e.target.checked }))}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                        />
                        <span>Activer le doublement (+100%) sur défaite</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Plafond d'Augmentations Max (Paliers) :
                      </label>
                      <select
                        disabled={!autonomousConfig.martingaleEnabled}
                        value={autonomousConfig.maxMartingaleIncreases || 4}
                        onChange={(e) => setAutonomousConfig(prev => ({ ...prev, maxMartingaleIncreases: parseInt(e.target.value, 10) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-bold disabled:opacity-50"
                      >
                        <option value="3">3 augmentations (ex: 0.1 ➔ 0.2 ➔ 0.4 ➔ 0.8 Max)</option>
                        <option value="4">4 augmentations (ex: 0.1 ➔ 0.2 ➔ 0.4 ➔ 0.8 ➔ 1.6 Max - Recommandé)</option>
                        <option value="5">5 augmentations (ex: 0.1 ➔ 0.2 ➔ 0.4 ➔ 0.8 ➔ 1.6 ➔ 3.2 Max)</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Sécurité Anti-Emballement :
                      </label>
                      <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-1.5 font-medium">
                        🛡️ Reset auto à {baseBetInput.toFixed(2)} {currency} dès le gain ou si le palier {autonomousConfig.maxMartingaleIncreases || 4} est franchi.
                      </div>
                    </div>
                  </div>

                  {/* Visual Step Ladder */}
                  {autonomousConfig.martingaleEnabled && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 font-semibold mb-1.5">
                        Simulation des Paliers pour votre mise de base ({baseBetInput.toFixed(2)} {currency}) :
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-center text-[10px] font-mono">
                        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700">
                          <div className="text-slate-400 font-bold">Base</div>
                          <div className="text-white font-black">{baseBetInput.toFixed(2)}</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30">
                          <div className="text-indigo-400 font-bold">P1 (+100%)</div>
                          <div className="text-indigo-200 font-black">{(baseBetInput * 2).toFixed(2)}</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30">
                          <div className="text-indigo-400 font-bold">P2 (+100%)</div>
                          <div className="text-indigo-200 font-black">{(baseBetInput * 4).toFixed(2)}</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30">
                          <div className="text-indigo-400 font-bold">P3 (+100%)</div>
                          <div className="text-indigo-200 font-black">{(baseBetInput * 8).toFixed(2)}</div>
                        </div>
                        <div className={`p-1.5 rounded-lg ${(autonomousConfig.maxMartingaleIncreases || 4) === 4 ? 'bg-amber-950/80 border border-amber-500/60' : 'bg-indigo-950/60 border border-indigo-500/30'}`}>
                          <div className="text-amber-400 font-bold">P4 ({(autonomousConfig.maxMartingaleIncreases || 4) === 4 ? 'MAX ⚠️' : '+100%'})</div>
                          <div className="text-amber-200 font-black">{(baseBetInput * 16).toFixed(2)}</div>
                        </div>
                        {(autonomousConfig.maxMartingaleIncreases || 4) >= 5 ? (
                          <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/60">
                            <div className="text-rose-400 font-bold">P5 (MAX ⚠️)</div>
                            <div className="text-rose-200 font-black">{(baseBetInput * 32).toFixed(2)}</div>
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex flex-col justify-center">
                            <div className="text-emerald-400 font-bold">P5+</div>
                            <div className="text-emerald-300 text-[9px] font-black">Reset {baseBetInput.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* DYNAMIC BET SIZING MODULATION CONTROLS (-22%, -30%, +22%, +30%, MAX +100%) */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 mt-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wide">
                          Modulation Dynamique de Mise IA (-22%, -30%, +22%, +30%, Max +100%)
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${autonomousConfig.dynamicBetSizingEnabled !== false ? 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40' : 'text-slate-400 bg-slate-900 border-slate-700'}`}>
                        {autonomousConfig.dynamicBetSizingEnabled !== false ? `Active (Plafond Max +${autonomousConfig.maxBetIncreasePct || 100}%)` : 'Désactivée (Mise Stricte)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Autoriser la Modulation de Mise :
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={autonomousConfig.dynamicBetSizingEnabled !== false}
                            onChange={(e) => setAutonomousConfig(prev => ({ ...prev, dynamicBetSizingEnabled: e.target.checked }))}
                            className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700"
                          />
                          <span>Modulation continue (-22%/-30% ou +22%/+30%)</span>
                        </label>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Plafond d'Augmentation Max :
                        </label>
                        <select
                          disabled={autonomousConfig.dynamicBetSizingEnabled === false}
                          value={autonomousConfig.maxBetIncreasePct || 100}
                          onChange={(e) => setAutonomousConfig(prev => ({ ...prev, maxBetIncreasePct: parseInt(e.target.value, 10) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-400 font-bold disabled:opacity-50"
                        >
                          <option value="30">+30% Max (Très Conservateur)</option>
                          <option value="50">+50% Max (Équilibré)</option>
                          <option value="75">+75% Max (Dynamique)</option>
                          <option value="100">+100% Max (Recommandé - x2 mise de base max)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Gouvernance IA :
                        </label>
                        <div className="text-[10px] text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 rounded-lg p-1.5 font-medium">
                          🛡️ Réduction auto sur turbulence/drawdown (-22%, -30%, -45%) & Boost sur momentum (+22%, +30%, +50%, +100% max).
                        </div>
                      </div>
                    </div>

                    {/* Visual Comparison Chips */}
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30">
                        <div className="text-blue-400 font-bold">Défensif (-22% / -30%)</div>
                        <div className="text-slate-300 font-mono mt-0.5">
                          {(baseBetInput * 0.78).toFixed(4)} / {(baseBetInput * 0.70).toFixed(4)} {currency}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-700">
                        <div className="text-slate-400 font-bold">Base Neutre (0%)</div>
                        <div className="text-white font-mono mt-0.5">
                          {baseBetInput.toFixed(4)} {currency}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                        <div className="text-emerald-400 font-bold">Momentum (+22% / +30%)</div>
                        <div className="text-slate-300 font-mono mt-0.5">
                          {(baseBetInput * 1.22).toFixed(4)} / {(baseBetInput * 1.30).toFixed(4)} {currency}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40">
                        <div className="text-amber-400 font-bold">Plafond Max (+100%)</div>
                        <div className="text-amber-200 font-mono font-bold mt-0.5">
                          {(baseBetInput * 2).toFixed(4)} {currency} (2x base max)
                        </div>
                      </div>
                    </div>
                  </div>

                {/* ADVANCED QUANTITATIVE DIAGNOSTIC SUITE */}
                {liveAutonomousDecision.quantitativeMetrics && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-900/40 space-y-3.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Réseau de Décision Bayésien & Volatilité GARCH (Temps Réel)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Régime Dominant : <strong className="text-amber-400">{liveAutonomousDecision.quantitativeMetrics.bayesianRegimes.dominantLabel}</strong>
                      </span>
                    </div>

                    {/* Bayesian Probability Distribution Bars */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Distribution des Régimes Cachés (HMM) :</span>
                        <span className="text-[10px] text-slate-500 font-mono">Total Posterior = 100%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30">
                          <div className="text-emerald-400 font-bold">Expansion</div>
                          <div className="font-mono font-black text-xs text-white">{liveAutonomousDecision.quantitativeMetrics.bayesianRegimes.expansion}%</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-950/50 border border-blue-500/30">
                          <div className="text-blue-400 font-bold">Oscillation</div>
                          <div className="font-mono font-black text-xs text-white">{liveAutonomousDecision.quantitativeMetrics.bayesianRegimes.oscillation}%</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-500/30">
                          <div className="text-rose-400 font-bold">Choc Risque</div>
                          <div className="font-mono font-black text-xs text-white">{liveAutonomousDecision.quantitativeMetrics.bayesianRegimes.fatTailShock}%</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-950/50 border border-purple-500/30">
                          <div className="text-purple-400 font-bold">Moonshot</div>
                          <div className="font-mono font-black text-xs text-white">{liveAutonomousDecision.quantitativeMetrics.bayesianRegimes.moonshotZone}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Quantitative Indicators Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Volatilité GARCH(1,1)</span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono font-black text-cyan-400">
                            Sigma σ = {liveAutonomousDecision.quantitativeMetrics.volatilityForecast.forecastedSigma}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {liveAutonomousDecision.quantitativeMetrics.volatilityForecast.volatilityRegime}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Amortisseur Sécurité : x{liveAutonomousDecision.quantitativeMetrics.volatilityForecast.preEmptiveThrottleFactor}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Sweet-Spot Multiplicateur</span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono font-black text-amber-400">
                            Cible @{liveAutonomousDecision.quantitativeMetrics.multiplierOptimization.optimalMultiplierSweetSpot}x
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Log-Growth +{(liveAutonomousDecision.quantitativeMetrics.multiplierOptimization.expectedLogGrowthRate * 100).toFixed(3)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                          Profil : {liveAutonomousDecision.quantitativeMetrics.multiplierOptimization.growthCurveTier.replace('_', ' ')}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Test d'Indépendance (Runs)</span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className={`font-mono font-black ${
                            liveAutonomousDecision.quantitativeMetrics.isClusteringDetected ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            Z = {liveAutonomousDecision.quantitativeMetrics.waldWolfowitzZScore.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {liveAutonomousDecision.quantitativeMetrics.isClusteringDetected ? 'Anomalie Détectée' : 'Aléatoire Conforme'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Seuil Confiance 95% (|Z| &lt; 1.96)
                        </div>
                      </div>
                    </div>

                    {/* 3-Step Predictive Tactical Action Plan */}
                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1">
                      <div className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        <span>Plan Tactique Prédictif (3 Prochains Coups) :</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                        {liveAutonomousDecision.quantitativeMetrics.nextStepsPlan.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 font-bold">•</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RATCHET PROFIT LOCK (HIT & RUN) & VIP RAKEBACK YIELD MODULES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {/* Ratchet Profit Lock */}
                      <div className={`p-3 rounded-xl border ${
                        liveAutonomousDecision.quantitativeMetrics.ratchetLock.isLocked
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">🔒</span>
                            <span className="text-xs font-bold uppercase tracking-wider">{t('aiBotPage.ratchetTitle')}</span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            liveAutonomousDecision.quantitativeMetrics.ratchetLock.isLocked
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {liveAutonomousDecision.quantitativeMetrics.ratchetLock.lockMilestoneReached === 'none'
                              ? t('aiBotPage.standby')
                              : `${t('aiBotPage.milestone')} ${liveAutonomousDecision.quantitativeMetrics.ratchetLock.lockMilestoneReached}`}
                          </span>
                        </div>

                        <div className="mt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">{t('aiBotPage.ratchetFloor')}</span>
                            <span className="font-mono font-black text-emerald-400">
                              +{liveAutonomousDecision.quantitativeMetrics.ratchetLock.lockedProfitFloor} {currency}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {liveAutonomousDecision.quantitativeMetrics.ratchetLock.statusMessage}
                          </div>
                        </div>
                      </div>

                      {/* Stake VIP Rakeback Yield */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">👑</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                              {t('aiBotPage.vipTitle')}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {t('aiBotPage.vipTier')} {liveAutonomousDecision.quantitativeMetrics.vipRakeback.currentVipTier}
                          </span>
                        </div>

                        <div className="mt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">{t('aiBotPage.instantRakeback')}</span>
                            <span className="font-mono font-black text-amber-300">
                              +{liveAutonomousDecision.quantitativeMetrics.vipRakeback.instantRakebackEarned} {currency}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">{t('aiBotPage.realNetYield')}</span>
                            <span className={`font-mono font-black ${
                              liveAutonomousDecision.quantitativeMetrics.vipRakeback.realNetProfitWithRakeback >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}>
                              {liveAutonomousDecision.quantitativeMetrics.vipRakeback.realNetProfitWithRakeback >= 0 ? '+' : ''}
                              {liveAutonomousDecision.quantitativeMetrics.vipRakeback.realNetProfitWithRakeback} {currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Bayesian Multiplier Optimizer & Dynamic Kelly Sizing Engine Card (Visible in Detailed Mode) */}
      {!isSimplifiedMode && (
        <BayesianOptimizerCard
          recentBets={bets || []}
          game={strategy.game || 'dice'}
          currentMultiplier={strategy.targetMultiplier || 2.0}
          currentBankroll={balance}
          baseBet={baseBetInput}
          drawdownPct={balance > 0 ? (Math.max(0, peakSessionProfit - sessionProfit) / (balance + Math.max(0, peakSessionProfit - sessionProfit))) * 100 : 0}
          currentStreak={currentStreak}
          shannonEntropy={liveAutonomousDecision.quantitativeMetrics?.shannonEntropy || 0.95}
          currency={currency}
          onApplyOptimalMultiplier={handleApplyBayesianSettings}
          isAutoTuningActive={isBayesianAutoTuning}
          onToggleAutoTuning={setIsBayesianAutoTuning}
        />
      )}

      {/* MAIN INTERFACE (Step by Step) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: 3 STEPS (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* FREEMIUM QUOTA & VIP ACCESS BANNER */}
          {!licenseState?.isPro && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/60 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-white">Mode Essai Gratuit</span>
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                      (licenseState?.freeDailyBetsRemaining ?? 50) > 10 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {licenseState?.freeDailyBetsRemaining ?? 50} / 50 paris restants aujourd'hui
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Testez le bot librement. Débloquez le Cerveau IA Autonome et les paris illimités avec une clé VIP.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenLicenseModal}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Crown className="w-4 h-4" />
                <span>Activer ma Clé VIP</span>
              </button>
            </div>
          )}

          {/* STEP 1: CHOOSE AI BOT PROFILE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {t('aiBotPage.step1Title')}
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {localizedProfiles.length} modes disponibles
              </span>
            </div>

            {/* FEATURED: 100% AUTONOMOUS BRAIN CARD */}
            {(() => {
              const autonomousProfile = localizedProfiles.find(p => p.id === 'profile-autonomous-brain');
              if (!autonomousProfile) return null;
              const isSelected = selectedProfileId === 'profile-autonomous-brain';

              return (
                <div
                  onClick={() => handleSelectProfile(autonomousProfile)}
                  className={`p-4 rounded-xl transition cursor-pointer border relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950/60 hover:bg-slate-850 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {autonomousProfile.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40">
                            RECOMMANDÉ IA
                          </span>
                          {!licenseState?.isPro ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                              <Crown className="w-3 h-3 text-amber-400" />
                              VIP PRO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                              ✓ VIP ACTIF
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {autonomousProfile.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 fill-current" />}
                      </div>
                    </div>
                  </div>

                  {!isSimplifiedMode && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <span className="text-amber-400">⚙️</span>
                      <span>{autonomousProfile.howItWorks}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* PRIMARY POPULAR PROFILES GRID (2x2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {localizedProfiles
                .filter(p => ['profile-ultra-safe', 'profile-steady-growth', 'profile-limbo-surge', 'profile-vip-wager'].includes(p.id))
                .map((profile) => {
                  const isSelected = selectedProfileId === profile.id;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={`p-3 rounded-xl text-left transition border cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-500/70 shadow-sm'
                          : 'bg-slate-950/40 hover:bg-slate-850 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{profile.icon}</span>
                          <span className="font-bold text-xs text-white">{profile.name}</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${profile.riskColor}`}>
                          {profile.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                        {profile.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="uppercase font-bold text-slate-300">{profile.game}</span>
                        <span className="text-amber-400 font-bold">@{profile.multiplier}x</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* EXPANDABLE SPECIALIZED PROFILES ACCORDION */}
            <div>
              <button
                type="button"
                onClick={() => setShowAllProfiles(!showAllProfiles)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer font-medium"
              >
                <span>{showAllProfiles ? 'Masquer les modes spécialisés' : '➕ Voir les autres modes (Mines Radar, Moonshot 10000x, Plinko...)'}</span>
                {showAllProfiles ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {showAllProfiles && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3"
                  >
                    {localizedProfiles
                      .filter(p => !['profile-autonomous-brain', 'profile-ultra-safe', 'profile-steady-growth', 'profile-limbo-surge', 'profile-vip-wager'].includes(p.id))
                      .map((profile) => {
                        const isSelected = selectedProfileId === profile.id;
                        return (
                          <div
                            key={profile.id}
                            onClick={() => handleSelectProfile(profile)}
                            className={`p-3 rounded-xl text-left transition border cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-950/30 border-amber-500/70'
                                : 'bg-slate-950/40 hover:bg-slate-850 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{profile.icon}</span>
                                <span className="font-bold text-xs text-white">{profile.name}</span>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${profile.riskColor}`}>
                                {profile.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                              {profile.description}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span className="uppercase font-bold text-slate-300">{profile.game}</span>
                              <span className="text-amber-400 font-bold">@{profile.multiplier}x</span>
                            </div>
                          </div>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* STEP 2: OBJECTIVES & SAFETY BOUNDARIES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="font-bold text-sm sm:text-base text-white">
                  {t('aiBotPage.step2Title')}
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">{t('aiBotPage.step2Subtitle')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Base Bet Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{t('aiBotPage.baseBetAmount')}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isAutonomousActive ? 'IA' : 'Base'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={baseBetInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setBaseBetInput(val);
                      if (onUpdateStrategy) onUpdateStrategy({ baseBet: val });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-amber-400 font-bold">
                    {currency}
                  </span>
                </div>

                {/* Quick bankroll percentage pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Auto :</span>
                  {[0.05, 0.1, 0.25, 0.5, 1.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyBankrollPct(pct)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Take-Profit Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    {t('aiBotPage.takeProfitTarget')}
                  </span>
                  <span className="text-[10px] text-emerald-500/80">TP</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={takeProfitInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTakeProfitInput(val);
                      setAutonomousConfig((prev) => ({ ...prev, targetProfit: val }));
                      if (onUpdateStrategy) onUpdateStrategy({ stopOnProfit: val });
                    }}
                    placeholder="10.00"
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-sm font-mono text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-emerald-400 font-bold">
                    +{takeProfitInput} {currency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">TP Target Limit</p>
              </div>

              {/* Stop-Loss Safety Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-rose-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-rose-400" />
                    {t('aiBotPage.stopLossSafety')}
                  </span>
                  <span className="text-[10px] text-rose-500/80">SL</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={stopLossInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setStopLossInput(val);
                      setAutonomousConfig((prev) => ({ ...prev, stopLoss: val }));
                      if (onUpdateStrategy) onUpdateStrategy({ stopOnLoss: val });
                    }}
                    placeholder="20.00"
                    className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-sm font-mono text-rose-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-mono text-rose-400 font-bold">
                    -{stopLossInput} {currency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">SL Safety Floor</p>
              </div>

              {/* Speed Controller */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-indigo-400" />
                    {t('aiBotPage.speedSettings')}
                  </span>
                  <span className="text-[10px] text-slate-500">{betSpeedMs}ms</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSpeedChange('safe')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center ${
                      speedLevel === 'safe'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{t('aiBotPage.safeSpeed')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeedChange('normal')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center ${
                      speedLevel === 'normal'
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{t('aiBotPage.normalSpeed')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeedChange('fast')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex flex-col items-center justify-center ${
                      speedLevel === 'fast'
                        ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚡ {t('aiBotPage.fastSpeed')}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Auto Vault Sweep Option */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="auto-vault-toggle"
                  checked={autoVaultSweep}
                  onChange={(e) => {
                    setAutoVaultSweep(e.target.checked);
                    if (onUpdateStrategy) {
                      onUpdateStrategy({
                        autoVaultWithdraw: e.target.checked ? {
                          enabled: true,
                          threshold: autoVaultThreshold,
                          keepBalance: autoVaultThreshold - 5,
                        } : undefined,
                      });
                    }
                  }}
                  className="w-4 h-4 rounded text-orange-500 bg-slate-950 border-slate-700 focus:ring-orange-500"
                />
                <label htmlFor="auto-vault-toggle" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-semibold text-white">Sécurisation Coffre-Fort Stake (*Vault*)</span> : transférer automatiquement les surplus de gains
                </label>
              </div>

              {autoVaultSweep && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">Si solde &gt;</span>
                  <input
                    type="number"
                    value={autoVaultThreshold}
                    onChange={(e) => setAutoVaultThreshold(parseFloat(e.target.value) || 50)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                  />
                  <span className="text-[10px] font-mono text-amber-400">{currency}</span>
                </div>
              )}
            </div>

          </div>

          {/* STEP 3: MAIN ACTION LAUNCH CONTROLLER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="font-bold text-sm sm:text-base text-white">
                  {t('aiBotPage.step3Title')}
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">{t('aiBotPage.step3Subtitle')}</span>
            </div>

            {/* ACTIVE STOP REASON ALERT BANNER */}
            {stopReason && !isAutobetting && (
              <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">{t('aiBotPage.safetyStopAlert')}</span>
                    <span className="text-amber-300/90">{stopReason}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartBotWithValidation}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('aiBotPage.newSession')}</span>
                </button>
              </div>
            )}

            {/* CONTINUOUS EXECUTION BADGE BANNER */}
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <span className="text-base">♾️</span>
                <span>
                  <strong>Mode Exécution Continue</strong> : Le bot tourne sans interruption ni limite de tours (100, 500, 1000+) tant que votre Take-Profit (<strong className="text-emerald-400 font-mono">+{takeProfitInput} {currency}</strong>) n'est pas atteint.
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                Non-Stop TP Target
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {isAutobetting ? (
                <motion.button
                  type="button"
                  onClick={onStopAutoBet}
                  animate={
                    isLive
                      ? {
                          boxShadow: [
                            '0 10px 25px -5px rgba(225, 29, 72, 0.3)',
                            '0 10px 30px 2px rgba(225, 29, 72, 0.55)',
                            '0 10px 25px -5px rgba(225, 29, 72, 0.3)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    isLive
                      ? {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : undefined
                  }
                  className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-base transition active:scale-98 flex items-center justify-center gap-2.5 shadow-lg shadow-rose-900/30 cursor-pointer relative overflow-hidden"
                >
                  {isLive && (
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <Square className="w-5 h-5 fill-current" />
                  <span>{t('aiBotPage.stopBotImmediately')}</span>
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-400/50 text-[11px] uppercase font-mono tracking-wider text-rose-200 ml-1 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      {t('aiBotPage.liveActive')}
                    </span>
                  )}
                </motion.button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBotWithValidation}
                  className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-base transition transform active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 cursor-pointer animate-pulse"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isAutonomousActive ? t('aiBotPage.startAutonomousPilot') : t('aiBotPage.startAutoPilot')}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedProfileId === 'profile-autonomous-brain' && !licenseState?.isPro) {
                      onOpenLicenseModal?.();
                      return;
                    }
                    if (!licenseState?.isPro && (licenseState?.freeDailyBetsRemaining ?? 0) <= 0) {
                      onOpenLicenseModal?.();
                      return;
                    }
                    applySettingsToStrategy();
                    await onExecuteSingleBet();
                  }}
                  disabled={isAutobetting}
                  className="flex-1 sm:flex-none py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Exécuter 1 tour test pour vérifier"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{t('aiBotPage.bet1x')}</span>
                </button>

                {onExecuteBatchBets && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!licenseState?.isPro) {
                        onOpenLicenseModal?.();
                        return;
                      }
                      applySettingsToStrategy();
                      await onExecuteBatchBets(100);
                    }}
                    disabled={isAutobetting}
                    className="flex-1 sm:flex-none py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Exécuter 100 tours rapides (VIP Pro)"
                  >
                    <FastForward className="w-4 h-4 text-indigo-400" />
                    <span>{t('aiBotPage.fast100x')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Provably fair & seed rotation quick controls */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Provably Fair HMAC-SHA256</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-300">Nonce: #{credentials?.nonce || 1}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-400 truncate max-w-[120px]" title={credentials?.clientSeed}>Seed: {credentials?.clientSeed?.slice(0, 10)}...</span>
              </div>

              {onRotateSeed && (
                <button
                  type="button"
                  onClick={() => onRotateSeed()}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t('aiBotPage.changeRandomSeed')}</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: TABBED LIVE PERFORMANCE & AI INSIGHTS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Clean Segmented Sub-Tab Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveRightTab('chart')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRightTab === 'chart'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Graphique & Solde</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRightTab('thoughts')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRightTab === 'thoughts'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Cerveau & Raisonnement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveRightTab('history')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRightTab === 'history'
                  ? 'bg-slate-750 text-white border border-slate-600 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Historique ({bets.length})</span>
            </button>
          </div>

          {/* TAB 1: REAL-TIME PERFORMANCE CHART & BALANCE */}
          {activeRightTab === 'chart' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {t('aiBotPage.liveProfitChart')}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 font-mono flex-wrap">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Solde:</span>
                    <span className="text-white font-bold">{balance.toFixed(2)}</span>
                    <span className="text-amber-400 text-[10px] font-bold">{currency}</span>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${
                    sessionProfit >= 0 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                  }`}>
                    {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              <StakeLiveChart
                bets={bets}
                stats={stats}
                currency={currency}
                compact={false}
                isAutobetting={isAutobetting}
                isLiveMode={isLive}
                startingBalance={balance - sessionProfit}
                currentBalance={balance}
                sessionProfit={sessionProfit}
                takeProfitTarget={takeProfitInput}
                stopLossTarget={stopLossInput}
                betSpeedMs={betSpeedMs}
                gameTitle={activeProfile?.name || strategy.game}
                onClearHistory={onClearHistory}
              />
            </div>
          )}

          {/* TAB 2: LIVE AI BRAIN & REASONING LOG */}
          {activeRightTab === 'thoughts' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {t('aiBotPage.liveBrainTitle')}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleConsultGemini}
                  disabled={isConsultingGemini}
                  className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isConsultingGemini ? t('aiBotPage.auditInProgress') : t('aiBotPage.geminiAudit')}</span>
                </button>
              </div>

              {/* AI Mental State Indicator */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t('aiBotPage.strategyMode')}</span>
                  <span className="font-bold text-white truncate max-w-[180px]">
                    {isAutonomousActive ? liveAutonomousDecision.strategyName : (strategy.name || activeProfile.name)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t('aiBotPage.gameAndMultiplier')}</span>
                  <span className="font-mono font-bold text-amber-400">
                    {(isAutonomousActive ? liveAutonomousDecision.chosenGame : strategy.game).toUpperCase()} @{(isAutonomousActive ? liveAutonomousDecision.chosenMultiplier : strategy.targetMultiplier).toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Mise Active (En cours) :</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={`font-bold ${
                      (currentBetAmount && (strategy.baseBet || baseBetInput) && currentBetAmount > (strategy.baseBet || baseBetInput))
                        ? 'text-amber-300 font-black'
                        : 'text-emerald-400'
                    }`}>
                      {(currentBetAmount || (isAutonomousActive ? liveAutonomousDecision.calculatedBetAmount : (strategy.baseBet || baseBetInput))).toFixed(4)} {currency}
                    </span>
                    {currentBetAmount !== undefined && (strategy.baseBet || baseBetInput) > 0 && currentBetAmount > (strategy.baseBet || baseBetInput) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        +{Math.round(((currentBetAmount - (strategy.baseBet || baseBetInput)) / (strategy.baseBet || baseBetInput)) * 100)}%
                      </span>
                    )}
                    {currentBetAmount !== undefined && (strategy.baseBet || baseBetInput) > 0 && currentBetAmount < (strategy.baseBet || baseBetInput) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        -{Math.round((((strategy.baseBet || baseBetInput) - currentBetAmount) / (strategy.baseBet || baseBetInput)) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Mise de Base Initiale :</span>
                  <span className="font-mono text-slate-300">
                    {(strategy.baseBet || baseBetInput).toFixed(4)} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t('aiBotPage.currentStreak')}</span>
                  <span className={`font-mono font-bold ${
                    currentStreak > 0 ? 'text-emerald-400' : currentStreak < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {currentStreak > 0 ? `+${currentStreak} ${t('aiBotPage.wins')}` : currentStreak < 0 ? `${currentStreak} ${t('aiBotPage.losses')}` : t('aiBotPage.neutral')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t('aiBotPage.stopLossSafety')}:</span>
                  <span className="font-mono text-rose-400">-{stopLossInput} {currency}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t('aiBotPage.takeProfitTarget')}:</span>
                  <span className="font-mono text-emerald-400">+{takeProfitInput} {currency}</span>
                </div>

                {liveAutonomousDecision.quantitativeMetrics && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>Télémétrie Quant. :</span>
                    </span>
                    <span className="font-mono text-slate-300">
                      Entropie <strong className="text-cyan-400">{(liveAutonomousDecision.quantitativeMetrics.shannonEntropy * 100).toFixed(0)}%</strong> • Z <strong className={liveAutonomousDecision.quantitativeMetrics.isClusteringDetected ? 'text-rose-400' : 'text-emerald-400'}>{liveAutonomousDecision.quantitativeMetrics.waldWolfowitzZScore.toFixed(2)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* LIVE AUTONOMOUS THOUGHT LOG */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-amber-400" />
                    <span>{t('aiBotPage.liveThoughtStream')}</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isAutonomousActive ? t('aiBotPage.continuousDecision') : t('aiBotPage.staticMode')}
                  </span>
                </div>

                <div className="h-64 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs scrollbar-thin" style={{ overflowAnchor: 'none' }}>
                  {autonomousThoughtLog.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center text-slate-500 text-xs italic bg-slate-950/60 rounded-xl border border-slate-800/60">
                      {t('aiBotPage.waitingFirstRound')}
                    </div>
                  ) : (
                    autonomousThoughtLog.map((thought) => (
                      <div
                        key={thought.id}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1 text-slate-300"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-amber-400">{thought.regime}</span>
                          <span>{new Date(thought.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-snug">
                          {thought.reasoning}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECENT BET RESULTS FEED */}
          {activeRightTab === 'history' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {t('aiBotPage.recentBets')} ({bets.length})
                  </h4>
                </div>

                {onClearHistory && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-slate-750"
                  >
                    {t('aiBotPage.clearHistory')}
                  </button>
                )}
              </div>

              <div className="h-80 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin" style={{ overflowAnchor: 'none' }}>
                {bets.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs italic bg-slate-950/60 rounded-xl border border-slate-800/60">
                    {t('aiBotPage.noBetsYet')}
                  </div>
                ) : (
                  bets.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        b.won
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {b.won ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <div className="truncate text-xs">
                          <span className="font-bold">#{bets.length - idx}</span> <span className="uppercase text-slate-300">{b.game}</span> @{b.targetMultiplier}x
                        </div>
                      </div>

                      <div className="font-bold text-xs flex-shrink-0">
                        {b.won ? `+${b.profit.toFixed(2)}` : `${b.profit.toFixed(2)}`} {b.currency}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
        </>
      )}

      {/* GEMINI DEEP AUDIT MODAL */}
      <AnimatePresence>
        {showGeminiAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {t('aiBotPage.geminiModalTitle')}
                    </h3>
                    <p className="text-xs text-slate-400">{t('aiBotPage.geminiModalSubtitle')}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGeminiAuditModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {isConsultingGemini ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    Gemini analyse la distribution empirique de vos {totalBetsCount} tours...
                  </p>
                </div>
              ) : geminiDecisionData ? (
                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Regime Card */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${geminiDecisionData.regimeColor || 'bg-slate-950 border-slate-800'}`}>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('aiBotPage.regimeTitle')}</div>
                      <div className="text-base font-black text-white">{geminiDecisionData.regimeLabel}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400">{t('aiBotPage.bankrollHealth')}</div>
                      <div className="text-base font-bold text-emerald-400">{geminiDecisionData.bankrollHealthScore}/100</div>
                    </div>
                  </div>

                  {/* Quantitative Rationale */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                      {t('aiBotPage.aiDecision')}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {geminiDecisionData.reasoning}
                    </p>
                  </div>

                  {/* Tactical Directives */}
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <h4 className="font-bold text-xs text-indigo-300 uppercase tracking-wider">
                      {t('aiBotPage.recommendedGame')}
                    </h4>
                    <p className="text-xs text-indigo-100 font-semibold">
                      {geminiDecisionData.tacticalDirective}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-500/20 text-xs font-mono">
                      <div>Jeu Optimal : <strong className="text-white uppercase">{geminiDecisionData.chosenGame}</strong></div>
                      <div>Cote Cible : <strong className="text-amber-400">{geminiDecisionData.chosenMultiplier}x</strong></div>
                      <div>Mise Recalibrée : <strong className="text-emerald-400">{geminiDecisionData.calculatedBetAmount} {currency}</strong></div>
                      <div>Seed Rotation : <strong className="text-white">{geminiDecisionData.seedRotationAdvised ? 'Recommandée' : 'Stable'}</strong></div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGeminiAuditModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      {t('aiBotPage.close')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (geminiDecisionData.calculatedBetAmount) {
                          setBaseBetInput(geminiDecisionData.calculatedBetAmount);
                        }
                        if (onUpdateStrategy) {
                          onUpdateStrategy({
                            game: geminiDecisionData.chosenGame,
                            targetMultiplier: geminiDecisionData.chosenMultiplier,
                            baseBet: geminiDecisionData.calculatedBetAmount,
                          });
                        }
                        setShowGeminiAuditModal(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold transition shadow cursor-pointer"
                    >
                      {t('aiBotPage.applySettings')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Aucune donnée d'audit disponible.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
