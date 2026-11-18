import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './seed';
import { Store } from './store';
import { samplePlan } from '../../testing/sample-plan';

beforeEach(() => localStorage.clear());

const storageKey = 'lab-planner-fictional-v1';

describe('Fictional empty starting plan', () => {
  it('has no work, bookings, progress, paper or activity', () => {
    const s = seed();
    for (const key of [
      'work',
      'assignments',
      'reservations',
      'progress',
      'rejections',
      'repeats',
      'sheets',
      'audit',
    ] as const)
      expect(s[key], key).toEqual([]);
    expect(s.revision).toBe(0);
  });

  it('uses invented recipes and resources without claiming standards are prepared', () => {
    const s = seed();
    expect(s.methods.map((m) => m.id)).toEqual(['DEMO-101', 'DEMO-202']);
    expect(s.equipment).toHaveLength(8);
    expect(s.people).toHaveLength(4);
    expect(s.standards).toHaveLength(2);
    expect(s.standards.every((st) => st.preparedAt === '')).toBe(true);
    expect(s.standards.map((st) => st.shelfHours)).toEqual([72, 240]);
    for (const method of s.methods) {
      expect(method.id).toMatch(/^DEMO-\d{3}$/);
      expect(method.source).toMatch(/^Fictional demonstration only\./);
      expect(method.source).not.toMatch(/§|https?:|file:/);
    }
    for (const standard of s.standards)
      expect(standard.notes).toMatch(/^Fictional demonstration only\./);
    for (const definition of [...s.methods, ...s.standards]) {
      expect(definition.steps.length).toBeGreaterThan(0);
      for (const step of definition.steps)
        if (step.equipment) expect(s.equipment.some((e) => e.type === step.equipment)).toBe(true);
    }
  });

  it('uses the same fictional definitions in the busy regression fixture', () => {
    const demo = samplePlan();
    const defaults = seed();
    expect(demo.methods).toEqual(defaults.methods);
    expect(demo.equipment).toEqual(defaults.equipment);
    expect(demo.people).toEqual(defaults.people);
    expect(demo.standards.map((st) => ({ ...st, preparedAt: '' }))).toEqual(defaults.standards);
  });

  it.each(['bns-planner-v1', 'bns-planner-v2'])(
    'does not load or overwrite the earlier saved plan under %s',
    (legacyKey) => {
      const legacy = samplePlan();
      legacy.methods[0].source = 'Legacy-only recipe must stay in earlier storage.';
      legacy.assignments[0].methodSnapshot = structuredClone(legacy.methods[0]);
      legacy.assignments[0].standardSnapshot = structuredClone(legacy.standards[0]);
      const old = JSON.stringify(legacy);
      localStorage.setItem(legacyKey, old);
      const store = new Store();
      expect(store.state()).toEqual(seed());
      expect(store.error()).toBe('');
      expect(JSON.stringify(store.state())).not.toContain('Legacy-only recipe');
      store.saveDefinition({ ...store.state().methods[0], name: 'My demo method' }, 'methods');
      expect(new Store().state().methods[0].name).toBe('My demo method');
      expect(localStorage.getItem(legacyKey)).toBe(old);
      expect(localStorage.getItem(storageKey)).toBeTruthy();
      store.reset();
      expect(localStorage.getItem(legacyKey)).toBe(old);
      expect(new Store().state().work).toEqual([]);
      expect(new Store().state().methods[0].name).toBe('Coating check');
    },
  );

  it('keeps work already saved in the fictional edition on reload', () => {
    const plan = samplePlan();
    localStorage.setItem(storageKey, JSON.stringify(plan));
    expect(new Store().state()).toEqual(plan);
  });

  it('creates independent defaults on each reset', () => {
    const first = seed();
    first.methods[0].steps[0].duration = 999;
    first.people.pop();
    expect(seed().methods[0].steps[0].duration).toBe(20);
    expect(seed().people).toHaveLength(4);
  });
});
