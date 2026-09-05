import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Target,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  RotateCcw,
  Scale,
  BrainCircuit,
  Award,
  ChevronRight,
  Clock,
  Swords,
  Copy,
  Check
} from 'lucide-react';
import { SingleMatchAnalysis } from '../types';

interface SingleMatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: string;
  sport: string;
  league: string;
  homeTeam?: string;
  awayTeam?: string;
  market?: string;
  odds?: number;
  kickoffTime?: string;
}

export const SingleMatchAnalysisModal: React.FC<SingleMatchAnalysisModalProps> = ({
  isOpen,
  onClose,
  match,
  sport,
  league,
  homeTeam,
  awayTeam,
  market,
  odds,
  kickoffTime,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SingleMatchAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/analyze-single-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match,
          sport,
          league,
          homeTeam,
          awayTeam,
          market,
          odds,
          kickoffTime,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération de l’analyse IA');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de charger l’analyse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && match) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
      setError(null);
    }
  }, [isOpen, match, sport, odds]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!analysis) return;
    const text = `🧠 Analyse IA Personnalisée des Participants : ${analysis.match} (${analysis.league})
📊 Marché : ${analysis.market} @${analysis.odds} (EV: +${analysis.mathematicalEdge?.expectedValuePct || 0}%)
🎯 Score Prédit : ${analysis.scorePrediction?.predictedScore}
⚽ ${analysis.homeTeam} : ${analysis.homeTeamAnalysis?.tacticalIdentity}
🛡️ ${analysis.awayTeam} : ${analysis.awayTeamAnalysis?.tacticalIdentity}
⚔️ Choc Tactique : ${analysis.tacticalMatchup?.clashDescription}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {sport.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                  {league || 'Ligue Officielle'}
                </span>
                {kickoffTime && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <Clock className="w-3 h-3" />
                    {kickoffTime}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                {match}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!analysis || loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5"
              title="Copier le rapport"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copié' : 'Copier'}</span>
            </button>
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5"
              title="Actualiser l'analyse"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <BrainCircuit className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Analyse Individuelle des Participants en Cours...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Gemini examine les tactiques, formes récentes, forces/faiblesses et l’edge mathématique sur Stake Sportsbook.
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Erreur d’analyse</p>
                <p className="text-xs mt-1 text-rose-300">{error}</p>
                <button
                  onClick={fetchAnalysis}
                  className="mt-3 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg transition"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-6">
              
              {/* Value Bet & Quantitative Edge Banner */}
              <div className="bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Value Bet EV+
                      </span>
                      <span className="text-xs text-slate-400">
                        {analysis.source || 'Modèle Prédictif Stake Quant'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">
                      Marché Recommandé : <span className="text-cyan-400">{analysis.mathematicalEdge?.marketRecommended || analysis.market}</span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {analysis.mathematicalEdge?.rationale}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 px-4 py-3 rounded-xl flex-shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Cote Stake</p>
                      <p className="text-xl font-black text-amber-400">@{analysis.odds}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Expected Value</p>
                      <p className="text-xl font-black text-emerald-400">+{analysis.mathematicalEdge?.expectedValuePct || 0}%</p>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Mise Kelly</p>
                      <p className="text-xl font-black text-cyan-400">{analysis.mathematicalEdge?.kellyStakePct || 1.5}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Head to Head Participant Breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Profil Détaillé des Participants
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Home Participant Card */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                          1
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Domicile / Favori</p>
                          <h5 className="text-base font-black text-white">{analysis.homeTeamAnalysis?.name || analysis.homeTeam}</h5>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Dynamique & Forme</p>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                        {analysis.homeTeamAnalysis?.formSummary}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Identité Tactique</p>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                        {analysis.homeTeamAnalysis?.tacticalIdentity}
                      </p>
                    </div>

                    {analysis.homeTeamAnalysis?.strengths && analysis.homeTeamAnalysis.strengths.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase text-emerald-400 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Forces Clés
                        </p>
                        <ul className="space-y-1">
                          {analysis.homeTeamAnalysis.strengths.map((str, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.homeTeamAnalysis?.weaknesses && analysis.homeTeamAnalysis.weaknesses.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase text-rose-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Faiblesses / Vulnérabilités
                        </p>
                        <ul className="space-y-1">
                          {analysis.homeTeamAnalysis.weaknesses.map((wk, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-rose-400 mt-0.5">•</span>
                              <span>{wk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.homeTeamAnalysis?.keyPlayers && analysis.homeTeamAnalysis.keyPlayers.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <p className="text-[11px] font-bold uppercase text-amber-400 mb-1.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Joueurs / Éléments Décisifs
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.homeTeamAnalysis.keyPlayers.map((kp, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              {kp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Away Participant Card */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs">
                          2
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-semibold">Extérieur / Challenger</p>
                          <h5 className="text-base font-black text-white">{analysis.awayTeamAnalysis?.name || analysis.awayTeam}</h5>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Dynamique & Forme</p>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                        {analysis.awayTeamAnalysis?.formSummary}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Identité Tactique</p>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                        {analysis.awayTeamAnalysis?.tacticalIdentity}
                      </p>
                    </div>

                    {analysis.awayTeamAnalysis?.strengths && analysis.awayTeamAnalysis.strengths.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase text-emerald-400 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Forces Clés
                        </p>
                        <ul className="space-y-1">
                          {analysis.awayTeamAnalysis.strengths.map((str, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.awayTeamAnalysis?.weaknesses && analysis.awayTeamAnalysis.weaknesses.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase text-rose-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Faiblesses / Vulnérabilités
                        </p>
                        <ul className="space-y-1">
                          {analysis.awayTeamAnalysis.weaknesses.map((wk, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                              <span className="text-rose-400 mt-0.5">•</span>
                              <span>{wk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.awayTeamAnalysis?.keyPlayers && analysis.awayTeamAnalysis.keyPlayers.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <p className="text-[11px] font-bold uppercase text-amber-400 mb-1.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Joueurs / Éléments Décisifs
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.awayTeamAnalysis.keyPlayers.map((kp, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              {kp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tactical Matchup & Clash of Styles */}
              {analysis.tacticalMatchup && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Opposition Tactique & Choc des Styles
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    {analysis.tacticalMatchup.clashDescription}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-cyan-400 mb-1">Zone Déterminante</p>
                      <p className="text-xs text-slate-300">{analysis.tacticalMatchup.keyZoneDuel}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Rythme / Pressing</p>
                      <p className="text-xs text-slate-300">{analysis.tacticalMatchup.pressingAndPaceOutlook}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Fraîcheur & Blessures</p>
                      <p className="text-xs text-slate-300">{analysis.tacticalMatchup.injuryAndFatigueContext}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Score Prediction & Scenario */}
              {analysis.scorePrediction && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs uppercase font-bold text-slate-400">Score Exact Estimé (Modèle Poisson / xG)</h4>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {analysis.scorePrediction.predictedScore}
                    </p>
                    <p className="text-xs text-slate-400 max-w-lg">
                      {analysis.scorePrediction.scenario}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 text-center flex-shrink-0">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">xG Domicile</p>
                      <p className="text-base font-black text-blue-400">{analysis.scorePrediction.homeExpGoals}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">xG Extérieur</p>
                      <p className="text-base font-black text-indigo-400">{analysis.scorePrediction.awayExpGoals}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Participant Stats Chips */}
              {analysis.keyParticipantStats && analysis.keyParticipantStats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Statistiques Quantitatives Propres au Match
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.keyParticipantStats.map((st, i) => (
                      <div key={i} className="bg-slate-950/60 border border-slate-800/80 px-3 py-2 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Synchronisé avec l’infrastructure Stake.com</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
