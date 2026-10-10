import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const RUNTIME_NODE_MODULES = 'C:/Users/battl/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const RUNTIME_PYTHON = 'C:/Users/battl/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const SKILL_DIR = 'C:/Users/battl/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations';
process.env.RUNTIME_NODE_MODULES = RUNTIME_NODE_MODULES;
const runtimeRequire = createRequire(path.join(RUNTIME_NODE_MODULES, '__harborline_presentation__.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);

const FONT = resolvePresentationFont({ fontFamily: 'Arial' });
const OUTDIR = path.join(ROOT, 'deliverables');
const BUILDDIR = path.join(ROOT, '.ppt-work');
const FINAL_PPTX = path.join(OUTDIR, 'Harborline Final Presentation.pptx');
const COLORS = {
  navy: '#102D37', teal: '#0E7B78', lime: '#C5DF75', paper: '#F5F8F6',
  white: '#FFFFFF', ink: '#19353C', muted: '#5C7378', line: '#D8E3DF', pale: '#E8F1ED',
  blue: '#DCEBF0', sand: '#F1EEE4', amber: '#C78635', green: '#34856B', red: '#B85248',
};
const W = 1280, H = 720;
const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function text(slide, value, left, top, width, height, opts = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox', name: opts.name,
    position: { left, top, width, height },
    fill: 'none', line: { style: 'solid', fill: 'none', width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: FONT, fontSize: opts.size ?? 24, color: opts.color ?? COLORS.ink,
    bold: opts.bold ?? false, italic: opts.italic ?? false,
    alignment: opts.align ?? 'left', verticalAlignment: opts.valign ?? 'top',
    insets: 0, wrap: 'square', autoFit: 'shrinkText', lineSpacing: opts.leading ?? 1.06,
  };
  return shape;
}

function rect(slide, left, top, width, height, fill, opts = {}) {
  return slide.shapes.add({
    geometry: opts.geometry ?? 'rect', name: opts.name,
    position: { left, top, width, height }, fill,
    line: { style: 'solid', fill: opts.stroke ?? 'none', width: opts.strokeWidth ?? 0 },
    ...(opts.radius ? { borderRadius: opts.radius } : {}),
  });
}

function rule(slide, left, top, width, color = COLORS.line, thickness = 2) {
  return rect(slide, left, top, width, thickness, color);
}

function arrow(slide, left, top, width = 44, color = COLORS.teal) {
  return slide.shapes.add({
    geometry: 'rightArrow', name: 'workflow-arrow',
    position: { left, top, width, height: 18 }, fill: color,
    line: { style: 'solid', fill: 'none', width: 0 },
  });
}

function newSlide(title, subtitle = '') {
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.paper;
  text(slide, title, 72, 45, 1136, 64, { size: 42, bold: true, color: COLORS.navy, name: 'slide-title' });
  if (subtitle) text(slide, subtitle, 74, 115, 1100, 45, { size: 21, color: COLORS.muted, name: 'slide-context' });
  return slide;
}

function notes(slide, source, narration) {
  slide.speakerNotes.text = `${narration}\n\nSources: ${source}`;
}

async function addLocalImage(slide, rel, position, alt, fit = 'contain') {
  const bytes = await fs.readFile(path.join(ROOT, rel));
  return slide.images.add({
    blob: new Uint8Array(bytes),
    contentType: rel.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg',
    alt, fit, position,
  });
}

// 1 — Cover: use Harborline's own cruise photograph and logo.
{
  const slide = presentation.slides.add();
  slide.background.fill = COLORS.navy;
  await addLocalImage(slide, 'assets/cruise-images/caribbean-cruise.jpg', { left: 0, top: 0, width: W, height: H }, 'Cruise ship at sea, from the Harborline project image set', 'cover');
  rect(slide, 0, 0, 610, H, COLORS.navy, { name: 'title-panel' });
  await addLocalImage(slide, 'assets/harborline-app.svg', { left: 72, top: 74, width: 52, height: 52 }, 'Harborline ship-and-wave mark');
  text(slide, 'HARBORLINE', 142, 80, 310, 28, { size: 20, bold: true, color: COLORS.lime, name: 'brand' });
  text(slide, 'Cruise Management,\nBooking & Smart\nOperations System', 72, 188, 490, 232, { size: 47, bold: true, color: COLORS.white, leading: 0.98, name: 'presentation-title' });
  rule(slide, 74, 446, 78, COLORS.lime, 5);
  text(slide, 'PBL Final Presentation', 72, 478, 450, 40, { size: 25, color: COLORS.white });
  text(slide, 'A role-based prototype for guests, crew, captains and managers', 72, 534, 445, 82, { size: 21, color: '#E3ECE7', leading: 1.14 });
  notes(slide, 'README.md; assets/cruise-images/CREDITS.md (cover photograph: Josiah Weiss, Unsplash; https://unsplash.com/photos/white-and-blue-ship-on-sea-under-blue-sky-and-white-clouds-during-daytime-tthKs4A7XMY; Unsplash License).', 'Introduce Harborline as the cruise-management and booking project.');
}

// 2 — Scope and operating context.
{
  const slide = newSlide('Cruise operations span three moments', 'Harborline links passenger plans with work managed onboard.');
  const cols = [
    { x: 76, label: 'BEFORE SAILING', title: 'Plan the trip', body: 'Find a sailing, reserve a cabin and assign dining seats to each ticketed guest.' },
    { x: 466, label: 'ON BOARD', title: 'Run the ship', body: 'Handle crew shifts, guest service, boarding, maintenance and muster activity.' },
    { x: 856, label: 'WHEN PLANS CHANGE', title: 'Coordinate response', body: 'Review port impacts, notify affected passengers and dispatch follow-up work.' },
  ];
  for (const c of cols) {
    text(slide, c.label, c.x, 220, 320, 28, { size: 15, bold: true, color: COLORS.teal });
    rule(slide, c.x, 261, 76, COLORS.lime, 4);
    text(slide, c.title, c.x, 290, 330, 46, { size: 31, bold: true, color: COLORS.navy });
    text(slide, c.body, c.x, 352, 325, 140, { size: 23, color: COLORS.ink, leading: 1.12 });
  }
  rule(slide, 396, 286, 1, COLORS.line, 220);
  rule(slide, 786, 286, 1, COLORS.line, 220);
  text(slide, 'One sailing record connects guest, crew and operations workflows.', 76, 572, 1100, 48, { size: 25, bold: true, color: COLORS.navy });
  notes(slide, 'README.md; docs/ASE-AGILE-REPORT.md; docs/BACKLOG-AND-SPRINTS.md.', 'Frame the scope around the trip lifecycle rather than a feature list.');
}

// 3 — Development method.
{
  const slide = newSlide('Adaptive Software Engineering approach', 'Short build-and-review cycles incorporated changing project requirements.');
  const items = [
    { x: 80, n: '01', title: 'Speculation', detail: 'Set a working vision and record uncertainty about inventory, safety, payments and external data.' },
    { x: 370, n: '02', title: 'Collaboration', detail: 'Translate passenger, crew, captain and manager needs into role-specific workflows.' },
    { x: 660, n: '03', title: 'Learning', detail: 'Implement against the server and review behavior, tests and operational edge cases.' },
    { x: 950, n: '04', title: 'Adaptation', detail: 'Add guest-level dining, scoped permissions, captain-issued faults and port recovery.' },
  ];
  rule(slide, 104, 273, 1000, COLORS.line, 3);
  for (const item of items) {
    rect(slide, item.x, 238, 72, 72, COLORS.lime, { geometry: 'ellipse' });
    text(slide, item.n, item.x, 257, 72, 35, { size: 22, bold: true, color: COLORS.navy, align: 'center', valign: 'middle' });
    text(slide, item.title, item.x, 342, 246, 40, { size: 27, bold: true, color: COLORS.navy });
    text(slide, item.detail, item.x, 394, 246, 145, { size: 21, color: COLORS.ink, leading: 1.13 });
  }
  text(slide, 'Illustrative development approach documented in the project materials; no formal user study is recorded.', 80, 606, 1090, 32, { size: 17, color: COLORS.muted, italic: true });
  notes(slide, 'docs/ASE-AGILE-REPORT.md; docs/BACKLOG-AND-SPRINTS.md; docs/ARCHITECTURE.md.', 'Describe the project process as an iterative development record, not a completed user study.');
}

// 4 — Role model.
{
  const slide = newSlide('Role boundaries shape the work', 'Access is checked in the application and again by the server.');
  const roles = [
    { x: 78, role: 'Passenger', responsibility: 'Manage a booking, guest dining seats, itinerary notices and service cases.' },
    { x: 366, role: 'Crew', responsibility: 'View permitted shifts, accept eligible jobs and record progress or resolution.' },
    { x: 654, role: 'Captain', responsibility: 'Create faults, review port recovery and lead operational response.' },
    { x: 942, role: 'Manager', responsibility: 'Configure sailings, inventory and sailing-scoped staff permissions.' },
  ];
  for (const r of roles) {
    rule(slide, r.x, 226, 232, COLORS.teal, 5);
    text(slide, r.role, r.x, 254, 244, 48, { size: 29, bold: true, color: COLORS.navy });
    text(slide, r.responsibility, r.x, 324, 236, 165, { size: 21, color: COLORS.ink, leading: 1.13 });
  }
  text(slide, 'Staff permissions can be limited by action and by sailing; consequential changes are attributed in activity history.', 78, 560, 1095, 62, { size: 23, bold: true, color: COLORS.teal });
  notes(slide, 'README.md; server.js; app.js; docs/ARCHITECTURE.md.', 'Emphasize separation of responsibilities and sailing-scoped authorization.');
}

// 5 — Application architecture: each object remains editable in PowerPoint.
{
  const slide = newSlide('Application architecture', 'A browser client calls a same-origin Node.js API backed by SQLite.');
  const nodes = [
    { x: 78, w: 300, title: 'Guest & staff workspaces', body: 'HTML, CSS and JavaScript\nRole-specific screens' },
    { x: 490, w: 300, title: 'Node.js HTTP API', body: 'Authentication and role checks\nBooking and operations routes' },
    { x: 902, w: 300, title: 'SQLite database', body: 'Sailings, bookings, tasks\nActivity and operational history' },
  ];
  for (const n of nodes) {
    rect(slide, n.x, 230, n.w, 200, COLORS.white, { stroke: COLORS.line, strokeWidth: 2 });
    rule(slide, n.x, 230, n.w, COLORS.teal, 5);
    text(slide, n.title, n.x + 22, 262, n.w - 44, 60, { size: 24, bold: true, color: COLORS.navy });
    text(slide, n.body, n.x + 22, 338, n.w - 44, 76, { size: 19, color: COLORS.muted, leading: 1.12 });
  }
  arrow(slide, 396, 321, 70);
  arrow(slide, 808, 321, 70);
  text(slide, 'Server-side authorization', 475, 454, 330, 32, { size: 19, bold: true, color: COLORS.teal, align: 'center' });
  rule(slide, 96, 510, 1080, COLORS.line, 2);
  text(slide, 'Optional payment adapter', 98, 542, 280, 34, { size: 19, bold: true, color: COLORS.navy });
  text(slide, 'Stripe Checkout is used only when server keys and a signed webhook secret are configured. Default demo mode takes no payment.', 394, 538, 780, 70, { size: 19, color: COLORS.ink, leading: 1.1 });
  notes(slide, 'README.md; server.js; app.js; docs/ARCHITECTURE.md.', 'Explain the local architecture and distinguish the optional Stripe integration from the default demo mode.');
}

// 6 — Passenger booking and dining invariants.
{
  const slide = newSlide('Booking and dining are checked per guest', 'Cabin reservations and dining seat assignments persist on the server.');
  rule(slide, 640, 206, 2, COLORS.line, 360);
  text(slide, 'CABIN BOOKING', 82, 218, 440, 28, { size: 16, bold: true, color: COLORS.teal });
  text(slide, 'Reserve an available cabin', 82, 258, 474, 46, { size: 30, bold: true, color: COLORS.navy });
  text(slide, 'Availability is checked on the server. Collision protection prevents two requests from claiming the same cabin.', 82, 326, 475, 100, { size: 22, color: COLORS.ink, leading: 1.13 });
  text(slide, 'Idempotency keys make repeated reservation requests safe to process.', 82, 455, 475, 72, { size: 20, color: COLORS.muted, italic: true });
  text(slide, 'DINING SEATS', 700, 218, 470, 28, { size: 16, bold: true, color: COLORS.teal });
  text(slide, 'One ticketed guest\n= one seat', 700, 258, 470, 82, { size: 31, bold: true, color: COLORS.navy, leading: 1.0 });
  text(slide, 'Guests may choose seats in different meal batches. The server checks guest count, seat availability, blocked seats and batch capacity.', 700, 365, 476, 115, { size: 22, color: COLORS.ink, leading: 1.13 });
  rect(slide, 700, 518, 182, 42, COLORS.pale);
  text(slide, 'AVAILABLE', 700, 528, 182, 23, { size: 15, bold: true, color: COLORS.teal, align: 'center' });
  rect(slide, 900, 518, 142, 42, '#ECEEEF');
  text(slide, 'FILLED', 900, 528, 142, 23, { size: 15, bold: true, color: COLORS.muted, align: 'center' });
  rect(slide, 1060, 518, 142, 42, '#F4E7E4');
  text(slide, 'BLOCKED', 1060, 528, 142, 23, { size: 15, bold: true, color: COLORS.red, align: 'center' });
  text(slide, 'The guest count is the seat count: no extra or missing dining assignments.', 82, 602, 1120, 38, { size: 22, bold: true, color: COLORS.teal });
  notes(slide, 'README.md; server.js; app.js; docs/ARCHITECTURE.md.', 'Call out the booking collision safeguards and the exact ticket-to-seat rule, including split meal batches.');
}

// 7 — Captain-created fault work.
{
  const slide = newSlide('Captain-created faults become crew work', 'The fault record carries the location and responsibility needed to act.');
  text(slide, 'CAPTAIN REPORTS', 80, 222, 250, 28, { size: 16, bold: true, color: COLORS.teal });
  text(slide, 'Sailing\nDeck or location\nDepartment\nPriority and details', 80, 266, 300, 183, { size: 27, bold: true, color: COLORS.navy, leading: 1.14 });
  rule(slide, 410, 237, 2, COLORS.line, 276);
  const steps = [
    { x: 470, title: 'Accept', desc: 'Eligible crew member claims the job.' },
    { x: 710, title: 'Work', desc: 'Crew member records progress.' },
    { x: 950, title: 'Resolve', desc: 'Close with a resolution note.' },
  ];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    text(slide, `0${i + 1}`, s.x, 242, 70, 45, { size: 28, bold: true, color: COLORS.teal });
    text(slide, s.title, s.x, 300, 210, 40, { size: 28, bold: true, color: COLORS.navy });
    text(slide, s.desc, s.x, 357, 190, 98, { size: 21, color: COLORS.ink, leading: 1.12 });
    if (i < steps.length - 1) arrow(slide, s.x + 188, 305, 36);
  }
  rule(slide, 80, 514, 1120, COLORS.line, 2);
  text(slide, 'Reporter, acceptance, progress and closure are retained in the task history.', 80, 548, 1115, 42, { size: 24, bold: true, color: COLORS.teal });
  notes(slide, 'README.md; server.js; app.js; docs/ARCHITECTURE.md.', 'Show how a captain or manager creates actionable work and how eligible crew accept and log it.');
}

// 8 — Human-approved disruption recovery.
{
  const slide = newSlide('Port changes use a captain-reviewed recovery', 'Passenger notices and crew follow-ups begin only after an authorized review.');
  const stages = [
    { x: 72, w: 205, n: '01', title: 'Port change', body: 'Delay or cancellation' },
    { x: 312, w: 245, n: '02', title: 'Impact review', body: 'Affected bookings\nLinked shore plans' },
    { x: 590, w: 230, n: '03', title: 'Approve', body: 'Captain or manager\nreviews the plan' },
    { x: 855, w: 345, n: '04', title: 'Follow through', body: 'Passenger notices and choices\nClaimable crew tasks' },
  ];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    rect(slide, s.x, 274, s.w, 177, i === 2 ? '#EEF1D7' : COLORS.white, { stroke: i === 2 ? '#D3DB9E' : COLORS.line, strokeWidth: 2 });
    text(slide, s.n, s.x + 18, 292, 50, 30, { size: 18, bold: true, color: COLORS.teal });
    text(slide, s.title, s.x + 18, 332, s.w - 36, 38, { size: 25, bold: true, color: COLORS.navy });
    text(slide, s.body, s.x + 18, 382, s.w - 36, 56, { size: 19, color: COLORS.ink, leading: 1.08 });
    if (i < stages.length - 1) arrow(slide, s.x + s.w + 8, 352, 34);
  }
  text(slide, 'Responses, decisions and task progress remain linked to the sailing and affected booking parties.', 76, 516, 1110, 66, { size: 23, bold: true, color: COLORS.teal });
  text(slide, 'The system records in-app responses; it does not send email or SMS.', 76, 608, 1100, 30, { size: 18, color: COLORS.muted, italic: true });
  notes(slide, 'README.md; app.js; docs/ARCHITECTURE.md.', 'Describe the approval gate and the chain from itinerary change to guest response and crew follow-up.');
}

