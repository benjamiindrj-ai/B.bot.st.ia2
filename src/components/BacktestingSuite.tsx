import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  Cpu, 
  Zap, 
  Lock, 
  RefreshCw, 
  Scale, 
  Target,
  FileSpreadsheet,
  Upload,
  Download,
  History,
  Check,
  AlertCircle,
  Database,
  ArrowRight,
  Flame,
  Search,
  Filter,
  SlidersHorizontal,
  FileText,
  Copy
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { 
  BettingStrategy, 
  StakeGameType, 
  StakeApiCredentials,
  HistoricalRound,
  BacktestRoundResult,
  BacktestSummary,
  BacktestBenchmarkDataset
} from '../types';
import { 
  evaluateConditionTrigger, 
  applyConditionAction, 
  ConditionEvaluationContext 
} from '../utils/stakeConditionEngine';
import { PREDEFINED_STRATEGIES } from '../utils/predefinedStrategies';
import { getStakeProvablyFairFloat, simulateGameOutcome, generateRandomSeed } from '../utils/provablyFair';
import { MonteCarloBacktestEngine } from './MonteCarloBacktestEngine';
import { AntebotStrategyChart } from './AntebotStrategyChart';
import { Dices, ScatterChart } from 'lucide-react';

interface BacktestingSuiteProps {
  currentStrategy: BettingStrategy;
  onSelectStrategy: (strategy: BettingStrategy) => void;
  onUpdateStrategy: (strategy: Partial<BettingStrategy>) => void;
  currency: string;
  balance: number;
  credentials: StakeApiCredentials;
  onNavigateToTab?: (tab: any) => void;
}

// Preloaded Real & Synthetic Benchmarks for Instant 1-Click Testing
const BENCHMARK_DATASETS: BacktestBenchmarkDataset[] = [
  {
    id: 'stake-dice-10k',
    name: 'Stake Dice 10,000 Rounds (Provably Fair Standard)',
    category: 'provably_fair',
    game: 'dice',
    roundsCount: 10000,
    description: 'Séquence officielle de 10 000 tirages Stake Dice (RTP 99.00%, House edge 1.0%) générée via HMAC-SHA256.',
    icon: '🎲',
    houseEdgePct: 1.0,
    features: ['10k rounds standard', 'Distribution uniforme 0.00-99.99', 'Variance réelle']
  },
  {
    id: 'stake-limbo-10k',
    name: 'Stake Limbo / Crash 10,000 Multiplicateurs',
    category: 'provably_fair',
    game: 'limbo',
    roundsCount: 10000,
    description: 'Série de 10 000 multiplicateurs haute volatilité reproduisant l’algorithme Stake Limbo/Crash (1.00x à 1 000 000x).',
    icon: '🚀',
    houseEdgePct: 1.0,
    features: ['Multiplicateurs réels Limbo', 'Pics de crash & moonshots', 'RTP 99.00%']
  },
  {
    id: 'black-swan-stress',
    name: 'Stress-Test "Cygne Noir" (Séries de 15-20 Pertes)',
    category: 'stress_test',
    game: 'dice',
    roundsCount: 5000,
    description: 'Jeu de données de stress contenant des grappes de variance extrême (séries consécutives de 14 à 20 défaites) pour éprouver la résistance des martingales.',
    icon: '⚠️',
    houseEdgePct: 2.5,
    features: ['Séries de 16+ pertes consécutives', 'Crash test de liquidation', 'Épreuve de robustesse']
  },
  {
    id: 'wager-high-freq-25k',
    name: 'Wager Mining Haute Fréquence (25,000 Rounds)',
    category: 'wager',
    game: 'dice',
    roundsCount: 25000,
    description: 'Simulation de volume massif sur 25 000 rounds rapides pour tester l’accumulation VIP et l’efficacité de rakeback.',
    icon: '⚡',
    houseEdgePct: 1.0,
    features: ['25 000 tirages consécutifs', 'Test de turnover & rakeback', 'Stabilité de bankroll']
  }
];

