export type StakeGameType = 
  | 'dice'
  | 'limbo'
  | 'mines'
  | 'plinko'
  | 'keno'
  | 'hilo'
  | 'roulette'
  | 'wheel'
  | 'blackjack'
  | 'diamonds'
  | 'baccarat'
  | 'slide'
  | 'crash'
  | 'sports';

export type RiskLevel = 'ultra_safe' | 'low' | 'medium' | 'high' | 'extreme_moonshot';

export type StrategyTriggerType = 
  | 'every_loss'
  | 'every_win'
  | 'every_bets'
  | 'loss_streak_of'
  | 'loss_streak_greater_than'
  | 'loss_streak_lower_than'
  | 'win_streak_of'
  | 'win_streak_greater_than'
  | 'win_streak_lower_than'
  | 'first_win_after_losses'
  | 'first_loss_after_wins'
  | 'profit_greater_than'
  | 'profit_lower_than'
  | 'loss_greater_than'
  | 'loss_lower_than'
  | 'bet_greater_than'
  | 'bet_lower_than';

export type StrategyActionType = 
  | 'multiply_bet'
  | 'increase_bet_fixed'
  | 'increase_bet_pct'
  | 'decrease_bet_pct'
  | 'reset_bet'
  | 'set_bet_fixed'
  | 'change_multiplier'
  | 'reset_multiplier'
  | 'increase_multiplier_pct'
  | 'decrease_multiplier_pct'
  | 'switch_direction'
  | 'set_dice_target'
  | 'reset_streak_counter'
  | 'stop_autobet';

export interface StrategyCondition {
  id: string;
  order?: number;
  triggerType: StrategyTriggerType;
  triggerValue?: number;
  actionType: StrategyActionType;
  actionValue?: number;
  description?: string;
  stakeUiCode?: string;
  isActive?: boolean;
}

export interface BettingStrategy {
  id: string;
  name: string;
  game: StakeGameType;
  description: string;
  riskLevel: RiskLevel;
  baseBet: number;
  currency: string;
  targetMultiplier: number;
  winChance: number; // e.g. 49.5% for dice 2x
  // Wager & VIP volume attributes
  isWagerStrategy?: boolean;
  wagerTargetVolume?: number; // Target volume in currency e.g. 10000
  estimatedWagerTurnover?: number; // Estimated turnover multiplier of bankroll e.g. 250x
  estimatedRakebackPercent?: number; // e.g. 10%
  vipTierTarget?: string; // 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
  // Wager Recovery & Stop-Loss Recovery attributes
  isRecoveryStrategy?: boolean;
  recoveryTargetType?: 'wager_drawdown' | 'stop_loss_recoup' | 'bankroll_rebuild';
  recoveryDeficitTarget?: number; // Expected deficit to recover in units/currency
  linkedRecoveryStrategyId?: string; // ID of fallback strategy if stop loss is hit
  recoveryPhaseNotes?: string;
  // Game specific config
  gameConfig?: {
    diceCondition?: 'above' | 'below';
    diceTarget?: number; // 50.49 for 2x
    minesCount?: number; // 1-24
    minesGemsToCashout?: number; // 1-24
    minesChosenTiles?: number[]; // indices 0-24
    plinkoRows?: 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | number;
    plinkoRisk?: 'low' | 'medium' | 'high' | 'extreme';
    kenoNumbers?: number[]; // 1-10 numbers selected from 1-40
    kenoRisk?: 'classic' | 'low' | 'medium' | 'high';
    hiloStartCard?: number;
    limboTarget?: number;
    rouletteSector?: 'voisins' | 'tiers' | 'orphelins' | 'zero' | 'dozens' | 'corner' | 'sixain' | 'straight' | 'split';
    rouletteDozens?: number[];
    rouletteNumbers?: number[];
    blackjackRule?: string;
    crashAutoCashout?: number;
    wheelSegments?: 10 | 20 | 30 | 40 | 50;
    wheelRisk?: 'low' | 'medium' | 'high';
  };
  onWinAction: 'reset' | 'increase_pct' | 'increase_fixed' | 'decrease_fixed' | 'decrease_pct' | 'multiply' | 'custom';
  onWinValue?: number;
  onLossAction: 'multiply' | 'increase_fixed' | 'increase_pct' | 'decrease_fixed' | 'decrease_pct' | 'reset' | 'fibonacci' | 'custom';
  onLossValue?: number; // e.g. 2 for 100% increase (Martingale), 1.5 for 50%
  maxMartingaleIncreases?: number; // Strict cap on consecutive increases (e.g. 4 or 5 max: 0.1 -> 0.2 -> 0.4 -> 0.8 -> 1.6 max)
  martingaleMultiplier?: number; // Step multiplier (default 2.0 = +100%)
  // Safety controls
  stopOnProfit?: number; // Take profit in currency
  stopOnLoss?: number; // Stop loss in currency
  trailingStopLoss?: {
    enabled: boolean;
    activationProfit: number; // Profit at which trailing stop triggers (e.g. +10 USDT)
    trailDistance: number; // Max pullback allowed from peak profit (e.g. 5 USDT)
  };
  // Stake.com Vault Auto-Withdraw & Capital Protection
  autoVaultWithdraw?: {
    enabled: boolean;
    threshold: number; // e.g. If balance > 150 USDT, send excess to Stake vault
    keepBalance?: number; // Target balance to keep active (default = threshold)
    lastTransferredAt?: number;
    totalTransferred?: number;
    lastTxId?: string;
  };
  maxDrawdownLimit?: number; // Hard drawdown threshold in currency or %
  maxBetLimit?: number; // Hard cap on single bet
  maxConsecutiveLosses?: number;
  isAutonomousBrain?: boolean;
  autonomousConfig?: any;
  adaptiveSettings?: {
    enabled: boolean;
    maxLossStreakTrigger: number;
    drawdownPercentTrigger: number;
    lossAmountTrigger: number;
    action: 'auto_switch_strategy' | 'switch_to_custom' | 'reduce_bet_only' | 'pause_cool_down';
    customFallbackStrategyId?: string;
    reduceBetPercent: number;
    autoRotateSeedOnPivot: boolean;
    recoveryMode: 'on_win_streak' | 'on_profit_recovered' | 'fixed_bets';
    recoveryWinStreakCount: number;
    recoveryBetsCount: number;
    recoveryTargetProfitPercent: number;
  };
  customConditions?: StrategyCondition[];
  evEstimate?: number; // Expected Value per bet (e.g. -0.01 for 1% house edge)
  author?: 'ai' | 'system' | 'user';
  createdAt?: string;
  aiRationale?: string;
}

