// Visit this URL once in your browser (after deploying) to geocode every
// existing places.html listing that doesn't have lat/lng yet:
//
//   https://YOURSITE.netlify.app/.netlify/functions/geocode-places-batch
//
// It reads the places_items blob from Supabase, geocodes anything missing
// coordinates, writes the updated blob back, and returns a summary you can
// read right in the browser — including a short list of "needs_review"
// matches worth a quick eyeball.
//
// Safe to re-run: it skips any item that already has lat/lng, so running it
// again later only picks up newly added listings that haven't been geocoded.

const { geocodeItem } = require('./_geocode-core');

const SUPABASE_URL = 'https://ceipylnjdidjqidamkpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaXB5bG5qZGlkanFpZGFta3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTQ1MjAsImV4cCI6MjA5ODg3MDUyMH0.TGZYRcjscN3ysRfTT5iHSl2pTOIhvMF6dCd-elm7L7g';
const PLACES_CLOUD_KEY = 'places_items';
const SAVE_PIN = '2005';

async function loadPlaces() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bth_content?key=eq.${PLACES_CLOUD_KEY}&select=data`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const rows = await res.json();
  if (!rows.length) throw new Error('places_items not found in bth_content');
  return rows[0].data;
}

async function savePlaces(items) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bth_save_content`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_pin: SAVE_PIN, p_key: PLACES_CLOUD_KEY, p_data: items })
  });
  if (!res.ok) throw new Error(`Failed to save back to Supabase: ${res.status}`);
}

exports.handler = async function () {
  try {
    const items = await loadPlaces();

    const results = { matched: 0, needsReview: [], unmatched: [], skipped: 0, errors: [] };

    for (const item of items) {
      if (item.lat && item.lng) continue; // already geocoded, leave alone

      const result = await geocodeItem(item);

      if (result.skipped) {
        results.skipped++;
        continue;
      }
      if (result.status === 'error') {
        results.errors.push({ title: item.title, error: result.error });
        continue;
      }
      if (result.status === 'unmatched') {
        results.unmatched.push(item.title);
        continue;
      }

      item.lat = result.lat;
      item.lng = result.lng;
      item.geo_confidence = result.confidence;
      results.matched++;
      if (result.confidence === 'needs_review') {
        results.needsReview.push({
          title: item.title,
          category: item.category,
          matchedTo: result.matchedName || result.matchedAddress
        });
      }
    }

    await savePlaces(items);

    const summaryHtml = `
      <h2>Geocoding complete</h2>
      <p><b>${results.matched}</b> listings geocoded and saved.</p>
      <p><b>${results.skipped}</b> skipped (activity/non-point entries, left as-is).</p>
      <p><b>${results.unmatched.length}</b> could not be matched: ${results.unmatched.join(', ') || 'none'}</p>
      <p><b>${results.needsReview.length}</b> low-confidence matches worth a quick check:</p>
      <ul>${results.needsReview.map(r => `<li>${r.title} (${r.category}) → matched "${r.matchedTo}"</li>`).join('')}</ul>
      ${results.errors.length ? `<p><b>Errors:</b> ${JSON.stringify(results.errors)}</p>` : ''}
    `;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: summaryHtml };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};
