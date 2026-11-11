// Horário comercial da clínica (fuso de Brasília, UTC-3)
export const BUSINESS_HOURS = {
  startHour: 8,
  endHour: 18,
  days: [1, 2, 3, 4, 5], // seg a sex
  tzOffsetHours: -3,
};

const DAY_MS = 86400000;

function toLocalMs(ms: number) {
  return ms + BUSINESS_HOURS.tzOffsetHours * 3600000;
}

/** Retorna true se o instante está dentro do horário comercial. */
export function isBusinessTime(date: Date | string): boolean {
  const l = new Date(toLocalMs(new Date(date).getTime()));
  const day = l.getUTCDay();
  const hour = l.getUTCHours() + l.getUTCMinutes() / 60;
  return (
    BUSINESS_HOURS.days.includes(day) &&
    hour >= BUSINESS_HOURS.startHour &&
    hour < BUSINESS_HOURS.endHour
  );
}

/** Minutos úteis (horário comercial) entre dois instantes. */
export function businessMinutesBetween(start: Date | string, end: Date | string): number {
  const ls = toLocalMs(new Date(start).getTime());
  const le = toLocalMs(new Date(end).getTime());
  if (le <= ls) return 0;

  let total = 0;
  let dayStart = Math.floor(ls / DAY_MS) * DAY_MS;
  while (dayStart < le) {
    const day = new Date(dayStart).getUTCDay();
    if (BUSINESS_HOURS.days.includes(day)) {
      const ws = dayStart + BUSINESS_HOURS.startHour * 3600000;
      const we = dayStart + BUSINESS_HOURS.endHour * 3600000;
      total += Math.max(0, Math.min(le, we) - Math.max(ls, ws));
    }
    dayStart += DAY_MS;
  }
  return total / 60000;
}

/** Hora local (Brasília) de um instante. */
export function localHour(date: Date | string): number {
  return new Date(toLocalMs(new Date(date).getTime())).getUTCHours();
}

export function formatMinutes(mins: number | null): string {
  if (mins == null) return "—";
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h < 24) return m ? `${h}h ${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
