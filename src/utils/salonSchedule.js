const SALON_TIME_ZONE = 'Asia/Kolkata';
const OPEN_MINUTE = 9 * 60;
const CLOSE_MINUTE = 18 * 60;
const SLOT_INTERVAL_MINUTES = 30;
const IST_OFFSET_MINUTES = 5 * 60 + 30;

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function salonDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function appointmentStart(date, time) {
  const dateParts = date.toISOString().slice(0, 10).split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    hours,
    minutes
  ) - IST_OFFSET_MINUTES * 60 * 1000);
}

module.exports = {
  SALON_TIME_ZONE,
  OPEN_MINUTE,
  CLOSE_MINUTE,
  SLOT_INTERVAL_MINUTES,
  timeToMinutes,
  minutesToTime,
  salonDateString,
  appointmentStart,
};