export interface BetResult {
  id: string;
  betNumber: number;
  timestamp: number;
  game: StakeGameType;
  currency: string;
  betAmount: number;
  targetMultiplier: number;
  payoutMultiplier: number;
  won: boolean;
  profit: number; // Positive if won, negative if lost
  runningBalance: number;
  runningProfit: number;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  gameDetails?: {
    roll?: number;
    limboMultiplier?: number;
    minesRevealed?: number;
    minesHitMine?: boolean;
    minesGrid?: boolean[]; // 25 booleans: true = gem, false = mine
    plinkoSlot?: number;
    kenoMatches?: number;
    kenoDrawn?: number[];
    hiloCards?: string[];
    crashPoint?: number;
    rouletteNumber?: number;
    wheelSegment?: number;
    blackjackRule?: string;
    natural?: boolean;
    [key: string]: any;
  };
  isLiveApi?: boolean;
}

export interface BotStatistics {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  totalWagered: number;
  netProfit: number;
  peakProfit: number;
  lowestProfit?: number;
  highestProfit?: number;
  maxDrawdown: number;
  maxDrawdownPercent?: number;
  currentStreak: number; // positive for win streak, negative for loss streak
  maxWinStreak: number;
  maxLossStreak: number;
  averageBet: number;
  largestBet: number;
  largestWin: number;
  profitFactor: number;
  rtpPercent?: number;
  highestMultipliers?: number[];
  betsPerSecond?: number;
  sessionDurationSeconds?: number;
  vaultedAmount?: number;
}

export interface StakeApiCredentials {
  apiKey: string;
  domain: string; // 'stake.com', 'stake.us', 'stake.bet', 'stake.games', 'playstake.club', or any mirror
  currency: string;
  isLiveMode: boolean; // false = Provably Fair Sandbox simulation, true = Live GraphQL API
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
  apiSportsKey?: string; // Optional direct API-Sports Key (v3.football.api-sports.io)
  theOddsApiKey?: string; // Optional The Odds API Key (the-odds-api.com)
}

export interface ManualSession {
  id: string;
  timestamp: number;
  game: StakeGameType;
  strategyName: string;
  profitOrLoss: number; // Positive if gain (+), negative if loss (-)
  profit?: number;
  currency: string;
  startingBalance?: number;
  endingBalance?: number;
  durationMinutes?: number;
  estimatedBets?: number;
  estimatedBetsCount?: number;
  notes?: string;
  mood?: 'disciplined' | 'calm' | 'tilted' | 'target_hit';

  // Section Paris Sportifs
  category?: 'casino' | 'sports';
  sport?: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey' | 'baseball' | 'rugby' | 'other';
  match?: string;
  league?: string;
  market?: string;
  odds?: number;
  stakeAmount?: number;
  betType?: 'single' | 'parlay' | 'live' | 'future';
  bookmaker?: string;
  finalScore?: string;
}

export interface ManualSessionStats {
  totalSessions: number;
  winningSessions: number;
  losingSessions: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  bestSession: number;
  worstSession: number;
  averageSession: number;
  profitFactor: number;
  currentStreak?: number;
}

export interface WalletBalance {
  currency: string;
  amount: number;
  usdRate: number;
  symbol: string;
  iconColor: string;
}

export interface UserProfile {
  id: string;
  name: string;
  description: string;
  createdDate: number;
  color: string;
  isActive: boolean;
}

export interface OddsHistoryPoint {
  timeLabel: string; // e.g. "-60m", "-45m", "-30m", "-15m", "-5m", "Maintenant"
  minuteOffset: number; // e.g. -60, -45, -30, -15, -5, 0
  odds: number;
  impliedProb?: number;
  changePctFromOpening?: number;
  sharpVolumeScore?: number;
}

