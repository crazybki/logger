export const DEFAULT_WORK_SCHEDULE = {
  start: "08:00", end: "16:00", breakStart: "11:30", breakMinutes: 30,
  weekdays: [1, 2, 3, 4, 5],
};

function minutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

export function isValidWorkSchedule(value) {
  if (!value) return false;
  const start = minutes(value.start), end = minutes(value.end), lunch = minutes(value.breakStart);
  return end > start && Number.isFinite(lunch) &&
    Number.isInteger(Number(value.breakMinutes)) && Number(value.breakMinutes) >= 0 &&
    (Number(value.breakMinutes) === 0 || (lunch >= start && lunch + Number(value.breakMinutes) <= end)) &&
    Array.isArray(value.weekdays) && value.weekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function calculateExpectedMinutes(now, schedule = DEFAULT_WORK_SCHEDULE) {
  if (!isValidWorkSchedule(schedule) || !schedule.weekdays.includes(now.getDay())) return 0;
  const start = minutes(schedule.start), end = minutes(schedule.end);
  const elapsedEnd = Math.min(end, now.getHours() * 60 + now.getMinutes());
  const elapsed = Math.max(0, elapsedEnd - start);
  const lunchElapsed = Math.max(0, Math.min(Number(schedule.breakMinutes), elapsedEnd - minutes(schedule.breakStart)));
  return Math.max(0, elapsed - lunchElapsed);
}

export function calculateLoggingDifference(actual, expected, tolerance = 5) {
  const difference = actual - expected;
  return { difference, status: Math.abs(difference) <= tolerance ? "onTrack" : difference < 0 ? "behind" : "ahead" };
}

export function calculateProgress(actual, expected) {
  return expected > 0 ? Math.max(0, Math.round(actual / expected * 100)) : 0;
}
