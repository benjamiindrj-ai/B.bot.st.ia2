import React, { useEffect, useState } from 'react';
import { 
  X, 
  Swords, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  Check, 
  PlusCircle, 
  Activity, 
  Layers,
  ArrowRight,
  Trophy
} from 'lucide-react';
import { H2HAnalysisData, SportTip } from '../types';

interface H2HAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  league?: string;
  activeTip?: SportTip | null;
  currency?: string;
  currentBalance?: number;
  onTrackBet?: (tip: SportTip, stakeAmount: number) => void;
  isTracked?: boolean;
}

export const H2HAnalysisModal: React.FC<H2HAnalysisModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  sport = 'football',
  league = '',
  activeTip,
  currency = 'EUR',
  currentBalance = 100,
  onTrackBet,
  isTracked = false,
}) => {
  const [data, setData] = useState<H2HAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'form'>('matches');

  const fetchH2H = async () => {
    if (!homeTeam || !awayTeam) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.footballDataApiKey) headers['x-football-data-key'] = creds.footballDataApiKey;
        }
        const directFdKey = localStorage.getItem('football_data_api_key');
        if (directFdKey) headers['x-football-data-key'] = directFdKey;
      } catch (e) {
        // ignore parse error
      }

      const res = await fetch('/api/sports/h2h', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          sport,
          league,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur lors de la récupération H2H (${res.status})`);
      }

      const json = await res.json();
      if (json.data) {
        setData(json.data);
      } else {
        throw new Error('Données H2H indisponibles');
      }
    } catch (err: any) {
      console.error('Failed to fetch H2H:', err);
      setErrorMsg(err.message || 'Impossible de charger l\'historique des confrontations directes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && homeTeam && awayTeam) {
      fetchH2H();
    }
  }, [isOpen, homeTeam, awayTeam]);

  if (!isOpen) return null;

  const stakeAmount = activeTip 
    ? ((currentBalance > 0 ? currentBalance : 100) * ((activeTip.recommendedStakePercent || 2) / 100)).toFixed(2)
    : '2.00';
  const potentialProfit = activeTip 
    ? (parseFloat(stakeAmount) * ((activeTip.odds || 1.85) - 1)).toFixed(2)
    : '1.70';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="h2h-analysis-modal"
      >
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                <Database className="w-3 h-3 text-indigo-400" />
                <span>Football-Data.org v4</span>
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {league || (sport === 'football' ? 'Football Européen' : sport.toUpperCase())}
              </span>
              {data?.hasLiveApiKey && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Clé API Live
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <Swords className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-black text-white">
                {homeTeam} <span className="text-slate-500 font-normal">vs</span> {awayTeam}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit des 5 dernières confrontations directes & validation de confiance avant pari
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-300">
          
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-200">Extraction des confrontations directes via Football-Data.org...</p>
              <p className="text-xs text-slate-400">Calcul des séquences de forme et de l'indice de boost statistique</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 space-y-2">
              <p className="font-bold">{errorMsg}</p>
              <button
                type="button"
                onClick={fetchH2H}
                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-xs font-bold text-white transition"
              >
                Réessayer
              </button>
            </div>
          ) : data ? (
            <>
              {/* 1. CONFIDENCE BOOST & PRE-BET VALIDATION BANNER */}
              <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-black">
                      <Flame className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Validation de Confiance H2H</span>
                        <span className="text-emerald-400 font-mono">+{data.confidenceBoost.boostPercentage}% Boost</span>
                      </div>
                      <div className="text-sm font-black text-white">
                        Indice de Fiabilité : <span className="text-emerald-400">{data.confidenceBoost.confidenceIndex}</span>
                      </div>
                    </div>
                  </div>

                  {activeTip && (
                    <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                      <span className="text-[10px] text-slate-400 block">Pari Recommandé</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {activeTip.market} @{activeTip.odds.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-indigo-100 leading-relaxed font-medium bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-900/40">
                  ⚡ <strong>Constat Clé :</strong> {data.confidenceBoost.keyPattern}
                </p>

                {/* Pre-bet Checklist */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Checklist Pré-Placement Validée :
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {data.confidenceBoost.preBetChecklist.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. STATS SUMMARY MATRIX */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* 1. Victory distribution */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 col-span-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Distribution des 5 Duels</span>
                    <span className="text-indigo-400 font-mono">{data.statsSummary.totalPlayed} Matchs</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-emerald-400">{homeTeam} ({data.statsSummary.homeWins}V)</span>
                    <span className="text-slate-400">Nuls ({data.statsSummary.draws}N)</span>
                    <span className="text-cyan-400">{awayTeam} ({data.statsSummary.awayWins}V)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${data.statsSummary.homeWinPct}%` }} 
                      title={`${homeTeam} ${data.statsSummary.homeWinPct}%`}
                    />
                    <div 
                      className="bg-slate-500 h-full" 
                      style={{ width: `${data.statsSummary.drawPct}%` }} 
                      title={`Nuls ${data.statsSummary.drawPct}%`}
                    />
                    <div 
                      className="bg-cyan-500 h-full" 
                      style={{ width: `${data.statsSummary.awayWinPct}%` }} 
                      title={`${awayTeam} ${data.statsSummary.awayWinPct}%`}
                    />
                  </div>
                </div>

                {/* 2. Goals average */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Moyenne Buts / Match</span>
                  <div className="text-base font-black text-amber-400 font-mono">
                    {data.statsSummary.avgGoalsPerMatch} buts
                  </div>
                  <span className="text-[10px] text-slate-500 block">Score fréquent: {data.statsSummary.mostCommonScoreline}</span>
                </div>

                {/* 3. Over 2.5 & BTTS */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Over 2.5 & BTTS</span>
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-slate-200">Over 2.5 : <strong className="text-emerald-400">{data.statsSummary.over25Percentage}%</strong></span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Les 2 Marquent : <strong className="text-indigo-300">{data.statsSummary.bttsPercentage}%</strong>
                  </div>
                </div>

              </div>

              {/* TABS SELECTOR */}
              <div className="flex items-center gap-2 border-b border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('matches')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'matches'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>5 Dernières Confrontations Directes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeTab === 'form'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Forme Récente (5 Derniers Matchs)</span>
                </button>
              </div>

              {/* TAB 1: 5 DIRECT ENCOUNTERS */}
              {activeTab === 'matches' && (
                <div className="space-y-2.5">
                  {data.last5Matches.map((m, idx) => {
                    const isHomeWin = m.winner === 'home';
                    const isAwayWin = m.winner === 'away';
                    const isDraw = m.winner === 'draw';

                    return (
                      <div 
                        key={m.id || idx}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl space-y-2 transition"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400 font-mono">{m.dateFormatted}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-400 font-semibold">{m.competition}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500">{m.venue}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {m.over25 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Over 2.5
                              </span>
                            )}
                            {m.btts && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                BTTS (Oui)
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDraw 
                                ? 'bg-slate-800 text-slate-300' 
                                : isHomeWin 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {isDraw ? 'Match Nul' : isHomeWin ? `Victoire ${m.homeTeam}` : `Victoire ${m.awayTeam}`}
                            </span>
                          </div>
                        </div>

                        {/* Match Scoreboard */}
                        <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                          <span className={`text-xs font-bold ${m.homeScore > m.awayScore ? 'text-white' : 'text-slate-400'}`}>
                            {m.homeTeam}
                          </span>

                          <div className="px-3 py-1 bg-slate-950 rounded-md border border-slate-800 text-sm font-black text-emerald-400 tracking-widest">
                            {m.homeScore} - {m.awayScore}
                          </div>

                          <span className={`text-xs font-bold ${m.awayScore > m.homeScore ? 'text-white' : 'text-slate-400'}`}>
                            {m.awayTeam}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 italic">
                          💡 {m.summaryHighlight}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: FORM SEQUENCES */}
              {activeTab === 'form' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Home Team Form */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                        {data.formLast5.homeTeam.teamName}
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {data.formLast5.homeTeam.winRatePct}% Victoires
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {data.formLast5.homeTeam.sequence.map((res, rIdx) => (
                        <div
                          key={rIdx}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold font-mono text-xs ${
                            res === 'V'
                              ? 'bg-emerald-600 text-white'
                              : res === 'N'
                              ? 'bg-slate-600 text-slate-100'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {res}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {data.formLast5.homeTeam.matches.map((fm, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                          <span className="text-slate-400">{fm.dateFormatted} vs {fm.opponent}</span>
                          <span className={`font-mono font-bold ${fm.result === 'V' ? 'text-emerald-400' : fm.result === 'N' ? 'text-slate-300' : 'text-rose-400'}`}>
                            {fm.score} ({fm.result})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Away Team Form */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                        {data.formLast5.awayTeam.teamName}
                      </h4>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {data.formLast5.awayTeam.winRatePct}% Victoires
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {data.formLast5.awayTeam.sequence.map((res, rIdx) => (
                        <div
                          key={rIdx}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold font-mono text-xs ${
                            res === 'V'
                              ? 'bg-emerald-600 text-white'
                              : res === 'N'
                              ? 'bg-slate-600 text-slate-100'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {res}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {data.formLast5.awayTeam.matches.map((fm, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                          <span className="text-slate-400">{fm.dateFormatted} vs {fm.opponent}</span>
                          <span className={`font-mono font-bold ${fm.result === 'V' ? 'text-emerald-400' : fm.result === 'N' ? 'text-slate-300' : 'text-rose-400'}`}>
                            {fm.score} ({fm.result})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </>
          ) : null}

        </div>

        {/* MODAL FOOTER WITH PLACEMENT BUTTONS */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Données : <strong>{data?.dataSourceLabel || 'Football-Data.org API'}</strong></span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
            >
              Fermer
            </button>

            {activeTip && onTrackBet && (
              isTracked ? (
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pari Déjà Suivi</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onTrackBet(activeTip, parseFloat(stakeAmount));
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Suivre ce Pari (+{potentialProfit} {currency})</span>
                </button>
              )
            )}

            {activeTip?.stakeUrl && (
              <a
                href={activeTip.stakeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-950/50 transition active:scale-95"
                title="Placer ce pari directement sur Stake.com avec la validation H2H"
              >
                <span>⚡ Parier en Confiance sur Stake.com (@{activeTip.odds.toFixed(2)})</span>
                <ExternalLink className="w-3 h-3 text-orange-200" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
