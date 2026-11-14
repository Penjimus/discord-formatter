// Aperçu lisible d'un horodatage, dans la langue de l'interface, dans le style choisi (S8c, S38).
// Français : formes reprises du tableau de docs/discord-rules.md §8 (affichage constaté en H1).
// Anglais : formes habituelles de l'anglais américain, À tester (§8) ; l'aperçu peut différer de Discord.
import type { TimestampStyle } from './document';

/** Langue de l'aperçu. */
export type PreviewLanguage = 'fr' | 'en';

export interface PreviewOptions {
  /** Fuseau horaire du lecteur ; par défaut celui de l'ordinateur. */
  timeZone?: string;
  /** Instant présent, pour le temps relatif (R). */
  now?: Date;
  /** Langue de l'aperçu ; par défaut le français. */
  language?: PreviewLanguage;
}

/** Morceaux de la date dans le fuseau voulu : jour, mois, année, jour de la semaine, heure. */
function dateParts(date: Date, timeZone: string | undefined, locale: string, hourCycle: 'h23' | 'h12'): Record<string, string> {
  const format = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: hourCycle === 'h23' ? '2-digit' : 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hourCycle,
  });
  return Object.fromEntries(format.formatToParts(date).map((part) => [part.type, part.value]));
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Numéro du mois (1 à 12) dans le fuseau voulu. */
function monthNumber(date: Date, timeZone: string | undefined): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric' }).format(date));
}

/**
 * Temps relatif (R) : « dans 2 mois », « il y a 5 minutes » (« in 2 months », « 5 minutes ago »).
 * Les seuils de passage d'une unité à l'autre sont ceux de l'appli : ceux de Discord ne sont pas testés.
 */
function relative(seconds: number, now: Date, language: PreviewLanguage): string {
  const difference = seconds - Math.floor(now.getTime() / 1000);
  const size = Math.abs(difference);
  const sign = difference < 0 ? -1 : 1;
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'always' });
  const day = 24 * 3600;
  if (size < 60) return format.format(sign * size, 'second');
  if (size < 3600) return format.format(sign * Math.round(size / 60), 'minute');
  if (size < day) return format.format(sign * Math.round(size / 3600), 'hour');
  if (size < 30 * day) return format.format(sign * Math.round(size / day), 'day');
  if (size < 365 * day) return format.format(sign * Math.max(1, Math.round(size / (30.44 * day))), 'month');
  return format.format(sign * Math.max(1, Math.round(size / (365.25 * day))), 'year');
}

/** Les formes courtes et longues de la date et de l'heure, dans la langue voulue. */
function forms(date: Date, timeZone: string | undefined, language: PreviewLanguage) {
  if (language === 'en') {
    const parts = dateParts(date, timeZone, 'en-US', 'h12');
    const period = parts.dayPeriod ? ` ${parts.dayPeriod}` : '';
    const longDate = `${parts.month} ${parts.day}, ${parts.year}`;
    return {
      shortTime: `${parts.hour}:${parts.minute}${period}`,
      longTime: `${parts.hour}:${parts.minute}:${parts.second}${period}`,
      shortDate: `${monthNumber(date, timeZone)}/${Number(parts.day)}/${parts.year}`,
      longDate,
      fullDate: `${parts.weekday}, ${longDate}`,
    };
  }
  const parts = dateParts(date, timeZone, 'fr-FR', 'h23');
  const longDate = `${parts.day} ${parts.month} ${parts.year}`;
  const shortTime = `${parts.hour}:${parts.minute}`;
  return {
    shortTime,
    longTime: `${shortTime}:${parts.second}`,
    shortDate: `${pad(Number(parts.day))}/${pad(monthNumber(date, timeZone))}/${parts.year}`,
    longDate,
    fullDate: `${parts.weekday} ${longDate}`,
  };
}

/** L'horodatage `<t:secondes:style>` tel que Discord l'affiche dans la langue voulue. */
export function timestampPreview(seconds: number, style: TimestampStyle | null, options: PreviewOptions = {}): string {
  const { timeZone, now = new Date(), language = 'fr' } = options;
  if (style === 'R') return relative(seconds, now, language);

  const { shortTime, longTime, shortDate, longDate, fullDate } = forms(new Date(seconds * 1000), timeZone, language);
  switch (style) {
    case 't': return shortTime;
    case 'T': return longTime;
    case 'd': return shortDate;
    case 'D': return longDate;
    case 'F': return `${fullDate} ${shortTime}`;
    case 's': return `${shortDate}, ${shortTime}`;
    case 'S': return `${shortDate}, ${longTime}`;
    case 'f':
    case null:
      return `${longDate} ${shortTime}`;
  }
}
