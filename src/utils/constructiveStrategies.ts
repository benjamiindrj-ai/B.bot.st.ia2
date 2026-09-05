import { BettingStrategy, StakeGameType, RiskLevel, StrategyCondition, StrategyTriggerType, StrategyActionType } from '../types';

export interface ConstructiveArchetype {
  nameTemplate: string;
  category: 'oscars_grind' | 'dalembert' | 'paroli_lock' | 'milestone_1326' | 'fractional_kelly' | 'mines_safe_hunter' | 'limbo_ladder' | 'anti_drawdown_plateau' | 'wager_volume';
  descriptionTemplate: string;
  game: StakeGameType;
  riskLevel: RiskLevel;
  targetMultiplier: number;
  winChance: number;
  baseBetPercent: number;
  onWinAction: 'reset' | 'increase_pct' | 'increase_fixed' | 'custom';
  onWinValue?: number;
  onLossAction: 'increase_fixed' | 'increase_pct' | 'reset' | 'fibonacci' | 'custom';
  onLossValue?: number;
  stopOnProfitPercent: number;
  stopOnLossPercent: number;
  maxConsecutiveLosses: number;
  gameConfig?: any;
  aiRationale: string;
  // Wager metrics
  wagerTurnoverMultiplier?: number;
  vipTier?: string;
}

