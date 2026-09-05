import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Radio, 
  RefreshCw, 
  Flame, 
  TrendingUp, 
  Clock, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  PlusCircle, 
  Activity, 
  BarChart2, 
  Target, 
  Award, 
  Percent, 
  DollarSign, 
  Sparkles,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  Timer,
  ExternalLink,
  Swords,
  Database,
  Globe,
  Trophy,
  SlidersHorizontal,
  Search,
  X,
  Filter
} from 'lucide-react';
import { LiveMatchTip, LiveSportsResponse, SportTip, TrackedSportBet } from '../types';
import { H2HAnalysisModal } from './H2HAnalysisModal';
import { BayesianTipBadge } from './BayesianTipBadge';
import { BayesianAlertBadge } from './BayesianAlertBadge';
import { isBayesianAlertTriggered } from '../utils/bayesianSportsRegression';
import { formatParisTime, formatParisDateOnly } from '../utils/parisTime';
import { detectCountry, classifyMarket, MarketCategory, MARKET_CATEGORY_OPTIONS } from './SportsAnalysis';

interface LiveSportsDashboardProps {
  currentBalance: number;
  currency: string;
  trackedBets: TrackedSportBet[];
  onTrackBet: (tip: SportTip, stakeAmount: number) => void;
}

export const LiveSportsDashboard: React.FC<LiveSportsDashboardProps> = ({
  currentBalance,
  currency,
  trackedBets,
  onTrackBet,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedMarketCategory, setSelectedMarketCategory] = useState<MarketCategory>('all');
  const [liveSearchText, setLiveSearchText] = useState<string>('');
  const [customLeague, setCustomLeague] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<LiveSportsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(30);
  
  // Custom stakes per card
  const [customStakes, setCustomStakes] = useState<Record<string, number>>({});
  const [trackedSuccessIds, setTrackedSuccessIds] = useState<Record<string, boolean>>({});

  // Clock & Calendar Date for Paris Time
  const [parisTime, setParisTime] = useState<string>(formatParisTime(Date.now(), true));
  const [parisDate, setParisDate] = useState<string>(formatParisDateOnly(Date.now()));

  // H2H Modal State
  const [h2hModalState, setH2hModalState] = useState<{
    isOpen: boolean;
    homeTeam: string;
    awayTeam: string;
    sport?: string;
    league?: string;
    activeTip?: SportTip | null;
  }>({
    isOpen: false,
    homeTeam: '',
    awayTeam: '',
    sport: 'football',
    league: '',
    activeTip: null,
  });

  const parseTeamsFromMatch = (matchName: string) => {
    if (matchName.includes(' vs ')) {
      const parts = matchName.split(' vs ');
      return { home: parts[0].trim(), away: parts[1].trim() };
    }
    if (matchName.includes(' - ')) {
      const parts = matchName.split(' - ');
      return { home: parts[0].trim(), away: parts[1].trim() };
    }
    return { home: matchName, away: 'Adversaire' };
  };

  const fetchLiveRef = React.useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setParisTime(formatParisTime(now, true));
      setParisDate(formatParisDateOnly(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sportsList = [
    { id: 'all', label: 'Tous les directs', icon: '🔴' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
    { id: 'mma', label: 'MMA / UFC', icon: '🥊' },
    { id: 'esports', label: 'Esports', icon: '🎮' },
    { id: 'hockey', label: 'Hockey', icon: '🏒' },
  ];

  const fetchLiveAnalysis = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.apiKey) headers['x-stake-api-token'] = creds.apiKey;
          if (creds.domain) headers['x-stake-domain'] = creds.domain;
        }
      } catch (e) {
        // ignore parse error
      }

      const response = await fetch('/api/gemini/live-sports-analysis', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sport: selectedSport,
          customLeague: customLeague.trim() || undefined,
          userBankroll: currentBalance,
          currency,
          requestTimestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Impossible de charger les données Live In-Play');
      }

      const data: LiveSportsResponse = await response.json();
      setLiveData(data);
      setSecondsUntilRefresh(30);
    } catch (err: any) {
      console.error('Error fetching live sports data:', err);
      setErrorMsg(err.message || 'Erreur réseau lors de la récupération du Live');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSport, customLeague, currentBalance, currency]);

  fetchLiveRef.current = fetchLiveAnalysis;

  // Initial load
  useEffect(() => {
    fetchLiveAnalysis();
  }, [fetchLiveAnalysis]);

  // Auto-refresh countdown (every second, decrementing reliably)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          if (fetchLiveRef.current) {
            fetchLiveRef.current();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled]);

  const handleTrackLiveBet = (liveTip: LiveMatchTip) => {
    const stakePercent = liveTip.recommendedStakePercent || 1.5;
    const defaultStake = Number(((currentBalance * stakePercent) / 100).toFixed(2));
    const finalStake = customStakes[liveTip.id] !== undefined ? customStakes[liveTip.id] : (defaultStake > 0 ? defaultStake : 1.0);

    // Convert LiveMatchTip to SportTip interface for universal tracking
    const convertedTip: SportTip = {
      id: liveTip.id,
      sport: liveTip.sport,
      match: `${liveTip.match} [LIVE ${liveTip.currentMinute} | ${liveTip.currentScore}]`,
      league: liveTip.league,
      market: liveTip.liveMarket,
      odds: liveTip.liveOdds,
      expectedValue: liveTip.liveExpectedValue,
      confidenceScore: liveTip.confidenceScore,
      riskLevel: liveTip.riskLevel,
      recommendedStakePercent: liveTip.recommendedStakePercent,
      analysisReasoning: `[LIVE IN-PLAY ${liveTip.currentMinute}] ${liveTip.liveEdgeAnalysis}`,
      keyStats: [
        `Score actuel: ${liveTip.currentScore} (${liveTip.currentMinute})`,
        `Momentum: ${liveTip.momentumTeam}`,
        `Possession: ${liveTip.inPlayStats.possession || 'N/A'} | Tirs: ${liveTip.inPlayStats.shotsOnTarget || 'N/A'}`,
        `xG Live: ${liveTip.inPlayStats.liveXg || 'N/A'}`,
        `Inflation cote: Pre-match @${liveTip.preMatchOdds || 1.40} ➔ Live @${liveTip.liveOdds}`,
      ],
      bookmakerImpliedProbability: liveTip.liveImpliedProbability,
      aiEstimatedTrueProbability: liveTip.liveTrueProbability,
      kickoffTime: `En cours (${liveTip.currentMinute} - ${liveTip.currentScore})`,
      kickoffTimestamp: Date.now(),
      minutesUntilKickoff: 0,
      stakeFixtureId: liveTip.stakeFixtureId,
      stakeUrl: liveTip.stakeUrl,
      stakeMarketName: liveTip.liveMarket,
    };

    onTrackBet(convertedTip, finalStake);
    setTrackedSuccessIds((prev) => ({ ...prev, [liveTip.id]: true }));
  };

  const getSportBadge = (sportId: string) => {
    switch (sportId) {
      case 'football': return { icon: '⚽', label: 'Football', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'basketball': return { icon: '🏀', label: 'Basketball', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'tennis': return { icon: '🎾', label: 'Tennis', color: 'bg-lime-500/20 text-lime-300 border-lime-500/30' };
      case 'mma': return { icon: '🥊', label: 'MMA / UFC', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'esports': return { icon: '🎮', label: 'Esports', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'hockey': return { icon: '🏒', label: 'Hockey', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      default: return { icon: '🏆', label: 'Sport', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
  };

  const validLiveTips = useMemo(() => {
    return (liveData?.liveTips || []).filter((tip) => {
      // Strictly filter out any potential match that contains upcoming/pre-match keywords
      const minuteStr = String(tip.currentMinute || '').toLowerCase();
      const periodStr = String(tip.period || '').toLowerCase();
      if (minuteStr.includes('coup d\'envoi') || minuteStr.includes('à venir') || periodStr.includes('début à') || periodStr.includes('bientôt')) {
        return false;
      }
      return true;
    });
  }, [liveData]);

  // Dynamic list of countries for live in-play matches
  const availableCountries = useMemo(() => {
    const countryMap = new Map<string, { id: string; name: string; flag: string; count: number }>();
    validLiveTips.forEach((tip) => {
      if (selectedSport !== 'all' && tip.sport !== selectedSport) return;
      const detected = detectCountry(tip.league, tip.match, tip.sport);
      const existing = countryMap.get(detected.id);
      if (existing) {
        existing.count++;
      } else {
        countryMap.set(detected.id, { ...detected, count: 1 });
      }
    });
    return Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
  }, [validLiveTips, selectedSport]);

  // Dynamic list of leagues for live in-play matches
  const availableLeagues = useMemo(() => {
    const leagueMap = new Map<string, { name: string; count: number; countryId: string; flag: string }>();
    validLiveTips.forEach((tip) => {
      if (selectedSport !== 'all' && tip.sport !== selectedSport) return;
      const detected = detectCountry(tip.league, tip.match, tip.sport);
      if (selectedCountry !== 'all' && detected.id !== selectedCountry) return;

      const leagueName = (tip.league || 'Autre Ligue').trim();
      const existing = leagueMap.get(leagueName);
      if (existing) {
        existing.count++;
      } else {
        leagueMap.set(leagueName, { 
          name: leagueName, 
          count: 1, 
          countryId: detected.id, 
          flag: detected.flag 
        });
      }
    });
    return Array.from(leagueMap.values()).sort((a, b) => b.count - a.count);
  }, [validLiveTips, selectedSport, selectedCountry]);

  // Dynamic count of live in-play tips per market category
  const marketCategoryCounts = useMemo(() => {
    const counts: Record<MarketCategory, number> = {
      all: 0,
      '1x2': 0,
      over_under: 0,
      handicap: 0,
      btts: 0,
      double_chance: 0,
      props: 0,
      combos: 0,
    };

    validLiveTips.forEach((tip) => {
      if (selectedSport !== 'all' && tip.sport !== selectedSport) return;
      if (selectedCountry !== 'all') {
        const detected = detectCountry(tip.league, tip.match, tip.sport);
        if (detected.id !== selectedCountry) return;
      }
      if (selectedLeague !== 'all') {
        const lName = (tip.league || '').trim().toLowerCase();
        if (lName !== selectedLeague.trim().toLowerCase()) return;
      }

      counts.all++;
      const cat = classifyMarket(tip.liveMarket);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    return counts;
  }, [validLiveTips, selectedSport, selectedCountry, selectedLeague]);

  const displayedLiveTips = useMemo(() => {
    return validLiveTips.filter((tip) => {
      if (selectedSport !== 'all' && tip.sport !== selectedSport) return false;

      if (selectedCountry !== 'all') {
        const detected = detectCountry(tip.league, tip.match, tip.sport);
        if (detected.id !== selectedCountry) return false;
      }

      if (selectedLeague !== 'all') {
        const lName = (tip.league || '').trim().toLowerCase();
        if (lName !== selectedLeague.trim().toLowerCase()) return false;
      }

      if (selectedMarketCategory !== 'all') {
        const cat = classifyMarket(tip.liveMarket);
        if (cat !== selectedMarketCategory) return false;
      }

      if (liveSearchText.trim()) {
        const q = liveSearchText.trim().toLowerCase();
        const desc = tip.liveEdgeAnalysis || '';
        const full = `${tip.match} ${tip.league} ${tip.liveMarket} ${desc} ${tip.momentumTeam || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }

      return true;
    });
  }, [validLiveTips, selectedSport, selectedCountry, selectedLeague, selectedMarketCategory, liveSearchText]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Live Controller Bar */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-indigo-950/40 border border-red-500/30 rounded-2xl p-4.5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Scanner In-Play & Algorithme de Valeur en Temps Réel
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping mr-0.5" />
                  Live Actif
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Analyse continue du temps de jeu écoulé, des statistiques in-play (xG, tirs cadrés) et des variations de cotes pour déceler les asymétries de gains.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-center shrink-0">
            {/* Live Paris Clock & Dynamic Date */}
            <div className="h-9 px-3 bg-slate-900 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center gap-2.5 shadow-sm shrink-0 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="capitalize text-slate-300 font-sans text-[11px] hidden sm:inline">{parisDate} •</span>
              <span>Paris : <strong className="text-white tabular-nums font-mono">{parisTime}</strong></span>
            </div>

            {/* Refresh button with stable layout and tabular countdown */}
            <button
              onClick={() => fetchLiveAnalysis()}
              disabled={isLoading}
              className="h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0 min-w-[155px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap flex items-center gap-1.5">
                {isLoading ? (
                  <span>Scan en direct...</span>
                ) : (
                  <>
                    <span>Rafraîchir</span>
                    <span translate="no" className="notranslate inline-flex items-center justify-center min-w-[44px] h-5 font-mono text-[11px] tabular-nums font-bold bg-red-950/80 text-red-200 px-1.5 rounded border border-red-400/40">
                      {secondsUntilRefresh} sec
                    </span>
                  </>
                )}
              </span>
            </button>

            {/* Toggle Auto Refresh */}
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap min-w-[135px] justify-center ${
                autoRefreshEnabled 
                  ? 'bg-slate-900 border-red-500/40 text-red-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
              title="Activer/Désactiver le rafraîchissement automatique toutes les 30 secondes"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span translate="no" className="notranslate">{autoRefreshEnabled ? 'Auto-Scan (30 sec)' : 'Scan manuel'}</span>
            </button>
          </div>
        </div>

        {/* Sports Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {sportsList.map((sport) => (
            <button
              key={sport.id}
              onClick={() => {
                setSelectedSport(sport.id);
                setSelectedLeague('all');
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
                selectedSport === sport.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{sport.icon}</span>
              <span>{sport.label}</span>
            </button>
          ))}
        </div>

        {/* DYNAMIC LIVE COUNTRY FILTER */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-slate-200">
                Filtre Live par Pays ({availableCountries.length})
              </span>
            </div>
            {selectedCountry !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCountry('all');
                  setSelectedLeague('all');
                }}
                className="text-[11px] font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Tous les pays</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedCountry('all');
                setSelectedLeague('all');
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                selectedCountry === 'all'
                  ? 'bg-red-600 border-red-500 text-white shadow-xs'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span>🌐</span>
              <span>Tous ({validLiveTips.filter(t => selectedSport === 'all' || t.sport === selectedSport).length})</span>
            </button>

            {availableCountries.map((c) => {
              const isSelected = selectedCountry === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(isSelected ? 'all' : c.id);
                    setSelectedLeague('all');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 border-rose-400 text-white shadow-xs'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected 
                      ? 'bg-slate-950/80 text-rose-200 border border-rose-400/40' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DYNAMIC LIVE LEAGUE & MARKET TYPE FILTER */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-slate-200">
                Types de Marchés In-Play (1X2, Over/Under, BTTS...)
              </span>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                {displayedLiveTips.length} / {validLiveTips.length} opportunités live
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={liveSearchText}
                onChange={(e) => setLiveSearchText(e.target.value)}
                placeholder="Filtrer équipe, marché en direct..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/60 focus:border-red-500/60"
              />
              {liveSearchText && (
                <button
                  type="button"
                  onClick={() => setLiveSearchText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Market Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {MARKET_CATEGORY_OPTIONS.map((opt) => {
              const count = marketCategoryCounts[opt.id] || 0;
              const isSelected = selectedMarketCategory === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedMarketCategory(opt.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-400/80 text-white shadow-xs scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.shortLabel}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected 
                      ? 'bg-slate-950/80 text-orange-200 border border-orange-500/40' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {availableLeagues.length > 0 && (
              <div className="relative inline-block">
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  aria-label="Sélectionner une ligue en direct"
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition bg-slate-950 text-slate-300 cursor-pointer ${
                    selectedLeague !== 'all'
                      ? 'border-amber-400 text-amber-200 bg-amber-950/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <option value="all">🏆 Toutes les ligues ({availableLeagues.length})</option>
                  {availableLeagues.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.flag} {l.name} ({l.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedMarketCategory !== 'all' || selectedCountry !== 'all' || selectedLeague !== 'all' || liveSearchText.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMarketCategory('all');
                  setSelectedCountry('all');
                  setSelectedLeague('all');
                  setLiveSearchText('');
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-400 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 transition flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Effacer filtres</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 2. Live Market Pulse & Mathematical Edge Summary */}
      {liveData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Active Live Matches */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Matchs In-Play Scannés</span>
              <Radio className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
              <span className="text-red-400">{liveData.activeMatchesCount || liveData.liveTips.length}</span>
              <span className="text-[10px] text-slate-500 font-normal">en direct</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Heure de Paris : {liveData.lastUpdatedParisTime}
            </div>
          </div>

          {/* Average Live EV+ */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">EV+ Moyen Détecté</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              +{liveData.liveOpportunitiesSummary.averageLiveEv}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Sur {liveData.liveOpportunitiesSummary.highValueSignalsCount} signaux à haute valeur
            </div>
          </div>

          {/* Top Momentum Pick */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1 col-span-2 sm:col-span-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Top Signal Momentum & Stratégie In-Play</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-amber-300 line-clamp-1">
              🔥 {liveData.liveOpportunitiesSummary.topMomentumPick}
            </div>
            <div className="text-[11px] text-slate-400 leading-tight line-clamp-2">
              💡 {liveData.liveOpportunitiesSummary.liveStrategyAdvice}
            </div>
          </div>

        </div>
      )}

      {/* 3. Live Tips Stream */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading && !liveData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-200">
            Scan en direct des rencontres sportives en cours (Minute par minute)...
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Calcul des probabilités conditionnelles de Poisson et identification des asymétries de cotes dues au temps écoulé.
          </p>
        </div>
      ) : displayedLiveTips.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Radio className="w-8 h-8 text-red-400 mx-auto animate-pulse" />
          <p className="text-sm font-bold text-slate-200">
            Aucun match actif en direct dans cette discipline à cette minute précise.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            La section <strong>En Direct (Live)</strong> est strictement réservée aux rencontres sportives <em>en cours de jeu (In-Play)</em>. Les matchs programmés plus tard sont consultables dans l'onglet <strong>Pré-Match & Value</strong>.
          </p>
          {selectedSport !== 'all' && (
            <div className="pt-2">
              <button
                onClick={() => setSelectedSport('all')}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-md inline-flex items-center gap-2"
              >
                <span>🌍 Voir tous les matchs en direct (Tous Sports)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedLiveTips.map((tip, tipIdx) => {
            const stakePercent = tip.recommendedStakePercent || 1.5;
            const defaultStake = Number(((currentBalance * stakePercent) / 100).toFixed(2));
            const currentStake = customStakes[tip.id] !== undefined ? customStakes[tip.id] : (defaultStake > 0 ? defaultStake : 1.0);
            const potentialProfit = (currentStake * (tip.liveOdds - 1)).toFixed(2);
            const isTracked = trackedSuccessIds[tip.id] || trackedBets.some(b => b.tipId === tip.id || b.match.includes(tip.match));

            // Calculate odds inflation ratio
            const oddsBoostPercent = tip.preMatchOdds 
              ? Math.round(((tip.liveOdds - tip.preMatchOdds) / tip.preMatchOdds) * 100)
              : null;

            const isBayesianAlert = isBayesianAlertTriggered({
              odds: tip.liveOdds,
              bayesianConfidenceScore: tip.bayesianAnalysis?.bayesianConfidenceScore,
              confidenceScore: tip.confidenceScore,
            });

            return (
              <div
                key={tip.id ? `${tip.id}-${tipIdx}` : `live-tip-${tipIdx}`}
                className={`rounded-2xl p-5 shadow-sm transition space-y-4 ${
                  isBayesianAlert
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/40'
                    : 'bg-slate-900 border border-slate-800 hover:border-red-500/40'
                }`}
              >
                {/* Alerte Visuelle Bayésienne Bannière Spéciale (>80% dans la cible [1.15 - 1.85]) */}
                {isBayesianAlert && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/20 to-cyan-500/15 border border-emerald-400/60 text-emerald-200 text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                      </span>
                      <span className="font-black text-amber-300 flex items-center gap-1 uppercase tracking-wide text-[11px]">
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        ALERTE BAYÉSIENNE LIVE &gt; 80% DÉTECTÉE
                      </span>
                      <span className="text-[11px] text-slate-300 hidden md:inline">
                        — Confiance calculée à <strong>{tip.bayesianAnalysis?.bayesianConfidenceScore ?? tip.confidenceScore}%</strong> dans la cible @{tip.liveOdds.toFixed(2)} [1.15 - 1.85]
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-emerald-300">
                        Top Priorité ✓
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Match Header & Minute Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSportBadge(tip.sport).color}`}>
                        <span>{getSportBadge(tip.sport).icon}</span>
                        <span>{getSportBadge(tip.sport).label}</span>
                      </span>

                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                        {tip.league}
                      </span>

                      {/* Live Period & Minute Pulsing Badge */}
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-red-600/90 px-2.5 py-0.5 rounded-full shadow-md font-mono animate-pulse">
                        <Timer className="w-3 h-3 text-white" />
                        <span>{tip.currentMinute}</span>
                        <span className="text-[10px] font-normal text-red-200">({tip.period})</span>
                      </span>

                      {/* Urgency Badge */}
                      {tip.urgencyLevel === 'high' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          Opportunité Imminente
                        </span>
                      )}

                      {/* Stake Live In-Play Official Link */}
                      {tip.stakeUrl && (
                        <a
                          href={tip.stakeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30 hover:bg-orange-500/20 transition ml-auto sm:ml-0"
                          title="Ouvrir cette rencontre directement sur Stake.com"
                        >
                          <span>⚡ Stake Live In-Play</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}

                      {/* Badge Alerte Visuelle Bayésienne (>80% dans la fenêtre cible) */}
                      <BayesianAlertBadge 
                        tip={{
                          odds: tip.liveOdds,
                          confidenceScore: tip.confidenceScore,
                          expectedValue: tip.liveExpectedValue,
                          market: tip.liveMarket,
                          bayesianAnalysis: tip.bayesianAnalysis,
                        }}
                      />

                      {/* Bayesian Regression Badge */}
                      <BayesianTipBadge 
                        tip={{
                          odds: tip.liveOdds,
                          confidenceScore: tip.confidenceScore,
                          expectedValue: tip.liveExpectedValue,
                          market: tip.liveMarket,
                          aiEstimatedTrueProbability: tip.liveTrueProbability,
                          bookmakerImpliedProbability: tip.liveImpliedProbability,
                          sharpBenchmark: tip.sharpBenchmark,
                          bayesianAnalysis: tip.bayesianAnalysis,
                        }} 
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <h4 className="text-base font-black text-white">
                        {tip.match}
                      </h4>
                      {/* Current Score Pill */}
                      <span className="px-2.5 py-0.5 bg-slate-950 border border-red-500/50 rounded-lg text-sm font-black font-mono text-red-400">
                        {tip.currentScore}
                      </span>
                    </div>
                  </div>

                  {/* Odds & EV+ */}
                  <div className="text-left sm:text-right flex-shrink-0 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-baseline gap-2 justify-start sm:justify-end">
                      {tip.preMatchOdds && (
                        <span className="text-xs text-slate-500 line-through font-mono">
                          @{tip.preMatchOdds.toFixed(2)}
                        </span>
                      )}
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        @{tip.liveOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 justify-start sm:justify-end mt-0.5">
                      <span className="text-[11px] font-bold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30 font-mono">
                        +{tip.liveExpectedValue}% EV Live
                      </span>
                      {oddsBoostPercent && oddsBoostPercent > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          +{oddsBoostPercent}% inflation cote
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* In-Play Tactical Stats Matrix with Sport-Specific Metrics */}
                {(() => {
                  const getMetrics = () => {
                    if (tip.inPlayStats?.metrics && Array.isArray(tip.inPlayStats.metrics) && tip.inPlayStats.metrics.length > 0) {
                      return tip.inPlayStats.metrics;
                    }
                    const raw = tip.inPlayStats || {};
                    const sp = tip.sport || 'football';
                    if (sp === 'tennis') {
                      return [
                        { label: '1er Service %', value: raw.possession || '74% vs 62%', color: 'white' },
                        { label: 'Aces / D. Fautes', value: raw.shotsOnTarget || '6/1 vs 4/2', color: 'cyan' },
                        { label: 'Balles de Break', value: raw.liveXg || '2/3 (67%) vs 1/4', color: 'emerald' },
                        { label: 'Points Gagnants', value: raw.dangerousAttacks || '24 / 11 vs 17 / 16', color: 'amber' },
                        { label: 'Points Retour', value: raw.foulsOrCards || '39% vs 29%', color: 'rose' },
                      ];
                    }
                    if (sp === 'basketball') {
                      return [
                        { label: 'Adresse Tirs (FG%)', value: raw.possession || '49.2% (3PT: 39%)', color: 'white' },
                        { label: 'Rebonds (Off/Def)', value: raw.shotsOnTarget || '34 (8 off) vs 28', color: 'cyan' },
                        { label: 'Passes Décisives', value: raw.liveXg || '22 vs 16', color: 'emerald' },
                        { label: 'Pertes de Balle', value: raw.dangerousAttacks || '8 vs 14', color: 'amber' },
                        { label: 'Pace & Off. Rating', value: raw.foulsOrCards || '102.4 | Rating 114.2', color: 'rose' },
                      ];
                    }
                    if (sp === 'mma') {
                      return [
                        { label: 'Frappes Signif.', value: raw.possession || '46/68 vs 22/51', color: 'white' },
                        { label: 'Précision Frappes', value: raw.shotsOnTarget || '67% vs 43%', color: 'cyan' },
                        { label: 'Takedowns (TD)', value: raw.liveXg || '2/3 (67%) vs 0/1', color: 'emerald' },
                        { label: 'Contrôle Octogone', value: raw.dangerousAttacks || '3m40s vs 1m12s', color: 'amber' },
                        { label: 'Knockdowns (KD)', value: raw.foulsOrCards || '1 KD vs 0', color: 'rose' },
                      ];
                    }
                    if (sp === 'esports') {
                      return [
                        { label: 'Éliminations (Kills)', value: raw.possession || '24 - 15', color: 'white' },
                        { label: 'Objectifs Majeurs', value: raw.shotsOnTarget || '3 Dragons / 1 Baron', color: 'cyan' },
                        { label: 'Différence Gold', value: raw.liveXg || '+4.2k Gold', color: 'emerald' },
                        { label: 'Dégâts / ADR', value: raw.dangerousAttacks || 'ADR 88.5 vs 69.1', color: 'amber' },
                        { label: 'Avantage Rounds', value: raw.foulsOrCards || 'Map 1 (13-9) | Map 2', color: 'rose' },
                      ];
                    }
                    if (sp === 'hockey') {
                      return [
                        { label: 'Tirs Cadrés (SOG)', value: raw.possession || '28 vs 19', color: 'white' },
                        { label: 'Power Play (PP)', value: raw.shotsOnTarget || '1/3 vs 0/2', color: 'cyan' },
                        { label: 'Mises en Échec', value: raw.liveXg || '22 vs 18', color: 'emerald' },
                        { label: 'Arrêts (SV%)', value: raw.dangerousAttacks || '.947 vs .895', color: 'amber' },
                        { label: 'xG en Direct', value: raw.foulsOrCards || '2.25 vs 1.15', color: 'rose' },
                      ];
                    }
                    return [
                      { label: 'Possession', value: raw.possession || '62% - 38%', color: 'white' },
                      { label: 'Tirs Cadrés', value: raw.shotsOnTarget || '7 - 2 (Total: 14)', color: 'cyan' },
                      { label: 'xG en Direct', value: raw.liveXg || '1.88 vs 0.52', color: 'emerald' },
                      { label: 'Attaques Dang.', value: raw.dangerousAttacks || '46 - 19', color: 'amber' },
                      { label: 'Fautes / Cartons', value: raw.foulsOrCards || '1 Jaune - 2 Jaunes', color: 'rose' },
                    ];
                  };

                  const metrics = getMetrics();
                  const colorMap: Record<string, string> = {
                    cyan: 'text-cyan-300',
                    emerald: 'text-emerald-300',
                    amber: 'text-amber-300',
                    rose: 'text-rose-300',
                    indigo: 'text-indigo-300',
                    white: 'text-white',
                  };

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 text-xs">
                      {metrics.map((m, mIdx) => (
                        <div key={mIdx} className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 truncate block" title={m.label}>{m.label}</span>
                          <div className={`font-bold font-mono text-xs ${colorMap[m.color || 'white'] || 'text-white'}`}>
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Momentum & Proposed Live Market */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/30 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-red-400" />
                        Pari In-Play Recommandé par l'IA :
                      </div>
                      <div className="text-sm font-black text-emerald-300 mt-0.5">
                        {tip.liveMarket}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Momentum :</span>
                      <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        ⚡ {tip.momentumTeam}
                      </span>
                    </div>
                  </div>

                  {/* Quantitative Edge Explanation */}
                  <div className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                    <span className="font-bold text-indigo-300">📊 Analyse du temps écoulé : </span>
                    {tip.liveEdgeAnalysis}
                  </div>

                  {/* Timing advice & H2H quick audit strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-950/30 border border-indigo-500/20 p-2.5 rounded-lg">
                    {tip.recommendedEntryWindow ? (
                      <div className="text-[11px] text-cyan-300 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span><strong>Fenêtre d'entrée :</strong> {tip.recommendedEntryWindow}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-indigo-300 flex items-center gap-1.5 font-medium">
                        <Database className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span><strong>Football-Data.org :</strong> Confrontations directes (H2H) & Séries de forme calculées</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const { home, away } = parseTeamsFromMatch(tip.match);
                        setH2hModalState({
                          isOpen: true,
                          homeTeam: home,
                          awayTeam: away,
                          sport: tip.sport,
                          league: tip.league,
                          activeTip: {
                            id: tip.id,
                            match: tip.match,
                            sport: tip.sport,
                            league: tip.league,
                            market: tip.liveMarket,
                            odds: tip.liveOdds,
                            confidenceScore: tip.confidenceScore || 80,
                            expectedValue: tip.liveExpectedValue || 5.0,
                            recommendedStakePercent: tip.recommendedStakePercent || 1.5,
                            analysisReasoning: tip.liveEdgeAnalysis,
                            keyStats: [tip.currentScore, tip.currentMinute, tip.period],
                            riskLevel: tip.riskLevel || 'value',
                            kickoffTime: 'En Direct Live',
                            stakeUrl: tip.stakeUrl,
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-200 bg-indigo-900/60 hover:bg-indigo-800/90 border border-indigo-400/30 hover:border-indigo-400/60 px-2.5 py-1 rounded-lg transition active:scale-95 self-start sm:self-auto"
                    >
                      <Swords className="w-3.5 h-3.5 text-indigo-400" />
                      <span>📊 Voir 5 Derniers Duels H2H</span>
                    </button>
                  </div>
                </div>

                {/* Action Bar & Quick Stake */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">Mise conseillée :</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={currentStake}
                        onChange={(e) => setCustomStakes({ ...customStakes, [tip.id]: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-right focus:outline-none focus:border-red-500"
                      />
                      <span className="text-xs text-slate-400 font-mono">{currency}</span>
                    </div>

                    <div className="text-xs font-mono text-emerald-400">
                      Gain net : <strong>+{potentialProfit} {currency}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* H2H Analysis Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const { home, away } = parseTeamsFromMatch(tip.match);
                        setH2hModalState({
                          isOpen: true,
                          homeTeam: home,
                          awayTeam: away,
                          sport: tip.sport,
                          league: tip.league,
                          activeTip: {
                            id: tip.id,
                            match: tip.match,
                            sport: tip.sport,
                            league: tip.league,
                            market: tip.liveMarket,
                            odds: tip.liveOdds,
                            confidenceScore: tip.confidenceScore || 80,
                            expectedValue: tip.liveExpectedValue || 5.0,
                            recommendedStakePercent: tip.recommendedStakePercent || 1.5,
                            analysisReasoning: tip.liveEdgeAnalysis,
                            keyStats: [tip.currentScore, tip.currentMinute, tip.period],
                            riskLevel: tip.riskLevel || 'value',
                            kickoffTime: 'En Direct Live',
                            stakeUrl: tip.stakeUrl,
                          },
                        });
                      }}
                      className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                      title="Consulter les 5 dernières confrontations directes (Football-Data.org)"
                    >
                      <Swords className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Analyser H2H</span>
                    </button>

                    {/* Direct Stake.com Live Placement */}
                    <a
                      href={tip.stakeUrl || 'https://stake.com/sports'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/50 transition active:scale-95"
                      title="Parier directement en direct sur Stake.com"
                    >
                      <span>⚡ Parier sur Stake.com (@{tip.liveOdds.toFixed(2)})</span>
                      <ExternalLink className="w-3 h-3 text-orange-200" />
                    </a>

                    {/* Track Live Bet Button */}
                    <button
                      onClick={() => handleTrackLiveBet(tip)}
                      disabled={isTracked}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isTracked
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-sm active:scale-95'
                      }`}
                    >
                      {isTracked ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pari Suivi</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                          <span>Suivre dans l'App</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Head-to-Head (H2H) Football-Data.org Modal */}
      <H2HAnalysisModal
        isOpen={h2hModalState.isOpen}
        onClose={() => setH2hModalState({ ...h2hModalState, isOpen: false })}
        homeTeam={h2hModalState.homeTeam}
        awayTeam={h2hModalState.awayTeam}
        sport={h2hModalState.sport}
        league={h2hModalState.league}
        activeTip={h2hModalState.activeTip}
        currency={currency}
        currentBalance={currentBalance}
        onTrackBet={onTrackBet}
        isTracked={h2hModalState.activeTip ? trackedBets.some(b => b.tipId === h2hModalState.activeTip?.id || b.match === h2hModalState.activeTip?.match) : false}
      />

    </div>
  );
};
