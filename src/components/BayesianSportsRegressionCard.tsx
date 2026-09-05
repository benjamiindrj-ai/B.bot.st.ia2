import React, { useState } from 'react';
import { 
  Sparkles, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sliders, 
  Scale, 
  Target,
  BarChart3,
  Zap
} from 'lucide-react';
import { MIN_BAYESIAN_ODDS, MAX_BAYESIAN_ODDS, HIGH_CONFIDENCE_THRESHOLD, BAYESIAN_ALERT_CONFIDENCE_THRESHOLD } from '../utils/bayesianSportsRegression';

interface BayesianSportsRegressionCardProps {
  isBayesianFilterActive: boolean;
  onToggleBayesianFilter: (active: boolean) => void;
  strictOddsRange: boolean;
  onToggleStrictOddsRange: (active: boolean) => void;
  prioritizeHighConfidence: boolean;
  onTogglePrioritizeHighConfidence: (active: boolean) => void;
  onlyHighConfidence: boolean;
  onToggleOnlyHighConfidence: (active: boolean) => void;
  onlyAlertOver80?: boolean;
  onToggleOnlyAlertOver80?: (active: boolean) => void;
  totalMatchesCount: number;
  qualifiedMatchesCount: number;
  excludedCount: number;
  highConfidenceCount: number;
  alertOver80Count?: number;
  avgOdds: number;
  avgConfidence: number;
  avgBayesianEv: number;
}