export interface SportTip {
  id: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey';
  match: string;
  league: string;
  kickoffTime: string; // e.g. "Aujourd'hui à 20:45 (Dans 2h15)"
  kickoffTimestamp?: number; // Unix timestamp in ms
  minutesUntilKickoff?: number; // Delay in minutes from request time (30 to 900 min)
  market: string; // e.g. "Plus de 2.5 Buts", "Victoire Réal Madrid & BTTS", "Total Points > 218.5"
  odds: number; // e.g. 1.85, 2.10
  expectedValue: number; // EV % (e.g. +6.5%)
  confidenceScore: number; // 1-100%
  recommendedStakePercent: number; // 1-3% bankroll
  analysisReasoning: string;
  keyStats: string[];
  riskLevel: 'safe' | 'value' | 'aggressive';
  predictedOutcome?: string; // Ex: "Victoire Real Madrid", "Over 2.5", "1X"
  trueProbability?: number; // Ex: 62.5% (Modèle de probabilité réelle IA)
  
  // Historique des variations de cotes sur les 60 dernières minutes (Sparkline)
  oddsHistory?: OddsHistoryPoint[];
  
  // Nouveaux indicateurs quantitatifs d'optimisation de gains
  bookmakerImpliedProbability?: number; // Ex: 54.1% (1/cote)
  aiEstimatedTrueProbability?: number; // Ex: 61.5% (Modèle IA Poisson/Rating)
  droppingOddsAlert?: {
    openingOdds: number;
    currentOdds: number;
    trend: 'dropping' | 'stable' | 'rising';
    sharpMoneySignal: string;
  };
  poissonModelScore?: {
    homeExpGoals: number;
    awayExpGoals: number;
    predictedScore: string;
  };
  kellyCriterionRatio?: number; // Ex: 1.8%
  lineupFatigueIndex?: string; // Ex: "Effectif complet, 5 jours de repos"

  // 1. Indicateurs Avancés de Performance Réelle (xMetrics)
  advancedMetrics?: {
    npxGHome?: number; // Non-penalty xG
    npxGAway?: number;
    xPointsDiff?: string; // Ex: "+4.2 xPts (Sous-coté / Rebond attendu)"
    ppdaIntensity?: string; // Passes Per Defensive Action (Ex: "8.4 (Pressing Haut Agressif)")
    luckRegressFactor?: 'undervalued_positive_regression' | 'overvalued_bubble' | 'fair_value';
    luckAnalysis?: string;
  };

  // 2. Microstructure du Marché & Détection des Parieurs Pros
  marketMicrostructure?: {
    clvIndex?: string; // Closing Line Value beat % (Ex: "+4.8% vs Pinnacle Closing Line")
    publicTicketsPct?: number; // % du grand public sur ce bet (Ex: 78%)
    sharpMoneyPct?: number; // % des fonds et parieurs pros (Ex: 64%)
    divergenceAlert?: string; // Ex: "Divergence Majeure : Le public suit les favoris, les pros misent sur le spread"
    asianHandicapShift?: string; // Ex: "Ligne passée de -0.25 à -0.75"
  };

  // 3. Facteurs Contextuels & Environnementaux
  contextualFactors?: {
    restAdvantageIndex?: string; // Ex: "+3 jours de repos (Avantage Domicile)"
    travelDistanceKm?: number; // Ex: 1200 km
    keyAbsenceWarImpact?: string; // Ex: "Absence Meneur titulaire (-1.4 pts net rating)"
    refereeTendency?: string; // Ex: "Arbitre sévère : 5.4 cartons/m (favorable Over cartons)"
    weatherCondition?: string; // Ex: "Pluie battante & Rafales 45 km/h (Rythme ralenti)"
  };

  // 4. Liaison directe aux marchés Stake.com (Synchronisation Temps Réel)
  stakeFixtureId?: string;
  stakeUrl?: string; // URL directe vers la rencontre sur Stake.com
  stakeMarketId?: string; // Ex: "1x2", "total_goals_2_5", "btts", "asian_handicap"
  stakeMarketName?: string; // Ex: "Vainqueur du Match (1X2)"
  stakeOutcomeName?: string; // Ex: "Real Madrid"
  stakeOdds?: number; // Cote officielle Stake.com
  stakeMarginPercent?: number; // Marge réduite Stake (ex: 3.1%)
  isStakeLive?: boolean; // true si le match est en direct sur Stake In-Play
  availableMarketsCount?: number; // Nombre de marchés Stake disponibles pour ce match
  allStakeMarkets?: StakeSportsMarket[]; // Liste complète des marchés Stake pour cette rencontre

  // 5. Météo Réelle du Stade & Benchmark Multi-Bookmakers & H2H Forme
  stadiumWeather?: {
    city: string;
    temperatureC: number;
    windSpeedKmh: number;
    precipitationProbPct: number;
    isIndoorOrDome: boolean;
    conditionDesc: string;
    impactSummary: string;
  };
  sharpBenchmark?: {
    pinnacleOdds: number;
    bet365Odds?: number;
    betfairOdds?: number;
    consensusOdds: number;
    stakeOdds: number;
    stakeEdgeVsPinnacle: number;
    stakeEdgeVsBet365?: number;
    clvIndex: string;
    bookmakerConsensusCount: number;
    sharpSignal: string;
    bestBookmaker?: string;
    bestOdds?: number;
    isRealLiveFeed?: boolean;
    bookmakerQuotes?: BookmakerQuoteItem[];
  };
  bookmakerComparison?: BookmakerComparisonData;
  h2hRecentForm?: {
    homeTeamForm: ('V' | 'N' | 'D')[];
    awayTeamForm: ('V' | 'N' | 'D')[];
    homeWinRateLast5: number;
    awayWinRateLast5: number;
    lastMeetingsSummary: string[];
    headToHeadAdvantage: string;
  };

