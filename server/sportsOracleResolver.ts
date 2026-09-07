import { GoogleGenAI } from '@google/genai';

export interface ScoreboardEvent {
  id: string;
  externalId?: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey' | 'baseball' | 'rugby' | 'other';
  match: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  dateKey?: string; // YYYY-MM-DD
  timestamp: number;
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
  homeScore: number;
  awayScore: number;
  displayScore: string;
  clock: string;
  winner?: 'home' | 'away' | 'draw';
  statusDetail?: string;
  setsOrPeriods?: string[];
  source: string;
  matchedVerificationMethod?: 'event_id_exact' | 'bilateral_teams_and_date';
}

export interface BetEvaluationResult {
  id: string;
  status: 'won' | 'lost' | 'void' | 'pending';
  finalScore: string;
  resolutionNotes: string;
  isMatchFinished: boolean;
  autoResolved: boolean;
  resolvedAt?: number;
  sourceBadge?: string;
  verifiedEventId?: string;
  verifiedEventDate?: string;
  auditVerificationMethod?: 'event_id_exact' | 'bilateral_teams_and_date' | 'grounded_search_verified' | 'unresolved_pending';
}

// In-memory cache for recent scoreboards
let scoreboardCache: { timestamp: number; events: ScoreboardEvent[] } | null = null;
const CACHE_TTL_MS = 45 * 1000; // 45 seconds cache

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Curated Team name aliases & abbreviations for accurate matching
const TEAM_ALIASES: Record<string, string[]> = {
  'real madrid': ['real madrid', 'r. madrid', 'real madrid cf', 'rmcf', 'los blancos'],
  'atletico madrid': ['atletico madrid', 'atletico de madrid', 'atlético madrid', 'atleti', 'atm', 'colchoneros'],
  'barcelona': ['fc barcelona', 'barcelona', 'barca', 'barça', 'blaugrana'],
  'paris saint-germain': ['paris saint-germain', 'paris sg', 'psg'],
  'paris fc': ['paris fc', 'pfc'],
  'olympique de marseille': ['olympique de marseille', 'marseille', 'om'],
  'olympique lyonnais': ['olympique lyonnais', 'lyon', 'ol'],
  'as monaco': ['as monaco', 'monaco', 'asm'],
  'borussia dortmund': ['borussia dortmund', 'dortmund', 'bvb', 'bvb 09'],
  'bayern munich': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
  'bayer leverkusen': ['bayer leverkusen', 'leverkusen', 'b04'],
  'manchester city': ['manchester city', 'man city', 'mcfc'],
  'manchester united': ['manchester united', 'man united', 'man utd', 'mufc'],
  'arsenal': ['arsenal', 'arsenal fc', 'gunners'],
  'liverpool': ['liverpool', 'liverpool fc', 'lfc', 'reds'],
  'chelsea': ['chelsea', 'chelsea fc', 'blues'],
  'tottenham hotspur': ['tottenham hotspur', 'tottenham', 'spurs'],
  'aston villa': ['aston villa', 'villa', 'avfc'],
  'newcastle united': ['newcastle united', 'newcastle', 'nufc', 'magpies'],
  'wolverhampton wanderers': ['wolverhampton wanderers', 'wolverhampton', 'wolves'],
  'juventus': ['juventus', 'juve', 'juventus fc', 'bianconeri'],
  'inter milan': ['inter milan', 'internazionale', 'inter', 'fc inter', 'nerazzurri'],
  'ac milan': ['ac milan', 'milan', 'rossoneri'],
  'as roma': ['as roma', 'roma', 'giallorossi'],
  'ssc napoli': ['ssc napoli', 'napoli', 'partenopei'],
  'sporting cp': ['sporting cp', 'sporting portugal', 'sporting lisbon'],
  'sl benfica': ['sl benfica', 'benfica', 'slb', 'aguias'],
  'fc porto': ['fc porto', 'porto', 'dragoes'],
  'al-hilal': ['al-hilal', 'al hilal'],
  'al-nassr': ['al-nassr', 'al nassr'],
  // Basketball NBA
  'boston celtics': ['boston celtics', 'celtics', 'boston'],
  'dallas mavericks': ['dallas mavericks', 'mavericks', 'mavs', 'dallas'],
  'golden state warriors': ['golden state warriors', 'warriors', 'gsw', 'golden state'],
  'los angeles lakers': ['los angeles lakers', 'lakers', 'lal'],
  'los angeles clippers': ['los angeles clippers', 'clippers', 'lac'],
  'denver nuggets': ['denver nuggets', 'nuggets', 'denver'],
  'milwaukee bucks': ['milwaukee bucks', 'bucks', 'milwaukee'],
  'philadelphia 76ers': ['philadelphia 76ers', '76ers', 'sixers', 'philly'],
  'new york knicks': ['new york knicks', 'knicks', 'ny knicks'],
  'miami heat': ['miami heat', 'heat', 'miami'],
  'oklahoma city thunder': ['oklahoma city thunder', 'thunder', 'okc'],
  'minnesota timberwolves': ['minnesota timberwolves', 'timberwolves', 't-wolves'],
  'phoenix suns': ['phoenix suns', 'suns', 'phoenix'],
  // Tennis
  'carlos alcaraz': ['carlos alcaraz', 'c. alcaraz', 'alcaraz'],
  'jannik sinner': ['jannik sinner', 'j. sinner', 'sinner'],
  'novak djokovic': ['novak djokovic', 'n. djokovic', 'djokovic'],
  'alexander zverev': ['alexander zverev', 'a. zverev', 'zverev'],
  'daniil medvedev': ['daniil medvedev', 'd. medvedev', 'medvedev'],
  'taylor fritz': ['taylor fritz', 't. fritz', 'fritz'],
  'casper ruud': ['casper ruud', 'c. ruud', 'ruud'],
  'stefanos tsitsipas': ['stefanos tsitsipas', 's. tsitsipas', 'tsitsipas'],
  'aryna sabalenka': ['aryna sabalenka', 'a. sabalenka', 'sabalenka'],
  'iga swiatek': ['iga swiatek', 'i. swiatek', 'swiatek'],
  'coco gauff': ['coco gauff', 'c. gauff', 'gauff'],
  // MMA / UFC
  'islam makhachev': ['islam makhachev', 'makhachev'],
  'jon jones': ['jon jones', 'jones'],
  'alex pereira': ['alex pereira', 'pereira'],
  'ilia topuria': ['ilia topuria', 'topuria'],
  'sean o\'malley': ['sean o\'malley', 'o\'malley'],
  'dricus du plessis': ['dricus du plessis', 'du plessis'],
};