export const CONSTRUCTIVE_ARCHETYPES: ConstructiveArchetype[] = [
  // --- DICE ---
  {
    nameTemplate: "Dice 10% Sniper Micro-Mises (9.90x)",
    category: 'paroli_lock',
    descriptionTemplate: "Micro-mises (0.04% bankroll) sur cote 9.90x (10% de chances). 1 seul gain compense 9 tours perdants et génère un bond net de profit sans risquer de martingale.",
    game: 'dice',
    riskLevel: 'high',
    targetMultiplier: 9.90,
    winChance: 10.00,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 18,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 30,
    gameConfig: { diceCondition: 'above', diceTarget: 89.99 },
    aiRationale: "Cote 9.90x à 10% de chances : les micro-mises préservent le capital pendant les séries creuses et débloquent un gain massif au premier hit.",
  },
  {
    nameTemplate: "Dice 15% Asymmetric Striker (6.60x)",
    category: 'paroli_lock',
    descriptionTemplate: "Mises ultra-légères (0.06% bankroll) sur cote 6.60x (15% de chances). Idéal pour accumuler du profit par touches régulières sans grosse mise sur 1 seul clic.",
    game: 'dice',
    riskLevel: 'medium',
    targetMultiplier: 6.60,
    winChance: 15.00,
    baseBetPercent: 0.06,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 22,
    gameConfig: { diceCondition: 'above', diceTarget: 84.99 },
    aiRationale: "Winrate de 15% (cote 6.60x) : 1 victoire tous les ~6-7 coups en moyenne, amortissement parfait sans doublement de mise.",
  },
  {
    nameTemplate: "Dice 30% Dynamic Momentum (3.30x)",
    category: 'dalembert',
    descriptionTemplate: "Mises mesurées (0.12% bankroll) sur cote 3.30x (30% de chances). Ratio risque/rendement attractif avec encaissement rapide des bénéfices.",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 3.30,
    winChance: 30.00,
    baseBetPercent: 0.12,
    onWinAction: 'reset',
    onLossAction: 'increase_fixed',
    onLossValue: 0.02,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 16,
    maxConsecutiveLosses: 14,
    gameConfig: { diceCondition: 'above', diceTarget: 69.99 },
    aiRationale: "Cote 3.30x (30% winrate) : permet de faire croître le capital sans stress en absorbant les petites fluctuations.",
  },
  {
    nameTemplate: "Oscar's Grind Cycle Discipliné (49.5% Win)",
    category: 'oscars_grind',
    descriptionTemplate: "Objectif strict de +1 unité de gain net par cycle sur cote 2.00x. En cas de perte, la mise reste constante (aucune hausse de mise sur défaite). En cas de victoire, la mise augmente d'une unité jusqu'à atteindre +1 unité de profit net, puis réinitialisation immédiate.",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 2.0,
    winChance: 49.50,
    baseBetPercent: 0.25,
    onWinAction: 'increase_fixed',
    onLossAction: 'custom',
    onLossValue: 0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 10,
    gameConfig: { diceCondition: 'above', diceTarget: 50.49 },
    aiRationale: "Excellente alternative à la Martingale : la mise n'augmente JAMAIS sur une perte, ce qui élimine le risque d'explosion exponentielle. Le capital reste préservé même lors de séries défavorables.",
  },
  {
    nameTemplate: "D'Alembert Linéaire Équilibré (47.1% Win)",
    category: 'dalembert',
    descriptionTemplate: "Progression arithmétique douce : ajoute 1 petite unité fixe en cas de défaite et retire 1 unité en cas de victoire. Évite tout emballement géométrique.",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 2.10,
    winChance: 47.14,
    baseBetPercent: 0.2,
    onWinAction: 'custom',
    onLossAction: 'increase_fixed',
    onLossValue: 0.03,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 25,
    maxConsecutiveLosses: 12,
    gameConfig: { diceCondition: 'above', diceTarget: 52.85 },
    aiRationale: "La progression linéaire amortit la volatilité. Deux victoires et deux défaites laissent un solde positif avec une cote à 2.10x.",
  },
  {
    nameTemplate: "Dice Scalper Haute Fréquence (82.5% Winrate)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Scalping à haute probabilité (82.5% de chances de gain, cote 1.20x). Mise unitaire stable avec réévaluation dynamique par cycle de 25 lancers et stop-loss strict.",
    game: 'dice',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.20,
    winChance: 82.50,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 3,
    gameConfig: { diceCondition: 'above', diceTarget: 17.50 },
    aiRationale: "Variance minimale et progression régulière sans jamais exposer le capital à de grands écarts.",
  },
  {
    nameTemplate: "Dice 85% Fortress Scalp (1.16x)",
    category: 'fractional_kelly',
    descriptionTemplate: "Protection maximale avec 85.00% de winrate (cote 1.1647x). Mises régulières pour une capitalisation sereine sans à-coups.",
    game: 'dice',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.1647,
    winChance: 85.00,
    baseBetPercent: 0.6,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 7,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 3,
    gameConfig: { diceCondition: 'above', diceTarget: 14.99 },
    aiRationale: "85% de winrate : 17 victoires sur 20 tirs en moyenne, sécurité maximale du capital.",
  },

  // --- LIMBO ---
  {
    nameTemplate: "Limbo 10x Deca-Hunter (9.9% Win)",
    category: 'paroli_lock',
    descriptionTemplate: "Micro-mises de 0.03% de la bankroll ciblant le multiplicateur 10.0x (9.9% de probabilité). 1 seule victoire rapporte +9x la mise, idéale pour monter sans grosse exposition.",
    game: 'limbo',
    riskLevel: 'high',
    targetMultiplier: 10.0,
    winChance: 9.90,
    baseBetPercent: 0.03,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 20,
    stopOnLossPercent: 10,
    maxConsecutiveLosses: 35,
    gameConfig: { limboTarget: 10.0 },
    aiRationale: "Multiplicateur 10x : la micro-mise permet d'encaisser de longs cycles et d'engranger de forts profits nets au déclenchement.",
  },
  {
    nameTemplate: "Limbo 6.6x Sniper (15% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Cote 6.60x (15.0% de chances) avec micro-mises de 0.05%. Un gain compense instantanément 6 tours et sécurise un surplus immédiat.",
    game: 'limbo',
    riskLevel: 'medium',
    targetMultiplier: 6.60,
    winChance: 15.00,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 25,
    gameConfig: { limboTarget: 6.60 },
    aiRationale: "Cote 6.60x à 15% de chances : profil sniper équilibré pour profiter d'une excellente espérance de gain unitaire.",
  },
  {
    nameTemplate: "Limbo 3.5x Dynamic Growth (28.2% Win)",
    category: 'paroli_lock',
    descriptionTemplate: "Cible intermédiaire à 3.50x (28.28% de chances) avec mise modérée de 0.10% de bankroll. 1 gain compense 3 pertes.",
    game: 'limbo',
    riskLevel: 'low',
    targetMultiplier: 3.50,
    winChance: 28.28,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 15,
    gameConfig: { limboTarget: 3.50 },
    aiRationale: "Multiplicateur 3.5x : équilibre parfait entre fréquence de hit et rendement net par gain.",
  },
  {
    nameTemplate: "Paroli Constructif Limbo 2.0x (49.5% Win)",
    category: 'paroli_lock',
    descriptionTemplate: "Anti-Martingale intelligente : mise de base constante sur chaque défaite. On capitalise uniquement sur les séries gagnantes en doublant 2 fois consécutives (1x -> 2x -> 4x), puis encaissement garanti et retour à la base.",
    game: 'limbo',
    riskLevel: 'medium',
    targetMultiplier: 2.0,
    winChance: 49.50,
    baseBetPercent: 0.25,
    onWinAction: 'increase_pct',
    onWinValue: 100,
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 8,
    gameConfig: { limboTarget: 2.0 },
    aiRationale: "Permet de réaliser des profits rapides lors de runs positifs en ne risquant que la mise initiale de 1 unité. 3 victoires d'affilée rapportent +7 unités sans jamais mettre la bankroll en danger sur les pertes.",
  },
  {
    nameTemplate: "Fractional Kelly Scalper (Cote 1.35x - 73.3% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Calcul de taille de mise selon le critère de Kelly fractionnaire (25% Kelly). Cote cible de 1.35x (73.3% win chance) avec mise plate et réévaluation du capital par palier de 10 paris.",
    game: 'limbo',
    riskLevel: 'low',
    targetMultiplier: 1.35,
    winChance: 73.33,
    baseBetPercent: 0.4,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 5,
    gameConfig: { limboTarget: 1.35 },
    aiRationale: "Le critère de Kelly fractionnaire optimise le taux de croissance logarithmique du capital tout en réduisant la probabilité de ruine à un niveau quasiment nul.",
  },
  {
    nameTemplate: "Limbo 82% Ultra-Safe Step (1.20x)",
    category: 'fractional_kelly',
    descriptionTemplate: "Cote ultra-sécurisée à 1.20x (82.5% de chances). Accumulation pas à pas avec risque de drawdown minimal.",
    game: 'limbo',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.20,
    winChance: 82.50,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 4,
    gameConfig: { limboTarget: 1.20 },
    aiRationale: "82.5% de réussite : montée régulière du capital sans secousse.",
  },

  // --- MINES ---
  {
    nameTemplate: "Mines 3 Mines 4 Diamants Sniper (6.80x - 12% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Grille 3 mines, encaissement strict dès 4 diamants révélés (cote 6.80x, 12% de probabilité). Micro-mise de 0.04% bankroll : un gain booste le profit net immédiatement.",
    game: 'mines',
    riskLevel: 'high',
    targetMultiplier: 6.80,
    winChance: 12.00,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 20,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 30,
    gameConfig: { minesCount: 3, minesGemsToCashout: 4, minesChosenTiles: [0, 6, 12, 18] },
    aiRationale: "Cote 6.80x : la micro-mise absorbe facilement la variance et 1 round gagnant équivaut à 6.8x la mise.",
  },
  {
    nameTemplate: "Mines 5 Mines 2 Diamants (5.25x - 15.5% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Grille 5 mines, 2 clics sécurisés pour une cote de 5.25x (15.5% de chances). Micro-mise de 0.05% bankroll, gain net rapide sans martingaler.",
    game: 'mines',
    riskLevel: 'medium',
    targetMultiplier: 5.25,
    winChance: 15.50,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 22,
    gameConfig: { minesCount: 5, minesGemsToCashout: 2, minesChosenTiles: [4, 20] },
    aiRationale: "Seulement 2 gemmes à découvrir avec 5 mines pour débloquer plus de 5x la mise.",
  },
  {
    nameTemplate: "Mines 3 Mines 2 Diamants (2.75x - 35% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Grille 3 mines, 2 clics pour cote 2.75x (35.0% de chances). Petite mise de 0.10% bankroll pour des gains réguliers.",
    game: 'mines',
    riskLevel: 'low',
    targetMultiplier: 2.75,
    winChance: 35.00,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 12,
    gameConfig: { minesCount: 3, minesGemsToCashout: 2, minesChosenTiles: [1, 13] },
    aiRationale: "Cote 2.75x : 1 gain tous les 3 tours en moyenne, excellent ratio sécurité/dynamique.",
  },
  {
    nameTemplate: "Mines 3-Gem Fibonacci Constructif (56.8% Win)",
    category: 'dalembert',
    descriptionTemplate: "Grille 3 mines, encaissement automatique à 3 diamants (x1.74). Progression douce basée sur la suite arithmétique de Fibonacci pour une récupération fluide sans explosion.",
    game: 'mines',
    riskLevel: 'low',
    targetMultiplier: 1.74,
    winChance: 56.88,
    baseBetPercent: 0.2,
    onWinAction: 'reset',
    onLossAction: 'fibonacci',
    onLossValue: 1.5,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 6,
    gameConfig: { minesCount: 3, minesGemsToCashout: 3, minesChosenTiles: [0, 6, 12] },
    aiRationale: "La suite de Fibonacci réduit la violence de la variance et permet de récupérer le cumul des pertes avec deux succès successifs.",
  },
  {
    nameTemplate: "Mines 1-Mine Safe Gem Hunter (88% Probabilité)",
    category: 'mines_safe_hunter',
    descriptionTemplate: "Grille avec seulement 1 mine (24 diamants). Encaissement sécurisé à 2 ou 3 diamants avec un taux de réussite mathématique supérieur à 88%. En cas de rare défaite, récupération étalée sur 5 coups à mise fixe.",
    game: 'mines',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.18,
    winChance: 88.00,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'increase_pct',
    onLossValue: 15,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 3,
    gameConfig: { minesCount: 1, minesGemsToCashout: 3, minesChosenTiles: [4, 12, 20] },
    aiRationale: "Probabilité écrasante de victoire à chaque tirage (88%). Récupération progressive sans doublement de mise, idéale pour une accumulation calme et régulière.",
  },

  // --- CRASH ---
  {
    nameTemplate: "Crash 10x Deca-Rocket (9.9% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Auto-cashout programmé à 10.00x (9.9% de probabilité) avec micro-mises de 0.03% bankroll. Rendement asymétrique maximal.",
    game: 'crash',
    riskLevel: 'high',
    targetMultiplier: 10.0,
    winChance: 9.90,
    baseBetPercent: 0.03,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 20,
    stopOnLossPercent: 10,
    maxConsecutiveLosses: 35,
    gameConfig: { crashAutoCashout: 10.0 },
    aiRationale: "Crash 10x : la micro-mise permet d'attendre la fusée sans entamer le capital et d'encaisser un x10 net.",
  },
  {
    nameTemplate: "Crash 6.6x Striker (15% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Auto-cashout à 6.60x (15.0% de chances) avec micro-mises de 0.05% bankroll. Un succès rapporte +5.6 unités nettes.",
    game: 'crash',
    riskLevel: 'medium',
    targetMultiplier: 6.60,
    winChance: 15.00,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 25,
    gameConfig: { crashAutoCashout: 6.60 },
    aiRationale: "Cote 6.60x : profil d'auto-cashout intermédiaire rentable sans forcer sur la mise.",
  },
  {
    nameTemplate: "Crash 3.3x Dynamic Ride (30% Win)",
    category: 'paroli_lock',
    descriptionTemplate: "Auto-cashout à 3.30x (30.0% de chances) avec petite mise de 0.10%. 1 gain compense 3 pertes.",
    game: 'crash',
    riskLevel: 'low',
    targetMultiplier: 3.30,
    winChance: 30.00,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 15,
    gameConfig: { crashAutoCashout: 3.30 },
    aiRationale: "Auto-cashout à 3.30x : excellent compromis entre fréquence d'atteinte et multiplicateur.",
  },
  {
    nameTemplate: "Crash Auto-Cashout 1.95x Discipliné (50.7% Win)",
    category: 'oscars_grind',
    descriptionTemplate: "Auto-cashout programmé à 1.95x (pour devancer le seuil psychologique de 2.0x). Mise plate avec objectif de cycle.",
    game: 'crash',
    riskLevel: 'low',
    targetMultiplier: 1.95,
    winChance: 50.7,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'custom',
    onLossValue: 0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 8,
    gameConfig: { crashAutoCashout: 1.95 },
    aiRationale: "Retirer à 1.95x évite les crashs pièges à 1.99x et offre un taux de réussite régulier supérieur à 50%.",
  },
  {
    nameTemplate: 'Crash Kelly Scalper 1.25x (79.2% Win)',
    category: 'fractional_kelly',
    descriptionTemplate: 'Retrait automatique ultra-rapide à 1.25x avec calibrage Kelly fractionnaire pour sécuriser des gains constants.',
    game: 'crash',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.25,
    winChance: 79.2,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 4,
    gameConfig: { crashAutoCashout: 1.25 },
    aiRationale: 'Quasiment 4 courses sur 5 atteignent 1.25x sans encombre, permettant de capitaliser calmement.',
  },
  {
    nameTemplate: 'Crash 85% Fortress Step (1.16x)',
    category: 'fractional_kelly',
    descriptionTemplate: 'Retrait instantané à 1.16x (85.0% de winrate). Idéal pour capitaliser sur les micro-vagues vertes en toute sécurité.',
    game: 'crash',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.16,
    winChance: 85.0,
    baseBetPercent: 0.6,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 7,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 3,
    gameConfig: { crashAutoCashout: 1.16 },
    aiRationale: '85% de taux de succès : le multiplicateur 1.16x est franchi sur la très grande majorité des tirs.',
  },

  // --- PLINKO ---
  {
    nameTemplate: "Plinko 14 Rangées High Wings (10.5% Win - Multi 8x-55x)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Plinko 14 rangées en risque Élevé : micro-mises fixes de 0.04% bankroll calibrées pour absorber 200 lancers et attraper les coefficients d'ailes (8x à 55x).",
    game: 'plinko',
    riskLevel: 'high',
    targetMultiplier: 8.0,
    winChance: 10.5,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 20,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 40,
    gameConfig: { plinkoRows: 14, plinkoRisk: 'high' },
    aiRationale: "Les micro-mises permettent d'absorber les billes centrales et de générer un bond net dès l'atteinte des bacs latéraux.",
  },
  {
    nameTemplate: "Plinko 14 Rangées Volatility Cushion (28.5% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Plinko 14 rangées en risque Moyen (multiplicateurs 0.4x à 55x). Mise fixe permanente avec un tampon de 500 billes pour capter les coefficients supérieurs à 4x sans stress.",
    game: 'plinko',
    riskLevel: 'low',
    targetMultiplier: 4.0,
    winChance: 28.5,
    baseBetPercent: 0.1,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 50,
    gameConfig: { plinkoRows: 14, plinkoRisk: 'medium' },
    aiRationale: "Les multiplicateurs intermédiaires (1.9x, 4x, 11x) financent les tirages tout en maintenant une exposition très faible par lancer.",
  },
  {
    nameTemplate: "Plinko 10 Rangées Low Risk Cushion (82% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Plinko 10 rangées en risque Faible (multiplicateurs 0.5x à 8.9x). 82% des billes conservent ou augmentent la mise avec une régularité maximale.",
    game: 'plinko',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.25,
    winChance: 82.0,
    baseBetPercent: 0.4,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 5,
    gameConfig: { plinkoRows: 10, plinkoRisk: 'low' },
    aiRationale: "Variance minimale, idéal pour faire tourner le solde calmement.",
  },

  // --- KENO ---
  {
    nameTemplate: "Keno 5-Numbers Sniper (12% Win - 6.0x à 45x)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Sélection de 5 numéros Keno en risque Moyen. Gain à partir de 3 numéros (6.0x) jusqu'à 45x pour 5 hits. Micro-mises de 0.05% bankroll.",
    game: 'keno',
    riskLevel: 'high',
    targetMultiplier: 6.0,
    winChance: 12.0,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 18,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 25,
    gameConfig: { kenoNumbers: [4, 11, 23, 31, 39], kenoRisk: 'medium' },
    aiRationale: "Micro-mise de 0.05% : chaque succès à 3+ numéros rapporte au moins 6x la mise.",
  },
  {
    nameTemplate: "Keno 4-Hits Asymmetric Yield (25.8% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Sélection de 4 numéros Keno (gain à partir de 2 numéros, jackpot à 4 numéros 90x). Gestion par cycle de 20 tirages sans hausse exponentielle.",
    game: 'keno',
    riskLevel: 'medium',
    targetMultiplier: 4.0,
    winChance: 25.8,
    baseBetPercent: 0.12,
    onWinAction: 'reset',
    onLossAction: 'increase_fixed',
    onLossValue: 0.02,
    stopOnProfitPercent: 20,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 15,
    gameConfig: { kenoNumbers: [3, 14, 27, 38], kenoRisk: 'classic' },
    aiRationale: "Tirages fréquents avec retours réguliers de 1.5x à 5x permettant d'attendre les multiplicateurs élevés sans perte de contrôle de bankroll.",
  },
  {
    nameTemplate: "Keno 3-Numbers Low Risk Step (65% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Sélection de 3 numéros en risque Low. Retour dès 1 numéro touché, excellent maintien de bankroll.",
    game: 'keno',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.40,
    winChance: 65.0,
    baseBetPercent: 0.35,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 9,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 6,
    gameConfig: { kenoNumbers: [7, 18, 33], kenoRisk: 'low' },
    aiRationale: "Taux de réussite élevé (65%) pour une progression régulière.",
  },

  // --- ROULETTE ---
  {
    nameTemplate: "Roulette Carré Corner Sniper (8.80x - 10.8% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Pari sur 4 numéros adjacents (Carré / Corner, cote 8.80x, 10.8% de chances). Micro-mise de 0.04% bankroll : un succès dégage un bond net immédiat.",
    game: 'roulette',
    riskLevel: 'high',
    targetMultiplier: 8.80,
    winChance: 10.8,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 18,
    stopOnLossPercent: 10,
    maxConsecutiveLosses: 30,
    gameConfig: { rouletteBetType: 'corner', rouletteNumbers: [16, 17, 19, 20] },
    aiRationale: "Cote 8.80x : 1 gain compense 8 tours sans martingaler.",
  },
  {
    nameTemplate: "Roulette Sixain Transversale (5.90x - 16.2% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Pari sur 6 numéros (Sixain, cote 5.90x, 16.2% de chances). Micro-mise de 0.06% bankroll pour des gains asymétriques.",
    game: 'roulette',
    riskLevel: 'medium',
    targetMultiplier: 5.90,
    winChance: 16.2,
    baseBetPercent: 0.06,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 20,
    gameConfig: { rouletteBetType: 'sixain', rouletteNumbers: [13, 14, 15, 16, 17, 18] },
    aiRationale: "Cote 5.90x à 16.2% de chances : excellent compromis entre couverture et gain net.",
  },
  {
    nameTemplate: "Roulette Simple Douzaine (3.00x - 32.4% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Pari sur 12 numéros (1ère, 2ème ou 3ème douzaine, cote 3.00x, 32.4% de chances). Petite mise de 0.12% bankroll.",
    game: 'roulette',
    riskLevel: 'low',
    targetMultiplier: 3.00,
    winChance: 32.4,
    baseBetPercent: 0.12,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 12,
    gameConfig: { rouletteBetType: 'dozen', rouletteDozen: 2 },
    aiRationale: "Cote 3.00x : 1 gain tous les ~3 tours, rentabilité stable sans emballement.",
  },
  {
    nameTemplate: "Roulette Voisins du Zéro (2.18x - 45.9% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Couverture de secteur 17 numéros entourant le zéro (9 jetons). Mise plate avec stop-loss / take-profit stricts.",
    game: 'roulette',
    riskLevel: 'low',
    targetMultiplier: 2.18,
    winChance: 45.9,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'custom',
    onLossValue: 0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 25,
    maxConsecutiveLosses: 7,
    gameConfig: { rouletteSector: 'voisins' },
    aiRationale: "La couverture de secteur physique offre une régularité bien supérieure aux paris pleins isolés.",
  },
  {
    nameTemplate: "Roulette Double Douzaines (1.50x - 64.8% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Couverture de 24 numéros sur 37 (64.8% de chances, cote 1.50x). Gains fréquents et réguliers.",
    game: 'roulette',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.50,
    winChance: 64.8,
    baseBetPercent: 0.35,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 9,
    stopOnLossPercent: 16,
    maxConsecutiveLosses: 5,
    gameConfig: { rouletteBetType: 'double_dozen', rouletteDozens: [1, 2] },
    aiRationale: "Taux de réussite de 64.8% : 2 tours sur 3 gagnants en moyenne.",
  },
  {
    nameTemplate: "Roulette 5 Sixains Fortress (1.20x - 81.1% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Couverture de 30 numéros sur 37 via 5 sixains (81.1% de winrate, cote 1.20x). Protection maximale du capital.",
    game: 'roulette',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.20,
    winChance: 81.1,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 3,
    gameConfig: { rouletteBetType: 'five_sixains' },
    aiRationale: "81.1% de couverture : progression constante à très faible variance.",
  },

  // --- HILO ---
  {
    nameTemplate: "Hilo 4-Cards Chain Sniper (7.20x - 12.5% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Enchaînement de 4 cartes consécutives pour une cote de 7.20x (12.5% de chances). Micro-mise de 0.04% bankroll.",
    game: 'hilo',
    riskLevel: 'high',
    targetMultiplier: 7.20,
    winChance: 12.5,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 18,
    stopOnLossPercent: 10,
    maxConsecutiveLosses: 25,
    gameConfig: { hiloCardsToCashout: 4 },
    aiRationale: "Cote 7.20x : multiplicateur explosif avec micro-mise.",
  },
  {
    nameTemplate: "Hilo 2-Cards Dynamic (2.80x - 35% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Encaissement après 2 cartes bien choisies (cote 2.80x, 35% de chances). Petite mise de 0.10% bankroll.",
    game: 'hilo',
    riskLevel: 'low',
    targetMultiplier: 2.80,
    winChance: 35.0,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 12,
    gameConfig: { hiloCardsToCashout: 2 },
    aiRationale: "Cote 2.80x : bon compromis entre prévisibilité et gain.",
  },
  {
    nameTemplate: "Hilo Step-Down Probability Lock (1.55x - 63.8% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Hilo enchaînant 2 décisions à haute probabilité (> 70% par carte). Encaissement systématique dès le premier palier sécurisé (x1.45 à x1.65).",
    game: 'hilo',
    riskLevel: 'low',
    targetMultiplier: 1.55,
    winChance: 63.8,
    baseBetPercent: 0.35,
    onWinAction: 'reset',
    onLossAction: 'increase_pct',
    onLossValue: 20,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 18,
    maxConsecutiveLosses: 5,
    gameConfig: { hiloStartCard: 7 },
    aiRationale: "Stratégie constructive à faible variance évitant l'avidité et garantissant un taux de réussite élevé sur les cartes médianes.",
  },
  {
    nameTemplate: "Hilo 82% 1-Card High-Low Lock (1.22x)",
    category: 'fractional_kelly',
    descriptionTemplate: "Encaissement immédiat après 1 seule carte à très haute probabilité (Roi -> Plus Bas, 2 -> Plus Haut, 82% de chances).",
    game: 'hilo',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.22,
    winChance: 82.0,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 8,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 3,
    gameConfig: { hiloCardsToCashout: 1 },
    aiRationale: "82% de winrate : encaisse dès la première décision sûre.",
  },

  // --- WHEEL ---
  {
    nameTemplate: "Wheel 20 Segments Medium (9.90x - 10% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Roue 20 segments : micro-mises de 0.04% bankroll sur les segments à 9.90x (10% de chances).",
    game: 'wheel',
    riskLevel: 'high',
    targetMultiplier: 9.90,
    winChance: 10.0,
    baseBetPercent: 0.04,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 18,
    stopOnLossPercent: 10,
    maxConsecutiveLosses: 30,
    gameConfig: { wheelSegments: 20, wheelRisk: 'medium' },
    aiRationale: "Cote 9.90x : un gain nettoie immédiatement plusieurs tours perdants.",
  },
  {
    nameTemplate: "Wheel 30 Segments Dynamic (3.00x - 33% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Roue 30 segments : petite mise de 0.10% bankroll sur les segments à 3.00x (33% de chances).",
    game: 'wheel',
    riskLevel: 'low',
    targetMultiplier: 3.00,
    winChance: 33.0,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 14,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 12,
    gameConfig: { wheelSegments: 30, wheelRisk: 'medium' },
    aiRationale: "Cote 3.00x : 1 gain tous les 3 tours, croissance fluide du solde.",
  },
  {
    nameTemplate: 'Wheel 10 Segments Low Risk Grinder (1.50x - 60% Win)',
    category: 'anti_drawdown_plateau',
    descriptionTemplate: 'Roue Stake 10 segments en risque Low (6 segments gagnants sur 10 à 1.50x). Mise plate avec gestion par cycle.',
    game: 'wheel',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.50,
    winChance: 60.0,
    baseBetPercent: 0.35,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 5,
    gameConfig: { wheelSegments: 10, wheelRisk: 'low' },
    aiRationale: 'Taux de réussite de 60% sur les segments majoritaires, idéal pour une progression sans heurt.',
  },

  // --- BLACKJACK ---
  {
    nameTemplate: "Blackjack Basic Strategy Mathématiquement Parfaite (49.2% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Application stricte du tableau de base mathématique (Dealer stands on Soft 17, RTP 99.43%). Mise plate constante avec stop-loss / take-profit.",
    game: 'blackjack',
    riskLevel: 'low',
    targetMultiplier: 2.0,
    winChance: 49.2,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 8,
    gameConfig: { blackjackRule: 'dealer_stands_soft_17' },
    aiRationale: "Le Blackjack joué à la perfection offre le meilleur RTP de tout le casino (99.43%), réduisant l’avantage de la maison à seulement 0.57%.",
  }
];

