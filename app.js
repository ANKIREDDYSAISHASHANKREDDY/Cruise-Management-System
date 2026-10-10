/* Harborline local MVP client: role workspaces load and save through the server API. */
const D = window.HarborlineDomain;
const iconPaths = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  ticket:'<path d="M4 7V5h16v2a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4Z"/><path d="M12 8v1m0 3v1m0 3v1"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart:'<path d="M3 3v18h18M8 15l4-4 3 3 6-7"/>',
  sparkle:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14Z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  moon:'<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z"/>',
  bed:'<path d="M3 19v-9m0 5h18v4m0-7v7M3 15V9h5a4 4 0 0 1 4 4v2m0 0v-2a4 4 0 0 1 4-4h2a3 3 0 0 1 3 3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/>',
  fork:'<path d="M6 3v6m4-6v6M8 9v12M18 3v18M18 3c-3 3-3 8 0 9"/>',
  shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  wrench:'<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-3-3 3.7-2.7Z"/>',
  bag:'<path d="M5 8h14l1 13H4L5 8Zm4 0V6a3 3 0 0 1 6 0v2"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  users2:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-3.87"/>'
};
const svgIcon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.sparkle}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svgIcon(el.dataset.icon); });

let cruises = [
  {id:'c1',name:'Atlantic Breeze',region:'Caribbean',route:'Miami · Nassau · Cozumel',days:7,from:1249,ship:'MV Solstice',date:'Oct 18 – 25, 2026',art:'caribbean',tags:['family','warm','adventure'],desc:'Sunlit island days, a little open ocean, and evenings that stretch out on deck.'},
  {id:'c2',name:'Aegean Blue',region:'Mediterranean',route:'Athens · Santorini · Dubrovnik',days:9,from:1890,ship:'MV Asteria',date:'Nov 02 – 11, 2026',art:'greece',tags:['culture','warm','food'],desc:'Whitewashed villages and late dinners, stitched together by the blue Aegean.'},
  {id:'c3',name:'Northern Passage',region:'Northern Europe',route:'Bergen · Ålesund · Geiranger',days:8,from:2140,ship:'MV Fjordlight',date:'Nov 16 – 24, 2026',art:'nordic',tags:['nature','cool','culture'],desc:'A quiet route through deep fjords, mountain air, and small coastal towns.'},
  {id:'c4',name:'Coral & Cay',region:'Caribbean',route:'San Juan · St. Lucia · Barbados',days:6,from:1080,ship:'MV Solstice',date:'Dec 04 – 10, 2026',art:'islands',tags:['family','warm','relax'],desc:'A slower island-hopping escape with plenty of time to find your own cove.'},
  {id:'c5',name:'Mediterranean Table',region:'Mediterranean',route:'Barcelona · Marseille · Genoa',days:7,from:1575,ship:'MV Asteria',date:'Dec 12 – 19, 2026',art:'mediterranean',tags:['culture','food','warm'],desc:'Market mornings, old harbors, and the long way around the dinner table.'},
  {id:'c6',name:'Wild Coast',region:'Northern Europe',route:'Reykjavik · Ísafjörður · Akureyri',days:10,from:2460,ship:'MV Fjordlight',date:'Jan 08 – 18, 2027',art:'nordic',tags:['nature','cool','adventure'],desc:'Big landscapes, unhurried sea days, and a chance to see the north differently.'}
];
const seedBacklog = [
  {id:'US-001',story:'As a passenger, I want to discover upcoming cruises so I can choose a journey that fits my plans.',priority:'High',sprint:'2',status:'Ready'},
  {id:'US-002',story:'As a passenger, I want to compare routes, dates, and prices so I can make an informed choice.',priority:'High',sprint:'2',status:'Ready'},
  {id:'US-003',story:'As a passenger, I want to see cabin availability and select a cabin so I know where I will stay.',priority:'High',sprint:'3',status:'Ready'},
  {id:'US-004',story:'As a passenger, I want to complete a booking and receive a digital boarding pass.',priority:'High',sprint:'3–4',status:'In progress'},
  {id:'US-005',story:'As a passenger, I want to review my itinerary and onboard reservations in one place.',priority:'Medium',sprint:'5',status:'Planned'},
  {id:'US-006',story:'As a crew member, I want to see my next shift and assigned tasks so I can prepare for duty.',priority:'High',sprint:'6',status:'Planned'},
  {id:'US-007',story:'As a ship manager, I want to review occupancy and operational exceptions so I can act early.',priority:'Medium',sprint:'9',status:'Planned'},
  {id:'US-008',story:'As a passenger, I want to tell the team what needs improving so the service can adapt.',priority:'High',sprint:'1+',status:'In progress'},
  {id:'US-009',story:'As a crew member, I want to request a shift swap and see whether I am qualified for the shift.',priority:'Medium',sprint:'7',status:'Planned'},
  {id:'US-010',story:'As a passenger, I want context-aware suggestions for dining and activities on my voyage.',priority:'Medium',sprint:'5',status:'Planned'}
];
const demoFeedback = [
  {role:'Passenger',type:'Usability',title:'Keep the booking steps easy to scan',message:'Prototype prompt: can a guest tell what happens next in the cabin selection flow?',date:'Discovery assumption · validate with passengers',status:'To review'},
  {role:'Crew member',type:'Workflow',title:'Make a shift swap visible to the manager',message:'Prototype prompt: what information is needed before approving a swap?',date:'Sprint 6 discovery question',status:'To review'}
];
const demoChanges = [
  {id:'CR-001',date:'Illustrative · Sprint 3',title:'Cabin choice grows from a list into a deck map',detail:'Initial story: select a cabin. Adapted story: show deck and cabin position before the guest confirms. Trigger: validate whether a plain cabin list gives enough context.',priority:'High'},
  {id:'CR-002',date:'Illustrative · Sprint 5',title:'The itinerary surfaces timing conflicts',detail:'Initial story: browse onboard activities. Adapted story: flag an activity that overlaps a confirmed dining reservation. Trigger: validate schedule clarity with passengers.',priority:'Medium'},
  {id:'CR-003',date:'Illustrative · Sprint 6',title:'Crew shifts include a swap request path',detail:'Initial story: view assigned shifts. Adapted story: request an eligible shift swap for manager review. Trigger: discover the crew scheduling workflow with staff.',priority:'Medium'}
];
const defaultState = {feedback:[],extraBacklog:[],bookings:[],tasks:{},swapRequested:false,swapRequests:[],reservations:[],checkin:false,crewActivityEvents:[],activityTodayCount:0,showAllCrewActivity:false,serviceCases:[]};
let state = {...defaultState,maintenanceJobs:[],maintenanceLog:[],staffAccess:[]};
let sessionUser = null;
let taskRecords = [];
let shiftRecords = [];
let operationsData = null;
let diningOperationsData = null;
let paymentConfig={provider:'demo',webhookReady:false};
let staffAdminData = null;
let sailingSetupData = null;
let selectedStaffUserId = 0;
let selectedStaffCruiseId = '';
let selectedBoardingCruiseId = '';
let boardingManifest = [];
let boardingScannerStream = null;
let boardingScannerFrame = 0;
let selectedDiningCruiseId = 'c1';
let selectedDiningBatchId = 0;
let musterData=null,selectedMusterCruiseId='',preventiveData=null,selectedPreventiveCruiseId='',portOperationsData=null,selectedPortCruiseId='',disruptionData=null,selectedDisruptionCruiseId='',serviceCaseData=null,guestItinerary={calls:[],notices:[],musterStation:null,disruptions:[]};
const OFFLINE_QUEUE_KEY='harborline.offline.queue.v1',OFFLINE_SNAPSHOT_KEY='harborline.offline.snapshot.v1';
let offlineMode=false;
const serverApi = (...args) => window.HarborlineAuth.request(...args);
let activeView = 'overview';
let currentCruise = cruises[0];
let selectedCabin = '';
let selectedCabinDelta = 0;
let selectedRegion = 'All destinations';
let selectedDuration = 'Any duration';
let queryText = '';
let diningFlow = null;

const main = document.getElementById('main-content');
const modalRoot = document.getElementById('modal-root');
const toastRegion = document.getElementById('toast-region');
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = n => '$' + Number(n).toLocaleString('en-US');
const priorityClass = p => p === 'High' ? 'high' : p === 'Medium' ? 'medium' : '';
const cruisePhotoAlt = {caribbean:'Cruise ship sailing near Grand Cayman',greece:'Cruise ship near Santorini in the Aegean Sea',nordic:'Cruise ship sailing through Nordfjord in Norway',islands:'Cruise ship sailing through Caribbean waters',mediterranean:'Cruise ship sailing in the Mediterranean'};
const code39Alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const code39Encodings = [0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00D,0x10C,0x04C,0x01C,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0C1,0x1C0,0x091,0x190,0x0D0,0x085,0x184,0x0C4,0x0A8,0x0A2,0x08A,0x02A];
const code39Patterns = new Map([...code39Alphabet].map((character,index)=>[character,code39Encodings[index]]));
code39Patterns.set('*',0x094);
function code39Barcode(value){
  const payload=String(value||'HL-DEMO').toUpperCase().replace(/[^0-9A-Z.\- $/+%]/g,'-').slice(0,40)||'HL-DEMO';
  const sequence=`*${payload}*`, bars=[];let x=24;const unit=2;
  [...sequence].forEach((character,charIndex)=>{
    const pattern=code39Patterns.get(character)||code39Patterns.get('-');
    for(let i=0;i<9;i++){
      const width=((pattern>>(8-i))&1?3:1)*unit;
      if(i%2===0)bars.push(`<rect x="${x}" y="4" width="${width}" height="42"/>`);
      x+=width;
    }
    if(charIndex<sequence.length-1)x+=unit;
  });
  const width=x+24,center=width/2;
  return `<svg class="pass-barcode-svg" viewBox="0 0 ${width} 64" role="img" aria-label="Code 39 barcode for reservation ${safe(payload)}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#153740">${bars.join('')}</g><text x="${center}" y="59" text-anchor="middle" fill="#35545a" font-family="Nata Sans, sans-serif" font-size="10" letter-spacing="2">${safe(payload)}</text></svg>`;
}
function boardingPassMarkup(booking,cruise){
  const stops=String(cruise.route||'').split('·').map(place=>place.trim()).filter(Boolean);
  const origin=safe(stops[0]||'Departure port'),destination=safe(stops[stops.length-1]||'Arrival port');
  const via=stops.slice(1,-1).map(safe).join(' · ')||'Open water';
  const reference=safe(booking.reference),checkedIn=Boolean(booking.checked_in_at),paid=booking.status==='confirmed_paid',demo=booking.status==='confirmed_demo';
  const status=paid?'PAYMENT CONFIRMED':demo?'DEMO · NOT VALID TO BOARD':'PAYMENT REQUIRED';
  return `<article class="boarding-pass"><div class="boarding-pass-head"><div class="boarding-pass-brand"><span class="boarding-pass-logo">${svgIcon('ticket')}</span><span><b>HARBORLINE</b><small>YOUR VOYAGE · DIGITAL PASS</small></span></div><span class="boarding-demo-flag ${paid?'pass-valid':''}"><i></i> ${status}</span></div><div class="boarding-pass-content"><div class="pass-section-label"><span>${paid?'BOARDING PASS':demo?'BOARDING PASS PREVIEW':'PAYMENT PENDING'}</span><span>REF · ${reference}</span></div><div class="pass-route"><div class="pass-port"><small>DEPARTURE</small><b>${origin}</b><span>${safe(cruise.region)}</span></div><div class="pass-route-path" aria-hidden="true"><i></i><span>✦</span><i></i><small>${cruise.days} NIGHTS</small></div><div class="pass-port pass-port-arrival"><small>ARRIVAL</small><b>${destination}</b><span>FINAL PORT</span></div></div><div class="pass-stopline"><span>SAILING THROUGH</span><b>${via}</b></div><div class="boarding-details"><div><small>SAILING</small><b>${safe(cruise.date)}</b></div><div><small>GUEST</small><b>${safe(sessionUser.name)}</b></div><div><small>SHIP & CABIN</small><b>${safe(cruise.ship)} · ${safe(booking.cabin_number)}</b></div><div><small>GUESTS</small><b>${Number(booking.guests)||1} ${Number(booking.guests)===1?'guest':'guests'}</b></div></div></div><div class="boarding-perforation"><span></span><i></i><span></span></div><div class="boarding-barcode-area"><div class="barcode-heading"><span>RESERVATION REFERENCE</span><b>${reference}</b></div>${code39Barcode(booking.reference)}<div class="barcode-caption"><span>CODE 39 · GATE SCANNABLE</span><span>${checkedIn?'TRAVELER CHECK-IN COMPLETE':'READY FOR GATE SCAN'}</span></div></div><div class="boarding-pass-footer"><span>${paid?'PAID BOOKING · CARD PAYMENT CONFIRMED':demo?'DEMO RESERVATION · NO PAYMENT COLLECTED':'PAYMENT INCOMPLETE'}</span><span>${paid?'PRESENT AT BOARDING GATE':'NOT VALID FOR EMBARKATION'}</span></div></article>`;
}

