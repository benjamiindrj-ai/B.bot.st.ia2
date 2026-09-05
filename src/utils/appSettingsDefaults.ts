import { AppSettings, AppLanguage, OddsDisplayFormat } from '../types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'fr',
  timeZone: 'Europe/Paris',
  timeFormat: '24h',
  oddsFormat: 'decimal',
  defaultCurrency: 'USDT',
  defaultStakePercent: 2.0,
  minExpectedValue: 5.0,
  bankrollModel: 'quarter_kelly',
  soundEffects: true,
  hapticFeedback: true,
  valueBetAlerts: true,
  stopLossAlert: true,
  stopLossPercent: 15.0,
  takeProfitAlert: true,
  takeProfitPercent: 25.0,
  themeMode: 'dark',
  themeAccent: 'blue',
  compactView: false,
  animationsEnabled: true,
  hideBalancePrivacy: false,
  autoSaveCloud: true,
  autoWithdrawVaultEnabled: false,
  autoWithdrawVaultThreshold: 150.0,
  // Dynamic Bankroll Risk Management & Base Bet Auto-Calculation
  autoBaseBetPercentEnabled: false,
  autoBaseBetPercent: 0.1, // 0.1% of current bankroll
  autoBaseBetMinFloor: 0.0001,
  autoBaseBetMaxCap: 5.0,
  // Global Fixed Risk & Long-Term Account Survival
  globalRiskPercent: 0.5, // 0.5% default fixed global risk
  globalRiskSurvivalMode: 'safe',
  autoRiskAdjustmentEnabled: false,
  globalStopLossMultiplier: 25,
  globalTakeProfitMultiplier: 30,
  browserNotificationsEnabled: false,
  notifyOnCriticalLoss: true,
  notifyOnUnexpectedStop: true,
  notifyOnTakeProfit: true,
};

export const SUPPORTED_LANGUAGES: Array<{ code: AppLanguage; label: string; flag: string; nativeName: string }> = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', nativeName: 'Français (France)' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English (US/UK)' },
  { code: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', nativeName: 'Português (Brasil)' },
];

export const SUPPORTED_TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2) - Heure de Paris' },
  { value: 'UTC', label: 'UTC / GMT (Temps Universel Coordonné)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8)' },
];

export const ODDS_FORMATS: Array<{ id: OddsDisplayFormat; label: string; example: string; desc: string }> = [
  { id: 'decimal', label: 'Décimal (Européen)', example: '1.85', desc: 'Standard européen : Cote brute multiplicatrice' },
  { id: 'american', label: 'Américain (+ / -)', example: '-118', desc: 'Standard US : +150 (gain sur 100$) ou -118 (mise pour 100$)' },
  { id: 'fractional', label: 'Fractionnaire (UK)', example: '17/20', desc: 'Standard britannique : Ratio Profit / Mise' },
  { id: 'implied_prob', label: 'Probabilité Implicite', example: '54.1%', desc: 'Pourcentage théorique : 1 / Cote * 100' },
];

export function formatOddsByFormat(decimalOdds: number, format: OddsDisplayFormat): string {
  if (!decimalOdds || decimalOdds <= 1) return '1.00';

  switch (format) {
    case 'decimal':
      return decimalOdds.toFixed(2);
    case 'american': {
      if (decimalOdds >= 2.0) {
        const val = Math.round((decimalOdds - 1) * 100);
        return `+${val}`;
      } else {
        const val = Math.round(-100 / (decimalOdds - 1));
        return `${val}`;
      }
    }
    case 'fractional': {
      const profit = decimalOdds - 1;
      const tolerance = 1.0E-3;
      let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
      let b = profit;
      do {
        const a = Math.floor(b);
        let aux = h1;
        h1 = a * h1 + h2;
        h2 = aux;
        aux = k1;
        k1 = a * k1 + k2;
        k2 = aux;
        b = 1 / (b - a);
      } while (Math.abs(profit - h1 / k1) > profit * tolerance && k1 < 100);

      return `${h1}/${k1}`;
    }
    case 'implied_prob': {
      const pct = (1 / decimalOdds) * 100;
      return `${pct.toFixed(1)}%`;
    }
    default:
      return decimalOdds.toFixed(2);
  }
}

/**
 * Calculates a safe, dynamic Base Bet amount based on a percentage of the current bankroll.
 * Example: 0.1% of 100 USDT = 0.1000 USDT (1000 base bets survival buffer).
 */
export function calculateDynamicBaseBet(
  balance: number,
  percent: number = 0.1,
  minFloor: number = 0.0001,
  maxCapPercent: number = 5.0
): number {
  const safeBal = Math.max(0, balance || 0);
  if (safeBal <= 0) return minFloor;
  
  const safePercent = Math.max(0.001, percent || 0.1);
  let calculated = (safeBal * safePercent) / 100;
  
  if (minFloor !== undefined && minFloor > 0 && calculated < minFloor) {
    calculated = minFloor;
  }
  
  if (maxCapPercent !== undefined && maxCapPercent > 0) {
    const maxAllowed = (safeBal * maxCapPercent) / 100;
    if (calculated > maxAllowed) {
      calculated = maxAllowed;
    }
  }
  
  return Number(calculated.toFixed(4));
}
