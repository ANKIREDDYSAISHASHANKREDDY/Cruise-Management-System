# Continuous Testing & Acceptance Plan

## Scope and execution record

Testing is planned continuously within each iteration. The current local MVP has a Node.js HTTP server, SQLite persistence, passenger sign-in/registration, role-checked API routes, and seeded sample data. Payment, email delivery, operator systems, production deployment, and real-vessel integrations are not connected.

| Check | Type | Current evidence |
|---|---|---|
| Cruise filters, cabin rules, feedback routing, demo booking, and concierge rules | Automated unit | `tests/domain.test.js`, run with `node --test`. |
| API authorization, sessions, reservation idempotency/collisions, feedback, crew workflows, and registration validation | HTTP integration | `tests/server.test.js`, run with `node --test` against isolated in-memory SQLite databases. |
| JavaScript syntax | Static check | `node --check server.js`, `auth.js`, `app.js`, and `domain.js`. |
| Browser layout and end-to-end clicks | System / visual | Manual browser checks; not represented as automated browser tests. |
| Payment, email, ship-system, and production identity integrations | Integration | Not connected; future release gates. |
| Passenger/crew acceptance and usability | UAT / usability | Requires representative participants and consent; no sessions have been recorded yet. |

Record each run with date, build/version, test ID, browser/device, outcome, defect ID, and reviewer. A test case marked “not connected” must not be reported as passed.

## Verification results (2026-10-06)

- **Automated:** 13 tests passed (7 domain unit tests and 6 HTTP integration tests); 0 failed. Syntax checks passed for `server.js`, `auth.js`, and `app.js`.
- **API integration coverage:** unauthenticated denial; passenger session and booking; idempotent retry and cabin collision; role enforcement and operations counts; feedback persistence/review; crew task, attendance, and swap approval; passenger-only registration; weak-password and foreign-origin rejection.
- **Browser walkthrough:** on 6 October 2026, the live local app opened at the sign-in screen and the passenger, crew, and manager demo accounts each reached their role-specific workspace. Passenger overview loaded six sailings; crew shifts/tasks and manager inventory/maintenance loaded from the server. Role-specific navigation was visible. No browser reservation or operations records were changed during this walkthrough.
- **Not tested / not connected:** payment provider, email delivery, real vessel inventory, security penetration, production accessibility audit, load/offline behavior, and stakeholder acceptance. The local role and session checks are covered by integration tests, not an independent security review.

## Testing levels

### Unit tests

Test one decision at a time: cruise query/destination/duration filters, cabin-map availability, feedback-to-backlog routing, demo booking record validation, and concierge topic/abstention behavior. The decision helpers live in `domain.js`; tests are in `tests/domain.test.js`.

### Further integration tests (future services)

- Booking API + transactional cabin inventory: concurrent requests must not allocate one cabin twice; expired holds release; idempotent retries return the same booking.
- Booking + payment adapter: authorized, declined, timeout, duplicate webhook, refund, and reconciliation outcomes leave booking/payment states consistent.
- Booking + identity/profile + document storage: access is limited to a verified traveler; expiry/deletion policy applies.
- Crew schedule + qualification/rest rules + notification: approval cannot violate policy and notifications target only affected crew.
- Feedback API + backlog service: preserve consented/redacted source reference and change traceability.
- Assistant + authorized retrieval: every tool request is role/ship scoped before data access; denial and stale-source cases abstain.

### System and regression checks

Walk the full browser route at desktop and narrow mobile sizes. Re-run after changes to navigation, state models, filter logic, booking flow, feedback, role views, and responsive CSS. Confirm there is no console error, dead control, clipped critical text, keyboard trap, or confusing sample-data state.

### User acceptance and usability

Recruit representative passenger and crew participants; explain that this is a mock and not a live booking service. Ask participants to complete the tasks without leading them, record completion, errors, time/hesitation where appropriate, and their language for improvements. Ask permission before recording. Do not collect payment information, real passport details, or other unnecessary sensitive data. For managers and safety-critical tasks, have the authorized operator define the decision boundary and approval workflow.

