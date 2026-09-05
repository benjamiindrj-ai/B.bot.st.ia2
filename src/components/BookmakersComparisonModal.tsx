import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Target,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Scale,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
} from 'lucide-react';
import { BookmakerComparisonData, BookmakerQuoteItem, SportTip } from '../types';

interface BookmakersComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  league?: string;
  marketName?: string;
  stakeOdds?: number;
  activeTip?: SportTip | null;
  currency?: string;
  currentBalance?: number;
  onTrackBet?: (tip: SportTip, stakeAmount: number) => void;
  isTracked?: boolean;
}

export const BookmakersComparisonModal: React.FC<BookmakersComparisonModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  sport = 'football',
  league = '',
  marketName = '',
  stakeOdds = 1.95,
  activeTip,
  currency = 'USDT',
  currentBalance = 100,
  onTrackBet,
  isTracked = false,
}) => {
  const [data, setData] = useState<BookmakerComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('the_odds_api_key') || '';
      if (savedKey) setApiKeyInput(savedKey);
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchComparison = async () => {
    if (!homeTeam || !awayTeam) return;
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKeyInput.trim()) {
        headers['x-odds-api-key'] = apiKeyInput.trim();
      }
      try {
        const savedCreds = localStorage.getItem('stake_bot_api_credentials');
        if (savedCreds) {
          const creds = JSON.parse(savedCreds);
          if (creds.apiKey) headers['x-stake-api-token'] = creds.apiKey;
          if (creds.domain) headers['x-stake-domain'] = creds.domain;
        }
      } catch (e) {
        // ignore
      }

      const res = await fetch('/api/sports/bookmakers-comparison', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          sport,
          league,
          marketName: marketName || activeTip?.market || 'Vainqueur du Match',
          stakeOdds: stakeOdds || activeTip?.odds || 1.95,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des cotes');
      }
    } catch (err: any) {
      console.error('Failed to load bookmaker comparison:', err);
      setError(err.message || 'Impossible de comparer les bookmakers pour ce match.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && homeTeam && awayTeam) {
      fetchComparison();
    }
  }, [isOpen, homeTeam, awayTeam, marketName, stakeOdds]);

  const handleSaveApiKey = () => {
    try {
      if (apiKeyInput.trim()) {
        localStorage.setItem('the_odds_api_key', apiKeyInput.trim());
      } else {
        localStorage.removeItem('the_odds_api_key');
      }
    } catch (e) {
      // ignore
    }
    setShowApiKeyInput(false);
    fetchComparison();
  };

  if (!isOpen) return null;

  const currentStakeOdds = data?.stake.odds || stakeOdds;
  const matchTitle = `${homeTeam} vs ${awayTeam}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Comparateur Multi-Bookmakers & Sharp Benchmark
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {data?.isLiveRealTime ? 'Flux En Direct (The-Odds-API)' : 'Calibrage Temps Réel (Stake & Pinnacle)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <span className="text-white font-semibold">{matchTitle}</span> — {league || sport} ({marketName || activeTip?.market || '1X2'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchComparison}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Rafraîchir les cotes en direct"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200">

          {/* Optional API Key banner */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Données synchronisées avec <strong>Stake.com</strong>, <strong>Pinnacle</strong>, <strong>Bet365</strong> & <strong>Betfair</strong>.
              </span>
            </div>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline text-left"
            >
              {showApiKeyInput ? 'Masquer clé API' : 'Configurer clé The-Odds-API (Optionnel)'}
            </button>
          </div>

          {showApiKeyInput && (
            <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-3 animate-fadeIn">
              <div className="text-xs text-slate-300">
                Entrez votre clé gratuite <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-bold">The-Odds-API</a> (500 requêtes/mois gratuites) pour interroger directement le flux live des bookmakers :
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ex: 1a2b3c4d5e6f7g8h9i..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Enregistrer & Actualiser
                </button>
              </div>
            </div>
          )}

          {isLoading && !data && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Interrogation des cotes en temps réel...</p>
              <p className="text-xs text-slate-400">Comparaison de Stake.com vs Pinnacle, Bet365, Betfair Exchange...</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/40 border border-rose-600/50 rounded-xl p-4 text-xs text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Erreur de récupération :</strong>
                {error}
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Summary KPIs Bento Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Best Odds Bookmaker */}
                <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/40 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    Meilleure Cote Marché
                  </span>
                  <div className="text-2xl font-black text-emerald-300 font-mono">
                    @{data.bestOdds.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-300 block truncate font-medium">
                    {data.bestBookmaker}
                  </span>
                </div>

                {/* 2. Stake.com Cote */}
                <div className="bg-gradient-to-br from-orange-950/60 to-slate-950 border border-orange-500/40 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-orange-400 flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    Cote Stake.com
                  </span>
                  <div className="text-2xl font-black text-orange-300 font-mono">
                    @{data.stake.odds.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-300 block font-medium">
                    Marge : {data.stake.marginPercent}% (Réduite)
                  </span>
                </div>

                {/* 3. Pinnacle Sharp Benchmark */}
                <div className="bg-gradient-to-br from-blue-950/60 to-slate-950 border border-blue-500/40 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center justify-center gap-1">
                    <Target className="w-3.5 h-3.5 text-blue-400" />
                    Pinnacle (Sharp)
                  </span>
                  <div className="text-2xl font-black text-blue-300 font-mono">
                    @{data.pinnacle.odds.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-300 block font-medium">
                    Fair Line : @{data.pinnacle.noVigFairOdds.toFixed(2)}
                  </span>
                </div>

                {/* 4. Edge & CLV Index */}
                <div className="bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-500/40 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    Avantage Stake (EV+)
                  </span>
                  <div className="text-2xl font-black text-indigo-300 font-mono">
                    {data.stakeEdgeVsPinnacle >= 0 ? `+${data.stakeEdgeVsPinnacle}%` : `${data.stakeEdgeVsPinnacle}%`}
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-bold font-mono">
                    {data.clvIndex}
                  </span>
                </div>
              </div>

              {/* Sharp Signal Commentary */}
              <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Audit Quantitatif & Signal de Marché Pro :</span>
                    {data.stakeEdgeVsPinnacle >= 2.0 && (
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        VALUE BET CONFIRMÉ
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {data.sharpSignal}
                  </p>
                </div>
              </div>

              {/* Full Multi-Bookmaker Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                    <Scale className="w-3.5 h-3.5 text-blue-400" />
                    Comparatif Exhaustif des Opérateurs & Exchanges
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Consensus : @{data.consensusOdds.toFixed(2)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] uppercase font-bold text-slate-400">
                        <th className="p-3">Bookmaker / Opérateur</th>
                        <th className="p-3 text-center">Cote Affichée</th>
                        <th className="p-3 text-center">Proba Implicite</th>
                        <th className="p-3 text-center">Marge Bookmaker</th>
                        <th className="p-3 text-center">Écart vs Stake</th>
                        <th className="p-3 text-right">Statut Marché</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.quotes.map((q, idx) => {
                        const isStake = q.bookmakerKey === 'stake';
                        const isPinnacle = q.bookmakerKey === 'pinnacle';

                        return (
                          <tr
                            key={idx}
                            className={`transition hover:bg-slate-900/50 ${
                              isStake ? 'bg-orange-950/20 font-semibold' : isPinnacle ? 'bg-blue-950/20' : ''
                            }`}
                          >
                            <td className="p-3 flex items-center gap-2">
                              {isStake ? (
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                              ) : isPinnacle ? (
                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-slate-600" />
                              )}
                              <span className="text-slate-200 font-bold">{q.bookmakerName}</span>
                              {q.isBestOdds && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Top Cote 👑
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-base">
                              <span className={q.isBestOdds ? 'text-emerald-400' : isStake ? 'text-orange-300' : 'text-slate-200'}>
                                @{q.odds.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-300">
                              {q.impliedProbability}%
                            </td>
                            <td className="p-3 text-center text-slate-400 font-mono">
                              {q.marginPercent ? `${q.marginPercent}%` : '~3.5%'}
                            </td>
                            <td className="p-3 text-center font-mono text-xs">
                              {isStake ? (
                                <span className="text-slate-400 font-bold">Base (0%)</span>
                              ) : q.odds > data.stake.odds ? (
                                <span className="text-emerald-400 font-bold">+{(((q.odds / data.stake.odds) - 1) * 100).toFixed(1)}%</span>
                              ) : (
                                <span className="text-rose-400 font-bold">-{(((data.stake.odds / q.odds) - 1) * 100).toFixed(1)}%</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isStake ? (
                                <span className="px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-bold">
                                  Votre Plateforme
                                </span>
                              ) : isPinnacle ? (
                                <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                  Sharp Reference
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Grand Public</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Direct Stake.com Action Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  <span>Sélection Stake : <strong className="text-white">@{currentStakeOdds.toFixed(2)}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Mise suggérée : <strong className="text-emerald-400">1.5% ({(currentBalance * 0.015).toFixed(2)} {currency})</strong></span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {activeTip && onTrackBet && (
                    <button
                      onClick={() => onTrackBet(activeTip, currentBalance * 0.015)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isTracked
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isTracked ? 'Déjà Suivi' : 'Suivre ce Pari'}</span>
                    </button>
                  )}

                  <a
                    href={activeTip?.stakeUrl || 'https://stake.com/sports'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-orange-950/50 transition active:scale-95"
                  >
                    <span>⚡ Parier sur Stake.com (@{currentStakeOdds.toFixed(2)})</span>
                    <ExternalLink className="w-3.5 h-3.5 text-orange-200" />
                  </a>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
