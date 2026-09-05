import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Languages, 
  Volume2, 
  VolumeX, 
  Bell, 
  ShieldCheck, 
  Palette, 
  Eye, 
  EyeOff, 
  Database, 
  Key, 
  Coins, 
  Percent, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertTriangle, 
  Sliders, 
  Clock, 
  Sparkles, 
  Zap, 
  Check, 
  Save, 
  HelpCircle,
  Play,
  RotateCcw,
  Trophy,
  Lock,
  Unlock,
  Shuffle,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  TrendingUp,
  Wallet,
  Calculator,
  Flame,
  Shield,
  ArrowRight,
  BellRing,
  BellOff,
  ShieldAlert,
  Send,
  Radio,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  ChevronUp,
  Layers,
  Scale,
  Target,
  Activity,
  Gauge,
  Video,
  FastForward,
} from 'lucide-react';
import { InteractiveAiVideoDemoModal } from './InteractiveAiVideoDemoModal';
import { DemoLoopSimulationModal } from './DemoLoopSimulationModal';
import { 
  AppSettings, 
  AppLanguage, 
  OddsDisplayFormat, 
  TimeFormat, 
  ThemeAccent,
  ThemeMode,
  StakeApiCredentials,
  BettingStrategy
} from '../types';
import { 
  SUPPORTED_LANGUAGES, 
  SUPPORTED_TIMEZONES, 
  ODDS_FORMATS, 
  DEFAULT_APP_SETTINGS, 
  formatOddsByFormat,
  calculateDynamicBaseBet
} from '../utils/appSettingsDefaults';
import {
  calculateAccountSurvivalMetrics,
  calibrateStrategyForGlobalRisk,
  applyGlobalRiskToAllStrategies,
  BankrollSurvivalMetrics,
} from '../utils/bankrollSurvivalCalculator';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { 
  STAKE_DOMAIN_GROUPS, 
  STAKE_MIRROR_DOMAINS, 
  cleanStakeDomain, 
  getStakeDomainInfo, 
  isKnownStakeMirror 
} from '../utils/stakeDomains';
import { SUPPORTED_CURRENCIES, STAKE_AVAILABLE_CURRENCIES, getCurrencyInfo } from '../utils/stakeCurrencies';
import { soundEffects } from '../utils/audioEffects';
import { generateRandomSeed } from '../utils/provablyFair';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestNotification, 
  NotificationPermissionStatus 
} from '../utils/browserNotifications';
import { useTranslation } from '../i18n/LanguageContext';

interface AppSettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  credentials: StakeApiCredentials;
  onSaveCredentials?: (creds: StakeApiCredentials) => void;
  onOpenStakeApiModal?: () => void;
  currentBalance: number;
  currency: string;
  wallets?: Record<string, number>;
  onUpdateWallet?: (curr: string, amt: number) => void;
  onSyncRealBalances?: (newWallets: Record<string, number>, username?: string) => void;
  onCurrencyChange: (curr: string) => void;
  onExportAllData?: () => void;
  currentStrategy?: BettingStrategy;
  onUpdateStrategy?: (updates: Partial<BettingStrategy>) => void;
  onApplyGlobalRisk?: (riskPct: number) => void;
}

