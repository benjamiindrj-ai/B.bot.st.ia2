import React, { useState } from 'react';
import { Sparkles, Sliders, ShieldCheck, Zap } from 'lucide-react';
import { BettingStrategy, BetResult, BotStatistics } from '../types';
import { SuggestStrategyOptimizationModal } from './SuggestStrategyOptimizationModal';

interface SuggestStrategyOptimizationButtonProps {
  strategy: BettingStrategy;
  onUpdateStrategy: (updates: Partial<BettingStrategy>) => void;
  onSelectStrategy?: (strat: BettingStrategy) => void;
  balance: number;
  currency: string;
  stats?: BotStatistics;
  bets?: BetResult[];
  variant?: 'primary' | 'secondary' | 'compact' | 'banner' | 'glow';
  className?: string;
  onStartAutoBet?: () => void;
}

export const SuggestStrategyOptimizationButton: React.FC<SuggestStrategyOptimizationButtonProps> = ({
  strategy,
  onUpdateStrategy,
  onSelectStrategy,
  balance,
  currency,
  stats,
  bets = [],
  variant = 'primary',
  className = '',
  onStartAutoBet,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApplyOptimizedStrategy = (optimized: BettingStrategy) => {
    if (onSelectStrategy) {
      onSelectStrategy(optimized);
    } else {
      onUpdateStrategy(optimized);
    }
  };

  const totalBets = stats?.totalBets || bets.length;

  if (variant === 'banner') {
    return (
      <>
        <div 
          id="btn-suggest-strategy-optimization-banner"
          className={`p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${className}`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Optimiseur de Stratégie IA (Risk Management)
                </h4>
                {totalBets > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {totalBets} paris analysables
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Recommande des ajustements sur <span className="text-amber-300 font-mono">onLossAction</span> et <span className="text-emerald-300 font-mono">targetMultiplier</span> pour limiter le drawdown.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Suggérer une Optimisation IA
          </button>
        </div>

        <SuggestStrategyOptimizationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          strategy={strategy}
          stats={stats}
          bets={bets}
          balance={balance}
          currency={currency}
          onApplyOptimizedStrategy={handleApplyOptimizedStrategy}
          onStartAutoBet={onStartAutoBet}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          id="btn-suggest-strategy-optimization-compact"
          onClick={() => setIsModalOpen(true)}
          className={`px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${className}`}
          title="Optimiser la gestion du risque par IA (onLossAction & targetMultiplier)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
          <span>Optimiser Stratégie IA</span>
        </button>

        <SuggestStrategyOptimizationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          strategy={strategy}
          stats={stats}
          bets={bets}
          balance={balance}
          currency={currency}
          onApplyOptimizedStrategy={handleApplyOptimizedStrategy}
          onStartAutoBet={onStartAutoBet}
        />
      </>
    );
  }

  if (variant === 'glow') {
    return (
      <>
        <button
          id="btn-suggest-strategy-optimization-glow"
          onClick={() => setIsModalOpen(true)}
          className={`relative group px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 ${className}`}
        >
          <span className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 pointer-events-none" />
          <span className="relative flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
            <span>Suggest Strategy Optimization</span>
          </span>
        </button>

        <SuggestStrategyOptimizationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          strategy={strategy}
          stats={stats}
          bets={bets}
          balance={balance}
          currency={currency}
          onApplyOptimizedStrategy={handleApplyOptimizedStrategy}
          onStartAutoBet={onStartAutoBet}
        />
      </>
    );
  }

  return (
    <>
      <button
        id="btn-suggest-strategy-optimization"
        onClick={() => setIsModalOpen(true)}
        className={`px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 border border-indigo-400/30 ${className}`}
      >
        <Sparkles className="w-4 h-4 text-indigo-200" />
        <span>Suggérer une Optimisation IA</span>
      </button>

      <SuggestStrategyOptimizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        strategy={strategy}
        stats={stats}
        bets={bets}
        balance={balance}
        currency={currency}
        onApplyOptimizedStrategy={handleApplyOptimizedStrategy}
        onStartAutoBet={onStartAutoBet}
      />
    </>
  );
};
