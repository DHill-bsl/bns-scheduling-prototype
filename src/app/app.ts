import {
  Component,
  computed,
  inject,
  signal,
  effect,
  ViewEncapsulation,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Store } from './store';
import { Planner } from './planner';
import { Sheets } from './sheets';
import { Tutorials } from './tutorials';
import type { TutorialDestination } from './tutorials';
import { Icon } from './icon';
import type { EditorData } from './editor';
import { Assignment, Work, addDays, day, monday, stamp, timeAt } from './models';
import {
  allocationLeft,
  assignmentChecks,
  attempted,
  rejectedOutput,
  unfinished,
  sum,
  unassigned,
  validOutput,
} from './planning';
@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, MatButtonModule, Planner, Sheets, Tutorials, Icon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(Store);
  private injector = inject(Injector);
  readonly nav = [
    { id: 'tutorials', name: 'Tutorials', icon: 'book' },
    { id: 'planner', name: 'Team planner', icon: 'calendar' },
    { id: 'work', name: 'Work queue', icon: 'queue' },
    { id: 'problems', name: 'Problems & repeats', icon: 'alert' },
    { id: 'definitions', name: 'Methods & standards', icon: 'flask' },
    { id: 'sheets', name: 'Work sheets', icon: 'print' },
    { id: 'activity', name: 'Activity & guide', icon: 'history' },
  ];
  section = signal('planner');
  search = signal('');
  filter = signal('all');
  mode = signal<'people' | 'equipment'>('people');
  zoom = signal<'week' | 'day'>('week');
  date = signal(this.store.state().week);
  definitionTab = 'methods';
  resourceFilter = signal('');
  focusedWork = signal('');
  unfinishedAssignments = computed(() => unfinished(this.store.state(), day(new Date())));
  workAssignments = computed(() =>
    this.store
      .state()
      .assignments.filter((a) => a.workId === this.focusedWork())
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  );
  sum = sum;
  timeAt = timeAt;
  stamp = stamp;
  constructor() {
    effect((onCleanup) => {
      if (this.store.notice()) {
        const timer = setTimeout(() => this.store.notice.set(''), 8000);
        onCleanup(() => clearTimeout(timer));
      }
    });
    const sync = () => {
      const value = location.hash.slice(1);
      this.section.set(this.nav.some((n) => n.id === value) ? value : 'planner');
    };
    sync();
    window.addEventListener('hashchange', sync);
  }
  title = computed(() => this.nav.find((n) => n.id === this.section())?.name ?? 'Team planner');
  totalUnassigned = computed(() =>
    sum(this.store.state().work.map((w) => unassigned(this.store.state(), w.id))),
  );
  warnings = computed(() =>
    this.store
      .state()
      .assignments.map((a) => ({ a, checks: assignmentChecks(this.store.state(), a) }))
      .filter((x) => x.checks.length && this.remaining(x.a) > 0),
  );
  replacements = computed(
    () =>
      this.store
        .state()
        .sheets.filter(
          (s) =>
            this.store.latestSheet(s.date, s.personId)?.id === s.id && this.store.changedSheet(s),
        ).length,
  );
  repeatRemaining = computed(() =>
    sum(this.store.state().repeats.map((r) => allocationLeft(this.store.state(), r.workId, r.id))),
  );
  workList = computed(() =>
    this.store
      .state()
      .work.filter((w) =>
        `${w.project} ${w.client} ${w.identity} ${w.methodId}`
          .toLowerCase()
          .includes(this.search().toLowerCase()),
      )
      .filter(
        (w) =>
          this.filter() === 'all' ||
          (this.filter() === 'unassigned' && this.left(w) > 0) ||
          (this.filter() === 'not-ready' && (!w.ready || !!w.blocker)) ||
          (this.filter() === 'complete' && this.output(w) >= w.quantity) ||
          (this.filter() === 'unfinished' &&
            this.unfinishedAssignments().some((a) => a.workId === w.id)) ||
          (this.filter() === 'reporting' &&
            this.output(w) >= w.quantity &&
            w.stage !== 'Reported') ||
          (this.filter() === 'late-report' &&
            w.reportDue < day(new Date()) &&
            w.stage !== 'Reported'),
      )
      .sort((a, b) => a.testDue.localeCompare(b.testDue)),
  );
  assignments = computed(() =>
    this.store
      .state()
      .assignments.filter(
        (a) =>
          a.date >= this.date() &&
          a.date < addDays(this.date(), this.zoom() === 'week' ? 5 : 1) &&
          (!this.resourceFilter() ||
            a.personId === this.resourceFilter() ||
            Object.values(a.equipment).includes(this.resourceFilter())),
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  );
  reservations = computed(() =>
    this.store
      .state()
      .reservations.filter(
        (r) =>
          r.date >= this.date() &&
          r.date < addDays(this.date(), this.zoom() === 'week' ? 5 : 1) &&
          (!this.resourceFilter() || r.resourceId === this.resourceFilter()),
      ),
  );
  focusMain(event: Event) {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }
  navigate(id: string) {
    this.section.set(id);
    location.hash = id;
    this.search.set('');
    this.filter.set('all');
    this.focusedWork.set('');
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.getElementById('main')?.focus({ preventScroll: true });
    });
  }
  openTutorialScreen(target: TutorialDestination) {
    if (target.tab) this.definitionTab = target.tab;
    this.navigate(target.section);
  }
  showWorkAssignments(id: string) {
    this.focusedWork.set(id);
    requestAnimationFrame(() => {
      const panel = document.getElementById('work-assignments');
      panel?.scrollIntoView({ behavior: 'instant', block: 'start' });
      panel?.focus({ preventScroll: true });
    });
  }
  async edit(data: EditorData) {
    if (data.kind === 'assignment' && !this.store.state().work.length) {
      this.store.notice.set('Add work first, then choose an analyst and a time.');
      data = { kind: 'work' };
    }
    const [{ Editor }, { MatDialog }] = await Promise.all([
      import('./editor'),
      import('@angular/material/dialog'),
    ]);
    this.injector.get(MatDialog).open(Editor, {
      data,
      width: '660px',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      position: { right: '0', top: '0' },
      panelClass: 'editor-panel',
      autoFocus: 'first-tabbable',
      disableClose: true,
    });
  }
  move(n: number) {
    this.date.set(addDays(this.date(), n * (this.zoom() === 'week' ? 7 : 1)));
  }
  today() {
    this.date.set(this.zoom() === 'week' ? monday(day(new Date())) : day(new Date()));
  }
  dateChange(value: string) {
    if (value) this.date.set(this.zoom() === 'week' ? monday(value) : value);
  }
  setZoom(value: 'week' | 'day') {
    this.zoom.set(value);
    if (value === 'week') this.date.set(monday(this.date()));
  }
  endDate() {
    return addDays(this.date(), 4);
  }
  left(w: Work) {
    return unassigned(this.store.state(), w.id);
  }
  originalLeft(w: Work) {
    return allocationLeft(this.store.state(), w.id);
  }
  output(w: Work) {
    return validOutput(this.store.state(), w.id);
  }
  pending(w: Work) {
    return sum(
      this.store
        .state()
        .assignments.filter((a) => a.workId === w.id)
        .map((a) => a.quantity - attempted(this.store.state(), a.id)),
    );
  }
  work(id: string) {
    return this.store.state().work.find((w) => w.id === id)!;
  }
  person(id: string) {
    return (
      this.store.state().people.find((p) => p.id === id)?.name ??
      this.store.state().equipment.find((e) => e.id === id)?.name ??
      id
    );
  }
  method(id: string) {
    return this.store.state().methods.find((m) => m.id === id)!;
  }
  checks(a: Assignment) {
    return assignmentChecks(this.store.state(), a);
  }
  remaining(a: Assignment) {
    return a.quantity - attempted(this.store.state(), a.id);
  }
  repeatLeft(workId: string, id: string) {
    return allocationLeft(this.store.state(), workId, id);
  }
  repeatValid(id: string) {
    const s = this.store.state();
    return sum(
      s.progress
        .filter((p) => s.assignments.find((a) => a.id === p.assignmentId)?.repeatId === id)
        .map((p) => p.valid - rejectedOutput(s, p.id)),
    );
  }
  risk(w: Work) {
    const risks: string[] = [];
    if (!w.ready || w.blocker) risks.push('Readiness warning');
    if (w.testDue < day(new Date()) && this.output(w) < w.quantity)
      risks.push('Testing target passed');
    if (w.reportDue < day(new Date()) && w.stage !== 'Reported')
      risks.push('Reporting deadline passed');
    return risks.join(' · ');
  }
  stage(w: Work) {
    if (
      confirm(
        `Mark ${w.project} as ${this.nextStage(w)}? This is a manual team-leader record, not an electronic sign-off.`,
      )
    )
      this.store.stage(w.id);
  }
  displayStage(w: Work) {
    return this.output(w) > 0 && this.output(w) < w.quantity ? 'Partly performed' : w.stage;
  }
  nextStage(w: Work) {
    return w.stage === 'Performed'
      ? 'Checked'
      : w.stage === 'Checked'
        ? 'Approved'
        : w.stage === 'Approved'
          ? 'Reported'
          : 'Performed';
  }
  removeReservation(id: string) {
    const grouped = this.store.state().reservations.find((r) => r.id === id)?.preparationId;
    if (
      confirm(
        grouped
          ? 'Remove all linked person and equipment bookings for this preparation? Actual preparation records are unchanged.'
          : 'Remove this reserved period? Check any affected issued sheets.',
      )
    )
      this.store.removeReservation(id);
  }
  reset() {
    if (
      confirm(
        'Delete all work, bookings, progress and issued copies, and restore the example methods, standards, analysts and equipment? The schedule will be empty. This cannot be undone.',
      )
    ) {
      this.store.reset();
      this.date.set(this.store.state().week);
    }
  }
  reload() {
    location.reload();
  }
}
