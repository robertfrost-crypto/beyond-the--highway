// Beyond the Highway — push notification subscription
// Include this file on onnow.html and wherever the coupon banner lives, e.g.:
//   <script src="push-signup.js"></script>

(function () {
  var SUPABASE_URL = 'https://ceipylnjdidjqidamkpw.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaXB5bG5qZGlkanFpZGFta3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTQ1MjAsImV4cCI6MjA5ODg3MDUyMH0.TGZYRcjscN3ysRfTT5iHSl2pTOIhvMF6dCd-elm7L7g';
  var VAPID_PUBLIC_KEY = 'BMKTHkQA8ht5xMZ7f4Zwf8MKGjSqHMmAmhcQMkJruno581u44IAJ1plYV-RAK12SlHVsFdyBM6I1wlqEZY4QCV0';
  var ASKED_KEY = 'bth_push_asked'; // localStorage flag so we never ask twice
  var NUDGE_DISMISSED_KEY = 'bth_push_nudge_dismissed'; // sessionStorage — "not now" on the Home Screen nudge, just for this visit

  // Testing helper: visiting the page with ?resetpush anywhere in the URL
  // clears the "already asked" flag so the popup shows again.
  if (window.location.search.indexOf('resetpush') !== -1) {
    localStorage.removeItem(ASKED_KEY);
  }

  // On-screen debug box — only ever shown when something actually fails, so
  // a normal successful subscribe stays invisible. Visiting with ?pushdebug
  // in the URL forces it to show step-by-step even on success, for testing.
  var FORCE_DEBUG = window.location.search.indexOf('pushdebug') !== -1;

  function showDebug(msg) {
    var box = document.getElementById('bth-push-debug');
    if (!box) {
      box = document.createElement('div');
      box.id = 'bth-push-debug';
      box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;' +
        'background:#111;color:#0f0;font:11px monospace;padding:8px;max-height:40vh;' +
        'overflow:auto;white-space:pre-wrap;border-top:2px solid #0f0;';
      document.body.appendChild(box);
    }
    var line = document.createElement('div');
    line.textContent = '[BTH Push debug] ' + msg;
    box.appendChild(line);
  }

  // Step-by-step tracer — only writes to the on-screen box when FORCE_DEBUG
  // is on (?pushdebug in the URL); otherwise it's a no-op so a successful
  // subscribe produces no visible output at all.
  function trace(msg) {
    if (FORCE_DEBUG) showDebug(msg);
  }

  // iOS only allows a page to subscribe to push once it's been added to the
  // Home Screen — a regular Safari tab can't do it, full stop. Detect that
  // case up front so we can nudge toward installing instead of showing the
  // real opt-in popup (which would just fail silently there).
  function isIOS() {
    return /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac
  }
  function isStandalone() {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }
  function pushCanWorkHere() {
    if (isIOS()) return isStandalone();
    return true; // Android/desktop browsers generally support push from a regular tab
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function alreadyAsked() {
    return localStorage.getItem(ASKED_KEY) === '1';
  }

  function markAsked() {
    localStorage.setItem(ASKED_KEY, '1');
  }

  async function saveSubscription(subscription, topics) {
    var raw = subscription.toJSON();
    trace('POST upsert_push_subscription — endpoint: ' + raw.endpoint.slice(0, 60) + '...');
    var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/upsert_push_subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        p_endpoint: raw.endpoint,
        p_p256dh: raw.keys.p256dh,
        p_auth: raw.keys.auth,
        p_weekend_events: topics.weekend_events,
        p_coupon_offers: topics.coupon_offers
      })
    });
    var bodyText = res.ok ? '' : await res.text().catch(function () { return '(could not read response body)'; });
    trace('Supabase response: ' + res.status + (bodyText ? ' — ' + bodyText : ' OK'));
    return { ok: res.ok, status: res.status, body: bodyText };
  }

  function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error(message)); }, ms); })
    ]);
  }

  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported in this browser.');
    trace('Checking for existing SW registration...');
    var reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      trace('No SW registered yet — registering bth-sw.js...');
      reg = await navigator.serviceWorker.register('bth-sw.js');
    } else {
      trace('Found existing SW registration.');
    }
    trace('Waiting for SW to become ready...');
    return withTimeout(navigator.serviceWorker.ready, 8000, 'Service worker never became ready (timed out after 8s).');
  }

  async function subscribeToPush(topics) {
    if (!('PushManager' in window)) {
      throw new Error('Push not supported in this browser context (open BTH from the Home Screen icon, not a Safari tab).');
    }

    var registration = await ensureServiceWorker();
    trace('SW ready.');

    trace('Requesting notification permission...');
    var permission = await Notification.requestPermission();
    trace('Permission result: ' + permission);
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted (status: ' + permission + ').');
    }

    var existing = await registration.pushManager.getSubscription();
    trace(existing ? 'Reusing existing push subscription.' : 'No existing subscription — creating a new one...');
    var subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    trace('Push subscription obtained.');

    var saveOk = await saveSubscription(subscription, topics);
    if (!saveOk.ok) throw new Error('Saving to Supabase failed (' + saveOk.status + '): ' + saveOk.body);
    trace('Saved to Supabase successfully.');
    return true;
  }

  // Shown instead of the real popup when push can't work here yet (iOS,
  // not installed to the Home Screen). Deliberately does NOT call
  // markAsked() — dismissing this only skips it for the rest of this
  // browser session, so the real popup still offers once they've installed
  // it, on this visit or a later one.
  function showHomeScreenNudge() {
    if (sessionStorage.getItem(NUDGE_DISMISSED_KEY) === '1') return;

    var overlay = document.createElement('div');
    overlay.id = 'bth-push-popup';
    overlay.innerHTML =
      '<div class="bth-push-card">' +
        '<div class="bth-push-top">' +
          '<div class="bth-push-bell">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#e6b85c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
              '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
            '</svg>' +
          '</div>' +
          '<div class="bth-push-text">' +
            '<div class="bth-push-title">Stay Connected</div>' +
            '<div class="bth-push-sub">Look for the <strong>Share</strong> icon in your browser bar. Don&rsquo;t see it? Tap <strong>&bull;&bull;&bull;</strong> first. Then tap Share and scroll down to <strong>Add to Home Screen</strong>.</div>' +
          '</div>' +
        '</div>' +
        '<div class="bth-push-actions">' +
          '<button class="bth-push-btn bth-push-btn-secondary" id="bth-push-nudge-dismiss">Not now</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('bth-push-nudge-dismiss').addEventListener('click', function () {
      sessionStorage.setItem(NUDGE_DISMISSED_KEY, '1');
      overlay.remove();
    });
  }

  function showPopup() {
    if (alreadyAsked()) return;
    // Check this BEFORE touching window.Notification — on iOS in a plain
    // Safari tab (not installed), Notification may not even exist on
    // window, which would otherwise hit the next check first and mark this
    // permanently "asked" before the person ever had a real chance.
    if (!pushCanWorkHere()) { showHomeScreenNudge(); return; }
    if (!('Notification' in window) || Notification.permission === 'denied') { markAsked(); return; }

    var overlay = document.createElement('div');
    overlay.id = 'bth-push-popup';
    overlay.innerHTML =
      '<div class="bth-push-card">' +
        '<div class="bth-push-top">' +
          '<div class="bth-push-bell">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#e6b85c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
              '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
            '</svg>' +
          '</div>' +
          '<div class="bth-push-text">' +
            '<div class="bth-push-title">Stay in the loop</div>' +
            '<div class="bth-push-sub">Get notified about weekend events and new local deals.</div>' +
          '</div>' +
        '</div>' +
        '<div class="bth-push-topics">' +
          '<div class="bth-push-topic">' +
            '<div><div class="bth-push-tname">What’s on this weekend</div><span class="bth-push-tfreq">New lineup weekly</span></div>' +
            '<label class="bth-push-switch"><input type="checkbox" id="bth-topic-weekend" checked><span class="bth-push-track"><span class="bth-push-thumb"></span></span></label>' +
          '</div>' +
          '<div class="bth-push-topic">' +
            '<div><div class="bth-push-tname">New coupon offers</div></div>' +
            '<label class="bth-push-switch"><input type="checkbox" id="bth-topic-coupon" checked><span class="bth-push-track"><span class="bth-push-thumb"></span></span></label>' +
          '</div>' +
        '</div>' +
        '<div class="bth-push-actions">' +
          '<button class="bth-push-btn bth-push-btn-secondary" id="bth-push-dismiss">Not now</button>' +
          '<button class="bth-push-btn bth-push-btn-primary" id="bth-push-confirm">Turn on</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('bth-push-dismiss').addEventListener('click', function () {
      markAsked();
      overlay.remove();
    });

    document.getElementById('bth-push-confirm').addEventListener('click', async function () {
      var topics = {
        weekend_events: document.getElementById('bth-topic-weekend').checked,
        coupon_offers: document.getElementById('bth-topic-coupon').checked
      };
      markAsked();
      overlay.remove();
      try {
        await subscribeToPush(topics);
      } catch (err) {
        // Visitors never see the debug box. Failures go to the console, and
        // the on-screen box only appears with ?pushdebug in the URL (testing).
        var errMsg = 'ERROR: ' + (err && err.message ? err.message : String(err));
        console.warn('[BTH Push debug] ' + errMsg);
        if (FORCE_DEBUG) showDebug(errMsg);
      }
    });
  }

  // Call this from onnow.html and the coupon banner once the page has settled,
  // e.g. window.addEventListener('load', () => setTimeout(BTHPush.maybeShowPopup, 1500));
  window.BTHPush = { maybeShowPopup: showPopup };
})();
