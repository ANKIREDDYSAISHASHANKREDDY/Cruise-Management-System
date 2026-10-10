# Harborline: Cruise Management, Booking & Smart Operations System

## Project status and evidence note

This report describes a **local, server-backed MVP** and a **proposed adaptive delivery plan**. It includes passenger registration/sign-in, passenger/crew/manager workspaces, SQLite-backed booking and operations workflows, and an ASE feedback loop. It has not been connected to a cruise company or evaluated by actual passengers or crew. Any feedback scenarios and requirement changes marked *illustrative* are worked examples for demonstrating the Adaptive Software Engineering (ASE) method; they are not research findings. Sprint plans are proposed work unless a sprint review explicitly records completed evidence.

## 1. Project introduction

Harborline explores a digital operating system for cruise companies. It brings guest planning and booking together with a view of crew work and ship operations. The initial product is deliberately a small, changeable prototype. A cruise company's booking rules, safety needs, guest expectations, and ship operations vary; the team should learn these in short iterations rather than treat the first specification as final.

The working principle is:

> **Speculate → Collaborate → Learn → Adapt → Iterate**

## 2. Problem statement

Cruise services often span booking, guest documents, activities, crew schedules, inventory, and maintenance. When these workflows live in disconnected tools, passengers can struggle to understand what happens next and staff may not have a timely operational picture. A fixed specification can also miss stakeholder needs that only become clear after people try the workflow. Harborline prototypes a unified experience and provides a feedback path that turns observations into backlog work.

## 3. Objectives

1. Help passengers discover voyages, compare basic facts, choose a sample cabin, and view a demo booking and boarding pass.
2. Present a voyage itinerary and onboard service entry points in one place.
3. Give crew a simple view of shifts, tasks, announcements, and a swap request concept.
4. Give managers a sample view of occupancy, crew readiness, inventory, guest feedback, and maintenance.
5. Capture stakeholder feedback and connect feature or operational requests to a mutable product backlog.
6. Keep requirement decisions, assumptions, risks, sprint learning, and adaptations traceable.

## 4. Existing and proposed system

**Existing-system assumption to validate:** information may be spread across separate booking, ship, or staff tools. This is a project hypothesis, not the result of a completed organization audit.

**Current local MVP:** a browser client served by a Node.js HTTP server with role-checked APIs and SQLite persistence. Passenger, crew, and manager access is authenticated, while sailings and operational figures are seeded demonstration data. **Proposed production system:** a modular cruise platform connected to verified operator systems, production identity, payment, notification, and operational data services.

## 5. Stakeholders

| Stakeholder | Primary concern | Feedback to seek |
|---|---|---|
| Passenger | Clear choices, accessible booking, trustworthy trip information | Findability, fare clarity, cabin choice, check-in, onboard timing |
| Crew member | Usable shifts, tasks, handovers, and communication | Schedule conflicts, task ownership, connectivity, swap process |
| Captain | Safe and reliable operations | Readiness, incidents, vessel constraints, escalation paths |
| Ship manager | Occupancy and operational exceptions | Useful indicators, permissions, report cadence |
| Restaurant staff | Reservations, covers, stock, service flow | Dietary notes, seating changes, inventory visibility |
| Housekeeping | Cabin readiness and supply | Cabin priorities, workload balance, stock alerts |
| Excursion manager | Capacity and guest timing | Availability, changes, port/weather dependencies |
| Travel agent | Searchable voyage and booking status | Fare rules, passenger handoff, change handling |
| System administrator | Access, auditability, resilience | Roles, data retention, configuration, incident response |

**Collaboration method:** short interviews or contextual walkthroughs, representative usability sessions, feedback forms, sprint reviews, and crew/manager workflow reviews. Obtain informed consent, avoid collecting unnecessary personal data, and record role and date without exposing guest-sensitive details. A change enters the backlog only after triage for user value, evidence, risk, effort, and policy impact.

## 6. Functional requirements

