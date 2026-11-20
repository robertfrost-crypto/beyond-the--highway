// Shared geocoding logic used by both geocode-places-batch.js (one-time run over
// all listings) and geocode-place-single.js (called from admin.html when a new
// listing is saved without coordinates yet).
//
// Uses Google Places API (New) "Text Search" endpoint, since it can match a
// business by name alone (no street address required) as well as by full address.

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;

// Entries that are purely generic activity write-ups (no specific named
// place) get skipped — e.g. a page just titled "Hiking" or "Golf" with no
// particular location. Specific named places within Lakes, Trails, Golf,
// Provincial Parks, etc. (e.g. "Gregoire Lake", "Miskanaw Golf Club",
// "Vista Ridge Trail") are real, pinnable locations and should NOT be
// blanket-excluded just because of their category.
function looksLikeActivityEntry(item) {
  const genericTitles = /^(hiking|golf|fishing|winter activities|festivals? ?&? ?events?|skidooing|atv(ing)?)$/i;
  return genericTitles.test((item.title || '').trim());
}

function isPinnable(item) {
  if (looksLikeActivityEntry(item)) return false;
  return true;
}

async function geocodeItem(item) {
  if (!isPinnable(item)) {
    return { skipped: true, reason: 'non-point / activity entry' };
  }

  const hasRealAddress = item.location && item.location.trim() !== 'Fort McMurray Wood Buffalo';

  // Build the search query: prefer a real address, fall back to name + area.
  const query = hasRealAddress
    ? `${item.title}, ${item.location}`
    : `${item.title}, Fort McMurray Wood Buffalo, Alberta`;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'places.location,places.formattedAddress,places.displayName'
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
  });

  if (!res.ok) {
    return { skipped: false, status: 'error', error: `Google API ${res.status}` };
  }

  const data = await res.json();
  const place = data.places && data.places[0];

  if (!place) {
    return { skipped: false, status: 'unmatched' };
  }

  // Confidence: high if we searched on a real street address (Google is
  // matching a known address, not guessing from a name). Lower confidence
  // when we only had the business name + generic city to go on, since that
  // search can occasionally return a similarly-named place or wrong branch.
  const confidence = hasRealAddress ? 'high' : 'needs_review';

  return {
    skipped: false,
    status: 'matched',
    confidence,
    lat: place.location.latitude,
    lng: place.location.longitude,
    matchedAddress: place.formattedAddress,
    matchedName: place.displayName ? place.displayName.text : null
  };
}

module.exports = { geocodeItem, isPinnable };
