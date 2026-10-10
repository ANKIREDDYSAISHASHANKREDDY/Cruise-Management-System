# Architecture, Data Model & Risk Register

## Status and architecture decisions

The current local MVP is a same-origin HTML/CSS/JavaScript client served by a Node.js HTTP server. The server exposes authenticated JSON APIs and stores demo accounts, sessions, sailings, cabin inventory, bookings, onboard requests, feedback, crew workflows, and manager operations in SQLite (`data/harborline.sqlite`). Passwords use scrypt hashes; sessions use random tokens stored by hash in HttpOnly, SameSite cookies. Authorization is checked on API routes by role and account ownership. Development demo accounts are seeded only outside production.

This is an academic local build, not an operator-connected or production system. Records are seeded sample data. Cabin booking is atomic and idempotent for the demo, but it collects no payment and does not create a valid travel credential. Production identity, email delivery, operator data adapters, payment, audit retention, backups, deployment controls, and independent security review remain future work. The technology direction below is the proposed evolution path for those requirements.

### Current implementation slice

| Area | Local implementation | Boundary |
|---|---|---|
| Identity | Passenger registration, sign-in/out, password reset token flow, role-scoped demo accounts | Reset token is printed to the local server terminal; no email or operator identity provider. |
| Persistence | SQLite schema and seed data; authenticated API routes | One local database file; no production migration, backup, or multi-instance strategy. |
| Booking | Cabin availability, idempotent reservation, passenger booking list, check-in state | Demo reservation only; no payment, fare rules, or real cruise inventory. |
| Onboard | Saved dining/activity requests and passenger feedback | Seeded catalog and no external capacity system. |
| Crew | Tasks, attendance, shifts, swap requests and manager decisions | Seeded schedules and no qualification, labor-rule, or HR integration. |
| Management | Operations summary, feedback triage, maintenance tickets, CSV report | Sample operational values; no connected vessel system or audit retention. |

The diagrams and normalized model below describe the target architecture and design considerations, not the current SQLite schema.

### Proposed technology direction

| Concern | Candidate | Why / decision still needed |
|---|---|---|
| Web client | Next.js + React + TypeScript + accessible design system | Supports role-specific, responsive views and reusable modules. The prototype is framework-free to keep initial exploration fast. |
| API | Node.js + TypeScript REST API; WebSockets only for genuinely live updates | Versioned modules and replaceable service adapters. Confirm hosting, auth, and vessel connectivity first. |
| Persistence | PostgreSQL with Prisma or equivalent migrations | Relational booking, inventory, schedule, and audit data. Confirm fleet system of record and consistency needs. |
| Cache / jobs | Redis and a durable worker queue where justified | Reservations, notifications, and synchronization may need asynchronous processing. Select after load and failure analysis. |
| Storage | S3-compatible object storage | For consented passenger documents and controlled operational attachments, with retention and encryption. |
| Deployment | Containerized services behind a managed ingress/reverse proxy | Environment parity and replaceable deployment units. Production topology depends on operator and connectivity requirements. |
| Payments | Provider adapter; tokenization / hosted payment elements | Avoid storing card data. Pick a provider only after jurisdiction and procurement review. |

## Architectural principles

1. **Modular boundaries:** Passenger Identity/Profile; Cruise Catalog; Cabin Inventory; Booking; Payment; Voyage/Onboard Services; Crew/Qualifications/Scheduling; Ship Operations; Feedback/Backlog; Notification; Analytics; Assistant.
2. **API-first contracts:** schemas are versioned; modules publish events or stable interfaces instead of directly mutating another module's tables.
3. **Replaceable integrations:** provider-specific code sits behind payment, messaging, maps, document storage, and cruise inventory adapters.
4. **Role and scope before data:** authenticate the actor, resolve their ship/booking scope, authorize the action, then fetch only permitted fields.
5. **Audit consequential changes:** booking and payment transitions, shift approvals, maintenance status, inventory adjustments, access to sensitive records, and assistant tool use are attributable.
6. **Human authority for operations:** recommendations support authorized staff; they cannot approve safety-critical or staffing decisions on a person's behalf.
7. **Offline aware:** clearly label cached data freshness; queue safe writes only when idempotency and conflict rules are defined.
8. **Learnable seams:** changing a fare rule, itinerary source, or scheduling constraint should not require a rewrite of unrelated passenger or ship operations modules.

## Context and proposed component diagram

