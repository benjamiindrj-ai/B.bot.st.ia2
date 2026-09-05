import { UserLicenseState, LicensePlan } from '../types';

export const DEFAULT_MAX_FREE_DAILY_BETS = 50;
const STORAGE_KEY = 'stake_ai_bot_license_state';

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getDefaultFreeLicenseState(): UserLicenseState {
  return {
    isPro: false,
    plan: 'free',
    planName: 'Essai Gratuit',
    expiresAt: null,
    features: [
      '50 paris automatiques par jour',
      'Stratégies basiques (Bouclier Anti-Perte, Croissance Équilibrée)',
      'Télémétrie standard',
    ],
    isAdmin: false,
    freeDailyBetsRemaining: DEFAULT_MAX_FREE_DAILY_BETS,
    maxFreeDailyBets: DEFAULT_MAX_FREE_DAILY_BETS,
    lastResetDate: getTodayDateString(),
  };
}

/**
 * Load current license state from localStorage with daily quota reset & expiration check
 */
export function loadLicenseState(): UserLicenseState {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = getDefaultFreeLicenseState();
      saveLicenseState(fresh);
      return fresh;
    }

    const state: UserLicenseState = JSON.parse(raw);

    // 1. Check expiration if Pro
    if (state.isPro && state.expiresAt && Date.now() > state.expiresAt) {
      console.warn('[License] Your VIP Pro license has expired. Reverting to Free.');
      const expiredToFree: UserLicenseState = {
        ...getDefaultFreeLicenseState(),
        freeDailyBetsRemaining: DEFAULT_MAX_FREE_DAILY_BETS,
        lastResetDate: today,
      };
      saveLicenseState(expiredToFree);
      return expiredToFree;
    }

    // 2. Check Daily Free Quota reset
    if (state.lastResetDate !== today) {
      state.freeDailyBetsRemaining = state.maxFreeDailyBets || DEFAULT_MAX_FREE_DAILY_BETS;
      state.lastResetDate = today;
      saveLicenseState(state);
    }

    return state;
  } catch (err) {
    console.error('Failed to load license state from storage:', err);
    return getDefaultFreeLicenseState();
  }
}

/**
 * Persist license state to localStorage
 */
export function saveLicenseState(state: UserLicenseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save license state:', err);
  }
}

/**
 * Verify a license key with backend server
 */
export async function verifyLicenseKeyOnline(
  rawKey: string
): Promise<{ success: boolean; state: UserLicenseState; message: string }> {
  try {
    const response = await fetch('/api/license/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: rawKey.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.valid) {
      const currentState = loadLicenseState();
      const updated: UserLicenseState = {
        isPro: true,
        licenseKey: data.key,
        plan: data.plan,
        planName: data.planName,
        activatedAt: data.activatedAt || Date.now(),
        expiresAt: data.expiresAt,
        features: data.features || [],
        isAdmin: !!data.isAdmin,
        freeDailyBetsRemaining: Infinity,
        maxFreeDailyBets: Infinity,
        lastResetDate: getTodayDateString(),
      };

      saveLicenseState(updated);
      return { success: true, state: updated, message: data.message };
    }

    return {
      success: false,
      state: loadLicenseState(),
      message: data.message || 'Clé de licence invalide.',
    };
  } catch (err: any) {
    console.error('License verification network error:', err);
    return {
      success: false,
      state: loadLicenseState(),
      message: 'Impossible de contacter le serveur de validation. Vérifiez votre connexion.',
    };
  }
}

/**
 * Consume 1 bet for free trial quota
 */
export function consumeFreeBet(): { allowed: boolean; remaining: number; reason?: string } {
  const state = loadLicenseState();

  if (state.isPro) {
    return { allowed: true, remaining: Infinity };
  }

  if (state.freeDailyBetsRemaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: `Quota d'essai gratuit épuisé (${state.maxFreeDailyBets}/${state.maxFreeDailyBets} paris atteints aujourd'hui). Passez en VIP Pro pour un accès illimité.`,
    };
  }

  const updated: UserLicenseState = {
    ...state,
    freeDailyBetsRemaining: Math.max(0, state.freeDailyBetsRemaining - 1),
  };

  saveLicenseState(updated);
  return { allowed: true, remaining: updated.freeDailyBetsRemaining };
}

/**
 * Remove license (revert to Free)
 */
export function removeActiveLicense(): UserLicenseState {
  const fresh = getDefaultFreeLicenseState();
  saveLicenseState(fresh);
  return fresh;
}

/**
 * Generate a new VIP key (Admin only)
 */
export async function generateAdminLicenseKey(
  adminKey: string,
  plan: 'vip_monthly' | 'vip_yearly' | 'vip_lifetime',
  clientNote?: string
): Promise<{ success: boolean; generated?: any; message: string }> {
  try {
    const res = await fetch('/api/license/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey, plan, clientNote }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, message: data.error || 'Erreur lors de la génération de clé' };
    }

    return { success: true, generated: data.generated, message: data.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erreur réseau' };
  }
}

/**
 * Feature gate check
 */
export function isFeatureAllowed(
  feature: 'autonomous_brain' | 'barbell_sniper' | 'gemini_audit' | 'unlimited_bets',
  state: UserLicenseState
): boolean {
  if (state.isPro) return true;
  return false;
}
