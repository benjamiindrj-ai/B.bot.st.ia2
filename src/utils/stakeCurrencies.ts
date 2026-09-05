export interface StakeCurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto';
  decimals: number;
  iconBg?: string;
  isStablecoin?: boolean;
}

export const STAKE_AVAILABLE_CURRENCIES: StakeCurrencyInfo[] = [
  { code: 'USDC', name: 'USD Coin', symbol: '$', type: 'crypto', decimals: 2, isStablecoin: true, iconBg: 'from-blue-500 to-indigo-600' },
  { code: 'USDT', name: 'Tether USD', symbol: '₮', type: 'crypto', decimals: 2, isStablecoin: true, iconBg: 'from-emerald-500 to-teal-600' },
  { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat', decimals: 2, isStablecoin: true, iconBg: 'from-green-600 to-emerald-600' },
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', decimals: 2, isStablecoin: false, iconBg: 'from-blue-600 to-cyan-600' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', decimals: 8, isStablecoin: false, iconBg: 'from-amber-500 to-orange-600' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', decimals: 6, isStablecoin: false, iconBg: 'from-indigo-500 to-purple-600' },
  { code: 'SOL', name: 'Solana', symbol: '◎', type: 'crypto', decimals: 4, isStablecoin: false, iconBg: 'from-purple-500 to-pink-600' },
  { code: 'LTC', name: 'Litecoin', symbol: 'Ł', type: 'crypto', decimals: 4, isStablecoin: false, iconBg: 'from-slate-400 to-slate-600' },
  { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð', type: 'crypto', decimals: 2, isStablecoin: false, iconBg: 'from-yellow-500 to-amber-600' },
  { code: 'TRX', name: 'Tron', symbol: 'TRX', type: 'crypto', decimals: 2, isStablecoin: false, iconBg: 'from-red-500 to-rose-600' },
  { code: 'BCH', name: 'Bitcoin Cash', symbol: 'BCH', type: 'crypto', decimals: 6, isStablecoin: false, iconBg: 'from-emerald-600 to-green-700' },
  { code: 'XRP', name: 'Ripple', symbol: 'XRP', type: 'crypto', decimals: 4, isStablecoin: false, iconBg: 'from-cyan-600 to-blue-700' },
  { code: 'BNB', name: 'BNB', symbol: 'BNB', type: 'crypto', decimals: 4, isStablecoin: false, iconBg: 'from-yellow-500 to-amber-700' },
  { code: 'MATIC', name: 'Polygon', symbol: 'POL', type: 'crypto', decimals: 4, isStablecoin: false, iconBg: 'from-purple-600 to-violet-700' },
];

export const SUPPORTED_CURRENCIES = STAKE_AVAILABLE_CURRENCIES.map((c) => c.code);

export const DEFAULT_WALLET_BALANCES: Record<string, number> = {
  USDC: 100.00,
  USDT: 100.00,
  USD: 100.00,
  EUR: 92.50,
  BTC: 0.0045,
  ETH: 0.065,
  SOL: 1.25,
  LTC: 1.40,
  DOGE: 450.0,
  TRX: 680.0,
  BCH: 0.25,
  XRP: 150.0,
  BNB: 0.15,
  MATIC: 200.0,
};

export function getCurrencyInfo(code: string): StakeCurrencyInfo {
  const upper = (code || 'USDC').toUpperCase();
  const found = STAKE_AVAILABLE_CURRENCIES.find((c) => c.code === upper);
  return found || {
    code: upper,
    name: upper,
    symbol: upper,
    type: 'crypto',
    decimals: 4,
    isStablecoin: false,
  };
}
