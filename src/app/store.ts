import { Injectable, signal } from '@angular/core';
import {
  State,
  Work,
  Assignment,
  Progress,
  Rejection,
  Reservation,
  Standard,
  Method,
  uid,
  IssuedSheet,
} from './models';
import { seed } from './seed';
import { describeChanges } from './history';
import {
  attempted,
  assignmentChecks,
  assignmentMethod,
  assignmentStandard,
  progressSummary,
  rejectedOutput,
  sheetFingerprint,
  validOutput,
} from './planning';
import { PreparationPlan, preparationBookings, preparationChecks } from './preparation';
// Keep this fictional edition separate; never load or overwrite earlier saved plans.
const KEY = 'lab-planner-fictional-v1';
@Injectable({ providedIn: 'root' })
export class Store {
  readonly error = signal('');
  readonly notice = signal('');
  readonly leader = signal('Alex Morgan');
  readonly state = signal<State>(this.load());
  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY)
        this.error.set(
          'The plan changed in another tab. Reload before saving. Your current form has not been saved.',
        );
    });
  }
  private load(): State {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (
          s.version !== 1 ||
          !Number.isInteger(s.revision) ||
          typeof s.week !== 'string' ||
          ![
            'assignments',
            'work',
            'methods',
            'standards',
            'people',
            'equipment',
            'progress',
            'repeats',
            'reservations',
            'sheets',
            'audit',
          ].every((key) => Array.isArray(s[key]))
        )
          throw Error();
        return s;
      }
    } catch {
      this.error.set(
        'Saved data could not be read. A temporary empty plan is shown. Reset the demo to replace the saved data.',
      );
    }
    return seed();
  }
  change(message: string, fn: (s: State) => void): boolean {
    if (this.error()) return false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && JSON.parse(raw).revision !== this.state().revision) {
        this.error.set('The plan changed in another tab. Reload before saving.');
        return false;
      }
      const next = structuredClone(this.state());
      fn(next);
      next.revision++;
      next.audit.unshift({
        at: new Date().toISOString(),
        by: this.leader(),
        message,
        details: describeChanges(this.state(), next),
      });
      localStorage.setItem(KEY, JSON.stringify(next));
      this.state.set(next);
      this.notice.set(message);
      return true;
    } catch (e) {
      this.notice.set(
        e instanceof Error ? e.message : 'Could not save. Browser storage may be full.',
      );
      return false;
    }
  }
  reset() {
    try {
      const next = seed();
      localStorage.setItem(KEY, JSON.stringify(next));
      this.error.set('');
      this.state.set(next);
      this.notice.set(
        'Demo reset. The work queue and schedule are empty. Example methods, standards, analysts and equipment are restored.',
      );
    } catch {
      this.error.set('Browser storage is unavailable. Allow site storage, then reset again.');
    }
  }
  saveWork(w: Work) {
    return this.change(`${w.project}: work saved.`, (s) => {
      if (
        !w.project.trim() ||
        !w.client.trim() ||
        !w.identity.trim() ||
        !Number.isInteger(w.quantity) ||
        w.quantity < 1 ||
        !w.readyDate ||
        !w.testDue ||
        !w.reportDue ||
        w.reportDue < w.testDue
      )
        throw Error('Check the required fields, quantity and deadlines.');
      const i = s.work.findIndex((x) => x.id === w.id);
      if (i < 0) s.work.push(w);
      else {
        if (
          s.assignments.some((a) => a.workId === w.id) &&
          (w.methodId !== s.work[i].methodId || w.quantity !== s.work[i].quantity)
        )
          throw Error('Keep the method and required quantity unchanged while assignments exist.');
        for (const a of s.assignments.filter((a) => a.workId === w.id && attempted(s, a.id) > 0))
          this.preserveContext(s, a);
        s.work[i] = w;
      }
    });
  }
  saveAssignment(a: Assignment, reason: string, splitFrom?: string, retainedSamples?: string) {
    return this.change(
      `${splitFrom ? 'Split' : this.state().assignments.some((x) => x.id === a.id) ? 'Updated' : 'Assigned'} ${this.state().work.find((w) => w.id === a.workId)?.project}. ${reason}`,
      (s) => {
        a = structuredClone(a);
        if (!a.samples?.trim())
          throw Error('Enter the sample and replicate IDs for this assignment.');
        if (!s.assignments.some((x) => x.id === a.id)) {
          delete a.methodSnapshot;
          delete a.standardSnapshot;
        }
        if (splitFrom) {
          const source = s.assignments.find((x) => x.id === splitFrom)!;
          if (
            a.quantity > source.quantity - attempted(s, source.id) ||
            a.quantity >= source.quantity
          )
            throw Error(
              'Split only unfinished replicates. To move the whole assignment, use Edit / move.',
            );
          if (source.workId !== a.workId || source.repeatId !== a.repeatId)
            throw Error('Keep split work linked to the same original requirement and repeat.');
          if (!retainedSamples?.trim() || retainedSamples.trim() === a.samples.trim())
            throw Error(
              'Specify different sample / replicate details for the new and original assignments. Keep recorded attempts on the original.',
            );
          source.quantity -= a.quantity;
          source.samples = retainedSamples.trim();
          source.revision++;
        }
        const blocks = assignmentChecks(s, a).filter((c) => c.level === 'block');
        if (blocks.length) throw Error(blocks[0].text);
        const i = s.assignments.findIndex((x) => x.id === a.id);
        if (i < 0) s.assignments.push(a);
        else s.assignments[i] = { ...a, revision: s.assignments[i].revision + 1 };
      },
    );
  }
  removeAssignment(id: string) {
    return this.change('Assignment removed. Its quantity is back in the queue.', (s) => {
      if (attempted(s, id))
        throw Error(
          'Keep assignments with recorded attempts. Split the unfinished quantity instead.',
        );
      s.assignments = s.assignments.filter((a) => a.id !== id);
    });
  }
  progress(p: Progress) {
    return this.change(
      p.failed
        ? 'Progress recorded. Failed attempts added to the repeat queue.'
        : 'Progress recorded.',
      (s) => {
        const a = s.assignments.find((a) => a.id === p.assignmentId)!;
        if (
          !Number.isInteger(p.valid) ||
          !Number.isInteger(p.failed) ||
          p.valid < 0 ||
          p.failed < 0 ||
          p.valid + p.failed < 1 ||
          p.valid + p.failed > a.quantity - attempted(s, a.id)
        )
          throw Error(
            'Enter whole numbers. The total must be at least 1 and no more than the replicates without a recorded attempt.',
          );
        if (p.failed && (!p.note.trim() || !p.samples.trim()))
          throw Error('Describe the problem and affected sample / replicate IDs.');
        this.preserveContext(s, a);
        s.progress.push(p);
        if (p.failed)
          s.repeats.push({
            id: uid(),
            workId: a.workId,
            assignmentId: a.id,
            progressId: p.id,
            quantity: p.failed,
            reason: p.note,
            samples: p.samples,
            fresh: p.fresh,
          });
        const w = s.work.find((w) => w.id === a.workId)!;
        w.stage = validOutput(s, w.id) >= w.quantity ? 'Performed' : 'Awaiting work';
      },
    );
  }
  rejectOutput(rejection: Rejection) {
    return this.change(
      'Output rejected and linked repeat created. Check any client report outside this app.',
      (s) => {
        const p = s.progress.find((p) => p.id === rejection.progressId);
        if (
          !p ||
          !Number.isInteger(rejection.quantity) ||
          rejection.quantity < 1 ||
          rejection.quantity > p.valid - rejectedOutput(s, p.id)
        )
          throw Error(
            'Reject only successful output from this update that has not already been rejected.',
          );
        if (!rejection.reason.trim() || !rejection.samples.trim())
          throw Error('Enter the affected sample / replicate IDs and the reason for rejection.');
        if ((s.rejections ?? []).some((r) => r.id === rejection.id))
          throw Error('This rejection has already been recorded.');
        const a = s.assignments.find((a) => a.id === p.assignmentId)!;
        this.preserveContext(s, a);
        (s.rejections ??= []).push(rejection);
        s.repeats.push({
          id: uid(),
          workId: a.workId,
          assignmentId: a.id,
          progressId: p.id,
          quantity: rejection.quantity,
          reason: rejection.reason,
          samples: rejection.samples,
          fresh: rejection.fresh,
        });
        s.work.find((w) => w.id === a.workId)!.stage = 'Awaiting work';
      },
    );
  }
  private preserveContext(s: State, a: Assignment) {
    a.methodSnapshot ??= structuredClone(assignmentMethod(s, a));
    if (a.standardSnapshot === undefined)
      a.standardSnapshot = structuredClone(assignmentStandard(s, a) ?? null);
  }
  stage(workId: string) {
    return this.change('Work status updated.', (s) => {
      const w = s.work.find((w) => w.id === workId)!;
      if (validOutput(s, workId) < w.quantity)
        throw Error('All required valid output must be recorded first.');
      const stages: Work['stage'][] = [
        'Awaiting work',
        'Performed',
        'Checked',
        'Approved',
        'Reported',
      ];
      w.stage = stages[Math.min(stages.indexOf(w.stage) + 1, 4)];
    });
  }
  saveDefinition(def: Method | Standard, kind: 'methods' | 'standards') {
    return this.change(
      `${def.name}: ${kind === 'methods' ? 'method' : 'standard'} saved. Check whether issued work sheets need replacing.`,
      (s) => {
        if (
          !def.name.trim() ||
          !def.steps.length ||
          def.steps.some(
            (st) =>
              !st.name.trim() ||
              !Number.isFinite(st.duration) ||
              st.duration <= 0 ||
              !Number.isFinite(st.handsOn) ||
              st.handsOn < 0 ||
              st.handsOn > st.duration,
          )
        )
          throw Error(
            'Enter a name and total time greater than zero for each step. Hands-on time must be between zero and the total time.',
          );
        if ('shelfHours' in def && (!Number.isFinite(def.shelfHours) || def.shelfHours <= 0))
          throw Error('Shelf life must be greater than zero.');
        for (const a of s.assignments.filter((a) => attempted(s, a.id) > 0))
          this.preserveContext(s, a);
        if (kind === 'methods') {
          const i = s.methods.findIndex((x) => x.id === def.id);
          if (i < 0) s.methods.push(def as Method);
          else s.methods[i] = def as Method;
        } else {
          const i = s.standards.findIndex((x) => x.id === def.id);
          if (i < 0) s.standards.push(def as Standard);
          else s.standards[i] = def as Standard;
        }
      },
    );
  }
  planPreparation(plan: PreparationPlan, acknowledgeWarnings: boolean) {
    return this.change(
      'Preparation booked for the analyst and equipment. Record completion separately when it has actually been prepared.',
      (s) => {
        const checks = preparationChecks(s, plan);
        const block = checks.find((c) => c.level === 'block');
        if (block) throw Error(block.text);
        if (checks.length && !acknowledgeWarnings)
          throw Error('Review and acknowledge the preparation warnings.');
        const bookings = preparationBookings(s, plan, uid());
        if (!bookings.length)
          throw Error('The preparation recipe needs analyst or equipment time to book.');
        s.reservations.push(...bookings);
      },
    );
  }
  reserve(r: Reservation) {
    return this.change(`${r.label}: time reserved.`, (s) => {
      if (
        !r.resourceId ||
        !r.date ||
        !r.time ||
        !r.label.trim() ||
        !Number.isFinite(r.minutes) ||
        r.minutes <= 0 ||
        r.minutes > 1440
      )
        throw Error(
          'Choose a person or instrument, date and start time. Enter a reason and a duration from 1 to 1,440 minutes.',
        );
      s.reservations.push(r);
    });
  }
  removeReservation(id: string) {
    return this.change('Reserved period removed.', (s) => {
      const preparationId = s.reservations.find((r) => r.id === id)?.preparationId;
      s.reservations = s.reservations.filter((r) =>
        preparationId ? r.preparationId !== preparationId : r.id !== id,
      );
    });
  }
  latestSheet(date: string, personId: string) {
    return this.state()
      .sheets.filter((s) => s.date === date && s.personId === personId)
      .sort((a, b) => b.version - a.version)[0];
  }
  changedSheet(sheet: IssuedSheet) {
    return sheet.fingerprint !== sheetFingerprint(this.state(), sheet.date, sheet.personId);
  }
  issue(date: string, people: string[]) {
    return this.change(
      'Work sheets issued. Print these copies and replace any earlier versions.',
      (s) => {
        for (const personId of people) {
          const assignments = s.assignments.filter(
            (a) => a.date === date && a.personId === personId,
          );
          const reservations = s.reservations.filter(
            (r) => r.date === date && r.resourceId === personId,
          );
          if (assignments.some((a) => !a.samples?.trim()))
            throw Error(
              'Add assigned sample / replicate IDs to each assignment before issuing. Existing issued copies are unchanged.',
            );
          const previous = this.latestSheet(date, personId);
          if (!assignments.length && !reservations.length && !previous) continue;
          if (previous && !this.changedSheet(previous)) continue;
          s.sheets.push({
            id: uid(),
            date,
            personId,
            version: (previous?.version ?? 0) + 1,
            at: new Date().toISOString(),
            by: this.leader(),
            fingerprint: sheetFingerprint(s, date, personId),
            reservations: structuredClone(reservations),
            lines: assignments.map((a) => ({
              assignment: structuredClone(a),
              work: structuredClone(s.work.find((w) => w.id === a.workId)!),
              method: structuredClone(assignmentMethod(s, a)),
              progressSummary: progressSummary(s, a),
              person: s.people.find((p) => p.id === personId)!.name,
              equipmentNames: Object.fromEntries(s.equipment.map((e) => [e.id, e.name])),
              standard: structuredClone(assignmentStandard(s, a)),
              repeat: structuredClone(s.repeats.find((r) => r.id === a.repeatId)),
              warnings: assignmentChecks(s, a).map((c) => c.text),
            })),
          });
        }
      },
    );
  }
}
