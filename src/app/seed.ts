import { State, day, monday } from './models';

// Every definition, duration, shelf life and resource below is invented for this demo.
export function seed(): State {
  return {
    version: 1,
    revision: 0,
    week: monday(day(new Date())),
    methods: [
      {
        id: 'DEMO-101',
        name: 'Coating check',
        source:
          'Fictional demonstration only. This invented recipe, equipment and all timings illustrate scheduling; they are not laboratory instructions.',
        prerequisites:
          'Demo pieces labelled; blue reference set ready; example equipment available. These are fictional planning checks.',
        steps: [
          { name: 'Label demo pieces', duration: 20, handsOn: 20, equipment: 'Balance' },
          {
            name: 'Condition demo pieces',
            duration: 75,
            handsOn: 25,
            equipment: 'Conditioning unit',
          },
          { name: 'Read demo signals', duration: 110, handsOn: 10, equipment: 'Optical reader' },
          { name: 'Record demo observations', duration: 25, handsOn: 25, equipment: '' },
        ],
      },
      {
        id: 'DEMO-202',
        name: 'Colour screening',
        source:
          'Fictional demonstration only. The steps, waiting period, equipment and durations are made up, not taken from a test method.',
        prerequisites:
          'Demo cards labelled; amber reference set ready; example scanner available. These are fictional planning checks.',
        steps: [
          { name: 'Prepare demo cards', duration: 35, handsOn: 35, equipment: 'Balance' },
          { name: 'Allow demo cards to settle', duration: 40, handsOn: 0, equipment: '' },
          { name: 'Mix demo reference', duration: 20, handsOn: 10, equipment: 'Mixer' },
          { name: 'Scan demo cards', duration: 95, handsOn: 10, equipment: 'Colour scanner' },
          { name: 'File demo observations', duration: 20, handsOn: 20, equipment: '' },
        ],
      },
    ],
    standards: [
      {
        id: 'std-blue',
        name: 'Blue reference set',
        level: 'L2',
        shelfHours: 72,
        preparedAt: '',
        notes:
          'Fictional demonstration only. The 72-hour shelf life, level and preparation steps are invented to illustrate readiness and expiry. There are no real storage or testing instructions.',
        steps: [
          { name: 'Assemble demo references', duration: 20, handsOn: 20, equipment: 'Balance' },
          { name: 'Label demo containers', duration: 10, handsOn: 10, equipment: '' },
        ],
      },
      {
        id: 'std-amber',
        name: 'Amber reference set',
        level: 'L3',
        shelfHours: 240,
        preparedAt: '',
        notes:
          'Fictional demonstration only. The 240-hour shelf life, level and preparation steps are invented for this app. They do not describe any real reference material or storage conditions.',
        steps: [
          { name: 'Arrange demo reference cards', duration: 25, handsOn: 25, equipment: '' },
          { name: 'Label demo card set', duration: 10, handsOn: 10, equipment: '' },
        ],
      },
    ],
    people: [
      { id: 'p1', name: 'Maya Reed', role: 'Materials demo', methods: ['DEMO-101', 'DEMO-202'] },
      { id: 'p2', name: 'Theo Brooks', role: 'Reference demo', methods: ['DEMO-101', 'DEMO-202'] },
      { id: 'p3', name: 'Ella Chen', role: 'Materials demo', methods: ['DEMO-101'] },
      { id: 'p4', name: 'Noah Patel', role: 'Screening demo', methods: ['DEMO-202'] },
    ],
    equipment: [
      { id: 'e1', name: 'Conditioning unit A', type: 'Conditioning unit' },
      { id: 'e2', name: 'Conditioning unit B', type: 'Conditioning unit' },
      { id: 'e3', name: 'Optical reader A', type: 'Optical reader' },
      { id: 'e4', name: 'Optical reader B', type: 'Optical reader' },
      { id: 'e5', name: 'Colour scanner A', type: 'Colour scanner' },
      { id: 'e6', name: 'Balance A', type: 'Balance' },
      { id: 'e7', name: 'Balance B', type: 'Balance' },
      { id: 'e8', name: 'Mixer A', type: 'Mixer' },
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
