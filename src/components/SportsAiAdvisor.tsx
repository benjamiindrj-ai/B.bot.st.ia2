import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  Search,
  ShieldCheck,
  Scale,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Percent,
  Coins,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bookmark,
  Cpu,
  Zap,
  Check,
  Info,
  Flame,
  Clock,
  Radio,
  X,
  Target
} from 'lucide-react';
import { 
  SportTip, 
  SportsAiAdviceResponse, 
  SportsTrendInsight, 
  GroundedWebSource, 
  StakeAdjustmentAnalysis,
  TrackedSportBet 
} from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface SportsAiAdvisorProps {
  currentBalance: number;
  currency: string;
  activeTip?: SportTip | null;
  selectedSport?: string;
  onTrackBet?: (tip: SportTip, stakeAmount: number) => void;
  onClose?: () => void;
}

export const SportsAiAdvisor: React.FC<SportsAiAdvisorProps> = ({
  currentBalance,
  currency,
  activeTip,
  selectedSport = 'all',
  onTrackBet,
  onClose,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (activeTip) return `${activeTip.match} cotes blessures compositions`;
    return 'Dernières tendances paris sportifs et value bets';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adviceData, setAdviceData] = useState<SportsAiAdviceResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedStakeTipId, setAppliedStakeTipId] = useState<string | null>(null);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number>(0);
  const [baseStakePercentInput, setBaseStakePercentInput] = useState<number>(() => {
    if (activeTip?.recommendedStakePercent) return activeTip.recommendedStakePercent;
    return 2.0;
  });

  const presetQueries = [
    { label: '🔥 Top Steam Moves & Chutes de Cotes', query: 'Chutes de cotes rapides et steam moves betting pinnacle betfair' },
    { label: '⚽ Football : Compositions & Blessures LDC / L1', query: 'Compositions officielles forfaits blessures football europe cotes' },
    { label: '🏀 NBA : Blessures & Back-to-Back', query: 'NBA injury report back to back betting line movement sharp' },
    { label: '🎾 Tennis : Forme & Conditions de Surface', query: 'Tennis ATP WTA surface forme physique blessures value bets' },
    { label: '🥊 MMA / UFC : Alertes Poids & Matchups', query: 'UFC MMA weigh-in blessures cotes sharp arbitrage' },
  ];

  const fetchAiAdvice = async (customQuery?: string) => {
    const q = customQuery !== undefined ? customQuery : searchQuery;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/sports-ai-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          match: activeTip ? activeTip.match : undefined,
          sport: activeTip ? activeTip.sport : selectedSport,
          league: activeTip ? activeTip.league : undefined,
          market: activeTip ? activeTip.market : undefined,
          odds: activeTip ? activeTip.odds : 1.90,
          currentStakePercent: baseStakePercentInput,
          userBankroll: currentBalance > 0 ? currentBalance : 100,
          currency,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data: SportsAiAdviceResponse = await res.json();
      setAdviceData(data);
      setSelectedTrendIndex(0);
    } catch (err: any) {
      console.error('Failed to fetch sports AI advice:', err);
      setErrorMsg(err.message || 'Impossible de récupérer les conseils IA groundés.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAiAdvice();
  }, [activeTip]);

  const handleApplyStake = (trend: SportsTrendInsight) => {
    if (!onTrackBet) return;
    const bankroll = currentBalance > 0 ? currentBalance : 100;
    const stakeAmt = trend.stakeAdvice.adjustedStakeAmount || Number(((bankroll * trend.stakeAdvice.adjustedStakePercent) / 100).toFixed(2));
    
    // Construct SportTip object from trend
    const tipToTrack: SportTip = {
      id: `ai-advice-${Date.now()}`,
      sport: (trend.sport as any) || 'football',
      match: trend.match || trend.topic,
      league: trend.league || 'Conseil IA Groundé',
      kickoffTime: 'Aujourd’hui',
      market: trend.recommendedPick?.selection || trend.market || 'Sélection Conseillée',
      odds: trend.recommendedPick?.odds || 1.90,
      trueProbability: Number((100 / (trend.recommendedPick?.fairOdds || 1.75)).toFixed(1)),
      bookmakerImpliedProbability: Number((100 / (trend.recommendedPick?.odds || 1.90)).toFixed(1)),
      expectedValue: trend.recommendedPick?.evPct || 8.5,
      confidenceScore: trend.sourceReliabilityScore,
      recommendedStakePercent: trend.stakeAdvice.adjustedStakePercent,
      riskLevel: trend.stakeAdvice.adjustedStakePercent > 3 ? 'aggressive' : 'value',
      analysisReasoning: `Conseil IA Google Search Grounding : ${trend.summary} (Ajustement mise : x${trend.stakeAdvice.sourceReliabilityMultiplier} basé sur source à ${trend.sourceReliabilityScore}% de fiabilité).`,
      keyStats: [
        `Fiabilité Source: ${trend.sourceReliabilityScore}% (${trend.sources[0]?.reliabilityTier || 'Grounded Web'})`,
        `Tendance: ${trend.consensusDirection || trend.trendType}`,
        `Ajustement Mise: ${trend.stakeAdvice.adjustmentRationale}`
      ]
    };

    onTrackBet(tipToTrack, stakeAmt);
    setAppliedStakeTipId(trend.topic);
    setTimeout(() => setAppliedStakeTipId(null), 3000);
  };

  const getTierBadge = (tier: string, score: number) => {
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tier 1 ({score}% Fiabilité Très Haute)</span>
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tier 2 ({score}% Haute Fiabilité)</span>
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Tier 3 ({score}% Fiabilité Moyenne)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span>Tier 4 ({score}% Spéculatif / Rumeur)</span>
      </span>
    );
  };

  const activeTrend = adviceData?.keyTrends?.[selectedTrendIndex] || adviceData?.keyTrends?.[0];

  return (
    <div id="sports-ai-advisor-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-indigo-500/30 p-5 md:p-6 shadow-xl shadow-indigo-950/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>Google Search Grounding Temps Réel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-300 font-mono">Live Sync</span>
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-indigo-400" />
              <span>Conseil IA & Calibrateur de Mise par Fiabilité</span>
            </h2>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Analyse en direct les flux mondiaux de paris sportifs via Google Search Grounding (mouvements de cotes Pinnacle, volumes Betfair Exchange, blessures officielles) et ajuste dynamiquement le pourcentage de mise (Kelly Multiplier) selon la crédibilité des sources.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-ai-advice-btn"
              onClick={() => fetchAiAdvice()}
              disabled={isLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-950/60 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Audit en cours...' : 'Actualiser l’Analyse'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Preset Chips */}
        <div className="mt-5 pt-4 border-t border-indigo-500/20 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchAiAdvice();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une tendance, un match, un joueur (ex: Real Madrid vs PSG, Blessure Curry, Over 2.5...)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-slate-300">
                <Percent className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] text-slate-400">Mise Base :</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={baseStakePercentInput}
                  onChange={(e) => setBaseStakePercentInput(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-center text-white text-xs font-mono font-bold focus:outline-none"
                />
                <span className="text-slate-400">%</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Analyser</span>
              </button>
            </div>
          </form>

          {/* Preset Queries */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Suggestions :</span>
            {presetQueries.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(p.query);
                  fetchAiAdvice(p.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700/80 hover:border-indigo-500/40 text-slate-300 hover:text-white transition whitespace-nowrap text-[11px] font-medium cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto animate-pulse text-indigo-400">
            <Globe className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Interrogation de Google Search Grounding...</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Scan des flux d'actualités officielles, comparaison des cotes de clôture Pinnacle et évaluation de la fiabilité des sources en temps réel.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMsg && !isLoading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchAiAdvice()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-white font-bold transition text-[11px]"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Advice Content */}
      {adviceData && !isLoading && (
        <div className="space-y-6">
          {/* Grounding Metadata Bar */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">Requêtes Google Grounding exécutées :</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {adviceData.searchQueries?.map((sq, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 text-[11px] font-mono">
                    "{sq}"
                  </span>
                ))}
              </div>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Actualisé à : <strong className="text-white">{adviceData.analyzedAt}</strong> (Paris)
            </div>
          </div>

          {/* Focused Match Advice Banner (If Match Specified) */}
          {adviceData.directMatchAdvice && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{adviceData.directMatchAdvice.match}</h3>
                    <p className="text-xs text-slate-400">{adviceData.directMatchAdvice.league} • {adviceData.directMatchAdvice.market} @{adviceData.directMatchAdvice.currentOdds}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getTierBadge(
                    adviceData.directMatchAdvice.sourceCredibilityAssessment.tier,
                    adviceData.directMatchAdvice.sourceCredibilityAssessment.overallReliabilityScore
                  )}
                </div>
              </div>

              {/* News & Dynamics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dernières Dépêches & Compositions Groundées</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {adviceData.directMatchAdvice.breakingNewsAndLineups}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dynamique Sharp vs Public Money</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {adviceData.directMatchAdvice.sharpVsPublicDynamics}
                  </p>
                </div>
              </div>

              {/* Stake Adjuster Core Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Ajustement de Mise Recommandé (Stake Adjuster)</h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                      x{adviceData.directMatchAdvice.stakeAdjustment.sourceReliabilityMultiplier} Multiplicateur Fiabilité
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {adviceData.directMatchAdvice.stakeAdjustment.adjustmentRationale}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Mise Conseillée</div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      {adviceData.directMatchAdvice.stakeAdjustment.adjustedStakePercent}%
                      <span className="text-xs text-slate-300 ml-1.5">
                        ({adviceData.directMatchAdvice.stakeAdjustment.adjustedStakeAmount} {currency})
                      </span>
                    </div>
                  </div>

                  {activeTip && onTrackBet && (
                    <button
                      onClick={() => onTrackBet(activeTip, adviceData.directMatchAdvice!.stakeAdjustment.adjustedStakeAmount)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Appliquer au Pari</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Key Trends Navigation Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Tendances Majeures Détectées ({adviceData.keyTrends?.length || 0})</span>
              </h3>
              <span className="text-xs text-slate-400">Cliquez sur une tendance pour inspecter les sources et calculs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {adviceData.keyTrends?.map((trend, idx) => {
                const isSelected = selectedTrendIndex === idx;
                const isIncrease = trend.stakeAdvice.stakeAdjustmentDirection === 'increase';
                const isDecrease = trend.stakeAdvice.stakeAdjustmentDirection === 'decrease';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedTrendIndex(idx)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {trend.sport}
                        </span>
                        {getTierBadge('', trend.sourceReliabilityScore)}
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-2">{trend.topic}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{trend.summary}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 font-mono font-bold">
                        <span className="text-slate-400 text-[11px]">Mise :</span>
                        <span className={isIncrease ? 'text-emerald-400' : isDecrease ? 'text-rose-400' : 'text-slate-300'}>
                          {trend.stakeAdvice.adjustedStakePercent}%
                        </span>
                        <span className="text-[10px] text-slate-500">({trend.stakeAdvice.sourceReliabilityMultiplier}x)</span>
                      </div>

                      {trend.recommendedPick && (
                        <span className="text-[11px] font-mono text-cyan-300 font-bold">
                          @{trend.recommendedPick.odds}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Trend Deep-Dive & Source Reliability Breakdown */}
          {activeTrend && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase">
                      {activeTrend.trendType.replace('_', ' ')}
                    </span>
                    <h3 className="text-lg font-black text-white">{activeTrend.topic}</h3>
                  </div>
                  <p className="text-xs text-slate-400">{activeTrend.consensusDirection}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Impact sur la cote</div>
                    <div className="text-xs font-mono text-cyan-300 font-bold">{activeTrend.impactOnOdds}</div>
                  </div>
                  {getTierBadge('', activeTrend.sourceReliabilityScore)}
                </div>
              </div>

              {/* Stake Calculation & Sizing Adjuster Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Base Kelly */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-center">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">1. Mise de Base (Kelly)</div>
                  <div className="text-xl font-black text-white font-mono">{activeTrend.stakeAdvice.baseStakePercent}%</div>
                  <div className="text-[11px] text-slate-500">{activeTrend.stakeAdvice.kellyFractionApplied}</div>
                </div>

                {/* 2. Source Multiplier */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-center">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">2. Multiplicateur Source</div>
                  <div className={`text-xl font-black font-mono ${
                    activeTrend.stakeAdvice.sourceReliabilityMultiplier > 1 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    x{activeTrend.stakeAdvice.sourceReliabilityMultiplier}
                  </div>
                  <div className="text-[11px] text-slate-400">Fiabilité : {activeTrend.sourceReliabilityScore}%</div>
                </div>

                {/* 3. Final Calibrated Stake */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/80 to-emerald-950/80 border border-emerald-500/40 space-y-1 text-center">
                  <div className="text-[11px] text-emerald-300 font-bold uppercase">3. Mise Finale Conseillée</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {activeTrend.stakeAdvice.adjustedStakePercent}%
                  </div>
                  <div className="text-xs text-slate-200 font-mono font-bold">
                    = {activeTrend.stakeAdvice.adjustedStakeAmount} {currency}
                  </div>
                </div>
              </div>

              {/* Rationale & Risk Guardrails */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Justification Mathématique de l'Ajustement</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{activeTrend.stakeAdvice.adjustmentRationale}</p>
                </div>

                {activeTrend.stakeAdvice.riskGuardrails?.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    <div className="text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gardes-Fous & Gestion du Risque (Guardrails)</span>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-300">
                      {activeTrend.stakeAdvice.riskGuardrails.map((g, gi) => (
                        <li key={gi} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Grounded Sources Citations with Direct Links */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sources Web Groundées & Indices de Crédibilité ({activeTrend.sources?.length || 0})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeTrend.sources?.map((source, sIdx) => (
                    <a
                      key={sIdx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 transition flex items-start justify-between gap-3 text-xs group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-indigo-300 font-mono font-semibold">
                            {source.domain}
                          </span>
                          <span className="text-[10px] text-slate-500">{source.publishedTime}</span>
                        </div>
                        <h5 className="font-semibold text-slate-200 group-hover:text-indigo-300 transition line-clamp-1">
                          {source.title}
                        </h5>
                        {source.snippet && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{source.snippet}</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
                        <span className={`text-[10px] font-bold font-mono ${
                          source.reliabilityScore >= 90 ? 'text-emerald-400' : 'text-cyan-400'
                        }`}>
                          {source.reliabilityScore}%
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Action Button: Apply Sized Bet */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  {activeTrend.recommendedPick ? (
                    <span>
                      Sélection suggérée : <strong className="text-white">{activeTrend.recommendedPick.selection}</strong> @{activeTrend.recommendedPick.odds} (+{activeTrend.recommendedPick.evPct}% EV)
                    </span>
                  ) : (
                    <span>Mise prête pour application</span>
                  )}
                </div>

                {onTrackBet && (
                  <button
                    onClick={() => handleApplyStake(activeTrend)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer"
                  >
                    {appliedStakeTipId === activeTrend.topic ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        <span>Mise Appliquée avec Succès !</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Enregistrer ce Conseil ({activeTrend.stakeAdvice.adjustedStakeAmount} {currency})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Global Bankroll Safety Advice Footer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-200">Discipline de Gestion de Bankroll :</span>
              <p className="leading-relaxed">{adviceData.globalBankrollSafetyAdvice}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
