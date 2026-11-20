// GET /.netlify/functions/events?community=fort-mcmurray[&id=<uuid>]
// Returns approved events that haven't ended. Never exposes organizer email.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const community = q.community || 'fort-mcmurray';
  const today = new Date().toISOString().slice(0, 10);
  const fields = 'id,title,starts_on,ends_on,venue,lat,lng,blurb,schedule_url,poster_url';

  let url = `${process.env.SUPABASE_URL}/rest/v1/events`
    + `?select=${fields}`
    + `&community=eq.${encodeURIComponent(community)}`
    + `&status=eq.approved`
    + `&ends_on=gte.${today}`
    + `&order=starts_on.asc`;
  if (q.id) url += `&id=eq.${encodeURIComponent(q.id)}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    const rows = res.ok ? await res.json() : [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(rows)
    };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }
};
