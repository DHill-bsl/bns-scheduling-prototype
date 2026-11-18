import { Assignment, Check, Segment, State, Work, stamp } from './models';
export const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
export function attempted(s: State, id: string) {
  return sum(s.progress.filter((p) => p.assignmentId === id).map((p) => p.valid + p.failed));
}
export function rejectedOutput(s: State, progressId: string) {
  return sum(
    (s.rejections ?? []).filter((r) => r.progressId === progressId).map((r) => r.quantity),
  );
}
export function progressSummary(s: State, a: Assignment) {
  const updates = s.progress.filter((p) => p.assignmentId === a.id);
  return {
    valid: sum(updates.map((p) => p.valid - rejectedOutput(s, p.id))),
    failed: sum(updates.map((p) => p.failed + rejectedOutput(s, p.id))),
    remaining: a.quantity - attempted(s, a.id),
  };
}
export function assignmentMethod(s: State, a: Assignment) {
  return (
    a.methodSnapshot ??
    s.methods.find((m) => m.id === s.work.find((w) => w.id === a.workId)?.methodId)!
  );
}
export function assignmentStandard(s: State, a: Assignment) {
  return a.standardSnapshot !== undefined
    ? (a.standardSnapshot ?? undefined)
    : s.standards.find((st) => st.id === s.work.find((w) => w.id === a.workId)?.standardId);
}
export function unfinished(s: State, today: string) {
  return s.assignments.filter((a) => a.date < today && attempted(s, a.id) < a.quantity);
}
export function validOutput(s: State, workId: string) {
  return sum(
    s.progress
      .filter((p) => s.assignments.find((a) => a.id === p.assignmentId)?.workId === workId)
      .map((p) => p.valid - rejectedOutput(s, p.id)),
  );
}
export function allocationLeft(s: State, workId: string, repeatId?: string, excludeId?: string) {
  const total = repeatId
    ? (s.repeats.find((r) => r.id === repeatId)?.quantity ?? 0)
    : (s.work.find((w) => w.id === workId)?.quantity ?? 0);
  return (
    total -
    sum(
      s.assignments
        .filter((a) => a.workId === workId && a.repeatId === repeatId && a.id !== excludeId)
        .map((a) => a.quantity),
    )
  );
}
export function unassigned(s: State, workId: string) {
  return (
    allocationLeft(s, workId) +
    sum(s.repeats.filter((r) => r.workId === workId).map((r) => allocationLeft(s, workId, r.id)))
  );
}
export function segments(s: State, a: Assignment): Segment[] {
  const method = assignmentMethod(s, a);
  if (!method) return [];
  let start = stamp(a.date, a.time);
  const result: Segment[] = [];
  for (const step of method.steps) {
    if (step.handsOn)
      result.push({
        resourceId: a.personId,
        start,
        end: start + step.handsOn * 60000,
        label: step.name,
        assignmentId: a.id,
      });
    if (step.equipment && a.equipment[step.equipment])
      result.push({
        resourceId: a.equipment[step.equipment],
        start,
        end: start + step.duration * 60000,
        label: step.name,
        assignmentId: a.id,
      });
    start += step.duration * 60000;
  }
  return result;
}
export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;
export function assignmentChecks(s: State, a: Assignment): Check[] {
  const checks: Check[] = [];
  const block = (text: string) => checks.push({ level: 'block', text });
  const warn = (text: string) => checks.push({ level: 'warning', text });
  const work = s.work.find((w) => w.id === a.workId),
    person = s.people.find((p) => p.id === a.personId);
  if (!work) {
    block('Choose work to assign.');
    return checks;
  }
  const method = assignmentMethod(s, a);
  if (!a.samples?.trim())
    warn('Assigned sample / replicate IDs are missing. Add them before issuing a sheet.');
  const repeat = s.repeats.find((r) => r.id === a.repeatId);
  if (repeat && !repeat.fresh)
    warn(
      'Existing preparation may be reusable, but this plan still books the full method. Confirm the repeat route and prepared-sample stability with the team leader.',
    );
  if (!person) block('Choose an analyst.');
  if (!a.date || !a.time || !Number.isFinite(stamp(a.date, a.time)))
    block('Choose a date and start time.');
  if (!Number.isInteger(a.quantity) || a.quantity < 1)
    block('Enter a whole quantity of at least 1.');
  if (a.quantity > allocationLeft(s, a.workId, a.repeatId, a.id))
    block('This quantity is already assigned. Reduce it or split an existing assignment.');
  const original = s.assignments.find((x) => x.id === a.id);
  if (
    original &&
    attempted(s, a.id) > 0 &&
    (a.personId !== original.personId ||
      a.date !== original.date ||
      a.time !== original.time ||
      JSON.stringify(a.equipment) !== JSON.stringify(original.equipment))
  )
    block(
      'This assignment has recorded attempts. Keep its person, date and equipment unchanged; split unfinished work into a new assignment.',
    );
  if (a.quantity < attempted(s, a.id))
    block('Keep the quantity at or above the attempts already recorded.');
  if (a.repeatId && !s.repeats.some((r) => r.id === a.repeatId && r.workId === a.workId))
    block('Choose a repeat linked to this work.');
  for (const type of new Set(method.steps.map((p) => p.equipment).filter(Boolean))) {
    if (!s.equipment.some((e) => e.id === a.equipment[type] && e.type === type))
      block(`Choose equipment for ${type}.`);
  }
  if (person && !person.methods.includes(method.id))
    warn(
      `${person.name}: method qualification is not confirmed in the demo profile. Check with the team leader.`,
    );
  if (!work.ready) warn('Samples are not marked ready. Confirm intake before starting.');
  if (a.date < work.readyDate)
    warn(`Samples are expected on ${work.readyDate}, after this assignment starts.`);
  if (work.blocker) warn(`Work problem: ${work.blocker}.`);
  const duration = sum(method.steps.map((p) => p.duration)),
    start = stamp(a.date, a.time),
    end = start + duration * 60000;
  if (end > stamp(work.testDue, '17:00'))
    warn('This plan finishes after the testing target. Check the reporting deadline.');
  if (
    start < stamp(a.date, '08:00') ||
    end > stamp(a.date, '17:00') ||
    [0, 6].includes(new Date(start).getDay())
  )
    warn('This is outside demo working hours (Monday–Friday, 08:00–17:00).');
  const standard = assignmentStandard(s, a);
  if (!standard)
    warn('No standard is selected. Check whether this method needs a prepared standard.');
  if (standard) {
    const prepared = new Date(standard.preparedAt).getTime(),
      expiry = prepared + standard.shelfHours * 3600000;
    if (!standard.preparedAt || !Number.isFinite(prepared))
      warn(`${standard.name}: preparation has not been recorded.`);
    else if (prepared > start) warn(`${standard.name}: not prepared before this assignment.`);
    else if (expiry < end)
      warn(
        `${standard.name}: shelf life does not cover the whole assignment. Prepare again or check timings.`,
      );
  }
  const other = s.assignments.filter((b) => b.id !== a.id).flatMap((b) => segments(s, b));
  for (const seg of segments(s, a)) {
    const resource =
      s.people.find((p) => p.id === seg.resourceId)?.name ||
      s.equipment.find((e) => e.id === seg.resourceId)?.name;
    for (const conflict of other.filter(
      (b) => b.resourceId === seg.resourceId && overlaps(seg, b),
    )) {
      const cw = s.work.find(
        (w) => w.id === s.assignments.find((b) => b.id === conflict.assignmentId)?.workId,
      );
      warn(`${resource}: overlaps ${cw?.project} (${conflict.label}).`);
    }
    for (const r of s.reservations.filter((r) => r.resourceId === seg.resourceId))
      if (
        overlaps(seg, {
          start: stamp(r.date, r.time),
          end: stamp(r.date, r.time) + r.minutes * 60000,
        })
      )
        warn(`${resource}: ${r.label} overlaps this work.`);
  }
  return checks.filter((c, i, all) => all.findIndex((x) => x.text === c.text) === i);
}
function planningWork(work?: Work) {
  if (!work) return undefined;
  const { stage, ...planning } = work;
  return planning;
}
export function sheetFingerprint(s: State, date: string, personId: string) {
  return JSON.stringify({
    lines: s.assignments
      .filter((a) => a.date === date && a.personId === personId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => {
        const { methodSnapshot, standardSnapshot, ...plan } = a;
        return {
          a: plan,
          w: planningWork(s.work.find((w) => w.id === a.workId)),
          m: assignmentMethod(s, a),
          warnings: assignmentChecks(s, a).map((c) => c.text),
          standard: assignmentStandard(s, a),
        };
      }),
    reservations: s.reservations.filter((r) => r.date === date && r.resourceId === personId),
  });
}
