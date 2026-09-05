import { StrategyCondition, StrategyTriggerType, StrategyActionType, BettingStrategy } from '../types';

export interface ConditionEvaluationContext {
  won: boolean;
  totalBets: number;
  currentStreak: number; // >0 for wins, <0 for losses
  previousStreak: number;
  currentLossStreak: number;
  currentWinStreak: number;
  prevLossStreak: number;
  prevWinStreak: number;
  currentBet: number;
  baseBet: number;
  currentMultiplier: number;
  baseMultiplier: number;
  sessionProfit: number;
  diceCondition?: 'above' | 'below';
  diceTarget?: number;
}

export interface ConditionEvaluationResult {
  nextBet: number;
  targetMultiplier: number;
  winChance: number;
  diceCondition?: 'above' | 'below';
  diceTarget?: number;
  shouldStopAutobet?: boolean;
  resetStreak?: boolean;
  triggeredRules: string[];
}

export interface StakeConditionOption<T> {
  value: T;
  label: string;
  labelEn: string;
  stakeCategory: 'streak' | 'session' | 'frequency' | 'bet_size' | 'outcome';
  desc: string;
  hasValue: boolean;
  unit: string;
  placeholder: string;
  defaultVal?: number;
  min?: number;
  max?: number;
  step?: number;
}

