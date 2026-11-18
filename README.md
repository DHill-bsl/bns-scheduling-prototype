# Broughton lab-planning prototype

A runnable, frontend-only Angular 22 application for laboratory scheduling discovery. Team leaders plan and record work; analysts receive printed sheets. **Use fictional data only. This is not a validated laboratory system.**

## Run

```bash
git clone https://github.com/DHill-bsl/bns-scheduling-prototype.git
cd bns-scheduling-prototype
npm ci
npm start
```

The repository is private; cloning requires an authorised GitHub account.

Open **http://127.0.0.1:4300**. Node 22.22.3 or newer in the Node 22 line is supported; this build was tested with Node 22.23.1. Angular core is 22.2.6, with CLI and Material 22.2.7, the latest stable versions available when built on 17 November 2026.

No database, API server or application credentials are needed. The original `schedule_system/` PDFs and workbooks are local-only reference material, excluded from Git and not required to run the app. They are not served to the browser.

### Starting and resetting

The app starts with **no work or bookings**. Example NTM0086 and NTM0025a methods, two standard definitions, four analysts and eight instruments are included. Standards have no recorded preparation date. Select **Add your first work**, then **Assign work** to choose the analyst, equipment and time. Adding work alone creates no bookings.

Choose **Reset demo** in the sidebar and confirm to clear all work, bookings, progress, repeats and issued copies and restore the default definitions/resources. On small screens, use **Activity & guide → Reset saved demo**. The schedule is empty after resetting; example jobs are not restored.

This empty-start edition uses `bns-planner-v2` in local storage. Earlier data under `bns-planner-v1` is left untouched but is not loaded; there is no in-app restore or import. Work created in this edition survives refresh and future visits. `localhost` and `127.0.0.1` have separate browser storage.

## Try the workflow

**Tutorials** is the first menu item: **http://127.0.0.1:4300/#tutorials**. Each of its 13 guides has four or five short steps, a brief Excel comparison, expandable field help, and separate notes for what the app does and what the leader must do. The equipment example explains that saving a method does not book anything; saving a dated assignment books its named equipment for full step times and its analyst for hands-on times.

Use **Open tutorials in a new tab** to read alongside the working tab. Edit in one tab only. A stale-plan notice does not prevent reading tutorials, but the tab must be reloaded before editing there; the existing save protection is unchanged. Reading guides does not change the saved plan. The default landing page remains Team planner.

1. **Work queue → Add work:** enter a project, client, batch/timepoint/sample details, method, quantity, readiness and deadlines.
2. **Team planner:** assign some or all of that quantity. Choose a person, start time and equipment, and specify the assigned sample/replicate subset. Splits require separate moved and retained subsets. The details panel explains warnings before saving. Use **Edit / move**, **Split**, or drag a person-view card to propose a change; nothing moves until saved.
3. Switch between **People** and **Equipment**. **Week overview** shows assignment cards; **Day · hourly** shows actual hands-on intervals and instrument bookings. Use the resource filter, date picker, Today and previous/next controls.
4. **Work sheets:** choose a day and analysts, review warnings, issue fixed copies, then print. Change an instruction or move an assignment afterwards: affected sheets need replacing. Earlier copies remain available and are labelled outdated. Removing all work from an issued day supports a cancellation copy.
5. **Work queue → Assignments / progress:** reach assignments across all dates. Enter this update's valid output and failed attempts, not cumulative totals. Failed attempts require sample/replicate IDs and a reason. They appear under **Problems & repeats** and can be assigned again without increasing client demand. **Reject recorded output** handles a later failure: it retains the earlier update, reduces valid output, creates a linked repeat and reopens the work.
6. In **Work queue**, fully performed work can separately be marked checked, approved and reported. Filters find old unfinished work, work awaiting checking/reporting and overdue reports. **Problems & repeats** also lists earlier assignments with unattempted work; nothing moves automatically. These are manual discovery records, not electronic sign-offs.

**Methods & standards** includes editable recipes, prerequisites, hands-on/elapsed time, equipment types, standard shelf life, levels and an actual preparation-readiness timestamp. **Plan preparation time** books the chosen standard's analyst and equipment steps together, with overlap warnings and grouped removal. Booking does not mark a standard prepared. **Reserve time** records other commitments such as leave, training, cleaning and maintenance. **Activity & guide** records who changed the demo, when, and key before/after details.

