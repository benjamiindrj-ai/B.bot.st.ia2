export interface StakeDomainItem {
  domain: string;
  name: string;
  category: 'main' | 'official_mirror' | 'playstake' | 'regional' | 'alt_mirror';
  categoryLabel: string;
  description: string;
  region: string;
  flagEmoji?: string;
  isPopular?: boolean;
  notes?: string;
}

export const STAKE_MIRROR_DOMAINS: StakeDomainItem[] = [
  // --- SITES PRINCIPAUX & OFFICIELS ---
  {
    domain: 'stake.com',
    name: 'Stake.com (Principal International)',
    category: 'main',
    categoryLabel: 'Domaines Principaux',
    description: 'Site principal international (Casino Crypto & Sportsbook mondial)',
    region: 'Global / International',
    flagEmoji: '🌐',
    isPopular: true,
  },
  {
    domain: 'stake.us',
    name: 'Stake.us (US Social Casino)',
    category: 'main',
    categoryLabel: 'Domaines Principaux',
    description: 'Plateforme Sweepstakes officielle réservée aux États-Unis',
    region: 'États-Unis (US)',
    flagEmoji: '🇺🇸',
    isPopular: true,
  },
  {
    domain: 'stake.bet',
    name: 'Stake.bet (Miroir Officiel #1)',
    category: 'official_mirror',
    categoryLabel: 'Miroirs Officiels Recommandés',
    description: 'Miroir officiel le plus rapide en Europe (France, Belgique, etc.)',
    region: 'Europe & International',
    flagEmoji: '🇪🇺',
    isPopular: true,
  },
  {
    domain: 'stake.games',
    name: 'Stake.games (Miroir Officiel #2)',
    category: 'official_mirror',
    categoryLabel: 'Miroirs Officiels Recommandés',
    description: 'Miroir officiel mondial optimisé pour les Stake Originals & Live',
    region: 'Global / International',
    flagEmoji: '🎮',
    isPopular: true,
  },

  // --- PLAYSTAKE MIRRORS ---
  {
    domain: 'playstake.club',
    name: 'Playstake.club (Miroir Officiel)',
    category: 'playstake',
    categoryLabel: 'Miroirs PlayStake',
    description: 'Miroir direct PlayStake optimisé pour contourner les restrictions FAI',
    region: 'Global / Anti-censure',
    flagEmoji: '🛡️',
    isPopular: true,
  },
  {
    domain: 'playstake.io',
    name: 'Playstake.io (Miroir Officiel)',
    category: 'playstake',
    categoryLabel: 'Miroirs PlayStake',
    description: 'Passerelle miroir sécurisée haute vitesse',
    region: 'Global',
    flagEmoji: '⚡',
    isPopular: true,
  },
  {
    domain: 'playstake.co',
    name: 'Playstake.co (Miroir Alternatif)',
    category: 'playstake',
    categoryLabel: 'Miroirs PlayStake',
    description: 'Miroir d\'appoint officiel',
    region: 'Global',
    flagEmoji: '🔒',
  },

  // --- MIROIRS RÉGIONAUX OFFICIELS ---
  {
    domain: 'staketr.com',
    name: 'Staketr.com (Turquie / TR)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir officiel dédié à la Turquie et Moyen-Orient',
    region: 'Turquie / TR',
    flagEmoji: '🇹🇷',
  },
  {
    domain: 'staketr2.com',
    name: 'Staketr2.com (Miroir TR #2)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir secondaire régional TR',
    region: 'Turquie / TR',
    flagEmoji: '🇹🇷',
  },
  {
    domain: 'staketr3.com',
    name: 'Staketr3.com (Miroir TR #3)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir secondaire régional TR',
    region: 'Turquie / TR',
    flagEmoji: '🇹🇷',
  },
  {
    domain: 'staketr4.com',
    name: 'Staketr4.com (Miroir TR #4)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir régional TR',
    region: 'Turquie / TR',
    flagEmoji: '🇹🇷',
  },
  {
    domain: 'staketr5.com',
    name: 'Staketr5.com (Miroir TR #5)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir régional TR',
    region: 'Turquie / TR',
    flagEmoji: '🇹🇷',
  },
  {
    domain: 'stake.pe',
    name: 'Stake.pe (Pérou / LATAM)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir officiel Amérique Latine & Pérou',
    region: 'Pérou / LATAM',
    flagEmoji: '🇵🇪',
  },
  {
    domain: 'stake.id',
    name: 'Stake.id (Indonésie / Asie)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir optimisé pour la zone Asie du Sud-Est',
    region: 'Indonésie / Asie',
    flagEmoji: '🇮🇩',
  },
  {
    domain: 'stake.jp',
    name: 'Stake.jp (Japon)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir dédié aux joueurs japonais',
    region: 'Japon',
    flagEmoji: '🇯🇵',
  },
  {
    domain: 'stake.vin',
    name: 'Stake.vin (Vietnam / Asie)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir régional officiel Asie / Vietnam',
    region: 'Vietnam / Asie',
    flagEmoji: '🇻🇳',
  },
  {
    domain: 'stake.krd',
    name: 'Stake.krd (Moyen-Orient)',
    category: 'regional',
    categoryLabel: 'Miroirs Régionaux',
    description: 'Miroir régional Moyen-Orient',
    region: 'Moyen-Orient',
    flagEmoji: '🌍',
  },

  // --- MIROIRS ALTERNATIFS OFFICIELS & ANTI-BLOCAGE ---
  {
    domain: 'stake.bz',
    name: 'Stake.bz (Miroir Belize / Global)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir officiel rapide haute disponibilité',
    region: 'Global / LATAM',
    flagEmoji: '🇧🇿',
    isPopular: true,
  },
  {
    domain: 'stake.ceo',
    name: 'Stake.ceo (Miroir Officiel)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '💼',
  },
  {
    domain: 'stake.icu',
    name: 'Stake.icu (Miroir Officiel)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '👁️',
  },
  {
    domain: 'stake.ac',
    name: 'Stake.ac (Miroir Officiel)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '✨',
  },
  {
    domain: 'stake.vip',
    name: 'Stake.vip (Miroir VIP)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif VIP',
    region: 'Global',
    flagEmoji: '👑',
  },
  {
    domain: 'stake.mba',
    name: 'Stake.mba (Miroir Officiel)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🎓',
  },
  {
    domain: 'stake.zone',
    name: 'Stake.zone (Miroir Zone)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🎯',
  },
  {
    domain: 'stake.pink',
    name: 'Stake.pink (Miroir Pink)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🌸',
  },
  {
    domain: 'stake.uno',
    name: 'Stake.uno (Miroir Uno)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🃏',
  },
  {
    domain: 'stake.run',
    name: 'Stake.run (Miroir Run)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🏃',
  },
  {
    domain: 'stake.live',
    name: 'Stake.live (Miroir Live)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🔴',
  },
  {
    domain: 'stake.fund',
    name: 'Stake.fund (Miroir Fund)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '💰',
  },
  {
    domain: 'stake.bar',
    name: 'Stake.bar (Miroir Bar)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🍸',
  },
  {
    domain: 'stake.tax',
    name: 'Stake.tax (Miroir Tax)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '📊',
  },
  {
    domain: 'stake.is',
    name: 'Stake.is (Miroir Is)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '🇮🇸',
  },
  {
    domain: 'stake1001.com',
    name: 'Stake1001.com (Miroir Numéroté #1001)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir numérique officiel Stake',
    region: 'Global',
    flagEmoji: '🔢',
  },
  {
    domain: 'stake1002.com',
    name: 'Stake1002.com (Miroir Numéroté #1002)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir numérique officiel Stake',
    region: 'Global',
    flagEmoji: '🔢',
  },
  {
    domain: 'stake1003.com',
    name: 'Stake1003.com (Miroir Numéroté #1003)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir numérique officiel Stake',
    region: 'Global',
    flagEmoji: '🔢',
  },
  {
    domain: 'stake1020.com',
    name: 'Stake1020.com (Miroir Numéroté #1020)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir numérique officiel Stake',
    region: 'Global',
    flagEmoji: '🔢',
  },
  {
    domain: 'stake1021.com',
    name: 'Stake1021.com (Miroir Numéroté #1021)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir numérique officiel Stake',
    region: 'Global',
    flagEmoji: '🔢',
  },
  {
    domain: 'stake-crypto.com',
    name: 'Stake-crypto.com (Passerelle Crypto)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Passerelle miroir orientée dépôts/retraits crypto',
    region: 'Global',
    flagEmoji: '🪙',
  },
  {
    domain: 'stakemillion.com',
    name: 'Stakemillion.com (Miroir Million)',
    category: 'alt_mirror',
    categoryLabel: 'Miroirs Alternatifs & Anti-Blocage',
    description: 'Miroir alternatif officiel',
    region: 'Global',
    flagEmoji: '💎',
  },
];