function heading(kicker,title,subtitle,actions=''){
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;
}
function cardHead(title, subtitle='', action=''){
  return `<div class="card-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div>${action}</div>`;
}
function metrics(items, extra=''){
  return `<div class="grid metric-grid ${extra}">${items.map(m=>`<div class="card metric-card"><div class="metric-top"><span>${m.label}</span><i class="metric-icon">${svgIcon(m.icon)}</i></div><strong>${m.value}</strong><small>${m.note}</small></div>`).join('')}</div>`;
}
function cruiseCard(c){
  return `<article class="cruise-card"><div class="cruise-art ${c.art}" role="img" aria-label="${safe(cruisePhotoAlt[c.art]||'Cruise ship at sea')}"><span class="cruise-tag">${c.region.toUpperCase()}</span></div><div class="cruise-body"><h3>${safe(c.name)}</h3><p class="cruise-sub">${safe(c.route)}</p><div class="cruise-facts"><span>${svgIcon('calendar')} ${c.days} nights</span><span>${svgIcon('pin')} ${safe(c.ship)}</span></div><div class="cruise-footer"><span class="price-from">from <b>${money(c.from)}</b> / guest</span><button class="button button-secondary" data-action="cruise-detail" data-id="${c.id}">Explore <span class="arrow">→</span></button></div></div></article>`;
}
function itineraryRows(large=false,cruise=null){
  const rows = cruise?cruise.route.split('·').map((place,i)=>({day:`DAY ${String(i+1).padStart(2,'0')}`,date:i===0?cruise.date.split('–')[0].trim():`Port ${i}`,place:place.trim(),detail:i===0?'Embarkation · confirm boarding time':'Port call · times subject to change',weather:'—'})):[
    {day:'DAY 01',date:'Sun, Oct 18',place:'Miami, Florida',detail:'Embarkation · depart 4:00 PM',weather:'☀ 82°'},
    {day:'DAY 02',date:'Mon, Oct 19',place:'At sea',detail:'A day to make the ship your own',weather:'☀ 79°'},
    {day:'DAY 03',date:'Tue, Oct 20',place:'Nassau, Bahamas',detail:'Port day · 8:00 AM – 5:00 PM',weather:'☀ 84°'},
    {day:'DAY 04',date:'Wed, Oct 21',place:'Ocean Cay',detail:'Beach day · tender service',weather:'☀ 86°'},
    {day:'DAY 05',date:'Thu, Oct 22',place:'At sea',detail:'Sunset jazz on the Promenade',weather:'☀ 80°'}
  ];
  return rows.slice(0,large?5:3).map((r,i)=>`<div class="itinerary-row"><div class="itinerary-day">${r.day}<b>${r.date.split(',')[0]}</b></div><div class="itinerary-line"><span style="${i===0?'background:#d79462;box-shadow:0 0 0 1px #e9c1a3':''}"></span></div><div class="itinerary-copy"><b>${safe(r.place)}</b><small>${safe(r.detail)}</small></div><div class="itinerary-weather">${r.weather}</div></div>`).join('');
}
function portItineraryRows(calls){
  const formatTime=value=>{
    if(!value)return 'Not recorded';
    const stamp=String(value).trim();
    const parsed=new Date(stamp.includes('T')?stamp:stamp.replace(' ','T'));
    return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  };
  return calls.map((call,index)=>{
    const arrival=call.actual_arrival||call.planned_arrival;
    const departure=call.actual_departure||call.planned_departure;
    const status=String(call.status||'planned');
    const detail=`${call.actual_arrival?'Arrived':'Arrival'} ${formatTime(arrival)} · ${call.actual_departure?'Departed':'Departure'} ${formatTime(departure)}`;
    return `<div class="itinerary-row"><div class="itinerary-day">PORT ${String(index+1).padStart(2,'0')}<b>${status.toUpperCase()}</b></div><div class="itinerary-line"><span style="${index===0?'background:#d79462;box-shadow:0 0 0 1px #e9c1a3':''}"></span></div><div class="itinerary-copy"><b>${safe(call.port_name)}</b><small>${safe(detail)}</small>${call.operations_note?`<small>${safe(call.operations_note)}</small>`:''}</div><div class="itinerary-weather"><span class="ops-status ${['delayed','cancelled'].includes(status)?'warn':''}">${safe(status)}</span></div></div>`;
  }).join('');
}
function renderOverview(){
  const recent=state.bookings[0]||null, trip=recent?cruises.find(c=>c.id===recent.cruise_id):null;
  const visibleReservations=state.reservations.filter(r=>!String(r.title).toLowerCase().includes('dining'));
  const diningSeatsSaved=Boolean(recent&&Number(recent.dining_reserved_guests)===Number(recent.guests));
  const savedPlanCount=visibleReservations.length+(diningSeatsSaved?1:0);
  const reservationHtml=visibleReservations.length?visibleReservations.slice(0,3).map(r=>`<div class="reservation-row"><span class="reservation-icon peach">✦</span><div class="reservation-copy"><b>${safe(r.title)}</b><small>${r.guests} guests · ${r.status==='saved'?'Request saved':'Confirmed'}</small></div><span class="reservation-state">SAVED</span></div>`).join(''):'<div class="feedback-summary"><div class="reservation-icon blue">✧</div><p><b>Your onboard plans start here.</b><br>Choose seats for ticketed guests or save an activity or shore request.</p></div>';
  const itinerary=trip?`<article class="card itinerary-card">${cardHead('A first look at your itinerary',safe(trip.route),`<button class="text-link" data-view="voyage">Full itinerary <span>→</span></button>`)}${itineraryRows(false,trip)}</article>`:'<article class="card itinerary-card">'+cardHead('Your itinerary will live here','Book a sailing to see your ports and travel details.')+'<div class="empty-state">Your trip details will appear after you reserve a cabin.<br><button class="button button-quiet" style="margin-top:12px" data-view="discover">Browse sailings</button></div></article>';
  return `${heading('YOUR JOURNEY',recent?'Your voyage is taking shape.':'A voyage worth looking forward to.',`Welcome back, ${safe(sessionUser.name.split(' ')[0])}.`,recent?`<button class="button button-secondary" data-view="voyage">View booking <span class="arrow">→</span></button>`:`<button class="button button-primary" data-view="discover">Find a cruise <span class="arrow">→</span></button>`)}
  <div class="grid overview-grid"><section class="column">
    <article class="card hero-card ${safe(recent?(trip?.art||'caribbean'):'caribbean')}"><div class="hero-content"><div class="hero-eyebrow"><span></span> ${recent?'YOUR NEXT VOYAGE':'START WITH A SAILING'}</div><h2>${recent?`You’re booked for ${safe(trip?.name||'your voyage')}.`:'Find the horizon that feels like yours.'}</h2><p class="hero-desc">${recent?safe(trip?.description||'Your journey details are ready when you are.'):'Explore routes, compare cabins, and make a plan at your own pace.'}</p><div class="hero-meta"><div><small>${recent?'SAILING':'READY TO EXPLORE'}</small><b>${recent?safe(trip?.date||'Departure details'):`${cruises.length} curated sailings`}</b></div><div><small>${recent?'YOUR CABIN':'ACCOUNT'}</small><b>${recent?`${safe(recent.cabin_number)} · Deck ${recent.deck}`:'Passenger profile ready'}</b></div></div><button class="button" data-view="${recent?'voyage':'discover'}">${recent?'Open your voyage':'Explore sailings'} <span class="arrow">→</span></button></div></article>
    ${recent?`<article class="card progress-card"><div class="progress-head"><b>Pre-voyage checklist</b><span>${state.checkin?'3':'2'} of 4 ready</span></div><div class="progress-track"><span style="width:${state.checkin?'75%':'50%'}"></span></div><div class="progress-steps"><span class="done">Booking</span><span class="done">Cabin</span><span class="${state.checkin?'done':''}">Check-in</span><span>Set sail</span></div></article>`:''}
    ${metrics([{label:'Upcoming booking',value:recent?'01':'—',note:recent?`${trip?.days||'—'} nights · ${safe(trip?.region||'Sailing')}`:'No reservation yet',icon:'ticket'},{label:'Saved onboard plans',value:String(savedPlanCount),note:'Plans linked to your account',icon:'calendar'},{label:'Cabin status',value:recent?'Reserved':'—',note:recent?'Stored securely on this server':'Choose a sailing first',icon:'bed'}])}
    ${itinerary}
  </section><aside class="column right-column">
    <article class="card small-card">${cardHead('Onboard plans',savedPlanCount?'Saved to your account':'Ideas to explore after booking')}${reservationHtml}${recent?`<div class="reservation-row"><span class="reservation-icon blue">♨</span><div class="reservation-copy"><b>Dining seats</b><small>${diningSeatsSaved?`${recent.guests} ticketed guests · Seats saved`:`${recent.guests} ticketed guests · Seat selection needed`}</small></div><button class="text-link" data-view="voyage">${diningSeatsSaved?'MANAGE':'CHOOSE'}</button></div><div class="reservation-row"><span class="reservation-icon blue">◒</span><div class="reservation-copy"><b>Reef &amp; rum shore day</b><small>Nassau · 3.5 hours</small></div><button class="text-link" data-action="reserve" data-name="Reef & rum shore day">ADD</button></div>`:''}</article>
    <article class="card small-card">${cardHead('Your account','Signed in securely')}<div class="reservation-row"><div class="avatar avatar-sand">${sessionUser.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div class="reservation-copy"><b>${safe(sessionUser.name)}</b><small>${safe(sessionUser.email)}</small></div><span class="tag">${safe(sessionUser.role)}</span></div><button class="text-link" style="margin-top:14px" data-view="adaptive">Share feedback <span>→</span></button></article>
  </aside></div>`;
}
function renderDiscover(){
  const list = D.filterCruises(cruises,{region:selectedRegion,duration:selectedDuration,query:queryText});
  return `${heading('FIND YOUR HORIZON','Where would you like to wake up?','Browse thoughtfully planned journeys and find the pace that feels right.',`<button class="button button-quiet" data-action="show-assistant">✦ Get a suggestion</button>`)}
  <div class="discover-controls"><label class="search-box">${svgIcon('search')}<input id="cruise-search" type="search" placeholder="Try a destination, ship, or port" value="${safe(queryText)}" aria-label="Search cruises"></label><select class="filter-select" id="destination-filter" aria-label="Filter by destination"><option ${selectedRegion==='All destinations'?'selected':''}>All destinations</option><option ${selectedRegion==='Caribbean'?'selected':''}>Caribbean</option><option ${selectedRegion==='Mediterranean'?'selected':''}>Mediterranean</option><option ${selectedRegion==='Northern Europe'?'selected':''}>Northern Europe</option></select><select class="filter-select" id="duration-filter" aria-label="Filter by duration"><option ${selectedDuration==='Any duration'?'selected':''}>Any duration</option><option ${selectedDuration==='Up to 7 nights'?'selected':''}>Up to 7 nights</option><option ${selectedDuration==='8 nights or more'?'selected':''}>8 nights or more</option></select></div>
  <div class="card card-pad" style="margin-bottom:16px;padding:13px 16px;background:linear-gradient(95deg,#f0f6ef,#fff)"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><b style="font:700 10px 'Nata Sans'">A starting point, based on your preferences</b><div style="margin-top:4px;color:#819092;font-size:8px">Warm weather · port days · unrushed dining</div></div><button class="text-link" data-action="show-assistant">Tune my suggestions <span>→</span></button></div></div>
  <div class="grid cruise-grid" id="cruise-results">${list.length?list.map(cruiseCard).join(''):'<div class="card empty-state">No voyages match those filters. Try widening your search.</div>'}</div>`;
}
function renderVoyage(){
  const recent = state.bookings[0];
  if(!recent)return `${heading('YOUR VOYAGE','No voyage booked yet.','When you reserve a cabin, your trip details will appear here.',`<button class="button button-primary" data-view="discover">Find a cruise <span class="arrow">→</span></button>`)}<div class="card empty-state" style="padding:55px 20px">Your account is ready for its first voyage.<br><button class="button button-primary" style="margin-top:16px" data-view="discover">Explore sailings <span class="arrow">→</span></button></div>`;
  const trip=cruises.find(c=>c.id===recent.cruise_id)||cruises[0];
  return `${heading(`YOUR VOYAGE · ${safe(recent.reference)}`,'A voyage with your name on it.','Your sailing, cabin, and onboard plans in one place.',`<button class="button button-secondary" data-action="download-pass">View boarding pass <span class="arrow">→</span></button>`)}
  <section class="voyage-banner"><div class="voyage-banner-copy"><div class="eyebrow">${trip.days} NIGHTS · ${safe(trip.date).toUpperCase()}</div><h2>${safe(trip.name)}</h2><p>${safe(trip.route)}</p><div class="voyage-stat-row"><div class="voyage-stat"><small>YOUR SHIP</small><b>${safe(trip.ship)}</b></div><div class="voyage-stat"><small>YOUR CABIN</small><b>${safe(recent.cabin_number)} · Deck ${recent.deck}</b></div><div class="voyage-stat"><small>GUESTS</small><b>${recent.guests} guests</b></div></div></div><div class="voyage-banner-art ${safe(trip.art)}" role="img" aria-label="${safe(cruisePhotoAlt[trip.art]||'Cruise ship at sea')}"></div></section>
  <div class="grid voyage-two-col section-spaced"><section class="column"><article class="card itinerary-card itinerary-large">${cardHead('Your itinerary',guestItinerary.calls?.length?'Live port calls and times from ship operations.':'Port arrival and departure times will appear here when ship operations publishes them.',`<button class="text-link" data-action="itinerary-feedback">Suggest a change <span>→</span></button>`)}${guestItinerary.calls?.length?portItineraryRows(guestItinerary.calls):'<div class="empty-state itinerary-empty">No port calls have been published for this sailing yet.</div>'}</article><div class="grid voyage-services"><article class="card service-card"><span class="service-icon">♨</span><h3>Dining, your way</h3><p>Choose dinner times and numbered seats for each guest on your ticket.</p><button class="text-link" data-action="dining-seating">${recent.dining_reserved_guests===recent.guests?'Manage dining seats':'Choose dining seats'} →</button></article><article class="card service-card"><span class="service-icon">◉</span><h3>Shore experiences</h3><p>Small group days that leave room to explore on your own.</p><button class="text-link" data-action="reserve" data-name="Shore experience">Explore excursions →</button></article><article class="card service-card"><span class="service-icon">✧</span><h3>Today onboard</h3><p>Poolside stories, live music, and time well spent.</p><button class="text-link" data-action="reserve" data-name="Onboard activity">See activities →</button></article><article class="card service-card"><span class="service-icon">⌖</span><h3>Get your bearings</h3><p>Quiet corners, good coffee, and the quickest way to the deck.</p><button class="text-link" data-action="ship-map">Explore ship map →</button></article></div></section>
    <aside class="column"><article class="card card-pad boarding-pass-card">${cardHead('Your boarding pass','A polished preview of your sailing.',`<button class="text-link" data-action="download-pass">Open full pass →</button>`)}${boardingPassMarkup(recent,trip)}</article>
    <article class="card card-pad">${cardHead('Before you board','A little prep goes a long way')}<div class="task-list" style="margin-top:12px"><label class="task-row"><input class="task-check" type="checkbox" checked disabled><span class="task-copy"><b>Booking confirmed</b><small>Your voyage is all set</small></span><span class="task-tag done-tag">DONE</span></label><label class="task-row"><input class="task-check" type="checkbox" ${state.checkin?'checked':''} data-action="checkin"><span class="task-copy"><b>Digital check-in</b><small>Confirm your guest details</small></span><span class="task-tag ${state.checkin?'done-tag':''}">${state.checkin?'DONE':'READY'}</span></label><div class="task-row"><span></span><span class="task-copy"><b>Travel documents</b><small>Bring a valid photo ID</small></span><span class="task-tag">TO DO</span></div></div></article>
    </aside></div>${guestServicePanel()}`;
}
function activityLabel(type){
  return ({work_logged:'Work logged',task_completed:'Task completed',task_reopened:'Task reopened',task_status_imported:'Existing task status',shift_check_in:'Shift check-in',shift_swap_requested:'Swap requested',shift_swap_approved:'Swap approved',shift_swap_declined:'Swap declined',maintenance_reported:'Maintenance reported',maintenance_service_completed:'Preventive service completed',muster_guest_accounted:'Muster guest accounted',guest_case_accepted:'Guest request accepted',guest_case_in_progress:'Guest service started',guest_case_resolved:'Guest request resolved',recovery_task_accepted:'Recovery follow-up accepted',recovery_task_in_progress:'Recovery follow-up started',recovery_task_resolved:'Recovery follow-up completed',job_accepted:'Fault job accepted',job_started:'Fault job started',job_resolved:'Fault job resolved',boarding_scan:'Passenger boarded',feedback_submitted:'Feedback shared'})[type]||'Crew activity';
}
function activityTime(value){
  const stamp=String(value||'');const parsed=new Date(stamp.includes('T')?(stamp.endsWith('Z')?stamp:`${stamp}Z`):`${stamp.replace(' ','T')}Z`);
  return Number.isNaN(parsed.getTime())?stamp:parsed.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function crewActivityList(events,emptyText='No crew actions have been logged yet.',showAll=false){
  if(!events?.length)return `<div class="empty-state">${safe(emptyText)}</div>`;
  const visible=showAll?events:events.slice(0,8);
  return `<div class="activity-list">${visible.map(item=>`<article class="activity-row"><span class="activity-marker ${safe(item.event_type)}"></span><div class="activity-copy"><div class="activity-head"><b>${safe(item.summary)}</b><span>${safe(activityLabel(item.event_type))}</span></div>${item.details?`<p>${safe(item.details)}</p>`:''}<small>${safe(item.category)} · ${safe(activityTime(item.created_at))}${sessionUser.role!=='crew'&&item.crew_name?` · ${safe(item.crew_name)}`:''}${item.actor_name&&item.actor_name!==sessionUser.name?` · by ${safe(item.actor_name)}`:''}</small></div></article>`).join('')}</div>`;
}
async function refreshCrewActivity(){
  const result=await serverApi('/api/crew/activity');
  state.crewActivityEvents=result.events||[];state.activityTodayCount=Number(result.todayCount||0);
  return result;
}
function renderCrew(){
  const pending=state.swapRequested;
  const tasks=taskRecords.map(t=>`<label class="task-row"><input class="task-check" type="checkbox" ${t.status==='done'?'checked':''} data-task="${safe(t.id)}"><span class="task-copy"><b>${safe(t.title)}</b><small>${safe(t.department)} · ${safe(t.due)}</small></span><span class="task-tag ${t.status==='done'?'done-tag':''}">${t.status==='done'?'DONE':'OPEN'}</span></label>`).join('');
  const shifts=shiftRecords.map(s=>{const shiftPending=(state.swapRequests||[]).some(r=>r.shift_id===s.id&&r.status==='pending');return `<div class="shift-row"><span class="shift-time">${safe(s.starts_at)}<br>${safe(s.ends_at)}</span><div class="shift-copy"><b>${safe(s.title)}</b><small>${safe(s.location)} · ${safe(s.department)}</small></div><button class="text-link" data-action="swap-shift" data-shift="${safe(s.id)}">${shiftPending?'REQUESTED':'Request swap'}</button></div>`;}).join('');
  const openTasks=taskRecords.filter(t=>t.status!=='done').length;
  return `${heading('CREW WORKSPACE · MV SOLSTICE',`Welcome, ${safe(sessionUser.name.split(' ')[0])}.`,'Your assigned shifts, daily duties, and work history.',`<button class="button button-secondary" data-action="crew-feedback">Share feedback</button>`)}
  <div class="crew-hero"><div class="crew-hero-copy"><div class="eyebrow">YOUR CREW ACCOUNT</div><h2>Ready for your next shift?</h2><p>${safe(sessionUser.email)} · Guest Services · Deck 5</p></div><div class="crew-hero-status"><span class="status-dot"></span> ${state.checkin?'Checked in':'Not checked in today'}</div></div>
  ${metrics([{label:'Assigned shifts',value:String(shiftRecords.length),note:'From the server schedule',icon:'clock'},{label:'Open tasks',value:String(openTasks),note:`${taskRecords.length} duties assigned today`,icon:'check'},{label:'Logged today',value:String(state.activityTodayCount||0),note:'Work actions saved to the server',icon:'chart'},{label:'Shift swap',value:pending?'Pending':'Available',note:pending?'Waiting for manager review':'Submit a request for review',icon:'calendar'}],'crew-metrics')}
  <div class="grid two-col section-spaced"><section class="column"><article class="card card-pad">${cardHead('Your shift plan','Current assignments and hours')}<div class="shift-list">${shifts||'<div class="empty-state">No shifts have been assigned yet.</div>'}</div>${pending?'<div class="form-note" style="margin-top:12px;color:#54856d">A shift swap request is pending manager review.</div>':''}</article>
  <article class="card card-pad">${cardHead('Crew work tools','Capture work outside your assigned checklist.')}<div class="crew-tools"><button class="button button-secondary" data-action="crew-work-log">＋ Log work</button><button class="button button-secondary" data-action="new-maintenance">Report maintenance</button></div><div class="form-note">Reports and work notes are saved with your account and shown in the activity log.</div></article>
  <article class="card card-pad">${cardHead('Ship faults & jobs',`${state.maintenanceJobs.filter(item=>item.status==='Open').length} available · accepted work is tied to your name`)}${maintenanceJobCards(state.maintenanceJobs,'crew')}</article>
  <article class="card card-pad">${cardHead('Shift attendance','Check-in times are recorded on the server.')}<button class="button ${state.checkin?'button-secondary':'button-primary'}" style="margin-top:14px" data-action="crew-attendance" ${state.checkin?'disabled':''}>${state.checkin?'✓ Checked in for today':'Check in for shift'} <span class="arrow">→</span></button></article></section>
  <aside class="column"><article class="card card-pad">${cardHead('Your tasks','Complete the duties assigned across your shift. Each change is recorded.')}<div class="task-list" style="margin-top:12px">${tasks||'<div class="empty-state">No tasks are assigned.</div>'}</div></article>
  <article class="card card-pad">${cardHead('Crew activity log',`${state.activityTodayCount||0} action${state.activityTodayCount===1?'':'s'} logged today · ${state.showAllCrewActivity?'all loaded actions':'latest 8 shown'}`)}${crewActivityList(state.crewActivityEvents,'No actions yet. Check in, update a task, or log work to create the first entry.',state.showAllCrewActivity)}${state.crewActivityEvents.length>8?`<button class="text-link activity-toggle" data-action="toggle-crew-activity">${state.showAllCrewActivity?'Show latest 8':'Show all '+state.crewActivityEvents.length+' loaded actions'} →</button>`:''}</article></aside></div>`;
}
function maintenanceJobCards(jobs=[],mode='crew'){
  if(!jobs.length)return `<div class="empty-state">${mode==='crew'?'No open or assigned fault jobs for your authorized sailings.':'No captain-reported faults yet. Use “Report a fault” to add the first one.'}</div>`;
  return `<div class="fault-job-list">${jobs.map(job=>{
    const mine=Number(job.accepted_by)===Number(sessionUser.id),priority=String(job.priority||'Medium').toLowerCase();
    let action='';
    if(mode==='crew'&&job.status==='Open')action=`<button class="button button-primary button-compact" data-action="accept-job" data-id="${Number(job.id)}">Accept job</button>`;
    else if(mode==='crew'&&mine&&job.status==='Accepted')action=`<button class="button button-primary button-compact" data-action="start-job" data-id="${Number(job.id)}">Start work</button>`;
    else if(mode==='crew'&&mine&&job.status==='In progress')action=`<button class="button button-secondary button-compact" data-action="resolve-job" data-id="${Number(job.id)}">Complete job</button>`;
    else if(mode==='dispatch'&&job.status!=='Resolved')action=`<button class="text-link" data-action="resolve-job" data-id="${Number(job.id)}">Close fault →</button>`;
    const log=state.maintenanceLog.filter(item=>Number(item.ticket_id)===Number(job.id)).slice(0,3);
    return `<article class="fault-job-card"><div class="fault-job-top"><span class="priority-pill ${priority}">${safe(job.priority||'Medium')} priority</span><span class="ops-status ${job.status==='Resolved'?'':'warn'}">${safe(job.status)}</span></div><h3>${safe(job.title)}</h3><div class="fault-job-location"><span>⌖</span><b>${safe(job.location||'Ship')}</b><small>${safe(job.cruise_name||'Sailing')} · ${safe(job.ship||'')}</small></div><p>${safe(job.description||'No extra details provided.')}</p><div class="fault-job-meta"><span>${safe(job.department||'Operations')}</span><span>Reported by ${safe(job.reporter_name||'Ship staff')}</span>${job.accepted_by_name?`<span>Accepted by ${safe(job.accepted_by_name)}</span>`:'<span>Awaiting crew</span>'}</div>${log.length?`<div class="fault-job-history">${log.map(item=>`<span><b>${safe(item.actor_name)}</b> · ${safe(item.event_type.replaceAll('_',' '))} · ${safe(activityTime(item.created_at))}${item.details?` · ${safe(item.details)}`:''}</span>`).join('')}</div>`:''}<div class="fault-job-action">${action||`<span class="form-note">${job.status==='Resolved'?'Work closed':job.accepted_by_name?`Accepted by ${safe(job.accepted_by_name)}`:'In the crew queue'}</span>`}</div></article>`;
  }).join('')}</div>`;
}
function renderManagement(){
  const d=operationsData||{occupancy:{capacity:0,booked:0,available:0,service:0},crew:{assigned:0,open_tasks:0},feedbackCount:0,pendingSwaps:0,inventory:[],maintenance:[]};
  const cap=Number(d.occupancy.capacity||0),booked=Number(d.occupancy.booked||0),available=Number(d.occupancy.available||0),service=Number(d.occupancy.service||0),pct=cap?Math.round(booked/cap*100):0;
  const inventoryRows=d.inventory.map(x=>`<tr><td><strong>${safe(x.name)}</strong></td><td>${safe(x.department)}</td><td>${x.on_hand} ${safe(x.unit)}</td><td>${x.reorder_at} ${safe(x.unit)}</td><td><span class="${x.on_hand<=x.reorder_at?'stock-low':'stock-ok'}">${x.on_hand<=x.reorder_at?'Reorder':'Healthy'}</span></td></tr>`).join('');
  const maintenance=d.maintenance.map(x=>`<div class="ops-row"><span>${safe(x.title)}</span><span class="ops-status ${x.status==='Resolved'?'':'warn'}">${safe(x.status)}</span></div>`).join('');
  const pendingSwaps=(state.swapRequests||[]).filter(x=>x.status==='pending');
  const swapRows=pendingSwaps.map(x=>`<div class="feedback-item"><div class="feedback-item-head"><b>${safe(x.requested_by||'Crew member')} · ${safe(x.shift||'Shift')}</b><span class="tag medium">PENDING</span></div><p>${safe(x.reason)}</p><button class="text-link" data-action="resolve-swap" data-id="${x.id}" data-status="approved">Approve</button><button class="text-link" style="margin-left:12px;color:#a05d49" data-action="resolve-swap" data-id="${x.id}" data-status="declined">Decline</button></div>`).join('');
  const feedbackCount=Number(d.feedbackCount||0),openTasks=Number(d.crew.open_tasks||0);
  return `${heading(sessionUser.role==='captain'?'CAPTAIN’S BRIDGE · VESSEL CONTROL':'SHIP MANAGEMENT · OPERATIONS',sessionUser.role==='captain'?'See it, place it, send the right crew.':'The ship at a glance.','Faults show their sailing, deck or cabin, urgency, who accepted them, and every status change.',`<button class="button button-secondary" data-view="boarding-desk">Boarding desk</button><button class="button button-secondary" data-view="sailing-setup">Cruise setup</button>${sessionUser.role==='manager'?'<button class="button button-secondary" data-view="staff-access">Staff permissions</button>':''}<button class="button button-secondary" data-action="report">↧ Export snapshot</button><button class="button button-primary" data-action="new-maintenance">+ Report a fault</button>`)}
  <div class="grid manager-grid"><article class="card card-pad occupancy-card">${cardHead('Cabin inventory','Atlantic Breeze · cabin inventory status')}<div class="occupancy-main"><div class="donut" style="background:conic-gradient(var(--sea) 0 ${pct}%, #eaf0ec ${pct}% 100%)"><div class="donut-center"><b>${pct}%</b><small>reserved</small></div></div><div class="occupancy-breakdown"><div class="break-row"><span class="break-label"><i class="swatch"></i>Reserved</span><b>${booked}</b></div><div class="break-row"><span class="break-label"><i class="swatch s2"></i>Available</span><b>${available}</b></div><div class="break-row"><span class="break-label"><i class="swatch s3"></i>Service</span><b>${service}</b></div><div class="break-row"><span class="break-label"><i class="swatch s4"></i>Total cabins</span><b>${cap}</b></div></div></div><div class="form-note">Counts are read from the local database and update as demo bookings are made.</div></article>
  <article class="card card-pad">${cardHead('Crew task readiness','Assigned task records')}<div class="ops-list"><div class="ops-row"><span>Open tasks</span><b>${openTasks}</b></div><div class="ops-row"><span>Tasks tracked</span><b>${d.crew.assigned||0}</b></div><div class="ops-row"><span>Shift swap requests</span><b>${d.pendingSwaps}</b></div></div>${swapRows?`<div style="margin-top:12px">${swapRows}</div>`:'<div class="form-note" style="margin-top:15px">No pending shift-swap requests.</div>'}</article>
  <article class="card card-pad">${cardHead('Crew activity log','Recent task, attendance, work, and shift actions')}${crewActivityList(state.crewActivityEvents,'No crew actions have been logged yet.',state.showAllCrewActivity)}${state.crewActivityEvents.length>8?`<button class="text-link activity-toggle" data-action="toggle-crew-activity">${state.showAllCrewActivity?'Show latest 8':'Show all '+state.crewActivityEvents.length+' loaded actions'} →</button>`:''}</article>
  <article class="card card-pad">${cardHead('Stakeholder feedback','Persisted feedback records')}<div style="display:flex;align-items:baseline;gap:8px;margin-top:20px"><b style="font:700 29px 'Nata Sans'">${feedbackCount}</b><span style="color:#849493;font-size:9px">submissions</span></div><div class="ops-list" style="margin-top:16px"><div class="ops-row"><span>Pending review</span><b>${state.feedback.filter(x=>x.status==='New').length}</b></div><div class="ops-row"><span>Account scope</span><b>Manager access</b></div></div><button class="text-link" style="margin-top:15px" data-view="adaptive">Review feedback →</button></article>
  <article class="card table-card"><div class="table-title">${cardHead('Inventory watch','Current quantities and reorder thresholds')}</div><div class="table-wrap"><table><thead><tr><th>ITEM</th><th>DEPARTMENT</th><th>ON HAND</th><th>REORDER AT</th><th>STATUS</th></tr></thead><tbody>${inventoryRows||'<tr><td colspan="5">No inventory records.</td></tr>'}</tbody></table></div></article>
  <article class="card card-pad fault-board-card">${cardHead('Captain’s fault board','Open reports, exact location, priority, and crew response')}${maintenanceJobCards(state.maintenanceJobs,'dispatch')}</article>
  <article class="card card-pad">${cardHead('Maintenance history','Earlier vessel tickets')}<div class="ops-list">${maintenance||'<div class="empty-state">No maintenance items.</div>'}</div></article></div>
  <p class="form-note" style="margin:14px 2px">This local database is for demonstration. It is not connected to a real vessel or company operations system.</p>`;
}
function renderDiningOperations(){
  const data=diningOperationsData;
  if(!data)return `${heading('DINING OPERATIONS','Dining service is loading.','Batch and seat controls are available to authorized ship staff.')}`;
  const cruises=data.cruises||[],cruise=cruises.find(item=>item.id===selectedDiningCruiseId)||cruises[0];
  if(!cruise)return `${heading('DINING OPERATIONS','No dining batches are configured.','Add batches to a sailing before opening reservations.')}`;
  const batches=data.batches.filter(item=>item.cruise_id===cruise.id);
  const batch=batches.find(item=>Number(item.id)===Number(selectedDiningBatchId))||batches[0];
  selectedDiningCruiseId=cruise.id;selectedDiningBatchId=Number(batch?.id||0);
  const booked=batches.reduce((sum,item)=>sum+Number(item.booked||0),0),open=batches.reduce((sum,item)=>sum+Number(item.remaining||0),0),blocked=batches.reduce((sum,item)=>sum+Number(item.blocked||0),0);
  const options=cruises.map(item=>`<option value="${safe(item.id)}" ${item.id===cruise.id?'selected':''}>${safe(item.name)} · ${safe(item.date)}</option>`).join('');
  const tabs=batches.map(item=>`<button class="dining-ops-batch-tab ${Number(item.id)===Number(batch?.id)?'active':''}" data-action="select-dining-ops-batch" data-batch-id="${Number(item.id)}" aria-pressed="${Number(item.id)===Number(batch?.id)}"><span><b>${safe(item.name)}</b><small>${safe(item.starts_at)}</small></span><strong>${Number(item.remaining)} open</strong></button>`).join('');
  const seats=(batch?.seats||[]).map(seat=>{
    const status=seat.status,label=status==='available'?'Available':status==='blocked'?'Blocked':'Filled';
    const action=status==='available'?'block-dining-seat':status==='blocked'?'open-dining-seat':'';
    const disabled=status==='booked';
    return `<button class="dining-seat dining-ops-seat ${safe(status)}" ${action?`data-action="${action}" data-seat-id="${Number(seat.id)}"`:''} ${disabled?'disabled':''} aria-label="Seat ${safe(seat.seat_number)}, ${label}${action?`. ${status==='blocked'?'Reopen':'Block'} seat`:''}" title="${safe(label)}${disabled?' · Assigned to a passenger':action?` · Click to ${status==='blocked'?'reopen':'block'}`:''}"><span>${safe(seat.seat_number)}</span><small>${label}</small></button>`;
  }).join('');
  const log=(data.log||[]).slice(0,12).map(item=>`<article class="dining-log-row"><span class="dining-log-icon">${item.event_type==='capacity_changed'?'↕':item.event_type==='seat_blocked'?'⊘':'✓'}</span><div><b>${safe(item.details)}</b><small>${safe(item.actor_name)} · ${safe(item.cruise_name)} · ${safe(item.batch_name)} · ${safe(activityTime(item.created_at))}</small></div></article>`).join('');
  return `${heading('DINING OPERATIONS · SERVICE CONTROL','Dinner service, ready to flow.','Set the cover limit for each batch and keep seat availability current.')}
  <section class="card dining-ops-sailing"><div><label for="dining-ops-cruise">SAILING</label><select id="dining-ops-cruise">${options}</select></div><div class="dining-ops-route"><b>${safe(cruise.ship)}</b><small>${safe(cruise.route)}</small></div></section>
  ${metrics([{label:'Dinner batches',value:String(batches.length),note:'On this sailing',icon:'clock'},{label:'Guests seated',value:String(booked),note:'Across all batches',icon:'users'},{label:'Covers remaining',value:String(open),note:'Within current capacity',icon:'check'},{label:'Blocked seats',value:String(blocked),note:'Across all batches',icon:'shield'}],'dining-ops-metrics')}
  <section class="card dining-ops-panel"><div class="dining-ops-panel-head"><div><div class="eyebrow">SERVICE TIMES</div><h2>Choose a dinner batch</h2><p>Capacity changes apply to new reservations. Existing guests keep their assigned seats.</p></div></div><div class="dining-ops-tabs">${tabs||'<div class="empty-state">No dinner batches are configured for this sailing.</div>'}</div>
    ${batch?`<div class="dining-ops-content"><div class="dining-ops-detail-head"><div><span class="tag">${safe(batch.starts_at)}</span><h3>${safe(batch.name)}</h3><p>${safe(cruise.name)} · ${safe(cruise.date)}</p></div><div class="dining-ops-count"><b>${Number(batch.booked)} / ${Number(batch.capacity)}</b><small>guests / cover limit</small></div></div>
    <form class="dining-capacity-form" id="dining-capacity-form" data-batch-id="${Number(batch.id)}"><div><label for="dining-capacity-input">Maximum covers</label><small>Cannot be set below the ${Number(batch.booked)} seats already booked, or above ${Number(batch.seat_count)} physical seats.</small></div><div class="dining-capacity-input"><input id="dining-capacity-input" type="number" min="${Number(batch.booked)}" max="${Number(batch.seat_count)}" value="${Number(batch.capacity)}" required><button class="button button-primary" type="submit">Save capacity</button></div></form>
    <div class="dining-ops-map-head"><div><h3>Seat status</h3><p>Available seats can be blocked. Reopen blocked seats when they are ready.</p></div><span>${Number(batch.available)} available · ${Number(batch.booked)} filled · ${Number(batch.blocked)} blocked</span></div><div class="dining-seat-map dining-ops-seat-map" aria-label="${safe(batch.name)} seat status map">${seats}</div><div class="dining-map-legend"><span><i class="open"></i>Available · click to block</span><span><i class="taken"></i>Filled · booked by a guest</span><span><i class="blocked"></i>Blocked · click to reopen</span></div><p class="dining-ops-note">Seats already assigned to a passenger are locked here. Staff changes are saved with your account and recorded in the operations log.</p></div>`:''}</section>
  <section class="card card-pad dining-ops-log">${cardHead('Dining operations log','Capacity and seat changes, with staff name and time.')}${log?`<div class="dining-log-list">${log}</div>`:'<div class="empty-state">No dining changes have been made yet.</div>'}</section>`;
}
function setupBatchRow(name='',time='17:30',seats=48){
  return `<div class="setup-batch-row"><input class="setup-batch-name" aria-label="Batch name" placeholder="Dinner batch" maxlength="60" value="${safe(name)}" required><input class="setup-batch-time" aria-label="Start time" type="time" value="${safe(time)}" required><input class="setup-batch-seats" aria-label="Seat count" type="number" min="1" max="250" value="${Number(seats)}" required><button type="button" class="remove-batch-button" data-action="remove-setup-batch" aria-label="Remove dinner batch">×</button></div>`;
}
function renderSailingSetup(){
  const canCreate=['manager','captain'].includes(sessionUser.role);
  const sailings=sailingSetupData?.sailings||[];
  const operationLog=(sailingSetupData?.log||[]).slice(0,12).map(item=>`<div class="access-log-row"><b>${safe(item.actor_name)}</b><span>${safe(item.cruise_name)} · ${safe(item.details)}</span><small>${safe(activityLabel(item.event_type))} · ${safe(activityTime(item.created_at))}</small></div>`).join('');
  const sailingRows=sailings.map(cruise=>{
    const inventory=cruise.cabins||{},batches=cruise.batches||[];
    const editDates=cruise.date_start&&cruise.date_end?`<form class="sailing-edit-form" data-cruise-id="${safe(cruise.id)}"><b>Route, dates &amp; fare</b><div class="sailing-edit-fields"><input name="name" aria-label="Sailing name" value="${safe(cruise.name)}" required><input name="ship" aria-label="Ship" value="${safe(cruise.ship)}" required><input name="region" aria-label="Region" value="${safe(cruise.region)}" required><input name="route" aria-label="Ports of call" value="${safe(cruise.route)}" required><input name="dateStart" aria-label="Departure date" type="date" value="${safe(cruise.date_start)}" required><input name="dateEnd" aria-label="Return date" type="date" value="${safe(cruise.date_end)}" required><input name="baseFare" aria-label="Starting fare in dollars" type="number" min="1" value="${Number(cruise.fare)}" required><button class="button button-secondary button-compact" type="submit">Save sailing details</button></div></form>`:`<div class="form-note">${safe(cruise.date)} · Existing sample sailing dates are shown as supplied.</div>`;
    return `<article class="card sailing-summary-card"><div class="sailing-summary-top"><div><span class="eyebrow">${safe(cruise.ship)}</span><h3>${safe(cruise.name)}</h3><p>${safe(cruise.route)}</p></div><span class="tag">${safe(cruise.date)}</span></div><div class="sailing-inventory-stats"><span><b>${Number(inventory.total||0)}</b><small>cabins total</small></span><span><b>${Number(inventory.available||0)}</b><small>cabins open</small></span><span><b>${batches.reduce((sum,item)=>sum+Number(item.seat_count),0)}</b><small>dining seats</small></span></div>${editDates}<form class="sailing-inventory-form" data-cruise-id="${safe(cruise.id)}"><label>Cabin inventory</label><div><input aria-label="Total cabin inventory" type="number" min="1" max="500" value="${Number(inventory.total||0)}" required><small>${Number(inventory.booked||0)} booked · ${Number(inventory.service||0)} blocked</small><button class="button button-secondary button-compact" type="submit">Update cabins</button></div></form><div class="sailing-batch-chips">${batches.map(batch=>`<span>${safe(batch.name)} · ${safe(batch.starts_at)} · ${Number(batch.seat_count)} seats${Number(batch.blocked)?` · ${Number(batch.blocked)} blocked`:''}</span>`).join('')||'<span>No dinner batches yet</span>'}</div><form class="add-sailing-batch-form" data-cruise-id="${safe(cruise.id)}"><b>Add a dinner batch</b><div class="setup-batch-row"><input class="setup-batch-name" aria-label="Batch name" placeholder="Name" maxlength="60" required><input class="setup-batch-time" aria-label="Start time" type="time" value="17:30" required><input class="setup-batch-seats" aria-label="Seat count" type="number" min="1" max="250" value="48" required><button class="button button-secondary button-compact" type="submit">Add seats</button></div></form></article>`;
  }).join('');
  return `${heading('SAILING SETUP','Create a sailing with real inventory.','Set dates and fares, then generate the cabin and dinner seat inventory from one form.',`<button class="button button-secondary" data-view="management">Back to bridge</button>`)}
    ${canCreate?`<section class="card card-pad sailing-setup-card"><div class="eyebrow">NEW SAILING</div><h2>Build the voyage</h2><p class="sailing-form-intro">Published sailings and their cabin and dining inventory are saved to the Harborline database.</p><form class="feedback-form sailing-setup-form" id="sailing-setup-form"><div class="grid two-col"><div class="field"><label for="setup-name">Sailing name</label><input id="setup-name" required maxlength="100" placeholder="Island discovery week"></div><div class="field"><label for="setup-ship">Ship</label><input id="setup-ship" required maxlength="80" placeholder="MV Solstice"></div><div class="field"><label for="setup-region">Destination region</label><input id="setup-region" required maxlength="60" placeholder="Caribbean"></div><div class="field"><label for="setup-route">Ports of call</label><input id="setup-route" required maxlength="250" placeholder="Miami · Nassau · Cozumel"></div><div class="field"><label for="setup-start">Departure date</label><input id="setup-start" type="date" required></div><div class="field"><label for="setup-end">Return date</label><input id="setup-end" type="date" required></div><div class="field"><label for="setup-fare">Starting fare per guest (USD)</label><input id="setup-fare" type="number" min="1" max="100000" value="1249" required></div><div class="field"><label for="setup-cabins">Cabin inventory</label><input id="setup-cabins" type="number" min="1" max="500" value="48" required><small class="form-note">New cabins cycle through interior, ocean view, and balcony categories.</small></div></div><div class="setup-batches-head"><div><h3>Dinner seating batches</h3><p>Each batch gets its own selectable numbered seats.</p></div><button type="button" class="button button-secondary button-compact" data-action="add-setup-batch">＋ Add batch</button></div><div class="setup-batch-list" id="setup-batch-list">${setupBatchRow('Early seating','17:30',48)}${setupBatchRow('Second seating','19:30',48)}${setupBatchRow('Late seating','21:30',48)}</div><button class="button button-primary" type="submit">Create sailing and inventory <span class="arrow">→</span></button></form></section>`:''}
    <section class="sailing-directory"><div class="section-heading"><div><div class="eyebrow">CURRENT SAILINGS</div><h2>Voyages in the system</h2></div><span>${sailings.length} sailings</span></div><div class="sailing-summary-grid">${sailingRows||'<div class="card empty-state">No sailings are assigned to your setup access.</div>'}</div></section>
    <section class="card card-pad sailing-change-history">${cardHead('Sailing change history','Recent sailing, cabin inventory, and dinner batch updates.')}${operationLog?`<div class="access-log-list">${operationLog}</div>`:'<div class="empty-state">Sailing changes will appear here with the staff member and time.</div>'}</section>`;
}
function renderStaffAccess(){
  const data=staffAdminData;
  if(!data)return `${heading('STAFF PERMISSIONS','Loading access controls.','Manager-only controls for granting sailing-level privileges.')}`;
  if(!data.staff.length||!data.sailings.length)return `${heading('STAFF PERMISSIONS','No staff or sailings found.','Create a crew account and sailing before granting access.')}`;
  const person=data.staff.find(item=>Number(item.id)===Number(selectedStaffUserId))||data.staff[0];
  const sailing=data.sailings.find(item=>item.id===selectedStaffCruiseId)||data.sailings[0];
  selectedStaffUserId=person.id;selectedStaffCruiseId=sailing.id;
  const grant=data.grants.find(item=>Number(item.user_id)===Number(person.id)&&item.cruise_id===sailing.id)||{};
  const staffOptions=data.staff.map(item=>`<option value="${Number(item.id)}" ${Number(item.id)===Number(person.id)?'selected':''}>${safe(item.name)} · ${safe(item.email)}</option>`).join('');
  const cruiseOptions=data.sailings.map(item=>`<option value="${safe(item.id)}" ${item.id===sailing.id?'selected':''}>${safe(item.name)} · ${safe(item.date)}</option>`).join('');
  const permissions=[['manage_dining','Dining controls','Change dining cover limits and block or reopen seats.'],['manage_sailing','Sailing controls','Edit the assigned sailing and adjust its inventory.'],['view_jobs','Crew job board','See and accept faults reported for this sailing.'],['dispatch_faults','Fault dispatch','Review and close fault tickets from the bridge.'],['scan_boarding','Boarding scan','View the passenger manifest and record barcode check-in.'],['safety_response','Muster response','Record guest accountability at assigned safety stations.']];
  const log=data.log.slice(0,10).map(item=>`<div class="access-log-row"><b>${safe(item.staff_name)}</b><span>${safe(item.cruise_name)} · ${safe(item.details)}</span><small>${safe(item.actor_name)} · ${safe(activityTime(item.created_at))}</small></div>`).join('');
  return `${heading('STAFF PERMISSIONS','The right access for each sailing.','Grant or remove individual operating powers. Every change is recorded with the manager’s name and time.')}
    <section class="card card-pad access-control-card"><div class="grid two-col"><div class="field"><label for="access-staff">Crew member</label><select id="access-staff">${staffOptions}</select></div><div class="field"><label for="access-sailing">Sailing</label><select id="access-sailing">${cruiseOptions}</select></div></div><form id="staff-access-form"><div class="permission-checklist">${permissions.map(([key,title,copy])=>`<label class="permission-row"><input type="checkbox" name="${key}" ${grant[key]?'checked':''}><span><b>${title}</b><small>${copy}</small></span></label>`).join('')}</div><div class="access-save-row"><p>Managers keep full access. Crew members can only use checked controls on this sailing.</p><button class="button button-primary" type="submit">Save sailing access</button></div></form></section>
    <section class="card card-pad">${cardHead('Access change history','Recent permission grants and removals')}${log?`<div class="access-log-list">${log}</div>`:'<div class="empty-state">No access changes recorded yet.</div>'}</section>`;
}
let boardingSailing=null;
async function refreshBoardingManifest(cruiseId){
  const result=await serverApi(`/api/boarding/manifest?cruiseId=${encodeURIComponent(cruiseId)}`);
  boardingManifest=result.manifest||[];boardingSailing=result.sailing;return result;
}
function renderBoardingDesk(){
  const options=sessionUser.role==='manager'?cruises:state.staffAccess.filter(item=>item.scan_boarding).map(item=>({...item,id:item.cruise_id}));
  if(!options.length)return `${heading('BOARDING DESK','No boarding sailings assigned.','Ask a manager to grant boarding scan permission for a sailing.')}`;
  let sailing=options.find(item=>item.id===selectedBoardingCruiseId)||options[0];selectedBoardingCruiseId=sailing.id;
  const total=boardingManifest.length,boarded=boardingManifest.filter(item=>item.scanned_at).length;
  const rows=boardingManifest.map(item=>`<tr><td><b>${safe(item.reference)}</b><small>${Number(item.guests)} ${Number(item.guests)===1?'guest':'guests'}</small></td><td>${safe(item.cabin_number)} · Deck ${Number(item.deck)}</td><td><span class="ops-status ${item.scanned_at?'':'warn'}">${item.scanned_at?'Boarded':'Expected'}</span></td><td>${item.scanned_at?`${safe(item.scanned_by||'Staff')} · ${safe(activityTime(item.scanned_at))}`:'—'}</td></tr>`).join('');
  return `${heading('ONBOARD OPERATIONS · GATE CONTROL','Boarding, matched to the ticket.','Scan the Code 39 barcode or enter its ticket reference. Each confirmed booking can be boarded once.',`<button class="button button-secondary" data-action="start-boarding-camera">Start camera</button>`)}
    <section class="card boarding-control-strip"><div class="field"><label for="boarding-sailing">SAILING</label><select id="boarding-sailing">${options.map(item=>`<option value="${safe(item.id)}" ${item.id===sailing.id?'selected':''}>${safe(item.name)} · ${safe(item.date)}</option>`).join('')}</select></div><div class="boarding-vessel"><b>${safe(sailing.ship)}</b><small>${safe(sailing.name)}</small></div></section>
    <div class="boarding-kpis">${metrics([{label:'Ticketed bookings',value:String(total),note:'Confirmed reservations',icon:'ticket'},{label:'Boarded',value:String(boarded),note:'Recorded at the gate',icon:'check'},{label:'Still expected',value:String(total-boarded),note:'Awaiting a scan',icon:'clock'},{label:'Sailing',value:safe(sailing.date),note:safe(sailing.ship),icon:'ship'}],'boarding-metrics')}</div>
    <section class="card card-pad boarding-scanner-card"><div class="eyebrow">LIVE GATE SCAN</div><h2>Scan a boarding pass</h2><p>Use a camera that supports Code 39, or connect a handheld barcode reader and focus the ticket field.</p><video id="boarding-camera" class="boarding-camera" playsinline muted hidden></video><form id="boarding-scan-form" class="boarding-scan-form"><label for="boarding-reference">Ticket reference</label><div><input id="boarding-reference" autocomplete="off" spellcheck="false" placeholder="HL-AB12CD34" required maxlength="40"><button class="button button-primary" type="submit">Verify &amp; board <span class="arrow">→</span></button></div><small id="boarding-camera-status">Camera scanning needs browser camera permission and a secure connection; keyboard barcode readers work as typed input.</small></form></section>
    <section class="card table-card boarding-manifest-card"><div class="table-title">${cardHead('Passenger manifest',`${boarded} of ${total} bookings boarded · latest gate activity is saved per ticket`)}</div><div class="table-wrap"><table><thead><tr><th>BOOKING</th><th>CABIN</th><th>STATUS</th><th>SCANNED BY</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No confirmed bookings on this sailing yet.</td></tr>'}</tbody></table></div></section>`;
}
function stopBoardingScanner(){
  if(boardingScannerFrame)cancelAnimationFrame(boardingScannerFrame);boardingScannerFrame=0;
  if(boardingScannerStream){boardingScannerStream.getTracks().forEach(track=>track.stop());boardingScannerStream=null;}
}
async function startBoardingScanner(){
  const status=document.getElementById('boarding-camera-status'),video=document.getElementById('boarding-camera');
  if(!video||!status)return;
  if(!('BarcodeDetector'in window)){status.textContent='This browser does not support camera barcode scanning. Connect a keyboard barcode reader or type the ticket reference.';return;}
  try{
    const supported=await BarcodeDetector.getSupportedFormats();
    if(!supported.includes('code_39')){status.textContent='This browser cannot scan Code 39 from camera. A keyboard barcode reader or typed reference works here.';return;}
    boardingScannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=boardingScannerStream;video.hidden=false;await video.play();status.textContent='Camera ready · hold the barcode inside the frame.';
    const detector=new BarcodeDetector({formats:['code_39']});
    const scan=async()=>{if(!boardingScannerStream)return;try{const codes=await detector.detect(video);if(codes.length){const reference=String(codes[0].rawValue||'').replaceAll('*','').trim();stopBoardingScanner();await submitBoardingScan(reference);return;}}catch{}boardingScannerFrame=requestAnimationFrame(scan);};
    boardingScannerFrame=requestAnimationFrame(scan);
  }catch(error){stopBoardingScanner();status.textContent=`Camera could not start: ${error.message}. Use a keyboard barcode reader or type the reference.`;}
}
async function submitBoardingScan(reference){
  const input=document.getElementById('boarding-reference');if(input)input.value=reference;
  const body={cruiseId:selectedBoardingCruiseId,reference,clientActionId:crypto.randomUUID()};
  try{const result=await serverApi('/api/boarding/scan',{method:'POST',body:JSON.stringify(body)});await refreshBoardingManifest(selectedBoardingCruiseId);cacheOfflineSnapshot();renderView('boarding-desk');toast(`${result.booking.reference} verified · ${result.booking.guests} ticketed guests boarded.`);}
  catch(error){if(isNetworkFailure(error)){await queueOfflineAction('/api/boarding/scan',body);toast('Scan saved on this device. It is pending server verification and will sync when connected.');updateSyncStatus();}else toast(error.message);document.getElementById('boarding-reference')?.select();}
}
async function refreshMaintenanceJobs(){
  const result=await serverApi('/api/maintenance/jobs');state.maintenanceJobs=result.jobs||[];state.maintenanceLog=result.log||[];return result;
}
async function refreshOperationsWorkspace(){
  const [operations,jobs,activity]=await Promise.all([serverApi('/api/operations'),serverApi('/api/maintenance/jobs'),serverApi('/api/crew/activity')]);
  operationsData=operations;state.maintenanceJobs=jobs.jobs||[];state.maintenanceLog=jobs.log||[];state.crewActivityEvents=activity.events||[];return operations;
}
function showResolveJobForm(id){
  const job=state.maintenanceJobs.find(item=>Number(item.id)===Number(id));
  modal('Close the ship fault',job?`${job.cruise_name} · ${job.location}`:'Record the work completed.',`<form class="feedback-form" id="resolve-job-form"><input type="hidden" id="resolve-job-id" value="${Number(id)}"><div class="field"><label for="resolve-job-note">Work performed and follow-up</label><textarea id="resolve-job-note" maxlength="500" required minlength="3" placeholder="What was repaired, and does anything need a follow-up?"></textarea></div><button class="button button-primary" type="submit">Complete and log work <span class="arrow">→</span></button></form>`);
}
async function refreshDiningOperations(){
  diningOperationsData=await serverApi('/api/dining/operations');
  if(!diningOperationsData.cruises.some(item=>item.id===selectedDiningCruiseId))selectedDiningCruiseId=diningOperationsData.cruises[0]?.id||'';
  const currentBatches=diningOperationsData.batches.filter(item=>item.cruise_id===selectedDiningCruiseId);
  if(!currentBatches.some(item=>Number(item.id)===Number(selectedDiningBatchId)))selectedDiningBatchId=Number(currentBatches[0]?.id||0);
  return diningOperationsData;
}
function feedbackItems(){
  const all=[...state.feedback.map(f=>({...f,source:f.sender?`Submitted by ${f.sender}`:'Your account',date:f.created_at||f.date})),...demoFeedback.map(f=>({...f,source:'Discovery prompt'}))];
  if(!all.length) return '<div class="empty-state">No feedback yet. You can start the conversation.</div>';
  return all.map(f=>`<div class="feedback-item"><div class="feedback-item-head"><b>${safe(f.title)}</b><span class="tag ${f.type==='Issue'||f.type==='Operational problem'?'high':''}">${safe(f.type||'Suggestion')}</span></div><p>${safe(f.message)}</p><small>${safe(f.role)} · ${safe(f.date||'just now')} · ${safe(f.source)}</small>${sessionUser.role==='manager'&&f.id?`<button class="text-link" style="margin-top:8px" data-action="review-feedback" data-id="${f.id}">Mark reviewed →</button>`:''}</div>`).join('');
}
function backlogItems(){
  const items=sessionUser.role==='manager'&&state.extraBacklog.length?state.extraBacklog:seedBacklog;
  return items.map(b=>`<div class="backlog-item"><span class="backlog-id">${safe(b.id)}</span><span class="backlog-copy"><b>${safe(b.story)}</b><small>${safe(b.sprint?.startsWith?.('CR')?'Change request':'Sprint '+b.sprint)} · ${safe(b.status||'New')}</small></span><span class="tag ${priorityClass(b.priority)}">${safe(b.priority)}</span></div>`).join('');
}
function renderAdaptive(){
  const labels={passenger:'Passenger',crew:'Crew member',captain:'Captain',manager:'Ship manager'};
  return `${heading('THE ADAPTIVE LOOP','Tell us what could feel better.','Every useful change starts with someone noticing something.')}<section class="adaptive-hero"><div><div class="eyebrow">SPECULATE → COLLABORATE → LEARN → ADAPT</div><h2>A better voyage is a work in progress.</h2><p>Share a suggestion, report a snag, or tell us what is working. Your feedback is saved to the Harborline database and visible to authorized managers.</p></div><div class="cycle"><span>Speculate</span><i>→</i><span>Collaborate</span><i>→</i><span>Learn</span><i>→</i><span>Adapt</span><i>↻</i></div></section>
  <div class="grid adaptive-grid"><section class="column"><article class="card card-pad">${cardHead('Share feedback',`Submitting as ${labels[sessionUser.role]}.`)}<form class="feedback-form" id="feedback-form"><div class="grid two-col"><div class="field"><label for="feedback-role">Your role</label><input id="feedback-role" value="${labels[sessionUser.role]}" disabled></div><div class="field"><label for="feedback-type">What would you like to share?</label><select id="feedback-type" required><option>Suggestion</option><option>Usability</option><option>Issue</option><option>Operational problem</option><option>Feature request</option></select></div></div><div class="field"><label for="feedback-title">A short title</label><input id="feedback-title" required maxlength="90" placeholder="What should we know?"></div><div class="field"><label for="feedback-message">Tell us a little more</label><textarea id="feedback-message" required maxlength="500" placeholder="What happened, or what would make this better?"></textarea></div><div class="form-error" id="feedback-error">Add a title and a short description so the team can review it.</div><button class="button button-primary" type="submit">Send feedback <span class="arrow">→</span></button><span class="form-note">Your feedback is linked to this account. Avoid including payment details or sensitive identity documents.</span></form></article>
  <article class="card card-pad">${cardHead('Feedback inbox','Recent input and discovery prompts')}<div class="feedback-list" style="margin-top:7px">${feedbackItems()}</div></article></section>
  <aside class="column"><article class="card card-pad">${cardHead('A backlog that can move','Priorities change when we learn more.')}<div class="backlog-list" style="margin-top:8px">${backlogItems()}</div></article>
  <article class="card card-pad">${cardHead('Change requests','Examples of how a requirement can evolve')}<div class="timeline">${demoChanges.map(c=>`<div class="change-item"><span class="change-marker"></span><div class="change-copy"><small>${c.id} · ${c.date} · <span class="tag ${priorityClass(c.priority)}">${c.priority}</span></small><b>${c.title}</b><p>${c.detail}</p></div></div>`).join('')}</div><div class="form-note">These are worked examples based on the project brief, not results of completed stakeholder interviews. Replace them with validated feedback as the project progresses.</div></article>
  <article class="card card-pad">${cardHead('Sprint 0 · discovery','Our starting point')}<div class="ops-list"><div class="ops-row"><span>Vision</span><b>Cruise digital operating system</b></div><div class="ops-row"><span>First slice</span><b>Discover → cabin → booking</b></div><div class="ops-row"><span>Big unknown</span><b>What guests need first</b></div><div class="ops-row"><span>Current prototype</span><b>Journey + operations demo</b></div></div><button class="text-link" style="margin-top:16px" data-action="show-docs">Read the project record →</button></article></aside></div>`;
}
function opsSailingSelect(id,items,selected){return `<select id="${id}" required>${items.map(item=>`<option value="${safe(item.id)}" ${item.id===selected?'selected':''}>${safe(item.name)} · ${safe(item.date||'')}</option>`).join('')}</select>`;}
function renderMuster(){
  const data=musterData||{},sailings=data.cruises||[],cruiseId=selectedMusterCruiseId||data.cruiseId||sailings[0]?.id||'',active=data.active;
  const canLead=['manager','captain'].includes(sessionUser.role),stations=data.stations||[],staff=data.staff||[],crewOptions=`<option value="">Unassigned</option>${staff.map(item=>`<option value="${Number(item.id)}">${safe(item.name)}</option>`).join('')}`;
  const stationRows=stations.map(item=>`<article class="ops-feature-row"><div><b>${safe(item.name)}</b><small>${safe(item.location)} · Decks ${Number(item.deck_min)}–${Number(item.deck_max)} · Limit ${Number(item.capacity)}</small><small>Station lead: ${safe(item.lead_name||'Unassigned')}</small></div>${canLead?`<form class="muster-lead-form" data-id="${Number(item.id)}"><select aria-label="Assign station lead">${crewOptions.replace(`value="${Number(item.lead_user_id||0)}"`,`value="${Number(item.lead_user_id||0)}" selected`)}</select><button class="button button-secondary button-compact">Save lead</button></form>`:''}</article>`).join('');
  const roster=(data.passengers||[]).map(item=>`<tr><td><b>${safe(item.guest_name)} · Guest ${Number(item.guest_number)}</b><small>${safe(item.reference)}</small></td><td>${safe(item.cabin_number)} · Deck ${Number(item.deck)}</td><td>${safe(item.station_name)}</td><td><span class="ops-status ${item.checked_at&&item.checked_at!=='pending-local'?'':'warn'} ${item.checked_at==='pending-local'?'muster-checkin-pending':''}">${item.checked_at==='pending-local'?'Pending sync':item.checked_at?'Accounted':'Not checked in'}</span>${item.checked_by_name?`<small>${safe(item.checked_by_name)} · ${safe(activityTime(item.checked_at))}</small>`:''}</td></tr>`).join('');
  const events=(data.events||[]).map(item=>`<div class="access-log-row"><b>${safe(item.title)}</b><span>${safe(item.event_type)} · ${safe(item.status)} · ${Number(item.guests_accounted)} checked in</span><small>${safe(item.initiated_by)} · ${safe(activityTime(item.started_at))}${item.closed_at?` · closed ${safe(activityTime(item.closed_at))}`:''}</small></div>`).join('');
  return `${heading('SAFETY & RESPONSE','Muster, accounted for.','Set station responsibilities, run drills, and see which ticketed guests are still missing.',canLead?'<span class="tag">Captain / manager controlled</span>':'<span class="tag">Assigned station access</span>')}
    ${sailings.length?`<section class="card card-pad feature-toolbar"><div class="field"><label for="muster-sailing">SAILING</label>${opsSailingSelect('muster-sailing',sailings,cruiseId)}</div>${active?`<span class="live-state"><i></i>${active.event_type==='emergency'?'EMERGENCY':'DRILL'} IN PROGRESS</span>`:'<span class="form-note">No active muster</span>'}</section>
    <div class="grid feature-two-col"><section class="card card-pad"><div class="eyebrow">MUSTER STATIONS</div><h2>Station plan</h2><p class="feature-intro">Assign crew leads and cabin-deck ranges before a drill or emergency.</p>${stationRows||'<div class="empty-state">No stations configured for this sailing.</div>'}${canLead?`<form class="feature-form" id="muster-station-form"><h3>Add a station</h3><input name="cruiseId" type="hidden" value="${safe(cruiseId)}"><div class="grid two-col"><label class="field">Station name<input name="name" required maxlength="60" placeholder="Aft muster station"></label><label class="field">Exact location<input name="location" required maxlength="100" placeholder="Deck 7 · port side"></label><label class="field">First cabin deck<input name="deckMin" type="number" min="1" max="100" value="1" required></label><label class="field">Last cabin deck<input name="deckMax" type="number" min="1" max="100" value="20" required></label><label class="field">Station capacity<input name="capacity" type="number" min="1" max="5000" value="500" required></label><label class="field">Crew lead<select name="leadUserId">${crewOptions}</select></label></div><button class="button button-primary">Save muster station</button></form>`:''}</section>
    <section class="card card-pad"><div class="eyebrow">LIVE ACCOUNTABILITY</div><h2>${active?safe(active.title):'Start a drill or response'}</h2><p class="feature-intro">${active?`${safe(active.event_type)} started by ${safe(active.initiated_by)} · ${safe(activityTime(active.started_at))}`:'Passenger guest counts are expanded from confirmed bookings and matched against cabin-deck station ranges.'}</p>${active?`<div class="muster-counts"><span><b>${Number(data.accounted||0)}</b><small>Accounted</small></span><span><b>${Number(data.unaccounted||0)}</b><small>Still missing</small></span><span><b>${Number(data.expected||0)}</b><small>Expected guests</small></span></div><form id="muster-checkin-form" class="feature-form"><h3>Record a guest</h3><input name="cruiseId" type="hidden" value="${safe(cruiseId)}"><div class="grid two-col"><label class="field">Ticket reference<input name="reference" autocomplete="off" required maxlength="40" placeholder="HL-AB12CD34"></label><label class="field">Guest number<input name="guestNumber" type="number" min="1" max="6" value="1" required></label><label class="field">Muster station<select name="stationId" required>${stations.map(item=>`<option value="${Number(item.id)}">${safe(item.name)} · ${safe(item.location)}</option>`).join('')}</select></label></div><button class="button button-primary">Mark guest accounted</button><small class="form-note">Offline scans are queued locally and verified by the server when connection returns.</small></form>${canLead?`<button class="button button-secondary" data-action="close-muster" data-id="${Number(active.id)}">Close this muster</button>`:''}`:canLead?`<form id="muster-start-form" class="feature-form"><h3>Open a muster</h3><input name="cruiseId" type="hidden" value="${safe(cruiseId)}"><label class="field">Response type<select name="eventType"><option value="drill">Scheduled safety drill</option><option value="emergency">Emergency muster</option></select></label><label class="field">Title<input name="title" required minlength="3" maxlength="100" value="Passenger safety drill"></label><label class="field">Captain’s note<textarea name="notes" maxlength="500" placeholder="Purpose, route, or response notes"></textarea></label><button class="button button-primary" ${stations.length?'':'disabled'}>Start muster</button>${stations.length?'':'<small class="form-note">Add a station before starting.</small>'}</form>`:'<div class="empty-state">The captain has not opened a muster.</div>'}</section></div>
    <section class="card card-pad feature-table-card">${cardHead('Passenger accountability','Each guest on a confirmed ticket is listed separately.')}${roster?`<div class="table-wrap"><table><thead><tr><th>GUEST / TICKET</th><th>CABIN</th><th>ASSIGNED STATION</th><th>STATUS</th></tr></thead><tbody>${roster}</tbody></table></div>`:'<div class="empty-state">Passenger names and muster status will appear during an active event.</div>'}</section>
    <section class="card card-pad">${cardHead('Drill and response history','Recent events and accountable guest totals')}${events?`<div class="access-log-list">${events}</div>`:'<div class="empty-state">No muster events recorded yet.</div>'}</section>`:'<section class="card empty-state">No sailings have muster-response access. Ask the manager to grant it.</section>'}`;
}
function renderMaintenancePlan(){
  const data=preventiveData||{},sailings=data.cruises||[],cruiseId=selectedPreventiveCruiseId||data.cruiseId||sailings[0]?.id||'',canManage=['manager','captain'].includes(sessionUser.role),today=new Date().toISOString().slice(0,10);
  const rows=(data.schedules||[]).map(item=>{const overdue=item.next_due_date<today,dueSoon=!overdue&&item.next_due_date<=new Date(Date.now()+7*86400000).toISOString().slice(0,10),history=(data.log||[]).filter(log=>Number(log.schedule_id)===Number(item.schedule_id)).slice(0,3);return `<article class="pm-card"><div class="pm-card-top"><span class="priority-pill ${item.criticality==='Critical'?'critical':item.criticality==='Important'?'high':'low'}">${safe(item.criticality)} asset</span><span class="ops-status ${overdue?'warn':''}">${overdue?'OVERDUE':dueSoon?'DUE SOON':'SCHEDULED'}</span></div><h3>${safe(item.task)}</h3><p><b>${safe(item.asset_tag)} · ${safe(item.asset_name)}</b><br>${safe(item.location)} · ${safe(item.department)}</p><div class="fault-job-meta"><span>Every ${Number(item.interval_days)} days</span><span>Due ${safe(item.next_due_date)}</span><span>${safe(item.assigned_name||'Unassigned')}</span></div>${item.last_completed_at?`<small class="form-note">Last service ${safe(activityTime(item.last_completed_at))}</small>`:''}${history.length?`<div class="pm-history">${history.map(log=>`<span><b>${safe(log.actor_name)}</b> · ${safe(log.event_type.replaceAll('_',' '))} · ${safe(activityTime(log.created_at))}${log.details?` · ${safe(log.details)}`:''}</span>`).join('')}</div>`:''}<form class="pm-complete-form" data-id="${Number(item.schedule_id)}"><input name="note" maxlength="300" placeholder="Service note or reading"><button class="button button-secondary button-compact">Record service</button></form></article>`;}).join('');
  const assetOptions=(data.assets||[]).map(item=>`<div class="ops-feature-row"><div><b>${safe(item.asset_tag)} · ${safe(item.name)}</b><small>${safe(item.location)} · ${safe(item.department)} · ${safe(item.criticality)}</small></div></div>`).join('');
  const maintenanceCrew=(data.crew||[]).map(item=>`<option value="${Number(item.id)}">${safe(item.name)}</option>`).join('');
  return `${heading('ENGINEERING · PREVENTIVE CARE','Catch wear before it becomes a fault.','Register ship equipment, schedule recurring service, and keep completion notes with the asset history.')}${sailings.length?`<section class="card card-pad feature-toolbar"><div class="field"><label for="preventive-sailing">SAILING</label>${opsSailingSelect('preventive-sailing',sailings,cruiseId)}</div><span class="tag">${(data.schedules||[]).length} active service plans</span></section>${canManage?`<section class="card card-pad"><div class="eyebrow">EQUIPMENT REGISTER</div><h2>Add equipment and its service plan</h2><form id="pm-asset-form" class="feature-form"><input name="cruiseId" type="hidden" value="${safe(cruiseId)}"><div class="grid two-col"><label class="field">Asset tag<input name="assetTag" required maxlength="30" placeholder="ENG-CH-014"></label><label class="field">Equipment name<input name="name" required maxlength="80" placeholder="Galley cold-room compressor"></label><label class="field">Department<input name="department" required maxlength="60" value="Engineering"></label><label class="field">Ship location<input name="location" required maxlength="100" placeholder="Deck 9 · port-side cold room"></label><label class="field">Criticality<select name="criticality"><option>Normal</option><option>Important</option><option>Critical</option></select></label><label class="field">Assign crew member<select name="assignedTo"><option value="">Unassigned</option>${maintenanceCrew}</select></label><label class="field">Maintenance interval (days)<input name="intervalDays" type="number" min="1" max="3650" value="30" required></label><label class="field">Recurring service task<input name="task" required maxlength="160" placeholder="Inspect seals and record temperature"></label><label class="field">First due date<input name="nextDueDate" type="date" required value="${today}"></label></div><button class="button button-primary">Add asset and schedule</button></form></section>`:''}<section class="pm-grid">${rows||'<div class="card empty-state">No preventive schedules yet.</div>'}</section><section class="card card-pad">${cardHead('Equipment register','Assets with an active maintenance plan')}${assetOptions||'<div class="empty-state">Add equipment above to build the ship register.</div>'}</section>`:'<section class="card empty-state">No maintenance sailings are assigned to this account.</section>'}`;
}
function renderPortOperations(){
  const data=portOperationsData||{},sailings=data.cruises||[],cruiseId=selectedPortCruiseId||data.cruiseId||sailings[0]?.id||'',canManage=['captain','manager'].includes(sessionUser.role);
  const rows=(data.calls||[]).map(item=>`<article class="port-call-card"><div class="port-call-heading"><div><span class="eyebrow">PORT ${Number(item.sequence)}</span><h3>${safe(item.port_name)}</h3></div><span class="ops-status ${['delayed','cancelled'].includes(item.status)?'warn':''}">${safe(item.status)}</span></div><div class="port-time-grid"><span><small>Planned arrival</small><b>${safe(item.planned_arrival)}</b></span><span><small>Planned departure</small><b>${safe(item.planned_departure)}</b></span><span><small>Actual arrival</small><b>${safe(item.actual_arrival||'—')}</b></span><span><small>Actual departure</small><b>${safe(item.actual_departure||'—')}</b></span></div>${item.operations_note?`<p>${safe(item.operations_note)}</p>`:''}${canManage?`<form class="port-update-form" data-id="${Number(item.id)}"><div class="grid two-col"><label class="field">Status<select name="status">${['planned','approaching','alongside','departed','delayed','cancelled'].map(value=>`<option ${item.status===value?'selected':''}>${value}</option>`).join('')}</select></label><label class="field">Actual arrival<input name="actualArrival" type="datetime-local" value="${safe(String(item.actual_arrival||'').replace(' ','T').slice(0,16))}"></label><label class="field">Actual departure<input name="actualDeparture" type="datetime-local" value="${safe(String(item.actual_departure||'').replace(' ','T').slice(0,16))}"></label><label class="field">Operations note<input name="operationsNote" maxlength="300" value="${safe(item.operations_note||'')}" placeholder="Weather delay, berth update, guest instructions"></label></div><label class="permission-row"><input name="notifyGuests" type="checkbox"><span><b>Publish an in-app guest notice</b><small>Passengers with this sailing will see the update in My voyage.</small></span></label><button class="button button-secondary button-compact">Save port update</button></form>`:`<div class="form-note">Updated by ${safe(item.updated_by_name)} · ${safe(activityTime(item.updated_at))}</div>`}</article>`).join('');
  const notices=(data.notices||[]).map(item=>`<div class="access-log-row"><b>${safe(item.actor_name)}</b><span>${safe(item.message)}</span><small>${safe(activityTime(item.created_at))}</small></div>`).join('');
  return `${heading('ROUTE CONTROL','Keep the ship and guests in sync.','Set planned port calls, record actual times, and publish itinerary changes to booked passengers.')}${sailings.length?`<section class="card card-pad feature-toolbar"><div class="field"><label for="port-sailing">SAILING</label>${opsSailingSelect('port-sailing',sailings,cruiseId)}</div><span class="tag">${(data.calls||[]).length} port calls</span></section>${canManage?`<section class="card card-pad"><div class="eyebrow">ITINERARY</div><h2>Add a port call</h2><form id="port-call-form" class="feature-form"><input name="cruiseId" type="hidden" value="${safe(cruiseId)}"><div class="grid two-col"><label class="field">Stop number<input name="sequence" type="number" min="1" max="30" value="${(data.calls||[]).length+1}" required></label><label class="field">Port name<input name="portName" required maxlength="80" placeholder="Nassau"></label><label class="field">Planned arrival<input name="plannedArrival" type="datetime-local" required></label><label class="field">Planned departure<input name="plannedDeparture" type="datetime-local" required></label></div><button class="button button-primary">Add port call</button></form></section>`:''}<section class="port-call-list">${rows||'<div class="card empty-state">No port calls have been entered for this sailing.</div>'}</section><section class="card card-pad">${cardHead('Guest notice history','In-app updates published for booked passengers')}${notices||'<div class="empty-state">No itinerary notices have been sent.</div>'}</section>`:'<section class="card empty-state">No sailing has port-operation access.</section>'}`;
}
function renderDisruptionRecovery(){
  const data=disruptionData||{},sailings=data.cruises||[],cruiseId=selectedDisruptionCruiseId||data.cruiseId||sailings[0]?.id||'';
  const canApprove=['captain','manager'].includes(sessionUser.role),calls=data.calls||[],events=data.events||[],impacts=data.impacts||[],tasks=data.tasks||[];
  const impactHtml=eventId=>{
    const rows=impacts.filter(item=>Number(item.event_id)===Number(eventId));
    if(!rows.length)return '<p class="form-note">No confirmed booking parties were found when this draft was created.</p>';
    return `<div class="recovery-impact-list">${rows.map(item=>{
      const plans=item.impacted_plans||[],choice=item.guest_choice==='alternative'?'Wants onboard alternatives':item.guest_choice==='no_help'?'No follow-up needed':'Awaiting response';
      return `<div class="recovery-impact-row"><div><b>${safe(item.guest_name)} · ${safe(item.reference)}</b><small>${Number(item.guests)} ticketed guests · ${plans.length?plans.map(plan=>safe(plan.title)).join(', '):'No linked shore experience'} · ${safe(choice)}</small></div>${item.task_status?`<span class="ops-status ${item.task_status==='Resolved'?'':'warn'}">${safe(item.task_status)}</span>`:''}</div>`;
    }).join('')}</div>`;
  };
  const eventCards=events.map(event=>{
    const relatedTasks=tasks.filter(task=>Number(task.event_id)===Number(event.id));
    return `<article class="recovery-event-card"><div class="recovery-event-top"><div><span class="eyebrow">${event.event_type==='cancelled'?'PORT CANCELLED':'PORT DELAY'} · ${safe(event.cruise_name)}</span><h3>${safe(event.port_name)}</h3></div><span class="ops-status ${event.status==='Approved'?'':'warn'}">${safe(event.status)}</span></div><p>${safe(event.summary)}</p><div class="recovery-plan"><b>Captain’s recovery plan</b><p>${safe(event.recovery_plan)}</p></div><div class="recovery-metrics"><span><b>${Number(event.impacted_bookings)}</b><small>booking parties</small></span><span><b>${Number(event.impacted_guests)}</b><small>guests affected</small></span><span><b>${Number(event.awaiting_guest_choice)}</b><small>awaiting response</small></span><span><b>${Number(event.open_tasks)}</b><small>follow-ups open</small></span></div>${event.status==='Draft'?`<div class="eyebrow">IMPACT PREVIEW · CAPTAIN ONLY</div>`:''}${impactHtml(event.id)}${event.status==='Draft'&&canApprove?`<button class="button button-primary" data-action="approve-disruption" data-id="${Number(event.id)}">Approve plan, update guests and open crew follow-ups</button>`:''}${relatedTasks.length?`<div class="recovery-task-list"><div class="eyebrow">CREW FOLLOW-UP</div>${relatedTasks.map(task=>{
      let action='';
      if(sessionUser.role==='crew'&&task.status==='Open'&&!task.assigned_to)action=`<button class="button button-primary button-compact" data-action="accept-recovery-task" data-id="${Number(task.id)}">Accept follow-up</button>`;
      else if(sessionUser.role==='crew'&&Number(task.assigned_to)===Number(sessionUser.id)&&task.status==='Accepted')action=`<button class="button button-primary button-compact" data-action="start-recovery-task" data-id="${Number(task.id)}">Start follow-up</button>`;
      else if(sessionUser.role==='crew'&&Number(task.assigned_to)===Number(sessionUser.id)&&task.status==='In progress')action=`<button class="button button-secondary button-compact" data-action="resolve-recovery-task" data-id="${Number(task.id)}">Complete follow-up</button>`;
      else if(canApprove&&task.status!=='Resolved')action=`<button class="text-link" data-action="resolve-recovery-task" data-id="${Number(task.id)}">Close follow-up →</button>`;
      const log=(task.log||[]).slice(0,3).map(item=>`<small>${safe(item.actor_name)} · ${safe(item.event_type.replaceAll('_',' '))} · ${safe(activityTime(item.created_at))}${item.details?` · ${safe(item.details)}`:''}</small>`).join('');
      return `<div class="recovery-task-row"><div><b>${safe(task.guest_name)} · ${safe(task.reference)}</b><small>${Number(task.guests)} guests · ${task.impacted_plans.length?task.impacted_plans.map(plan=>safe(plan.title)).join(', '):'Review itinerary and offer help'} · ${safe(task.guest_choice==='alternative'?'Guest requested alternatives':task.guest_choice==='no_help'?'Guest declined follow-up':'Guest has not responded')}</small><small>${safe(task.assigned_name||'Unclaimed by crew')}</small>${log?`<div class="fault-job-history">${log}</div>`:''}</div><span class="ops-status ${task.status==='Resolved'?'':'warn'}">${safe(task.status)}</span>${action}</div>`;
    }).join('')}</div>`:''}</article>`;
  }).join('');
  return `${heading(canApprove?'CAPTAIN’S BRIDGE · RECOVERY':'ONBOARD RESPONSE',canApprove?'Make the next move visible.':'Follow through for affected guests.',canApprove?'Record a port disruption, review who and what it affects, then approve a recovery plan for guests and crew.':'Claim a booking follow-up, contact the affected party, and log the outcome.')}${sailings.length?`<section class="card card-pad feature-toolbar"><div class="field"><label for="recovery-sailing">SAILING</label>${opsSailingSelect('recovery-sailing',sailings,cruiseId)}</div><span class="tag">${events.length} recovery records</span></section>${canApprove?`<section class="card card-pad recovery-create-card"><div class="eyebrow">NEW PORT DISRUPTION</div><h2>Prepare a recovery plan</h2><p class="feature-intro">A draft calculates affected ticketed guests and linked shore experiences. It changes nothing until you approve it.</p>${calls.length?`<form id="disruption-form" class="feature-form"><input type="hidden" name="cruiseId" value="${safe(cruiseId)}"><div class="grid two-col"><label class="field">Port call<select name="portCallId" required>${calls.map(call=>`<option value="${Number(call.id)}">Stop ${Number(call.sequence)} · ${safe(call.port_name)} · ${safe(call.status)}</option>`).join('')}</select></label><label class="field">What changed?<select name="eventType"><option value="cancelled">Port call cancelled</option><option value="delayed">Port call delayed</option></select></label></div><label class="field">Incident summary<textarea name="summary" required minlength="8" maxlength="500" placeholder="Weather conditions prevent safe tender operations today."></textarea></label><label class="field">Recovery plan<textarea name="recoveryPlan" required minlength="12" maxlength="1000">Notify affected guests, offer onboard alternatives, and route requests to Guest Services. Payments and refunds stay manual.</textarea><small class="form-note">You can edit the proposal. Payments and refunds stay manual.</small></label><button class="button button-secondary">Calculate affected bookings</button></form>`:'<div class="empty-state">Add planned port calls under Port operations before preparing a port recovery plan.</div>'}</section>`:''}<section class="recovery-event-list">${eventCards||'<div class="card empty-state">No port disruption plans have been recorded for this sailing.</div>'}</section>`:'<section class="card empty-state">No sailing has disruption recovery access for this account.</section>'}`;
}
function renderServiceCases(){
  const cases=serviceCaseData?.cases||[],logs=serviceCaseData?.log||[];
  const rows=cases.map(item=>{const history=logs.filter(log=>Number(log.case_id)===Number(item.id)).slice(0,3);const mine=Number(item.assigned_to)===Number(sessionUser.id);let action='';
    if(sessionUser.role==='crew'&&item.status==='Open'&&!item.assigned_to)action=`<button class="button button-primary button-compact" data-action="accept-service-case" data-id="${Number(item.id)}">Accept request</button>`;
    else if(sessionUser.role==='crew'&&mine&&item.status==='Accepted')action=`<button class="button button-primary button-compact" data-action="start-service-case" data-id="${Number(item.id)}">Start service</button>`;
    else if(sessionUser.role==='crew'&&mine&&item.status==='In progress')action=`<button class="button button-secondary button-compact" data-action="resolve-service-case" data-id="${Number(item.id)}">Resolve</button>`;
    else if(['captain','manager'].includes(sessionUser.role)&&item.status!=='Resolved')action=`<button class="text-link" data-action="close-service-case" data-id="${Number(item.id)}">Close request →</button>`;
    return `<article class="service-case-card"><div class="fault-job-top"><span class="priority-pill ${String(item.priority).toLowerCase()==='urgent'||String(item.priority).toLowerCase()==='high'?'high':'low'}">${safe(item.priority)}</span><span class="ops-status ${item.status==='Resolved'?'':'warn'}">${safe(item.status)}</span></div><h3>${safe(item.title)}</h3><p>${safe(item.description||'No additional details.')}</p><div class="fault-job-meta"><span>${safe(item.category)}</span><span>${safe(item.guest_name||'You')} · Cabin ${safe(item.cabin_number||'')}</span><span>${safe(item.cruise_name)} · ${safe(item.reference)}</span><span>${safe(item.assigned_name||'Unassigned')}</span></div>${history.length?`<div class="fault-job-history">${history.map(log=>`<span><b>${safe(log.actor_name)}</b> · ${safe(log.event_type.replaceAll('_',' '))} · ${safe(activityTime(log.created_at))}${log.details?` · ${safe(log.details)}`:''}</span>`).join('')}</div>`:''}<div class="fault-job-action">${action||'<span class="form-note">Request updated</span>'}</div></article>`;
  }).join('');
  return `${heading('GUEST EXPERIENCE','Every request has an owner.','Review guest requests for your authorized sailings, then accept and close the loop.')}${rows?`<section class="service-case-grid">${rows}</section>`:'<section class="card empty-state">No guest service requests are waiting for your team.</section>'}`;
}
function guestServicePanel(){
  const booking=state.bookings[0],cases=state.serviceCases||[];
  if(!booking)return '';
  const rows=cases.map(item=>`<div class="guest-case-row"><span class="ops-status ${item.status==='Resolved'?'':'warn'}">${safe(item.status)}</span><div><b>${safe(item.title)}</b><small>${safe(item.category)} · ${safe(activityTime(item.created_at))}</small></div></div>`).join('');
  const notices=(guestItinerary.notices||[]).map(item=>`<div class="guest-notice"><b>Itinerary update</b><p>${safe(item.message)}</p><small>${safe(activityTime(item.created_at))}</small></div>`).join('');
  const muster=guestItinerary.musterStation?`<div class="guest-notice muster-assignment"><b>Your muster station</b><p>${safe(guestItinerary.musterStation.name)} · ${safe(guestItinerary.musterStation.location)}</p><small>Use this location during a safety drill or emergency.</small></div>`:'';
  const disruptions=(guestItinerary.disruptions||[]).map(item=>`<article class="guest-notice disruption-guest-card"><b>${safe(item.port_name)} · ${item.event_type==='cancelled'?'Port call cancelled':'Port call delayed'}</b><p>${safe(item.summary)}</p>${(item.impacted_plans||[]).length?`<small>Linked plans: ${item.impacted_plans.map(plan=>safe(plan.title)).join(', ')}</small>`:''}<div class="recovery-plan"><b>What the ship is arranging</b><p>${safe(item.recovery_plan)}</p></div>${item.guest_choice==='pending'?`<div class="guest-recovery-actions"><span>Would you like help with another onboard plan?</span><button class="button button-primary button-compact" data-action="disruption-choice" data-event-id="${Number(item.event_id)}" data-impact-id="${Number(item.impact_id)}" data-choice="alternative">Show me alternatives</button><button class="button button-secondary button-compact" data-action="disruption-choice" data-event-id="${Number(item.event_id)}" data-impact-id="${Number(item.impact_id)}" data-choice="no_help">I’m all set</button></div>`:`<small class="recovery-response">${item.guest_choice==='alternative'?'Your request for an onboard alternative was recorded for crew follow-up.':'You marked that no further follow-up is needed.'}</small>`}</article>`).join('');
  return `${notices||muster||disruptions?`<article class="card card-pad">${cardHead('Your voyage updates','Safety station and notices from ship operations')}${muster}${disruptions}${notices}</article>`:''}<article class="card card-pad guest-service-panel">${cardHead('Guest services','Send a request to the onboard team.')}<form id="guest-case-form" class="feature-form"><input type="hidden" name="bookingId" value="${Number(booking.id)}"><div class="grid two-col"><label class="field">Request type<select name="category"><option>Cabin service</option><option>Dining</option><option>Accessibility</option><option>Shore experience</option><option>Other</option></select></label><label class="field">Urgency<select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label></div><label class="field">What do you need?<input name="title" required minlength="3" maxlength="100" placeholder="Extra towels for cabin"></label><label class="field">Details<textarea name="description" maxlength="500" placeholder="Add any useful details for the onboard team"></textarea></label><button class="button button-primary">Send request</button></form>${rows?`<div class="guest-case-list">${rows}</div>`:'<div class="form-note">Your open and completed requests will show here.</div>'}</article>`;
}
const views={overview:renderOverview,discover:renderDiscover,voyage:renderVoyage,crew:renderCrew,management:renderManagement,'dining-ops':renderDiningOperations,'sailing-setup':renderSailingSetup,'staff-access':renderStaffAccess,'boarding-desk':renderBoardingDesk,muster:renderMuster,'port-operations':renderPortOperations,'disruption-recovery':renderDisruptionRecovery,'maintenance-plan':renderMaintenancePlan,'service-cases':renderServiceCases,adaptive:renderAdaptive};
const viewNames={overview:['YOUR JOURNEY','Overview'],discover:['YOUR JOURNEY','Find a cruise'],voyage:['YOUR JOURNEY','My voyage'],crew:['ONBOARD OPERATIONS','Crew workspace'],management:['ONBOARD OPERATIONS','Ship management'],'dining-ops':['ONBOARD OPERATIONS','Dining operations'],'sailing-setup':['ONBOARD OPERATIONS','Sailing setup'],'staff-access':['ONBOARD OPERATIONS','Staff permissions'],'boarding-desk':['ONBOARD OPERATIONS','Boarding desk'],muster:['ONBOARD SAFETY','Muster & drills'],'port-operations':['ONBOARD OPERATIONS','Port operations'],'disruption-recovery':['CAPTAIN’S BRIDGE','Disruption recovery'],'maintenance-plan':['ONBOARD ENGINEERING','Preventive maintenance'],'service-cases':['GUEST EXPERIENCE','Guest services'],adaptive:['THE ADAPTIVE LOOP','Feedback & backlog']};
const roleViews={passenger:['overview','discover','voyage','adaptive'],crew:['crew','adaptive'],captain:['management','dining-ops','boarding-desk','muster','port-operations','disruption-recovery','maintenance-plan','service-cases','sailing-setup','adaptive'],manager:['management','dining-ops','boarding-desk','muster','port-operations','disruption-recovery','maintenance-plan','service-cases','sailing-setup','staff-access','adaptive']};
function homeForRole(role){return role==='crew'?'crew':['manager','captain'].includes(role)?'management':'overview';}
function updateRoleNavigation(user){
  roleViews.crew=['crew','adaptive'];const access=state.staffAccess||[];
  if(access.some(item=>item.manage_dining))roleViews.crew.push('dining-ops');
  if(access.some(item=>item.scan_boarding))roleViews.crew.push('boarding-desk');
  if(access.some(item=>item.manage_sailing))roleViews.crew.push('sailing-setup');
  if(access.some(item=>item.safety_response))roleViews.crew.push('muster');
  if(access.some(item=>item.view_jobs)){roleViews.crew.push('port-operations','disruption-recovery','maintenance-plan','service-cases');}
  document.querySelectorAll('.nav-item').forEach(n=>{n.hidden=!(roleViews[user.role]||[]).includes(n.dataset.view);});
}
function renderView(view=activeView){
  if(!sessionUser)return;
  if(!(roleViews[sessionUser.role]||[]).includes(view))view=homeForRole(sessionUser.role);
  if(view!=='boarding-desk')stopBoardingScanner();
  activeView=view; const [section,page]=viewNames[view]||viewNames.overview;
  document.getElementById('crumb-section').textContent=section;document.getElementById('crumb-page').textContent=page;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  main.innerHTML=(views[view]||renderOverview)(); main.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'smooth'});
}
async function loadWorkspace(user){
  sessionUser=user;
  const roleLabels={passenger:'Passenger',crew:'Crew member',captain:'Captain',manager:'Ship manager'};
  document.getElementById('profile-name').textContent=user.name;
  document.getElementById('profile-meta').textContent=`${roleLabels[user.role]} · ${user.email}`;
  document.querySelector('.profile-mini .avatar').textContent=user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
  roleViews.crew=['crew','adaptive'];
  document.querySelectorAll('.nav-item').forEach(n=>{n.hidden=!(roleViews[user.role]||[]).includes(n.dataset.view);});
  document.querySelector('.nav-label').hidden=user.role!=='passenger';
  document.querySelector('.ops-label').hidden=user.role==='passenger';
  document.querySelector('.feedback-nudge').hidden=user.role!=='passenger';
  document.querySelector('.voyage-status').hidden=user.role!=='passenger';
  if(user.offline){offlineMode=true;const restored=restoreOfflineSnapshot(user);updateRoleNavigation(user);updateSyncStatus();renderView(homeForRole(user.role));toast(restored?'Offline workspace loaded. New supported entries will sync when connection returns.':'No saved offline workspace is available on this device yet.');return;}
  offlineMode=false;updateSyncStatus();
  try{
    const fetched=await Promise.all([serverApi('/api/cruises'),serverApi('/api/payments/config')]);
    cruises=fetched[0].map(c=>({...c,desc:c.description}));paymentConfig=fetched[1];
    const paymentParams=new URLSearchParams(window.location.search);
    if(user.role==='passenger'&&paymentParams.get('payment')==='success'&&paymentParams.get('session_id')){
      try{await serverApi('/api/payments/stripe/confirm',{method:'POST',body:JSON.stringify({sessionId:paymentParams.get('session_id')})});toast('Payment confirmed. Your sailing is now booked.');}
      catch(err){toast(`We could not confirm this payment yet: ${err.message}`);}
      window.history.replaceState({},'',window.location.pathname);
    }else if(paymentParams.get('payment')==='cancel'){
      toast('Checkout was closed. The cabin hold will expire automatically if you do not return to payment.');window.history.replaceState({},'',window.location.pathname);
    }
    if(user.role==='passenger'){
      const [bookings,reservations,feedback,cases,itinerary]=await Promise.all([serverApi('/api/bookings'),serverApi('/api/reservations'),serverApi('/api/feedback'),serverApi('/api/service-cases'),serverApi('/api/guest/itinerary')]);
      state.bookings=bookings.filter(x=>x.status!=='cancelled');state.reservations=reservations;state.feedback=feedback;state.serviceCases=cases.cases||[];guestItinerary=itinerary;state.checkin=Boolean(state.bookings[0]?.checked_in_at);
      document.querySelector('.nav-count').textContent=String(state.bookings.length);
      document.querySelector('.nav-count').hidden=!state.bookings.length;
      document.querySelector('.voyage-status').innerHTML=state.bookings.length?`<span class="status-dot"></span> ${safe(state.bookings[0].name).toUpperCase()} <span class="status-divider">·</span> BOOKING ${safe(state.bookings[0].reference)}`:'<span class="status-dot"></span> READY WHEN YOU ARE <span class="status-divider">·</span> NO BOOKING YET';
    }else if(user.role==='crew'){
      const [tasks,shifts,swaps,attendance,activity,access,jobs,dining,cases]=await Promise.all([serverApi('/api/tasks'),serverApi('/api/shifts'),serverApi('/api/swaps'),serverApi('/api/attendance'),serverApi('/api/crew/activity'),serverApi('/api/staff/my-access'),serverApi('/api/maintenance/jobs'),serverApi('/api/dining/operations'),serverApi('/api/service-cases')]);
      taskRecords=tasks;shiftRecords=shifts;state.tasks=Object.fromEntries(tasks.map(t=>[t.id,t.status==='done']));state.swapRequests=swaps;state.swapRequested=swaps.some(s=>s.status==='pending');state.checkin=attendance.checkedIn;state.crewActivityEvents=activity.events||[];state.activityTodayCount=Number(activity.todayCount||0);state.staffAccess=access;state.maintenanceJobs=jobs.jobs||[];state.maintenanceLog=jobs.log||[];diningOperationsData=dining;
      state.serviceCases=cases.cases||[];serviceCaseData=cases;
    }else{
      const [operations,feedback,backlog,swaps,activity,access,jobs,dining,staff,cases]=await Promise.all([serverApi('/api/operations'),serverApi('/api/feedback'),serverApi('/api/backlog'),serverApi('/api/swaps'),serverApi('/api/crew/activity'),serverApi('/api/staff/my-access'),serverApi('/api/maintenance/jobs'),serverApi('/api/dining/operations'),user.role==='manager'?serverApi('/api/staff/access'):Promise.resolve(null),serverApi('/api/service-cases')]);
      operationsData=operations;state.feedback=feedback;state.extraBacklog=backlog.map((item,i)=>({id:`FB-${item.feedback_id}`,story:`Review feedback: ${item.title}`,priority:'Medium',sprint:'Needs triage',status:item.status}));state.swapRequests=swaps;state.crewActivityEvents=activity.events||[];state.activityTodayCount=Number(activity.todayCount||0);state.staffAccess=access;state.maintenanceJobs=jobs.jobs||[];state.maintenanceLog=jobs.log||[];diningOperationsData=dining;staffAdminData=staff;
      state.serviceCases=cases.cases||[];serviceCaseData=cases;
    }
    updateRoleNavigation(user);
    selectedDiningCruiseId=diningOperationsData?.cruises?.[0]?.id||selectedDiningCruiseId;
    if(!selectedStaffCruiseId)selectedStaffCruiseId=staffAdminData?.sailings?.[0]?.id||'';
    if(!selectedStaffUserId)selectedStaffUserId=staffAdminData?.staff?.[0]?.id||0;
    if(!selectedBoardingCruiseId)selectedBoardingCruiseId=(user.role==='manager'?cruises:state.staffAccess).find(item=>user.role==='manager'||item.scan_boarding)?.id||(user.role==='manager'?cruises:state.staffAccess).find(item=>user.role==='manager'||item.scan_boarding)?.cruise_id||'';
    const featureUrls=user.role==='crew'?[
      ...(state.staffAccess.some(item=>item.safety_response)?['/api/muster']:[]),
      ...(state.staffAccess.some(item=>item.view_jobs)?['/api/preventive','/api/port-operations','/api/disruption-recovery']:[])
    ]:['/api/muster','/api/preventive','/api/port-operations','/api/disruption-recovery'];
    await Promise.all(featureUrls.map(path=>serverApi(path).then(value=>{if(path==='/api/muster'){musterData=value;selectedMusterCruiseId=value.cruiseId;}else if(path==='/api/preventive'){preventiveData=value;selectedPreventiveCruiseId=value.cruiseId;}else if(path==='/api/port-operations'){portOperationsData=value;selectedPortCruiseId=value.cruiseId;}else{disruptionData=value;selectedDisruptionCruiseId=value.cruiseId;}}).catch(()=>{})));
  }catch(err){toast(`Some live data could not be loaded: ${err.message}`);}
  cacheOfflineSnapshot();updateSyncStatus();renderView(homeForRole(user.role));syncOfflineQueue();
}
document.addEventListener('harborline:authenticated',event=>loadWorkspace(event.detail.user));
document.getElementById('logout-button').addEventListener('click',async()=>{
  if(offlineMode||navigator.onLine===false){try{localStorage.removeItem('harborline.offline.user');localStorage.removeItem(OFFLINE_SNAPSHOT_KEY);}catch{}offlineMode=false;window.HarborlineAuth.showSignIn();toast('Offline session ended. Queued actions stay on this device.');return;}
  try{await window.HarborlineAuth.signOut();modalRoot.innerHTML='';window.HarborlineAuth.showSignIn();toast('You are signed out.');}
  catch(err){toast(err.message);}
});
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;toastRegion.append(el);setTimeout(()=>el.remove(),3800);}
function readOfflineQueue(){try{return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');}catch{return [];}}
function writeOfflineQueue(items){try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(items));}catch{toast('This browser could not save the offline queue. Free some device storage and try again.');}updateSyncStatus();}
function updateSyncStatus(){
  const button=document.getElementById('sync-status');if(!button)return;
  const pending=readOfflineQueue().filter(item=>!item.failed).length,failed=readOfflineQueue().filter(item=>item.failed).length;
  button.classList.toggle('offline',navigator.onLine===false||offlineMode);button.classList.toggle('has-pending',pending>0||failed>0);
  button.textContent=offlineMode||navigator.onLine===false?`● Offline${pending?` · ${pending} queued`:''}`:failed?`● ${failed} needs review`:pending?`● ${pending} waiting to sync`:'● Online · synced';
}
function isNetworkFailure(error){return navigator.onLine===false||error instanceof TypeError||/network|fetch failed|connection/i.test(String(error?.message||''));}
async function queueOfflineAction(path,body){
  const items=readOfflineQueue(),actionId=body.clientActionId||crypto.randomUUID();items.push({actionId,path,userId:Number(sessionUser?.id),body:{...body,clientActionId:actionId},createdAt:new Date().toISOString(),failed:false});writeOfflineQueue(items);return true;
}
async function syncOfflineQueue(){
  if(navigator.onLine===false||offlineMode)return;
  const items=readOfflineQueue();let completed=0;const syncedPaths=[];
  for(const item of items){
    if(item.failed)continue;
    if(item.userId&&Number(item.userId)!==Number(sessionUser?.id))continue;
    try{await serverApi(item.path,{method:'POST',body:JSON.stringify({...item.body,clientActionId:item.actionId})});items.splice(items.indexOf(item),1);syncedPaths.push(item.path);completed++;writeOfflineQueue(items);}
    catch(error){if(isNetworkFailure(error))break;if([400,401,403,404,409].includes(error.status)){item.failed=true;item.error=error.message;writeOfflineQueue(items);continue;}break;}
  }
  updateSyncStatus();if(completed){
    for(const path of new Set(syncedPaths)){
      try{if(path==='/api/crew/activity'&&sessionUser.role==='crew')await refreshCrewActivity();else if(path==='/api/muster/check-in'&&selectedMusterCruiseId)musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);else if(path==='/api/service-cases'){serviceCaseData=await serverApi('/api/service-cases');state.serviceCases=serviceCaseData.cases||[];}else if(path==='/api/boarding/scan'&&selectedBoardingCruiseId)await refreshBoardingManifest(selectedBoardingCruiseId);else if(path.startsWith('/api/preventive/schedules/')&&selectedPreventiveCruiseId)preventiveData=await serverApi(`/api/preventive?cruiseId=${encodeURIComponent(selectedPreventiveCruiseId)}`);}catch{}}
    cacheOfflineSnapshot();if(['crew','muster','service-cases','boarding-desk','voyage'].includes(activeView))renderView(activeView);toast(`${completed} offline action${completed===1?'':'s'} synced.`);
  }
}
function cacheOfflineSnapshot(){
  if(!sessionUser||offlineMode)return;
  const snapshot={userId:sessionUser.id,role:sessionUser.role,cruises,state,taskRecords,shiftRecords,operationsData,diningOperationsData,staffAdminData,sailingSetupData,
    selectedDiningCruiseId,selectedDiningBatchId,selectedBoardingCruiseId,selectedMusterCruiseId,musterData,preventiveData,selectedPreventiveCruiseId,
    portOperationsData,selectedPortCruiseId,disruptionData,selectedDisruptionCruiseId,serviceCaseData,guestItinerary};
  try{localStorage.setItem(OFFLINE_SNAPSHOT_KEY,JSON.stringify(snapshot));}catch{}
}
function restoreOfflineSnapshot(user){
  try{const snapshot=JSON.parse(localStorage.getItem(OFFLINE_SNAPSHOT_KEY)||'null');if(!snapshot||Number(snapshot.userId)!==Number(user.id)||snapshot.role!==user.role)return false;
    cruises=snapshot.cruises||cruises;Object.assign(state,snapshot.state||{});taskRecords=snapshot.taskRecords||[];shiftRecords=snapshot.shiftRecords||[];
    operationsData=snapshot.operationsData||null;diningOperationsData=snapshot.diningOperationsData||null;staffAdminData=snapshot.staffAdminData||null;sailingSetupData=snapshot.sailingSetupData||null;
    selectedDiningCruiseId=snapshot.selectedDiningCruiseId||selectedDiningCruiseId;selectedDiningBatchId=snapshot.selectedDiningBatchId||0;selectedBoardingCruiseId=snapshot.selectedBoardingCruiseId||'';
    selectedMusterCruiseId=snapshot.selectedMusterCruiseId||'';musterData=snapshot.musterData||null;preventiveData=snapshot.preventiveData||null;selectedPreventiveCruiseId=snapshot.selectedPreventiveCruiseId||'';
    portOperationsData=snapshot.portOperationsData||null;selectedPortCruiseId=snapshot.selectedPortCruiseId||'';disruptionData=snapshot.disruptionData||null;selectedDisruptionCruiseId=snapshot.selectedDisruptionCruiseId||'';serviceCaseData=snapshot.serviceCaseData||null;guestItinerary=snapshot.guestItinerary||{calls:[],notices:[],musterStation:null,disruptions:[]};return true;
  }catch{return false;}
}
function closeModal(){modalRoot.innerHTML='';}
function modal(title,subtitle,body,foot=''){
  modalRoot.innerHTML=`<div class="modal-backdrop" data-modal-backdrop><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><div class="eyebrow">HARBORLINE · YOUR VOYAGE</div><h2 id="modal-title">${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div><button class="modal-close" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</section></div>`;
}
async function openCabins(cruise){
  currentCruise=cruise;selectedCabin='';selectedCabinDelta=0;
  const cabins=await serverApi(`/api/cruises/${encodeURIComponent(cruise.id)}/cabins`);
  const counts={available:0,booked:0,service:0};
  const cells=cabins.map(c=>{
    const status=counts[c.status]===undefined?'service':c.status;
    counts[status]++;
    const label=status==='available'?'Available':status==='booked'?'Filled':'Blocked';
    const description=status==='service'?'Blocked for service':label;
    const disabled=status!=='available';
    return `<button class="cabin ${status==='booked'?'filled':status==='service'?'blocked':'available'}" ${disabled?'disabled':''} aria-label="Cabin ${safe(c.cabin_number)}, ${safe(c.category)}, ${description}" title="Cabin ${safe(c.cabin_number)} · ${safe(c.category)} · ${description}" data-cabin="${safe(c.cabin_number)}" data-category="${safe(c.category)}" data-delta="${c.price_delta}" data-status-label="${label}" data-status-description="${description}" aria-pressed="false"><span class="cabin-number">${safe(c.cabin_number)}</span><small>${safe(c.category)}</small><span class="cabin-state">${label}</span></button>`;
  }).join('');
  modal('Choose a cabin',`${safe(cruise.name)} · ${cruise.days} nights · from ${money(cruise.from)} per guest`, `<div class="cabin-map" aria-label="Cabin selection map">${cells}</div><div class="map-legend" aria-label="Cabin availability legend"><span><i class="legend-available"></i>Available <b>${counts.available}</b></span><span><i class="legend-picked"></i>Selected</span><span><i class="legend-filled"></i>Filled <b>${counts.booked}</b></span><span><i class="legend-blocked"></i>Blocked <b>${counts.service}</b></span></div><div class="cabin-summary"><span id="cabin-summary-copy">Choose an available cabin on Deck 8.</span><b id="cabin-summary-price">${money(cruise.from)} / guest</b></div><p class="modal-info">${paymentConfig.provider==='stripe'?'Payment opens secure Stripe Checkout. The booking is confirmed only after Stripe verifies payment.':'Demo mode is active: this reservation does not charge a payment method. Configure Stripe on the server to enable secure payment.'}</p>`, `<button class="button button-secondary" data-action="close-modal">Cancel</button><button class="button button-primary" id="confirm-cabin" data-action="confirm-cabin" disabled>${paymentConfig.provider==='stripe'?'Continue to payment':'Reserve cabin'} <span class="arrow">→</span></button>`);
}
function showDetail(cruise){
  currentCruise=cruise;
  modal(safe(cruise.name),safe(cruise.route),`<div class="detail-image ${cruise.art}" role="img" aria-label="${safe(cruisePhotoAlt[cruise.art]||'Cruise ship at sea')}"></div><div class="detail-facts"><div class="detail-fact"><small>DURATION</small><b>${cruise.days} nights</b></div><div class="detail-fact"><small>DEPARTS</small><b>${cruise.date}</b></div><div class="detail-fact"><small>SHIP</small><b>${cruise.ship}</b></div></div><p style="color:#617578;font-size:10px;line-height:1.6">${safe(cruise.desc)}</p><p class="modal-info">Cabins from <b>${money(cruise.from)}</b> per guest · Sample voyage information</p>`,`<button class="button button-secondary" data-action="close-modal">Close</button><button class="button button-primary" data-action="choose-cabin">Choose a cabin <span class="arrow">→</span></button>`);
}
function openAssistant(){
  modalRoot.innerHTML=`<aside class="assistant-panel" role="dialog" aria-modal="true" aria-label="Voyage assistant"><div class="assistant-header"><div class="assistant-title"><span class="assistant-symbol">${svgIcon('sparkle')}</span><span><b>Harborline concierge</b><small>Voyage guide · sample voyage data</small></span></div><button class="modal-close" data-action="close-modal" aria-label="Close assistant">×</button></div><div class="assistant-messages" id="assistant-messages"><div class="assistant-msg">Hello Alex. Ask me about the Atlantic Breeze, cabin options, your itinerary, or what to do onboard. I can only answer from the sample voyage details in this prototype.</div><div class="assistant-suggestions"><button class="suggestion" data-question="What does my first day look like?">What does my first day look like?</button><button class="suggestion" data-question="Tell me about cabin 8246">Tell me about cabin 8246</button><button class="suggestion" data-question="What can I do in Nassau?">What can I do in Nassau?</button></div></div><form class="assistant-compose" id="assistant-form"><input id="assistant-input" placeholder="Ask about your voyage…" aria-label="Ask the concierge"><button aria-label="Send question">→</button></form></aside>`;
}
function assistantAnswer(q){ return D.conciergeAnswer(q); }
function addAssistantMessage(question){
  const box=document.getElementById('assistant-messages'); if(!box)return;
  const q=safe(question);box.insertAdjacentHTML('beforeend',`<div class="assistant-msg user">${q}</div><div class="assistant-msg">${safe(assistantAnswer(question))}</div>`);box.scrollTop=box.scrollHeight;
}
function showReserve(name){
  modal('Add an onboard plan',safe(name),`<div class="detail-fact"><small>SAILING</small><b>${safe(state.bookings[0]?.name||'Choose a sailing first')}</b></div><div class="field" style="margin-top:13px"><label for="guest-count">Guests</label><select id="guest-count"><option value="2">2 guests</option><option value="1">1 guest</option><option value="3">3 guests</option></select></div><div class="field" style="margin-top:12px"><label for="special-note">Note for the team (optional)</label><textarea id="special-note" maxlength="300" placeholder="Preferences or a special occasion"></textarea></div><p class="modal-info">This saves a request to your account. It does not guarantee a live reservation or charge a payment method.</p>`,`<button class="button button-secondary" data-action="close-modal">Cancel</button><button class="button button-primary" data-action="confirm-reservation" data-name="${safe(name)}">Save request <span class="arrow">→</span></button>`);
}
async function openDiningPicker(){
  const active=state.bookings.filter(booking=>booking.status!=='cancelled');
  if(!active.length){
    modal('Dining seats need a cruise ticket','Reserve a cabin first.',`<div class="dining-empty"><span class="service-icon">♨</span><p>Dining seats are assigned to the guest count on an active cruise ticket. Once you have a booking, choose a batch and a seat for each guest.</p></div>`,`<button class="button button-secondary" data-action="close-modal">Close</button><button class="button button-primary" data-action="close-modal">Okay</button>`);
    return;
  }
  if(active.length===1){await loadDiningBooking(active[0].id);return;}
  const tickets=active.map(booking=>`<button class="dining-ticket-option" data-action="open-dining-booking" data-booking-id="${Number(booking.id)}"><span><b>${safe(booking.name)} · ${safe(booking.reference)}</b><small>${safe(booking.ship)} · ${safe(booking.date)}</small></span><strong>${booking.guests} ${booking.guests===1?'guest':'guests'}<i>→</i></strong></button>`).join('');
  modal('Choose a cruise ticket','Dining seats are saved separately for each booking.',`<div class="dining-ticket-list">${tickets}</div>`,`<button class="button button-secondary" data-action="close-modal">Cancel</button>`);
  modalRoot.querySelector('.modal')?.classList.add('dining-modal');
}
async function loadDiningBooking(bookingId){
  const data=await serverApi(`/api/bookings/${Number(bookingId)}/dining`);
  const assignments=(data.assignments||[]).map(item=>({guestNumber:Number(item.guest_number),batchId:Number(item.batch_id),seatId:Number(item.seat_id)}));
  diningFlow={data,assignments,activeBatchId:Number(assignments[0]?.batchId||data.batches[0]?.id||0)};
  renderDiningSeats();
}
function renderDiningSeats(){
  if(!diningFlow)return;
  const {data,assignments}=diningFlow,booking=data.booking;
  const chosenSeatIds=new Set(assignments.map(item=>item.seatId));
  const batchCards=data.batches.map(batch=>{
    const chosen=assignments.filter(item=>item.batchId===Number(batch.id)).length;
    const physicalFree=batch.seats.filter(seat=>(seat.status==='available'||seat.status==='selected')&&!chosenSeatIds.has(Number(seat.id))).length;
    const free=Math.min(physicalFree,Math.max(0,Number(batch.remaining||0)-chosen));
    return `<button class="dining-batch ${Number(batch.id)===Number(diningFlow.activeBatchId)?'active':''}" data-action="dining-batch" data-batch-id="${Number(batch.id)}" aria-pressed="${Number(batch.id)===Number(diningFlow.activeBatchId)}"><span><b>${safe(batch.name)}</b><small>${safe(batch.starts_at)}</small></span><strong>${free} open</strong>${chosen?`<em>${chosen} selected</em>`:''}</button>`;
  }).join('');
  const batch=data.batches.find(item=>Number(item.id)===Number(diningFlow.activeBatchId))||data.batches[0];
  if(!batch)return;
  const selectedInBatch=assignments.filter(item=>item.batchId===Number(batch.id)).length;
  const capacityOpen=Math.max(0,Number(batch.remaining||0)-selectedInBatch);
  const seats=batch.seats.map(seat=>{
    const picked=assignments.find(item=>item.seatId===Number(seat.id));
    const baseStatus=seat.status==='selected'?'available':seat.status;
    const status=picked?'selected':(baseStatus==='available'&&capacityOpen===0?'full':baseStatus);
    const label=status==='selected'?`Assigned to guest ${picked.guestNumber}`:status==='booked'?'Taken':status==='blocked'?'Blocked':status==='full'?'Batch at capacity':'Available';
    const disabled=status==='booked'||status==='blocked'||status==='full';
    return `<button class="dining-seat ${status}" data-action="dining-seat" data-seat-id="${Number(seat.id)}" data-seat-status="${status}" ${disabled?'disabled':''} aria-label="Seat ${safe(seat.seat_number)}, ${safe(label)}" title="${safe(label)}">${safe(seat.seat_number)}</button>`;
  }).join('');
  const guestRows=Array.from({length:Number(booking.guests)},(_,index)=>{
    const guestNumber=index+1,assignment=assignments.find(item=>item.guestNumber===guestNumber);
    const seat=assignment&&data.batches.flatMap(item=>item.seats).find(item=>Number(item.id)===assignment.seatId);
    const seatBatch=assignment&&data.batches.find(item=>Number(item.id)===assignment.batchId);
    return `<div class="dining-guest-row ${assignment?'assigned':''}"><span class="dining-guest-number">${String(guestNumber).padStart(2,'0')}</span><span class="dining-guest-copy"><b>Guest ${guestNumber}</b><small>${assignment?`${safe(seatBatch?.name||'Dinner')} · ${safe(seatBatch?.starts_at||'')} · Seat ${safe(seat?.seat_number||'')}`:'Choose a batch and an open seat'}</small></span>${assignment?`<button class="dining-remove" data-action="remove-dining-seat" data-guest-number="${guestNumber}" aria-label="Remove seat for guest ${guestNumber}">Remove</button>`:`<span class="dining-unassigned">Seat needed</span>`}</div>`;
  }).join('');
  const complete=assignments.length===Number(booking.guests);
  modal('Choose your dining seats',`${safe(booking.cruise_name)} · ticket ${safe(booking.reference)}`,`<div class="dining-ticket-strip"><span class="dining-ticket-icon">♨</span><span><small>YOUR TICKET INCLUDES</small><b>${booking.guests} ${booking.guests===1?'guest':'guests'}</b></span><span class="dining-progress">${assignments.length} / ${booking.guests} assigned</span></div><div class="dining-step-head"><span>1</span><div><b>Choose a dinner batch</b><small>Each guest may choose a different time.</small></div></div><div class="dining-batches">${batchCards}</div><div class="dining-step-head dining-step-two"><span>2</span><div><b>Choose a seat · ${safe(batch.name)}</b><small>Tap an open seat to assign it to the next guest without a seat.</small></div></div><div class="dining-seat-map" aria-label="Dining seat map">${seats}</div><div class="dining-map-legend"><span><i class="open"></i>Available</span><span><i class="selected"></i>Selected</span><span><i class="taken"></i>Filled</span><span><i class="blocked"></i>Blocked</span></div><div class="dining-guest-list"><div class="dining-guest-heading"><b>Your guests</b><small>One seat is required for each ticketed guest</small></div>${guestRows}</div><p class="dining-note">Your selections are held when saved. You can change batches or seats later while this ticket is active.</p>`,`<span class="dining-foot-count">${assignments.length===Number(booking.guests)?'All ticketed guests have a seat':`${Number(booking.guests)-assignments.length} ${Number(booking.guests)-assignments.length===1?'seat':'seats'} still to choose`}</span><button class="button button-primary" data-action="save-dining" ${complete?'':'disabled'}>Save dining seats <span class="arrow">→</span></button>`);
  modalRoot.querySelector('.modal')?.classList.add('dining-modal');
}
function renderPass(){
  const booking=state.bookings[0];const cruise=cruises.find(c=>c.id===booking?.cruise_id)||cruises[0];
  if(!booking){toast('Reserve a cabin before opening your booking summary.');return;}
  modal(booking.status==='confirmed_paid'?'Your boarding pass':'Boarding pass preview',`${safe(cruise.name)} · ${safe(booking.reference)}`,boardingPassMarkup(booking,cruise),`<button class="button button-secondary" data-action="close-modal">Close</button><button class="button button-primary" data-action="print-pass">Print / save PDF <span class="arrow">→</span></button>`);
  modalRoot.querySelector('.modal')?.classList.add('boarding-pass-modal');
}
function showSimple(title,text,action='Okay'){
  modal(title,'',`<p style="color:#617578;font-size:10px;line-height:1.7">${text}</p>`,`<button class="button button-primary" data-action="close-modal">${action}</button>`);
}
function showSwapRequest(shiftId){
  modal('Request a shift swap','Your manager will review this request.',`<form class="feedback-form" id="shift-swap-form"><input type="hidden" id="swap-shift-id" value="${safe(shiftId)}"><div class="field"><label for="swap-reason">Reason for the request</label><textarea id="swap-reason" required maxlength="300" placeholder="Tell your manager what changed"></textarea></div><p class="modal-info">This creates a pending request. It does not change your published schedule.</p><button class="button button-primary" type="submit">Send request <span class="arrow">→</span></button></form>`);
}
function showMaintenanceForm(){
  const authorizedSailings=sessionUser.role==='manager'?cruises:state.staffAccess.filter(item=>sessionUser.role==='crew'?item.view_jobs:item.dispatch_faults).map(item=>({id:item.cruise_id,name:item.name,date:item.date}));
  const sailingOptions=authorizedSailings.map(item=>`<option value="${safe(item.id)}">${safe(item.name)} · ${safe(item.date)}</option>`).join('');
  modal('Report a ship fault','Pinpoint the sailing and location so the right crew can find it.',`<form class="feedback-form" id="maintenance-form"><div class="field"><label for="maintenance-cruise">Sailing</label><select id="maintenance-cruise" required>${sailingOptions}</select></div><div class="field"><label for="maintenance-title">Fault</label><input id="maintenance-title" required minlength="4" maxlength="120" placeholder="e.g. Cold room temperature rising"></div><div class="grid two-col"><div class="field"><label for="maintenance-department">Department</label><select id="maintenance-department"><option>Engineering</option><option>Operations</option><option>Housekeeping</option><option>Galley</option><option>Safety</option><option>Guest Services</option></select></div><div class="field"><label for="maintenance-priority">Priority</label><select id="maintenance-priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></div></div><div class="field"><label for="maintenance-location">Exact location</label><input id="maintenance-location" required maxlength="100" placeholder="Ship · Deck 9 · port-side cold room"></div><div class="field"><label for="maintenance-description">What is happening?</label><textarea id="maintenance-description" maxlength="500" placeholder="Symptoms, guest or safety impact, and anything the crew should know"></textarea></div><button class="button button-primary" type="submit">Send fault to the job board <span class="arrow">→</span></button></form>`);
}
function showCrewWorkLog(){
  modal('Log completed work','Record work outside the assigned task list.',`<form class="feedback-form" id="crew-work-log-form"><div class="field"><label for="crew-log-category">Work area</label><select id="crew-log-category" required><option>Guest assistance</option><option>Cabin service</option><option>Safety</option><option>Port operations</option><option>Equipment</option><option>Other</option></select></div><div class="field"><label for="crew-log-summary">Work completed</label><input id="crew-log-summary" required minlength="3" maxlength="120" placeholder="Short summary of the work"></div><div class="field"><label for="crew-log-details">Notes</label><textarea id="crew-log-details" required minlength="3" maxlength="500" placeholder="What was done, where, and any follow-up needed"></textarea></div><p class="modal-info">This entry is saved with your account and visible in the crew and manager activity logs.</p><button class="button button-primary" type="submit">Save work log <span class="arrow">→</span></button></form>`);
}
function exportOperations(){
  if(!operationsData){toast('Operations data is still loading.');return;}
  const rows=[['section','item','value'],['occupancy','capacity',operationsData.occupancy.capacity],['occupancy','reserved',operationsData.occupancy.booked],['occupancy','available',operationsData.occupancy.available],...operationsData.inventory.map(i=>['inventory',i.name,`${i.on_hand} ${i.unit}`]),...operationsData.maintenance.map(i=>['maintenance',i.title,i.status])];
  const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='harborline-operations.csv';a.click();URL.revokeObjectURL(a.href);
}

