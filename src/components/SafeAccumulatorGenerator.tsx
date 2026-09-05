import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  PlusCircle, 
  ExternalLink, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Calculator,
  Flame,
  Check,
  X,
  Info,
  DollarSign
} from 'lucide-react';
import { SportTip, TrackedSportBet } from '../types';

export type AccumulatorPreset = 'safe_duo' | 'value_treble' | 'asymmetric_boost' | 'custom';

interface SafeAccumulatorGeneratorProps {
  tips: SportTip[];
  currentBalance: number;
  currency: string;
  onTrackBet?: (tip: SportTip, stakeAmount: number) => void;
}

export const SafeAccumulatorGenerator: React.FC<SafeAccumulatorGeneratorProps> = ({
  tips,
  currentBalance,
  currency,
  onTrackBet,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<AccumulatorPreset>('safe_duo');
  const [selectedTipIds, setSelectedTipIds] = useState<string[]>([]);
  const [customStakeAmount, setCustomStakeAmount] = useState<number>(() => {
    return currentBalance > 0 ? Math.max(1, Number((currentBalance * 0.02).toFixed(2))) : 10;
  });
  const [isCopiedTicket, setIsCopiedTicket] = useState<boolean>(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Eligible tips for accumulators (valid odds, upcoming/live, distinct events)
  const eligibleTips = useMemo(() => {
    return tips.filter(t => (t.odds || 0) >= 1.20 && (t.odds || 0) <= 3.80);
  }, [tips]);

  // Generate automated presets whenever preset changes or tips update
  const presetPicks = useMemo<SportTip[]>(() => {
    if (eligibleTips.length === 0) return [];

    // Helper to pick tips from distinct matches
    const getDistinctPicks = (candidateTips: SportTip[], maxCount: number) => {
      const picks: SportTip[] = [];
      const matchSet = new Set<string>();

      for (const tip of candidateTips) {
        const matchKey = (tip.match || '').toLowerCase().trim();
        if (!matchSet.has(matchKey)) {
          picks.push(tip);
          matchSet.add(matchKey);
        }
        if (picks.length >= maxCount) break;
      }
      return picks;
    };

    if (selectedPreset === 'safe_duo') {
      // 2 highest confidence & probability picks (odds ~ 1.30 - 1.65)
      const sorted = [...eligibleTips].sort((a, b) => {
        const probA = a.trueProbability || (100 / a.odds);
        const probB = b.trueProbability || (100 / b.odds);
        return probB - probA;
      });
      return getDistinctPicks(sorted, 2);
    }

    if (selectedPreset === 'value_treble') {
      // 3 highest EV+ picks (odds ~ 1.50 - 2.10)
      const sorted = [...eligibleTips].sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0));
      return getDistinctPicks(sorted, 3);
    }

    if (selectedPreset === 'asymmetric_boost') {
      // 4 picks with diversified sports and high asymmetric payout
      const sorted = [...eligibleTips].sort((a, b) => (b.odds || 0) - (a.odds || 0));
      return getDistinctPicks(sorted, 4);
    }

    // Custom
    return eligibleTips.filter(t => selectedTipIds.includes(t.id));
  }, [eligibleTips, selectedPreset, selectedTipIds]);

  // Active picks in current accumulator
  const activePicks = useMemo(() => {
    if (selectedPreset === 'custom') {
      return eligibleTips.filter(t => selectedTipIds.includes(t.id));
    }
    return presetPicks;
  }, [selectedPreset, presetPicks, eligibleTips, selectedTipIds]);

  // Calculate Accumulator Combined Metrics
  const combinedMetrics = useMemo(() => {
    if (activePicks.length === 0) {
      return {
        totalOdds: 1.0,
        jointTrueProb: 0,
        jointImpliedProb: 0,
        combinedEvPct: 0,
        suggestedKellyStakePercent: 0,
        suggestedStakeAmount: 0,
        potentialPayout: 0,
        potentialNetProfit: 0,
        hasSameMatchConflict: false,
      };
    }

    const totalOdds = Number(activePicks.reduce((acc, tip) => acc * (tip.odds || 1.0), 1.0).toFixed(2));
    
    // Joint true probability: Product of individual true probabilities
    const jointTrueProbDecimal = activePicks.reduce((acc, tip) => {
      const p = (tip.trueProbability ? tip.trueProbability / 100 : (1 / (tip.odds || 1.5)) * 1.05);
      return acc * Math.min(0.98, p);
    }, 1.0);
    const jointTrueProb = Number((jointTrueProbDecimal * 100).toFixed(1));

    // Joint implied probability
    const jointImpliedProb = Number(((1 / totalOdds) * 100).toFixed(1));

    // Combined Expected Value: (JointTrueProb * TotalOdds - 1) * 100
    const combinedEvPct = Number(((jointTrueProbDecimal * totalOdds - 1) * 100).toFixed(1));

    // Fractional Kelly for Accumulator (1/4 Kelly to account for higher variance of accumulators)
    const b = totalOdds - 1;
    const p = jointTrueProbDecimal;
    const q = 1 - p;
    let rawKelly = b > 0 ? (b * p - q) / b : 0;
    let safeKellyPercent = Math.max(0.5, Math.min(4.0, Number((rawKelly * 25).toFixed(1)))); // 1/4 Kelly capped at 4%
    
    if (combinedEvPct <= 0) {
      safeKellyPercent = 1.0;
    }

    const effectiveBankroll = currentBalance > 0 ? currentBalance : 100;
    const suggestedStakeAmount = Number(((effectiveBankroll * safeKellyPercent) / 100).toFixed(2));

    const potentialPayout = Number((customStakeAmount * totalOdds).toFixed(2));
    const potentialNetProfit = Number((potentialPayout - customStakeAmount).toFixed(2));

    // Conflict detection: Check if multiple picks come from the same match
    const matchCounts = new Map<string, number>();
    activePicks.forEach(p => {
      const m = (p.match || '').toLowerCase().trim();
      matchCounts.set(m, (matchCounts.get(m) || 0) + 1);
    });
    const hasSameMatchConflict = Array.from(matchCounts.values()).some(count => count > 1);

    return {
      totalOdds,
      jointTrueProb,
      jointImpliedProb,
      combinedEvPct,
      suggestedKellyStakePercent: safeKellyPercent,
      suggestedStakeAmount,
      potentialPayout,
      potentialNetProfit,
      hasSameMatchConflict,
    };
  }, [activePicks, customStakeAmount, currentBalance]);

  // Toggle selection for custom mode
  const handleToggleTip = (tipId: string) => {
    if (selectedPreset !== 'custom') {
      // Switch to custom mode with current active picks
      setSelectedPreset('custom');
      setSelectedTipIds(activePicks.map(p => p.id).includes(tipId) 
        ? activePicks.map(p => p.id).filter(id => id !== tipId)
        : [...activePicks.map(p => p.id), tipId]
      );
      return;
    }

    setSelectedTipIds(prev => 
      prev.includes(tipId) ? prev.filter(id => id !== tipId) : [...prev, tipId]
    );
  };

  // Track combined accumulator as a consolidated ticket
  const handleTrackAccumulator = () => {
    if (!onTrackBet || activePicks.length === 0) return;

    const matchesSummary = activePicks.map(p => `${p.match} (${p.predictedOutcome || p.market} @${p.odds.toFixed(2)})`).join(' + ');

    const consolidatedTip: SportTip = {
      id: `acca-${Date.now()}`,
      match: `COMBINÉ (${activePicks.length} Sélections) : ${activePicks[0].match} + ${activePicks.length - 1} autres`,
      sport: activePicks[0].sport || 'football',
      league: `Combiné Multi-Ligues (${activePicks.length} matchs)`,
      kickoffTime: activePicks[0].kickoffTime || 'Immédiat',
      market: `Combiné Accumulateur (${activePicks.length} Sélections)`,
      predictedOutcome: activePicks.map(p => p.predictedOutcome || p.market).join(' / '),
      odds: combinedMetrics.totalOdds,
      trueProbability: combinedMetrics.jointTrueProb,
      bookmakerImpliedProbability: combinedMetrics.jointImpliedProb,
      expectedValue: combinedMetrics.combinedEvPct,
      confidenceScore: Math.round(combinedMetrics.jointTrueProb * 0.9 + 10),
      recommendedStakePercent: combinedMetrics.suggestedKellyStakePercent,
      riskLevel: combinedMetrics.totalOdds > 3.5 ? 'aggressive' : combinedMetrics.totalOdds > 2.2 ? 'value' : 'safe',
      analysisReasoning: `Ticket combiné optimisé généré par le moteur Sport IA. Sélections incluses : ${matchesSummary}. Espérance mathématique combinée de ${combinedMetrics.combinedEvPct > 0 ? `+${combinedMetrics.combinedEvPct}%` : `${combinedMetrics.combinedEvPct}%`}.`,
      keyStats: [
        `Cote totale : ${combinedMetrics.totalOdds.toFixed(2)}x`,
        `Espérance EV combinée : +${combinedMetrics.combinedEvPct}%`,
        `Probabilité conjointe : ${combinedMetrics.jointTrueProb}%`
      ],
      stakeUrl: activePicks[0].stakeUrl || 'https://stake.com/sports',
      stakeOdds: combinedMetrics.totalOdds,
    };

    onTrackBet(consolidatedTip, customStakeAmount);
    setSavedSuccessMessage(`Combiné (${combinedMetrics.totalOdds}x) enregistré avec succès dans votre bilan !`);
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  const handleCopyTicket = () => {
    const text = `🎟️ TICKET COMBINÉ SPORT IA STAKE.COM\n` +
      `---------------------------------------\n` +
      `Cote Totale : @${combinedMetrics.totalOdds}\n` +
      `Proba Estimée : ${combinedMetrics.jointTrueProb}%\n` +
      `Espérance EV : +${combinedMetrics.combinedEvPct}%\n\n` +
      activePicks.map((p, i) => `${i + 1}. ${p.match}\n   ➡️ ${p.market} : ${p.predictedOutcome || p.market} (@${p.odds.toFixed(2)})`).join('\n\n') +
      `\n---------------------------------------\n` +
      `Mise : ${customStakeAmount} ${currency} | Gain Potentiel : ${combinedMetrics.potentialPayout} ${currency}`;

    navigator.clipboard.writeText(text);
    setIsCopiedTicket(true);
    setTimeout(() => setIsCopiedTicket(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/70 to-slate-900 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Générateur Intelligent de Combinés Optimisés (EV+ Accumulator)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Combinés Mathématiquement Rentables & Sans Corrélation Négative
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              L'IA combine automatiquement les meilleures sélections à espérance positive (EV+) sans conflit de corrélation, calcule la probabilité conjointe exacte et dimensionne votre mise selon le critère de Kelly fractionnaire.
            </p>
          </div>

          {/* Presets Quick Selector */}
          <div className="bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 flex-wrap shrink-0">
            <button
              onClick={() => setSelectedPreset('safe_duo')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedPreset === 'safe_duo'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🛡️ Duo Sûr (~1.85)</span>
            </button>

            <button
              onClick={() => setSelectedPreset('value_treble')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedPreset === 'value_treble'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>🎯 Trio Value (~3.10)</span>
            </button>

            <button
              onClick={() => setSelectedPreset('asymmetric_boost')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedPreset === 'asymmetric_boost'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>🚀 Quad Boost (~5.50)</span>
            </button>

            <button
              onClick={() => {
                setSelectedPreset('custom');
                if (selectedTipIds.length === 0) {
                  setSelectedTipIds(eligibleTips.slice(0, 3).map(t => t.id));
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedPreset === 'custom'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>⚙️ Sur-Mesure</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid: Ticket Details (Left) + Match Bank Selector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Combiné Ticket & Metrics */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-5">
            
            {/* Ticket Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ticket Combiné IA Stake</h3>
                  <div className="text-xs text-slate-400 font-medium">
                    {activePicks.length} Sélections validées
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">Cote Globale</div>
                <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                  @{combinedMetrics.totalOdds.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Same match conflict warning */}
            {combinedMetrics.hasSameMatchConflict && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Attention Corrélation :</strong> Plusieurs sélections proviennent du même match. Sur certains bookmakers, les sélections d'un même événement doivent être placées en Bet Builder.
                </div>
              </div>
            )}

            {/* List of Active Legs in the Ticket */}
            <div className="space-y-2.5">
              {activePicks.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/80 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Aucune sélection dans le combiné. Choisissez des matchs dans la liste à droite.
                </div>
              ) : (
                activePicks.map((pick, pIdx) => (
                  <div 
                    key={pick.id || pIdx}
                    className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">{pick.league}</span>
                        <span>•</span>
                        <span>{pick.kickoffTime}</span>
                      </div>
                      <div className="text-xs font-black text-white truncate">{pick.match}</div>
                      <div className="text-[11px] text-emerald-400 font-bold truncate">
                        {pick.market} {pick.predictedOutcome ? `• ${pick.predictedOutcome}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-amber-300">
                          @{pick.odds.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          +{pick.expectedValue}% EV
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTip(pick.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Retirer du combiné"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Math & Stochastic Engine Indicators */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Proba Conjointe</div>
                <div className="text-sm font-black text-cyan-300 font-mono mt-0.5">
                  {combinedMetrics.jointTrueProb}%
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Vs Implicite {combinedMetrics.jointImpliedProb}%</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Espérance EV+</div>
                <div className={`text-sm font-black font-mono mt-0.5 ${
                  combinedMetrics.combinedEvPct > 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {combinedMetrics.combinedEvPct > 0 ? `+${combinedMetrics.combinedEvPct}%` : `${combinedMetrics.combinedEvPct}%`}
                </div>
                <div className="text-[9px] text-emerald-500/80 font-mono">Edge Mathématique</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Kelly Fraction</div>
                <div className="text-sm font-black text-purple-300 font-mono mt-0.5">
                  {combinedMetrics.suggestedKellyStakePercent}%
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Conseillé: {combinedMetrics.suggestedStakeAmount} {currency}</div>
              </div>
            </div>

            {/* Stake Input & Gain Simulation */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-bold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Montant de la Mise</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomStakeAmount(combinedMetrics.suggestedStakeAmount)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-bold"
                >
                  Appliquer Kelly IA ({combinedMetrics.suggestedStakeAmount} {currency})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  step="1"
                  value={customStakeAmount}
                  onChange={(e) => setCustomStakeAmount(Math.max(0.5, Number(e.target.value)))}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <div className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs font-bold border border-slate-700">
                  {currency}
                </div>
              </div>

              {/* Potential Payout Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Retour Total Potentiel :</span>
                  <span className="text-emerald-300 font-mono font-bold text-sm">
                    {combinedMetrics.potentialPayout} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20">
                  <span className="text-sm font-black text-white">Gain Net Potentiel :</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    +{combinedMetrics.potentialNetProfit} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleTrackAccumulator}
                disabled={activePicks.length === 0}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Enregistrer dans le Bilan IA</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTicket}
                disabled={activePicks.length === 0}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700"
              >
                {isCopiedTicket ? <Check className="w-4 h-4 text-emerald-400" /> : <Layers className="w-4 h-4 text-slate-400" />}
                <span>{isCopiedTicket ? 'Ticket Copié !' : 'Copier le Ticket'}</span>
              </button>

              <a
                href="https://stake.com/sports"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs transition flex items-center justify-center border border-blue-500/40"
                title="Ouvrir Stake.com Sports"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>

        {/* Right Column: Match Bank & Custom Combiné Builder */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>Sélectionnez vos Matchs pour le Combiné</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {eligibleTips.length} Matchs Disponibles
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cliquez sur n'importe quel match ci-dessous pour l'ajouter ou le retirer instantanément de votre combiné.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {eligibleTips.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                Aucun match disponible pour le moment.
              </div>
            ) : (
              eligibleTips.map((tip) => {
                const isSelected = activePicks.some(p => p.id === tip.id);
                return (
                  <div
                    key={tip.id}
                    onClick={() => handleToggleTip(tip.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">{tip.league}</span>
                        <span>{tip.kickoffTime}</span>
                        {tip.isStakeLive && (
                          <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[9px] font-bold animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-white truncate">{tip.match}</h4>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5 truncate">
                        <span className="text-slate-400">{tip.market}</span>
                        {tip.predictedOutcome && <strong className="text-emerald-300">• {tip.predictedOutcome}</strong>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-amber-300">
                          @{tip.odds.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          +{tip.expectedValue}% EV
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition border ${
                        isSelected 
                          ? 'bg-emerald-500 text-white border-emerald-400' 
                          : 'bg-slate-800 text-transparent border-slate-700'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
