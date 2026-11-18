import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { afterEach, vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());
  it('opens the team-leader workspace with separate work and progress views', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Team planner');
    expect(fixture.nativeElement.textContent).toContain('Start with one job');
    expect(fixture.nativeElement.textContent).toContain('Add your first work');
    expect(fixture.nativeElement.textContent).not.toContain('All work has an assignment');
    expect(fixture.nativeElement.querySelector('.stats-grid')).toBeNull();
    fixture.componentInstance.navigate('work');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Work queue');
    expect(fixture.nativeElement.textContent).toContain('No work yet');
    expect(fixture.nativeElement.textContent).not.toContain('No work matches');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('main'));
  });
});