  // 6. Analyse Probabiliste Avancée par Régression Bayésienne
  bayesianAnalysis?: {
    odds: number;
    posteriorWinProbability: number;
    credibleIntervalLow: number;
    credibleIntervalHigh: number;
    bayesianConfidenceScore: number;
    bayesianExpectedValue: number;
    unviggedFairOdds: number;
    marketImpliedProb: number;
    bayesianEdgePct: number;
    isOddsValid: boolean;
    isHighConfidence: boolean;
    isAlertOver80?: boolean;
    isQualified: boolean;
    priorityRank: number;
    filterStatus: 'qualified_top_priority' | 'qualified_standard' | 'rejected_odds_too_low' | 'rejected_odds_too_high' | 'rejected_confidence_low';
    rejectionReason?: string;
    coefficients: {
      priorWeight: number;
      sharpBenchmarkWeight: number;
      xgPoissonWeight: number;
      microstructureWeight: number;
      trendMomentumWeight: number;
    };
    recommendedKellyFractionPct: number;
  };
}

export interface BookmakerQuoteItem {
  bookmakerKey: 'stake' | 'pinnacle' | 'bet365' | 'betfair' | 'unibet' | 'williamhill' | 'draftkings' | string;
  bookmakerName: string;
  odds: number;
  impliedProbability: number;
  marginPercent?: number;
  isBestOdds?: boolean;
  edgeVsStakePercent?: number;
  noVigFairOdds?: number;
}

export interface BookmakerComparisonData {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  marketName: string;
  selectedOutcome: string;
  stake: {
    odds: number;
    marginPercent: number;
    impliedProbability: number;
    url?: string;
    fixtureId?: string;
  };
  pinnacle: {
    odds: number;
    marginPercent: number;
    impliedProbability: number;
    noVigFairOdds: number;
  };
  bet365: {
    odds: number;
    marginPercent: number;
    impliedProbability: number;
  };
  betfair?: {
    odds: number;
    impliedProbability: number;
  };
  consensusOdds: number;
  bestBookmaker: string;
  bestOdds: number;
  stakeEdgeVsPinnacle: number;
  stakeEdgeVsBet365: number;
  clvIndex: string;
  sharpSignal: string;
  arbitrageDetected: boolean;
  arbitrageProfitPercent?: number;
  quotes: BookmakerQuoteItem[];
  source: 'the_odds_api_live' | 'stake_graphql_live' | 'hybrid_real_time_engine';
  isLiveRealTime: boolean;
  lastUpdated: string;
}

export interface TrackedSportBet {
  id: string;
  tipId: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey';
  match: string;
  league: string;
  market: string;
  odds: number;
  expectedValue: number;
  confidenceScore: number;
  stakePercent: number;
  stakeAmount: number;
  currency: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  profit: number; // calculated when resolved
  createdAt: number;
  resolvedAt?: number;
  finalScore?: string;
  notes?: string;
  kickoffTime?: string;
  kickoffTimestamp?: number;
  minutesUntilKickoff?: number;
  resolutionNotes?: string;
  autoResolved?: boolean;
  lastCheckedAt?: number;
  stakeFixtureId?: string;
  stakeUrl?: string;
  stakeMarketName?: string;
}

