import { beforeEach, describe, expect, it } from 'vitest';
import { Store } from './store';
import { samplePlan } from '../../testing/sample-plan';
import { Rejection, addDays } from './models';
import {
  assignmentMethod,
  assignmentStandard,
  attempted,
  progressSummary,
  sheetFingerprint,
  unassigned,
  validOutput,
  unfinished,
} from './planning';
import { preparationBookings, preparationChecks, PreparationPlan } from './preparation';
let store: Store;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('bns-planner-v2', JSON.stringify(samplePlan()));
  store = new Store();
});
const rejection = (quantity = 1): Rejection => ({
  id: crypto.randomUUID(),
  progressId: 'pr2',
  quantity,
  reason: 'Later QC review failed',
  samples: 'V01 / replicate 1',
  fresh: true,
  at: new Date().toISOString(),
});

describe('Precise handovers and later failures', () => {
  it('requires an explicit subset when saving or issuing legacy assignments', () => {
    const s = store.state();
    expect(store.saveAssignment({ ...s.assignments[1], samples: '' }, 'Clarify scope')).toBe(false);
    const legacy = structuredClone(s);
    delete legacy.assignments[1].samples;
    localStorage.setItem('bns-planner-v2', JSON.stringify(legacy));
    store = new Store();
    expect(store.issue(legacy.assignments[1].date, ['p3'])).toBe(false);
    expect(store.state().sheets).toEqual([]);
    expect(store.state().assignments[1].samples).toBeUndefined();
  });
  it('requires different retained and moved scope without silently parsing IDs', () => {
    const a = {
      ...store.state().assignments[0],
      id: 'split',
      quantity: 2,
      samples: 'M04 / replicates 2–3',
    };
    const before = structuredClone(store.state());
    expect(store.saveAssignment(a, 'Cover absence', 'a1')).toBe(false);
    expect(store.saveAssignment(a, 'Cover absence', 'a1', a.samples)).toBe(false);
    expect(store.state()).toEqual(before);
    expect(store.saveAssignment(a, 'Cover absence', 'a1', 'M01–M03 / R1–R3; M04 / R1')).toBe(true);
    expect(store.state().assignments[0].samples).toBe('M01–M03 / R1–R3; M04 / R1');
    expect(store.state().assignments.at(-1)?.samples).toBe(a.samples);
    expect(store.state().audit[0].details?.join(' ')).toContain('Assigned IDs');
  });
  it('prints only a partial repeat assignment subset and freezes its progress summary', () => {
    const s = store.state();
    const a = {
      ...s.assignments[1],
      id: 'repeat',
      repeatId: 'r1',
      quantity: 1,
      samples: 'M03 / replicate 2',
    };
    expect(store.saveAssignment(a, '')).toBe(true);
    expect(store.issue(a.date, [a.personId])).toBe(true);
    const line = store
      .latestSheet(a.date, a.personId)!
      .lines.find((l) => l.assignment.id === a.id)!;
    expect(line.assignment.samples).toBe('M03 / replicate 2');
    expect(line.repeat?.samples).toContain('M04'); // Full failure scope is evidence, not the assigned subset.
    expect(line.progressSummary).toEqual({ valid: 0, failed: 0, remaining: 1 });
    const copy = structuredClone(store.latestSheet(a.date, a.personId));
    store.progress({
      id: 'repeat-done',
      assignmentId: a.id,
      valid: 1,
      failed: 0,
      samples: a.samples,
      note: '',
      fresh: false,
      at: new Date().toISOString(),
    });
    expect(store.latestSheet(a.date, a.personId)).toEqual(copy);
  });
  it('shows prior output and unattempted quantities on a newly issued handover', () => {
    const a = store.state().assignments[0];
    store.issue(a.date, [a.personId]);
    expect(store.latestSheet(a.date, a.personId)!.lines[0].progressSummary).toEqual({
      valid: 8,
      failed: 2,
      remaining: 2,
    });
  });
  it('rejects previously reported output without erasing evidence or adding demand', () => {
    store.stage('w5');
    store.stage('w5');
    expect(store.state().work.find((w) => w.id === 'w5')!.stage).toBe('Reported');
    const original = structuredClone(store.state().progress);
    expect(store.rejectOutput(rejection(2))).toBe(true);
    expect(store.state().progress).toEqual(original);
    expect(validOutput(store.state(), 'w5')).toBe(4);
    expect(attempted(store.state(), 'a6')).toBe(6);
    expect(unassigned(store.state(), 'w5')).toBe(2);
    expect(store.state().work.find((w) => w.id === 'w5')!.quantity).toBe(6);
    expect(store.state().work.find((w) => w.id === 'w5')!.stage).toBe('Awaiting work');
    expect(store.state().repeats.at(-1)).toMatchObject({
      assignmentId: 'a6',
      progressId: 'pr2',
      quantity: 2,
    });
    expect(store.stage('w5')).toBe(false);
    expect(new Store().state().rejections).toHaveLength(1);
  });
  it('blocks over-rejection, repeated submission, missing evidence and invalid quantities', () => {
    for (const quantity of [0, -1, 1.5, 7])
      expect(store.rejectOutput(rejection(quantity))).toBe(false);
    expect(store.rejectOutput({ ...rejection(), reason: '' })).toBe(false);
    expect(store.rejectOutput({ ...rejection(), samples: '' })).toBe(false);
    const r = rejection(4);
    expect(store.rejectOutput(r)).toBe(true);
    expect(store.rejectOutput(r)).toBe(false);
    expect(store.rejectOutput(rejection(3))).toBe(false);
    expect(validOutput(store.state(), 'w5')).toBe(2);
  });
  it('counts a successful repeat of rejected output once, including later rejection of that repeat', () => {
    store.rejectOutput(rejection());
    const r = store.state().repeats.at(-1)!;
    const a = {
      ...store.state().assignments.find((a) => a.id === 'a6')!,
      id: 'new-repeat',
      repeatId: r.id,
      quantity: 1,
      samples: 'V01 / replicate 1',
    };
    expect(store.saveAssignment(a, '')).toBe(true);
    expect(
      store.progress({
        id: 'repeat-update',
        assignmentId: a.id,
        valid: 1,
        failed: 0,
        samples: a.samples,
        note: '',
        fresh: false,
        at: new Date().toISOString(),
      }),
    ).toBe(true);
    expect(validOutput(store.state(), 'w5')).toBe(6);
    expect(unassigned(store.state(), 'w5')).toBe(0);
    expect(store.rejectOutput({ ...rejection(), progressId: 'repeat-update' })).toBe(true);
    expect(validOutput(store.state(), 'w5')).toBe(5);
    expect(unassigned(store.state(), 'w5')).toBe(1);
    expect(store.state().repeats.at(-1)?.assignmentId).toBe('new-repeat');
  });
  it('lists unfinished work on old dates, but does not treat rejected performed work as unattempted', () => {
    store.rejectOutput(rejection());
    const list = unfinished(store.state(), addDays(store.state().week, 1));
    expect(list.map((a) => a.id)).toContain('a1');
    expect(list.map((a) => a.id)).not.toContain('a6');
    expect(
      progressSummary(
        store.state(),
        store.state().assignments.find((a) => a.id === 'a6')!,
      ),
    ).toEqual({ valid: 5, failed: 1, remaining: 0 });
  });
});