The ready-to-send email and click-by-click demonstration guide are in `/home/dhill/Documents/Obsidian Vault/bns/handover.md`. Keep that guide's labels, examples and limitations aligned when changing the app. Use a fresh browser context for the guide; do not reset a saved plan someone needs. Plans saved in this edition retain their definitions until deliberately edited or reset. The previous edition’s saved plan is kept separately, as described above.

## Important assumptions

- Method steps and equipment types are grounded in the supplied NTM0086 v8 and NTM0025a v12 PDFs. Timings are planning estimates except where explicitly attributed. They do **not** scale with assigned quantities or constitute approved throughput limits.
- Hands-on time occupies the beginning of each step in this simplified model. Timed collections and interventions need proper laboratory validation; these recipes cannot replace the controlled method.
- NTM0086 §9.6's seven-day nicotine-standard shelf life is conditional on its storage requirements. NTM0025a v12 §9.4.1 gives nine weeks for calibration standards made from pre-derivatised stock under specified refrigerated/sealed storage; this is separate from the same-day blank/QC/control preparation in §9.5.1. Confirm the current controlled methods. Standard levels, staff qualifications and one-booking-at-a-time equipment assumptions remain unverified. NTM0025a is an e-liquid/aerosol example, not the pouch workbook's NTM0083 carbonyl method.
- Standards have one current readiness timestamp each, not stock or batch inventories, and each work item selects only one standard. Recipe-derived preparation bookings are named and linked to that standard, but completion is recorded separately; there is no automatic dependency completion or rescheduling. Stock quantities and consumption are not tracked.
- Assignments retain method and standard context when progress is recorded, and before definitions or selected standards change for performed work. New split assignments use current definitions. Earlier history already lost before this change cannot be reconstructed. Issued copies remain fixed snapshots.
- Assignment-specific sample IDs are required for saving assignments and issuing new sheets. These are free-text details, not a validated sample register: the team leader must check coverage and non-overlap. Old saved assignments are not backfilled with invented IDs. New sheets summarise recorded output and unattempted quantities; earlier issued copies are unchanged. Ordinary progress does not trigger replacement of a sheet; its saved summary is explicitly as-at-issue.
- Sample, qualification, equipment, leave and deadline restrictions are **warnings** because their blocking policies are not agreed. Saving requires acknowledgement. Invalid quantities, over-allocation, missing mandatory fields and incompatible equipment selections block saving. Performed attempts cannot be moved to a different person/date/equipment; split the unfinished quantity instead.
- The demo counts a successful performed replicate as valid output, separately from checking/approval/reporting. Later rejection reduces that total but does not erase the original attempt. It is not a general correction system or formal quality workflow; rejection of reported output requires checking reports outside the app. Original allocations and repeat allocations have separate quantity limits. Repeat-of-repeat links retain earlier attempts. Reusable preparation is recorded as a repeat flag, but both repeat routes still reserve the full method.
- Working hours are Monday–Friday, 08:00–17:00. Week view is a five-day overview; use the date picker and day view for weekends. There is no two-task-per-day limit.
- Team-leader names are a simulated actor selector, not authentication. Local storage revision checks and cross-tab notifications help prevent ordinary stale-tab overwrites but are **not** atomic multi-user concurrency control or a regulated audit trail.
- No analyst accounts, live LabHQ/Outlook/Veeva integrations, stock, prices, billing, automatic scheduling or full sequence-review system are included.

## Checks

```bash
npm run build
npm test -- --watch=false
npx playwright install chromium  # first time only
npm run test:e2e
```

Tutorial checks cover short steps, field help, the equipment-timing example, menu order, keyboard expansion, direct entry and refresh, all destination links, and creating a method, standard, work item and assignment. Two-tab checks verify that the guide stays readable after a save in the working tab while stale-tab editing stays protected.

The empty-start checks cover default resources, unprepared standards, first-work creation and assignment, setup editors without existing work, desktop/mobile empty states, refresh, reset confirmation and preservation of the previous edition’s saved data. Populated regression scenarios explicitly load `testing/sample-plan.ts`; this historical fixture is not shipped in the app.

Unit tests cover quantities, linked failures and later rejection, explicit split scope, instrument versus analyst time, preparation groups, historical method/standard context, legacy records, warnings, attempt preservation, sheet revisions/cancellation, storage failure and stale revisions. Browser tests exercise the complete workflow, invalid input, readiness, recipe edits, filters, drag proposals, keyboard focus and discarded edits. They also check all main screens and editor panels with axe's WCAG A/AA rules, screenshots at 1600/1366/1024/768/390 pixels, and A4 PDF output. Layout regressions cover equal-height, centred action groups, unclipped button labels, local brand assets, mobile work cards, editor errors and preparation-step controls.