/**
 * Clean & normalize a team/athlete name string for fuzzy matching.
 * Only strips non-distinctive generic prefixes/suffixes (fc, cf, sc, ac, club, etc.)
 * Preserves discriminators like city, united, real, atletico, saint-germain, etc.
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\b(fc|cf|ac|as|bc|rb|ssc|sc|cd|fk|sk|club|deportivo)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find canonical team key if matched in curated dictionary
 */
function getCanonicalTeam(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const norm = normalizeName(name);

  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    for (const al of aliases) {
      if (!al) continue;
      const normAl = normalizeName(al);
      if (lower === al || norm === normAl) return canonical;

      // Safe word boundary regex check
      if (al.length >= 4) {
        const regex = new RegExp(`(^|\\s)${escapeRegex(al)}(\\s|$)`, 'i');
        if (regex.test(lower)) return canonical;
      }
      if (normAl.length >= 4) {
        const regex = new RegExp(`(^|\\s)${escapeRegex(normAl)}(\\s|$)`, 'i');
        if (regex.test(norm)) return canonical;
      }
    }
  }
  return null;
}

/**
 * Check if name A matches name B using strict canonical resolution and conflict guards
 */
export function isTeamMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const nA = nameA.toLowerCase().trim();
  const nB = nameB.toLowerCase().trim();

  // 1. Direct equality
  if (nA === nB) return true;

  // 2. Canonical mapping resolution
  const canonA = getCanonicalTeam(nameA);
  const canonB = getCanonicalTeam(nameB);
  if (canonA && canonB) {
    return canonA === canonB;
  }

  // 3. Conflict Guards: Never cross-match known rival / distinct city teams
  const hasCityA = /\bcity\b/i.test(nA);
  const hasCityB = /\bcity\b/i.test(nB);
  const hasUtdA = /\bunited\b/i.test(nA);
  const hasUtdB = /\bunited\b/i.test(nB);
  if ((hasCityA && !hasCityB && hasUtdB) || (hasUtdA && !hasUtdB && hasCityB)) return false;

  const hasRealA = /\breal\b/i.test(nA);
  const hasRealB = /\breal\b/i.test(nB);
  const hasAtlA = /\batletico\b/i.test(nA);
  const hasAtlB = /\batletico\b/i.test(nB);
  if ((hasRealA && !hasRealB && hasAtlB) || (hasAtlA && !hasAtlB && hasRealB)) return false;

  const isParisFcA = /\bparis\s+fc\b/i.test(nA);
  const isParisFcB = /\bparis\s+fc\b/i.test(nB);
  const isPsgA = /\b(saint-germain|psg|paris\s+sg)\b/i.test(nA);
  const isPsgB = /\b(saint-germain|psg|paris\s+sg)\b/i.test(nB);
  if ((isParisFcA && isPsgB) || (isParisFcB && isPsgA)) return false;

  const isInterA = /\binter\b/i.test(nA);
  const isInterB = /\binter\b/i.test(nB);
  const isMilanA = /\b(ac\s+milan|milan)\b/i.test(nA) && !isInterA;
  const isMilanB = /\b(ac\s+milan|milan)\b/i.test(nB) && !isInterB;
  if ((isInterA && isMilanB) || (isInterB && isMilanA)) return false;

  // 4. Normalized string equality
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (normA && normB && normA === normB && normA.length >= 3) return true;

  // 5. Significant word token intersection
  const tokensA = new Set(normA.split(' ').filter((t) => t.length >= 3));
  const tokensB = new Set(normB.split(' ').filter((t) => t.length >= 3));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let commonCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) commonCount++;
  }
  const minTokens = Math.min(tokensA.size, tokensB.size);
  // If the distinctive single or full token set completely overlaps
  if (commonCount >= 1 && commonCount === minTokens) return true;

  // Jaccard similarity threshold >= 0.70
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return commonCount / unionSize >= 0.70;
}

/**
 * Format a timestamp or Date to YYYY-MM-DD (UTC)
 */
export function formatDateKey(dateInput: number | string | Date): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Extract timestamp from bet or date string with high tolerance
 */
export function extractBetTimestamp(bet: any): number {
  if (typeof bet?.kickoffTimestamp === 'number' && bet.kickoffTimestamp > 1000000000000) {
    return bet.kickoffTimestamp;
  }
  if (bet?.kickoffTime && typeof bet.kickoffTime === 'string') {
    const parsed = Date.parse(bet.kickoffTime);
    if (!isNaN(parsed)) return parsed;
  }
  if (bet?.date && typeof bet.date === 'string') {
    const parsed = Date.parse(bet.date);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof bet?.createdAt === 'number' && bet.createdAt > 1000000000000) {
    return bet.createdAt;
  }
  return Date.now();
}

