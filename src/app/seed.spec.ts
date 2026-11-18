import { beforeEach, describe, expect, it } from 'vitest';
import { seed } from './seed';
import { Store } from './store';
import { samplePlan } from '../../testing/sample-plan';

beforeEach(() => localStorage.clear());

describe('Empty starting plan', () => {
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

  it('keeps example recipes and resources without claiming standards are prepared', () => {
    const s = seed();
    expect(s.methods.map((m) => m.id)).toEqual(['NTM0086', 'NTM0025a']);
    expect(s.equipment).toHaveLength(8);
    expect(s.people).toHaveLength(4);
    expect(s.standards).toHaveLength(2);
    expect(s.standards.every((st) => st.preparedAt === '')).toBe(true);
    for (const definition of [...s.methods, ...s.standards]) {
      expect(definition.steps.length).toBeGreaterThan(0);
      for (const step of definition.steps)
        if (step.equipment) expect(s.equipment.some((e) => e.type === step.equipment)).toBe(true);
    }
  });

  it('does not reuse or overwrite the previous edition’s saved plan', () => {
    const old = JSON.stringify(samplePlan());
    localStorage.setItem('bns-planner-v1', old);
    const store = new Store();
    expect(store.state().work).toEqual([]);
    expect(store.error()).toBe('');
    store.saveDefinition({ ...store.state().methods[0], name: 'My method' }, 'methods');
    expect(new Store().state().methods[0].name).toBe('My method');
    expect(localStorage.getItem('bns-planner-v1')).toBe(old);
    store.reset();
    expect(localStorage.getItem('bns-planner-v1')).toBe(old);
    expect(new Store().state().work).toEqual([]);
    expect(new Store().state().methods[0].name).toBe('Pouch dissolution');
  });

  it('keeps work already saved in this edition on reload', () => {
    const plan = samplePlan();
    localStorage.setItem('bns-planner-v2', JSON.stringify(plan));
    expect(new Store().state()).toEqual(plan);
  });

  it('creates independent defaults on each reset', () => {
    const first = seed();
    first.methods[0].steps[0].duration = 999;
    first.people.pop();
    expect(seed().methods[0].steps[0].duration).toBe(30);
    expect(seed().people).toHaveLength(4);
  });
});