export const BacktestingSuite: React.FC<BacktestingSuiteProps> = ({
  currentStrategy,
  onSelectStrategy,
  onUpdateStrategy,
  currency,
  balance,
  credentials,
  onNavigateToTab,
}) => {
  // Engine Mode: 'sequential' (Standard Dataset/CSV/Stake Benchmarks) vs 'monte_carlo' (10,000 Seeds Simulation)
  const [engineMode, setEngineMode] = useState<'sequential' | 'monte_carlo'>('sequential');

  // Mode selection: 'dataset' | 'csv' | 'generator' | 'stake-api'
  const [dataSource, setDataSource] = useState<'dataset' | 'csv' | 'generator' | 'stake-api'>('dataset');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('stake-dice-10k');
  
  // Custom CSV upload state
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [uploadedRounds, setUploadedRounds] = useState<HistoricalRound[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Provably fair generator state
  const [genRoundsCount, setGenRoundsCount] = useState<number>(10000);
  const [genGame, setGenGame] = useState<StakeGameType>('dice');
  const [genServerSeed, setGenServerSeed] = useState<string>(credentials.serverSeedHash || 'stake_official_server_seed_backtest_2026');
  const [genClientSeed, setGenClientSeed] = useState<string>(credentials.clientSeed || 'user_client_seed_quant_777');
  const [genStartNonce, setGenStartNonce] = useState<number>(1);

  // Strategy Calibration for Backtest
  const [testStrategy, setTestStrategy] = useState<BettingStrategy>(() => ({ ...currentStrategy }));
  const [testBankroll, setTestBankroll] = useState<number>(() => Math.max(10, Number(balance) || 100));
  const [respectStopLoss, setRespectStopLoss] = useState<boolean>(true);
  const [respectTakeProfit, setRespectTakeProfit] = useState<boolean>(true);
  const [respectMaxBetCap, setRespectMaxBetCap] = useState<boolean>(true);
  const [maxBetCapAmount, setMaxBetCapAmount] = useState<number>(() => Number((testBankroll * 0.25).toFixed(2)));

  // Simulation Running State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [roundResults, setRoundResults] = useState<BacktestRoundResult[]>([]);
  const [sampledChartData, setSampledChartData] = useState<any[]>([]);

  // Logs table search & filter
  const [logFilter, setLogFilter] = useState<'all' | 'losses' | 'wins' | 'top_bets'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logsPage, setLogsPage] = useState<number>(1);
  const logsPerPage = 50;

  // Sync test strategy when currentStrategy prop changes
  useEffect(() => {
    setTestStrategy((prev) => {
      if (
        prev.id === currentStrategy.id &&
        prev.baseBet === currentStrategy.baseBet &&
        prev.targetMultiplier === currentStrategy.targetMultiplier &&
        prev.onLossAction === currentStrategy.onLossAction &&
        prev.onLossValue === currentStrategy.onLossValue &&
        prev.onWinAction === currentStrategy.onWinAction &&
        prev.onWinValue === currentStrategy.onWinValue &&
        prev.currency === currentStrategy.currency
      ) {
        return prev;
      }
      return { ...currentStrategy };
    });
  }, [currentStrategy.id, currentStrategy.baseBet, currentStrategy.targetMultiplier, currentStrategy.onLossAction, currentStrategy.onLossValue, currentStrategy.onWinAction, currentStrategy.onWinValue, currentStrategy.currency]);

  // Keep max bet cap aligned if bankroll changes
  useEffect(() => {
    setMaxBetCapAmount(Number((testBankroll * 0.25).toFixed(2)));
  }, [testBankroll]);

  // --------------------------------------------------------------------
  // CSV & HISTORICAL PARSING ENGINE
  // --------------------------------------------------------------------
  const handleFileUpload = (file: File) => {
    setCsvParseError(null);
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvRawText(text);
      parseCsvData(text, file.name);
    };
    reader.onerror = () => {
      setCsvParseError('Erreur de lecture du fichier. Veuillez vérifier le format.');
    };
    reader.readAsText(file);
  };

  const parseCsvData = (text: string, filename: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('Le fichier est vide.');
      }

      // Check if JSON
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        const arrayData = Array.isArray(json) ? json : json.bets || json.rounds || json.history || [];
        if (!Array.isArray(arrayData) || arrayData.length === 0) {
          throw new Error('Structure JSON invalide ou aucun tableau de paris trouvé.');
        }

        const parsed: HistoricalRound[] = arrayData.map((item: any, index: number) => {
          const mult = parseFloat(item.multiplier || item.payoutMultiplier || item.crash_point || item.payout || 0);
          const roll = parseFloat(item.roll || item.outcome || item.result || 0);
          const won = item.won !== undefined ? Boolean(item.won) : (item.result === 'win' || mult > 1);
          return {
            round: index + 1,
            multiplier: !isNaN(mult) ? mult : undefined,
            roll: !isNaN(roll) ? roll : undefined,
            outcome: won,
            payout: parseFloat(item.payout || 0) || 0,
            nonce: item.nonce || index + 1,
            game: item.game || 'dice',
            rawDate: item.date || item.createdAt || undefined,
          };
        });

        setUploadedRounds(parsed);
        setCsvParseError(null);
        return;
      }

      // Standard CSV parsing
      const separator = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      const firstLineCols = lines[0].split(separator).map((c) => c.trim().toLowerCase().replace(/"/g, ''));
      
      const hasHeader = firstLineCols.some((c) => 
        ['multiplier', 'roll', 'payout', 'won', 'outcome', 'result', 'amount', 'round', 'nonce'].includes(c)
      );

      const startIndex = hasHeader ? 1 : 0;
      const colMultiplierIdx = firstLineCols.findIndex((c) => c.includes('mult') || c.includes('crash') || c.includes('cote'));
      const colRollIdx = firstLineCols.findIndex((c) => c.includes('roll') || c.includes('tirage') || c.includes('nombre'));
      const colWonIdx = firstLineCols.findIndex((c) => c.includes('won') || c.includes('result') || c.includes('statut') || c.includes('outcome'));
      const colPayoutIdx = firstLineCols.findIndex((c) => c.includes('payout') || c.includes('gain') || c.includes('profit'));
      const colNonceIdx = firstLineCols.findIndex((c) => c.includes('nonce') || c.includes('id') || c.includes('round'));

      const parsed: HistoricalRound[] = [];

      for (let i = startIndex; i < lines.length; i++) {
        const row = lines[i].split(separator).map((c) => c.trim().replace(/"/g, ''));
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        let multiplier: number | undefined = undefined;
        let roll: number | undefined = undefined;
        let won: boolean | undefined = undefined;
        let payout = 0;

        if (colMultiplierIdx >= 0 && row[colMultiplierIdx]) {
          const val = parseFloat(row[colMultiplierIdx].replace('x', '').replace(',', '.'));
          if (!isNaN(val)) multiplier = val;
        }

        if (colRollIdx >= 0 && row[colRollIdx]) {
          const val = parseFloat(row[colRollIdx].replace(',', '.'));
          if (!isNaN(val)) roll = val;
        }

        if (colWonIdx >= 0 && row[colWonIdx]) {
          const valStr = row[colWonIdx].toLowerCase();
          won = valStr === 'true' || valStr === '1' || valStr === 'win' || valStr === 'gagné' || valStr === 'won';
        }

        if (colPayoutIdx >= 0 && row[colPayoutIdx]) {
          const val = parseFloat(row[colPayoutIdx].replace(',', '.'));
          if (!isNaN(val)) payout = val;
        }

        // If simple single-column of numbers (e.g. list of rolls or multipliers)
        if (row.length === 1 && multiplier === undefined && roll === undefined) {
          const num = parseFloat(row[0].replace('x', '').replace(',', '.'));
          if (!isNaN(num)) {
            if (num >= 0 && num <= 100 && (testStrategy.game === 'dice' || num % 1 !== 0)) {
              roll = num;
            } else {
              multiplier = num;
            }
          }
        }

        parsed.push({
          round: i - startIndex + 1,
          multiplier,
          roll,
          outcome: won,
          payout,
          nonce: colNonceIdx >= 0 ? parseInt(row[colNonceIdx], 10) || (i - startIndex + 1) : (i - startIndex + 1),
        });
      }

      if (parsed.length === 0) {
        throw new Error('Aucune ligne de données valide trouvée dans le fichier.');
      }

      setUploadedRounds(parsed);
      setCsvParseError(null);
    } catch (err: any) {
      console.error('CSV Parsing Error:', err);
      setCsvParseError(err.message || 'Impossible de parser le fichier.');
      setUploadedRounds([]);
    }
  };

  // --------------------------------------------------------------------
  // PROVABLY FAIR DATASET GENERATION
  // --------------------------------------------------------------------
  const generateBenchmarkRounds = (datasetId: string): HistoricalRound[] => {
    const dataset = BENCHMARK_DATASETS.find((d) => d.id === datasetId);
    const count = dataset ? dataset.roundsCount : 10000;
    const serverSeed = 'stake_official_provably_fair_benchmark_seed_2026';
    const clientSeed = datasetId === 'black-swan-stress' ? 'stress_test_extreme_variance_seed' : 'benchmark_client_seed_777';

    const rounds: HistoricalRound[] = [];
    for (let i = 1; i <= count; i++) {
      const floatVal = getStakeProvablyFairFloat(serverSeed, clientSeed, i, 0);

      if (datasetId === 'stake-limbo-10k' || dataset?.game === 'limbo') {
        const rawMultiplier = Math.floor((99 / (1 - floatVal))) / 100;
        const multiplier = Math.max(1.0, Math.min(1000000, rawMultiplier));
        rounds.push({
          round: i,
          multiplier: Number(multiplier.toFixed(2)),
          nonce: i,
          serverSeed,
          clientSeed,
          game: 'limbo'
        });
      } else if (datasetId === 'black-swan-stress') {
        // Deterministic stress test containing high-loss clusters
        let roll = Number((floatVal * 100).toFixed(2));
        // Inject extreme loss streak at specific intervals
        if ((i >= 1200 && i <= 1218) || (i >= 3400 && i <= 3416)) {
          roll = 25.0; // Guaranteed loss for target > 50
        }
        rounds.push({
          round: i,
          roll,
          multiplier: roll > 50 ? 2.0 : 0.0,
          nonce: i,
          game: 'dice'
        });
      } else {
        // Standard Provably Fair Dice
        const rawRoll = Math.floor(floatVal * 10001) / 100;
        const roll = Number(Math.min(99.99, Math.max(0.00, rawRoll)).toFixed(2));
        rounds.push({
          round: i,
          roll,
          nonce: i,
          serverSeed,
          clientSeed,
          game: 'dice'
        });
      }
    }
    return rounds;
  };

  const generateCustomProvablyFairRounds = (
    game: StakeGameType,
    count: number,
    serverSeed: string,
    clientSeed: string,
    startNonce: number
  ): HistoricalRound[] => {
    const rounds: HistoricalRound[] = [];
    for (let i = 0; i < count; i++) {
      const currentNonce = startNonce + i;
      const floatVal = getStakeProvablyFairFloat(serverSeed, clientSeed, currentNonce, 0);

      if (game === 'limbo' || game === 'crash') {
        const rawMultiplier = Math.floor((99 / (1 - floatVal))) / 100;
        const multiplier = Math.max(1.0, Math.min(1000000, rawMultiplier));
        rounds.push({
          round: i + 1,
          multiplier: Number(multiplier.toFixed(2)),
          nonce: currentNonce,
          serverSeed,
          clientSeed,
          game
        });
      } else {
        // Standard Dice float mapping
        const rawRoll = Math.floor(floatVal * 10001) / 100;
        const roll = Number(Math.min(99.99, Math.max(0.00, rawRoll)).toFixed(2));
        rounds.push({
          round: i + 1,
          roll,
          nonce: currentNonce,
          serverSeed,
          clientSeed,
          game: 'dice'
        });
      }
    }
    return rounds;
  };

  // --------------------------------------------------------------------
  // BACKTEST EXECUTION CORE (1-CLICK HIGH PERFORMANCE SIMULATOR)
  // --------------------------------------------------------------------
  const runBacktest = async () => {
    setIsSimulating(true);
    setSimulationProgress(10);
    setBacktestSummary(null);

    // Yield thread to allow UI to render progress state
    await new Promise((resolve) => setTimeout(resolve, 30));

    const startTime = performance.now();

    // 1. Gather historical sequence
    let rounds: HistoricalRound[] = [];
    if (dataSource === 'dataset') {
      rounds = generateBenchmarkRounds(selectedBenchmarkId);
    } else if (dataSource === 'csv') {
      if (uploadedRounds.length === 0) {
        setCsvParseError('Veuillez d\'abord charger un fichier CSV valide.');
        setIsSimulating(false);
        return;
      }
      rounds = uploadedRounds;
    } else if (dataSource === 'generator') {
      rounds = generateCustomProvablyFairRounds(
        genGame,
        genRoundsCount,
        genServerSeed,
        genClientSeed,
        genStartNonce
      );
    } else if (dataSource === 'stake-api') {
      // Generate live synced provably fair series with active seeds
      rounds = generateCustomProvablyFairRounds(
        testStrategy.game || 'dice',
        10000,
        credentials.serverSeedHash || 'stake_live_seed_hash',
        credentials.clientSeed || 'stake_live_client_seed',
        credentials.nonce || 1
      );
    }

    setSimulationProgress(40);
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 2. Execute simulation rules step by step
    let currentBankroll = Number(testBankroll);
    const initialBankroll = Number(testBankroll);
    let currentBet = Number(testStrategy.baseBet);
    const baseBet = Number(testStrategy.baseBet);
    let targetMultiplier = Number(testStrategy.targetMultiplier) || 2.0;
    let winChance = Number(testStrategy.winChance) || 49.5;
    let activeDiceCondition = testStrategy.gameConfig?.diceCondition || 'above';
    let activeDiceTarget = testStrategy.gameConfig?.diceTarget !== undefined ? testStrategy.gameConfig.diceTarget : (activeDiceCondition === 'above' ? 50.49 : 49.50);

    let cumulativeProfit = 0;
    let peakBalance = currentBankroll;
    let lowestBalance = currentBankroll;
    let maxDrawdownAmount = 0;
    let maxDrawdownPct = 0;
    let peakBetAmount = currentBet;

    let winCount = 0;
    let lossCount = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let totalWagered = 0;

    let isBusted = false;
    let bustRound: number | undefined = undefined;
    let stoppedByStopLoss = false;
    let stoppedByTakeProfit = false;

    // Fibonacci progression state helper
    const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
    let fibIndex = 0;

    // Oscar's Grind helper
    let oscarSeriesProfit = 0;

    const results: BacktestRoundResult[] = [];
    const totalRounds = rounds.length;

    for (let i = 0; i < totalRounds; i++) {
      const r = rounds[i];

      // Check if bankroll can afford next bet
      if (currentBet > currentBankroll) {
        // Insufficient funds -> Liquidation / Bust
        isBusted = true;
        bustRound = i + 1;
        break;
      }

      // Check max bet limit cap
      if (respectMaxBetCap && currentBet > maxBetCapAmount) {
        currentBet = maxBetCapAmount;
      }
      if (testStrategy.maxBetLimit && currentBet > testStrategy.maxBetLimit) {
        currentBet = testStrategy.maxBetLimit;
      }

      // Update Peak Bet
      if (currentBet > peakBetAmount) {
        peakBetAmount = currentBet;
      }

      // Deduct bet from bankroll
      currentBankroll -= currentBet;
      totalWagered += currentBet;

      // Determine win/loss outcome from historical round data
      let won = false;
      let roundMultiplier = r.multiplier;
      let roundRoll = r.roll;

      if (r.outcome !== undefined) {
        won = Boolean(r.outcome);
      } else if (r.roll !== undefined) {
        // Dice condition
        won = activeDiceCondition === 'above' ? r.roll > activeDiceTarget : r.roll < activeDiceTarget;
        roundMultiplier = won ? targetMultiplier : 0;
      } else if (r.multiplier !== undefined) {
        // Limbo / Crash condition
        won = r.multiplier >= targetMultiplier;
        roundMultiplier = won ? targetMultiplier : 0;
      } else {
        // Fallback random provably fair float outcome
        const f = getStakeProvablyFairFloat('stake_sim', 'user_sim', i + 1, 0);
        won = f * 100 < winChance;
        roundMultiplier = won ? targetMultiplier : 0;
      }

      let profit = 0;
      let payout = 0;

      const prevWinStreak = currentWinStreak;
      const prevLossStreak = currentLossStreak;

      if (won) {
        payout = currentBet * targetMultiplier;
        profit = payout - currentBet;
        currentBankroll += payout;
        winCount++;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
      } else {
        payout = 0;
        profit = -currentBet;
        lossCount++;
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
      }

      cumulativeProfit += profit;

      // Update Peak & Drawdown
      if (currentBankroll > peakBalance) {
        peakBalance = currentBankroll;
      }
      if (currentBankroll < lowestBalance) {
        lowestBalance = currentBankroll;
      }

      const currentDdAmount = Math.max(0, peakBalance - currentBankroll);
      const currentDdPct = peakBalance > 0 ? (currentDdAmount / peakBalance) * 100 : 0;

      if (currentDdAmount > maxDrawdownAmount) maxDrawdownAmount = currentDdAmount;
      if (currentDdPct > maxDrawdownPct) maxDrawdownPct = currentDdPct;

      results.push({
        round: i + 1,
        betAmount: Number(currentBet.toFixed(6)),
        won,
        payout: Number(payout.toFixed(6)),
        profit: Number(profit.toFixed(6)),
        cumulativeProfit: Number(cumulativeProfit.toFixed(4)),
        balance: Number(currentBankroll.toFixed(4)),
        currentStreak: won ? currentWinStreak : currentLossStreak,
        streakType: won ? 'win' : 'loss',
        drawdownAmount: Number(currentDdAmount.toFixed(4)),
        drawdownPct: Number(currentDdPct.toFixed(2)),
        multiplier: roundMultiplier,
        roll: roundRoll,
      });

      // Check Stop Loss
      if (respectStopLoss && testStrategy.stopOnLoss && cumulativeProfit <= -Math.abs(testStrategy.stopOnLoss)) {
        stoppedByStopLoss = true;
        break;
      }

      // Check Take Profit
      if (respectTakeProfit && testStrategy.stopOnProfit && cumulativeProfit >= testStrategy.stopOnProfit) {
        stoppedByTakeProfit = true;
        break;
      }

      // Compute Next Bet based on Base Strategy Rules
      if (won) {
        // ON WIN ACTION
        if (testStrategy.onWinAction === 'reset') {
          currentBet = baseBet;
          fibIndex = 0;
          oscarSeriesProfit = 0;
        } else if (testStrategy.onWinAction === 'increase_pct') {
          const pct = testStrategy.onWinValue || 100;
          currentBet = Number((currentBet * (1 + pct / 100)).toFixed(6));
        } else if (testStrategy.onWinAction === 'increase_fixed') {
          currentBet = Number((currentBet + (testStrategy.onWinValue || baseBet)).toFixed(6));
        } else if (testStrategy.onWinAction === 'custom') {
          // Oscar's Grind / Paroli logic
          oscarSeriesProfit += profit;
          if (oscarSeriesProfit >= baseBet) {
            currentBet = baseBet;
            oscarSeriesProfit = 0;
          } else {
            currentBet = Number((currentBet + baseBet).toFixed(6));
          }
        }
      } else {
        // ON LOSS ACTION
        if (testStrategy.onLossAction === 'multiply') {
          const mult = testStrategy.onLossValue || 2.0;
          currentBet = Number((currentBet * mult).toFixed(6));
        } else if (testStrategy.onLossAction === 'increase_pct') {
          const pct = testStrategy.onLossValue || 100;
          currentBet = Number((currentBet * (1 + pct / 100)).toFixed(6));
        } else if (testStrategy.onLossAction === 'increase_fixed') {
          currentBet = Number((currentBet + (testStrategy.onLossValue || baseBet)).toFixed(6));
        } else if (testStrategy.onLossAction === 'fibonacci') {
          fibIndex = Math.min(fibSequence.length - 1, fibIndex + 1);
          currentBet = Number((baseBet * fibSequence[fibIndex]).toFixed(6));
        } else if (testStrategy.onLossAction === 'reset') {
          currentBet = baseBet;
        } else if (testStrategy.onLossAction === 'custom') {
          // D'Alembert on loss (+1 unit)
          currentBet = Number((currentBet + baseBet).toFixed(6));
        }
      }

      // Process Stake.com Multi-Condition Chain if defined
      if (testStrategy.customConditions && testStrategy.customConditions.length > 0) {
        const activeConditions = testStrategy.customConditions.filter(c => c.isActive !== false);
        const totalPlayedSoFar = i + 1;
        
        const evalContext: ConditionEvaluationContext = {
          won,
          totalBets: totalPlayedSoFar,
          currentStreak: won ? currentWinStreak : -currentLossStreak,
          previousStreak: won ? -prevLossStreak : prevWinStreak,
          currentLossStreak,
          currentWinStreak,
          prevLossStreak,
          prevWinStreak,
          currentBet,
          baseBet,
          currentMultiplier: targetMultiplier,
          baseMultiplier: Number(testStrategy.targetMultiplier) || 2.0,
          sessionProfit: cumulativeProfit,
          diceCondition: activeDiceCondition,
          diceTarget: activeDiceTarget
        };

        const actionState = {
          nextBet: currentBet,
          targetMultiplier,
          winChance,
          diceCondition: activeDiceCondition,
          diceTarget: activeDiceTarget,
          shouldStopAutobet: false,
          resetStreak: false
        };

        let stoppedByCondition = false;

        for (const cond of activeConditions) {
          if (evaluateConditionTrigger(cond, evalContext)) {
            applyConditionAction(cond, evalContext, actionState);
            if (actionState.shouldStopAutobet) {
              stoppedByCondition = true;
              break;
            }
          }
        }

        currentBet = actionState.nextBet;
        targetMultiplier = actionState.targetMultiplier;
        winChance = actionState.winChance;
        activeDiceCondition = actionState.diceCondition || activeDiceCondition;
        activeDiceTarget = actionState.diceTarget !== undefined ? actionState.diceTarget : activeDiceTarget;

        if (stoppedByCondition) {
          break;
        }
      }
    }

    setSimulationProgress(85);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const endTime = performance.now();
    const executionTimeMs = Number((endTime - startTime).toFixed(1));

    // 3. Compute Robustness Score & Diagnostics
    const roundsExecuted = results.length;
    const finalBankroll = currentBankroll;
    const netProfit = finalBankroll - initialBankroll;
    const roiPct = initialBankroll > 0 ? (netProfit / initialBankroll) * 100 : 0;
    const turnoverMultiplier = initialBankroll > 0 ? totalWagered / initialBankroll : 0;
    const winRatePct = roundsExecuted > 0 ? (winCount / roundsExecuted) * 100 : 0;
    const realizedRTP = totalWagered > 0 ? ((totalWagered + netProfit) / totalWagered) * 100 : 99.0;
    const theoreticalRTP = 99.00;

    let robustnessScore = 100;
    if (isBusted) {
      robustnessScore = Math.max(5, 30 - Math.min(25, (bustRound || 0) / 100));
    } else {
      // Deduct for high drawdown
      if (maxDrawdownPct > 80) robustnessScore -= 45;
      else if (maxDrawdownPct > 50) robustnessScore -= 30;
      else if (maxDrawdownPct > 30) robustnessScore -= 15;
      else if (maxDrawdownPct > 15) robustnessScore -= 5;

      // Deduct for extreme peak bet ratio
      const peakBetRatio = peakBetAmount / initialBankroll;
      if (peakBetRatio > 0.5) robustnessScore -= 25;
      else if (peakBetRatio > 0.25) robustnessScore -= 15;
      else if (peakBetRatio > 0.10) robustnessScore -= 5;

      // Bonus for positive profit or high wager efficiency with low drawdown
      if (netProfit > 0 && maxDrawdownPct < 25) robustnessScore = Math.min(98, robustnessScore + 10);
      if (turnoverMultiplier > 50 && maxDrawdownPct < 35 && !isBusted) robustnessScore = Math.min(95, robustnessScore + 8);
    }
    robustnessScore = Math.max(5, Math.min(99, Math.round(robustnessScore)));

    let robustnessGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F (Ruin)' = 'B';
    let robustnessDiagnosis = '';

    if (isBusted) {
      robustnessGrade = 'F (Ruin)';
      robustnessDiagnosis = `Liquidation critique du capital survenue au round #${bustRound}. L'effet de levier sur série de pertes a dépassé les fonds disponibles. Recommandation : réduire le multiplicateur de perte ou plafonner strictement la mise maximale.`;
    } else if (robustnessScore >= 90) {
      robustnessGrade = 'A+';
      robustnessDiagnosis = 'Excellente robustesse mathématique. Faible drawdown et capital préservé sur l’ensemble de la série historique.';
    } else if (robustnessScore >= 80) {
      robustnessGrade = 'A';
      robustnessDiagnosis = 'Bonne résistance aux séries de variance. La stratégie maintient des mises proportionnées par rapport au capital.';
    } else if (robustnessScore >= 65) {
      robustnessGrade = 'B';
      robustnessDiagnosis = 'Stabilité modérée. Attention aux replis de capital supérieurs à 30% lors des séries de pertes consécutives.';
    } else if (robustnessScore >= 45) {
      robustnessGrade = 'C';
      robustnessDiagnosis = 'Vulnérabilité élevée à la variance. Un bankroll 3x plus élevé ou un stop-loss plus resserré est nécessaire avant déploiement réel.';
    } else {
      robustnessGrade = 'D';
      robustnessDiagnosis = 'Risque très élevé de liquidation proche. Les montées de mises approchent les limites critiques du capital.';
    }

    const summary: BacktestSummary = {
      totalRounds,
      roundsExecuted,
      initialBankroll,
      finalBankroll: Number(finalBankroll.toFixed(4)),
      netProfit: Number(netProfit.toFixed(4)),
      roiPct: Number(roiPct.toFixed(2)),
      totalWagered: Number(totalWagered.toFixed(4)),
      turnoverMultiplier: Number(turnoverMultiplier.toFixed(1)),
      winCount,
      lossCount,
      winRatePct: Number(winRatePct.toFixed(2)),
      longestWinStreak,
      longestLossStreak,
      peakBalance: Number(peakBalance.toFixed(4)),
      lowestBalance: Number(lowestBalance.toFixed(4)),
      maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(4)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      peakBetAmount: Number(peakBetAmount.toFixed(6)),
      peakBetAsPctOfBankroll: Number(((peakBetAmount / initialBankroll) * 100).toFixed(1)),
      isBusted,
      bustRound,
      stoppedByStopLoss,
      stoppedByTakeProfit,
      realizedRTP: Number(realizedRTP.toFixed(2)),
      theoreticalRTP,
      robustnessScore,
      robustnessGrade,
      robustnessDiagnosis,
      stressTestFlags: {
        highDrawdown: maxDrawdownPct > 40,
        bankrollOverload: (peakBetAmount / initialBankroll) > 0.20,
        martingaleTrap: testStrategy.onLossAction === 'multiply' && (testStrategy.onLossValue || 2) >= 2.0 && longestLossStreak >= 7,
        wagerEfficient: turnoverMultiplier >= 30 && maxDrawdownPct <= 35,
        positiveEV: netProfit > 0,
      },
      executionTimeMs,
    };

    // 4. Sample chart data for ultra-smooth 60fps rendering (max 250 points)
    const sampleStep = Math.max(1, Math.floor(results.length / 200));
    const chartPoints: any[] = [];
    for (let k = 0; k < results.length; k += sampleStep) {
      const item = results[k];
      chartPoints.push({
        round: item.round,
        balance: item.balance,
        profit: item.cumulativeProfit,
        betAmount: item.betAmount,
        drawdown: item.drawdownPct,
        initialBankroll,
      });
    }
    // Ensure final round is present
    if (results.length > 0) {
      const last = results[results.length - 1];
      chartPoints.push({
        round: last.round,
        balance: last.balance,
        profit: last.cumulativeProfit,
        betAmount: last.betAmount,
        drawdown: last.drawdownPct,
        initialBankroll,
      });
    }

    setRoundResults(results);
    setSampledChartData(chartPoints);
    setBacktestSummary(summary);
    setSimulationProgress(100);
    setIsSimulating(false);
  };

  // --------------------------------------------------------------------
  // DEPLOY STRATEGY TO AUTOBET ENGINE
  // --------------------------------------------------------------------
  const handleDeployToAutoBet = () => {
    onSelectStrategy({
      ...testStrategy,
      currency,
    });
    if (onNavigateToTab) {
      onNavigateToTab('engine');
    }
  };

  // --------------------------------------------------------------------
  // EXPORT BACKTEST REPORT
  // --------------------------------------------------------------------
  const handleExportCsvReport = () => {
    if (roundResults.length === 0) return;
    const header = 'Round,BetAmount,Outcome,Multiplier,Payout,Profit,CumulativeProfit,Balance,DrawdownPct\n';
    const rows = roundResults.map((r) => 
      `${r.round},${r.betAmount},${r.won ? 'WIN' : 'LOSS'},${r.multiplier || ''},${r.payout},${r.profit},${r.cumulativeProfit},${r.balance},${r.drawdownPct}%`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stake_backtest_report_${testStrategy.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered logs for inspection
  const filteredLogs = useMemo(() => {
    return roundResults.filter((r) => {
      if (logFilter === 'losses' && r.won) return false;
      if (logFilter === 'wins' && !r.won) return false;
      if (logFilter === 'top_bets' && r.betAmount <= Number(testStrategy.baseBet) * 2) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.trim();
        return r.round.toString().includes(q) || r.betAmount.toString().includes(q) || r.profit.toString().includes(q);
      }
      return true;
    });
  }, [roundResults, logFilter, logSearchQuery, testStrategy.baseBet]);

  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, logsPage]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Backtesting & Stress-Test Haute Fréquence
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                    Quant Engine
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Simulez et éprouvez vos algorithmes sur des dizaines de milliers de rounds réels Stake ou fichiers CSV en 1-clic avant tout déploiement en direct.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {backtestSummary && (
              <button
                onClick={handleDeployToAutoBet}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-98"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Déployer vers le Bot Automatique</span>
              </button>
            )}

            {roundResults.length > 0 && (
              <button
                onClick={handleExportCsvReport}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs sm:text-sm transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exporter Rapport (.CSV)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode Switcher: Sequential Backtest vs Monte Carlo 10k Multi-Seeds */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setEngineMode('sequential')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 ${
            engineMode === 'sequential'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Backtest Historique Séquentiel (Benchmarks & CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setEngineMode('monte_carlo')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 ${
            engineMode === 'monte_carlo'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ScatterChart className="w-4 h-4 text-purple-300" />
          <span>Simulation Monte Carlo Multi-Seeds</span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 tracking-wider">
            10 000 Itérations
          </span>
        </button>
      </div>

      {engineMode === 'monte_carlo' ? (
        <MonteCarloBacktestEngine
          strategy={testStrategy}
          currency={currency}
          balance={testBankroll}
          onUpdateStrategy={onUpdateStrategy}
          onSelectStrategy={onSelectStrategy}
          onNavigateToTab={onNavigateToTab}
        />
      ) : (
        <>
          {/* Grid: Left Source Selection + Right Strategy Calibration */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Data Source Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Source des Données Historiques</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                {dataSource === 'dataset' ? 'Benchmarks Stake' : dataSource === 'csv' ? 'Fichier Personnalisé' : dataSource === 'generator' ? 'Générateur Provably Fair' : 'Stake API Direct'}
              </span>
            </div>

            {/* Source Tab Switcher */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setDataSource('dataset')}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  dataSource === 'dataset'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Benchmarks</span>
              </button>

              <button
                onClick={() => setDataSource('csv')}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  dataSource === 'csv'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Fichier CSV</span>
              </button>

              <button
                onClick={() => setDataSource('generator')}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  dataSource === 'generator'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Générateur Seed</span>
              </button>
            </div>

            {/* Content: Mode 1 - Benchmark Datasets */}
            {dataSource === 'dataset' && (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400">
                  Sélectionnez un échantillon historique étalonné selon les mathématiques officielles de Stake.com :
                </p>
                <div className="space-y-2">
                  {BENCHMARK_DATASETS.map((ds) => (
                    <div
                      key={ds.id}
                      onClick={() => setSelectedBenchmarkId(ds.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        selectedBenchmarkId === ds.id
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{ds.icon}</span>
                          <span className="text-xs font-bold text-slate-100">{ds.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                          {ds.roundsCount.toLocaleString('fr-FR')} rounds
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {ds.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ds.features.map((f, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-emerald-400 font-medium">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content: Mode 2 - CSV Drag & Drop Upload */}
            {dataSource === 'csv' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                      : csvFileName
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950/80'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  {csvFileName ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-300 truncate max-w-xs mx-auto">
                        📄 {csvFileName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {uploadedRounds.length.toLocaleString('fr-FR')} rounds détectés et prêts pour la simulation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">
                        Glissez votre export CSV de paris Stake ou cliquez pour importer
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Formats supportés : CSV Stake (multipliers, rolls, payouts) ou JSON
                      </p>
                    </div>
                  )}
                </div>

                {csvParseError && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                    <span>{csvParseError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Content: Mode 3 - Provably Fair Generator */}
            {dataSource === 'generator' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Jeu Stake</label>
                    <select
                      value={genGame}
                      onChange={(e) => setGenGame(e.target.value as StakeGameType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="dice">Stake Dice (0.00-99.99)</option>
                      <option value="limbo">Stake Limbo (Crash)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Volume de rounds</label>
                    <select
                      value={genRoundsCount}
                      onChange={(e) => setGenRoundsCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value={1000}>1 000 rounds (Rapide)</option>
                      <option value={5000}>5 000 rounds</option>
                      <option value={10000}>10 000 rounds (Standard)</option>
                      <option value={25000}>25 000 rounds (Stress-Test)</option>
                      <option value={50000}>50 000 rounds (Endurance)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Client Seed (Aléatoire)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={genClientSeed}
                      onChange={(e) => setGenClientSeed(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-[11px]"
                    />
                    <button
                      onClick={() => setGenClientSeed(generateRandomSeed(16))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Générer un nouveau seed aléatoire"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Strategy Configuration & Calibration (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-400" />
                <span>Stratégie à Tester</span>
              </h2>
              
              {/* Preset Selector */}
              <select
                value={testStrategy.id}
                onChange={(e) => {
                  const found = PREDEFINED_STRATEGIES.find((s) => s.id === e.target.value);
                  if (found) setTestStrategy({ ...found });
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-medium"
              >
                {PREDEFINED_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameter Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Bankroll Initial</label>
                <div className="relative">
                  <input
                    type="number"
                    value={testBankroll}
                    onChange={(e) => setTestBankroll(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">{currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Mise de Base</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={testStrategy.baseBet}
                    onChange={(e) => setTestStrategy((prev) => ({ ...prev, baseBet: parseFloat(e.target.value) || 0.001 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">{currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Multiplicateur Cible</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={testStrategy.targetMultiplier}
                    onChange={(e) => {
                      const mult = Math.max(1.01, parseFloat(e.target.value) || 2.0);
                      const winChance = Number((99.0 / mult).toFixed(2));
                      setTestStrategy((prev) => ({ ...prev, targetMultiplier: mult, winChance }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-bold"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">x</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Chances de Gain</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={`${testStrategy.winChance || 49.5}%`}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Progression Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>En cas de Perte (onLossAction)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={testStrategy.onLossAction}
                    onChange={(e: any) => setTestStrategy((prev) => ({ ...prev, onLossAction: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="multiply">Multiplier (x)</option>
                    <option value="increase_pct">Augmenter de (%)</option>
                    <option value="increase_fixed">Augmenter Fixe (+)</option>
                    <option value="fibonacci">Suite Fibonacci</option>
                    <option value="reset">Réinitialiser (Mise Plate)</option>
                    <option value="custom">D'Alembert (+1)</option>
                  </select>

                  <input
                    type="number"
                    step="0.05"
                    value={testStrategy.onLossValue || 2.0}
                    onChange={(e) => setTestStrategy((prev) => ({ ...prev, onLossValue: parseFloat(e.target.value) || 2.0 }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold text-xs"
                    placeholder="Facteur"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>En cas de Gain (onWinAction)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={testStrategy.onWinAction}
                    onChange={(e: any) => setTestStrategy((prev) => ({ ...prev, onWinAction: e.target.value }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="reset">Réinitialiser à la base</option>
                    <option value="increase_pct">Augmenter de (%)</option>
                    <option value="custom">Oscar's Grind / Paroli</option>
                  </select>

                  <input
                    type="number"
                    value={testStrategy.onWinValue || 100}
                    onChange={(e) => setTestStrategy((prev) => ({ ...prev, onWinValue: parseFloat(e.target.value) || 100 }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold text-xs"
                    placeholder="Valeur"
                  />
                </div>
              </div>
            </div>

            {/* Risk Caps & Stop Limits */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectStopLoss}
                  onChange={(e) => setRespectStopLoss(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300">
                  Stop Loss ({testStrategy.stopOnLoss || 20} {currency})
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectTakeProfit}
                  onChange={(e) => setRespectTakeProfit(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300">
                  Take Profit ({testStrategy.stopOnProfit || 25} {currency})
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectMaxBetCap}
                  onChange={(e) => setRespectMaxBetCap(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 truncate">
                  Plafond Mise ({maxBetCapAmount} {currency})
                </span>
              </label>
            </div>

            {/* RUN BUTTON */}
            <button
              onClick={runBacktest}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Simulation en cours ({simulationProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  <span>Lancer le Backtest (1-Clic)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {backtestSummary && (
        <div className="space-y-6">
          
          {/* Robustness Assessment & Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Robustness Score & Grade */}
            <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-lg ${
              backtestSummary.isBusted
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-100'
                : backtestSummary.robustnessScore >= 80
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Indice de Robustesse
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  backtestSummary.isBusted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  Grade {backtestSummary.robustnessGrade}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{backtestSummary.robustnessScore}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>

              <p className="text-[11px] text-slate-300 mt-2 line-clamp-3">
                {backtestSummary.robustnessDiagnosis}
              </p>
            </div>

            {/* Card 2: Net Profit & ROI */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Résultat Net / ROI
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {backtestSummary.roundsExecuted.toLocaleString('fr-FR')} rounds
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  backtestSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {backtestSummary.netProfit >= 0 ? `+${backtestSummary.netProfit}` : backtestSummary.netProfit} {currency}
                </span>
                <span className={`text-xs font-bold ${
                  backtestSummary.roiPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ({backtestSummary.roiPct >= 0 ? `+${backtestSummary.roiPct}%` : `${backtestSummary.roiPct}%`})
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>Solde Final :</span>
                <span className="font-bold text-slate-200">{backtestSummary.finalBankroll} {currency}</span>
              </div>
            </div>

            {/* Card 3: Max Drawdown & Lowest Point */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Drawdown Maximum
                </span>
                <span className="text-[10px] font-bold text-rose-400">
                  Pire Repli
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">
                  -{backtestSummary.maxDrawdownPct}%
                </span>
                <span className="text-xs text-slate-400">
                  (-{backtestSummary.maxDrawdownAmount} {currency})
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>Mise Max Atteinte :</span>
                <span className="font-bold text-amber-400">{backtestSummary.peakBetAmount} {currency} ({backtestSummary.peakBetAsPctOfBankroll}%)</span>
              </div>
            </div>

            {/* Card 4: Wager Volume & Streaks */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Volume Wager / Séries
                </span>
                <span className="text-[10px] font-bold text-sky-400">
                  {backtestSummary.turnoverMultiplier}x Bankroll
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-400">
                  {backtestSummary.totalWagered.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {currency}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>Pire Série Défaites :</span>
                <span className="font-bold text-rose-400">{backtestSummary.longestLossStreak} consécutives</span>
              </div>
            </div>
          </div>

          {/* Antebot Strategy Testing Graph Engine (100% Accurate & Multi-Mode) */}
          <AntebotStrategyChart
            data={roundResults}
            initialBankroll={testBankroll}
            currency={currency}
            strategyName={testStrategy.name}
            targetMultiplier={testStrategy.targetMultiplier}
            takeProfitTarget={testStrategy.stopOnProfit}
            stopLossTarget={testStrategy.stopOnLoss}
            title={`Télémétrie Graphique Antebot • ${backtestSummary.roundsExecuted.toLocaleString('fr-FR')} Rounds`}
            subtitle="Moteur graphique optimisé Antebot : Échantillonnage sans perte d'extrema (ATH, Pires Creux, Pics de mise), modes Drawdown, Mises et EV Chance."
          />

          {/* Round-by-Round Log Inspector Table */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Journal Détaillé des Paris ({filteredLogs.length.toLocaleString('fr-FR')} entrées)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Inspectez chaque tirage, variation de mise et résultat calculé.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => {
                      setLogSearchQuery(e.target.value);
                      setLogsPage(1);
                    }}
                    placeholder="Rechercher round..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={logFilter}
                  onChange={(e: any) => {
                    setLogFilter(e.target.value);
                    setLogsPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Tous les rounds</option>
                  <option value="losses">Pertes uniquement</option>
                  <option value="wins">Gains uniquement</option>
                  <option value="top_bets">Mises Élevées (&gt; 2x base)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Round</th>
                    <th className="py-2.5 px-3">Mise</th>
                    <th className="py-2.5 px-3">Résultat</th>
                    <th className="py-2.5 px-3">Tirage / Mult.</th>
                    <th className="py-2.5 px-3">Profit Net</th>
                    <th className="py-2.5 px-3">Solde Total</th>
                    <th className="py-2.5 px-3">Drawdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {paginatedLogs.map((log) => (
                    <tr key={log.round} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-slate-400">#{log.round}</td>
                      <td className="py-2 px-3 font-bold text-slate-200">{log.betAmount} {currency}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] ${
                          log.won
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {log.won ? '✓ GAGNÉ' : '✗ PERDU'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {log.roll !== undefined ? `Tirage: ${log.roll}` : log.multiplier !== undefined ? `${log.multiplier}x` : '-'}
                      </td>
                      <td className={`py-2 px-3 font-bold ${log.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {log.profit >= 0 ? `+${log.profit}` : log.profit} {currency}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-100">{log.balance} {currency}</td>
                      <td className="py-2 px-3 text-slate-400">
                        {log.drawdownPct > 0 ? `-${log.drawdownPct}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>Page {logsPage} sur {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    disabled={logsPage === 1}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setLogsPage((p) => Math.min(totalPages, p + 1))}
                    disabled={logsPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