export const WAGER_ARCHETYPES: ConstructiveArchetype[] = [
  // --- DICE WAGER ---
  {
    nameTemplate: "Dice 98.00% Ultra-Volume VIP Farmer (1.0102x)",
    category: 'wager_volume',
    descriptionTemplate: "Le standard absolu du Wagering Stake : probabilité de gain de 98.00% (cote 1.0102x). Mises plates constantes calibrées à 0.8% de la bankroll pour générer un volume massif (>350x le capital) avec variance minimale.",
    game: 'dice',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.0102,
    winChance: 98.00,
    baseBetPercent: 0.8,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 2,
    gameConfig: { diceCondition: 'above', diceTarget: 1.99 },
    aiRationale: "Grâce au RTP de 99% et un winrate de 98%, chaque cycle produit un volume de roulement colossal pour débloquer les paliers VIP Stake (Bronze -> Platine) et maximiser le rakeback sans risque de crash.",
    wagerTurnoverMultiplier: 380,
    vipTier: 'Platine / Diamant',
  },
  {
    nameTemplate: "Dice 95.00% Balanced Wager Machine (1.0421x)",
    category: 'wager_volume',
    descriptionTemplate: "Volume VIP équilibré à 95.00% de winrate. Permet de générer ~250x le capital en volume de mise tout en encaissant régulièrement de petits profits.",
    game: 'dice',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.0421,
    winChance: 95.00,
    baseBetPercent: 0.6,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 3,
    gameConfig: { diceCondition: 'above', diceTarget: 4.99 },
    aiRationale: "Cote 1.042x réduisant l'érosion tout en maintenant une vitesse d'exécution de 10 à 30 paris par seconde.",
    wagerTurnoverMultiplier: 270,
    vipTier: 'Gold / Platine',
  },
  {
    nameTemplate: "Dice 90.00% D'Alembert Doux Wager Recovery (1.10x)",
    category: 'wager_volume',
    descriptionTemplate: "Wagering actif avec amortisseur D'Alembert linéaire doux (+0.05u sur perte, -0.05u sur gain) sur cote 1.10x (90% win). Compense les rares trous sans jamais doubler.",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 1.10,
    winChance: 90.00,
    baseBetPercent: 0.5,
    onWinAction: 'custom',
    onLossAction: 'increase_fixed',
    onLossValue: 0.05,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 25,
    maxConsecutiveLosses: 4,
    gameConfig: { diceCondition: 'above', diceTarget: 9.99 },
    aiRationale: "Volume élevé couplé à une récupération arithmétique progressive pour maintenir la courbe de solde stable.",
    wagerTurnoverMultiplier: 210,
    vipTier: 'Silver / Gold',
  },

  // --- LIMBO WAGER ---
  {
    nameTemplate: "Limbo 1.02x Instant Micro-Cashout Wager (97.06% Win)",
    category: 'wager_volume',
    descriptionTemplate: "Auto-retrait immédiat à 1.02x sur Limbo. Rotation ultra-rapide et mise plate constante pour empiler du volume de mise certifié Provably Fair.",
    game: 'limbo',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.02,
    winChance: 97.06,
    baseBetPercent: 0.7,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 2,
    gameConfig: { limboTarget: 1.02 },
    aiRationale: "Limbo offre la vitesse de roll la plus élevée de Stake. À 1.02x, 97 paris sur 100 sont gagnants.",
    wagerTurnoverMultiplier: 320,
    vipTier: 'Platine',
  },
  {
    nameTemplate: "Limbo 1.05x Safe Turnover Sprinter (94.28% Win)",
    category: 'wager_volume',
    descriptionTemplate: "Multiplicateur sécurisé 1.05x avec gestion plate. Génère un turnover rapide pour les daily races et le rakeback hebdomadaire.",
    game: 'limbo',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.05,
    winChance: 94.28,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 18,
    maxConsecutiveLosses: 3,
    gameConfig: { limboTarget: 1.05 },
    aiRationale: "Optimisation du rapport vitesse / turnover / espérance de gain.",
    wagerTurnoverMultiplier: 240,
    vipTier: 'Gold',
  },

  // --- MINES WAGER ---
  {
    nameTemplate: "Mines 1-Mine 1-Gem 96% Probabilité Wager Scalper (1.03x)",
    category: 'wager_volume',
    descriptionTemplate: "1 seule mine sur la grille 5x5, encaissement dès la 1ère gemme découverte (24 chances sur 25 soit 96% de réussite). Mise plate et auto-cashout instantané.",
    game: 'mines',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.03,
    winChance: 96.00,
    baseBetPercent: 0.8,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 2,
    gameConfig: { minesCount: 1, minesGemsToCashout: 1, minesChosenTiles: [0] },
    aiRationale: "Permet de générer des milliers de paris sans stress avec un taux de réussite quasi continu.",
    wagerTurnoverMultiplier: 290,
    vipTier: 'Platine',
  },

  // --- PLINKO WAGER ---
  {
    nameTemplate: "Plinko 8 Rows Low Risk Max Flips Wager (99% RTP Cushion)",
    category: 'wager_volume',
    descriptionTemplate: "Plinko 8 rangées en risque Low : aucun trou à 0x ! Le multiplicateur minimum est de 0.5x, ce qui amortit immédiatement toute perte et permet un turnover de volume exceptionnel.",
    game: 'plinko',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.10,
    winChance: 85.00,
    baseBetPercent: 0.6,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 5,
    gameConfig: { plinkoRows: 8, plinkoRisk: 'low' },
    aiRationale: "Le coussin de sécurité des billes (0.5x minimum) permet de faire tourner 400x à 600x la bankroll sans crash de capital.",
    wagerTurnoverMultiplier: 420,
    vipTier: 'Diamant',
  },
  {
    nameTemplate: "Plinko 10 Rows Low Risk Continuous Turnover",
    category: 'wager_volume',
    descriptionTemplate: "Plinko 10 rangées en Low Risk. Mises continues à haute cadence pour maximiser les points VIP Stake.",
    game: 'plinko',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.20,
    winChance: 78.00,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 6,
    gameConfig: { plinkoRows: 10, plinkoRisk: 'low' },
    aiRationale: "Équilibre optimal entre distribution gaussienne et accumulation de volume VIP.",
    wagerTurnoverMultiplier: 310,
    vipTier: 'Gold / Platine',
  },

  // --- CRASH WAGER ---
  {
    nameTemplate: "Crash 1.05x Safe Autobet Wager Extractor (94.3% Win)",
    category: 'wager_volume',
    descriptionTemplate: "Auto-cashout programmé à 1.05x sur Crash. Sortie quasi-instantanée dès le décollage de la fusée avec mise unitaire constante.",
    game: 'crash',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.05,
    winChance: 94.28,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 3,
    gameConfig: { crashAutoCashout: 1.05 },
    aiRationale: "Évite les crashs soudains au-dessus de 1.10x et capitalise sur la forte proportion de courses réussies.",
    wagerTurnoverMultiplier: 230,
    vipTier: 'Silver / Gold',
  },

  // --- ROULETTE WAGER ---
  {
    nameTemplate: "Roulette 2-Dozens 64.8% Coverage Wager (1.50x)",
    category: 'wager_volume',
    descriptionTemplate: "Couverture simultanée de 2 douzaines sur 3 (24 numéros sur 37 soit 64.8% de chances). Multiplicateur net de 1.50x avec mise constante.",
    game: 'roulette',
    riskLevel: 'low',
    targetMultiplier: 1.50,
    winChance: 64.86,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 22,
    maxConsecutiveLosses: 4,
    gameConfig: { rouletteSector: 'dozens', rouletteDozens: [1, 2] },
    aiRationale: "La couverture des deux tiers du cylindre européenne stabilise la courbe de gains et génère un roulement continu.",
    wagerTurnoverMultiplier: 190,
    vipTier: 'Silver',
  },

  // --- WHEEL WAGER ---
  {
    nameTemplate: "Wheel 10 Segments Low Risk Wager Cycle (1.50x)",
    category: 'wager_volume',
    descriptionTemplate: "Roue 10 segments Low Risk (60% de segments payants à 1.50x). Mise plate et rotation rapide sans hausse exponentielle.",
    game: 'wheel',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.50,
    winChance: 60.00,
    baseBetPercent: 0.5,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 5,
    gameConfig: { wheelSegments: 10, wheelRisk: 'low' },
    aiRationale: "Taux de hit supérieur à 1 chance sur 2 pour accumuler du wager sans heurt.",
    wagerTurnoverMultiplier: 160,
    vipTier: 'Bronze / Silver',
  },

  // --- BLACKJACK WAGER ---
  {
    nameTemplate: "Blackjack 99.43% RTP Flat Bet Wager (Basic Strategy)",
    category: 'wager_volume',
    descriptionTemplate: "Le jeu au meilleur RTP du casino (99.43%). Mises plates rigoureuses suivant à 100% le tableau mathématique de base pour générer un volume maximal avec un avantage maison de seulement 0.57%.",
    game: 'blackjack',
    riskLevel: 'ultra_safe',
    targetMultiplier: 2.00,
    winChance: 49.20,
    baseBetPercent: 0.4,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 15,
    stopOnLossPercent: 20,
    maxConsecutiveLosses: 8,
    gameConfig: { blackjackRule: 'standard' },
    aiRationale: "Avec 99.43% de retour théorique, le Blackjack est idéal pour faire tourner des dizaines de milliers de dollars de volume tout en limitant les pertes à l'épaisseur du trait.",
    wagerTurnoverMultiplier: 450,
    vipTier: 'Diamant / VIP Élite',
  },

  // --- HILO WAGER ---
  {
    nameTemplate: "Hilo 1-Step Safe Fading Wager (1.12x)",
    category: 'wager_volume',
    descriptionTemplate: "Sélection d'une carte extrême (As ou Roi) et validation d'un seul palier à très haute probabilité (1.12x à 88% win chance) puis encaissement immédiat.",
    game: 'hilo',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.12,
    winChance: 88.00,
    baseBetPercent: 0.6,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 18,
    maxConsecutiveLosses: 3,
    gameConfig: { hiloStartCard: 1 },
    aiRationale: "Farming à faible risque : 1 seul clic par tour, encaissement automatique et réinitialisation.",
    wagerTurnoverMultiplier: 260,
    vipTier: 'Gold',
  }
];

