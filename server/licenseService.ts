import crypto from 'crypto';

export type LicensePlan = 'free' | 'vip_monthly' | 'vip_yearly' | 'vip_lifetime' | 'admin';

export interface LicenseVerificationResult {
  valid: boolean;
  key?: string;
  plan: LicensePlan;
  planName: string;
  activatedAt?: number;
  expiresAt: number | null; // null = lifetime or admin
  features: string[];
  message: string;
  isAdmin?: boolean;
}

const LICENSE_SECRET = process.env.LICENSE_SECRET_KEY || 'STAKE_AI_BOT_SECRET_SIGNATURE_SALT_2026';
const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY || 'ADMIN-MASTER-VIP-2026';

// Pre-seeded permanent keys for instant testing and distribution
const PRESEEDED_KEYS: Record<string, { plan: LicensePlan; planName: string; durationDays: number | null; features: string[] }> = {
  // Lifetime Access Key (for VIP buyers)
  'VIP-PRO-LIFETIME-STAKE-2026': {
    plan: 'vip_lifetime',
    planName: 'VIP Pro Élite (Accès Illimité à Vie)',
    durationDays: null,
    features: [
      'Paris automatiques 100% illimités (aucun quota)',
      'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
      'Matrice de transition Markov P(W|W) & Surge Momentum',
      'Couloir de reconstitution haute certitude (75% - 85% win)',
      'Micro-tirs Sniper Barbell asymétriques (10x - 25x)',
      'Rotation anti-clustering multi-jeux (Dice, Limbo, Mines, Plinko)',
      'Audit Stratégique IA Gemini en continu',
      'Accès prioritaire à toutes les futures mises à jour',
    ],
  },
  // Annual Access Key (365 days)
  'VIP-PRO-ANNUAL-ALPHA-777': {
    plan: 'vip_yearly',
    planName: 'VIP Pro Annuel (365 Jours)',
    durationDays: 365,
    features: [
      'Paris automatiques 100% illimités',
      'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
      'Matrice de transition Markov & Surge Momentum',
      'Couloir de reconstitution haute certitude',
      'Rotation multi-jeux intelligente',
      'Audit Stratégique IA Gemini',
    ],
  },
  // Monthly Access Key (30 days)
  'VIP-PRO-MONTHLY-BETA-333': {
    plan: 'vip_monthly',
    planName: 'VIP Pro Mensuel (30 Jours)',
    durationDays: 30,
    features: [
      'Paris automatiques illimités pendant 30 jours',
      'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
      'Matrice de transition Markov',
      'Couloir de reconstitution haute certitude',
    ],
  },
};

/**
 * Generate a cryptographic HMAC hash for dynamic license keys
 */