## Acceptance test cases

| ID | Story / role | Steps | Expected result |
|---|---|---|---|
| AT-01 | US-001 · Passenger | Open Find a cruise; search for “Nassau”; change destination; change duration. | Matching cards update; filters combine; no-result message is clear; all fare/route data remains labelled sample. |
| AT-02 | US-002 · Passenger | Open a cruise detail. | Route, ship, dates, duration, fare, description, and cabin next step are visible. |
| AT-03 | US-003 · Passenger | Open cabin map; try a disabled cabin; select an available cabin; change choice. | Availability comes from the API; unavailable cabin cannot be chosen; selected number/category and sample price update. |
| AT-04 | US-004 · Passenger | Continue with no cabin, then choose cabin and continue. | Continue is disabled until a cabin is selected; API saves an idempotent demo reservation; voyage view reflects cabin; no live booking claim appears. |
| AT-05 | US-005/006 · Passenger | Open booking summary and check-in checklist. | Summary is readable and explicitly non-valid for travel; check-in progress updates through the API; no payment or QR validation is implied. |
| AT-06 | US-007/008 · Passenger | Save an excursion/dining request and reopen the voyage. | Request persists on the account; UI states no live inventory has been reserved. |
| AT-07 | US-014/015 · Any stakeholder | Submit a suggestion, then sign in as a manager to review it. | Required title/message validation works; feedback is persisted; manager can change review status; a triage item is visible in the backlog view. |
| AT-08 | US-009 · Crew | Mark a crew task done and reopen the crew workspace. | Task state persists through the API; UI identifies the schedule as sample data, not an operator schedule update. |
| AT-09 | US-011 · Crew / Manager | Request a shift swap as crew; sign in as manager and approve or decline it. | Request and decision persist; the published shift is not silently changed; no qualification/rest validation or notification is implied. |
| AT-10 | US-013 · Manager | Review occupancy, inventory, staffing, and maintenance. | Manager-only API supplies the view; seeded values are clearly described as demonstration data. |
| AT-11 | Assistant · Passenger | Ask about Nassau, then an unrelated live-status question. | Answer uses relevant sample itinerary fact; unrelated/live question is answered with a limitation rather than an invented fact. |
| AT-12 | Accessibility | Navigate each primary view with keyboard; inspect focus, labels, zoom, and color-independent state. | Controls can be reached and understood; focus is visible; status does not rely on color alone; issues are filed and fixed before acceptance. |
| AT-13 | Security · Future | Try cross-passenger, cross-ship, and role-forbidden API/assistant requests. | Server rejects the request before returning data; denial is logged without leaking sensitive fields. |
| AT-14 | Resilience · Future | Simulate provider timeout, ship connectivity loss, stale itinerary, and duplicate request. | User sees honest state; idempotent operations do not duplicate; cache freshness and reconciliation follow defined rules. |

## Definition of Done checklist

- [ ] Acceptance criteria and examples are agreed with product owner/stakeholder.
- [ ] Implementation reviewed and merged according to team workflow.
- [ ] Relevant unit and regression checks pass.
- [ ] Relevant service integration checks pass, or dependency is explicitly unimplemented and not claimed as passed.
- [ ] UI tested at target viewport sizes; accessible labels, keyboard focus, contrast, and error feedback reviewed.
- [ ] Authorization, input validation, privacy, and audit requirements reviewed for changed paths.
- [ ] No unresolved critical defect; lower-severity issues have owner and disposition.
- [ ] Feedback/request source, backlog decision, sprint, and review outcome are traceable.
- [ ] Documentation and risk register reflect the current behavior.
- [ ] Stakeholder review/acceptance is recorded, or clearly identified as pending.

## Defect and feedback loop

Record defect ID, affected story/build, role, expected vs actual behavior, reproduction steps, severity, evidence with personal information removed, owner, fix, regression coverage, and verification result. Feed usability or operational findings to product triage. Reassess priority and acceptance criteria before the next sprint; close the loop with the stakeholder when an appropriate channel exists.