document.getElementById('assistant-open').addEventListener('click',openAssistant);
document.addEventListener('click',async e=>{
  const nav=e.target.closest('[data-view]');
  if(nav){e.preventDefault();if(offlineMode){renderView(nav.dataset.view);return;}try{
    if(nav.dataset.view==='staff-access')staffAdminData=await serverApi('/api/staff/access');
    if(nav.dataset.view==='boarding-desk'){
      const allowed=sessionUser.role==='manager'?cruises:state.staffAccess.filter(item=>item.scan_boarding).map(item=>({...item,id:item.cruise_id}));
      if(!allowed.some(item=>item.id===selectedBoardingCruiseId))selectedBoardingCruiseId=allowed[0]?.id||'';
      if(selectedBoardingCruiseId)await refreshBoardingManifest(selectedBoardingCruiseId);
    }
    if(nav.dataset.view==='sailing-setup'){const [refreshed,setup]=await Promise.all([serverApi('/api/cruises'),serverApi('/api/sailing/setup')]);cruises=refreshed.map(c=>({...c,desc:c.description}));sailingSetupData=setup;if(sessionUser.role!=='crew')await refreshDiningOperations();}
    if(nav.dataset.view==='dining-ops')await refreshDiningOperations();
    if(nav.dataset.view==='muster'){musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);selectedMusterCruiseId=musterData.cruiseId;}
    if(nav.dataset.view==='maintenance-plan'){preventiveData=await serverApi(`/api/preventive?cruiseId=${encodeURIComponent(selectedPreventiveCruiseId)}`);selectedPreventiveCruiseId=preventiveData.cruiseId;}
    if(nav.dataset.view==='port-operations'){portOperationsData=await serverApi(`/api/port-operations?cruiseId=${encodeURIComponent(selectedPortCruiseId)}`);selectedPortCruiseId=portOperationsData.cruiseId;}
    if(nav.dataset.view==='disruption-recovery'){disruptionData=await serverApi(`/api/disruption-recovery?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);selectedDisruptionCruiseId=disruptionData.cruiseId;}
    if(nav.dataset.view==='service-cases'){serviceCaseData=await serverApi('/api/service-cases');state.serviceCases=serviceCaseData.cases||[];}
    if(nav.dataset.view==='voyage'&&sessionUser.role==='passenger'){const [itinerary,cases]=await Promise.all([serverApi('/api/guest/itinerary'),serverApi('/api/service-cases')]);guestItinerary=itinerary;state.serviceCases=cases.cases||[];}
    renderView(nav.dataset.view);
    cacheOfflineSnapshot();
  }catch(error){toast(error.message);}return;}
  const question=e.target.closest('[data-question]');if(question){addAssistantMessage(question.dataset.question);return;}
  const cabin=e.target.closest('[data-cabin]');
  if(cabin&&!cabin.disabled){document.querySelectorAll('.cabin.selected').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false');x.setAttribute('aria-label',`Cabin ${x.dataset.cabin}, ${x.dataset.category}, ${x.dataset.statusDescription}`);x.title=`Cabin ${x.dataset.cabin} · ${x.dataset.category} · ${x.dataset.statusDescription}`;x.querySelector('.cabin-state').textContent=x.dataset.statusLabel;});cabin.classList.add('selected');cabin.setAttribute('aria-pressed','true');cabin.setAttribute('aria-label',`Cabin ${cabin.dataset.cabin}, ${cabin.dataset.category}, selected`);cabin.title=`Cabin ${cabin.dataset.cabin} · ${cabin.dataset.category} · Selected`;cabin.querySelector('.cabin-state').textContent='Selected';selectedCabin=cabin.dataset.cabin;selectedCabinDelta=Number(cabin.dataset.delta||0);const copy=document.getElementById('cabin-summary-copy'),price=document.getElementById('cabin-summary-price'),confirm=document.getElementById('confirm-cabin');if(copy)copy.innerHTML=`Cabin <b>${safe(selectedCabin)}</b> · Deck 8 · ${safe(cabin.dataset.category)}`;if(price)price.textContent=`${money(currentCruise.from+selectedCabinDelta)} / guest`;if(confirm)confirm.disabled=false;return;}
  const b=e.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action;
  if(action==='close-modal'){closeModal();return;}
  if(action==='approve-disruption'){
    b.disabled=true;
    try{const result=await serverApi(`/api/disruption-recovery/${Number(b.dataset.id)}/approve`,{method:'POST',body:'{}'});disruptionData=await serverApi(`/api/disruption-recovery?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);portOperationsData=await serverApi(`/api/port-operations?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);cacheOfflineSnapshot();renderView('disruption-recovery');toast(`Recovery approved. ${result.notifiedBookings} booking parties were notified and follow-ups were opened.`);}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='accept-recovery-task'||action==='start-recovery-task'||action==='resolve-recovery-task'){
    const next=action==='accept-recovery-task'?'Accepted':action==='start-recovery-task'?'In progress':'Resolved';b.disabled=true;
    try{await serverApi(`/api/disruption-recovery/tasks/${Number(b.dataset.id)}`,{method:'PATCH',body:JSON.stringify({status:next})});disruptionData=await serverApi(`/api/disruption-recovery?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);cacheOfflineSnapshot();renderView('disruption-recovery');toast(`Recovery follow-up marked ${next.toLowerCase()} and logged.`);}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='disruption-choice'){
    b.disabled=true;
    try{await serverApi(`/api/disruption-recovery/${Number(b.dataset.eventId)}/choice`,{method:'POST',body:JSON.stringify({impactId:Number(b.dataset.impactId),choice:b.dataset.choice})});guestItinerary=await serverApi('/api/guest/itinerary');serviceCaseData=await serverApi('/api/service-cases');state.serviceCases=serviceCaseData.cases||[];cacheOfflineSnapshot();renderView('voyage');toast(b.dataset.choice==='alternative'?'The crew will follow up about an onboard alternative.':'Your response is recorded.');}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='sync-offline'){
    if(offlineMode){toast('Reconnect to the ship network to sync queued actions.');return;}
    const failed=readOfflineQueue().filter(item=>item.failed);
    if(failed.length){const rows=failed.map(item=>`<div class="offline-review-row"><b>${safe(item.path.replace('/api/','').replaceAll('/',' · '))}</b><small>${safe(item.error||'Server rejected the queued action. Check the details before retrying.')}</small><button class="text-link" data-action="retry-offline-action" data-id="${safe(item.actionId)}">Retry</button><button class="text-link danger-link" data-action="discard-offline-action" data-id="${safe(item.actionId)}">Discard</button></div>`).join('');modal('Offline actions need review','Some queued changes could not be accepted by the server.',rows,`<button class="button button-secondary" data-action="close-modal">Close</button>`);return;}
    await syncOfflineQueue();return;
  }
  if(action==='retry-offline-action'){const items=readOfflineQueue();const item=items.find(value=>value.actionId===b.dataset.id);if(item){item.failed=false;delete item.error;writeOfflineQueue(items);}closeModal();await syncOfflineQueue();return;}
  if(action==='discard-offline-action'){writeOfflineQueue(readOfflineQueue().filter(value=>value.actionId!==b.dataset.id));closeModal();return;}
  if(action==='add-setup-batch'){document.getElementById('setup-batch-list')?.insertAdjacentHTML('beforeend',setupBatchRow());return;}
  if(action==='remove-setup-batch'){const rows=document.querySelectorAll('#setup-batch-list .setup-batch-row');if(rows.length<=1){toast('A sailing needs at least one dining batch.');return;}b.closest('.setup-batch-row')?.remove();return;}
  if(action==='start-boarding-camera'){await startBoardingScanner();return;}
  if(action==='stop-boarding-camera'){stopBoardingScanner();return;}
  if(action==='accept-job'||action==='start-job'){
    const next=action==='accept-job'?'Accepted':'In progress';b.disabled=true;
    try{await serverApi(`/api/maintenance/jobs/${Number(b.dataset.id)}`,{method:'PATCH',body:JSON.stringify({status:next})});await refreshMaintenanceJobs();await refreshCrewActivity();renderView('crew');toast(next==='Accepted'?'Fault accepted and logged to your crew record.':'Work started and logged against the fault.');}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='accept-service-case'||action==='start-service-case'||action==='resolve-service-case'||action==='close-service-case'){
    const next=action==='accept-service-case'?'Accepted':action==='start-service-case'?'In progress':'Resolved';b.disabled=true;
    try{await serverApi(`/api/service-cases/${Number(b.dataset.id)}`,{method:'PATCH',body:JSON.stringify({status:next})});serviceCaseData=await serverApi('/api/service-cases');state.serviceCases=serviceCaseData.cases||[];cacheOfflineSnapshot();renderView('service-cases');toast(`Guest request marked ${next.toLowerCase()}.`);}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='close-muster'){
    b.disabled=true;try{await serverApi(`/api/muster/events/${Number(b.dataset.id)}/close`,{method:'POST',body:'{}'});musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');toast('Muster closed and recorded.');}
    catch(error){b.disabled=false;toast(error.message);}return;
  }
  if(action==='resolve-job'){showResolveJobForm(b.dataset.id);return;}
  if(action==='show-assistant'){openAssistant();return;}
  if(action==='select-dining-ops-batch'){selectedDiningBatchId=Number(b.dataset.batchId);renderView('dining-ops');return;}
  if(action==='block-dining-seat'||action==='open-dining-seat'){
    const status=action==='block-dining-seat'?'blocked':'available';
    try{await serverApi(`/api/dining/seats/${Number(b.dataset.seatId)}/status`,{method:'PATCH',body:JSON.stringify({status})});await refreshDiningOperations();renderView('dining-ops');toast(`Seat ${status==='blocked'?'blocked':'reopened'} and added to the dining operations log.`);}
    catch(err){toast(err.message);}return;
  }
  if(action==='cruise-detail'){showDetail(cruises.find(c=>c.id===b.dataset.id)||cruises[0]);return;}
  if(action==='choose-cabin'){try{await openCabins(currentCruise);}catch(err){toast(err.message);}return;}
  if(action==='dining-seating'){try{await openDiningPicker();}catch(err){toast(err.message);}return;}
  if(action==='open-dining-booking'){try{await loadDiningBooking(b.dataset.bookingId);}catch(err){toast(err.message);}return;}
  if(action==='dining-batch'){if(diningFlow){diningFlow.activeBatchId=Number(b.dataset.batchId);renderDiningSeats();}return;}
  if(action==='dining-seat'){
    if(!diningFlow)return;
    const seatId=Number(b.dataset.seatId),existing=diningFlow.assignments.find(item=>item.seatId===seatId);
    if(existing){diningFlow.assignments=diningFlow.assignments.filter(item=>item.seatId!==seatId);renderDiningSeats();return;}
    const seatStatus=b.dataset.seatStatus;
    if(seatStatus==='booked'||seatStatus==='blocked')return;
    const guests=Number(diningFlow.data.booking.guests),assigned=new Set(diningFlow.assignments.map(item=>item.guestNumber));
    let guestNumber=0;for(let n=1;n<=guests;n++)if(!assigned.has(n)){guestNumber=n;break;}
    if(!guestNumber){toast('Remove a seat first to choose a different one.');return;}
    diningFlow.assignments.push({guestNumber,batchId:Number(diningFlow.activeBatchId),seatId});renderDiningSeats();return;
  }
  if(action==='remove-dining-seat'){if(diningFlow){diningFlow.assignments=diningFlow.assignments.filter(item=>item.guestNumber!==Number(b.dataset.guestNumber));renderDiningSeats();}return;}
  if(action==='save-dining'){
    if(!diningFlow)return;
    const button=b,flow=diningFlow,guestCount=Number(flow.data.booking.guests);
    if(flow.assignments.length!==guestCount){toast(`Choose exactly ${guestCount} seats for this ticket.`);return;}
    button.disabled=true;
    try{
      await serverApi(`/api/bookings/${Number(flow.data.booking.id)}/dining`,{method:'POST',body:JSON.stringify({assignments:flow.assignments})});
      const current=state.bookings.find(item=>Number(item.id)===Number(flow.data.booking.id));if(current)current.dining_reserved_guests=guestCount;
      diningFlow=null;closeModal();renderView(activeView);toast(`Dining seats saved for all ${guestCount} ${guestCount===1?'guest':'guests'}.`);
    }catch(err){button.disabled=false;toast(err.message);}
    return;
  }
  if(action==='reserve'){showReserve(b.dataset.name);return;}
  if(action==='confirm-reservation'){try{const result=await serverApi('/api/reservations',{method:'POST',body:JSON.stringify({title:b.dataset.name,guests:Number(document.getElementById('guest-count').value),note:document.getElementById('special-note').value})});state.reservations.unshift(result);closeModal();renderView(activeView);toast('Your onboard request was saved to your account.');}catch(err){toast(err.message);}return;}
  if(action==='confirm-cabin'){
    if(!selectedCabin)return;b.disabled=true;
    try{
      const result=await serverApi('/api/bookings',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({cruiseId:currentCruise.id,cabinNumber:selectedCabin,guests:2})});
      if(result.checkoutUrl){window.location.assign(result.checkoutUrl);return;}
      state.bookings.unshift(result.booking);
      document.querySelector('.nav-count').textContent=String(state.bookings.length);
      document.querySelector('.nav-count').hidden=false;
      const voyageStatus=document.querySelector('.voyage-status');
      if(voyageStatus)voyageStatus.innerHTML=`<span class="status-dot"></span> ${safe(result.booking.name||currentCruise.name).toUpperCase()} <span class="status-divider">·</span> BOOKING ${safe(result.booking.reference)}`;
      closeModal();renderView('voyage');toast(`Demo reservation ${result.booking.reference} saved. No payment was collected.`);
    }catch(err){b.disabled=false;toast(err.message);}
    return;
  }
  if(action==='download-pass'){renderPass();return;}
  if(action==='print-pass'){window.print();return;}
  if(action==='swap-shift'){showSwapRequest(b.dataset.shift||shiftRecords[0]?.id||'');return;}
  if(action==='crew-attendance'){try{const result=await serverApi('/api/attendance',{method:'POST',body:'{}'});state.checkin=result.checkedIn;await refreshCrewActivity();renderView('crew');toast('Shift attendance was recorded on the server.');}catch(err){toast(err.message);}return;}
  if(action==='crew-work-log'){showCrewWorkLog();return;}
  if(action==='toggle-crew-activity'){state.showAllCrewActivity=!state.showAllCrewActivity;renderView(activeView);return;}
  if(action==='crew-feedback'){renderView('adaptive');document.getElementById('feedback-type').value='Operational problem';return;}
  if(action==='add-task'){showSimple('Add a crew task','In a connected operations system, new tasks would be assigned to a crew member and saved to the ship schedule. This prototype shows the workflow but does not connect a task service.');return;}
  if(action==='crew-message'){showSimple('Crew team message','Crew messaging needs to connect to an authorized ship communication service. This prototype does not send messages.');return;}
  if(action==='training'){showSimple('Training records','Sample status: safety certification 92% complete. A real system would show qualification records and renewal dates for the signed-in crew member.');return;}
  if(action==='crew-contacts'){showSimple('Team directory','Guest Services · Deck 5 · Supervisor: Priya Shah. This sample directory is local prototype content.');return;}
  if(action==='report'){exportOperations();return;}
  if(action==='new-maintenance'){showMaintenanceForm();return;}
  if(action==='review-feedback'){try{await serverApi(`/api/feedback/${b.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:'Reviewed'})});state.feedback=await serverApi('/api/feedback');operationsData=await serverApi('/api/operations');renderView('adaptive');toast('Feedback marked reviewed.');}catch(err){toast(err.message);}return;}
  if(action==='resolve-swap'){try{await serverApi(`/api/swaps/${b.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:b.dataset.status})});operationsData=await serverApi('/api/operations');state.swapRequests=await serverApi('/api/swaps');await refreshCrewActivity();renderView('management');toast('Shift swap decision saved.');}catch(err){toast(err.message);}return;}
  if(action==='itinerary-feedback'){renderView('adaptive');document.getElementById('feedback-type').value='Feature request';document.getElementById('feedback-title').value='Itinerary suggestion';document.getElementById('feedback-role').value='Passenger';return;}
  if(action==='ship-map'){showSimple('MV Solstice · deck guide','The ship map is a planned prototype extension. A production map needs a verified deck plan and accessibility review.');return;}
  if(action==='show-docs'){showSimple('Project record','The project documentation is in the docs folder: ASE and Agile approach, architecture, sprint plan, risk register, acceptance criteria, and requirement evolution.');return;}
});