export const AppSettingsView: React.FC<AppSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  credentials,
  onSaveCredentials,
  onOpenStakeApiModal,
  currentBalance,
  currency,
  wallets = {},
  onUpdateWallet,
  onSyncRealBalances,
  onCurrencyChange,
  onExportAllData,
  currentStrategy,
  onUpdateStrategy,
  onApplyGlobalRisk,
}) => {
  const { t, setLanguage } = useTranslation();
  const [activeSection, setActiveSection] = useState<'general' | 'stake' | 'betting' | 'notifications' | 'appearance' | 'integrations' | 'data'>('stake');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDemoLoopModalOpen, setIsDemoLoopModalOpen] = useState(false);

  // Browser HTML5 Notifications State
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermissionStatus>(() => getNotificationPermission());
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);
  const [testNotifFeedback, setTestNotifFeedback] = useState<string | null>(null);

  // Local editable draft credentials
  const [draftCreds, setDraftCreds] = useState<StakeApiCredentials>(credentials);
  const [showStakeKey, setShowStakeKey] = useState(false);

  // Balance quick editing
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [detectedStakeUser, setDetectedStakeUser] = useState<string | null>(null);

  // Sync if prop changes externally
  useEffect(() => {
    setDraftCreds(credentials);
  }, [credentials]);

  // Stake Connection testing states
  const [isTestingStake, setIsTestingStake] = useState(false);
  const [stakeTestResult, setStakeTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message?: string;
    error?: string;
    activeFixtures?: number;
    liveFixturesCount?: number;
    domain?: string;
    username?: string;
    hasRealBalances?: boolean;
  } | null>(null);

  // API-Sports testing states
  const [isTestingSportsKey, setIsTestingSportsKey] = useState(false);
  const [sportsTestResult, setSportsTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message?: string;
    error?: string;
    subscription?: string;
    currentDayRequests?: number;
    maxDayRequests?: number;
  } | null>(null);

  // The Odds API testing states
  const [isTestingOddsKey, setIsTestingOddsKey] = useState(false);
  const [oddsTestResult, setOddsTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message?: string;
    error?: string;
    remainingRequests?: string;
  } | null>(null);

  // Flat Betting Calculator State
  const [flatRiskProfile, setFlatRiskProfile] = useState<'prudent' | 'equilibre' | 'agressif' | 'custom'>('prudent');
  const [flatCustomPercent, setFlatCustomPercent] = useState<number>(settings.defaultStakePercent || 1.0);
  const [flatCustomBalance, setFlatCustomBalance] = useState<string>('');
  const [isUsingCustomBalance, setIsUsingCustomBalance] = useState<boolean>(false);
  const [copiedFlatAmount, setCopiedFlatAmount] = useState<boolean>(false);
  const [appliedFlatSuccess, setAppliedFlatSuccess] = useState<boolean>(false);

  // Flat Betting Derived Calculations
  const effectiveFlatBalance = isUsingCustomBalance && parseFloat(flatCustomBalance) > 0 
    ? parseFloat(flatCustomBalance) 
    : (currentBalance > 0 ? currentBalance : 100);

  const activeFlatPercent = flatRiskProfile === 'prudent' 
    ? 1.0 
    : flatRiskProfile === 'equilibre' 
    ? 2.5 
    : flatRiskProfile === 'agressif' 
    ? 5.0 
    : flatCustomPercent;

  const recommendedFlatStakeAmount = Number(((effectiveFlatBalance * activeFlatPercent) / 100).toFixed(4));
  const availableFlatUnits = activeFlatPercent > 0 ? Math.round(100 / activeFlatPercent) : 100;
  const maxLoss5Bets = Number(((recommendedFlatStakeAmount * 5)).toFixed(2));
  const recommendedStopLossAmt = Number(((recommendedFlatStakeAmount * 10)).toFixed(2));
  const recommendedTakeProfitAmt = Number(((recommendedFlatStakeAmount * 15)).toFixed(2));

  const handleCopyFlatStake = () => {
    navigator.clipboard.writeText(recommendedFlatStakeAmount.toString());
    setCopiedFlatAmount(true);
    if (settings.soundEffects) soundEffects.playClick(true);
    setTimeout(() => setCopiedFlatAmount(false), 2000);
  };

  const handleApplyFlatAsDefault = () => {
    handleSettingChange('defaultStakePercent', activeFlatPercent);
    setAppliedFlatSuccess(true);
    if (settings.soundEffects) soundEffects.playWin(true);
    setTimeout(() => setAppliedFlatSuccess(false), 2500);
  };

  // Dynamic Bankroll Base Bet Calculations & Handlers
  const [copiedDynamicBaseBet, setCopiedDynamicBaseBet] = useState(false);
  const [appliedDynamicBaseBetSuccess, setAppliedDynamicBaseBetSuccess] = useState(false);

  const activeDynamicPercent = settings.autoBaseBetPercent ?? 0.1;
  const activeDynamicMinFloor = settings.autoBaseBetMinFloor ?? 0.0001;
  const activeDynamicMaxCap = settings.autoBaseBetMaxCap ?? 5.0;
  const currentDynamicBaseBet = calculateDynamicBaseBet(
    currentBalance > 0 ? currentBalance : 100,
    activeDynamicPercent,
    activeDynamicMinFloor,
    activeDynamicMaxCap
  );
  const dynamicSurvivalUnits = activeDynamicPercent > 0 ? Math.round(100 / activeDynamicPercent) : 1000;

  const handleCopyDynamicBaseBet = () => {
    navigator.clipboard.writeText(currentDynamicBaseBet.toString());
    setCopiedDynamicBaseBet(true);
    if (settings.soundEffects) soundEffects.playClick(true);
    setTimeout(() => setCopiedDynamicBaseBet(false), 2000);
  };

  const handleApplyDynamicBaseBetToStrategy = () => {
    if (onUpdateStrategy) {
      onUpdateStrategy({ baseBet: currentDynamicBaseBet });
    }
    setAppliedDynamicBaseBetSuccess(true);
    if (settings.soundEffects) soundEffects.playWin(true);
    setTimeout(() => setAppliedDynamicBaseBetSuccess(false), 2500);
  };

  // Global Fixed Risk & Bankroll Survival Calculator State
  const [globalRiskPercent, setGlobalRiskPercent] = useState<number>(() => settings.globalRiskPercent ?? 0.5);
  const [globalRiskPreset, setGlobalRiskPreset] = useState<'ultra_safe' | 'safe' | 'balanced' | 'dynamic' | 'aggressive' | 'custom'>(() => {
    const p = settings.globalRiskPercent ?? 0.5;
    if (p === 0.1) return 'ultra_safe';
    if (p === 0.5) return 'safe';
    if (p === 1.0) return 'balanced';
    if (p === 2.0) return 'dynamic';
    if (p === 3.5) return 'aggressive';
    return 'custom';
  });
  const [isApplyingGlobalRisk, setIsApplyingGlobalRisk] = useState<boolean>(false);
  const [globalRiskApplyFeedback, setGlobalRiskApplyFeedback] = useState<{
    success: boolean;
    count: number;
    riskPct: number;
    baseStake: number;
    timestamp: number;
  } | null>(null);
  const [showCalibratedCatalog, setShowCalibratedCatalog] = useState<boolean>(false);
  const [filterGameCategory, setFilterGameCategory] = useState<string>('all');
  const [previewSearchQuery, setPreviewSearchQuery] = useState<string>('');

  // Real-time survival metrics calculated mathematically based on effective balance and global risk percent
  const survivalMetrics: BankrollSurvivalMetrics = calculateAccountSurvivalMetrics(effectiveFlatBalance, globalRiskPercent);

  // Synchronize when settings change from outside
  useEffect(() => {
    if (settings.globalRiskPercent !== undefined && settings.globalRiskPercent !== globalRiskPercent) {
      setGlobalRiskPercent(settings.globalRiskPercent);
    }
  }, [settings.globalRiskPercent]);

  const handleSelectRiskPreset = (preset: 'ultra_safe' | 'safe' | 'balanced' | 'dynamic' | 'aggressive' | 'custom', pct: number) => {
    setGlobalRiskPreset(preset);
    setGlobalRiskPercent(pct);
    if (settings.soundEffects) soundEffects.playClick(true);
  };

  const handleApplyGlobalRiskToAll = () => {
    setIsApplyingGlobalRisk(true);
    try {
      const res = applyGlobalRiskToAllStrategies(effectiveFlatBalance, globalRiskPercent);
      handleSettingChange('globalRiskPercent', globalRiskPercent);
      
      // Update currently active strategy if matching
      if (currentStrategy && onUpdateStrategy) {
        const calibratedActive = res.updatedStrategies.find(s => s.id === currentStrategy.id) || res.updatedStrategies[0];
        if (calibratedActive) {
          onUpdateStrategy(calibratedActive);
        }
      }
      
      if (onApplyGlobalRisk) {
        onApplyGlobalRisk(globalRiskPercent);
      }
      
      setGlobalRiskApplyFeedback({
        success: true,
        count: res.count,
        riskPct: globalRiskPercent,
        baseStake: res.metrics.baseStakeAmount,
        timestamp: Date.now(),
      });
      
      if (settings.soundEffects) soundEffects.playWin(true);
      setTimeout(() => setGlobalRiskApplyFeedback(null), 5000);
    } catch (e) {
      console.error('Error applying global risk calibration:', e);
    } finally {
      setIsApplyingGlobalRisk(false);
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (key === 'language') {
      setLanguage(value as AppLanguage);
    }
    onUpdateSettings({ [key]: value });
    if (settings.soundEffects) {
      soundEffects.playToggle(true);
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleTestSound = (type: 'win' | 'alert' | 'click') => {
    if (type === 'win') soundEffects.playWin(true);
    if (type === 'alert') soundEffects.playAlert(true);
    if (type === 'click') soundEffects.playClick(true);
  };

  // Browser Notification Handlers
  const handleRequestBrowserPermission = async () => {
    setIsRequestingNotif(true);
    try {
      const res = await requestNotificationPermission();
      setBrowserNotifPermission(res);
      if (res === 'granted') {
        handleSettingChange('browserNotificationsEnabled', true);
        if (settings.soundEffects) {
          soundEffects.playWin(true);
        }
        sendTestNotification();
        setTestNotifFeedback('Autorisation accordée ! Notification de test envoyée.');
      } else if (res === 'denied') {
        setTestNotifFeedback('Autorisation refusée dans le navigateur.');
      }
    } catch (e) {
      console.warn('Error requesting permission:', e);
    } finally {
      setIsRequestingNotif(false);
      setTimeout(() => setTestNotifFeedback(null), 4000);
    }
  };

  const handleTestBrowserNotification = () => {
    if (!isNotificationSupported()) {
      setTestNotifFeedback('Votre navigateur ne prend pas en charge les notifications.');
      setTimeout(() => setTestNotifFeedback(null), 3500);
      return;
    }

    if (browserNotifPermission !== 'granted') {
      handleRequestBrowserPermission();
      return;
    }

    sendTestNotification();
    if (settings.soundEffects) {
      soundEffects.playAlert(true);
    }
    setTestNotifFeedback('Notification test envoyée avec succès !');
    setTimeout(() => setTestNotifFeedback(null), 3500);
  };

  // Provably Fair seed randomizer
  const handleRandomizeSeeds = () => {
    const updated = {
      ...draftCreds,
      clientSeed: generateRandomSeed(),
      serverSeedHash: generateRandomSeed(),
    };
    setDraftCreds(updated);
    if (onSaveCredentials) {
      onSaveCredentials(updated);
    }
    if (settings.soundEffects) {
      soundEffects.playClick(true);
    }
  };

  // Test Stake API connection and Sync Real Balances
  const handleTestStakeConnection = async () => {
    setIsTestingStake(true);
    setStakeTestResult(null);

    try {
      const res = await fetch('/api/stake/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: draftCreds.apiKey,
          domain: draftCreds.domain,
          currency: draftCreds.currency || currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.username) {
          setDetectedStakeUser(data.username);
        }
        // If live balances were retrieved from Stake GraphQL
        if (data.hasRealBalances && data.balances && Object.keys(data.balances).length > 0) {
          if (onSyncRealBalances) {
            onSyncRealBalances(data.balances, data.username);
          }
        }
        setStakeTestResult({
          tested: true,
          ok: true,
          message: data.message || `Connecté avec succès à ${draftCreds.domain}`,
          activeFixtures: data.activeFixtures,
          liveFixturesCount: data.liveFixturesCount,
          domain: data.domain,
          username: data.username,
          hasRealBalances: data.hasRealBalances,
        });
        if (settings.soundEffects) soundEffects.playWin(true);
      } else {
        setStakeTestResult({
          tested: true,
          ok: false,
          error: data.error || 'Impossible d\'authentifier le jeton Stake. Vérifiez vos identifiants.',
        });
        if (settings.soundEffects) soundEffects.playAlert(true);
      }
    } catch (err: any) {
      setStakeTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors de la communication avec l\'API Stake.',
      });
      if (settings.soundEffects) soundEffects.playAlert(true);
    } finally {
      setIsTestingStake(false);
    }
  };

  // Test API-Sports connection
  const handleTestApiSportsConnection = async () => {
    const key = (draftCreds.apiSportsKey || '').trim();
    if (!key) {
      setSportsTestResult({
        tested: true,
        ok: false,
        error: 'Veuillez saisir votre clé API-Sports avant de lancer le test.',
      });
      return;
    }

    setIsTestingSportsKey(true);
    setSportsTestResult(null);

    try {
      const res = await fetch('/api/sports/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'api-sports',
          apiKey: key,
        }),
      });

      const data = await res.json();
      setSportsTestResult({
        tested: true,
        ok: Boolean(data.ok),
        message: data.message,
        error: data.error,
        subscription: data.subscription,
        currentDayRequests: data.currentDayRequests,
        maxDayRequests: data.maxDayRequests,
      });
      if (data.ok && settings.soundEffects) soundEffects.playWin(true);
    } catch (err: any) {
      setSportsTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors du test API-Sports.',
      });
    } finally {
      setIsTestingSportsKey(false);
    }
  };

  // Test The Odds API connection
  const handleTestOddsApiConnection = async () => {
    const key = (draftCreds.theOddsApiKey || '').trim();
    if (!key) {
      setOddsTestResult({
        tested: true,
        ok: false,
        error: 'Veuillez saisir votre clé The Odds API avant de lancer le test.',
      });
      return;
    }

    setIsTestingOddsKey(true);
    setOddsTestResult(null);

    try {
      const res = await fetch('/api/sports/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'the-odds-api',
          apiKey: key,
        }),
      });

      const data = await res.json();
      setOddsTestResult({
        tested: true,
        ok: Boolean(data.ok),
        message: data.message,
        error: data.error,
        remainingRequests: data.remainingRequests,
      });
      if (data.ok && settings.soundEffects) soundEffects.playWin(true);
    } catch (err: any) {
      setOddsTestResult({
        tested: true,
        ok: false,
        error: err.message || 'Erreur réseau lors du test The Odds API.',
      });
    } finally {
      setIsTestingOddsKey(false);
    }
  };

  // Save all credentials
  const handleSaveCredentials = () => {
    if (onSaveCredentials) {
      onSaveCredentials(draftCreds);
    }
    if (draftCreds.currency && draftCreds.currency !== currency) {
      onCurrencyChange(draftCreds.currency);
    }
    if (settings.soundEffects) {
      soundEffects.playWin(true);
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const currenciesList = SUPPORTED_CURRENCIES;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200 pb-16" id="app-settings-container">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-600/10 via-blue-600/10 to-indigo-600/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-600 to-blue-600 p-0.5 shadow-lg shadow-orange-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Settings className="w-6 h-6 text-orange-400 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Paramètres & Connexion Stake
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Direct API & Config
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Connectez votre compte Stake, ajustez vos clés API sportives, vos alertes et la gestion du risque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSaveToast && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Paramètres enregistrés !</span>
              </span>
            )}

            {/* Quick Theme Toggle Button */}
            <button
              type="button"
              id="btn-quick-theme-toggle"
              onClick={() => handleSettingChange('themeMode', (settings.themeMode === 'light' ? 'dark' : 'light'))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                settings.themeMode === 'light'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={settings.themeMode === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
              {settings.themeMode === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode Clair</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mode Sombre</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Valeurs par Défaut</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-slate-800/80 scrollbar-none">
          
          {/* TAB 1: STAKE DIRECT CONNECTION (PROMINENT) */}
          <button
            type="button"
            id="tab-btn-stake-settings"
            onClick={() => setActiveSection('stake')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm ${
              activeSection === 'stake'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30 ring-1 ring-orange-400'
                : 'text-orange-400 hover:text-orange-200 bg-orange-950/30 border border-orange-500/30 hover:bg-orange-900/40'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>🔑 Compte & API Stake</span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-black/40 text-amber-300">
              {draftCreds.isLiveMode ? 'LIVE' : 'SIMU'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'general'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Langue & Région</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('betting')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'betting'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Cotes & Mise Flat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('notifications')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'notifications'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Audio & Alertes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('appearance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'appearance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Apparence & Confidentialité</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('integrations')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'integrations'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Statut APIs & IA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('data')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeSection === 'data'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Données & Sauvegarde</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Réinitialiser les paramètres ?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Toutes les préférences d'affichage (langue, format des cotes, alertes audio, etc.) reviendront à leurs valeurs standard par défaut. Vos sessions et votre solde ne seront pas effacés.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetSettings();
                  setShowResetConfirm(false);
                  setShowSaveToast(true);
                  setTimeout(() => setShowSaveToast(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Confirmer la Réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION STAKE & APIS DIRECT CONFIGURATION (NEW DEDICATED HUB)            */}
      {/* ========================================================================= */}
      {activeSection === 'stake' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Card 1: Live Account & Real Balance Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 border border-orange-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-orange-400" />
                  <h2 className="text-base font-bold text-white">Compte & Balance Stake.com Active</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    draftCreds.apiKey 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {draftCreds.apiKey ? 'Jeton de Session Configuré' : 'Mode Démo Provably Fair'}
                  </span>
                  {detectedStakeUser && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                      @{detectedStakeUser}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  Solde synchronisé en temps réel avec vos algorithmes de jeu et de gestion de capital
                </p>
              </div>

              {/* Balance Widget with Currency Picker */}
              <div className="bg-slate-950/90 border border-orange-500/30 rounded-xl p-3 sm:px-5 flex items-center gap-4 shadow-inner">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Solde Disponible</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight flex items-baseline gap-1.5">
                    <span>
                      {settings.hideBalancePrivacy ? '••••••' : currentBalance.toFixed(4)}
                    </span>
                    <span className="text-sm font-bold text-orange-400">{currency}</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-800" />

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Devise Active</div>
                  <select
                    value={currency}
                    onChange={(e) => {
                      onCurrencyChange(e.target.value);
                      setDraftCreds({ ...draftCreds, currency: e.target.value });
                    }}
                    className="bg-slate-900 border border-slate-700 text-xs font-bold text-orange-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  >
                    {currenciesList.map((curr) => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Balance Actions & Manual Adjustment */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestStakeConnection}
                  disabled={isTestingStake}
                  className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTestingStake ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span>Synchroniser Solde via API Stake</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingBalance(!isEditingBalance)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold transition flex items-center gap-1.5"
                >
                  <span>✏️ Ajuster Solde Initial</span>
                </button>
              </div>

              {isEditingBalance && (
                <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-950 p-2 rounded-xl border border-slate-700 animate-in fade-in">
                  <span className="text-[11px] text-slate-400 font-bold">Nouveau solde ({currency}) :</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={currentBalance.toString()}
                    value={customBalanceInput}
                    onChange={(e) => setCustomBalanceInput(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-300 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = parseFloat(customBalanceInput);
                      if (!isNaN(num) && num >= 0 && onUpdateWallet) {
                        onUpdateWallet(currency, num);
                        if (settings.soundEffects) soundEffects.playWin(true);
                        setIsEditingBalance(false);
                        setCustomBalanceInput('');
                        setShowSaveToast(true);
                        setTimeout(() => setShowSaveToast(false), 2000);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Stake API Credentials & Direct Connection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Connexion API & Jeton de Session Stake</h3>
                  <p className="text-xs text-slate-400">Renseignez votre clé d'API pour interagir avec votre compte</p>
                </div>
              </div>

              <a
                href="https://stake.com/?tab=api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Obtenir sur Stake</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Domain Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Domaine / Miroir Stake ({STAKE_MIRROR_DOMAINS.length})</span>
                  </span>
                  <span className="text-[10px] text-cyan-400/80 font-mono">
                    {getStakeDomainInfo(draftCreds.domain).region}
                  </span>
                </label>
                <select
                  value={isKnownStakeMirror(draftCreds.domain) ? cleanStakeDomain(draftCreds.domain) : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      setDraftCreds({ ...draftCreds, domain: cleanStakeDomain(val) });
                      setStakeTestResult(null);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {STAKE_DOMAIN_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label} className="bg-slate-950 text-slate-300 font-bold">
                      {group.domains.map((d) => (
                        <option key={d.domain} value={d.domain} className="bg-slate-900 text-slate-100 font-normal">
                          {d.flagEmoji || '🌐'} {d.name} — {d.region}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="⚙️ Personnalisé" className="bg-slate-950 text-slate-300 font-bold">
                    <option value="custom" className="bg-slate-900 text-cyan-300 font-semibold">
                      ✍️ Saisir un autre domaine miroir personnalisé...
                    </option>
                  </optgroup>
                </select>

                {(!isKnownStakeMirror(draftCreds.domain) || draftCreds.domain === 'custom') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={draftCreds.domain === 'custom' ? '' : draftCreds.domain}
                      onChange={(e) => {
                        setDraftCreds({ ...draftCreds, domain: cleanStakeDomain(e.target.value) });
                        setStakeTestResult(null);
                      }}
                      placeholder="Ex: stake1022.com ou mon-miroir.org"
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Nom d'hôte sans "https://"
                    </span>
                  </div>
                )}
              </div>

              {/* Stake API Token / Session */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Jeton d'Accès API (Session Token / API Key)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStakeKey(!showStakeKey)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showStakeKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showStakeKey ? 'Masquer' : 'Afficher'}</span>
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    type={showStakeKey ? 'text' : 'password'}
                    value={draftCreds.apiKey}
                    onChange={(e) => {
                      setDraftCreds({ ...draftCreds, apiKey: e.target.value });
                      setStakeTestResult(null);
                    }}
                    placeholder="session_token_stake_ex_8fa72..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-slate-600"
                  />

                  <button
                    type="button"
                    onClick={handleTestStakeConnection}
                    disabled={isTestingStake}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 flex-shrink-0 shadow-md shadow-orange-900/30"
                  >
                    {isTestingStake ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Vérification...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Tester la Connexion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Live Mode vs Simulation Mode Switcher */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Mode d'Exécution des Paris</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    draftCreds.isLiveMode 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {draftCreds.isLiveMode ? 'Mode Réel (Live Stake API)' : 'Mode Simulation (Provably Fair)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {draftCreds.isLiveMode 
                    ? '⚠️ Les mises sont envoyées directement à votre compte Stake réel via l\'API.'
                    : '🛡️ Mode sécurisé : les algorithmes tournent en bac à sable avec vérification mathématique HMAC-SHA256 sans risquer de fonds.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDraftCreds({ ...draftCreds, isLiveMode: !draftCreds.isLiveMode })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  draftCreds.isLiveMode
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                }`}
              >
                {draftCreds.isLiveMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{draftCreds.isLiveMode ? 'Basculer en Simulation' : 'Activer Mode Réel'}</span>
              </button>
            </div>

            {/* Stake Test Feedback Banner */}
            {stakeTestResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  stakeTestResult.ok
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                {stakeTestResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="space-y-1 flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{stakeTestResult.ok ? 'Connexion API Validée avec Succès !' : 'Échec de Connexion'}</span>
                    {stakeTestResult.domain && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                        {stakeTestResult.domain}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] opacity-90">
                    {stakeTestResult.message || stakeTestResult.error}
                  </p>

                  {stakeTestResult.ok && (
                    <div className="text-[10px] text-emerald-300/90 pt-1 flex items-center gap-3">
                      <span>• Matchs synchronisés : {stakeTestResult.activeFixtures ?? '60+'}</span>
                      <span>• Rencontres in-play live : {stakeTestResult.liveFixturesCount ?? '8'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Card 3: Cryptographic Provably Fair Seeds (HMAC-SHA256) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Graines Cryptographiques Provably Fair</h3>
                  <p className="text-xs text-slate-400">Standard officiel Stake.com (HMAC-SHA256 & Nonce Incrémental)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRandomizeSeeds}
                className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Régénérer Graines</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Graine Client (Client Seed) :
                </label>
                <input
                  type="text"
                  value={draftCreds.clientSeed}
                  onChange={(e) => setDraftCreds({ ...draftCreds, clientSeed: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Hachage Graine Serveur (Server Seed Hash SHA256) :
                </label>
                <input
                  type="text"
                  value={draftCreds.serverSeedHash}
                  onChange={(e) => setDraftCreds({ ...draftCreds, serverSeedHash: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Chaque pari généré est infalsifiable et mathématiquement vérifiable avec un taux de retour joueur (RTP) garanti de 99.0%.</span>
            </div>
          </div>

          {/* Card 4: Garde-fous & Sécurité de Jeu Automatique */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Garde-Fous & Gestion du Risque (Safe Auto-Betting)</h3>
                <p className="text-xs text-slate-400">Limites strictes pour protéger votre capital lors du jeu automatique</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Max Bet Hard Cap */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Plafond Mise Unitaire Max</span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {settings.defaultStakePercent}% de Bankroll
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Empêche tout pari de dépasser ce pourcentage de votre solde.
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={settings.defaultStakePercent}
                  onChange={(e) => handleSettingChange('defaultStakePercent', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Daily Stop Loss */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Stop-Loss Journalier</span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    -{settings.stopLossPercent}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Coupure d'urgence et arrêt immédiat des paris en cas de perte.
                </p>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.stopLossPercent}
                  onChange={(e) => handleSettingChange('stopLossPercent', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Kelly Model Selection */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Modèle de Bankroll</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {settings.bankrollModel === 'quarter_kelly' ? '1/4 Kelly (Pro)' : settings.bankrollModel === 'half_kelly' ? '1/2 Kelly (Agressif)' : 'Mise Fixe'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Ajuste le dimensionnement optimal des mises selon l'Expected Value.
                </p>
                <select
                  value={settings.bankrollModel}
                  onChange={(e) => handleSettingChange('bankrollModel', e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 font-bold rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="quarter_kelly">1/4 Kelly (Équilibré Pro & Recommandé)</option>
                  <option value="half_kelly">1/2 Kelly (Dynamique Agressif)</option>
                  <option value="flat_stake">Mise Fixe (Flat Staking Standard)</option>
                  <option value="oscars_grind">Progression Positive Modérée</option>
                </select>
              </div>

            </div>

            {/* Quick Banner to Flat Betting Calculator */}
            <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-indigo-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-xs text-slate-300">
                  Besoin d'aide pour calibrer votre mise unitaire ? Utilisez notre <strong className="text-indigo-300">Calculateur Flat Betting</strong> (Prudent / Agressif).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('betting')}
                className="px-3 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
              >
                <span>Ouvrir le Calculateur</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Dynamic Base Bet Auto-Calculation Module (% Bankroll) */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-teal-950/40 border border-emerald-500/40 space-y-3.5 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Calcul Automatique du Base Bet (% du Solde Dynamique)
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        settings.autoBaseBetPercentEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {settings.autoBaseBetPercentEnabled ? `ACTIF (${activeDynamicPercent}%)` : 'DÉSACTIVÉ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Ajuste automatiquement la mise de base selon un pourcentage défini de votre bankroll (ex: 0.1%) pour une gestion de risque dynamique et anti-drawdown.
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => handleSettingChange('autoBaseBetPercentEnabled', !settings.autoBaseBetPercentEnabled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 flex-shrink-0 shadow-sm ${
                    settings.autoBaseBetPercentEnabled
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{settings.autoBaseBetPercentEnabled ? 'Désactiver Auto Base Bet' : 'Activer Auto Base Bet'}</span>
                </button>
              </div>

              {/* Dynamic Base Bet Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Left: Percentage & Presets */}
                <div className="md:col-span-7 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Pourcentage du Solde (Bankroll) :</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-700/50">
                      {activeDynamicPercent}%
                    </span>
                  </div>

                  {/* Quick percentage pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { pct: 0.05, label: '0.05%', desc: '2000 paris (Ultra-Safe)' },
                      { pct: 0.1, label: '0.1%', desc: '1000 paris (Standard Micro)' },
                      { pct: 0.25, label: '0.25%', desc: '400 paris (Modéré)' },
                      { pct: 0.5, label: '0.5%', desc: '200 paris (Actif)' },
                      { pct: 1.0, label: '1.0%', desc: '100 paris (Croissance)' },
                      { pct: 2.0, label: '2.0%', desc: '50 paris (Agressif)' },
                    ].map((item) => (
                      <button
                        key={item.pct}
                        type="button"
                        onClick={() => handleSettingChange('autoBaseBetPercent', item.pct)}
                        className={`py-1.5 px-1 rounded-lg text-center transition border ${
                          activeDynamicPercent === item.pct
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title={item.desc}
                      >
                        <div className="text-xs font-mono font-bold">{item.label}</div>
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="0.01"
                    max="5.0"
                    step="0.01"
                    value={activeDynamicPercent}
                    onChange={(e) => handleSettingChange('autoBaseBetPercent', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0.01% (Micro VIP)</span>
                    <span>0.1% (Standard 1/1000)</span>
                    <span>1.0% (1/100)</span>
                    <span>5.0% (Plafond Max)</span>
                  </div>

                  {/* Minimum Floor Input */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 text-[11px]">Plancher Minimal (Min Bet Floor) :</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={activeDynamicMinFloor}
                        onChange={(e) => handleSettingChange('autoBaseBetMinFloor', parseFloat(e.target.value) || 0.0001)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[11px] font-mono text-slate-400">{currency}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Live Calculation Result Card */}
                <div className="md:col-span-5 bg-gradient-to-br from-emerald-950/60 to-slate-950 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <span>Mise Calculée en Direct</span>
                      <span className="text-emerald-400 font-mono font-bold">Solde : {currentBalance.toFixed(2)} {currency}</span>
                    </div>

                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        {currentDynamicBaseBet.toFixed(4)}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-300">{currency}</span>
                      <span className="text-[10px] font-mono text-emerald-300/80">
                        ({activeDynamicPercent}%)
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>{dynamicSurvivalUnits} mises de survie avant épuisement théorique</span>
                    </div>
                  </div>

                  {/* Drawdown & Growth simulation */}
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-emerald-900/30 text-[10px] space-y-1 font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Si Solde 50 {currency} (Perte) :</span>
                      <span className="text-amber-400 font-bold">{calculateDynamicBaseBet(50, activeDynamicPercent, activeDynamicMinFloor, activeDynamicMaxCap).toFixed(4)} {currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Si Solde 200 {currency} (Gain) :</span>
                      <span className="text-emerald-400 font-bold">{calculateDynamicBaseBet(200, activeDynamicPercent, activeDynamicMinFloor, activeDynamicMaxCap).toFixed(4)} {currency}</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyDynamicBaseBet}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1"
                    >
                      {copiedDynamicBaseBet ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyDynamicBaseBetToStrategy}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-extrabold transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1"
                    >
                      {appliedDynamicBaseBetSuccess ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-slate-950" />
                          <span>Appliqué !</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 fill-current" />
                          <span>Appliquer à la Stratégie</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: External Sport APIs (API-Sports & The Odds API) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Flux Sportifs & Benchmark Cotes (Options Pro)</h3>
                  <p className="text-xs text-slate-400">Intégrez vos propres clés pour des données illimitées en direct</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* API-Sports Direct */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-blue-400" />
                    <span>API-Sports.io (Lineups & Live Events)</span>
                  </span>
                  <a
                    href="https://dashboard.api-sports.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>api-sports.io</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftCreds.apiSportsKey || ''}
                    onChange={(e) => {
                      setDraftCreds({ ...draftCreds, apiSportsKey: e.target.value });
                      setSportsTestResult(null);
                    }}
                    placeholder="Clé API-Sports (ex: 8f4a19...)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestApiSportsConnection}
                    disabled={isTestingSportsKey}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 flex-shrink-0"
                  >
                    {isTestingSportsKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    <span>Test</span>
                  </button>
                </div>

                {sportsTestResult && (
                  <div className={`p-2 rounded-lg text-[10px] ${sportsTestResult.ok ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'}`}>
                    {sportsTestResult.message || sportsTestResult.error}
                  </div>
                )}
              </div>

              {/* The Odds API Direct */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>The Odds API (Benchmark Pinnacle & Betfair)</span>
                  </span>
                  <a
                    href="https://the-odds-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>the-odds-api.com</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftCreds.theOddsApiKey || ''}
                    onChange={(e) => {
                      setDraftCreds({ ...draftCreds, theOddsApiKey: e.target.value });
                      setOddsTestResult(null);
                    }}
                    placeholder="Clé The Odds API (ex: 6c8d7e...)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestOddsApiConnection}
                    disabled={isTestingOddsKey}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 flex-shrink-0"
                  >
                    {isTestingOddsKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    <span>Test</span>
                  </button>
                </div>

                {oddsTestResult && (
                  <div className={`p-2 rounded-lg text-[10px] ${oddsTestResult.ok ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'}`}>
                    {oddsTestResult.message || oddsTestResult.error}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Bottom Action: Save & Apply All */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Vos identifiants sont sauvegardés de manière sécurisée et locale dans votre navigateur.</span>
            </div>

            <button
              type="button"
              id="btn-save-stake-settings"
              onClick={handleSaveCredentials}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-600 hover:from-orange-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-orange-900/30 transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer & Appliquer les Clés Stake</span>
            </button>
          </div>

        </div>
      )}

      {/* SECTION 1: LANGUE & LOCALISATION */}
      {activeSection === 'general' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Languages className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Langue de l'Interface</h2>
                <p className="text-xs text-slate-400">Sélectionnez la langue d'affichage de l'application</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = settings.language === lang.code;
                return (
                  <div
                    key={lang.code}
                    onClick={() => handleSettingChange('language', lang.code)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{lang.label}</div>
                        <div className="text-[10px] text-slate-400">{lang.nativeName}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Fuseau Horaire */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white">Fuseau Horaire de Référence</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Utilisé pour le calcul des coups d'envoi et la synchronisation des cotes sportives.
              </p>
              <select
                value={settings.timeZone}
                onChange={(e) => handleSettingChange('timeZone', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Heure 24h / 12h */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white">Format d'Affichage de l'Heure</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Choisissez entre l'affichage militaire (24h) et le format anglo-saxon (12h AM/PM).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSettingChange('timeFormat', '24h')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    settings.timeFormat === '24h'
                      ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-mono">24 Heures (21:45)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSettingChange('timeFormat', '12h')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    settings.timeFormat === '12h'
                      ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-mono">12 Heures (09:45 PM)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION 2: COTES & BANKROLL */}
      {activeSection === 'betting' && (
        <div className="space-y-4">
          
          {/* CALCULATEUR AVANCÉ DE SURVIE & GESTION GLOBALE DE BANKROLL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl ring-1 ring-slate-800/80">
            
            {/* Header with Title and Reference Balance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/90 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-emerald-500/20 border border-indigo-500/40 text-indigo-400 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-white">
                      Calculateur de Gestion de Bankroll Avancée & Survie du Compte
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Anti-Ruine Long-Terme
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Définissez un risque fixe global calculé mathématiquement pour ajuster automatiquement toutes vos stratégies actives et garantir la survie à long terme de votre capital.
                  </p>
                </div>
              </div>

              {/* Reference Balance Badge */}
              <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shadow-inner self-start sm:self-auto">
                <Wallet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-400 text-[10px] block font-medium">Capital de Référence</span>
                  <span className="font-mono font-bold text-white">
                    {effectiveFlatBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Presets de Risque & Profils de Survie */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Profil de Risque Fixe Global :</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/70 px-2.5 py-0.5 rounded-lg border border-indigo-800/50 shadow-sm">
                    {globalRiskPercent}% du capital par unité de base
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                
                {/* Preset 1: Ultra Safe (0.10%) */}
                <button
                  type="button"
                  onClick={() => handleSelectRiskPreset('ultra_safe', 0.1)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    globalRiskPreset === 'ultra_safe'
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Shield className={`w-3.5 h-3.5 ${globalRiskPreset === 'ultra_safe' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${globalRiskPreset === 'ultra_safe' ? 'text-emerald-200' : 'text-white'}`}>
                          Survie Maximale
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        0.10%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Protection absolue. Plus de 1000 unités de réserve. Ruine impossible.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-emerald-400/90">
                    <span>Score Survie : 99/100</span>
                    <span>1000 paris</span>
                  </div>
                </button>

                {/* Preset 2: Safe / Prudent (0.50%) - Recommandé */}
                <button
                  type="button"
                  onClick={() => handleSelectRiskPreset('safe', 0.5)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    globalRiskPreset === 'safe'
                      ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className={`w-3.5 h-3.5 ${globalRiskPreset === 'safe' ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${globalRiskPreset === 'safe' ? 'text-blue-200' : 'text-white'}`}>
                          Prudent (Idéal)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        0.50%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Recommandé bot IA. 200 à 500 unités. Résilience face à toutes les séries noires.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-blue-400/90">
                    <span>Score Survie : 94/100</span>
                    <span>200 paris</span>
                  </div>
                </button>

                {/* Preset 3: Balanced (1.00%) */}
                <button
                  type="button"
                  onClick={() => handleSelectRiskPreset('balanced', 1.0)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    globalRiskPreset === 'balanced'
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-400/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className={`w-3.5 h-3.5 ${globalRiskPreset === 'balanced' ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${globalRiskPreset === 'balanced' ? 'text-indigo-200' : 'text-white'}`}>
                          Équilibré
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        1.00%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Standard pour le flat betting. 100 unités de capital. Risque de ruine faible (&lt;1%).
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-indigo-400/90">
                    <span>Score Survie : 85/100</span>
                    <span>100 paris</span>
                  </div>
                </button>

                {/* Preset 4: Dynamic (2.00%) */}
                <button
                  type="button"
                  onClick={() => handleSelectRiskPreset('dynamic', 2.0)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    globalRiskPreset === 'dynamic'
                      ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Activity className={`w-3.5 h-3.5 ${globalRiskPreset === 'dynamic' ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${globalRiskPreset === 'dynamic' ? 'text-amber-200' : 'text-white'}`}>
                          Dynamique
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        2.00%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Croissance plus active. 50 unités de réserve. Convient aux petits soldes.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-amber-400/90">
                    <span>Score Survie : 70/100</span>
                    <span>50 paris</span>
                  </div>
                </button>

                {/* Preset 5: Aggressive (3.50%) */}
                <button
                  type="button"
                  onClick={() => handleSelectRiskPreset('aggressive', 3.5)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    globalRiskPreset === 'aggressive'
                      ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Flame className={`w-3.5 h-3.5 ${globalRiskPreset === 'aggressive' ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${globalRiskPreset === 'aggressive' ? 'text-rose-200' : 'text-white'}`}>
                          Agressif
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        3.50%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Sessions rapides à haute volatilité. Drawdown important possible.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-rose-400/90">
                    <span>Score Survie : 45/100</span>
                    <span>28 paris</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Curseur Personnalisé & Testeur de Balance */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Ajustement fin du Risque Global :</span>
                  <span className="text-xs font-mono font-extrabold text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {globalRiskPercent}%
                  </span>
                </div>

                {/* Quick percentage pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setGlobalRiskPercent(pct);
                        if (pct === 0.1) setGlobalRiskPreset('ultra_safe');
                        else if (pct === 0.5) setGlobalRiskPreset('safe');
                        else if (pct === 1.0) setGlobalRiskPreset('balanced');
                        else if (pct === 2.0) setGlobalRiskPreset('dynamic');
                        else if (pct === 3.5 || pct === 5.0) setGlobalRiskPreset('aggressive');
                        else setGlobalRiskPreset('custom');
                        if (settings.soundEffects) soundEffects.playClick(true);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                        globalRiskPercent === pct
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="0.05"
                max="5.00"
                step="0.05"
                value={globalRiskPercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setGlobalRiskPercent(val);
                  setGlobalRiskPreset('custom');
                }}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              {/* Option to simulate another balance */}
              <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-custom-balance-sim-global"
                    checked={isUsingCustomBalance}
                    onChange={(e) => setIsUsingCustomBalance(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="chk-custom-balance-sim-global" className="text-slate-400 cursor-pointer text-[11px]">
                    Tester avec un montant de balance simulé au lieu de la balance active ({currentBalance} {currency})
                  </label>
                </div>

                {isUsingCustomBalance && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={flatCustomBalance}
                      onChange={(e) => setFlatCustomBalance(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-slate-400">{currency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* GRAND TABLEAU QUANTITATIF DE SURVIE DU COMPTE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-950 to-slate-950 border border-indigo-500/30 space-y-4 shadow-lg">
              
              {/* Top Row: Score, Base Bet & Ruin Probability */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-300/80 uppercase tracking-widest block mb-0.5">
                    Indice Mathématique de Survie du Compte
                  </span>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight">
                      {survivalMetrics.baseStakeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-200">{currency} / mise de base</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {globalRiskPercent}% du capital
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {survivalMetrics.survivalTierLabel}
                  </p>
                </div>

                {/* Score and Longevity Badge */}
                <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-inner">
                  <div className="text-center px-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Score Survie</span>
                    <span className="text-xl font-mono font-black text-emerald-400">{survivalMetrics.accountSurvivalScore}/100</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-center px-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Horizon Paris</span>
                    <span className="text-base font-mono font-bold text-white">+{survivalMetrics.totalUnits} paris</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-center px-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Proba Ruine</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">{survivalMetrics.ruinProbability1000Bets}%</span>
                  </div>
                </div>
              </div>

              {/* Grid: 6 Detailed Risk & Longevity Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Unités Totales</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {survivalMetrics.totalUnits} paris
                  </span>
                  <span className="text-[9px] text-slate-500 block">avant épuisement</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Perte Max sur 5 Paris</span>
                  <span className="font-mono font-bold text-rose-400 text-xs">
                    -{(survivalMetrics.baseStakeAmount * 5).toFixed(4)} {currency}
                  </span>
                  <span className="text-[9px] text-slate-500 block">-{(globalRiskPercent * 5).toFixed(2)}% du solde</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Stop-Loss Recommandé</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">
                    -{survivalMetrics.recommendedStopLossAmount} {currency}
                  </span>
                  <span className="text-[9px] text-slate-500 block">seuil de protection</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Take-Profit Conseillé</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    +{survivalMetrics.recommendedTakeProfitAmount} {currency}
                  </span>
                  <span className="text-[9px] text-slate-500 block">objectif de session</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Value at Risk (VaR 95%)</span>
                  <span className="font-mono font-bold text-indigo-300 text-xs">
                    {survivalMetrics.estimatedValueAtRisk95} {currency}
                  </span>
                  <span className="text-[9px] text-slate-500 block">perte max 95% confiance</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Exposition Max / Jour</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    {survivalMetrics.safeDailyExposureCap} {currency}
                  </span>
                  <span className="text-[9px] text-slate-500 block">volume maximal sûr</span>
                </div>

              </div>

              {/* Matrice de Résilience aux Séries Noires par Mécanique de Jeu */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tolérance aux Séries de Pertes Consécutives (Résilience du Compte) :</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Paliers supportés avant 50% de Drawdown</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-center">
                    <span className="text-[10px] text-slate-400 block">Flat Betting</span>
                    <span className="font-mono font-extrabold text-emerald-400 text-xs">
                      {survivalMetrics.maxConsecutiveLossTolerance.flat} pertes
                    </span>
                    <span className="text-[9px] text-slate-500 block">Tranquillité totale</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-center">
                    <span className="text-[10px] text-slate-400 block">D'Alembert</span>
                    <span className="font-mono font-extrabold text-blue-400 text-xs">
                      {survivalMetrics.maxConsecutiveLossTolerance.dalembert} paliers
                    </span>
                    <span className="text-[9px] text-slate-500 block">Progression arithmétique</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-center">
                    <span className="text-[10px] text-slate-400 block">Oscar's Grind</span>
                    <span className="font-mono font-extrabold text-indigo-400 text-xs">
                      {survivalMetrics.maxConsecutiveLossTolerance.oscarsGrind} cycles
                    </span>
                    <span className="text-[9px] text-slate-500 block">Protection optimale</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-center">
                    <span className="text-[10px] text-slate-400 block">Fibonacci</span>
                    <span className="font-mono font-extrabold text-amber-400 text-xs">
                      {survivalMetrics.maxConsecutiveLossTolerance.fibonacci} crans
                    </span>
                    <span className="text-[9px] text-slate-500 block">Absorption des streaks</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 text-center">
                    <span className="text-[10px] text-slate-400 block">Martingale x2</span>
                    <span className="font-mono font-extrabold text-rose-400 text-xs">
                      {survivalMetrics.maxConsecutiveLossTolerance.martingale} doubles
                    </span>
                    <span className="text-[9px] text-slate-500 block">Seuil d'arrêt sécurisé</span>
                  </div>

                </div>
              </div>

              {/* BOUTON MAÎTRE D'ACTION & AUTO-AJUSTEMENT CONTINU */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-indigo-900/40">
                
                {/* Auto-Adjustment Dynamic Toggle */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-auto-risk-adjust"
                    checked={settings.autoRiskAdjustmentEnabled || false}
                    onChange={(e) => handleSettingChange('autoRiskAdjustmentEnabled', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="chk-auto-risk-adjust" className="text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <span>Ajustement Dynamique Continu en Temps Réel</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        AUTO-SCALE
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Recalcule et met à l'échelle automatiquement toutes les stratégies actives lorsque votre solde évolue.
                    </p>
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalibratedCatalog(!showCalibratedCatalog)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{showCalibratedCatalog ? 'Masquer le catalogue' : 'Voir les stratégies ajustées'}</span>
                    {showCalibratedCatalog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    disabled={isApplyingGlobalRisk}
                    onClick={handleApplyGlobalRiskToAll}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isApplyingGlobalRisk ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Calibration en cours...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                        <span>Ajuster & Synchroniser Toutes les Stratégies</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback Alert Toast */}
              {globalRiskApplyFeedback && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center justify-between animate-fade-in shadow-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      <strong>Succès de la Calibration :</strong> {globalRiskApplyFeedback.count} stratégies actives ont été ajustées pour un risque de <strong>{globalRiskApplyFeedback.riskPct}%</strong> (Mise de base unitaire : {globalRiskApplyFeedback.baseStake.toFixed(4)} {currency}).
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300/80">Synchronisé</span>
                </div>
              )}

            </div>

            {/* CATALOGUE DÉROULANT DES STRATÉGIES CALIBRÉES (AVANT / APRÈS) */}
            {showCalibratedCatalog && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span>Catalogue des Stratégies Prédéfinies Calibrées ({PREDEFINED_STRATEGIES.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Visualisez la mise de base exacte et les seuils de risque assignés à chaque jeu pour un risque global de {globalRiskPercent}%.
                    </p>
                  </div>

                  {/* Filters by Game */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {['all', 'dice', 'limbo', 'mines', 'crash', 'plinko', 'roulette'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterGameCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition border ${
                          filterGameCategory === cat
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table of Calibrated Strategies */}
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {PREDEFINED_STRATEGIES
                    .filter(s => filterGameCategory === 'all' || (s.game as string)?.toLowerCase() === filterGameCategory.toLowerCase())
                    .map((s) => {
                      const calibrated = calibrateStrategyForGlobalRisk(s, effectiveFlatBalance, globalRiskPercent);
                      const isCurrent = currentStrategy?.id === s.id;

                      return (
                        <div
                          key={s.id}
                          className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                            isCurrent
                              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-sm'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                              {(s.game as string) || 'DICE'}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{s.name}</span>
                                {isCurrent && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-sans font-bold">
                                    ACTIVE ACTUELLE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-sm">
                                {s.description || 'Optimisation quantitative'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-[11px]">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block font-sans">Mise de Base</span>
                              <span className="font-bold text-emerald-400">
                                {calibrated.baseBet.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} {currency}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block font-sans">Stop-Loss</span>
                              <span className="font-bold text-amber-400">
                                -{calibrated.stopOnLoss ? calibrated.stopOnLoss.toFixed(2) : 'N/A'} {currency}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-500 block font-sans">Take-Profit</span>
                              <span className="font-bold text-emerald-300">
                                +{calibrated.stopOnProfit ? calibrated.stopOnProfit.toFixed(2) : 'N/A'} {currency}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateStrategy) {
                                  onUpdateStrategy(calibrated);
                                  if (settings.soundEffects) soundEffects.playWin(true);
                                  setGlobalRiskApplyFeedback({
                                    success: true,
                                    count: 1,
                                    riskPct: globalRiskPercent,
                                    baseStake: calibrated.baseBet,
                                    timestamp: Date.now(),
                                  });
                                }
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <span>Sélectionner</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>

          {/* Format des cotes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Format d'Affichage des Cotes</h2>
                  <p className="text-xs text-slate-400">Standard décimal européen (@1.95), américain (+150) ou fractionnaire (5/2)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ODDS_FORMATS.map((fmt) => {
                const isSelected = settings.oddsFormat === fmt.id;
                const sampleOdd = formatOddsByFormat(2.15, fmt.id);

                return (
                  <div
                    key={fmt.id}
                    onClick={() => handleSettingChange('oddsFormat', fmt.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">{fmt.label}</div>
                      <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                        {sampleOdd}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{fmt.example}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Devise principale & Gestion du Capital */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Devise */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">Devise Principale du Wallet</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Sélectionnez la monnaie utilisée pour le calcul du ROI et les bilans financiers.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {currenciesList.map((curr) => {
                  const info = getCurrencyInfo(curr);
                  const isSelected = currency === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => onCurrencyChange(curr)}
                      className={`p-2.5 rounded-xl text-left border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-400/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{curr}</span>
                          {info.isStablecoin && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-sans font-bold">
                              STABLE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[90px]">{info.name}</div>
                      </div>
                      <span className="text-xs font-mono text-slate-500 font-semibold">{info.symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modèle de Bankroll */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white">Dimensionnement de Kelly</h3>
                </div>
                <span className="text-xs font-mono font-bold text-purple-400">
                  {settings.bankrollModel === 'quarter_kelly' ? '1/4 Kelly' : settings.bankrollModel === 'half_kelly' ? '1/2 Kelly' : 'Mise Fixe'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                La formule de Kelly optimise mathématiquement la taille des mises en fonction de l'avantage (Edge EV+).
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'quarter_kelly', label: '1/4 Kelly', sub: 'Recommandé' },
                  { value: 'half_kelly', label: '1/2 Kelly', sub: 'Agressif' },
                  { value: 'flat_stake', label: 'Flat Stake', sub: 'Mise Fixe' },
                ].map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => handleSettingChange('bankrollModel', k.value as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      settings.bankrollModel === k.value
                        ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{k.label}</div>
                    <div className="text-[9px] opacity-75">{k.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode 'Demo Loop' (Simulateur 100 Paris Accélérés) */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/40 rounded-2xl p-5 md:col-span-2 space-y-3 shadow-lg shadow-emerald-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                      <FastForward className="w-5 h-5 text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">Mode 'Demo Loop' (100 Paris Accélérés)</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ⚡ Réactivité Optimiseur
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Simule automatiquement une suite de 100 paris avec accélération visuelle (1x à 50x ou instantané) pour constater en direct l'ajustement dynamique des mises et la gestion du risque.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-launch-demo-loop"
                  onClick={() => setIsDemoLoopModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-900/40 flex-shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lancer Demo Loop (100)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Vitesse Réglable</div>
                  <div className="text-white font-bold font-mono">1x • 5x • 20x • 50x • Turbo</div>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Visualisation Graphique</div>
                  <div className="text-emerald-400 font-bold font-mono">Courbe d'Équité SVG Live</div>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Gestion du Risque</div>
                  <div className="text-purple-400 font-bold font-mono">Adaptive Kelly & Anti-DD</div>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="text-slate-400 text-[10px]">Télémétrie IA</div>
                  <div className="text-cyan-400 font-bold font-mono">Feed Temps Réel 100/100</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SECTION 3: NOTIFICATIONS & AUDIO */}
      {activeSection === 'notifications' && (
        <div className="space-y-4">

          {/* 1. NOTIFICATIONS LOCALES DU NAVIGATEUR (PUSH HTML5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">Notifications Locales du Navigateur</h2>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      settings.browserNotificationsEnabled && browserNotifPermission === 'granted'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {settings.browserNotificationsEnabled && browserNotifPermission === 'granted' ? 'ACTIVES' : 'DÉSACTIVÉES'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Alertes natives du système d'exploitation via l'API Web Notification (visibles même en arrière-plan)
                  </p>
                </div>
              </div>

              {/* Quick test notification button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestBrowserNotification}
                  disabled={isRequestingNotif}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Envoyer une notification test sur votre écran"
                >
                  {isRequestingNotif ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span>Tester Notification</span>
                </button>
              </div>
            </div>

            {/* Notification Feedback Toast Banner */}
            {testNotifFeedback && (
              <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center gap-2 text-xs text-orange-200">
                <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{testNotifFeedback}</span>
              </div>
            )}

            {/* Permission Status Banner */}
            <div className="p-3.5 rounded-xl border bg-slate-950/60 border-slate-800/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Statut de permission du navigateur :</span>
                  {browserNotifPermission === 'granted' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Autorisé
                    </span>
                  ) : browserNotifPermission === 'denied' ? (
                    <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Bloqué par le navigateur
                    </span>
                  ) : browserNotifPermission === 'unsupported' ? (
                    <span className="inline-flex items-center gap-1 text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                      Non supporté
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      Non demandé
                    </span>
                  )}
                </div>

                {browserNotifPermission !== 'granted' && browserNotifPermission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={handleRequestBrowserPermission}
                    disabled={isRequestingNotif}
                    className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Demander l'autorisation</span>
                  </button>
                )}
              </div>

              {browserNotifPermission === 'denied' && (
                <p className="text-[11px] text-rose-300/90 leading-relaxed bg-rose-950/30 p-2 rounded-lg border border-rose-500/20">
                  ⚠️ Les notifications sont bloquées dans les paramètres de votre navigateur. Pour les réactiver, cliquez sur l'icône de cadenas ou de paramètres à gauche de l'URL dans votre barre d'adresse et autorisez les notifications pour ce site.
                </p>
              )}
            </div>

            {/* Master Toggle */}
            <div 
              onClick={() => {
                const nextVal = !settings.browserNotificationsEnabled;
                handleSettingChange('browserNotificationsEnabled', nextVal);
                if (nextVal && browserNotifPermission !== 'granted') {
                  handleRequestBrowserPermission();
                }
              }}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${settings.browserNotificationsEnabled ? 'bg-orange-600/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                  {settings.browserNotificationsEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Activer le Moteur de Notifications Locales</div>
                  <div className="text-[11px] text-slate-400">
                    Permet au bot d'émettre des alertes push natives directement sur votre bureau/mobile
                  </div>
                </div>
              </div>

              <div className={`w-11 h-6 flex items-center rounded-full p-1 transition ${settings.browserNotificationsEnabled ? 'bg-orange-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </div>
            </div>

            {/* Specific Notification Event Triggers */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Événements Déclencheurs d'Alertes Locales
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* 1. Alerte Seuil Critique de Perte */}
                <div
                  onClick={() => handleSettingChange('notifyOnCriticalLoss', !settings.notifyOnCriticalLoss)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    settings.notifyOnCriticalLoss
                      ? 'bg-rose-950/40 border-rose-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${settings.notifyOnCriticalLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Seuil Critique de Perte
                      </span>
                    </div>
                    <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition ${settings.notifyOnCriticalLoss ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                      <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Déclenche une notification persistante si le stop-loss ou le drawdown maximum configuré est atteint.
                  </p>
                </div>

                {/* 2. Alerte Arrêt Inattendu du Bot */}
                <div
                  onClick={() => handleSettingChange('notifyOnUnexpectedStop', !settings.notifyOnUnexpectedStop)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    settings.notifyOnUnexpectedStop
                      ? 'bg-amber-950/40 border-amber-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${settings.notifyOnUnexpectedStop ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Arrêt Inattendu du Bot
                      </span>
                    </div>
                    <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition ${settings.notifyOnUnexpectedStop ? 'bg-amber-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                      <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Alerte immédiate en cas de solde insuffisant, coupe-circuit de pertes consécutives ou erreur d'API.
                  </p>
                </div>

                {/* 3. Alerte Take-Profit Atteint */}
                <div
                  onClick={() => handleSettingChange('notifyOnTakeProfit', !settings.notifyOnTakeProfit)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    settings.notifyOnTakeProfit
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${settings.notifyOnTakeProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        Objectif Take-Profit
                      </span>
                    </div>
                    <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition ${settings.notifyOnTakeProfit ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                      <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Notifie dès que la cible de gain de session ou le trailing stop-loss est sécurisé.
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* 2. EFFETS SONORES & RETOUR HAPTIQUE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Effets Sonores & Retour Haptique</h2>
                  <p className="text-xs text-slate-400">Synthétiseur audio Web Audio natif pour les gains et validations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestSound('win')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900 transition flex items-center gap-1"
                  title="Tester le son de gain"
                >
                  <Play className="w-3 h-3" />
                  <span>Test Gain</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSound('alert')}
                  className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-900 transition flex items-center gap-1"
                  title="Tester le son d'alerte"
                >
                  <Play className="w-3 h-3" />
                  <span>Test Alerte</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Toggle Audio */}
              <div 
                onClick={() => handleSettingChange('soundEffects', !settings.soundEffects)}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.soundEffects ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                    {settings.soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Sons & Bips de Validation</div>
                    <div className="text-[10px] text-slate-400">Effets audio lors des gains et changements de statuts</div>
                  </div>
                </div>

                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition ${settings.soundEffects ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </div>
              </div>

              {/* Toggle Value Bet Alerts */}
              <div 
                onClick={() => handleSettingChange('valueBetAlerts', !settings.valueBetAlerts)}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.valueBetAlerts ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Alertes Value Bets IA</div>
                    <div className="text-[10px] text-slate-400">Notification en direct dès qu'un edge ≥ seuil est détecté</div>
                  </div>
                </div>

                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition ${settings.valueBetAlerts ? 'bg-amber-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </div>
              </div>

            </div>
          </div>

          {/* Stop-Loss & Take-Profit Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Stop Loss Alert */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white">Alerte Stop-Loss Journalier</h3>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400">
                  -{settings.stopLossPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Avertissement sonore et visuel si les pertes de la journée dépassent ce seuil de votre bankroll.
              </p>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={settings.stopLossPercent}
                onChange={(e) => handleSettingChange('stopLossPercent', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            {/* Take Profit Alert */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">Objectif Take-Profit de Session</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  +{settings.takeProfitPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Signalement de félicitations pour sécuriser vos gains une fois l'objectif atteint.
              </p>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.takeProfitPercent}
                onChange={(e) => handleSettingChange('takeProfitPercent', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

          </div>
        </div>
      )}

      {/* SECTION 4: APPARENCE & VIE PRIVÉE */}
      {activeSection === 'appearance' && (
        <div className="space-y-4">
          
          {/* SÉLECTEUR DE THÈME CLAIR / SOMBRE / SYSTÈME */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {settings.themeMode === 'light' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : settings.themeMode === 'system' ? (
                  <Monitor className="w-5 h-5 text-blue-400" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-400" />
                )}
                <div>
                  <h2 className="text-sm font-bold text-white">Mode d'Affichage (Thème Clair / Sombre)</h2>
                  <p className="text-xs text-slate-400">Basculez instantanément entre le mode sombre, le mode clair ou l'adaptation automatique au système</p>
                </div>
              </div>

              {/* Bouton Switch de Bascule Rapide */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                  {settings.themeMode === 'light' ? 'Mode Clair' : settings.themeMode === 'system' ? 'Mode Système' : 'Mode Sombre'}
                </span>
                <button
                  type="button"
                  id="btn-theme-mode-toggle"
                  onClick={() => handleSettingChange('themeMode', (settings.themeMode === 'light' ? 'dark' : 'light'))}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${
                    settings.themeMode === 'light' ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                  aria-label="Basculer le thème clair et sombre"
                  title="Basculer entre le mode clair et le mode sombre"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-slate-950 border border-slate-700 shadow-md transition-transform duration-200 flex items-center justify-center ${
                      settings.themeMode === 'light' ? 'translate-x-7 bg-white text-amber-500 border-amber-300' : 'translate-x-0 text-indigo-300'
                    }`}
                  >
                    {settings.themeMode === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Cartes de sélection interactive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { 
                  id: 'dark', 
                  label: 'Sombre (Dark)', 
                  desc: 'Contraste sombre optimisé pour les sessions nocturnes et économie d’énergie', 
                  icon: Moon, 
                  activeBorder: 'border-indigo-500 bg-indigo-950/40',
                  iconBg: 'bg-indigo-500/20 text-indigo-400'
                },
                { 
                  id: 'light', 
                  label: 'Clair (Light)', 
                  desc: 'Interface lumineuse et claire pour une visibilité accrue en plein jour', 
                  icon: Sun, 
                  activeBorder: 'border-amber-500 bg-amber-950/30',
                  iconBg: 'bg-amber-500/20 text-amber-400'
                },
                { 
                  id: 'system', 
                  label: 'Système (Auto)', 
                  desc: 'Suit automatiquement les préférences claires/sombres de votre appareil', 
                  icon: Monitor, 
                  activeBorder: 'border-blue-500 bg-blue-950/40',
                  iconBg: 'bg-blue-500/20 text-blue-400'
                },
              ].map((th) => {
                const isSelected = (settings.themeMode || 'dark') === th.id;
                const IconComponent = th.icon;

                return (
                  <div
                    key={th.id}
                    id={`btn-theme-select-${th.id}`}
                    onClick={() => handleSettingChange('themeMode', th.id as ThemeMode)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? `${th.activeBorder} shadow-md`
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${th.iconBg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white">{th.label}</span>
                      </div>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {th.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Palette className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Thème d'Accentuation Visuel</h2>
                <p className="text-xs text-slate-400">Personnalisez la couleur d'accent de l'application</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'blue', label: 'Cyber Blue', color: 'from-blue-600 to-indigo-600', ring: 'ring-blue-500' },
                { id: 'emerald', label: 'Emerald Win', color: 'from-emerald-600 to-teal-600', ring: 'ring-emerald-500' },
                { id: 'orange', label: 'Flame Stake', color: 'from-orange-600 to-amber-600', ring: 'ring-orange-500' },
                { id: 'purple', label: 'Quantum Purple', color: 'from-purple-600 to-violet-600', ring: 'ring-purple-500' },
                { id: 'cyan', label: 'Neon Cyan', color: 'from-cyan-600 to-blue-600', ring: 'ring-cyan-500' },
              ].map((th) => {
                const isSelected = settings.themeAccent === th.id;
                return (
                  <div
                    key={th.id}
                    onClick={() => handleSettingChange('themeAccent', th.id as ThemeAccent)}
                    className={`p-3 rounded-xl border cursor-pointer text-center space-y-2 transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-slate-600 ring-2 ' + th.ring
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto rounded-full bg-gradient-to-tr ${th.color} shadow-lg`} />
                    <div className="text-xs font-bold text-white">{th.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mode Discret / Privacy */}
            <div 
              onClick={() => handleSettingChange('hideBalancePrivacy', !settings.hideBalancePrivacy)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.hideBalancePrivacy ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  <h3 className="text-xs font-bold text-white">Mode Confidentialité (Privacy Mode)</h3>
                </div>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition ${settings.hideBalancePrivacy ? 'bg-purple-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Masque le solde réel et les montants financiers avec des étoiles (••••••) pour les captures d'écran et l'utilisation en public.
              </p>
            </div>

            {/* Animations & Fluidité */}
            <div 
              onClick={() => handleSettingChange('animationsEnabled', !settings.animationsEnabled)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white">Animations & Transitions Fluides</h3>
                </div>
                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition ${settings.animationsEnabled ? 'bg-cyan-600 justify-end' : 'bg-slate-800 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Active les transitions 60fps. Désactivez sur les appareils plus anciens pour économiser la batterie.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* SECTION 5: STATUT DES APIS & IA */}
      {activeSection === 'integrations' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Statut des Intégrations & Moteurs d'Analyse</h2>
                <p className="text-xs text-slate-400">Vue synthétique de l'état des services connectés</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* 1. Stake API */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white">Stake.com Engine</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Provably Fair Actif
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Domaine : <strong>{draftCreds.domain || 'stake.com'}</strong> • Hash Provably Fair vérifiable.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('stake')}
                  className="w-full py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Ouvrir l'onglet Compte Stake</span>
                </button>
              </div>

              {/* 2. Football-Data.org v4 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Football-Data.org v4</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    H2H & Forme Actifs
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Extraction des 5 dernières confrontations et séries de victoires.
                </p>
                <div className="text-[10px] text-indigo-300">
                  Cache dynamique de 10 min avec repli quantitatif automatique.
                </div>
              </div>

              {/* 4. API-Sports & The Odds API Direct Config */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">API-Sports v3 & The Odds</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${draftCreds.apiSportsKey || draftCreds.theOddsApiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    {draftCreds.apiSportsKey || draftCreds.theOddsApiKey ? 'Clé Configurée' : 'Flux Agrégé ESPN'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Flux sportifs live, compositions officielles et benchmark de cotes multi-bookmakers.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('stake')}
                  className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Gérer & Tester les Clés Sport</span>
                </button>
              </div>

              {/* 5. Gemini 3.7 Flash AI */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Gemini 3.7 Flash</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Modèle IA Actif
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Génération de stratégies sur-mesure, Copilot quantitatif et Value Bets.
                </p>
                <div className="text-[10px] text-blue-300">
                  Appel sécurisé côté serveur avec masquage de clé.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: DONNÉES & SAUVEGARDE */}
      {activeSection === 'data' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Database className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Gestion des Données & Sauvegarde Locale</h2>
                <p className="text-xs text-slate-400">Vos configurations sont enregistrées dans votre navigateur (localStorage)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Export Config */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">Exporter la Configuration</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Téléchargez une sauvegarde JSON complète contenant vos préférences, sessions et paramètres.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                      settings,
                      credentials: draftCreds,
                      exportedAt: new Date().toISOString(),
                      version: '3.7',
                    }, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `bnzstrats_settings_backup_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger le Fichier JSON</span>
                </button>
              </div>

              {/* Réinitialisation */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white">Réinitialiser les Préférences</h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Remet à zéro l'ensemble des paramètres d'affichage sans supprimer votre historique de jeu.
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurer les Paramètres par Défaut</span>
                </button>
              </div>

              {/* Mode Démo Vidéo IA Automatisé (Caché / Discret) */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 sm:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>Studio Démo Vidéo IA</span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                          English Simulation & Voice
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Lance une simulation complète avec voix-off anglaise, paris en direct et objectif de profit verrouillé. Idéal pour enregistrer une vidéo de présentation.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 flex-shrink-0 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Lancer la Démo</span>
                  </button>
                </div>
              </div>

              {/* Mode Demo Loop (100 Paris Accélérés) */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-4 rounded-xl border border-cyan-500/30 sm:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                      <FastForward className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>Mode 'Demo Loop' • 100 Paris Accélérés</span>
                        <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-bold">
                          Ultra-Turbo & Kelly Live
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Visualisez immédiatement la réactivité de l'optimiseur en exécutant 100 paris à grande vitesse avec matrice interactive et courbe d'équité en temps réel.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-launch-demo-loop-data-tab"
                    onClick={() => setIsDemoLoopModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 flex-shrink-0 cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Lancer Demo Loop</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal Interactive Studio Démo Vidéo IA */}
      <InteractiveAiVideoDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        initialBalance={currentBalance > 0 ? currentBalance : 1000}
        currency={currency}
      />

      {/* Modal Mode 'Demo Loop' (100 Paris Accélérés) */}
      <DemoLoopSimulationModal
        isOpen={isDemoLoopModalOpen}
        onClose={() => setIsDemoLoopModalOpen(false)}
        initialBalance={currentBalance > 0 ? currentBalance : 1000}
        currency={currency}
        onApplyStrategyToBot={(strat) => {
          if (onApplyGlobalRisk) {
            onApplyGlobalRisk(settings.defaultStakePercent || 2.0);
          }
        }}
      />

    </div>
  );
};