/**
 * Verify whether two match dates are consistent for the SAME sporting fixture:
 * Considers timezones, kickoff adjustments, and ensures matches from different
 * matchdays/weeks/tournaments (diff > 36 hours) are strictly rejected.
 */
export function isDateMatch(betTime: number, eventTime: number, maxHoursDiff = 36): boolean {
  if (!betTime || !eventTime) return false;
  const diffMs = Math.abs(betTime - eventTime);
  const diffHours = diffMs / (3600 * 1000);
  return diffHours <= maxHoursDiff;
}

/**
 * Clean & normalize fixture IDs to their core alphanumeric identity
 * e.g. "football-401694589" -> "401694589"
 * e.g. "apisports-football-123456" -> "123456"
 * e.g. "espn-401694589" -> "401694589"
 */
export function normalizeEventId(idStr: string): string {
  if (!idStr) return '';
  return String(idStr)
    .replace(/^(apisports|espn|stake-tip|live|tip|tracked)-/i, '')
    .replace(/^(football|basketball|tennis|mma|hockey|baseball|esports|rugby)-/i, '')
    .trim();
}

/**
 * Robust Event ID verification between a bet and a scoreboard event.
 * Checks both raw ID equality, normalized core ID equality, and ensures
 * that the core ID has sufficient specificity (not a generic 1-digit index).
 */
export function isEventIdMatch(betFixtureId: string, eventId: string, eventExternalId?: string): boolean {
  if (!betFixtureId || (!eventId && !eventExternalId)) return false;
  
  const bRaw = String(betFixtureId).trim().toLowerCase();
  const eRaw = String(eventId).trim().toLowerCase();
  const extRaw = eventExternalId ? String(eventExternalId).trim().toLowerCase() : '';

  // Direct raw equality
  if (bRaw === eRaw || (extRaw && bRaw === extRaw)) return true;

  // Normalized core comparison
  const bCore = normalizeEventId(bRaw);
  const eCore = normalizeEventId(eRaw);
  const extCore = extRaw ? normalizeEventId(extRaw) : '';

  // Guard: core ID must be at least 5 characters to avoid matching generic short IDs like "1", "0"
  if (bCore.length >= 5) {
    if (bCore === eCore) return true;
    if (extCore && bCore === extCore) return true;
  }

  return false;
}

/**
 * Robustly extract bilateral teams (Home vs Away) from a bet
 */
export function extractTeamsFromBet(bet: any): { home: string; away: string; isBilateral: boolean } {
  if (bet?.homeTeam && bet?.awayTeam) {
    return { home: String(bet.homeTeam).trim(), away: String(bet.awayTeam).trim(), isBilateral: true };
  }

  const cleanMatch = cleanMatchTitle(bet?.match || '');
  const delimRegex = /\s+(?:vs\.?|v\.?|–|—|-|\/|contre|@|at)\s+/i;
  const matchSplit = cleanMatch.split(delimRegex);

  if (matchSplit.length >= 2) {
    const home = matchSplit[0].trim();
    const away = matchSplit.slice(1).join(' - ').trim();
    return { home, away, isBilateral: true };
  }

  return { home: cleanMatch.trim(), away: '', isBilateral: false };
}

/**
 * Fetch past 7 days up to next 2 days across all ESPN multi-sport scoreboards
 * Also accepts optional extraEvents (e.g. from Stake/API-Sports cache)
 */