| ID | Requirement | Prototype evidence / status |
|---|---|---|
| FR-01 | Passengers can search cruises and filter by destination. | Implemented with sample data. |
| FR-02 | Passengers can inspect route, ship, duration, date, and sample starting fare. | Implemented; fare and availability are illustrative. |
| FR-03 | Passengers can select an available sample cabin and save a demo booking. | Implemented with authenticated API, SQLite persistence, atomic cabin assignment, and idempotency; demo data only. |
| FR-04 | Passengers can view a sample itinerary and onboard service entry points. | Implemented as representative journey views. |
| FR-05 | Passengers can view a demo boarding pass and check-in checklist. | Check-in progress is persisted; boarding credential is not valid for travel. |
| FR-06 | Passengers can submit suggestions, usability feedback, issues, and feature requests. | Implemented with authenticated API and SQLite persistence. |
| FR-07 | Feature/operational feedback can create a backlog entry. | Manager triage lists persisted feedback; full story/sprint traceability remains planned. |
| FR-08 | Crew can see sample shifts and update task/check-in status. | Implemented in the authenticated crew workspace with SQLite-backed tasks and attendance; schedule data is seeded. |
| FR-09 | Crew can request a sample shift swap for manager review. | Implemented with persisted requests and manager decisions; no qualification/rest-rule validation or notification. |
| FR-10 | Managers can review sample occupancy, inventory, readiness, feedback, and maintenance. | Implemented using seeded SQLite operations data, persisted maintenance, and manager-only API routes. |
| FR-11 | The concierge can answer questions from voyage information. | Implemented with fixed rules and sample facts, not a connected AI. |
| FR-12 | Management assistance uses only data the manager is authorized to access. | API role checks and UI role gating are implemented locally; vessel/department scopes and independent security review remain production work. |

## 7. Non-functional requirements

- **Security and privacy:** production identity, role-based access, least privilege, audited changes, encryption in transit and at rest, secure payment tokenization, retention limits, and privacy review. Never place card data or sensitive health/accessibility information in prototype feedback.
- **Safety:** safety-critical notices and staffing decisions require validated sources and accountable human review; recommendations do not replace the captain's authority or operating procedures.
- **Availability and offline behavior:** onboard connectivity may be intermittent. Define which read-only itinerary and task views can be cached, how stale data is labelled, and how writes reconcile after reconnect.
- **Usability and accessibility:** keyboard access, visible focus, screen-reader labels, color-independent status, readable contrast, simple language, and usability testing with representative users.
- **Performance and scale:** set measurable targets after deployment assumptions and load profiles are known; test peak booking and embarkation patterns before production use.
- **Maintainability:** separate passenger booking, onboard experience, crew, ship operations, and integration modules; use versioned APIs and replaceable payment, messaging, and storage adapters.
- **Auditability:** record who changed a booking, shift, inventory count, or maintenance status, with a timestamp and reason.

## 8. ASE method

### Speculate

At the beginning of each iteration, the team writes a product vision, current user stories, uncertainties, explicit assumptions, technical risks, priority, effort, success criteria, and a sprint goal. For the first prototype, key assumptions are that guests can understand a simple cruise card, that sample cabin selection is useful to explore, and that passengers and staff benefit from a shared place to send feedback. These are hypotheses to validate, not established facts.

### Collaborate

Passengers, crew, captain, ship management, restaurant staff, housekeeping, excursion management, travel agents, and administrators participate through targeted discovery and sprint reviews. The current feedback form records type, title, and description through an authenticated API; managers can review feedback in the triage view. Representative stakeholder research has not yet been recorded.

### Learn

At review and retrospective, compare the success criteria with observed task completion, errors, questions, operational fit, and stakeholder comments. Record which assumptions remain supported, which were invalidated, and where evidence is missing. Do not label a feature validated when nobody representative has tried it.

### Adapt

The product owner updates acceptance criteria, adds or removes stories, reorders priority, and records the reason and source. When the change alters scope or architecture, update the architecture decision record and risks. Preserve links from feedback → change request → backlog story → sprint → implementation → review.

### Repeat

The next sprint starts with the revised backlog and current risks. Change is expected and evaluated for value, evidence, effort, and safety. It is not treated as failure of the original plan.

## 9. Agile/Scrum-inspired method

Work is proposed in short two-week iterations, with a product owner managing value and priority, a facilitator supporting the cadence, and a cross-functional delivery team. The team may adapt the cadence to a class schedule. Planning defines a goal, selected stories, estimates, capacity, acceptance criteria, and a sprint risk. A brief daily check covers progress, next work, and blockers. Development includes continuous review and testing. Sprint review demonstrates working increments to stakeholders. Retrospective records what went well, what did not, what was learned, and a specific action to try next sprint.

See [Backlog, sprint plan, and iteration evidence](BACKLOG-AND-SPRINTS.md) for the proposed Sprint 0–10 sequence and review/retrospective templates.

## 10. MVP and project scope

The local MVP supports the guest path: discover a cruise → inspect details → select an available sample cabin → create a persisted demo reservation → view voyage and check-in progress. It also includes role-based crew and manager workspaces, feedback triage, and a rule-based concierge. Real payments, invoicing, document upload, valid boarding credentials, production email, ship integrations, AI integration, and production operations remain future work.