export const STAKE_TRIGGER_OPTIONS: StakeConditionOption<StrategyTriggerType>[] = [
  // Frequency
  { 
    value: 'every_loss', 
    label: 'Toutes les N pertes (Every X Losses)', 
    labelEn: 'Every X Losses',
    stakeCategory: 'frequency',
    desc: 'Se déclenche à chaque série atteignant un multiple de N pertes (ex: 1 = à chaque perte)', 
    hasValue: true, 
    unit: 'pertes', 
    placeholder: '1',
    defaultVal: 1,
    min: 1,
    step: 1
  },
  { 
    value: 'every_win', 
    label: 'Toutes les N victoires (Every X Wins)', 
    labelEn: 'Every X Wins',
    stakeCategory: 'frequency',
    desc: 'Se déclenche à chaque série atteignant un multiple de N victoires (ex: 1 = à chaque gain)', 
    hasValue: true, 
    unit: 'victoires', 
    placeholder: '1',
    defaultVal: 1,
    min: 1,
    step: 1
  },
  { 
    value: 'every_bets', 
    label: 'Tous les N paris (Every X Bets)', 
    labelEn: 'Every X Bets',
    stakeCategory: 'frequency',
    desc: 'Se déclenche tous les X paris consécutifs joués au total', 
    hasValue: true, 
    unit: 'paris', 
    placeholder: '5',
    defaultVal: 5,
    min: 1,
    step: 1
  },

  // Loss Streaks
  { 
    value: 'loss_streak_of', 
    label: 'Série de pertes égale à N (Loss Streak = N)', 
    labelEn: 'Loss Streak = N',
    stakeCategory: 'streak',
    desc: 'Se déclenche exactement lorsque la série de pertes atteint N', 
    hasValue: true, 
    unit: 'pertes consécutives', 
    placeholder: '3',
    defaultVal: 3,
    min: 1,
    step: 1
  },
  { 
    value: 'loss_streak_greater_than', 
    label: 'Série de pertes supérieure à N (Streak > N Losses)', 
    labelEn: 'Streak > N Losses',
    stakeCategory: 'streak',
    desc: 'Se déclenche lorsque la série de pertes en cours est strictement supérieure à N (ou >= N+1)', 
    hasValue: true, 
    unit: 'pertes consécutives', 
    placeholder: '3',
    defaultVal: 3,
    min: 1,
    step: 1
  },
  { 
    value: 'loss_streak_lower_than', 
    label: 'Série de pertes inférieure à N (Streak < N Losses)', 
    labelEn: 'Streak < N Losses',
    stakeCategory: 'streak',
    desc: 'Se déclenche en cas de perte si la série consécutive reste strictement inférieure à N', 
    hasValue: true, 
    unit: 'pertes max', 
    placeholder: '4',
    defaultVal: 4,
    min: 1,
    step: 1
  },

  // Win Streaks
  { 
    value: 'win_streak_of', 
    label: 'Série de victoires égale à N (Win Streak = N)', 
    labelEn: 'Win Streak = N',
    stakeCategory: 'streak',
    desc: 'Se déclenche exactement lorsque la série de victoires atteint N', 
    hasValue: true, 
    unit: 'gains consécutifs', 
    placeholder: '3',
    defaultVal: 3,
    min: 1,
    step: 1
  },
  { 
    value: 'win_streak_greater_than', 
    label: 'Série de victoires supérieure à N (Streak > N Wins)', 
    labelEn: 'Streak > N Wins',
    stakeCategory: 'streak',
    desc: 'Se déclenche lorsque la série de victoires en cours est strictement supérieure à N', 
    hasValue: true, 
    unit: 'gains consécutifs', 
    placeholder: '3',
    defaultVal: 3,
    min: 1,
    step: 1
  },
  { 
    value: 'win_streak_lower_than', 
    label: 'Série de victoires inférieure à N (Streak < N Wins)', 
    labelEn: 'Streak < N Wins',
    stakeCategory: 'streak',
    desc: 'Se déclenche en cas de gain si la série consécutive reste strictement inférieure à N', 
    hasValue: true, 
    unit: 'gains max', 
    placeholder: '3',
    defaultVal: 3,
    min: 1,
    step: 1
  },

  // State Transition (First Win/Loss)
  { 
    value: 'first_win_after_losses', 
    label: '1er gain après N pertes (First Win After Losses)', 
    labelEn: 'First Win After Losses',
    stakeCategory: 'outcome',
    desc: 'Se déclenche à la 1ère victoire interrompant une série d\'au moins N pertes préalables', 
    hasValue: true, 
    unit: 'pertes préalables', 
    placeholder: '2',
    defaultVal: 2,
    min: 1,
    step: 1
  },
  { 
    value: 'first_loss_after_wins', 
    label: '1ère perte après N victoires (First Loss After Wins)', 
    labelEn: 'First Loss After Wins',
    stakeCategory: 'outcome',
    desc: 'Se déclenche à la 1ère défaite interrompant une série d\'au moins N victoires préalables', 
    hasValue: true, 
    unit: 'victoires préalables', 
    placeholder: '2',
    defaultVal: 2,
    min: 1,
    step: 1
  },

  // Session Profit / Loss Limits
  { 
    value: 'profit_greater_than', 
    label: 'Profit de session >= N (Session Profit >= N)', 
    labelEn: 'Session Profit >= N',
    stakeCategory: 'session',
    desc: 'Se déclenche lorsque le profit cumulé net de la session atteint ou dépasse N', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '10',
    defaultVal: 10,
    min: 0.0001,
    step: 0.1
  },
  { 
    value: 'profit_lower_than', 
    label: 'Profit de session <= N (Session Profit <= N)', 
    labelEn: 'Session Profit <= N',
    stakeCategory: 'session',
    desc: 'Se déclenche lorsque le profit cumulé net de la session est inférieur ou égal à N', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '0',
    defaultVal: 0,
    step: 0.1
  },
  { 
    value: 'loss_greater_than', 
    label: 'Perte de session >= N (Session Loss >= N)', 
    labelEn: 'Session Loss >= N',
    stakeCategory: 'session',
    desc: 'Se déclenche lorsque le déficit cumulé de la session atteint ou dépasse N', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '15',
    defaultVal: 15,
    min: 0.0001,
    step: 0.1
  },
  { 
    value: 'loss_lower_than', 
    label: 'Perte de session <= N (Session Loss <= N)', 
    labelEn: 'Session Loss <= N',
    stakeCategory: 'session',
    desc: 'Se déclenche si le déficit cumulé de la session reste inférieur ou égal à N', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '5',
    defaultVal: 5,
    min: 0.0001,
    step: 0.1
  },

  // Bet Size Triggers
  { 
    value: 'bet_greater_than', 
    label: 'Montant de mise >= N (Bet Amount >= N)', 
    labelEn: 'Bet Amount >= N',
    stakeCategory: 'bet_size',
    desc: 'Se déclenche si la mise en cours atteint ou dépasse ce montant', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '5',
    defaultVal: 5,
    min: 0.0001,
    step: 0.1
  },
  { 
    value: 'bet_lower_than', 
    label: 'Montant de mise <= N (Bet Amount <= N)', 
    labelEn: 'Bet Amount <= N',
    stakeCategory: 'bet_size',
    desc: 'Se déclenche si la mise en cours est inférieure ou égale à ce montant', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '0.01',
    defaultVal: 0.01,
    min: 0.0001,
    step: 0.001
  },
];

