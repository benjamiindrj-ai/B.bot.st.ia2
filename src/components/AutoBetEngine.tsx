import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Pause, 
  Square, 
  Zap, 
  FastForward, 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  Dice5,
  Rocket,
  Diamond,
  Bomb,
  CircleDot,
  Grid3X3,
  Layers,
  Sparkles,
  ListTree,
  Activity,
  BarChart3,
  Sliders,
  Lock,
  Wallet,
  History,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Key,
  Shuffle,
  RefreshCw,
  Edit2,
  Check,
  Brain,
  ArrowRightLeft,
  Shield,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { BettingStrategy, BetResult, StakeGameType, BotStatistics } from '../types';
import { StakeLiveChart } from './StakeLiveChart';
import confetti from 'canvas-confetti';
import { SuggestStrategyOptimizationButton } from './SuggestStrategyOptimizationButton';
import { useTranslation } from '../i18n/LanguageContext';
import { AdaptiveStrategySettings, AdaptiveState, DEFAULT_ADAPTIVE_SETTINGS } from '../utils/adaptiveEngine';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';

interface AutoBetEngineProps {
  strategy: BettingStrategy;
  balance: number;
  currency: string;
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
  clientSeed?: string;
  serverSeedHash?: string;
  nonce?: number;
  onRotateSeed?: (customClientSeed?: string) => void;
  onUpdateSeed?: (updates: Partial<{ clientSeed: string; serverSeedHash: string; nonce: number }>) => void;
  adaptiveSettings?: AdaptiveStrategySettings;
  onUpdateAdaptiveSettings?: (updates: Partial<AdaptiveStrategySettings>) => void;
  adaptiveState?: AdaptiveState;
  onManualPivot?: (targetStrategyId?: string) => void;
  onResetPivot?: () => void;
  isLiveMode?: boolean;
}

