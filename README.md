# Lab scheduling prototype — fictional demo

A frontend-only Angular 22 application for exploring laboratory scheduling. Team leaders plan work and record progress; analysts receive printed sheets.

**All included methods, preparation steps, timings, shelf lives, qualifications, people, equipment, clients and projects are invented. They are not laboratory instructions, validated capacities or real operational records. Use fictional data only.** The retained Broughton logo and favicon are branding, not a claim that the demo represents an approved process.

## Hosted demo

Open **https://dhill-bsl.github.io/bns-scheduling-prototype/**. The site is public and includes only the fictional demo defaults and retained branding. Use fictional data only; plans remain in each visitor's browser, not in shared storage.

`.github/workflows/pages.yml` tests and builds the app, checks it under the repository URL path, and deploys `dist/lab-planner/browser/` through GitHub Pages. Successful pushes to `main` deploy automatically; **Actions → Deploy to GitHub Pages → Run workflow** can redeploy manually. Repository **Settings → Pages → Source** must remain **GitHub Actions**.

The Pages build uses `/bns-scheduling-prototype/` as its base path. Local development still uses `/`. Hash links such as `#tutorials` work on direct entry and refresh without server-side routing rules.

## Run

```bash
git clone https://github.com/DHill-bsl/bns-scheduling-prototype.git
cd bns-scheduling-prototype
npm ci
npm start
```

Open **http://127.0.0.1:4300**. Use Node 22.22.3 or newer in the Node 22 line. The source repository is public. No database, API server or application credentials are needed.

Local reference documents under `schedule_system/` are excluded from Git, are not served to the browser and are not needed to run the app. Do not add operational records, internal documents or real account details to the public repository.

## Starting and resetting

The app starts with **no work or bookings**. It includes two invented methods:

- **DEMO-101 · Coating check:** example piece labelling, conditioning, reading and recording steps.
- **DEMO-202 · Colour screening:** example card preparation, waiting, mixing, scanning and recording steps.

**Blue reference set** has an invented 72-hour shelf life; **Amber reference set** has an invented 240-hour shelf life. Neither is marked prepared. These numbers exist only to demonstrate readiness and expiry warnings. They do not specify storage conditions for a real substance.

Four fictional analysts and eight fictional equipment records are included. Select **Add your first work**, then **Assign work** to choose a person, equipment and time. Adding work alone makes no bookings.

Choose **Reset demo** in the sidebar and confirm to clear the current edition's work, bookings, progress, repeats and issued copies, and restore the fictional definitions and resources. On small screens, use **Activity & guide → Reset saved demo**. Reset leaves the schedule empty.

### Earlier saved data

This fictional edition uses **`lab-planner-fictional-v1`** in browser local storage. Earlier editions' saved plans are left untouched and are **not loaded or migrated**, including their methods, standard notes, assignment snapshots and issued sheets. This prevents earlier definitions from appearing when opening the fictional demo.

New work survives refresh and future visits to the same browser address. Reset affects only this edition. There is no in-app import or restore. `localhost`, `127.0.0.1` and a hosted site have separate storage origins; work entered locally is not uploaded by publishing the app.

## Try the workflow

**Tutorials** is the first menu item: **http://127.0.0.1:4300/#tutorials**. Its 13 short guides include generic spreadsheet comparisons, field help and separate notes for what the app does and what the leader must do.

Use **Open tutorials in a new tab** to read alongside the working tab. Edit in one tab only. A reading tab remains usable after another tab saves, but must be reloaded before editing. Reading guides does not change the plan.

1. **Work queue → Add work:** enter a made-up project reference, client, sample details, method, quantity, readiness and deadlines.
2. **Team planner:** assign all or part of the quantity. Choose a person, equipment, start time and sample/replicate subset. Review warnings before saving. Use **Edit / move**, **Split**, or drag a person-view card to propose a change; nothing moves until saved.
3. Switch between **People** and **Equipment**. **Week overview** shows assignment cards; **Day · hourly** shows actual booking intervals. People are booked for hands-on time; equipment is booked for full step durations.
4. **Work sheets:** select a day and analysts, review warnings, issue fixed copies and print. Later planning changes can require replacement sheets. Earlier copies stay available and are labelled outdated.
5. **Assignments / progress:** enter new valid output and failures, not cumulative totals. Failures require affected sample IDs and a reason. **Problems & repeats** lets you assign failed work again without increasing client demand. **Reject recorded output** records a later failure without erasing the original attempt.
6. Once all output is recorded, mark work checked, approved and reported separately. These are simulated records, not electronic signatures.

**Methods & standards** lets you edit the invented recipes, prerequisites and readiness dates. **Plan preparation time** books the selected reference's analyst and equipment steps together; it does not mark preparation complete. **Reserve time** records leave, training or maintenance. **Activity & guide** shows recorded changes under the selected fictional leader name.

### One fictional walkthrough

Create project `JOB-DEMO` for `Fictional client`, with sample details `Blue demo panels / batch A / M01–M04 / replicates 1–3`. Choose **Coating check**, **12** replicates and **Blue reference set**.

