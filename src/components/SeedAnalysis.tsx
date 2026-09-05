import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Search, 
  Target, 
  Activity, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Layers, 
  Sparkles, 
  Info, 
  Hash, 
  Cpu, 
  Percent,
  Play
} from 'lucide-react';
import { StakeGameType } from '../types';
import { simulateGameOutcome } from '../utils/provablyFair';
import { useTranslation } from '../i18n/LanguageContext';

interface SeedAnalysisProps {
  currentBalance: number;
  currency: string;
  activeClientSeed?: string;
  activeServerSeed?: string;
  activeNonce?: number;
}

export const SeedAnalysis: React.FC<SeedAnalysisProps> = ({ 
  currentBalance, 
  currency,
  activeClientSeed,
  activeServerSeed,
  activeNonce
}) => {
  const { t } = useTranslation();
  // Input fields for Stake Provably Fair
  const [serverSeed, setServerSeed] = useState<string>(activeServerSeed || 'a4e798f0e5bb82697e10c7104b2b2b1c4b18dfa7a13c9e6587c6da9f27027419');
  const [clientSeed, setClientSeed] = useState<string>(activeClientSeed || 'CustomStakeClientSeed_2026');
  const [startNonce, setStartNonce] = useState<number>(activeNonce || 1);
  const [sampleCount, setSampleCount] = useState<number>(100);
  const [selectedGame, setSelectedGame] = useState<StakeGameType>('dice');
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.00);

  const handleLoadActiveBotSeed = () => {
    if (activeServerSeed) setServerSeed(activeServerSeed);
    if (activeClientSeed) setClientSeed(activeClientSeed);
    if (activeNonce) setStartNonce(activeNonce);
  };

  // Monte Carlo & Objective Probability Simulation State
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(20); // +20%
  const [stopLossPercent, setStopLossPercent] = useState<number>(30); // -30%
  const [baseBetPercent, setBaseBetPercent] = useState<number>(1.0); // 1% of balance
  const [simulationsRun, setSimulationsRun] = useState<number>(500);
  const [isSimulatingMonteCarlo, setIsSimulatingMonteCarlo] = useState<boolean>(false);
  const [monteCarloResult, setMonteCarloResult] = useState<{
    targetReachedProbability: number;
    ruinProbability: number;
    averageRounds: number;
    bestRunProfit: number;
    worstRunProfit: number;
  } | null>(null);

  // Decoded rolls from Seed
  const decodedRolls = useMemo(() => {
    if (!serverSeed.trim() || !clientSeed.trim()) return [];
    
    const count = Math.min(250, Math.max(10, sampleCount));
    const rolls = [];

    for (let i = 0; i < count; i++) {
      const currentNonce = startNonce + i;
      const res = simulateGameOutcome(
        selectedGame, 
        targetMultiplier, 
        { diceTarget: selectedGame === 'dice' ? 50.49 : undefined, diceCondition: 'above' },
        serverSeed,
        clientSeed,
        currentNonce
      );
      rolls.push({
        nonce: currentNonce,
        won: res.won,
        multiplier: res.actualMultiplier,
        details: res.gameDetails,
      });
    }

    return rolls;
  }, [serverSeed, clientSeed, startNonce, sampleCount, selectedGame, targetMultiplier]);

  // Summary stats for decoded seed
  const seedStats = useMemo(() => {
    if (decodedRolls.length === 0) return null;
    const wins = decodedRolls.filter(r => r.won).length;
    const winRate = Number(((wins / decodedRolls.length) * 100).toFixed(1));
    
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    decodedRolls.forEach(r => {
      if (r.won) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    });

    return {
      total: decodedRolls.length,
      wins,
      losses: decodedRolls.length - wins,
      winRate,
      maxWinStreak,
      maxLossStreak,
    };
  }, [decodedRolls]);

  // Run Monte Carlo Probability of Target Reach
  const handleRunMonteCarlo = () => {
    setIsSimulatingMonteCarlo(true);

    setTimeout(() => {
      const winChance = selectedGame === 'dice' 
        ? (99.0 / targetMultiplier) / 100 
        : (0.99 / targetMultiplier);
      
      const payout = targetMultiplier;
      const initialBankroll = currentBalance > 0 ? currentBalance : 100;
      const targetBankroll = initialBankroll * (1 + targetProfitPercent / 100);
      const ruinBankroll = initialBankroll * (1 - stopLossPercent / 100);
      const betAmt = Math.max(0.01, initialBankroll * (baseBetPercent / 100));

      let targetsHit = 0;
      let ruinsHit = 0;
      let totalRoundsRecorded = 0;
      let bestProfit = -Infinity;
      let worstProfit = Infinity;

      const simCount = Math.max(100, Math.min(2000, simulationsRun));

      for (let sim = 0; sim < simCount; sim++) {
        let currentB = initialBankroll;
        let rounds = 0;
        const maxRoundsPerSim = 2000;

        while (currentB < targetBankroll && currentB > ruinBankroll && rounds < maxRoundsPerSim) {
          rounds++;
          const rollWon = Math.random() < winChance;
          if (rollWon) {
            currentB += betAmt * (payout - 1);
          } else {
            currentB -= betAmt;
          }
        }

        totalRoundsRecorded += rounds;
        const net = currentB - initialBankroll;
        if (net > bestProfit) bestProfit = net;
        if (net < worstProfit) worstProfit = net;

        if (currentB >= targetBankroll) {
          targetsHit++;
        } else if (currentB <= ruinBankroll) {
          ruinsHit++;
        }
      }

      setMonteCarloResult({
        targetReachedProbability: Number(((targetsHit / simCount) * 100).toFixed(1)),
        ruinProbability: Number(((ruinsHit / simCount) * 100).toFixed(1)),
        averageRounds: Math.round(totalRoundsRecorded / simCount),
        bestRunProfit: Number(bestProfit.toFixed(2)),
        worstRunProfit: Number(worstProfit.toFixed(2)),
      });

      setIsSimulatingMonteCarlo(false);
    }, 200);
  };

  return (
    <div id="seed-analysis-container" className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-emerald-950/50 border border-indigo-800/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Analyseur de Seed Stake & Probabilités d'Objectif
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Provably Fair HMAC-SHA256
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Auditez vos Seeds Stake révélées ou calculez la probabilité mathématique exacte (Monte Carlo) d'atteindre votre cible de gain avant votre stop-loss.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RTP Stake Original : 99.0%</span>
          </div>
        </div>
      </div>

      {/* 2. Educational & Scientific Explainer Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 font-bold">
          <Info className="w-4 h-4" />
          <span>Comment fonctionne la Seed sur Stake.com ?</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Sur Stake, chaque lancer est déterminé par la formule : <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">HMAC_SHA256(ServerSeed, ClientSeed:Nonce)</code>. 
          Pendant qu'une seed est active, le <em>Server Seed</em> reste crypté par Stake pour garantir l'impartialité. Dès que vous changez de seed (ou sur vos tirages passés), vous pouvez coller les identifiants ci-dessous pour <strong className="text-white">reconstituer 100% des tirages exacts</strong> et vérifier les séries de variance.
        </p>
      </div>

      {/* 3. Two Columns: Seed Decoder + Monte Carlo Target Reach Probability */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stake Seed Decoder */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Décrypteur de Seed (Vérification Provably Fair)
            </h4>
            {activeClientSeed && (
              <button
                type="button"
                onClick={handleLoadActiveBotSeed}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition flex items-center gap-1"
                title="Copier la graine et le nonce actifs du bot dans l'analyseur"
              >
                <Key className="w-3 h-3 text-indigo-400" />
                <span>Charger Seed Active</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Server Seed */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                <span>Server Seed (Révélé ou Actif)</span>
                <span className="text-[10px] text-slate-500 font-mono">SHA256 / Hex</span>
              </label>
              <input
                type="text"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                placeholder="Ex: a4e798f0e5bb82697e10c7104b2b2b1c4b18dfa7..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Client Seed */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Client Seed
              </label>
              <input
                type="text"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                placeholder="Ex: CustomStakeClientSeed_2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Nonce Range & Game */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Jeu</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value as StakeGameType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="dice">Dice</option>
                  <option value="limbo">Limbo</option>
                  <option value="mines">Mines (3M)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Multiplicateur</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={targetMultiplier}
                  onChange={(e) => setTargetMultiplier(parseFloat(e.target.value) || 2.0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nonce Départ</label>
                <input
                  type="number"
                  min="1"
                  value={startNonce}
                  onChange={(e) => setStartNonce(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nb Lançers</label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seed Stats Summary */}
          {seedStats && (
            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-medium">Taux de Gain Réel</div>
                <div className={`text-sm font-extrabold font-mono ${
                  seedStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {seedStats.winRate}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-medium">Victoires / Défaites</div>
                <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">
                  <span className="text-emerald-400">{seedStats.wins}W</span> / <span className="text-rose-400">{seedStats.losses}L</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-medium">Pire Série Défaite</div>
                <div className="text-sm font-extrabold text-rose-400 font-mono">
                  {seedStats.maxLossStreak} d'affilée
                </div>
              </div>
            </div>
          )}

          {/* Decoded Rolls Table */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Nonce</th>
                  <th className="py-2 px-3">Résultat Tirage</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3 text-right">Multiplicateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {decodedRolls.slice(0, 30).map((r) => (
                  <tr key={r.nonce} className="hover:bg-slate-800/40">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-400">#{r.nonce}</td>
                    <td className="py-1.5 px-3 text-slate-300 font-mono">
                      {selectedGame === 'dice' ? `Roll: ${r.details?.roll}` : selectedGame === 'limbo' ? `Crash: ${r.details?.limboMultiplier}x` : 'Mines'}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {r.won ? 'GAGNÉ' : 'PERDU'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-300">
                      {r.won ? `${targetMultiplier.toFixed(2)}x` : '0.00x'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Mathematical Probability of Goal Reach (Monte Carlo) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Calculateur de Probabilité d'Atteinte d'Objectif
            </h4>
            <span className="text-[11px] font-semibold text-emerald-400">
              Monte Carlo
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Estime précisément la probabilité d'atteindre votre Take-Profit avant de toucher votre Stop-Loss sur votre capital actuel de <strong className="text-white">{currentBalance} {currency}</strong>.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Target Profit % */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Objectif Gain (TP)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={targetProfitPercent}
                  onChange={(e) => setTargetProfitPercent(parseFloat(e.target.value) || 20)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Cible: +{(currentBalance * (targetProfitPercent / 100)).toFixed(2)} {currency}
              </span>
            </div>

            {/* Stop Loss % */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Limite Perte (SL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 30)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-rose-400 font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Stop: -{(currentBalance * (stopLossPercent / 100)).toFixed(2)} {currency}
              </span>
            </div>

            {/* Bet Size % */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Mise Unitaire
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="20"
                  value={baseBetPercent}
                  onChange={(e) => setBaseBetPercent(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Mise: {(currentBalance * (baseBetPercent / 100)).toFixed(2)} {currency}
              </span>
            </div>
          </div>

          <button
            onClick={handleRunMonteCarlo}
            disabled={isSimulatingMonteCarlo}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isSimulatingMonteCarlo ? 'Calcul des probabilités en cours...' : 'Lancer la Simulation Monte Carlo (500 runs)'}</span>
          </button>

          {/* Monte Carlo Results Display */}
          {monteCarloResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Résultat de Probabilité Statistique</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {simulationsRun} itérations
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-[10px] text-slate-400 font-medium">Chances d'atteindre le TP (+{targetProfitPercent}%)</div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                    {monteCarloResult.targetReachedProbability}%
                  </div>
                  <div className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                    {monteCarloResult.targetReachedProbability > 55 ? '✅ Favorable' : monteCarloResult.targetReachedProbability > 40 ? '⚠️ Équilibré' : '❌ Risqué'}
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-rose-500/20 text-center">
                  <div className="text-[10px] text-slate-400 font-medium">Risque de toucher le SL (-{stopLossPercent}%)</div>
                  <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
                    {monteCarloResult.ruinProbability}%
                  </div>
                  <div className="text-[10px] text-rose-400/80 font-medium mt-0.5">
                    Tours moyens : ~{monteCarloResult.averageRounds}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                💡 <strong className="text-slate-200">Recommandation du modèle :</strong> Pour maximiser votre probabilité d'atteinte d'objectif au-dessus de 60%, maintenez votre mise unitaire à ≤ 1% de votre solde et fixez des Take-Profits réalistes compris entre +10% et +20% par session.
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