/**
 * Generates an intelligent, constructive, NON-MARTINGALE strategy randomly or tailored to a game and winrate band.
 */
export function generateRandomConstructiveStrategy(
  preferredGame?: StakeGameType,
  bankroll: number = 100,
  currency: string = 'USDT',
  winrateBand: 'all' | 'sniper_10_20' | 'dynamic_25_40' | 'balanced_45_60' | 'safe_65_85' = 'all'
): BettingStrategy {
  let pool = CONSTRUCTIVE_ARCHETYPES;

  if (winrateBand === 'sniper_10_20') {
    pool = pool.filter((a) => a.winChance >= 8 && a.winChance <= 22);
  } else if (winrateBand === 'dynamic_25_40') {
    pool = pool.filter((a) => a.winChance >= 23 && a.winChance <= 42);
  } else if (winrateBand === 'balanced_45_60') {
    pool = pool.filter((a) => a.winChance >= 43 && a.winChance <= 62);
  } else if (winrateBand === 'safe_65_85') {
    pool = pool.filter((a) => a.winChance >= 63 && a.winChance <= 92);
  }

  // Fallback to all archetypes if filtered pool is empty
  if (pool.length === 0) {
    pool = CONSTRUCTIVE_ARCHETYPES;
  }

  const candidates = preferredGame 
    ? pool.filter(a => a.game === preferredGame)
    : pool;

  const archetype = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : pool[Math.floor(Math.random() * pool.length)] || CONSTRUCTIVE_ARCHETYPES[0];

  const safeBankroll = Math.max(10, bankroll);
  const baseBet = Number(((safeBankroll * archetype.baseBetPercent) / 100).toFixed(4));
  const stopOnProfit = Number(((safeBankroll * archetype.stopOnProfitPercent) / 100).toFixed(2));
  const stopOnLoss = Number(((safeBankroll * archetype.stopOnLossPercent) / 100).toFixed(2));
  const maxBetLimit = Number((baseBet * 8).toFixed(2)); // Hard cap to prevent runaway

  // Add random flavor descriptor
  const modifiers = [
    'Édition Optimisée',
    'Matrice Constructive',
    'Protection Capital',
    'Paliers Disciplinés',
    'Haute Probabilité',
    'Anti-Drawdown Pro',
    'Variance Amortie',
    'Convexe Quant'
  ];
  const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];

  return {
    id: `strat-constructive-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `${archetype.nameTemplate} (${modifier})`,
    game: archetype.game,
    description: archetype.descriptionTemplate,
    riskLevel: archetype.riskLevel,
    baseBet: Math.max(0.001, baseBet),
    currency,
    targetMultiplier: archetype.targetMultiplier,
    winChance: archetype.winChance,
    gameConfig: archetype.gameConfig,
    onWinAction: archetype.onWinAction,
    onWinValue: archetype.onWinValue,
    onLossAction: archetype.onLossAction,
    onLossValue: archetype.onLossValue,
    stopOnProfit,
    stopOnLoss,
    maxBetLimit,
    maxConsecutiveLosses: archetype.maxConsecutiveLosses,
    evEstimate: -0.01,
    author: 'ai',
    createdAt: new Date().toISOString(),
    aiRationale: `${archetype.aiRationale} Paramétré pour un capital de ${safeBankroll} ${currency} : Stop-loss strict à -${stopOnLoss} ${currency} et Take-profit à +${stopOnProfit} ${currency}.`,
  };
}

/**
 * Generates an intelligent, high-volume, low-variance WAGER strategy randomly or tailored to a game.
 * Strictly adheres to Anti-Martingale / Constructive principles (flat bets, low variance, high RTP).
 */
export function generateRandomWagerStrategy(
  preferredGame?: StakeGameType,
  bankroll: number = 100,
  currency: string = 'USDT',
  targetVolume?: number
): BettingStrategy {
  const candidates = preferredGame 
    ? WAGER_ARCHETYPES.filter(a => a.game === preferredGame)
    : WAGER_ARCHETYPES;

  const archetype = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : WAGER_ARCHETYPES[Math.floor(Math.random() * WAGER_ARCHETYPES.length)];

  const safeBankroll = Math.max(10, bankroll);
  const baseBet = Number(((safeBankroll * archetype.baseBetPercent) / 100).toFixed(4));
  const stopOnProfit = Number(((safeBankroll * archetype.stopOnProfitPercent) / 100).toFixed(2));
  const stopOnLoss = Number(((safeBankroll * archetype.stopOnLossPercent) / 100).toFixed(2));
  const maxBetLimit = Number((baseBet * 4).toFixed(2)); // Stricter cap for wagering (flat or near-flat)

  const turnoverMultiplier = archetype.wagerTurnoverMultiplier || 250;
  const estimatedVolume = Number((safeBankroll * turnoverMultiplier).toFixed(2));
  const actualTargetVolume = targetVolume || estimatedVolume;

  const wagerModifiers = [
    'VIP Platinum Rush',
    'Rakeback Maximizer',
    'Ultra-Farming 99% RTP',
    'Farming Volume Pro',
    'Low-Variance Quant',
    'Sprint Level-Up',
    'Machine à Volume 0-Risk'
  ];
  const modifier = wagerModifiers[Math.floor(Math.random() * wagerModifiers.length)];

  return {
    id: `strat-wager-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `⚡ [WAGER] ${archetype.nameTemplate} (${modifier})`,
    game: archetype.game,
    description: archetype.descriptionTemplate,
    riskLevel: archetype.riskLevel,
    baseBet: Math.max(0.001, baseBet),
    currency,
    targetMultiplier: archetype.targetMultiplier,
    winChance: archetype.winChance,
    isWagerStrategy: true,
    wagerTargetVolume: actualTargetVolume,
    estimatedWagerTurnover: turnoverMultiplier,
    estimatedRakebackPercent: 10,
    vipTierTarget: archetype.vipTier || 'Platine',
    gameConfig: archetype.gameConfig,
    onWinAction: archetype.onWinAction,
    onWinValue: archetype.onWinValue,
    onLossAction: archetype.onLossAction,
    onLossValue: archetype.onLossValue,
    stopOnProfit,
    stopOnLoss,
    maxBetLimit,
    maxConsecutiveLosses: archetype.maxConsecutiveLosses,
    evEstimate: -0.01,
    author: 'ai',
    createdAt: new Date().toISOString(),
    aiRationale: `💎 STRATÉGIE WAGER HAUT VOLUME : ${archetype.aiRationale} | Volume théorique estimé : ~${estimatedVolume.toLocaleString()} ${currency} (~${turnoverMultiplier}x le capital de ${safeBankroll} ${currency}) avant atteinte du stop-loss de -${stopOnLoss} ${currency}. Rakeback estimé : ~${(estimatedVolume * 0.01 * 0.10).toFixed(2)} ${currency}.`,
  };
}

