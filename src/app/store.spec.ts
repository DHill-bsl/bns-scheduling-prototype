import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Store } from './store';
import { samplePlan } from '../../testing/sample-plan';
import { addDays, Progress } from './models';
import { validOutput, unassigned } from './planning';
let store: Store;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('lab-planner-fictional-v1', JSON.stringify(samplePlan()));
  store = new Store();
});
describe('Browser data service', () => {
  it('persists changes across a fresh service instance', () => {
    const work = { ...store.state().work[0], id: 'new', project: 'NEW' };
    expect(store.saveWork(work)).toBe(true);
    expect(new Store().state().work.find((w) => w.id === 'new')?.project).toBe('NEW');
  });
  it('rejects progress exceeding the unattempted quantity without changing data', () => {
    const previous = structuredClone(store.state());
    expect(store.progress(progress(3, 0))).toBe(false);
    expect(store.state()).toEqual(previous);
  });
  it('creates linked repeats without counting failed output twice', () => {
    expect(store.progress(progress(1, 1))).toBe(true);
    expect(validOutput(store.state(), 'w1')).toBe(9);
    expect(store.state().work[0].quantity).toBe(36);
    const repeat = store.state().repeats.at(-1)!;
    expect(repeat.assignmentId).toBe('a1');
    expect(repeat.samples).toBe('M05 / replicate 1');
    expect(unassigned(store.state(), 'w1')).toBe(15);
  });
  it('moves all unfinished quantity to a split while preserving original progress', () => {
    const s = store.state(),
      a = {
        ...s.assignments[0],
        id: 'split',
        quantity: 2,
        date: addDays(s.week, 2),
        samples: 'M04 / replicates 2–3',
      };
    expect(
      store.saveAssignment(a, 'Finish later', 'a1', 'M01–M03 / replicates 1–3; M04 / replicate 1'),
    ).toBe(true);
    expect(store.state().assignments.find((a) => a.id === 'a1')?.quantity).toBe(10);
    expect(store.state().progress[0].assignmentId).toBe('a1');
    expect(unassigned(store.state(), 'w1')).toBe(14);
  });
  it('rejects removing performed attempts', () => {
    expect(store.removeAssignment('a1')).toBe(false);
    expect(store.state().assignments.some((a) => a.id === 'a1')).toBe(true);
  });
  it('separates successful performance from checked, approved and reported states', () => {
    const a = store.state().assignments.find((a) => a.id === 'a4')!;
    expect(store.progress({ ...progress(12, 0), assignmentId: a.id })).toBe(true);
    expect(store.state().work.find((w) => w.id === 'w4')?.stage).toBe('Performed');
    for (const stage of ['Checked', 'Approved', 'Reported']) {
      expect(store.stage('w4')).toBe(true);
      expect(store.state().work.find((w) => w.id === 'w4')?.stage).toBe(stage);
    }
    expect(store.stage('w1')).toBe(false);
  });
  it('keeps issued copies immutable and revisions explicit', () => {
    const a = store.state().assignments[1];
    store.issue(a.date, [a.personId]);
    const issued = structuredClone(store.latestSheet(a.date, a.personId)!);
    store.saveAssignment({ ...a, instructions: 'Replacement instructions' }, 'New handover');
    expect(store.changedSheet(issued)).toBe(true);
    expect(store.latestSheet(a.date, a.personId)?.lines[0].assignment.instructions).toBe(
      issued.lines[0].assignment.instructions,
    );
    store.issue(a.date, [a.personId]);
    expect(store.latestSheet(a.date, a.personId)?.version).toBe(2);
    expect(store.state().sheets[0]).toEqual(issued);
    store.issue(a.date, [a.personId]);
    expect(store.state().sheets).toHaveLength(2);
  });
  it('does not request new paper just because work has been performed', () => {
    const a = store.state().assignments.find((a) => a.id === 'a4')!;
    store.issue(a.date, [a.personId]);
    const issued = store.latestSheet(a.date, a.personId)!;
    store.progress({ ...progress(12, 0), assignmentId: a.id });
    expect(store.changedSheet(issued)).toBe(false);
  });
  it('issues a cancellation copy after all work is removed from an issued day', () => {
    const a = store.state().assignments[1];
    store.issue(a.date, [a.personId]);
    store.removeAssignment(a.id);
    expect(store.changedSheet(store.latestSheet(a.date, a.personId)!)).toBe(true);
    store.issue(a.date, [a.personId]);
    const latest = store.latestSheet(a.date, a.personId)!;
    expect(latest.version).toBe(2);
    expect(latest.lines).toHaveLength(0);
    expect(store.changedSheet(latest)).toBe(false);
  });
  it('refuses to overwrite a newer tab revision', () => {
    store.saveWork({ ...store.state().work[0], id: 'new' });
    const raw = JSON.parse(localStorage.getItem('lab-planner-fictional-v1')!);
    raw.revision++;
    localStorage.setItem('lab-planner-fictional-v1', JSON.stringify(raw));
    expect(store.removeAssignment('a2')).toBe(false);
    expect(store.error()).toContain('another tab');
  });
  it('resets work and progress to an empty plan', () => {
    store.issue(store.state().week, ['p1']);
    store.progress(progress(2, 0));
    store.reset();
    expect(store.state().sheets).toHaveLength(0);
    expect(store.state().work).toEqual([]);
    expect(store.state().assignments).toEqual([]);
    expect(store.state().progress).toEqual([]);
    expect(store.state().repeats).toEqual([]);
    expect(store.state().reservations).toEqual([]);
    expect(store.state().audit).toEqual([]);
    expect(store.state().standards.every((s) => !s.preparedAt)).toBe(true);
  });
  it('shows an error for corrupt data rather than overwriting it', () => {
    localStorage.setItem('lab-planner-fictional-v1', 'broken');
    const bad = new Store();
    expect(bad.error()).toContain('could not be read');
    expect(localStorage.getItem('lab-planner-fictional-v1')).toBe('broken');
    bad.reset();
    expect(bad.error()).toBe('');
  });
  it('keeps the previous state if storage fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('Storage is full');
    });
    const before = structuredClone(store.state());
    expect(store.removeAssignment('a2')).toBe(false);
    expect(store.state()).toEqual(before);
    spy.mockRestore();
  });
});
function progress(valid: number, failed: number): Progress {
  return {
    id: 'progress-new',
    assignmentId: 'a1',
    valid,
    failed,
    note: 'Instrument interrupted',
    samples: 'M05 / replicate 1',
    fresh: true,
    at: new Date().toISOString(),
  };
}
