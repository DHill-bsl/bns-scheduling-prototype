import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  DayPilot,
  DayPilotModule,
  DayPilotSchedulerComponent,
} from '@daypilot/daypilot-lite-angular';
import { Store } from './store';
import { EditorData } from './editor';
import { localStamp, stamp, timeAt, day } from './models';
import { assignmentChecks, assignmentMethod, segments, sum } from './planning';
@Component({
  selector: 'app-planner',
  imports: [DayPilotModule],
  styles: ':host { display: block; width: 100%; container-type: inline-size; }',
  template: `<daypilot-scheduler [config]="config()" [events]="events()" [resources]="resources()">
    <ng-template daypilotTemplate="rowHeader" daypilotTemplateFor="scheduler" let-row="row">
      <div class="planner-resource">
        <span class="resource-initials" [class.instrument-initials]="mode() === 'equipment'">{{
          initials(row.name)
        }}</span><span
          ><strong>{{ row.name }}</strong
          ><small>{{ resourceRole(row.id) }}</small></span
        >
      </div>
    </ng-template>
  </daypilot-scheduler>`,
})
export class Planner implements AfterViewInit, OnDestroy {
  private host = inject(ElementRef);
  private width = signal(1015);
  private observer?: ResizeObserver;
  @ViewChild(DayPilotSchedulerComponent) scheduler?: DayPilotSchedulerComponent;
  ngAfterViewInit() {
    this.observer = new ResizeObserver((entries) => this.width.set(entries[0].contentRect.width));
    this.observer.observe(this.host.nativeElement);
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
  readonly store = inject(Store);
  date = input.required<string>();
  resourceFilter = input('');
  mode = input<'people' | 'equipment'>('people');
  zoom = input<'week' | 'day'>('week');
  edit = output<EditorData>();
  resources = computed(() =>
    (this.mode() === 'people' ? this.store.state().people : this.store.state().equipment)
      .filter((r) => !this.resourceFilter() || r.id === this.resourceFilter())
      .map((r) => ({ id: r.id, name: r.name })),
  );
  initials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('');
  }
  resourceRole(id: string | number) {
    return (
      this.store.state().people.find((p) => p.id === id)?.role ??
      this.store.state().equipment.find((e) => e.id === id)?.type ??
      ''
    );
  }
  rowWidth = computed(() => (this.width() < 650 ? 128 : 180));
  config = computed<DayPilot.SchedulerConfig>(() => ({
    startDate: this.date(),
    days: this.zoom() === 'week' ? 5 : 1,
    scale: this.zoom() === 'week' ? 'Day' : 'Hour',
    cellWidth:
      this.zoom() === 'week'
        ? Math.max(128, Math.floor((this.width() - this.rowWidth() - 2) / 5))
        : 110,
    timeHeaders:
      this.zoom() === 'week'
        ? [{ groupBy: 'Day', format: 'ddd d MMM' }]
        : [
            { groupBy: 'Day', format: 'dddd d MMMM' },
            { groupBy: 'Hour', format: 'HH:mm' },
          ],
    rowHeaderWidth: this.rowWidth(),
    headerHeight: 46,
    eventHeight: this.zoom() === 'week' ? 82 : 42,
    rowMarginTop: 12,
    rowMarginBottom: 12,
    eventPadding: this.zoom() === 'week' ? 9 : 5,
    eventBorderRadius: 6,
    eventTextWrappingEnabled: this.zoom() === 'week',
    useEventBoxes: this.zoom() === 'week' ? 'Always' : 'Never',
    businessBeginsHour: 8,
    businessEndsHour: 17,
    businessWeekends: false,
    cellSweeping: false,
    beforeCellRenderCaching: false,
    heightSpec: 'Auto',
    durationBarVisible: false,
    timeRangeSelectedHandling: 'Enabled',
    eventResizeHandling: 'Disabled',
    eventMoveHandling: this.mode() === 'people' ? 'Update' : 'Disabled',
    onAfterUpdate: () => {
      if (this.zoom() === 'day') this.scheduler?.control.scrollTo(this.date() + 'T08:00:00');
    },
    cornerText: this.mode() === 'people' ? 'Analysts · 08:00–17:00' : 'Shared equipment',
    onBeforeTimeHeaderRender: (args) => {
      if (this.zoom() === 'week' && args.header.start.toString('yyyy-MM-dd') === day(new Date())) {
        args.header.cssClass = 'planner-today';
        args.header.text += ' · Today';
      }
    },
    onBeforeCellRender: (args) => {
      const hour = args.cell.start.getHours();
      if (this.zoom() === 'day' && (hour < 8 || hour >= 17))
        args.cell.properties.backColor = '#f0f2f3';
    },
    onEventClick: (args) => {
      const id = String(args.e.data.id).split('|')[0];
      if (id.startsWith('res:')) {
        this.store.notice.set(args.e.data.text + ' — manage this in Reserved time below.');
        return;
      }
      this.edit.emit({ kind: 'assignment', id });
    },
    onTimeRangeSelected: (args) => {
      args.control.clearSelection();
      this.edit.emit({
        kind: this.mode() === 'people' ? 'assignment' : 'reservation',
        date: args.start.toString('yyyy-MM-dd'),
        time: this.zoom() === 'week' ? '08:00' : args.start.toString('HH:mm'),
        personId: String(args.resource),
      });
    },
    onEventMove: (args) => {
      args.preventDefault();
      const id = String(args.e.data.id).split('|')[0];
      const a = this.store.state().assignments.find((a) => a.id === id);
      if (!a) return;
      const delta = args.newStart.getTime() - args.e.start().getTime();
      const start = stamp(a.date, a.time) + delta;
      this.edit.emit({
        kind: 'assignment',
        id,
        date: localStamp(start).slice(0, 10),
        time: timeAt(start),
        personId: String(args.newResource),
      });
    },
  }));
  events = computed<DayPilot.EventData[]>(() => {
    const s = this.store.state(),
      list: DayPilot.EventData[] = [];
    for (const a of s.assignments) {
      const w = s.work.find((w) => w.id === a.workId)!,
        m = assignmentMethod(s, a);
      const warn = assignmentChecks(s, a).length > 0;
      const color = a.repeatId ? '#fff1df' : w.methodId === 'NTM0086' ? '#edf3ff' : '#f2edfc';
      const border = warn ? '#bc852f' : w.methodId === 'NTM0086' ? '#416fdb' : '#9372c6';
      const base = {
        backColor: color,
        borderColor: border,
        fontColor: '#244475',
        cssClass: this.zoom() === 'day' ? 'bns-hourly-event' : '',
      };
      if (this.mode() === 'people' && this.zoom() === 'week')
        list.push({
          ...base,
          id: a.id,
          resource: a.personId,
          start: a.date + 'T' + a.time + ':00',
          end: localStamp(stamp(a.date, a.time) + sum(m.steps.map((st) => st.duration)) * 60000),
          text: `${warn ? '! ' : ''}${a.time} · ${w.project}\n${w.methodId} · ${a.quantity} reps\n${sum(m.steps.map((st) => st.handsOn))}m hands-on${a.repeatId ? ' · Repeat' : ''}`,
        });
      else
        for (const [i, seg] of segments(s, a).entries()) {
          const isPerson = s.people.some((p) => p.id === seg.resourceId);
          if ((this.mode() === 'people') !== isPerson) continue;
          list.push({
            ...base,
            id: a.id + '|' + i,
            resource: seg.resourceId,
            start: localStamp(seg.start),
            end: localStamp(seg.end),
            text:
              this.zoom() === 'day'
                ? `${w.project.replace('TPN-', '')} · ${seg.label}`
                : `${warn ? '! ' : ''}${timeAt(seg.start)}–${timeAt(seg.end)} · ${w.project}\n${seg.label}`,
            toolTip: `${w.project} · ${timeAt(seg.start)}–${timeAt(seg.end)} · ${seg.label} · ${a.quantity} replicates`,
          });
        }
    }
    for (const r of s.reservations)
      list.push({
        id: 'res:' + r.id,
        resource: r.resourceId,
        start: r.date + 'T' + r.time + ':00',
        end: localStamp(stamp(r.date, r.time) + r.minutes * 60000),
        text: `${r.time} · ${r.label}`,
        backColor: '#f0f3f8',
        borderColor: '#9aa9c1',
        fontColor: '#50617c',
      });
    return list;
  });
}