export const STAKE_ACTION_OPTIONS: StakeConditionOption<StrategyActionType>[] = [
  // Bet Sizing Actions
  { 
    value: 'increase_bet_pct', 
    label: 'Augmenter la mise de +N% (Increase Bet Amount %)', 
    labelEn: 'Increase Bet Amount %',
    stakeCategory: 'bet_size',
    desc: 'Augmente la mise actuelle du pourcentage spécifié (ex: +100% = doubler la mise)', 
    hasValue: true, 
    unit: '%', 
    placeholder: '100', 
    defaultVal: 100,
    min: 0.01,
    step: 1
  },
  { 
    value: 'decrease_bet_pct', 
    label: 'Diminuer la mise de -N% (Decrease Bet Amount %)', 
    labelEn: 'Decrease Bet Amount %',
    stakeCategory: 'bet_size',
    desc: 'Diminue la mise actuelle du pourcentage spécifié (ex: -50% = diviser par 2)', 
    hasValue: true, 
    unit: '%', 
    placeholder: '50', 
    defaultVal: 50,
    min: 0.01,
    max: 99.99,
    step: 1
  },
  { 
    value: 'multiply_bet', 
    label: 'Multiplier la mise par N (Multiply Bet Amount)', 
    labelEn: 'Multiply Bet Amount',
    stakeCategory: 'bet_size',
    desc: 'Multiplie la mise par un facteur précis (ex: 2.0x pour Martingale, 1.5x pour Fibonacci)', 
    hasValue: true, 
    unit: 'facteur (ex: 2.0x)', 
    placeholder: '2.0', 
    defaultVal: 2.0,
    min: 0.01,
    step: 0.05
  },
  { 
    value: 'increase_bet_fixed', 
    label: 'Augmenter la mise de +N fixe (Add Fixed Bet)', 
    labelEn: 'Add Fixed Bet Amount',
    stakeCategory: 'bet_size',
    desc: 'Ajoute un montant fixe à la mise en cours (idéal pour D\'Alembert ou Oscar\'s Grind)', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '0.10', 
    defaultVal: 0.10,
    min: 0.0001,
    step: 0.01
  },
  { 
    value: 'set_bet_fixed', 
    label: 'Définir la mise à N (Set Bet Amount)', 
    labelEn: 'Set Bet Amount',
    stakeCategory: 'bet_size',
    desc: 'Fixe immédiatement la mise à une valeur absolue exacte', 
    hasValue: true, 
    unit: 'Devise / USDT', 
    placeholder: '1.00', 
    defaultVal: 1.00,
    min: 0.0001,
    step: 0.01
  },
  { 
    value: 'reset_bet', 
    label: 'Réinitialiser le montant de mise (Reset Bet Amount)', 
    labelEn: 'Reset Bet Amount',
    stakeCategory: 'bet_size',
    desc: 'Remet immédiatement la mise à son montant initial (mise de base configurée)', 
    hasValue: false, 
    unit: '', 
    placeholder: '' 
  },

  // Multiplier / Payout / Win Chance Actions
  { 
    value: 'change_multiplier', 
    label: 'Définir le multiplicateur cible à N (Set Target Multiplier)', 
    labelEn: 'Set Target Multiplier',
    stakeCategory: 'outcome',
    desc: 'Modifie la cote / multiplicateur cible du jeu (ex: 3.0x, 9.9x, 2.0x)', 
    hasValue: true, 
    unit: 'cote cible (ex: 3.00x)', 
    placeholder: '3.00', 
    defaultVal: 3.00,
    min: 1.01,
    step: 0.05
  },
  { 
    value: 'reset_multiplier', 
    label: 'Réinitialiser le multiplicateur (Reset Target Multiplier)', 
    labelEn: 'Reset Target Multiplier',
    stakeCategory: 'outcome',
    desc: 'Remet le multiplicateur cible à sa valeur d\'origine du cycle', 
    hasValue: false, 
    unit: '', 
    placeholder: '' 
  },
  { 
    value: 'increase_multiplier_pct', 
    label: 'Augmenter le multiplicateur de +N% (Increase Multiplier %)', 
    labelEn: 'Increase Multiplier %',
    stakeCategory: 'outcome',
    desc: 'Augmente la cote proportionnellement', 
    hasValue: true, 
    unit: '%', 
    placeholder: '25', 
    defaultVal: 25,
    min: 0.01,
    step: 1
  },
  { 
    value: 'decrease_multiplier_pct', 
    label: 'Diminuer le multiplicateur de -N% (Decrease Multiplier %)', 
    labelEn: 'Decrease Multiplier %',
    stakeCategory: 'outcome',
    desc: 'Diminue la cote proportionnellement (sans descendre sous 1.01x)', 
    hasValue: true, 
    unit: '%', 
    placeholder: '25', 
    defaultVal: 25,
    min: 0.01,
    step: 1
  },
  { 
    value: 'switch_direction', 
    label: 'Inverser Over / Under (Switch Over/Under Direction)', 
    labelEn: 'Switch Over/Under Direction',
    stakeCategory: 'outcome',
    desc: 'Bascule entre Roll Over et Roll Under (inversion du seuil) pour casser les séries du dé', 
    hasValue: false, 
    unit: '', 
    placeholder: '' 
  },
  { 
    value: 'set_dice_target', 
    label: 'Fixer la cible Dice à N (Set Roll Target)', 
    labelEn: 'Set Roll Target',
    stakeCategory: 'outcome',
    desc: 'Définit le score cible précis du dé (ex: 50.49)', 
    hasValue: true, 
    unit: 'nombre (0.01-99.99)', 
    placeholder: '50.49', 
    defaultVal: 50.49,
    min: 0.01,
    max: 99.99,
    step: 0.01
  },

  // Bot Safety & Streaks
  { 
    value: 'reset_streak_counter', 
    label: 'Réinitialiser le compteur de séries (Reset Streak Counter)', 
    labelEn: 'Reset Streak Counter',
    stakeCategory: 'streak',
    desc: 'Remet à zéro le compteur de victoires/pertes consécutives pour ce sous-cycle', 
    hasValue: false, 
    unit: '', 
    placeholder: '' 
  },
  { 
    value: 'stop_autobet', 
    label: 'Arrêter le pari automatique (Stop Autobet)', 
    labelEn: 'Stop Autobet',
    stakeCategory: 'session',
    desc: 'Coupe-circuit de sécurité immédiat stoppant la session de paris', 
    hasValue: false, 
    unit: '', 
    placeholder: '' 
  },
];