Book Theo Brooks to prepare the reference on Monday at **08:00**, using **Balance B**. Its invented recipe takes 30 minutes. Separately simulate completion by recording **08:30** in **Last preparation completed**. Assign Theo the 12 replicates at **09:00**, using **Balance B**, **Conditioning unit A** and **Optical reader A**, then issue his sheet.

Try recording eight successes and two failures, splitting the two unattempted replicates to another day, and assigning the failures as a repeat. Replace affected paper after a planning change. Every number and task in this walkthrough is made up.

## Important limitations

- Recipes demonstrate scheduling only. Durations do not scale with quantity and do not establish throughput, storage, safety or testing rules.
- Hands-on time occupies the beginning of each step in this simplified model. Each step follows the previous step without independently scheduled interventions.
- Each work item selects one standard, and each standard has one current readiness timestamp. There is no batch inventory, stock consumption or automatic dependency completion.
- Performed assignments retain their recorded method and standard context. New split assignments use current definitions. Issued copies remain fixed snapshots.
- Sample IDs are free text, not a validated register. The user must check that assigned subsets are complete and do not overlap.
- Readiness, qualification, deadline and overlap problems raise warnings that require acknowledgement. Invalid quantities, missing required fields and incompatible equipment block saving.
- Performed attempts cannot be moved to a different person, date or equipment. Split the unfinished quantity instead.
- Successful attempts count as valid output separately from checking, approval and reporting. Later rejection reduces valid output without erasing the original attempt. This is not a general correction or regulated quality workflow.
- Fresh and reusable repeat routes currently book the full method. Progress does not automatically shorten existing bookings or rewrite issued paper.
- Example working hours are Monday–Friday, 08:00–17:00. Week view shows five days; use the date picker and day view for weekends. These hours are a demo setting, not a statement about a real organisation.
- The leader selector is not authentication. Browser revision checks help with ordinary stale tabs, but are not atomic multi-user concurrency control, backup or a regulated audit trail.
- No analyst accounts, live integrations, stock, prices, billing or automatic scheduling are included.

## Checks

```bash
npm run build
npm test -- --watch=false
npx playwright install chromium  # first time only
npm run test:e2e
npm run build:pages
npm run test:pages
# Check the deployed site in an isolated browser session:
npm run test:pages -- https://dhill-bsl.github.io/bns-scheduling-prototype/
```

The Pages smoke check serves the production output locally under its actual subpath, or checks the supplied hosted URL. It verifies assets, fictional definitions, direct hash entry/refresh, work creation, assignment, printing previews and browser persistence. It uses a fresh browser context and does not reset anyone else's plan.

Unit tests cover fictional defaults, isolation from earlier browser editions, quantities, linked failures, rejection, splits, analyst/equipment time, preparation groups, historical snapshots, warnings, sheet versions and storage errors. The busy regression fixture in `testing/sample-plan.ts` reuses the fictional definitions and is not shipped in the running app.

Browser tests cover creating work, assignments, preparation, progress, repeats, revised sheets, tutorial links, two-tab protection, keyboard use, responsive layouts, automated accessibility checks and A4 PDF output. Generated output belongs in the ignored `playwright-report/` and `test-results/` directories.

Automated checks do not prove full accessibility or laboratory correctness. Physical printers, other browser engines and unassisted user comprehension still require independent testing. Do not use this prototype to control real laboratory work.

## Components and branding

The planner uses **DayPilot Lite Angular**, with native forms as an alternative to dragging. **Angular Material** supplies consistent controls and dialogs; printed sheets use separate HTML/CSS. Useful reference guidance includes [DayPilot](https://doc.daypilot.org/scheduler/angular/), [Angular Material](https://material.angular.dev/), [IBM Carbon tables](https://carbondesignsystem.com/components/data-table/usage/) and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

The Broughton logo and favicon in `public/brand/` are retained unchanged. They remain their owner's brand assets and are not covered by the fictional-data statement. Montserrat is served locally from `public/fonts/`, with its SIL Open Font License included. There are no runtime third-party font or branding requests.

## Code layout

- `src/app/seed.ts`: fictional empty-plan definitions and resources.
- `testing/sample-plan.ts`: fictional busy plan for regression tests only.
- `src/app/store.ts`: browser data service and isolated persistence.
- `src/app/planning.ts`: quantities, timing, context, conflicts and issued-copy checks.
- `src/app/preparation.ts`: grouped reference-preparation bookings.
- `src/app/planner.ts`: resource scheduler adapter.
- `src/app/editor.*`: work, assignment, progress, recipe and reservation panels.
- `src/app/sheets.*`: working/issued previews and printable copies.
- `src/app/history.ts`: readable change summaries.
- `src/app/tutorials.*` and `src/app/tutorial-help.ts`: generic task guides and field help.
- `src/app/app.*`: workspace navigation and screens.
- `src/styles.scss`: shared controls, layout, typography and print styles.
