import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missedToday, nextSlot, parseTime, todaysSlot } from '../lib/schedule.js';

const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

test('parseTime menerima HH:MM dan jatuh ke 12:00 bila tidak valid', () => {
  assert.deepEqual(parseTime('07:30'), [7, 30]);
  assert.deepEqual(parseTime('7:05'), [7, 5]);
  assert.deepEqual(parseTime('25:00'), [12, 0]);
  assert.deepEqual(parseTime(undefined), [12, 0]);
});

test('nextSlot: hari ini bila belum lewat, besok bila sudah', () => {
  assert.equal(nextSlot('12:00', at(2026, 10, 30, 9)), at(2026, 10, 30, 12));
  assert.equal(nextSlot('12:00', at(2026, 10, 30, 12)), at(2026, 10, 31, 12));
  assert.equal(nextSlot('12:15', at(2026, 10, 30, 13)), at(2026, 10, 31, 12, 15));
});

test('nextSlot melewati pergantian bulan dan tahun', () => {
  assert.equal(nextSlot('12:00', at(2026, 10, 31, 18)), at(2026, 11, 1, 12));
  assert.equal(nextSlot('00:30', at(2026, 12, 31, 23)), at(2027, 1, 1, 0, 30));
});

test('missedToday hanya bila jadwal hari ini lewat dan belum dijalankan sejak itu', () => {
  const slot = todaysSlot('12:00', at(2026, 10, 30, 15));
  assert.equal(missedToday('12:00', 0, at(2026, 10, 30, 15)), true);
  assert.equal(missedToday('12:00', slot + 60_000, at(2026, 10, 30, 15)), false);
  assert.equal(missedToday('12:00', at(2026, 10, 29, 12), at(2026, 10, 30, 11)), false);
});