export const STAKE_OFFICIAL_CONDITION_PRESETS: Array<{
  id: string;
  name: string;
  category: 'safety' | 'growth' | 'momentum' | 'oscillator' | 'wager';
  badge: string;
  description: string;
  conditions: StrategyCondition[];
}> = [
  {
    id: 'stake-martingale-switch',
    name: 'Martingale Inversée Over/Under (Stake Classic)',
    category: 'momentum',
    badge: 'Populaire Stake',
    description: 'Double la mise à chaque défaite tout en inversant la condition Over/Under pour contrer les streaks de graines.',
    conditions: [
      {
        id: 'cond-stk-1',
        order: 1,
        triggerType: 'every_loss',
        triggerValue: 1,
        actionType: 'increase_bet_pct',
        actionValue: 100,
        description: 'On every 1 Loss -> Increase bet amount by 100%',
        stakeUiCode: 'On every 1 Loss -> Increase bet by 100%',
        isActive: true,
      },
      {
        id: 'cond-stk-2',
        order: 2,
        triggerType: 'every_loss',
        triggerValue: 1,
        actionType: 'switch_direction',
        description: 'On every 1 Loss -> Switch Over/Under direction',
        stakeUiCode: 'On every 1 Loss -> Switch Over/Under',
        isActive: true,
      },
      {
        id: 'cond-stk-3',
        order: 3,
        triggerType: 'every_win',
        triggerValue: 1,
        actionType: 'reset_bet',
        description: 'On every 1 Win -> Reset bet amount',
        stakeUiCode: 'On every 1 Win -> Reset bet amount',
        isActive: true,
      }
    ]
  },
  {
    id: 'stake-circuit-breaker',
    name: 'Coupe-Circuit Anti-Drawdown & Protection',
    category: 'safety',
    badge: 'Protection Maximale',
    description: 'Divise la mise par 2 après 4 pertes d\'affilée, réinitialise à la 1ère victoire et coupe l\'autobet si le stop loss de session est touché.',
    conditions: [
      {
        id: 'cond-stk-4',
        order: 1,
        triggerType: 'loss_streak_greater_than',
        triggerValue: 3,
        actionType: 'decrease_bet_pct',
        actionValue: 50,
        description: 'Streak > 3 Losses -> Decrease bet by 50%',
        stakeUiCode: 'Streak > 3 Losses -> Decrease bet by 50%',
        isActive: true,
      },
      {
        id: 'cond-stk-5',
        order: 2,
        triggerType: 'first_win_after_losses',
        triggerValue: 2,
        actionType: 'reset_bet',
        description: 'First Win After 2 Losses -> Reset bet amount',
        stakeUiCode: 'First Win After 2 Losses -> Reset bet',
        isActive: true,
      },
      {
        id: 'cond-stk-6',
        order: 3,
        triggerType: 'loss_greater_than',
        triggerValue: 20,
        actionType: 'reset_bet',
        description: 'Session Loss >= 20 -> Reset bet amount to base',
        stakeUiCode: 'Session Loss >= 20 -> Reset bet amount',
        isActive: true,
      }
    ]
  },
  {
    id: 'stake-paroli-1326',
    name: 'Paroli Booster Asymétrique (1-3-2-6)',
    category: 'growth',
    badge: 'Croissance Positive',
    description: 'Augmente les mises uniquement pendant les séries gagnantes et verrouille les profits dès 3 victoires consécutives.',
    conditions: [
      {
        id: 'cond-stk-7',
        order: 1,
        triggerType: 'every_win',
        triggerValue: 1,
        actionType: 'increase_bet_pct',
        actionValue: 100,
        description: 'On every 1 Win -> Increase bet by 100%',
        stakeUiCode: 'On every 1 Win -> Increase bet by 100%',
        isActive: true,
      },
      {
        id: 'cond-stk-8',
        order: 2,
        triggerType: 'win_streak_of',
        triggerValue: 3,
        actionType: 'reset_bet',
        description: 'Win Streak = 3 -> Reset bet to lock profit',
        stakeUiCode: 'Win Streak = 3 -> Reset bet amount',
        isActive: true,
      },
      {
        id: 'cond-stk-9',
        order: 3,
        triggerType: 'first_loss_after_wins',
        triggerValue: 1,
        actionType: 'reset_bet',
        description: 'First Loss After Wins -> Reset bet amount',
        stakeUiCode: 'First Loss After Wins -> Reset bet',
        isActive: true,
      }
    ]
  },
  {
    id: 'stake-sniper-payout',
    name: 'Pivot Sniper Haute Cote (9.9x)',
    category: 'oscillator',
    badge: 'Cote Dynamique',
    description: 'Après 5 pertes consécutives, élève temporairement la cote à 9.9x pour capturer un gain asymétrique, puis revient à 2.0x dès le gain.',
    conditions: [
      {
        id: 'cond-stk-10',
        order: 1,
        triggerType: 'loss_streak_of',
        triggerValue: 5,
        actionType: 'change_multiplier',
        actionValue: 9.90,
        description: 'Loss Streak = 5 -> Set Target Multiplier to 9.90x',
        stakeUiCode: 'Loss Streak = 5 -> Set Multiplier to 9.90x',
        isActive: true,
      },
      {
        id: 'cond-stk-11',
        order: 2,
        triggerType: 'first_win_after_losses',
        triggerValue: 1,
        actionType: 'reset_multiplier',
        description: 'First Win After Losses -> Reset Target Multiplier',
        stakeUiCode: 'First Win After Losses -> Reset Multiplier',
        isActive: true,
      },
      {
        id: 'cond-stk-12',
        order: 3,
        triggerType: 'first_win_after_losses',
        triggerValue: 1,
        actionType: 'reset_bet',
        description: 'First Win After Losses -> Reset bet amount',
        stakeUiCode: 'First Win After Losses -> Reset bet',
        isActive: true,
      }
    ]
  },
  {
    id: 'stake-wager-vip-grinder',
    name: 'Wager VIP Grinder 1.05x (Volume Élevé)',
    category: 'wager',
    badge: 'Wager & Rakeback',
    description: 'Calibré pour accumuler un volume maximal pour les paliers VIP Stake avec switch Over/Under régulier tous les 10 paris.',
    conditions: [
      {
        id: 'cond-stk-13',
        order: 1,
        triggerType: 'every_bets',
        triggerValue: 10,
        actionType: 'switch_direction',
        description: 'Every 10 Bets -> Switch Over/Under direction',
        stakeUiCode: 'Every 10 Bets -> Switch Over/Under',
        isActive: true,
      },
      {
        id: 'cond-stk-14',
        order: 2,
        triggerType: 'every_loss',
        triggerValue: 1,
        actionType: 'increase_bet_pct',
        actionValue: 1200,
        description: 'On every 1 Loss -> Increase bet amount by 1200% (recouvrement 1.05x)',
        stakeUiCode: 'On every 1 Loss -> Increase bet by 1200%',
        isActive: true,
      },
      {
        id: 'cond-stk-15',
        order: 3,
        triggerType: 'first_win_after_losses',
        triggerValue: 1,
        actionType: 'reset_bet',
        description: 'First Win After Losses -> Reset bet amount',
        stakeUiCode: 'First Win After Losses -> Reset bet',
        isActive: true,
      }
    ]
  }
];

