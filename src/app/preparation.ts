import { Check, Reservation, State, day, localStamp, stamp } from './models';
import { overlaps, segments, sum } from './planning';

export interface PreparationPlan {
  standardId: string;
  personId: string;
  date: string;
  time: string;
  equipment: Record<string, string>;
}

export function preparationBookings(s: State, plan: PreparationPlan, id: string): Reservation[] {
  const standard = s.standards.find((st) => st.id === plan.standardId);
  if (!standard || !Number.isFinite(stamp(plan.date, plan.time))) return [];
  let start = stamp(plan.date, plan.time);
  const bookings: Reservation[] = [];
  for (const step of standard.steps) {
    const add = (resourceId: string, minutes: number) => {
      if (!resourceId || !minutes) return;
      bookings.push({
        id: `${id}-${bookings.length}`,
        preparationId: id,
        standardId: standard.id,
        resourceId,
        date: day(new Date(start)),
        time: localStamp(start).slice(11, 16),
        minutes,
        label: `Prepare ${standard.name} · ${step.name}${step.equipment ? ' · ' + (s.equipment.find((e) => e.id === plan.equipment[step.equipment])?.name ?? step.equipment) : ''}`,
      });
    };
    add(plan.personId, step.handsOn);
    add(plan.equipment[step.equipment], step.equipment ? step.duration : 0);
    start += step.duration * 60000;
  }
  return bookings;
}

export function preparationChecks(s: State, plan: PreparationPlan): Check[] {
  const checks: Check[] = [];
  const standard = s.standards.find((st) => st.id === plan.standardId);
  if (!standard) return [{ level: 'block', text: 'Choose a standard.' }];
  if (!s.people.some((p) => p.id === plan.personId))
    checks.push({ level: 'block', text: 'Choose an analyst.' });
  const start = stamp(plan.date, plan.time);
  if (!Number.isFinite(start))
    checks.push({ level: 'block', text: 'Choose a date and start time.' });
  for (const type of new Set(standard.steps.map((st) => st.equipment).filter(Boolean)))
    if (!s.equipment.some((e) => e.id === plan.equipment[type] && e.type === type))
      checks.push({ level: 'block', text: `Choose equipment for ${type}.` });
  if (checks.length) return checks;
  const end = start + sum(standard.steps.map((st) => st.duration)) * 60000;
  if (
    start < stamp(plan.date, '08:00') ||
    end > stamp(plan.date, '17:00') ||
    [0, 6].includes(new Date(start).getDay())
  )
    checks.push({
      level: 'warning',
      text: 'Preparation is outside demo working hours (Monday–Friday, 08:00–17:00).',
    });
  const occupied = [
    ...s.assignments.flatMap((a) => segments(s, a)),
    ...s.reservations.map((r) => ({
      resourceId: r.resourceId,
      start: stamp(r.date, r.time),
      end: stamp(r.date, r.time) + r.minutes * 60000,
    })),
  ];
  for (const booking of preparationBookings(s, plan, 'preview')) {
    const range = {
      start: stamp(booking.date, booking.time),
      end: stamp(booking.date, booking.time) + booking.minutes * 60000,
    };
    if (
      occupied.some((other) => other.resourceId === booking.resourceId && overlaps(range, other))
    ) {
      const name =
        s.people.find((p) => p.id === booking.resourceId)?.name ??
        s.equipment.find((e) => e.id === booking.resourceId)?.name;
      checks.push({ level: 'warning', text: `${name}: preparation overlaps an existing booking.` });
    }
  }
  return checks.filter((c, i, all) => all.findIndex((x) => x.text === c.text) === i);
}
