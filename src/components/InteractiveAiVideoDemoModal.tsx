import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Coins, 
  Zap, 
  Video, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2,
  X,
  Bot,
  Activity,
  Award,
  Flame,
  Globe,
  Sliders,
  DollarSign,
  LineChart,
  Trophy,
  Layers,
  ChevronRight,
  Wifi,
  ExternalLink,
  Eye,
  EyeOff,
  Cpu,
  MousePointer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEffects } from '../utils/audioEffects';

interface DemoBetItem {
  id: number;
  multiplierTarget: number;
  resultMultiplier: number;
  betAmount: number;
  payout: number;
  profit: number;
  isWin: boolean;
  game: 'Dice' | 'Limbo' | 'Mines' | 'Plinko';
  timestamp: string;
}

interface InteractiveAiVideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBalance?: number;
  currency?: string;
}

type DemoTab = 'autopilot' | 'surebets' | 'montecarlo';

const DEMO_STEPS = [
  {
    id: 1,
    title: '1. Bankroll & Bayesian AI Init',
    tab: 'autopilot' as DemoTab,
    duration: 7,
    voiceText: 'Welcome to BNZSTRATS AI — the autonomous quantitative betting engine and bankroll optimizer. We begin with a clean one thousand dollar bankroll and activate our Bayesian variance engine.',
    subtitle: 'Starting Bankroll: $1,000.00 • Bayesian Neural Mode Active',
    highlightSelector: 'header-balance',
    pointerPos: { x: '50%', y: '12%' },
  },
  {
    id: 2,
    title: '2. AutoPilot Engine & Dynamic Pacing',
    tab: 'autopilot' as DemoTab,
    duration: 8,
    voiceText: 'Launching the AI AutoPilot with calculated 1.8-second pacing. The neural algorithm continuously evaluates historical variance and dynamically adjusts multiplier targets between 1.5x and 3.2x.',
    subtitle: 'AutoPilot Engaged: Dynamic Multiplier Optimization & Kelly Sizing',
    highlightSelector: 'autopilot-controls',
    pointerPos: { x: '24%', y: '45%' },
  },
  {
    id: 3,
    title: '3. Live Bets & PnL Curve Growth',
    tab: 'autopilot' as DemoTab,
    duration: 10,
    voiceText: 'Watch the live bets stream in real-time. Notice how win streaks are capitalized with fractional Kelly scaling, while sudden loss streaks are instantly cushioned by strict flat protection.',
    subtitle: 'Live Stake Simulation: Win Streaks • PnL Climbing to +$45.00',
    highlightSelector: 'live-chart',
    pointerPos: { x: '65%', y: '40%' },
  },
  {
    id: 4,
    title: '4. Surebets & Multi-Bookmaker Arbitrage',
    tab: 'surebets' as DemoTab,
    duration: 8,
    voiceText: 'Beyond casino algorithms, BNZSTRATS AI scans live sports markets to identify 100% guaranteed arbitrage opportunities with positive expected value across top global bookmakers.',
    subtitle: '100% Guaranteed Surebets: Real-Time Odds Scanner Active',
    highlightSelector: 'surebets-table',
    pointerPos: { x: '50%', y: '50%' },
  },
  {
    id: 5,
    title: '5. Target Profit Locked & Auto-Vault',
    tab: 'autopilot' as DemoTab,
    duration: 8,
    voiceText: 'Our target profit of plus 45 dollars, or plus 4.5 percent, is achieved. The session automatically halts and 50 percent of the profit is locked into the safe vault. Zero emotion. Pure execution.',
    subtitle: 'TARGET HIT: +$45.00 (+4.5%) • $22.50 Secured in Vault',
    highlightSelector: 'vault-banner',
    pointerPos: { x: '50%', y: '65%' },
  },
  {
    id: 6,
    title: '6. Algorithmic Edge & Call to Action',
    tab: 'autopilot' as DemoTab,
    duration: 6,
    voiceText: 'Elevate your betting strategy with algorithmic precision. Take full control of your bankroll with BNZSTRATS AI today.',
    subtitle: 'BNZSTRATS AI — Autonomous Quantitative Intelligence',
    highlightSelector: 'cta-banner',
    pointerPos: { x: '50%', y: '50%' },
  },
];

