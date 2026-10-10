/* Harborline local API. Node 22.5+ (node:sqlite); no third-party packages. */
'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = process.env.HARBORLINE_DB || path.join(DATA_DIR, 'harborline.sqlite');
const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_BODY = 1024 * 1024;
const demoAccounts = [
  { name: 'Alex Morgan', email: 'passenger@harborline.test', password: 'SailAway2026!', role: 'passenger' },
  { name: 'Jordan Lee', email: 'crew@harborline.test', password: 'CrewShift2026!', role: 'crew' },
  { name: 'Maya Rivera', email: 'captain@harborline.test', password: 'CaptainShift2026!', role: 'captain' },
  { name: 'Priya Shah', email: 'manager@harborline.test', password: 'ShipOps2026!', role: 'manager' }
];
const cruiseSeeds = [
  {id:'c1',name:'Atlantic Breeze',region:'Caribbean',route:'Miami · Nassau · Cozumel',days:7,base_fare:1249,ship:'MV Solstice',date:'Oct 18 – 25, 2026',art:'caribbean',description:'Sunlit island days, a little open ocean, and evenings that stretch out on deck.'},
  {id:'c2',name:'Aegean Blue',region:'Mediterranean',route:'Athens · Santorini · Dubrovnik',days:9,base_fare:1890,ship:'MV Asteria',date:'Nov 02 – 11, 2026',art:'greece',description:'Whitewashed villages and late dinners, stitched together by the blue Aegean.'},
  {id:'c3',name:'Northern Passage',region:'Northern Europe',route:'Bergen · Ålesund · Geiranger',days:8,base_fare:2140,ship:'MV Fjordlight',date:'Nov 16 – 24, 2026',art:'nordic',description:'A quiet route through deep fjords, mountain air, and small coastal towns.'},
  {id:'c4',name:'Coral & Cay',region:'Caribbean',route:'San Juan · St. Lucia · Barbados',days:6,base_fare:1080,ship:'MV Solstice',date:'Dec 04 – 10, 2026',art:'islands',description:'A slower island-hopping escape with plenty of time to find your own cove.'},
  {id:'c5',name:'Mediterranean Table',region:'Mediterranean',route:'Barcelona · Marseille · Genoa',days:7,base_fare:1575,ship:'MV Asteria',date:'Dec 12 – 19, 2026',art:'mediterranean',description:'Market mornings, old harbors, and the long way around the dinner table.'},
  {id:'c6',name:'Wild Coast',region:'Northern Europe',route:'Reykjavik · Ísafjörður · Akureyri',days:10,base_fare:2460,ship:'MV Fjordlight',date:'Jan 08 – 18, 2027',art:'nordic',description:'Big landscapes, unhurried sea days, and a chance to see the north differently.'}
];

function dbInit(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('passenger','crew','captain','manager')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cruises (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL, route TEXT NOT NULL,
      days INTEGER NOT NULL, base_fare INTEGER NOT NULL, ship TEXT NOT NULL,
      date TEXT NOT NULL, art TEXT NOT NULL, description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cabins (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id),
      cabin_number TEXT NOT NULL, deck INTEGER NOT NULL, category TEXT NOT NULL,
      price_delta INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'available'
        CHECK(status IN ('available','booked','service')),
      UNIQUE(cruise_id, cabin_number)
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id), cruise_id TEXT NOT NULL REFERENCES cruises(id),
      cabin_id INTEGER NOT NULL REFERENCES cabins(id), guests INTEGER NOT NULL CHECK(guests BETWEEN 1 AND 6),
      total INTEGER NOT NULL, status TEXT NOT NULL, idempotency_key TEXT, checked_in_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS onboard_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL, guests INTEGER NOT NULL DEFAULT 2, note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'saved', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS dining_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      name TEXT NOT NULL, starts_at TEXT NOT NULL, capacity INTEGER NOT NULL,
      UNIQUE(cruise_id,name)
    );
    CREATE TABLE IF NOT EXISTS dining_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES dining_batches(id) ON DELETE CASCADE,
      seat_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','blocked')),
      UNIQUE(batch_id,seat_number)
    );
    CREATE TABLE IF NOT EXISTS dining_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      guests INTEGER NOT NULL CHECK(guests BETWEEN 1 AND 6),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS dining_reservation_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL REFERENCES dining_reservations(id) ON DELETE CASCADE,
      guest_number INTEGER NOT NULL CHECK(guest_number BETWEEN 1 AND 6),
      seat_id INTEGER NOT NULL UNIQUE REFERENCES dining_seats(id),
      UNIQUE(reservation_id,guest_number)
    );
    CREATE TABLE IF NOT EXISTS dining_operations_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER NOT NULL REFERENCES users(id),
      batch_id INTEGER NOT NULL REFERENCES dining_batches(id),
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS crew_tasks (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      department TEXT NOT NULL, due TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open','done'))
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      department TEXT NOT NULL, location TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled'
    );
    CREATE TABLE IF NOT EXISTS shift_swap_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
      shift_id TEXT REFERENCES shifts(id), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
      work_date TEXT NOT NULL, checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id,work_date)
    );
    CREATE TABLE IF NOT EXISTS crew_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crew_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL, category TEXT NOT NULL, summary TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '', entity_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, department TEXT NOT NULL,
      on_hand INTEGER NOT NULL, reorder_at INTEGER NOT NULL, unit TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, status TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Operations', description TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS staff_sailing_permissions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      manage_dining INTEGER NOT NULL DEFAULT 0 CHECK(manage_dining IN (0,1)),
      manage_sailing INTEGER NOT NULL DEFAULT 0 CHECK(manage_sailing IN (0,1)),
      view_jobs INTEGER NOT NULL DEFAULT 0 CHECK(view_jobs IN (0,1)),
      dispatch_faults INTEGER NOT NULL DEFAULT 0 CHECK(dispatch_faults IN (0,1)),
      scan_boarding INTEGER NOT NULL DEFAULT 0 CHECK(scan_boarding IN (0,1)),
      safety_response INTEGER NOT NULL DEFAULT 0 CHECK(safety_response IN (0,1)),
      updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id,cruise_id)
    );
    CREATE TABLE IF NOT EXISTS staff_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER NOT NULL REFERENCES users(id),
      staff_user_id INTEGER NOT NULL REFERENCES users(id), cruise_id TEXT NOT NULL REFERENCES cruises(id),
      details TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sailing_operations_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id INTEGER NOT NULL REFERENCES users(id),
      cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE, event_type TEXT NOT NULL,
      details TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS maintenance_job_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id), event_type TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS boarding_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      scanned_by INTEGER NOT NULL REFERENCES users(id), scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payment_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, provider_session_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT, expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS processed_payment_events (
      provider_event_id TEXT PRIMARY KEY, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS muster_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      name TEXT NOT NULL, location TEXT NOT NULL, deck_min INTEGER NOT NULL DEFAULT 1, deck_max INTEGER NOT NULL DEFAULT 20,
      capacity INTEGER NOT NULL DEFAULT 500, lead_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cruise_id,name)
    );
    CREATE TABLE IF NOT EXISTS muster_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK(event_type IN ('drill','emergency')), title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
      notes TEXT NOT NULL DEFAULT '', initiated_by INTEGER NOT NULL REFERENCES users(id),
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_muster_one_active_per_sailing ON muster_events(cruise_id) WHERE status='active';
    CREATE TABLE IF NOT EXISTS muster_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL REFERENCES muster_events(id) ON DELETE CASCADE,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, guest_number INTEGER NOT NULL,
      station_id INTEGER NOT NULL REFERENCES muster_stations(id), checked_by INTEGER NOT NULL REFERENCES users(id),
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(event_id,booking_id,guest_number)
    );
    CREATE TABLE IF NOT EXISTS maintenance_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      asset_tag TEXT NOT NULL, name TEXT NOT NULL, department TEXT NOT NULL, location TEXT NOT NULL,
      criticality TEXT NOT NULL DEFAULT 'Normal' CHECK(criticality IN ('Normal','Important','Critical')),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(cruise_id,asset_tag)
    );
    CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
      task TEXT NOT NULL, interval_days INTEGER NOT NULL, next_due_date TEXT NOT NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, active INTEGER NOT NULL DEFAULT 1,
      last_completed_at TEXT, created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS maintenance_schedule_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, schedule_id INTEGER NOT NULL REFERENCES maintenance_schedules(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id), event_type TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS port_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL, port_name TEXT NOT NULL, planned_arrival TEXT NOT NULL, planned_departure TEXT NOT NULL,
      actual_arrival TEXT, actual_departure TEXT,
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','approaching','alongside','departed','delayed','cancelled')),
      operations_note TEXT NOT NULL DEFAULT '', updated_by INTEGER NOT NULL REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(cruise_id,sequence)
    );
    CREATE TABLE IF NOT EXISTS sailing_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      port_call_id INTEGER REFERENCES port_calls(id) ON DELETE SET NULL, message TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS disruption_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      port_call_id INTEGER NOT NULL REFERENCES port_calls(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK(event_type IN ('delayed','cancelled')),
      summary TEXT NOT NULL, recovery_plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Approved')),
      created_by INTEGER NOT NULL REFERENCES users(id), approved_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, approved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS disruption_impacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL REFERENCES disruption_events(id) ON DELETE CASCADE,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, impacted_plans TEXT NOT NULL DEFAULT '[]',
      guest_choice TEXT NOT NULL DEFAULT 'pending' CHECK(guest_choice IN ('pending','alternative','no_help')),
      guest_choice_at TEXT, UNIQUE(event_id,booking_id)
    );
    CREATE TABLE IF NOT EXISTS disruption_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL REFERENCES disruption_events(id) ON DELETE CASCADE,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Accepted','In progress','Resolved')),
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id,booking_id)
    );
    CREATE TABLE IF NOT EXISTS disruption_task_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL REFERENCES disruption_tasks(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id), event_type TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS guest_service_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, cruise_id TEXT NOT NULL REFERENCES cruises(id) ON DELETE CASCADE,
      category TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'Normal',
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Accepted','In progress','Resolved')),
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS guest_service_case_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL REFERENCES guest_service_cases(id) ON DELETE CASCADE,
      actor_user_id INTEGER NOT NULL REFERENCES users(id), event_type TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS offline_action_receipts (
      action_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      route TEXT NOT NULL, response_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_crew_activity_user_time ON crew_activity_log(crew_user_id,created_at DESC);
  `);
  ensureUserRoleMigration(db);
  for (const [table,column,definition] of [
    ['cruises','date_start','TEXT'],['cruises','date_end','TEXT'],['cruises','status',"TEXT NOT NULL DEFAULT 'published'"],['cruises','created_by','INTEGER REFERENCES users(id)'],
    ['bookings','paid_at','TEXT'],
    ['payment_sessions','expires_at','INTEGER'],
    ['maintenance_tickets','cruise_id','TEXT REFERENCES cruises(id) ON DELETE SET NULL'],['maintenance_tickets','location',"TEXT NOT NULL DEFAULT 'Ship'"],
    ['maintenance_tickets','priority',"TEXT NOT NULL DEFAULT 'Medium'"],['maintenance_tickets','reported_by','INTEGER REFERENCES users(id)'],
    ['maintenance_tickets','accepted_by','INTEGER REFERENCES users(id)'],['maintenance_tickets','accepted_at','TEXT'],['maintenance_tickets','resolved_at','TEXT']
  ]) ensureColumn(db,table,column,definition);
  ensureColumn(db,'staff_sailing_permissions','safety_response','INTEGER NOT NULL DEFAULT 0 CHECK(safety_response IN (0,1))');
  ensureColumn(db,'onboard_reservations','booking_id','INTEGER REFERENCES bookings(id) ON DELETE SET NULL');
  ensureColumn(db,'onboard_reservations','cruise_id','TEXT REFERENCES cruises(id) ON DELETE SET NULL');
  ensureColumn(db,'onboard_reservations','plan_type',"TEXT NOT NULL DEFAULT 'onboard'");
  ensureColumn(db,'sailing_notices','booking_id','INTEGER REFERENCES bookings(id) ON DELETE CASCADE');
  db.exec(`UPDATE onboard_reservations SET booking_id=(SELECT b.id FROM bookings b WHERE b.user_id=onboard_reservations.user_id AND b.status IN ('confirmed_demo','confirmed_paid') ORDER BY b.id DESC LIMIT 1),
    cruise_id=(SELECT b.cruise_id FROM bookings b WHERE b.user_id=onboard_reservations.user_id AND b.status IN ('confirmed_demo','confirmed_paid') ORDER BY b.id DESC LIMIT 1),
    plan_type=CASE WHEN lower(title) LIKE '%shore%' OR lower(title) LIKE '%excursion%' THEN 'shore' ELSE 'onboard' END
    WHERE booking_id IS NULL`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_disruption_tasks_booking ON disruption_tasks(booking_id,status); CREATE INDEX IF NOT EXISTS idx_disruption_impacts_booking ON disruption_impacts(booking_id,event_id);');
  seed(db);
  seedDining(db);
  importCrewActivityHistory(db);
  return db;
}

function ensureColumn(db,table,column,definition){
  const columns=db.prepare(`PRAGMA table_info(${table})`).all();
  if(!columns.some(item=>item.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
function ensureUserRoleMigration(db){
  const sql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql||'';
  if(sql.includes("'captain'"))return;
  db.exec('PRAGMA foreign_keys=OFF');
  try{
    db.exec(`CREATE TABLE users_rebuilt (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('passenger','crew','captain','manager')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users_rebuilt(id,name,email,password_salt,password_hash,role,created_at)
      SELECT id,name,email,password_salt,password_hash,role,created_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_rebuilt RENAME TO users;`);
  }finally{db.exec('PRAGMA foreign_keys=ON');}
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function createUser(db, user) {
  const { salt, hash } = hashPassword(user.password);
  return db.prepare('INSERT INTO users(name,email,password_salt,password_hash,role) VALUES(?,?,?,?,?)')
    .run(user.name, user.email.toLowerCase(), salt, hash, user.role).lastInsertRowid;
}
function seed(db) {
  const insertCruise = db.prepare('INSERT OR IGNORE INTO cruises(id,name,region,route,days,base_fare,ship,date,art,description) VALUES(?,?,?,?,?,?,?,?,?,?)');
  for (const c of cruiseSeeds) insertCruise.run(c.id,c.name,c.region,c.route,c.days,c.base_fare,c.ship,c.date,c.art,c.description);
  const cabinCount = db.prepare('SELECT COUNT(*) AS n FROM cabins').get().n;
  if (!cabinCount) {
    const insert = db.prepare('INSERT INTO cabins(cruise_id,cabin_number,deck,category,price_delta,status) VALUES(?,?,?,?,?,?)');
    const unavailable = new Set([2,6,11,18,21]);
    for (const cruise of cruiseSeeds) for (let i=0;i<24;i++) {
      const category = ['Ocean view','Balcony','Interior'][i%3];
      const status = unavailable.has(i) ? 'service' : 'available';
      insert.run(cruise.id,String(8241+i),8,category,category==='Balcony'?150:0,status);
    }
  }
  const enableDemos = process.env.NODE_ENV !== 'production' && process.env.HARBORLINE_SEED_DEMOS !== 'false';
  let crewId, managerId, captainId;
  if (enableDemos) {
    for (const demo of demoAccounts) {
      const found = db.prepare('SELECT id FROM users WHERE email=?').get(demo.email);
      const id = found?.id || createUser(db, demo);
      if (demo.role==='crew') crewId=id;
      if (demo.role==='captain') captainId=id;
      if (demo.role==='manager') managerId=id;
    }
  }
  if(captainId&&!db.prepare('SELECT id FROM staff_access_log WHERE staff_user_id=? LIMIT 1').get(captainId)){
    const grant=db.prepare(`INSERT OR IGNORE INTO staff_sailing_permissions(user_id,cruise_id,manage_dining,manage_sailing,view_jobs,dispatch_faults,scan_boarding,safety_response)
      VALUES(?,?,1,1,1,1,1,1)`);
    for(const cruise of cruiseSeeds)grant.run(captainId,cruise.id);
    db.prepare('UPDATE staff_sailing_permissions SET safety_response=1 WHERE user_id=?').run(captainId);
  }
  if(captainId){
    const samplePort=db.prepare('INSERT OR IGNORE INTO port_calls(cruise_id,sequence,port_name,planned_arrival,planned_departure,updated_by) VALUES(?,?,?,?,?,?)');
    samplePort.run('c1',1,'Nassau','2026-10-20T08:00','2026-10-20T17:00',captainId);
    samplePort.run('c1',2,'Cozumel','2026-10-22T09:00','2026-10-22T18:00',captainId);
  }
  if(crewId&&!db.prepare('SELECT user_id FROM staff_sailing_permissions WHERE user_id=? LIMIT 1').get(crewId)&&!db.prepare('SELECT id FROM staff_access_log LIMIT 1').get())
    db.prepare('INSERT INTO staff_sailing_permissions(user_id,cruise_id,view_jobs,safety_response) VALUES(?,\'c1\',1,1)').run(crewId);
  if(crewId&&!db.prepare('SELECT id FROM staff_access_log WHERE staff_user_id=? LIMIT 1').get(crewId))
    db.prepare('UPDATE staff_sailing_permissions SET safety_response=1 WHERE user_id=? AND cruise_id=\'c1\' AND view_jobs=1').run(crewId);
  if (crewId) {
    const addTask = db.prepare('INSERT OR IGNORE INTO crew_tasks(id,user_id,title,department,due) VALUES(?,?,?,?,?)');
    [
      ['task-1','Cabin 8246 · final guest-ready check','Deck 8 · Housekeeping','10:30 AM'],
      ['task-2','Pool deck safety walkthrough','Deck 12 · Safety','11:00 AM'],
      ['task-3','Dining room briefing','Deck 5 · Guest services','12:15 PM'],
      ['task-4','Deliver requested towels and amenities','Decks 5–8 · Guest services','12:45 PM'],
      ['task-5','Inspect emergency exits and report obstructions','Deck 12 · Safety','1:15 PM'],
      ['task-6','Reconcile excursion guest manifest','Port desk · Nassau','1:45 PM'],
      ['task-7','Restock first-aid and housekeeping stations','Deck 5 · Guest services','2:15 PM'],
      ['task-8','Follow up on open guest requests','Guest services · Main desk','2:45 PM'],
      ['task-9','Check pool deck for slip hazards','Deck 12 · Deck services','3:15 PM'],
      ['task-10','Prepare evening shift handover notes','Deck 5 · Guest services','3:45 PM']
    ].forEach(([id,title,department,due])=>addTask.run(id,crewId,title,department,due));
    const addShift=db.prepare('INSERT OR IGNORE INTO shifts(id,user_id,title,department,location,starts_at,ends_at) VALUES(?,?,?,?,?,?,?)');
    [
      ['shift-1','Guest services · Main desk','Guest Services','Deck 5','08:00','16:00'],
      ['shift-2','Evening handover · Guest services','Guest Services','Deck 5','16:00','00:00'],
      ['shift-3','Port support · Nassau','Guest Services','Deck 3','10:00','18:00']
    ].forEach(([id,title,department,location,starts,ends])=>addShift.run(id,crewId,title,department,location,starts,ends));
  }
  const inventoryCount=db.prepare('SELECT COUNT(*) AS n FROM inventory_items').get().n;
  if(!inventoryCount){
    const add=db.prepare('INSERT INTO inventory_items(name,department,on_hand,reorder_at,unit) VALUES(?,?,?,?,?)');
    [['Fresh produce · 3 days','Galley',148,120,'kg'],['Cabin linen sets','Housekeeping',86,100,'sets'],['First aid kits','Medical',32,24,'kits'],['Pool towels','Deck services',210,180,'towels']].forEach(x=>add.run(...x));
  }
  // Faults are created by the captain or authorized staff in the bridge UI;
  // never pre-populate the job board with invented maintenance reports.
  db.prepare(`DELETE FROM maintenance_tickets WHERE
    (created_by IS NULL AND cruise_id IS NULL AND description='' AND title IN ('Cabin 1138 · HVAC check','Deck 9 · lighting','Galley · cold room sensor'))
    OR (title='Deck 9 · cold room temperature rising' AND status='Open' AND department='Engineering'
      AND description='Temperature is trending above the galley safe range. Check the refrigeration unit and log a reading.'
      AND cruise_id='c1' AND location='MV Solstice · Deck 9 · port-side cold room' AND priority='High'
      AND created_by=(SELECT id FROM users WHERE email='manager@harborline.test')
      AND reported_by=(SELECT id FROM users WHERE email='manager@harborline.test') AND accepted_by IS NULL)`);
}
function seedDining(db) {
  const batches=[['Early seating','5:30 PM'],['Second seating','7:30 PM'],['Late seating','9:30 PM']];
  const addBatch=db.prepare('INSERT OR IGNORE INTO dining_batches(cruise_id,name,starts_at,capacity) VALUES(?,?,?,48)');
  const getBatch=db.prepare('SELECT id FROM dining_batches WHERE cruise_id=? AND name=?');
  const addSeat=db.prepare("INSERT OR IGNORE INTO dining_seats(batch_id,seat_number,status) VALUES(?,?,'available')");
  for(const cruise of cruiseSeeds)for(const [name,time] of batches){
    addBatch.run(cruise.id,name,time);
    const batch=getBatch.get(cruise.id,name);
    for(let row=0;row<8;row++)for(let seat=1;seat<=6;seat++)addSeat.run(batch.id,`${String.fromCharCode(65+row)}${seat}`);
  }
}

function importCrewActivityHistory(db) {
  const tasks=db.prepare("SELECT t.id,t.user_id,t.title,t.status FROM crew_tasks t JOIN users u ON u.id=t.user_id WHERE u.role='crew'").all();
  for(const task of tasks){
    const entityId=`legacy-task:${task.id}`;
    if(db.prepare("SELECT id FROM crew_activity_log WHERE event_type='task_status_imported' AND entity_id=?").get(entityId))continue;
    logCrewActivity(db,{crewUserId:task.user_id,actorUserId:task.user_id,eventType:'task_status_imported',category:'Task history',summary:task.title,details:`Existing status: ${task.status==='done'?'Completed':'Open'}. The original status-change time was not stored.`,entityId});
  }
  const attendance=db.prepare("SELECT a.user_id,a.work_date,a.checked_in_at FROM attendance a JOIN users u ON u.id=a.user_id WHERE u.role='crew'").all();
  for(const record of attendance){
    const entityId=`attendance:${record.work_date}`;
    if(db.prepare("SELECT id FROM crew_activity_log WHERE event_type='shift_check_in' AND entity_id=?").get(entityId))continue;
    logCrewActivity(db,{crewUserId:record.user_id,actorUserId:record.user_id,eventType:'shift_check_in',category:'Attendance',summary:'Shift check-in recorded',details:`Imported from the attendance record · Work date ${record.work_date}`,entityId,createdAt:record.checked_in_at});
  }
  const feedback=db.prepare("SELECT f.id,f.user_id,f.type,f.title,f.message,f.created_at FROM feedback f JOIN users u ON u.id=f.user_id WHERE u.role='crew'").all();
  for(const record of feedback){
    const entityId=String(record.id);
    if(db.prepare("SELECT id FROM crew_activity_log WHERE event_type='feedback_submitted' AND entity_id=?").get(entityId))continue;
    logCrewActivity(db,{crewUserId:record.user_id,actorUserId:record.user_id,eventType:'feedback_submitted',category:'Feedback',summary:record.title,details:`${record.type} · ${record.message}`,entityId,createdAt:record.created_at});
  }
  const swaps=db.prepare("SELECT r.id,r.user_id,r.reason,r.created_at,s.title AS shift FROM shift_swap_requests r JOIN users u ON u.id=r.user_id LEFT JOIN shifts s ON s.id=r.shift_id WHERE u.role='crew'").all();
  for(const record of swaps){
    const entityId=String(record.id);
    if(db.prepare("SELECT id FROM crew_activity_log WHERE event_type='shift_swap_requested' AND entity_id=?").get(entityId))continue;
    logCrewActivity(db,{crewUserId:record.user_id,actorUserId:record.user_id,eventType:'shift_swap_requested',category:'Shift',summary:'Shift swap requested',details:`${record.shift||'Assigned shift'} · ${record.reason} · Imported from the existing request record`,entityId,createdAt:record.created_at});
  }
  const maintenance=db.prepare("SELECT m.id,m.created_by,m.title,m.department,m.description,m.created_at FROM maintenance_tickets m JOIN users u ON u.id=m.created_by WHERE u.role='crew'").all();
  for(const record of maintenance){
    const entityId=String(record.id);
    if(db.prepare("SELECT id FROM crew_activity_log WHERE event_type='maintenance_reported' AND entity_id=?").get(entityId))continue;
    logCrewActivity(db,{crewUserId:record.created_by,actorUserId:record.created_by,eventType:'maintenance_reported',category:'Equipment',summary:record.title,details:`${record.department}${record.description?` · ${record.description}`:''} · Imported from the existing maintenance record`,entityId,createdAt:record.created_at});
  }
}

function json(res, status, data, headers={}) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
function cookie(req,name) {
  const prefix=`${name}=`;
  for (const part of (req.headers.cookie||'').split(';')) {
    const token=part.trim(); if(token.startsWith(prefix)) return decodeURIComponent(token.slice(prefix.length));
  }
  return '';
}
function sessionCookie(token,maxAge) {
  const secure=process.env.NODE_ENV==='production'?'; Secure':'';
  return `harborline_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
async function readJson(req) {
  let raw='';
  for await (const chunk of req) {
    raw+=chunk;
    if(Buffer.byteLength(raw)>MAX_BODY) throw Object.assign(new Error('Request is too large.'),{status:413});
  }
  if(!raw)return {};
  try{return JSON.parse(raw);}catch{throw Object.assign(new Error('Request body must be valid JSON.'),{status:400});}
}
function publicUser(user) { return {id:user.id,name:user.name,email:user.email,role:user.role}; }
function logCrewActivity(db,{crewUserId,actorUserId,eventType,category,summary,details='',entityId=null,createdAt=null}) {
  if(createdAt){
    db.prepare('INSERT INTO crew_activity_log(crew_user_id,actor_user_id,event_type,category,summary,details,entity_id,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(crewUserId,actorUserId,eventType,category,summary,details,entityId===null?null:String(entityId),createdAt);
    return;
  }
  db.prepare('INSERT INTO crew_activity_log(crew_user_id,actor_user_id,event_type,category,summary,details,entity_id) VALUES(?,?,?,?,?,?,?)')
    .run(crewUserId,actorUserId,eventType,category,summary,details,entityId===null?null:String(entityId));
}
function withTransaction(db,operation) {
  db.exec('BEGIN IMMEDIATE');
  try{const result=operation();db.exec('COMMIT');return result;}
  catch(error){db.exec('ROLLBACK');throw error;}
}
function offlineReceipt(db,user,body,route){
  const actionId=String(body.clientActionId||'');
  if(!actionId)return null;
  if(!/^[a-f0-9-]{20,64}$/i.test(actionId))throw Object.assign(new Error('Offline action identifier is invalid.'),{status:400});
  const prior=db.prepare('SELECT user_id,route,response_json FROM offline_action_receipts WHERE action_id=?').get(actionId);
  if(!prior)return {actionId};
  if(Number(prior.user_id)!==Number(user.id)||prior.route!==route)throw Object.assign(new Error('This offline action identifier was already used.'),{status:409});
  return {actionId,replay:JSON.parse(prior.response_json)};
}
function saveOfflineReceipt(db,user,receipt,route,response){
  if(receipt?.actionId)db.prepare('INSERT INTO offline_action_receipts(action_id,user_id,route,response_json) VALUES(?,?,?,?)')
    .run(receipt.actionId,user.id,route,JSON.stringify(response));
}
function newSession(db,userId) {
  const token=crypto.randomBytes(32).toString('base64url');
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(tokenHash,userId,Date.now()+SESSION_MS);
  return token;
}
function getUser(db,req) {
  const token=cookie(req,'harborline_session'); if(!token)return null;
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const user=db.prepare('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash,Date.now());
  return user||null;
}
function requireRole(user,roles) {
  if(!user)throw Object.assign(new Error('Please sign in to continue.'),{status:401});
  if(roles&&!roles.includes(user.role))throw Object.assign(new Error('Your account does not have access to this area.'),{status:403});
}
function hasSailingPermission(db,user,cruiseId,permission){
  if(user?.role==='manager')return true;
  if(user?.role==='captain')return Boolean(db.prepare(`SELECT ${permission} AS allowed FROM staff_sailing_permissions WHERE user_id=? AND cruise_id=?`).get(user.id,cruiseId)?.allowed);
  return Boolean(db.prepare(`SELECT ${permission} AS allowed FROM staff_sailing_permissions WHERE user_id=? AND cruise_id=?`).get(user?.id,cruiseId)?.allowed);
}
function requireSailingPermission(db,user,cruiseId,permission,message='Your account is not authorized for this sailing.'){
  if(!hasSailingPermission(db,user,cruiseId,permission))throw Object.assign(new Error(message),{status:403});
}
function requireSameOrigin(req) {
  const origin=req.headers.origin;
  if(!origin)return;
  const host=req.headers.host;
  try{if(new URL(origin).host!==host)throw Object.assign(new Error('Request origin was rejected.'),{status:403});}
  catch(e){if(e.status)throw e;throw Object.assign(new Error('Request origin was rejected.'),{status:403});}
}
async function readRaw(req){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('Request is too large.'),{status:413});chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function stripeRequest(path,params,secret=process.env.STRIPE_SECRET_KEY){
  const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:params?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:params?.toString()});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.error?.message||'The payment service could not complete the request.'),{status:502});
  return data;
}
function verifyStripeSignature(raw,header,secret){
  if(!secret||!header)return false;
  const parts=Object.fromEntries(String(header).split(',').map(item=>item.split('=',2)));
  const stamp=Number(parts.t),signature=parts.v1;
  if(!Number.isInteger(stamp)||!signature||Math.abs(Date.now()/1000-stamp)>300)return false;
  const expected=crypto.createHmac('sha256',secret).update(`${stamp}.`).update(raw).digest();
  let received;try{received=Buffer.from(signature,'hex');}catch{return false;}
  return received.length===expected.length&&crypto.timingSafeEqual(received,expected);
}
function cleanupExpiredPayments(db){
  const expired=db.prepare(`SELECT ps.booking_id,b.cabin_id FROM payment_sessions ps JOIN bookings b ON b.id=ps.booking_id
    WHERE ps.status='pending' AND ps.expires_at IS NOT NULL AND ps.expires_at<?`).all(Date.now());
  if(!expired.length)return;
  withTransaction(db,()=>{
    for(const item of expired){db.prepare("UPDATE payment_sessions SET status='expired' WHERE booking_id=? AND status='pending'").run(item.booking_id);
      db.prepare("UPDATE bookings SET status='payment_expired' WHERE id=? AND status='pending_payment'").run(item.booking_id);
      db.prepare("UPDATE cabins SET status='available' WHERE id=? AND status='booked'").run(item.cabin_id);}
  });
}
function settleStripePayment(db,session){
  const bookingId=Number(session?.metadata?.booking_id),booking=db.prepare(`SELECT b.id,b.total,b.status,ps.provider_session_id FROM bookings b
    JOIN payment_sessions ps ON ps.booking_id=b.id WHERE b.id=?`).get(bookingId);
  if(!booking||!['pending_payment','confirmed_paid'].includes(booking.status)||booking.provider_session_id!==session.id||session.mode!=='payment'||session.currency!=='usd'||session.payment_status!=='paid'||Number(session.amount_total)!==Number(booking.total)*100||String(session.metadata?.booking_id)!==String(bookingId))return false;
  withTransaction(db,()=>{
    if(booking.status==='pending_payment')db.prepare("UPDATE bookings SET status='confirmed_paid',paid_at=CURRENT_TIMESTAMP WHERE id=?").run(booking.id);
    db.prepare("UPDATE payment_sessions SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE booking_id=? AND provider_session_id=?").run(booking.id,session.id);
  });
  return true;
}