## 11. Change management

Each change request records an ID, requester role, requirement, reason/evidence, business value, technical and safety impact, priority, effort, decision, and target sprint. The backlog owner records accepted, deferred, rejected, or needs-research, with rationale. Examples CR-001 to CR-003 in the prototype and [sprint record](BACKLOG-AND-SPRINTS.md) demonstrate requirement evolution but are explicitly illustrative until validated.

## 12. Risk management

Risks are reviewed at planning, review, and whenever an incident or major scope change occurs. The initial register, probability/impact scale, mitigations, owners, and review triggers are in [Architecture and risk register](ARCHITECTURE.md#risk-register). A risk response can change both backlog priority and system design.

## 13. Testing and definition of done

Testing spans unit, integration, system, regression, accessibility/usability, security, and stakeholder acceptance checks. The local suite covers domain rules and authenticated API workflows. Payment, email, vessel integration, independent security/accessibility review, and stakeholder acceptance have not been completed. The [test plan](TEST-PLAN.md) records the current evidence and remaining release gates.

A story is done when its acceptance criteria pass; code is reviewed; relevant unit, integration, regression, UI, accessibility, and security checks pass; documentation and traceability are updated; no critical defect remains; and its stakeholder review is recorded. For stories that cannot be tested in a local prototype, the evidence and dependency are stated rather than assumed.

## 14. Metrics and learning measures

Track per sprint: planned and completed story points, completion rate, lead time, cycle time, defects found/escaped, usability task success, backlog size, and stakeholder satisfaction. ASE learning measures: requirement changes, feedback-linked stories, removed/reprioritized features, invalidated assumptions, risks discovered, and adaptations completed. Define a consistent collection method and baseline before comparing trends; do not optimize velocity at the expense of outcomes.

## 15. Demonstrating requirement evolution

The following are **illustrative learning cases**, using the project brief's example patterns. They become evidence of practice only after a stakeholder has supplied and validated the trigger.

| Initial assumption / story | Feedback or question to validate | Learned change | Backlog / increment |
|---|---|---|---|
| “A guest can select a cabin from a list.” | Can passengers judge cabin location and type from a list alone? | Show a deck map, position, category, and price before confirmation. | US-003; Sprint 3 cabin selection. |
| “A guest can browse activities on the voyage page.” | Do reservations create timing conflicts? | Flag overlapping activities and dining; offer a conflict-free alternative. | US-010; Sprint 5 adaptive itinerary. |
| “Crew can view their shifts.” | What happens when a crew member cannot work an assigned shift? | Add qualification-aware swap requests and manager approval. | US-009; Sprint 7 crew collaboration. |

For each actual adaptation, replace the prompt with date, stakeholder role, consented evidence, product decision, acceptance criteria, and implementation/review result. The data shape and templates for this traceability live in the backlog and change-request records.

## 16. Prototype results

The local MVP presents passenger discovery and persisted demo reservations, authenticated role workspaces, check-in progress, saved onboard requests, feedback triage, crew tasks/attendance/swaps, manager operations/maintenance, CSV export, and a rule-based concierge. On 6 October 2026, 13 automated tests passed (7 domain unit tests and 6 HTTP integration tests); syntax checks passed for the server and client scripts. The API tests cover session handling, authorization, reservation idempotency/collisions, feedback, crew workflows, and registration validation. A browser walkthrough confirmed sign-in and the passenger, crew, and manager workspace views with server-loaded sample records. No real passenger/crew acceptance session, payment/email/vessel integration, independent security review, or production operation has been completed; see the [test results](TEST-PLAN.md#verification-results-2026-10-06).

## 17. Future enhancements

Move from the local Node/SQLite MVP to a production deployment with database migrations, managed backups, operator identity, ship-scoped permissions, email delivery, payment adapter, validated boarding credentials, and audit trails; build accessible deck and ship maps; add real crew qualifications and conflict-aware scheduling; integrate operational inventory/maintenance services; design offline synchronization; and add an authorized, retrieval-based assistant with explicit source citations, data minimization, and human escalation.

## 18. Conclusion

Harborline provides a tangible starting increment and visible space for the next change. Its feedback and backlog screens make the proposed ASE loop concrete, while project records separate working behavior, future architecture, and hypothetical examples. The next meaningful step is stakeholder discovery and usability review, followed by backlog adaptation and a new sprint based on evidence.