// 9 — Ship readiness and guest accountability.
{
  const slide = newSlide('Ship readiness extends beyond reservations', 'Boarding, safety and maintenance actions are attached to operational records.');
  const areas = [
    { x: 82, label: 'BOARDING', title: 'Manifest & check-in', body: 'One-time ticket check-in against the sailing manifest. Camera scan depends on browser support; manual and keyboard-scanner entry are available.' },
    { x: 466, label: 'SAFETY', title: 'Muster & drills', body: 'Authorized staff can open a drill or event and record guest accountability at configured muster stations.' },
    { x: 850, label: 'MAINTENANCE', title: 'Equipment & due work', body: 'Keep an equipment register, recurring service plans, completion notes and next due dates.' },
  ];
  for (const a of areas) {
    text(slide, a.label, a.x, 228, 330, 28, { size: 16, bold: true, color: COLORS.teal });
    rule(slide, a.x, 271, 68, COLORS.lime, 5);
    text(slide, a.title, a.x, 300, 330, 74, { size: 28, bold: true, color: COLORS.navy });
    text(slide, a.body, a.x, 392, 324, 174, { size: 21, color: COLORS.ink, leading: 1.12 });
  }
  rule(slide, 430, 285, 2, COLORS.line, 255);
  rule(slide, 814, 285, 2, COLORS.line, 255);
  text(slide, 'Actions are attributed to staff and recorded in local activity history.', 82, 610, 1090, 38, { size: 22, bold: true, color: COLORS.teal });
  notes(slide, 'README.md; server.js; app.js; docs/ARCHITECTURE.md.', 'Summarize ship-operation modules while making clear that station configuration and safety response require operator validation.');
}