function computeKeySignature(payload: string): string {
  return crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

/**
 * Dynamically generate a new valid license key for customers
 */
export function generateNewLicenseKey(
  plan: 'vip_monthly' | 'vip_yearly' | 'vip_lifetime',
  customerNote: string = 'client'
): { key: string; plan: LicensePlan; planName: string; expiresAt: number | null } {
  const nonce = Math.floor(1000 + Math.random() * 9000);
  const cleanNote = customerNote.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || 'PRO';

  let prefix = 'VIP-MONTHLY';
  let planName = 'VIP Pro Mensuel (30 Jours)';
  let durationDays: number | null = 30;

  if (plan === 'vip_yearly') {
    prefix = 'VIP-YEARLY';
    planName = 'VIP Pro Annuel (365 Jours)';
    durationDays = 365;
  } else if (plan === 'vip_lifetime') {
    prefix = 'VIP-LIFETIME';
    planName = 'VIP Pro Élite (Accès Illimité à Vie)';
    durationDays = null;
  }

  const payload = `${prefix}:${cleanNote}:${nonce}`;
  const sig = computeKeySignature(payload);
  const key = `${prefix}-${cleanNote}${nonce}-${sig}`;

  const expiresAt = durationDays ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null;

  return {
    key,
    plan,
    planName,
    expiresAt,
  };
}

/**
 * Verify any license key (pre-seeded, dynamic HMAC, or Admin Master)
 */
export function verifyLicenseKey(rawKey: string): LicenseVerificationResult {
  const cleanKey = (rawKey || '').trim().toUpperCase();

  if (!cleanKey) {
    return {
      valid: false,
      plan: 'free',
      planName: 'Essai Gratuit',
      expiresAt: null,
      features: ['50 paris d\'essai gratuits / jour', 'Stratégies de base (Bouclier & D\'Alembert)'],
      message: 'Veuillez saisir une clé de licence valide.',
    };
  }

  // 1. Check Admin Master Key
  if (cleanKey === ADMIN_MASTER_KEY.toUpperCase()) {
    return {
      valid: true,
      key: cleanKey,
      plan: 'admin',
      planName: 'Accès Administrateur / Créateur',
      activatedAt: Date.now(),
      expiresAt: null,
      isAdmin: true,
      features: [
        'Accès Administrateur Total Illimité',
        'Générateur de clés de licence VIP intégré',
        'Déblocage complet du Cerveau IA et de tous les jeux',
        'Audit IA Gemini illimité',
      ],
      message: 'Clé Administrateur reconnue ! Accès complet et générateur de clés activés.',
    };
  }

  // 2. Check Pre-seeded permanent keys
  if (PRESEEDED_KEYS[cleanKey]) {
    const info = PRESEEDED_KEYS[cleanKey];
    const activatedAt = Date.now();
    const expiresAt = info.durationDays ? activatedAt + info.durationDays * 24 * 60 * 60 * 1000 : null;

    return {
      valid: true,
      key: cleanKey,
      plan: info.plan,
      planName: info.planName,
      activatedAt,
      expiresAt,
      features: info.features,
      message: `Félicitations ! Votre licence "${info.planName}" est validée avec succès.`,
    };
  }

  // 3. Check Cryptographic dynamic keys (e.g. VIP-LIFETIME-PRO1234-A1B2C3D4)
  const parts = cleanKey.split('-');
  if (parts.length >= 3) {
    const prefix = `${parts[0]}-${parts[1]}`; // e.g. VIP-LIFETIME, VIP-YEARLY, VIP-MONTHLY
    const noteAndNonce = parts[2];
    const providedSig = parts[3] || '';

    const expectedSig = computeKeySignature(`${prefix}:${noteAndNonce}`);

    if (providedSig === expectedSig) {
      let plan: LicensePlan = 'vip_monthly';
      let planName = 'VIP Pro Mensuel (30 Jours)';
      let durationDays: number | null = 30;

      if (prefix === 'VIP-YEARLY') {
        plan = 'vip_yearly';
        planName = 'VIP Pro Annuel (365 Jours)';
        durationDays = 365;
      } else if (prefix === 'VIP-LIFETIME') {
        plan = 'vip_lifetime';
        planName = 'VIP Pro Élite (Accès Illimité à Vie)';
        durationDays = null;
      }

      const activatedAt = Date.now();
      const expiresAt = durationDays ? activatedAt + durationDays * 24 * 60 * 60 * 1000 : null;

      return {
        valid: true,
        key: cleanKey,
        plan,
        planName,
        activatedAt,
        expiresAt,
        features: [
          'Paris automatiques 100% illimités',
          'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
          'Matrice Markov & Surge Momentum',
          'Couloir de reconstitution haute certitude',
          'Rotation anti-clustering multi-jeux',
        ],
        message: `Licence cryptographique valide : ${planName}`,
      };
    }
  }

  return {
    valid: false,
    plan: 'free',
    planName: 'Essai Gratuit',
    expiresAt: null,
    features: ['50 paris d\'essai gratuits / jour'],
    message: 'Clé de licence invalide ou non reconnue. Vérifiez votre code ou contactez le support.',
  };
}
