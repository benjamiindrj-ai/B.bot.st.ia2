/**
 * Module d'Analyse Probabiliste Avancé & Régression Bayésienne pour le Sport
 * 
 * Règles Fondamentales :
 * 1. Exclusion systématique des cotes en dehors de la plage [1.15 - 1.85]
 * 2. Priorisation absolue des opportunités avec Score de Confiance > 75%
 * 3. Modèle Logit-Bayésien conjugué : Log-Odds Prior (marché dé-marziné) +
 *    Vecteur d'évidence empirique (Sharp Pinnacle/Bet365, xG/Poisson, Clv, Microstructure)
 *    -> Posterior Predictive Probability & Intervalle de Crédibilité 95%
 */

export const MIN_BAYESIAN_ODDS = 1.15;
export const MAX_BAYESIAN_ODDS = 1.85;
export const HIGH_CONFIDENCE_THRESHOLD = 75; // Score de confiance > 75%
export const BAYESIAN_ALERT_CONFIDENCE_THRESHOLD = 80; // Seuil d'Alerte Visuelle Bayésienne > 80% dans la cible [1.15 - 1.85]

export interface BayesianRegressionCoefficients {
  priorWeight: number;            // Poids du prior implicite marché dé-marziné (β_prior)
  sharpBenchmarkWeight: number;   // Poids du signal Sharp (Pinnacle / consensus pro) (β_sharp)
  xgPoissonWeight: number;        // Poids du différentiel d'efficacité attendue xG / Poisson (β_xg)
  microstructureWeight: number;   // Poids du flux d'argent pro (Sharp Money vs Public) (β_micro)
  trendMomentumWeight: number;    // Poids de la dynamique de cote (Dropping Odds) (β_trend)
}

export interface BayesianSportsRegressionResult {
  odds: number;
  posteriorWinProbability: number;     // E[p|D] en % (ex: 78.4%)
  credibleIntervalLow: number;         // 2.5e percentile en % (ex: 73.2%)
  credibleIntervalHigh: number;        // 97.5e percentile en % (ex: 83.6%)
  bayesianConfidenceScore: number;     // Score de confiance bayésien [0-100%]
  bayesianExpectedValue: number;       // EV bayésien en % : (P_post * cote - 1) * 100
  unviggedFairOdds: number;            // Cote équitable dé-marzinée (1 / P_post)
  marketImpliedProb: number;           // Probabilité brute du bookmaker (1 / cote * 100)
  bayesianEdgePct: number;             // P_post - P_implied (en points de %)
  
  // Vérification stricte des contraintes
  isOddsValid: boolean;                // true SSI 1.15 <= odds <= 1.85
  isHighConfidence: boolean;           // true SSI confidenceScore > 75%
  isAlertOver80?: boolean;             // true SSI isOddsValid ET bayesianConfidenceScore > 80% (Alerte Visuelle Cible)
  isQualified: boolean;                // isOddsValid && isHighConfidence
  priorityRank: number;                // Score de classement pondéré pour le tri
  
  filterStatus: 
    | 'qualified_top_priority'         // Validé [1.15 - 1.85] ET Confiance > 75%
    | 'qualified_standard'             // Validé [1.15 - 1.85] MAIS Confiance <= 75%
    | 'rejected_odds_too_low'          // Exclu : Cote < 1.15
    | 'rejected_odds_too_high'         // Exclu : Cote > 1.85
    | 'rejected_confidence_low';       // Exclu lorsque filtre strict > 75% est activé
  rejectionReason?: string;

  coefficients: BayesianRegressionCoefficients;
  recommendedKellyFractionPct: number; // Fraction de Kelly bayésienne sécurisée (% de bankroll)
}

/**
 * Fonction sigmoïde logistique
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-35, Math.min(35, x))));
}

/**
 * Fonction logit (log-odds)
 */
function logit(p: number): number {
  const clamped = Math.max(0.001, Math.min(0.999, p));
  return Math.log(clamped / (1 - clamped));
}

