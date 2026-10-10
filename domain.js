/* Pure decision helpers shared by the browser app and its unit tests. */
(function (root) {
  'use strict';

  function filterCruises(cruises, options = {}) {
    const query = String(options.query || '').trim().toLowerCase();
    const region = options.region || 'All destinations';
    const duration = options.duration || 'Any duration';
    return cruises.filter(cruise => {
      const matchesRegion = region === 'All destinations' || cruise.region === region;
      const searchable = `${cruise.name} ${cruise.region} ${cruise.route} ${cruise.ship}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesDuration = duration === 'Any duration' ||
        (duration === 'Up to 7 nights' ? cruise.days <= 7 : cruise.days >= 8);
      return matchesRegion && matchesQuery && matchesDuration;
    });
  }

  function cabinIsAvailable(index, unavailable = [2, 6, 11, 18, 21]) {
    return Number.isInteger(index) && index >= 0 && index < 24 && !unavailable.includes(index);
  }

  function feedbackCreatesBacklog(type) {
    return type === 'Feature request' || type === 'Operational problem';
  }

  function createDemoBooking(cruise, cabin, createdAt = new Date().toISOString()) {
    if (!cruise || !cruise.id) throw new TypeError('A cruise is required.');
    if (!/^\d{4}$/.test(String(cabin))) throw new TypeError('Choose a valid cabin number.');
    return { cruise: cruise.id, cabin: String(cabin), createdAt };
  }

  function conciergeAnswer(question) {
    const s = String(question || '').toLowerCase();
    if (/cabin|room|deck/.test(s)) return 'The demo booking shows cabin 8246 on Deck 8. Select “Find a cruise” to compare available cabin types. Real-time cabin inventory is not connected here.';
    if (/nassau|excursion|shore|port/.test(s)) return 'Nassau is listed on Day 03, with port hours from 8:00 AM to 5:00 PM. The sample voyage suggests a Reef & rum shore day; check the onboard desk for live excursion availability.';
    if (/dinner|dining|restaurant|food|table/.test(s)) return 'Your preview includes Chef’s Table at Ember on Day 02 at 7:30 PM, Deck 8. Live restaurant availability and reservation changes are not connected in this prototype.';
    if (/activity|activities|do onboard|onboard/.test(s)) return 'The itinerary includes a sea day on Day 02 and sunset jazz on the Promenade on Day 05. You can explore the voyage page for the sample onboard activities.';
    if (/first day|day one|day 1|embark/.test(s)) return 'Embarkation is in Miami on Sunday, October 18. The sample boarding time is 11:30 AM and the ship departs at 4:00 PM. Please confirm actual times with your cruise operator.';
    if (/itinerary|schedule|route/.test(s)) return 'The sample route is Miami, Nassau, Ocean Cay, Cozumel, and back to Miami over 7 nights. Port calls can change with weather or ship operations.';
    if (/price|payment|pay|cost|book/.test(s)) return 'Listed sample fares begin at $1,249 per guest. Booking and payment are a demonstration only; no payment provider or live fare service is connected.';
    return 'I can help with the sample cruise, cabin choice, the itinerary, dining, or onboard activities. I do not have access to live reservations or private operational records in this prototype.';
  }

  const api = { filterCruises, cabinIsAvailable, feedbackCreatesBacklog, createDemoBooking, conciergeAnswer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HarborlineDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
