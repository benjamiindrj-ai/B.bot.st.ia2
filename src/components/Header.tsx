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
  Crown,
  ChevronsUpDown
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
  const [isBalanceToggleActive, setIsBalanceToggleActive] = useState(true);
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
    { id: 'seed-analysis', label: t('nav.seed', 'Analyse Seed & Cibles'), shortLabel: 'Seed IA', icon: <Search className="w-4 h-4" />, color: 'text-teal-400', description: t('nav.seedDesc', 'Fréquences de tirage, seeds & multiplicateurs cibles') },
    { id: 'settings', label: t('nav.settings', 'Paramètres'), shortLabel: 'Réglages', icon: <Settings className="w-4 h-4" />, color: 'text-blue-300', description: t('nav.settingsDesc', 'Clés API Stake, devises, alertes & préférences') },
  ];

  return (
    <>
      <header id="app-header" className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg shadow-black/25">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          
          {/* Row 1: Top Bar (Identical to Screenshot: Logo + BNZSTRATS IA + V3.7 + VIP | Lang + Currency + Bot + Menu) */}
          <div className="flex items-center justify-between h-11 sm:h-14 gap-1 sm:gap-2 flex-nowrap">
            
            {/* Left Section: Fiery Logo + BNZSTRATS IA + V3.7 + VIP */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div 
                onClick={() => setActiveTab('ai-bot')}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-600 to-orange-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20 hover:scale-105 transition-all overflow-hidden flex-shrink-0 cursor-pointer"
                title="BNZSTRATS IA"
              >
                <div className="w-full h-full rounded-[5px] sm:rounded-[6px] overflow-hidden flex items-center justify-center bg-slate-950">
                  <img 
                    src={bnzFireLogo} 
                    alt="BNZ Logo" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-[1.08]" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
                <span translate="no" className="notranslate font-black text-[11px] sm:text-base tracking-tight text-white shrink-0 whitespace-nowrap">
                  BNZSTRATS IA
                </span>
                <span translate="no" className="notranslate text-[7.5px] sm:text-[9px] font-extrabold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/40 uppercase tracking-wider shrink-0 whitespace-nowrap">
                  V3.7
                </span>
                {/* VIP Badge requested by user */}
                <button
                  type="button"
                  onClick={onOpenLicenseModal}
                  className="inline-flex items-center gap-0.5 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black text-[7.5px] sm:text-[9px] uppercase tracking-wider shadow-xs hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0 whitespace-nowrap"
                  title={licenseState?.isPro ? 'Statut VIP Actif' : 'Activer le statut VIP'}
                >
                  <Crown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-950 fill-current" />
                  <span>VIP</span>
                </button>
              </div>
            </div>

            {/* Desktop Navigation Tabs (>= xl screens only) */}
            <nav className="hidden xl:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 gap-0.5 overflow-x-auto max-w-xl">
              {navItems.slice(0, 5).map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : item.color}>{item.icon}</span>
                    <span>{item.shortLabel || item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Controls: Language + Currency + Bot Icon Button + Menu */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 flex-nowrap">
              {/* Language Switcher Dropdown (🇬🇧 EN ⌵) */}
              <div className="relative" ref={langDropdownRef}>
                <button
                  id="btn-language-dropdown"
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-0.5 px-1 sm:px-2 py-0.5 sm:py-1.2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[9.5px] sm:text-xs font-bold transition cursor-pointer shrink-0"
                  title={t('header.quickSelectLang', 'Changer de langue')}
                >
                  <span className="text-[11px] sm:text-sm leading-none">{currentLanguageMeta.flag}</span>
                  <span className="text-[9px] sm:text-xs uppercase font-extrabold text-slate-300">{language}</span>
                  <ChevronDown className={`w-2 h-2 sm:w-3 sm:h-3 text-slate-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
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

              {/* Currency Selector (Identical to screenshot: USDT ⇅) */}
              <div className="relative inline-flex items-center shrink-0">
                <select
                  id="currency-selector"
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="appearance-none bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-white text-[9.5px] sm:text-xs font-bold rounded-lg pl-1.5 pr-4 py-0.5 sm:py-1.2 focus:ring-1 focus:ring-amber-500 focus:outline-none transition cursor-pointer"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-400 absolute right-1 pointer-events-none" />
              </div>

              {/* AI Bot Button (Identical to screenshot: blue/indigo gradient square with Bot icon and orange notification dot) */}
              <button
                id="btn-header-open-assistant"
                type="button"
                onClick={() => {
                  if (onOpenAssistant) onOpenAssistant();
                  else setActiveTab('ai-bot');
                }}
                className="relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white border border-white/20 transition shadow-md shadow-blue-500/25 flex items-center justify-center shrink-0 cursor-pointer"
                title={t('header.assistantAi', 'Assistant IA & Copilote')}
              >
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400 absolute -top-0.5 -right-0.5 border border-slate-900 animate-pulse" />
              </button>

              {/* Mobile Full Menu Toggle Button (Identical to screenshot: ☰) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
                title={t('header.allModules', 'Tous les modules')}
              >
                {isMobileMenuOpen ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>

          </div>

          {/* Row 2: Synchronized Dedicated Balance Bar (Identical to Screenshot) */}
          <div className="flex items-center justify-between py-1.5 px-0.5 border-t border-slate-800/80 text-xs">
            {/* Left: Wallet Icon + "Balance : " + formatted number + Currency */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-400 font-medium text-xs sm:text-sm">Balance :</span>

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
                    className="w-24 sm:w-28 bg-slate-950 border border-orange-500 text-white text-xs font-mono font-bold rounded px-1.5 py-0.5 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveBalance}
                    className="p-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs cursor-pointer"
                    title="Enregistrer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBalance}
                    className="p-1 rounded bg-slate-800 text-slate-400 text-xs cursor-pointer"
                    title="Annuler"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingBalance(true)}
                  className="flex items-center gap-1.5 cursor-pointer group"
                  title={t('header.editBalance', 'Cliquez pour modifier le solde')}
                >
                  <span className="font-mono font-bold text-white text-xs sm:text-sm tracking-tight group-hover:text-amber-300 transition">
                    {hideBalancePrivacy || !isBalanceToggleActive
                      ? '••••'
                      : balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                    }
                  </span>
                  <span className="font-bold text-sky-400 text-xs sm:text-sm">
                    {currency}
                  </span>
                  {credentials.apiKey && credentials.isLiveMode && (
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      LIVE
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Orange Toggle Switch + Refresh Button */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Orange Toggle Switch (Identical to screenshot) */}
              <button
                type="button"
                onClick={() => setIsBalanceToggleActive(!isBalanceToggleActive)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer border ${
                  isBalanceToggleActive
                    ? 'bg-slate-950 border-amber-500/40'
                    : 'bg-slate-800 border-slate-700'
                }`}
                title={isBalanceToggleActive ? 'Masquer le solde' : 'Afficher le solde'}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform duration-200 ${
                    isBalanceToggleActive
                      ? 'translate-x-4 bg-amber-500 shadow-sm shadow-amber-500/50'
                      : 'translate-x-0.5 bg-slate-500'
                  }`}
                />
              </button>

              {/* Circular Refresh Icon (Identical to screenshot) */}
              <button
                type="button"
                onClick={onResetBalance}
                title={t('header.resetBalance', 'Actualiser / Réinitialiser le solde')}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Smartphone & Tablet Horizontal Scroll Navigation */}
          <div className="flex lg:hidden overflow-x-auto py-1 border-t border-slate-800/60 gap-1 no-scrollbar -mx-2 px-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 bg-slate-950/70 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span className={isActive ? 'text-white' : item.color}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[8px] font-extrabold px-1 py-0.2 rounded-full ${
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