// 10 — Recorded verification and honest evidence boundary.
{
  const slide = newSlide('Recorded verification covers the core workflows', 'The repository test plan records a run dated 6 October 2026.');
  text(slide, '13', 86, 216, 320, 166, { size: 128, bold: true, color: COLORS.teal, name: 'recorded-test-count' });
  text(slide, 'automated tests passed', 94, 388, 370, 42, { size: 25, bold: true, color: COLORS.navy });
  text(slide, '7 domain tests  +  6 HTTP integration tests', 94, 447, 440, 52, { size: 20, color: COLORS.muted });
  rule(slide, 555, 214, 2, COLORS.line, 340);
  text(slide, 'Documented checks include', 610, 218, 560, 36, { size: 25, bold: true, color: COLORS.navy });
  text(slide, 'Authentication and role authorization\nReservation collisions and idempotency\nSQLite-backed workflows and feedback\nCrew operations and registration validation', 610, 278, 570, 204, { size: 23, color: COLORS.ink, leading: 1.2 });
  rule(slide, 610, 523, 570, COLORS.line, 2);
  text(slide, 'No external passenger or crew study, load benchmark, live payment test or independent security review is recorded.', 610, 550, 570, 80, { size: 18, color: COLORS.muted, italic: true, leading: 1.1 });
  notes(slide, 'docs/TEST-PLAN.md; README.md.', 'Attribute the count and date to the existing repository test plan. Do not present these checks as new tests run for this presentation.');
}