describe('Source examples and historical context', () => {
  it('distinguishes calibration-standard stability from short-lived QC preparation', () => {
    const standard = store.state().standards.find((s) => s.id === 'std-carb')!;
    expect(standard.shelfHours).toBe(9 * 7 * 24);
    expect(standard.notes).toContain('§9.4.1');
    expect(standard.steps.some((s) => s.name === 'Derivatise')).toBe(false);
    expect(
      store
        .state()
        .methods.find((m) => m.id === 'NTM0025a')!
        .steps.some((s) => s.name === 'Timed derivatisation'),
    ).toBe(true);
  });
  it('keeps performed recipes and preparations while refreshing unstarted plans', () => {
    const s = store.state();
    const oldMethod = structuredClone(s.methods[0]),
      oldStandard = structuredClone(s.standards[0]);
    const a = s.assignments[0],
      b = s.assignments[1];
    const oldFingerprint = sheetFingerprint(s, a.date, a.personId);
    const method = structuredClone(oldMethod);
    method.steps[0].duration = 60;
    expect(store.saveDefinition(method, 'methods')).toBe(true);
    expect(
      store.saveDefinition(
        { ...oldStandard, preparedAt: addDays(s.week, 4) + 'T08:00' },
        'standards',
      ),
    ).toBe(true);
    expect(assignmentMethod(store.state(), a)).toEqual(method); // The old external reference is not the saved assignment.
    const saved = store.state().assignments.find((x) => x.id === a.id)!;
    expect(assignmentMethod(store.state(), saved)).toEqual(oldMethod);
    expect(assignmentStandard(store.state(), saved)).toEqual(oldStandard);
    expect(
      assignmentMethod(
        store.state(),
        store.state().assignments.find((x) => x.id === b.id)!,
      ),
    ).toEqual(method);
    expect(sheetFingerprint(store.state(), a.date, a.personId)).toBe(oldFingerprint);
  });
  it('does not carry old attempt context into a new split', () => {
    store.saveDefinition(
      { ...store.state().standards[0], preparedAt: addDays(store.state().week, 1) + 'T07:00' },
      'standards',
    );
    const original = store.state().assignments[0];
    expect(original.standardSnapshot).toBeDefined();
    const split = {
      ...original,
      id: 'split',
      quantity: 2,
      samples: 'M04 / R2–R3',
      date: addDays(store.state().week, 2),
    };
    expect(store.saveAssignment(split, 'Continue later', 'a1', 'M01–M03 / R1–R3; M04 / R1')).toBe(
      true,
    );
    expect(store.state().assignments.at(-1)?.standardSnapshot).toBeUndefined();
  });
  it('loads older saved data without overwriting it or inventing IDs', () => {
    const s = structuredClone(store.state());
    delete s.rejections;
    delete s.assignments[0].samples;
    const raw = JSON.stringify(s);
    localStorage.setItem('bns-planner-v2', raw);
    const loaded = new Store();
    expect(loaded.state()).toEqual(s);
    expect(validOutput(loaded.state(), 'w1')).toBe(8);
    expect(localStorage.getItem('bns-planner-v2')).toBe(raw);
  });
});

