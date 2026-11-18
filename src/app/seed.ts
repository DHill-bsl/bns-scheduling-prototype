import { State, day, monday } from './models';
export function seed(): State {
  return {
    version: 1,
    revision: 0,
    week: monday(day(new Date())),
    methods: [
      {
        id: 'NTM0086',
        name: 'Pouch dissolution',
        source:
          'NTM0086 v8, §§8–9: USP-4 dissolution bath, timed fractions and HPLC-UV. Planning durations below are demo estimates, not validated throughput.',
        prerequisites:
          'Samples booked in; client timepoints confirmed; nicotine calibration standards ready; bath and HPLC checks complete.',
        steps: [
          { name: 'Prepare samples and set up', duration: 30, handsOn: 30, equipment: 'Balance' },
          {
            name: 'Dissolution and timed collections',
            duration: 90,
            handsOn: 60,
            equipment: 'Dissolution bath',
          },
          { name: 'HPLC-UV sequence', duration: 180, handsOn: 15, equipment: 'HPLC-UV' },
          { name: 'Clean up and record results', duration: 30, handsOn: 30, equipment: '' },
        ],
      },
      {
        id: 'NTM0025a',
        name: 'Carbonyl testing',
        source:
          'NTM0025a v12, §§8–9: LC-MS, 30 ±5 minute derivatisation; short refrigerated sample stability. Only the 30-minute wait is method-derived. Other durations are demo estimates.',
        prerequisites:
          'Samples booked in; same-day blank and QC prepared; standards checked; calibrated timer available. Follow the controlled method for storage and timing.',
        steps: [
          {
            name: 'Prepare samples, blank and QC',
            duration: 45,
            handsOn: 45,
            equipment: 'Balance',
          },
          { name: 'Timed derivatisation', duration: 30, handsOn: 0, equipment: '' },
          { name: 'Vial and mix', duration: 15, handsOn: 15, equipment: 'Vortex mixer' },
          { name: 'LC-MS sequence', duration: 180, handsOn: 15, equipment: 'LC-MS' },
          { name: 'Clean up and record results', duration: 30, handsOn: 30, equipment: '' },
        ],
      },
    ],
    standards: [
      {
        id: 'std-nic',
        name: 'Nicotine calibration standards',
        level: 'L2',
        shelfHours: 168,
        preparedAt: '',
        notes:
          '7-day refrigerated stability from NTM0086 §9.6 (2–8°C, protected from light). Level and preparation times are demo assumptions. Storage conditions must be checked outside this app.',
        steps: [
          {
            name: 'Prepare calibration dilutions',
            duration: 45,
            handsOn: 45,
            equipment: 'Balance',
          },
          { name: 'Label and refrigerate', duration: 15, handsOn: 15, equipment: '' },
        ],
      },
      {
        id: 'std-carb',
        name: 'Carbonyl calibration standards',
        level: 'L3',
        shelfHours: 1512,
        preparedAt: '',
        notes:
          'NTM0025a v12 §9.4.1: calibration standards use pre-derivatised stock. Stable for 9 weeks in screw-top vials sealed with parafilm at 2–8°C; aliquot to avoid repeated warming. Confirm against the current controlled method. Blank, QC and control samples are separate: prepare on the sample-preparation day (§9.5.1). Level and working times are demo assumptions.',
        steps: [
          {
            name: 'Prepare calibration dilutions from pre-derivatised stock',
            duration: 45,
            handsOn: 45,
            equipment: '',
          },
          { name: 'Mix, vial, label and refrigerate', duration: 15, handsOn: 15, equipment: '' },
        ],
      },
    ],
    people: [
      { id: 'p1', name: 'Maya Reed', role: 'Pouch testing', methods: ['NTM0086', 'NTM0025a'] },
      { id: 'p2', name: 'Theo Brooks', role: 'Wet chemistry', methods: ['NTM0086', 'NTM0025a'] },
      { id: 'p3', name: 'Ella Chen', role: 'Pouch testing', methods: ['NTM0086'] },
      { id: 'p4', name: 'Noah Patel', role: 'Analytical testing', methods: ['NTM0025a'] },
    ],
    equipment: [
      { id: 'e1', name: 'Dissolution bath A', type: 'Dissolution bath' },
      { id: 'e2', name: 'Dissolution bath B', type: 'Dissolution bath' },
      { id: 'e3', name: 'HPLC-UV A', type: 'HPLC-UV' },
      { id: 'e4', name: 'HPLC-UV B', type: 'HPLC-UV' },
      { id: 'e5', name: 'LC-MS A', type: 'LC-MS' },
      { id: 'e6', name: 'Balance A', type: 'Balance' },
      { id: 'e7', name: 'Balance B', type: 'Balance' },
      { id: 'e8', name: 'Vortex mixer A', type: 'Vortex mixer' },
    ],
    work: [],
    assignments: [],
    progress: [],
    rejections: [],
    repeats: [],
    reservations: [],
    sheets: [],
    audit: [],
  };
}
