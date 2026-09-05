import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Flame, 
  Settings, 
  Send, 
  RotateCcw, 
  Wallet, 
  TrendingUp, 
  Cpu, 
  BookOpen,
  Sparkles,
  Coins,
  Cloud,
  Check,
  X,
  Search,
  Trophy,
  Zap,
  ShieldCheck,
  Activity,
  Wifi,
  Menu,
  ChevronRight,
  ChevronDown,
  Globe,
  Sliders,
  History,
  FileSpreadsheet,
  Crown
} from 'lucide-react';
import { StakeApiCredentials, UserLicenseState } from '../types';
import { useTranslation } from '../i18n/LanguageContext';
import { SUPPORTED_CURRENCIES } from '../utils/stakeCurrencies';
import bnzFireLogo from '../assets/images/bnz_fiery_b_logo_1788108767066.jpg';

export type AppTab = 
  | 'ai-bot'
  | 'manual-sessions' 
  | 'sports'
  | 'advanced-games' 
  | 'engine' 
  | 'backtesting'
  | 'analytics' 
  | 'cloud-sync' 
  | 'scripts'
  | 'seed-analysis'
  | 'settings';

interface HeaderProps {
  balance: number;
  currency: string;
  onCurrencyChange: (curr: string) => void;
  onUpdateBalance: (newBal: number) => void;
  onResetBalance: () => void;
  credentials: StakeApiCredentials;
  onOpenSettings: () => void;
  onOpenAssistant?: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isAutobetting: boolean;
  manualSessionsCount?: number;
  hideBalancePrivacy?: boolean;
  licenseState?: UserLicenseState;
  onOpenLicenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  currency,
  onCurrencyChange,
  onUpdateBalance,
  onResetBalance,
  credentials,
  onOpenSettings,
  onOpenAssistant,
  activeTab,
  setActiveTab,
  isAutobetting,
  manualSessionsCount = 0,
  hideBalancePrivacy = false,
  licenseState,
  onOpenLicenseModal,
}) => {
  const { t, language, setLanguage, languages, currentLanguageMeta } = useTranslation();
  const currencies = SUPPORTED_CURRENCIES;

  // Inline Balance Editor State
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceValue, setEditBalanceValue] = useState<string>(balance.toString());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isEditingBalance) {
      setEditBalanceValue(balance.toString());
    }
  }, [balance, isEditingBalance]);

  const handleSaveBalance = () => {
    const parsed = parseFloat(editBalanceValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateBalance(parsed);
    }
    setIsEditingBalance(false);
  };

  const handleCancelBalance = () => {
    setEditBalanceValue(balance.toString());
    setIsEditingBalance(false);
  };

  const navItems: Array<{ id: AppTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: string | number; color?: string; description?: string }> = [
    { id: 'ai-bot', label: t('nav.aiBot', '🤖 Bot IA Stake'), shortLabel: 'Bot IA', icon: <Bot className="w-4 h-4" />, badge: isAutobetting ? 'LIVE' : 'AUTO', color: 'text-amber-400', description: t('nav.aiBotDesc', 'Pilote automatique IA intelligent qui joue pour vous sur Stake') },
    { id: 'manual-sessions', label: t('nav.journal', 'Journal (+/-)'), shortLabel: 'Journal', icon: <BookOpen className="w-4 h-4" />, badge: manualSessionsCount > 0 ? manualSessionsCount : undefined, color: 'text-emerald-400', description: t('nav.journalDesc', 'Suivi des sessions gains/pertes & analyse de discipline') },
    { id: 'sports', label: t('nav.sports', 'Paris Sportifs IA'), shortLabel: 'Sport IA', icon: <Trophy className="w-4 h-4" />, color: 'text-blue-400', description: t('nav.sportsDesc', 'Pronostics cotes de valeur, probabilités & value bets') },
    { id: 'advanced-games', label: t('nav.games', 'Blackjack & Cotes'), shortLabel: 'Jeux', icon: <Sparkles className="w-4 h-4" />, color: 'text-indigo-400', description: t('nav.gamesDesc', 'Tableau stratégie de base Blackjack, Roulette & Crash EV') },
    { id: 'engine', label: t('nav.strategies', 'Stratégies IA'), shortLabel: 'Stratégie', icon: <Flame className="w-4 h-4" />, color: 'text-orange-400', description: t('nav.strategiesDesc', 'Générateur de martingale, Oscar\'s Grind & auto-bet') },
    { id: 'backtesting', label: t('nav.backtesting', 'Backtesting'), shortLabel: 'Backtest', icon: <History className="w-4 h-4" />, color: 'text-emerald-400', description: t('nav.backtestingDesc', 'Simulation CSV & historique Stake sur 10k+ rounds') },
    { id: 'analytics', label: t('nav.analytics', 'Analytics'), shortLabel: 'Analytics', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-400', description: t('nav.analyticsDesc', 'Graphiques de progression, ROI et drawdown') },
    { id: 'cloud-sync', label: t('nav.cloud', 'Cloud & Profils'), shortLabel: 'Cloud', icon: <Cloud className="w-4 h-4" />, color: 'text-cyan-400', description: t('nav.cloudDesc', 'Sauvegarde multi-appareils & profils de jeu') },
    { id: 'scripts', label: t('nav.scripts', 'Scripts'), shortLabel: 'Scripts', icon: <Cpu className="w-4 h-4" />, color: 'text-violet-400', description: t('nav.scriptsDesc', 'Éditeur & modèles de scripts JS Stake') },
    { id: 'seed-analysis', label: t('nav.seed', 'Analyse Seed & Cibles'), shortLabel: 'Seed IA', icon: <Search className="w-4 h-4" />, color: 'text-teal-400', description: t('nav.seedDesc', 'Fréquences de tirage, seeds & multiplicateurs cibles') },
    { id: 'settings', label: t('nav.settings', 'Paramètres'), shortLabel: 'Réglages', icon: <Settings className="w-4 h-4" />, color: 'text-blue-300', description: t('nav.settingsDesc', 'Clés API Stake, devises, alertes & préférences') },
  ];

  return (
    <>
      <header id="app-header" className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg shadow-black/25">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Main Top Bar */}
          <div className="flex items-center justify-between h-11 sm:h-16 gap-1.5 sm:gap-2">
            
            {/* Left Section: Logo & Title + Top-Left Synchronized Balance */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div 
                onClick={() => setActiveTab('manual-sessions')}
                className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group"
              >
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 via-rose-600 to-orange-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/50 group-hover:scale-105 transition-all overflow-hidden flex-shrink-0">
                  <div className="w-full h-full rounded-[6px] sm:rounded-[9px] overflow-hidden flex items-center justify-center bg-slate-950 relative">
                    <img 
                      src={bnzFireLogo} 
                      alt="BNZ Logo" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover scale-[1.08] transform transition-transform duration-300 group-hover:scale-[1.18]" 
                    />
                  </div>
                </div>
                <div className="min-w-0 hidden xl:block">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span translate="no" className="notranslate font-black text-xs sm:text-base tracking-tight bg-gradient-to-r from-white via-orange-100 to-amber-300 bg-clip-text text-transparent truncate">
                      BNZSTRATS IA
                    </span>
                    <span translate="no" className="notranslate text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 uppercase tracking-wider flex-shrink-0">
                      v3.7
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {t('header.subtitle', 'Stratégies Constructives & Journal Quantitatif')}
                  </p>
                </div>
                <div className="min-w-0 block xl:hidden">
                  <span translate="no" className="notranslate font-black text-xs sm:text-sm tracking-tight bg-gradient-to-r from-white to-amber-300 bg-clip-text text-transparent">
                    BNZSTRATS
                  </span>
                </div>
              </div>

              {/* Top-Left Synchronized Balance Badge (Desktop & Tablet) */}
              <div 
                id="header-top-left-balance"
                className="hidden sm:flex items-center bg-slate-950/85 hover:bg-slate-900 border border-orange-500/40 hover:border-orange-500/70 rounded-xl px-2.5 py-1.5 gap-2 shadow-inner transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                
                {isEditingBalance ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editBalanceValue}
                      onChange={(e) => setEditBalanceValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveBalance();
                        if (e.key === 'Escape') handleCancelBalance();
                      }}
                      autoFocus
                      className="w-20 sm:w-24 bg-slate-950 border border-orange-500 text-slate-100 text-xs font-mono font-bold rounded px-1.5 py-0.5 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveBalance}
                      className="p-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs cursor-pointer"
                      title={t('header.saveBalance', 'Enregistrer')}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelBalance}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs cursor-pointer"
                      title={t('common.cancel', 'Annuler')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingBalance(true)}
                    className="text-left cursor-pointer group flex items-center gap-2"
                    title={t('header.editBalance', 'Cliquez pour modifier votre solde (synchronisé automatiquement avec Analytics)')}
                  >
                    <div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-[8px]">Sync</span>
                        <span>{credentials.apiKey && credentials.isLiveMode ? t('header.realBalance', 'Solde Réel') : t('header.balance', 'Solde')}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-100 font-mono tracking-tight leading-tight group-hover:text-orange-300 transition">
                        {hideBalancePrivacy ? (
                          <span className="text-slate-400 tracking-widest font-mono">••••••</span>
                        ) : (
                          balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        )}{' '}
                        <span className="text-orange-400 text-[10px] font-semibold">{currency}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  id="btn-reset-balance"
                  onClick={onResetBalance}
                  title={t('header.resetBalance', 'Réinitialiser le solde à 100.00')}
                  className="p-1 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800/80 transition flex-shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Desktop Navigation Tabs (>= lg) */}
            <nav className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 gap-0.5 overflow-x-auto max-w-2xl">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors z-10 cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDesktopHeaderTab"
                        className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-850 border border-blue-500/40 rounded-lg shadow-sm -z-10"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className={isActive ? 'text-white' : item.color}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-transform ${
                          isActive
                            ? 'bg-orange-500 text-slate-950 font-black scale-105'
                            : 'bg-slate-800 text-orange-300 border border-orange-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Right Controls: Stake Status, Language, Currency, Assistant, Settings */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              
              {/* Stake Live Sync Indicator (Desktop) */}
              <div className="hidden sm:block">
                {credentials.apiKey ? (
                  credentials.isLiveMode ? (
                    <button
                      id="stake-live-sync-indicator"
                      onClick={() => setActiveTab('settings')}
                      title={`Compte Stake connecté (${credentials.domain || 'stake.com'}) • Synchronisation du solde réel active en direct`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-md shadow-emerald-950/40 transition group cursor-pointer"
                    >
                      <span className="text-xs">🟢</span>
                      <span className="font-mono tracking-tight">Live Sync</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 uppercase">
                        {credentials.domain?.replace('.com', '') || 'Live'}
                      </span>
                    </button>
                  ) : (
                    <button
                      id="stake-live-sync-indicator"
                      onClick={() => setActiveTab('settings')}
                      title="Clé API Stake enregistrée • Mode Simulation Provably Fair actif"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/60 border border-blue-500/40 text-blue-300 text-xs font-bold transition group cursor-pointer"
                    >
                      <span className="text-xs">🟠</span>
                      <span className="font-mono">API Stake</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
                        SIMU
                      </span>
                    </button>
                  )
                ) : (
                  <button
                    id="stake-live-sync-indicator"
                    onClick={() => setActiveTab('settings')}
                    title={t('header.demoMode', 'Mode Démo & Simulation locale')}
                    className="hidden md:flex items-center justify-center p-1.5 px-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-medium transition cursor-pointer shadow-sm"
                  >
                    <span className="text-xs">🟠</span>
                  </button>
                )}
              </div>

              {/* Language Switcher Dropdown (Desktop & Mobile) */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  id="btn-language-dropdown"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-[11px] sm:text-xs font-semibold transition cursor-pointer shadow-sm"
                  title={t('header.quickSelectLang', 'Changer de langue')}
                >
                  <span className="text-xs sm:text-base leading-none">{currentLanguageMeta.flag}</span>
                  <span className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-300">{language}</span>
                  <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 backdrop-blur-md">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      {t('header.language', 'Langue')}
                    </div>
                    <div className="space-y-0.5 mt-1 max-h-60 overflow-y-auto">
                      {languages.map((langItem) => {
                        const isSelected = langItem.code === language;
                        return (
                          <button
                            key={langItem.code}
                            onClick={() => {
                              setLanguage(langItem.code);
                              setIsLangDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition text-left ${
                              isSelected
                                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base">{langItem.flag}</span>
                              <div>
                                <div className="text-xs">{langItem.nativeName}</div>
                                <div className="text-[10px] text-slate-400">{langItem.label}</div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Currency Selector */}
              <select
                id="currency-selector"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 hover:border-blue-500 text-slate-200 text-[11px] sm:text-xs font-bold rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* VIP License & Pro Status Trigger */}
              {onOpenLicenseModal && (
                <button
                  id="btn-header-vip-license"
                  type="button"
                  onClick={onOpenLicenseModal}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm cursor-pointer border flex-shrink-0 ${
                    licenseState?.isPro
                      ? 'bg-gradient-to-r from-amber-500/25 via-amber-600/20 to-amber-500/25 text-amber-300 border-amber-500/50 hover:bg-amber-500/35 shadow-amber-500/10'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:border-amber-500/40'
                  }`}
                  title={
                    licenseState?.isPro
                      ? `Licence Active : ${licenseState.planName} (Cliquez pour gérer)`
                      : `Mode Gratuit : ${licenseState?.freeDailyBetsRemaining ?? 50}/50 paris restants (Cliquez pour activer VIP)`
                  }
                >
                  <Crown className={`w-3.5 h-3.5 ${licenseState?.isPro ? 'text-amber-400 animate-pulse' : 'text-amber-500/70'}`} />
                  <span className="hidden sm:inline">
                    {licenseState?.isPro ? (
                      licenseState.isAdmin ? 'Admin VIP' : 'VIP Pro'
                    ) : (
                      `Essai (${licenseState?.freeDailyBetsRemaining ?? 50})`
                    )}
                  </span>
                  {!licenseState?.isPro && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black tracking-tight">
                      VIP
                    </span>
                  )}
                </button>
              )}

              {/* AI Assistant Copilot Trigger */}
              {onOpenAssistant && (
                <button
                  id="btn-header-open-assistant"
                  onClick={onOpenAssistant}
                  className="group relative p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 flex-shrink-0"
                  title={t('header.assistantAi', 'Ouvrir l\'Assistant IA & Stratégie')}
                >
                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:scale-110 transition-transform" />
                  <span className="hidden md:inline text-xs font-bold text-white">
                    {t('header.assistantAi', 'Assistant IA')}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping absolute -top-0.5 -right-0.5" />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 absolute -top-0.5 -right-0.5 border border-slate-900" />
                </button>
              )}

              {/* Mobile Full Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition active:scale-95 flex-shrink-0"
                title={t('header.allModules', 'Tous les modules')}
              >
                {isMobileMenuOpen ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Settings Trigger (Desktop) */}
              <button
                id="btn-open-settings"
                onClick={() => setActiveTab('settings')}
                className={`hidden sm:flex p-2 rounded-xl border transition shadow-sm ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 hover:text-orange-300 text-slate-300 border-slate-700 hover:border-orange-500/40'
                }`}
                title={t('header.settings', 'Paramètres & Préférences Générales')}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Smartphone Wallet Bar (Mobile Only: < sm) */}
          <div className="flex sm:hidden items-center justify-between py-1.5 px-2 bg-slate-950/70 border-t border-slate-800/80 rounded-xl mb-1.5 gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Wallet className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              {isEditingBalance ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editBalanceValue}
                    onChange={(e) => setEditBalanceValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBalance();
                      if (e.key === 'Escape') handleCancelBalance();
                    }}
                    autoFocus
                    className="w-20 bg-slate-900 border border-orange-500 text-slate-100 text-xs font-mono font-bold rounded px-1 py-0.5"
                  />
                  <button onClick={handleSaveBalance} className="p-1 rounded bg-orange-600 text-white text-[10px]">
                    <Check className="w-3 h-3" />
                  </button>
                  <button onClick={handleCancelBalance} className="p-1 rounded bg-slate-800 text-slate-400 text-[10px]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingBalance(true)}
                  className="flex items-center gap-1.5 cursor-pointer truncate"
                >
                  {credentials.apiKey && credentials.isLiveMode && <span className="text-xs">🟢</span>}
                  <span className="text-[11px] text-slate-400 font-medium">
                    {credentials.apiKey && credentials.isLiveMode ? t('header.realBalance', 'Solde Réel') : t('header.balance', 'Balance')} :
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-100">
                    {hideBalancePrivacy ? '••••••' : balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-400">{currency}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {credentials.apiKey ? (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  credentials.isLiveMode 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  <span>{credentials.isLiveMode ? '🟢' : '🟠'}</span>
                  <span>{credentials.isLiveMode ? 'LIVE' : 'SIMU'}</span>
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shadow-sm text-amber-300">
                  <span>🟠</span>
                </span>
              )}

              <button
                onClick={onResetBalance}
                title={t('header.resetBalance', 'Reset solde')}
                className="p-1 text-slate-400 hover:text-orange-400"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Smartphone & Tablet Horizontal Scroll Navigation */}
          <div className="flex lg:hidden overflow-x-auto py-1.5 border-t border-slate-800/60 gap-1.5 no-scrollbar -mx-3 px-3">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 bg-slate-950/70 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span className={isActive ? 'text-white' : item.color}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-orange-400 text-slate-950'
                          : 'bg-slate-800 text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* Mobile Drawer Overlay / Full App Navigation Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 max-h-[85dvh] overflow-y-auto space-y-4 shadow-2xl"
          >
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-orange-500/30 flex items-center justify-center shadow-md bg-slate-950">
                  <img 
                    src={bnzFireLogo} 
                    alt="BNZ Logo" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-[1.08]" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white"><span translate="no" className="notranslate">BNZSTRATS IA</span> &bull; {t('header.mobileNav', 'Navigation')}</h3>
                  <p className="text-[11px] text-slate-400">{t('header.directMobileAccess', 'Accès direct optimisé smartphone')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Navigation Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-850 border-blue-500 text-white shadow-lg shadow-blue-950/50'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-500 text-slate-950">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Footer inside Mobile Drawer */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              {onOpenAssistant && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAssistant();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <Bot className="w-4 h-4" />
                  <span>{t('header.assistantAi', 'Assistant IA')}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span>{t('nav.settings', 'Paramètres')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