export interface LiveStatItem {
  label: string;
  value: string;
  color?: 'white' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

export interface LiveInPlayStats {
  possession?: string;
  shotsOnTarget?: string;
  dangerousAttacks?: string;
  foulsOrCards?: string;
  liveXg?: string;
  metrics?: LiveStatItem[];
}

export interface LiveMatchTip {
  id: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey';
  match: string;
  league: string;
  currentScore: string;
  currentMinute: string;
  elapsedMinutes: number;
  period: string;
  momentumTeam: string;
  inPlayStats: LiveInPlayStats;
  liveMarket: string;
  liveOdds: number;
  preMatchOdds?: number;
  liveTrueProbability: number;
  liveImpliedProbability: number;
  liveExpectedValue: number;
  confidenceScore: number;
  recommendedStakePercent: number;
  liveEdgeAnalysis: string;
  urgencyLevel: 'high' | 'medium' | 'moderate';
  recommendedEntryWindow: string;
  riskLevel: 'safe' | 'value' | 'aggressive';
  stakeFixtureId?: string;
  stakeUrl?: string;
  stakeMarginPercent?: number;
  stadiumWeather?: {
    city: string;
    temperatureC: number;
    windSpeedKmh: number;
    precipitationProbPct: number;
    isIndoorOrDome: boolean;
    conditionDesc: string;
    impactSummary: string;
  };
  sharpBenchmark?: {
    pinnacleOdds: number;
    consensusOdds: number;
    stakeOdds: number;
    stakeEdgeVsPinnacle: number;
    clvIndex: string;
    bookmakerConsensusCount: number;
    sharpSignal: string;
  };
  bayesianAnalysis?: {
    odds: number;
    posteriorWinProbability: number;
    credibleIntervalLow: number;
    credibleIntervalHigh: number;
    bayesianConfidenceScore: number;
    bayesianExpectedValue: number;
    unviggedFairOdds: number;
    marketImpliedProb: number;
    bayesianEdgePct: number;
    isOddsValid: boolean;
    isHighConfidence: boolean;
    isAlertOver80?: boolean;
    isQualified: boolean;
    priorityRank: number;
    filterStatus: 'qualified_top_priority' | 'qualified_standard' | 'rejected_odds_too_low' | 'rejected_odds_too_high' | 'rejected_confidence_low';
    rejectionReason?: string;
    coefficients: {
      priorWeight: number;
      sharpBenchmarkWeight: number;
      xgPoissonWeight: number;
      microstructureWeight: number;
      trendMomentumWeight: number;
    };
    recommendedKellyFractionPct: number;
  };
}

export interface LiveSportsResponse {
  sportCategory: string;
  liveAnalysisTitle: string;
  liveMarketContext: string;
  activeMatchesCount: number;
  lastUpdatedParisTime: string;
  liveTips: LiveMatchTip[];
  liveOpportunitiesSummary: {
    highValueSignalsCount: number;
    averageLiveEv: number;
    topMomentumPick: string;
    liveStrategyAdvice: string;
  };
}

export interface SportAnalysisResponse {
  sportCategory: string;
  analysisTitle: string;
  globalMarketContext: string;
  kickoffWindow?: {
    minMinutes: number;
    maxMinutes: number;
    minTimeFormatted: string;
    maxTimeFormatted: string;
    currentTimeParis?: string;
    currentFullDateParis?: string;
    timezone?: string;
    description: string;
  };
  tips: SportTip[];
  combinedAcca?: {
    title: string;
    totalOdds: number;
    combinedEv: string;
    selections: string[];
    riskAdvice: string;
  };
  marketPulse?: {
    sharpMoneyPercentage: number;
    publicConsensusBias: string;
    arbitrageDetected: boolean;
    recommendedDailyMaxExposure: number;
  };
}

// ----------------------------------------------------
// GOOGLE SEARCH GROUNDED SPORTS AI ADVISOR & STAKE SIZING
// ----------------------------------------------------

export interface GroundedWebSource {
  title: string;
  url: string;
  domain: string;
  sourceType: 'official' | 'sharp_exchange' | 'major_media' | 'analytics' | 'tipster_forum' | 'social';
  reliabilityScore: number; // 0 to 100
  reliabilityTier: 'Tier 1 (Très Haute)' | 'Tier 2 (Haute)' | 'Tier 3 (Moyenne)' | 'Tier 4 (Spéculative)';
  snippet?: string;
  publishedTime?: string;
}

export interface StakeAdjustmentAnalysis {
  baseStakePercent: number; // e.g. 2.0%
  sourceReliabilityMultiplier: number; // e.g. 1.25x or 0.70x
  adjustedStakePercent: number; // e.g. 2.5%
  adjustedStakeAmount: number; // e.g. 2.50 USD
  stakeAdjustmentDirection: 'increase' | 'decrease' | 'maintain' | 'protect';
  confidenceWeight: number; // 0 to 100
  kellyFractionApplied: string; // e.g. "Demi-Kelly (0.5x)"
  adjustmentRationale: string;
  riskGuardrails: string[];
}

export interface SportsTrendInsight {
  topic: string;
  sport: string;
  league?: string;
  match?: string;
  market?: string;
  trendType: 'steam_move' | 'injury_lineup' | 'sharp_volume' | 'public_trap' | 'weather_impact' | 'value_discrepancy';
  summary: string;
  consensusDirection: string;
  impactOnOdds: string;
  sourceReliabilityScore: number;
  sources: GroundedWebSource[];
  stakeAdvice: StakeAdjustmentAnalysis;
  recommendedPick?: {
    selection: string;
    odds: number;
    fairOdds: number;
    evPct: number;
  };
}

export interface SportsAiAdviceResponse {
  query: string;
  searchGrounded: boolean;
  searchQueries: string[];
  analyzedAt: string;
  overallMarketSentiment: string;
  keyTrends: SportsTrendInsight[];
  directMatchAdvice?: {
    match: string;
    sport: string;
    league: string;
    market: string;
    currentOdds: number;
    breakingNewsAndLineups: string;
    sharpVsPublicDynamics: string;
    sourceCredibilityAssessment: {
      overallReliabilityScore: number;
      tier: string;
      primarySources: GroundedWebSource[];
      riskFactor: 'Faible' | 'Modéré' | 'Élevé';
    };
    stakeAdjustment: StakeAdjustmentAnalysis;
  };
  globalBankrollSafetyAdvice: string;
}

export interface AppBackupData {
  version: string;
  exportedAt: number;
  profileName: string;
  sessions: ManualSession[];
  wallets: Record<string, number>;
  strategies: BettingStrategy[];
  apiCredentials: StakeApiCredentials;
}

// ----------------------------------------------------
// STAKE.COM SPORTSBOOK REAL MARKETS & FIXTURES TYPES
// ----------------------------------------------------

export interface StakeMarketOutcome {
  outcomeId: string;
  name: string; // e.g. "Real Madrid", "Match Nul", "Over 2.5", "Handicap (-1.5)"
  odds: number; // Decimal odds e.g. 1.95
  probability: number; // Implied probability %
  isRecommended?: boolean;
  expectedValue?: number; // EV % if positive
  trueProbability?: number; // AI / Poisson true prob %
}

export interface StakeSportsMarket {
  marketId: string; // e.g. "1x2", "asian_handicap", "total_goals_2_5", "btts", "double_chance", "draw_no_bet", "first_half_winner"
  marketCategory: 'match_winner' | 'totals' | 'handicaps' | 'btts' | 'half_time' | 'combos' | 'player_props';
  marketName: string; // e.g. "Vainqueur du Match (1X2)", "Total de Buts Over/Under 2.5"
  status: 'active' | 'suspended' | 'settled';
  outcomes: StakeMarketOutcome[];
  bestValueOutcome?: StakeMarketOutcome;
  marginPercent?: number; // Bookmaker margin % (e.g. 3.2% on Stake vs 5.5% on standard books)
}

export interface StakeSportFixture {
  id: string;
  fixtureId: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey' | 'baseball';
  sportName: string;
  slug: string;
  tournament: string;
  countryOrCategory?: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  startTimestamp: number;
  kickoffFormattedParis: string;
  minutesUntilKickoff: number;
  isLive: boolean;
  liveStatus?: {
    period: string;
    score: string;
    clock: string;
    inPlay: boolean;
  };
  stakeUrl: string;
  availableMarketsCount: number;
  markets: StakeSportsMarket[];
  topValueBet?: {
    marketName: string;
    pick: string;
    odds: number;
    expectedValue: number;
    confidenceScore: number;
    reasoning: string;
  };
}

export interface StakeMarketsResponse {
  connected: boolean;
  source: 'stake_graphql_api' | 'stake_feed_sync' | 'real_live_sports_engine';
  totalFixtures: number;
  totalMarkets: number;
  lastUpdated: string;
  sport: string;
  fixtures: StakeSportFixture[];
  stakeSportsbookStats: {
    averageStakeMargin: number; // e.g. 3.5%
    liveFixturesCount: number;
    upcomingFixturesCount: number;
    bestValueCount: number;
    sportsAvailable: string[];
  };
}

export interface IntegrationsStatus {
  openMeteo: {
    name: string;
    enabled: boolean;
    requiresKey: false;
    status: 'online' | 'fallback';
    description: string;
  };
  theOddsApi: {
    name: string;
    enabled: boolean;
    requiresKey: true;
    hasKey: boolean;
    status: 'connected' | 'simulated_quant_benchmark';
    description: string;
  };
  footballData: {
    name: string;
    enabled: boolean;
    requiresKey: true;
    hasKey: boolean;
    status: 'connected' | 'simulated_historical_engine';
    description: string;
  };
  rapidApiFootball: {
    name: string;
    enabled: boolean;
    requiresKey: true;
    hasKey: boolean;
    status: 'connected' | 'statistical_lineup_engine';
    description: string;
  };
  apiSports?: {
    name: string;
    enabled: boolean;
    requiresKey: true;
    hasKey: boolean;
    status: 'connected' | 'standby';
    description: string;
  };
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  timeFormattedParis: string;
  level: 'info' | 'success' | 'warn' | 'error';
  source: 'stake_graphql' | 'stake_feed' | 'the_odds_api' | 'football_data' | 'rapidapi' | 'odds_engine' | 'sync_service';
  event: string;
  details?: any;
  latencyMs?: number;
  httpStatus?: number;
}

export interface OddsAnomalyDetail {
  fixtureId: string;
  match: string;
  marketName: string;
  outcome: string;
  issueType: 'negative_or_zero_odds' | 'high_margin' | 'inverted_favourite' | 'kickoff_skew' | 'nan_value';
  details: string;
}

export interface SportsDiagnosticReport {
  timestamp: number;
  timeFormattedParis: string;
  environment: {
    hasStakeApiKey: boolean;
    apiKeyPrefix?: string;
    hasTheOddsApiKey: boolean;
    hasFootballDataKey: boolean;
    hasRapidApiKey: boolean;
    hasGeminiKey: boolean;
    activeDomain: string;
  };
  probeResults: {
    endpointTested: string;
    httpStatus: number;
    latencyMs: number;
    connected: boolean;
    authSuccess: boolean;
    sourceUsed: 'stake_graphql_api' | 'stake_feed_sync' | 'error_fallback';
    cfStatus?: string;
    errorMessage?: string;
  };
  feedSummary: {
    totalRawEventsCount: number;
    liveEventsCount: number;
    upcomingEventsCount: number;
    totalMarketsGenerated: number;
    sportsBreakdown: Record<string, number>;
  };
  oddsHealthCheck: {
    totalOutcomesAnalyzed: number;
    anomaliesCount: number;
    anomalies: OddsAnomalyDetail[];
    averageMarginPct: number;
    oddsRange: { min: number; max: number };
  };
  rawEventsSample: any[];
  rawStakeResponse?: any;
  recentLogs: DiagnosticLogEntry[];
}

export interface H2HMatchDetail {
  id: string;
  date: string;
  dateFormatted: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away' | 'draw';
  totalGoals: number;
  btts: boolean;
  over25: boolean;
  venue: string;
  halftimeScore?: string;
  summaryHighlight: string;
}

export interface SingleMatchParticipantDetail {
  name: string;
  formSummary: string;
  tacticalIdentity: string;
  strengths: string[];
  weaknesses: string[];
  keyPlayers: string[];
}

export interface SingleMatchAnalysis {
  match: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  odds: number;
  kickoffTime?: string;
  homeTeamAnalysis: SingleMatchParticipantDetail;
  awayTeamAnalysis: SingleMatchParticipantDetail;
  tacticalMatchup: {
    clashDescription: string;
    keyZoneDuel: string;
    pressingAndPaceOutlook: string;
    injuryAndFatigueContext: string;
  };
  mathematicalEdge: {
    marketRecommended: string;
    fairOdds: number;
    offeredOdds: number;
    expectedValuePct: number;
    impliedProbPct: number;
    modelProbPct: number;
    kellyStakePct: number;
    rationale: string;
  };
  scorePrediction: {
    predictedScore: string;
    homeExpGoals: number;
    awayExpGoals: number;
    scenario: string;
  };
  keyParticipantStats: string[];
  analyzedAt?: string;
  source?: string;
}

export interface H2HTeamFormMatch {
  opponent: string;
  score: string;
  result: 'V' | 'N' | 'D';
  isHome: boolean;
  dateFormatted: string;
}

export interface H2HAnalysisData {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  source: 'football_data_org' | 'historical_quant_engine';
  dataSourceLabel: string;
  hasLiveApiKey: boolean;
  last5Matches: H2HMatchDetail[];
  statsSummary: {
    totalPlayed: number;
    homeWins: number;
    homeWinPct: number;
    draws: number;
    drawPct: number;
    awayWins: number;
    awayWinPct: number;
    avgGoalsPerMatch: number;
    bttsPercentage: number;
    over25Percentage: number;
    homeCleanSheets: number;
    awayCleanSheets: number;
    mostCommonScoreline: string;
  };
  formLast5: {
    homeTeam: {
      teamName: string;
      sequence: ('V' | 'N' | 'D')[];
      winRatePct: number;
      goalsScored: number;
      goalsConceded: number;
      matches: H2HTeamFormMatch[];
    };
    awayTeam: {
      teamName: string;
      sequence: ('V' | 'N' | 'D')[];
      winRatePct: number;
      goalsScored: number;
      goalsConceded: number;
      matches: H2HTeamFormMatch[];
    };
  };
  confidenceBoost: {
    boostPercentage: number;
    confidenceIndex: 'Très Élevé' | 'Élevé' | 'Modéré';
    keyPattern: string;
    bettingImpact: string;
    tacticalTrend: string;
    preBetChecklist: string[];
  };
}

export type AppLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt';
export type OddsDisplayFormat = 'decimal' | 'american' | 'fractional' | 'implied_prob';
export type TimeFormat = '24h' | '12h';
export type ThemeAccent = 'blue' | 'emerald' | 'orange' | 'purple' | 'cyan';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  language: AppLanguage;
  timeZone: string;
  timeFormat: TimeFormat;
  oddsFormat: OddsDisplayFormat;
  defaultCurrency: string;
  defaultStakePercent: number; // e.g. 2.0%
  minExpectedValue: number; // e.g. 5.0%
  bankrollModel: 'quarter_kelly' | 'half_kelly' | 'flat_stake' | 'oscars_grind';
  soundEffects: boolean;
  hapticFeedback: boolean;
  valueBetAlerts: boolean;
  stopLossAlert: boolean;
  stopLossPercent: number; // e.g. 15%
  takeProfitAlert: boolean;
  takeProfitPercent: number; // e.g. 25%
  themeMode?: ThemeMode;
  themeAccent: ThemeAccent;
  compactView: boolean;
  animationsEnabled: boolean;
  hideBalancePrivacy: boolean;
  autoSaveCloud: boolean;
  autoWithdrawVaultEnabled?: boolean;
  autoWithdrawVaultThreshold?: number;
  // Dynamic Bankroll Risk Management & Base Bet Auto-Calculation
  autoBaseBetPercentEnabled?: boolean;
  autoBaseBetPercent?: number; // e.g. 0.1% of bankroll
  autoBaseBetMinFloor?: number; // e.g. 0.0001
  autoBaseBetMaxCap?: number; // e.g. 5.0%
  // Global Fixed Risk & Long-Term Account Survival
  globalRiskPercent?: number; // e.g. 0.5%
  globalRiskSurvivalMode?: 'ultra_safe' | 'safe' | 'balanced' | 'dynamic' | 'aggressive' | 'custom';
  autoRiskAdjustmentEnabled?: boolean; // Automatically propagate to all active strategies on balance updates
  globalStopLossMultiplier?: number;
  globalTakeProfitMultiplier?: number;
  // Browser Native Notifications
  browserNotificationsEnabled?: boolean;
  notifyOnCriticalLoss?: boolean;
  notifyOnUnexpectedStop?: boolean;
  notifyOnTakeProfit?: boolean;
}

