import { Component, input } from '@angular/core';

const paths: Record<string, string> = {
  book: 'M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1ZM12 5v15',
  calendar:
    'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v4M17 2v4M3 9h18M7 13h2M13 13h4M7 17h2M13 17h4',
  queue: 'M8 5h12M8 12h12M8 19h12M3 5h1M3 12h1M3 19h1',
  alert: 'M12 3 2 21h20L12 3ZM12 9v5M12 17v1',
  flask: 'M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10',
  print: 'M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6ZM17 11h1',
  history: 'M4 8a9 9 0 1 1-1 8M3 3v6h6M12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  reset: 'M4 8a8 8 0 1 1-1 7M3 3v6h6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  people:
    'M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 21v-3a6 6 0 0 1 12 0v3M17 4a4 4 0 0 1 0 8M17 15a5 5 0 0 1 5 5v1',
  equipment: 'M4 3h16v18H4ZM8 7h8v5H8ZM8 16h1M15 16h1',
};

@Component({
  selector: 'app-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="paths[name()] || paths[\'calendar\']" /></svg>',
  styles:
    ':host{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:0 0 auto;vertical-align:middle}svg{display:block;width:100%;height:100%}',
})
export class Icon {
  name = input('calendar');
  readonly paths = paths;
}
