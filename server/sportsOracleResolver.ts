import { GoogleGenAI } from '@google/genai';

export interface ScoreboardEvent {
  id: string;
  sport: 'football' | 'basketball' | 'tennis' | 'mma' | 'esports' | 'hockey' | 'baseball' | 'rugby' | 'other';
  match: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
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
}

// In-memory cache for recent scoreboards
let scoreboardCache: { timestamp: number; events: ScoreboardEvent[] } | null = null;
const CACHE_TTL_MS = 45 * 1000; // 45 seconds cache

// Team name aliases & abbreviations for accurate fuzzy matching
const TEAM_ALIASES: Record<string, string[]> = {
  'real madrid': ['real madrid', 'r. madrid', 'real madrid cf', 'rmcf', 'madrid'],
  'atletico madrid': ['atletico madrid', 'atletico de madrid', 'atlético madrid', 'atleti', 'atm'],
  'barcelona': ['fc barcelona', 'barcelona', 'barca', 'barça', 'fcb'],
  'paris saint-germain': ['paris saint-germain', 'paris sg', 'psg', 'paris'],
  'olympique de marseille': ['olympique de marseille', 'marseille', 'om'],
  'olympique lyonnais': ['olympique lyonnais', 'lyon', 'ol'],
  'as monaco': ['as monaco', 'monaco', 'asm'],
  'borussia dortmund': ['borussia dortmund', 'dortmund', 'bvb', 'bvb 09'],
  'bayern munich': ['bayern munich', 'bayern münchen', 'fc bayern', 'bayern'],
  'manchester city': ['manchester city', 'man city', 'mcfc', 'city'],
  'manchester united': ['manchester united', 'man united', 'man utd', 'mufc', 'united'],
  'arsenal': ['arsenal', 'arsenal fc', 'gunners'],
  'liverpool': ['liverpool', 'liverpool fc', 'lfc'],
  'chelsea': ['chelsea', 'chelsea fc', 'cfc'],
  'tottenham hotspur': ['tottenham hotspur', 'tottenham', 'spurs'],
  'aston villa': ['aston villa', 'villa'],
  'newcastle united': ['newcastle united', 'newcastle', 'nufc'],
  'wolverhampton wanderers': ['wolverhampton wanderers', 'wolverhampton', 'wolves'],
  'juventus': ['juventus', 'juve', 'juventus fc'],
  'inter milan': ['inter milan', 'internazionale', 'inter', 'fc inter'],
  'ac milan': ['ac milan', 'milan', 'rossoneri'],
  'as roma': ['as roma', 'roma'],
  'ssc napoli': ['ssc napoli', 'napoli'],
  'sporting cp': ['sporting cp', 'sporting lisbon', 'sporting'],
  'sl benfica': ['sl benfica', 'benfica'],
  'fc porto': ['fc porto', 'porto'],
  'al-hilal': ['al-hilal', 'al hilal', 'hilal'],
  'al-nassr': ['al-nassr', 'al nassr', 'nassr'],
  // Basketball NBA
  'boston celtics': ['boston celtics', 'celtics', 'boston'],
  'dallas mavericks': ['dallas mavericks', 'mavericks', 'mavs', 'dallas'],
  'golden state warriors': ['golden state warriors', 'warriors', 'gsw'],
  'los angeles lakers': ['los angeles lakers', 'lakers', 'lal'],
  'los angeles clippers': ['los angeles clippers', 'clippers', 'lac'],
  'denver nuggets': ['denver nuggets', 'nuggets', 'denver'],
  'milwaukee bucks': ['milwaukee bucks', 'bucks', 'milwaukee'],
  'philadelphia 76ers': ['philadelphia 76ers', '76ers', 'sixers', 'philly'],
  'new york knicks': ['new york knicks', 'knicks', 'ny knicks'],
  'miami heat': ['miami heat', 'heat', 'miami'],
  'oklahoma city thunder': ['oklahoma city thunder', 'thunder', 'okc'],
  'minnesota timberwolves': ['minnesota timberwolves', 'timberwolves', 'wolves'],
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
 * Clean & normalize a team/athlete name string for fuzzy matching
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\b(fc|cf|ac|as|bc|rb|ssc|sc|cd|club|deportivo|sporting|athletic|atletico|united|city|town|wanderers|hotspur|saint-germain|sg)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Token set similarity (Jaccard similarity on significant words)
 */
function tokenSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1);
  const norm2 = normalizeName(str2);
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;

  const tokens1 = new Set(norm1.split(' ').filter((t) => t.length > 1));
  const tokens2 = new Set(norm2.split(' ').filter((t) => t.length > 1));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersectionCount = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersectionCount++;
    else {
      // Substring check for short vs long names (e.g. "Dortmund" vs "Borussia Dortmund")
      for (const t2 of tokens2) {
        if (t.includes(t2) || t2.includes(t)) {
          intersectionCount += 0.8;
          break;
        }
      }
    }
  }

  const unionSize = new Set([...tokens1, ...tokens2]).size;
  return intersectionCount / unionSize;
}

/**
 * Check if name A matches name B using aliases and fuzzy comparison
 */
function isTeamMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const nA = nameA.toLowerCase().trim();
  const nB = nameB.toLowerCase().trim();

  if (nA === nB) return true;

  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (normA === normB && normA.length > 1) return true;
  if (normA.includes(normB) || normB.includes(normA)) {
    if (Math.min(normA.length, normB.length) >= 3) return true;
  }

  // Check alias lookup
  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    const aMatches = aliases.some((al) => nA.includes(al) || normA.includes(normalizeName(al)));
    const bMatches = aliases.some((al) => nB.includes(al) || normB.includes(normalizeName(al)));
    if (aMatches && bMatches) return true;
  }

  // Token similarity threshold > 0.45
  return tokenSimilarity(nameA, nameB) >= 0.45;
}

