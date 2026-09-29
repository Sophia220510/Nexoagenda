export function intervalOverlapsSlot(
  intervalStart: number,
  intervalEnd: number,
  slotStart: number,
  slotMinutes: number,
) {
  const slotEnd = slotStart + slotMinutes;
  return intervalStart < slotEnd && intervalEnd > slotStart;
}