```mermaid
flowchart LR
  Passenger[Passenger web / mobile]
  Crew[Crew workspace]
  Manager[Manager console]
  API[API gateway / identity / authorization]
  Catalog[Cruise catalog]
  Booking[Booking and cabin inventory]
  Payment[Payment adapter]
  Onboard[Voyage, dining, activities, excursions]
  CrewSvc[Crew, qualifications, scheduling, tasks]
  Ops[Inventory, maintenance, safety]
  Feedback[Feedback, change request, backlog]
  Notify[Notification and offline sync]
  Analytics[Analytics / reporting]
  Assistant[Authorized assistant tools]
  DB[(PostgreSQL)]
  Queue[(Redis / durable jobs)]
  Storage[(Document object storage)]
  External[External cruise, payment, messaging systems]
  Passenger --> API
  Crew --> API
  Manager --> API
  API --> Catalog
  API --> Booking
  API --> Onboard
  API --> CrewSvc
  API --> Ops
  API --> Feedback
  API --> Analytics
  API --> Assistant
  Booking --> Payment
  Booking --> DB
  Catalog --> DB
  Onboard --> DB
  CrewSvc --> DB
  Ops --> DB
  Feedback --> DB
  Analytics --> DB
  Booking --> Queue
  CrewSvc --> Queue
  Notify --> Queue
  API --> Storage
  Catalog <--> External
  Payment <--> External
  Notify <--> External
  Assistant --> API
```

The assistant calls the same authorized domain services as a user interface. It does not receive database credentials or bypass row/field authorization. Its responses should name source and freshness, and refuse when permission or evidence is missing.

## Proposed relational model

This logical model is a starting point for design review. Normalize operational records where transactions and auditability require it; do not expose internal keys as public boarding credentials.

```mermaid
erDiagram
  USER ||--o| PASSENGER_PROFILE : has
  USER ||--o| CREW_PROFILE : has
  SHIP ||--o{ CRUISE : hosts
  CRUISE ||--o{ ITINERARY_STOP : contains
  SHIP ||--o{ CABIN : contains
  CRUISE ||--o{ BOOKING : receives
  PASSENGER_PROFILE ||--o{ BOOKING_GUEST : travels
  BOOKING ||--|{ BOOKING_GUEST : includes
  CABIN ||--o{ BOOKING_CABIN : assigned
  BOOKING ||--o{ BOOKING_CABIN : reserves
  BOOKING ||--o{ PAYMENT_ATTEMPT : settles
  BOOKING ||--o{ TRAVEL_DOCUMENT : carries
  BOOKING ||--o{ ONBOARD_RESERVATION : includes
  CREW_PROFILE ||--o{ CREW_QUALIFICATION : holds
  DEPARTMENT ||--o{ SHIFT : staffs
  CREW_PROFILE ||--o{ CREW_SHIFT : assigned
  SHIFT ||--o{ CREW_SHIFT : has
  CREW_SHIFT ||--o{ SHIFT_SWAP_REQUEST : changes
  CREW_PROFILE ||--o{ TASK : owns
  SHIP ||--o{ INVENTORY_ITEM : tracks
  SHIP ||--o{ MAINTENANCE_TICKET : reports
  USER ||--o{ FEEDBACK : submits
  FEEDBACK ||--o{ CHANGE_REQUEST : may_create
  CHANGE_REQUEST ||--o{ BACKLOG_ITEM : refines_into
  BACKLOG_ITEM ||--o{ SPRINT_STORY : planned_as
  SPRINT ||--o{ SPRINT_STORY : contains
  USER ||--o{ AUDIT_EVENT : performs
```

### Entity notes

- `USER`: identity subject, enabled status, authentication reference. Passwords belong to an identity provider or a purpose-built secure identity service; never store plain text.
- `PASSENGER_PROFILE`: preference controls and consent metadata. Minimize sensitive attributes; retention and deletion follow policy.
- `CREW_PROFILE`, `CREW_QUALIFICATION`, `DEPARTMENT`: employment and qualification scope. Access limited to authorized crew/management functions.
- `SHIP`, `CRUISE`, `ITINERARY_STOP`: versioned operational catalog, source and last-updated timestamp for sailing facts.
- `CABIN`: ship, deck, category, accessibility attributes, inventory status. Availability is time-bound and must be reserved atomically.
- `BOOKING`, `BOOKING_GUEST`, `BOOKING_CABIN`: booking state machine and guest/cabin links. Use transactions and idempotency keys on reservation and payment operations.
- `PAYMENT_ATTEMPT`: provider reference, amount/currency, status, and reconciliation metadata; no card number or security code.
- `TRAVEL_DOCUMENT`: private object reference, classification, retention, and access audit.
- `ONBOARD_RESERVATION`: event/resource, guest, time-zone-aware interval, capacity, and cancellation status.
- `SHIFT`, `CREW_SHIFT`, `SHIFT_SWAP_REQUEST`, `TASK`: qualified assignment, rest validation, manager approval, and auditable state transitions.
- `INVENTORY_ITEM`, `MAINTENANCE_TICKET`: ship/dept source-of-truth integration, count/freshness, priority, owner, and lifecycle.
- `FEEDBACK`, `CHANGE_REQUEST`, `BACKLOG_ITEM`, `SPRINT`, `SPRINT_STORY`: traceability from consented feedback to decision and sprint review. Store a redacted summary if free text includes personal data.
- `AUDIT_EVENT`: actor, action, object, reason, event time, request/correlation ID. Append-only policy and retention are to be confirmed.

