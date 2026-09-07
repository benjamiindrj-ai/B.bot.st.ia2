import crypto from 'crypto';

export type LicensePlan = 'free' | 'vip_monthly' | 'vip_3months' | 'vip_6months' | 'vip_yearly' | 'vip_lifetime' | 'admin';

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

export interface ActiveLicenseRecord {
  id: string;
  key: string;
  username: string;
  plan: LicensePlan;
  planName: string;
  createdAt: number;
  expiresAt: number | null;
  status: 'active' | 'expired' | 'revoked';
  notes?: string;
}

const LICENSE_SECRET = process.env.LICENSE_SECRET_KEY || 'STAKE_AI_BOT_SECRET_SIGNATURE_SALT_2026';
const ADMIN_MASTER_KEY = (process.env.ADMIN_MASTER_KEY || 'ADMIN-MASTER-VIP-2026').trim();

// List of all recognized admin master keys
const RECOGNIZED_ADMIN_KEYS = new Set(
  [
    'ADMIN-MASTER-VIP-2026',
    'ADMIN-MASTER-VIP',
    'ADMIN',
    '134679',
    ADMIN_MASTER_KEY.toUpperCase(),
  ].filter(Boolean)
);

export function isRecognizedAdminKey(candidateKey?: string | null): boolean {
  if (!candidateKey) return false;
  const clean = candidateKey.trim().toUpperCase();
  return RECOGNIZED_ADMIN_KEYS.has(clean) || (Boolean(process.env.ADMIN_MASTER_KEY) && clean === (process.env.ADMIN_MASTER_KEY || '').trim().toUpperCase());
}

// In-memory active managed licenses with sample realistic records
let MANAGED_LICENSES: ActiveLicenseRecord[] = [
  {
    id: 'lic-seed-1',
    key: 'VIP-LIFETIME-ALEX77-8B3F9A21',
    username: 'Alex_StakePro',
    plan: 'vip_lifetime',
    planName: 'VIP Pro Élite (À Vie)',
    createdAt: Date.now() - 15 * 86400000,
    expiresAt: null,
    status: 'active',
    notes: 'Souscription VIP fondateur illimitée',
  },
  {
    id: 'lic-seed-2',
    key: 'VIP-YEARLY-WOLF99-7A4C1D9E',
    username: 'CryptoWolf99',
    plan: 'vip_yearly',
    planName: 'VIP Pro Annuel (365 Jours)',
    createdAt: Date.now() - 45 * 86400000,
    expiresAt: Date.now() + 320 * 86400000,
    status: 'active',
    notes: 'Pass annuel - Bot Spectre & Sniper',
  },
  {
    id: 'lic-seed-3',
    key: 'VIP-MONTHLY-TRADER-9F2E3A4B',
    username: 'Marc_Trader',
    plan: 'vip_monthly',
    planName: 'VIP Pro Mensuel (30 Jours)',
    createdAt: Date.now() - 5 * 86400000,
    expiresAt: Date.now() + 25 * 86400000,
    status: 'active',
    notes: 'Renouvellement mensuel',
  }
];

export function getManagedLicenses(): ActiveLicenseRecord[] {
  // Update expired status dynamically
  const now = Date.now();
  return MANAGED_LICENSES.map((lic) => {
    if (lic.status === 'active' && lic.expiresAt && now > lic.expiresAt) {
      return { ...lic, status: 'expired' as const };
    }
    return lic;
  });
}

