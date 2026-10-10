# Product Backlog & Iteration Record

## Reading this document

This is a **living planning artifact**. Sprint goals and stories below are proposed; implementation status is summarized near the end. The local MVP now has a Node/SQLite backend and role-based sign-in, but it has not been reviewed by representative passengers or crew. Seeded backlog entries and CR-001–003 are examples to teach the process. Replace those examples with dated, consented stakeholder evidence as work proceeds.

Priorities use High / Medium / Low as relative product priorities, not guarantees. Effort is a rough planning estimate in story points; re-estimate after refinement. Sprint dates are deliberately omitted because the academic team's calendar and availability are not specified.

## Product vision

Help guests plan a cruise with confidence and help ship teams coordinate a safe, thoughtful voyage through a modular service that improves as stakeholders use it.

## Backlog policy

The product owner may reorder, split, add, or remove stories after review. Each entry should record role, desired outcome, value, priority, estimate, acceptance criteria, evidence/source, dependencies, and sprint. A request is not automatically a commitment. Triage it for user value, duplicate work, accessibility, privacy, safety, technical impact, and effort. Keep a visible “needs discovery” status when the team does not yet have enough evidence.

## Prioritized product backlog

| ID | User story | Priority | Estimate | Sprint | Acceptance criteria / current status |
|---|---|---:|---:|---:|---|
| US-001 | As a passenger, I want to discover upcoming cruises so I can find a trip that fits my plans. | High | 5 | 2 | Search by text; filter destination; show route, ship, dates, nights, and sample fare; empty result is understandable. Prototype: implemented with fictional data. |
| US-002 | As a passenger, I want to compare cruise details so I can make an informed choice. | High | 3 | 2 | Detail view shows route, ship, duration, date, fare caveat, and next action. Prototype: implemented. |
| US-003 | As a passenger, I want to select a cabin and see its location and type so I can choose where I stay. | High | 8 | 3 | Only available cabins can be selected; category and deck are shown; chosen cabin and price appear before confirmation; unavailable cabin cannot be chosen. Current map is illustrative; category filtering/comparison needs research. |
| US-004 | As a passenger, I want to book a cabin and receive a confirmation so I know the reservation was recorded. | High | 8 | 3–4 | Validate guest/trip/cabin; protect against duplicate submission; confirm reference and selected cabin; inventory reservation is atomic and idempotent. Implemented as a local demo reservation; payment and operator booking are not connected. |
| US-005 | As a passenger, I want to pay securely and review an invoice so I can complete my booking. | High | 13 | 4 | Payment adapter uses provider token, no raw card storage; amount/currency and outcome are clear; invoice reconciles with booking; retry is idempotent. Planned; no payment is implemented. |
| US-006 | As a passenger, I want a validated digital boarding pass and check-in checklist so I can prepare to embark. | High | 8 | 4 | Identity and booking are verified server-side; pass contains valid signed/rotating credential; offline behavior and revocation are defined; checklist state is auditable. Check-in progress is persisted; travel credential remains a visual demo only. |
| US-007 | As a passenger, I want to see my itinerary and saved onboard plans so I can organize each day. | Medium | 5 | 5 | Day, port, local time/time zone, reservation, and change status are clear; no conflicting saved event is silently accepted. Prototype sample itinerary. |
| US-008 | As a passenger, I want to browse and reserve dining, activities, and excursions so I can plan onboard. | Medium | 8 | 5 | Show availability/constraints; confirm or explain when full; apply cancellation and accessibility rules; prevent time conflicts. Requests persist locally; capacity and conflict rules are not connected to a live service. |
| US-009 | As a crew member, I want to see my assigned shifts and tasks so I can prepare for duty. | High | 8 | 6 | Only self/authorized team schedule is shown; task owner and due time are clear; completion is auditable; schedule version is visible. Role-scoped demo tasks, shifts, and attendance persist in SQLite; no operator schedule is connected. |
| US-010 | As a manager, I want to assign crew shifts based on availability and qualifications so the ship is covered. | High | 13 | 6 | Enforce rest-time and qualification rules; flag understaffing; manager can review and override with reason; publish and notify affected staff. Planned. |
| US-011 | As a crew member, I want to request a qualified shift swap so I can resolve a conflict with manager approval. | Medium | 8 | 7 | Verify both crew qualifications and rest rules; capture reason/response; schedule changes only after approval; notify affected crew. Request and manager decision persist; qualification/rest validation and notifications remain future work. |
| US-012 | As a crew member, I want secure announcements and handover messaging so operational changes reach the right people. | Medium | 8 | 7 | Role/ship audience is enforced; receipt and timestamp are visible; urgent notices have acknowledgement/escalation; audit is retained. Planned. |
| US-013 | As a ship manager, I want to see occupancy, inventory, maintenance, and staffing exceptions so I can act early. | Medium | 8 | 9 | Metrics show source and freshness; exceptions are filterable; no personal data is exposed beyond role permission; export is auditable. Local manager view reads seeded SQLite data; no vessel system or audit service is connected. |
| US-014 | As a passenger or crew member, I want to submit feedback so improvements reflect the people using the service. | High | 3 | 1+ | Capture role, feedback type, title, and description; validate required fields; confirm receipt; safely route to triage; permit status updates. Feedback is persisted and manager review status is saved. |
| US-015 | As a product owner, I want feedback to create a traceable backlog item so learning changes future work. | High | 5 | 1+ | Link source to triage decision, story, sprint, acceptance criteria, and review outcome; backlog priority can change. Manager backlog displays persisted feedback as items needing triage; full story/sprint traceability remains future work. |
| US-016 | As a passenger, I want voyage recommendations that reflect preferences so options feel relevant. | Medium | 8 | 10 | Explain preference signals, provide controls to edit/clear, avoid sensitive inference, and measure usefulness. Planned; current suggestion copy is static. |
| US-017 | As a passenger, I want schedule-aware activity suggestions so I do not book overlapping plans. | Medium | 8 | 5 / 10 | Compare confirmed reservation time windows and availability; identify conflict; offer a valid alternative; guest confirms any change. Illustrative CR-002. |
| US-018 | As an authorized manager, I want answers over operational data so I can find exceptions quickly. | Low | 13 | 10 | Enforce role and ship scope before retrieval; cite source and freshness; abstain when unknown; log access; human validates consequential action. Planned; no management AI is implemented. |

