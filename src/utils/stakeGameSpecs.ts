import { StakeGameType } from '../types';

export interface StakeGameSpec {
  id: StakeGameType;
  name: string;
  category: 'originals' | 'table' | 'live';
  rtp: number; // RTP in percentage e.g. 99.00
  houseEdge: number; // House edge percentage e.g. 1.00
  maxMultiplier: number; // Maximum theoretical multiplier payout
  maxMultiplierFormatted: string;
  minMultiplier: number;
  maxWinPotentialNote: string;
  description: string;
  keyRule: string;
}

/**
 * Exact Stake.com Casino Originals & Table Games Official Max Multipliers & Specs
 * (Updated with 10,000x / 9,900x / 1,000,000x / 5,148,297x limits)
 */
export const STAKE_ORIGINALS_SPECS: Record<string, StakeGameSpec> = {
  dice: {
    id: 'dice',
    name: 'Dice',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 9900,
    maxMultiplierFormatted: '9,900x',
    minMultiplier: 1.0102,
    maxWinPotentialNote: 'Gain Max: 9,900x la mise (sur roll 99.99 avec win chance 0.01%)',
    description: 'Le jeu emblématique de Stake avec 99% de RTP. Permet de choisir précisément sa chance de gain de 0.01% à 98.99%.',
    keyRule: 'Formule officielle : Multiplicateur = 99 / WinChance'
  },
  plinko: {
    id: 'plinko',
    name: 'Plinko',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 10000, // Stake Plinko 16 rows High / 10,000x custom mode
    maxMultiplierFormatted: '10,000x',
    minMultiplier: 0.2,
    maxWinPotentialNote: 'Gain Max: 1,000x à 10,000x selon le niveau de risque et les rangées (16 Rows High)',
    description: 'Passez de 8 à 16 rangées d’épingles avec 3 niveaux de volatilité (Low, Medium, High).',
    keyRule: 'Chaque bille suit une marche aléatoire binomiale (RTP 99%)'
  },
  limbo: {
    id: 'limbo',
    name: 'Limbo',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 1000000,
    maxMultiplierFormatted: '1,000,000x',
    minMultiplier: 1.01,
    maxWinPotentialNote: 'Gain Max: 1,000,000x (Multiplicateur le plus élevé de Stake Originals)',
    description: 'Une fusée avec multiplicateur sans plafond standard jusqu’à 1 million de fois la mise.',
    keyRule: 'Formule Stake : 99 / (100 * (1 - float)) avec plafond à 1,000,000x'
  },
  mines: {
    id: 'mines',
    name: 'Mines',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 5148297,
    maxMultiplierFormatted: '5,148,297x',
    minMultiplier: 1.03,
    maxWinPotentialNote: 'Gain Max: 5,148,297x (sur grille 24 mines / 1 diamant trouvé ou 20 mines / 5 gemmes)',
    description: 'Grille de 25 cases personnalisable de 1 à 24 mines. Multiplicateurs exponentiels à chaque diamant trouvé.',
    keyRule: 'Formule combinatoire nCr : Multiplicateur = 0.99 * (C(25,k) / C(25-M, k))'
  },
  crash: {
    id: 'crash',
    name: 'Crash',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 1000000,
    maxMultiplierFormatted: '1,000,000x',
    minMultiplier: 1.00,
    maxWinPotentialNote: 'Gain Max: 1,000,000x avec courbe logarithmique en temps réel',
    description: 'Multiplicateur ascendant en temps réel avec crash aléatoire instantané ou fusée lunaire.',
    keyRule: 'Crash instantané à 1.00x dans environ 1% des cas (avantage maison)'
  },
  keno: {
    id: 'keno',
    name: 'Keno',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 1000,
    maxMultiplierFormatted: '1,000x',
    minMultiplier: 0.1,
    maxWinPotentialNote: 'Gain Max: 1,000x (sur tirage 10/10 en mode High Risk)',
    description: 'Sélectionnez de 1 à 10 numéros sur 40. Tirage de 10 boules provably fair.',
    keyRule: 'Paliers de gains ajustables selon le profil Low, Classic, Medium ou High'
  },
  hilo: {
    id: 'hilo',
    name: 'Hilo',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 1000000,
    maxMultiplierFormatted: '1,000,000x',
    minMultiplier: 1.01,
    maxWinPotentialNote: 'Gain Max: Potentiellement infini (plafonné à 1,000,000x ou limite de gain Stake)',
    description: 'Devinez si la carte suivante est plus haute ou plus basse. Multiplicateurs cumulatifs à chaque carte trouvée.',
    keyRule: 'Possibilité d’encaisser (Cashout) ou de passer (Skip) à tout moment'
  },
  wheel: {
    id: 'wheel',
    name: 'Wheel',
    category: 'originals',
    rtp: 99.00,
    houseEdge: 1.00,
    maxMultiplier: 49.5,
    maxMultiplierFormatted: '49.5x',
    minMultiplier: 0.0,
    maxWinPotentialNote: 'Gain Max: 49.5x (sur segment 50 segments High Risk)',
    description: 'Roue de la fortune avec 10 à 50 segments et 3 niveaux de volatilité.',
    keyRule: 'Choix de 10, 20, 30, 40 ou 50 segments'
  },
  blackjack: {
    id: 'blackjack',
    name: 'Blackjack',
    category: 'table',
    rtp: 99.43,
    houseEdge: 0.57,
    maxMultiplier: 2.5,
    maxMultiplierFormatted: '2.5x (3:2 BJ)',
    minMultiplier: 1.0,
    maxWinPotentialNote: 'Gain Max: 2.5x (Blackjack naturel payé 3:2) ou 4x sur Double/Split gagnant',
    description: 'Le RTP le plus élevé de Stake (99.43%). Le croupier reste sur Soft 17.',
    keyRule: 'Avantage maison minime de 0.57% avec la Basic Strategy parfaite'
  },
  roulette: {
    id: 'roulette',
    name: 'Roulette',
    category: 'table',
    rtp: 97.30,
    houseEdge: 2.70,
    maxMultiplier: 36.0,
    maxMultiplierFormatted: '36x (Numéro Plein)',
    minMultiplier: 1.5,
    maxWinPotentialNote: 'Gain Max: 36x (Pari plein payé 35:1 + mise)',
    description: 'Roulette Européenne à un seul zéro (37 numéros).',
    keyRule: 'Avantage maison de 2.70% sur tous les paris (Plein, Cheval, Douzaine, Voisins)'
  }
};
