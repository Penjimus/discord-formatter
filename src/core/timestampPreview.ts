// Aperçu lisible d'un horodatage, en français, dans le style choisi (S8c).
// Formes reprises du tableau de docs/discord-rules.md §8 (affichage français constaté en H1).
import type { TimestampStyle } from './document';

export interface PreviewOptions {
  /** Fuseau horaire du lecteur ; par défaut celui de l'ordinateur. */
  timeZone?: string;
  /** Instant présent, pour le temps relatif (R). */
  now?: Date;
}

/** Morceaux de la date dans le fuseau voulu : jour, mois, année, jour de la semaine, heure. */
function dateParts(date: Date, timeZone: string | undefined): Record<string, string> {
  const format = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]));
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Numéro du mois (1 à 12) dans le fuseau voulu. */
function monthNumber(date: Date, timeZone: string | undefined): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric' }).format(date));
}

/**
 * Temps relatif (R) : « dans 2 mois », « il y a 5 minutes ».
 * Les seuils de passage d'une unité à l'autre sont ceux de l'appli : ceux de Discord ne sont pas testés.
 */
function relative(seconds: number, now: Date): string {
  const difference = seconds - Math.floor(now.getTime() / 1000);
  const size = Math.abs(difference);
  const sign = difference < 0 ? -1 : 1;
  const format = new Intl.RelativeTimeFormat('fr', { numeric: 'always' });
  const day = 24 * 3600;
  if (size < 60) return format.format(sign * size, 'second');
  if (size < 3600) return format.format(sign * Math.round(size / 60), 'minute');
  if (size < day) return format.format(sign * Math.round(size / 3600), 'hour');
  if (size < 30 * day) return format.format(sign * Math.round(size / day), 'day');
  if (size < 365 * day) return format.format(sign * Math.max(1, Math.round(size / (30.44 * day))), 'month');
  return format.format(sign * Math.max(1, Math.round(size / (365.25 * day))), 'year');
}

/** L'horodatage `<t:secondes:style>` tel que Discord l'affiche en français. */
export function timestampPreview(seconds: number, style: TimestampStyle | null, options: PreviewOptions = {}): string {
  const { timeZone, now = new Date() } = options;
  if (style === 'R') return relative(seconds, now);

  const date = new Date(seconds * 1000);
  const parts = dateParts(date, timeZone);
  const shortTime = `${parts.hour}:${parts.minute}`;
  const longTime = `${shortTime}:${parts.second}`;
  const shortDate = `${pad(Number(parts.day))}/${pad(monthNumber(date, timeZone))}/${parts.year}`;
  const longDate = `${parts.day} ${parts.month} ${parts.year}`;

  switch (style) {
    case 't': return shortTime;
    case 'T': return longTime;
    case 'd': return shortDate;
    case 'D': return longDate;
    case 'F': return `${parts.weekday} ${longDate} ${shortTime}`;
    case 's': return `${shortDate}, ${shortTime}`;
    case 'S': return `${shortDate}, ${longTime}`;
    case 'f':
    case null:
      return `${longDate} ${shortTime}`;
  }
}