export async function fetchScoreboardFeeds(extraEvents?: any[]): Promise<ScoreboardEvent[]> {
  const now = Date.now();
  if (scoreboardCache && now - scoreboardCache.timestamp < CACHE_TTL_MS) {
    return scoreboardCache.events;
  }

  // Build date range string: past 7 days to +2 days (YYYYMMDD-YYYYMMDD)
  const dPast = new Date(now - 7 * 24 * 3600 * 1000);
  const dFuture = new Date(now + 2 * 24 * 3600 * 1000);

  const formatYYYYMMDD = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  const dateRange = `${formatYYYYMMDD(dPast)}-${formatYYYYMMDD(dFuture)}`;

  const endpoints = [
    // 1. Worldwide Football (Premier League, Champions League, La Liga, Ligue 1, Serie A, Bundesliga, etc.)
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Football Mondial' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Ligue 1' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Premier League' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'La Liga' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Serie A' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Bundesliga' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'UEFA Champions League' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'UEFA Europa League' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa.conf/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'UEFA Conference League' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'MLS' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/sau.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Saudi Pro League' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Brasileirão' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/por.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Liga Portugal' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Eredivisie' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/scoreboard?dates=${dateRange}`, sport: 'football' as const, league: 'Süper Lig' },

    // 2. Basketball (NBA, WNBA, NCAA, FIBA)
    { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateRange}`, sport: 'basketball' as const, league: 'NBA' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${dateRange}`, sport: 'basketball' as const, league: 'WNBA' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateRange}`, sport: 'basketball' as const, league: 'NCAA Basketball' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/basketball/scoreboard?dates=${dateRange}`, sport: 'basketball' as const, league: 'Basketball International' },

    // 3. Tennis (ATP & WTA)
    { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${dateRange}`, sport: 'tennis' as const, league: 'ATP Tour' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard?dates=${dateRange}`, sport: 'tennis' as const, league: 'WTA Tour' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/tennis/scoreboard?dates=${dateRange}`, sport: 'tennis' as const, league: 'Tennis International' },

    // 4. MMA / UFC
    { url: `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard`, sport: 'mma' as const, league: 'UFC Main Card' },

    // 5. Baseball & Hockey
    { url: `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateRange}`, sport: 'baseball' as const, league: 'MLB' },
    { url: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${dateRange}`, sport: 'hockey' as const, league: 'NHL' },
  ];

  const events: ScoreboardEvent[] = [];
  const seenKeys = new Set<string>();

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        const res = await fetch(ep.url, {
          signal: AbortSignal.timeout(4500),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!res.ok) return;

        const json: any = await res.json();
        const rawEvents = json.events || [];

        for (const ev of rawEvents) {
          const comps = ev.competitions || [];
          if (comps.length === 0) continue;

          for (const comp of comps) {
            const competitors = comp.competitors || [];
            if (competitors.length < 2) continue;

            let homeName = '';
            let awayName = '';
            let homeScoreNum = 0;
            let awayScoreNum = 0;
            let winner: 'home' | 'away' | 'draw' | undefined;

            if (ep.sport === 'mma') {
              const c1 = competitors[0];
              const c2 = competitors[1];
              homeName = c1?.athlete?.displayName || c1?.athlete?.fullName || c1?.team?.displayName || 'Combattant 1';
              awayName = c2?.athlete?.displayName || c2?.athlete?.fullName || c2?.team?.displayName || 'Combattant 2';
              homeScoreNum = c1?.winner ? 1 : 0;
              awayScoreNum = c2?.winner ? 1 : 0;
              if (c1?.winner) winner = 'home';
              else if (c2?.winner) winner = 'away';
            } else if (ep.sport === 'tennis') {
              const c1 = competitors[0];
              const c2 = competitors[1];
              homeName = c1?.athlete?.displayName || c1?.athlete?.fullName || c1?.team?.displayName || 'Joueur 1';
              awayName = c2?.athlete?.displayName || c2?.athlete?.fullName || c2?.team?.displayName || 'Joueur 2';
              homeScoreNum = c1?.score !== undefined ? parseInt(String(c1.score), 10) || 0 : 0;
              awayScoreNum = c2?.score !== undefined ? parseInt(String(c2.score), 10) || 0 : 0;
              if (c1?.winner) winner = 'home';
              else if (c2?.winner) winner = 'away';
            } else {
              const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
              const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
              homeName = home?.team?.displayName || home?.team?.name || home?.athlete?.displayName || 'Équipe 1';
              awayName = away?.team?.displayName || away?.team?.name || away?.athlete?.displayName || 'Équipe 2';
              homeScoreNum = home?.score !== undefined ? parseInt(String(home.score), 10) || 0 : 0;
              awayScoreNum = away?.score !== undefined ? parseInt(String(away.score), 10) || 0 : 0;
              if (home?.winner) winner = 'home';
              else if (away?.winner) winner = 'away';
              else if (homeScoreNum > awayScoreNum) winner = 'home';
              else if (awayScoreNum > homeScoreNum) winner = 'away';
              else if (homeScoreNum === awayScoreNum && homeScoreNum > 0) winner = 'draw';
            }

            if (!homeName || !awayName || homeName === awayName) continue;

            const statusType = (comp.status?.type?.name || ev.status?.type?.name || '').toUpperCase();
            const statusState = (comp.status?.type?.state || ev.status?.type?.state || 'pre').toLowerCase();
            const isCompleted = comp.status?.type?.completed === true || ev.status?.type?.completed === true;
            const clockText = comp.status?.displayClock || ev.status?.displayClock || '';
            const eventDateMs = ev.date ? new Date(ev.date).getTime() : (comp.date ? new Date(comp.date).getTime() : now);

            const isFinished = isCompleted ||
              statusState === 'post' ||
              statusState === 'completed' ||
              statusState === 'final' ||
              statusType === 'STATUS_FINAL' ||
              statusType === 'STATUS_COMPLETED' ||
              statusType.includes('FINAL') ||
              statusType.includes('POST');

            const isLive = !isFinished && (statusState === 'in' || statusType === 'STATUS_IN_PROGRESS' || statusType.includes('PROGRESS'));
            const isUpcoming = !isFinished && !isLive && eventDateMs > now;

            const clock = isLive ? (clockText ? `${clockText}'` : 'En Direct') : (isFinished ? 'Terminé' : "À venir");
            const displayScore = isFinished || isLive ? `${homeScoreNum} - ${awayScoreNum}` : '0 - 0';

            const dedupKey = `${ep.sport}-${homeName.toLowerCase()}-${awayName.toLowerCase()}-${eventDateMs}`;
            if (!seenKeys.has(dedupKey)) {
              seenKeys.add(dedupKey);
              const compExternalId = String(comp.id || ev.id || '');
              events.push({
                id: `${ep.sport}-${compExternalId || Math.random().toString(36).substring(7)}`,
                externalId: compExternalId,
                sport: ep.sport,
                match: `${homeName} vs ${awayName}`,
                homeTeam: homeName,
                awayTeam: awayName,
                league: ep.league || comp.league?.name || 'Compétition Officielle',
                date: ev.date || comp.date || new Date(eventDateMs).toISOString(),
                dateKey: formatDateKey(eventDateMs),
                timestamp: eventDateMs,
                isLive,
                isUpcoming,
                isFinished,
                homeScore: homeScoreNum,
                awayScore: awayScoreNum,
                displayScore,
                clock,
                winner,
                statusDetail: comp.status?.type?.detail || (isFinished ? 'Terminé (Score Officiel)' : isLive ? 'En Direct' : 'À venir'),
                source: 'ESPN Sportsbook Official Feed',
              });
            }
          }
        }
      } catch {
        // Feed fetch error ignored
      }
    })
  );

  // Merge extra real events (e.g. from Stake / API-Sports cache)
  if (Array.isArray(extraEvents) && extraEvents.length > 0) {
    for (const ev of extraEvents) {
      if (!ev || !ev.match) continue;
      const homeName = ev.homeTeam || (ev.match.split(/\s+vs\.?\s+/i)[0] || '').trim();
      const awayName = ev.awayTeam || (ev.match.split(/\s+vs\.?\s+/i)[1] || '').trim();
      if (!homeName || !awayName) continue;

      const eventDateMs = ev.timestamp || (ev.date ? Date.parse(ev.date) : now);
      const dedupKey = `${ev.sport || 'football'}-${homeName.toLowerCase()}-${awayName.toLowerCase()}-${eventDateMs}`;
      if (!seenKeys.has(dedupKey)) {
        seenKeys.add(dedupKey);
        const homeScoreNum = typeof ev.homeScore === 'number' ? ev.homeScore : 0;
        const awayScoreNum = typeof ev.awayScore === 'number' ? ev.awayScore : 0;
        events.push({
          id: ev.stakeFixtureId || ev.id || `extra-${eventDateMs}`,
          externalId: ev.stakeFixtureId || ev.id,
          sport: ev.sport || 'football',
          match: `${homeName} vs ${awayName}`,
          homeTeam: homeName,
          awayTeam: awayName,
          league: ev.league || 'Compétition Officielle',
          date: ev.date || new Date(eventDateMs).toISOString(),
          dateKey: formatDateKey(eventDateMs),
          timestamp: eventDateMs,
          isLive: !!ev.isLive,
          isUpcoming: !!ev.isUpcoming,
          isFinished: !!ev.isFinished,
          homeScore: homeScoreNum,
          awayScore: awayScoreNum,
          displayScore: ev.isFinished || ev.isLive ? `${homeScoreNum} - ${awayScoreNum}` : '0 - 0',
          clock: ev.isLive ? 'En Direct' : ev.isFinished ? 'Terminé' : 'À venir',
          statusDetail: ev.isFinished ? 'Terminé (Score Officiel)' : ev.isLive ? 'En Direct' : 'À venir',
          source: ev.source || 'Stake / API-Sports Multi-Feed',
        });
      }
    }
  }

  scoreboardCache = { timestamp: now, events };
  return events;
}

