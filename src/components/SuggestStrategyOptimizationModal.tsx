import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  X, 
  ArrowRight, 
  Activity, 
  AlertTriangle, 
  RotateCcw, 
  Scale, 
  Zap, 
  Lock, 
  Gauge, 
  Lightbulb, 
  CheckCircle2, 
  FileText,
  Percent,
  Play
} from 'lucide-react';
import { BettingStrategy, BetResult, BotStatistics, StrategyOptimizationSuggestion } from '../types';

interface SuggestStrategyOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: BettingStrategy;
  stats?: BotStatistics;
  bets?: BetResult[];
  balance: number;
  currency: string;
  onApplyOptimizedStrategy: (optimized: BettingStrategy) => void;
  onStartAutoBet?: () => void;
}

export const SuggestStrategyOptimizationModal: React.FC<SuggestStrategyOptimizationModalProps> = ({
  isOpen,
  onClose,
  strategy,
  stats,
  bets = [],
  balance,
  currency,
  onApplyOptimizedStrategy,
  onStartAutoBet,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<StrategyOptimizationSuggestion | null>(null);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'recommendations' | 'rationale' | 'full_diff'>('recommendations');

  // Fetch optimization suggestions whenever opened
  useEffect(() => {
    if (isOpen) {
      fetchOptimization();
      setAppliedSuccessfully(false);
    } else {
      setSuggestion(null);
      setError(null);
    }
  }, [isOpen, strategy.id, strategy.targetMultiplier, strategy.onLossAction, strategy.onLossValue]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchOptimization = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/suggest-strategy-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          stats: stats || {
            totalBets: bets.length,
            totalWon: bets.filter(b => b.won).length,
            totalLost: bets.filter(b => !b.won).length,
            winRate: bets.length > 0 ? Number(((bets.filter(b => b.won).length / bets.length) * 100).toFixed(1)) : 50,
            netProfit: bets.reduce((acc, b) => acc + (b.profit || 0), 0),
            maxLossStreak: 0,
            maxWinStreak: 0,
            maxDrawdown: 0,
          },
          bets: bets.slice(-50),
          balance: balance > 0 ? balance : 100,
          currency,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data: StrategyOptimizationSuggestion = await res.json();
      setSuggestion(data);
    } catch (err: any) {
      console.error('Failed to fetch strategy optimization:', err);
      setError(err.message || 'Impossible de générer l\'optimisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion?.optimizedStrategy) return;
    onApplyOptimizedStrategy(suggestion.optimizedStrategy);
    setAppliedSuccessfully(true);
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  const handleApplyAndRun = () => {
    if (!suggestion?.optimizedStrategy) return;
    onApplyOptimizedStrategy(suggestion.optimizedStrategy);
    setAppliedSuccessfully(true);
    setTimeout(() => {
      onClose();
      if (onStartAutoBet) {
        onStartAutoBet();
      }
    }, 700);
  };

  if (!isOpen) return null;

  const currentLossAction = strategy.onLossAction || 'reset';
  const currentLossVal = strategy.onLossValue !== undefined ? strategy.onLossValue : 1.0;
  const currentTargetMult = strategy.targetMultiplier || 2.0;
  const currentWinChance = strategy.winChance || Number((((1 / currentTargetMult) * 0.99) * 100).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        id="strategy-optimization-modal-container"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Optimisation de Stratégie par IA
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Risk Management & Cibles
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyse quantitative de l'historique pour ajuster <span className="text-amber-300 font-mono">onLossAction</span> et <span className="text-emerald-300 font-mono">targetMultiplier</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">

          {/* Loading State */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Analyse Quantitatif de l'Historique en cours...</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Évaluation de la variance, calcul des séries noires max, simulation Monte-Carlo de ruine et recalibrage de l'espérance mathématique.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Échec de l'optimisation</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
                <button
                  onClick={fetchOptimization}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réessayer l'analyse
                </button>
              </div>
            </div>
          )}

          {/* Suggestion Loaded View */}
          {suggestion && !isLoading && (
            <div className="space-y-6">

              {/* Status Banner / Header of Analysis */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      {suggestion.analysisTitle || 'Optimisation de Résilience & Désamorçage'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Stratégie active : <span className="font-semibold text-slate-200">{strategy.name}</span> ({strategy.game.toUpperCase()}) • Bankroll analysée : <span className="font-semibold text-emerald-400">{balance} {currency}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Niveau de Risque</span>
                    <span className={`text-xs font-extrabold ${
                      suggestion.riskAssessment === 'Critique' ? 'text-rose-400' :
                      suggestion.riskAssessment === 'Élevé' ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {suggestion.riskAssessment}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk & Ruin Score Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Risk Score */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Score d'Exposition au Risque</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-rose-400 font-mono">{suggestion.riskScoreBefore}/10</span>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <span className="text-base font-bold text-emerald-400 font-mono">{suggestion.riskScoreAfter}/10</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-1">
                        -{Math.max(0, suggestion.riskScoreBefore - suggestion.riskScoreAfter)} pts
                      </span>
                    </div>
                  </div>
                  <Gauge className="w-6 h-6 text-indigo-400/80" />
                </div>

                {/* Probability of Ruin */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Probabilité de Ruine (500 paris)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-rose-400 font-mono">{suggestion.ruinProbabilityBefore}%</span>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <span className="text-base font-bold text-emerald-400 font-mono">{suggestion.ruinProbabilityAfter}%</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-1">
                        Sécurisé
                      </span>
                    </div>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-400/80" />
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveSubTab('recommendations')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'recommendations'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Ajustements Conseillés
                </button>
                <button
                  onClick={() => setActiveSubTab('rationale')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'rationale'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Raisonnement Mathématique & IA
                </button>
                <button
                  onClick={() => setActiveSubTab('full_diff')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'full_diff'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Comparatif Avant / Après
                </button>
              </div>

              {/* Tab 1: Direct Recommendations Cards */}
              {activeSubTab === 'recommendations' && (
                <div className="space-y-4">
                  {/* Key Recommendation 1: onLossAction */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/90 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Action sur Perte (onLossAction)</h4>
                          <span className="text-[11px] text-slate-400">Régulation des pertes consécutives</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 line-through">
                          {currentLossAction} ({currentLossVal}x)
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          {suggestion.recommendedAdjustments.onLossAction} ({suggestion.recommendedAdjustments.onLossValue}x)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 mt-2">
                      {suggestion.recommendedAdjustments.onLossExplanation}
                    </p>
                  </div>

                  {/* Key Recommendation 2: targetMultiplier */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/90 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Multiplicateur Cible (targetMultiplier)</h4>
                          <span className="text-[11px] text-slate-400">Équilibre cote / taux de réussite</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 line-through">
                          @{currentTargetMult}x ({currentWinChance}%)
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          @{suggestion.recommendedAdjustments.targetMultiplier}x ({suggestion.optimizedStrategy.winChance}%)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 mt-2">
                      {suggestion.recommendedAdjustments.targetMultiplierExplanation}
                    </p>
                  </div>

                  {/* Key Findings from Bet History */}
                  {suggestion.keyFindings && suggestion.keyFindings.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        Constats Clés de l'Historique
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {suggestion.keyFindings.map((finding, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">•</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actionable Protocol Steps */}
                  {suggestion.actionableProtocol && suggestion.actionableProtocol.length > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                      <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        Protocole d'Application Recommandé
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {suggestion.actionableProtocol.map((step, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: AI Rationale */}
              {activeSubTab === 'rationale' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Analyse Quantitative Détaillée
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {suggestion.aiQuantitativeRationale}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Mise de Base Recommandée</span>
                      <p className="text-sm font-bold text-white font-mono">
                        {suggestion.recommendedAdjustments.baseBet} {currency}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {suggestion.recommendedAdjustments.baseBetExplanation || '0.50% de la bankroll selon Kelly fractionné.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Stop-Loss & Take-Profit</span>
                      <p className="text-sm font-bold text-emerald-400 font-mono">
                        TP: +{suggestion.recommendedAdjustments.stopOnProfit} {currency} | SL: -{suggestion.recommendedAdjustments.stopOnLoss} {currency}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Verrouillage strict des gains pour éliminer l'overtrading.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Full Diff Table */}
              {activeSubTab === 'full_diff' && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-left">
                        <th className="pb-2 font-medium">Paramètre</th>
                        <th className="pb-2 font-medium">Actuel</th>
                        <th className="pb-2 font-medium text-emerald-400">Optimisé (IA)</th>
                        <th className="pb-2 font-medium">Bénéfice Risque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">onLossAction</td>
                        <td className="py-2.5 text-slate-400">{currentLossAction}</td>
                        <td className="py-2.5 text-amber-300 font-bold">{suggestion.recommendedAdjustments.onLossAction}</td>
                        <td className="py-2.5 font-sans text-slate-400">Évite l'explosion géométrique</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">onLossValue</td>
                        <td className="py-2.5 text-slate-400">{currentLossVal}x</td>
                        <td className="py-2.5 text-amber-300 font-bold">{suggestion.recommendedAdjustments.onLossValue}x</td>
                        <td className="py-2.5 font-sans text-slate-400">Amortit les séries noires</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">targetMultiplier</td>
                        <td className="py-2.5 text-slate-400">@{currentTargetMult}x</td>
                        <td className="py-2.5 text-emerald-300 font-bold">@{suggestion.recommendedAdjustments.targetMultiplier}x</td>
                        <td className="py-2.5 font-sans text-slate-400">Fréquence de gain stable</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">winChance</td>
                        <td className="py-2.5 text-slate-400">{currentWinChance}%</td>
                        <td className="py-2.5 text-emerald-300 font-bold">{suggestion.optimizedStrategy.winChance}%</td>
                        <td className="py-2.5 font-sans text-slate-400">Moins d'asymétrie de variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">baseBet</td>
                        <td className="py-2.5 text-slate-400">{strategy.baseBet} {currency}</td>
                        <td className="py-2.5 text-emerald-300 font-bold">{suggestion.recommendedAdjustments.baseBet} {currency}</td>
                        <td className="py-2.5 font-sans text-slate-400">0.5% max de bankroll</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-sans text-slate-300 font-semibold">stopOnLoss</td>
                        <td className="py-2.5 text-slate-400">{strategy.stopOnLoss || '-'} {currency}</td>
                        <td className="py-2.5 text-emerald-300 font-bold">{suggestion.recommendedAdjustments.stopOnLoss} {currency}</td>
                        <td className="py-2.5 font-sans text-slate-400">Protection totale du capital</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer & Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {appliedSuccessfully ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                Optimisation appliquée avec succès à la stratégie active !
              </span>
            ) : (
              <span>1 clic pour synchroniser ces paramètres sur la stratégie active</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Fermer
            </button>

            {suggestion && !isLoading && (
              <>
                <button
                  id="btn-apply-strategy-optimization"
                  onClick={handleApply}
                  disabled={appliedSuccessfully}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-emerald-600 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {appliedSuccessfully ? (
                    <>
                      <Check className="w-4 h-4" />
                      Appliqué !
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Appliquer l'Optimisation
                    </>
                  )}
                </button>

                {onStartAutoBet && (
                  <button
                    onClick={handleApplyAndRun}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    title="Applique la stratégie optimisée et démarre la session"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Appliquer & Démarrer
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
