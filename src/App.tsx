import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header, AppTab } from './components/Header';
import { StrategyGenerator } from './components/StrategyGenerator';
import { AutoBetEngine } from './components/AutoBetEngine';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ScriptExporter } from './components/ScriptExporter';
import { StakeApiSettingsModal } from './components/StakeApiSettingsModal';
import { ManualSessionTracker } from './components/ManualSessionTracker';
import { AdvancedGamesSuite } from './components/AdvancedGamesSuite';
import { CloudSyncManager } from './components/CloudSyncManager';
import { SeedAnalysis } from './components/SeedAnalysis';
import { SportsAnalysis } from './components/SportsAnalysis';
import { BacktestingSuite } from './components/BacktestingSuite';
import { AppAiAssistant } from './components/AppAiAssistant';
import { AppSettingsView } from './components/AppSettingsView';
import { AiStakeAutoPilot } from './components/AiStakeAutoPilot';
import { VipLicenseModal } from './components/VipLicenseModal';
import { loadLicenseState, consumeFreeBet } from './utils/licenseManager';
import { useTranslation } from './i18n/LanguageContext';
import { 
  BookOpen, 
  Trophy, 
  Sparkles, 
  BarChart3, 
  Settings, 
  Bot, 
  Dice5, 
  Cloud, 
  Key,
  Layers,
  ChevronUp
} from 'lucide-react';
import { 
  BettingStrategy, 
  BetResult, 
  BotStatistics, 
  StakeApiCredentials,
  ManualSession,
  UserProfile,
  AppBackupData,
  TrackedSportBet,
  SportTip,
  AppSettings,
  UserLicenseState
} from './types';
import { PREDEFINED_STRATEGIES } from './utils/predefinedStrategies';
import { simulateGameOutcome, generateRandomSeed } from './utils/provablyFair';
import { 
  DEFAULT_APP_SETTINGS, 
  calculateDynamicBaseBet 
} from './utils/appSettingsDefaults';
import { 
  applyGlobalRiskToAllStrategies, 
  loadSavedCalibratedStrategies 
} from './utils/bankrollSurvivalCalculator';
import { DEFAULT_WALLET_BALANCES } from './utils/stakeCurrencies';
import { 
  notifyCriticalLoss, 
  notifyUnexpectedBotStop, 
  notifyTakeProfit 
} from './utils/browserNotifications';
import { 
  evaluateConditionTrigger, 
  applyConditionAction,
  ConditionEvaluationContext 
} from './utils/stakeConditionEngine';
import {
  AdaptiveStrategySettings,
  AdaptiveState,
  DEFAULT_ADAPTIVE_SETTINGS,
  evaluateAdaptiveDecision,
  findBestDefensiveStrategy
} from './utils/adaptiveEngine';
import {
  computeAutonomousDecision,
  DEFAULT_AUTONOMOUS_CONFIG
} from './utils/autonomousDecisionBrain';