/**
 * Extract clean match string without [LIVE] or (Score) annotations
 */
export function cleanMatchTitle(matchStr: string): string {
  if (!matchStr) return '';
  return matchStr
    .replace(/\[LIVE.*?\]|\(LIVE.*?\)|\[FIN.*?\]|\(Terminé.*?\)|\[Score.*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a tracked bet with an event from the scoreboards.
 * Strictly guarantees:
 * 1. Both home and away participants match using strict canonical aliases & conflict guards.
 * 2. Scheduled date and event timestamp are within a mandatory 36-hour window.
 * 3. Never borrows past scores for upcoming scheduled matches.
 * 4. Verifies Event IDs for direct matches with date sanity checks.
 */
export function findMatchingScoreboardEvent(bet: any, scoreboards: ScoreboardEvent[]): ScoreboardEvent | null {
  if (!Array.isArray(scoreboards) || scoreboards.length === 0) return null;

  const cleanMatch = cleanMatchTitle(bet?.match || '');
  const betSport = (bet?.sport || '').toLowerCase();
  const { home: betHome, away: betAway, isBilateral } = extractTeamsFromBet(bet);
  const betTime = extractBetTimestamp(bet);
  const nowMs = Date.now();

  const betFixtureId = bet?.stakeFixtureId || bet?.fixtureId || bet?.eventId || bet?.tipId;

  // =========================================================================
  // STAGE 1: Direct Event ID Match with Date & Team Consistency Verification
  // =========================================================================
  if (betFixtureId && String(betFixtureId).length >= 5) {
    const directMatch = scoreboards.find((e) => isEventIdMatch(betFixtureId, e.id, e.externalId));
    if (directMatch) {
      // 1. Sport check
      const sportOk = !betSport || betSport === 'all' || betSport === 'other' || !directMatch.sport || directMatch.sport === betSport;
      
      // 2. Strict Date window check: must not exceed 36 hours from scheduled bet kickoff
      const dateOk = isDateMatch(betTime, directMatch.timestamp, 36);

      // 3. Team consistency guard: At least one participant must be consistent
      const homeValid = !betHome || isTeamMatch(betHome, directMatch.homeTeam) || isTeamMatch(betHome, directMatch.awayTeam);
      const awayValid = !betAway || isTeamMatch(betAway, directMatch.homeTeam) || isTeamMatch(betAway, directMatch.awayTeam);

      if (sportOk && dateOk && homeValid && awayValid) {
        return {
          ...directMatch,
          matchedVerificationMethod: 'event_id_exact',
        };
      }
    }
  }

  // =========================================================================
  // STAGE 2: Bilateral Team Matching with Mandatory Date Window Verification
  // =========================================================================
  // Anti-Contamination Guard: If both teams are not known (single team without opponent),
  // do NOT match with any arbitrary event from the scoreboards!
  if (!isBilateral || !betHome || !betAway) {
    return null;
  }

  let bestEvent: ScoreboardEvent | null = null;
  let minTimeDiffMs = Infinity;

  for (const ev of scoreboards) {
    // 1. Sport Compatibility Filter
    if (betSport && ev.sport && betSport !== 'all' && betSport !== 'other') {
      if (betSport !== ev.sport) continue;
    }

    // 2. Bilateral Team Verification (BOTH teams must match)
    const homeMatches = isTeamMatch(betHome, ev.homeTeam);
    const awayMatches = isTeamMatch(betAway, ev.awayTeam);

    const crossHomeMatches = isTeamMatch(betHome, ev.awayTeam);
    const crossAwayMatches = isTeamMatch(betAway, ev.homeTeam);

    const isMatch = (homeMatches && awayMatches) || (crossHomeMatches && crossAwayMatches);
    if (!isMatch) continue;

    // 3. MANDATORY DATE WINDOW VERIFICATION:
    // Teams can play each other multiple times in a season (Cup, League, Champions League, etc.).
    // Events separated by more than 36 hours are strictly DIFFERENT matches.
    const timeDiffMs = Math.abs(betTime - ev.timestamp);
    const diffHours = timeDiffMs / (3600 * 1000);
    if (diffHours > 36) continue;

    // 4. Status-Aware Sanity Guard:
    // If the bet is for an upcoming match in the future (kickoff > nowMs + 15m),
    // NEVER steal the result of an older finished match that concluded hours/days ago!
    if (betTime > nowMs + 15 * 60 * 1000 && ev.isFinished && (nowMs - ev.timestamp > 12 * 3600 * 1000)) {
      continue;
    }

    // 5. Select closest in time to scheduled kickoff
    if (timeDiffMs < minTimeDiffMs) {
      minTimeDiffMs = timeDiffMs;
      bestEvent = {
        ...ev,
        matchedVerificationMethod: 'bilateral_teams_and_date',
      };
    }
  }

  return bestEvent;
}

/**
 * Deterministic Quantitative Rule Engine:
 * Strictly computes if a bet market is Won, Lost, or Void based on verified real match scores
 */
export function evaluateBetFromEvent(bet: any, event: ScoreboardEvent): BetEvaluationResult {
  const homeScore = event.homeScore;
  const awayScore = event.awayScore;
  const totalScore = homeScore + awayScore;
  const market = (bet.market || '').toLowerCase();
  const stakeMarketName = (bet.stakeMarketName || '').toLowerCase();
  const fullMarketText = `${market} ${stakeMarketName}`;

  // If match is upcoming (not yet started)
  if (event.isUpcoming) {
    const formattedDate = new Date(event.timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
    return {
      id: bet.id,
      status: 'pending',
      finalScore: `Prévu (${event.displayScore})`,
      resolutionNotes: `Match à venir. Coup d'envoi officiel programmé à ${formattedDate} (Heure de Paris).`,
      isMatchFinished: false,
      autoResolved: false,
      sourceBadge: 'ESPN Live Sportsbook',
      verifiedEventId: event.id,
      verifiedEventDate: event.dateKey || formatDateKey(event.timestamp),
      auditVerificationMethod: event.matchedVerificationMethod || 'bilateral_teams_and_date',
    };
  }

  // If match is currently LIVE / In-Play
  if (event.isLive) {
    return {
      id: bet.id,
      status: 'pending',
      finalScore: `En direct : ${event.displayScore} (${event.clock})`,
      resolutionNotes: `Match en cours (${event.clock}) : Score actuel ${event.displayScore}. En attente du coup de sifflet final pour clôture officielle.`,
      isMatchFinished: false,
      autoResolved: false,
      sourceBadge: 'ESPN In-Play Live',
      verifiedEventId: event.id,
      verifiedEventDate: event.dateKey || formatDateKey(event.timestamp),
      auditVerificationMethod: event.matchedVerificationMethod || 'bilateral_teams_and_date',
    };
  }

  // Match is FINISHED! Deterministically evaluate the outcome:
  let status: 'won' | 'lost' | 'void' = 'lost';
  let notes = '';

  const isHomeWinner = homeScore > awayScore;
  const isAwayWinner = awayScore > homeScore;
  const isDraw = homeScore === awayScore;

  // Extract candidate team names from bet match
  const betMatch = bet.match || '';
  const homeTeamName = event.homeTeam;
  const awayTeamName = event.awayTeam;

  // 1. Both Teams To Score (BTTS / Les deux équipes marquent)
  if (fullMarketText.includes('btts') || fullMarketText.includes('les deux') || fullMarketText.includes('les 2')) {
    const bttsHappened = homeScore >= 1 && awayScore >= 1;
    if (fullMarketText.includes('non') || fullMarketText.includes('no')) {
      status = !bttsHappened ? 'won' : 'lost';
      notes = !bttsHappened
        ? `Score ${event.displayScore} : Au moins une équipe n'a pas marqué. Pari "BTTS Non" GAGNÉ.`
        : `Score ${event.displayScore} : Les deux équipes ont marqué. Pari "BTTS Non" PERDU.`;
    } else {
      status = bttsHappened ? 'won' : 'lost';
      notes = bttsHappened
        ? `Score ${event.displayScore} : Les deux équipes ont marqué (${homeScore} & ${awayScore}). Pari "BTTS Oui" GAGNÉ.`
        : `Score ${event.displayScore} : Les deux équipes n'ont pas marqué (${homeScore} & ${awayScore}). Pari "BTTS Oui" PERDU.`;
    }
  }

  // 2. Over / Under (Totals: Goals, Points, Games)
  else if (
    fullMarketText.includes('plus de') ||
    fullMarketText.includes('moins de') ||
    fullMarketText.includes('over') ||
    fullMarketText.includes('under') ||
    fullMarketText.includes('total')
  ) {
    // Extract numeric threshold (e.g. 0.5, 1.5, 2.5, 3.5, 4.5, 215.5, 22.5)
    const thresholdMatch = fullMarketText.match(/(\d+(?:\.\d+)?)/);
    const threshold = thresholdMatch ? parseFloat(thresholdMatch[1]) : (bet.sport === 'basketball' ? 215.5 : 2.5);

    const isOver = fullMarketText.includes('plus de') || fullMarketText.includes('over') || fullMarketText.includes('>');
    const isUnder = fullMarketText.includes('moins de') || fullMarketText.includes('under') || fullMarketText.includes('<');

    if (isOver) {
      if (totalScore > threshold) {
        status = 'won';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) > Ligne ${threshold}. Pari "Plus de ${threshold}" GAGNÉ.`;
      } else if (totalScore === threshold) {
        status = 'void';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) = Ligne ${threshold}. Pari REMBOURSÉ (Push / Void).`;
      } else {
        status = 'lost';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) <= Ligne ${threshold}. Pari "Plus de ${threshold}" PERDU.`;
      }
    } else if (isUnder) {
      if (totalScore < threshold) {
        status = 'won';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) < Ligne ${threshold}. Pari "Moins de ${threshold}" GAGNÉ.`;
      } else if (totalScore === threshold) {
        status = 'void';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) = Ligne ${threshold}. Pari REMBOURSÉ (Push / Void).`;
      } else {
        status = 'lost';
        notes = `Score ${event.displayScore} (Total: ${totalScore}) >= Ligne ${threshold}. Pari "Moins de ${threshold}" PERDU.`;
      }
    } else {
      // Default to Over 2.5
      status = totalScore >= 3 ? 'won' : 'lost';
      notes = `Score final ${event.displayScore} (Total ${totalScore} buts).`;
    }
  }

  // 3. Double Chance (1X, X2, 12)
  else if (fullMarketText.includes('1x') || fullMarketText.includes('1 ou x') || fullMarketText.includes('1 ou nul')) {
    status = isHomeWinner || isDraw ? 'won' : 'lost';
    notes = status === 'won'
      ? `Score ${event.displayScore} : Victoire Domicile ou Nul validée. Pari "1X" GAGNÉ.`
      : `Score ${event.displayScore} : Victoire Extérieur. Pari "1X" PERDU.`;
  } else if (fullMarketText.includes('x2') || fullMarketText.includes('x ou 2') || fullMarketText.includes('nul ou 2')) {
    status = isAwayWinner || isDraw ? 'won' : 'lost';
    notes = status === 'won'
      ? `Score ${event.displayScore} : Victoire Extérieur ou Nul validée. Pari "X2" GAGNÉ.`
      : `Score ${event.displayScore} : Victoire Domicile. Pari "X2" PERDU.`;
  } else if (fullMarketText.includes('12') || fullMarketText.includes('1 ou 2')) {
    status = !isDraw ? 'won' : 'lost';
    notes = status === 'won'
      ? `Score ${event.displayScore} : Pas de match nul. Pari "12" GAGNÉ.`
      : `Score ${event.displayScore} : Match Nul. Pari "12" PERDU.`;
  }

  // 4. Draw No Bet (DNB / Remboursé si Nul)
  else if (fullMarketText.includes('dnb') || fullMarketText.includes('remboursé si nul') || fullMarketText.includes('draw no bet')) {
    const isBetOnHome = isTeamMatch(fullMarketText, homeTeamName) || fullMarketText.includes(' 1') || fullMarketText.includes('domicile');
    if (isDraw) {
      status = 'void';
      notes = `Score ${event.displayScore} : Match Nul. Pari REMBOURSÉ selon la condition DNB (Mise restituée).`;
    } else if (isBetOnHome) {
      status = isHomeWinner ? 'won' : 'lost';
      notes = isHomeWinner
        ? `Score ${event.displayScore} : Victoire de ${homeTeamName}. Pari DNB GAGNÉ.`
        : `Score ${event.displayScore} : Défaite de ${homeTeamName}. Pari DNB PERDU.`;
    } else {
      status = isAwayWinner ? 'won' : 'lost';
      notes = isAwayWinner
        ? `Score ${event.displayScore} : Victoire de ${awayTeamName}. Pari DNB GAGNÉ.`
        : `Score ${event.displayScore} : Défaite de ${awayTeamName}. Pari DNB PERDU.`;
    }
  }

  // 5. Match Winner (1X2 / Moneyline / Vainqueur)
  else {
    // Check if bet was on Draw
    if (fullMarketText.includes('nul') || fullMarketText.includes('draw') || fullMarketText === 'x' || fullMarketText === 'n') {
      status = isDraw ? 'won' : 'lost';
      notes = isDraw
        ? `Score ${event.displayScore} : Match Nul confirmé. Pari GAGNÉ.`
        : `Score ${event.displayScore} : Pas de match nul. Pari PERDU.`;
    }
    // Check if bet was on Away Team
    else if (
      isTeamMatch(fullMarketText, awayTeamName) ||
      fullMarketText.includes(' 2') ||
      fullMarketText.includes('extérieur') ||
      fullMarketText.includes('away')
    ) {
      status = isAwayWinner ? 'won' : 'lost';
      notes = isAwayWinner
        ? `Score ${event.displayScore} : Victoire de ${awayTeamName}. Pari GAGNÉ.`
        : `Score ${event.displayScore} : Défaite de ${awayTeamName} (${homeScore}-${awayScore}). Pari PERDU.`;
    }
    // Default to Home Team Winner
    else {
      status = isHomeWinner ? 'won' : 'lost';
      notes = isHomeWinner
        ? `Score ${event.displayScore} : Victoire de ${homeTeamName}. Pari GAGNÉ.`
        : `Score ${event.displayScore} : Pas de victoire de ${homeTeamName} (${homeScore}-${awayScore}). Pari PERDU.`;
    }
  }

  return {
    id: bet.id,
    status,
    finalScore: `${homeTeamName} ${event.displayScore} ${awayTeamName} (Terminé)`,
    resolutionNotes: notes,
    isMatchFinished: true,
    autoResolved: true,
    resolvedAt: Date.now(),
    sourceBadge: 'ESPN Sportsbook Score Officiel',
    verifiedEventId: event.id,
    verifiedEventDate: event.dateKey || formatDateKey(event.timestamp),
    auditVerificationMethod: event.matchedVerificationMethod || 'bilateral_teams_and_date',
  };
}

/**
 * Use Gemini with Google Search tool grounding to lookup the exact verified final score
 * for niche or unlisted fixtures, and strictly evaluate the market with zero hallucination.
 */
export async function resolveWithAIGroundedSearch(
  ai: GoogleGenAI,
  bet: any
): Promise<BetEvaluationResult | null> {
  const cleanMatch = cleanMatchTitle(bet?.match || '');
  const { home: betHome, away: betAway } = extractTeamsFromBet(bet);
  const betTime = extractBetTimestamp(bet);
  const scheduledDateStr = new Date(betTime).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });

  const prompt = `Recherche sur le web le résultat et le score officiel du match sportif suivant :
- Sport : ${bet?.sport || 'football'}
- Match exact : ${cleanMatch}
- Compétition / Ligue : ${bet?.league || 'Ligue Professionnelle'}
- Marché parié : "${bet?.market}" (Cote : @${bet?.odds})
- Date officielle de la rencontre : ${scheduledDateStr}

RÈGLES CRITIQUES D'EXACTITUDE & ANTI-CONTAMINATION :
1. Recherche le score réel officiel UNIQUEMENT pour la rencontre exacte "${cleanMatch}" disputée aux alentours du ${scheduledDateStr}.
2. ❌ INTERDICTION FORMELLE d'attribuer le score d'un autre match, d'une autre confrontation passée ou d'une autre équipe !
3. Si la rencontre "${cleanMatch}" n'a pas encore eu lieu, est reportée, ou est introuvable avec certitude absolue, renvoie obligatoirement "isMatchFinished": false, "status": "pending".
4. Si et seulement si le match "${cleanMatch}" est réellement terminé à cette date, indique les scores exacts et le statut réel du pari ('won' | 'lost' | 'void').

Retourne un JSON strict :
{
  "isMatchFinished": boolean,
  "matchDate": "YYYY-MM-DD (Date exacte à laquelle le match a été joué)",
  "homeTeam": "nom exact de l'équipe à domicile",
  "awayTeam": "nom exact de l'équipe à l'extérieur",
  "homeScore": number,
  "awayScore": number,
  "finalScoreFormatted": "string (ex: Arsenal 2 - 1 Chelsea)",
  "status": "won" | "lost" | "void" | "pending",
  "resolutionNotes": "string (explication détaillée de la règle appliquée au score réel)"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const text = response.text || '';
    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed.isMatchFinished !== 'boolean') return null;

    if (!parsed.isMatchFinished || parsed.status === 'pending') {
      return {
        id: bet.id,
        status: 'pending',
        finalScore: parsed.finalScoreFormatted || 'Match en attente',
        resolutionNotes: parsed.resolutionNotes || 'Match à venir ou en cours.',
        isMatchFinished: false,
        autoResolved: false,
        sourceBadge: 'Arbitrage Recherche Web Groundée',
        auditVerificationMethod: 'unresolved_pending',
      };
    }

    // CRITICAL Safeguard 1: Ensure BOTH participants match the bet (Anti-cross-contamination)
    if (parsed.homeTeam && parsed.awayTeam && betHome && betAway) {
      const homeMatchesDirect = isTeamMatch(parsed.homeTeam, betHome) && isTeamMatch(parsed.awayTeam, betAway);
      const homeMatchesInverted = isTeamMatch(parsed.homeTeam, betAway) && isTeamMatch(parsed.awayTeam, betHome);

      if (!homeMatchesDirect && !homeMatchesInverted) {
        console.warn(`[SportsOracle] Grounded search rejected mismatched teams: Bet("${cleanMatch}") vs AI("${parsed.homeTeam} vs ${parsed.awayTeam}").`);
        return null;
      }
    }

    // CRITICAL Safeguard 2: Ensure the match date from AI matches the scheduled bet date within 48 hours
    if (parsed.matchDate) {
      const aiTimestamp = Date.parse(parsed.matchDate);
      if (!isNaN(aiTimestamp)) {
        const diffHours = Math.abs(betTime - aiTimestamp) / (3600 * 1000);
        if (diffHours > 48) {
          console.warn(`[SportsOracle] Grounded search rejected date mismatch: Bet date (${scheduledDateStr}) vs AI date (${parsed.matchDate}) diff ${diffHours.toFixed(1)}h.`);
          return null;
        }
      }
    }

    const finalFormattedScore = parsed.finalScoreFormatted || `${parsed.homeTeam || ''} ${parsed.homeScore ?? 0} - ${parsed.awayScore ?? 0} ${parsed.awayTeam || ''} (Terminé)`;

    return {
      id: bet.id,
      status: parsed.status === 'won' ? 'won' : parsed.status === 'void' ? 'void' : 'lost',
      finalScore: finalFormattedScore,
      resolutionNotes: parsed.resolutionNotes || `Score officiel vérifié : ${parsed.homeScore ?? 0} - ${parsed.awayScore ?? 0}`,
      isMatchFinished: true,
      autoResolved: true,
      resolvedAt: Date.now(),
      sourceBadge: 'Google Search Arbitrage Groundé',
      verifiedEventDate: parsed.matchDate || formatDateKey(betTime),
      auditVerificationMethod: 'grounded_search_verified',
    };
  } catch (err) {
    console.warn('[SportsOracle] Grounded search resolution failed for:', bet?.match, err);
    return null;
  }
}
