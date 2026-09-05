import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator,
  Percent,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Target,
  ArrowRight
} from 'lucide-react';

export interface KellyCalculationResult {
  odds: number;
  confidenceProb: number; // 0 to 1
  impliedProb: number; // 0 to 1 (1 / odds)
  edgePct: number; // (confidenceProb - impliedProb) * 100
  expectedValuePct: number; // (confidenceProb * odds - 1) * 100
  fullKellyPct: number; // Raw %
  selectedFraction: number; // 0.125, 0.25, 0.5, 1.0
  recommendedStakePct: number; // Final %
  recommendedStakeAmount: number; // In currency
  potentialProfitAmount: number;
  riskRating: 'safe' | 'optimal' | 'aggressive' | 'negative_ev';
}

export interface KellyCalculatorProps {
  initialOdds?: number;
  initialConfidence?: number;
  initialBankroll?: number;
  currency?: string;
  matchTitle?: string;
  marketTitle?: string;
  onApplyStake?: (stakePct: number, stakeAmount: number) => void;
  isInlineCard?: boolean;
}

export const calculateKelly = (
  odds: number,
  confidenceScore: number,
  bankroll: number,
  fraction: number = 0.5,
  maxCapPct: number = 5.0
): KellyCalculationResult => {
  const safeOdds = Math.max(1.01, odds || 1.85);
  const p = Math.min(0.99, Math.max(0.01, (confidenceScore || 65) / 100)); // Win probability
  const q = 1 - p; // Loss probability
  const b = safeOdds - 1; // Net decimal odds

  const impliedProb = 1 / safeOdds;
  const edgePct = (p - impliedProb) * 100;
  const expectedValuePct = (p * safeOdds - 1) * 100;

  // Kelly formula: f* = (b*p - q) / b
  const rawKelly = (b * p - q) / b;
  const rawKellyPct = rawKelly * 100;

  let recommendedPct = 0;
  let riskRating: 'safe' | 'optimal' | 'aggressive' | 'negative_ev' = 'optimal';

  if (rawKelly <= 0 || expectedValuePct <= 0) {
    recommendedPct = 0;
    riskRating = 'negative_ev';
  } else {
    const fractionalKelly = rawKellyPct * fraction;
    recommendedPct = Math.min(fractionalKelly, maxCapPct);
    recommendedPct = Math.max(0.1, Number(recommendedPct.toFixed(2)));

    if (fraction <= 0.25) {
      riskRating = 'safe';
    } else if (fraction <= 0.5) {
      riskRating = 'optimal';
    } else {
      riskRating = 'aggressive';
    }
  }

  const safeBankroll = Math.max(1, bankroll || 1000);
  const recommendedAmount = Number(((safeBankroll * recommendedPct) / 100).toFixed(2));
  const potentialProfit = Number((recommendedAmount * (safeOdds - 1)).toFixed(2));

  return {
    odds: safeOdds,
    confidenceProb: p,
    impliedProb,
    edgePct: Number(edgePct.toFixed(2)),
    expectedValuePct: Number(expectedValuePct.toFixed(2)),
    fullKellyPct: Number(rawKellyPct.toFixed(2)),
    selectedFraction: fraction,
    recommendedStakePct: recommendedPct,
    recommendedStakeAmount: recommendedAmount,
    potentialProfitAmount: potentialProfit,
    riskRating,
  };
};

