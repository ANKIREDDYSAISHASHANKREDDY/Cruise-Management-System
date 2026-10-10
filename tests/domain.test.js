const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../domain.js');

const sampleCruises = [
  { id: 'c1', name: 'Atlantic Breeze', region: 'Caribbean', route: 'Miami · Nassau', ship: 'MV Solstice', days: 7 },
  { id: 'c2', name: 'Aegean Blue', region: 'Mediterranean', route: 'Athens · Santorini', ship: 'MV Asteria', days: 9 },
  { id: 'c3', name: 'Wild Coast', region: 'Northern Europe', route: 'Reykjavik · Ísafjörður', ship: 'MV Fjordlight', days: 10 }
];

test('cruise search matches route and ship names without case sensitivity', () => {
  assert.deepEqual(domain.filterCruises(sampleCruises, { query: 'nassau' }).map(c => c.id), ['c1']);
  assert.deepEqual(domain.filterCruises(sampleCruises, { query: 'mv ASTERIA' }).map(c => c.id), ['c2']);
});

test('cruise filters combine destination, text, and duration', () => {
  assert.deepEqual(domain.filterCruises(sampleCruises, {
    region: 'Caribbean', duration: 'Up to 7 nights', query: 'breeze'
  }).map(c => c.id), ['c1']);
  assert.deepEqual(domain.filterCruises(sampleCruises, {
    region: 'Caribbean', duration: '8 nights or more'
  }), []);
});

test('empty and unknown searches behave predictably', () => {
  assert.equal(domain.filterCruises(sampleCruises, {}).length, 3);
  assert.deepEqual(domain.filterCruises(sampleCruises, { query: 'moon base' }), []);
});

test('cabin availability rejects blocked and out-of-range deck positions', () => {
  assert.equal(domain.cabinIsAvailable(0), true);
  assert.equal(domain.cabinIsAvailable(2), false);
  assert.equal(domain.cabinIsAvailable(24), false);
  assert.equal(domain.cabinIsAvailable(-1), false);
});

test('only feature requests and operational problems create triage backlog entries', () => {
  assert.equal(domain.feedbackCreatesBacklog('Feature request'), true);
  assert.equal(domain.feedbackCreatesBacklog('Operational problem'), true);
  assert.equal(domain.feedbackCreatesBacklog('Suggestion'), false);
  assert.equal(domain.feedbackCreatesBacklog('Issue'), false);
});

test('demo booking records the selected sailing, cabin, and timestamp', () => {
  assert.deepEqual(domain.createDemoBooking({ id: 'c1' }, '8246', '2026-10-06T00:00:00.000Z'), {
    cruise: 'c1', cabin: '8246', createdAt: '2026-10-06T00:00:00.000Z'
  });
  assert.throws(() => domain.createDemoBooking(null, '8246'), /cruise is required/);
  assert.throws(() => domain.createDemoBooking({ id: 'c1' }, 'room-4'), /valid cabin number/);
});

test('concierge answers from sample voyage information and discloses limits', () => {
  assert.match(domain.conciergeAnswer('When do we visit Nassau?'), /8:00 AM to 5:00 PM/);
  assert.match(domain.conciergeAnswer('What is the live weather?'), /do not have access to live reservations/);
});
