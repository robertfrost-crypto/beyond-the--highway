// Beyond the Highway — visitor tracking (v3)
// Include on EVERY page with:
//   <script src="visitor-tracker.js" defer></script>
// placed right before </body>.
//
// What it does:
//   1. Logs every page load with IP-level city (unchanged from v1/v2).
//   2. On a visitor's SECOND visit or later, asks once for browser location and
//      logs whether they're physically in/near Fort McMurray. First-time
//      visitors are never prompted — they already see the app-install banner
//      and we don't want to pile on.
//   3. Exposes window.BTHTrack.click() for per-listing click tracking.
//   4. v3: known bots/crawlers/monitoring tools are detected by
//      user-agent and never logged at all. Every row that IS logged now also
//      stores the raw user_agent string, so the admin analytics view can do
//      its own (more thorough) filtering on top of this.
//   5. NEW (v4): when the visitor arrived via a link on another BTH page,
//      logs WHICH page sent them (referrer_page), not just that it was
//      internal navigation — so the admin view can show "how people reached
//      Local News" broken down by the button/tile they came from.
//
// Everything fails silently — tracking never blocks or breaks a page.

(function () {
  const SUPABASE_URL = 'https://ceipylnjdidjqidamkpw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaXB5bG5qZGlkanFpZGFta3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTQ1MjAsImV4cCI6MjA5ODg3MDUyMH0.TGZYRcjscN3ysRfTT5iHSl2pTOIhvMF6dCd-elm7L7g';

  // Fort McMurray city centre. "In town" = within IN_TOWN_KM of here.
  const FMM_LAT = 56.7264, FMM_LNG = -111.3803, IN_TOWN_KM = 35;

  const LS = {
    id: 'bth_visitor_id',
    visits: 'bth_visit_count',
    geoAsked: 'bth_geo_asked'
  };

  // Netlify strips the .html extension from the URL bar on normal link
  // clicks ("pretty URLs"), but a directly-typed or bookmarked .html URL
  // keeps it — so the same page was logging as two different strings
  // ("onnow" vs "onnow.html"). Normalize to always store the .html form.
  function normalizePage(pathname) {
    let p = (pathname || '').replace(/^\/+/, '');
    if (!p) return 'index.html';
    if (!/\.html?$/i.test(p)) p += '.html';
    return p;
  }

  function ls(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
      return val;
    } catch (e) { return null; }
  }

  // ---- Bot / crawler / monitoring-tool detection ----
  // Covers: search + SEO crawlers, social link-preview bots, AI crawlers,
  // headless browser automation, uptime/monitoring services, and generic
  // scripted HTTP clients that happen to run JS (rare, but cheap to catch).
  // Kept intentionally broad-but-safe: matches on well-known bot signatures,
  // not on anything a real browser's UA would contain.
  const BOT_UA_REGEX = new RegExp([
    'bot', 'crawl', 'spider', 'slurp', 'archiver',
    'headlesschrome', 'phantomjs', 'puppeteer', 'playwright', 'selenium',
    'python-requests', 'python-urllib', 'curl', 'wget', 'scrapy', 'axios',
    'go-http-client', 'java/', 'okhttp',
    'facebookexternalhit', 'whatsapp', 'telegrambot', 'discordbot',
    'linkedinbot', 'pinterest', 'skypeuripreview', 'slackbot',
    'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'petalbot', 'bytespider',
    'gptbot', 'claudebot', 'anthropic', 'ccbot', 'perplexitybot',
    'google-inspectiontool', 'adsbot-google', 'apis-google', 'feedfetcher',
    'uptimerobot', 'pingdom', 'statuscake', 'site24x7', 'newrelic', 'datadog',
    'bingpreview', 'yandexbot', 'baiduspider', 'duckduckbot'
  ].join('|'), 'i');

  function isBotUA(ua) {
    if (!ua) return false;
    return BOT_UA_REGEX.test(ua);
  }

  const userAgent = (navigator && navigator.userAgent) || '';
  const isBot = isBotUA(userAgent) || (navigator && navigator.webdriver === true);

  function getVisitorId() {
    let id = ls(LS.id);
    if (!id) {
      id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      ls(LS.id, id);
    }
    return id || 'unknown';
  }

  function post(table, row) {
    return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(function (err) { console.warn('[tracker] post failed:', err); });
  }

  // Great-circle distance in km.
  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ---- Traffic-source detection ----
  const SEARCH_DOMAINS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.', 'baidu.'];
  const SOCIAL_DOMAINS = [
    'facebook.com', 'fb.com', 'l.facebook.com', 'lm.facebook.com', 'm.facebook.com',
    'instagram.com', 'l.instagram.com',
    'tiktok.com', 'twitter.com', 'x.com', 't.co',
    'linkedin.com', 'lnkd.in',
    'pinterest.com', 'pinterest.ca',
    'reddit.com', 'out.reddit.com',
    'snapchat.com', 'youtube.com'
  ];

  function refDomain(ref) {
    if (!ref) return null;
    try { return new URL(ref).hostname.replace(/^www\./, '').toLowerCase(); }
    catch (e) { return null; }
  }

  // Which of OUR OWN pages the visitor was just on, when the referrer is our
  // own domain. Only meaningful for internal nav — external referrer paths
  // aren't stored (not useful here, and no reason to capture more than needed).
  function refPage(ref) {
    if (!ref) return null;
    try { return new URL(ref).pathname.replace(/^\//, '') || 'index.html'; }
    catch (e) { return null; }
  }

  function parseUTM() {
    const p = new URLSearchParams(location.search);
    return {
      utm_source: p.get('utm_source') || null,
      utm_medium: p.get('utm_medium') || null,
      utm_campaign: p.get('utm_campaign') || null
    };
  }

  function classifySource(domain, ownDomain, utm) {
    if (utm.utm_source) return 'Campaign';
    if (!domain) return 'Direct';
    if (domain === ownDomain) return 'Internal';
    if (SEARCH_DOMAINS.some(d => domain === d.replace(/\.$/, '') || domain.indexOf('.' + d) >= 0 || domain.indexOf(d) === 0)) return 'Search';
    if (SOCIAL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return 'Social';
    return 'Referral';
  }

  const visitorId = getVisitorId();
  const visitCount = (parseInt(ls(LS.visits) || '0', 10) || 0) + 1;
  ls(LS.visits, String(visitCount));

  // ---- 1. IP-level visit log (every page load) ----
  async function logVisit() {
    let geo = null;
    try {
      const res = await fetch('https://ipwho.is/');
      geo = await res.json();
      if (geo && geo.success === false) geo = null;
    } catch (e) { /* leave geo null */ }

    const referrer = document.referrer || null;
    const ownDomain = location.hostname.replace(/^www\./, '').toLowerCase();
    const domain = refDomain(referrer);
    const utm = parseUTM();
    const sourceType = classifySource(domain, ownDomain, utm);
    const referrerPage = (sourceType === 'Internal') ? refPage(referrer) : null;

    await post('site_visits', {
      entry_page: normalizePage(location.pathname),
      country: geo ? (geo.country || null) : null,
      region: geo ? (geo.region || null) : null,
      city: geo ? (geo.city || null) : null,
      visitor_id: visitorId,
      location_source: 'ip',
      in_town: null,
      distance_km: null,
      referrer: referrer,
      referrer_domain: domain,
      referrer_page: referrerPage,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      source_type: sourceType,
      user_agent: userAgent
    });
  }

  // ---- 2. Deferred precise location (2nd visit onward, asked once ever) ----
  function maybeAskLocation() {
    if (visitCount < 2) return;            // never prompt a first-time visitor
    if (ls(LS.geoAsked)) return;           // only ever ask once
    if (!navigator.geolocation) return;

    ls(LS.geoAsked, '1');

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const km = distanceKm(pos.coords.latitude, pos.coords.longitude, FMM_LAT, FMM_LNG);
        post('site_visits', {
          entry_page: normalizePage(location.pathname),
          visitor_id: visitorId,
          location_source: 'gps',
          in_town: km <= IN_TOWN_KM,
          distance_km: Math.round(km * 10) / 10,
          user_agent: userAgent
        });
      },
      function () { /* declined or unavailable — IP data is all we get */ },
      { timeout: 10000, maximumAge: 600000 }
    );
  }

  // ---- 3. Per-listing click tracking (called from places.html) ----
  window.BTHTrack = {
    click: function (place) {
      if (isBot) return; // never log bot "clicks"
      if (!place || !place.title) return;
      post('place_clicks', {
        place_title: place.title,
        category: place.category || null,
        tier: place.tier || 'Standard',
        click_type: place.type || 'card_open',
        visitor_id: visitorId,
        user_agent: userAgent
      });
    }
  };

  if (!isBot) {
    logVisit();
    // Give the page a moment to settle before any permission prompt appears.
    setTimeout(maybeAskLocation, 4000);
  }
})();
