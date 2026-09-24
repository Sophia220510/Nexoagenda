export interface MinuteInterval { start: number; end: number }
export interface BusyInterval extends MinuteInterval { cancelled?: boolean }

export function getProfessionalDuration(defaultMinutes: number, overrideMinutes?: number | null) {
  const duration = overrideMinutes ?? defaultMinutes;
  if (!Number.isInteger(duration) || duration < 5 || duration > 720) throw new Error("Duração inválida.");
  return duration;
}

function overlaps(left: MinuteInterval, right: MinuteInterval) {
  return left.start < right.end && right.start < left.end;
}

export function getAvailableSlotMinutes({
  workingHours,
  appointments,
  blockedTimes,
  durationMinutes,
  granularityMinutes,
}: {
  workingHours: MinuteInterval[];
  appointments: BusyInterval[];
  blockedTimes: MinuteInterval[];
  durationMinutes: number;
  granularityMinutes: number;
}) {
  if (granularityMinutes <= 0) throw new Error("Granularidade inválida.");
  const blockingAppointments = appointments.filter((item) => !item.cancelled);
  const slots: number[] = [];

  for (const period of workingHours) {
    for (let start = period.start; start + durationMinutes <= period.end; start += granularityMinutes) {
      const candidate = { start, end: start + durationMinutes };
      if (blockingAppointments.some((item) => overlaps(candidate, item))) continue;
      if (blockedTimes.some((item) => overlaps(candidate, item))) continue;
      slots.push(start);
    }
  }
  return slots;
}

