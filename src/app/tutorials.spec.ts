import { TestBed } from '@angular/core/testing';
import { Tutorials, TutorialDestination } from './tutorials';
import { Store } from './store';
import { segments } from './planning';
import { stamp, Work, Assignment } from './models';

describe('Tutorials', () => {
  it('provides short steps and field help for every getting-started topic', async () => {
    await TestBed.configureTestingModule({ imports: [Tutorials] }).compileComponents();
    const fixture = TestBed.createComponent(Tutorials);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('details.tutorial')).toHaveLength(13);
    const topics = fixture.componentInstance.tutorials;
    expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length);
    for (const topic of topics) {
      expect(topic.steps.length).toBeGreaterThanOrEqual(4);
      expect(topic.steps.length).toBeLessThanOrEqual(5);
      expect(topic.steps.every((step) => step.split(/\s+/).length <= 25)).toBe(true);
      const help = fixture.componentInstance.help[topic.id];
      expect(help.spreadsheet).toBeTruthy();
      expect(help.fields.length).toBeGreaterThanOrEqual(4);
      expect(new Set(help.fields.map((f) => f.name)).size).toBe(help.fields.length);
      expect(help.fields.every((f) => f.name && f.meaning)).toBe(true);
      expect(help.automatic.length).toBeGreaterThan(0);
      expect(help.manual.length).toBeGreaterThan(0);
    }
  });
  it('matches the tutorial timing example: definitions do not book, dated assignments do', () => {
    localStorage.clear();
    const store = new Store();
    const count = store.state().assignments.length;
    expect(
      store.saveDefinition(
        {
          id: 'DEMO-BOOKING',
          name: 'Illustrative booking',
          prerequisites: 'Demo only',
          source: 'Tutorial example',
          steps: [
            { name: 'Run', duration: 120, handsOn: 15, equipment: 'Optical reader' },
            { name: 'Wait', duration: 15, handsOn: 0, equipment: '' },
            { name: 'Second run', duration: 60, handsOn: 0, equipment: 'Optical reader' },
          ],
        },
        'methods',
      ),
    ).toBe(true);
    expect(store.state().assignments).toHaveLength(count);
    const work: Work = {
      id: 'tutorial-work',
      project: 'Tutorial',
      client: 'Fictional client',
      identity: 'T01 / replicates 1–2',
      methodId: 'DEMO-BOOKING',
      quantity: 2,
      ready: true,
      readyDate: store.state().week,
      testDue: store.state().week,
      reportDue: store.state().week,
      blocker: '',
      standardId: '',
      stage: 'Awaiting work',
    };
    expect(store.saveWork(work)).toBe(true);
    const a: Assignment = {
      id: 'tutorial-booking',
      personId: 'p2',
      date: store.state().week,
      samples: work.identity,
      instructions: '',
      revision: 1,
      workId: work.id,
      time: '09:00',
      quantity: 2,
      equipment: { 'Optical reader': 'e3' },
    };
    expect(store.saveAssignment(a, '')).toBe(true);
    const periods = segments(store.state(), a);
    expect(periods.map((p) => [p.resourceId, p.start, p.end])).toEqual([
      [a.personId, stamp(a.date, '09:00'), stamp(a.date, '09:15')],
      ['e3', stamp(a.date, '09:00'), stamp(a.date, '11:00')],
      ['e3', stamp(a.date, '11:15'), stamp(a.date, '12:15')],
    ]);
    expect(segments(store.state(), { ...a, quantity: 1 })).toEqual(periods);
    localStorage.clear();
  });
  it('requests the correct definitions tab without changing saved data', async () => {
    await TestBed.configureTestingModule({ imports: [Tutorials] }).compileComponents();
    const fixture = TestBed.createComponent(Tutorials);
    fixture.detectChanges();
    const before = localStorage.getItem('lab-planner-fictional-v1');
    const destinations: TutorialDestination[] = [];
    fixture.componentInstance.openScreen.subscribe((target) => destinations.push(target));
    fixture.nativeElement.querySelector('#tutorial-add-method button').click();
    fixture.nativeElement.querySelector('#tutorial-add-standard button').click();
    expect(destinations).toEqual([
      { section: 'definitions', tab: 'methods' },
      { section: 'definitions', tab: 'standards' },
    ]);
    expect(localStorage.getItem('lab-planner-fictional-v1')).toBe(before);
  });
});