document.addEventListener('change',async e=>{
  if(e.target.id==='muster-sailing'){selectedMusterCruiseId=e.target.value;try{musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');}catch(error){toast(error.message);}return;}
  if(e.target.id==='preventive-sailing'){selectedPreventiveCruiseId=e.target.value;try{preventiveData=await serverApi(`/api/preventive?cruiseId=${encodeURIComponent(selectedPreventiveCruiseId)}`);cacheOfflineSnapshot();renderView('maintenance-plan');}catch(error){toast(error.message);}return;}
  if(e.target.id==='port-sailing'){selectedPortCruiseId=e.target.value;try{portOperationsData=await serverApi(`/api/port-operations?cruiseId=${encodeURIComponent(selectedPortCruiseId)}`);cacheOfflineSnapshot();renderView('port-operations');}catch(error){toast(error.message);}return;}
  if(e.target.id==='recovery-sailing'){selectedDisruptionCruiseId=e.target.value;try{disruptionData=await serverApi(`/api/disruption-recovery?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);cacheOfflineSnapshot();renderView('disruption-recovery');}catch(error){toast(error.message);}return;}
  if(e.target.id==='dining-ops-cruise'){
    selectedDiningCruiseId=e.target.value;selectedDiningBatchId=Number(diningOperationsData?.batches.find(item=>item.cruise_id===selectedDiningCruiseId)?.id||0);renderView('dining-ops');return;
  }
  if(e.target.id==='access-staff'){selectedStaffUserId=Number(e.target.value);renderView('staff-access');return;}
  if(e.target.id==='access-sailing'){selectedStaffCruiseId=e.target.value;renderView('staff-access');return;}
  if(e.target.id==='boarding-sailing'){
    selectedBoardingCruiseId=e.target.value;try{await refreshBoardingManifest(selectedBoardingCruiseId);renderView('boarding-desk');}catch(error){toast(error.message);}return;
  }
  if(e.target.id==='destination-filter'){selectedRegion=e.target.value;refreshCruises();return;}
  if(e.target.id==='duration-filter'){selectedDuration=e.target.value;refreshCruises();return;}
  if(e.target.dataset.task!==undefined){try{await serverApi(`/api/tasks/${encodeURIComponent(e.target.dataset.task)}`,{method:'PATCH',body:JSON.stringify({status:e.target.checked?'done':'open'})});taskRecords=await serverApi('/api/tasks');state.tasks=Object.fromEntries(taskRecords.map(t=>[t.id,t.status==='done']));await refreshCrewActivity();renderView('crew');toast('Task progress and activity log saved.');}catch(err){toast(err.message);renderView('crew');}return;}
  if(e.target.dataset.action==='checkin'){
    const booking=state.bookings[0];if(!booking){toast('Reserve a cabin before starting check-in.');renderView('voyage');return;}
    try{const result=await serverApi(`/api/bookings/${booking.id}/check-in`,{method:'POST',body:'{}'});booking.checked_in_at=result.checked_in_at;state.checkin=true;renderView('voyage');toast('Check-in progress saved to your account.');}catch(err){toast(err.message);}
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='cruise-search'){queryText=e.target.value;refreshCruises();}
});
function refreshCruises(){
  const grid=document.getElementById('cruise-results');if(!grid)return;
  const list=D.filterCruises(cruises,{region:selectedRegion,duration:selectedDuration,query:queryText});
  grid.innerHTML=list.length?list.map(cruiseCard).join(''):'<div class="card empty-state">No voyages match those filters. Try widening your search.</div>';
}
document.addEventListener('submit',async e=>{
  if(e.target.id==='disruption-form'){
    e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form));body.portCallId=Number(body.portCallId);
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
    try{const result=await serverApi('/api/disruption-recovery',{method:'POST',body:JSON.stringify(body)});disruptionData=await serverApi(`/api/disruption-recovery?cruiseId=${encodeURIComponent(selectedDisruptionCruiseId)}`);cacheOfflineSnapshot();renderView('disruption-recovery');toast(`Draft ready: ${result.affectedBookings} booking parties · ${result.affectedGuests} guests to review.`);}
    catch(error){submit.disabled=false;toast(error.message);}return;
  }
  if(e.target.id==='muster-station-form'){
    e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form));body.deckMin=Number(body.deckMin);body.deckMax=Number(body.deckMax);body.capacity=Number(body.capacity);body.leadUserId=Number(body.leadUserId)||null;
    try{await serverApi('/api/muster/stations',{method:'POST',body:JSON.stringify(body)});musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');toast('Muster station saved.');}catch(error){toast(error.message);}return;
  }
  if(e.target.id==='muster-start-form'){
    e.preventDefault();const body=Object.fromEntries(new FormData(e.target));
    try{await serverApi('/api/muster/events',{method:'POST',body:JSON.stringify(body)});musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');toast('Muster started. Passenger accountability is open.');}catch(error){toast(error.message);}return;
  }
  if(e.target.id==='muster-checkin-form'){
    e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form));body.guestNumber=Number(body.guestNumber);body.stationId=Number(body.stationId);body.clientActionId=crypto.randomUUID();
    try{await serverApi('/api/muster/check-in',{method:'POST',body:JSON.stringify(body)});musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');toast('Guest checked in to the muster station.');}
    catch(error){if(isNetworkFailure(error)){await queueOfflineAction('/api/muster/check-in',body);const reference=body.reference.toUpperCase();musterData.passengers=(musterData.passengers||[]).map(item=>item.reference===reference&&Number(item.guest_number)===body.guestNumber?{...item,checked_at:'pending-local'}:item);cacheOfflineSnapshot();renderView('muster');toast('Muster check-in saved on this device; the server will verify it when connected.');}else toast(error.message);}return;
  }
  if(e.target.matches('.muster-lead-form')){
    e.preventDefault();const leadUserId=Number(e.target.querySelector('select').value)||null;
    try{await serverApi(`/api/muster/stations/${Number(e.target.dataset.id)}`,{method:'PATCH',body:JSON.stringify({leadUserId})});musterData=await serverApi(`/api/muster?cruiseId=${encodeURIComponent(selectedMusterCruiseId)}`);cacheOfflineSnapshot();renderView('muster');toast('Muster station lead updated.');}catch(error){toast(error.message);}return;
  }
  if(e.target.id==='pm-asset-form'){
    e.preventDefault();const body=Object.fromEntries(new FormData(e.target));body.intervalDays=Number(body.intervalDays);
    try{await serverApi('/api/preventive/assets',{method:'POST',body:JSON.stringify(body)});preventiveData=await serverApi(`/api/preventive?cruiseId=${encodeURIComponent(selectedPreventiveCruiseId)}`);cacheOfflineSnapshot();renderView('maintenance-plan');toast('Equipment and recurring service plan saved.');}catch(error){toast(error.message);}return;
  }
  if(e.target.matches('.pm-complete-form')){
    e.preventDefault();const form=e.target,note=form.querySelector('[name="note"]').value.trim(),body={note,clientActionId:crypto.randomUUID()},path=`/api/preventive/schedules/${Number(form.dataset.id)}/complete`;
    try{await serverApi(path,{method:'POST',body:JSON.stringify(body)});preventiveData=await serverApi(`/api/preventive?cruiseId=${encodeURIComponent(selectedPreventiveCruiseId)}`);cacheOfflineSnapshot();renderView('maintenance-plan');toast('Service recorded and the next due date calculated.');}
    catch(error){if(isNetworkFailure(error)){await queueOfflineAction(path,body);toast('Service entry saved on this device and queued for sync.');updateSyncStatus();}else toast(error.message);}return;
  }
  if(e.target.id==='port-call-form'){
    e.preventDefault();const body=Object.fromEntries(new FormData(e.target));body.sequence=Number(body.sequence);
    try{await serverApi('/api/port-calls',{method:'POST',body:JSON.stringify(body)});portOperationsData=await serverApi(`/api/port-operations?cruiseId=${encodeURIComponent(selectedPortCruiseId)}`);cacheOfflineSnapshot();renderView('port-operations');toast('Port call added to the sailing itinerary.');}catch(error){toast(error.message);}return;
  }
  if(e.target.matches('.port-update-form')){
    e.preventDefault();const form=e.target,body=Object.fromEntries(new FormData(form));body.notifyGuests=form.querySelector('[name="notifyGuests"]').checked;
    try{await serverApi(`/api/port-calls/${Number(form.dataset.id)}`,{method:'PATCH',body:JSON.stringify(body)});portOperationsData=await serverApi(`/api/port-operations?cruiseId=${encodeURIComponent(selectedPortCruiseId)}`);cacheOfflineSnapshot();renderView('port-operations');toast(body.notifyGuests?'Port status saved and published to passengers.':'Port status saved.');}catch(error){toast(error.message);}return;
  }
  if(e.target.id==='guest-case-form'){
    e.preventDefault();const body=Object.fromEntries(new FormData(e.target));body.bookingId=Number(body.bookingId);body.clientActionId=crypto.randomUUID();
    try{await serverApi('/api/service-cases',{method:'POST',body:JSON.stringify(body)});serviceCaseData=await serverApi('/api/service-cases');state.serviceCases=serviceCaseData.cases||[];cacheOfflineSnapshot();renderView('voyage');toast('Your request was sent to guest services.');}
    catch(error){if(isNetworkFailure(error)){await queueOfflineAction('/api/service-cases',body);state.serviceCases.unshift({id:`local-${Date.now()}`,title:body.title,category:body.category,priority:body.priority,status:'Waiting to sync',created_at:new Date().toISOString()});cacheOfflineSnapshot();renderView('voyage');toast('Request saved on this device and will send when connected.');}else toast(error.message);}return;
  }
  if(e.target.id==='sailing-setup-form'){
    e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]');
    const batches=[...form.querySelectorAll('#setup-batch-list .setup-batch-row')].map(row=>({name:row.querySelector('.setup-batch-name').value.trim(),startsAt:row.querySelector('.setup-batch-time').value,seatCount:Number(row.querySelector('.setup-batch-seats').value)}));
    const body={name:document.getElementById('setup-name').value.trim(),ship:document.getElementById('setup-ship').value.trim(),region:document.getElementById('setup-region').value.trim(),route:document.getElementById('setup-route').value.trim(),dateStart:document.getElementById('setup-start').value,dateEnd:document.getElementById('setup-end').value,baseFare:Number(document.getElementById('setup-fare').value),cabinCount:Number(document.getElementById('setup-cabins').value),batches};
    submit.disabled=true;
    try{const result=await serverApi('/api/cruises',{method:'POST',body:JSON.stringify(body)});const [refreshed,setup]=await Promise.all([serverApi('/api/cruises'),serverApi('/api/sailing/setup')]);cruises=refreshed.map(c=>({...c,desc:c.description}));sailingSetupData=setup;if(sessionUser.role!=='crew')await refreshDiningOperations();if(sessionUser.role==='captain')state.staffAccess=await serverApi('/api/staff/my-access');form.reset();document.getElementById('setup-fare').value='1249';document.getElementById('setup-cabins').value='48';document.getElementById('setup-batch-list').innerHTML=`${setupBatchRow('Early seating','17:30',48)}${setupBatchRow('Second seating','19:30',48)}${setupBatchRow('Late seating','21:30',48)}`;renderView('sailing-setup');toast(`${result.cruise.name} is live with ${result.inventory.cabins} cabins and ${result.inventory.diningSeats} dining seats.`);}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.matches('.add-sailing-batch-form')){
    e.preventDefault();const form=e.target,cruiseId=form.dataset.cruiseId,submit=form.querySelector('button[type="submit"]'),row=form.querySelector('.setup-batch-row');submit.disabled=true;
    try{await serverApi(`/api/cruises/${encodeURIComponent(cruiseId)}/dining-batches`,{method:'POST',body:JSON.stringify({name:row.querySelector('.setup-batch-name').value.trim(),startsAt:row.querySelector('.setup-batch-time').value,seatCount:Number(row.querySelector('.setup-batch-seats').value)})});sailingSetupData=await serverApi('/api/sailing/setup');if(sessionUser.role!=='crew')await refreshDiningOperations();renderView('sailing-setup');toast('Dinner batch and selectable seats added to the sailing.');}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.matches('.sailing-edit-form')){
    e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(form));data.baseFare=Number(data.baseFare);submit.disabled=true;
    try{await serverApi(`/api/cruises/${encodeURIComponent(form.dataset.cruiseId)}`,{method:'PATCH',body:JSON.stringify(data)});const [cruisesResult,setup]=await Promise.all([serverApi('/api/cruises'),serverApi('/api/sailing/setup')]);cruises=cruisesResult.map(c=>({...c,desc:c.description}));sailingSetupData=setup;renderView('sailing-setup');toast('Sailing route, dates, and fare saved.');}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.matches('.sailing-inventory-form')){
    e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]'),cabinCount=Number(form.querySelector('input').value);submit.disabled=true;
    try{await serverApi(`/api/cruises/${encodeURIComponent(form.dataset.cruiseId)}/inventory`,{method:'PATCH',body:JSON.stringify({cabinCount})});sailingSetupData=await serverApi('/api/sailing/setup');renderView('sailing-setup');toast(`Cabin inventory updated to ${cabinCount}.`);}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.id==='staff-access-form'){
    e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]'),permissions=Object.fromEntries([...form.querySelectorAll('input[type="checkbox"]')].map(input=>[input.name,input.checked]));submit.disabled=true;
    try{await serverApi('/api/staff/access',{method:'PUT',body:JSON.stringify({userId:selectedStaffUserId,cruiseId:selectedStaffCruiseId,permissions})});staffAdminData=await serverApi('/api/staff/access');renderView('staff-access');toast('Sailing permissions saved and added to the access log.');}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.id==='boarding-scan-form'){
    e.preventDefault();const reference=document.getElementById('boarding-reference').value.trim();if(reference)await submitBoardingScan(reference);return;
  }
  if(e.target.id==='resolve-job-form'){
    e.preventDefault();const submit=e.target.querySelector('button[type="submit"]'),id=Number(document.getElementById('resolve-job-id').value),note=document.getElementById('resolve-job-note').value.trim();submit.disabled=true;
    try{await serverApi(`/api/maintenance/jobs/${id}`,{method:'PATCH',body:JSON.stringify({status:'Resolved',note})});closeModal();if(sessionUser.role==='crew'){await refreshMaintenanceJobs();await refreshCrewActivity();renderView('crew');}else{await refreshOperationsWorkspace();renderView('management');}toast('Fault marked resolved. Repair notes and the action are logged.');}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.id==='dining-capacity-form'){
    e.preventDefault();const form=e.target,submit=form.querySelector('button[type="submit"]'),batchId=Number(form.dataset.batchId),capacity=Number(document.getElementById('dining-capacity-input').value);submit.disabled=true;
    try{const result=await serverApi(`/api/dining/batches/${batchId}/capacity`,{method:'PATCH',body:JSON.stringify({capacity})});await refreshDiningOperations();renderView('dining-ops');toast(result.changed?'Dining batch capacity saved to the operations log.':'The batch already has that capacity.');}
    catch(err){toast(err.message);submit.disabled=false;}return;
  }
  if(e.target.id==='feedback-form'){
    e.preventDefault();const title=document.getElementById('feedback-title').value.trim(),message=document.getElementById('feedback-message').value.trim(),err=document.getElementById('feedback-error');
    if(!title||!message){err?.classList.add('show');return;}
    const submit=e.target.querySelector('button[type="submit"]');submit.disabled=true;
    try{await serverApi('/api/feedback',{method:'POST',body:JSON.stringify({type:document.getElementById('feedback-type').value,title,message})});state.feedback=await serverApi('/api/feedback');if(sessionUser.role==='manager'){const backlog=await serverApi('/api/backlog');state.extraBacklog=backlog.map(item=>({id:`FB-${item.feedback_id}`,story:`Review feedback: ${item.title}`,priority:'Medium',sprint:'Needs triage',status:item.status}));}if(sessionUser.role==='crew')await refreshCrewActivity();renderView('adaptive');toast('Feedback saved to the Harborline database.');}
    catch(error){err.textContent=error.message;err.classList.add('show');submit.disabled=false;}return;
  }
  if(e.target.id==='shift-swap-form'){
    e.preventDefault();const submit=e.target.querySelector('button[type="submit"]');submit.disabled=true;
    try{await serverApi('/api/swaps',{method:'POST',body:JSON.stringify({shiftId:document.getElementById('swap-shift-id').value,reason:document.getElementById('swap-reason').value})});state.swapRequests=await serverApi('/api/swaps');state.swapRequested=state.swapRequests.some(item=>item.status==='pending');await refreshCrewActivity();closeModal();renderView('crew');toast('Shift swap request saved to your crew activity log.');}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.id==='crew-work-log-form'){
    e.preventDefault();const submit=e.target.querySelector('button[type="submit"]');submit.disabled=true;const body={category:document.getElementById('crew-log-category').value,summary:document.getElementById('crew-log-summary').value.trim(),details:document.getElementById('crew-log-details').value.trim(),clientActionId:crypto.randomUUID()};
    try{await serverApi('/api/crew/activity',{method:'POST',body:JSON.stringify(body)});await refreshCrewActivity();cacheOfflineSnapshot();closeModal();renderView('crew');toast('Work log saved to your account.');}
    catch(error){if(isNetworkFailure(error)){await queueOfflineAction('/api/crew/activity',body);cacheOfflineSnapshot();closeModal();renderView('crew');toast('Work log saved on this device and queued for sync.');}else{toast(error.message);submit.disabled=false;}}return;
  }
  if(e.target.id==='maintenance-form'){
    e.preventDefault();const submit=e.target.querySelector('button[type="submit"]');submit.disabled=true;
    try{await serverApi('/api/maintenance',{method:'POST',body:JSON.stringify({cruiseId:document.getElementById('maintenance-cruise').value,title:document.getElementById('maintenance-title').value,department:document.getElementById('maintenance-department').value,priority:document.getElementById('maintenance-priority').value,location:document.getElementById('maintenance-location').value.trim(),description:document.getElementById('maintenance-description').value})});if(sessionUser.role==='crew'){await refreshMaintenanceJobs();await refreshCrewActivity();closeModal();renderView('crew');toast('Fault report saved with sailing, exact location, priority, and crew log.');}else{await refreshOperationsWorkspace();closeModal();renderView('management');toast('Fault report added to the captain’s job board.');}}
    catch(error){toast(error.message);submit.disabled=false;}return;
  }
  if(e.target.id==='assistant-form'){e.preventDefault();const input=document.getElementById('assistant-input');const q=input.value.trim();if(!q)return;addAssistantMessage(q);input.value='';return;}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
window.addEventListener('offline',()=>{updateSyncStatus();toast('Connection lost. Supported crew entries will queue on this device.');});
window.addEventListener('online',async()=>{updateSyncStatus();const user=await window.HarborlineAuth.me();if(user&&!user.offline)await loadWorkspace(user);else updateSyncStatus();});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
updateSyncStatus();
(async()=>{
  const user=await window.HarborlineAuth.me();
  if(user)window.HarborlineAuth.showWorkspace(user);
  else window.HarborlineAuth.showSignIn();
})();