## Use-case diagram

```mermaid
flowchart LR
  P[Passenger] --> U1((Search and compare cruises))
  P --> U2((Select cabin and book))
  P --> U3((Pay and check in))
  P --> U4((View voyage and onboard plans))
  P --> U5((Submit feedback))
  P --> U6((Ask voyage concierge))
  C[Crew member] --> U7((View shifts and tasks))
  C --> U8((Request shift swap))
  C --> U9((Read announcements and training))
  C --> U5
  M[Ship manager] --> U10((Assign and approve shifts))
  M --> U11((Review operations and analytics))
  M --> U12((Manage inventory and maintenance))
  M --> U13((Triage feedback and backlog))
  A[Administrator] --> U14((Manage roles and configuration))
  A --> U15((Review audit and access))
  T[Travel agent] --> U1
  T --> U2
  X[External payment / cruise services] --- U2
  X --- U3
```

## Class diagram (simplified)

```mermaid
classDiagram
  class User {+UUID id +Role role +String status}
  class PassengerProfile {+UUID userId +Preference[] preferences}
  class CrewProfile {+UUID userId +UUID departmentId}
  class Cruise {+UUID id +UUID shipId +DateTime departure +CruiseStatus status}
  class Cabin {+UUID id +int deck +CabinCategory category +InventoryStatus status}
  class Booking {+UUID id +String reference +BookingStatus status +Money total}
  class PaymentAttempt {+UUID id +Money amount +PaymentStatus status}
  class VoyageReservation {+UUID id +DateTime start +DateTime end +ReservationStatus status}
  class CrewShift {+UUID id +DateTime start +DateTime end +ShiftStatus status}
  class Feedback {+UUID id +FeedbackType type +String summary +TriageStatus status}
  class ChangeRequest {+UUID id +Priority priority +Decision decision}
  class BacklogItem {+UUID id +String story +Priority priority +StoryStatus status}
  class AuditEvent {+UUID id +String action +DateTime occurredAt}
  User "1" --> "0..1" PassengerProfile
  User "1" --> "0..1" CrewProfile
  Cruise "1" --> "0..*" Booking
  Booking "1" --> "1..*" Cabin
  Booking "1" --> "0..*" PaymentAttempt
  Booking "1" --> "0..*" VoyageReservation
  CrewProfile "1" --> "0..*" CrewShift
  User "1" --> "0..*" Feedback
  Feedback "1" --> "0..*" ChangeRequest
  ChangeRequest "1" --> "0..*" BacklogItem
  User "1" --> "0..*" AuditEvent
```

## Booking sequence (proposed)

```mermaid
sequenceDiagram
  actor Passenger
  participant Web as Passenger client
  participant API as Booking API
  participant Inventory as Cabin inventory
  participant Pay as Payment adapter
  participant Notify as Notification service
  Passenger->>Web: Choose sailing and cabin
  Web->>API: Create booking intent + idempotency key
  API->>Inventory: Hold cabin until expiry
  Inventory-->>API: Hold ID and price snapshot
  API-->>Web: Review total and terms
  Passenger->>Web: Confirm booking and payment
  Web->>API: Confirm intent + payment token
  API->>Pay: Authorize / capture through provider
  Pay-->>API: Provider result
  API->>Inventory: Commit hold or release on failure
  API-->>Web: Booking reference and status
  API->>Notify: Queue receipt / check-in instructions
  Note over API,Pay: No raw payment card data is stored by Harborline
```

## Feedback-to-adaptation activity diagram

```mermaid
flowchart TD
  A[Stakeholder notices a need] --> B[Submit feedback or join review]
  B --> C{Consent and sufficient context?}
  C -- No --> D[Ask for clarification or redact sensitive data]
  D --> B
  C -- Yes --> E[Triage value, evidence, safety, privacy, effort]
  E --> F{Decision}
  F -- Defer / decline --> G[Record reason and tell stakeholder]
  F -- Need discovery --> H[Create research task]
  F -- Accept --> I[Create or update backlog story and acceptance criteria]
  H --> J[Plan next iteration]
  I --> J
  J --> K[Build and test increment]
  K --> L[Review with stakeholders]
  L --> M[Record learning and adaptation]
  M --> E
```