export interface VaultTransferLog {
  id: string;
  timestamp: number;
  amount: number;
  currency: string;
  threshold: number;
  balanceBefore: number;
  balanceAfter: number;
  isLive: boolean;
  txId: string;
  source: 'autobet_engine' | 'manual' | 'live_sync';
}

export interface StrategyOptimizationSuggestion {
  analysisTitle: string;
  riskAssessment: 'Critique' | 'Élevé' | 'Modéré' | 'Optimisé' | string;
  riskScoreBefore: number;
  riskScoreAfter: number;
  ruinProbabilityBefore: number;
  ruinProbabilityAfter: number;
  keyFindings: string[];
  recommendedAdjustments: {
    onLossAction: 'reset' | 'increase' | 'multiply' | 'decrease' | 'custom' | string;
    onLossValue: number;
    onLossExplanation: string;
    targetMultiplier: number;
    targetMultiplierExplanation: string;
    baseBet: number;
    baseBetExplanation?: string;
    stopOnLoss?: number;
    stopOnProfit?: number;
    maxDrawdownLimit?: number;
  };
  actionableProtocol: string[];
  aiQuantitativeRationale: string;
  optimizedStrategy: BettingStrategy;
}

// --------------------------------------------------------------------
// BACKTESTING & HISTORICAL STRESS-TEST ENGINE TYPES
// --------------------------------------------------------------------

