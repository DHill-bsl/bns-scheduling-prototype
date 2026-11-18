import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { tutorialHelp } from './tutorial-help';

export interface TutorialDestination {
  section: 'work' | 'definitions' | 'planner' | 'sheets' | 'problems' | 'activity';
  tab?: 'methods' | 'standards' | 'resources';
}
interface Tutorial {
  id: string;
  title: string;
  purpose: string;
  steps: string[];
  destination: TutorialDestination;
  action: string;
}

@Component({
  selector: 'app-tutorials',
  imports: [MatButtonModule],
  templateUrl: './tutorials.html',
  styleUrl: './tutorials.scss',
})
export class Tutorials {
  readonly openScreen = output<TutorialDestination>();
  readonly help = tutorialHelp;
  readonly tutorials: Tutorial[] = [
    {
      id: 'add-work',
      title: 'Add work to the queue',
      purpose: 'Enter what needs testing.',
      steps: [
        'Go to Work queue → Add work.',
        'Enter the project, client and sample details. Choose the method and total number of replicates.',
        'Set sample readiness, the testing target and the reporting deadline.',
        'Choose the required standard. Note any problem that could delay the work.',
        'Click Save changes. The work is now ready to assign.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'add-method',
      title: 'Add a test method',
      purpose: 'Set the steps, time and equipment needed for a test.',
      steps: [
        'Go to Methods & standards → Test methods → Add method.',
        'Enter the method name and code. Note what must be ready before testing.',
        'Add each step in order. Enter its total time, hands-on time and equipment type.',
        'Record the source of the method and any estimated times.',
        'Click Save changes. You can now choose this method when adding work.',
      ],
      destination: { section: 'definitions', tab: 'methods' },
      action: 'Open Test methods',
    },
    {
      id: 'add-standard',
      title: 'Add a standard',
      purpose: 'Record how to prepare it and how long it can be used.',
      steps: [
        'Go to Methods & standards → Standards → Add standard.',
        'Enter the name, level, shelf life and storage conditions.',
        'Add the preparation steps, with time and equipment for each step.',
        'Only enter Last preparation completed if it has actually been prepared. Save changes.',
        'Open the work item’s Details / readiness and choose it as the Required standard.',
      ],
      destination: { section: 'definitions', tab: 'standards' },
      action: 'Open Standards',
    },
    {
      id: 'assign-work',
      title: 'Assign work to a person',
      purpose: 'Choose who will do it, when and on which equipment.',
      steps: [
        'In Work queue, find the job and click Assign work.',
        'Choose an analyst, quantity, date and start time.',
        'Enter the exact sample and replicate IDs for this assignment.',
        'Choose the named equipment. Add any instructions for the analyst.',
        'Fix blocked items and review warnings. Click Save changes.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'calendar',
      title: 'Check the schedule',
      purpose: 'See who and what is already booked.',
      steps: [
        'Open Team planner and choose a date.',
        'Use Week overview for the weekly plan or Day · hourly for booking times.',
        'Switch between People and Equipment. Filter to one person or machine if needed.',
        'Use the assignment list to edit work. Expand Reserved time to see other commitments.',
      ],
      destination: { section: 'planner' },
      action: 'Open Team planner',
    },
    {
      id: 'preparation',
      title: 'Plan standards preparation',
      purpose: 'Book time to prepare a standard before it is needed.',
      steps: [
        'Go to Methods & standards → Standards.',
        'Find the standard and click Plan preparation time.',
        'Choose the analyst, date, time and equipment.',
        'Review the bookings and warnings, then Save changes.',
        'Once preparation is finished, use Edit / record preparation to record the actual completion time.',
      ],
      destination: { section: 'definitions', tab: 'standards' },
      action: 'Open Standards',
    },
    {
      id: 'reserve-time',
      title: 'Book leave or maintenance',
      purpose: 'Show when a person or machine is unavailable.',
      steps: [
        'Go to Team planner → Reserve time.',
        'Choose the person or equipment and enter the reason.',
        'Enter the date, start time and duration. Save changes.',
        'Find the booking under Reserved time. Use Remove if it is cancelled.',
      ],
      destination: { section: 'planner' },
      action: 'Open Team planner',
    },
    {
      id: 'move-split',
      title: 'Move or split work',
      purpose: 'Move a booking, or move only the unfinished part.',
      steps: [
        'In Work queue, open the job’s Assignments / progress.',
        'Use Edit / move to change an unattempted booking. Use Split to move only part of it.',
        'Choose the new person, date, time, equipment and quantity.',
        'For a split, enter which sample IDs move and which stay on the original assignment.',
        'Give a reason, review warnings and save. Replace affected printed sheets.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'work-sheets',
      title: 'Print and replace work sheets',
      purpose: 'Give analysts a saved copy of their instructions.',
      steps: [
        'Open Work sheets. Choose the date and analysts.',
        'Check the Working plan, sample IDs and warnings.',
        'Click Issue work sheets to save a copy, then Print work sheets.',
        'If the plan changes, issue and print again. Give the analyst the revised copy and remove the old paper.',
      ],
      destination: { section: 'sheets' },
      action: 'Open Work sheets',
    },
    {
      id: 'progress',
      title: 'Record progress and repeats',
      purpose: 'Record what passed, what failed and what still needs doing.',
      steps: [
        'Open the job’s Assignments / progress, then Progress on the correct assignment.',
        'Enter successful and failed quantities from this update only.',
        'For failures, enter the failed sample IDs, reason and whether fresh preparation is needed.',
        'Click Record progress. Leave unattempted work unrecorded.',
        'Go to Problems & repeats → Assign repeat to schedule failed work again.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'rejection',
      title: 'Record a later rejection',
      purpose: 'Reject output that was previously recorded as successful.',
      steps: [
        'Open Progress on the original assignment, then Reject recorded output.',
        'Choose the earlier successful update.',
        'Enter the rejected quantity, sample IDs, reason and preparation requirement.',
        'Click Reject output and create repeat, then confirm. Schedule the repeat under Problems & repeats.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'follow-up',
      title: 'Find work needing follow-up',
      purpose: 'Find unfinished testing and reports still due.',
      steps: [
        'Check Problems & repeats → Unfinished from earlier days.',
        'Use the Work queue filters to find work awaiting checking or reporting.',
        'Open Assignments / progress to record progress or split unfinished work.',
        'Once all required output is recorded, mark work checked, approved and reported as each stage is completed.',
      ],
      destination: { section: 'work' },
      action: 'Open Work queue',
    },
    {
      id: 'safe-demo',
      title: 'Understand the counts and saved data',
      purpose: 'Know what the numbers mean and how to practise safely.',
      steps: [
        'Use fictional work. A private browser session keeps practice separate from your normal saved plan.',
        'Read the count definitions below. Assigned work is not completed work.',
        'Keep one tab for editing and another for reading these guides.',
        'Use Reset saved demo only when you want to delete all saved demo changes. Do not reset to clear a tab warning.',
      ],
      destination: { section: 'activity' },
      action: 'Open Activity & guide',
    },
  ];
}
