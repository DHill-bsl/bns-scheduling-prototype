export interface TutorialHelp {
  spreadsheet: string;
  fields: { name: string; meaning: string }[];
  automatic: string[];
  manual: string[];
  example?: string;
}

export const tutorialHelp: Record<string, TutorialHelp> = {
  'add-work': {
    spreadsheet: 'Like a work-list row: what needs testing, not who will do it.',
    fields: [
      { name: 'Project reference', meaning: 'A made-up project code, such as JOB-DEMO.' },
      { name: 'Client', meaning: 'Who the testing is for.' },
      {
        name: 'Products, batch, timepoint and samples',
        meaning:
          'Which work this row covers. Include batch, samples and replicate details; a project code alone is not enough.',
      },
      { name: 'Method', meaning: 'The demo method code selected for this work.' },
      {
        name: 'Required replicates',
        meaning:
          'Total demand. Calculate products × batches × replicates yourself. Do not add failure repeats.',
      },
      {
        name: 'Samples available from',
        meaning: 'When samples are expected to be available. This is not the testing start date.',
      },
      {
        name: 'Samples booked in and ready',
        meaning: 'Tick only when samples are actually ready. The date alone does not confirm this.',
      },
      {
        name: 'Testing target',
        meaning: 'When testing should finish.',
      },
      {
        name: 'Reporting deadline',
        meaning:
          'When the report is due. Enter it yourself; it must not be before the testing target.',
      },
      {
        name: 'Required standard',
        meaning:
          'The standard to check for readiness and expiry. Selecting it does not book preparation.',
      },
      {
        name: 'Known problem or missing prerequisite',
        meaning:
          'A visible problem that needs attention. It raises a warning, not an enforced stop.',
      },
    ],
    automatic: [
      'Adds the job to the queue.',
      'Updates quantities as assignments and results are saved.',
    ],
    manual: [
      'Check sample readiness and dates.',
      'Assign the work separately. Adding a job books nothing.',
    ],
  },
  'add-method': {
    spreadsheet: 'Like a reusable task list, with each demo test broken into timed steps.',
    fields: [
      { name: 'Name', meaning: 'A short name for the test.' },
      {
        name: 'Method code',
        meaning: 'Its unique demo reference, such as DEMO-101. It cannot be changed after saving.',
      },
      {
        name: 'Prerequisites',
        meaning:
          'What must be ready before testing. These are instructions to check, not automatic rules.',
      },
      {
        name: 'Source and assumptions',
        meaning: 'The method reference and any times or rules that still need checking.',
      },
      { name: 'Step name', meaning: 'One activity, such as setup, instrument run or cleanup.' },
      {
        name: 'Total time (min)',
        meaning:
          'How long the step takes, including waiting. Equipment is booked for this whole period.',
      },
      {
        name: 'Hands-on time (min)',
        meaning:
          'How long the analyst is needed, starting at the beginning of the step. Can be zero; cannot exceed total time.',
      },
      {
        name: 'Equipment type',
        meaning:
          'The kind of machine needed, not a particular asset. Choose the actual machine when assigning work. None means no equipment booking.',
      },
      {
        name: 'Add step / Remove step',
        meaning:
          'Build the steps in order. Each starts when the previous one ends. Keep at least one.',
      },
    ],
    automatic: [
      'Uses these steps when you assign work.',
      'Books equipment only after you save a dated assignment with a named machine.',
    ],
    manual: [
      'Check the times: they do not increase when you assign more replicates.',
      'Review existing unattempted assignments after changing a method. Recorded attempts keep their old recipe.',
    ],
    example:
      'A step starts at 09:00: 120 minutes total, 15 minutes hands-on. The machine is booked 09:00–11:00. The analyst is booked 09:00–09:15. Saving the method alone books neither.',
  },
  'add-standard': {
    spreadsheet: 'Makes a demo reference-preparation task reusable.',
    fields: [
      { name: 'Name', meaning: 'Which standard this is.' },
      { name: 'Level', meaning: 'L1, L2 or L3. This does not decide who is qualified.' },
      {
        name: 'Shelf life (hours)',
        meaning: 'How long it can be used after preparation, under the stated storage conditions.',
      },
      {
        name: 'Last preparation completed',
        meaning:
          'When it was actually prepared. Leave blank if not done. Only one current preparation time is stored.',
      },
      {
        name: 'Storage conditions, source and assumptions',
        meaning: 'How to store it and where the shelf-life rule came from.',
      },
      {
        name: 'Step name / Add step / Remove step',
        meaning: 'The preparation activities, in order.',
      },
      {
        name: 'Total time (min)',
        meaning: 'Full step time, including waiting. Any equipment is occupied for this period.',
      },
      { name: 'Hands-on time (min)', meaning: 'Analyst time at the start of the step.' },
      {
        name: 'Equipment type',
        meaning: 'The kind of machine needed. Choose a named machine when booking preparation.',
      },
    ],
    automatic: ['Checks preparation time and expiry when the standard is selected for work.'],
    manual: [
      'Select the standard on each relevant job.',
      'Book preparation and record completion separately. Stock and batches are not tracked.',
    ],
  },
  'assign-work': {
    spreadsheet: 'Like a daily task-and-quantity entry, with the equipment booking included.',
    fields: [
      { name: 'Work', meaning: 'The job being assigned. Check its method, batch and timepoint.' },
      {
        name: 'Analyst',
        meaning: 'Who will do it, like the person’s row in the monthly schedule.',
      },
      {
        name: 'Replicates',
        meaning:
          'Quantity for this booking, like the daily Reps cell. It can be part of the total requirement.',
      },
      {
        name: 'Date / Start time',
        meaning: 'When the first step starts. Later step times are calculated from the method.',
      },
      {
        name: 'Assigned sample / replicate IDs',
        meaning:
          'Exactly which samples this person should do. These print on the sheet. Typed ranges are not checked automatically.',
      },
      {
        name: 'Equipment bookings',
        meaning:
          'Choose each named machine. Defaults are not checked for availability. The same machine is used for all steps of its type.',
      },
      {
        name: 'Planning steps',
        meaning:
          'Calculated booking times. Equipment uses the full step time; the analyst uses only hands-on time.',
      },
      {
        name: 'Instructions and handover',
        meaning: 'Notes for the analyst, like schedule comments. They print on the sheet.',
      },
      {
        name: 'Warnings acknowledgement',
        meaning:
          'Confirms you reviewed the warnings. It does not fix a clash or approve a laboratory exception.',
      },
    ],
    automatic: [
      'Books the person and equipment when you save. No separate equipment reservation is needed.',
      'Warns about clashes and updates the unassigned quantity.',
    ],
    manual: [
      'Check qualifications, sample IDs and equipment choices.',
      'Resolve clashes yourself. The app does not move work or notify analysts.',
    ],
    example:
      'A 90-minute instrument step with 10 minutes hands-on books the machine for 90 minutes and the analyst for the first 10.',
  },
  calendar: {
    spreadsheet: 'People shows a person-by-day plan. Equipment shows the same bookings by machine.',
    fields: [
      { name: 'People / Equipment', meaning: 'Two views of the same bookings.' },
      {
        name: 'Calendar view',
        meaning: 'Week overview shows the plan. Day · hourly shows exact booking intervals.',
      },
      {
        name: 'Date / Today / Previous period / Next period',
        meaning: 'Changes what you see, not the dates of saved work.',
      },
      {
        name: 'Filter resources',
        meaning: 'Show one person or machine. Hidden bookings still exist.',
      },
      {
        name: 'Assignment list / Reserved time',
        meaning: 'Use these lists to open work or inspect leave, maintenance and other bookings.',
      },
    ],
    automatic: [
      'Shows the same assignment in both people and equipment views.',
      'Updates both views after a saved change.',
    ],
    manual: [
      'Use Day · hourly to check clashes.',
      'Check realistic capacity. There is no two-task-per-day limit, but timings are estimates.',
    ],
  },
  preparation: {
    spreadsheet: 'Like booking preparation on a staff plan and equipment plan together.',
    fields: [
      { name: 'Selected standard', meaning: 'The card you opened supplies the preparation steps.' },
      { name: 'Analyst', meaning: 'Who will prepare the standard.' },
      { name: 'Date / Start time', meaning: 'When preparation is planned to begin.' },
      {
        name: 'Equipment selectors',
        meaning: 'Which actual machines will be used. Check the default choices.',
      },
      {
        name: 'Bookings from the preparation recipe',
        meaning: 'Preview of the person and equipment periods. A step can have one entry for each.',
      },
      {
        name: 'Preparation warnings acknowledgement',
        meaning: 'Confirms you reviewed clashes or out-of-hours bookings. It does not remove them.',
      },
      {
        name: 'Last preparation completed',
        meaning:
          'Record this afterwards under Edit / record preparation—not when booking the work.',
      },
    ],
    automatic: [
      'Saves person and equipment bookings together.',
      'Removes the whole linked group if you choose Remove preparation bookings.',
    ],
    manual: [
      'Record actual completion. A booking does not make the standard ready.',
      'If the recipe changes, check and rebook existing preparation periods if needed.',
    ],
  },
  'reserve-time': {
    spreadsheet: 'Like leave notes, training, maintenance or out-of-use periods in the schedules.',
    fields: [
      { name: 'Person or equipment', meaning: 'The one person or machine to reserve.' },
      { name: 'What is the time for?', meaning: 'A clear reason, such as leave or maintenance.' },
      { name: 'Date / Start time', meaning: 'When the reserved period begins.' },
      {
        name: 'Duration (minutes)',
        meaning:
          'How long it lasts. Enter separate periods for separate days; bookings do not repeat automatically.',
      },
    ],
    automatic: ['Shows the reserved time and warns where it overlaps testing assignments.'],
    manual: [
      'Check clashes between generic reservations yourself.',
      'Do not duplicate equipment already booked by an assignment.',
    ],
  },
  'move-split': {
    spreadsheet: 'Like moving a daily task or carrying its unfinished quantity into another day.',
    fields: [
      {
        name: 'Edit / move',
        meaning: 'Changes the existing booking. Recorded attempts cannot be moved.',
      },
      {
        name: 'Replicates',
        meaning: 'For Split, how many unattempted replicates move to the new booking.',
      },
      {
        name: 'Analyst / Date / Start time / Equipment bookings',
        meaning: 'Who, when and where for the moved work.',
      },
      { name: 'Assigned sample / replicate IDs', meaning: 'The sample subset that moves.' },
      {
        name: 'Sample / replicate IDs kept on the original assignment',
        meaning:
          'What stays, including all recorded attempts. Check that the two lists do not overlap.',
      },
      {
        name: 'Instructions and handover / Reason for changing the plan',
        meaning: 'Updated analyst instructions and why the plan changed.',
      },
    ],
    automatic: [
      'Recalculates the person and equipment bookings.',
      'Keeps earlier progress on the original assignment and flags affected issued sheets.',
    ],
    manual: [
      'Split unfinished work instead of moving recorded attempts.',
      'Issue replacement sheets and replace the old paper.',
    ],
  },
  'work-sheets': {
    spreadsheet:
      'The daily paper handover, made from the saved plan rather than copied separately.',
    fields: [
      {
        name: 'Work-sheet date / Analyst checkboxes',
        meaning: 'Whose sheet to prepare and for which day.',
      },
      {
        name: 'Working plan / Print draft',
        meaning: 'Current instructions. A draft is not an issued copy.',
      },
      {
        name: 'Planning warnings / Acknowledgement',
        meaning: 'Review these before issuing. Acknowledgement does not prove the work is ready.',
      },
      {
        name: 'Issue work sheets',
        meaning: 'Saves a fixed version. It does not print or send it.',
      },
      {
        name: 'Issued copies / Print work sheets',
        meaning: 'View the saved version and open the browser print dialog.',
      },
      {
        name: 'Earlier copies / Replacement needed',
        meaning: 'View old versions or see that a changed plan needs new paper.',
      },
      {
        name: 'Assigned IDs / Progress summary / Return fields',
        meaning:
          'What to do, what was recorded when issued, and spaces for the analyst’s new update.',
      },
    ],
    automatic: [
      'Keeps issued copies unchanged and flags them after relevant plan changes.',
      'Creates a new version only when the plan has changed.',
    ],
    manual: [
      'Print all pages, hand them out and replace outdated copies.',
      'Enter returned progress yourself. Progress alone does not rewrite issued paper.',
    ],
  },
  progress: {
    spreadsheet: 'Like actual output and problem notes—not the quantities in a future plan.',
    fields: [
      {
        name: 'Record new attempts',
        meaning: 'Enter only the new update. Earlier results stay recorded.',
      },
      {
        name: 'Valid output',
        meaning: 'Successful replicates from this update. This does not mean checked or reported.',
      },
      {
        name: 'Failed attempts',
        meaning:
          'Replicates attempted but unsuccessful. Valid plus failed cannot exceed the unattempted quantity.',
      },
      {
        name: 'Sample and replicate IDs',
        meaning: 'If any failed, list the failed IDs here. This text goes into the repeat record.',
      },
      {
        name: 'Progress or problem',
        meaning:
          'What happened and why. Add successful IDs here if needed. A reason is required for failures.',
      },
      {
        name: 'Fresh preparation is needed',
        meaning:
          'A note for the repeat. Both choices currently book the full method; neither creates preparation bookings.',
      },
    ],
    automatic: [
      'Counts successful output and creates linked repeats for failures.',
      'Keeps the original required quantity unchanged.',
    ],
    manual: [
      'Leave unattempted work unrecorded. Split it if it needs another date.',
      'Schedule repeats yourself. Recording progress does not shorten the old calendar booking.',
    ],
    example:
      '12 assigned; 8 successful; 2 failed. There are now 2 still pending, 2 repeats to assign and 8 valid output.',
  },
  rejection: {
    spreadsheet: 'Like recording a later failure, then adding a linked repeat task.',
    fields: [
      {
        name: 'Earlier successful update',
        meaning: 'The original result entry now being questioned.',
      },
      {
        name: 'Quantity to reject',
        meaning:
          'Previously successful replicates to reject now. Already rejected quantities cannot be counted again.',
      },
      {
        name: 'Affected sample / replicate IDs',
        meaning:
          'The rejected subset. Check IDs against the returned sheet; typed ranges are not validated.',
      },
      { name: 'Reason for rejection', meaning: 'Why the earlier result is no longer accepted.' },
      {
        name: 'Fresh preparation is needed',
        meaning: 'Whether the repeat needs new preparation. This does not book it.',
      },
      {
        name: 'Reject output and create repeat',
        meaning: 'Applies the change after confirmation. It is not a general undo button.',
      },
    ],
    automatic: [
      'Reduces valid output, reopens the work and creates a linked repeat.',
      'Keeps the original result and rejection visible.',
    ],
    manual: [
      'Schedule the repeat.',
      'Handle affected reports and the formal quality process outside this app.',
    ],
  },
  'follow-up': {
    spreadsheet: 'Keeps unfinished testing separate from checking and reporting.',
    fields: [
      {
        name: 'Unfinished from earlier days',
        meaning:
          'Older assignments with work still unattempted. Failed work is listed as repeats instead.',
      },
      {
        name: 'Awaiting checking / reporting',
        meaning: 'Enough valid output is recorded, but the work is not yet Reported.',
      },
      {
        name: 'Reporting deadline passed',
        meaning: 'The report is overdue and the work is not marked Reported.',
      },
      {
        name: 'Assignments / progress',
        meaning: 'All assignments for the job, including dates outside the current calendar view.',
      },
      {
        name: 'Mark checked / approved / reported',
        meaning: 'Manual status updates. They are not signatures and do not send a report.',
      },
      {
        name: 'Recent changes / Demo team leader',
        meaning: 'Saved change history under a fictional leader name. The selector is not a login.',
      },
    ],
    automatic: ['Updates filters from saved quantities, dates and statuses.'],
    manual: [
      'Follow up unfinished work; it does not move itself to today.',
      'Confirm each review stage before changing its status.',
    ],
  },
  'safe-demo': {
    spreadsheet:
      'Demand, daily assignments and completed work are separate here, even if spreadsheet totals look similar.',
    fields: [
      {
        name: 'Required',
        meaning: 'Original client demand, excluding extra attempts after failure.',
      },
      { name: 'Unassigned', meaning: 'Work still needing a booking, including repeats.' },
      { name: 'Pending', meaning: 'Already assigned, but not yet attempted.' },
      { name: 'Valid output', meaning: 'Successful replicates, less any later rejection.' },
      {
        name: 'Cancel / Close panel',
        meaning: 'Discards an unsaved form. It does not undo a saved change.',
      },
      {
        name: 'Reset saved demo',
        meaning:
          'Clears work and bookings, restores the example definitions and resources, and removes progress and issued copies. There is no in-app undo.',
      },
    ],
    automatic: [
      'Saves changes in this browser and address.',
      'Blocks saving from an out-of-date tab until it is reloaded.',
    ],
    manual: [
      'Use one tab for editing. You can keep reading tutorials in another.',
      'Reload a stale tab before editing there. Do not reset the demo to clear the warning.',
    ],
  },
};
