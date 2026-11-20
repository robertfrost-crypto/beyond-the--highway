// Called automatically from admin.html whenever a listing is saved without
// lat/lng yet (new listing, or an edit that changed the address). Add this
// fetch call to the places.html admin save function, right before it writes
// the listing to Supabase:
//
//   const geoRes = await fetch('/.netlify/functions/geocode-place-single', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ title: item.title, category: item.category, location: item.location })
//   });
//   const geo = await geoRes.json();
//   if (geo.lat) { item.lat = geo.lat; item.lng = geo.lng; item.geo_confidence = geo.confidence; }
//
// This keeps the Google API key server-side (never exposed in admin.html)
// while still geocoding new listings the moment they're saved — no separate
// batch run needed for anything added going forward.

const { geocodeItem } = require('./_geocode-core');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Use POST' };
  }

  try {
    const item = JSON.parse(event.body);
    const result = await geocodeItem(item);

    if (result.skipped || result.status !== 'matched') {
      return { statusCode: 200, body: JSON.stringify({ matched: false, reason: result.reason || result.status }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        matched: true,
        lat: result.lat,
        lng: result.lng,
        confidence: result.confidence
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