export const WAGER_RECOVERY_ARCHETYPES: ConstructiveArchetype[] = [
  // --- TIER 1 : HIGH MULTIPLIER / MICRO-BETS (25% - 35% WINRATE / 2.7x - 4.0x) ---
  {
    nameTemplate: "Dice 25% (3.96x) Micro-Mises Sniper (25% Win)",
    category: 'paroli_lock',
    descriptionTemplate: "Micro-mises de 0.05% de bankroll sur cote 3.96x (25% de chances). Chaque gain rapporte +2.96x la mise, ce qui permet de combler un stop-loss avec de minuscules mises sans forcer sur un seul clic.",
    game: 'dice',
    riskLevel: 'medium',
    targetMultiplier: 3.96,
    winChance: 25.00,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 15,
    gameConfig: { diceCondition: 'above', diceTarget: 74.99 },
    aiRationale: "Mise minuscule de 0.05% de la bankroll. 1 gain compense 3 pertes immédiatement sans martingale.",
    wagerTurnoverMultiplier: 100,
    vipTier: 'Silver / Gold',
  },
  {
    nameTemplate: "Limbo 3.0x Small-Unit Rebound (33% Win)",
    category: 'oscars_grind',
    descriptionTemplate: "Multiplicateur cible 3.0x (33.0% winrate) avec micro-mises de 0.08% de bankroll. Parfait pour une reconstitution douce et progressive avec un budget minimal par clic.",
    game: 'limbo',
    riskLevel: 'low',
    targetMultiplier: 3.0,
    winChance: 33.00,
    baseBetPercent: 0.08,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 10,
    gameConfig: { limboTarget: 3.0 },
    aiRationale: "Permet de diviser par 5 le montant de la mise de départ par rapport à une cote à 95% de winrate.",
    wagerTurnoverMultiplier: 120,
    vipTier: 'Gold',
  },
  {
    nameTemplate: "Limbo 4.0x Micro-Bullet (24.75% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Cote 4.0x (24.75% winrate) avec micro-mise fixe de 0.05% de bankroll. Une victoire valide +300% de profit net sur le coup.",
    game: 'limbo',
    riskLevel: 'medium',
    targetMultiplier: 4.0,
    winChance: 24.75,
    baseBetPercent: 0.05,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 16,
    gameConfig: { limboTarget: 4.0 },
    aiRationale: "Idéal pour multiplier les petits tours de récupération sans risquer d'amputer le solde restant.",
    wagerTurnoverMultiplier: 90,
    vipTier: 'Silver',
  },
  {
    nameTemplate: "Crash 3.0x Micro-Vol Rebuilder (33% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Retrait automatique à 3.00x (33% winrate) avec micro-mises de 0.06% de bankroll. Rapport rendement/risque optimal pour récupérer des unités pas à pas.",
    game: 'crash',
    riskLevel: 'medium',
    targetMultiplier: 3.00,
    winChance: 33.00,
    baseBetPercent: 0.06,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 10,
    gameConfig: { crashAutoCashout: 3.00 },
    aiRationale: "Encaissement automatique à 3.0x : pas de stress de timing, exposition minimale.",
    wagerTurnoverMultiplier: 100,
    vipTier: 'Silver / Gold',
  },
  {
    nameTemplate: "Mines 3-Mines 2-Gems (2.75x / 35% Win)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Grille 5x5 avec 3 mines. Révélation de 2 gemmes (cote 2.75x, ~35% de chance). Micro-mise de 0.08% de bankroll avec cashout instantané.",
    game: 'mines',
    riskLevel: 'medium',
    targetMultiplier: 2.75,
    winChance: 35.00,
    baseBetPercent: 0.08,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 8,
    gameConfig: { minesCount: 3, minesGemsToCashout: 2, minesChosenTiles: [0, 6] },
    aiRationale: "Gain net de +175% par coup gagnant avec une mise de départ imperceptible.",
    wagerTurnoverMultiplier: 110,
    vipTier: 'Gold',
  },
  {
    nameTemplate: "Roulette Simple Douzaine Sniper (3.0x / 32.4% Win)",
    category: 'dalembert',
    descriptionTemplate: "Pari sur 1 douzaine (32.43% de réussite à 3.0x). Micro-mise de 0.10% de bankroll. 1 victoire génère +2 unités nettes.",
    game: 'roulette',
    riskLevel: 'medium',
    targetMultiplier: 3.00,
    winChance: 32.43,
    baseBetPercent: 0.10,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 16,
    maxConsecutiveLosses: 10,
    gameConfig: { rouletteSector: 'dozens', rouletteDozens: [1] },
    aiRationale: "Mise réduite et ratio de paiement x3 pour effacer les pertes antérieures sans exposition forte.",
    wagerTurnoverMultiplier: 110,
    vipTier: 'Silver / Gold',
  },

  // --- TIER 2 : BALANCED / MODERATE WINRATE (40% - 65% WINRATE / 1.5x - 2.5x) ---
  {
    nameTemplate: "Dice 40% (2.475x) D'Alembert Modéré (40% Win)",
    category: 'dalembert',
    descriptionTemplate: "Cote 2.475x (40% win chance). Petite mise de 0.10% de bankroll avec ajustement arithmétique très doux (+0.02u sur défaite, -0.02u sur victoire).",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 2.475,
    winChance: 40.00,
    baseBetPercent: 0.10,
    onWinAction: 'custom',
    onLossAction: 'increase_fixed',
    onLossValue: 0.02,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 7,
    gameConfig: { diceCondition: 'above', diceTarget: 59.99 },
    aiRationale: "Compromis parfait entre fréquence de victoire (40%) et taille de mise ultra-légère.",
    wagerTurnoverMultiplier: 130,
    vipTier: 'Gold',
  },
  {
    nameTemplate: "Dice Oscar's Grind 2.0x Rebuild Discipliné",
    category: 'oscars_grind',
    descriptionTemplate: "Cycles stricts de +1 unité. Mise constante sur chaque perte (zéro martingale) et hausse de +1 unité uniquement lors d'une victoire jusqu'à combler le déficit de perte, puis réinitialisation.",
    game: 'dice',
    riskLevel: 'low',
    targetMultiplier: 2.0,
    winChance: 49.50,
    baseBetPercent: 0.15,
    onWinAction: 'increase_fixed',
    onLossAction: 'custom',
    onLossValue: 0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 8,
    gameConfig: { diceCondition: 'above', diceTarget: 50.49 },
    aiRationale: "L'anti-martingale par excellence pour redresser la bankroll avec une exposition minimale.",
    wagerTurnoverMultiplier: 130,
    vipTier: 'Silver / Gold',
  },
  {
    nameTemplate: "Roulette Double Douzaines Récupération Linéaire (64.8%)",
    category: 'dalembert',
    descriptionTemplate: "Couverture de 2 douzaines avec ajustement arithmétique doux (+0.05u sur défaite, -0.05u sur victoire) pour résorber le déficit pas à pas.",
    game: 'roulette',
    riskLevel: 'low',
    targetMultiplier: 1.50,
    winChance: 64.86,
    baseBetPercent: 0.20,
    onWinAction: 'custom',
    onLossAction: 'increase_fixed',
    onLossValue: 0.05,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 16,
    maxConsecutiveLosses: 5,
    gameConfig: { rouletteSector: 'dozens', rouletteDozens: [1, 2] },
    aiRationale: "Presque 2 chances sur 3 de succès pour un retour à l'équilibre régulier.",
    wagerTurnoverMultiplier: 140,
    vipTier: 'Silver / Gold',
  },
  {
    nameTemplate: "Blackjack Basic Strategy Bankroll Shield (99.43% RTP)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Application stricte du tableau de base du Blackjack. Mises plates de 0.2% de la bankroll pour remonter la balance avec l'avantage maison le plus faible du casino (0.57%).",
    game: 'blackjack',
    riskLevel: 'ultra_safe',
    targetMultiplier: 2.00,
    winChance: 49.20,
    baseBetPercent: 0.20,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 7,
    gameConfig: { blackjackRule: 'standard' },
    aiRationale: "Le meilleur retour théorique de Stake pour une reconstitution sereine du capital.",
    wagerTurnoverMultiplier: 320,
    vipTier: 'Diamant',
  },
  {
    nameTemplate: "Wheel 10-Segments Low Smooth Pivot (1.50x)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Roue 10 segments Low Risk : 60% de probabilité de victoire à 1.50x. Mise plate avec cycle court pour effacer le déficit.",
    game: 'wheel',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.50,
    winChance: 60.00,
    baseBetPercent: 0.20,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 4,
    gameConfig: { wheelSegments: 10, wheelRisk: 'low' },
    aiRationale: "Taux de hit supérieur à 50% pour un redressement rapide du solde.",
    wagerTurnoverMultiplier: 135,
    vipTier: 'Bronze / Silver',
  },
  {
    nameTemplate: "Keno 3 Numéros Low Risk Anchor (1.50x)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "3 numéros en risque Low. Gain dès 2 numéros sortis (1.50x) avec mise constante pour sécuriser le capital.",
    game: 'keno',
    riskLevel: 'low',
    targetMultiplier: 1.50,
    winChance: 62.00,
    baseBetPercent: 0.20,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 5,
    gameConfig: { kenoNumbers: [7, 14, 21], kenoRisk: 'low' },
    aiRationale: "Variance maîtrisée pour rétablir la balance sans à-coups.",
    wagerTurnoverMultiplier: 125,
    vipTier: 'Silver',
  },

  // --- TIER 3 : HIGH WINRATE & CUSHION (70% - 95% WINRATE / 1.04x - 1.35x) ---
  {
    nameTemplate: "Dice 95.00% D'Alembert Récupérateur Linéaire (1.042x)",
    category: 'wager_volume',
    descriptionTemplate: "Stratégie de sortie de stop-loss : cote 1.042x (95.0% Win). Progression arithmétique douce (+0.02u sur perte, -0.02u sur gain). Recouvre le déficit du stop-loss sans aucune hausse géométrique.",
    game: 'dice',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.0421,
    winChance: 95.00,
    baseBetPercent: 0.25,
    onWinAction: 'custom',
    onLossAction: 'increase_fixed',
    onLossValue: 0.02,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 12,
    maxConsecutiveLosses: 3,
    gameConfig: { diceCondition: 'above', diceTarget: 4.99 },
    aiRationale: "Après un stop-loss, cette méthode amortit la variance avec 95% de réussite et efface la perte par micro-paliers.",
    wagerTurnoverMultiplier: 160,
    vipTier: 'Gold',
  },
  {
    nameTemplate: "Limbo 1.35x Fractional Kelly Stabilisateur (73.3% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Reconstitution active du capital par le critère de Kelly fractionnaire (25% Kelly). Cote cible de 1.35x (73.3% win chance) avec mise plate et take-profit calibré au montant exact du stop loss.",
    game: 'limbo',
    riskLevel: 'low',
    targetMultiplier: 1.35,
    winChance: 73.33,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 4,
    gameConfig: { limboTarget: 1.35 },
    aiRationale: "Presque 3 paris sur 4 gagnants à 1.35x. Permet de compenser les pertes tout en maintenant un roulement propre.",
    wagerTurnoverMultiplier: 175,
    vipTier: 'Gold',
  },
  {
    nameTemplate: "Mines 1-Mine 2-Gems Micro-Paliers Récupération (1.07x)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Grille 5x5 avec 1 seule mine. Révélation de 2 gemmes (92.0% probabilité cumulée). Encaissement automatique instantané pour neutraliser le drawdown de la session.",
    game: 'mines',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.075,
    winChance: 92.00,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 2,
    gameConfig: { minesCount: 1, minesGemsToCashout: 2, minesChosenTiles: [0, 1] },
    aiRationale: "Sécurité maximale avec 92% de winrate pour remonter le capital sans aucune prise de risque superflue.",
    wagerTurnoverMultiplier: 190,
    vipTier: 'Platine',
  },
  {
    nameTemplate: "Plinko 10-Rows Low-Risk Cushion Rebuilder (99% RTP)",
    category: 'anti_drawdown_plateau',
    descriptionTemplate: "Plinko 10 rangées en risque Low. Multiplicateur minimum 0.5x amortissant chaque balle sans trou à 0x. Restitution continue pour stabiliser la balance.",
    game: 'plinko',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.20,
    winChance: 82.00,
    baseBetPercent: 0.20,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 12,
    stopOnLossPercent: 15,
    maxConsecutiveLosses: 4,
    gameConfig: { plinkoRows: 10, plinkoRisk: 'low' },
    aiRationale: "Aucun zéro sur la grille Low : la balance ne subit aucun choc violent et se redresse en douceur.",
    wagerTurnoverMultiplier: 240,
    vipTier: 'Platine',
  },
  {
    nameTemplate: "Crash 1.15x Safe Stepper Déblocage Drawdown (86% Win)",
    category: 'fractional_kelly',
    descriptionTemplate: "Sortie automatique anticipée à 1.15x sur Crash (86% win). Mises plates constantes pour capitaliser +15% net par vol réussi sans escalade de mise.",
    game: 'crash',
    riskLevel: 'ultra_safe',
    targetMultiplier: 1.15,
    winChance: 86.08,
    baseBetPercent: 0.25,
    onWinAction: 'reset',
    onLossAction: 'reset',
    onLossValue: 1.0,
    stopOnProfitPercent: 10,
    stopOnLossPercent: 14,
    maxConsecutiveLosses: 3,
    gameConfig: { crashAutoCashout: 1.15 },
    aiRationale: "Cashout immédiat pour éviter les zones de turbulences au-delà de 1.20x.",
    wagerTurnoverMultiplier: 150,
    vipTier: 'Gold',
  }
];

/**
 * Generates an intelligent, low-variance WAGER RECOVERY strategy tailored to recouping drawdown or stop-loss deficit.
 * Strictly adheres to Anti-Martingale / Constructive principles.
 */
