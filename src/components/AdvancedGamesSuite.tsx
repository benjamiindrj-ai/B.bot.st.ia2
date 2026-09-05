import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Activity, 
  Info,
  Dice5,
  TrendingUp,
  Percent,
  Play,
  RotateCcw
} from 'lucide-react';
import { StakeGameType } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface AdvancedGamesSuiteProps {
  onSelectGameStrategy?: (game: StakeGameType, name: string) => void;
  currency: string;
}

// Basic Strategy Matrix for Blackjack
type BJAction = 'H' | 'S' | 'D' | 'Dh' | 'P' | 'Rh';
// H: Hit, S: Stand, D: Double if allowed else Stand, Dh: Double else Hit, P: Split, Rh: Surrender else Hit

export const AdvancedGamesSuite: React.FC<AdvancedGamesSuiteProps> = ({
  onSelectGameStrategy,
  currency,
}) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'blackjack' | 'roulette' | 'crash' | 'odds-calc'>('blackjack');

  // --- BLACKJACK STATE ---
  const [playerType, setPlayerType] = useState<'hard' | 'soft' | 'pair'>('hard');
  const [playerValue, setPlayerValue] = useState<number>(12); // e.g. 12 or A,7 or 8,8
  const [dealerCard, setDealerCard] = useState<number>(6); // 2 through 11 (11 = Ace)

  // --- ROULETTE STATE ---
  const [rouletteSector, setRouletteSector] = useState<'voisins' | 'tiers' | 'orphelins' | 'zero' | 'dozens'>('voisins');
  const [unitBet, setUnitBet] = useState<number>(1.0);

  // --- CRASH / LIMBO STATE ---
  const [crashTarget, setCrashTarget] = useState<number>(2.0);
  const [crashBankroll, setCrashBankroll] = useState<number>(100);

  // Helper for Blackjack Optimal Decision
  const getBlackjackDecision = (type: 'hard' | 'soft' | 'pair', val: number, upcard: number): { action: string; badge: string; color: string; desc: string } => {
    // Basic strategy Stake rules (Dealer stands on Soft 17, 99.43% RTP)
    if (type === 'pair') {
      if (val === 11 || val === 8) return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Toujours séparer les As et les 8 contre n’importe quelle carte du croupier.' };
      if (val === 10) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Ne JAMAIS séparer une paire de 10 ou figures (20 est une main quasi-gagnante).' };
      if (val === 9) {
        if ([7, 10, 11].includes(upcard)) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Rester avec 18 contre un 7, 10 ou As.' };
        return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Séparer les 9 contre 2 à 6, et 8 ou 9.' };
      }
      if (val === 7) {
        if (upcard <= 7) return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Séparer contre 2 à 7.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer avec 14 contre un 8+.' };
      }
      if (val === 6) {
        if (upcard >= 3 && upcard <= 6) return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Séparer contre les cartes faibles 3 à 6.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer sinon.' };
      }
      if (val === 5) {
        if (upcard <= 9) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Paire de 5 = 10 : Doubler contre 2 à 9.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 10 ou As.' };
      }
      if (val === 4) {
        if (upcard === 5 || upcard === 6) return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Séparer seulement contre 5 ou 6.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre les autres cartes.' };
      }
      if (val === 2 || val === 3) {
        if (upcard <= 7) return { action: 'SPLIT (Séparer)', badge: 'P', color: 'bg-emerald-600 text-white', desc: 'Séparer contre 2 à 7.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 8+.' };
      }
    }

    if (type === 'soft') {
      // val = 13 (A,2) up to 20 (A,9)
      if (val >= 20) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Soft 20 ou 21 : Rester systématiquement.' };
      if (val === 19) {
        if (upcard === 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre un 6, sinon rester.' };
        return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Soft 19 (A,8) : Rester.' };
      }
      if (val === 18) {
        if (upcard >= 2 && upcard <= 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 2 à 6.' };
        if (upcard === 7 || upcard === 8) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Rester contre 7 ou 8.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 9, 10 ou As.' };
      }
      if (val === 17) {
        if (upcard >= 3 && upcard <= 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 3 à 6.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 2, 7, 8, 9, 10, As.' };
      }
      if (val === 15 || val === 16) {
        if (upcard >= 4 && upcard <= 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 4 à 6.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer.' };
      }
      if (val === 13 || val === 14) {
        if (upcard === 5 || upcard === 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 5 ou 6.' };
        return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer.' };
      }
    }

    // Hard Totals
    if (val >= 17) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Ne jamais tirer au-delà de 17 dur (risque de bust > 69%).' };
    if (val >= 13 && val <= 16) {
      if (upcard >= 2 && upcard <= 6) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Le croupier a une forte chance de bust (35% à 42%). Laissez-le tirer.' };
      if (val === 16 && (upcard === 9 || upcard === 10 || upcard === 11)) return { action: 'SURRENDER ou HIT', badge: 'Rh', color: 'bg-rose-600 text-white', desc: 'Abandonnez si disponible, sinon tirez.' };
      return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre un 7 ou plus.' };
    }
    if (val === 12) {
      if (upcard >= 4 && upcard <= 6) return { action: 'STAND (Rester)', badge: 'S', color: 'bg-amber-600 text-white', desc: 'Rester contre 4, 5 ou 6 uniquement.' };
      return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 2, 3 ou 7+.' };
    }
    if (val === 11) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler systématiquement avec 11 (meilleure situation mathématique).' };
    if (val === 10) {
      if (upcard <= 9) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 2 à 9.' };
      return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer contre 10 ou As.' };
    }
    if (val === 9) {
      if (upcard >= 3 && upcard <= 6) return { action: 'DOUBLE (Doubler)', badge: 'D', color: 'bg-purple-600 text-white', desc: 'Doubler contre 3, 4, 5 ou 6.' };
      return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Tirer.' };
    }
    return { action: 'HIT (Tirer)', badge: 'H', color: 'bg-blue-600 text-white', desc: 'Main trop faible (8 ou moins) : tirer obligatoirement.' };
  };

  const bjDecision = getBlackjackDecision(playerType, playerValue, dealerCard);

  // Roulette Sectors Data
  const rouletteSectorsData = {
    voisins: {
      name: 'Voisins du Zéro (17 Numéros)',
      numbers: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
      chipsNeeded: 9,
      coveragePct: 45.9,
      payoutRatio: '24:9 ou 18:9 (gain net +15 à +9 jetons)',
      desc: 'Couvre presque la moitié du cylindre européen avec 9 jetons combinés (Transversale 0/2/3, Carré 25/29, et Chevalets).'
    },
    tiers: {
      name: 'Tiers du Cylindre (12 Numéros)',
      numbers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
      chipsNeeded: 6,
      coveragePct: 32.4,
      payoutRatio: '18:6 (gain net +12 jetons)',
      desc: 'Couvre exactement un tiers du cylindre opposé au zéro avec 6 chevalets (5/8, 10/11, 13/16, 23/24, 27/30, 33/36).'
    },
    orphelins: {
      name: 'Orphelins à Cheval (8 Numéros)',
      numbers: [1, 20, 14, 31, 9, 17, 34, 6],
      chipsNeeded: 5,
      coveragePct: 21.6,
      payoutRatio: '36:5 ou 18:5 (gain net +31 ou +13 jetons)',
      desc: 'Comble les deux sections orphelines (Plein sur le 1, et 4 chevalets 6/9, 14/17, 17/20, 31/34).'
    },
    zero: {
      name: 'Jeu Zéro (7 Numéros)',
      numbers: [12, 35, 3, 26, 0, 32, 15],
      chipsNeeded: 4,
      coveragePct: 18.9,
      payoutRatio: '36:4 ou 18:4 (gain net +32 ou +14 jetons)',
      desc: 'Mini-secteur ultra concentré autour de la case 0 (1 plein sur 26, et 3 chevalets).'
    },
    dozens: {
      name: 'Rotation 2 Douzaines Équilibrée (24 Numéros)',
      numbers: Array.from({ length: 24 }, (_, i) => i + 1),
      chipsNeeded: 2,
      coveragePct: 64.8,
      payoutRatio: '3:2 (gain net +1 unité)',
      desc: 'Miser sur 2 douzaines simultanément (ou 2 colonnes) pour un taux de gain élevé de 64.86% sans emballement.'
    }
  };

  const activeSector = rouletteSectorsData[rouletteSector];

  // Crash Math
  const crashWinChance = Number((99 / crashTarget).toFixed(2));
  const crashEV = Number(((crashWinChance / 100) * (crashTarget - 1) - (1 - crashWinChance / 100)).toFixed(4));
  // Kelly fraction: f* = (bp - q) / b
  const b = crashTarget - 1;
  const p = crashWinChance / 100;
  const q = 1 - p;
  const rawKelly = b > 0 ? (b * p - q) / b : 0;
  const safeKellyBetPct = Math.max(0.1, Math.min(2.5, Number((rawKelly * 25).toFixed(2)))); // 1/4th Kelly bounded
  const suggestedBet = Number(((crashBankroll * safeKellyBetPct) / 100).toFixed(2));

  return (
    <div className="space-y-6">
      
      {/* Sub-nav Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Suite Jeux Avancés & Matrices Mathématiques
            </h3>
            <p className="text-xs text-slate-400">
              Blackjack Basic Strategy, Secteurs Roulette Européenne & Calculateurs de Cotes
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold self-start sm:self-auto">
            RTP Optimisé 99.4%
          </span>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveSubTab('blackjack')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'blackjack'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🃏 Blackjack Stratégie</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roulette')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'roulette'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🎡 Roulette Secteurs</span>
          </button>

          <button
            onClick={() => setActiveSubTab('crash')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'crash'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🚀 Crash / Limbo EV</span>
          </button>

          <button
            onClick={() => setActiveSubTab('odds-calc')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'odds-calc'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>📊 Cotes & Probabilités</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: BLACKJACK BASIC STRATEGY MATRIX --- */}
      {activeSubTab === 'blackjack' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Decision Trainer Card */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Calculateur de Décision Optimale (Stake Blackjack)</span>
                </h4>
                <p className="text-xs text-slate-400">Règle Stand on Soft 17 • Avantage maison réduit à 0.57%</p>
              </div>
            </div>

            {/* Hand Type selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Type de main joueur :</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setPlayerType('hard'); setPlayerValue(13); }}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    playerType === 'hard' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Total Dur (Hard)
                </button>
                <button
                  type="button"
                  onClick={() => { setPlayerType('soft'); setPlayerValue(17); }}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    playerType === 'soft' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Main avec As (Soft)
                </button>
                <button
                  type="button"
                  onClick={() => { setPlayerType('pair'); setPlayerValue(8); }}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    playerType === 'pair' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Paire (Splits)
                </button>
              </div>
            </div>

            {/* Player Hand Value Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {playerType === 'hard' ? 'Votre Total de points :' : playerType === 'soft' ? 'Votre main Soft :' : 'Votre Paire :'}
              </label>
              
              {playerType === 'hard' && (
                <div className="grid grid-cols-6 gap-1.5">
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPlayerValue(v)}
                      className={`py-1.5 rounded text-xs font-mono font-bold transition ${
                        playerValue === v ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {playerType === 'soft' && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'A,2 (13)', val: 13 },
                    { label: 'A,3 (14)', val: 14 },
                    { label: 'A,4 (15)', val: 15 },
                    { label: 'A,5 (16)', val: 16 },
                    { label: 'A,6 (17)', val: 17 },
                    { label: 'A,7 (18)', val: 18 },
                    { label: 'A,8 (19)', val: 19 },
                    { label: 'A,9 (20)', val: 20 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setPlayerValue(item.val)}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition ${
                        playerValue === item.val ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {playerType === 'pair' && (
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '2,2', val: 2 },
                    { label: '3,3', val: 3 },
                    { label: '4,4', val: 4 },
                    { label: '5,5', val: 5 },
                    { label: '6,6', val: 6 },
                    { label: '7,7', val: 7 },
                    { label: '8,8', val: 8 },
                    { label: '9,9', val: 9 },
                    { label: '10,10', val: 10 },
                    { label: 'A,A', val: 11 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setPlayerValue(item.val)}
                      className={`py-1.5 rounded text-xs font-mono font-bold transition ${
                        playerValue === item.val ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dealer Upcard Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Carte visible du croupier (Upcard) :
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                {[
                  { label: '2', val: 2 },
                  { label: '3', val: 3 },
                  { label: '4', val: 4 },
                  { label: '5', val: 5 },
                  { label: '6', val: 6 },
                  { label: '7', val: 7 },
                  { label: '8', val: 8 },
                  { label: '9', val: 9 },
                  { label: '10', val: 10 },
                  { label: 'As', val: 11 },
                ].map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => setDealerCard(c.val)}
                    className={`py-2 rounded-lg text-xs font-mono font-bold border transition ${
                      dealerCard === c.val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decision Result Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Action Mathématique Recommandée :</span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-extrabold ${bjDecision.color}`}>
                  {bjDecision.badge}
                </span>
              </div>
              <p className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {bjDecision.action}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {bjDecision.desc}
              </p>
            </div>
          </div>

          {/* Blackjack Golden Rules & Card Matrix */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Les 4 Piliers Fondamentaux du Blackjack
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center flex-shrink-0">1</span>
                <div>
                  <strong className="text-white block font-semibold">Toujours Séparer As et 8 :</strong>
                  <span className="text-slate-400">Une paire d'As donne deux opportunités de 21. Une paire de 8 (16) est la pire main, la séparer permet de repartir sur deux 8 offensifs.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center flex-shrink-0">2</span>
                <div>
                  <strong className="text-white block font-semibold">Ne JAMAIS Prendre l'Assurance :</strong>
                  <span className="text-slate-400">L'assurance paie 2 contre 1 alors que la probabilité réelle que le croupier ait un blackjack est de 9 sur 13 (avantage maison de 7.4% !).</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center flex-shrink-0">3</span>
                <div>
                  <strong className="text-white block font-semibold">Doubler sur 10 et 11 :</strong>
                  <span className="text-slate-400">Doubler la mise lorsque le croupier a une carte faible (2 à 9) maximise l'espérance de gain grâce à la forte concentration de cartes valant 10 (30.8%).</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center flex-shrink-0">4</span>
                <div>
                  <strong className="text-white block font-semibold">Laisser le Croupier Sauter (Bust) :</strong>
                  <span className="text-slate-400">Lorsque vous avez 12 à 16 et que le croupier montre un 4, 5 ou 6, ne prenez aucun risque : il sautera dans plus de 40% des cas.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: ROULETTE FRENCH SECTORS --- */}
      {activeSubTab === 'roulette' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Sélectionner un Secteur du Cylindre</span>
            </h4>

            <div className="space-y-2">
              {(['voisins', 'tiers', 'orphelins', 'zero', 'dozens'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setRouletteSector(key)}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    rouletteSector === key
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{rouletteSectorsData[key].name}</span>
                    <span className="text-[11px] text-slate-400">Couverture : {rouletteSectorsData[key].coveragePct}%</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {rouletteSectorsData[key].chipsNeeded} jetons
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Mise unitaire par jeton :</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={unitBet}
                  onChange={(e) => setUnitBet(Math.max(0.1, Number(e.target.value)))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono w-full"
                />
                <span className="text-xs font-bold text-slate-400">{currency}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mise totale par lancer : <strong className="text-emerald-400">{(unitBet * activeSector.chipsNeeded).toFixed(2)} {currency}</strong>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">{activeSector.name}</h4>
                <p className="text-xs text-slate-400">Probabilité mathématique de sortie : <strong className="text-emerald-400">{activeSector.coveragePct}%</strong></p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-mono font-bold">
                {activeSector.payoutRatio}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activeSector.desc}
            </p>

            {/* Numbers Grid */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">Numéros couverts ({activeSector.numbers.length}/37) :</span>
              <div className="flex flex-wrap gap-1.5">
                {activeSector.numbers.map((n) => (
                  <span
                    key={n}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                      n === 0
                        ? 'bg-emerald-600 text-white'
                        : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n)
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              💡 <strong>Gestion de mise constructive :</strong> Pour la Roulette Européenne (RTP 97.3%), évitez la Martingale sur les chances simples. Utilisez la rotation de secteurs ou 2 douzaines avec mise plate pour accumuler 5 à 10 unités par session puis encaissez.
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CRASH / LIMBO EV & ASYMMETRY CALCULATOR --- */}
      {activeSubTab === 'crash' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Calculateur Quantitatif Crash & Limbo
            </h4>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Multiplicateur Cible (Cashout) :</span>
                <span className="text-emerald-400 font-mono font-bold">{crashTarget.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1.05"
                max="20.0"
                step="0.05"
                value={crashTarget}
                onChange={(e) => setCrashTarget(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Solde de référence :</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  value={crashBankroll}
                  onChange={(e) => setCrashBankroll(Math.max(1, Number(e.target.value)))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono w-full"
                />
                <span className="text-xs font-bold text-slate-400">{currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Chance Réelle (99% RTP)</span>
                <span className="text-base font-mono font-bold text-emerald-400">{crashWinChance}%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Mise Kelly Optimale (1/4)</span>
                <span className="text-base font-mono font-bold text-indigo-400">{suggestedBet} {currency} ({safeKellyBetPct}%)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-400" />
              Tableau des Cibles Fréquentes
            </h4>

            <div className="space-y-1.5 text-xs">
              {[
                { mult: 1.10, prob: '90.00%', risk: 'Ultra Sûr (Scalp)', betPct: '2.0%' },
                { mult: 1.35, prob: '73.33%', risk: 'Faible (Kelly)', betPct: '1.5%' },
                { mult: 2.00, prob: '49.50%', risk: 'Modéré (Coin flip)', betPct: '1.0%' },
                { mult: 5.00, prob: '19.80%', risk: 'Élevé (Asymétrique)', betPct: '0.3%' },
                { mult: 10.00, prob: '9.90%', risk: 'Spéculatif (Sniper)', betPct: '0.15%' },
              ].map((row) => (
                <div
                  key={row.mult}
                  onClick={() => setCrashTarget(row.mult)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between transition"
                >
                  <span className="font-mono font-bold text-white">{row.mult.toFixed(2)}x</span>
                  <span className="text-emerald-400 font-mono">{row.prob}</span>
                  <span className="text-slate-400">{row.risk}</span>
                  <span className="text-indigo-300 font-mono text-[11px]">Mise: {row.betPct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ODDS CALCULATOR --- */}
      {activeSubTab === 'odds-calc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-400" />
                Spécifications Officielles Stake.com & Gains Maximums par Original
              </h4>
              <p className="text-xs text-slate-400">RTP certifiés Provably Fair HMAC-SHA256 et plafonds mathématiques de multiplicateurs</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-mono font-bold self-start sm:self-auto">
              RTP Standard : 99.00%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">Jeu Original Stake</th>
                  <th className="py-2.5 px-3">Gain Max Théorique</th>
                  <th className="py-2.5 px-3">RTP Officiel</th>
                  <th className="py-2.5 px-3">Avantage Maison</th>
                  <th className="py-2.5 px-3">Volatilité</th>
                  <th className="py-2.5 px-3">Stratégie Optimale Constructive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Plinko
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x10,000 (16 Rows High)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Élevée à Extrême</td>
                  <td className="py-2.5 px-3 text-slate-400">Mise plate 0.05% bankroll, 14 ou 16 rangées</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Dice
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x9,900 (0.01% Win)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Ajustable (1.01x - 9900x)</td>
                  <td className="py-2.5 px-3 text-slate-400">Oscar's Grind (+1u/cycle) ou D'Alembert</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Limbo
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x1,000,000</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Variable / Illimitée</td>
                  <td className="py-2.5 px-3 text-slate-400">Paroli 1-2-4 ou Fractional Kelly (1.35x)</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    Mines
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x5,148,297 (24M / 1D)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Modérée à Extrême</td>
                  <td className="py-2.5 px-3 text-slate-400">1 Mine / 3 gemmes (88% probabilité)</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Crash
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x1,000,000</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Continue / exponentielle</td>
                  <td className="py-2.5 px-3 text-slate-400">Auto-cashout 1.95x discipliné</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Keno
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x1,000 (10/10 High)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Moyenne à Élevée</td>
                  <td className="py-2.5 px-3 text-slate-400">Sélection 3 à 4 numéros (asymétrie)</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Hilo
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x1,000,000 (Multi-cartes)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.00%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">1.00%</td>
                  <td className="py-2.5 px-3 text-slate-300">Modérée</td>
                  <td className="py-2.5 px-3 text-slate-400">Step-down lock dès x1.50</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Blackjack Original
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x2.5 (ou 4x Double)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-mono">99.43%</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">0.57%</td>
                  <td className="py-2.5 px-3 text-slate-300">Faible</td>
                  <td className="py-2.5 px-3 text-slate-400">Basic Strategy mathématique parfaite</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Roulette Européenne
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono font-bold">x36 (Numéro plein)</td>
                  <td className="py-2.5 px-3 text-amber-400 font-mono">97.30%</td>
                  <td className="py-2.5 px-3 text-rose-400 font-mono">2.70%</td>
                  <td className="py-2.5 px-3 text-slate-300">Faible à Moyenne</td>
                  <td className="py-2.5 px-3 text-slate-400">Voisins du Zéro / 2 Douzaines</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