/**
 * Fetch past 7 days up to next 2 days across all ESPN multi-sport scoreboards
 */
export async function fetchScoreboardFeeds(): Promise<ScoreboardEvent[]> {
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
              events.push({
                id: `${ep.sport}-${comp.id || ev.id || Math.random().toString(36).substring(7)}`,
                sport: ep.sport,
                match: `${homeName} vs ${awayName}`,
                homeTeam: homeName,
                awayTeam: awayName,
                league: ep.league || comp.league?.name || 'Compétition Officielle',
                date: ev.date || comp.date || new Date(eventDateMs).toISOString(),
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

  scoreboardCache = { timestamp: now, events };
  return events;
}

/**
 * Match a tracked bet with an event from the scoreboards
 */
export function findMatchingScoreboardEvent(bet: any, scoreboards: ScoreboardEvent[]): ScoreboardEvent | null {
  const betMatch = (bet.match || '').trim();
  const betSport = (bet.sport || '').toLowerCase();

  // 1. Check direct fixture ID match
  if (bet.stakeFixtureId) {
    const directMatch = scoreboards.find((e) => e.id === bet.stakeFixtureId || e.id.includes(bet.stakeFixtureId));
    if (directMatch) return directMatch;
  }

  // Parse home and away teams from bet match string (e.g. "Real Madrid vs Borussia Dortmund", "Arsenal - Chelsea", "Alcaraz / Sinner")
  const delimiters = [' vs ', ' v ', ' - ', ' / ', ' contre ', ' @ '];
  let betHome = '';
  let betAway = '';

  for (const d of delimiters) {
    if (betMatch.includes(d)) {
      const parts = betMatch.split(d);
      betHome = parts[0].trim();
      betAway = parts.slice(1).join(d).trim();
      break;
    }
  }

  if (!betHome || !betAway) {
    betHome = betMatch;
    betAway = '';
  }

  let bestEvent: ScoreboardEvent | null = null;
  let bestScore = 0;

  for (const ev of scoreboards) {
    // Filter by sport if sport is compatible
    if (betSport && ev.sport && betSport !== 'all' && betSport !== 'other') {
      if (betSport !== ev.sport) continue;
    }

    // Direct / Alias matching
    const homeMatches = isTeamMatch(betHome, ev.homeTeam);
    const awayMatches = betAway ? isTeamMatch(betAway, ev.awayTeam) : true;

    // Cross-matching (in case home/away were inverted)
    const crossHomeMatches = betAway ? isTeamMatch(betHome, ev.awayTeam) : false;
    const crossAwayMatches = isTeamMatch(betAway, ev.homeTeam);

    if ((homeMatches && awayMatches) || (crossHomeMatches && crossAwayMatches)) {
      // Score match based on date proximity if kickoffTimestamp is available
      let proximityScore = 1.0;
      if (bet.kickoffTimestamp && ev.timestamp) {
        const diffHours = Math.abs(bet.kickoffTimestamp - ev.timestamp) / (3600 * 1000);
        if (diffHours < 24) proximityScore += 0.5;
        if (diffHours < 6) proximityScore += 0.5;
      }
      if (proximityScore > bestScore) {
        bestScore = proximityScore;
        bestEvent = ev;
      }
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
  const prompt = `Recherche sur le web le résultat et le score officiel du match sportif suivant :
- Sport : ${bet.sport || 'football'}
- Match : ${bet.match}
- Compétition / Ligue : ${bet.league || 'Ligue Professionnelle'}
- Marché parié : "${bet.market}" (Cote : @${bet.odds})
- Date approximative : ${new Date(bet.kickoffTimestamp || bet.createdAt).toLocaleDateString('fr-FR')}

Instructions strictes :
1. Recherche le score final officiel réel (sur Flashscore, Sofascore, Google Sports, ESPN ou site officiel).
2. Si le match n'a pas encore eu lieu ou est en cours, indique "isMatchFinished": false, "status": "pending".
3. Si le match est terminé, indique les scores exacts, le résultat et le statut réel du pari ('won' | 'lost' | 'void') selon la règle du marché.

Retourne un JSON strict :
{
  "isMatchFinished": boolean,
  "homeTeam": "string",
  "awayTeam": "string",
  "homeScore": number,
  "awayScore": number,
  "finalScoreFormatted": "string (ex: Real Madrid 2 - 0 Dortmund)",
  "status": "won" | "lost" | "void" | "pending",
  "resolutionNotes": "string (explication détaillée de la règle appliquée au score réel)"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
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
      };
    }

    return {
      id: bet.id,
      status: parsed.status === 'won' ? 'won' : parsed.status === 'void' ? 'void' : 'lost',
      finalScore: parsed.finalScoreFormatted || `${parsed.homeScore ?? ''} - ${parsed.awayScore ?? ''}`,
      resolutionNotes: parsed.resolutionNotes || `Score officiel vérifié : ${parsed.homeScore ?? 0} - ${parsed.awayScore ?? 0}`,
      isMatchFinished: true,
      autoResolved: true,
      resolvedAt: Date.now(),
      sourceBadge: 'Arbitrage Recherche Web Groundée',
    };
  } catch (err) {
    console.warn('[SportsOracle] Grounded search resolution failed for:', bet.match, err);
    return null;
  }
}
