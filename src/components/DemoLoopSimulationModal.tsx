import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Activity,
  Maximize2,
  Minimize2,
  X,
  Bot,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  Coins,
  BarChart3,
  Cpu,
  Layers,
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import { soundEffects } from '../utils/audioEffects';

export interface DemoLoopBetResult {
  id: number;
  betNumber: number;
  stake: number;
  multiplier: number;
  rollResult: number;
  won: boolean;
  profit: number;
  balanceAfter: number;
  pnlCumulative: number;
  edge: number;
  kellyFactor: number;
  aiAction: string;
  timestamp: number;
}

export type DemoLoopStrategyType = 
  | 'dynamic_spectrum_133_777'
  | 'adaptive_kelly'
  | 'smart_recovery'
  | 'momentum_anti_martingale'
  | 'conservative_ev_plus';

interface DemoLoopSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBalance?: number;
  currency?: string;
  onApplyStrategyToBot?: (strategyConfig: any) => void;
}

const STRATEGIES: {
  id: DemoLoopStrategyType;
  name: string;
  badge: string;
  description: string;
  color: string;
  targetOddsRange: [number, number];
  baseEdge: number;
}[] = [
  {
    id: 'dynamic_spectrum_133_777',
    name: 'IA Spectre Dynamique (1.33x ➔ 7.77x)',
    badge: 'Intelligence Max',
    description: 'Modulation continue des cotes : 1.33x (bouclier sécurisé ~74.4% win) sur repli, 2.0x en scalping, et 7.77x (Quantum Spike) sur accélération.',
    color: 'amber',
    targetOddsRange: [1.33, 7.77],
    baseEdge: 0.058, // +5.8% EV
  },
  {
    id: 'adaptive_kelly',
    name: 'IA Kelly Adaptatif Dynamique',
    badge: 'Recommandé IA',
    description: 'Recalibre le fractionnement de Kelly et la mise en temps réel selon la volatilité et l\'Edge détecté.',
    color: 'emerald',
    targetOddsRange: [1.80, 2.50],
    baseEdge: 0.045, // +4.5% EV
  },
  {
    id: 'smart_recovery',
    name: 'Atténuation de Risque & Rebout',
    badge: 'Anti-Drawdown',
    description: 'Diminue la voilure lors des séries froides et active un booster sécurisé au premier signal de retournement.',
    color: 'purple',
    targetOddsRange: [1.50, 2.00],
    baseEdge: 0.038,
  },
  {
    id: 'momentum_anti_martingale',
    name: 'Momentum Anti-Martingale Pro',
    badge: 'Haute Volatilité',
    description: 'Capitalise sur les séquences de victoires en augmentant les gains et verrouille les profits au pic.',
    color: 'orange',
    targetOddsRange: [2.00, 3.20],
    baseEdge: 0.052,
  },
  {
    id: 'conservative_ev_plus',
    name: 'Croissance Régulière EV+ Flat',
    badge: 'Ultra Prudent',
    description: 'Mises modérées et cibles à haute probabilité pour une courbe de capital linéaire et stable.',
    color: 'cyan',
    targetOddsRange: [1.35, 1.85],
    baseEdge: 0.032,
  },
];

const SPEED_OPTIONS = [
  { label: '1x (Normale)', value: 200, icon: '1x' },
  { label: '5x (Rapide)', value: 60, icon: '5x' },
  { label: '20x (Ultra)', value: 18, icon: '20x' },
  { label: '50x (Hyper)', value: 6, icon: '50x' },
  { label: 'Turbo (Instant)', value: 0, icon: '⚡' },
];