function createHarborlineServer({dbPath=DB_FILE,publicRoot=ROOT}={}) {
  const db=dbInit(dbPath);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    try {
      if(pathname==='/api/payments/stripe-webhook'&&req.method==='POST'){
        if(!process.env.STRIPE_WEBHOOK_SECRET)return json(res,503,{error:'Stripe webhook signing secret is not configured.'});
        const raw=await readRaw(req);
        if(!verifyStripeSignature(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET))return json(res,400,{error:'Stripe signature was not valid.'});
        let event;try{event=JSON.parse(raw.toString('utf8'));}catch{return json(res,400,{error:'Stripe event body was invalid.'});}
        if(!event.id||!event.type)return json(res,400,{error:'Stripe event was incomplete.'});
        if(db.prepare('SELECT provider_event_id FROM processed_payment_events WHERE provider_event_id=?').get(event.id))return json(res,200,{received:true});
        const stripeSession=event.data?.object;
        withTransaction(db,()=>{
          db.prepare('INSERT INTO processed_payment_events(provider_event_id) VALUES(?)').run(event.id);
          if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&stripeSession?.payment_status==='paid'){
            const bookingId=Number(stripeSession.metadata?.booking_id);
            const booking=db.prepare(`SELECT b.id,b.total,b.status,ps.provider_session_id FROM bookings b JOIN payment_sessions ps ON ps.booking_id=b.id
              WHERE b.id=?`).get(bookingId);
            if(booking&&booking.provider_session_id===stripeSession.id&&['pending_payment','confirmed_paid'].includes(booking.status)&&stripeSession.mode==='payment'&&stripeSession.currency==='usd'&&Number(stripeSession.amount_total)===Number(booking.total)*100){
              if(booking.status==='pending_payment')db.prepare("UPDATE bookings SET status='confirmed_paid',paid_at=CURRENT_TIMESTAMP WHERE id=?").run(booking.id);
              db.prepare("UPDATE payment_sessions SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE booking_id=?").run(booking.id);
            }
          }
          if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
            const bookingId=Number(stripeSession?.metadata?.booking_id);
            const booking=db.prepare(`SELECT b.id,b.cabin_id,b.status,ps.provider_session_id FROM bookings b JOIN payment_sessions ps ON ps.booking_id=b.id WHERE b.id=?`).get(bookingId);
            if(booking&&booking.provider_session_id===stripeSession?.id&&booking.status==='pending_payment'){
              const expired=event.type==='checkout.session.expired';
              db.prepare('UPDATE payment_sessions SET status=? WHERE booking_id=?').run(expired?'expired':'failed',booking.id);
              db.prepare('UPDATE bookings SET status=? WHERE id=?').run(expired?'payment_expired':'payment_failed',booking.id);
              db.prepare("UPDATE cabins SET status='available' WHERE id=? AND status='booked'").run(booking.cabin_id);
            }
          }
        });
        return json(res,200,{received:true});
      }
      if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,service:'harborline-api'});
      if(pathname==='/api/cruises'&&req.method==='GET'){
        cleanupExpiredPayments(db);
        const rows=db.prepare(`SELECT c.*, COUNT(CASE WHEN b.status='available' THEN 1 END) AS available_cabins
          FROM cruises c LEFT JOIN cabins b ON b.cruise_id=c.id WHERE c.status='published' GROUP BY c.id ORDER BY c.date_start,c.id`).all();
        return json(res,200,rows.map(({base_fare,...c})=>({...c,from:base_fare,tags:[]})));
      }
      if(pathname==='/api/auth/register'&&req.method==='POST'){
        requireSameOrigin(req);const body=await readJson(req);
        const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
        if(name.length<2||name.length>80)throw Object.assign(new Error('Enter your name (2–80 characters).'),{status:400});
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Object.assign(new Error('Enter a valid email address.'),{status:400});
        if(password.length<10||password.length>128)throw Object.assign(new Error('Use a password with at least 10 characters.'),{status:400});
        if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw Object.assign(new Error('An account with this email already exists.'),{status:409});
        let userId;
        try{userId=createUser(db,{name,email,password,role:'passenger'});}catch(e){if(String(e.message).includes('UNIQUE'))throw Object.assign(new Error('An account with this email already exists.'),{status:409});throw e;}
        const user=db.prepare('SELECT id,name,email,role FROM users WHERE id=?').get(userId);
        const token=newSession(db,userId);
        return json(res,201,{user:publicUser(user)},{'Set-Cookie':sessionCookie(token,SESSION_MS/1000)});
      }
      if(pathname==='/api/auth/login'&&req.method==='POST'){
        requireSameOrigin(req);const body=await readJson(req);
        const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
        const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const probe=hashPassword(password,row?.password_salt||'harborline-invalid-salt');
        const valid=Boolean(row&&crypto.timingSafeEqual(Buffer.from(probe.hash,'hex'),Buffer.from(row.password_hash,'hex')));
        if(!valid)throw Object.assign(new Error('Email or password is incorrect.'),{status:401});
        const token=newSession(db,row.id);
        return json(res,200,{user:publicUser(row)},{'Set-Cookie':sessionCookie(token,SESSION_MS/1000)});
      }
      if(pathname==='/api/auth/logout'&&req.method==='POST'){
        requireSameOrigin(req);const token=cookie(req,'harborline_session');
        if(token){const h=crypto.createHash('sha256').update(token).digest('hex');db.prepare('DELETE FROM sessions WHERE token_hash=?').run(h);}
        return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)});
      }

      const user=getUser(db,req);
      if(pathname==='/api/me'&&req.method==='GET'){
        if(!user)return json(res,401,{error:'Please sign in to continue.'});
        return json(res,200,{user:publicUser(user)});
      }
      const publicResetRoute=pathname==='/api/auth/reset-request'||pathname==='/api/auth/reset';
      if(pathname.startsWith('/api/')&&!publicResetRoute)requireRole(user);
      if(pathname==='/api/payments/config'&&req.method==='GET')
        return json(res,200,{provider:process.env.STRIPE_SECRET_KEY?'stripe':'demo',webhookReady:Boolean(process.env.STRIPE_WEBHOOK_SECRET)});
      if(pathname==='/api/sailing/setup'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const sailings=db.prepare('SELECT id,name,region,route,days,base_fare AS fare,ship,date,date_start,date_end FROM cruises ORDER BY date_start,id').all()
          .filter(cruise=>hasSailingPermission(db,user,cruise.id,'manage_sailing'))
          .map(cruise=>{
            const cabins=db.prepare("SELECT COUNT(*) AS total,SUM(status='available') AS available,SUM(status='booked') AS booked,SUM(status='service') AS service FROM cabins WHERE cruise_id=?").get(cruise.id);
            const batches=db.prepare(`SELECT b.id,b.name,b.starts_at,b.capacity,COUNT(s.id) AS seat_count,
              SUM(CASE WHEN s.status='blocked' THEN 1 ELSE 0 END) AS blocked FROM dining_batches b LEFT JOIN dining_seats s ON s.batch_id=b.id
              WHERE b.cruise_id=? GROUP BY b.id ORDER BY b.id`).all(cruise.id);
            return {...cruise,cabins,batches};
          });
        const log=sailings.length?db.prepare(`SELECT l.id,l.cruise_id,l.event_type,l.details,l.created_at,u.name AS actor_name,c.name AS cruise_name
          FROM sailing_operations_log l JOIN users u ON u.id=l.actor_user_id JOIN cruises c ON c.id=l.cruise_id
          WHERE l.cruise_id IN (${sailings.map(()=>'?').join(',')}) ORDER BY l.id DESC LIMIT 80`).all(...sailings.map(item=>item.id)):[];
        return json(res,200,{sailings,log});
      }
      if(pathname==='/api/payments/stripe/confirm'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);
        if(!process.env.STRIPE_SECRET_KEY)throw Object.assign(new Error('The payment provider is not configured.'),{status:503});
        const body=await readJson(req),sessionId=String(body.sessionId||'');
        if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))throw Object.assign(new Error('The payment return link is invalid.'),{status:400});
        const owner=db.prepare(`SELECT b.id,b.status FROM bookings b JOIN payment_sessions ps ON ps.booking_id=b.id
          WHERE ps.provider_session_id=? AND b.user_id=?`).get(sessionId,user.id);
        if(!owner)throw Object.assign(new Error('No booking matches that payment session.'),{status:404});
        const stripeSession=await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`);
        const paid=settleStripePayment(db,stripeSession);
        const refreshed=db.prepare('SELECT status,paid_at FROM bookings WHERE id=?').get(owner.id);
        return json(res,200,{status:refreshed.status,paid:Boolean(paid||refreshed.status==='confirmed_paid'),paidAt:refreshed.paid_at});
      }

      if(pathname==='/api/cruises'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['manager','captain']);const body=await readJson(req);
        const name=String(body.name||'').trim().slice(0,100),ship=String(body.ship||'').trim().slice(0,80);
        const region=String(body.region||'').trim().slice(0,60),route=String(body.route||'').trim().slice(0,250);
        const dateStart=String(body.dateStart||''),dateEnd=String(body.dateEnd||''),baseFare=Number(body.baseFare),cabinCount=Number(body.cabinCount);
        const start=Date.parse(`${dateStart}T00:00:00Z`),end=Date.parse(`${dateEnd}T00:00:00Z`);
        if(name.length<3||ship.length<2||!region||route.length<5||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)
          throw Object.assign(new Error('Enter the sailing name, ship, route, and valid departure and return dates.'),{status:400});
        if(!Number.isInteger(baseFare)||baseFare<1||baseFare>100000||!Number.isInteger(cabinCount)||cabinCount<1||cabinCount>500)
          throw Object.assign(new Error('Fare must be a whole dollar amount and cabin inventory must be between 1 and 500.'),{status:400});
        const batches=Array.isArray(body.batches)?body.batches:[];
        if(!batches.length||batches.length>8||batches.some(batch=>!String(batch.name||'').trim()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(batch.startsAt||''))||!Number.isInteger(Number(batch.seatCount))||Number(batch.seatCount)<1||Number(batch.seatCount)>250))
          throw Object.assign(new Error('Add 1–8 dining batches, each with a name, time, and 1–250 seats.'),{status:400});
        const cruiseId=`s-${crypto.randomUUID()}`;
        const days=Math.ceil((end-start)/86400000);
        const dateLabel=`${new Date(start).toLocaleDateString('en-US',{month:'short',day:'2-digit',timeZone:'UTC'})} – ${new Date(end).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'})}`;
        withTransaction(db,()=>{
          db.prepare(`INSERT INTO cruises(id,name,region,route,days,base_fare,ship,date,art,description,date_start,date_end,status,created_by)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'published',?)`).run(cruiseId,name,region,route,days,baseFare,ship,dateLabel,'caribbean',`${name} aboard ${ship}.`,dateStart,dateEnd,user.id);
          const addCabin=db.prepare('INSERT INTO cabins(cruise_id,cabin_number,deck,category,price_delta,status) VALUES(?,?,?,?,0,\'available\')');
          for(let i=0;i<cabinCount;i++)addCabin.run(cruiseId,String(1001+i),Math.floor(i/50)+1,['Interior','Ocean view','Balcony'][i%3]);
          const addBatch=db.prepare('INSERT INTO dining_batches(cruise_id,name,starts_at,capacity) VALUES(?,?,?,?)');
          const addSeat=db.prepare("INSERT INTO dining_seats(batch_id,seat_number,status) VALUES(?,?,'available')");
          for(const batch of batches){
            const seatCount=Number(batch.seatCount),[hour,minute]=String(batch.startsAt).split(':').map(Number);
            const timeLabel=new Date(Date.UTC(2020,0,1,hour,minute)).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'});
            const batchId=Number(addBatch.run(cruiseId,String(batch.name).trim().slice(0,60),timeLabel,seatCount).lastInsertRowid);
            for(let i=0;i<seatCount;i++)addSeat.run(batchId,`S${String(i+1).padStart(3,'0')}`);
          }
          if(user.role==='captain'){
            db.prepare(`INSERT INTO staff_sailing_permissions(user_id,cruise_id,manage_dining,manage_sailing,view_jobs,dispatch_faults,scan_boarding,updated_by)
              VALUES(?,?,1,1,1,1,1,?)`).run(user.id,cruiseId,user.id);
            db.prepare('INSERT INTO staff_access_log(actor_user_id,staff_user_id,cruise_id,details) VALUES(?,?,?,?)')
              .run(user.id,user.id,cruiseId,'Captain’s bridge access for the new sailing');
          }
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,cruiseId,'sailing_created',`Created ${name} · ${dateLabel} · ${cabinCount} cabins · ${batches.length} dining batches`);
        });
        const cruise=db.prepare('SELECT id,name,region,route,days,base_fare AS \"from\",ship,date,date_start,date_end FROM cruises WHERE id=?').get(cruiseId);
        return json(res,201,{cruise,inventory:{cabins:cabinCount,diningBatches:batches.length,diningSeats:batches.reduce((sum,b)=>sum+Number(b.seatCount),0)}});
      }
      if(pathname==='/api/staff/access'&&req.method==='GET'){
        requireRole(user,['manager']);
        const staff=db.prepare("SELECT id,name,email,role FROM users WHERE role IN ('crew','captain') ORDER BY role,name").all();
        const sailings=db.prepare('SELECT id,name,ship,date FROM cruises ORDER BY date_start,id').all();
        const grants=db.prepare('SELECT user_id,cruise_id,manage_dining,manage_sailing,view_jobs,dispatch_faults,scan_boarding,safety_response FROM staff_sailing_permissions').all();
        const log=db.prepare(`SELECT l.id,l.details,l.created_at,a.name AS actor_name,u.name AS staff_name,c.name AS cruise_name
          FROM staff_access_log l JOIN users a ON a.id=l.actor_user_id JOIN users u ON u.id=l.staff_user_id JOIN cruises c ON c.id=l.cruise_id
          ORDER BY l.id DESC LIMIT 30`).all();
        return json(res,200,{staff,sailings,grants,log});
      }
      if(pathname==='/api/staff/access'&&req.method==='PUT'){
        requireSameOrigin(req);requireRole(user,['manager']);const body=await readJson(req);
        const staffId=Number(body.userId),cruiseId=String(body.cruiseId||''),permissions=body.permissions||{};
        const staff=db.prepare("SELECT id,name FROM users WHERE id=? AND role IN ('crew','captain')").get(staffId),cruise=db.prepare('SELECT id,name FROM cruises WHERE id=?').get(cruiseId);
        if(!staff||!cruise)throw Object.assign(new Error('Choose an onboard staff account and sailing.'),{status:400});
        const keys=['manage_dining','manage_sailing','view_jobs','dispatch_faults','scan_boarding','safety_response'];
        const values=keys.map(key=>permissions[key]?1:0),labels=['Dining controls','Sailing controls','Crew job board','Fault dispatch','Boarding scan','Muster response'];
        const enabled=keys.filter((key,index)=>values[index]).map(key=>labels[keys.indexOf(key)]);
        withTransaction(db,()=>{
          if(values.some(Boolean))db.prepare(`INSERT INTO staff_sailing_permissions(user_id,cruise_id,manage_dining,manage_sailing,view_jobs,dispatch_faults,scan_boarding,safety_response,updated_by,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,cruise_id) DO UPDATE SET manage_dining=excluded.manage_dining,manage_sailing=excluded.manage_sailing,
            view_jobs=excluded.view_jobs,dispatch_faults=excluded.dispatch_faults,scan_boarding=excluded.scan_boarding,safety_response=excluded.safety_response,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
            .run(staffId,cruiseId,...values,user.id);
          else db.prepare('DELETE FROM staff_sailing_permissions WHERE user_id=? AND cruise_id=?').run(staffId,cruiseId);
          db.prepare('INSERT INTO staff_access_log(actor_user_id,staff_user_id,cruise_id,details) VALUES(?,?,?,?)')
            .run(user.id,staffId,cruiseId,enabled.length?`Granted: ${enabled.join(', ')}`:'All sailing access removed');
        });
        return json(res,200,{ok:true,permissions:values,updatedBy:user.name});
      }
      if(pathname==='/api/staff/my-access'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const rows=user.role==='manager'?db.prepare('SELECT id AS cruise_id,name,ship,date,1 AS manage_dining,1 AS manage_sailing,1 AS view_jobs,1 AS dispatch_faults,1 AS scan_boarding,1 AS safety_response FROM cruises ORDER BY date_start,id').all():
          db.prepare(`SELECT c.id AS cruise_id,c.name,c.ship,c.date,p.manage_dining,p.manage_sailing,p.view_jobs,p.dispatch_faults,p.scan_boarding,p.safety_response
            FROM staff_sailing_permissions p JOIN cruises c ON c.id=p.cruise_id WHERE p.user_id=? ORDER BY c.date_start,c.id`).all(user.id);
        return json(res,200,rows);
      }
      const cruiseManageMatch=pathname.match(/^\/api\/cruises\/([a-zA-Z0-9_-]+)$/);
      if(cruiseManageMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),cruiseId=cruiseManageMatch[1];
        requireSailingPermission(db,user,cruiseId,'manage_sailing','You cannot edit this sailing.');
        const name=String(body.name||'').trim().slice(0,100),ship=String(body.ship||'').trim().slice(0,80),region=String(body.region||'').trim().slice(0,60),route=String(body.route||'').trim().slice(0,250);
        const dateStart=String(body.dateStart||''),dateEnd=String(body.dateEnd||''),baseFare=Number(body.baseFare),start=Date.parse(`${dateStart}T00:00:00Z`),end=Date.parse(`${dateEnd}T00:00:00Z`);
        if(name.length<3||ship.length<2||!region||route.length<5||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isInteger(baseFare)||baseFare<1)
          throw Object.assign(new Error('Enter valid sailing details and dates.'),{status:400});
        const dateLabel=`${new Date(start).toLocaleDateString('en-US',{month:'short',day:'2-digit',timeZone:'UTC'})} – ${new Date(end).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'})}`;
        const before=db.prepare('SELECT name,date,base_fare FROM cruises WHERE id=?').get(cruiseId);
        if(!before)throw Object.assign(new Error('Sailing not found.'),{status:404});
        withTransaction(db,()=>{
          db.prepare('UPDATE cruises SET name=?,ship=?,region=?,route=?,days=?,base_fare=?,date=?,date_start=?,date_end=? WHERE id=?')
            .run(name,ship,region,route,Math.ceil((end-start)/86400000),baseFare,dateLabel,dateStart,dateEnd,cruiseId);
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,cruiseId,'sailing_updated',`${before.name} · ${before.date} · updated route, dates, ship, region, or fare · new dates ${dateLabel}`);
        });
        return json(res,200,{ok:true});
      }
      const cruiseBatchMatch=pathname.match(/^\/api\/cruises\/([a-zA-Z0-9_-]+)\/dining-batches$/);
      if(cruiseBatchMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),cruiseId=cruiseBatchMatch[1];
        requireSailingPermission(db,user,cruiseId,'manage_sailing','You cannot configure dining batches on this sailing.');
        const name=String(body.name||'').trim().slice(0,60),startsAt=String(body.startsAt||''),seatCount=Number(body.seatCount),[hour,minute]=startsAt.split(':').map(Number);
        if(name.length<2||!/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt)||!Number.isInteger(seatCount)||seatCount<1||seatCount>250)
          throw Object.assign(new Error('Enter a batch name, start time, and 1–250 seats.'),{status:400});
        const timeLabel=new Date(Date.UTC(2020,0,1,hour,minute)).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'});
        const created=withTransaction(db,()=>{
          const batch=Number(db.prepare('INSERT INTO dining_batches(cruise_id,name,starts_at,capacity) VALUES(?,?,?,?)').run(cruiseId,name,timeLabel,seatCount).lastInsertRowid);
          const addSeat=db.prepare("INSERT INTO dining_seats(batch_id,seat_number,status) VALUES(?,?,'available')");
          for(let i=0;i<seatCount;i++)addSeat.run(batch,`S${String(i+1).padStart(3,'0')}`);
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,cruiseId,'dining_batch_added',`Added ${name} at ${timeLabel} · ${seatCount} seats`);
          return batch;
        });
        return json(res,201,{id:created,name,starts_at:timeLabel,capacity:seatCount,seat_count:seatCount});
      }
      const cabinInventoryMatch=pathname.match(/^\/api\/cruises\/([a-zA-Z0-9_-]+)\/inventory$/);
      if(cabinInventoryMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),cruiseId=cabinInventoryMatch[1],target=Number(body.cabinCount);
        requireSailingPermission(db,user,cruiseId,'manage_sailing','You cannot change inventory on this sailing.');
        if(!Number.isInteger(target)||target<1||target>500)throw Object.assign(new Error('Cabin inventory must be between 1 and 500.'),{status:400});
        const existing=db.prepare("SELECT COUNT(*) AS total,SUM(status<>'available') AS occupied,MAX(CAST(cabin_number AS INTEGER)) AS max_number FROM cabins WHERE cruise_id=?").get(cruiseId);
        if(!existing.total)throw Object.assign(new Error('Sailing not found.'),{status:404});
        if(target<existing.occupied)throw Object.assign(new Error(`At least ${existing.occupied} cabins are already booked or blocked.`),{status:409});
        withTransaction(db,()=>{
          if(target<existing.total){
            const remove=existing.total-target;
            db.prepare('DELETE FROM cabins WHERE id IN (SELECT id FROM cabins WHERE cruise_id=? AND status=\'available\' ORDER BY CAST(cabin_number AS INTEGER) DESC LIMIT ?)').run(cruiseId,remove);
          }else if(target>existing.total){
            const add=db.prepare("INSERT INTO cabins(cruise_id,cabin_number,deck,category,price_delta,status) VALUES(?,?,?,?,0,'available')");
            for(let i=1;i<=target-existing.total;i++){const n=Number(existing.max_number||1000)+i;add.run(cruiseId,String(n),Math.floor((n-1001)/50)+1,['Interior','Ocean view','Balcony'][n%3]);}
          }
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,cruiseId,'cabin_inventory_changed',`Cabin inventory adjusted from ${existing.total} to ${target}`);
        });
        return json(res,200,{ok:true,cabinCount:target});
      }

      if(pathname==='/api/bookings'&&req.method==='GET'){
        requireRole(user,['passenger']);
        cleanupExpiredPayments(db);
        const rows=db.prepare(`SELECT b.id,b.reference,b.guests,b.total,b.status,b.created_at,b.checked_in_at,
          COALESCE((SELECT COUNT(*) FROM dining_reservations dr JOIN dining_reservation_seats ds ON ds.reservation_id=dr.id WHERE dr.booking_id=b.id),0) AS dining_reserved_guests,
          c.id AS cruise_id,c.name,c.region,c.route,c.days,c.ship,c.date,ca.cabin_number,ca.deck,ca.category
          FROM bookings b JOIN cruises c ON c.id=b.cruise_id JOIN cabins ca ON ca.id=b.cabin_id
          WHERE b.user_id=? ORDER BY b.id DESC`).all(user.id);
        return json(res,200,rows);
      }
      const diningMatch=pathname.match(/^\/api\/bookings\/(\d+)\/dining$/);
      if(diningMatch&&req.method==='GET'){
        requireRole(user,['passenger']);
        const booking=db.prepare(`SELECT b.id,b.reference,b.guests,b.status,c.id AS cruise_id,c.name AS cruise_name,c.ship,c.date
          FROM bookings b JOIN cruises c ON c.id=b.cruise_id WHERE b.id=? AND b.user_id=? AND b.status IN ('confirmed_demo','confirmed_paid')`)
          .get(Number(diningMatch[1]),user.id);
        if(!booking)throw Object.assign(new Error('Active booking not found.'),{status:404});
        const reservation=db.prepare('SELECT id,guests,updated_at FROM dining_reservations WHERE booking_id=? AND user_id=?').get(booking.id,user.id);
        const batches=db.prepare('SELECT id,name,starts_at,capacity FROM dining_batches WHERE cruise_id=? ORDER BY id').all(booking.cruise_id);
        const seatsByBatch=batches.map(batch=>{
          const seats=db.prepare(`SELECT s.id,s.seat_number,
            CASE WHEN s.status='blocked' THEN 'blocked' WHEN mine.guest_number IS NOT NULL THEN 'selected'
              WHEN EXISTS(SELECT 1 FROM dining_reservation_seats taken WHERE taken.seat_id=s.id AND taken.reservation_id<>?) THEN 'booked'
              ELSE 'available' END AS status,mine.guest_number
            FROM dining_seats s LEFT JOIN dining_reservation_seats mine ON mine.seat_id=s.id AND mine.reservation_id=?
            WHERE s.batch_id=? ORDER BY s.seat_number`).all(reservation?.id||0,reservation?.id||0,batch.id);
          const bookedOthers=db.prepare(`SELECT COUNT(*) AS n FROM dining_reservation_seats rs JOIN dining_seats s ON s.id=rs.seat_id
            WHERE s.batch_id=? AND rs.reservation_id<>?`).get(batch.id,reservation?.id||0).n;
          const remainingCapacity=Math.max(0,Number(batch.capacity)-Number(bookedOthers));
          const selectableSeats=seats.filter(seat=>seat.status==='available'||seat.status==='selected').length;
          const remaining=Math.min(remainingCapacity,selectableSeats);
          if(!remainingCapacity)for(const seat of seats)if(seat.status==='available')seat.status='full';
          return {...batch,remaining,seats};
        });
        const assignments=reservation?db.prepare(`SELECT rs.guest_number,rs.seat_id,s.seat_number,b.id AS batch_id,b.name AS batch_name,b.starts_at
          FROM dining_reservation_seats rs JOIN dining_seats s ON s.id=rs.seat_id JOIN dining_batches b ON b.id=s.batch_id
          WHERE rs.reservation_id=? ORDER BY rs.guest_number`).all(reservation.id):[];
        return json(res,200,{booking,reservation:reservation||null,assignments,batches:seatsByBatch});
      }
      if(diningMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);const body=await readJson(req);
        const assignments=body.assignments;
        if(!Array.isArray(assignments)||assignments.length<1||assignments.length>6)
          throw Object.assign(new Error('Choose a seat for every guest on the ticket.'),{status:400});
        const cleaned=assignments.map(item=>({guestNumber:Number(item?.guestNumber),batchId:Number(item?.batchId),seatId:Number(item?.seatId)}));
        if(cleaned.some(item=>!Number.isInteger(item.guestNumber)||!Number.isInteger(item.batchId)||!Number.isInteger(item.seatId))||
          new Set(cleaned.map(item=>item.guestNumber)).size!==cleaned.length||new Set(cleaned.map(item=>item.seatId)).size!==cleaned.length)
          throw Object.assign(new Error('Each guest needs a different seat.'),{status:400});
        const result=withTransaction(db,()=>{
          const booking=db.prepare("SELECT id,reference,guests,cruise_id FROM bookings WHERE id=? AND user_id=? AND status IN ('confirmed_demo','confirmed_paid')")
            .get(Number(diningMatch[1]),user.id);
          if(!booking)throw Object.assign(new Error('Active booking not found.'),{status:404});
          if(cleaned.length!==booking.guests||cleaned.some(item=>item.guestNumber<1||item.guestNumber>booking.guests)||
            new Set(cleaned.map(item=>item.guestNumber)).size!==booking.guests||
            Array.from({length:booking.guests},(_,i)=>i+1).some(n=>!cleaned.some(item=>item.guestNumber===n)))
            throw Object.assign(new Error(`Assign exactly ${booking.guests} seats, one for each ticketed guest.`),{status:400});
          const existing=db.prepare('SELECT id FROM dining_reservations WHERE booking_id=?').get(booking.id);
          if(existing)db.prepare('DELETE FROM dining_reservation_seats WHERE reservation_id=?').run(existing.id);
          for(const item of cleaned){
            const seat=db.prepare(`SELECT s.id,s.status,b.cruise_id FROM dining_seats s JOIN dining_batches b ON b.id=s.batch_id
              WHERE s.id=? AND b.id=?`).get(item.seatId,item.batchId);
            if(!seat||seat.cruise_id!==booking.cruise_id)throw Object.assign(new Error('That seat is not part of this sailing.'),{status:400});
            if(seat.status==='blocked')throw Object.assign(new Error('That seat is blocked. Choose another seat.'),{status:409});
            if(db.prepare('SELECT id FROM dining_reservation_seats WHERE seat_id=?').get(item.seatId))
              throw Object.assign(new Error('That seat was just taken. Choose another available seat.'),{status:409});
          }
          const batchAssignments=new Map();for(const item of cleaned)batchAssignments.set(item.batchId,(batchAssignments.get(item.batchId)||0)+1);
          for(const [batchId,count] of batchAssignments){
            const batch=db.prepare('SELECT capacity,name FROM dining_batches WHERE id=? AND cruise_id=?').get(batchId,booking.cruise_id);
            const booked=db.prepare(`SELECT COUNT(*) AS n FROM dining_reservation_seats rs JOIN dining_seats s ON s.id=rs.seat_id
              WHERE s.batch_id=?`).get(batchId).n;
            if(booked+count>Number(batch.capacity))throw Object.assign(new Error(`${batch.name} only has ${Math.max(0,Number(batch.capacity)-booked)} ticketed seat${Number(batch.capacity)-booked===1?'':'s'} left. Choose another batch.`),{status:409});
          }
          let reservationId;
          if(existing){
            reservationId=existing.id;
            db.prepare("UPDATE dining_reservations SET guests=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(booking.guests,reservationId);
          }else{
            reservationId=Number(db.prepare('INSERT INTO dining_reservations(booking_id,user_id,cruise_id,guests) VALUES(?,?,?,?)')
              .run(booking.id,user.id,booking.cruise_id,booking.guests).lastInsertRowid);
          }
          const add=db.prepare('INSERT INTO dining_reservation_seats(reservation_id,guest_number,seat_id) VALUES(?,?,?)');
          for(const item of cleaned)add.run(reservationId,item.guestNumber,item.seatId);
          return {bookingReference:booking.reference,guestCount:booking.guests,reservationId};
        });
        return json(res,200,{saved:true,...result});
      }
      const passengerCheckinMatch=pathname.match(/^\/api\/bookings\/(\d+)\/check-in$/);
      if(passengerCheckinMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);
        const result=db.prepare("UPDATE bookings SET checked_in_at=COALESCE(checked_in_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=? AND status IN ('confirmed_demo','confirmed_paid')").run(Number(passengerCheckinMatch[1]),user.id);
        if(!result.changes)throw Object.assign(new Error('Active booking not found.'),{status:404});
        const record=db.prepare('SELECT checked_in_at FROM bookings WHERE id=? AND user_id=?').get(Number(passengerCheckinMatch[1]),user.id);
        return json(res,200,{checkedIn:true,...record});
      }
      if(pathname==='/api/boarding/manifest'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);const cruiseId=String(url.searchParams.get('cruiseId')||'');
        if(!db.prepare('SELECT id FROM cruises WHERE id=?').get(cruiseId))throw Object.assign(new Error('Choose a valid sailing.'),{status:400});
        requireSailingPermission(db,user,cruiseId,'scan_boarding','You do not have boarding scan access for this sailing.');
        const rows=db.prepare(`SELECT b.id,b.reference,b.guests,b.status,b.checked_in_at,c.name AS cruise_name,ca.cabin_number,ca.deck,
          bs.scanned_at,scanner.name AS scanned_by FROM bookings b JOIN cruises c ON c.id=b.cruise_id JOIN cabins ca ON ca.id=b.cabin_id
          LEFT JOIN boarding_scans bs ON bs.booking_id=b.id LEFT JOIN users scanner ON scanner.id=bs.scanned_by
          WHERE b.cruise_id=? AND b.status IN ('confirmed_demo','confirmed_paid') ORDER BY b.reference`).all(cruiseId);
        return json(res,200,{sailing:db.prepare('SELECT id,name,ship,date FROM cruises WHERE id=?').get(cruiseId),manifest:rows});
      }
      if(pathname==='/api/boarding/scan'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req);
        const receipt=offlineReceipt(db,user,body,'/api/boarding/scan');if(receipt?.replay)return json(res,200,{...receipt.replay,replayed:true});
        const cruiseId=String(body.cruiseId||''),reference=String(body.reference||'').trim().replace(/^\*|\*$/g,'').toUpperCase();
        requireSailingPermission(db,user,cruiseId,'scan_boarding','You do not have boarding scan access for this sailing.');
        const booking=db.prepare(`SELECT b.id,b.reference,b.guests,b.status,c.id AS cruise_id,c.name AS cruise_name,ca.cabin_number,ca.deck
          FROM bookings b JOIN cruises c ON c.id=b.cruise_id JOIN cabins ca ON ca.id=b.cabin_id
          WHERE b.reference=? AND b.cruise_id=? AND b.status IN ('confirmed_demo','confirmed_paid')`).get(reference,cruiseId);
        if(!booking)throw Object.assign(new Error('No confirmed booking matches that barcode on this sailing.'),{status:404});
        if(db.prepare('SELECT id FROM boarding_scans WHERE booking_id=?').get(booking.id))throw Object.assign(new Error(`${booking.reference} has already boarded.`),{status:409});
        const response=withTransaction(db,()=>{
          const inserted=db.prepare('INSERT INTO boarding_scans(booking_id,cruise_id,scanned_by) VALUES(?,?,?)').run(booking.id,cruiseId,user.id);
          db.prepare('UPDATE bookings SET checked_in_at=COALESCE(checked_in_at,CURRENT_TIMESTAMP) WHERE id=?').run(booking.id);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'boarding_scan',category:'Boarding',summary:`Passenger boarded · ${booking.reference}`,details:`${booking.cruise_name} · Cabin ${booking.cabin_number}`,entityId:inserted.lastInsertRowid});
          const result={ok:true,booking,scannedAt:db.prepare('SELECT scanned_at FROM boarding_scans WHERE id=?').get(inserted.lastInsertRowid).scanned_at};
          saveOfflineReceipt(db,user,receipt,'/api/boarding/scan',result);return result;
        });
        return json(res,200,response);
      }
      if(pathname==='/api/bookings'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);const body=await readJson(req);
        cleanupExpiredPayments(db);
        const cruiseId=String(body.cruiseId||''),cabinNumber=String(body.cabinNumber||''),guests=Number(body.guests||1);
        if(!Number.isInteger(guests)||guests<1||guests>6)throw Object.assign(new Error('Choose between 1 and 6 guests.'),{status:400});
        const key=String(req.headers['idempotency-key']||'').slice(0,100)||null;
        if(key){const prior=db.prepare(`SELECT b.id,b.reference,b.guests,b.total,b.status,b.created_at,c.name,c.route,ca.cabin_number,ca.deck
          FROM bookings b JOIN cruises c ON c.id=b.cruise_id JOIN cabins ca ON ca.id=b.cabin_id WHERE b.user_id=? AND b.idempotency_key=?`).get(user.id,key);
          if(prior){const payment=db.prepare('SELECT provider_session_id,status FROM payment_sessions WHERE booking_id=?').get(prior.id);
            const stripeSession=payment?.status==='pending'&&payment.provider_session_id&&process.env.STRIPE_SECRET_KEY?await stripeRequest(`checkout/sessions/${encodeURIComponent(payment.provider_session_id)}`):null;
            return json(res,200,{booking:prior,reused:true,...(stripeSession?.url?{checkoutUrl:stripeSession.url}:{})});}}
        const useStripe=Boolean(process.env.STRIPE_SECRET_KEY);
        let bookingId;
        db.exec('BEGIN IMMEDIATE');
        try{
          const cruise=db.prepare('SELECT * FROM cruises WHERE id=?').get(cruiseId);
          const cabin=db.prepare('SELECT * FROM cabins WHERE cruise_id=? AND cabin_number=?').get(cruiseId,cabinNumber);
          if(!cruise||!cabin)throw Object.assign(new Error('That cruise or cabin could not be found.'),{status:404});
          if(cabin.status!=='available')throw Object.assign(new Error('That cabin is no longer available. Choose another cabin.'),{status:409});
          const total=(cruise.base_fare+cabin.price_delta)*guests;
          const reference=`HL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          bookingId=Number(db.prepare(`INSERT INTO bookings(reference,user_id,cruise_id,cabin_id,guests,total,status,idempotency_key)
            VALUES(?,?,?,?,?,?,?,?)`).run(reference,user.id,cruiseId,cabin.id,guests,total,useStripe?'pending_payment':'confirmed_demo',key).lastInsertRowid);
          db.prepare("UPDATE cabins SET status='booked' WHERE id=? AND status='available'").run(cabin.id);
          db.exec('COMMIT');
        }catch(err){db.exec('ROLLBACK');throw err;}
        let checkoutUrl=null;
        if(useStripe){
          try{
            const account=db.prepare('SELECT email FROM users WHERE id=?').get(user.id),origin=new URL(req.headers.origin||`http://${req.headers.host}`).origin;
            const form=new URLSearchParams();
            form.set('mode','payment');form.set('payment_method_types[0]','card');form.set('line_items[0][price_data][currency]','usd');
            form.set('line_items[0][price_data][unit_amount]',String((db.prepare('SELECT total FROM bookings WHERE id=?').get(bookingId).total)*100));
            form.set('line_items[0][price_data][product_data][name]',`Harborline sailing · ${db.prepare('SELECT c.name FROM bookings b JOIN cruises c ON c.id=b.cruise_id WHERE b.id=?').get(bookingId).name}`);
            form.set('line_items[0][quantity]','1');form.set('customer_email',account.email);form.set('client_reference_id',String(bookingId));
            form.set('metadata[booking_id]',String(bookingId));
            form.set('success_url',`${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
            form.set('cancel_url',`${origin}/?payment=cancel`);
            form.set('expires_at',String(Math.floor(Date.now()/1000)+3600));
            const session=await stripeRequest('checkout/sessions',form);
            if(!session.id||!session.url)throw new Error('The payment service did not return a checkout link.');
            checkoutUrl=session.url;
            db.prepare("INSERT INTO payment_sessions(booking_id,provider,provider_session_id,status,expires_at) VALUES(?,'stripe',?,'pending',?)")
              .run(bookingId,session.id,Number(session.expires_at)*1000);
          }catch(err){
            withTransaction(db,()=>{
              db.prepare("UPDATE bookings SET status='payment_failed' WHERE id=? AND status='pending_payment'").run(bookingId);
              db.prepare("UPDATE cabins SET status='available' WHERE id=(SELECT cabin_id FROM bookings WHERE id=?) AND status='booked'").run(bookingId);
            });
            throw Object.assign(new Error(`Could not start secure checkout: ${err.message}`),{status:502});
          }
        }
        const booking=db.prepare(`SELECT b.id,b.reference,b.guests,b.total,b.status,b.created_at,b.paid_at,c.id AS cruise_id,c.name,c.route,ca.cabin_number,ca.deck,ca.category
          FROM bookings b JOIN cruises c ON c.id=b.cruise_id JOIN cabins ca ON ca.id=b.cabin_id WHERE b.id=?`).get(bookingId);
        return json(res,201,{booking,...(useStripe?{checkoutUrl,payment:'stripe_checkout'}:{payment:'demo_not_collected'})});
      }
      if(pathname==='/api/reservations'&&req.method==='GET'){
        requireRole(user,['passenger']);
        return json(res,200,db.prepare('SELECT id,title,guests,note,status,created_at,booking_id,cruise_id,plan_type FROM onboard_reservations WHERE user_id=? ORDER BY id DESC').all(user.id));
      }
      if(pathname==='/api/reservations'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);const body=await readJson(req);
        const title=String(body.title||'').trim().slice(0,120),note=String(body.note||'').trim().slice(0,300),guests=Number(body.guests||2);
        if(/\bdining\b/i.test(title))throw Object.assign(new Error('Choose dining seats from an active cruise ticket so every guest is matched to a seat.'),{status:409});
        if(title.length<2||!Number.isInteger(guests)||guests<1||guests>6)throw Object.assign(new Error('Choose an onboard plan and 1–6 guests.'),{status:400});
        const booking=db.prepare("SELECT id,cruise_id,guests FROM bookings WHERE user_id=? AND status IN ('confirmed_demo','confirmed_paid') ORDER BY id DESC LIMIT 1").get(user.id);
        if(!booking)throw Object.assign(new Error('Reserve a cabin before adding an onboard plan.'),{status:409});
        const planType=/\b(shore|excursion)\b/i.test(title)?'shore':'onboard';
        const result=db.prepare('INSERT INTO onboard_reservations(user_id,title,guests,note,booking_id,cruise_id,plan_type) VALUES(?,?,?,?,?,?,?)')
          .run(user.id,title,guests,note,booking.id,booking.cruise_id,planType);
        return json(res,201,{id:result.lastInsertRowid,title,guests,note,status:'saved',booking_id:booking.id,cruise_id:booking.cruise_id,plan_type:planType});
      }
      const cancelMatch=pathname.match(/^\/api\/bookings\/(\d+)\/cancel$/);
      if(cancelMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);
        db.exec('BEGIN IMMEDIATE');
        try{
          const booking=db.prepare('SELECT id,cabin_id,status FROM bookings WHERE id=? AND user_id=?').get(Number(cancelMatch[1]),user.id);
          if(!booking)throw Object.assign(new Error('Booking not found.'),{status:404});
          if(booking.status==='cancelled')throw Object.assign(new Error('This booking is already cancelled.'),{status:409});
          if(booking.status==='confirmed_paid')throw Object.assign(new Error('This paid booking needs a refund review before cancellation. Please contact the cruise operator.'),{status:409});
          if(booking.status==='pending_payment')throw Object.assign(new Error('Secure checkout is still open. Finish or close checkout; the cabin hold expires automatically.'),{status:409});
          db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(booking.id);
          db.prepare('DELETE FROM dining_reservations WHERE booking_id=?').run(booking.id);
          db.prepare("UPDATE cabins SET status='available' WHERE id=?").run(booking.cabin_id);
          db.exec('COMMIT');return json(res,200,{ok:true});
        }catch(err){db.exec('ROLLBACK');throw err;}
      }
      const cabinsMatch=pathname.match(/^\/api\/cruises\/([a-zA-Z0-9_-]+)\/cabins$/);
      if(cabinsMatch&&req.method==='GET'){
        const rows=db.prepare('SELECT cabin_number,deck,category,price_delta,status FROM cabins WHERE cruise_id=? ORDER BY cabin_number').all(cabinsMatch[1]);
        return json(res,200,rows);
      }
      if(pathname==='/api/feedback'&&req.method==='GET'){
        const rows=['manager','captain'].includes(user.role)
          ?db.prepare(`SELECT f.id,f.role,f.type,f.title,f.message,f.status,f.created_at,u.name AS sender FROM feedback f JOIN users u ON u.id=f.user_id ORDER BY f.id DESC LIMIT 100`).all()
          :db.prepare('SELECT id,role,type,title,message,status,created_at FROM feedback WHERE user_id=? ORDER BY id DESC LIMIT 100').all(user.id);
        return json(res,200,rows);
      }
      if(pathname==='/api/feedback'&&req.method==='POST'){
        requireSameOrigin(req);const body=await readJson(req);
        const type=String(body.type||''),title=String(body.title||'').trim(),message=String(body.message||'').trim();
        if(!['Suggestion','Usability','Issue','Operational problem','Feature request'].includes(type))throw Object.assign(new Error('Choose a feedback type.'),{status:400});
        if(title.length<3||title.length>90||message.length<5||message.length>500)throw Object.assign(new Error('Add a title (3–90 characters) and message (5–500 characters).'),{status:400});
        const result=withTransaction(db,()=>{
          const feedback=db.prepare('INSERT INTO feedback(user_id,role,type,title,message) VALUES(?,?,?,?,?)').run(user.id===null?0:user.id,user.role,type,title,message);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'feedback_submitted',category:'Feedback',summary:title,details:`${type} · ${message}`,entityId:feedback.lastInsertRowid});
          return feedback;
        });
        return json(res,201,{id:result.lastInsertRowid,role:user.role,type,title,message,status:'New'});
      }
      const feedbackMatch=pathname.match(/^\/api\/feedback\/(\d+)$/);
      if(feedbackMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['manager']);const body=await readJson(req);
        if(!['New','Reviewed','Accepted','Deferred'].includes(body.status))throw Object.assign(new Error('Feedback status is invalid.'),{status:400});
        const result=db.prepare('UPDATE feedback SET status=? WHERE id=?').run(body.status,Number(feedbackMatch[1]));
        if(!result.changes)throw Object.assign(new Error('Feedback record not found.'),{status:404});
        return json(res,200,{ok:true,status:body.status});
      }
      if(pathname==='/api/tasks'&&req.method==='GET'){
        requireRole(user,['crew','manager']);
        const rows=user.role==='manager'
          ?db.prepare('SELECT t.id,t.title,t.department,t.due,t.status,u.name AS assignee FROM crew_tasks t JOIN users u ON u.id=t.user_id ORDER BY CAST(substr(t.id,6) AS INTEGER),t.id').all()
          :db.prepare('SELECT id,title,department,due,status FROM crew_tasks WHERE user_id=? ORDER BY CAST(substr(id,6) AS INTEGER),id').all(user.id);
        return json(res,200,rows);
      }
      const taskMatch=pathname.match(/^\/api\/tasks\/([a-zA-Z0-9_-]+)$/);
      if(taskMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','manager']);const body=await readJson(req);
        if(!['open','done'].includes(body.status))throw Object.assign(new Error('Task status is invalid.'),{status:400});
        const task=db.prepare('SELECT id,user_id,title,status FROM crew_tasks WHERE id=?').get(taskMatch[1]);
        if(!task)throw Object.assign(new Error('Task not found.'),{status:404});
        if(user.role!=='manager'&&task.user_id!==user.id)throw Object.assign(new Error('You can only update your assigned tasks.'),{status:403});
        if(task.status!==body.status){
          withTransaction(db,()=>{
            db.prepare('UPDATE crew_tasks SET status=? WHERE id=?').run(body.status,task.id);
            logCrewActivity(db,{crewUserId:task.user_id,actorUserId:user.id,eventType:body.status==='done'?'task_completed':'task_reopened',category:'Task',summary:task.title,details:body.status==='done'?'Marked complete':'Reopened',entityId:task.id});
          });
        }
        return json(res,200,{ok:true,id:task.id,status:body.status});
      }
      if(pathname==='/api/crew/activity'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const rows=user.role!=='crew'
          ?db.prepare(`SELECT a.id,a.event_type,a.category,a.summary,a.details,a.entity_id,a.created_at,
              c.name AS crew_name,actor.name AS actor_name
            FROM crew_activity_log a JOIN users c ON c.id=a.crew_user_id JOIN users actor ON actor.id=a.actor_user_id
            ORDER BY a.id DESC LIMIT 100`).all()
          :db.prepare(`SELECT a.id,a.event_type,a.category,a.summary,a.details,a.entity_id,a.created_at,
              c.name AS crew_name,actor.name AS actor_name
            FROM crew_activity_log a JOIN users c ON c.id=a.crew_user_id JOIN users actor ON actor.id=a.actor_user_id
            WHERE a.crew_user_id=? ORDER BY a.id DESC LIMIT 100`).all(user.id);
        const todayCount=user.role==='crew'
          ?db.prepare("SELECT COUNT(*) AS n FROM crew_activity_log WHERE crew_user_id=? AND date(created_at)=date('now') AND event_type<>'task_status_imported'").get(user.id).n
          :db.prepare("SELECT COUNT(*) AS n FROM crew_activity_log WHERE date(created_at)=date('now') AND event_type<>'task_status_imported'").get().n;
        return json(res,200,{events:rows,todayCount});
      }
      if(pathname==='/api/crew/activity'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew']);const body=await readJson(req);
        const receipt=offlineReceipt(db,user,body,'/api/crew/activity');if(receipt?.replay)return json(res,200,{...receipt.replay,replayed:true});
        const allowedCategories=['Guest assistance','Cabin service','Safety','Port operations','Equipment','Other'];
        const category=String(body.category||'').trim(),summary=String(body.summary||'').trim(),details=String(body.details||'').trim();
        if(!allowedCategories.includes(category))throw Object.assign(new Error('Choose a valid work category.'),{status:400});
        if(summary.length<3||summary.length>120)throw Object.assign(new Error('Add a short work summary (3–120 characters).'),{status:400});
        if(details.length<3||details.length>500)throw Object.assign(new Error('Add work notes (3–500 characters).'),{status:400});
        const response=withTransaction(db,()=>{
          const result=db.prepare("INSERT INTO crew_activity_log(crew_user_id,actor_user_id,event_type,category,summary,details) VALUES(?,?,'work_logged',?,?,?)")
            .run(user.id,user.id,category,summary,details);
          const item={id:result.lastInsertRowid,event_type:'work_logged',category,summary,details};
          saveOfflineReceipt(db,user,receipt,'/api/crew/activity',item);return item;
        });
        return json(res,201,response);
      }
      if(pathname==='/api/shifts'&&req.method==='GET'){
        requireRole(user,['crew','manager']);
        const rows=user.role==='manager'
          ?db.prepare('SELECT s.*,u.name AS assignee FROM shifts s JOIN users u ON u.id=s.user_id ORDER BY s.id').all()
          :db.prepare('SELECT * FROM shifts WHERE user_id=? ORDER BY id').all(user.id);
        return json(res,200,rows);
      }
      if(pathname==='/api/swaps'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew']);const body=await readJson(req);
        const reason=String(body.reason||'Schedule conflict').trim().slice(0,300);
        const shiftId=String(body.shiftId||'');
        if(shiftId&&!db.prepare('SELECT id FROM shifts WHERE id=? AND user_id=?').get(shiftId,user.id))throw Object.assign(new Error('Choose one of your assigned shifts.'),{status:403});
        const shift=shiftId?db.prepare('SELECT title FROM shifts WHERE id=?').get(shiftId):null;
        const r=withTransaction(db,()=>{
          const request=db.prepare('INSERT INTO shift_swap_requests(user_id,shift_id,reason) VALUES(?,?,?)').run(user.id,shiftId||null,reason);
          logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'shift_swap_requested',category:'Shift',summary:'Shift swap requested',details:`${shift?.title||'Assigned shift'} · ${reason}`,entityId:request.lastInsertRowid});
          return request;
        });
        return json(res,201,{id:r.lastInsertRowid,status:'pending'});
      }
      if(pathname==='/api/swaps'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const rows=user.role!=='crew'
          ?db.prepare('SELECT r.id,r.user_id,r.shift_id,r.reason,r.status,r.created_at,u.name AS requested_by,s.title AS shift FROM shift_swap_requests r JOIN users u ON u.id=r.user_id LEFT JOIN shifts s ON s.id=r.shift_id ORDER BY r.id DESC').all()
          :db.prepare('SELECT r.id,r.shift_id,r.reason,r.status,r.created_at,s.title AS shift FROM shift_swap_requests r LEFT JOIN shifts s ON s.id=r.shift_id WHERE r.user_id=? ORDER BY r.id DESC').all(user.id);
        return json(res,200,rows);
      }
      if(pathname==='/api/attendance'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew']);const date=new Date().toISOString().slice(0,10);
        const record=withTransaction(db,()=>{
          const inserted=db.prepare('INSERT OR IGNORE INTO attendance(user_id,work_date) VALUES(?,?)').run(user.id,date);
          const attendance=db.prepare('SELECT work_date,checked_in_at FROM attendance WHERE user_id=? AND work_date=?').get(user.id,date);
          if(inserted.changes)logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'shift_check_in',category:'Attendance',summary:'Shift check-in recorded',details:`Work date ${attendance.work_date}`,entityId:`attendance:${attendance.work_date}`});
          return attendance;
        });
        return json(res,200,{checkedIn:true,...record});
      }
      if(pathname==='/api/attendance'&&req.method==='GET'){
        requireRole(user,['crew']);const date=new Date().toISOString().slice(0,10);
        const record=db.prepare('SELECT work_date,checked_in_at FROM attendance WHERE user_id=? AND work_date=?').get(user.id,date);
        return json(res,200,{checkedIn:Boolean(record),...(record||{})});
      }
      if(pathname==='/api/dining/operations'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const cruises=db.prepare('SELECT id,name,ship,date,route FROM cruises ORDER BY date_start,id').all().filter(cruise=>hasSailingPermission(db,user,cruise.id,'manage_dining'));
        const cruiseIds=new Set(cruises.map(cruise=>cruise.id));
        const baseBatches=db.prepare(`SELECT b.id,b.cruise_id,b.name,b.starts_at,b.capacity,c.name AS cruise_name
          FROM dining_batches b JOIN cruises c ON c.id=b.cruise_id ORDER BY b.cruise_id,b.id`).all();
        const batches=baseBatches.filter(batch=>cruiseIds.has(batch.cruise_id)).map(batch=>{
          const seats=db.prepare(`SELECT s.id,s.seat_number,
            CASE WHEN s.status='blocked' THEN 'blocked' WHEN EXISTS(SELECT 1 FROM dining_reservation_seats rs WHERE rs.seat_id=s.id) THEN 'booked' ELSE 'available' END AS status
            FROM dining_seats s WHERE s.batch_id=? ORDER BY s.seat_number`).all(batch.id);
          const booked=seats.filter(seat=>seat.status==='booked').length;
          const available=seats.filter(seat=>seat.status==='available').length;
          const blocked=seats.filter(seat=>seat.status==='blocked').length;
          return {...batch,seat_count:seats.length,booked,available,blocked,remaining:Math.min(Math.max(0,Number(batch.capacity)-booked),available),seats};
        });
        const log=db.prepare(`SELECT l.id,l.event_type,l.details,l.created_at,u.name AS actor_name,c.name AS cruise_name,c.id AS cruise_id,b.name AS batch_name
          FROM dining_operations_log l JOIN users u ON u.id=l.actor_user_id JOIN dining_batches b ON b.id=l.batch_id
          JOIN cruises c ON c.id=b.cruise_id ORDER BY l.id DESC LIMIT 50`).all();
        return json(res,200,{cruises,batches,log:log.filter(item=>cruiseIds.has(item.cruise_id))});
      }
      const diningCapacityMatch=pathname.match(/^\/api\/dining\/batches\/(\d+)\/capacity$/);
      if(diningCapacityMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),capacity=Number(body.capacity);
        if(!Number.isInteger(capacity)||capacity<0)throw Object.assign(new Error('Enter a whole-number capacity of zero or more.'),{status:400});
        const result=withTransaction(db,()=>{
          const batch=db.prepare('SELECT id,cruise_id,name,capacity FROM dining_batches WHERE id=?').get(Number(diningCapacityMatch[1]));
          if(!batch)throw Object.assign(new Error('Dining batch not found.'),{status:404});
          requireSailingPermission(db,user,batch.cruise_id,'manage_dining','You cannot change dining capacity on this sailing.');
          const seats=db.prepare('SELECT COUNT(*) AS n FROM dining_seats WHERE batch_id=?').get(batch.id).n;
          if(capacity>seats)throw Object.assign(new Error(`Capacity cannot exceed the ${seats} physical seats in this batch.`),{status:400});
          const booked=db.prepare(`SELECT COUNT(*) AS n FROM dining_reservation_seats rs JOIN dining_seats s ON s.id=rs.seat_id
            WHERE s.batch_id=?`).get(batch.id).n;
          if(capacity<booked)throw Object.assign(new Error(`Capacity cannot be lower than the ${booked} seats already booked.`),{status:409});
          const previous=Number(batch.capacity);
          if(capacity!==previous){
            db.prepare('UPDATE dining_batches SET capacity=? WHERE id=?').run(capacity,batch.id);
            db.prepare('INSERT INTO dining_operations_log(actor_user_id,batch_id,event_type,details) VALUES(?,?,?,?)')
              .run(user.id,batch.id,'capacity_changed',`${batch.name} capacity changed from ${previous} to ${capacity} covers`);
          }
          return {batchId:batch.id,capacity,booked,changed:capacity!==previous};
        });
        return json(res,200,{ok:true,...result});
      }
      const diningSeatStatusMatch=pathname.match(/^\/api\/dining\/seats\/(\d+)\/status$/);
      if(diningSeatStatusMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),status=String(body.status||'');
        if(!['available','blocked'].includes(status))throw Object.assign(new Error('Choose whether this seat is available or blocked.'),{status:400});
        const result=withTransaction(db,()=>{
          const seat=db.prepare(`SELECT s.id,s.seat_number,s.status,b.id AS batch_id,b.name AS batch_name,c.id AS cruise_id,c.name AS cruise_name
            FROM dining_seats s JOIN dining_batches b ON b.id=s.batch_id JOIN cruises c ON c.id=b.cruise_id WHERE s.id=?`)
            .get(Number(diningSeatStatusMatch[1]));
          if(!seat)throw Object.assign(new Error('Dining seat not found.'),{status:404});
          requireSailingPermission(db,user,seat.cruise_id,'manage_dining','You cannot change seat status on this sailing.');
          if(status==='blocked'&&db.prepare('SELECT id FROM dining_reservation_seats WHERE seat_id=?').get(seat.id))
            throw Object.assign(new Error('This seat is already assigned to a guest and cannot be blocked.'),{status:409});
          if(seat.status!==status){
            db.prepare('UPDATE dining_seats SET status=? WHERE id=?').run(status,seat.id);
            const verb=status==='blocked'?'blocked':'reopened';
            db.prepare('INSERT INTO dining_operations_log(actor_user_id,batch_id,event_type,details) VALUES(?,?,?,?)')
              .run(user.id,seat.batch_id,`seat_${verb}`,`Seat ${seat.seat_number} ${verb} in ${seat.batch_name} · ${seat.cruise_name}`);
          }
          return {seatId:seat.id,seatNumber:seat.seat_number,batchId:seat.batch_id,status};
        });
        return json(res,200,{ok:true,...result});
      }
      if(pathname==='/api/operations'&&req.method==='GET'){
        requireRole(user,['manager','captain']);
        const occupancy=db.prepare(`SELECT COUNT(*) AS capacity,SUM(status='booked') AS booked,SUM(status='available') AS available,SUM(status='service') AS service FROM cabins WHERE cruise_id='c1'`).get();
        const crew=db.prepare("SELECT COUNT(*) AS assigned,SUM(status='open') AS open_tasks FROM crew_tasks").get();
        const feedbackCount=db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n;
        const inventory=db.prepare('SELECT id,name,department,on_hand,reorder_at,unit FROM inventory_items ORDER BY id').all();
        const maintenance=db.prepare(`SELECT m.id,m.title,m.status,m.department,m.description,m.location,m.priority,m.created_at,
          m.cruise_id,c.name AS cruise_name,m.accepted_by,u.name AS accepted_by_name,r.name AS reporter_name
          FROM maintenance_tickets m LEFT JOIN cruises c ON c.id=m.cruise_id LEFT JOIN users u ON u.id=m.accepted_by
          LEFT JOIN users r ON r.id=COALESCE(m.reported_by,m.created_by) ORDER BY m.id DESC`).all()
          .filter(ticket=>!ticket.cruise_id||hasSailingPermission(db,user,ticket.cruise_id,'dispatch_faults'));
        const pendingSwaps=db.prepare("SELECT COUNT(*) AS n FROM shift_swap_requests WHERE status='pending'").get().n;
        return json(res,200,{occupancy,crew,feedbackCount,pendingSwaps,inventory,maintenance});
      }
      if(pathname==='/api/maintenance/jobs'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const rows=db.prepare(`SELECT m.id,m.title,m.status,m.department,m.description,m.location,m.priority,m.cruise_id,
          m.created_at,m.accepted_by,m.accepted_at,m.resolved_at,c.name AS cruise_name,c.ship,u.name AS accepted_by_name,r.name AS reporter_name
          FROM maintenance_tickets m LEFT JOIN cruises c ON c.id=m.cruise_id LEFT JOIN users u ON u.id=m.accepted_by
          LEFT JOIN users r ON r.id=COALESCE(m.reported_by,m.created_by) ORDER BY CASE m.priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,m.id DESC`).all()
          .filter(ticket=>user.role==='manager'||(ticket.cruise_id&&(
            (user.role==='captain'&&hasSailingPermission(db,user,ticket.cruise_id,'dispatch_faults'))||
            (user.role==='crew'&&hasSailingPermission(db,user,ticket.cruise_id,'view_jobs'))
          )))
          .filter(ticket=>user.role!=='crew'||ticket.status==='Open'||Number(ticket.accepted_by)===Number(user.id));
        const log=db.prepare(`SELECT l.id,l.ticket_id,l.event_type,l.details,l.created_at,u.name AS actor_name
          FROM maintenance_job_log l JOIN users u ON u.id=l.actor_user_id ORDER BY l.id DESC LIMIT 80`).all();
        const ticketIds=new Set(rows.map(row=>Number(row.id)));
        return json(res,200,{jobs:rows,log:log.filter(item=>ticketIds.has(Number(item.ticket_id)))});
      }
      const maintenanceJobMatch=pathname.match(/^\/api\/maintenance\/jobs\/(\d+)$/);
      if(maintenanceJobMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),next=String(body.status||''),note=String(body.note||'').trim().slice(0,500);
        if(!['Accepted','In progress','Resolved'].includes(next))throw Object.assign(new Error('Choose accept, start, or complete the fault job.'),{status:400});
        const ticket=db.prepare('SELECT id,title,status,cruise_id,location,accepted_by FROM maintenance_tickets WHERE id=?').get(Number(maintenanceJobMatch[1]));
        if(!ticket)throw Object.assign(new Error('Fault report not found.'),{status:404});
        const crewUser=user.role==='crew';
        if(crewUser)requireSailingPermission(db,user,ticket.cruise_id,'view_jobs','You are not authorized for this sailing’s crew job board.');
        else requireSailingPermission(db,user,ticket.cruise_id,'dispatch_faults','You cannot manage faults on this sailing.');
        const nowCrew=crewUser;
        withTransaction(db,()=>{
          if(next==='Accepted'){
            if(!crewUser||ticket.status!=='Open'||ticket.accepted_by)throw Object.assign(new Error('This job is no longer available to accept.'),{status:409});
            const changed=db.prepare("UPDATE maintenance_tickets SET status='Accepted',accepted_by=?,accepted_at=CURRENT_TIMESTAMP WHERE id=? AND status='Open' AND accepted_by IS NULL").run(user.id,ticket.id);
            if(!changed.changes)throw Object.assign(new Error('Another crew member accepted this job first.'),{status:409});
          }else if(next==='In progress'){
            if(crewUser&&(Number(ticket.accepted_by)!==Number(user.id)||ticket.status!=='Accepted'))throw Object.assign(new Error('Accept this job before starting it.'),{status:409});
            if(!crewUser&&!['Open','Accepted','In progress'].includes(ticket.status))throw Object.assign(new Error('This fault cannot be started in its current state.'),{status:409});
            db.prepare("UPDATE maintenance_tickets SET status='In progress',accepted_by=COALESCE(accepted_by,?),accepted_at=COALESCE(accepted_at,CURRENT_TIMESTAMP) WHERE id=?").run(user.id,ticket.id);
          }else{
            if(crewUser&&(Number(ticket.accepted_by)!==Number(user.id)||!['Accepted','In progress'].includes(ticket.status)))throw Object.assign(new Error('Only the crew member who accepted this job can complete it.'),{status:403});
            if(!crewUser&&!['Open','Accepted','In progress'].includes(ticket.status))throw Object.assign(new Error('This fault is already resolved.'),{status:409});
            db.prepare("UPDATE maintenance_tickets SET status='Resolved',resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(ticket.id);
          }
          const event=next==='Accepted'?'job_accepted':next==='In progress'?'job_started':'job_resolved';
          const details=[ticket.location,`Status: ${next}`,note].filter(Boolean).join(' · ');
          db.prepare('INSERT INTO maintenance_job_log(ticket_id,actor_user_id,event_type,details) VALUES(?,?,?,?)').run(ticket.id,user.id,event,details);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:event,category:'Fault response',summary:ticket.title,details:`${ticket.location} · ${next}${note?` · ${note}`:''}`,entityId:ticket.id});
        });
        return json(res,200,{ok:true,status:next});
      }
      if(pathname==='/api/maintenance'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['manager','captain','crew']);const body=await readJson(req);
        const title=String(body.title||'').trim().slice(0,120),department=String(body.department||'Operations').trim().slice(0,80),description=String(body.description||'').trim().slice(0,500);
        const cruiseId=String(body.cruiseId||''),location=String(body.location||'').trim().slice(0,100),priority=String(body.priority||'Medium');
        if(title.length<4)throw Object.assign(new Error('Describe the fault (at least 4 characters).'),{status:400});
        if(!['Low','Medium','High','Critical'].includes(priority)||!location)throw Object.assign(new Error('Choose a fault priority and exact ship location.'),{status:400});
        if(!db.prepare('SELECT id FROM cruises WHERE id=?').get(cruiseId))throw Object.assign(new Error('Choose a valid sailing.'),{status:400});
        if(user.role==='crew')requireSailingPermission(db,user,cruiseId,'view_jobs','You are not authorized to report faults on this sailing.');
        else if(user.role==='captain')requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot report faults for this sailing.');
        const result=withTransaction(db,()=>{
          const ticket=db.prepare("INSERT INTO maintenance_tickets(title,status,department,description,created_by,cruise_id,location,priority,reported_by) VALUES(?,'Open',?,?,?,?,?,?,?)").run(title,department,description,user.id,cruiseId,location,priority,user.id);
          db.prepare('INSERT INTO maintenance_job_log(ticket_id,actor_user_id,event_type,details) VALUES(?,?,\'fault_reported\',?)').run(ticket.lastInsertRowid,user.id,`${location} · ${priority} priority · ${department}${description?` · ${description}`:''}`);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'maintenance_reported',category:'Equipment',summary:title,details:`${location} · ${priority} · ${department}${description?` · ${description}`:''}`,entityId:ticket.lastInsertRowid});
          return ticket;
        });
        return json(res,201,{id:result.lastInsertRowid,title,status:'Open',department,description,location,priority,cruiseId});
      }
      if(pathname==='/api/crew/directory'&&req.method==='GET'){
        requireRole(user,['captain','manager']);const cruiseId=String(url.searchParams.get('cruiseId')||'');
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot assign safety duties on this sailing.');
        const crew=db.prepare(`SELECT u.id,u.name FROM users u JOIN staff_sailing_permissions p ON p.user_id=u.id
          WHERE u.role='crew' AND p.cruise_id=? AND p.safety_response=1 ORDER BY u.name`).all(cruiseId);
        return json(res,200,{crew});
      }
      if(pathname==='/api/muster'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const cruises=db.prepare('SELECT id,name,ship,date FROM cruises ORDER BY date_start,id').all()
          .filter(item=>hasSailingPermission(db,user,item.id,user.role==='crew'?'safety_response':'dispatch_faults'));
        const cruiseId=String(url.searchParams.get('cruiseId')||cruises[0]?.id||'');
        if(!cruises.some(item=>item.id===cruiseId))throw Object.assign(new Error('Muster access is not granted for this sailing.'),{status:403});
        let stations=db.prepare(`SELECT s.id,s.cruise_id,s.name,s.location,s.deck_min,s.deck_max,s.capacity,s.lead_user_id,u.name AS lead_name
          FROM muster_stations s LEFT JOIN users u ON u.id=s.lead_user_id WHERE s.cruise_id=? ORDER BY s.id`).all(cruiseId);
        const events=db.prepare(`SELECT e.id,e.cruise_id,e.event_type,e.title,e.status,e.notes,e.started_at,e.closed_at,u.name AS initiated_by,
          (SELECT COUNT(*) FROM muster_checkins mc WHERE mc.event_id=e.id) AS guests_accounted
          FROM muster_events e JOIN users u ON u.id=e.initiated_by WHERE e.cruise_id=? ORDER BY e.id DESC LIMIT 12`).all(cruiseId);
        const active=events.find(item=>item.status==='active')||null;
        let passengers=[];
        if(active){
          const bookings=db.prepare(`SELECT b.id AS booking_id,b.reference,b.guests,ca.cabin_number,ca.deck,u.name AS guest_name
            FROM bookings b JOIN cabins ca ON ca.id=b.cabin_id JOIN users u ON u.id=b.user_id
            WHERE b.cruise_id=? AND b.status IN ('confirmed_demo','confirmed_paid') ORDER BY b.reference`).all(cruiseId);
          const checkins=db.prepare('SELECT m.booking_id,m.guest_number,m.station_id,m.checked_by,m.checked_at,u.name AS checked_by_name FROM muster_checkins m JOIN users u ON u.id=m.checked_by WHERE m.event_id=?').all(active.id);
          const checkinMap=new Map(checkins.map(item=>[`${item.booking_id}:${item.guest_number}`,item]));
          const allStations=stations;
          passengers=bookings.flatMap(booking=>Array.from({length:Number(booking.guests)},(_,index)=>{
            const guestNumber=index+1,assigned=allStations.find(item=>Number(booking.deck)>=Number(item.deck_min)&&Number(booking.deck)<=Number(item.deck_max))||allStations[0]||null;
            const checked=checkinMap.get(`${booking.booking_id}:${guestNumber}`);
            return {booking_id:booking.booking_id,reference:booking.reference,guest_number:guestNumber,guest_name:booking.guest_name,
              cabin_number:booking.cabin_number,deck:booking.deck,station_id:assigned?.id||null,station_name:assigned?.name||'Unassigned',
              checked_at:checked?.checked_at||null,checked_by_name:checked?.checked_by_name||null};
          }));
        }
        let staff=[];
        if(user.role!=='crew')staff=db.prepare(`SELECT u.id,u.name FROM users u JOIN staff_sailing_permissions p ON p.user_id=u.id
          WHERE u.role='crew' AND p.cruise_id=? AND p.safety_response=1 ORDER BY u.name`).all(cruiseId);
        else {stations=stations.filter(item=>Number(item.lead_user_id)===Number(user.id));passengers=passengers.filter(item=>stations.some(station=>Number(station.id)===Number(item.station_id)));}
        const expected=passengers.length,accounted=passengers.filter(item=>item.checked_at).length;
        return json(res,200,{cruises,cruiseId,stations,staff,events,active,passengers,expected,accounted,unaccounted:expected-accounted});
      }
      if(pathname==='/api/muster/stations'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req),cruiseId=String(body.cruiseId||'');
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot configure muster stations for this sailing.');
        const name=String(body.name||'').trim().slice(0,60),location=String(body.location||'').trim().slice(0,100);
        const deckMin=Number(body.deckMin||1),deckMax=Number(body.deckMax||20),capacity=Number(body.capacity||500),leadUserId=body.leadUserId?Number(body.leadUserId):null;
        if(name.length<2||location.length<3||!Number.isInteger(deckMin)||!Number.isInteger(deckMax)||deckMin<1||deckMax<deckMin||deckMax>100||!Number.isInteger(capacity)||capacity<1||capacity>5000)
          throw Object.assign(new Error('Enter a station name, location, valid deck range and capacity.'),{status:400});
        if(db.prepare('SELECT id FROM muster_stations WHERE cruise_id=? AND deck_min<=? AND deck_max>=? LIMIT 1').get(cruiseId,deckMax,deckMin))
          throw Object.assign(new Error('That cabin deck range overlaps an existing muster station.'),{status:409});
        if(leadUserId&&!db.prepare("SELECT 1 FROM staff_sailing_permissions WHERE user_id=? AND cruise_id=? AND safety_response=1").get(leadUserId,cruiseId))
          throw Object.assign(new Error('The crew lead needs muster-response permission on this sailing.'),{status:400});
        const result=db.prepare('INSERT INTO muster_stations(cruise_id,name,location,deck_min,deck_max,capacity,lead_user_id,created_by) VALUES(?,?,?,?,?,?,?,?)')
          .run(cruiseId,name,location,deckMin,deckMax,capacity,leadUserId,user.id);
        return json(res,201,{id:result.lastInsertRowid,name,location,deckMin,deckMax,capacity,leadUserId});
      }
      const musterStationMatch=pathname.match(/^\/api\/muster\/stations\/(\d+)$/);
      if(musterStationMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req);
        const station=db.prepare('SELECT id,cruise_id FROM muster_stations WHERE id=?').get(Number(musterStationMatch[1]));
        if(!station)throw Object.assign(new Error('Muster station not found.'),{status:404});
        requireSailingPermission(db,user,station.cruise_id,'dispatch_faults');const leadUserId=body.leadUserId?Number(body.leadUserId):null;
        if(leadUserId&&!db.prepare('SELECT 1 FROM staff_sailing_permissions WHERE user_id=? AND cruise_id=? AND safety_response=1').get(leadUserId,station.cruise_id))
          throw Object.assign(new Error('The crew lead needs muster-response permission on this sailing.'),{status:400});
        db.prepare('UPDATE muster_stations SET lead_user_id=? WHERE id=?').run(leadUserId,station.id);
        return json(res,200,{ok:true});
      }
      if(pathname==='/api/muster/events'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req),cruiseId=String(body.cruiseId||''),eventType=String(body.eventType||''),title=String(body.title||'').trim().slice(0,100),notes=String(body.notes||'').trim().slice(0,500);
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot start a muster for this sailing.');
        if(!['drill','emergency'].includes(eventType)||title.length<3)throw Object.assign(new Error('Choose a drill or emergency muster and enter a title.'),{status:400});
        if(!db.prepare('SELECT id FROM muster_stations WHERE cruise_id=? LIMIT 1').get(cruiseId))throw Object.assign(new Error('Add at least one muster station before starting a muster.'),{status:409});
        if(db.prepare("SELECT id FROM muster_events WHERE cruise_id=? AND status='active'").get(cruiseId))throw Object.assign(new Error('A muster is already active for this sailing.'),{status:409});
        const result=db.prepare('INSERT INTO muster_events(cruise_id,event_type,title,notes,initiated_by) VALUES(?,?,?,?,?)').run(cruiseId,eventType,title,notes,user.id);
        return json(res,201,{id:result.lastInsertRowid,status:'active',title,eventType});
      }
      if(pathname==='/api/muster/check-in'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),cruiseId=String(body.cruiseId||''),reference=String(body.reference||'').trim().replace(/^\*|\*$/g,'').toUpperCase(),guestNumber=Number(body.guestNumber),stationId=Number(body.stationId);
        requireSailingPermission(db,user,cruiseId,'safety_response','You cannot record muster attendance for this sailing.');
        const receipt=offlineReceipt(db,user,body,'/api/muster/check-in');if(receipt?.replay)return json(res,200,{...receipt.replay,replayed:true});
        const event=db.prepare("SELECT id FROM muster_events WHERE cruise_id=? AND status='active'").get(cruiseId);
        if(!event)throw Object.assign(new Error('There is no active muster for this sailing.'),{status:409});
        const station=db.prepare('SELECT id,lead_user_id,capacity FROM muster_stations WHERE id=? AND cruise_id=?').get(stationId,cruiseId);
        if(!station)throw Object.assign(new Error('Choose a muster station for this sailing.'),{status:400});
        if(user.role==='crew'&&Number(station.lead_user_id)!==Number(user.id))throw Object.assign(new Error('You can only scan guests at your assigned muster station.'),{status:403});
        const booking=db.prepare(`SELECT b.id,b.reference,b.guests,ca.deck FROM bookings b JOIN cabins ca ON ca.id=b.cabin_id WHERE b.reference=? AND b.cruise_id=? AND b.status IN ('confirmed_demo','confirmed_paid')`).get(reference,cruiseId);
        if(!booking||!Number.isInteger(guestNumber)||guestNumber<1||guestNumber>Number(booking.guests))throw Object.assign(new Error('Ticket or guest number does not match this sailing manifest.'),{status:404});
        const assignedStation=db.prepare('SELECT id FROM muster_stations WHERE cruise_id=? AND ? BETWEEN deck_min AND deck_max ORDER BY id LIMIT 1').get(cruiseId,Number(booking.deck))||db.prepare('SELECT id FROM muster_stations WHERE cruise_id=? ORDER BY id LIMIT 1').get(cruiseId);
        if(assignedStation&&Number(assignedStation.id)!==stationId)throw Object.assign(new Error('This guest is assigned to a different muster station based on their cabin deck.'),{status:409});
        const stationLoad=db.prepare('SELECT COUNT(*) AS guests FROM muster_checkins WHERE event_id=? AND station_id=?').get(event.id,stationId).guests;
        if(Number(stationLoad)>=Number(station.capacity))throw Object.assign(new Error('This muster station is at capacity. Contact the captain for reassignment.'),{status:409});
        const duplicate=db.prepare('SELECT id FROM muster_checkins WHERE event_id=? AND booking_id=? AND guest_number=?').get(event.id,booking.id,guestNumber);
        if(duplicate)throw Object.assign(new Error(`Guest ${guestNumber} on ${reference} is already accounted for.`),{status:409});
        const response=withTransaction(db,()=>{
          const record=db.prepare('INSERT INTO muster_checkins(event_id,booking_id,guest_number,station_id,checked_by) VALUES(?,?,?,?,?)').run(event.id,booking.id,guestNumber,station.id,user.id);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'muster_guest_accounted',category:'Safety response',summary:`Muster check-in · ${reference} guest ${guestNumber}`,details:`${station.name} · ${station.location}`,entityId:record.lastInsertRowid});
          const result={ok:true,id:record.lastInsertRowid,reference,guestNumber,stationId,checkedAt:db.prepare('SELECT checked_at FROM muster_checkins WHERE id=?').get(record.lastInsertRowid).checked_at};
          saveOfflineReceipt(db,user,receipt,'/api/muster/check-in',result);return result;
        });
        return json(res,200,response);
      }
      const musterCloseMatch=pathname.match(/^\/api\/muster\/events\/(\d+)\/close$/);
      if(musterCloseMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const event=db.prepare('SELECT id,cruise_id FROM muster_events WHERE id=? AND status=\'active\'').get(Number(musterCloseMatch[1]));
        if(!event)throw Object.assign(new Error('Active muster not found.'),{status:404});requireSailingPermission(db,user,event.cruise_id,'dispatch_faults');
        db.prepare("UPDATE muster_events SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE id=?").run(event.id);return json(res,200,{ok:true});
      }
      if(pathname==='/api/disruption-recovery'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);
        const permission=user.role==='crew'?'view_jobs':'dispatch_faults';
        const cruises=db.prepare('SELECT id,name,ship,date FROM cruises ORDER BY date_start,id').all()
          .filter(item=>hasSailingPermission(db,user,item.id,permission));
        const cruiseId=String(url.searchParams.get('cruiseId')||cruises[0]?.id||'');
        if(!cruises.some(item=>item.id===cruiseId))throw Object.assign(new Error('Disruption recovery access is not granted for this sailing.'),{status:403});
        const calls=db.prepare("SELECT id,sequence,port_name,planned_arrival,planned_departure,status FROM port_calls WHERE cruise_id=? ORDER BY sequence").all(cruiseId);
        const events=db.prepare(`SELECT e.id,e.cruise_id,e.port_call_id,e.event_type,e.summary,e.recovery_plan,e.status,e.created_at,e.approved_at,
          p.port_name,c.name AS cruise_name,u.name AS created_by_name,a.name AS approved_by_name,
          (SELECT COUNT(*) FROM disruption_impacts i WHERE i.event_id=e.id) AS impacted_bookings,
          (SELECT COALESCE(SUM(b.guests),0) FROM disruption_impacts i JOIN bookings b ON b.id=i.booking_id WHERE i.event_id=e.id) AS impacted_guests,
          (SELECT COUNT(*) FROM disruption_impacts i WHERE i.event_id=e.id AND i.guest_choice='pending') AS awaiting_guest_choice,
          (SELECT COUNT(*) FROM disruption_tasks t WHERE t.event_id=e.id AND t.status<>'Resolved') AS open_tasks
          FROM disruption_events e JOIN port_calls p ON p.id=e.port_call_id JOIN cruises c ON c.id=e.cruise_id
          JOIN users u ON u.id=e.created_by LEFT JOIN users a ON a.id=e.approved_by
          WHERE e.cruise_id=? AND (?<>'crew' OR e.status='Approved') ORDER BY e.id DESC LIMIT 30`).all(cruiseId,user.role);
        const ids=events.map(item=>Number(item.id));
        const impacts=ids.length?db.prepare(`SELECT i.id AS impact_id,i.event_id,i.booking_id,i.impacted_plans,i.guest_choice,i.guest_choice_at,
          b.reference,b.guests,g.name AS guest_name,t.id AS task_id,t.status AS task_status,t.assigned_to,x.name AS assigned_name
          FROM disruption_impacts i JOIN bookings b ON b.id=i.booking_id JOIN users g ON g.id=b.user_id
          LEFT JOIN disruption_tasks t ON t.event_id=i.event_id AND t.booking_id=i.booking_id LEFT JOIN users x ON x.id=t.assigned_to
          WHERE i.event_id IN (${ids.map(()=>'?').join(',')}) ORDER BY i.event_id DESC,b.reference`).all(...ids):[];
        const tasks=impacts.filter(item=>item.task_id).map(item=>({...item,id:item.task_id,impacted_plans:JSON.parse(item.impacted_plans||'[]')}));
        const taskIds=tasks.map(item=>Number(item.id));
        const taskLogs=taskIds.length?db.prepare(`SELECT l.id,l.task_id,l.event_type,l.details,l.created_at,u.name AS actor_name FROM disruption_task_log l
          JOIN users u ON u.id=l.actor_user_id WHERE l.task_id IN (${taskIds.map(()=>'?').join(',')}) ORDER BY l.id DESC`).all(...taskIds):[];
        for(const task of tasks)task.log=taskLogs.filter(item=>Number(item.task_id)===Number(task.id));
        const normalizedImpacts=impacts.map(item=>({...item,impacted_plans:JSON.parse(item.impacted_plans||'[]')}));
        return json(res,200,{cruises,cruiseId,calls,events,impacts:normalizedImpacts,tasks});
      }
      if(pathname==='/api/disruption-recovery'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);
        const body=await readJson(req),cruiseId=String(body.cruiseId||''),portCallId=Number(body.portCallId),eventType=String(body.eventType||''),summary=String(body.summary||'').trim().slice(0,500),recoveryPlan=String(body.recoveryPlan||'').trim().slice(0,1000);
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot create a recovery plan for this sailing.');
        if(!Number.isInteger(portCallId)||!['delayed','cancelled'].includes(eventType)||summary.length<8||recoveryPlan.length<12)
          throw Object.assign(new Error('Choose a port call and disruption type, then add an incident summary and recovery plan.'),{status:400});
        const port=db.prepare('SELECT id,cruise_id,port_name,status FROM port_calls WHERE id=? AND cruise_id=?').get(portCallId,cruiseId);
        if(!port)throw Object.assign(new Error('That port call is not part of the selected sailing.'),{status:404});
        const result=withTransaction(db,()=>{
          const incident=db.prepare('INSERT INTO disruption_events(cruise_id,port_call_id,event_type,summary,recovery_plan,created_by) VALUES(?,?,?,?,?,?)')
            .run(cruiseId,portCallId,eventType,summary,recoveryPlan,user.id);
          const bookings=db.prepare("SELECT b.id,b.reference,b.guests FROM bookings b WHERE b.cruise_id=? AND b.status IN ('confirmed_demo','confirmed_paid') ORDER BY b.reference").all(cruiseId);
          const plans=db.prepare("SELECT title,guests FROM onboard_reservations WHERE booking_id=? AND plan_type='shore' AND status='saved' ORDER BY id");
          const insert=db.prepare('INSERT INTO disruption_impacts(event_id,booking_id,impacted_plans) VALUES(?,?,?)');
          const affected=bookings.map(booking=>{
            const bookedPlans=plans.all(booking.id).map(item=>({title:item.title,guests:Number(item.guests)}));
            insert.run(incident.lastInsertRowid,booking.id,JSON.stringify(bookedPlans));
            return {reference:booking.reference,guestCount:Number(booking.guests),plans:bookedPlans};
          });
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,cruiseId,'disruption_recovery_drafted',`${port.port_name} · ${eventType} · ${affected.length} booking parties included in impact review`);
          return {id:incident.lastInsertRowid,affectedBookings:affected.length,affectedGuests:affected.reduce((sum,item)=>sum+item.guestCount,0),affected};
        });
        return json(res,201,{...result,status:'Draft',portName:port.port_name,eventType});
      }
      const recoveryApproveMatch=pathname.match(/^\/api\/disruption-recovery\/(\d+)\/approve$/);
      if(recoveryApproveMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const id=Number(recoveryApproveMatch[1]);
        const event=db.prepare('SELECT e.*,p.port_name FROM disruption_events e JOIN port_calls p ON p.id=e.port_call_id WHERE e.id=?').get(id);
        if(!event)throw Object.assign(new Error('Disruption draft not found.'),{status:404});
        requireSailingPermission(db,user,event.cruise_id,'dispatch_faults','You cannot approve this recovery plan.');
        if(event.status!=='Draft')throw Object.assign(new Error('This recovery plan has already been approved.'),{status:409});
        const result=withTransaction(db,()=>{
          const changed=db.prepare("UPDATE disruption_events SET status='Approved',approved_by=?,approved_at=CURRENT_TIMESTAMP WHERE id=? AND status='Draft'").run(user.id,id);
          if(!changed.changes)throw Object.assign(new Error('This recovery plan has already been approved.'),{status:409});
          db.prepare('UPDATE port_calls SET status=?,operations_note=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
            .run(event.event_type,event.summary,user.id,event.port_call_id);
          const impacted=db.prepare('SELECT booking_id FROM disruption_impacts WHERE event_id=?').all(id);
          const message=`${event.port_name}: ${event.event_type==='cancelled'?'Port call cancelled':'Port call delayed'}. ${event.summary} Recovery plan: ${event.recovery_plan}`;
          const notice=db.prepare('INSERT INTO sailing_notices(cruise_id,port_call_id,message,created_by,booking_id) VALUES(?,?,?,?,?)');
          const createTask=db.prepare('INSERT INTO disruption_tasks(event_id,booking_id) VALUES(?,?)');
          const writeTaskLog=db.prepare('INSERT INTO disruption_task_log(task_id,actor_user_id,event_type,details) VALUES(?,?,?,?)');
          for(const item of impacted){
            notice.run(event.cruise_id,event.port_call_id,message,user.id,item.booking_id);
            const task=createTask.run(id,item.booking_id);
            writeTaskLog.run(task.lastInsertRowid,user.id,'recovery_task_created',`Guest follow-up for ${event.port_name} disruption`);
          }
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,event.cruise_id,'disruption_recovery_approved',`${event.port_name} · ${event.event_type} · ${impacted.length} booking parties notified`);
          return {ok:true,notifiedBookings:impacted.length,status:'Approved'};
        });
        return json(res,200,result);
      }
      const recoveryChoiceMatch=pathname.match(/^\/api\/disruption-recovery\/(\d+)\/choice$/);
      if(recoveryChoiceMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);const body=await readJson(req),eventId=Number(recoveryChoiceMatch[1]),impactId=Number(body.impactId),choice=String(body.choice||'');
        if(!Number.isInteger(impactId)||!['alternative','no_help'].includes(choice))throw Object.assign(new Error('Choose one of the available recovery responses.'),{status:400});
        const impact=db.prepare(`SELECT i.id,i.event_id,i.booking_id,i.guest_choice,e.cruise_id,e.port_call_id,e.summary,e.recovery_plan,e.status,p.port_name
          FROM disruption_impacts i JOIN disruption_events e ON e.id=i.event_id JOIN port_calls p ON p.id=e.port_call_id
          JOIN bookings b ON b.id=i.booking_id WHERE i.id=? AND i.event_id=? AND b.user_id=?`).get(impactId,eventId,user.id);
        if(!impact)throw Object.assign(new Error('This recovery update does not belong to your booking.'),{status:404});
        if(impact.status!=='Approved')throw Object.assign(new Error('This recovery update is not active.'),{status:409});
        if(impact.guest_choice!=='pending'){
          if(impact.guest_choice===choice)return json(res,200,{ok:true,choice,replayed:true});
          throw Object.assign(new Error('A response has already been recorded for this update.'),{status:409});
        }
        withTransaction(db,()=>{
          const changed=db.prepare("UPDATE disruption_impacts SET guest_choice=?,guest_choice_at=CURRENT_TIMESTAMP WHERE id=? AND guest_choice='pending'").run(choice,impactId);
          if(!changed.changes)throw Object.assign(new Error('A response has already been recorded for this update.'),{status:409});
          if(choice==='no_help'){
            const task=db.prepare("SELECT id FROM disruption_tasks WHERE event_id=? AND booking_id=? AND status='Open'").get(eventId,impact.booking_id);
            if(task){db.prepare("UPDATE disruption_tasks SET status='Resolved',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(task.id);
              db.prepare('INSERT INTO disruption_task_log(task_id,actor_user_id,event_type,details) VALUES(?,?,?,?)').run(task.id,user.id,'guest_declined_assistance','Guest selected no follow-up needed.');}
          }
          db.prepare('INSERT INTO sailing_operations_log(actor_user_id,cruise_id,event_type,details) VALUES(?,?,?,?)')
            .run(user.id,impact.cruise_id,'disruption_guest_response',`${impact.port_name} · booking #${impact.booking_id} · ${choice==='alternative'?'guest requested an onboard alternative':'guest declined follow-up'}`);
        });
        return json(res,200,{ok:true,choice});
      }
      const recoveryTaskMatch=pathname.match(/^\/api\/disruption-recovery\/tasks\/(\d+)$/);
      if(recoveryTaskMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),taskId=Number(recoveryTaskMatch[1]),next=String(body.status||''),note=String(body.note||'').trim().slice(0,300);
        const task=db.prepare(`SELECT t.id,t.booking_id,t.status,t.assigned_to,e.cruise_id,e.status AS event_status,p.port_name,b.reference
          FROM disruption_tasks t JOIN disruption_events e ON e.id=t.event_id JOIN port_calls p ON p.id=e.port_call_id
          JOIN bookings b ON b.id=t.booking_id WHERE t.id=?`).get(taskId);
        if(!task)throw Object.assign(new Error('Recovery task not found.'),{status:404});
        requireSailingPermission(db,user,task.cruise_id,user.role==='crew'?'view_jobs':'dispatch_faults','You cannot work on this sailing.');
        if(task.event_status!=='Approved')throw Object.assign(new Error('The captain must approve this recovery plan first.'),{status:409});
        if(!['Accepted','In progress','Resolved'].includes(next))throw Object.assign(new Error('Choose accept, start, or complete.'),{status:400});
        withTransaction(db,()=>{
          let changed;
          if(next==='Accepted'){
            if(user.role!=='crew'||task.status!=='Open'||task.assigned_to)throw Object.assign(new Error('This follow-up is no longer available to accept.'),{status:409});
            changed=db.prepare("UPDATE disruption_tasks SET status='Accepted',assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Open' AND assigned_to IS NULL").run(user.id,taskId);
          }else if(next==='In progress'){
            if(user.role!=='crew'||Number(task.assigned_to)!==Number(user.id)||task.status!=='Accepted')throw Object.assign(new Error('Only the crew member who accepted this follow-up can start it.'),{status:403});
            changed=db.prepare("UPDATE disruption_tasks SET status='In progress',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Accepted' AND assigned_to=?").run(taskId,user.id);
          }else{
            if(user.role==='crew'&&(Number(task.assigned_to)!==Number(user.id)||!['Accepted','In progress'].includes(task.status)))throw Object.assign(new Error('Only the assigned crew member can complete this follow-up.'),{status:403});
            changed=user.role==='crew'
              ?db.prepare("UPDATE disruption_tasks SET status='Resolved',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('Accepted','In progress') AND assigned_to=?").run(taskId,user.id)
              :db.prepare("UPDATE disruption_tasks SET status='Resolved',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'Resolved'").run(taskId);
          }
          if(!changed?.changes)throw Object.assign(new Error('This follow-up has already changed.'),{status:409});
          db.prepare('INSERT INTO disruption_task_log(task_id,actor_user_id,event_type,details) VALUES(?,?,?,?)').run(taskId,user.id,`recovery_task_${next.toLowerCase().replace(' ','_')}`,note||`Follow-up marked ${next.toLowerCase()}`);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:`recovery_task_${next.toLowerCase().replace(' ','_')}`,category:'Guest recovery',summary:`${task.port_name} recovery · ${task.reference}`,details:note||`Follow-up marked ${next.toLowerCase()}`,entityId:taskId});
        });
        return json(res,200,{ok:true,status:next});
      }
      if(pathname==='/api/guest/itinerary'&&req.method==='GET'){
        requireRole(user,['passenger']);const booking=db.prepare("SELECT id,cruise_id FROM bookings WHERE user_id=? AND status IN ('confirmed_demo','confirmed_paid') ORDER BY id DESC LIMIT 1").get(user.id);
        if(!booking)return json(res,200,{cruiseId:null,calls:[],notices:[],musterStation:null,disruptions:[]});
        const calls=db.prepare('SELECT id,sequence,port_name,planned_arrival,planned_departure,actual_arrival,actual_departure,status FROM port_calls WHERE cruise_id=? ORDER BY sequence').all(booking.cruise_id);
        const notices=db.prepare('SELECT id,message,created_at FROM sailing_notices WHERE cruise_id=? AND (booking_id IS NULL OR booking_id=?) ORDER BY id DESC LIMIT 8').all(booking.cruise_id,booking.id);
        const cabin=db.prepare('SELECT ca.deck FROM bookings b JOIN cabins ca ON ca.id=b.cabin_id WHERE b.user_id=? AND b.cruise_id=? AND b.status IN (\'confirmed_demo\',\'confirmed_paid\') ORDER BY b.id DESC LIMIT 1').get(user.id,booking.cruise_id);
        const musterStation=db.prepare(`SELECT id,name,location FROM muster_stations WHERE cruise_id=? ORDER BY CASE WHEN ? BETWEEN deck_min AND deck_max THEN 0 ELSE 1 END,id LIMIT 1`).get(booking.cruise_id,Number(cabin?.deck||0));
        const disruptions=db.prepare(`SELECT e.id AS event_id,i.id AS impact_id,e.event_type,e.summary,e.recovery_plan,e.status,e.created_at,
          p.port_name,i.guest_choice,i.guest_choice_at,i.impacted_plans,t.status AS followup_status,a.name AS followup_crew
          FROM disruption_impacts i JOIN disruption_events e ON e.id=i.event_id JOIN port_calls p ON p.id=e.port_call_id
          LEFT JOIN disruption_tasks t ON t.event_id=e.id AND t.booking_id=i.booking_id LEFT JOIN users a ON a.id=t.assigned_to
          WHERE i.booking_id=? AND e.status='Approved' ORDER BY e.id DESC LIMIT 8`).all(booking.id)
          .map(item=>({...item,impacted_plans:JSON.parse(item.impacted_plans||'[]')}));
        return json(res,200,{cruiseId:booking.cruise_id,calls,notices,musterStation:musterStation||null,disruptions});
      }
      if(pathname==='/api/port-operations'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);const cruises=db.prepare('SELECT id,name,ship,date FROM cruises ORDER BY date_start,id').all()
          .filter(item=>hasSailingPermission(db,user,item.id,user.role==='crew'?'view_jobs':'dispatch_faults'));
        const cruiseId=String(url.searchParams.get('cruiseId')||cruises[0]?.id||'');
        if(!cruises.some(item=>item.id===cruiseId))throw Object.assign(new Error('Port operations access is not granted for this sailing.'),{status:403});
        const calls=db.prepare(`SELECT p.*,u.name AS updated_by_name FROM port_calls p JOIN users u ON u.id=p.updated_by WHERE p.cruise_id=? ORDER BY p.sequence`).all(cruiseId);
        const notices=db.prepare('SELECT n.id,n.message,n.created_at,u.name AS actor_name FROM sailing_notices n JOIN users u ON u.id=n.created_by WHERE n.cruise_id=? ORDER BY n.id DESC LIMIT 20').all(cruiseId);
        return json(res,200,{cruises,cruiseId,calls,notices});
      }
      if(pathname==='/api/port-calls'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req),cruiseId=String(body.cruiseId||''),portName=String(body.portName||'').trim().slice(0,80),arrival=String(body.plannedArrival||''),departure=String(body.plannedDeparture||''),sequence=Number(body.sequence);
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot edit the itinerary for this sailing.');
        if(portName.length<2||!Number.isInteger(sequence)||sequence<1||!Number.isFinite(Date.parse(arrival))||!Number.isFinite(Date.parse(departure))||Date.parse(departure)<=Date.parse(arrival))
          throw Object.assign(new Error('Enter a port, sequence, arrival, and a later departure time.'),{status:400});
        if(db.prepare('SELECT id FROM port_calls WHERE cruise_id=? AND sequence=?').get(cruiseId,sequence))
          throw Object.assign(new Error('That stop number is already used on this sailing.'),{status:409});
        const result=db.prepare('INSERT INTO port_calls(cruise_id,sequence,port_name,planned_arrival,planned_departure,updated_by) VALUES(?,?,?,?,?,?)')
          .run(cruiseId,sequence,portName,arrival,departure,user.id);
        return json(res,201,{id:result.lastInsertRowid,cruiseId,sequence,portName,plannedArrival:arrival,plannedDeparture:departure,status:'planned'});
      }
      const portCallMatch=pathname.match(/^\/api\/port-calls\/(\d+)$/);
      if(portCallMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req),id=Number(portCallMatch[1]),call=db.prepare('SELECT * FROM port_calls WHERE id=?').get(id);
        if(!call)throw Object.assign(new Error('Port call not found.'),{status:404});requireSailingPermission(db,user,call.cruise_id,'dispatch_faults','You cannot edit this itinerary.');
        const statuses=['planned','approaching','alongside','departed','delayed','cancelled'],status=String(body.status||call.status),actualArrival=String(body.actualArrival||''),actualDeparture=String(body.actualDeparture||''),note=String(body.operationsNote||'').trim().slice(0,300);
        if(!statuses.includes(status)||actualArrival&&!Number.isFinite(Date.parse(actualArrival))||actualDeparture&&!Number.isFinite(Date.parse(actualDeparture)))throw Object.assign(new Error('Port status or actual time is invalid.'),{status:400});
        withTransaction(db,()=>{
          db.prepare('UPDATE port_calls SET status=?,actual_arrival=?,actual_departure=?,operations_note=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
            .run(status,actualArrival||null,actualDeparture||null,note,user.id,id);
          if(body.notifyGuests){const message=`${call.port_name}: ${status.replace(/^./,x=>x.toUpperCase())}.${actualArrival?` Actual arrival: ${actualArrival}.`:''}${note?` ${note}`:''}`;
            db.prepare('INSERT INTO sailing_notices(cruise_id,port_call_id,message,created_by) VALUES(?,?,?,?)').run(call.cruise_id,id,message,user.id);}
        });
        return json(res,200,{ok:true,status,notified:Boolean(body.notifyGuests)});
      }
      if(pathname==='/api/preventive'&&req.method==='GET'){
        requireRole(user,['crew','captain','manager']);const cruises=db.prepare('SELECT id,name,ship,date FROM cruises ORDER BY date_start,id').all()
          .filter(item=>hasSailingPermission(db,user,item.id,user.role==='crew'?'view_jobs':'dispatch_faults'));
        const cruiseId=String(url.searchParams.get('cruiseId')||cruises[0]?.id||'');
        if(!cruises.some(item=>item.id===cruiseId))throw Object.assign(new Error('Maintenance access is not granted for this sailing.'),{status:403});
        const schedules=db.prepare(`SELECT s.id AS schedule_id,s.task,s.interval_days,s.next_due_date,s.last_completed_at,a.id AS asset_id,a.asset_tag,a.name AS asset_name,
          a.department,a.location,a.criticality,s.assigned_to,u.name AS assigned_name
          FROM maintenance_schedules s JOIN maintenance_assets a ON a.id=s.asset_id LEFT JOIN users u ON u.id=s.assigned_to
          WHERE a.cruise_id=? AND s.active=1 AND a.active=1 ORDER BY s.next_due_date,a.name`).all(cruiseId);
        const visibleSchedules=user.role==='crew'?schedules.filter(item=>!item.assigned_to||Number(item.assigned_to)===Number(user.id)):schedules;
        const assets=db.prepare('SELECT id,asset_tag,name,department,location,criticality FROM maintenance_assets WHERE cruise_id=? AND active=1 ORDER BY name').all(cruiseId);
        const crew=db.prepare(`SELECT u.id,u.name FROM users u JOIN staff_sailing_permissions p ON p.user_id=u.id WHERE u.role='crew' AND p.cruise_id=? AND p.view_jobs=1 ORDER BY u.name`).all(cruiseId);
        const ids=visibleSchedules.map(item=>Number(item.schedule_id));const log=ids.length?db.prepare(`SELECT l.id,l.schedule_id,l.event_type,l.details,l.created_at,u.name AS actor_name FROM maintenance_schedule_log l
          JOIN users u ON u.id=l.actor_user_id WHERE l.schedule_id IN (${ids.map(()=>'?').join(',')}) ORDER BY l.id DESC LIMIT 60`).all(...ids):[];
        return json(res,200,{cruises,cruiseId,assets,schedules:visibleSchedules,crew,log});
      }
      if(pathname==='/api/preventive/assets'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['captain','manager']);const body=await readJson(req),cruiseId=String(body.cruiseId||''),assetTag=String(body.assetTag||'').trim().slice(0,30),name=String(body.name||'').trim().slice(0,80),department=String(body.department||'Engineering').trim().slice(0,60),location=String(body.location||'').trim().slice(0,100),criticality=String(body.criticality||'Normal'),task=String(body.task||'').trim().slice(0,160),intervalDays=Number(body.intervalDays),nextDue=String(body.nextDueDate||'');
        requireSailingPermission(db,user,cruiseId,'dispatch_faults','You cannot manage maintenance on this sailing.');
        const assignedTo=body.assignedTo?Number(body.assignedTo):null;
        if(assetTag.length<2||name.length<2||location.length<3||task.length<4||!['Normal','Important','Critical'].includes(criticality)||!Number.isInteger(intervalDays)||intervalDays<1||intervalDays>3650||!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)||!Number.isFinite(Date.parse(`${nextDue}T00:00:00Z`)))
          throw Object.assign(new Error('Complete the asset, location, maintenance task, interval, and next due date.'),{status:400});
        if(assignedTo&&!db.prepare("SELECT 1 FROM users u JOIN staff_sailing_permissions p ON p.user_id=u.id WHERE u.id=? AND u.role='crew' AND p.cruise_id=? AND p.view_jobs=1").get(assignedTo,cruiseId))
          throw Object.assign(new Error('Assign maintenance only to crew authorized for this sailing.'),{status:400});
        const result=withTransaction(db,()=>{
          const asset=db.prepare('INSERT INTO maintenance_assets(cruise_id,asset_tag,name,department,location,criticality,created_by) VALUES(?,?,?,?,?,?,?)').run(cruiseId,assetTag,name,department,location,criticality,user.id);
          const schedule=db.prepare('INSERT INTO maintenance_schedules(asset_id,task,interval_days,next_due_date,assigned_to,created_by) VALUES(?,?,?,?,?,?)').run(asset.lastInsertRowid,task,intervalDays,nextDue,assignedTo,user.id);
          db.prepare('INSERT INTO maintenance_schedule_log(schedule_id,actor_user_id,event_type,details) VALUES(?,?,\'schedule_created\',?)').run(schedule.lastInsertRowid,user.id,`${assetTag} · ${task} · due ${nextDue}`);
          return {assetId:asset.lastInsertRowid,scheduleId:schedule.lastInsertRowid};
        });
        return json(res,201,result);
      }
      const preventiveCompleteMatch=pathname.match(/^\/api\/preventive\/schedules\/(\d+)\/complete$/);
      if(preventiveCompleteMatch&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),id=Number(preventiveCompleteMatch[1]),note=String(body.note||'').trim().slice(0,300);
        const receipt=offlineReceipt(db,user,body,`/api/preventive/schedules/${id}/complete`);if(receipt?.replay)return json(res,200,{...receipt.replay,replayed:true});
        const row=db.prepare(`SELECT s.id,s.task,s.interval_days,s.next_due_date,s.assigned_to,a.cruise_id,a.asset_tag,a.name AS asset_name,a.location
          FROM maintenance_schedules s JOIN maintenance_assets a ON a.id=s.asset_id WHERE s.id=? AND s.active=1 AND a.active=1`).get(id);
        if(!row)throw Object.assign(new Error('Preventive maintenance task not found.'),{status:404});
        requireSailingPermission(db,user,row.cruise_id,user.role==='crew'?'view_jobs':'dispatch_faults','You cannot complete maintenance for this sailing.');
        if(user.role==='crew'&&row.assigned_to&&Number(row.assigned_to)!==Number(user.id))throw Object.assign(new Error('This maintenance task is assigned to another crew member.'),{status:403});
        const nextDue=db.prepare("SELECT date('now',?) AS value").get(`+${Number(row.interval_days)} days`).value;
        const response=withTransaction(db,()=>{
          db.prepare('UPDATE maintenance_schedules SET next_due_date=?,last_completed_at=CURRENT_TIMESTAMP WHERE id=?').run(nextDue,id);
          db.prepare('INSERT INTO maintenance_schedule_log(schedule_id,actor_user_id,event_type,details) VALUES(?,?,\'service_completed\',?)').run(id,user.id,`${row.asset_tag} · ${row.task} · next due ${nextDue}${note?` · ${note}`:''}`);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:'maintenance_service_completed',category:'Equipment',summary:row.task,details:`${row.asset_tag} · ${row.location} · next due ${nextDue}${note?` · ${note}`:''}`,entityId:id});
          const result={ok:true,nextDueDate:nextDue};saveOfflineReceipt(db,user,receipt,`/api/preventive/schedules/${id}/complete`,result);return result;
        });
        return json(res,200,response);
      }
      if(pathname==='/api/service-cases'&&req.method==='GET'){
        requireRole(user,['passenger','crew','captain','manager']);let rows=[];
        if(user.role==='passenger')rows=db.prepare(`SELECT x.id,x.booking_id,x.cruise_id,x.category,x.title,x.description,x.priority,x.status,x.created_at,x.updated_at,
            c.name AS cruise_name,b.reference,ca.cabin_number,NULL AS guest_name,NULL AS assigned_name
            FROM guest_service_cases x JOIN cruises c ON c.id=x.cruise_id JOIN bookings b ON b.id=x.booking_id JOIN cabins ca ON ca.id=b.cabin_id
            WHERE x.user_id=? ORDER BY x.id DESC LIMIT 30`).all(user.id);
        else rows=db.prepare(`SELECT x.id,x.booking_id,x.cruise_id,x.user_id,x.category,x.title,x.description,x.priority,x.status,x.assigned_to,x.created_at,x.updated_at,
            c.name AS cruise_name,b.reference,ca.cabin_number,g.name AS guest_name,a.name AS assigned_name
            FROM guest_service_cases x JOIN cruises c ON c.id=x.cruise_id JOIN bookings b ON b.id=x.booking_id JOIN cabins ca ON ca.id=b.cabin_id
            JOIN users g ON g.id=x.user_id LEFT JOIN users a ON a.id=x.assigned_to ORDER BY CASE x.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,x.id DESC LIMIT 100`).all()
          .filter(item=>hasSailingPermission(db,user,item.cruise_id,user.role==='crew'?'view_jobs':'dispatch_faults'))
          .filter(item=>user.role!=='crew'||!item.assigned_to||Number(item.assigned_to)===Number(user.id));
        const ids=rows.map(item=>Number(item.id));const logs=ids.length?db.prepare(`SELECT l.id,l.case_id,l.event_type,l.details,l.created_at,u.name AS actor_name FROM guest_service_case_log l
          JOIN users u ON u.id=l.actor_user_id WHERE l.case_id IN (${ids.map(()=>'?').join(',')}) ORDER BY l.id DESC`).all(...ids):[];
        return json(res,200,{cases:rows,log:logs});
      }
      if(pathname==='/api/service-cases'&&req.method==='POST'){
        requireSameOrigin(req);requireRole(user,['passenger']);const body=await readJson(req),bookingId=Number(body.bookingId),category=String(body.category||''),title=String(body.title||'').trim().slice(0,100),description=String(body.description||'').trim().slice(0,500),priority=String(body.priority||'Normal');
        const receipt=offlineReceipt(db,user,body,'/api/service-cases');if(receipt?.replay)return json(res,200,{...receipt.replay,replayed:true});
        const booking=db.prepare("SELECT id,cruise_id FROM bookings WHERE id=? AND user_id=? AND status IN ('confirmed_demo','confirmed_paid')").get(bookingId,user.id);
        if(!booking)throw Object.assign(new Error('Choose an active booking before sending a guest request.'),{status:409});
        if(!['Cabin service','Dining','Accessibility','Shore experience','Other'].includes(category)||title.length<3||!['Normal','High','Urgent'].includes(priority))throw Object.assign(new Error('Choose a request type, title, and valid priority.'),{status:400});
        const response=withTransaction(db,()=>{
          const record=db.prepare('INSERT INTO guest_service_cases(user_id,booking_id,cruise_id,category,title,description,priority) VALUES(?,?,?,?,?,?,?)').run(user.id,booking.id,booking.cruise_id,category,title,description,priority);
          db.prepare('INSERT INTO guest_service_case_log(case_id,actor_user_id,event_type,details) VALUES(?,?,\'case_opened\',?)').run(record.lastInsertRowid,user.id,description);
          const result={id:record.lastInsertRowid,status:'Open',title,category,priority};saveOfflineReceipt(db,user,receipt,'/api/service-cases',result);return result;
        });
        return json(res,201,response);
      }
      const serviceCaseMatch=pathname.match(/^\/api\/service-cases\/(\d+)$/);
      if(serviceCaseMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['crew','captain','manager']);const body=await readJson(req),id=Number(serviceCaseMatch[1]),next=String(body.status||''),note=String(body.note||'').trim().slice(0,300);
        const record=db.prepare('SELECT id,cruise_id,status,assigned_to,title FROM guest_service_cases WHERE id=?').get(id);
        if(!record)throw Object.assign(new Error('Guest service request not found.'),{status:404});
        requireSailingPermission(db,user,record.cruise_id,user.role==='crew'?'view_jobs':'dispatch_faults','You cannot manage guest requests on this sailing.');
        if(!['Accepted','In progress','Resolved'].includes(next))throw Object.assign(new Error('Choose accept, start, or resolve.'),{status:400});
        withTransaction(db,()=>{
          if(next==='Accepted'){
            if(user.role!=='crew'||record.status!=='Open'||record.assigned_to)throw Object.assign(new Error('This request is no longer available to accept.'),{status:409});
            const changed=db.prepare("UPDATE guest_service_cases SET status='Accepted',assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Open' AND assigned_to IS NULL").run(user.id,id);
            if(!changed.changes)throw Object.assign(new Error('This request was accepted by another crew member.'),{status:409});
          }else if(next==='In progress'){
            if(user.role!=='crew'||Number(record.assigned_to)!==Number(user.id)||record.status!=='Accepted')throw Object.assign(new Error('Only the crew member who accepted this request can start it.'),{status:403});
            const changed=db.prepare("UPDATE guest_service_cases SET status='In progress',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Accepted' AND assigned_to=?").run(id,user.id);
            if(!changed.changes)throw Object.assign(new Error('This request has already changed.'),{status:409});
          }else{
            if(user.role==='crew'&&(Number(record.assigned_to)!==Number(user.id)||!['Accepted','In progress'].includes(record.status)))throw Object.assign(new Error('Only the crew member who accepted this request can resolve it.'),{status:403});
            const changed=user.role==='crew'
              ?db.prepare("UPDATE guest_service_cases SET status='Resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('Accepted','In progress') AND assigned_to=?").run(id,user.id)
              :db.prepare("UPDATE guest_service_cases SET status='Resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'Resolved'").run(id);
            if(!changed.changes)throw Object.assign(new Error('This request is already resolved.'),{status:409});
          }
          db.prepare('INSERT INTO guest_service_case_log(case_id,actor_user_id,event_type,details) VALUES(?,?,?,?)').run(id,user.id,`case_${next.toLowerCase().replace(' ','_')}`,note||`Status changed to ${next}`);
          if(user.role==='crew')logCrewActivity(db,{crewUserId:user.id,actorUserId:user.id,eventType:`guest_case_${next.toLowerCase().replace(' ','_')}`,category:'Guest services',summary:record.title,details:`Guest request ${next.toLowerCase()}${note?` · ${note}`:''}`,entityId:id});
        });
        return json(res,200,{ok:true,status:next});
      }
      const swapMatch=pathname.match(/^\/api\/swaps\/(\d+)$/);
      if(swapMatch&&req.method==='PATCH'){
        requireSameOrigin(req);requireRole(user,['manager','captain']);const body=await readJson(req);
        if(!['approved','declined'].includes(body.status))throw Object.assign(new Error('Choose approve or decline.'),{status:400});
        const request=db.prepare('SELECT r.id,r.user_id,r.reason,s.title AS shift FROM shift_swap_requests r LEFT JOIN shifts s ON s.id=r.shift_id WHERE r.id=? AND r.status=\'pending\'').get(Number(swapMatch[1]));
        if(!request)throw Object.assign(new Error('Pending shift-swap request not found.'),{status:404});
        withTransaction(db,()=>{
          const result=db.prepare("UPDATE shift_swap_requests SET status=? WHERE id=? AND status='pending'").run(body.status,Number(swapMatch[1]));
          if(!result.changes)throw Object.assign(new Error('Pending shift-swap request not found.'),{status:404});
          logCrewActivity(db,{crewUserId:request.user_id,actorUserId:user.id,eventType:`shift_swap_${body.status}`,category:'Shift',summary:`Shift swap ${body.status}`,details:`${request.shift||'Assigned shift'} · ${request.reason}`,entityId:request.id});
        });
        return json(res,200,{ok:true,status:body.status});
      }
      if(pathname==='/api/backlog'&&req.method==='GET'){
        requireRole(user,['manager','captain']);
        const rows=db.prepare(`SELECT f.id AS feedback_id,f.type,f.title,f.status,f.created_at,u.name AS submitted_by
          FROM feedback f JOIN users u ON u.id=f.user_id WHERE f.type IN ('Feature request','Operational problem') ORDER BY f.id DESC LIMIT 100`).all();
        return json(res,200,rows);
      }
      if(pathname==='/api/auth/reset-request'&&req.method==='POST'){
        requireSameOrigin(req);const body=await readJson(req);const email=String(body.email||'').trim().toLowerCase();
        const exists=db.prepare('SELECT id FROM users WHERE email=?').get(email);
        if(exists){
          const token=crypto.randomBytes(24).toString('base64url');const h=crypto.createHash('sha256').update(token).digest('hex');
          db.prepare('CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL)');
          db.prepare('DELETE FROM password_resets WHERE user_id=?').run(exists.id);
          db.prepare('INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)').run(h,exists.id,Date.now()+15*60*1000);
          if(process.env.NODE_ENV!=='production')console.log(`Development password reset token for ${email}: ${token}`);
        }
        return json(res,200,{ok:true,message:'If the account exists, reset instructions will be sent.'});
      }
      if(pathname==='/api/auth/reset'&&req.method==='POST'){
        requireSameOrigin(req);const body=await readJson(req);const token=String(body.token||''),password=String(body.password||'');
        if(password.length<10||password.length>128)throw Object.assign(new Error('Use a password with at least 10 characters.'),{status:400});
        const h=crypto.createHash('sha256').update(token).digest('hex');
        const reset=db.prepare('SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>?').get(h,Date.now());
        if(!reset)throw Object.assign(new Error('That reset link is invalid or expired.'),{status:400});
        const hashed=hashPassword(password);db.prepare('UPDATE users SET password_salt=?,password_hash=? WHERE id=?').run(hashed.salt,hashed.hash,reset.user_id);
        db.prepare('DELETE FROM password_resets WHERE user_id=?').run(reset.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(reset.user_id);
        return json(res,200,{ok:true,message:'Password updated. Sign in with your new password.'},{'Set-Cookie':sessionCookie('',0)});
      }
      if(pathname.startsWith('/api/'))return json(res,404,{error:'API route not found.'});

      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
      const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
      const file=path.resolve(publicRoot,relative);
      if(file!==publicRoot&&!file.startsWith(path.resolve(publicRoot)+path.sep))return json(res,403,{error:'Forbidden.'});
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())return json(res,404,{error:'Not found.'});
      const ext=path.extname(file).toLowerCase();
      const contentType={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'}[ext]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-cache'});
      if(req.method==='HEAD')return res.end();
      fs.createReadStream(file).pipe(res);
    }catch(err){
      const status=err.status||500;
      if(status===500)console.error(err);
      if(!res.headersSent)return json(res,status,{error:status===500?'Something went wrong. Please try again.':err.message});
      res.destroy();
    }
  });
  server.on('close',()=>db.close());
  server.harborlineDb=db;
  return server;
}

if(require.main===module){
  const port=Number(process.env.PORT||8765);
  const server=createHarborlineServer();
  server.listen(port,'127.0.0.1',()=>{
    console.log(`Harborline is running at http://127.0.0.1:${port}`);
    if(process.env.NODE_ENV!=='production')console.log('Development demo accounts:',demoAccounts.map(a=>`${a.role}: ${a.email} / ${a.password}`).join('\n'));
  });
}

module.exports={createHarborlineServer,demoAccounts};
