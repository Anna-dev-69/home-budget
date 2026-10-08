const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const NBSP = '\u00A0';

/** Groups thousands manually: Intl support differs between Hermes builds and the web. */
export function formatNumber(value: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const rounded = Math.round(abs * 100) / 100;
  const [int, frac] = rounded.toFixed(Number.isInteger(rounded) ? 0 : 2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (negative ? '−' : '') + grouped + (frac ? ',' + frac : '');
}

export function formatMoney(value: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && value > 0 ? '+' : '';
  return sign + formatNumber(value) + NBSP + '₽';
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',') + ' млн';
  if (abs >= 1000) return Math.round(value / 1000) + ' тыс';
  return String(Math.round(value));
}

export function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function shiftDate(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyOf(todayISO());
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

export function monthShort(key: string): string {
  return MONTHS_SHORT[Number(key.split('-')[1]) - 1];
}

/** Lowercase month for "за октябрь" / "на октябрь". */
export function monthAccusative(key: string): string {
  return MONTHS[Number(key.split('-')[1]) - 1].toLowerCase();
}

export function dateLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

export function dayHeader(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Сегодня';
  if (iso === shiftDate(today, -1)) return 'Вчера';
  const d = parseISODate(iso);
  return `${dateLabel(iso)}, ${WEEKDAYS[d.getDay()]}`;
}

/** "до июня 2027" */
export function deadlineLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `до ${MONTHS_GENITIVE[m - 1]} ${y}`;
}

export function monthsUntil(key: string): number {
  const [y, m] = key.split('-').map(Number);
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