export const BayesianSportsRegressionCard: React.FC<BayesianSportsRegressionCardProps> = ({
  isBayesianFilterActive,
  onToggleBayesianFilter,
  strictOddsRange,
  onToggleStrictOddsRange,
  prioritizeHighConfidence,
  onTogglePrioritizeHighConfidence,
  onlyHighConfidence,
  onToggleOnlyHighConfidence,
  onlyAlertOver80 = false,
  onToggleOnlyAlertOver80,
  totalMatchesCount,
  qualifiedMatchesCount,
  excludedCount,
  highConfidenceCount,
  alertOver80Count = 0,
  avgOdds,
  avgConfidence,
  avgBayesianEv,
}) => {
  const [showMathDetails, setShowMathDetails] = useState<boolean>(false);

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-lg shadow-cyan-950/20 backdrop-blur-sm mb-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                Module Probabiliste & Régression Bayésienne
              </h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isBayesianFilterActive 
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 animate-pulse' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isBayesianFilterActive ? '● Filtrage Actif' : '○ En Veille'}
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                1.15 ≤ Cote ≤ 1.85
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Confiance &gt; 75%
              </span>
              {alertOver80Count > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-sm animate-pulse">
                  <Zap className="w-2.5 h-2.5 text-amber-300" />
                  <span>{alertOver80Count} Alerte(s) &gt; 80%</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtrage prédictif unvigged : alertes prioritaires &gt; 80% dans la fenêtre [1.15 - 1.85] et exclusion du bruit statistique
            </p>
          </div>
        </div>

        {/* Master Active Toggle & Quick Action */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onToggleBayesianFilter(!isBayesianFilterActive)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md ${
              isBayesianFilterActive
                ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-500/25 border border-cyan-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isBayesianFilterActive ? 'Désactiver Filtre' : 'Activer Régression'}</span>
          </button>

          <button
            onClick={() => setShowMathDetails(!showMathDetails)}
            className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 cursor-pointer"
            title="Détails du modèle logit-bayésien"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Modèle Math</span>
            {showMathDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Interactive Controls & Rules toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3.5">
        {/* Rule 1: Strict Odds Range [1.15 - 1.85] */}
        <button
          onClick={() => onToggleStrictOddsRange(!strictOddsRange)}
          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
            strictOddsRange
              ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-200 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${strictOddsRange ? 'bg-cyan-400' : 'bg-slate-600'}`} />
              <span className="text-xs font-bold text-slate-200">Plage Cotes [1.15 – 1.85]</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Exclut systématiquement toute cote &lt; 1.15 (danger asymétrique) ou &gt; 1.85 (variance)
            </p>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${
            strictOddsRange ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
          }`}>
            {strictOddsRange ? 'Strict ON' : 'OFF'}
          </span>
        </button>

        {/* Rule 2: Prioritize Confidence > 75% */}
        <button
          onClick={() => onTogglePrioritizeHighConfidence(!prioritizeHighConfidence)}
          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
            prioritizeHighConfidence
              ? 'bg-emerald-950/40 border-emerald-500/50 text-slate-200 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${prioritizeHighConfidence ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-xs font-bold text-slate-200">Priorité Confiance &gt; 75%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Épingle au sommet les opportunités avec probabilité a posteriori validée &gt; 75%
            </p>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${
            prioritizeHighConfidence ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
          }`}>
            {prioritizeHighConfidence ? 'Priorité ON' : 'OFF'}
          </span>
        </button>

        {/* Rule 3: Only High Confidence (>75%) Strict Isolation */}
        <button
          onClick={() => onToggleOnlyHighConfidence(!onlyHighConfidence)}
          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
            onlyHighConfidence
              ? 'bg-amber-950/40 border-amber-500/50 text-slate-200 shadow-sm'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${onlyHighConfidence ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span className="text-xs font-bold text-slate-200">Isolation Stricte &gt; 75%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Masque les matchs à confiance modérée (≤ 75%) pour ne conserver que l'élite probabiliste
            </p>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${
            onlyHighConfidence ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
          }`}>
            {onlyHighConfidence ? 'Actif' : 'Inactif'}
          </span>
        </button>

        {/* Rule 4: Visual Alert & Target Window Isolation (>80% in [1.15 - 1.85]) */}
        <button
          onClick={() => onToggleOnlyAlertOver80 && onToggleOnlyAlertOver80(!onlyAlertOver80)}
          className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
            onlyAlertOver80
              ? 'bg-gradient-to-r from-amber-950/60 via-emerald-950/60 to-cyan-950/60 border-emerald-400/70 text-emerald-200 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/40'
              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${onlyAlertOver80 ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <span>Alerte Visuelle &gt; 80%</span>
                <span className="text-[9px] font-mono font-normal text-emerald-400">(@1.15-1.85)</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              Met en évidence (badge néon) les opportunités combinant Confiance &gt; 80% et Cote Cible
            </p>
          </div>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ml-2 ${
            onlyAlertOver80 
              ? 'bg-gradient-to-r from-amber-500/30 to-emerald-500/30 text-emerald-200 border border-emerald-400/60' 
              : 'bg-slate-800 text-slate-500'
          }`}>
            {onlyAlertOver80 ? 'Filtré' : `${alertOver80Count} Dispo`}
          </span>
        </button>
      </div>

      {/* Live Quant Metrics KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Matchs Qualifiés</div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-100">
              {qualifiedMatchesCount}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {totalMatchesCount}</span>
            </div>
            {excludedCount > 0 && (
              <div className="text-[9px] text-rose-400 font-medium">
                {excludedCount} exclu(s) hors [1.15-1.85]
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Confiance &gt; 75%</div>
            <div className="text-sm sm:text-base font-mono font-bold text-emerald-400">
              {highConfidenceCount}
            </div>
            <div className="text-[9px] text-slate-500">
              Moy: {avgConfidence}%
            </div>
          </div>
        </div>

        {/* Alerte > 80% Highlight KPI */}
        <div className="bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-slate-950/60 border border-emerald-500/50 rounded-xl p-2.5 flex items-center gap-2.5 relative overflow-hidden">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
            <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
              <span>Alertes &gt; 80%</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-sm sm:text-base font-mono font-black text-amber-300">
              {alertOver80Count}
            </div>
            <div className="text-[9px] text-emerald-400/90 font-mono">
              Cote [1.15-1.85] ✓
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">Cote Moyenne</div>
            <div className="text-sm sm:text-base font-mono font-bold text-indigo-300">
              {avgOdds.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-500">
              Cible: [1.15 – 1.85]
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium">EV Bayésien</div>
            <div className="text-sm sm:text-base font-mono font-bold text-amber-300">
              +{avgBayesianEv.toFixed(1)}%
            </div>
            <div className="text-[9px] text-emerald-400">
              Espérance E[p|D]
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Mathematical Documentation */}
      {showMathDetails && (
        <div className="mt-3.5 pt-3.5 border-t border-slate-800 bg-slate-950/80 rounded-xl p-3 text-xs text-slate-300 space-y-2">
          <div className="font-bold text-cyan-400 flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            Fonctionnement de la Régression Logit-Bayésienne Sportive
          </div>
          <p className="text-slate-400 leading-relaxed">
            Le modèle bayésien régularise l'estimation des probabilités de gain réelles à partir du prior implicite du marché 
            (cote dé-marzinée, <code className="text-cyan-300">μ_prior = logit(p_unvigged)</code>) combiné au vecteur de preuves 
            empiriques observables <code className="text-cyan-300">X = [X_sharp, X_xg, X_micro, X_trend]</code> :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-cyan-400 font-bold">1. Log-Odds a posteriori :</span>
              <br />
              μ_post = μ_prior + 0.38·X_sharp + 0.45·X_xg + 0.25·X_micro + 0.20·X_trend
            </div>
            <div>
              <span className="text-emerald-400 font-bold">2. Probabilité a posteriori & IC 95% :</span>
              <br />
              P_bayes = σ(μ_post), IC 95% = [σ(μ - 1.96σ), σ(μ + 1.96σ)]
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Plage verrouillée [1.15 - 1.85] évite la ruine du parieur et la variance démesurée.
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Les matchs avec Confiance &gt; 75% bénéficient d'un sur-classement prioritaire absolu.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