export default function App() {
  const { t, language, setLanguage } = useTranslation();

  // Navigation
  const [activeTab, setActiveTab] = useState<AppTab>('ai-bot');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isMobileMoreDrawerOpen, setIsMobileMoreDrawerOpen] = useState(false);

  // VIP License & Freemium Quota State
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseState, setLicenseState] = useState<UserLicenseState>(() => loadLicenseState());
  const licenseStateRef = useRef(licenseState);

  useEffect(() => {
    licenseStateRef.current = licenseState;
  }, [licenseState]);

  useEffect(() => {
    const handleSyncLicense = () => {
      setLicenseState(loadLicenseState());
    };
    window.addEventListener('storage', handleSyncLicense);
    return () => window.removeEventListener('storage', handleSyncLicense);
  }, []);

  // App Settings State (Language, odds format, audio, thresholds)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_app_settings');
      if (saved) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse app settings:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });

  // Keep settings.language in sync with i18n context
  useEffect(() => {
    if (language && settings.language !== language) {
      setSettings((prev) => ({ ...prev, language }));
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_app_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save app settings:', e);
    }
  }, [settings]);

  // Load custom/calibrated strategies from previous session on mount
  useEffect(() => {
    loadSavedCalibratedStrategies();
  }, []);

  // Synchronize light/dark theme class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    const mode = settings.themeMode || 'dark';

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
      }
    };

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(mode === 'dark');
    }
  }, [settings.themeMode]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    if (newSettings.language && newSettings.language !== language) {
      setLanguage(newSettings.language);
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
    setLanguage(DEFAULT_APP_SETTINGS.language);
  };

  // Multi-Wallet Balances
  const [wallets, setWallets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_wallets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_WALLET_BALANCES,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Failed to parse local wallets:', e);
    }
    return DEFAULT_WALLET_BALANCES;
  });

  // Save wallets
  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_wallets', JSON.stringify(wallets));
    } catch (e) {
      console.warn('Failed to save wallets:', e);
    }
  }, [wallets]);

  // Current active currency and balance
  const [currency, setCurrency] = useState('USDT');
  const balance = wallets[currency] !== undefined ? wallets[currency] : 100.00;

  const handleUpdateWallet = (curr: string, newAmt: number) => {
    setWallets((prev) => ({
      ...prev,
      [curr]: newAmt,
    }));
    walletsRef.current = {
      ...walletsRef.current,
      [curr]: newAmt,
    };
    if (curr === currency) {
      setSimulatedBalance(newAmt);
      simulatedBalanceRef.current = newAmt;
    }
  };

  const handleSetBalanceForCurrentCurrency = (newBal: number) => {
    handleUpdateWallet(currency, newBal);
    setSimulatedBalance(newBal);
    simulatedBalanceRef.current = newBal;
  };

  // Multi-Profiles state
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_profiles');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse profiles:', e);
    }
    return [
      {
        id: 'prof-main',
        name: 'Compte Stake Principal',
        description: 'Bankroll principale & Stratégies constructives',
        createdDate: Date.now() - 3600 * 1000 * 48,
        color: 'bg-emerald-500',
        isActive: true,
      },
      {
        id: 'prof-challenge',
        name: 'Défi Bankroll Scalping',
        description: 'Objectif +20% par semaine sans Martingale',
        createdDate: Date.now() - 3600 * 1000 * 24,
        color: 'bg-indigo-500',
        isActive: false,
      }
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>('prof-main');

  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_profiles', JSON.stringify(profiles));
    } catch (e) {
      console.warn('Failed to save profiles:', e);
    }
  }, [profiles]);

  // Manual Sessions History (Stored in localStorage)
  const [manualSessions, setManualSessions] = useState<ManualSession[]>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_manual_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => {
            const p = typeof s.profit === 'number' ? s.profit : (typeof s.profitOrLoss === 'number' ? s.profitOrLoss : 0);
            return {
              ...s,
              profit: p,
              profitOrLoss: p,
              endingBalance: typeof s.endingBalance === 'number' ? s.endingBalance : 100,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse local sessions:', e);
    }
    return [
      {
        id: 'session-seed-1',
        timestamp: Date.now() - 3600 * 1000 * 24,
        game: 'dice',
        strategyName: "Oscar's Grind Constructif (2.0x)",
        profitOrLoss: 12.50,
        profit: 12.50,
        currency: 'USDT',
        durationMinutes: 20,
        estimatedBets: 45,
        mood: 'disciplined',
        notes: 'Objectif Take Profit atteint calmement sans aucune Martingale.',
        startingBalance: 100.00,
        endingBalance: 112.50,
      },
      {
        id: 'session-seed-2',
        timestamp: Date.now() - 3600 * 1000 * 12,
        game: 'mines',
        strategyName: 'Mines 1-Mine Safe Hunter (88%)',
        profitOrLoss: 8.20,
        profit: 8.20,
        currency: 'USDT',
        durationMinutes: 15,
        estimatedBets: 30,
        mood: 'target_hit',
        notes: 'Très bonne régularité sur les diamants.',
        startingBalance: 112.50,
        endingBalance: 120.70,
      }
    ];
  });

  // Persist manual sessions
  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_manual_sessions', JSON.stringify(manualSessions));
    } catch (e) {
      console.warn('Failed to save manual sessions:', e);
    }
  }, [manualSessions]);

  // Tracked Sports Bets (AI Reliability Tracker)
  const [trackedSportBets, setTrackedSportBets] = useState<TrackedSportBet[]>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_tracked_sports_bets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse tracked sports bets:', e);
    }
    // Default initial seeded tracking history to demonstrate immediately
    return [
      {
        id: 'bet-hist-1',
        tipId: 'seed-tip-1',
        sport: 'football',
        match: 'Real Madrid vs Borussia Dortmund',
        league: 'UEFA Champions League',
        market: 'Vainqueur : Real Madrid',
        odds: 1.65,
        expectedValue: 6.8,
        confidenceScore: 84,
        stakePercent: 1.5,
        stakeAmount: 1.50,
        currency: 'USDT',
        status: 'won',
        profit: 0.98,
        createdAt: Date.now() - 3600 * 1000 * 48,
        resolvedAt: Date.now() - 3600 * 1000 * 46,
        finalScore: 'Real Madrid 2 - 0 Borussia Dortmund (Score Officiel)',
        resolutionNotes: 'Score 2-0 : Victoire du Real Madrid validée en finale.',
        sourceBadge: 'ESPN Score Officiel',
      },
      {
        id: 'bet-hist-2',
        tipId: 'seed-tip-2',
        sport: 'basketball',
        match: 'Boston Celtics vs Dallas Mavericks',
        league: 'NBA',
        market: 'Vainqueur : Boston Celtics',
        odds: 1.45,
        expectedValue: 5.4,
        confidenceScore: 82,
        stakePercent: 1.5,
        stakeAmount: 1.50,
        currency: 'USDT',
        status: 'won',
        profit: 0.68,
        createdAt: Date.now() - 3600 * 1000 * 24,
        resolvedAt: Date.now() - 3600 * 1000 * 22,
        finalScore: 'Boston Celtics 106 - 88 Dallas Mavericks (Score Officiel)',
        resolutionNotes: 'Score 106-88 : Victoire nette des Boston Celtics.',
        sourceBadge: 'ESPN Score Officiel',
      },
      {
        id: 'bet-hist-3',
        tipId: 'seed-tip-3',
        sport: 'tennis',
        match: 'Carlos Alcaraz vs Jannik Sinner',
        league: 'ATP Tour',
        market: 'Plus de 22.5 Jeux',
        odds: 1.78,
        expectedValue: 5.1,
        confidenceScore: 86,
        stakePercent: 2.0,
        stakeAmount: 2.00,
        currency: 'USDT',
        status: 'pending',
        profit: 0,
        createdAt: Date.now() - 3600 * 1000 * 2,
        kickoffTimestamp: Date.now() + 3600 * 1000 * 3,
        kickoffTime: '19:30',
        sourceBadge: 'À Venir',
      }
    ];
  });

  // Persist tracked sports bets
  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_tracked_sports_bets', JSON.stringify(trackedSportBets));
    } catch (e) {
      console.warn('Failed to save tracked sports bets:', e);
    }
  }, [trackedSportBets]);

  const handleTrackSportBet = useCallback((tip: SportTip, stakeAmount: number) => {
    const newBet: TrackedSportBet = {
      id: `tracked-${Date.now()}`,
      tipId: tip.id,
      sport: tip.sport,
      match: tip.match,
      league: tip.league,
      market: tip.market,
      odds: tip.odds,
      expectedValue: tip.expectedValue,
      confidenceScore: tip.confidenceScore,
      stakePercent: tip.recommendedStakePercent,
      stakeAmount: stakeAmount > 0 ? stakeAmount : 1.0,
      currency,
      status: 'pending',
      profit: 0,
      createdAt: Date.now(),
      kickoffTime: tip.kickoffTime,
      kickoffTimestamp: tip.kickoffTimestamp || (Date.now() + (tip.minutesUntilKickoff || 60) * 60 * 1000),
      minutesUntilKickoff: tip.minutesUntilKickoff,
      stakeFixtureId: tip.stakeFixtureId,
      stakeUrl: tip.stakeUrl,
      stakeMarketName: tip.stakeMarketName || tip.market,
    };
    setTrackedSportBets((prev) => [newBet, ...prev]);
  }, [currency]);

  const handleUpdateTrackedSportBetStatus = useCallback((
    id: string, 
    status: 'won' | 'lost' | 'void' | 'pending', 
    finalScore?: string,
    notes?: string
  ) => {
    setTrackedSportBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== id) return bet;
        let profit = 0;
        if (status === 'won') {
          profit = Number((bet.stakeAmount * (bet.odds - 1)).toFixed(2));
        } else if (status === 'lost') {
          profit = -bet.stakeAmount;
        }
        return {
          ...bet,
          status,
          profit,
          resolvedAt: status !== 'pending' ? Date.now() : undefined,
          finalScore: finalScore !== undefined ? finalScore : bet.finalScore,
          resolutionNotes: notes !== undefined ? notes : bet.resolutionNotes,
        };
      })
    );
  }, []);

  const handleBatchUpdateTrackedSportBets = useCallback((
    updates: Array<{
      id: string;
      status: 'won' | 'lost' | 'void' | 'pending';
      finalScore?: string;
      resolutionNotes?: string;
      autoResolved?: boolean;
    }>
  ) => {
    setTrackedSportBets((prev) =>
      prev.map((bet) => {
        const update = updates.find((u) => u.id === bet.id);
        if (!update) return bet;
        let profit = 0;
        if (update.status === 'won') {
          profit = Number((bet.stakeAmount * (bet.odds - 1)).toFixed(2));
        } else if (update.status === 'lost') {
          profit = -bet.stakeAmount;
        }
        return {
          ...bet,
          status: update.status,
          profit,
          resolvedAt: update.status !== 'pending' ? (bet.resolvedAt || Date.now()) : undefined,
          finalScore: update.finalScore !== undefined ? update.finalScore : bet.finalScore,
          resolutionNotes: update.resolutionNotes !== undefined ? update.resolutionNotes : bet.resolutionNotes,
          autoResolved: update.autoResolved !== undefined ? update.autoResolved : true,
          lastCheckedAt: Date.now(),
        };
      })
    );
  }, []);

  const handleDeleteTrackedSportBet = useCallback((id: string) => {
    setTrackedSportBets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleClearTrackedSportBets = useCallback(() => {
    setTrackedSportBets([]);
  }, []);

  const handleUpdateTrackedSportBetStake = useCallback((
    id: string,
    stakePercent: number,
    stakeAmount: number
  ) => {
    setTrackedSportBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== id) return bet;
        let profit = bet.profit;
        if (bet.status === 'won') {
          profit = Number((stakeAmount * (bet.odds - 1)).toFixed(2));
        } else if (bet.status === 'lost') {
          profit = -stakeAmount;
        }
        return {
          ...bet,
          stakePercent,
          stakeAmount,
          profit,
        };
      })
    );
  }, []);

  // Handle adding manual session
  const handleAddManualSession = useCallback((newSessionData: Omit<ManualSession, 'id' | 'timestamp' | 'startingBalance' | 'endingBalance'>) => {
    const profitVal = typeof newSessionData.profitOrLoss === 'number'
      ? newSessionData.profitOrLoss
      : (typeof newSessionData.profit === 'number' ? newSessionData.profit : 0);
    
    const sessCurrency = newSessionData.currency || currency;
    const currentCurrBalance = walletsRef.current[sessCurrency] || 100.00;
    const newEnding = Number((currentCurrBalance + profitVal).toFixed(4));
    
    const newSession: ManualSession = {
      ...newSessionData,
      currency: sessCurrency,
      profitOrLoss: profitVal,
      profit: profitVal,
      id: `session-${Date.now()}`,
      timestamp: Date.now(),
      startingBalance: currentCurrBalance,
      endingBalance: newEnding,
    };

    setManualSessions((prev) => [...prev, newSession]);
    handleUpdateWallet(sessCurrency, newEnding);
  }, [currency, handleUpdateWallet]);

  const handleDeleteManualSession = useCallback((id: string) => {
    setManualSessions((prev) => {
      const sessionToDelete = prev.find((s) => s.id === id);
      if (sessionToDelete) {
        const sessCurr = sessionToDelete.currency || currency;
        const currentCurrBalance = walletsRef.current[sessCurr] || 100.00;
        const profitVal = typeof sessionToDelete.profitOrLoss === 'number'
          ? sessionToDelete.profitOrLoss
          : (typeof sessionToDelete.profit === 'number' ? sessionToDelete.profit : 0);
        const revertedBalance = Number((currentCurrBalance - profitVal).toFixed(4));
        handleUpdateWallet(sessCurr, Math.max(0, revertedBalance));
      }
      return prev.filter((s) => s.id !== id);
    });
  }, [currency, handleUpdateWallet]);

  const handleClearManualSessions = useCallback(() => {
    setManualSessions([]);
    try {
      localStorage.removeItem('stake_bot_manual_sessions');
    } catch (e) {}
  }, []);

  const handleRefreshManualSessions = useCallback(() => {
    try {
      const saved = localStorage.getItem('stake_bot_manual_sessions');
      if (saved) {
        setManualSessions(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Profile operations
  const handleCreateProfile = (name: string, description: string) => {
    const newProf: UserProfile = {
      id: `prof-${Date.now()}`,
      name,
      description,
      createdDate: Date.now(),
      color: 'bg-teal-500',
      isActive: false,
    };
    setProfiles((prev) => [...prev, newProf]);
    setActiveProfileId(newProf.id);
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  };

  // Restore backup
  const handleRestoreBackup = (backup: AppBackupData) => {
    if (Array.isArray(backup.sessions)) {
      setManualSessions(backup.sessions);
    }
    if (backup.wallets && typeof backup.wallets === 'object') {
      setWallets(backup.wallets);
    }
    if (backup.apiCredentials) {
      setCredentials(backup.apiCredentials);
    }
    if (Array.isArray(backup.strategies) && backup.strategies.length > 0) {
      setCurrentStrategy(backup.strategies[0]);
    }
  };

  const handleResetAllData = () => {
    try {
      localStorage.removeItem('stake_bot_manual_sessions');
      localStorage.removeItem('stake_bot_wallets');
      localStorage.removeItem('stake_bot_profiles');
      localStorage.removeItem('stake_bot_tracked_sports_bets');
    } catch (e) {
      console.warn('Local storage error:', e);
    }
    window.location.reload();
  };

  // Credentials & Config
  const [credentials, setCredentials] = useState<StakeApiCredentials>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_api_credentials');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse local API credentials:', e);
    }
    return {
      apiKey: '',
      domain: 'stake.com',
      currency: 'USDT',
      isLiveMode: false,
      clientSeed: generateRandomSeed(),
      serverSeedHash: generateRandomSeed(),
      nonce: 1,
    };
  });

  // Persist API credentials
  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_api_credentials', JSON.stringify(credentials));
    } catch (e) {
      console.warn('Failed to save API credentials:', e);
    }
  }, [credentials]);

  // Background Polling Effect for Stake API live balance in Live Mode
  useEffect(() => {
    if (!credentials.isLiveMode) return;

    let isSubscribed = true;
    let isFetching = false;

    const fetchLiveBalances = async () => {
      if (isFetching || !isSubscribed) return;
      isFetching = true;

      try {
        const res = await fetch('/api/stake/user-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: credentials.apiKey,
            domain: credentials.domain || 'stake.com',
            currency,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (isSubscribed && data.ok && data.hasRealBalances && data.balances) {
          setWallets((prev) => {
            let changed = false;
            for (const [currKey, amt] of Object.entries(data.balances)) {
              if (typeof amt === 'number' && prev[currKey] !== amt) {
                changed = true;
                break;
              }
            }
            if (!changed) return prev;
            return {
              ...prev,
              ...(data.balances as Record<string, number>),
            };
          });
        }
      } catch (err) {
        console.warn('Stake Live Mode background polling error:', err);
      } finally {
        isFetching = false;
      }
    };

    // Immediate initial poll on entering live mode
    fetchLiveBalances();

    // Background periodic poll every 10 seconds
    const pollInterval = setInterval(fetchLiveBalances, 10000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [credentials.isLiveMode, credentials.apiKey, credentials.domain, currency]);

  // Strategy State
  const [currentStrategy, setCurrentStrategy] = useState<BettingStrategy>(PREDEFINED_STRATEGIES[0]);

  // Betting & Execution State
  const [isAutobetting, setIsAutobetting] = useState(false);
  const [currentBetAmount, setCurrentBetAmount] = useState<number>(PREDEFINED_STRATEGIES[0].baseBet);
  const [betSpeedMs, setBetSpeedMs] = useState(1800);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [peakSessionProfit, setPeakSessionProfit] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // History & Statistics
  const [bets, setBets] = useState<BetResult[]>([]);
  const [stats, setStats] = useState<BotStatistics>({
    totalBets: 0,
    totalWon: 0,
    totalLost: 0,
    winRate: 0,
    totalWagered: 0,
    netProfit: 0,
    peakProfit: 0,
    maxDrawdown: 0,
    currentStreak: 0,
    maxWinStreak: 0,
    maxLossStreak: 0,
    averageBet: 0,
    largestBet: 0,
    largestWin: 0,
    profitFactor: 0,
  });

  // Simulated / Virtual Strategy Bankroll (Used exclusively for casino strategy testing)
  const [simulatedBalance, setSimulatedBalance] = useState<number>(100.00);

  // Intelligent Adaptive Strategy State & Auto-Pivot Settings
  const [adaptiveSettings, setAdaptiveSettings] = useState<AdaptiveStrategySettings>(() => {
    try {
      const saved = localStorage.getItem('stake_bot_adaptive_settings');
      if (saved) {
        return { ...DEFAULT_ADAPTIVE_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse adaptive settings:', e);
    }
    return DEFAULT_ADAPTIVE_SETTINGS;
  });

  // Persist adaptive settings
  useEffect(() => {
    try {
      localStorage.setItem('stake_bot_adaptive_settings', JSON.stringify(adaptiveSettings));
    } catch (e) {}
  }, [adaptiveSettings]);

  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>(() => ({
    isPivoted: false,
    primaryStrategy: PREDEFINED_STRATEGIES[0],
    activeStrategy: PREDEFINED_STRATEGIES[0],
    pivotReason: null,
    pivotTimestamp: null,
    pivotCount: 0,
    betsSincePivot: 0,
    winsSincePivot: 0,
    lossStreakAtPivot: 0,
    profitAtPivot: 0,
    deficitToRecover: 0,
    intelligentLog: [],
  }));

  // Sync refs for live loops and synchronous execution
  const balanceRef = useRef(balance);
  const walletsRef = useRef(wallets);
  const credentialsRef = useRef(credentials);
  const simulatedBalanceRef = useRef(simulatedBalance);
  const isAutobettingRef = useRef(isAutobetting);
  const currentStrategyRef = useRef(currentStrategy);
  const currentBetAmountRef = useRef(currentBetAmount);
  const settingsRef = useRef(settings);
  const adaptiveSettingsRef = useRef(adaptiveSettings);
  const adaptiveStateRef = useRef(adaptiveState);
  const sessionProfitRef = useRef(sessionProfit);
  const peakSessionProfitRef = useRef(peakSessionProfit);
  const currentStreakRef = useRef(currentStreak);
  const betsRef = useRef(bets);
  const statsRef = useRef(stats);
  const consecutiveErrorsRef = useRef(0);
  const isBettingExecutingRef = useRef(false);
  const executeBetRef = useRef<(() => Promise<BetResult | null>) | null>(null);
  const wasAutobettingRef = useRef(false);
  const isManualStopRef = useRef(false);

  useEffect(() => {
    balanceRef.current = balance;
    walletsRef.current = wallets;
    credentialsRef.current = credentials;
    simulatedBalanceRef.current = simulatedBalance;
    isAutobettingRef.current = isAutobetting;
    currentStrategyRef.current = currentStrategy;
    currentBetAmountRef.current = currentBetAmount;
    settingsRef.current = settings;
    adaptiveSettingsRef.current = adaptiveSettings;
    adaptiveStateRef.current = adaptiveState;
    sessionProfitRef.current = sessionProfit;
    peakSessionProfitRef.current = peakSessionProfit;
    currentStreakRef.current = currentStreak;
    betsRef.current = bets;
    statsRef.current = stats;
  }, [balance, wallets, credentials, simulatedBalance, isAutobetting, currentStrategy, currentBetAmount, settings, adaptiveSettings, adaptiveState, sessionProfit, peakSessionProfit, currentStreak, bets, stats]);

  const handleSelectStrategy = useCallback((strat: BettingStrategy) => {
    setCurrentStrategy(strat);
    currentStrategyRef.current = strat;
    if (!isAutobettingRef.current) {
      setCurrentBetAmount(strat.baseBet);
      currentBetAmountRef.current = strat.baseBet;
      setSessionProfit(0);
      sessionProfitRef.current = 0;
      setPeakSessionProfit(0);
      peakSessionProfitRef.current = 0;
      setCurrentStreak(0);
      currentStreakRef.current = 0;
      setStopReason(null);
    }
  }, []);

  const handleUpdateStrategy = useCallback((updated: Partial<BettingStrategy>) => {
    setCurrentStrategy((prev) => {
      const next = { ...prev, ...updated };
      currentStrategyRef.current = next;
      if (updated.baseBet !== undefined) {
        setCurrentBetAmount(updated.baseBet);
        currentBetAmountRef.current = updated.baseBet;
      }
      return next;
    });
  }, []);

  const handleApplyGlobalRiskToAll = useCallback((riskPct: number) => {
    const effectiveBal = balance > 0 ? balance : 100;
    const result = applyGlobalRiskToAllStrategies(effectiveBal, riskPct);
    const updatedCurrent = result.updatedStrategies.find((s) => s.id === currentStrategy.id) || result.updatedStrategies[0];
    if (updatedCurrent) {
      setCurrentStrategy(updatedCurrent);
      currentStrategyRef.current = updatedCurrent;
      if (!isAutobettingRef.current) {
        setCurrentBetAmount(updatedCurrent.baseBet);
        currentBetAmountRef.current = updatedCurrent.baseBet;
      }
    }
    setSettings((prev) => ({
      ...prev,
      globalRiskPercent: riskPct,
    }));
  }, [balance, currentStrategy.id]);

  const handleResetBalance = useCallback(() => {
    handleSetBalanceForCurrentCurrency(100.00);
  }, [currency]);

  const handleResetSimulationStats = useCallback(() => {
    setSimulatedBalance(100.00);
    simulatedBalanceRef.current = 100.00;
    handleUpdateWallet(currency, 100.00);
    setSessionProfit(0);
    sessionProfitRef.current = 0;
    setPeakSessionProfit(0);
    peakSessionProfitRef.current = 0;
    setCurrentStreak(0);
    currentStreakRef.current = 0;
    setBets([]);
    betsRef.current = [];
    const initStats: BotStatistics = {
      totalBets: 0,
      totalWon: 0,
      totalLost: 0,
      winRate: 0,
      totalWagered: 0,
      netProfit: 0,
      peakProfit: 0,
      maxDrawdown: 0,
      currentStreak: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      averageBet: 0,
      largestBet: 0,
      largestWin: 0,
      profitFactor: 0,
    };
    setStats(initStats);
    statsRef.current = initStats;
    setStopReason(null);

    // Rotate seeds on demo reset so each simulation sequence is fresh and non-repetitive
    const newClient = generateRandomSeed(16);
    const newServerHash = generateRandomSeed(64);
    const updated = {
      ...credentialsRef.current,
      clientSeed: newClient,
      serverSeedHash: newServerHash,
      nonce: 1,
    };
    credentialsRef.current = updated;
    setCredentials(updated);
  }, [currency]);

  // Provably Fair Seed Management
  const handleRotateSeed = useCallback((customClientSeed?: string) => {
    const newClient = customClientSeed && customClientSeed.trim() 
      ? customClientSeed.trim() 
      : generateRandomSeed(16);
    const newServerHash = generateRandomSeed(64);
    const updated = {
      ...credentialsRef.current,
      clientSeed: newClient,
      serverSeedHash: newServerHash,
      nonce: 1,
    };
    credentialsRef.current = updated;
    setCredentials(updated);
    console.log('[PROVABLY FAIR] Seed rotated successfully -> Client:', newClient, '| Nonce reset to 1');
  }, []);

  const handleUpdateActiveSeed = useCallback((updates: Partial<{ clientSeed: string; serverSeedHash: string; nonce: number }>) => {
    const updated = {
      ...credentialsRef.current,
      ...updates,
    };
    credentialsRef.current = updated;
    setCredentials(updated);
  }, []);

  const handleCurrencyChange = useCallback((newCurr: string) => {
    setCurrency(newCurr);
    const currBal = walletsRef.current[newCurr] !== undefined ? walletsRef.current[newCurr] : 100.00;
    setSimulatedBalance(currBal);
    simulatedBalanceRef.current = currBal;
    setCurrentStrategy((prev) => ({ ...prev, currency: newCurr }));
    setCredentials((prev) => ({ ...prev, currency: newCurr }));
  }, []);

  // Manual Strategy Pivot overrides
  const handleManualStrategyPivot = useCallback((targetStrategyId?: string) => {
    const strat = currentStrategyRef.current;
    let target = PREDEFINED_STRATEGIES.find(s => s.id === targetStrategyId);
    if (!target) {
      target = findBestDefensiveStrategy(strat.game, strat.riskLevel, adaptiveSettingsRef.current.customFallbackStrategyId);
    }
    const now = Date.now();
    setAdaptiveState(prev => ({
      ...prev,
      isPivoted: true,
      primaryStrategy: prev.isPivoted ? prev.primaryStrategy : strat,
      activeStrategy: target,
      pivotReason: 'Bascule manuelle vers stratégie de repli',
      pivotTimestamp: now,
      pivotCount: prev.pivotCount + 1,
      betsSincePivot: 0,
      winsSincePivot: 0,
      deficitToRecover: 0,
      intelligentLog: [
        {
          id: `pivot-manual-${now}`,
          timestamp: now,
          type: 'pivot',
          message: `Bascule manuelle forcée vers ${target.name}`,
          fromStrategy: strat.name,
          toStrategy: target.name,
        },
        ...prev.intelligentLog.slice(0, 49),
      ],
    }));
    setCurrentStrategy(target);
    setCurrentBetAmount(target.baseBet);
  }, []);

  const handleResetStrategyPivot = useCallback(() => {
    const primary = adaptiveStateRef.current.primaryStrategy || PREDEFINED_STRATEGIES[0];
    const now = Date.now();
    setAdaptiveState(prev => ({
      ...prev,
      isPivoted: false,
      activeStrategy: primary,
      pivotReason: null,
      betsSincePivot: 0,
      winsSincePivot: 0,
      intelligentLog: [
        {
          id: `reset-pivot-${now}`,
          timestamp: now,
          type: 'recovery',
          message: `Rétablissement manuel de la stratégie principale ${primary.name}`,
          fromStrategy: currentStrategyRef.current.name,
          toStrategy: primary.name,
        },
        ...prev.intelligentLog.slice(0, 49),
      ],
    }));
    setCurrentStrategy(primary);
    setCurrentBetAmount(primary.baseBet);
  }, []);

  // Execute a bet (Supports both Stake Real API mode & Provably Fair local simulation mode)
  const executeBet = useCallback(async (): Promise<BetResult | null> => {
    let strat = currentStrategyRef.current;
    const isLive = Boolean(credentialsRef.current.isLiveMode && credentialsRef.current.apiKey);
    const activeBalance = walletsRef.current[strat.currency] !== undefined 
      ? walletsRef.current[strat.currency] 
      : (isLive ? balanceRef.current : simulatedBalanceRef.current);

    // 1. VIP Pro verification for Autonomous Brain
    const isAutonomousStrat = Boolean(strat.isAutonomousBrain || strat.id === 'strat-autonomous-brain' || strat.id?.includes('autonomous'));
    if (isAutonomousStrat && !licenseStateRef.current.isPro) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      setIsLicenseModalOpen(true);
      const msg = "Le Cerveau IA Autonome nécessite une licence VIP Pro active.";
      setStopReason(msg);
      return null;
    }

    // 2. Freemium Daily Quota check (50 free bets/day)
    const quotaResult = consumeFreeBet();
    if (!quotaResult.allowed) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const updatedState = loadLicenseState();
      setLicenseState(updatedState);
      licenseStateRef.current = updatedState;
      setIsLicenseModalOpen(true);
      const msg = quotaResult.reason || "Quota journalier gratuit de 50 paris atteint. Activez une clé VIP pour continuer en illimité !";
      setStopReason(msg);
      if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnUnexpectedStop) {
        notifyUnexpectedBotStop({
          reason: msg,
          game: strat.game,
          currency: strat.currency,
          strategyName: strat.name,
        });
      }
      return null;
    } else {
      const updatedState = loadLicenseState();
      setLicenseState(updatedState);
      licenseStateRef.current = updatedState;
    }

    // If strategy is running the Autonomous Decision Brain, evaluate real-time AI quant brain
    if (strat.isAutonomousBrain || strat.id === 'strat-autonomous-brain' || strat.id?.includes('autonomous')) {
      const autoDecision = computeAutonomousDecision(
        strat.autonomousConfig || DEFAULT_AUTONOMOUS_CONFIG,
        strat,
        betsRef.current || [],
        statsRef.current,
        sessionProfitRef.current,
        peakSessionProfitRef.current,
        currentStreakRef.current,
        activeBalance,
        strat.currency
      );

      currentBetAmountRef.current = autoDecision.calculatedBetAmount;
      setCurrentBetAmount(autoDecision.calculatedBetAmount);

      strat = {
        ...strat,
        game: autoDecision.chosenGame,
        targetMultiplier: autoDecision.chosenMultiplier,
        winChance: autoDecision.chosenWinChance,
        gameConfig: autoDecision.gameConfig || strat.gameConfig,
        name: `IA Autonome - ${autoDecision.strategyName}`,
      };
      currentStrategyRef.current = strat;
      setCurrentStrategy(strat);

      if (autoDecision.seedRotationAdvised && (strat.autonomousConfig?.autoRotateSeedOnAnomaly !== false)) {
        handleRotateSeed();
      }
    }

    // Balance check with fallback to baseBet if bankroll can still support base bets
    let currentBet = currentBetAmountRef.current;
    if (activeBalance < currentBet) {
      if (activeBalance >= strat.baseBet && strat.baseBet > 0) {
        currentBet = strat.baseBet;
        currentBetAmountRef.current = currentBet;
        setCurrentBetAmount(currentBet);
      } else {
        setIsAutobetting(false);
        isAutobettingRef.current = false;
        const reason = isLive
          ? `Solde réel Stake insuffisant (${activeBalance.toFixed(4)} ${strat.currency}) pour miser ${currentBet} ${strat.currency}`
          : `Solde insuffisant (${activeBalance.toFixed(4)} ${strat.currency}) pour placer la mise (${currentBet} ${strat.currency})`;
        setStopReason(reason);
        if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnUnexpectedStop) {
          notifyUnexpectedBotStop({
            reason,
            game: strat.game,
            balance: activeBalance,
            currency: strat.currency,
            strategyName: strat.name,
          });
        }
        return null;
      }
    }

    // Active Provably Fair Seed & Nonce
    const activeClientSeed = credentialsRef.current.clientSeed || 'stake_user_client_seed_777';
    const activeServerSeed = credentialsRef.current.serverSeedHash || 'stake_official_server_seed_2026_default';
    const currentNonce = Math.max(1, credentialsRef.current.nonce || 1);

    let won = false;
    let payoutMultiplier = 0;
    let profit = 0;
    let gameDetails: any = {};
    let resolvedClientSeed = activeClientSeed;
    let resolvedServerSeed = activeServerSeed;
    let resolvedNonce = currentNonce;

    if (isLive) {
      // Real Mode Stake API execution
      try {
        const res = await fetch('/api/stake/original-bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: strat.game,
            amount: currentBet,
            currency: strat.currency,
            targetMultiplier: strat.targetMultiplier,
            gameConfig: strat.gameConfig,
            clientSeed: activeClientSeed,
            serverSeedHash: activeServerSeed,
            nonce: currentNonce,
            apiKey: credentialsRef.current.apiKey,
            domain: credentialsRef.current.domain || 'stake.com',
            isLiveMode: true,
          }),
        });

        const data = await res.json();
        if (data && data.ok) {
          won = data.won;
          payoutMultiplier = data.payoutMultiplier || (won ? strat.targetMultiplier : 0);
          profit = Number(data.profit.toFixed(4));
          gameDetails = data.gameDetails || {};
          resolvedClientSeed = data.clientSeed || activeClientSeed;
          resolvedServerSeed = data.serverSeedHash || activeServerSeed;
          resolvedNonce = data.nonce || currentNonce;
        } else {
          // Fallback to local Provably Fair calculation if API encounters transient network latency
          const simRes = simulateGameOutcome(
            strat.game,
            strat.targetMultiplier,
            strat.gameConfig,
            activeServerSeed,
            activeClientSeed,
            currentNonce
          );
          won = simRes.won;
          payoutMultiplier = won ? (simRes.actualMultiplier || strat.targetMultiplier) : 0;
          profit = won ? Number((currentBet * (payoutMultiplier - 1)).toFixed(4)) : -currentBet;
          gameDetails = simRes.gameDetails;
        }
      } catch (err) {
        console.warn('Stake Live API error, using provably fair resolver:', err);
        const simRes = simulateGameOutcome(
          strat.game,
          strat.targetMultiplier,
          strat.gameConfig,
          activeServerSeed,
          activeClientSeed,
          currentNonce
        );
        won = simRes.won;
        payoutMultiplier = won ? (simRes.actualMultiplier || strat.targetMultiplier) : 0;
        profit = won ? Number((currentBet * (payoutMultiplier - 1)).toFixed(4)) : -currentBet;
        gameDetails = simRes.gameDetails;
      }
    } else {
      // Simulation mode
      const gameResult = simulateGameOutcome(
        strat.game,
        strat.targetMultiplier,
        strat.gameConfig,
        activeServerSeed,
        activeClientSeed,
        currentNonce
      );
      won = gameResult.won;
      payoutMultiplier = won ? (gameResult.actualMultiplier || strat.targetMultiplier) : 0;
      profit = won ? Number((currentBet * (payoutMultiplier - 1)).toFixed(4)) : -currentBet;
      gameDetails = gameResult.gameDetails;
    }

    // Increment nonce synchronously in ref and schedule state update
    const nextNonce = resolvedNonce + 1;
    credentialsRef.current = { ...credentialsRef.current, nonce: nextNonce };
    setCredentials(credentialsRef.current);

    // Update balances
    const newBal = Number((activeBalance + profit).toFixed(4));
    walletsRef.current = { ...walletsRef.current, [strat.currency]: newBal };
    handleUpdateWallet(strat.currency, newBal);
    simulatedBalanceRef.current = newBal;
    setSimulatedBalance(newBal);

    // Update Session Profit & Peak Profit for Trailing Stop-Loss
    const prevSessionProfit = sessionProfitRef.current;
    const newSessionProfit = Number((prevSessionProfit + profit).toFixed(4));
    sessionProfitRef.current = newSessionProfit;
    setSessionProfit(newSessionProfit);

    const prevPeakProfit = peakSessionProfitRef.current;
    const updatedPeakProfit = Math.max(prevPeakProfit, newSessionProfit);
    peakSessionProfitRef.current = updatedPeakProfit;
    setPeakSessionProfit(updatedPeakProfit);

    // Update Streak
    const prevStreak = currentStreakRef.current;
    let newStreak = 0;
    if (won) {
      newStreak = prevStreak >= 0 ? prevStreak + 1 : 1;
    } else {
      newStreak = prevStreak <= 0 ? prevStreak - 1 : -1;
    }
    currentStreakRef.current = newStreak;
    setCurrentStreak(newStreak);

    const currentBetsList = betsRef.current;
    const betResult: BetResult = {
      id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      betNumber: currentBetsList.length + 1,
      timestamp: Date.now(),
      game: strat.game,
      currency: strat.currency,
      betAmount: currentBet,
      targetMultiplier: strat.targetMultiplier,
      payoutMultiplier,
      won,
      profit,
      runningBalance: newBal,
      runningProfit: newSessionProfit,
      serverSeedHash: resolvedServerSeed,
      clientSeed: resolvedClientSeed,
      nonce: resolvedNonce,
      gameDetails,
    };

    // Update Bets in ref & state
    const nextBets = [betResult, ...currentBetsList.slice(0, 4999)];
    betsRef.current = nextBets;
    setBets(nextBets);

    setStats((prev) => {
      const newTotalBets = prev.totalBets + 1;
      const newTotalWon = won ? prev.totalWon + 1 : prev.totalWon;
      const newTotalLost = !won ? prev.totalLost + 1 : prev.totalLost;
      const newNetProfit = Number((prev.netProfit + profit).toFixed(4));
      const newTotalWagered = Number((prev.totalWagered + currentBet).toFixed(4));
      const newPeakProfit = Math.max(prev.peakProfit, newNetProfit);
      const newLowestProfit = Math.min(prev.lowestProfit ?? 0, newNetProfit);
      const newDrawdown = Math.max(prev.maxDrawdown, Number((newPeakProfit - newNetProfit).toFixed(4)));

      const totalWinAmounts = won ? (prev.totalWon * (prev.averageBet || currentBet) * (strat.targetMultiplier - 1)) + profit : 0;
      const totalLossAmounts = !won ? (prev.totalLost * (prev.averageBet || currentBet)) + currentBet : 1;

      const updatedStats: BotStatistics = {
        totalBets: newTotalBets,
        totalWon: newTotalWon,
        totalLost: newTotalLost,
        winRate: Number(((newTotalWon / newTotalBets) * 100).toFixed(2)),
        totalWagered: newTotalWagered,
        netProfit: newNetProfit,
        peakProfit: newPeakProfit,
        lowestProfit: newLowestProfit,
        highestProfit: newPeakProfit,
        maxDrawdown: newDrawdown,
        currentStreak: newStreak,
        maxWinStreak: Math.max(prev.maxWinStreak, newStreak > 0 ? newStreak : 0),
        maxLossStreak: Math.max(prev.maxLossStreak, newStreak < 0 ? Math.abs(newStreak) : 0),
        averageBet: Number((newTotalWagered / newTotalBets).toFixed(4)),
        largestBet: Math.max(prev.largestBet, currentBet),
        largestWin: won ? Math.max(prev.largestWin, profit) : prev.largestWin,
        profitFactor: totalLossAmounts > 0 ? Number((totalWinAmounts / totalLossAmounts).toFixed(2)) : 1.0,
      };
      statsRef.current = updatedStats;
      return updatedStats;
    });

    // -----------------------------------------------------------------------------------------
    // INTELLIGENT DECISION-MAKING & AUTOMATIC STRATEGY PIVOTING
    // -----------------------------------------------------------------------------------------
    const activeBankroll = newBal;
    const adaptiveDecision = evaluateAdaptiveDecision(
      adaptiveSettingsRef.current,
      adaptiveStateRef.current,
      strat,
      newSessionProfit,
      updatedPeakProfit,
      newStreak,
      activeBankroll
    );

    let activeStrategyToUse = strat;

    if (adaptiveDecision.shouldPivot && adaptiveDecision.targetStrategy) {
      const now = Date.now();
      const targetStrat = adaptiveDecision.targetStrategy;
      activeStrategyToUse = targetStrat;

      const newAdaptiveState: AdaptiveState = {
        ...adaptiveStateRef.current,
        isPivoted: true,
        primaryStrategy: adaptiveStateRef.current.isPivoted ? adaptiveStateRef.current.primaryStrategy : strat,
        activeStrategy: targetStrat,
        pivotReason: adaptiveDecision.reason || 'Mauvaise passe amortie par repli tactique',
        pivotTimestamp: now,
        pivotCount: adaptiveStateRef.current.pivotCount + 1,
        betsSincePivot: 0,
        winsSincePivot: 0,
        lossStreakAtPivot: Math.abs(newStreak),
        profitAtPivot: newSessionProfit,
        deficitToRecover: Math.max(0.1, updatedPeakProfit - newSessionProfit),
        intelligentLog: [
          {
            id: `pivot-${now}`,
            timestamp: now,
            type: 'pivot',
            message: adaptiveDecision.logMessage || `Bascule automatique sur ${targetStrat.name}`,
            fromStrategy: strat.name,
            toStrategy: targetStrat.name,
          },
          ...adaptiveStateRef.current.intelligentLog.slice(0, 49),
        ],
      };
      adaptiveStateRef.current = newAdaptiveState;
      setAdaptiveState(newAdaptiveState);

      currentStrategyRef.current = targetStrat;
      setCurrentStrategy(targetStrat);

      // Rotate seed if enabled to break unfavorable seed sequence
      if (adaptiveDecision.shouldRotateSeed) {
        handleRotateSeed();
      }
    } else if (adaptiveDecision.shouldRecover && adaptiveDecision.targetStrategy) {
      const now = Date.now();
      const primaryStrat = adaptiveDecision.targetStrategy;
      activeStrategyToUse = primaryStrat;

      const newAdaptiveState: AdaptiveState = {
        ...adaptiveStateRef.current,
        isPivoted: false,
        activeStrategy: primaryStrat,
        pivotReason: null,
        betsSincePivot: 0,
        winsSincePivot: 0,
        intelligentLog: [
          {
            id: `recovery-${now}`,
            timestamp: now,
            type: 'recovery',
            message: adaptiveDecision.logMessage || `Retour à la stratégie principale ${primaryStrat.name}`,
            fromStrategy: strat.name,
            toStrategy: primaryStrat.name,
          },
          ...adaptiveStateRef.current.intelligentLog.slice(0, 49),
        ],
      };
      adaptiveStateRef.current = newAdaptiveState;
      setAdaptiveState(newAdaptiveState);

      currentStrategyRef.current = primaryStrat;
      setCurrentStrategy(primaryStrat);
    } else if (adaptiveStateRef.current.isPivoted) {
      setAdaptiveState((prev) => {
        const nextState = {
          ...prev,
          betsSincePivot: prev.betsSincePivot + 1,
          winsSincePivot: won ? prev.winsSincePivot + 1 : prev.winsSincePivot,
        };
        adaptiveStateRef.current = nextState;
        return nextState;
      });
    }

    // Determine dynamic base bet if auto base bet calculation is enabled in App Settings
    const effectiveBaseBet = settingsRef.current.autoBaseBetPercentEnabled
      ? calculateDynamicBaseBet(
          activeBankroll,
          settingsRef.current.autoBaseBetPercent,
          settingsRef.current.autoBaseBetMinFloor,
          settingsRef.current.autoBaseBetMaxCap
        )
      : (adaptiveStateRef.current.isPivoted && (adaptiveSettingsRef.current.reduceBetPercent || 0) > 0
          ? Number((activeStrategyToUse.baseBet * (1 - (adaptiveSettingsRef.current.reduceBetPercent || 50) / 100)).toFixed(4))
          : activeStrategyToUse.baseBet);

    // Next Bet Calculation based on Autonomous Brain or standard strategy rules
    let nextBet = effectiveBaseBet;

    if (activeStrategyToUse.isAutonomousBrain || strat.isAutonomousBrain || activeStrategyToUse.id?.includes('autonomous')) {
      const nextDecision = computeAutonomousDecision(
        strat.autonomousConfig || DEFAULT_AUTONOMOUS_CONFIG,
        activeStrategyToUse,
        nextBets,
        statsRef.current,
        newSessionProfit,
        updatedPeakProfit,
        newStreak,
        activeBankroll,
        strat.currency
      );

      nextBet = nextDecision.calculatedBetAmount;

      activeStrategyToUse = {
        ...activeStrategyToUse,
        game: nextDecision.chosenGame,
        targetMultiplier: nextDecision.chosenMultiplier,
        winChance: nextDecision.chosenWinChance,
        gameConfig: nextDecision.gameConfig || activeStrategyToUse.gameConfig,
        name: `IA Autonome - ${nextDecision.strategyName}`,
      };
      currentStrategyRef.current = activeStrategyToUse;
      setCurrentStrategy(activeStrategyToUse);

      if (nextDecision.seedRotationAdvised && (strat.autonomousConfig?.autoRotateSeedOnAnomaly !== false)) {
        handleRotateSeed();
      }
    } else if (won) {
      if (activeStrategyToUse.onWinAction === 'reset') {
        nextBet = effectiveBaseBet;
      } else if (activeStrategyToUse.onWinAction === 'increase_pct') {
        const pct = (activeStrategyToUse.onWinValue ?? 50) / 100;
        nextBet = Number((currentBet * (1 + pct)).toFixed(4));
      } else if (activeStrategyToUse.onWinAction === 'increase_fixed') {
        const fixedInc = activeStrategyToUse.onWinValue ?? effectiveBaseBet;
        nextBet = Number((currentBet + fixedInc).toFixed(4));
      } else if (activeStrategyToUse.onWinAction === 'decrease_fixed') {
        const fixedDec = activeStrategyToUse.onWinValue ?? activeStrategyToUse.onLossValue ?? (effectiveBaseBet * 0.5);
        nextBet = Math.max(effectiveBaseBet, Number((currentBet - fixedDec).toFixed(4)));
      } else if (activeStrategyToUse.onWinAction === 'decrease_pct') {
        const pct = (activeStrategyToUse.onWinValue ?? 50) / 100;
        nextBet = Math.max(effectiveBaseBet, Number((currentBet * (1 - pct)).toFixed(4)));
      } else if (activeStrategyToUse.onWinAction === 'multiply') {
        const mult = activeStrategyToUse.onWinValue ?? 2.0;
        nextBet = Number((currentBet * mult).toFixed(4));
      } else if (activeStrategyToUse.onWinAction === 'custom') {
        // D'Alembert or custom reduction on win
        if (activeStrategyToUse.id?.includes('dalembert') || activeStrategyToUse.name?.toLowerCase().includes("d'alembert") || activeStrategyToUse.name?.toLowerCase().includes("dalembert")) {
          const stepVal = activeStrategyToUse.onLossValue ?? activeStrategyToUse.onWinValue ?? 0.10;
          nextBet = Math.max(effectiveBaseBet, Number((currentBet - stepVal).toFixed(4)));
        } else if (activeStrategyToUse.onWinValue && activeStrategyToUse.onWinValue > 0) {
          nextBet = Number((currentBet + activeStrategyToUse.onWinValue).toFixed(4));
        } else {
          nextBet = effectiveBaseBet;
        }
      } else {
        nextBet = effectiveBaseBet;
      }
    } else {
      const maxIncreases = Math.min(6, Math.max(1, activeStrategyToUse.maxMartingaleIncreases ?? 4));
      const currentLossStreak = Math.abs(newStreak < 0 ? newStreak : 1);

      if (activeStrategyToUse.onLossAction === 'multiply') {
        const mult = activeStrategyToUse.onLossValue || activeStrategyToUse.martingaleMultiplier || 2.0;
        if (currentLossStreak > maxIncreases) {
          // Strict Safety Reset to base bet after reaching max escalations (e.g. past 4 or 5 losses)
          nextBet = effectiveBaseBet;
        } else {
          // Bounded Martingale: baseBet * (mult ^ currentLossStreak) -> ex: 0.1 -> 0.2 -> 0.4 -> 0.8 -> 1.6 Max
          const calculatedStep = Number((effectiveBaseBet * Math.pow(mult, currentLossStreak)).toFixed(4));
          const maxAllowedBet = Number((effectiveBaseBet * Math.pow(mult, maxIncreases)).toFixed(4));
          nextBet = Math.min(calculatedStep, maxAllowedBet);
        }
      } else if (activeStrategyToUse.onLossAction === 'increase_pct') {
        const pct = (activeStrategyToUse.onLossValue || 100) / 100;
        if (currentLossStreak > maxIncreases) {
          nextBet = effectiveBaseBet;
        } else {
          const calculatedStep = Number((effectiveBaseBet * Math.pow(1 + pct, currentLossStreak)).toFixed(4));
          const maxAllowedBet = Number((effectiveBaseBet * Math.pow(1 + pct, maxIncreases)).toFixed(4));
          nextBet = Math.min(calculatedStep, maxAllowedBet);
        }
      } else if (activeStrategyToUse.onLossAction === 'increase_fixed') {
        const stepVal = activeStrategyToUse.onLossValue ?? (effectiveBaseBet * 0.5);
        if (currentLossStreak > maxIncreases * 2) {
          nextBet = effectiveBaseBet;
        } else {
          nextBet = Number((effectiveBaseBet + stepVal * currentLossStreak).toFixed(4));
        }
      } else if (activeStrategyToUse.onLossAction === 'decrease_fixed') {
        const stepVal = activeStrategyToUse.onLossValue ?? (effectiveBaseBet * 0.2);
        nextBet = Math.max(Number((effectiveBaseBet * 0.2).toFixed(4)), Number((currentBet - stepVal).toFixed(4)));
      } else if (activeStrategyToUse.onLossAction === 'decrease_pct') {
        const pct = (activeStrategyToUse.onLossValue || 50) / 100;
        nextBet = Math.max(Number((effectiveBaseBet * 0.2).toFixed(4)), Number((currentBet * (1 - pct)).toFixed(4)));
      } else if (activeStrategyToUse.onLossAction === 'fibonacci') {
        if (currentLossStreak > maxIncreases) {
          nextBet = effectiveBaseBet;
        } else {
          const fibMultipliers = [1, 1, 2, 3, 5, 8, 13, 21];
          const fibIdx = Math.min(fibMultipliers.length - 1, currentLossStreak);
          nextBet = Number((effectiveBaseBet * fibMultipliers[fibIdx]).toFixed(4));
        }
      } else if (activeStrategyToUse.onLossAction === 'custom') {
        // Oscar's Grind or constant loss bet maintenance
        if (activeStrategyToUse.id?.includes('oscar') || activeStrategyToUse.name?.toLowerCase().includes('oscar')) {
          nextBet = currentBet; // maintain current bet on loss in Oscar's Grind
        } else if (activeStrategyToUse.onLossValue && activeStrategyToUse.onLossValue > 0) {
          nextBet = Number((currentBet + activeStrategyToUse.onLossValue).toFixed(4));
        } else {
          nextBet = currentBet; // maintain current bet
        }
      } else if (activeStrategyToUse.onLossAction === 'reset') {
        nextBet = effectiveBaseBet;
      } else {
        nextBet = currentBet;
      }
    }

    // Process Custom Automated Conditions (Stake.com Multi-Condition Engine)
    if (activeStrategyToUse.customConditions && activeStrategyToUse.customConditions.length > 0) {
      const activeConditions = activeStrategyToUse.customConditions.filter(c => c.isActive !== false);
      const totalBetsCount = nextBets.length;
      const winStreak = newStreak > 0 ? newStreak : 0;
      const lossStreak = newStreak < 0 ? Math.abs(newStreak) : 0;
      const previousStreak = prevStreak;
      const prevWinStreak = previousStreak > 0 ? previousStreak : 0;
      const prevLossStreak = previousStreak < 0 ? Math.abs(previousStreak) : 0;

      const evalContext: ConditionEvaluationContext = {
        won,
        totalBets: totalBetsCount,
        currentStreak: newStreak,
        previousStreak,
        currentLossStreak: lossStreak,
        currentWinStreak: winStreak,
        prevLossStreak,
        prevWinStreak,
        currentBet,
        baseBet: effectiveBaseBet,
        currentMultiplier: activeStrategyToUse.targetMultiplier,
        baseMultiplier: PREDEFINED_STRATEGIES.find(s => s.id === activeStrategyToUse.id)?.targetMultiplier || activeStrategyToUse.targetMultiplier || 2.0,
        sessionProfit: newSessionProfit,
        diceCondition: activeStrategyToUse.gameConfig?.diceCondition || 'above',
        diceTarget: activeStrategyToUse.gameConfig?.diceTarget || 50.49
      };

      const actionState = {
        nextBet,
        targetMultiplier: activeStrategyToUse.targetMultiplier,
        winChance: activeStrategyToUse.winChance,
        diceCondition: activeStrategyToUse.gameConfig?.diceCondition || 'above',
        diceTarget: activeStrategyToUse.gameConfig?.diceTarget || 50.49,
        shouldStopAutobet: false,
        resetStreak: false
      };

      for (const cond of activeConditions) {
        if (evaluateConditionTrigger(cond, evalContext)) {
          applyConditionAction(cond, evalContext, actionState);

          if (actionState.shouldStopAutobet) {
            setIsAutobetting(false);
            isAutobettingRef.current = false;
            const reason = `Condition d'arrêt exécutée: ${cond.description || cond.stakeUiCode || 'Sécurité'}`;
            setStopReason(reason);
            if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnUnexpectedStop) {
              notifyUnexpectedBotStop({
                reason,
                game: activeStrategyToUse.game,
                currency: activeStrategyToUse.currency,
                strategyName: activeStrategyToUse.name,
              });
            }
          }
        }
      }

      nextBet = actionState.nextBet;

      if (
        actionState.targetMultiplier !== activeStrategyToUse.targetMultiplier ||
        actionState.diceCondition !== activeStrategyToUse.gameConfig?.diceCondition ||
        actionState.diceTarget !== activeStrategyToUse.gameConfig?.diceTarget
      ) {
        setCurrentStrategy(s => {
          const updated = {
            ...s,
            targetMultiplier: actionState.targetMultiplier,
            winChance: actionState.winChance,
            gameConfig: {
              ...s.gameConfig,
              diceCondition: actionState.diceCondition,
              diceTarget: actionState.diceTarget
            }
          };
          currentStrategyRef.current = updated;
          return updated;
        });
      }
    }

    // Cap at maxBetLimit
    if (activeStrategyToUse.maxBetLimit && nextBet > activeStrategyToUse.maxBetLimit) {
      nextBet = activeStrategyToUse.maxBetLimit;
    }

    const calculatedFinalNextBet = Math.max(0.0001, nextBet);
    currentBetAmountRef.current = calculatedFinalNextBet;
    setCurrentBetAmount(calculatedFinalNextBet);

    // Check Safety Stop Loss & Take Profit Triggers
    if (strat.stopOnLoss && newSessionProfit <= -strat.stopOnLoss) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const reason = `Stop Loss Atteint (-${strat.stopOnLoss} ${strat.currency})`;
      setStopReason(reason);
      if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnCriticalLoss) {
        notifyCriticalLoss({
          lossAmount: Math.abs(newSessionProfit),
          currency: strat.currency,
          reason,
          strategyName: strat.name,
        });
      }
      return betResult;
    }

    // Trailing Stop Loss: Lock in profit after a run-up
    if (
      strat.trailingStopLoss?.enabled && 
      updatedPeakProfit >= (strat.trailingStopLoss.activationProfit || 5) &&
      (updatedPeakProfit - newSessionProfit) >= (strat.trailingStopLoss.trailDistance || 3)
    ) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const reason = `Trailing Stop-Loss Déclenché : Retrait de ${strat.trailingStopLoss.trailDistance} ${strat.currency} depuis le pic (+${updatedPeakProfit.toFixed(2)} ${strat.currency})`;
      setStopReason(reason);
      if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnTakeProfit) {
        notifyTakeProfit({
          profitAmount: newSessionProfit,
          currency: strat.currency,
          strategyName: strat.name,
          reason,
        });
      }
      return betResult;
    }

    // Max Drawdown Hard Cap
    if (strat.maxDrawdownLimit && (updatedPeakProfit - newSessionProfit) >= strat.maxDrawdownLimit) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const reason = `Plafond de Drawdown Atteint (-${strat.maxDrawdownLimit} ${strat.currency} depuis pic)`;
      setStopReason(reason);
      if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnCriticalLoss) {
        notifyCriticalLoss({
          lossAmount: updatedPeakProfit - newSessionProfit,
          currency: strat.currency,
          reason,
          strategyName: strat.name,
        });
      }
      return betResult;
    }

    if (strat.stopOnProfit && newSessionProfit >= strat.stopOnProfit) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const reason = `Take Profit Atteint (+${strat.stopOnProfit} ${strat.currency})`;
      setStopReason(reason);
      if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnTakeProfit) {
        notifyTakeProfit({
          profitAmount: newSessionProfit,
          currency: strat.currency,
          strategyName: strat.name,
          reason,
        });
      }
      return betResult;
    }

    if (!won && strat.maxConsecutiveLosses && Math.abs(newStreak) >= strat.maxConsecutiveLosses) {
      setIsAutobetting(false);
      isAutobettingRef.current = false;
      const reason = `Coupe-circuit : ${strat.maxConsecutiveLosses} pertes consécutives atteintes`;
      setStopReason(reason);
      if (settingsRef.current.browserNotificationsEnabled && (settingsRef.current.notifyOnCriticalLoss || settingsRef.current.notifyOnUnexpectedStop)) {
        notifyUnexpectedBotStop({
          reason,
          game: strat.game,
          currency: strat.currency,
          strategyName: strat.name,
        });
      }
      return betResult;
    }

    // Stake.com Auto-Withdraw to Vault Threshold Check (Capital Sweeping Protection)
    if (strat.autoVaultWithdraw?.enabled && strat.autoVaultWithdraw.threshold > 0) {
      const vThreshold = strat.autoVaultWithdraw.threshold;
      const vKeep = strat.autoVaultWithdraw.keepBalance !== undefined ? strat.autoVaultWithdraw.keepBalance : vThreshold;

      if (isLive) {
        const liveBal = walletsRef.current[strat.currency] !== undefined
          ? walletsRef.current[strat.currency]
          : balanceRef.current;

        if (liveBal > vThreshold) {
          const excess = Number((liveBal - vKeep).toFixed(4));
          if (excess > 0) {
            try {
              const vRes = await fetch('/api/stake/deposit-vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apiKey: credentialsRef.current.apiKey,
                  domain: credentialsRef.current.domain || 'stake.com',
                  currency: strat.currency,
                  amount: excess,
                }),
              });
              const vData = await vRes.json();
              if (vData.ok) {
                const now = Date.now();
                handleUpdateWallet(strat.currency, Number((liveBal - excess).toFixed(4)));
                setCurrentStrategy((s) => ({
                  ...s,
                  autoVaultWithdraw: {
                    ...s.autoVaultWithdraw!,
                    lastTransferredAt: now,
                    totalTransferred: Number(((s.autoVaultWithdraw?.totalTransferred || 0) + excess).toFixed(4)),
                    lastTxId: vData.txId || `vlt-live-${now}`,
                  }
                }));
              }
            } catch (err) {
              console.error('Erreur Auto-Withdraw vers le coffre Stake:', err);
            }
          }
        }
      } else {
        // Simulation mode Auto-Withdraw protection
        if (newBal > vThreshold) {
          const excess = Number((newBal - vKeep).toFixed(4));
          if (excess > 0) {
            const now = Date.now();
            setSimulatedBalance(vKeep);
            simulatedBalanceRef.current = vKeep;
            handleUpdateWallet(strat.currency, vKeep);
            setCurrentStrategy((s) => ({
              ...s,
              autoVaultWithdraw: {
                ...s.autoVaultWithdraw!,
                lastTransferredAt: now,
                totalTransferred: Number(((s.autoVaultWithdraw?.totalTransferred || 0) + excess).toFixed(4)),
                lastTxId: `vlt-sim-${now}`,
              }
            }));
          }
        }
      }
    }

    return betResult;
  }, []);

  // Keep executeBetRef updated
  useEffect(() => {
    executeBetRef.current = executeBet;
  }, [executeBet]);

  // Execute Batch of Bets for Instant Backtesting
  const handleExecuteBatchBets = async (count: number) => {
    setStopReason(null);
    for (let i = 0; i < count; i++) {
      const res = await executeBet();
      if (!res) break;
    }
  };

  // Resilient Non-blocking Autobet Loop with Concurrency Lock & Retry Protection
  useEffect(() => {
    if (!isAutobetting) {
      isBettingExecutingRef.current = false;
      return;
    }

    let isLoopActive = true;

    const runLoop = async () => {
      while (isLoopActive && isAutobettingRef.current) {
        if (isBettingExecutingRef.current) {
          await new Promise(r => setTimeout(r, 40));
          continue;
        }

        isBettingExecutingRef.current = true;
        try {
          if (executeBetRef.current) {
            const res = await executeBetRef.current();
            if (!res) {
              // Terminal stop condition was triggered inside executeBet
              break;
            }
            consecutiveErrorsRef.current = 0;
          }
        } catch (err: any) {
          console.error('[AI AUTO-BET ENGINE] Loop exception:', err);
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= 5) {
            setIsAutobetting(false);
            isAutobettingRef.current = false;
            const errReason = `Arrêt de sécurité suite à des erreurs répétées : ${err?.message || 'Interruption d\'exécution'}`;
            setStopReason(errReason);
            if (settingsRef.current.browserNotificationsEnabled && settingsRef.current.notifyOnUnexpectedStop) {
              notifyUnexpectedBotStop({
                reason: errReason,
                game: currentStrategyRef.current.game,
                currency: currentStrategyRef.current.currency,
                strategyName: currentStrategyRef.current.name,
              });
            }
            break;
          }
          // Micro delay on error to avoid tight error spinning
          await new Promise(r => setTimeout(r, 200));
        } finally {
          isBettingExecutingRef.current = false;
        }

        // Wait configured betSpeedMs before launching next bet with precision pacing
        const delay = Math.max(350, betSpeedMs);
        await new Promise(r => setTimeout(r, delay));
      }
    };

    runLoop();

    return () => {
      isLoopActive = false;
      isBettingExecutingRef.current = false;
    };
  }, [isAutobetting, betSpeedMs]);

  const handleStartAutoBet = useCallback(() => {
    isManualStopRef.current = false;
    setStopReason(null);
    consecutiveErrorsRef.current = 0;
    isBettingExecutingRef.current = false;

    // Reset session PnL and metrics for the new run
    sessionProfitRef.current = 0;
    setSessionProfit(0);
    peakSessionProfitRef.current = 0;
    setPeakSessionProfit(0);
    currentStreakRef.current = 0;
    setCurrentStreak(0);

    const strat = currentStrategyRef.current;
    let initialBet = strat.baseBet;
    if (settingsRef.current.autoBaseBetPercentEnabled) {
      initialBet = calculateDynamicBaseBet(
        simulatedBalanceRef.current,
        settingsRef.current.autoBaseBetPercent,
        settingsRef.current.autoBaseBetMinFloor,
        settingsRef.current.autoBaseBetMaxCap
      );
    }

    const currentBal = credentialsRef.current.isLiveMode
      ? (walletsRef.current[strat.currency] ?? balanceRef.current)
      : simulatedBalanceRef.current;

    if (currentBal > 0 && initialBet > currentBal) {
      initialBet = Math.max(0.0001, Number((currentBal * 0.01).toFixed(4)));
    }

    currentBetAmountRef.current = initialBet;
    setCurrentBetAmount(initialBet);

    isAutobettingRef.current = true;
    setIsAutobetting(true);
  }, []);

  const handleStopAutoBet = useCallback(() => {
    isManualStopRef.current = true;
    isAutobettingRef.current = false;
    setIsAutobetting(false);
  }, []);

  // Surveillance Watchdog: Checks if isAutobetting transitions to false with no explicit stop reason (stopReason === null) and attempts auto-restart after 5s
  useEffect(() => {
    let watchdogTimer: NodeJS.Timeout | null = null;

    if (wasAutobettingRef.current && !isAutobetting && !stopReason && !isManualStopRef.current) {
      console.warn(
        '⚠️ [Watchdog Surveillance Bot IA] Détection d\'arrêt inattendu du bot sans motif explicite (stopReason: null). Tentative de redémarrage automatique dans 5 secondes...'
      );

      watchdogTimer = setTimeout(() => {
        if (!isAutobettingRef.current && !stopReason && !isManualStopRef.current) {
          console.info('🔄 [Watchdog Surveillance Bot IA] Exécution du redémarrage automatique après 5s...');
          handleStartAutoBet();
        }
      }, 5000);
    }

    wasAutobettingRef.current = isAutobetting;
    if (isAutobetting) {
      isManualStopRef.current = false;
    }

    return () => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
      }
    };
  }, [isAutobetting, stopReason, handleStartAutoBet]);

  const lastBet = bets.length > 0 ? bets[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-slate-950 pb-16 sm:pb-0 relative overflow-x-hidden">
      
      {/* Dynamic Ambient Color Mesh Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-orange-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header
        balance={balance}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        onUpdateBalance={handleSetBalanceForCurrentCurrency}
        onResetBalance={handleResetBalance}
        credentials={credentials}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAutobetting={isAutobetting}
        manualSessionsCount={manualSessions.length}
        hideBalancePrivacy={settings.hideBalancePrivacy}
        licenseState={licenseState}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 lg:pb-10 space-y-4 sm:space-y-6 relative z-10">
        
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, scale: 0.992, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.992, filter: 'blur(2px)' }}
            transition={{ 
              duration: 0.26, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            className="w-full"
          >
            {/* Tab 1: Manual Session Tracker (+ / - Journal & AI Coach) */}
            {activeTab === 'manual-sessions' && (
              <ManualSessionTracker
                sessions={manualSessions}
                onAddSession={handleAddManualSession}
                onDeleteSession={handleDeleteManualSession}
                onClearSessions={handleClearManualSessions}
                onRefreshSessions={handleRefreshManualSessions}
                currentBalance={balance}
                currency={currency}
                currentStrategy={currentStrategy}
                trackedSportBets={trackedSportBets}
              />
            )}

            {/* Tab: AI Sportsbook & Value Bets + Reliability Tracker */}
            {activeTab === 'sports' && (
              <SportsAnalysis
                currentBalance={balance}
                currency={currency}
                credentials={credentials}
                onUpdateCredentials={(creds) => setCredentials(creds)}
                onOpenApiSettingsModal={() => setIsSettingsOpen(true)}
                trackedBets={trackedSportBets}
                onTrackBet={handleTrackSportBet}
                onUpdateTrackedStatus={handleUpdateTrackedSportBetStatus}
                onBatchUpdateTrackedStatus={handleBatchUpdateTrackedSportBets}
                onUpdateTrackedStake={handleUpdateTrackedSportBetStake}
                onDeleteTrackedBet={handleDeleteTrackedSportBet}
                onClearTrackedBets={handleClearTrackedSportBets}
              />
            )}

            {/* Tab 0: AI Stake Auto-Pilot (Simplified 1-Click Bot) */}
            {activeTab === 'ai-bot' && (
              <AiStakeAutoPilot
                strategy={currentStrategy}
                balance={balance}
                currency={currency}
                currentBetAmount={currentBetAmount}
                isAutobetting={isAutobetting}
                onStartAutoBet={handleStartAutoBet}
                onStopAutoBet={handleStopAutoBet}
                onExecuteSingleBet={executeBet}
                onExecuteBatchBets={handleExecuteBatchBets}
                lastBet={lastBet}
                currentStreak={currentStreak}
                betSpeedMs={betSpeedMs}
                setBetSpeedMs={setBetSpeedMs}
                stopReason={stopReason}
                sessionProfit={sessionProfit}
                bets={bets}
                stats={stats}
                onClearHistory={handleResetSimulationStats}
                onUpdateStrategy={handleUpdateStrategy}
                onSelectStrategy={handleSelectStrategy}
                credentials={credentials}
                onOpenStakeApiModal={() => setIsSettingsOpen(true)}
                onUpdateWallet={handleUpdateWallet}
                onRotateSeed={handleRotateSeed}
                licenseState={licenseState}
                onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
              />
            )}

            {/* Tab: Seed Analysis & Target Probabilities */}
            {activeTab === 'seed-analysis' && (
              <SeedAnalysis
                currentBalance={balance}
                currency={currency}
                activeClientSeed={credentials.clientSeed}
                activeServerSeed={credentials.serverSeedHash}
                activeNonce={credentials.nonce || 1}
              />
            )}

            {/* Tab 2: Advanced Games (Blackjack Basic Strategy, French Roulette, Crash EV) */}
            {activeTab === 'advanced-games' && (
              <AdvancedGamesSuite
                currency={currency}
              />
            )}

            {/* Tab 3: Strategy Generator & Sandbox Testing */}
            {activeTab === 'engine' && (
              <div className="space-y-6">
                <StrategyGenerator
                  currentStrategy={currentStrategy}
                  onSelectStrategy={handleSelectStrategy}
                  onUpdateStrategy={handleUpdateStrategy}
                  currency={currency}
                  balance={balance}
                  onStartAutoBet={handleStartAutoBet}
                  isAutobetting={isAutobetting}
                  bets={bets}
                />

                <AutoBetEngine
                  strategy={currentStrategy}
                  balance={balance}
                  currency={currency}
                  isAutobetting={isAutobetting}
                  onStartAutoBet={handleStartAutoBet}
                  onStopAutoBet={handleStopAutoBet}
                  onExecuteSingleBet={executeBet}
                  onExecuteBatchBets={handleExecuteBatchBets}
                  lastBet={lastBet}
                  currentStreak={currentStreak}
                  betSpeedMs={betSpeedMs}
                  setBetSpeedMs={setBetSpeedMs}
                  stopReason={stopReason}
                  sessionProfit={sessionProfit}
                  bets={bets}
                  stats={stats}
                  onClearHistory={handleResetSimulationStats}
                  clientSeed={credentials.clientSeed}
                  serverSeedHash={credentials.serverSeedHash}
                  nonce={credentials.nonce || 1}
                  onRotateSeed={handleRotateSeed}
                  onUpdateSeed={handleUpdateActiveSeed}
                  isLiveMode={Boolean(credentials.isLiveMode && credentials.apiKey)}
                  adaptiveSettings={adaptiveSettings}
                  onUpdateAdaptiveSettings={(cfg) => setAdaptiveSettings((prev) => ({ ...prev, ...cfg }))}
                  adaptiveState={adaptiveState}
                  onManualPivot={handleManualStrategyPivot}
                  onResetPivot={handleResetStrategyPivot}
                />
              </div>
            )}

            {/* Tab: Backtesting & Historical Stress-Test Engine */}
            {activeTab === 'backtesting' && (
              <BacktestingSuite
                currentStrategy={currentStrategy}
                onSelectStrategy={handleSelectStrategy}
                onUpdateStrategy={handleUpdateStrategy}
                currency={currency}
                balance={balance}
                credentials={credentials}
                onNavigateToTab={(tab: AppTab) => setActiveTab(tab)}
              />
            )}

            {/* Tab 6: Analytics & Gain History */}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                stats={stats}
                bets={bets}
                currency={currency}
                strategy={currentStrategy}
                manualSessions={manualSessions}
                onUpdateStrategy={handleUpdateStrategy}
                onSelectStrategy={handleSelectStrategy}
                balance={balance}
                onStartAutoBet={handleStartAutoBet}
                onUpdateBalance={handleSetBalanceForCurrentCurrency}
                onResetBalance={handleResetBalance}
                credentials={credentials}
                wallets={wallets}
              />
            )}

            {/* Tab 7: Cloud & Multi-Profiles Sync Manager */}
            {activeTab === 'cloud-sync' && (
              <CloudSyncManager
                sessions={manualSessions}
                wallets={wallets}
                strategies={PREDEFINED_STRATEGIES}
                apiCredentials={credentials}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onSelectProfile={(id) => setActiveProfileId(id)}
                onCreateProfile={handleCreateProfile}
                onDeleteProfile={handleDeleteProfile}
                onRestoreBackup={handleRestoreBackup}
                onResetAllData={handleResetAllData}
              />
            )}

            {/* Tab 8: Standalone Script Exporter */}
            {activeTab === 'scripts' && (
              <ScriptExporter
                strategy={currentStrategy}
                credentials={credentials}
                currency={currency}
              />
            )}

            {/* Tab 9: Application Settings & Preferences */}
            {activeTab === 'settings' && (
              <AppSettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetSettings={handleResetSettings}
                credentials={credentials}
                onSaveCredentials={(creds) => setCredentials(creds)}
                onOpenStakeApiModal={() => setIsSettingsOpen(true)}
                currentBalance={balance}
                currency={currency}
                wallets={wallets}
                onUpdateWallet={handleUpdateWallet}
                onSyncRealBalances={(newWallets) => {
                  setWallets((prev) => ({
                    ...prev,
                    ...newWallets,
                  }));
                }}
                onCurrencyChange={handleCurrencyChange}
                onExportAllData={() => {}}
                currentStrategy={currentStrategy}
                onUpdateStrategy={handleUpdateStrategy}
                onApplyGlobalRisk={handleApplyGlobalRiskToAll}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* VIP License Modal */}
      <VipLicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        licenseState={licenseState}
        onLicenseUpdated={(newState) => {
          setLicenseState(newState);
          licenseStateRef.current = newState;
        }}
      />

      {/* Settings Modal */}
      <StakeApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        credentials={credentials}
        onSaveCredentials={(creds) => setCredentials(creds)}
        onSyncRealBalances={(newWallets) => {
          setWallets((prev) => ({
            ...prev,
            ...newWallets,
          }));
        }}
        activeCurrency={currency}
      />

      {/* AI Assistant Support & Copilot Drawer */}
      <AppAiAssistant
        isOpen={isAssistantOpen}
        onOpen={() => setIsAssistantOpen(true)}
        onClose={() => setIsAssistantOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        balance={balance}
        currency={currency}
        wallets={wallets}
        manualSessionsCount={manualSessions.length}
        trackedBetsCount={trackedSportBets.length}
      />

      {/* Ergonomic Smartphone Bottom Navigation Bar (Portrait Optimized) */}
      <nav 
        aria-label="Navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex lg:hidden items-center justify-around shadow-2xl safe-area-bottom"
      >
        {/* 1. Bot IA Stake (Primary Auto-Pilot) */}
        <motion.button
          id="mobile-nav-ai-bot"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setActiveTab('ai-bot');
            setIsMobileMoreDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] cursor-pointer ${
            activeTab === 'ai-bot'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className={`w-5 h-5 mb-0.5 ${activeTab === 'ai-bot' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-[10px] font-bold leading-none truncate">Bot IA</span>
        </motion.button>

        {/* 2. Journal (+/-) */}
        <motion.button
          id="mobile-nav-journal"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setActiveTab('manual-sessions');
            setIsMobileMoreDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] cursor-pointer ${
            activeTab === 'manual-sessions'
              ? 'text-orange-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'manual-sessions' ? 'text-orange-400' : 'text-slate-400'}`} />
          <span className="text-[10px] font-medium leading-none truncate">{t('nav.journal', 'Journal')}</span>
        </motion.button>

        {/* 3. Paris Sportifs */}
        <motion.button
          id="mobile-nav-sports"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setActiveTab('sports');
            setIsMobileMoreDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] relative cursor-pointer ${
            activeTab === 'sports'
              ? 'text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className={`w-5 h-5 mb-0.5 ${activeTab === 'sports' ? 'text-blue-400' : 'text-slate-400'}`} />
          <span className="text-[10px] font-medium leading-none truncate">{t('nav.sports', 'Paris')}</span>
          <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        </motion.button>

        {/* 4. Stratégies IA */}
        <motion.button
          id="mobile-nav-strategies"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setActiveTab('engine');
            setIsMobileMoreDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] cursor-pointer ${
            activeTab === 'engine'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-5 h-5 mb-0.5 ${activeTab === 'engine' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="text-[10px] font-medium leading-none truncate">{t('nav.strategies', 'Stratégies')}</span>
        </motion.button>

        {/* 5. More Menu Drawer Toggle */}
        <motion.button
          id="mobile-nav-more"
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsMobileMoreDrawerOpen(!isMobileMoreDrawerOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] cursor-pointer ${
            isMobileMoreDrawerOpen || ['advanced-games', 'cloud-sync', 'scripts', 'seed-analysis', 'settings', 'analytics', 'backtesting'].includes(activeTab)
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-none truncate">{t('common.more', 'Menu')}</span>
        </motion.button>
      </nav>

      {/* Smartphone Bottom "More" Sheet Modal */}
      {isMobileMoreDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMoreDrawerOpen(false)}
        >
          <div 
            className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 pb-20 max-h-[80dvh] overflow-y-auto space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Modules & Outils</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">BNZSTRATS IA</span>
              </div>
              <button
                onClick={() => setIsMobileMoreDrawerOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                Fermer
              </button>
            </div>

            {/* Quick Modules Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('advanced-games');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'advanced-games'
                    ? 'bg-purple-950/60 border-purple-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Dice5 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.games', 'Blackjack & Jeux')}</div>
                  <div className="text-[10px] text-slate-400 truncate">RTP & Cotes</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('seed-analysis');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'seed-analysis'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Key className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.seed', 'Seed & Provably Fair')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Simulation de tirage</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('cloud-sync');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'cloud-sync'
                    ? 'bg-blue-950/60 border-blue-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Cloud className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.cloud', 'Cloud & Profils')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Sauvegardes multi-comptes</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('scripts');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'scripts'
                    ? 'bg-rose-950/60 border-rose-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.scripts', 'Scripts & Export')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Python & Tampermonkey</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-950/60 border-indigo-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <BarChart3 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.analytics', 'Analytics & Stats')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Graphiques & ROI</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('backtesting');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'backtesting'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.backtesting', 'Backtesting')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Simulateur 10k+ rounds</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMoreDrawerOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                  activeTab === 'settings'
                    ? 'bg-amber-950/60 border-amber-500/50 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Settings className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('nav.settings', 'Paramètres')}</div>
                  <div className="text-[10px] text-slate-400 truncate">Langue & API Stake</div>
                </div>
              </button>
            </div>

            {/* Assistant IA Big Trigger Button in Mobile Sheet */}
            <button
              onClick={() => {
                setIsMobileMoreDrawerOpen(false);
                setIsAssistantOpen(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50"
            >
              <Bot className="w-4 h-4" />
              <span>{t('header.assistantAi', 'Ouvrir l\'Assistant IA & Copilot')}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