describe('Linked standard preparation', () => {
  const plan = (): PreparationPlan => ({
    standardId: 'std-nic',
    personId: 'p2',
    date: addDays(store.state().week, 4),
    time: '08:00',
    equipment: { Balance: 'e7' },
  });
  it('books analyst and equipment steps atomically without marking readiness', () => {
    const preparedAt = store.state().standards[0].preparedAt;
    const oldCount = store.state().reservations.length;
    expect(store.planPreparation(plan(), false)).toBe(true);
    const bookings = store.state().reservations.slice(oldCount);
    expect(bookings).toHaveLength(3);
    expect(new Set(bookings.map((r) => r.preparationId)).size).toBe(1);
    expect(bookings.map((r) => [r.resourceId, r.time, r.minutes])).toEqual([
      ['p2', '08:00', 45],
      ['e7', '08:00', 45],
      ['p2', '08:45', 15],
    ]);
    expect(store.state().standards[0].preparedAt).toBe(preparedAt);
    store.removeReservation(bookings[1].id);
    expect(store.state().reservations).toHaveLength(oldCount);
  });
  it('requires valid resources and acknowledgement for clashes', () => {
    expect(store.planPreparation({ ...plan(), equipment: { Balance: 'e1' } }, true)).toBe(false);
    expect(store.planPreparation({ ...plan(), personId: '' }, true)).toBe(false);
    const clash = { ...plan(), date: store.state().week, time: '09:00' };
    expect(preparationChecks(store.state(), clash).some((c) => c.text.includes('overlaps'))).toBe(
      true,
    );
    expect(store.planPreparation(clash, false)).toBe(false);
    expect(store.planPreparation(clash, true)).toBe(true);
  });
  it('separates hands-on and waiting time in a preparation recipe', () => {
    const s = structuredClone(store.state());
    s.standards[0].steps[0] = { name: 'Wait', duration: 60, handsOn: 10, equipment: 'Balance' };
    const bookings = preparationBookings(s, plan(), 'test');
    expect(bookings[0].minutes).toBe(10);
    expect(bookings[1].minutes).toBe(60);
    expect(bookings[2].time).toBe('09:00');
  });
});
