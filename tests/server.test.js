const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createHarborlineServer } = require('../server.js');

let server;
let base;
async function api(path, {method='GET',body,token,headers={}}={}) {
  return fetch(`${base}${path}`,{
    method,
    headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Cookie:token}:{}),...headers},
    body:body?JSON.stringify(body):undefined
  });
}
async function login(email,password) {
  const response=await api('/api/auth/login',{method:'POST',body:{email,password}});
  const cookie=response.headers.get('set-cookie')?.split(';')[0];
  return {response,cookie};
}

test.before(async()=>{
  server=createHarborlineServer({dbPath:':memory:'});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  base=`http://127.0.0.1:${server.address().port}`;
});
test.after(async()=>{
  if(server?.listening){server.close();await once(server,'close');}
});

test('unauthenticated users cannot read account or operations data',async()=>{
  assert.equal((await api('/api/me')).status,401);
  assert.equal((await api('/api/operations')).status,401);
});

test('passenger sign-in receives a secure session and can create an account booking',async()=>{
  const {response:loginResponse,cookie}=await login('passenger@harborline.test','SailAway2026!');
  assert.equal(loginResponse.status,200);
  assert.match(loginResponse.headers.get('set-cookie'),/HttpOnly/);
  assert.match(loginResponse.headers.get('set-cookie'),/SameSite=Strict/);
  assert.equal((await (await api('/api/me',{token:cookie})).json()).user.role,'passenger');
  const cruises=await (await api('/api/cruises')).json();
  assert.equal(cruises.length,6);
  const cruise=cruises.find(c=>c.id==='c1');
  const cabins=await (await api(`/api/cruises/${cruise.id}/cabins`,{token:cookie})).json();
  const available=cabins.find(c=>c.status==='available');
  const bookingResponse=await api('/api/bookings',{method:'POST',token:cookie,headers:{'Idempotency-Key':'server-test-booking-01'},body:{cruiseId:cruise.id,cabinNumber:available.cabin_number,guests:2}});
  assert.equal(bookingResponse.status,201);
  const created=await bookingResponse.json();
  assert.equal(created.booking.status,'confirmed_demo');
  assert.equal(created.payment,'not_collected_demo');
  const duplicate=await api('/api/bookings',{method:'POST',token:cookie,headers:{'Idempotency-Key':'server-test-booking-01'},body:{cruiseId:cruise.id,cabinNumber:available.cabin_number,guests:2}});
  assert.equal(duplicate.status,200);
  assert.equal((await duplicate.json()).reused,true);
  const collision=await api('/api/bookings',{method:'POST',token:cookie,headers:{'Idempotency-Key':'server-test-booking-02'},body:{cruiseId:cruise.id,cabinNumber:available.cabin_number,guests:2}});
  assert.equal(collision.status,409);
  const bookings=await (await api('/api/bookings',{token:cookie})).json();
  assert.equal(bookings.length,1);
  assert.equal(bookings[0].cabin_number,available.cabin_number);
});

test('roles are enforced and managers receive live database counts',async()=>{
  const passenger=await login('passenger@harborline.test','SailAway2026!');
  assert.equal((await api('/api/operations',{token:passenger.cookie})).status,403);
  const manager=await login('manager@harborline.test','ShipOps2026!');
  assert.equal(manager.response.status,200);
  assert.equal((await api('/api/bookings',{token:manager.cookie})).status,403);
  const operations=await (await api('/api/operations',{token:manager.cookie})).json();
  assert.equal(operations.occupancy.booked,1);
  assert.equal(operations.occupancy.available,18);
});

test('feedback persists for its owner and appears in manager triage',async()=>{
  const passenger=await login('passenger@harborline.test','SailAway2026!');
  const submitted=await api('/api/feedback',{method:'POST',token:passenger.cookie,body:{type:'Feature request',title:'Compare cabin categories',message:'Show cabin category and deck before I reserve.'}});
  assert.equal(submitted.status,201);
  const personal=await (await api('/api/feedback',{token:passenger.cookie})).json();
  assert.equal(personal.length,1);
  const manager=await login('manager@harborline.test','ShipOps2026!');
  const inbox=await (await api('/api/feedback',{token:manager.cookie})).json();
  assert.equal(inbox.length,1);
  assert.equal(inbox[0].sender,'Alex Morgan');
  assert.equal((await api(`/api/feedback/${inbox[0].id}`,{method:'PATCH',token:manager.cookie,body:{status:'Reviewed'}})).status,200);
});

test('crew task, attendance, and shift swap changes persist through the API',async()=>{
  const crew=await login('crew@harborline.test','CrewShift2026!');
  const tasks=await (await api('/api/tasks',{token:crew.cookie})).json();
  assert.equal(tasks.length,3);
  assert.equal((await api(`/api/tasks/${tasks[0].id}`,{method:'PATCH',token:crew.cookie,body:{status:'done'}})).status,200);
  assert.equal((await (await api('/api/tasks',{token:crew.cookie})).json())[0].status,'done');
  assert.equal((await api('/api/attendance',{method:'POST',token:crew.cookie,body:{}})).status,200);
  assert.equal((await (await api('/api/attendance',{token:crew.cookie})).json()).checkedIn,true);
  assert.equal((await api('/api/swaps',{method:'POST',token:crew.cookie,body:{shiftId:'shift-1',reason:'Schedule conflict'}})).status,201);
  const manager=await login('manager@harborline.test','ShipOps2026!');
  const swaps=await (await api('/api/swaps',{token:manager.cookie})).json();
  assert.equal(swaps.length,1);
  assert.equal((await api(`/api/swaps/${swaps[0].id}`,{method:'PATCH',token:manager.cookie,body:{status:'approved'}})).status,200);
  assert.equal((await (await api('/api/swaps',{token:crew.cookie})).json())[0].status,'approved');
});

test('registration is passenger-only and rejects weak passwords and foreign origins',async()=>{
  const weak=await api('/api/auth/register',{method:'POST',body:{name:'Taylor User',email:'taylor@example.test',password:'short'}});
  assert.equal(weak.status,400);
  const origin=await api('/api/auth/login',{method:'POST',headers:{Origin:'http://unexpected.invalid'},body:{email:'passenger@harborline.test',password:'SailAway2026!'}});
  assert.equal(origin.status,403);
  const registered=await api('/api/auth/register',{method:'POST',body:{name:'Taylor User',email:'taylor@example.test',password:'LongEnough2026!'}});
  assert.equal(registered.status,201);
  assert.equal((await registered.json()).user.role,'passenger');
});
