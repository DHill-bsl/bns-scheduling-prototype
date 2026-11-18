import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Store } from './store';
import { Icon } from './icon';
import { IssuedSheet, SheetLine, stamp, timeAt } from './models';
import {
  assignmentChecks,
  assignmentMethod,
  assignmentStandard,
  progressSummary,
  sum,
} from './planning';
@Component({
  selector: 'app-sheets',
  imports: [CommonModule, FormsModule, MatButtonModule, Icon],
  templateUrl: './sheets.html',
})
export class Sheets {
  readonly store = inject(Store);
  date = this.store.state().week;
  selected = this.store.state().people.map((p) => p.id);
  mode = 'working';
  versions: Record<string, string> = {};
  acknowledged = false;
  timeAt = timeAt;
  stamp = stamp;
  sum = sum;
  toggle(id: string) {
    this.selected = this.selected.includes(id)
      ? this.selected.filter((x) => x !== id)
      : [...this.selected, id];
  }
  get people() {
    return this.store.state().people.filter((p) => this.selected.includes(p.id));
  }
  get warnings() {
    const s = this.store.state();
    return s.assignments
      .filter((a) => a.date === this.date && this.selected.includes(a.personId))
      .flatMap((a) =>
        assignmentChecks(s, a).map(
          (c) => `${s.work.find((w) => w.id === a.workId)?.project}: ${c.text}`,
        ),
      );
  }
  get hasWork() {
    const s = this.store.state();
    return (
      s.assignments.some((a) => a.date === this.date && this.selected.includes(a.personId)) ||
      s.reservations.some((r) => r.date === this.date && this.selected.includes(r.resourceId)) ||
      s.sheets.some((sh) => sh.date === this.date && this.selected.includes(sh.personId))
    );
  }
  sheet(personId: string): IssuedSheet | undefined {
    return this.versions[personId]
      ? this.store.state().sheets.find((s) => s.id === this.versions[personId])
      : this.store.latestSheet(this.date, personId);
  }
  history(personId: string) {
    return this.store
      .state()
      .sheets.filter((s) => s.date === this.date && s.personId === personId)
      .sort((a, b) => b.version - a.version);
  }
  lines(personId: string): SheetLine[] {
    if (this.mode === 'issued') return this.sheet(personId)?.lines ?? [];
    const s = this.store.state();
    return s.assignments
      .filter((a) => a.date === this.date && a.personId === personId)
      .map((a) => ({
        assignment: a,
        work: s.work.find((w) => w.id === a.workId)!,
        method: assignmentMethod(s, a),
        progressSummary: progressSummary(s, a),
        person: s.people.find((p) => p.id === personId)!.name,
        equipmentNames: Object.fromEntries(s.equipment.map((e) => [e.id, e.name])),
        standard: assignmentStandard(s, a),
        repeat: s.repeats.find((r) => r.id === a.repeatId),
        warnings: assignmentChecks(s, a).map((c) => c.text),
      }))
      .sort((a, b) => a.assignment.time.localeCompare(b.assignment.time));
  }
  reservations(personId: string) {
    return this.mode === 'issued'
      ? (this.sheet(personId)?.reservations ?? [])
      : this.store
          .state()
          .reservations.filter((r) => r.date === this.date && r.resourceId === personId);
  }
  steps(line: SheetLine) {
    let offset = 0;
    return line.method.steps.map((st) => {
      const start = stamp(line.assignment.date, line.assignment.time) + offset * 60000;
      offset += st.duration;
      return { ...st, start, end: start + st.duration * 60000 };
    });
  }
  issue() {
    if (this.warnings.length && !this.acknowledged) {
      this.store.notice.set('Review the warnings before issuing these sheets.');
      return;
    }
    if (this.store.issue(this.date, this.selected)) {
      this.mode = 'issued';
      this.versions = {};
    }
  }
  print() {
    window.print();
  }
}