/**
 * Evaluates whether a condition trigger is satisfied given the current game & session state.
 */
export function evaluateConditionTrigger(
  cond: StrategyCondition,
  ctx: ConditionEvaluationContext
): boolean {
  if (cond.isActive === false) return false;
  const triggerVal = cond.triggerValue ?? 1;

  switch (cond.triggerType) {
    case 'every_loss':
      return !ctx.won && ctx.currentLossStreak > 0 && ctx.currentLossStreak % triggerVal === 0;

    case 'every_win':
      return ctx.won && ctx.currentWinStreak > 0 && ctx.currentWinStreak % triggerVal === 0;

    case 'every_bets':
      return ctx.totalBets > 0 && ctx.totalBets % triggerVal === 0;

    case 'loss_streak_of':
      return !ctx.won && ctx.currentLossStreak === triggerVal;

    case 'loss_streak_greater_than':
      return !ctx.won && ctx.currentLossStreak > triggerVal;

    case 'loss_streak_lower_than':
      return !ctx.won && ctx.currentLossStreak > 0 && ctx.currentLossStreak < triggerVal;

    case 'win_streak_of':
      return ctx.won && ctx.currentWinStreak === triggerVal;

    case 'win_streak_greater_than':
      return ctx.won && ctx.currentWinStreak > triggerVal;

    case 'win_streak_lower_than':
      return ctx.won && ctx.currentWinStreak > 0 && ctx.currentWinStreak < triggerVal;

    case 'first_win_after_losses':
      return ctx.won && ctx.prevLossStreak >= triggerVal && ctx.currentWinStreak === 1;

    case 'first_loss_after_wins':
      return !ctx.won && ctx.prevWinStreak >= triggerVal && ctx.currentLossStreak === 1;

    case 'profit_greater_than':
      return ctx.sessionProfit >= triggerVal;

    case 'profit_lower_than':
      return ctx.sessionProfit <= triggerVal;

    case 'loss_greater_than':
      return ctx.sessionProfit <= -triggerVal;

    case 'loss_lower_than':
      return ctx.sessionProfit <= 0 && ctx.sessionProfit >= -triggerVal;

    case 'bet_greater_than':
      return ctx.currentBet >= triggerVal;

    case 'bet_lower_than':
      return ctx.currentBet <= triggerVal;

    default:
      return false;
  }
}