export interface HistoricalRound {
  round: number;
  multiplier?: number;
  roll?: number;
  outcome?: boolean | 'win' | 'loss';
  payout?: number;
  nonce?: number;
  serverSeed?: string;
  clientSeed?: string;
  game?: StakeGameType | string;
  rawDate?: string;
  details?: any;
}

export interface BacktestConfig {
  initialBankroll: number;
  strategy: BettingStrategy;
  maxRoundsToRun?: number;
  stopOnRuin: boolean;
  respectStopLoss: boolean;
  respectTakeProfit: boolean;
  respectMaxBetCap: boolean;
  maxBetCapValue?: number;
}

export interface BacktestRoundResult {
  round: number;
  betAmount: number;
  won: boolean;
  payout: number;
  profit: number;
  cumulativeProfit: number;
  balance: number;
  currentStreak: number;
  streakType: 'win' | 'loss';
  drawdownAmount: number;
  drawdownPct: number;
  multiplier?: number;
  roll?: number;
}

export interface BacktestSummary {
  totalRounds: number;
  roundsExecuted: number;
  initialBankroll: number;
  finalBankroll: number;
  netProfit: number;
  roiPct: number;
  totalWagered: number;
  turnoverMultiplier: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  longestWinStreak: number;
  longestLossStreak: number;
  peakBalance: number;
  lowestBalance: number;
  maxDrawdownAmount: number;
  maxDrawdownPct: number;
  peakBetAmount: number;
  peakBetAsPctOfBankroll: number;
  isBusted: boolean;
  bustRound?: number;
  stoppedByStopLoss: boolean;
  stoppedByTakeProfit: boolean;
  realizedRTP: number;
  theoreticalRTP: number;
  robustnessScore: number; // 0-100
  robustnessGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F (Ruin)';
  robustnessDiagnosis: string;
  stressTestFlags: {
    highDrawdown: boolean;
    bankrollOverload: boolean;
    martingaleTrap: boolean;
    wagerEfficient: boolean;
    positiveEV: boolean;
  };
  executionTimeMs: number;
}