The application was also walked through using Playwright MCP, with screenshots inspected and browser errors checked. Generated browser reports, traces, screenshots and PDFs go into `playwright-report/` and `test-results/`. Automated accessibility checks do not prove full WCAG compliance. Physical printers, other browser engines, assistive-technology users and real team-leader/analyst feedback remain unverified.

## Research and component choice

Sources reviewed on **17 November 2026**, before implementation:

- [FullCalendar resource timeline](https://fullcalendar.io/docs/timeline-view) and [Angular integration](https://fullcalendar.io/docs/angular), v7.1.5 released 12 November 2026: reuse resource rows, dated columns, separate event details and familiar date navigation. Angular 22 support is explicit. Its resource timeline is [commercially licensed](https://fullcalendar.io/license), so it was not selected.
- [DayPilot Angular Scheduler guide](https://doc.daypilot.org/scheduler/angular/) and [keyboard/accessibility guide](https://doc.daypilot.org/scheduler/keyboard/): reuse people/equipment rows, selection, drag proposals and availability reservations. **DayPilot Lite Angular 6.2.0**, Apache-2.0, supports Angular >=16 and was built/tested here with Angular 22. Its Lite scheduler does not provide the Pro keyboard/export feature set. Equivalent native forms and the assignment list provide keyboard access; analyst sheets use separate HTML/CSS printing, not Pro export. No scheduler licence key is needed.
- [IBM Carbon data-table guidance](https://carbondesignsystem.com/components/data-table/usage/), updated **30 September 2026**: clear table toolbars, restrained density, sentence-case labels, contextual row actions and detail panels rather than putting every field in a grid.
- [Angular Material documentation](https://material.angular.dev/) and the installed Material 22 controls: consistent buttons and accessible, focus-trapped dialogs, with labelled native fields.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), Recommendation **12 December 2024**, current accessibility baseline: visible focus, contrast, non-colour warning labels and alternatives to dragging. Reduced-motion preferences are respected.

The scope authority is `Build a usable Angular scheduling prototype.md` in the BNS Obsidian folder, together with both lab-scheduling notes. The meeting transcript supplies the problem context; later scope boundaries take precedence over its broader automation and integration suggestions. Both workbooks and relevant method sections were inspected; this was not a full spreadsheet audit or a controlled-method verification.

## Broughton styling

The [Broughton website](https://www.broughton-group.com/) was inspected for this design on 17 November 2026. The theme uses its navy `#000033`, royal blue `#0033cc`, Montserrat typography and [actual logo](https://www.broughton-group.com/hubfs/broughton_logo.svg). The navigation uses a white rendering of the logo; printed sheets retain its original colours and proportions. Logo and favicon files are served locally from `public/brand/` and remain Broughton's brand assets.

Montserrat is served locally from `public/fonts/`, with its SIL Open Font License included. There are no runtime font or branding requests to third parties. Angular Material buttons use a shared 42 px control height, compact row actions remain aligned, and narrow screens show work and assignment cards rather than hiding their actions off-screen. The scheduler, editors, work-sheet component and tutorials load on demand; the initial production bundle remains within the 500 kB warning budget.

## Code layout

- `src/app/store.ts`: shared browser data service and persistence.
- `src/app/planning.ts`: quantity, timing, historical context, conflict and issued-copy checks.
- `src/app/preparation.ts`: standard-recipe bookings and preparation conflict checks.
- `src/app/seed.ts`: empty work/schedule defaults and source-labelled example recipes/resources.
- `testing/sample-plan.ts`: populated historical plan used only by regression tests.
- `src/app/planner.ts`: maintained DayPilot resource scheduler adapter.
- `src/app/editor.*`: reusable work, assignment, progress, recipe and reservation panels.
- `src/app/sheets.*`: working/issued previews and printable copies.
- `src/app/history.ts`: readable change summaries.
- `src/app/tutorials.*`: numbered how-to guides and links to the relevant app screens.
- `src/app/app.*`: workspace navigation and connected screens.
- `src/styles.scss`: shared brand tokens, typography, controls, dialogs and print styles.
- `src/app/icon.ts`: consistent decorative SVG icons with accessible names supplied by their controls.