// 11 — Summary and next phase.
{
  const slide = newSlide('A connected local MVP, with a clear next phase');
  text(slide, 'Harborline connects passenger booking to shipboard work through role-checked APIs, persistent records and action history.', 80, 142, 1096, 82, { size: 30, bold: true, color: COLORS.navy, leading: 1.08 });
  const future = [
    { x: 82, title: 'Validate', body: 'Test priorities and task flows with representative passengers, crew, captains and managers.' },
    { x: 466, title: 'Connect', body: 'Integrate authoritative sailing, identity, manifest, payment and notification services.' },
    { x: 850, title: 'Harden', body: 'Set backups and audit retention; review accessibility, security and vessel safety procedures.' },
  ];
  for (const f of future) {
    rule(slide, f.x, 310, 300, COLORS.teal, 4);
    text(slide, f.title, f.x, 338, 300, 42, { size: 29, bold: true, color: COLORS.navy });
    text(slide, f.body, f.x, 396, 300, 119, { size: 21, color: COLORS.ink, leading: 1.12 });
  }
  rect(slide, 80, 570, 1120, 63, COLORS.navy);
  text(slide, 'Prototype boundary: seeded sailings, local infrastructure, no default payment; operational safety needs vessel-operator validation.', 101, 586, 1075, 34, { size: 18, bold: true, color: COLORS.white, valign: 'middle' });
  notes(slide, 'README.md; docs/ARCHITECTURE.md; docs/BACKLOG-AND-SPRINTS.md; docs/ASE-AGILE-REPORT.md.', 'Close with the implemented value and the work required before a cruise operator could rely on the system.');
}

await fs.mkdir(BUILDDIR, { recursive: true });
await fs.mkdir(OUTDIR, { recursive: true });
const previewDir = path.join(BUILDDIR, 'slide-previews');
await fs.mkdir(previewDir, { recursive: true });
async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}
for (const [index, slide] of presentation.slides.items.entries()) {
  const filename = `slide-${String(index + 1).padStart(2, '0')}.png`;
  await writeBlob(path.join(previewDir, filename), await presentation.export({ slide, format: 'png', scale: 1 }));
}

const stagingDir = path.join(BUILDDIR, 'finalizer-staging');
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const result = await finalizePresentation({
  explicitTotalSlideCount: 11,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir: ROOT,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  fontPolicy: { basis: 'design', families: [FONT] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, 'Harborline-PBL-Presentation-final.validation.json'),
});
console.log(JSON.stringify({ font: FONT, slideCount: presentation.slides.items.length, finalPath: FINAL_PPTX, finalizeResult: result }, null, 2));