export interface BacktestBenchmarkDataset {
  id: string;
  name: string;
  category: 'provably_fair' | 'stress_test' | 'wager' | 'extreme_variance';
  game: StakeGameType;
  roundsCount: number;
  description: string;
  icon: string;
  houseEdgePct: number;
  features: string[];
}

export interface MonteCarloSeedIterationResult {
  iteration: number;
  serverSeedHash: string;
  clientSeed: string;
  startNonce: number;
  roundsPlayed: number;
  finalBalance: number;
  netProfit: number;
  roiPct: number;
  maxDrawdownPct: number;
  maxLossStreak: number;
  maxBetAmount: number;
  status: 'ruined' | 'take_profit' | 'stop_loss' | 'completed';
  bustedRound?: number;
}

export interface MonteCarloTrajectoryPoint {
  step: number;
  p5: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  samplePaths: number[];
}

export interface MonteCarloHistogramBin {
  rangeLabel: string;
  minVal: number;
  maxVal: number;
  count: number;
  percentage: number;
  isProfit: boolean;
  isRuin: boolean;
}

export interface MonteCarloStreakDistributionItem {
  streakLength: number;
  occurrences: number;
  probabilityPct: number;
}

export interface MonteCarloBacktestSummary {
  totalIterations: number;
  roundsPerIteration: number;
  startingBankroll: number;
  ruinCount: number;
  ruinRatePct: number;
  takeProfitCount: number;
  takeProfitRatePct: number;
  stopLossCount: number;
  stopLossRatePct: number;
  profitableIterationsCount: number;
  profitableIterationsRatePct: number;
  meanFinalBalance: number;
  meanFinalProfit: number;
  medianFinalBalance: number;
  medianFinalProfit: number;
  minFinalProfit: number;
  maxFinalProfit: number;
  p5Balance: number;
  p25Balance: number;
  p75Balance: number;
  p95Balance: number;
  p5Profit: number;
  var95Profit: number; // Value at Risk 95%
  var99Profit: number; // Value at Risk 99%
  cvar95Profit: number; // Expected Shortfall
  stdDev: number;
  meanMaxDrawdownPct: number;
  medianMaxDrawdownPct: number;
  worstMaxDrawdownPct: number;
  meanBetsSurvivedBeforeRuin: number;
  executionTimeMs: number;
  trajectoryBands: MonteCarloTrajectoryPoint[];
  profitHistogram: MonteCarloHistogramBin[];
  lossStreakDistribution: MonteCarloStreakDistributionItem[];
  topWorstSeeds: MonteCarloSeedIterationResult[];
  topBestSeeds: MonteCarloSeedIterationResult[];
  recommendedBankrollForOnePercentRuin: number;
}

export type LicensePlan = 'free' | 'vip_monthly' | 'vip_yearly' | 'vip_lifetime' | 'admin';

export interface UserLicenseState {
  isPro: boolean;
  licenseKey?: string;
  plan: LicensePlan;
  planName: string;
  activatedAt?: number;
  expiresAt: number | null; // null = lifetime or admin
  features: string[];
  isAdmin?: boolean;
  freeDailyBetsRemaining: number;
  maxFreeDailyBets: number;
  lastResetDate: string; // YYYY-MM-DD
}