## Sprint structure and proposed plans

| Sprint | Goal | Candidate stories / deliverable | Success criteria and principal risk |
|---|---|---|---|
| 0 — Discovery & architecture | Agree the problem, stakeholders, assumptions, initial structure, and risks. | Stakeholder map; product vision; initial backlog; architecture/data model; cabin/booking/crew prototypes; risk register. | Stakeholders can confirm/revise problem framing; assumptions and high-impact risks have owners. Risk: treating assumed workflows as fact. |
| 1 — Passenger foundation & feedback | Validate the passenger entry point and establish feedback-to-backlog traceability. | US-014, US-015; role/profile concept; registration/login/password reset architecture; feedback prototype. | Representative users can find feedback path; submitted feedback has a triage state and traceable ID. Risk: a single local database is not a production identity, backup, or recovery plan. |
| 2 — Cruise discovery | Help a guest find and understand a suitable sailing. | US-001, US-002; search, filters, details, ship/destination/route display. | Testers find a chosen cruise without moderator assistance; record search misses and requested filters. Risk: sample fares/itineraries mislead. |
| 3 — Cabin selection & booking | Make cabin selection understandable and create a safe booking flow. | US-003, US-004; deck map, cabin details, booking confirmation. | Testers can choose, compare, and confirm a cabin; no unavailable cabin can be booked. Risk: cabin inventory race conditions. |
| 4 — Payment & digital check-in | Define and demonstrate the secure transaction and embarkation path. | US-005, US-006; provider abstraction, invoice, document/check-in flow, boarding credential. | Sandbox payment outcomes reconcile with booking and retries do not duplicate charges. Risk: sensitive data and third-party downtime. |
| 5 — Passenger onboard experience | Help guests organize time onboard without hidden schedule conflicts. | US-007, US-008, US-017; itinerary, dining, activities, excursions, context-aware notifications. | Guests understand itinerary changes and can avoid conflict; measure reservation completion and confusion. Risk: changing port operations. |
| 6 — Crew management | Give crew and supervisors a trustworthy schedule/task workflow. | US-009, US-010; profiles, departments, attendance, task board, schedule validation. | Crew find next duty and manager identifies coverage gaps; rest and certification rules are defined. Risk: fairness and hard-to-model constraints. |
| 7 — Crew collaboration | Support safe schedule coordination and training context. | US-011, US-012; swap approvals, communication, certifications/training. | Swap cannot bypass manager approval or qualification/rest validation. Risk: urgent changes and privacy. |
| 8 — Ship operations | Connect day-to-day maintenance, inventory, housekeeping, dining, and excursions. | Maintenance, stock thresholds, housekeeping readiness, dining and excursion workflows. | Each exception has an owner, due time, current source, and escalation. Risk: stale/offline vessel data. |
| 9 — Analytics & management | Give managers timely, role-appropriate operating signals. | US-013; revenue/occupancy/crew/inventory analytics and reports. | Measures have definitions, source timestamps, role filters, and user review. Risk: misleading metrics and excess personal data. |
| 10 — AI features | Trial controlled assistance using authorized, fresh source data. | US-016, US-018; passenger concierge and management assistant, evaluation set. | Assistant cites permitted source, abstains on unknowns, and passes role-boundary tests. Risk: data leakage and overconfident answers. |

### Daily stand-up (10–15 minutes)

