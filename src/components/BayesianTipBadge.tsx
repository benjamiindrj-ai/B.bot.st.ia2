import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Sparkles, Scale, Info, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { 
  BayesianSportsRegressionResult, 
  runBayesianSportsRegression,
  BAYESIAN_ALERT_CONFIDENCE_THRESHOLD,
  MIN_BAYESIAN_ODDS,
  MAX_BAYESIAN_ODDS 
} from '../utils/bayesianSportsRegression';

interface BayesianTipBadgeProps {
  tip: {
    odds: number;
    confidenceScore: number;
    expectedValue?: number;
    market?: string;
    aiEstimatedTrueProbability?: number;
    bookmakerImpliedProbability?: number;
    droppingOddsAlert?: any;
    sharpBenchmark?: any;
    advancedMetrics?: any;
    poissonModelScore?: any;
    marketMicrostructure?: any;
    bayesianAnalysis?: BayesianSportsRegressionResult;
  };
  compact?: boolean;
}

export const BayesianTipBadge: React.FC<BayesianTipBadgeProps> = ({ tip, compact = false }) => {
  const [showModal, setShowModal] = useState<boolean>(false);

  // Compute or reuse bayesian analysis
  const bayes: BayesianSportsRegressionResult = 
    tip.bayesianAnalysis || runBayesianSportsRegression(tip);

  const {
    odds,
    posteriorWinProbability,
    credibleIntervalLow,
    credibleIntervalHigh,
    bayesianConfidenceScore,
    bayesianExpectedValue,
    marketImpliedProb,
    isOddsValid,
    isHighConfidence,
    filterStatus,
    rejectionReason,
    recommendedKellyFractionPct,
  } = bayes;

  const isAlertOver80 = isOddsValid && bayesianConfidenceScore > BAYESIAN_ALERT_CONFIDENCE_THRESHOLD;

  // Status-based styling
  let badgeTheme = 'bg-slate-800 text-slate-400 border-slate-700';
  let statusText = 'Neutre';
  let icon = <Scale className="w-3 h-3 text-slate-400" />;

  if (isAlertOver80) {
    badgeTheme = 'bg-gradient-to-r from-amber-950/90 via-emerald-950/90 to-cyan-950/90 text-emerald-200 border-emerald-400/80 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/40';
    statusText = 'Alerte Bayésienne (>80%)';
    icon = <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />;
  } else if (filterStatus === 'qualified_top_priority') {
    badgeTheme = 'bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/40';
    statusText = 'Priorité Haute (>75%)';
    icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (filterStatus === 'qualified_standard') {
    badgeTheme = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
    statusText = 'Validé Bayésien';
    icon = <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
  } else if (filterStatus === 'rejected_odds_too_low' || filterStatus === 'rejected_odds_too_high') {
    badgeTheme = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
    statusText = 'Exclu (Cote hors [1.15-1.85])';
    icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(!showModal);
        }}
        title="Cliquez pour afficher l'audit probabiliste bayésien complet"
        className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] ${badgeTheme}`}
      >
        {icon}
        <span className="font-bold">Bayes:</span>
        <span className="font-mono">{posteriorWinProbability}%</span>
        {!compact && (
          <>
            <span className="text-slate-500">|</span>
            <span>Conf: <strong className={isAlertOver80 ? 'text-amber-300 font-mono font-bold' : isHighConfidence ? 'text-emerald-300 font-mono' : 'text-slate-300 font-mono'}>{bayesianConfidenceScore}%</strong></span>
            {isAlertOver80 ? (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 ml-0.5 flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                Alerte &gt;80%
              </span>
            ) : isHighConfidence ? (
              <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ml-0.5">
                Top &gt;75%
              </span>
            ) : null}
          </>
        )}
      </button>

      {/* Popover / Mini Audit Modal */}
      {showModal && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-0 mb-2 w-72 sm:w-80 bg-slate-900 border border-cyan-500/50 rounded-xl p-3.5 shadow-2xl shadow-black/80 text-left text-xs"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Audit Régression Bayésienne</span>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 mt-2.5">
            {/* Status notification */}
            <div className={`p-2 rounded-lg border flex items-start gap-2 ${
              isOddsValid 
                ? isHighConfidence 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                  : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              {isOddsValid ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="text-[11px] leading-tight">
                <strong>{statusText}</strong>
                {rejectionReason && <p className="text-[10px] opacity-90 mt-0.5">{rejectionReason}</p>}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Probabilité a posteriori :</span>
                <span className="text-emerald-400 font-bold text-sm">{posteriorWinProbability}%</span>
                <span className="text-[9px] text-slate-500 block font-sans">vs Implicite {marketImpliedProb}%</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Intervalle Crédibilité 95% :</span>
                <span className="text-cyan-300 font-bold">[{credibleIntervalLow}% - {credibleIntervalHigh}%]</span>
                <span className="text-[9px] text-slate-500 block font-sans">Incertitude résiduelle</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">Score de Confiance :</span>
                <span className={bayesianConfidenceScore > 75 ? 'text-emerald-300 font-bold' : 'text-slate-200 font-bold'}>
                  {bayesianConfidenceScore}% {bayesianConfidenceScore > 75 ? '★ Prioritaire' : ''}
                </span>
                <span className="text-[9px] text-slate-500 block font-sans">Seuil cible : &gt;75%</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">EV Bayésien E[p|D] :</span>
                <span className="text-amber-400 font-bold">+{bayesianExpectedValue}%</span>
                <span className="text-[9px] text-slate-500 block font-sans">Kelly : {recommendedKellyFractionPct}%</span>
              </div>
            </div>

            {/* Odds constraint check */}
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Cote Actuelle : <strong className="text-slate-100 font-mono">{odds.toFixed(2)}</strong></span>
              <span className={`font-semibold ${isOddsValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOddsValid ? '✓ Plage [1.15 - 1.85] Respectée' : '✗ Hors Plage [1.15 - 1.85]'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