export const DemoLoopSimulationModal: React.FC<DemoLoopSimulationModalProps> = ({
  isOpen,
  onClose,
  initialBalance = 1000,
  currency = 'USD',
  onApplyStrategyToBot,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<DemoLoopStrategyType>('adaptive_kelly');
  const [speedDelay, setSpeedDelay] = useState<number>(60); // 5x default
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [customStartBalance, setCustomStartBalance] = useState<number>(initialBalance > 0 ? initialBalance : 1000);
  
  // Loop execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentBetIndex, setCurrentBetIndex] = useState<number>(0);
  const [betsHistory, setBetsHistory] = useState<DemoLoopBetResult[]>([]);
  const [hoveredBet, setHoveredBet] = useState<DemoLoopBetResult | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<any>(null);
  const telemetryEndRef = useRef<HTMLDivElement | null>(null);

  // Strategy definition
  const currentStrategyObj = useMemo(() => {
    return STRATEGIES.find(s => s.id === selectedStrategy) || STRATEGIES[0];
  }, [selectedStrategy]);

  // Derived metrics from current bets
  const currentBalance = useMemo(() => {
    if (betsHistory.length === 0) return customStartBalance;
    return betsHistory[betsHistory.length - 1].balanceAfter;
  }, [betsHistory, customStartBalance]);

  const netPnL = currentBalance - customStartBalance;
  const pnlPercent = (netPnL / customStartBalance) * 100;

  const totalWins = useMemo(() => betsHistory.filter(b => b.won).length, [betsHistory]);
  const totalLosses = useMemo(() => betsHistory.filter(b => !b.won).length, [betsHistory]);
  const winRate = betsHistory.length > 0 ? (totalWins / betsHistory.length) * 100 : 0;

  // Max Drawdown calculation
  const maxDrawdownPct = useMemo(() => {
    if (betsHistory.length === 0) return 0;
    let peak = customStartBalance;
    let maxDd = 0;
    for (const b of betsHistory) {
      if (b.balanceAfter > peak) peak = b.balanceAfter;
      const dd = ((peak - b.balanceAfter) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }, [betsHistory, customStartBalance]);

  // Current Streak
  const currentStreak = useMemo(() => {
    if (betsHistory.length === 0) return { type: 'none', count: 0 };
    const lastWon = betsHistory[betsHistory.length - 1].won;
    let count = 0;
    for (let i = betsHistory.length - 1; i >= 0; i--) {
      if (betsHistory[i].won === lastWon) {
        count++;
      } else {
        break;
      }
    }
    return { type: lastWon ? 'win' : 'loss', count };
  }, [betsHistory]);

  // Auto-scroll telemetry log
  useEffect(() => {
    if (telemetryEndRef.current && isRunning) {
      telemetryEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [betsHistory.length, isRunning]);

  // Generate a single step in the 100 bets loop
  const generateNextBet = (
    betNum: number, 
    prevBalance: number, 
    history: DemoLoopBetResult[]
  ): DemoLoopBetResult => {
    const strat = currentStrategyObj;
    
    let multiplier = Number((strat.targetOddsRange[0] + Math.random() * (strat.targetOddsRange[1] - strat.targetOddsRange[0])).toFixed(2));
    
    // AI Adaptive Kelly & Stake computation
    let kellyFraction = 0.25; // 1/4 Kelly default
    let streakLossCount = 0;
    let streakWinCount = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].won) streakLossCount++;
      else break;
    }
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].won) streakWinCount++;
      else break;
    }

    let aiAction = '';
    let stakePct = 0.015; // 1.5% base

    if (strat.id === 'dynamic_spectrum_133_777') {
      // Dynamic spectrum regime selection (1.33x to 7.77x)
      if (streakLossCount >= 2) {
        multiplier = 1.33;
        stakePct = 0.01;
        aiAction = `🛡️ Bouclier Drawdown (-${streakLossCount}x) ➔ Cote Sécurisée @1.33x (Win Prob ~74.4%)`;
      } else if (streakWinCount >= 3) {
        multiplier = 7.77;
        stakePct = 0.005;
        aiAction = `💎 Quantum Spike (+${streakWinCount}w) ➔ Pic Asymétrique @7.77x (Mise protectrice 0.5%)`;
      } else if (streakWinCount === 2) {
        multiplier = 4.44;
        stakePct = 0.012;
        aiAction = `🚀 Asymmetric Surge (+2w) ➔ Accélération @4.44x`;
      } else if (streakWinCount === 1) {
        multiplier = 2.45;
        stakePct = 0.015;
        aiAction = `⚖️ Scalper Momentum (+1w) ➔ Optimisation @2.45x`;
      } else {
        multiplier = Number((1.85 + Math.random() * 0.40).toFixed(2));
        stakePct = 0.012;
        aiAction = `🎯 Steady Scalping ➔ Positionnement @${multiplier.toFixed(2)}x`;
      }
    } else if (strat.id === 'adaptive_kelly') {
      const fairProb = 1 / multiplier;
      const edge = strat.baseEdge * (1 + (Math.sin(betNum / 5) * 0.3));
      const fullKelly = ((multiplier * (fairProb + edge)) - 1) / (multiplier - 1);
      kellyFraction = streakWinCount >= 2 ? 0.35 : streakLossCount >= 2 ? 0.15 : 0.25;
      stakePct = Math.max(0.005, Math.min(0.04, fullKelly * kellyFraction));
      aiAction = streakWinCount >= 2
        ? `🔥 Série de gains (+${streakWinCount}) ➔ Kelly boosté à ${(kellyFraction * 100).toFixed(0)}% (Mise: ${(stakePct * 100).toFixed(1)}%)`
        : streakLossCount >= 2
        ? `🛡️ Perte consécutive ➔ Kelly réduit à ${(kellyFraction * 100).toFixed(0)}% pour protection`
        : `⚡ Optimiseur EV+ : Cible @${multiplier.toFixed(2)}x (Edge: +${(edge * 100).toFixed(1)}%)`;
    } else if (strat.id === 'smart_recovery') {
      if (streakLossCount >= 2) {
        stakePct = 0.008; // Safe de-escalation
        aiAction = `🛡️ Drawdown détecté (-${streakLossCount}x) ➔ Dé-escalade sécurisée (Mise à 0.8%)`;
      } else if (streakWinCount >= 1) {
        stakePct = 0.02;
        aiAction = `🚀 Signal de reprise ➔ Réactivation progressive du capital`;
      } else {
        stakePct = 0.012;
        aiAction = `⚖️ Maintien du corridor de variance contrôlé`;
      }
    } else if (strat.id === 'momentum_anti_martingale') {
      if (streakWinCount >= 1) {
        stakePct = Math.min(0.05, 0.015 * Math.pow(1.3, streakWinCount));
        aiAction = `⚡ Momentum Positif (+${streakWinCount}) ➔ Mise augmentée à ${(stakePct * 100).toFixed(1)}%`;
      } else {
        stakePct = 0.01;
        aiAction = `🔄 Réinitialisation à la mise de base après reset de série`;
      }
    } else {
      // Conservative EV+
      stakePct = 0.01;
      aiAction = `💎 Flat Compounding @${multiplier.toFixed(2)}x (Risque fixe 1.0%)`;
    }

    // Theoretical win prob with simulated positive edge
    const fairProb = 1 / multiplier;
    const realProb = Math.min(0.95, fairProb * (1 + strat.baseEdge));
    
    // Roll simulation (0 - 100)
    const roll = Math.random();
    const won = roll < realProb;

    const calculatedStake = Number((prevBalance * stakePct).toFixed(2));
    const stake = Math.max(1, calculatedStake);
    const profit = won ? Number((stake * (multiplier - 1)).toFixed(2)) : -stake;
    const balanceAfter = Number((prevBalance + profit).toFixed(2));
    const pnlCumulative = Number((balanceAfter - customStartBalance).toFixed(2));

    return {
      id: betNum,
      betNumber: betNum,
      stake,
      multiplier,
      rollResult: Number((roll * 100).toFixed(2)),
      won,
      profit,
      balanceAfter,
      pnlCumulative,
      edge: Number((strat.baseEdge * 100).toFixed(2)),
      kellyFactor: Number(kellyFraction.toFixed(2)),
      aiAction,
      timestamp: Date.now(),
    };
  };

  // Run the loop with selected speed
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (currentBetIndex >= 100) {
      setIsRunning(false);
      setIsCompleted(true);
      if (!soundMuted) soundEffects.playWin(true);
      return;
    }

    // Instant Turbo calculation
    if (speedDelay === 0) {
      let tempHistory = [...betsHistory];
      let bal = tempHistory.length > 0 ? tempHistory[tempHistory.length - 1].balanceAfter : customStartBalance;
      
      for (let i = currentBetIndex + 1; i <= 100; i++) {
        const betRes = generateNextBet(i, bal, tempHistory);
        tempHistory.push(betRes);
        bal = betRes.balanceAfter;
      }
      setBetsHistory(tempHistory);
      setCurrentBetIndex(100);
      setIsRunning(false);
      setIsCompleted(true);
      if (!soundMuted) soundEffects.playWin(true);
      return;
    }

    // Interval execution
    timerRef.current = setTimeout(() => {
      const nextIndex = currentBetIndex + 1;
      const prevBal = betsHistory.length > 0 ? betsHistory[betsHistory.length - 1].balanceAfter : customStartBalance;
      const nextBet = generateNextBet(nextIndex, prevBal, betsHistory);

      setBetsHistory(prev => [...prev, nextBet]);
      setCurrentBetIndex(nextIndex);

      if (!soundMuted && speedDelay >= 50) {
        if (nextBet.won) soundEffects.playWin(true);
        else soundEffects.playLoss(true);
      }

      if (nextIndex >= 100) {
        setIsRunning(false);
        setIsCompleted(true);
        if (!soundMuted) soundEffects.playWin(true);
      }
    }, speedDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, currentBetIndex, speedDelay, betsHistory, selectedStrategy, customStartBalance, soundMuted]);

  // Reset function
  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsRunning(false);
    setCurrentBetIndex(0);
    setBetsHistory([]);
    setIsCompleted(false);
    setHoveredBet(null);
    if (!soundMuted) soundEffects.playClick(true);
  };

  const handleStartPause = () => {
    if (isCompleted) {
      handleReset();
      setTimeout(() => setIsRunning(true), 50);
    } else {
      setIsRunning(!isRunning);
    }
    if (!soundMuted) soundEffects.playClick(true);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!isOpen) return null;

  // Calculate SVG Chart coordinates
  const chartPoints = useMemo<{ x: number; y: number }[]>(() => {
    if (betsHistory.length === 0) return [];
    const points: { x: number; y: number }[] = [];
    const allBalances = [customStartBalance, ...betsHistory.map(b => b.balanceAfter)];
    const minBal = Math.min(...allBalances) * 0.98;
    const maxBal = Math.max(...allBalances) * 1.02;
    const range = maxBal - minBal || 1;

    const width = 800;
    const height = 160;
    const paddingX = 10;
    const paddingY = 15;

    allBalances.forEach((bal, idx) => {
      const x = paddingX + (idx / 100) * (width - paddingX * 2);
      const y = height - paddingY - ((bal - minBal) / range) * (height - paddingY * 2);
      points.push({ x, y });
    });

    return points;
  }, [betsHistory, customStartBalance]);

  const svgPathD = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return '';
    return chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
  }, [chartPoints]);

  const svgAreaD = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgPathD} L ${last.x.toFixed(1)} 160 L ${first.x.toFixed(1)} 160 Z`;
  }, [chartPoints, svgPathD]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      
      <div 
        ref={containerRef}
        className="w-full max-w-6xl max-h-[96vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
      >
        
        {/* TOP HEADER */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FastForward className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Mode Demo Loop (100 Paris Accélérés)
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Réactivité Optimiseur IA</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Simule 100 paris consécutifs à haute vitesse pour observer l'adaptation dynamique du risque et de la mise.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundMuted(!soundMuted)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                soundMuted 
                  ? 'bg-slate-900 border-slate-800 text-slate-500' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={soundMuted ? "Activer les sons" : "Couper le son"}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          
          {/* 1. STRATEGY & SPEED CONTROLS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Strategy selector (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Stratégie de l'Optimiseur</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">100 Itérations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STRATEGIES.map((st) => {
                  const isSelected = selectedStrategy === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isRunning}
                      onClick={() => {
                        setSelectedStrategy(st.id);
                        if (betsHistory.length > 0) handleReset();
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 disabled:opacity-50 ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">{st.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0">
                          {st.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {st.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Speed & Start balance controls (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Vitesse d'Accélération</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {SPEED_OPTIONS.find(s => s.value === speedDelay)?.label}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {SPEED_OPTIONS.map((sp) => (
                    <button
                      key={sp.value}
                      type="button"
                      onClick={() => setSpeedDelay(sp.value)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition text-center ${
                        speedDelay === sp.value
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div>{sp.icon}</div>
                      <div className="text-[9px] opacity-75 font-mono">{sp.value === 0 ? 'Instant' : `${sp.value}ms`}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bankroll selector & Launch Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <label className="text-[9px] text-slate-400 uppercase font-semibold block">Capital Initial</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-emerald-400 font-bold">$</span>
                    <input
                      type="number"
                      disabled={isRunning || betsHistory.length > 0}
                      value={customStartBalance}
                      onChange={(e) => setCustomStartBalance(Math.max(10, parseFloat(e.target.value) || 1000))}
                      className="bg-transparent text-xs font-bold font-mono text-white w-full focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartPause}
                  className={`px-4 py-3 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg cursor-pointer ${
                    isRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                      : isCompleted
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/30'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Recommencer</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Lancer Loop (100)</span>
                    </>
                  )}
                </button>

                {betsHistory.length > 0 && !isRunning && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="Remettre à zéro"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* 2. REAL-TIME TELEMETRY KPI TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            
            {/* 1. Live Balance */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Bankroll</span>
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white flex items-baseline gap-1">
                <span>${currentBalance.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400 font-sans">{currency}</span>
              </div>
            </div>

            {/* 2. Net PnL */}
            <div className={`border rounded-xl p-3 space-y-1 ${
              netPnL >= 0 
                ? 'bg-emerald-950/30 border-emerald-500/40' 
                : 'bg-rose-950/30 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">PnL Net</span>
                {netPnL >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              </div>
              <div className={`text-sm sm:text-base font-black font-mono ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netPnL >= 0 ? `+$${netPnL.toFixed(2)}` : `-$${Math.abs(netPnL).toFixed(2)}`}
                <span className="text-[10px] ml-1 font-bold">({pnlPercent >= 0 ? `+${pnlPercent.toFixed(1)}%` : `${pnlPercent.toFixed(1)}%`})</span>
              </div>
            </div>

            {/* 3. Progress / 100 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Progression</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-cyan-400 flex items-center gap-1.5">
                <span>{currentBetIndex} / 100</span>
                <span className="text-[10px] font-bold text-slate-400 font-sans">Paris</span>
              </div>
            </div>

            {/* 4. Winrate */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Taux de Gain</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white flex items-baseline gap-1">
                <span>{winRate.toFixed(1)}%</span>
                <span className="text-[9px] text-slate-400">({totalWins}V - {totalLosses}D)</span>
              </div>
            </div>

            {/* 5. Max Drawdown */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Max Drawdown</span>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-purple-300">
                -{maxDrawdownPct.toFixed(1)}%
              </div>
            </div>

            {/* 6. Current Streak */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Série Actuelle</span>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono">
                {currentStreak.count === 0 ? (
                  <span className="text-slate-500">-</span>
                ) : currentStreak.type === 'win' ? (
                  <span className="text-emerald-400">+{currentStreak.count} Victoires</span>
                ) : (
                  <span className="text-rose-400">-{currentStreak.count} Pertes</span>
                )}
              </div>
            </div>

          </div>

          {/* 3. DYNAMIC EQUITY CURVE & PROGRESS TAPE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Courbe d'Équité Dynamique des 100 Paris
                </h3>
              </div>

              {hoveredBet && (
                <div className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2 animate-in fade-in">
                  <span className="text-slate-400">Pari #{hoveredBet.betNumber}:</span>
                  <span className={hoveredBet.won ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {hoveredBet.won ? `+${hoveredBet.profit}$ (@${hoveredBet.multiplier}x)` : `-${hoveredBet.stake}$`}
                  </span>
                  <span className="text-slate-300">Solde: ${hoveredBet.balanceAfter}</span>
                </div>
              )}
            </div>

            {/* SVG Live Area Chart */}
            <div className="relative h-40 w-full bg-slate-950 rounded-xl p-2 border border-slate-800/60 overflow-hidden">
              {betsHistory.length > 0 ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="demoLoopEquityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Baseline (Start Capital) */}
                  <line 
                    x1="0" 
                    y1="80" 
                    x2="800" 
                    y2="80" 
                    stroke="#334155" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />

                  {/* Area fill */}
                  <path d={svgAreaD} fill="url(#demoLoopEquityGrad)" />

                  {/* Line stroke */}
                  <path 
                    d={svgPathD} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />

                  {/* Current Tip Glowing Circle */}
                  {chartPoints.length > 0 && (
                    <circle
                      cx={chartPoints[chartPoints.length - 1].x}
                      cy={chartPoints[chartPoints.length - 1].y}
                      r="5"
                      className="fill-emerald-400 stroke-slate-950 stroke-2 animate-pulse"
                    />
                  )}
                </svg>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-1">
                  <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
                  <span>Cliquez sur « Lancer Loop » pour démarrer la simulation accélérée</span>
                </div>
              )}
            </div>

            {/* 100-Bets Interactive Visual Matrix Grid */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Ruban des 100 Paris (Matrix Tape)</span>
                <span>{currentBetIndex}/100 Traités</span>
              </div>

              <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 gap-1">
                {Array.from({ length: 100 }).map((_, idx) => {
                  const betNum = idx + 1;
                  const bet = betsHistory[idx];
                  const isCurrent = betNum === currentBetIndex;

                  let bgClass = 'bg-slate-900/60 border-slate-800 text-slate-600';
                  if (bet) {
                    bgClass = bet.won
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold hover:bg-emerald-500/40'
                      : 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold hover:bg-rose-500/40';
                  } else if (isCurrent) {
                    bgClass = 'bg-cyan-500/30 border-cyan-400 text-cyan-200 animate-pulse ring-1 ring-cyan-400';
                  }

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => bet && setHoveredBet(bet)}
                      onMouseLeave={() => setHoveredBet(null)}
                      className={`h-5 rounded border text-[9px] font-mono flex items-center justify-center transition cursor-pointer ${bgClass}`}
                      title={bet ? `Pari #${betNum}: ${bet.won ? 'Gagné (+' + bet.profit + '$)' : 'Perdu (-' + bet.stake + '$)'}` : `Pari #${betNum}`}
                    >
                      {betNum}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 4. REAL-TIME AI OPTIMIZER DECISION TELEMETRY */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Journal Télémétrique & Décisions de l'Optimiseur IA
                </h3>
              </div>
              <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                Temps Réel Quantitatif
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs pr-1 scrollbar-thin">
              {betsHistory.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-[11px]">
                  En attente du lancement de la boucle de 100 paris...
                </div>
              ) : (
                betsHistory.map((b) => (
                  <div
                    key={b.id}
                    className={`p-2 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition text-[11px] ${
                      b.won 
                        ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200' 
                        : 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400">#{b.betNumber}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        b.won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {b.won ? 'WIN' : 'LOSS'}
                      </span>
                      <span>Mise: ${b.stake} @{b.multiplier.toFixed(2)}x</span>
                      <span className="text-slate-400 font-sans text-[10px] hidden md:inline">| {b.aiAction}</span>
                    </div>

                    <div className="flex items-center gap-3 font-bold shrink-0">
                      <span className={b.won ? 'text-emerald-400' : 'text-rose-400'}>
                        {b.won ? `+$${b.profit.toFixed(2)}` : `-$${b.stake.toFixed(2)}`}
                      </span>
                      <span className="text-slate-300 text-[10px]">
                        Solde: ${b.balanceAfter.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={telemetryEndRef} />
            </div>
          </div>

          {/* 5. SUMMARY COMPLETED BANNER */}
          {isCompleted && (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Boucle de 100 Paris Terminée avec Succès</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      {pnlPercent >= 0 ? `+${pnlPercent.toFixed(2)}% ROI` : `${pnlPercent.toFixed(2)}% ROI`}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    L'optimiseur a ajusté dynamiquement 100 fois la mise pour protéger le capital et maximiser le taux de croissance géométrique.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rejouer (Nouveau Tirage)</span>
                </button>

                {onApplyStrategyToBot && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyStrategyToBot(currentStrategyObj);
                      onClose();
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Appliquer au Bot Stake</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