## Security boundaries and authorization

| Role | Example permitted scope | Explicit boundary |
|---|---|---|
| Passenger | Own profile, booking guests, own itinerary, own feedback | Cannot query other passenger records or crew/ship personnel data. |
| Crew member | Own shifts/tasks/qualifications; authorized team notices | Cannot change published schedule or read unrelated passenger documents. |
| Department lead / manager | Assigned ship and department operations, approved metrics, triage queue | Scope constrained to assigned vessel/department; audited override required. |
| Captain / safety role | Vessel readiness and safety workflows defined by operator | Safety data freshness and command authority are explicit; no automated final decisions. |
| Travel agent | Client bookings covered by a current delegation/contract | No access beyond assigned travelers, itinerary facts, and permitted booking actions. |
| Administrator | Identity/configuration and system audit functions | Administrative access is separated from routine guest operations and audited. |

Authorization should be enforced server-side on every request; hiding a UI control is not authorization. The assistant's tool calls use the actor's current permissions and return the minimum fields needed.

## Risk register

Probability and impact are qualitative initial assessments; review them with the operator and at each sprint.

| ID / risk | Probability | Impact | Response / trigger |
|---|---|---|---|
| R-01 Payment failure or duplicate charge | Medium | High | Payment abstraction; idempotency; provider reconciliation; test retries/refunds. Review before Sprint 4. |
| R-02 Intermittent onboard internet | High | High | Discover offline work in Sprint 0; define cached read views, freshness markers, safe write queue, and conflict resolution before rollout. |
| R-03 Requirements change after discovery | High | Medium | Keep backlog mutable; preserve change rationale and acceptance criteria; reserve sprint capacity for adaptation. Review each sprint. |
| R-04 Crew scheduling conflict, qualification gap, or rest-rule breach | Medium | High | Encode validated constraints; highlight conflicts; retain manager approval and override reason; involve crew/HR/safety before Sprint 6. |
| R-05 Peak passenger load degrades search or booking | Medium | High | Define workload profile; load-test inventory holds and idempotency; use caching only where staleness is safe. Before production booking. |
| R-06 Cabin inventory becomes stale or two guests receive one cabin | Medium | High | Inventory system of record, expiring atomic holds, transaction/idempotency tests, explicit unavailable state. Sprint 3/production gate. |
| R-07 Private passenger/crew data appears in feedback or assistant output | Medium | High | Data minimization, redaction, consent, role-scoped retrieval, audit, privacy/security review and adversarial tests. Before external pilot. |
| R-08 Sample figures are mistaken for real operational status | Medium | High | Persistent sample-data labels, source/freshness metadata, no operational decisions from prototype. Review before every demo. |
| R-09 Itinerary changes due to weather or port operations | High | Medium | Source timestamp, change notifications, traveler acknowledgement rules, human operator override. Sprint 5. |
| R-10 QR pass is copied, forged, or shown after booking revocation | Low/Medium | High | Signed expiring credential, scan validation, offline revocation strategy, minimum PII. Sprint 4 security review. |
| R-11 Assistant gives unsupported or unauthorized advice | Medium | High | Retrieval through authorized tools; source citations and freshness; abstain/escalate; role tests; no autonomous transactions. Sprint 10. |
| R-12 Different vessel systems disagree about source of truth | Medium | High | Map integration ownership and reconciliation in discovery; adapters, correlation IDs, timestamps, and exception queue. Sprint 0/8. |

### Risk review cadence

At planning, review open risk owners, triggers, mitigations, and newly introduced dependencies. At review/retro, note incidents, near misses, changed probability/impact, and whether an adaptation is needed. Escalate safety, payment, privacy, or security risks immediately through the operator's governance process; a backlog ranking does not replace required approvals.

## Architecture decision record (initial)

**ADR-001 — Modular, API-first direction.**

- **Status:** proposed; validate in Sprint 0 before adopting for production.
- **Context:** booking, onboard experience, crew, and operations change at different rates and may rely on existing operator systems.
- **Decision:** establish domain boundaries and versioned APIs; begin with a modular application and separate adapters. Defer microservice decomposition until scale, team ownership, or reliability evidence justifies it.
- **Consequences:** clearer seams and test contracts; requires disciplined API/schema changes and integration monitoring. The current app uses a single Node server and SQLite database, with modular API handlers rather than independently deployed services.
- **Revisit when:** deployment boundaries, team ownership, availability targets, vessel connectivity, or load evidence materially changes.