/**
 * Applies a condition's action to the state.
 */
export function applyConditionAction(
  cond: StrategyCondition,
  ctx: ConditionEvaluationContext,
  currentState: {
    nextBet: number;
    targetMultiplier: number;
    winChance: number;
    diceCondition?: 'above' | 'below';
    diceTarget?: number;
    shouldStopAutobet?: boolean;
    resetStreak?: boolean;
  }
): void {
  const actionVal = cond.actionValue ?? 0;

  switch (cond.actionType) {
    case 'increase_bet_pct':
      currentState.nextBet = Number((currentState.nextBet * (1 + actionVal / 100)).toFixed(6));
      break;

    case 'decrease_bet_pct':
      currentState.nextBet = Number((currentState.nextBet * Math.max(0.001, 1 - actionVal / 100)).toFixed(6));
      break;

    case 'multiply_bet':
      currentState.nextBet = Number((currentState.nextBet * (actionVal || 2)).toFixed(6));
      break;

    case 'increase_bet_fixed':
      currentState.nextBet = Number((currentState.nextBet + actionVal).toFixed(6));
      break;

    case 'set_bet_fixed':
      currentState.nextBet = Math.max(0.0001, Number(actionVal.toFixed(6)) || ctx.baseBet);
      break;

    case 'reset_bet':
      currentState.nextBet = ctx.baseBet;
      break;

    case 'change_multiplier':
      if (actionVal >= 1.01) {
        currentState.targetMultiplier = Number(actionVal.toFixed(4));
        currentState.winChance = Number((99 / actionVal).toFixed(2));
      }
      break;

    case 'reset_multiplier':
      currentState.targetMultiplier = ctx.baseMultiplier;
      currentState.winChance = Number((99 / ctx.baseMultiplier).toFixed(2));
      break;

    case 'increase_multiplier_pct':
      if (currentState.targetMultiplier) {
        const newMult = Number((currentState.targetMultiplier * (1 + actionVal / 100)).toFixed(4));
        currentState.targetMultiplier = newMult;
        currentState.winChance = Number((99 / newMult).toFixed(2));
      }
      break;

    case 'decrease_multiplier_pct':
      if (currentState.targetMultiplier) {
        const newMult = Math.max(1.01, Number((currentState.targetMultiplier * Math.max(0.01, 1 - actionVal / 100)).toFixed(4)));
        currentState.targetMultiplier = newMult;
        currentState.winChance = Number((99 / newMult).toFixed(2));
      }
      break;

    case 'switch_direction':
      currentState.diceCondition = currentState.diceCondition === 'above' ? 'below' : 'above';
      if (currentState.diceTarget !== undefined) {
        currentState.diceTarget = Number((100 - currentState.diceTarget).toFixed(2));
      }
      break;

    case 'set_dice_target':
      if (actionVal > 0 && actionVal < 100) {
        currentState.diceTarget = Number(actionVal.toFixed(2));
      }
      break;

    case 'reset_streak_counter':
      currentState.resetStreak = true;
      break;

    case 'stop_autobet':
      currentState.shouldStopAutobet = true;
      break;
  }
}

