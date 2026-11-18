import { State } from './models';

/** Human-readable changes, not a regulated audit trail. */
export function describeChanges(before: State, after: State): string[] {
  const changes: string[] = [];
  const person = (id: string) =>
    after.people.find((p) => p.id === id)?.name ??
    after.equipment.find((e) => e.id === id)?.name ??
    id;
  const project = (id: string) => after.work.find((w) => w.id === id)?.project ?? id;
  for (const a of after.assignments) {
    const old = before.assignments.find((x) => x.id === a.id);
    if (JSON.stringify(old) === JSON.stringify(a)) continue;
    const summary = `${person(a.personId)} · ${a.date} ${a.time} · ${a.quantity} replicates`;
    changes.push(
      `${project(a.workId)}: ${old ? `${person(old.personId)} · ${old.date} ${old.time} · ${old.quantity} replicates → ` : 'Assigned to '}${summary}.`,
    );
    if (old?.samples !== a.samples)
      changes.push(
        `Assigned IDs: “${old?.samples || 'Not recorded'}” → “${a.samples || 'Not recorded'}”.`,
      );
    if (old && old.instructions !== a.instructions)
      changes.push(
        `Instructions: “${old.instructions || 'None'}” → “${a.instructions || 'None'}”.`,
      );
    if (old && JSON.stringify(old.equipment) !== JSON.stringify(a.equipment))
      changes.push(
        `Equipment: ${Object.values(old.equipment)
          .map((id) => before.equipment.find((e) => e.id === id)?.name)
          .join(', ')} → ${Object.values(a.equipment)
          .map((id) => after.equipment.find((e) => e.id === id)?.name)
          .join(', ')}.`,
      );
  }
  for (const old of before.assignments)
    if (!after.assignments.some((a) => a.id === old.id))
      changes.push(
        `Removed ${project(old.workId)} from ${person(old.personId)} on ${old.date} at ${old.time}.`,
      );
  for (const w of after.work) {
    const old = before.work.find((x) => x.id === w.id);
    if (!old) {
      changes.push(`${w.project}: ${w.quantity} replicates requested for ${w.methodId}.`);
      continue;
    }
    if (old.ready !== w.ready)
      changes.push(`${w.project}: samples ${w.ready ? 'marked ready' : 'no longer marked ready'}.`);
    if (old.blocker !== w.blocker)
      changes.push(`${w.project} problem: “${old.blocker || 'None'}” → “${w.blocker || 'None'}”.`);
    if (old.testDue !== w.testDue || old.reportDue !== w.reportDue)
      changes.push(
        `${w.project}: testing ${old.testDue} → ${w.testDue}; reporting ${old.reportDue} → ${w.reportDue}.`,
      );
    if (old.stage !== w.stage) changes.push(`${w.project}: ${old.stage} → ${w.stage}.`);
  }
  for (const p of after.progress.filter((p) => !before.progress.some((old) => old.id === p.id)))
    changes.push(`${p.valid} valid output; ${p.failed} failed attempts. ${p.samples} ${p.note}`);
  for (const r of (after.rejections ?? []).filter(
    (r) => !(before.rejections ?? []).some((old) => old.id === r.id),
  ))
    changes.push(
      `Rejected ${r.quantity} previously successful output. ${r.samples}. ${r.reason}. Original update: ${r.progressId}.`,
    );
  for (const r of after.reservations.filter(
    (r) => r.preparationId && !before.reservations.some((old) => old.id === r.id),
  ))
    changes.push(`${r.label}: ${person(r.resourceId)} · ${r.date} ${r.time} · ${r.minutes} min.`);
  for (const sheet of after.sheets.filter((s) => !before.sheets.some((old) => old.id === s.id)))
    changes.push(`${person(sheet.personId)} · ${sheet.date}: issued version ${sheet.version}.`);
  for (const standard of after.standards) {
    const old = before.standards.find((s) => s.id === standard.id);
    if (old?.preparedAt !== standard.preparedAt)
      changes.push(
        `${standard.name}: preparation ${old?.preparedAt || 'not recorded'} → ${standard.preparedAt || 'not recorded'}.`,
      );
    if (old && old.shelfHours !== standard.shelfHours)
      changes.push(`Shelf life: ${old.shelfHours} → ${standard.shelfHours} hours.`);
  }
  return changes;
}
