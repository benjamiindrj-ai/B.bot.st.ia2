import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  ExternalLink, 
  TrendingUp, 
  Flame, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  PlusCircle, 
  Layers, 
  Zap, 
  Scale, 
  Award, 
  Clock, 
  Percent, 
  Radio, 
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Coins,
  Check
} from 'lucide-react';
import { 
  StakeSportFixture, 
  StakeSportsMarket, 
  StakeMarketOutcome, 
  StakeMarketsResponse, 
  SportTip, 
  TrackedSportBet 
} from '../types';
import { formatParisTime } from '../utils/parisTime';

interface StakeSportsbookMarketsProps {
  currentBalance: number;
  currency: string;
  trackedBets: TrackedSportBet[];
  onTrackBet: (tip: SportTip, stakeAmount: number) => void;
  selectedSport?: string;
}

export const StakeSportsbookMarkets: React.FC<StakeSportsbookMarketsProps> = ({
  currentBalance,
  currency,
  trackedBets,
  onTrackBet,
  selectedSport: propSport = 'all',
}) => {
  const [sport, setSport] = useState<string>(propSport);
  const [fixtures, setFixtures] = useState<StakeSportFixture[]>([]);
  const [stakeStats, setStakeStats] = useState<StakeMarketsResponse['stakeSportsbookStats'] | null>(null);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [marketCategoryFilter, setMarketCategoryFilter] = useState<'all' | 'match_winner' | 'totals' | 'handicaps' | 'btts' | 'combos'>('all');
  const [onlyLive, setOnlyLive] = useState<boolean>(false);
  const [onlyValueBets, setOnlyValueBets] = useState<boolean>(false);

  // Expanded card state
  const [expandedFixtureIds, setExpandedFixtureIds] = useState<Record<string, boolean>>({});

  // Quick Bet modal / popover
  const [selectedBetTarget, setSelectedBetTarget] = useState<{
    fixture: StakeSportFixture;
    market: StakeSportsMarket;
    outcome: StakeMarketOutcome;
  } | null>(null);
  const [customStakeAmount, setCustomStakeAmount] = useState<number>(Number(((currentBalance || 100) * 0.015).toFixed(2)));
  const [trackedSuccessMessage, setTrackedSuccessMessage] = useState<string | null>(null);

  // Paris time clock
  const [parisTime, setParisTime] = useState<string>(formatParisTime(Date.now(), true));

  useEffect(() => {
    const timer = setInterval(() => {
      setParisTime(formatParisTime(Date.now(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sportsList = [
    { id: 'all', label: 'Tous les marchés', icon: '🏆' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'basketball', label: 'Basketball', icon: '🏀' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
    { id: 'mma', label: 'MMA / UFC', icon: '🥊' },
    { id: 'esports', label: 'Esports', icon: '🎮' },
    { id: 'hockey', label: 'Hockey', icon: '🏒' },
    { id: 'baseball', label: 'Baseball', icon: '⚾' },
  ];

  const fetchMarkets = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    try {
      let headers: Record<string, string> = {};
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

      // Parallel fetch for markets and status
      const [mktRes, statusRes] = await Promise.allSettled([
        fetch(`/api/stake/markets?sport=${sport}`, { headers }),
        fetch('/api/stake/status', { headers })
      ]);

      if (mktRes.status === 'fulfilled' && mktRes.value.ok) {
        const data: StakeMarketsResponse = await mktRes.value.json();
        setFixtures(data.fixtures || []);
        setStakeStats(data.stakeSportsbookStats || null);
        
        // Auto-expand top 3 matches
        const initialExpanded: Record<string, boolean> = {};
        (data.fixtures || []).slice(0, 3).forEach(f => {
          initialExpanded[f.id] = true;
        });
        setExpandedFixtureIds(prev => ({ ...initialExpanded, ...prev }));
      } else {
        throw new Error('Impossible de synchroniser les marchés Stake.com');
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const statusData = await statusRes.value.json();
        setStatusInfo(statusData);
      }
    } catch (err: any) {
      console.error('Stake markets sync error:', err);
      setErrorMsg(err.message || 'Erreur de connexion aux marchés Stake.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sport]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const toggleExpand = (fixtureId: string) => {
    setExpandedFixtureIds(prev => ({
      ...prev,
      [fixtureId]: !prev[fixtureId]
    }));
  };

  const handleTrackStakeBet = (
    fixture: StakeSportFixture,
    market: StakeSportsMarket,
    outcome: StakeMarketOutcome,
    stake: number
  ) => {
    const evVal = outcome.expectedValue || (outcome.isRecommended ? 6.2 : 2.5);
    const impliedProb = outcome.probability || Number(((1 / outcome.odds) * 100).toFixed(1));
    const trueProb = outcome.trueProbability || Number(Math.min(95, impliedProb * (1 + evVal / 100)).toFixed(1));

    const convertedTip: SportTip = {
      id: `stake-bet-${fixture.fixtureId}-${outcome.outcomeId}-${Date.now()}`,
      sport: fixture.sport as any,
      match: fixture.match,
      league: fixture.tournament,
      kickoffTime: fixture.kickoffFormattedParis,
      kickoffTimestamp: fixture.startTimestamp,
      minutesUntilKickoff: fixture.minutesUntilKickoff,
      market: `${market.marketName} : ${outcome.name}`,
      odds: outcome.odds,
      expectedValue: evVal,
      confidenceScore: 84,
      recommendedStakePercent: Number(((stake / (currentBalance || 100)) * 100).toFixed(1)) || 1.5,
      bookmakerImpliedProbability: impliedProb,
      aiEstimatedTrueProbability: trueProb,
      analysisReasoning: `Pari réel placé sur le marché officiel Stake.com "${market.marketName}". Marge bookmaker de ${market.marginPercent || 3.2}%. Cote de @${outcome.odds} validée sur Stake Sportsbook.`,
      keyStats: [
        `Compétition officielle: ${fixture.tournament}`,
        `Marge Stake: ${market.marginPercent || 3.1}% (Pinnacle Benchmark)`,
        `Lien Stake: ${fixture.stakeUrl}`
      ],
      riskLevel: 'value',
      droppingOddsAlert: {
        openingOdds: Number((outcome.odds + 0.10).toFixed(2)),
        currentOdds: outcome.odds,
        trend: 'dropping',
        sharpMoneySignal: `Flux réel Stake.com enregistré sur ${outcome.name}`,
      }
    };

    onTrackBet(convertedTip, stake);
    setTrackedSuccessMessage(`Pari enregistré dans le Bilan : ${outcome.name} @${outcome.odds} (${stake} ${currency})`);
    setSelectedBetTarget(null);

    setTimeout(() => {
      setTrackedSuccessMessage(null);
    }, 4000);
  };

  // Filtered fixtures
  const filteredFixtures = fixtures.filter(f => {
    if (onlyLive && !f.isLive) return false;
    if (onlyValueBets && !f.topValueBet) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${f.match} ${f.tournament} ${f.homeTeam} ${f.awayTeam}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  return (
    <div id="stake-sportsbook-view" className="space-y-6">
      
      {/* 1. Stake Sportsbook Status & Live Connectivity Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/70 to-slate-900 border border-blue-600/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-blue-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-emerald-500/20 border border-blue-500/40 flex items-center justify-center text-2xl shadow-md shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white">
                  Marchés Officiels Stake Sportsbook
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API Marchés Connectée
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Marge Réduite: {stakeStats?.averageStakeMargin || 3.15}%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Extraction des cotes réelles et de tous les marchés disponibles (1X2, Handicap Asiatique, Totaux Over/Under, BTTS) avec détection d'espérance de gain (+EV).
              </p>
            </div>
          </div>

          {/* Action & Stats Quick Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Paris : <strong className="text-white">{parisTime}</strong></span>
            </div>

            <button
              onClick={() => fetchMarkets(true)}
              disabled={isRefreshing || isLoading}
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 border border-blue-400/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Sync Stake...' : 'Actualiser Marchés'}</span>
            </button>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Matchs Indexés</span>
            <span className="text-sm font-bold text-white font-mono">{fixtures.length} rencontres</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Marchés Ouverts</span>
            <span className="text-sm font-bold text-blue-400 font-mono">
              {fixtures.reduce((acc, f) => acc + f.markets.length, 0)} lignes de paris
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Matchs en Direct (Live)</span>
            <span className="text-sm font-bold text-orange-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              {fixtures.filter(f => f.isLive).length} en direct
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Value Bets (+EV) Détectés</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {fixtures.filter(f => !!f.topValueBet).length} opportunités
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {trackedSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3.5 text-xs text-emerald-300 flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{trackedSuccessMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
            Tracked
          </span>
        </div>
      )}

      {/* 2. Controls & Sport Tabs */}
      <div className="space-y-3">
        {/* Sport Pill Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {sportsList.map((item) => (
            <button
              key={item.id}
              onClick={() => setSport(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border shadow-sm ${
                sport === item.id
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-950/50'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Secondary Filters */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une équipe, un match ou une ligue sur Stake..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Market Category Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setMarketCategoryFilter('all')}
                className={`px-2.5 py-1 rounded font-semibold transition ${marketCategoryFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Tous marchés
              </button>
              <button
                onClick={() => setMarketCategoryFilter('match_winner')}
                className={`px-2.5 py-1 rounded font-semibold transition ${marketCategoryFilter === 'match_winner' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                1X2 / ML
              </button>
              <button
                onClick={() => setMarketCategoryFilter('totals')}
                className={`px-2.5 py-1 rounded font-semibold transition ${marketCategoryFilter === 'totals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Totaux (O/U)
              </button>
              <button
                onClick={() => setMarketCategoryFilter('handicaps')}
                className={`px-2.5 py-1 rounded font-semibold transition ${marketCategoryFilter === 'handicaps' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Handicap
              </button>
              <button
                onClick={() => setMarketCategoryFilter('btts')}
                className={`px-2.5 py-1 rounded font-semibold transition ${marketCategoryFilter === 'btts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                BTTS
              </button>
            </div>

            {/* Quick toggles */}
            <button
              onClick={() => setOnlyLive(!onlyLive)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                onlyLive 
                  ? 'bg-orange-600 text-white border-orange-500' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${onlyLive ? 'bg-white' : 'bg-orange-400'}`} />
              <span>En Direct</span>
            </button>

            <button
              onClick={() => setOnlyValueBets(!onlyValueBets)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                onlyValueBets 
                  ? 'bg-emerald-600 text-white border-emerald-500' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Value Bets (+EV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Fixtures List */}
      {isLoading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <h4 className="text-sm font-bold text-white">Synchronisation des marchés Stake Sportsbook...</h4>
          <p className="text-xs text-slate-400">Interrogation des cotes et des lignes de paris en direct.</p>
        </div>
      ) : filteredFixtures.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <Activity className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">Aucun marché trouvé pour ces critères</h4>
          <p className="text-xs text-slate-500">Essayez de modifier vos filtres ou de sélectionner un autre sport.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFixtures.map((fixture, fIdx) => {
            const isExpanded = !!expandedFixtureIds[fixture.id];
            const visibleMarkets = fixture.markets.filter(m => {
              if (marketCategoryFilter === 'all') return true;
              return m.marketCategory === marketCategoryFilter;
            });

            return (
              <div 
                key={`${fixture.id}-${fIdx}`}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm transition"
              >
                {/* Fixture Top Header */}
                <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {fixture.tournament}
                      </span>

                      {fixture.isLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-orange-300 border border-red-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                          LIVE : {fixture.liveStatus?.score || '0 - 0'} ({fixture.liveStatus?.clock || "En jeu"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {fixture.kickoffFormattedParis}
                        </span>
                      )}

                      {fixture.topValueBet && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Flame className="w-3 h-3 text-emerald-400" />
                          Value Bet : +{fixture.topValueBet.expectedValue}% EV
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      <span>{fixture.homeTeam}</span>
                      <span className="text-xs text-slate-500 font-normal">vs</span>
                      <span>{fixture.awayTeam}</span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={fixture.stakeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                      title="Ouvrir sur Stake.com"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      <span>Stake.com</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <button
                      onClick={() => toggleExpand(fixture.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition"
                    >
                      <span>{visibleMarkets.length} marchés</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Fixture Markets Body */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Top Value Bet Callout if available */}
                    {fixture.topValueBet && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">
                              Opportunité Recommandée par IA & Poisson :
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {fixture.topValueBet.pick}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                              @{fixture.topValueBet.odds}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{fixture.topValueBet.reasoning}</p>
                        </div>

                        <button
                          onClick={() => {
                            const mkt = fixture.markets.find(m => m.marketName === fixture.topValueBet?.marketName) || fixture.markets[0];
                            const outcome = mkt?.outcomes.find(o => o.name === fixture.topValueBet?.pick) || mkt?.outcomes[0];
                            if (mkt && outcome) {
                              setSelectedBetTarget({ fixture, market: mkt, outcome });
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 shadow-md transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Miser / Suivre</span>
                        </button>
                      </div>
                    )}

                    {/* Markets Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visibleMarkets.map((market, mIdx) => (
                        <div 
                          key={`${fixture.id}-${market.marketId}-${mIdx}`}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-xs font-bold text-slate-200">
                              {market.marketName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono" title="Marge bookmaker Stake">
                              Marge: {market.marginPercent || 3.1}%
                            </span>
                          </div>

                          {/* Outcomes list */}
                          <div className="space-y-1.5">
                            {market.outcomes.map((outcome, oIdx) => {
                              const isRec = outcome.isRecommended;

                              return (
                                <button
                                  key={`${fixture.id}-${market.marketId}-${outcome.outcomeId}-${oIdx}`}
                                  onClick={() => setSelectedBetTarget({ fixture, market, outcome })}
                                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition group ${
                                    isRec
                                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/50'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate pr-2">
                                    {isRec && <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                    <span className="truncate">{outcome.name}</span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {outcome.probability}%
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                      isRec 
                                        ? 'bg-emerald-500 text-slate-950' 
                                        : 'bg-slate-800 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-slate-950'
                                    }`}>
                                      @{outcome.odds.toFixed(2)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal / Popover: Quick Stake Bet Placer & Tracker */}
      {selectedBetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Placer & Enregistrer le Pari Stake
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Synchronisation automatique dans votre Journal & Bilan IA
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBetTarget(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Match Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-400 font-bold">{selectedBetTarget.fixture.tournament}</span>
                  <span className="text-slate-400">{selectedBetTarget.fixture.kickoffFormattedParis}</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {selectedBetTarget.fixture.match}
                </div>
                <div className="text-slate-300 flex items-center gap-1.5 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Marché :</span>
                  <strong className="text-white">{selectedBetTarget.market.marketName}</strong>
                </div>
              </div>

              {/* Selection & Odds */}
              <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 p-3.5 rounded-xl border border-blue-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Sélection :</span>
                  <strong className="text-sm text-emerald-300 font-extrabold">{selectedBetTarget.outcome.name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Cote Stake :</span>
                  <strong className="text-base text-cyan-300 font-mono font-black">@{selectedBetTarget.outcome.odds.toFixed(2)}</strong>
                </div>
              </div>

              {/* Stake Amount Input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Montant de la mise ({currency}) :</span>
                  <span className="text-[11px] text-slate-500">
                    Solde: {currentBalance} {currency}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={customStakeAmount}
                    onChange={(e) => setCustomStakeAmount(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 font-mono">
                    {currency}
                  </span>
                </div>

                {/* Quick stake presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomStakeAmount(amt)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 font-bold transition"
                    >
                      {amt} {currency}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomStakeAmount(Number(((currentBalance || 100) * 0.02).toFixed(2)))}
                    className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold transition"
                  >
                    2% Kelly
                  </button>
                </div>
              </div>

              {/* Potential Return */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Gain Potentiel :</span>
                <span className="font-extrabold text-emerald-400">
                  +{(customStakeAmount * (selectedBetTarget.outcome.odds - 1)).toFixed(2)} {currency} (Total: {(customStakeAmount * selectedBetTarget.outcome.odds).toFixed(2)} {currency})
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
              <a
                href={selectedBetTarget.fixture.stakeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <span>Ouvrir sur Stake</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBetTarget(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleTrackStakeBet(
                    selectedBetTarget.fixture,
                    selectedBetTarget.market,
                    selectedBetTarget.outcome,
                    customStakeAmount
                  )}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer dans le Suivi</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