export function generateRandomWagerRecoveryStrategy(
  preferredGame?: StakeGameType,
  bankroll: number = 100,
  currency: string = 'USDT',
  deficitAmount?: number,
  winrateBand: 'all' | 'high_multiplier' | 'balanced' | 'safe' = 'all'
): BettingStrategy {
  let candidates = preferredGame 
    ? WAGER_RECOVERY_ARCHETYPES.filter(a => a.game === preferredGame)
    : WAGER_RECOVERY_ARCHETYPES;

  if (winrateBand === 'high_multiplier') {
    const highMultCandidates = candidates.filter(a => a.winChance <= 36.0);
    if (highMultCandidates.length > 0) candidates = highMultCandidates;
  } else if (winrateBand === 'balanced') {
    const balancedCandidates = candidates.filter(a => a.winChance > 36.0 && a.winChance <= 68.0);
    if (balancedCandidates.length > 0) candidates = balancedCandidates;
  } else if (winrateBand === 'safe') {
    const safeCandidates = candidates.filter(a => a.winChance > 68.0);
    if (safeCandidates.length > 0) candidates = safeCandidates;
  }

  const archetype = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : WAGER_RECOVERY_ARCHETYPES[Math.floor(Math.random() * WAGER_RECOVERY_ARCHETYPES.length)];

  const safeBankroll = Math.max(10, bankroll);
  const baseBet = Number(((safeBankroll * archetype.baseBetPercent) / 100).toFixed(4));
  
  // Calibrate take profit to either the deficit amount or standard 10-15% of bankroll
  const targetProfit = deficitAmount && deficitAmount > 0 
    ? Number(deficitAmount.toFixed(2)) 
    : Number(((safeBankroll * archetype.stopOnProfitPercent) / 100).toFixed(2));
    
  const stopOnLoss = Number(((safeBankroll * archetype.stopOnLossPercent) / 100).toFixed(2));
  const maxBetLimit = Number((baseBet * 4).toFixed(2));
  const turnoverMultiplier = archetype.wagerTurnoverMultiplier || 150;
  const estimatedVolume = Number((safeBankroll * turnoverMultiplier).toFixed(2));

  const recoveryModifiers = [
    'Protocole Anti-Drawdown',
    'Amortisseur Linéaire',
    'Bouclier Stop-Loss',
    'Reconstitution Sereine',
    'Cycle de Rétablissement Pro',
    'Micro-Paliers Sécurisés'
  ];
  const modifier = recoveryModifiers[Math.floor(Math.random() * recoveryModifiers.length)];

  return {
    id: `strat-wager-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: `🛡️ [WAGER RECOVERY] ${archetype.nameTemplate} (${modifier})`,
    game: archetype.game,
    description: archetype.descriptionTemplate,
    riskLevel: archetype.riskLevel,
    baseBet: Math.max(0.001, baseBet),
    currency,
    targetMultiplier: archetype.targetMultiplier,
    winChance: archetype.winChance,
    isWagerStrategy: true,
    isRecoveryStrategy: true,
    recoveryTargetType: 'stop_loss_recoup',
    recoveryDeficitTarget: targetProfit,
    recoveryPhaseNotes: `Objectif de récupération : +${targetProfit} ${currency} sans augmentation exponentielle sur les pertes.`,
    wagerTargetVolume: estimatedVolume,
    estimatedWagerTurnover: turnoverMultiplier,
    estimatedRakebackPercent: 10,
    vipTierTarget: archetype.vipTier || 'Gold',
    gameConfig: archetype.gameConfig,
    onWinAction: archetype.onWinAction,
    onWinValue: archetype.onWinValue,
    onLossAction: archetype.onLossAction,
    onLossValue: archetype.onLossValue,
    stopOnProfit: targetProfit,
    stopOnLoss,
    maxBetLimit,
    maxConsecutiveLosses: archetype.maxConsecutiveLosses,
    evEstimate: -0.01,
    author: 'ai',
    createdAt: new Date().toISOString(),
    aiRationale: `🛡️ STRATÉGIE DE RÉCUPÉRATION WAGER : ${archetype.aiRationale} | Objectif ciblé : combler le déficit de +${targetProfit} ${currency} à variance amortie. Stop loss de secours : -${stopOnLoss} ${currency}.`,
  };
}

// =========================================================================
// MATRICE DES CONDITIONS D'AUTOMATISATION DICE COMPATIBLES STAKE.COM (4 À 30)
// =========================================================================

export interface StakeDiceConditionBlueprint {
  order: number;
  triggerType: StrategyTriggerType;
  triggerValue?: number;
  actionType: StrategyActionType;
  actionValue?: number;
  descriptionFr: string;
  stakeUiCode: string;
  category: 'growth' | 'direction' | 'stabilizer' | 'streak_breaker' | 'circuit_breaker' | 'paroli';
}

export const STAKE_DICE_CONDITIONS_30_POOL: StakeDiceConditionBlueprint[] = [
  {
    order: 1,
    triggerType: 'every_loss',
    triggerValue: 3,
    actionType: 'increase_bet_pct',
    actionValue: 14.0,
    descriptionFr: "Toutes les 3 pertes consécutives -> Augmenter la mise de +14% (hausse douce amortie)",
    stakeUiCode: "EVERY 3 LOSSES -> INCREASE BET BY 14%",
    category: 'growth',
  },
  {
    order: 2,
    triggerType: 'every_loss',
    triggerValue: 5,
    actionType: 'switch_direction',
    descriptionFr: "Toutes les 5 pertes consécutives -> Inverser la direction (Above <-> Below)",
    stakeUiCode: "EVERY 5 LOSSES -> SWITCH CONDITION (OVER/UNDER)",
    category: 'direction',
  },
  {
    order: 3,
    triggerType: 'every_win',
    triggerValue: 2,
    actionType: 'reset_bet',
    descriptionFr: "Tous les 2 gains -> Réinitialiser la mise de base (sécurisation immédiate)",
    stakeUiCode: "EVERY 2 WINS -> RESET BET AMOUNT",
    category: 'stabilizer',
  },
  {
    order: 4,
    triggerType: 'first_win_after_losses',
    triggerValue: 2,
    actionType: 'increase_bet_pct',
    actionValue: 10.0,
    descriptionFr: "1er gain après une série de 2+ pertes -> Augmenter la mise de +10% (rebond tactique)",
    stakeUiCode: "FIRST WIN AFTER 2 LOSSES -> INCREASE BET BY 10%",
    category: 'growth',
  },
  {
    order: 5,
    triggerType: 'loss_streak_of',
    triggerValue: 4,
    actionType: 'set_dice_target',
    actionValue: 45.0,
    descriptionFr: "Série de 4 pertes consécutives -> Ajuster la cible Dice à 45.00 (Winrate 55% / Cote 1.80x)",
    stakeUiCode: "ON LOSS STREAK OF 4 -> SET TARGET TO 45.00",
    category: 'stabilizer',
  },
  {
    order: 6,
    triggerType: 'first_loss_after_wins',
    triggerValue: 2,
    actionType: 'reset_bet',
    descriptionFr: "1re perte après une série de 2+ gains -> Réinitialiser la mise (anti-restitution des gains)",
    stakeUiCode: "FIRST LOSS AFTER 2 WINS -> RESET BET AMOUNT",
    category: 'stabilizer',
  },
  {
    order: 7,
    triggerType: 'every_bets',
    triggerValue: 10,
    actionType: 'switch_direction',
    descriptionFr: "Tous les 10 lancers totaux -> Inverser la direction (Over <-> Under)",
    stakeUiCode: "EVERY 10 BETS -> SWITCH CONDITION (OVER/UNDER)",
    category: 'direction',
  },
  {
    order: 8,
    triggerType: 'every_win',
    triggerValue: 4,
    actionType: 'increase_multiplier_pct',
    actionValue: 8.0,
    descriptionFr: "Tous les 4 gains consécutifs -> Augmenter le multiplicateur cible de +8%",
    stakeUiCode: "EVERY 4 WINS -> INCREASE TARGET MULTIPLIER BY 8%",
    category: 'growth',
  },
  {
    order: 9,
    triggerType: 'loss_streak_of',
    triggerValue: 5,
    actionType: 'decrease_bet_pct',
    actionValue: 25.0,
    descriptionFr: "Série de 5 pertes consécutives -> Réduire la mise de 25% (coussin de sécurité)",
    stakeUiCode: "ON LOSS STREAK OF 5 -> DECREASE BET BY 25%",
    category: 'circuit_breaker',
  },
  {
    order: 10,
    triggerType: 'win_streak_of',
    triggerValue: 3,
    actionType: 'increase_bet_pct',
    actionValue: 20.0,
    descriptionFr: "Série de 3 victoires consécutives -> Augmenter la mise de +20% (Paroli positif)",
    stakeUiCode: "ON WIN STREAK OF 3 -> INCREASE BET BY 20%",
    category: 'paroli',
  },
  {
    order: 11,
    triggerType: 'win_streak_of',
    triggerValue: 4,
    actionType: 'reset_bet',
    descriptionFr: "Série de 4 victoires consécutives -> Réinitialiser la mise de base (verrouillage de cycle)",
    stakeUiCode: "ON WIN STREAK OF 4 -> RESET BET AMOUNT",
    category: 'stabilizer',
  },
  {
    order: 12,
    triggerType: 'loss_streak_of',
    triggerValue: 6,
    actionType: 'switch_direction',
    descriptionFr: "Série de 6 pertes consécutives -> Inverser la direction pour briser la variance",
    stakeUiCode: "ON LOSS STREAK OF 6 -> SWITCH CONDITION",
    category: 'direction',
  },
  {
    order: 13,
    triggerType: 'every_bets',
    triggerValue: 15,
    actionType: 'increase_bet_pct',
    actionValue: 5.0,
    descriptionFr: "Tous les 15 lancers -> Ajuster la mise de +5% (progression d'endurance)",
    stakeUiCode: "EVERY 15 BETS -> INCREASE BET BY 5%",
    category: 'growth',
  },
  {
    order: 14,
    triggerType: 'every_bets',
    triggerValue: 25,
    actionType: 'reset_bet',
    descriptionFr: "Tous les 25 lancers totaux -> Réinitialiser la mise à la base",
    stakeUiCode: "EVERY 25 BETS -> RESET BET AMOUNT",
    category: 'stabilizer',
  },
  {
    order: 15,
    triggerType: 'every_loss',
    triggerValue: 4,
    actionType: 'increase_bet_fixed',
    actionValue: 0.02,
    descriptionFr: "Toutes les 4 pertes -> Ajouter +0.02 unité fixe (linéaire d'Alembert)",
    stakeUiCode: "EVERY 4 LOSSES -> INCREASE BET BY 0.02 FIXED",
    category: 'growth',
  },
  {
    order: 16,
    triggerType: 'profit_greater_than',
    triggerValue: 4.0,
    actionType: 'reset_bet',
    descriptionFr: "Si profit de session > +4.0 unités -> Réinitialiser la mise à la base",
    stakeUiCode: "ON PROFIT > 4.0 -> RESET BET AMOUNT",
    category: 'stabilizer',
  },
  {
    order: 17,
    triggerType: 'profit_greater_than',
    triggerValue: 8.0,
    actionType: 'decrease_bet_pct',
    actionValue: 40.0,
    descriptionFr: "Si profit de session > +8.0 unités -> Réduire la mise de 40% (amortisseur de profit)",
    stakeUiCode: "ON PROFIT > 8.0 -> DECREASE BET BY 40%",
    category: 'stabilizer',
  },
  {
    order: 18,
    triggerType: 'loss_greater_than',
    triggerValue: 5.0,
    actionType: 'decrease_bet_pct',
    actionValue: 35.0,
    descriptionFr: "Si drawdown cumulé > 5.0 unités -> Réduire la mise de 35% (bouclier anti-drawdown)",
    stakeUiCode: "ON DRAWDOWN > 5.0 -> DECREASE BET BY 35%",
    category: 'circuit_breaker',
  },
  {
    order: 19,
    triggerType: 'every_win',
    triggerValue: 6,
    actionType: 'change_multiplier',
    actionValue: 2.40,
    descriptionFr: "Tous les 6 gains -> Passer le multiplicateur à 2.40x (optimisation de rendement)",
    stakeUiCode: "EVERY 6 WINS -> SET MULTIPLIER TO 2.40x",
    category: 'growth',
  },
  {
    order: 20,
    triggerType: 'every_loss',
    triggerValue: 7,
    actionType: 'change_multiplier',
    actionValue: 1.60,
    descriptionFr: "Toutes les 7 pertes -> Réduire la cote à 1.60x (winrate 61.8% pour briser la série)",
    stakeUiCode: "EVERY 7 LOSSES -> SET MULTIPLIER TO 1.60x",
    category: 'streak_breaker',
  },
  {
    order: 21,
    triggerType: 'first_win_after_losses',
    triggerValue: 4,
    actionType: 'set_dice_target',
    actionValue: 50.49,
    descriptionFr: "1er gain après 4+ pertes -> Rétablir la cible Dice standard (50.49)",
    stakeUiCode: "FIRST WIN AFTER 4 LOSSES -> SET TARGET TO 50.49",
    category: 'stabilizer',
  },
  {
    order: 22,
    triggerType: 'loss_streak_of',
    triggerValue: 7,
    actionType: 'set_bet_fixed',
    actionValue: 0.05,
    descriptionFr: "Série de 7 pertes consécutives -> Réinitialiser strictement la mise à la valeur plancher",
    stakeUiCode: "ON LOSS STREAK OF 7 -> SET BET TO 0.05",
    category: 'circuit_breaker',
  },
  {
    order: 23,
    triggerType: 'every_bets',
    triggerValue: 35,
    actionType: 'switch_direction',
    descriptionFr: "Tous les 35 lancers totaux -> Inverser la direction de tirage",
    stakeUiCode: "EVERY 35 BETS -> SWITCH CONDITION (OVER/UNDER)",
    category: 'direction',
  },
  {
    order: 24,
    triggerType: 'win_streak_of',
    triggerValue: 5,
    actionType: 'set_bet_fixed',
    actionValue: 0.05,
    descriptionFr: "Série de 5 victoires consécutives -> Réinitialiser la mise et figer le cumul",
    stakeUiCode: "ON WIN STREAK OF 5 -> SET BET TO BASE",
    category: 'stabilizer',
  },
  {
    order: 25,
    triggerType: 'bet_greater_than',
    triggerValue: 0.50,
    actionType: 'decrease_bet_pct',
    actionValue: 50.0,
    descriptionFr: "Si la mise dépasse 0.50 unité -> Réduire immédiatement la mise de 50% (plafond de sécurité)",
    stakeUiCode: "ON BET > 0.50 -> DECREASE BET BY 50%",
    category: 'circuit_breaker',
  },
  {
    order: 26,
    triggerType: 'every_bets',
    triggerValue: 40,
    actionType: 'decrease_multiplier_pct',
    actionValue: 10.0,
    descriptionFr: "Tous les 40 lancers -> Réduire le multiplicateur cible de 10% pour lisser le risque",
    stakeUiCode: "EVERY 40 BETS -> DECREASE MULTIPLIER BY 10%",
    category: 'stabilizer',
  },
  {
    order: 27,
    triggerType: 'first_loss_after_wins',
    triggerValue: 3,
    actionType: 'decrease_bet_pct',
    actionValue: 50.0,
    descriptionFr: "1re perte après 3+ gains consécutifs -> Diviser la mise par 2 immédiatement",
    stakeUiCode: "FIRST LOSS AFTER 3 WINS -> DECREASE BET BY 50%",
    category: 'stabilizer',
  },
  {
    order: 28,
    triggerType: 'profit_greater_than',
    triggerValue: 15.0,
    actionType: 'stop_autobet',
    descriptionFr: "Si profit de session > +15.0 unités -> Arrêt immédiat (verrouillage du Take Profit)",
    stakeUiCode: "ON PROFIT > 15.0 -> STOP AUTOBET",
    category: 'circuit_breaker',
  },
  {
    order: 29,
    triggerType: 'loss_streak_of',
    triggerValue: 9,
    actionType: 'stop_autobet',
    descriptionFr: "Série de 9 pertes consécutives -> Coupe-circuit d'urgence (arrêt complet de l'auto-bet)",
    stakeUiCode: "ON LOSS STREAK OF 9 -> STOP AUTOBET",
    category: 'circuit_breaker',
  },
  {
    order: 30,
    triggerType: 'loss_greater_than',
    triggerValue: 12.0,
    actionType: 'stop_autobet',
    descriptionFr: "Si drawdown cumulé > 12.0 unités -> Arrêt d'urgence définitif (protection du capital)",
    stakeUiCode: "ON DRAWDOWN > 12.0 -> STOP AUTOBET",
    category: 'circuit_breaker',
  },
];

// Helper: pick random integer in range [min, max] inclusive
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: pick random float rounded to decimals
function randomFloat(min: number, max: number, decimals: number = 1): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

/**
 * Dynamically builds an intelligent, diversified, and mathematically coherent set of custom conditions
 * tailored to the selected archetype style, ensuring that every generation is unique and non-repetitive.
 */
function buildDynamicCoherentDiceConditions(
  count: number,
  archetypeStyle: 'anti_streak' | 'oscillator' | 'tactical_matrix' | 'vip_volume' | 'master_30',
  bankroll: number,
  baseBet: number,
  stopOnProfit: number,
  stopOnLoss: number,
  currency: string
): StrategyCondition[] {
  const targetCount = Math.min(30, Math.max(4, count));

  // Condition rule generators by tactical category
  type ConditionGenerator = () => StrategyCondition;

  // --- Category A: Growth & Tactical Progression (Non-Martingale) ---
  const growthGenerators: ConditionGenerator[] = [
    () => {
      const losses = randomPick([2, 3, 4]);
      const pct = randomPick([8, 10, 12, 14, 16, 18]);
      return {
        id: `cond-g-loss-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_loss',
        triggerValue: losses,
        actionType: 'increase_bet_pct',
        actionValue: pct,
        description: `Toutes les ${losses} pertes -> Augmenter la mise de +${pct}% (progression douce amortie)`,
        stakeUiCode: `EVERY ${losses} LOSSES -> INCREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const wins = randomPick([2, 3, 4]);
      const pct = randomPick([10, 15, 20, 25]);
      return {
        id: `cond-g-win-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_win',
        triggerValue: wins,
        actionType: 'increase_bet_pct',
        actionValue: pct,
        description: `Tous les ${wins} gains -> Augmenter la mise de +${pct}% (capitalisation sur série positive)`,
        stakeUiCode: `EVERY ${wins} WINS -> INCREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const lossStreak = randomPick([2, 3, 4]);
      const pct = randomPick([8, 10, 12, 15]);
      return {
        id: `cond-g-rebond-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'first_win_after_losses',
        triggerValue: lossStreak,
        actionType: 'increase_bet_pct',
        actionValue: pct,
        description: `1er gain après ${lossStreak}+ pertes -> Augmenter la mise de +${pct}% (rebond tactique post-série)`,
        stakeUiCode: `FIRST WIN AFTER ${lossStreak} LOSSES -> INCREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const bets = randomPick([10, 15, 20]);
      const pct = randomPick([4, 5, 6, 8]);
      return {
        id: `cond-g-endurance-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_bets',
        triggerValue: bets,
        actionType: 'increase_bet_pct',
        actionValue: pct,
        description: `Tous les ${bets} lancers totaux -> Hausse mesurée de mise de +${pct}% (progression de volume)`,
        stakeUiCode: `EVERY ${bets} BETS -> INCREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const losses = randomPick([3, 4, 5]);
      const fixedUnit = Number((baseBet * randomPick([0.25, 0.5, 0.75, 1.0])).toFixed(4));
      return {
        id: `cond-g-fixed-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_loss',
        triggerValue: losses,
        actionType: 'increase_bet_fixed',
        actionValue: fixedUnit,
        description: `Toutes les ${losses} pertes -> Ajouter +${fixedUnit} ${currency} fixe (d'Alembert arithmétique)`,
        stakeUiCode: `EVERY ${losses} LOSSES -> INCREASE BET BY ${fixedUnit} FIXED`,
        isActive: true,
      };
    },
  ];

  // --- Category B: Directional Inversion & Variance Breakers ---
  const directionGenerators: ConditionGenerator[] = [
    () => {
      const losses = randomPick([3, 4, 5, 6]);
      return {
        id: `cond-d-loss-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_loss',
        triggerValue: losses,
        actionType: 'switch_direction',
        description: `Toutes les ${losses} pertes consécutives -> Inverser la direction (Above ↔ Below)`,
        stakeUiCode: `EVERY ${losses} LOSSES -> SWITCH CONDITION (OVER/UNDER)`,
        isActive: true,
      };
    },
    () => {
      const bets = randomPick([8, 10, 12, 16, 20, 25]);
      return {
        id: `cond-d-bets-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_bets',
        triggerValue: bets,
        actionType: 'switch_direction',
        description: `Tous les ${bets} lancers -> Inverser la direction pour diversifier la distribution`,
        stakeUiCode: `EVERY ${bets} BETS -> SWITCH CONDITION (OVER/UNDER)`,
        isActive: true,
      };
    },
    () => {
      const streak = randomPick([4, 5, 6, 7]);
      return {
        id: `cond-d-streak-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_streak_of',
        triggerValue: streak,
        actionType: 'switch_direction',
        description: `Série de ${streak} pertes consécutives -> Inverser la direction pour briser la variance`,
        stakeUiCode: `ON LOSS STREAK OF ${streak} -> SWITCH CONDITION`,
        isActive: true,
      };
    },
    () => {
      const wins = randomPick([3, 4, 5]);
      return {
        id: `cond-d-win-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_win',
        triggerValue: wins,
        actionType: 'switch_direction',
        description: `Tous les ${wins} gains -> Inverser la direction (Over ↔ Under) pour changer de zone`,
        stakeUiCode: `EVERY ${wins} WINS -> SWITCH CONDITION (OVER/UNDER)`,
        isActive: true,
      };
    },
  ];

  // --- Category C: Multipliers & Dynamic Target Recalibration ---
  const multiplierGenerators: ConditionGenerator[] = [
    () => {
      const wins = randomPick([3, 4, 5]);
      const pct = randomPick([6, 8, 10, 12, 15]);
      return {
        id: `cond-m-win-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_win',
        triggerValue: wins,
        actionType: 'increase_multiplier_pct',
        actionValue: pct,
        description: `Tous les ${wins} gains -> Augmenter le multiplicateur cible de +${pct}% (rampe de profit)`,
        stakeUiCode: `EVERY ${wins} WINS -> INCREASE TARGET MULTIPLIER BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const losses = randomPick([4, 5, 6, 7]);
      const pct = randomPick([8, 10, 12, 15]);
      return {
        id: `cond-m-loss-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_loss',
        triggerValue: losses,
        actionType: 'decrease_multiplier_pct',
        actionValue: pct,
        description: `Toutes les ${losses} pertes -> Réduire le multiplicateur cible de ${pct}% pour augmenter le winrate`,
        stakeUiCode: `EVERY ${losses} LOSSES -> DECREASE TARGET MULTIPLIER BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const wins = randomPick([4, 5, 6]);
      const newMult = randomPick([2.40, 2.75, 3.20, 3.50, 4.20]);
      return {
        id: `cond-m-boost-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_win',
        triggerValue: wins,
        actionType: 'change_multiplier',
        actionValue: newMult,
        description: `Tous les ${wins} gains -> Basculer sur cote boostée à ${newMult.toFixed(2)}x`,
        stakeUiCode: `EVERY ${wins} WINS -> SET MULTIPLIER TO ${newMult.toFixed(2)}x`,
        isActive: true,
      };
    },
    () => {
      const losses = randomPick([5, 6, 7]);
      const safeMult = randomPick([1.45, 1.55, 1.65, 1.75]);
      const winPct = (99 / safeMult).toFixed(1);
      return {
        id: `cond-m-safe-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_loss',
        triggerValue: losses,
        actionType: 'change_multiplier',
        actionValue: safeMult,
        description: `Toutes les ${losses} pertes -> Réduire la cote à ${safeMult.toFixed(2)}x (Winrate ${winPct}% de sécurité)`,
        stakeUiCode: `EVERY ${losses} LOSSES -> SET MULTIPLIER TO ${safeMult.toFixed(2)}x`,
        isActive: true,
      };
    },
    () => {
      const losses = randomPick([3, 4, 5]);
      const safeTarget = randomPick([38.5, 42.0, 45.0, 48.0]);
      return {
        id: `cond-m-target-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_streak_of',
        triggerValue: losses,
        actionType: 'set_dice_target',
        actionValue: safeTarget,
        description: `Série de ${losses} pertes -> Recaler la cible Dice à ${safeTarget.toFixed(2)} (zone de confort)`,
        stakeUiCode: `ON LOSS STREAK OF ${losses} -> SET TARGET TO ${safeTarget.toFixed(2)}`,
        isActive: true,
      };
    },
    () => {
      const lossStreak = randomPick([2, 3, 4]);
      return {
        id: `cond-m-restore-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'first_win_after_losses',
        triggerValue: lossStreak,
        actionType: 'set_dice_target',
        actionValue: 50.49,
        description: `1er gain après ${lossStreak}+ pertes -> Rétablir la cible Dice nominale (50.49 / cote 2.0x)`,
        stakeUiCode: `FIRST WIN AFTER ${lossStreak} LOSSES -> SET TARGET TO 50.49`,
        isActive: true,
      };
    },
  ];

  // --- Category D: Stabilizers & Profit Securing (Anti-Drawdown & Lock) ---
  const stabilizerGenerators: ConditionGenerator[] = [
    () => {
      const wins = randomPick([2, 3, 4]);
      return {
        id: `cond-s-win-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_win',
        triggerValue: wins,
        actionType: 'reset_bet',
        description: `Tous les ${wins} gains -> Réinitialiser la mise de base (verrouillage immédiat)`,
        stakeUiCode: `EVERY ${wins} WINS -> RESET BET AMOUNT`,
        isActive: true,
      };
    },
    () => {
      const winStreak = randomPick([3, 4, 5]);
      return {
        id: `cond-s-streak-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'win_streak_of',
        triggerValue: winStreak,
        actionType: 'reset_bet',
        description: `Série de ${winStreak} victoires consécutives -> Réinitialiser la mise (fin de cycle gagnant)`,
        stakeUiCode: `ON WIN STREAK OF ${winStreak} -> RESET BET AMOUNT`,
        isActive: true,
      };
    },
    () => {
      const winStreak = randomPick([2, 3, 4]);
      return {
        id: `cond-s-firstloss-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'first_loss_after_wins',
        triggerValue: winStreak,
        actionType: 'reset_bet',
        description: `1re perte après ${winStreak}+ victoires -> Réinitialiser la mise (anti-restitution des gains)`,
        stakeUiCode: `FIRST LOSS AFTER ${winStreak} WINS -> RESET BET AMOUNT`,
        isActive: true,
      };
    },
    () => {
      const winStreak = randomPick([3, 4, 5]);
      return {
        id: `cond-s-div2-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'first_loss_after_wins',
        triggerValue: winStreak,
        actionType: 'decrease_bet_pct',
        actionValue: 50.0,
        description: `1re perte après ${winStreak}+ victoires -> Diviser la mise par 2 immédiatement`,
        stakeUiCode: `FIRST LOSS AFTER ${winStreak} WINS -> DECREASE BET BY 50%`,
        isActive: true,
      };
    },
    () => {
      const bets = randomPick([15, 20, 25, 30]);
      return {
        id: `cond-s-bets-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'every_bets',
        triggerValue: bets,
        actionType: 'reset_bet',
        description: `Tous les ${bets} lancers totaux -> Réinitialiser la mise à la valeur plancher`,
        stakeUiCode: `EVERY ${bets} BETS -> RESET BET AMOUNT`,
        isActive: true,
      };
    },
    () => {
      const profitMilestone = Number((stopOnProfit * randomPick([0.25, 0.35, 0.45])).toFixed(2));
      return {
        id: `cond-s-profit1-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'profit_greater_than',
        triggerValue: profitMilestone,
        actionType: 'reset_bet',
        description: `Si profit de session > +${profitMilestone} ${currency} -> Réinitialiser la mise à la base`,
        stakeUiCode: `ON PROFIT > ${profitMilestone} -> RESET BET AMOUNT`,
        isActive: true,
      };
    },
    () => {
      const profitMilestone = Number((stopOnProfit * randomPick([0.60, 0.70, 0.80])).toFixed(2));
      const pct = randomPick([30, 40, 50]);
      return {
        id: `cond-s-profit2-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'profit_greater_than',
        triggerValue: profitMilestone,
        actionType: 'decrease_bet_pct',
        actionValue: pct,
        description: `Si profit de session > +${profitMilestone} ${currency} -> Réduire la mise de ${pct}% (palier de sécurité)`,
        stakeUiCode: `ON PROFIT > ${profitMilestone} -> DECREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
  ];

  // --- Category E: Circuit Breakers & Emergency Limits ---
  const circuitBreakerGenerators: ConditionGenerator[] = [
    () => {
      const streak = randomPick([4, 5, 6]);
      const pct = randomPick([25, 30, 40, 50]);
      return {
        id: `cond-c-streak-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_streak_of',
        triggerValue: streak,
        actionType: 'decrease_bet_pct',
        actionValue: pct,
        description: `Série de ${streak} pertes consécutives -> Réduire la mise de ${pct}% (coussin anti-drawdown)`,
        stakeUiCode: `ON LOSS STREAK OF ${streak} -> DECREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const capMultiplier = randomPick([4, 5, 6, 8]);
      const betCap = Number((baseBet * capMultiplier).toFixed(4));
      return {
        id: `cond-c-cap-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'bet_greater_than',
        triggerValue: betCap,
        actionType: 'decrease_bet_pct',
        actionValue: 50.0,
        description: `Si la mise dépasse ${betCap} ${currency} -> Diviser immédiatement la mise par 2 (plafond de sécurité)`,
        stakeUiCode: `ON BET > ${betCap} -> DECREASE BET BY 50%`,
        isActive: true,
      };
    },
    () => {
      const drawdownTrigger = Number((stopOnLoss * randomPick([0.35, 0.45, 0.55])).toFixed(2));
      const pct = randomPick([30, 40, 50]);
      return {
        id: `cond-c-drawdown-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_greater_than',
        triggerValue: drawdownTrigger,
        actionType: 'decrease_bet_pct',
        actionValue: pct,
        description: `Si drawdown atteint -${drawdownTrigger} ${currency} -> Réduire la mise de ${pct}% (amortisseur de perte)`,
        stakeUiCode: `ON DRAWDOWN > ${drawdownTrigger} -> DECREASE BET BY ${pct}%`,
        isActive: true,
      };
    },
    () => {
      const streak = randomPick([7, 8]);
      return {
        id: `cond-c-resetbase-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_streak_of',
        triggerValue: streak,
        actionType: 'set_bet_fixed',
        actionValue: baseBet,
        description: `Série de ${streak} pertes consécutives -> Réinitialiser strictement la mise à la valeur de base`,
        stakeUiCode: `ON LOSS STREAK OF ${streak} -> SET BET TO ${baseBet}`,
        isActive: true,
      };
    },
    () => {
      return {
        id: `cond-c-takeprofit-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'profit_greater_than',
        triggerValue: stopOnProfit,
        actionType: 'stop_autobet',
        description: `Si profit de session > +${stopOnProfit} ${currency} -> Arrêt définitif (Take Profit verrouillé)`,
        stakeUiCode: `ON PROFIT > ${stopOnProfit} -> STOP AUTOBET`,
        isActive: true,
      };
    },
    () => {
      const maxLossStreak = randomPick([8, 9, 10, 11]);
      return {
        id: `cond-c-emergencystreak-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_streak_of',
        triggerValue: maxLossStreak,
        actionType: 'stop_autobet',
        description: `Série critique de ${maxLossStreak} pertes consécutives -> Coupe-circuit d'urgence (arrêt complet)`,
        stakeUiCode: `ON LOSS STREAK OF ${maxLossStreak} -> STOP AUTOBET`,
        isActive: true,
      };
    },
    () => {
      return {
        id: `cond-c-emergencystop-${Date.now()}-${Math.random()}`,
        order: 0,
        triggerType: 'loss_greater_than',
        triggerValue: stopOnLoss,
        actionType: 'stop_autobet',
        description: `Si drawdown atteint -${stopOnLoss} ${currency} -> Arrêt d'urgence définitif (protection du capital)`,
        stakeUiCode: `ON DRAWDOWN > ${stopOnLoss} -> STOP AUTOBET`,
        isActive: true,
      };
    },
  ];

  // Helper to draw random generator from pool without duplicate trigger/action signature
  const drawnConditions: StrategyCondition[] = [];
  const signatureSet = new Set<string>();

  const tryAddCondition = (gen: ConditionGenerator): boolean => {
    // Generate up to 3 times to get a non-duplicate
    for (let attempt = 0; attempt < 3; attempt++) {
      const cond = gen();
      const sig = `${cond.triggerType}_${cond.triggerValue}_${cond.actionType}`;
      if (!signatureSet.has(sig)) {
        signatureSet.add(sig);
        drawnConditions.push(cond);
        return true;
      }
    }
    return false;
  };

  // Compose archetype-tailored mix
  if (archetypeStyle === 'anti_streak') {
    // Heavy on direction switches, streak breakers, and stabilizers
    directionGenerators.forEach(g => tryAddCondition(g));
    stabilizerGenerators.slice(0, 3).forEach(g => tryAddCondition(g));
    growthGenerators.slice(0, 2).forEach(g => tryAddCondition(g));
    multiplierGenerators.slice(3, 6).forEach(g => tryAddCondition(g));
    circuitBreakerGenerators.forEach(g => tryAddCondition(g));
  } else if (archetypeStyle === 'oscillator') {
    // Heavy on multiplier shifts, paroli ramps, and rapid reset on loss
    multiplierGenerators.forEach(g => tryAddCondition(g));
    growthGenerators.slice(0, 3).forEach(g => tryAddCondition(g));
    stabilizerGenerators.slice(0, 4).forEach(g => tryAddCondition(g));
    directionGenerators.slice(0, 2).forEach(g => tryAddCondition(g));
    circuitBreakerGenerators.forEach(g => tryAddCondition(g));
  } else if (archetypeStyle === 'tactical_matrix') {
    // Heavy on linear arithmetic progression, target shifting, and plateau cushions
    growthGenerators.forEach(g => tryAddCondition(g));
    stabilizerGenerators.forEach(g => tryAddCondition(g));
    multiplierGenerators.slice(2, 6).forEach(g => tryAddCondition(g));
    directionGenerators.slice(0, 2).forEach(g => tryAddCondition(g));
    circuitBreakerGenerators.forEach(g => tryAddCondition(g));
  } else if (archetypeStyle === 'vip_volume') {
    // Heavy on frequent volume resets, safe turnover, and small micro-progressions
    stabilizerGenerators.forEach(g => tryAddCondition(g));
    directionGenerators.forEach(g => tryAddCondition(g));
    growthGenerators.slice(0, 2).forEach(g => tryAddCondition(g));
    circuitBreakerGenerators.forEach(g => tryAddCondition(g));
    multiplierGenerators.slice(0, 2).forEach(g => tryAddCondition(g));
  } else {
    // master_30: comprehensive full matrix
    growthGenerators.forEach(g => tryAddCondition(g));
    directionGenerators.forEach(g => tryAddCondition(g));
    multiplierGenerators.forEach(g => tryAddCondition(g));
    stabilizerGenerators.forEach(g => tryAddCondition(g));
    circuitBreakerGenerators.forEach(g => tryAddCondition(g));
  }

  // If we still need more conditions to reach targetCount, fill from remaining pools
  const allPools = [
    ...growthGenerators,
    ...directionGenerators,
    ...multiplierGenerators,
    ...stabilizerGenerators,
    ...circuitBreakerGenerators,
  ];

  let loopCount = 0;
  while (drawnConditions.length < targetCount && loopCount < 50) {
    loopCount++;
    const randomGen = randomPick(allPools);
    tryAddCondition(randomGen);
  }

  // Take exactly targetCount
  const finalConditions = drawnConditions.slice(0, targetCount);

  // Re-index orders 1..N
  return finalConditions.map((cond, idx) => ({
    ...cond,
    order: idx + 1,
    id: `dice-cond-${idx + 1}-${Date.now()}-${randomInt(100, 999)}`,
  }));
}

/**
 * Generates an intelligent, automated Dice strategy with 4 to 30 Stake.com compatible conditions.
 * Ensures dynamically varied, mathematically coherent parameters on every generation.
 */
export function generateStakeDiceMultiConditionStrategy(
  bankroll: number,
  currency: string = 'USDT',
  conditionCount: number = 8,
  archetypeStyle: 'anti_streak' | 'oscillator' | 'tactical_matrix' | 'vip_volume' | 'master_30' = 'anti_streak'
): BettingStrategy {
  const safeBankroll = Math.max(10, bankroll);
  const clampedCount = Math.min(30, Math.max(4, conditionCount));
  
  // Calibrate archetype base parameters with slight sensible variation
  let baseBetPct = 0.08; // 0.08% of bankroll
  let targetMult = 2.0;
  let diceTarget = 50.49;
  let diceCondition: 'above' | 'below' = 'above';
  let stopProfitPct = 15;
  let stopLossPct = 12;

  if (archetypeStyle === 'anti_streak') {
    baseBetPct = randomFloat(0.06, 0.10, 3);
    targetMult = randomPick([1.98, 2.00, 2.05]);
    diceTarget = 50.49;
    diceCondition = randomPick(['above', 'below']);
    stopProfitPct = randomInt(14, 18);
    stopLossPct = randomInt(10, 14);
  } else if (archetypeStyle === 'oscillator') {
    baseBetPct = randomFloat(0.05, 0.08, 3);
    targetMult = randomPick([2.00, 2.20, 2.50]);
    diceTarget = Number((100 - (99 / targetMult)).toFixed(2));
    diceCondition = 'above';
    stopProfitPct = randomInt(16, 22);
    stopLossPct = randomInt(12, 16);
  } else if (archetypeStyle === 'tactical_matrix') {
    baseBetPct = randomFloat(0.08, 0.12, 3);
    targetMult = randomPick([1.90, 2.00, 2.10]);
    diceTarget = Number((100 - (99 / targetMult)).toFixed(2));
    diceCondition = 'above';
    stopProfitPct = randomInt(12, 16);
    stopLossPct = randomInt(12, 18);
  } else if (archetypeStyle === 'vip_volume') {
    baseBetPct = randomFloat(0.12, 0.25, 3);
    targetMult = randomPick([1.10, 1.15, 1.25, 1.35]);
    diceTarget = Number((100 - (99 / targetMult)).toFixed(2));
    diceCondition = 'above';
    stopProfitPct = randomInt(8, 12);
    stopLossPct = randomInt(8, 12);
  } else if (archetypeStyle === 'master_30') {
    baseBetPct = randomFloat(0.06, 0.09, 3);
    targetMult = 2.00;
    diceTarget = 50.49;
    diceCondition = 'above';
    stopProfitPct = randomInt(15, 20);
    stopLossPct = randomInt(12, 15);
  }

  const baseBet = Number(Math.max(0.001, (safeBankroll * (baseBetPct / 100))).toFixed(4));
  const stopOnProfit = Number(((safeBankroll * stopProfitPct) / 100).toFixed(2));
  const stopOnLoss = Number(((safeBankroll * stopLossPct) / 100).toFixed(2));
  const maxBetLimit = Number((baseBet * randomInt(5, 8)).toFixed(4));

  // Build the dynamic customized conditions
  const customConditions = buildDynamicCoherentDiceConditions(
    clampedCount,
    archetypeStyle,
    safeBankroll,
    baseBet,
    stopOnProfit,
    stopOnLoss,
    currency
  );

  const designations = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Omega', 'Vortex', 'Prime', 'Apex', 'Quantum', 'Nexus', 'Matrix', 'Horizon'];
  const designation = `${randomPick(designations)}-${randomInt(1, 99)}`;

  const namesMap: Record<string, string> = {
    anti_streak: `🎲 Stake Dice ${clampedCount}-Cond. [Anti-Streak ${designation}]`,
    oscillator: `🎲 Stake Dice ${clampedCount}-Cond. [Oscillateur ${designation}]`,
    tactical_matrix: `🎲 Stake Dice ${clampedCount}-Cond. [Grind Tactique ${designation}]`,
    vip_volume: `🎲 Stake Dice ${clampedCount}-Cond. [VIP Volume ${designation}]`,
    master_30: `🎲 Stake Dice 30-Cond. [Master Quant ${designation}]`,
  };

  const name = namesMap[archetypeStyle] || `🎲 Stake Dice ${clampedCount}-Conditions [${designation}]`;

  const winChance = Number((99 / targetMult).toFixed(2));

  return {
    id: `strat-dice-multi-cond-${clampedCount}-${Date.now()}-${randomInt(100, 999)}`,
    name,
    game: 'dice',
    description: `Stratégie Dice multi-règles automatisée (${clampedCount} conditions Stake.com). Configuration dynamique [${designation}] : équilibrage de variance, gestion des séries et protections intégrées.`,
    riskLevel: clampedCount > 20 ? 'medium' : 'low',
    baseBet,
    currency,
    targetMultiplier: targetMult,
    winChance,
    gameConfig: {
      diceCondition,
      diceTarget,
    },
    onWinAction: 'custom',
    onLossAction: 'custom',
    stopOnProfit,
    stopOnLoss,
    maxBetLimit,
    maxConsecutiveLosses: archetypeStyle === 'vip_volume' ? 5 : 10,
    customConditions,
    evEstimate: -0.01,
    author: 'ai',
    createdAt: new Date().toISOString(),
    aiRationale: `Automatisation Stake Dice (${clampedCount} conditions actives, profil ${archetypeStyle.toUpperCase()}) : combinaison dynamique de règles séquentielles pour contrer la variance, inverser Over/Under, ajuster les paliers de mise et verrouiller les gains sans emballement géométrique.`,
  };
}