export function addManagedLicense(record: Partial<ActiveLicenseRecord> & { key: string; username: string }): ActiveLicenseRecord {
  const newRecord: ActiveLicenseRecord = {
    id: `lic-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    key: record.key.trim().toUpperCase(),
    username: (record.username || 'Utilisateur VIP').trim(),
    plan: (record.plan as LicensePlan) || 'vip_monthly',
    planName: record.planName || 'VIP Pro Mensuel',
    createdAt: record.createdAt || Date.now(),
    expiresAt: record.expiresAt !== undefined ? record.expiresAt : Date.now() + 30 * 86400000,
    status: record.status || 'active',
    notes: record.notes || '',
  };

  // Prepend so latest appears first
  MANAGED_LICENSES = [newRecord, ...MANAGED_LICENSES.filter(l => l.key !== newRecord.key)];
  return newRecord;
}

export function updateManagedLicense(id: string, updates: Partial<ActiveLicenseRecord>): ActiveLicenseRecord | null {
  const index = MANAGED_LICENSES.findIndex(l => l.id === id);
  if (index === -1) return null;

  MANAGED_LICENSES[index] = {
    ...MANAGED_LICENSES[index],
    ...updates,
  };
  return MANAGED_LICENSES[index];
}

export function deleteManagedLicense(id: string): boolean {
  const initialLen = MANAGED_LICENSES.length;
  MANAGED_LICENSES = MANAGED_LICENSES.filter(l => l.id !== id);
  return MANAGED_LICENSES.length < initialLen;
}

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
  plan: 'vip_monthly' | 'vip_3months' | 'vip_6months' | 'vip_yearly' | 'vip_lifetime' = 'vip_monthly',
  customerUsername: string = 'client',
  customDays?: number
): { key: string; plan: LicensePlan; planName: string; expiresAt: number | null; username: string } {
  const nonce = Math.floor(1000 + Math.random() * 9000);
  const cleanUser = customerUsername.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() || 'VIP';

  let prefix = 'VIP-MONTHLY';
  let planName = 'VIP Pro Mensuel (30 Jours)';
  let durationDays: number | null = 30;

  if (plan === 'vip_3months') {
    prefix = 'VIP-3MONTHS';
    planName = 'VIP Pro Trimestriel (90 Jours)';
    durationDays = 90;
  } else if (plan === 'vip_6months') {
    prefix = 'VIP-6MONTHS';
    planName = 'VIP Pro Semestriel (180 Jours)';
    durationDays = 180;
  } else if (plan === 'vip_yearly') {
    prefix = 'VIP-YEARLY';
    planName = 'VIP Pro Annuel (365 Jours)';
    durationDays = 365;
  } else if (plan === 'vip_lifetime') {
    prefix = 'VIP-LIFETIME';
    planName = 'VIP Pro Élite (Accès Illimité à Vie)';
    durationDays = null;
  }

  if (customDays && customDays > 0) {
    durationDays = customDays;
    planName = `VIP Pro (${customDays} Jours)`;
  }

  const payload = `${prefix}:${cleanUser}:${nonce}`;
  const sig = computeKeySignature(payload);
  const key = `${prefix}-${cleanUser}${nonce}-${sig}`;

  const expiresAt = durationDays ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null;

  // Automatically register into managed licenses list
  addManagedLicense({
    key,
    username: customerUsername.trim() || 'Client VIP',
    plan,
    planName,
    createdAt: Date.now(),
    expiresAt,
    status: 'active',
    notes: `Généré automatiquement (${planName})`,
  });

  return {
    key,
    plan,
    planName,
    expiresAt,
    username: customerUsername.trim() || 'Client VIP',
  };
}

/**
 * Verify any license key (managed, pre-seeded, dynamic HMAC, or Admin Master)
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
  if (isRecognizedAdminKey(cleanKey)) {
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
        'Générateur de clés de licence VIP (Mois, Année, À vie)',
        'Gestionnaire des clés actives & utilisateurs',
        'Déblocage complet du Cerveau IA et de tous les jeux',
        'Audit IA Gemini illimité',
      ],
      message: 'Clé Administrateur validée ! Console Administrateur et générateur VIP débloqués.',
    };
  }

  // 2. Check Managed Licenses list (stored by admin)
  const managedMatch = MANAGED_LICENSES.find(l => l.key.toUpperCase() === cleanKey);
  if (managedMatch) {
    if (managedMatch.status === 'revoked') {
      return {
        valid: false,
        plan: 'free',
        planName: 'Essai Gratuit',
        expiresAt: null,
        features: [],
        message: 'Cette clé de licence a été révoquée par l\'administrateur.',
      };
    }
    if (managedMatch.expiresAt && Date.now() > managedMatch.expiresAt) {
      managedMatch.status = 'expired';
      return {
        valid: false,
        plan: 'free',
        planName: 'Essai Gratuit',
        expiresAt: null,
        features: [],
        message: 'Cette clé de licence a expiré. Contactez l\'administrateur pour renouveler votre accès.',
      };
    }

    return {
      valid: true,
      key: cleanKey,
      plan: managedMatch.plan,
      planName: managedMatch.planName,
      activatedAt: managedMatch.createdAt,
      expiresAt: managedMatch.expiresAt,
      features: [
        'Paris automatiques 100% illimités (aucun quota)',
        'Cerveau IA Spectre Dynamique (1.33x – 7.77x)',
        'Matrice de transition Markov P(W|W) & Surge Momentum',
        'Couloir de reconstitution haute certitude',
        'Micro-tirs Sniper Barbell asymétriques',
        'Rotation multi-jeux anti-clustering',
        'Audit Stratégique IA Gemini en continu',
      ],
      message: `Licence VIP validée pour ${managedMatch.username} (${managedMatch.planName})`,
    };
  }

  // 3. Check Pre-seeded permanent keys
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

  // 4. Check Cryptographic dynamic keys (e.g. VIP-LIFETIME-PRO1234-A1B2C3D4)
  const parts = cleanKey.split('-');
  if (parts.length >= 3) {
    const prefix = `${parts[0]}-${parts[1]}`; // e.g. VIP-LIFETIME, VIP-YEARLY, VIP-MONTHLY, VIP-3MONTHS, VIP-6MONTHS
    const noteAndNonce = parts[2];
    const providedSig = parts[3] || '';

    const expectedSig = computeKeySignature(`${prefix}:${noteAndNonce}`);

    if (providedSig === expectedSig) {
      let plan: LicensePlan = 'vip_monthly';
      let planName = 'VIP Pro Mensuel (30 Jours)';
      let durationDays: number | null = 30;

      if (prefix === 'VIP-3MONTHS') {
        plan = 'vip_3months';
        planName = 'VIP Pro Trimestriel (90 Jours)';
        durationDays = 90;
      } else if (prefix === 'VIP-6MONTHS') {
        plan = 'vip_6months';
        planName = 'VIP Pro Semestriel (180 Jours)';
        durationDays = 180;
      } else if (prefix === 'VIP-YEARLY') {
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