/**
 * Exécute la Régression Bayésienne sur une opportunité de pari sportif
 */
export function runBayesianSportsRegression(params: {
  odds: number;
  confidenceScore: number;
  expectedValue?: number;
  market?: string;
  aiEstimatedTrueProbability?: number;
  bookmakerImpliedProbability?: number;
  droppingOddsAlert?: {
    trend?: 'dropping' | 'stable' | 'rising';
    openingOdds?: number;
    currentOdds?: number;
  };
  sharpBenchmark?: {
    pinnacleOdds?: number;
    consensusOdds?: number;
    stakeEdgeVsPinnacle?: number;
  };
  advancedMetrics?: {
    npxGHome?: number;
    npxGAway?: number;
  };
  poissonModelScore?: {
    homeExpGoals?: number;
    awayExpGoals?: number;
  };
  marketMicrostructure?: {
    sharpMoneyPct?: number;
    publicTicketsPct?: number;
  };
}): BayesianSportsRegressionResult {
  const odds = Number(params.odds) || 1.50;
  const rawConfidence = Number(params.confidenceScore) || 75;

  // 1. Validation de la contrainte stricte de cotes [1.15 - 1.85]
  const isOddsTooLow = odds < MIN_BAYESIAN_ODDS;
  const isOddsTooHigh = odds > MAX_BAYESIAN_ODDS;
  const isOddsValid = !isOddsTooLow && !isOddsTooHigh;

  // 2. Prior Implicite Dé-marziné (Unvigged Market Prior)
  // Marge moyenne du marché estimée à 3.2%
  const marketMargin = 0.032;
  const marketImpliedProb = Number(((1 / odds) * 100).toFixed(1));
  const unviggedPriorProb = Math.min(0.95, Math.max(0.05, (1 / odds) / (1 + marketMargin)));
  const priorLogit = logit(unviggedPriorProb);
  const priorVariance = 0.18; // Variance modérée du prior marché

  // 3. Extraction des Covariables (Feature Vector X)
  // Covariable 1 : Signal Sharp Pinnacle (si dispo)
  let xSharp = 0;
  if (params.sharpBenchmark?.pinnacleOdds) {
    const pinProb = 1 / params.sharpBenchmark.pinnacleOdds;
    const stakeProb = 1 / odds;
    // Si la cote Pinnacle est plus basse, Pinnacle estime une probabilité plus forte (signal positif)
    xSharp = Math.max(-1.5, Math.min(1.5, (pinProb - stakeProb) * 6));
  } else if (params.expectedValue !== undefined) {
    xSharp = Math.max(-1.5, Math.min(1.5, (params.expectedValue - 4) * 0.12));
  }

  // Covariable 2 : Métrique xG / Poisson / IA True Probability
  let xPoisson = 0;
  if (params.aiEstimatedTrueProbability) {
    const aiProb = params.aiEstimatedTrueProbability / 100;
    xPoisson = Math.max(-2.0, Math.min(2.0, (aiProb - unviggedPriorProb) * 5));
  } else if (params.poissonModelScore) {
    const diff = (params.poissonModelScore.homeExpGoals || 1.4) - (params.poissonModelScore.awayExpGoals || 1.0);
    xPoisson = Math.max(-1.5, Math.min(1.5, diff * 0.4));
  }

  // Covariable 3 : Microstructure (Sharp Money Divergence)
  let xMicro = 0;
  if (params.marketMicrostructure?.sharpMoneyPct && params.marketMicrostructure?.publicTicketsPct) {
    const sharpDiv = (params.marketMicrostructure.sharpMoneyPct - params.marketMicrostructure.publicTicketsPct) / 100;
    xMicro = Math.max(-1.2, Math.min(1.2, sharpDiv * 2.0));
  }

  // Covariable 4 : Tendance de cote (Dropping Odds)
  let xTrend = 0;
  if (params.droppingOddsAlert?.trend === 'dropping') {
    xTrend = 0.45;
  } else if (params.droppingOddsAlert?.trend === 'rising') {
    xTrend = -0.35;
  }

  // Covariable 5 : Bonus de sécurité structurel sur les marchés ciblés (Double Chance, Over 1.5)
  let xMarketStructure = 0;
  const marketLower = (params.market || '').toLowerCase();
  if (marketLower.includes('ou nul') || marketLower.includes('double chance') || marketLower.includes('1x') || marketLower.includes('x2')) {
    xMarketStructure = 0.35;
  } else if (marketLower.includes('plus de 1.5') || marketLower.includes('over 1.5') || marketLower.includes('dnb') || marketLower.includes('remboursé')) {
    xMarketStructure = 0.25;
  }

  // 4. Poids de Régression Bayésienne (Régularisation L2 / Gaussian Shrinkage Prior)
  const coefficients: BayesianRegressionCoefficients = {
    priorWeight: 0.85,
    sharpBenchmarkWeight: 0.38,
    xgPoissonWeight: 0.45,
    microstructureWeight: 0.25,
    trendMomentumWeight: 0.20,
  };

  // 5. Calcul du Posterior Log-Odds
  const evidenceAdjustment = 
    coefficients.sharpBenchmarkWeight * xSharp +
    coefficients.xgPoissonWeight * xPoisson +
    coefficients.microstructureWeight * xMicro +
    coefficients.trendMomentumWeight * xTrend +
    xMarketStructure * 0.15;

  const posteriorLogit = priorLogit + evidenceAdjustment;

  // Précision a posteriori : mise à jour bayésienne de la variance
  // 1/sigma_post^2 = 1/sigma_prior^2 + sum(w_i)
  const evidencePrecision = 0.35 + (Math.abs(xSharp) + Math.abs(xPoisson)) * 0.25;
  const posteriorVariance = 1 / ((1 / priorVariance) + evidencePrecision);
  const posteriorStdDev = Math.sqrt(posteriorVariance);

  // Probabilité postérieure moyenne E[p|D]
  const posteriorProbRaw = sigmoid(posteriorLogit);
  const posteriorWinProbability = Number(Math.min(92.0, Math.max(52.0, posteriorProbRaw * 100)).toFixed(1));

  // 6. Intervalle de Crédibilité Bayésien à 95%
  const ciLow = Number(Math.min(posteriorWinProbability - 0.5, Math.max(45.0, sigmoid(posteriorLogit - 1.96 * posteriorStdDev) * 100)).toFixed(1));
  const ciHigh = Number(Math.max(posteriorWinProbability + 0.5, Math.min(97.0, sigmoid(posteriorLogit + 1.96 * posteriorStdDev) * 100)).toFixed(1));

  // 7. Score de Confiance Bayésien
  // Dérivé de la netteté de l'intervalle de crédibilité (étalement faible = confiance haute)
  // combiné au score heuristique initial
  const ciSpread = ciHigh - ciLow;
  const precisionConfidence = Math.max(60, 100 - (ciSpread * 1.5));
  const bayesianConfidenceScore = Number(
    Math.min(98.5, Math.max(55.0, 0.45 * rawConfidence + 0.55 * precisionConfidence)).toFixed(1)
  );

  const isHighConfidence = bayesianConfidenceScore > HIGH_CONFIDENCE_THRESHOLD;

  // 8. Espérance Mathématique Bayésienne (EV)
  const bayesianExpectedValue = Number((((posteriorWinProbability / 100) * odds - 1) * 100).toFixed(1));
  const unviggedFairOdds = Number((1 / (posteriorWinProbability / 100)).toFixed(2));
  const bayesianEdgePct = Number((posteriorWinProbability - marketImpliedProb).toFixed(1));

  // 9. Fraction de Kelly Bayésienne (Quart-Kelly défensif)
  const b = odds - 1;
  const p = posteriorWinProbability / 100;
  const q = 1 - p;
  const fullKelly = b > 0 ? (b * p - q) / b : 0;
  const safeQuarterKelly = Math.max(0.5, Math.min(3.5, fullKelly * 0.25 * 100));
  const recommendedKellyFractionPct = Number(safeQuarterKelly.toFixed(2));

  // 10. Statut de Filtrage et Qualification
  let filterStatus: BayesianSportsRegressionResult['filterStatus'] = 'qualified_top_priority';
  let rejectionReason: string | undefined = undefined;

  if (isOddsTooLow) {
    filterStatus = 'rejected_odds_too_low';
    rejectionReason = `Cote (${odds.toFixed(2)}) < ${MIN_BAYESIAN_ODDS} : Exclue systématiquement (gain asymétrique & risque résiduel élevé)`;
  } else if (isOddsTooHigh) {
    filterStatus = 'rejected_odds_too_high';
    rejectionReason = `Cote (${odds.toFixed(2)}) > ${MAX_BAYESIAN_ODDS} : Exclue systématiquement (variance et volatilité excessives)`;
  } else if (!isHighConfidence) {
    filterStatus = 'qualified_standard';
    rejectionReason = `Score de confiance (${bayesianConfidenceScore}%) ≤ ${HIGH_CONFIDENCE_THRESHOLD}% : Valide mais hors priorité haute`;
  } else {
    filterStatus = 'qualified_top_priority';
  }

  const isQualified = isOddsValid && isHighConfidence;
  const isAlertOver80 = isOddsValid && bayesianConfidenceScore > BAYESIAN_ALERT_CONFIDENCE_THRESHOLD;

  // 11. Score de Priorité de Classement (Rank Score)
  // Bonus majeur si isOddsValid (+1000), isAlertOver80 (+800), isHighConfidence (+500), puis pondération Confiance & EV
  let priorityRank = 0;
  if (isOddsValid) priorityRank += 1000;
  if (isAlertOver80) priorityRank += 800;
  if (isHighConfidence) priorityRank += 500;
  priorityRank += bayesianConfidenceScore * 2 + bayesianExpectedValue;

  return {
    odds,
    posteriorWinProbability,
    credibleIntervalLow: ciLow,
    credibleIntervalHigh: ciHigh,
    bayesianConfidenceScore,
    bayesianExpectedValue,
    unviggedFairOdds,
    marketImpliedProb,
    bayesianEdgePct,
    isOddsValid,
    isHighConfidence,
    isAlertOver80,
    isQualified,
    priorityRank,
    filterStatus,
    rejectionReason,
    coefficients,
    recommendedKellyFractionPct,
  };
}

