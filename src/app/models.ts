export interface Step {
  name: string;
  duration: number;
  handsOn: number;
  equipment: string;
}
export interface Method {
  id: string;
  name: string;
  steps: Step[];
  prerequisites: string;
  source: string;
}
export interface Standard {
  id: string;
  name: string;
  level: 'L1' | 'L2' | 'L3';
  shelfHours: number;
  preparedAt: string;
  steps: Step[];
  notes: string;
}
export interface Person {
  id: string;
  name: string;
  role: string;
  methods: string[];
}
export interface Equipment {
  id: string;
  name: string;
  type: string;
}
export interface Work {
  id: string;
  project: string;
  client: string;
  identity: string;
  methodId: string;
  quantity: number;
  ready: boolean;
  readyDate: string;
  testDue: string;
  reportDue: string;
  blocker: string;
  standardId: string;
  stage: 'Awaiting work' | 'Performed' | 'Checked' | 'Approved' | 'Reported';
}
export interface Assignment {
  id: string;
  workId: string;
  personId: string;
  date: string;
  time: string;
  quantity: number;
  equipment: Record<string, string>;
  instructions: string;
  samples?: string;
  methodSnapshot?: Method;
  standardSnapshot?: Standard | null;
  repeatId?: string;
  revision: number;
}
export interface Progress {
  id: string;
  assignmentId: string;
  valid: number;
  failed: number;
  note: string;
  samples: string;
  fresh: boolean;
  at: string;
}
export interface Rejection {
  id: string;
  progressId: string;
  quantity: number;
  reason: string;
  samples: string;
  fresh: boolean;
  at: string;
}
export interface Repeat {
  id: string;
  workId: string;
  assignmentId: string;
  progressId: string;
  quantity: number;
  reason: string;
  samples: string;
  fresh: boolean;
}
export interface Reservation {
  id: string;
  resourceId: string;
  date: string;
  time: string;
  minutes: number;
  label: string;
  preparationId?: string;
  standardId?: string;
}
export interface SheetLine {
  assignment: Assignment;
  work: Work;
  method: Method;
  person: string;
  equipmentNames: Record<string, string>;
  standard?: Standard;
  repeat?: Repeat;
  warnings?: string[];
  progressSummary?: { valid: number; failed: number; remaining: number };
}
export interface IssuedSheet {
  id: string;
  date: string;
  personId: string;
  version: number;
  at: string;
  by: string;
  fingerprint: string;
  lines: SheetLine[];
  reservations: Reservation[];
}
export interface Audit {
  at: string;
  by: string;
  message: string;
  details?: string[];
}
export interface State {
  version: number;
  revision: number;
  week: string;
  methods: Method[];
  standards: Standard[];
  people: Person[];
  equipment: Equipment[];
  work: Work[];
  assignments: Assignment[];
  progress: Progress[];
  rejections?: Rejection[];
  repeats: Repeat[];
  reservations: Reservation[];
  sheets: IssuedSheet[];
  audit: Audit[];
}
export interface Segment {
  resourceId: string;
  start: number;
  end: number;
  label: string;
  assignmentId: string;
}
export interface Check {
  level: 'block' | 'warning';
  text: string;
}
export const day = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
export function addDays(value: string, n: number) {
  const d = new Date(value + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return day(d);
}
export function monday(value: string) {
  const d = new Date(value + 'T12:00:00');
  return addDays(value, -((d.getDay() + 6) % 7));
}
export function stamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).getTime();
}
export function timeAt(ms: number) {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
export function localStamp(ms: number) {
  const d = new Date(ms);
  return day(d) + 'T' + timeAt(ms) + ':00';
}
export const uid = () => crypto.randomUUID();