/**
 * Nettoie une chaîne de domaine pour obtenir un nom de domaine ou hôte propre
 * Ex: "https://stake.bet/sports" -> "stake.bet"
 */
export function cleanStakeDomain(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return 'stake.com';
  let cleaned = raw.trim().toLowerCase();
  
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Remove trailing slashes and paths
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  // Remove trailing dots
  cleaned = cleaned.replace(/\.+$/, '');

  return cleaned || 'stake.com';
}

/**
 * Vérifie si le domaine fait partie des miroirs officiels recensés
 */
export function isKnownStakeMirror(domain: string): boolean {
  const cleaned = cleanStakeDomain(domain);
  return STAKE_MIRROR_DOMAINS.some(d => d.domain === cleaned);
}

/**
 * Récupère les métadonnées d'un domaine ou des valeurs par défaut si miroir personnalisé
 */
export function getStakeDomainInfo(domain: string): StakeDomainItem {
  const cleaned = cleanStakeDomain(domain);
  const found = STAKE_MIRROR_DOMAINS.find(d => d.domain === cleaned);
  if (found) return found;

  return {
    domain: cleaned,
    name: `${cleaned} (Miroir Personnalisé)`,
    category: 'alt_mirror',
    categoryLabel: 'Miroir Personnalisé / Privé',
    description: 'Miroir ou proxy configuré manuellement',
    region: 'Personnalisé',
    flagEmoji: '🌐',
  };
}

/**
 * Groupes de miroirs pour les menus déroulants
 */
export const STAKE_DOMAIN_GROUPS = [
  {
    label: '⭐ Principaux & Recommandés',
    domains: STAKE_MIRROR_DOMAINS.filter(d => d.isPopular),
  },
  {
    label: '🛡️ Miroirs PlayStake Anti-Blocage',
    domains: STAKE_MIRROR_DOMAINS.filter(d => d.category === 'playstake'),
  },
  {
    label: '🌍 Miroirs Régionaux (TR, LATAM, Asie, Japon...)',
    domains: STAKE_MIRROR_DOMAINS.filter(d => d.category === 'regional'),
  },
  {
    label: '🔄 Miroirs Alternatifs & Anti-Censure',
    domains: STAKE_MIRROR_DOMAINS.filter(d => d.category === 'alt_mirror' && !d.isPopular),
  },
];
