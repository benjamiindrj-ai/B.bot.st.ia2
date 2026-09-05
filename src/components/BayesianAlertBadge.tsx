import React, { useState } from 'react';
import { Zap, ShieldCheck, Sparkles, Target, Info, Flame, AlertCircle } from 'lucide-react';
import { 
  MIN_BAYESIAN_ODDS, 
  MAX_BAYESIAN_ODDS, 
  BAYESIAN_ALERT_CONFIDENCE_THRESHOLD,
  BayesianSportsRegressionResult,
  runBayesianSportsRegression 
} from '../utils/bayesianSportsRegression';

interface BayesianAlertBadgeProps {
  tip: {
    odds: number;
    confidenceScore: number;
    expectedValue?: number;
    market?: string;
    bayesianAnalysis?: BayesianSportsRegressionResult;
    [key: string]: any;
  };
  compact?: boolean;
  className?: string;
}

export const BayesianAlertBadge: React.FC<BayesianAlertBadgeProps> = ({
  tip,
  compact = false,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const odds = Number(tip.odds) || 0;
  const bayes: BayesianSportsRegressionResult = 
    tip.bayesianAnalysis || runBayesianSportsRegression(tip);

  const effectiveConfidence = bayes.bayesianConfidenceScore ?? tip.confidenceScore;
  const inTargetOddsRange = odds >= MIN_BAYESIAN_ODDS && odds <= MAX_BAYESIAN_ODDS;
  const isAlertTriggered = inTargetOddsRange && effectiveConfidence > BAYESIAN_ALERT_CONFIDENCE_THRESHOLD;

  // Si le seuil n'est pas franchi ou la cote est hors de la fenêtre cible, ne pas afficher l'alerte
  if (!isAlertTriggered) {
    return null;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer bg-gradient-to-r from-amber-500/25 via-emerald-500/30 to-cyan-500/25 border border-emerald-400/70 text-emerald-200 shadow-md shadow-emerald-950/60 hover:shadow-emerald-500/30 hover:border-emerald-300 hover:scale-[1.02] active:scale-[0.98]"
        title="Opportunité Prioritaire Bayésienne : Confiance > 80% & Cote dans la cible [1.15 - 1.85]"
      >
        {/* Pulsing beacon dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
        </span>

        {/* Icon */}
        <Zap className="w-3 h-3 text-amber-300 animate-pulse flex-shrink-0" />

        {/* Badge Label */}
        <span className="bg-gradient-to-r from-amber-200 via-emerald-200 to-cyan-200 bg-clip-text text-transparent font-black">
          ALERTE BAYÈS &gt; 80%
        </span>

        {/* Dynamic Metric Tag */}
        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
          {effectiveConfidence}%
        </span>

        {!compact && (
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-mono text-cyan-300/90 font-medium lowercase">
            <span>@</span>
            <span>{odds.toFixed(2)}</span>
            <span className="text-emerald-400/80 font-bold ml-0.5">cible ✓</span>
          </span>
        )}
      </button>

      {/* Floating Detailed Explanatory Card */}
      {showTooltip && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-0 mb-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-emerald-400/60 rounded-xl p-3 shadow-2xl shadow-black/90 text-left text-xs pointer-events-auto"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Alerte Algorithmique Bayésienne</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              CONF &gt; 80%
            </span>
          </div>

          <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
            Ce pari déclenche l'<strong>alerte maximale</strong> du modèle bayésien en combinant simultanément les deux exigences de rentabilité :
          </p>

          <div className="space-y-1.5 mt-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1 font-sans">
                <Target className="w-3 h-3 text-cyan-400" />
                Score de Confiance Bayésien :
              </span>
              <span className="font-bold text-emerald-400">{effectiveConfidence}% &gt; 80% ✓</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1 font-sans">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Fenêtre de Cotes Cible :
              </span>
              <span className="font-bold text-cyan-300">@{odds.toFixed(2)} ∈ [1.15 - 1.85] ✓</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Probabilité a posteriori E[p|D] :</span>
              <span className="font-bold text-slate-100">{bayes.posteriorWinProbability}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Espérance Validée (EV+) :</span>
              <span className="font-bold text-amber-300">+{bayes.bayesianExpectedValue}%</span>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>Priorisation maximale pour sécuriser les mises Kelly et éliminer le bruit statistique.</span>
          </div>
        </div>
      )}
    </div>
  );
};
