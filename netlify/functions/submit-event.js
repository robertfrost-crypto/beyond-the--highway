// POST /.netlify/functions/submit-event   (called by submit-event.html)
// Saves the submission as status='pending'. Submitters can never self-publish.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const d = JSON.parse(event.body || '{}');
    if (!d.title || !d.starts_on || !d.ends_on) {
      return { statusCode: 400, body: 'Missing required fields' };
    }
    const row = {
      community: d.community || 'fort-mcmurray',
      status: 'pending',
      title: String(d.title).slice(0, 80),
      starts_on: d.starts_on,
      ends_on: d.ends_on,
      venue: d.venue || null,
      lat: d.lat || null,
      lng: d.lng || null,
      blurb: d.blurb ? String(d.blurb).slice(0, 400) : null,
      schedule_url: d.schedule_url || null,
      organizer_name: d.organizer_name || null,
      organizer_email: d.organizer_email || null
    };
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    if (!res.ok) return { statusCode: 500, body: 'Save failed' };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: 'Error' };
  }
};