Each person shares: **what moved toward the sprint goal since the last check; what they will move next; what is blocked; and whether a new risk or stakeholder change needs triage.** Keep discussion focused on coordination, then take problem-solving offline with the people needed. Update the board after the stand-up so stories and blockers stay visible. In a distributed or onboard context, a short written update can replace a meeting.

## Sprint 0 record (planning snapshot)

- **Goal:** create a reviewable first product slice and make major unknowns visible.
- **Initial assumptions:** passengers value simple cruise discovery; cabin location may influence selection; staff need role-specific operations views; stakeholder feedback can change backlog order.
- **Uncertainties:** real booking/payment rules, accessibility needs, cabin categories and inventory, offline requirements, crew contracts/rest constraints, data owners, current-system integration, approval/audit rules.
- **Prototype evidence:** this workspace contains responsive passenger, crew, management, feedback/backlog, and rule-based concierge pages. No user research or acceptance review has yet been performed.
- **Success criteria for the next review:** at least one passenger and one crew representative can complete role-relevant prototype tasks; capture questions and breakdowns with consent; decide which assumptions to keep, change, or investigate.
- **Risks:** sample figures mistaken for live facts; local-only persistence mistaken for an operator service; a demo booking flow concealing inventory/payment complexity. See [risk register](ARCHITECTURE.md#risk-register).

## Sprint review and retrospective record

Use this at the end of each sprint. Preserve completed and incomplete status; never backfill imagined participant quotes.

### Sprint review template

- Sprint and review date:
- Sprint goal:
- Stakeholders present / roles:
- Stories completed, with acceptance evidence:
- Stories incomplete and reason:
- Demonstration or artifact link:
- Feedback captured (role, consent, date, evidence):
- New risks / operational changes:
- Assumptions supported, invalidated, or still unknown:
- Decision: accept / revise / defer; decision owner and rationale:
- Change requests raised; backlog links:

### Retrospective template

- What went well?
- What did not go well?
- What did we learn?
- What should change next iteration?
- What should we stop doing?
- What should we start doing?
- One owned action for next sprint, with a way to tell whether it helped:

### Current implementation record

- **Increment:** Harborline local MVP (workspace delivery; not a stakeholder-reviewed sprint increment).
- **Implemented:** polished sign-in, passenger registration, role-based passenger/crew/manager workspaces, scrypt password hashes, server sessions, SQLite persistence, cruise catalog, idempotent cabin reservations, onboard requests, check-in, feedback triage, crew tasks/attendance/swaps, maintenance queue, management dashboard, CSV export, and rule-based concierge.
- **Incomplete:** payment/invoice, email delivery, validated travel credential, real vessel inventory, operator identity and schedule integration, qualification/rest-rule validation, real notifications/messaging, production audit and deployment controls, AI/model integration, stakeholder acceptance.
- **Feedback:** none from external participants recorded at delivery. Prototype prompts are discovery questions only.
- **Learning and adaptation:** three illustrative change scenarios are included to show how a future team should record requirement change. Replace them with real evidence after reviews.
- **Verification:** 13 automated tests pass (7 domain tests and 6 API integration tests); syntax checks pass for server and client scripts. Integration tests cover authentication, role denial, SQLite-backed workflows, reservation collision/idempotency, feedback review, and crew operations. A live browser walkthrough confirmed sign-in and passenger, crew, and manager workspaces; no external-stakeholder acceptance has been recorded.

## Change request examples

These are explicitly **illustrative**, not claims about research already performed.

| ID | Requested by | Requirement / reason | Business and technical impact | Priority / effort | Decision / sprint |
|---|---|---|---|---|---|
| CR-001 | Passenger scenario · validate | Show deck location and cabin category because a text list may not support an informed cabin choice. | Improves decision clarity; requires verified deck plan and live cabin inventory. | High · 8 points | Accepted as discovery candidate; Sprint 3. |
| CR-002 | Passenger scenario · validate | Flag dining/activity time conflicts after guests report a crowded itinerary. | Reduces missed events; requires authoritative times, time zones, and availability. | Medium · 8 points | Needs user validation; Sprint 5 candidate. |
| CR-003 | Crew member scenario · validate | Add swap request with qualifications and manager approval after a shift conflict. | Helps schedule coordination; requires labor/rest rules, audit trail, notification, and authorization. | Medium · 8 points | Needs crew/manager validation; Sprint 7 candidate. |

## Agile metrics

For each completed sprint, record: planned points, delivered points, completion rate, lead/cycle time, defects by severity, escaped defects, usability task success, backlog size, and satisfaction by stakeholder role. ASE-specific measures: new and changed requirements, feedback-linked stories, removed or reprioritized items, invalidated assumptions, newly identified risks, and adaptations shipped. Sprint velocity is a planning aid for this team, not an individual productivity measure. No historical baseline is available in this prototype.