export const InteractiveAiVideoDemoModal: React.FC<InteractiveAiVideoDemoModalProps> = ({
  isOpen,
  onClose,
  initialBalance = 1000,
  currency = 'USD',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<DemoTab>('autopilot');
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);

  // Live Simulation Interactive State
  const [simBalance, setSimBalance] = useState(initialBalance);
  const [simProfit, setSimProfit] = useState(0);
  const [simVault, setSimVault] = useState(0);
  const [simBets, setSimBets] = useState<DemoBetItem[]>([]);
  const [pnlHistory, setPnlHistory] = useState<number[]>([0]);
  const [survivalScore, setSurvivalScore] = useState(98.6);
  const [currentMultiplierTarget, setCurrentMultiplierTarget] = useState(2.0);
  const [lastDiceRoll, setLastDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [totalWonBets, setTotalWonBets] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);

  // Scripted bets for high-converting visual demonstration
  const scriptedBets: Omit<DemoBetItem, 'id' | 'timestamp'>[] = [
    { multiplierTarget: 2.00, resultMultiplier: 3.42, betAmount: 5.00, payout: 10.00, profit: 5.00, isWin: true, game: 'Dice' },
    { multiplierTarget: 1.80, resultMultiplier: 2.15, betAmount: 6.00, payout: 10.80, profit: 4.80, isWin: true, game: 'Limbo' },
    { multiplierTarget: 2.20, resultMultiplier: 1.12, betAmount: 5.00, payout: 0.00, profit: -5.00, isWin: false, game: 'Dice' },
    { multiplierTarget: 2.00, resultMultiplier: 4.88, betAmount: 8.00, payout: 16.00, profit: 8.00, isWin: true, game: 'Mines' },
    { multiplierTarget: 1.50, resultMultiplier: 1.95, betAmount: 12.00, payout: 18.00, profit: 6.00, isWin: true, game: 'Limbo' },
    { multiplierTarget: 2.50, resultMultiplier: 3.10, betAmount: 7.00, payout: 17.50, profit: 10.50, isWin: true, game: 'Dice' },
    { multiplierTarget: 2.00, resultMultiplier: 2.80, betAmount: 10.00, payout: 20.00, profit: 10.00, isWin: true, game: 'Plinko' },
    { multiplierTarget: 1.75, resultMultiplier: 2.20, betAmount: 8.00, payout: 14.00, profit: 6.00, isWin: true, game: 'Limbo' },
  ];

  // Native Fullscreen Toggle
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Voice synthesis engine (Strictly Masculine American English Voice)
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.98;
      // Slightly lower pitch for deeper, confident masculine tone
      utterance.pitch = 0.88;

      const voices = window.speechSynthesis.getVoices();
      
      // Strict Priority for Masculine English Voices
      const maleVoiceKeywords = [
        'David', 'Guy', 'Mark', 'George', 'James', 'Daniel', 'Tom', 'Ryan',
        'Google US English Male', 'en-US-Neural2-D', 'en-US-Neural2-J',
        'en-us-x-sfg#male', 'Natural (Male)', 'Microsoft David', 'Alex'
      ];
      
      let selectedMaleVoice = voices.find(v => 
        v.lang.startsWith('en') && maleVoiceKeywords.some(keyword => v.name.toLowerCase().includes(keyword.toLowerCase()))
      );

      // Secondary fallback: Any English voice that does NOT match typical female names
      if (!selectedMaleVoice) {
        selectedMaleVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          !v.name.toLowerCase().includes('samantha') && 
          !v.name.toLowerCase().includes('zira') && 
          !v.name.toLowerCase().includes('victoria') && 
          !v.name.toLowerCase().includes('karen') && 
          !v.name.toLowerCase().includes('jenny') && 
          !v.name.toLowerCase().includes('female')
        );
      }

      if (selectedMaleVoice) {
        utterance.voice = selectedMaleVoice;
      }

      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  const stopVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const resetDemo = () => {
    stopVoice();
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setSimBalance(initialBalance);
    setSimProfit(0);
    setSimVault(0);
    setSimBets([]);
    setPnlHistory([0]);
    setCurrentMultiplierTarget(2.0);
    setSurvivalScore(98.6);
    setLastDiceRoll(null);
    setTotalWonBets(0);
    setActiveDemoTab('autopilot');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!isOpen) {
      resetDemo();
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, [isOpen]);

  // Main playback progression loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      stopVoice();
      return;
    }

    const currentStep = DEMO_STEPS[currentStepIndex];
    setActiveDemoTab(currentStep.tab);
    speakText(currentStep.voiceText);

    // Audio & Action triggers per step
    if (currentStep.id === 1) {
      soundEffects.playClick(true);
    } else if (currentStep.id === 2) {
      soundEffects.playToggle(true);
      setCurrentMultiplierTarget(2.2);
    } else if (currentStep.id === 5) {
      soundEffects.playWin(true);
      setSimVault(22.50);
    }

    let progressSec = 0;
    const intervalMs = 100;
    const totalTicks = (currentStep.duration * 1000) / intervalMs;

    timerRef.current = window.setInterval(() => {
      progressSec += 1;
      const pct = Math.min(100, (progressSec / totalTicks) * 100);
      setStepProgress(pct);

      // Trigger realistic bets rolling in step 2, 3, and 5
      if ((currentStep.id === 2 || currentStep.id === 3 || currentStep.id === 5) && progressSec % 14 === 0) {
        const betIndex = Math.floor((progressSec / 14) % scriptedBets.length);
        const betData = scriptedBets[betIndex];

        setIsRolling(true);
        setTimeout(() => {
          setIsRolling(false);
          setLastDiceRoll(betData.resultMultiplier);
          
          const newBet: DemoBetItem = {
            id: Date.now() + Math.random(),
            ...betData,
            timestamp: new Date().toLocaleTimeString(),
          };

          setSimBets(prev => [newBet, ...prev.slice(0, 9)]);
          if (betData.isWin) {
            setTotalWonBets(w => w + 1);
            soundEffects.playWin(true);
          } else {
            soundEffects.playLoss(true);
          }

          setSimProfit(prev => {
            const next = Number((prev + betData.profit).toFixed(2));
            setPnlHistory(h => [...h, next]);
            return next;
          });
          setSimBalance(prev => Number((prev + betData.profit).toFixed(2)));
          setCurrentMultiplierTarget(betData.multiplierTarget);
        }, 300);
      }

      if (pct >= 100) {
        if (currentStepIndex < DEMO_STEPS.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
          setStepProgress(0);
        } else {
          setIsPlaying(false);
          setStepProgress(100);
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopVoice();
    } else {
      if (currentStepIndex >= DEMO_STEPS.length - 1) {
        resetDemo();
      }
      setIsPlaying(true);
    }
  };

  const handleCopyScript = () => {
    const fullScript = DEMO_STEPS.map((s, i) => `[Scene ${i + 1}: ${s.title}]\n"${s.voiceText}"\n`).join('\n');
    navigator.clipboard.writeText(fullScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  if (!isOpen) return null;

  const activeStep = DEMO_STEPS[currentStepIndex];

  // SVG Chart path calculation for smooth PnL curve
  const chartWidth = 500;
  const chartHeight = 140;
  const minVal = Math.min(0, ...pnlHistory);
  const maxVal = Math.max(50, ...pnlHistory);
  const range = maxVal - minVal || 1;

  const points = pnlHistory.map((val, idx) => {
    const x = (idx / Math.max(1, pnlHistory.length - 1)) * chartWidth;
    const y = chartHeight - ((val - minVal) / range) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none"
    >
      
      {/* 1. ULTRA-REALISTIC APPLICATION TOP HEADER (Exact Live App Design) */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0 z-30 shadow-md backdrop-blur">
        
        {/* Brand Logo & Real-Time Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-wider text-white">BNZSTRATS</span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  IA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Neural Engine Active</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation Tabs (Interactive) */}
          <nav className="hidden xl:flex items-center gap-1 ml-3 pl-3 border-l border-slate-800">
            <button
              onClick={() => setActiveDemoTab('autopilot')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeDemoTab === 'autopilot'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stake AutoPilot IA</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('surebets')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeDemoTab === 'surebets'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Surebets & Arbitrage 100%</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('montecarlo')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeDemoTab === 'montecarlo'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Monte Carlo (10k)</span>
            </button>
          </nav>
        </div>

        {/* Live Bankroll & PnL Session (Permanently Prominent and Recadré) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          
          <div className="bg-slate-950/95 border border-emerald-500/40 rounded-xl px-3 sm:px-4 py-1.5 flex items-center gap-3 sm:gap-4 shadow-lg shadow-emerald-950/40">
            {/* Live Bankroll Box */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Live Bankroll</div>
                <div className="text-sm sm:text-base font-black text-white font-mono flex items-center gap-1">
                  <span>${simBalance.toFixed(2)}</span>
                  <span className="text-[9px] text-emerald-400 font-bold px-1 rounded bg-emerald-500/15 border border-emerald-500/30">
                    {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* PnL Session Box (Always Visible) */}
            <div className="pl-3 sm:pl-4 border-l border-slate-800">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>PnL Session</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                simProfit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-rose-400'
              }`}>
                {simProfit >= 0 ? `+$${simProfit.toFixed(2)}` : `-$${Math.abs(simProfit).toFixed(2)}`}
              </div>
            </div>
          </div>

          {/* Quick Exit Studio */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
            title="Quitter le mode Démo (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

      </header>

      {/* 2. MAIN APPLICATION CONTENT AREA (SWITCHABLE REALISTIC TABS) */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
        
        {/* Animated Presenter Pointer Spotlight */}
        {isPlaying && activeStep.pointerPos && (
          <motion.div
            className="absolute z-20 pointer-events-none hidden md:flex items-center gap-2"
            animate={{
              left: activeStep.pointerPos.x,
              top: activeStep.pointerPos.y,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center animate-ping absolute" />
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <MousePointer className="w-3 h-3 fill-current" />
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shadow-lg">
              AI Analyzing...
            </span>
          </motion.div>
        )}

        {/* TAB 1: STAKE AUTOPILOT IA ENGINE (DEFAULT REALISTIC DASHBOARD) */}
        {activeDemoTab === 'autopilot' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Top Row: Metrics & Live Dice / Limbo Interactive Game Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Stake Game Live Roller (Dice & Limbo Interactive Screen) */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Stake.com Live Simulation (Dice & Limbo)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                    Provably Fair
                  </span>
                </div>

                {/* Big Visual Multiplier Display */}
                <div className="py-6 bg-slate-950 rounded-2xl border border-slate-800/80 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                  <div className="text-[11px] text-slate-400 font-mono mb-1">
                    CIBLE MULTIPLICATEUR RECHERCHÉE : <span className="text-amber-400 font-bold">{currentMultiplierTarget.toFixed(2)}x</span>
                  </div>

                  <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight transition-all duration-300 ${
                    isRolling ? 'text-slate-600 scale-95' : (lastDiceRoll && lastDiceRoll >= currentMultiplierTarget ? 'text-emerald-400 scale-105 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-100')
                  }`}>
                    {isRolling ? 'ROLLING...' : (lastDiceRoll ? `${lastDiceRoll.toFixed(2)}x` : `${currentMultiplierTarget.toFixed(2)}x`)}
                  </div>

                  {lastDiceRoll && !isRolling && (
                    <div className={`mt-2 text-xs font-black px-3 py-0.5 rounded-full ${
                      lastDiceRoll >= currentMultiplierTarget ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {lastDiceRoll >= currentMultiplierTarget ? 'GAGNÉ (WIN) ✓' : 'PERDU (LOSS) ✗'}
                    </div>
                  )}
                </div>

                {/* Strategy Settings Info Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Stratégie Active</div>
                    <div className="text-xs font-bold text-cyan-400 mt-0.5">Bayésienne IA</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Cadence Pacing</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">1.8s Précis</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Risque Kelly</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">0.5% Flat Cap</div>
                  </div>
                </div>

              </div>

              {/* Real-Time Live Profit Chart & Risk Metrics */}
              <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl flex flex-col justify-between">
                
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Évolution du Profit Session (PnL en direct)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {simProfit >= 0 ? `+$${simProfit.toFixed(2)} (+${((simProfit / initialBalance) * 100).toFixed(1)}%)` : `-$${Math.abs(simProfit).toFixed(2)}`}
                  </div>
                </div>

                {/* SVG Smooth Curve */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 relative overflow-hidden h-36 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="pnlGradDemo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <polygon
                      points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                      fill="url(#pnlGradDemo)"
                    />
                    {/* Stroke line */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  </svg>

                  {/* Grid Lines */}
                  <div className="absolute inset-x-3 bottom-2 flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Début</span>
                    <span>Progression Algorithmique</span>
                    <span>Objectif +4.5%</span>
                  </div>
                </div>

                {/* Three Core Quantitative Protection Badges */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-slate-400">Survie Compte</div>
                      <div className="text-xs font-black text-white">{survivalScore}/100</div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-slate-400">Vault Sécurisé</div>
                      <div className="text-xs font-black text-amber-300">${simVault.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-slate-400">Taux de Réussite</div>
                      <div className="text-xs font-black text-teal-300">
                        {simBets.length > 0 ? `${((totalWonBets / simBets.length) * 100).toFixed(0)}%` : '85%'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Row: Live Bets History Table (Real Stake Design) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Historique des Paris en Direct (Stake Feed)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {simBets.length} paris exécutés
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-[10px]">
                      <th className="pb-2 font-semibold">HEURE</th>
                      <th className="pb-2 font-semibold">JEU</th>
                      <th className="pb-2 font-semibold">MISE</th>
                      <th className="pb-2 font-semibold">CIBLE</th>
                      <th className="pb-2 font-semibold">RÉSULTAT</th>
                      <th className="pb-2 font-semibold text-right">PROFIT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simBets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          Initialisation des algorithmes de paris...
                        </td>
                      </tr>
                    ) : (
                      simBets.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-2 text-slate-400 text-[11px]">{b.timestamp}</td>
                          <td className="py-2 font-bold text-white">{b.game}</td>
                          <td className="py-2 text-slate-300">${b.betAmount.toFixed(2)}</td>
                          <td className="py-2 text-amber-400 font-bold">{b.multiplierTarget.toFixed(2)}x</td>
                          <td className="py-2 text-slate-200">{b.resultMultiplier.toFixed(2)}x</td>
                          <td className={`py-2 text-right font-black ${b.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {b.isWin ? `+$${b.profit.toFixed(2)}` : `-$${Math.abs(b.profit).toFixed(2)}`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SUREBETS & ARBITRAGE 100% GARANTI (REALISTIC SCANNER) */}
        {activeDemoTab === 'surebets' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Scanner Live Surebets & Arbitrage 100% Garanti
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Zero Risque Mathématique
                </span>
              </div>

              {/* Sample Surebets Rows */}
              <div className="space-y-2.5">
                {[
                  { match: 'Real Madrid vs Manchester City', league: 'Ligue des Champions', book1: 'Stake.com (1.92)', book2: 'Pinnacle (2.25)', profitPct: '+4.85%', roi: '+$48.50' },
                  { match: 'Carlos Alcaraz vs Jannik Sinner', league: 'US Open ATP', book1: 'Stake.com (2.10)', book2: 'Betclic (2.05)', profitPct: '+3.72%', roi: '+$37.20' },
                  { match: 'Boston Celtics vs LA Lakers', league: 'NBA Basketball', book1: 'Stake.com (1.85)', book2: 'Unibet (2.35)', profitPct: '+3.44%', roi: '+$34.40' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">{item.league}</div>
                      <div className="text-sm font-black text-white mt-0.5">{item.match}</div>
                      <div className="text-xs text-slate-300 font-mono mt-1">
                        Bookmakers : <span className="text-emerald-400">{item.book1}</span> vs <span className="text-cyan-400">{item.book2}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Rendement Net</div>
                        <div className="text-base font-black text-emerald-400 font-mono">{item.profitPct}</div>
                      </div>
                      <span className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl">
                        {item.roi}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MONTE CARLO RISK SIMULATOR */}
        {activeDemoTab === 'montecarlo' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Simulateur Monte Carlo (10 000 Itérations Stochastiques)
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  Survie : 98.6%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Value at Risk (VaR 95%)</div>
                  <div className="text-lg font-black text-white font-mono mt-1">-3.8% max</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Espérance Mathématique (EV)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">+14.2% / cycle</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Facteur de Ruine Empirique</div>
                  <div className="text-lg font-black text-cyan-400 font-mono mt-1">0.14% (Négligeable)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Target Profit Celebration Banner (Step 5 Trigger) */}
        {currentStepIndex >= 4 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border border-emerald-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl shadow-emerald-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/30 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-white">Objectif Take-Profit Validé : +$45.00 (+4.5%)</div>
                <div className="text-xs text-emerald-300">
                  Le cycle s'est arrêté automatiquement. $22.50 ont été transférés et sanctuarisés dans le Vault.
                </div>
              </div>
            </div>
            <span className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider">
              Bénéfice Verrouillé
            </span>
          </motion.div>
        )}

      </main>

      {/* 3. FLOATING AI PRESENTER & RECORDING CONTROL HUD (DOCKED AT BOTTOM) */}
      <footer className="bg-slate-950/95 border-t border-slate-800/90 p-3 sm:p-4 z-40 backdrop-blur shadow-2xl flex flex-col gap-2">
        
        {/* Teleprompter Subtitle Banner (English Sync) */}
        {!isControlsMinimized && (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono mb-0.5">
                <Globe className="w-3 h-3" />
                <span>SCÈNE {currentStepIndex + 1}/{DEMO_STEPS.length} : {activeStep.title}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-100 italic">
                "{activeStep.voiceText}"
              </p>
            </div>

            <div className="text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
              {activeStep.subtitle}
            </div>
          </div>
        )}

        {/* Playback Controls & Video Recording Helpers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-lg cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : (currentStepIndex > 0 ? 'Reprendre' : 'Lancer Démo Vidéo')}</span>
            </button>

            <button
              onClick={resetDemo}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
              title="Réinitialiser"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                voiceEnabled
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={voiceEnabled ? 'Voix anglaise active' : 'Voix coupée'}
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice ON' : 'Mute'}</span>
            </button>

            <button
              onClick={toggleNativeFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
              title="Basculer Plein Écran Réel (F11)"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}</span>
            </button>
          </div>

          {/* Quick Scene Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  setStepProgress(0);
                  if (!isPlaying) setIsPlaying(true);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${
                  currentStepIndex === idx
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                Scène {idx + 1}
              </button>
            ))}
          </div>

          {/* Script Copy & HUD Minimizer */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyScript}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1"
              title="Copier le script complet"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedScript ? 'Copié !' : 'Script'}</span>
            </button>

            <button
              onClick={() => setIsControlsMinimized(!isControlsMinimized)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title={isControlsMinimized ? 'Afficher sous-titres' : 'Masquer sous-titres'}
            >
              {isControlsMinimized ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

      </footer>

    </div>
  );
};
