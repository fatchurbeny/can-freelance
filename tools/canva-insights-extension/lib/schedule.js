/** Jadwal sinkron harian (jam lokal perangkat). Fungsi murni agar bisa dites tanpa chrome.*. */

export const DEFAULT_SCHEDULE_TIME = '12:00';

/** "HH:MM" → [jam, menit]; nilai tidak valid → jadwal default. */
export function parseTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim());
  if (m && Number(m[1]) < 24 && Number(m[2]) < 60) return [Number(m[1]), Number(m[2])];
  return parseTime(DEFAULT_SCHEDULE_TIME);
}

/** Jadwal hari ini (jam lokal) dalam ms, walau sudah lewat. */
export function todaysSlot(time, now = Date.now()) {
  const [h, m] = parseTime(time);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Jadwal berikutnya yang masih di depan `now`. */
export function nextSlot(time, now = Date.now()) {
  const today = todaysSlot(time, now);
  if (today > now) return today;
  const d = new Date(today);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Jadwal hari ini sudah lewat tetapi belum ada sinkron terjadwal sejak itu (browser tertutup saat jamnya). */
export function missedToday(time, lastScheduledAt, now = Date.now()) {
  const today = todaysSlot(time, now);
  return now >= today && (lastScheduledAt ?? 0) < today;
}
