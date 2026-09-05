import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  Gauge, 
  Activity, 
  Check, 
  RefreshCw,
  HelpCircle,
  Scale,
  ArrowRight
} from 'lucide-react';
import { BetResult, StakeGameType, BettingStrategy } from '../types';
import { 
  generateBayesianOptimizationReport, 
  BayesianOptimizationReport 
} from '../utils/bayesianMultiplierOptimizer';
import { useTranslation } from '../i18n/LanguageContext';

interface BayesianOptimizerCardProps {
  recentBets: BetResult[];
  game: StakeGameType;
  currentMultiplier: number;
  currentBankroll: number;
  baseBet: number;
  drawdownPct: number;
  currentStreak: number;
  shannonEntropy?: number;
  currency: string;
  onApplyOptimalMultiplier?: (optimalMultiplier: number, optimalBetAmount: number) => void;
  isAutoTuningActive?: boolean;
  onToggleAutoTuning?: (active: boolean) => void;
}

export const BayesianOptimizerCard: React.FC<BayesianOptimizerCardProps> = ({
  recentBets,
  game,
  currentMultiplier,
  currentBankroll,
  baseBet,
  drawdownPct,
  currentStreak,
  shannonEntropy = 0.95,
  currency,
  onApplyOptimalMultiplier,
  isAutoTuningActive = false,
  onToggleAutoTuning,
}) => {
  const { t } = useTranslation();
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const report = useMemo<BayesianOptimizationReport>(() => {
    return generateBayesianOptimizationReport(
      recentBets,
      game,
      currentMultiplier,
      currentBankroll,
      baseBet,
      drawdownPct,
      currentStreak,
      shannonEntropy
    );
  }, [recentBets, game, currentMultiplier, currentBankroll, baseBet, drawdownPct, currentStreak, shannonEntropy]);

  const { posterior, multiplierOptimization, continuousKelly } = report;

  const handleApply = () => {
    if (onApplyOptimalMultiplier) {
      onApplyOptimalMultiplier(
        multiplierOptimization.optimalMultiplier,
        continuousKelly.recommendedBetAmount
      );
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-xl space-y-4 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {t('bayesian.title')}
              </h3>
              <span className="px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[9px] font-mono font-bold">
                {t('bayesian.badge')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {t('bayesian.subtitle')} ({posterior.sampleSize} rounds)
            </p>
          </div>
        </div>

        {onToggleAutoTuning && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-300 font-bold">{t('bayesian.autoTuning')} :</span>
            <button
              type="button"
              onClick={() => onToggleAutoTuning(!isAutoTuningActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isAutoTuningActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoTuningActive ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />
              <span>{isAutoTuningActive ? t('bayesian.active') : t('bayesian.activate')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid: 3 Quant Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
        
        {/* Pillar 1: Bayesian Posterior Distribution */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{t('bayesian.posteriorDistribution')}</span>
            </span>
            <span className="font-mono text-[10px] text-cyan-300 font-bold shrink-0">
              {t('bayesian.ci95')}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div className="text-xl font-black text-cyan-300 font-mono">
              {posterior.posteriorMeanProbability}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              [{posterior.credibleIntervalLow}% - {posterior.credibleIntervalHigh}%]
            </div>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" 
              style={{ width: `${Math.min(100, posterior.posteriorMeanProbability)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
            <span>α = {posterior.alpha} (wins)</span>
            <span>β = {posterior.beta} (losses)</span>
          </div>
        </div>

        {/* Pillar 2: Multiplier Sweet Spot Optimizer */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{t('bayesian.optimalMultiplier')}</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
              multiplierOptimization.multiplierAdjustmentDelta > 0 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                : multiplierOptimization.multiplierAdjustmentDelta < 0 
                ? 'bg-rose-950 text-rose-300 border border-rose-500/40' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              {multiplierOptimization.multiplierAdjustmentDelta > 0 ? `+${multiplierOptimization.multiplierAdjustmentDelta}x` : `${multiplierOptimization.multiplierAdjustmentDelta}x`}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div className="text-xl font-black text-amber-300 font-mono">
              {multiplierOptimization.optimalMultiplier.toFixed(2)}x
            </div>
            <div className="text-[11px] text-slate-400">
              {t('bayesian.current')} : <strong className="text-white font-mono">{currentMultiplier.toFixed(2)}x</strong>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-snug line-clamp-2 min-h-[28px] flex items-center">
            <span>{multiplierOptimization.recommendationReason}</span>
          </div>
        </div>

        {/* Pillar 3: Dynamic Continuous Kelly Sizing */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between min-h-[142px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">{t('bayesian.continuousKelly')}</span>
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-bold shrink-0">
              {continuousKelly.finalKellyFractionPercent}% {t('bayesian.bankroll')}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-1">
            <div className="text-xl font-black text-purple-300 font-mono">
              {continuousKelly.recommendedBetAmount} <span className="text-xs font-sans text-slate-400">{currency}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {continuousKelly.baseBetComparisonRatio}x {t('bayesian.base')}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="truncate">{t('bayesian.drawdownThrottle')} : {(continuousKelly.drawdownPenaltyFactor * 100).toFixed(0)}%</span>
            <span className="truncate">{t('bayesian.entropy')} : {(continuousKelly.entropySafetyFactor * 100).toFixed(0)}%</span>
          </div>
        </div>

      </div>

      {/* Action & Toggle Details */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showFormulaDetails ? t('bayesian.hideFormulas') : t('bayesian.showFormulas')}</span>
        </button>

        {onApplyOptimalMultiplier && (
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('bayesian.applyTarget')} ({multiplierOptimization.optimalMultiplier.toFixed(2)}x) & {t('bayesian.betAmount')} ({continuousKelly.recommendedBetAmount} {currency})</span>
          </button>
        )}
      </div>

      {/* Explanatory Dropdown */}
      {showFormulaDetails && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed animate-in fade-in">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('bayesian.mathModelTitle')} :</span>
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
            <li><strong>Conjugate Prior Beta-Binomial :</strong> α' = α₀ + k, β' = β₀ + (n - k)</li>
            <li><strong>Log-Growth Multiplier Search :</strong> max E[ln(1 + f(m - 1))] = p · ln(1 + f(m - 1)) + (1 - p) · ln(1 - f)</li>
            <li><strong>Kelly Continu Adaptatif :</strong> f* = ((p · m - 1) / (m - 1)) × Dampener × EntropyThrottle</li>
          </ul>
        </div>
      )}
    </div>
  );
};

