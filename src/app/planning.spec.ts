import { describe, it, expect } from 'vitest';
import { samplePlan as seed } from '../../testing/sample-plan';
import {
  allocationLeft,
  assignmentChecks,
  attempted,
  overlaps,
  segments,
  sheetFingerprint,
  unassigned,
  validOutput,
} from './planning';
import { addDays, stamp } from './models';

describe('Planning rules', () => {
  it('keeps demand, original allocation, failures and valid output separate', () => {
    const s = seed();
    expect(validOutput(s, 'w1')).toBe(8);
    expect(attempted(s, 'a1')).toBe(10);
    expect(allocationLeft(s, 'w1')).toBe(12);
    expect(unassigned(s, 'w1')).toBe(14);
    expect(s.work[0].quantity).toBe(36);
  });
  it('allows touching bookings but detects an actual overlap', () => {
    expect(overlaps({ start: 1, end: 3 }, { start: 3, end: 4 })).toBe(false);
    expect(overlaps({ start: 1, end: 4 }, { start: 3, end: 5 })).toBe(true);
  });
  it('does not occupy an analyst during the whole instrument run', () => {
    const s = seed(),
      a = s.assignments[0],
      parts = segments(s, a);
    const person = parts.filter((x) => x.resourceId === a.personId),
      hplc = parts.find((x) => x.resourceId === 'e3')!;
    expect(person.reduce((n, x) => n + (x.end - x.start) / 60000, 0)).toBe(135);
    expect((hplc.end - hplc.start) / 60000).toBe(180);
    expect(
      person.some((x) =>
        overlaps(x, { start: stamp(a.date, '11:00'), end: stamp(a.date, '12:00') }),
      ),
    ).toBe(false);
  });
  it('warns about equipment reserved by another team', () => {
    const s = seed(),
      checks = assignmentChecks(
        s,
        s.assignments.find((a) => a.id === 'a4')!,
      );
    expect(checks.some((c) => c.level === 'warning' && c.text.includes('development team'))).toBe(
      true,
    );
    expect(checks.some((c) => c.level === 'block')).toBe(false);
  });
  it('warns about leave, sample readiness and expected availability', () => {
    const s = seed(),
      a = { ...s.assignments[1], id: 'new', workId: 'w2', date: addDays(s.week, 2), quantity: 6 };
    expect(assignmentChecks(s, a).some((c) => c.text.includes('Annual leave'))).toBe(true);
    expect(assignmentChecks(s, a).some((c) => c.text.includes('not marked ready'))).toBe(true);
    a.date = s.week;
    expect(assignmentChecks(s, a).some((c) => c.text.includes('expected on'))).toBe(true);
  });
  it('does not derive qualification from a standard level', () => {
    const s = seed(),
      a = { ...s.assignments[1], id: 'new', quantity: 1 };
    s.standards[0].level = 'L3';
    expect(assignmentChecks(s, a).some((c) => c.text.includes('qualification'))).toBe(false);
  });
  it('blocks over-allocation, fractional quantities and wrong equipment types', () => {
    const s = seed(),
      a = { ...s.assignments[1], id: 'new', quantity: 13 };
    expect(
      assignmentChecks(s, a).some(
        (c) => c.level === 'block' && c.text.includes('already assigned'),
      ),
    ).toBe(true);
    a.quantity = 1.5;
    expect(assignmentChecks(s, a).some((c) => c.text.includes('whole quantity'))).toBe(true);
    a.quantity = 1;
    a.equipment = { ...a.equipment, 'HPLC-UV': 'e1' };
    expect(assignmentChecks(s, a).some((c) => c.text === 'Choose equipment for HPLC-UV.')).toBe(
      true,
    );
  });
  it('preserves the person and dates of performed attempts', () => {
    const s = seed(),
      a = { ...s.assignments[0], date: addDays(s.week, 1) };
    expect(
      assignmentChecks(s, a).some(
        (c) => c.level === 'block' && c.text.includes('recorded attempts'),
      ),
    ).toBe(true);
  });
  it('checks standard readiness and shelf life through the end of work', () => {
    const s = seed(),
      a = s.assignments[2];
    s.standards[1].preparedAt = '';
    expect(assignmentChecks(s, a).some((c) => c.text.includes('not been recorded'))).toBe(true);
    s.standards[1].preparedAt = s.week + 'T08:00';
    s.standards[1].shelfHours = 2;
    expect(assignmentChecks(s, a).some((c) => c.text.includes('shelf life'))).toBe(true);
  });
  it('does not silently skip the standard check when none is selected', () => {
    const s = seed();
    s.work[0].standardId = '';
    expect(
      assignmentChecks(s, s.assignments[0]).some((c) => c.text.includes('No standard is selected')),
    ).toBe(true);
  });
  it('marks sheets changed for new equipment downtime or modified recipes', () => {
    const s = seed(),
      a = s.assignments[1],
      before = sheetFingerprint(s, a.date, a.personId);
    s.reservations.push({
      id: 'new',
      resourceId: 'e4',
      date: a.date,
      time: '10:00',
      minutes: 180,
      label: 'Unexpected maintenance',
    });
    expect(sheetFingerprint(s, a.date, a.personId)).not.toBe(before);
    const next = sheetFingerprint(s, a.date, a.personId);
    s.methods[0].steps[0].duration = 40;
    expect(sheetFingerprint(s, a.date, a.personId)).not.toBe(next);
  });
});
