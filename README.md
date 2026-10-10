# Harborline

Harborline is a role-based cruise booking and ship-operations app with an Adaptive Software Engineering feedback loop. It includes passenger reservations, crew job acceptance, captain fault dispatch, sailing setup, scoped staff permissions, dining seat inventory, and a boarding desk.

The operations workspace also includes muster accountability, recurring equipment maintenance, port-call updates, guest service cases, and a limited offline queue for selected staff and passenger actions.

## Start the app

Use Node.js 24 or newer, then run from this folder:

```text
node server.js
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). The app and API are served from the same origin. SQLite creates its database at `data/harborline.sqlite` on first start. No npm packages or build step are required.

Run automated tests with:

```text
node --test
```

## Development demo accounts

These seeded accounts are for local development only. They are not created when `NODE_ENV=production`.

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@harborline.test` | `SailAway2026!` |
| Crew member | `crew@harborline.test` | `CrewShift2026!` |
| Captain | `captain@harborline.test` | `CaptainShift2026!` |
| Ship manager | `manager@harborline.test` | `ShipOps2026!` |

Passengers can also register from the sign-in screen. Crew and manager accounts are operator-issued. The local password-reset flow prints a short-lived reset token in the server terminal; no email service is connected.

## What is server-backed

- Sign-in, passenger registration, signed-out state, and HttpOnly same-site session cookies
- Scrypt-hashed passwords and role checks on API routes
- Cruise catalog and cabin availability from SQLite
- Transactional cabin reservation with collision protection and idempotency keys
- Passenger bookings, onboard requests, and feedback persisted to the database
- Staff sailing permissions for dining changes, sailing setup, fault dispatch, crew job-board access, and boarding scans; updates are audited
- Sailing, date, fare, cabin, dinner-batch, and seat inventory setup saved in SQLite
- Fault reports with ship/deck/location, priority, crew acceptance, resolution notes, and timestamped action history
- Boarding manifest and one-time check-in scans by Code 39 camera scanner where supported, or keyboard barcode reader/manual ticket reference
- Manager/captain operations dashboards, staff access history, crew work history, and shift-swap decisions
- Muster station assignments, drill/emergency event tracking, and passenger accountability by ticket and guest number
- Equipment register, recurring preventive service plans, completion notes, and timestamped maintenance history
- Planned and actual port-call times, operational status, and in-app itinerary notices for booked passengers
- Captain-reviewed port disruption recovery: calculate every confirmed booking party affected by a delay/cancellation, include linked shore plans in the impact review, notify each booking after approval, capture passenger responses, and create claimable crew follow-ups with an action history
- Guest service requests with crew acceptance, progress, resolution, and history
- Sailing-scoped muster permissions and a local offline queue for work logs, maintenance completion, muster check-ins, guest requests, and boarding scans
- Stripe Checkout and signed webhook handling when Stripe server credentials are configured
- Development password reset tokens stored by hash and expired after 15 minutes

## Payments and scanner setup

Without Stripe credentials, booking stays in clearly labeled demo mode and collects no money. To enable a real Checkout flow, provide server-side Stripe test keys when starting Harborline; the keys must never be placed in browser code:

```powershell
$env:STRIPE_SECRET_KEY = "sk_test_..."
$env:STRIPE_WEBHOOK_SECRET = "whsec_..."
node server.js
```

Register `POST /api/payments/stripe-webhook` as the Stripe webhook endpoint and enable Checkout Session completion, expiration, and asynchronous payment failure events. Stripe confirms payment on the server before changing a booking to paid. The included currency is USD. Use Stripe test mode until the merchant account, policies, and deployment are ready.

The camera scanner uses the browser's `BarcodeDetector` Code 39 support, which varies by browser. Camera access needs a secure origin (HTTPS or localhost). A keyboard-wedge barcode reader or ticket-reference entry is available as a fallback. The server checks each ticket against its sailing, blocks repeat scans, and records the staff account.

Sample sailings and some crew, cabin, and maintenance records remain seeded data. Staff can create new sailings and configure their dates, fare, cabins, dinner batches, and seats. Captains and managers can configure muster stations, equipment service plans, port calls, and guest service workflows for sailings they manage. The Disruption recovery page supports port delays and cancellations: it creates a draft impact review, then only after captain/manager approval updates the port status, sends booking-scoped in-app notices, collects guest preferences, and opens one crew follow-up per affected booking. Crew can claim, start, and complete those follow-ups; the actions are logged. Passengers with a linked shore plan can see it in the impact notice. Passenger itinerary updates are visible in My voyage; no email or SMS delivery is connected. This first recovery workflow does not issue refunds, move reservations, or integrate with live weather/port feeds.

The offline feature caches the app shell and the last workspace snapshot on the current device. Supported form submissions are queued locally and verified by the server on reconnection; boarding and muster records are explicitly pending verification until then. Offline queue data can be lost if browser storage is cleared or the device is lost, so it is a continuity aid rather than a guaranteed emergency communications system. Real muster procedures, station mappings, and safety actions must be configured and validated by the vessel operator before operational use. The app does not yet synchronize with shipboard safety, maintenance sensor, port-agent, identity, or manifest systems.

Passenger accounts are limited to the account fields needed by this app. The concierge remains a fixed-response guide; it does not use an external AI model or private operations data.

This is still a local academic build, not a certified cruise-operator deployment. Real vessel deployment needs the operator's identity and manifest systems, production email delivery, rate limiting, HTTPS hosting, audit-retention policy, payment/refund operations, hardware validation, backup/restore, and independent security/privacy review.

## Project record

- [ASE & Agile project report](docs/ASE-AGILE-REPORT.md)
- [Backlog, sprint plan, and iteration evidence](docs/BACKLOG-AND-SPRINTS.md)
- [Architecture, data model, and diagrams](docs/ARCHITECTURE.md)
- [Testing and acceptance plan](docs/TEST-PLAN.md)

The report separates implemented behavior, planned integrations, and illustrative stakeholder scenarios. Replace those scenarios with consented research findings as future iterations are reviewed.
