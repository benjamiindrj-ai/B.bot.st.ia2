// Utility for Paris, France (Europe/Paris) Timezone formatting and relative countdowns

export function getParisTimeParts(timestamp: number = Date.now()) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  return {
    day: parseInt(findPart('day'), 10),
    month: parseInt(findPart('month'), 10),
    year: parseInt(findPart('year'), 10),
    hour: parseInt(findPart('hour'), 10),
    minute: parseInt(findPart('minute'), 10),
    second: parseInt(findPart('second'), 10),
  };
}

export function formatParisTime(timestamp: number = Date.now(), includeSeconds: boolean = false): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatParisDateTime(timestamp: number = Date.now()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatParisFullDate(timestamp: number = Date.now()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatParisDateOnly(timestamp: number = Date.now()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Parses any kickoff time string (e.g. "20:45", "20h45", "Aujourd'hui à 20:45", "Ce soir à 21h00", "Demain à 14:30")
 * and reconciles it with the current Paris clock to ensure 100% mathematical consistency down to the exact minute.
 */
export function synchronizeParisKickoff(
  rawKickoffTime?: string,
  rawMinutesUntilKickoff?: number,
  existingTimestamp?: number,
  baseNowMs: number = Date.now()
): {
  kickoffTimestamp: number;
  minutesUntilKickoff: number;
  kickoffTime: string;
  isPast: boolean;
} {
  const nowParts = getParisTimeParts(baseNowMs);
  const nowMinsOfDay = nowParts.hour * 60 + nowParts.minute;

  let targetTimestamp = existingTimestamp;
  let targetMinsOffset: number | null = null;

  // 1. Try to extract explicit HH:MM or HHhMM from rawKickoffTime (e.g., "20:45", "20h45", "21:00")
  if (rawKickoffTime) {
    const timeMatch = rawKickoffTime.match(/\b([0-2]?[0-9])[:hH]([0-5][0-9])\b/);
    if (timeMatch) {
      const matchHour = parseInt(timeMatch[1], 10);
      const matchMinute = parseInt(timeMatch[2], 10);

      if (matchHour >= 0 && matchHour <= 23 && matchMinute >= 0 && matchMinute <= 59) {
        const matchMinsOfDay = matchHour * 60 + matchMinute;
        const isExplicitTomorrow = /demain|cette nuit/i.test(rawKickoffTime);
        const isExplicitToday = /aujourd'hui|ce soir|cet après-midi/i.test(rawKickoffTime);

        if (isExplicitTomorrow) {
          targetMinsOffset = (1440 - nowMinsOfDay) + matchMinsOfDay;
        } else if (isExplicitToday) {
          targetMinsOffset = matchMinsOfDay - nowMinsOfDay;
        } else {
          // If match time is later today (> now + 20 min)
          if (matchMinsOfDay >= nowMinsOfDay + 20) {
            targetMinsOffset = matchMinsOfDay - nowMinsOfDay;
          } else {
            // Otherwise it's tomorrow (or overnight)
            targetMinsOffset = (1440 - nowMinsOfDay) + matchMinsOfDay;
          }
        }
      }
    }
  }

  // 2. If no time was extracted from string, check provided rawMinutesUntilKickoff or existingTimestamp
  if (targetMinsOffset === null) {
    if (typeof rawMinutesUntilKickoff === 'number' && !isNaN(rawMinutesUntilKickoff) && rawMinutesUntilKickoff > 0) {
      targetMinsOffset = rawMinutesUntilKickoff;
    } else if (targetTimestamp && targetTimestamp > baseNowMs) {
      targetMinsOffset = Math.round((targetTimestamp - baseNowMs) / 60000);
    } else {
      // Default fallback in valid range [60m to 360m]
      targetMinsOffset = 120;
    }
  }

  targetTimestamp = baseNowMs + targetMinsOffset * 60000;

  // Format the synchronized display
  const targetParts = getParisTimeParts(targetTimestamp);
  const hourStr = targetParts.hour.toString().padStart(2, '0');
  const minStr = targetParts.minute.toString().padStart(2, '0');
  const timeStr = `${hourStr}:${minStr}`;

  const diffMs = targetTimestamp - baseNowMs;
  const minutesLeft = Math.round(diffMs / 60000);

  const isSameDay = targetParts.day === nowParts.day && targetParts.month === nowParts.month;
  let dayPrefix = "Aujourd'hui";
  if (!isSameDay) {
    dayPrefix = targetParts.hour < 6 ? 'Cette nuit' : 'Demain';
  } else if (targetParts.hour >= 20) {
    dayPrefix = 'Ce soir';
  }

  let formattedKickoff = '';
  let isPast = false;

  if (diffMs <= 0) {
    isPast = true;
    const elapsed = Math.abs(minutesLeft);
    formattedKickoff = elapsed > 120 
      ? `${dayPrefix} à ${timeStr} (Terminé)` 
      : `${dayPrefix} à ${timeStr} (En cours - ${elapsed} min)`;
  } else {
    const hours = Math.floor(minutesLeft / 60);
    const mins = minutesLeft % 60;
    const deltaStr = hours > 0 
      ? (mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h00`)
      : `${mins} min`;
    formattedKickoff = `${dayPrefix} à ${timeStr} (Dans ${deltaStr})`;
  }

  return {
    kickoffTimestamp: targetTimestamp,
    minutesUntilKickoff: minutesLeft,
    kickoffTime: formattedKickoff,
    isPast,
  };
}

export function formatKickoffCountdown(kickoffTimestamp?: number, fallbackKickoffTime?: string): {
  badgeText: string;
  isPast: boolean;
  minutesLeft: number;
} {
  const synced = synchronizeParisKickoff(fallbackKickoffTime, undefined, kickoffTimestamp, Date.now());
  return {
    badgeText: synced.kickoffTime,
    isPast: synced.isPast,
    minutesLeft: synced.minutesUntilKickoff,
  };
}

