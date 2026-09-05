import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  HelpCircle,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface KellyCriterionCalculatorProps {
  currentMultiplier: number;
  currentBalance: number;
  currency: string;
  onApplyBet: (betAmount: number) => void;
  onApplyMultiplier?: (multiplier: number) => void;
}

export type KellyFractionType = 'full' | 'half' | 'quarter' | 'eighth' | 'custom';

export const KellyCriterionCalculator: React.FC<KellyCriterionCalculatorProps> = ({
  currentMultiplier,
  currentBalance,
  currency,
  onApplyBet,
  onApplyMultiplier,
}) => {
  // Inputs state
  const [oddsMultiplier, setOddsMultiplier] = useState<number>(currentMultiplier > 1 ? currentMultiplier : 2.0);
  const [confidenceRate, setConfidenceRate] = useState<number>(55); // 55% by default
  const [bankroll, setBankroll] = useState<number>(currentBalance > 0 ? currentBalance : 100);
  const [fractionType, setFractionType] = useState<KellyFractionType>('half'); // Half Kelly is standard safe default
  const [customFractionPct, setCustomFractionPct] = useState<number>(50);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);

  // Sync bankroll when balance changes if user hasn't overridden significantly
  React.useEffect(() => {
    if (currentBalance > 0) {
      setBankroll(currentBalance);
    }
  }, [currentBalance]);

  // Sync multiplier when prop changes
  React.useEffect(() => {
    if (currentMultiplier > 1) {
      setOddsMultiplier(currentMultiplier);
    }
  }, [currentMultiplier]);

  // Kelly Mathematical Calculations
  const calculations = useMemo(() => {
    const b = Math.max(0.001, oddsMultiplier - 1); // Net odds (b = decimal odds - 1)
    const p = Math.min(100, Math.max(0, confidenceRate)) / 100; // Probability of winning (0 to 1)
    const q = 1 - p; // Probability of losing

    // Full Kelly Formula: f* = (b * p - q) / b = (p * odds - 1) / (odds - 1)
    const rawKellyFraction = (b * p - q) / b;
    const rawKellyPercent = rawKellyFraction * 100;

    // Expected Value / Edge = (p * oddsMultiplier - 1) * 100%
    const expectedValuePct = (p * oddsMultiplier - 1) * 100;
    const isPositiveEdge = expectedValuePct > 0;

    // Effective fraction multiplier
    let fractionScale = 1.0;
    if (fractionType === 'half') fractionScale = 0.5;
    else if (fractionType === 'quarter') fractionScale = 0.25;
    else if (fractionType === 'eighth') fractionScale = 0.125;
    else if (fractionType === 'custom') fractionScale = Math.max(0.01, Math.min(1.0, customFractionPct / 100));

    // Adjusted fraction
    const adjustedKellyFraction = isPositiveEdge ? Math.max(0, rawKellyFraction * fractionScale) : 0;
    const adjustedKellyPercent = adjustedKellyFraction * 100;

    // Cap at sensible limits (e.g., max 50% of bankroll even if Kelly says 80% to prevent catastrophic variance)
    const safeKellyPercent = Math.min(50, adjustedKellyPercent);
    const safeKellyFraction = safeKellyPercent / 100;

    // Bet amount
    const recommendedBet = Number((bankroll * safeKellyFraction).toFixed(4));

    // Theoretical Win Chance for Stake standard 99% RTP
    const nominalStakeWinChance = oddsMultiplier > 1 ? Number((99 / oddsMultiplier).toFixed(2)) : 50;

    // Edge vs Stake Standard
    const edgeVsNominal = confidenceRate - nominalStakeWinChance;

    return {
      b,
      p,
      q,
      rawKellyFraction,
      rawKellyPercent,
      expectedValuePct,
      isPositiveEdge,
      fractionScale,
      adjustedKellyPercent,
      safeKellyPercent,
      recommendedBet,
      nominalStakeWinChance,
      edgeVsNominal
    };
  }, [oddsMultiplier, confidenceRate, bankroll, fractionType, customFractionPct]);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Calculateur de Mise Optimale (Critère de Kelly)
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Théorie de l'Information
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Calcule scientifiquement la fraction exacte de bankroll à miser selon votre cote et taux de confiance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTheoryGuide(!showTheoryGuide)}
          className="text-xs text-slate-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{showTheoryGuide ? 'Masquer la formule' : 'Comprendre Kelly'}</span>
          {showTheoryGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Explanatory accordion */}
      {showTheoryGuide && (
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-900/40 text-xs text-slate-300 space-y-2.5 animate-fadeIn">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-300">Formule Mathématique de John L. Kelly Jr. (1956) :</span>
              <p className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                f* = (b · p - q) / b = [p · (Cote) - 1] / (Cote - 1)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Où <strong className="text-slate-200">b</strong> est le gain net (Cote - 1), <strong className="text-slate-200">p</strong> est votre probabilité réelle de gain estimée, et <strong className="text-slate-200">q</strong> la probabilité de perte (1 - p).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px] text-slate-400">
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <strong className="text-emerald-400 block mb-0.5">Espérance Positive (EV &gt; 0)</strong>
              La formule garantit la croissance maximale du capital sur le long terme sans risque de ruine théorique.
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <strong className="text-amber-400 block mb-0.5">Demi-Kelly (1/2)</strong>
              Réduit la volatilité de 50% et protège contre les séries de pertes imprévues (Drawdown).
            </div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
              <strong className="text-rose-400 block mb-0.5">Espérance Négative (EV &le; 0)</strong>
              Si le taux de confiance est insuffisant pour la cote, Kelly retourne 0% (ne pas miser).
            </div>
          </div>
        </div>
      )}

      {/* Calculator Grid Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* 1. Cote / Multiplicateur */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Cote / Multiplicateur
            </label>
            {oddsMultiplier !== currentMultiplier && (
              <button
                type="button"
                onClick={() => setOddsMultiplier(currentMultiplier > 1 ? currentMultiplier : 2.0)}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                title="Synchroniser avec la stratégie actuelle"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Sync ({currentMultiplier}x)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={oddsMultiplier}
              onChange={(e) => setOddsMultiplier(Math.max(1.01, parseFloat(e.target.value) || 1.01))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-xs font-mono font-bold text-slate-400">x</span>
          </div>

          <div className="flex items-center gap-1">
            {[1.5, 2.0, 3.0, 5.0, 10.0].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setOddsMultiplier(preset)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition border ${
                  oddsMultiplier === preset
                    ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            RTP Neutre Stake : {calculations.nominalStakeWinChance}%
          </span>
        </div>

        {/* 2. Taux de Confiance (Probabilité estimée) */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <span>Taux de Confiance (Win %)</span>
            </label>
            <span className="text-[11px] font-mono font-bold text-emerald-400">
              {confidenceRate}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="99"
              step="0.5"
              value={confidenceRate}
              onChange={(e) => setConfidenceRate(parseFloat(e.target.value) || 50)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <input
              type="number"
              min="1"
              max="99"
              step="0.5"
              value={confidenceRate}
              onChange={(e) => setConfidenceRate(Math.min(99, Math.max(1, parseFloat(e.target.value) || 50)))}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-slate-200 font-mono font-bold text-center focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setConfidenceRate(calculations.nominalStakeWinChance)}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 border border-slate-800 transition font-mono"
              title="Aligner sur les stats théoriques du jeu"
            >
              Stat Stake ({calculations.nominalStakeWinChance}%)
            </button>
            <button
              type="button"
              onClick={() => setConfidenceRate(Number((calculations.nominalStakeWinChance + 3).toFixed(1)))}
              className="px-1.5 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-[10px] text-emerald-300 border border-emerald-700/50 transition font-mono"
              title="Edge positif modéré (+3%)"
            >
              +3% Edge
            </button>
            <button
              type="button"
              onClick={() => setConfidenceRate(Number((calculations.nominalStakeWinChance + 7).toFixed(1)))}
              className="px-1.5 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-[10px] text-emerald-300 border border-emerald-700/50 transition font-mono"
              title="Fort avantage (+7%)"
            >
              +7% Edge
            </button>
          </div>
        </div>

        {/* 3. Bankroll & Fraction de Kelly */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Bankroll de Référence
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Solde : {currentBalance.toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="any"
              min="0.1"
              value={bankroll}
              onChange={(e) => setBankroll(Math.max(0.01, parseFloat(e.target.value) || 100))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-xs font-mono font-bold text-slate-300">{currency}</span>
          </div>

          {/* Fraction selector */}
          <div className="pt-1">
            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
              Modèle de Fractionnement :
            </label>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setFractionType('half')}
                className={`px-1 py-1 rounded text-[10px] font-bold transition border text-center ${
                  fractionType === 'half'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Recommandé - Risque réduit de 75%"
              >
                1/2 Kelly
              </button>
              <button
                type="button"
                onClick={() => setFractionType('quarter')}
                className={`px-1 py-1 rounded text-[10px] font-bold transition border text-center ${
                  fractionType === 'quarter'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Conservateur - Idéal pour longue session"
              >
                1/4 Kelly
              </button>
              <button
                type="button"
                onClick={() => setFractionType('eighth')}
                className={`px-1 py-1 rounded text-[10px] font-bold transition border text-center ${
                  fractionType === 'eighth'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Ultra-Sécurisé"
              >
                1/8 Kelly
              </button>
              <button
                type="button"
                onClick={() => setFractionType('full')}
                className={`px-1 py-1 rounded text-[10px] font-bold transition border text-center ${
                  fractionType === 'full'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Full Kelly - Volatilité maximale"
              >
                Full (1/1)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Results and Action Display Box */}
      <div className={`p-4 rounded-xl border transition-all ${
        calculations.isPositiveEdge
          ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
          : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/40'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 flex-1">
            
            {/* 1. Edge & EV */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wide block">
                Espérance (EV)
              </span>
              <div className="flex items-center gap-1.5">
                {calculations.isPositiveEdge ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span className={`text-sm font-extrabold font-mono ${
                  calculations.isPositiveEdge ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {calculations.expectedValuePct > 0 ? '+' : ''}{calculations.expectedValuePct.toFixed(2)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                {calculations.isPositiveEdge ? 'Avantage joueur' : 'Sans avantage math.'}
              </span>
            </div>

            {/* 2. Kelly Brut (Full) */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wide block">
                Kelly Brut (100%)
              </span>
              <span className="text-sm font-extrabold font-mono text-slate-200">
                {calculations.rawKellyPercent > 0 ? `${calculations.rawKellyPercent.toFixed(2)}%` : '0.00%'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Croissance théorique max
              </span>
            </div>

            {/* 3. Pourcentage Ajusté */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wide block">
                % Conseillé ({fractionType === 'half' ? '1/2' : fractionType === 'quarter' ? '1/4' : fractionType === 'eighth' ? '1/8' : 'Full'})
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {calculations.safeKellyPercent.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400 block">
                de la bankroll active
              </span>
            </div>

            {/* 4. Montant Recommandé */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wide block">
                Mise Optimale
              </span>
              <span className="text-base font-extrabold font-mono text-white">
                {calculations.recommendedBet.toFixed(4)} <span className="text-xs text-emerald-300">{currency}</span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                Mise de base calculée
              </span>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 flex-shrink-0">
            <button
              id="btn-apply-kelly-bet"
              type="button"
              disabled={calculations.recommendedBet <= 0}
              onClick={() => {
                if (calculations.recommendedBet > 0) {
                  onApplyBet(calculations.recommendedBet);
                }
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                calculations.recommendedBet > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-emerald-950/50 hover:scale-[1.02]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Appliquer la mise ({calculations.recommendedBet.toFixed(4)} {currency})</span>
            </button>

            {onApplyMultiplier && (
              <button
                type="button"
                onClick={() => onApplyMultiplier(oddsMultiplier)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <span>Appliquer la cote ({oddsMultiplier}x)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

        {/* Warning or Edge note */}
        {!calculations.isPositiveEdge && (
          <div className="mt-3 pt-2.5 border-t border-amber-900/40 text-[11px] text-amber-300/90 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Attention :</strong> Avec un taux de confiance de {confidenceRate}% sur une cote de {oddsMultiplier}x, l'espérance mathématique est négative. Le critère de Kelly préconise de ne rien miser (0%). Augmentez votre taux de confiance ou choisissez une cote plus avantageuse.
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
