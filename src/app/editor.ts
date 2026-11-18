import { Component, inject, ViewChild, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Store } from './store';
import { Icon } from './icon';
import {
  Assignment,
  Work,
  Progress,
  Rejection,
  Reservation,
  Method,
  Standard,
  uid,
  stamp,
  timeAt,
} from './models';
import {
  allocationLeft,
  assignmentChecks,
  assignmentMethod,
  attempted,
  rejectedOutput,
  sum,
} from './planning';
import { PreparationPlan, preparationBookings, preparationChecks } from './preparation';
export interface EditorData {
  kind: 'work' | 'assignment' | 'progress' | 'definition' | 'reservation' | 'preparation';
  standardId?: string;
  id?: string;
  workId?: string;
  repeatId?: string;
  splitFrom?: string;
  date?: string;
  time?: string;
  personId?: string;
  definitionKind?: 'methods' | 'standards';
}
@Component({
  selector: 'app-editor',
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, Icon],
  templateUrl: './editor.html',
})
export class Editor {
  readonly store = inject(Store);
  readonly data = inject<EditorData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<Editor>);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  @ViewChild('form') form?: NgForm;
  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.error = 'Check the highlighted fields.';
    } else {
      this.save();
    }
    if (this.error)
      requestAnimationFrame(() => {
        this.element.nativeElement.querySelector<HTMLElement>('[role="alert"]')?.focus();
        this.element.nativeElement.querySelector('mat-dialog-content')?.scrollTo({ top: 0 });
      });
  }
  @HostListener('document:keydown.escape') onEscape() {
    this.close();
  }
  close() {
    if (!this.form?.dirty || confirm('Discard the changes in this panel?')) this.ref.close();
  }
  readonly s = this.store.state();
  error = '';
  reason = '';
  retainedSamples = '';
  progressMode = 'record';
  acknowledged = false;
  timeAt = timeAt;
  sum = sum;
  work: Work;
  assignment: Assignment;
  progress: Progress;
  rejection: Rejection;
  preparation: PreparationPlan;
  reservation: Reservation;
  definition: Method & Partial<Standard>;
  definitionKind: 'methods' | 'standards';
  constructor() {
    const w = this.s.work.find((w) => w.id === this.data.workId || w.id === this.data.id);
    this.work = structuredClone(
      w ?? {
        id: uid(),
        project: '',
        client: '',
        identity: '',
        methodId: 'DEMO-101',
        quantity: 12,
        ready: true,
        readyDate: this.s.week,
        testDue: this.s.week,
        reportDue: this.s.week,
        blocker: '',
        standardId: 'std-blue',
        stage: 'Awaiting work',
      },
    );
    const source = this.s.assignments.find((a) => a.id === (this.data.splitFrom ?? this.data.id));
    this.assignment = structuredClone(
      source ?? {
        id: uid(),
        workId: w?.id ?? this.s.work[0]?.id ?? '',
        personId: this.data.personId ?? '',
        date: this.data.date ?? this.s.week,
        time: this.data.time ?? '08:00',
        quantity: Math.max(
          1,
          Math.min(
            12,
            allocationLeft(this.s, w?.id ?? this.s.work[0]?.id ?? '', this.data.repeatId),
          ),
        ),
        equipment: {},
        instructions: '',
        samples: '',
        revision: 1,
        repeatId: this.data.repeatId,
      },
    );
    if (this.data.splitFrom) {
      this.assignment.id = uid();
      this.assignment.quantity = 1;
      this.assignment.samples = '';
      delete this.assignment.methodSnapshot;
      delete this.assignment.standardSnapshot;
    }
    if (source && this.data.date) this.assignment.date = this.data.date;
    if (source && this.data.time) this.assignment.time = this.data.time;
    if (source && this.data.personId) this.assignment.personId = this.data.personId;
    this.fillEquipment();
    this.progress = {
      id: uid(),
      assignmentId: source?.id ?? '',
      valid: 0,
      failed: 0,
      note: '',
      samples: '',
      fresh: true,
      at: new Date().toISOString(),
    };
    this.rejection = {
      id: uid(),
      progressId: this.rejectableUpdates[0]?.id ?? '',
      quantity: 1,
      reason: '',
      samples: '',
      fresh: true,
      at: new Date().toISOString(),
    };
    this.preparation = {
      standardId: this.data.standardId ?? '',
      personId: '',
      date: this.data.date ?? this.s.week,
      time: '08:00',
      equipment: {},
    };
    for (const type of this.preparationTypes)
      this.preparation.equipment[type] = this.s.equipment.find((e) => e.type === type)?.id ?? '';
    this.reservation = {
      id: uid(),
      resourceId: this.data.personId ?? '',
      date: this.data.date ?? this.s.week,
      time: '08:00',
      minutes: 60,
      label: '',
    };
    this.definitionKind = this.data.definitionKind ?? 'methods';
    const def = this.s[this.definitionKind].find((x) => x.id === this.data.id);
    this.definition = structuredClone(
      def ?? {
        id: uid(),
        name: '',
        steps: [{ name: '', duration: 30, handsOn: 30, equipment: '' }],
        prerequisites: '',
        source:
          'Fictional demonstration only. Enter invented steps, times and equipment for this demo.',
        level: 'L1',
        shelfHours: 24,
        preparedAt: '',
        notes: 'Fictional demonstration only. Use made-up preparation and shelf-life details.',
      },
    ) as Method & Partial<Standard>;
  }
  get title() {
    return {
      work: this.data.id ? 'Work details' : 'Add work',
      assignment: this.data.splitFrom
        ? 'Split assignment'
        : this.data.id
          ? 'Assignment details'
          : 'Assign work',
      progress: 'Record progress',
      definition: `${this.data.id ? 'Edit' : 'Add'} ${this.definitionKind === 'methods' ? 'method' : 'standard'}`,
      reservation: 'Reserve time',
      preparation: 'Plan standard preparation',
    }[this.data.kind];
  }
  get repeat() {
    return this.s.repeats.find((r) => r.id === this.assignment.repeatId);
  }
  get method() {
    return assignmentMethod(this.s, this.assignment);
  }
  get originalSamples() {
    return this.s.assignments.find((a) => a.id === this.data.splitFrom)?.samples;
  }
  get rejectableUpdates() {
    return this.s.progress.filter(
      (p) => p.assignmentId === this.assignment.id && p.valid > rejectedOutput(this.s, p.id),
    );
  }
  rejected(id: string) {
    return rejectedOutput(this.s, id);
  }
  get rejectableQuantity() {
    const p = this.s.progress.find((p) => p.id === this.rejection.progressId);
    return p ? p.valid - this.rejected(p.id) : 0;
  }
  get standard() {
    return this.s.standards.find((st) => st.id === this.preparation.standardId);
  }
  get preparationTypes() {
    return [...new Set(this.standard?.steps.map((st) => st.equipment).filter(Boolean) ?? [])];
  }
  get preparationWarnings() {
    return preparationChecks(this.s, this.preparation);
  }
  get preparationPeriods() {
    return preparationBookings(this.s, this.preparation, 'preview');
  }
  get types() {
    return [...new Set(this.method?.steps.map((s) => s.equipment).filter(Boolean) ?? [])];
  }
  get equipmentTypes() {
    return [...new Set(this.s.equipment.map((e) => e.type))];
  }
  get checks() {
    let s = this.s;
    if (this.data.splitFrom) {
      s = structuredClone(s);
      s.assignments.find((a) => a.id === this.data.splitFrom)!.quantity -= this.assignment.quantity;
    }
    return assignmentChecks(s, this.assignment);
  }
  get blocked() {
    return this.checks.some((c) => c.level === 'block');
  }
  get warnings() {
    return this.checks.filter((c) => c.level === 'warning');
  }
  get remaining() {
    return this.assignment.quantity - attempted(this.s, this.assignment.id);
  }
  get booked() {
    return this.s.assignments.some((a) => a.workId === this.work.id);
  }
  get steps() {
    let offset = 0;
    return (this.method?.steps ?? []).map((st) => {
      const start = stamp(this.assignment.date, this.assignment.time) + offset * 60000;
      offset += st.duration;
      return { ...st, start, end: start + st.duration * 60000 };
    });
  }
  fillEquipment() {
    for (const type of this.types)
      if (!this.assignment.equipment[type])
        this.assignment.equipment[type] = this.s.equipment.find((e) => e.type === type)?.id ?? '';
  }
  changeWork() {
    this.assignment.repeatId = undefined;
    this.assignment.samples = '';
    this.assignment.equipment = {};
    this.assignment.quantity = Math.max(
      1,
      Math.min(12, allocationLeft(this.s, this.assignment.workId)),
    );
    this.fillEquipment();
  }
  addStep() {
    this.definition.steps.push({ name: '', duration: 30, handsOn: 30, equipment: '' });
  }
  save() {
    this.error = '';
    let ok = false;
    if (this.data.kind === 'work') ok = this.store.saveWork(this.work);
    if (this.data.kind === 'assignment') {
      if (this.blocked) {
        this.error = 'Resolve the blocked items before saving.';
        return;
      }
      if (this.warnings.length && !this.acknowledged) {
        this.error = 'Review the warnings, then select the acknowledgement checkbox to save.';
        return;
      }
      if ((this.data.id || this.data.splitFrom) && !this.reason.trim()) {
        this.error = 'Add a reason for this change.';
        return;
      }
      ok = this.store.saveAssignment(
        this.assignment,
        this.reason,
        this.data.splitFrom,
        this.retainedSamples,
      );
    }
    if (this.data.kind === 'progress') {
      if (this.progressMode === 'reject') {
        if (
          !confirm(
            'Reject this recorded output and create a linked repeat? The earlier update will remain visible. Check any client report outside this app.',
          )
        )
          return;
        ok = this.store.rejectOutput(this.rejection);
      } else ok = this.store.progress(this.progress);
    }
    if (this.data.kind === 'preparation')
      ok = this.store.planPreparation(this.preparation, this.acknowledged);
    if (this.data.kind === 'definition') {
      if (!this.data.id && this.s[this.definitionKind].some((d) => d.id === this.definition.id)) {
        this.error =
          this.definitionKind === 'methods'
            ? 'That method code already exists. Enter a different code or edit the existing method.'
            : 'This standard already exists. Edit the existing standard.';
        return;
      }
      ok = this.store.saveDefinition(this.definition as Method | Standard, this.definitionKind);
    }
    if (this.data.kind === 'reservation') ok = this.store.reserve(this.reservation);
    if (ok) this.ref.close(true);
    else this.error = this.store.error() || this.store.notice();
  }
  remove() {
    if (
      confirm(
        'Remove this assignment? Its quantity will return to the queue. Issued sheets may need replacing.',
      )
    ) {
      if (this.store.removeAssignment(this.assignment.id)) this.ref.close(true);
      else this.error = this.store.notice();
    }
  }
}