/**
 * Helper rapide pour vérifier si un pari déclenche l'Alerte Visuelle Bayésienne :
 * 1. Cote dans la cible [1.15 - 1.85]
 * 2. Score de confiance bayésien calculé > 80%
 */
export function isBayesianAlertTriggered(params: {
  odds: number;
  bayesianConfidenceScore?: number;
  confidenceScore?: number;
}): boolean {
  const odds = Number(params.odds) || 0;
  const inTargetOddsWindow = odds >= MIN_BAYESIAN_ODDS && odds <= MAX_BAYESIAN_ODDS;
  const conf = params.bayesianConfidenceScore !== undefined 
    ? params.bayesianConfidenceScore 
    : (params.confidenceScore || 0);
  return inTargetOddsWindow && conf > BAYESIAN_ALERT_CONFIDENCE_THRESHOLD;
}

/**
 * Filtre et priorise une liste d'opportunités sportives selon les critères bayésiens.
 * 
 * Options :
 * - strictOddsRange (défaut true) : exclut systématiquement les cotes < 1.15 ou > 1.85
 * - prioritizeHighConfidence (défaut true) : place les matchs avec Confiance > 75% en tête
 * - onlyHighConfidence (défaut false) : exclut également les matchs avec Confiance <= 75%
 */
export function filterAndRankSportsWithBayesian<T extends {
  odds: number;
  confidenceScore: number;
  expectedValue?: number;
  market?: string;
  aiEstimatedTrueProbability?: number;
  bookmakerImpliedProbability?: number;
  droppingOddsAlert?: any;
  sharpBenchmark?: any;
  advancedMetrics?: any;
  poissonModelScore?: any;
  marketMicrostructure?: any;
  bayesianAnalysis?: BayesianSportsRegressionResult;
}>(
  items: T[],
  options: {
    strictOddsRange?: boolean;
    prioritizeHighConfidence?: boolean;
    onlyHighConfidence?: boolean;
    minOdds?: number;
    maxOdds?: number;
    minConfidence?: number;
  } = {}
): {
  filtered: (T & { bayesianAnalysis: BayesianSportsRegressionResult })[];
  excludedCount: number;
  highConfidenceCount: number;
  alertOver80Count: number;
  avgOdds: number;
  avgConfidence: number;
  avgBayesianEv: number;
} {
  const strictOdds = options.strictOddsRange !== false;
  const prioritizeHighConf = options.prioritizeHighConfidence !== false;
  const onlyHighConf = options.onlyHighConfidence === true;
  const minO = options.minOdds ?? MIN_BAYESIAN_ODDS;
  const maxO = options.maxOdds ?? MAX_BAYESIAN_ODDS;
  const minConf = options.minConfidence ?? HIGH_CONFIDENCE_THRESHOLD;

  // Calculer l'analyse bayésienne pour chaque opportunité
  const evaluated = items.map((item) => {
    const bayes = item.bayesianAnalysis || runBayesianSportsRegression(item);
    return {
      ...item,
      bayesianAnalysis: bayes,
    };
  });

  let excludedCount = 0;

  const filtered = evaluated.filter((item) => {
    const o = item.odds;
    const b = item.bayesianAnalysis;

    // Règle 1 : Exclusion stricte en dehors de [1.15 - 1.85]
    if (strictOdds) {
      if (o < minO || o > maxO) {
        excludedCount++;
        return false;
      }
    }

    // Règle 2 : Si mode filtre strict > 75% activé
    if (onlyHighConf) {
      if (b.bayesianConfidenceScore <= minConf && item.confidenceScore <= minConf) {
        excludedCount++;
        return false;
      }
    }

    return true;
  });

  // Règle 3 : Priorisation des matchs avec score de confiance > 75%
  filtered.sort((a, b) => {
    const aHigh = a.bayesianAnalysis.bayesianConfidenceScore > minConf || a.confidenceScore > minConf;
    const bHigh = b.bayesianAnalysis.bayesianConfidenceScore > minConf || b.confidenceScore > minConf;

    if (prioritizeHighConf) {
      // Priorité 1 : Matchs > 75% passent en premier
      if (aHigh && !bHigh) return -1;
      if (!aHigh && bHigh) return 1;
    }

    // Priorité 2 : Score de classement bayésien combiné (Confiance & EV)
    if (b.bayesianAnalysis.priorityRank !== a.bayesianAnalysis.priorityRank) {
      return b.bayesianAnalysis.priorityRank - a.bayesianAnalysis.priorityRank;
    }

    // Priorité 3 : Score de confiance pur
    return b.bayesianAnalysis.bayesianConfidenceScore - a.bayesianAnalysis.bayesianConfidenceScore;
  });

  const highConfidenceCount = filtered.filter(
    (i) => i.bayesianAnalysis.bayesianConfidenceScore > minConf || i.confidenceScore > minConf
  ).length;

  const alertOver80Count = filtered.filter(
    (i) => i.bayesianAnalysis.isAlertOver80
  ).length;

  const sumOdds = filtered.reduce((acc, i) => acc + i.odds, 0);
  const sumConf = filtered.reduce((acc, i) => acc + i.bayesianAnalysis.bayesianConfidenceScore, 0);
  const sumEv = filtered.reduce((acc, i) => acc + i.bayesianAnalysis.bayesianExpectedValue, 0);

  const count = filtered.length || 1;

  return {
    filtered,
    excludedCount,
    highConfidenceCount,
    alertOver80Count,
    avgOdds: Number((sumOdds / count).toFixed(2)),
    avgConfidence: Number((sumConf / count).toFixed(1)),
    avgBayesianEv: Number((sumEv / count).toFixed(1)),
  };
}