/**
 * Generates an automatic, clear Stake-like description for a condition.
 */
export function formatStakeConditionDescription(
  triggerType: StrategyTriggerType,
  triggerVal: number | undefined,
  actionType: StrategyActionType,
  actionVal: number | undefined,
  currency = 'USDT'
): string {
  const trig = STAKE_TRIGGER_OPTIONS.find((t) => t.value === triggerType);
  const act = STAKE_ACTION_OPTIONS.find((a) => a.value === actionType);

  let trigStr = trig ? trig.label.split('(')[0].trim() : triggerType;
  if (trig?.hasValue && triggerVal !== undefined) {
    const unit = trig.unit.includes('Devise') ? currency : trig.unit;
    trigStr += ` [${triggerVal} ${unit}]`;
  }

  let actStr = act ? act.label.split('(')[0].trim() : actionType;
  if (act?.hasValue && actionVal !== undefined) {
    const unit = act.unit.includes('Devise') ? currency : act.unit;
    actStr += ` [${actionVal} ${unit}]`;
  }

  return `SI ${trigStr} ➔ ALORS ${actStr}`;
}

/**
 * Generates the official Stake.com UI code syntax.
 */
export function formatStakeCodeSnippet(
  triggerType: StrategyTriggerType,
  triggerVal: number | undefined,
  actionType: StrategyActionType,
  actionVal: number | undefined
): string {
  const trig = STAKE_TRIGGER_OPTIONS.find((t) => t.value === triggerType);
  const act = STAKE_ACTION_OPTIONS.find((a) => a.value === actionType);

  let trigCode = trig?.labelEn || triggerType.replace(/_/g, ' ');
  if (trig?.hasValue && triggerVal !== undefined) {
    trigCode = trigCode.replace('X', String(triggerVal)).replace('N', String(triggerVal));
    if (!trigCode.includes(String(triggerVal))) {
      trigCode += ` ${triggerVal}`;
    }
  }

  let actCode = act?.labelEn || actionType.replace(/_/g, ' ');
  if (act?.hasValue && actionVal !== undefined) {
    actCode = actCode.replace('X', String(actionVal)).replace('N', String(actionVal));
    if (!actCode.includes(String(actionVal))) {
      actCode += ` ${actionVal}`;
    }
  }

  return `${trigCode} -> ${actCode}`;
}