export const AutoBetEngine: React.FC<AutoBetEngineProps> = ({
  strategy,
  balance,
  currency,
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
  onUpdateStrategy = () => {},
  onSelectStrategy,
  clientSeed = 'stake_user_client_seed_777',
  serverSeedHash = 'stake_official_server_seed_2026_default',
  nonce = 1,
  onRotateSeed,
  onUpdateSeed,
  adaptiveSettings = DEFAULT_ADAPTIVE_SETTINGS,
  onUpdateAdaptiveSettings,
  adaptiveState,
  onManualPivot,
  onResetPivot,
  isLiveMode = false,
}) => {
  const { t } = useTranslation();
  const [animatingBet, setAnimatingBet] = useState(false);
  const [simulationViewMode, setSimulationViewMode] = useState<'both' | 'game' | 'chart'>('both');
  const [latestAnimatedBetId, setLatestAnimatedBetId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);
  const [isEditingSeed, setIsEditingSeed] = useState<boolean>(false);
  const [customClientSeedInput, setCustomClientSeedInput] = useState<string>(clientSeed);
  const [showAdaptiveSettings, setShowAdaptiveSettings] = useState<boolean>(false);
  const [showDecisionLog, setShowDecisionLog] = useState<boolean>(false);

  useEffect(() => {
    setCustomClientSeedInput(clientSeed);
  }, [clientSeed]);

  // Trigger smooth row flash on new bet result added
  useEffect(() => {
    if (lastBet?.id) {
      setLatestAnimatedBetId(lastBet.id);
      const timer = setTimeout(() => {
        setLatestAnimatedBetId((current) => (current === lastBet.id ? null : current));
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [lastBet?.id, lastBet?.timestamp]);

  // Trigger celebration on big win
  useEffect(() => {
    if (lastBet && lastBet.won && lastBet.payoutMultiplier >= 5) {
      try {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
      } catch (err) {
        // Safe fallback in sandboxed iframe without canvas permissions
        console.debug('Confetti effect ignored in current environment:', err);
      }
    }
  }, [lastBet]);

  const handleManualBet = async () => {
    setAnimatingBet(true);
    await onExecuteSingleBet();
    setTimeout(() => setAnimatingBet(false), 200);
  };

  const handleTurboBatch = async (count: number) => {
    if (onExecuteBatchBets) {
      await onExecuteBatchBets(count);
    }
  };

  const handleSaveCustomSeed = () => {
    if (onUpdateSeed) {
      onUpdateSeed({ clientSeed: customClientSeedInput.trim() || clientSeed });
    }
    setIsEditingSeed(false);
  };

  const handleRotate = () => {
    if (onRotateSeed) {
      onRotateSeed();
    }
  };

  // Helper to format outcome display per game
  const renderGameOutcome = (b: BetResult) => {
    if (b.game === 'dice') {
      const rollVal = b.gameDetails?.roll !== undefined ? b.gameDetails.roll.toFixed(2) : (b.payoutMultiplier > 0 ? '99.00' : '0.00');
      return (
        <span className={`font-mono font-bold ${b.won ? 'text-emerald-400' : 'text-rose-400'}`}>
          {rollVal}
        </span>
      );
    }
    if (b.game === 'limbo') {
      const multVal = b.gameDetails?.limboMultiplier ? `${b.gameDetails.limboMultiplier.toFixed(2)}x` : `${b.payoutMultiplier.toFixed(2)}x`;
      return (
        <span className={`font-mono font-bold ${b.won ? 'text-emerald-400' : 'text-rose-400'}`}>
          {multVal}
        </span>
      );
    }
    if (b.game === 'mines') {
      return (
        <span className="font-mono text-[11px]">
          {b.gameDetails?.minesHitMine ? '💥 Mine' : `💎 ${b.gameDetails?.minesRevealed || 0} Gem`}
        </span>
      );
    }
    if (b.game === 'crash') {
      return (
        <span className={`font-mono font-bold ${b.won ? 'text-emerald-400' : 'text-rose-400'}`}>
          {b.gameDetails?.crashPoint ? `${b.gameDetails.crashPoint.toFixed(2)}x` : `${b.payoutMultiplier.toFixed(2)}x`}
        </span>
      );
    }
    if (b.game === 'plinko') {
      return (
        <span className="font-mono text-cyan-300">
          Slot #{b.gameDetails?.plinkoSlot ?? '-'}
        </span>
      );
    }
    if (b.game === 'keno') {
      return (
        <span className="font-mono text-cyan-300">
          {b.gameDetails?.kenoMatches ?? 0} matches
        </span>
      );
    }
    if (b.game === 'roulette') {
      return (
        <span className="font-mono text-amber-300 font-bold">
          N° {b.gameDetails?.rouletteNumber ?? '-'}
        </span>
      );
    }
    return (
      <span className="font-mono font-semibold text-slate-200">
        {b.payoutMultiplier.toFixed(2)}x
      </span>
    );
  };

  return (
    <div id="autobet-engine-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5">
      
      {/* Engine Header & Safety Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Moteur d'Exécution & Simulation Stake
            </h3>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
              isAutobetting
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isAutobetting ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {isAutobetting ? 'Auto-Bet Actif' : 'En Pause'}
            </span>
            {strategy.customConditions && strategy.customConditions.length > 0 && (
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <ListTree className="w-3 h-3 text-purple-400" />
                {strategy.customConditions.filter(c => c.isActive !== false).length}/{strategy.customConditions.length} Conditions Stake
              </span>
            )}
            {strategy.autoVaultWithdraw?.enabled && (
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-200 border border-purple-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3 text-purple-400" />
                Auto-Vault: &gt;{strategy.autoVaultWithdraw.threshold} {currency}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithme provably fair HMAC-SHA256 • Jeu : <strong className="text-slate-200 capitalize">{strategy.game}</strong>
          </p>
        </div>

        {/* View Switcher Pills + Counters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Visualizer / Chart Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setSimulationViewMode('both')}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                simulationViewMode === 'both'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue combinée Jeu & Graphique"
            >
              <Sliders className="w-3 h-3 text-emerald-400" />
              <span>Vue Combinée</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulationViewMode('chart')}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                simulationViewMode === 'chart'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Graphique de simulation Stake"
            >
              <Activity className="w-3 h-3" />
              <span>Graphique Stake</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulationViewMode('game')}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                simulationViewMode === 'game'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Animation du jeu uniquement"
            >
              <Dice5 className="w-3 h-3 text-cyan-400" />
              <span>Jeu</span>
            </button>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-semibold block">Profit Session</span>
            <span className={`text-xs sm:text-sm font-mono font-bold ${
              sessionProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toFixed(4)} {currency}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 font-semibold block">Série en cours</span>
            <span className={`text-xs sm:text-sm font-mono font-bold ${
              currentStreak > 0 ? 'text-emerald-400' : currentStreak < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {currentStreak > 0 ? `+${currentStreak} W` : currentStreak < 0 ? `${currentStreak} L` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Stop Reason Alert */}
      {stopReason && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-semibold">{stopReason}</span>
          </div>
          <span className="text-[11px] text-slate-400">Auto-bet interrompu par sécurité</span>
        </div>
      )}

      {/* Intelligent Decision-Making & Strategy Pivot Controller */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              adaptiveState?.isPivoted
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
                : adaptiveSettings?.enabled
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Prise de Décision Intelligente & Bascule Automatique</span>
                  {isLiveMode && (
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Stake Réel
                    </span>
                  )}
                </h4>
                {adaptiveSettings?.enabled ? (
                  adaptiveState?.isPivoted ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-400" />
                      Mode Défensif Actif ({adaptiveState.activeStrategy.name})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Surveillance IA Active
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Désactivé
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {adaptiveState?.isPivoted
                  ? `Bascule active : ${adaptiveState.pivotReason || 'Mauvaise passe amortie'} (Perte: ${adaptiveState.lossStreakAtPivot}L / Déficit: ${adaptiveState.deficitToRecover.toFixed(2)} ${currency})`
                  : adaptiveSettings?.enabled
                  ? `Si ${adaptiveSettings.maxLossStreakTrigger} défaites consécutives ou >${adaptiveSettings.drawdownPercentTrigger}% de drawdown ➔ bascule automatique sur stratégie de repli amortissante.`
                  : 'Activez pour permettre au bot de réagir intelligemment et changer de stratégie quand la variance tourne mal.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {adaptiveState?.isPivoted && onResetPivot && (
              <button
                type="button"
                onClick={onResetPivot}
                className="px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1 transition"
                title="Forcer le retour immédiat à la stratégie principale"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Rétablir Principale</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdaptiveSettings(!showAdaptiveSettings)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Paramètres IA</span>
              {showAdaptiveSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {adaptiveState?.intelligentLog && adaptiveState.intelligentLog.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDecisionLog(!showDecisionLog)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1 transition"
                title="Historique des décisions prises"
              >
                <History className="w-3.5 h-3.5" />
                <span>Log ({adaptiveState.intelligentLog.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Adaptive Settings Drawer */}
        {showAdaptiveSettings && onUpdateAdaptiveSettings && (
          <div className="pt-3 mt-3 border-t border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">Activer la Bascule Automatique Intelligente</span>
                <span className="text-[11px] text-slate-400">Le bot surveille la session en continu et bifurque en cas de série noire.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adaptiveSettings.enabled}
                  onChange={(e) => onUpdateAdaptiveSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Trigger Loss Streak */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Déclencheur Pertes Consécutives</span>
                  <span className="text-amber-400 font-mono font-bold">{adaptiveSettings.maxLossStreakTrigger} Défaites</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={adaptiveSettings.maxLossStreakTrigger}
                  onChange={(e) => onUpdateAdaptiveSettings({ maxLossStreakTrigger: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 block">Ex: 3 ou 4 pour couper net les Martingales dangereuses.</span>
              </div>

              {/* Trigger Drawdown % */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Déclencheur Drawdown Max</span>
                  <span className="text-rose-400 font-mono font-bold">{adaptiveSettings.drawdownPercentTrigger}%</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="25"
                  step="1"
                  value={adaptiveSettings.drawdownPercentTrigger}
                  onChange={(e) => onUpdateAdaptiveSettings({ drawdownPercentTrigger: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] text-slate-500 block">Bascule si le profit chute de X% depuis son sommet.</span>
              </div>

              {/* Trigger Net Deficit */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Pertes Nettes Max ({currency})</span>
                  <span className="text-cyan-400 font-mono font-bold">{adaptiveSettings.lossAmountTrigger} {currency}</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="500"
                  step="0.5"
                  value={adaptiveSettings.lossAmountTrigger}
                  onChange={(e) => onUpdateAdaptiveSettings({ lossAmountTrigger: Math.max(0.1, Number(e.target.value)) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block">Bascule immédiate si le solde session plonge.</span>
              </div>
            </div>

            {/* Target Strategy & Mode Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Stratégie de Repli Défensive
                </label>
                <select
                  value={adaptiveSettings.customFallbackStrategyId || 'auto'}
                  onChange={(e) => onUpdateAdaptiveSettings({ customFallbackStrategyId: e.target.value === 'auto' ? undefined : e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="auto">✨ Sélection IA Automatique (Oscar's Grind / Scalper amortissant)</option>
                  {PREDEFINED_STRATEGIES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.game} - {st.riskLevel})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block">
                  L'IA bascule sur cette tactique pour amortir la variance sans risquer le bankroll.
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Règle de Retour à la Stratégie Principale
                </label>
                <select
                  value={adaptiveSettings.recoveryMode}
                  onChange={(e) => onUpdateAdaptiveSettings({ recoveryMode: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="on_win_streak">Après 2 Victoires Consécutives</option>
                  <option value="on_profit_recovered">Après Récupération du Déficit (75%+)</option>
                  <option value="fixed_bets">Après 8 Tours Amortis</option>
                </select>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adaptiveSettings.reduceBetPercent > 0}
                      onChange={(e) => onUpdateAdaptiveSettings({ reduceBetPercent: e.target.checked ? 50 : 0 })}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Mise -50% en mode repli</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adaptiveSettings.autoRotateSeedOnPivot}
                      onChange={(e) => onUpdateAdaptiveSettings({ autoRotateSeedOnPivot: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span>Nouvelle graine Provably Fair</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decision Log View */}
        {showDecisionLog && adaptiveState?.intelligentLog && (
          <div className="pt-3 mt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-bold text-slate-300">Journal des Arbitrages en Direct</span>
              <span>{adaptiveState.intelligentLog.length} décisions enregistrées</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {adaptiveState.intelligentLog.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                    log.type === 'pivot'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {log.type === 'pivot' ? (
                      <ArrowRightLeft className="w-3.5 h-3.5 mt-0.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold block">{log.message}</span>
                      <span className="text-[10px] text-slate-400">
                        {log.fromStrategy} ➔ {log.toStrategy}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Vault Protection Notification Bar */}
      {strategy.autoVaultWithdraw?.enabled && (
        <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-purple-950/20 border border-purple-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-slate-300">
              Auto-Withdraw Stake Actif : Dès que le solde dépasse <strong className="text-purple-300 font-mono">{strategy.autoVaultWithdraw.threshold} {currency}</strong>, l'excédent est transféré au coffre (solde conservé : <strong className="text-emerald-400 font-mono">{strategy.autoVaultWithdraw.keepBalance ?? strategy.autoVaultWithdraw.threshold} {currency}</strong>).
            </span>
          </div>
          {strategy.autoVaultWithdraw.totalTransferred !== undefined && strategy.autoVaultWithdraw.totalTransferred > 0 && (
            <span className="text-[11px] font-mono text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-700/40 whitespace-nowrap self-start sm:self-auto">
              Coffre : +{strategy.autoVaultWithdraw.totalTransferred.toFixed(4)} {currency}
            </span>
          )}
        </div>
      )}

      {/* Provably Fair Active Seed & Dynamic Nonce Controller */}
      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/20 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Graine Active Provably Fair Stake :</span>
          </div>

          {/* Client Seed */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Client :</span>
            {isEditingSeed ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customClientSeedInput}
                  onChange={(e) => setCustomClientSeedInput(e.target.value)}
                  className="bg-slate-950 border border-cyan-500/50 rounded px-1.5 py-0.5 text-[11px] font-mono text-cyan-200 w-32 focus:outline-none"
                  placeholder="Graine client..."
                />
                <button
                  type="button"
                  onClick={handleSaveCustomSeed}
                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  title="Enregistrer"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-200 text-[11px] max-w-[130px] truncate" title={clientSeed}>
                  {clientSeed}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingSeed(true)}
                  className="p-0.5 text-slate-400 hover:text-cyan-300 transition"
                  title="Modifier la graine client"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Server Seed Hash */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px]">Serveur (Hash) :</span>
            <span className="font-mono text-slate-400 text-[11px] max-w-[100px] truncate" title={serverSeedHash}>
              {serverSeedHash ? `${serverSeedHash.slice(0, 8)}...${serverSeedHash.slice(-6)}` : 'SHA256...'}
            </span>
          </div>

          {/* Current Dynamic Nonce */}
          <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/40 px-2.5 py-1 rounded-lg">
            <span className="text-cyan-300 text-[11px] font-semibold">Nonce :</span>
            <span className="font-mono font-bold text-cyan-200 text-xs">
              #{nonce}
            </span>
            <span className="text-[9px] text-cyan-400/80 uppercase font-sans font-bold bg-cyan-500/20 px-1 py-0.2 rounded">
              +1 par pari
            </span>
          </div>
        </div>

        {/* Rotate / New Seed Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRotate}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition flex items-center gap-1.5 shadow-sm"
            title="Générer une nouvelle paire de graines et réinitialiser le nonce à 1"
          >
            <Shuffle className="w-3 h-3 text-cyan-400" />
            <span>Nouvelle Graine</span>
          </button>
        </div>
      </div>

      {/* Interactive Game Visualizer Canvas */}
      {(simulationViewMode === 'both' || simulationViewMode === 'game') && (
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
          
          {/* Game Specific Visualizer */}
          {strategy.game === 'dice' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>0.00</span>
                <span className="text-emerald-400 font-bold">
                  Cible : {strategy.gameConfig?.diceCondition === 'below' ? '< ' : '> '}
                  {strategy.gameConfig?.diceTarget || 50.49}
                </span>
                <span>100.00</span>
              </div>

              {/* Slider bar */}
              <div className="relative w-full h-8 bg-slate-900 rounded-full border border-slate-800 overflow-hidden flex items-center">
                {/* Win Zone */}
                <div 
                  className="absolute right-0 h-full bg-emerald-500/20 border-l-2 border-emerald-400"
                  style={{ width: `${100 - (strategy.gameConfig?.diceTarget || 50.49)}%` }}
                />
                
                {/* Roll Marker */}
                {lastBet?.gameDetails?.roll !== undefined && (
                  <div 
                    className={`absolute top-0 bottom-0 w-3 rounded-full shadow-lg transition-all duration-200 ${
                      lastBet.won ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-rose-500 shadow-rose-500/50'
                    }`}
                    style={{ left: `calc(${lastBet.gameDetails.roll}% - 6px)` }}
                  />
                )}
              </div>

              {/* Result Box */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-xs text-slate-400 block mb-1">Dernier Tirage</span>
                  <div className={`text-3xl font-black font-mono tracking-wider px-6 py-2 rounded-2xl border transition-all ${
                    lastBet 
                      ? lastBet.won 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/50' 
                        : 'bg-rose-500/10 border-rose-500 text-rose-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {lastBet?.gameDetails?.roll !== undefined ? lastBet.gameDetails.roll.toFixed(2) : '50.00'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {strategy.game === 'limbo' && (
            <div className="text-center py-4 space-y-4">
              <div className="text-xs text-slate-400 font-mono">
                Multiplicateur Cible : <strong className="text-purple-400 font-bold">{strategy.targetMultiplier}x</strong>
              </div>

              <div className={`inline-block text-4xl sm:text-5xl font-black font-mono tracking-tight px-8 py-3 rounded-2xl border transition-all ${
                lastBet
                  ? lastBet.won
                    ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-xl shadow-purple-950/50 scale-105'
                    : 'bg-rose-500/10 border-rose-500 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {lastBet?.gameDetails?.limboMultiplier !== undefined 
                  ? `${lastBet.gameDetails.limboMultiplier.toFixed(2)}x`
                  : '1.00x'}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Rocket className="w-4 h-4 text-purple-400" />
                <span>Multiplicateur infini jusqu'à 1,000,000x</span>
              </div>
            </div>
          )}

          {strategy.game === 'mines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Mines : <strong className="text-rose-400">{strategy.gameConfig?.minesCount || 3}</strong></span>
                <span>Gemmes requises : <strong className="text-cyan-400">{strategy.gameConfig?.minesGemsToCashout || 3}</strong></span>
                <span>Cote : <strong className="text-emerald-400">{strategy.targetMultiplier}x</strong></span>
              </div>

              {/* 5x5 Mines Grid */}
              <div className="grid grid-cols-5 gap-2 max-w-[280px] mx-auto">
                {Array.from({ length: 25 }, (_, idx) => {
                  const isChosen = (strategy.gameConfig?.minesChosenTiles || [0, 1, 2]).includes(idx);
                  const isGemInResult = lastBet?.gameDetails?.minesGrid?.[idx];
                  const isMineInResult = lastBet?.gameDetails?.minesGrid && !lastBet.gameDetails.minesGrid[idx];

                  return (
                    <div
                      key={idx}
                      className={`h-11 rounded-xl border flex items-center justify-center font-mono text-xs transition-all ${
                        lastBet
                          ? isMineInResult
                            ? 'bg-rose-950/60 border-rose-600/80 text-rose-400'
                            : isChosen
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/40'
                            : 'bg-slate-900/60 border-slate-800 text-slate-600'
                          : isChosen
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}
                    >
                      {lastBet ? (
                        isMineInResult ? (
                          <Bomb className="w-5 h-5 text-rose-400 animate-bounce" />
                        ) : isChosen ? (
                          <Diamond className="w-5 h-5 text-cyan-300" />
                        ) : (
                          <Diamond className="w-3.5 h-3.5 opacity-20 text-slate-500" />
                        )
                      ) : (
                        isChosen ? <Diamond className="w-4 h-4 text-cyan-400" /> : <span className="opacity-40">{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {strategy.game === 'plinko' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-xs text-slate-400">
                Rangées : <strong className="text-slate-200">16</strong> • Risque : <strong className="text-rose-400 uppercase">High</strong>
              </div>

              {/* Visual slot indicator */}
              <div className="flex items-center justify-center gap-1 overflow-x-auto py-2">
                {[1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000].map((mult, slotIdx) => {
                  const isCurrentSlot = lastBet?.gameDetails?.plinkoSlot === slotIdx;
                  return (
                    <div
                      key={slotIdx}
                      className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                        isCurrentSlot
                          ? 'bg-rose-500 text-white scale-125 shadow-lg shadow-rose-500/50 ring-2 ring-white'
                          : mult >= 26
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                          : mult >= 2
                          ? 'bg-amber-950/60 text-amber-300'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {mult}x
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Dernier slot : <strong className="text-slate-100">{lastBet?.gameDetails?.plinkoSlot !== undefined ? `#${lastBet.gameDetails.plinkoSlot}` : '-'}</strong>
              </div>
            </div>
          )}

          {strategy.game === 'keno' && (
            <div className="text-center py-3 space-y-3">
              <div className="text-xs text-slate-400">
                5 Numéros choisis • Multiplicateur max : <strong className="text-amber-400 font-bold">450x</strong>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-sm mx-auto">
                {(strategy.gameConfig?.kenoNumbers || [7, 13, 21, 33, 40]).map((num) => {
                  const wasDrawn = lastBet?.gameDetails?.kenoDrawn?.includes(num);
                  return (
                    <span
                      key={num}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                        wasDrawn
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {num}
                    </span>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400">
                Correspondances : <strong className="text-amber-300">{lastBet?.gameDetails?.kenoMatches ?? 0} / 5</strong>
              </div>
            </div>
          )}

          {strategy.game === 'hilo' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-xs text-slate-400">
                Cartes tirées
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-24 rounded-xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center font-bold text-lg text-slate-200 shadow-md">
                  <span>{lastBet?.gameDetails?.hiloCards?.[0] || '8'}</span>
                  <span className="text-xs text-rose-400">♥</span>
                </div>

                <span className="text-xs font-bold text-slate-500">➔</span>

                <div className={`w-16 h-24 rounded-xl border-2 flex flex-col items-center justify-center font-bold text-lg shadow-lg ${
                  lastBet
                    ? lastBet.won ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300' : 'bg-rose-950/60 border-rose-500 text-rose-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  <span>{lastBet?.gameDetails?.hiloCards?.[1] || '?'}</span>
                  <span className="text-xs text-emerald-400">♠</span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Stake.com-Style Live Simulation Graph */}
      {(simulationViewMode === 'both' || simulationViewMode === 'chart') && (
        <StakeLiveChart
          bets={bets}
          stats={stats}
          currency={currency}
          isAutobetting={isAutobetting}
          isLiveMode={isLiveMode}
          startingBalance={balance - sessionProfit}
          currentBalance={balance}
          sessionProfit={sessionProfit}
          onClearHistory={onClearHistory}
          compact={simulationViewMode === 'both'}
          gameTitle={strategy.game}
          takeProfitTarget={strategy.stopOnProfit}
          stopLossTarget={strategy.stopOnLoss}
          betSpeedMs={betSpeedMs}
        />
      )}

      {/* Controller Buttons & Speed Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        
        {/* Main Play / Stop Button */}
        <div className="sm:col-span-5 flex gap-2">
          {!isAutobetting ? (
            <button
              id="btn-start-autobet"
              onClick={onStartAutoBet}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t('autobet.start', 'Démarrer Auto-Bet')}</span>
            </button>
          ) : (
            <motion.button
              id="btn-stop-autobet"
              onClick={onStopAutoBet}
              animate={
                isLiveMode
                  ? {
                      scale: [1, 1.025, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(225, 29, 72, 0)',
                        '0 0 16px 3px rgba(225, 29, 72, 0.45)',
                        '0 0 0 0 rgba(225, 29, 72, 0)',
                      ],
                    }
                  : {}
              }
              transition={
                isLiveMode
                  ? {
                      duration: 1.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition relative overflow-hidden"
            >
              {isLiveMode && (
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <Square className="w-4 h-4 fill-current" />
              <span>{t('autobet.stop', 'Arrêter Auto-Bet')}</span>
              {isLiveMode && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-400/40 text-[10px] uppercase font-mono tracking-wider text-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  LIVE
                </span>
              )}
            </motion.button>
          )}

          {/* Single Step Test Button */}
          <button
            id="btn-single-bet"
            onClick={handleManualBet}
            disabled={isAutobetting || animatingBet}
            className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
            title="Pari unique manuel"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('autobet.singleBet', 'Pari Unique')}</span>
          </button>
        </div>

        {/* Speed Controls */}
        <div className="sm:col-span-4 bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-1">
          <span className="text-[11px] font-semibold text-slate-400 px-1">Rythme :</span>
          <div className="flex items-center gap-1">
            {[
              { label: 'Précis (1.8s)', ms: 1800 },
              { label: 'Posé (1.2s)', ms: 1200 },
              { label: 'Standard (700ms)', ms: 700 },
            ].map((spd) => (
              <button
                key={spd.ms}
                onClick={() => setBetSpeedMs(spd.ms)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                  betSpeedMs === spd.ms
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Turbo Backtest / Batch 100 bets */}
        <div className="sm:col-span-3 flex items-center">
          <button
            id="btn-turbo-batch-100"
            onClick={() => handleTurboBatch(50)}
            disabled={isAutobetting}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <FastForward className="w-3.5 h-3.5 text-purple-400" />
            <span>Backtest x50 Paris</span>
          </button>
        </div>

      </div>

      {/* Real-time Betting History Table with Animated Green/Red Row Highlights */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-100">
              Flux des Paris en Direct ({bets.length})
            </h4>
            {lastBet && (
              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full transition-all duration-300 ${
                lastBet.won 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                Dernier: {lastBet.won ? `+${lastBet.profit.toFixed(4)} ${currency}` : `${lastBet.profit.toFixed(4)} ${currency}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SuggestStrategyOptimizationButton
              strategy={strategy}
              onUpdateStrategy={onUpdateStrategy}
              onSelectStrategy={onSelectStrategy}
              balance={balance}
              currency={currency}
              stats={stats}
              bets={bets}
              variant="compact"
              onStartAutoBet={onStartAutoBet}
            />

            {bets.length > 0 && onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800/60 transition"
                title="Réinitialiser l'historique"
              >
                <Trash2 className="w-3 h-3" />
                <span>Effacer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition"
              title={isHistoryExpanded ? 'Réduire' : 'Déplier'}
            >
              {isHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isHistoryExpanded && (
          <>
            {/* Smartphone Portrait List (< md) */}
            <div className="md:hidden space-y-2 font-mono">
              {bets.slice(0, 15).map((b, idx) => {
                const isFlashActive = b.id === latestAnimatedBetId || (idx === 0 && lastBet?.id === b.id);
                const flashClass = isFlashActive
                  ? b.won
                    ? 'animate-bet-win border-emerald-500/60'
                    : 'animate-bet-loss border-rose-500/60'
                  : 'bg-slate-900/80 border-slate-800';

                return (
                  <div
                    key={b.id}
                    className={`border rounded-xl p-3 space-y-1.5 transition-all duration-300 ${flashClass}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">#{b.betNumber}</span>
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {b.game}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${b.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {b.profit >= 0 ? '+' : ''}{b.profit.toFixed(4)} {currency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Mise: <strong className="text-slate-200">{b.betAmount.toFixed(4)}</strong></span>
                      <span>Cible: {b.targetMultiplier.toFixed(2)}x</span>
                      <span className="flex items-center gap-1">
                        <span>Tirage:</span>
                        {renderGameOutcome(b)}
                        {b.nonce && (
                          <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/40">
                            #{b.nonce}
                          </span>
                        )}
                      </span>
                      <span className="font-sans">
                        {b.won ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                            Gagné
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full border border-rose-500/30">
                            Perdu
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {bets.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-500 font-sans bg-slate-900/40 rounded-xl border border-slate-800">
                  Aucun pari pour le moment.
                </div>
              )}
            </div>

            {/* Desktop & Tablet Table (>= md) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5"># Pari</th>
                    <th className="py-2.5 px-3.5">Jeu</th>
                    <th className="py-2.5 px-3.5">Mise</th>
                    <th className="py-2.5 px-3.5">Cible</th>
                    <th className="py-2.5 px-3.5">Résultat / Tirage</th>
                    <th className="py-2.5 px-3.5">Profit ({currency})</th>
                    <th className="py-2.5 px-3.5">Solde</th>
                    <th className="py-2.5 px-3.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono">
                  {bets.slice(0, 25).map((b, idx) => {
                    const isFlashActive = b.id === latestAnimatedBetId || (idx === 0 && lastBet?.id === b.id);
                    const rowFlashClass = isFlashActive
                      ? b.won
                        ? 'animate-bet-win border-emerald-500/60 font-semibold'
                        : 'animate-bet-loss border-rose-500/60 font-semibold'
                      : 'hover:bg-slate-900/60 transition-colors duration-150';

                    return (
                      <tr
                        key={b.id}
                        id={`autobet-row-${b.id}`}
                        className={`transition-all duration-300 ${rowFlashClass}`}
                      >
                        <td className="py-2 px-3.5 font-bold text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span>#{b.betNumber}</span>
                            {b.nonce && (
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                n°{b.nonce}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3.5 uppercase text-[11px] font-bold text-slate-400">
                          {b.game}
                        </td>
                        <td className="py-2 px-3.5 text-slate-200">
                          {b.betAmount.toFixed(4)}
                        </td>
                        <td className="py-2 px-3.5 text-slate-400">
                          {b.targetMultiplier.toFixed(2)}x
                        </td>
                        <td className="py-2 px-3.5">
                          <div className="flex items-center gap-1.5">
                            {renderGameOutcome(b)}
                          </div>
                        </td>
                        <td className={`py-2 px-3.5 font-bold ${
                          b.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {b.profit >= 0 ? '+' : ''}{b.profit.toFixed(4)}
                        </td>
                        <td className="py-2 px-3.5 text-slate-400">
                          {b.runningBalance.toFixed(4)}
                        </td>
                        <td className="py-2 px-3.5 font-sans">
                          {b.won ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Gagné
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                              <XCircle className="w-3 h-3" /> Perdu
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {bets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-500 font-sans">
                        Aucun pari pour le moment. Démarrez l'auto-bet ou lancez un pari unique pour voir les résultats en direct.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