export const KellyCalculator: React.FC<KellyCalculatorProps> = ({
  initialOdds = 1.95,
  initialConfidence = 68,
  initialBankroll = 1000,
  currency = 'EUR',
  matchTitle,
  marketTitle,
  onApplyStake,
  isInlineCard = false,
}) => {
  const [oddsInput, setOddsInput] = useState<string>(initialOdds.toString());
  const [confidenceInput, setConfidenceInput] = useState<number>(initialConfidence);
  const [bankrollInput, setBankrollInput] = useState<string>(initialBankroll.toString());
  const [fraction, setFraction] = useState<number>(0.5); // Default Demi-Kelly (50%)
  const [maxCap, setMaxCap] = useState<number>(5.0); // 5% max cap
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const numOdds = parseFloat(oddsInput) || 1.85;
  const numBankroll = parseFloat(bankrollInput) || 1000;

  const result = useMemo(() => {
    return calculateKelly(numOdds, confidenceInput, numBankroll, fraction, maxCap);
  }, [numOdds, confidenceInput, numBankroll, fraction, maxCap]);

  const presetFractions = [
    { label: 'Quart Kelly (25%)', value: 0.25, desc: 'Prudent & Stable', badge: 'Recommandé Pros' },
    { label: 'Demi-Kelly (50%)', value: 0.5, desc: 'Équilibré Edge/Risque', badge: 'Standard IA' },
    { label: 'Plein Kelly (100%)', value: 1.0, desc: 'Agressif / Haute Variance', badge: 'Expert' },
    { label: '1/8 Kelly (12.5%)', value: 0.125, desc: 'Ultra Conservateur', badge: 'Safe' },
  ];

  return (
    <div className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-lg text-slate-200 transition-all ${
      isInlineCard ? 'border-indigo-500/40 bg-slate-950/90' : 'border-slate-800'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Calculateur de Mise « Critère de Kelly »</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Mathématiquement Optimal
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Dimensionnement probabiliste du capital pour maximiser la croissance à long terme tout en neutralisant le risque de ruine.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFormulaDetails(!showFormulaDetails)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs flex items-center gap-1 shrink-0"
          title="Afficher la formule mathématique de Kelly"
        >
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline text-[11px]">Formule</span>
          {showFormulaDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Target Match info banner if provided */}
      {(matchTitle || marketTitle) && (
        <div className="mb-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="text-slate-400">Pari ciblé : </span>
            <strong className="text-white">{matchTitle}</strong>
          </div>
          {marketTitle && (
            <div className="text-emerald-400 font-semibold font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
              {marketTitle}
            </div>
          )}
        </div>
      )}

      {/* Mathematical Explanation Dropdown */}
      <AnimatePresence>
        {showFormulaDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 text-xs space-y-2 text-slate-300">
              <div className="font-mono text-indigo-300 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Formule de John L. Kelly Jr. : f* = (b × p - q) / b
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
                <li><strong className="text-slate-200">b</strong> = Cote nette décimale (<code className="text-indigo-300">Cote - 1</code>)</li>
                <li><strong className="text-slate-200">p</strong> = Probabilité estimée de succès (<code className="text-emerald-300">Score de Confiance IA</code>)</li>
                <li><strong className="text-slate-200">q</strong> = Probabilité d'échec (<code className="text-rose-300">1 - p</code>)</li>
                <li><strong className="text-slate-200">f*</strong> = Fraction optimale de bankroll à engager</li>
              </ul>
              <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                💡 En pratique sportive, le Demi-Kelly (50%) ou Quart de Kelly (25%) est universellement privilégié pour lisser la variance et absorber l'imprécision inhérente aux modèles prédictifs.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
        
        {/* 1. Odds Input */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Cote Décimale</span>
            <span className="text-[10px] text-slate-500 font-mono">Proba book: {(result.impliedProb * 100).toFixed(1)}%</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="1.01"
              max="50.0"
              value={oddsInput}
              onChange={(e) => setOddsInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">@</span>
          </div>
        </div>

        {/* 2. Confidence Score (Win Probability) */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Score de Confiance IA (p)</span>
            <span className="text-[10px] font-mono text-indigo-300 font-bold">{confidenceInput}%</span>
          </label>
          <input
            type="range"
            min="20"
            max="95"
            step="1"
            value={confidenceInput}
            onChange={(e) => setConfidenceInput(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>20% (Outsider)</span>
            <span>50%</span>
            <span>95% (Forte valeur)</span>
          </div>
        </div>

        {/* 3. Bankroll Total */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Capital Bankroll Total</span>
            <span className="text-[10px] text-slate-500 font-mono">{currency}</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="10"
              min="1"
              value={bankrollInput}
              onChange={(e) => setBankrollInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">{currency}</span>
          </div>
        </div>

      </div>

      {/* Kelly Fraction Selector */}
      <div className="mb-4 space-y-2">
        <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Fraction du Critère de Kelly appliquée :</span>
          <span className="text-[10px] text-slate-400">Plafond de sécurité : <strong>{maxCap}%</strong> max</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presetFractions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFraction(f.value)}
              className={`p-2 rounded-xl text-left border transition relative ${
                fraction === f.value
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{f.label}</span>
                {fraction === f.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
              <div className="text-[9px] text-indigo-400/80 font-mono mt-1">{f.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* RESULTS DISPLAY PANEL */}
      <div className={`p-4 rounded-2xl border transition-all ${
        result.riskRating === 'negative_ev'
          ? 'bg-rose-950/20 border-rose-500/30'
          : 'bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border-indigo-500/40 shadow-md'
      }`}>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* Main Recommendation Callout */}
          <div className="space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Mise Kelly Recommandée :</span>
            </div>
            
            {result.riskRating === 'negative_ev' ? (
              <div className="space-y-1">
                <div className="text-xl font-black text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5" />
                  <span>0.00% (Ne pas parier)</span>
                </div>
                <p className="text-[11px] text-rose-300/80">
                  L'espérance de gain est négative ({result.expectedValuePct}% EV). La probabilité ({confidenceInput}%) est trop basse pour la cote @{result.odds}.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono flex items-baseline gap-2">
                  <span>{result.recommendedStakePct}%</span>
                  <span className="text-lg text-white font-semibold">
                    ≈ {result.recommendedStakeAmount} {currency}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Sur un capital de <strong className="text-white">{numBankroll} {currency}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Value and Edge Diagnostics */}
          <div className="grid grid-cols-2 gap-2 text-xs border-y md:border-y-0 md:border-x border-slate-800 py-2 md:py-0 md:px-3">
            <div>
              <div className="text-[10px] text-slate-400">Espérance (EV) :</div>
              <div className={`font-mono font-bold ${result.expectedValuePct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.expectedValuePct > 0 ? '+' : ''}{result.expectedValuePct}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Avantage (Edge) :</div>
              <div className={`font-mono font-bold ${result.edgePct > 0 ? 'text-indigo-300' : 'text-slate-400'}`}>
                {result.edgePct > 0 ? '+' : ''}{result.edgePct}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Full Kelly Brut :</div>
              <div className="font-mono text-slate-300">
                {result.fullKellyPct > 0 ? `${result.fullKellyPct}%` : '0%'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Profit potentiel :</div>
              <div className="font-mono font-bold text-emerald-300">
                +{result.potentialProfitAmount} {currency}
              </div>
            </div>
          </div>

          {/* Action to apply stake to tracking */}
          <div className="flex flex-col gap-2">
            {onApplyStake && result.riskRating !== 'negative_ev' && (
              <button
                onClick={() => onApplyStake(result.recommendedStakePct, result.recommendedStakeAmount)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Appliquer {result.recommendedStakeAmount} {currency} ({result.recommendedStakePct}%)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="text-[10px] text-slate-400 text-center leading-tight">
              {result.riskRating === 'safe' && '🛡️ Dimensionnement conservateur : Protège le capital lors des séries de variance.'}
              {result.riskRating === 'optimal' && '🎯 Dimensionnement optimal : Ratio idéal entre vitesse de croissance et risque.'}
              {result.riskRating === 'aggressive' && '⚡ Dimensionnement agressif : Forte variance à prévoir.'}
              {result.riskRating === 'negative_ev' && '⛔ Cote sous-évaluée par rapport au risque probabiliste.'}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
