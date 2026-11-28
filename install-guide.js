// Beyond the Highway: "Save to Home Screen" helper for iPhone and iPad.
//
// iOS has no one-tap install prompt (that only exists on Android), so this
// shows a small banner and a short step-by-step card that matches the browser
// the person is actually using. Chrome keeps the Share icon at the TOP in the
// address bar, Safari keeps it at the BOTTOM, which is what trips people up.
//
// Include on any page with:  <script src="install-guide.js" defer></script>
//
// Behaviour:
//   - Only runs on iOS / iPadOS, and never once the app is already installed.
//   - Waits for the 2nd visit (and a few seconds) so it never greets a brand new visitor.
//   - "Not now" hides it for 14 days. Finishing the guide hides it for 30 days.
//   - Testing: add ?installguide to the URL to force it, ?resetinstall to clear the flags.
(function () {
  'use strict';

  var K_UNTIL = 'bth_install_hide_until';
  var K_VISITS = 'bth_install_visits';
  var K_SESSION = 'bth_install_counted';
  var DAY = 24 * 60 * 60 * 1000;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var qs = window.location.search;
  if (qs.indexOf('resetinstall') !== -1) { del(K_UNTIL); del(K_VISITS); }
  var forced = qs.indexOf('installguide') !== -1;

  var ua = navigator.userAgent || '';
  var isIOS = /iP(hone|od|ad)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as a Mac
  if (!isIOS) return;

  var standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (standalone) return; // already installed, nothing to do

  // Which browser are we in? Each one puts the Share button somewhere different.
  var inApp = /FBAN|FBAV|Instagram|Snapchat|MicroMessenger|Line\/|GSA\//.test(ua);
  var browser = 'safari';
  if (/CriOS/.test(ua)) browser = 'chrome';
  else if (/FxiOS/.test(ua)) browser = 'firefox';
  else if (/EdgiOS/.test(ua)) browser = 'edge';

  // Count one visit per browser session.
  var visits = parseInt(get(K_VISITS) || '0', 10) || 0;
  try {
    if (!sessionStorage.getItem(K_SESSION)) {
      sessionStorage.setItem(K_SESSION, '1');
      visits += 1;
      set(K_VISITS, String(visits));
    }
  } catch (e) {}

  if (!forced) {
    var until = parseInt(get(K_UNTIL) || '0', 10) || 0;
    if (Date.now() < until) return;
    if (visits < 2) return;
  }

  var SHARE_ICON =
    '<svg class="bthig-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var ADD_ICON =
    '<svg class="bthig-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>';
  var PIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

  function injectStyles() {
    if (document.getElementById('bthig-style')) return;
    var css =
      '#bthig-banner,#bthig-overlay{font-family:var(--sans,"Avenir Next",Avenir,"Segoe UI",system-ui,-apple-system,sans-serif);color:#101a3a}' +
      '#bthig-banner{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));max-width:440px;margin:0 auto;z-index:9998;' +
        'display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #d9e1f4;border-radius:18px;padding:12px 12px 12px 14px;' +
        'box-shadow:0 16px 40px -14px rgba(16,26,58,.5);animation:bthig-rise .4s cubic-bezier(.2,.8,.2,1)}' +
      '@keyframes bthig-rise{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}' +
      '#bthig-banner .bthig-pin{flex:0 0 auto;width:38px;height:38px;border-radius:50%;background:#2a55e0;color:#fff;display:flex;align-items:center;justify-content:center}' +
      '#bthig-banner .bthig-pin svg{width:20px;height:20px}' +
      '#bthig-banner .bthig-txt{flex:1 1 auto;min-width:0}' +
      '#bthig-banner .bthig-t{font:700 15px/1.25 var(--serif,Georgia,serif)}' +
      '#bthig-banner .bthig-s{font-size:13px;line-height:1.35;color:#4d587a;margin-top:2px}' +
      '#bthig-banner .bthig-go{flex:0 0 auto;border:0;background:#2a55e0;color:#fff;font-family:inherit;font-weight:700;font-size:14px;line-height:1;padding:11px 14px;border-radius:12px;cursor:pointer}' +
      '#bthig-banner .bthig-x{flex:0 0 auto;border:0;background:transparent;color:#4d587a;font-size:22px;line-height:1;padding:4px 6px;cursor:pointer}' +
      '#bthig-overlay{position:fixed;inset:0;z-index:9999;background:rgba(16,26,58,.55);display:flex;align-items:flex-end;justify-content:center;animation:bthig-fade .25s ease}' +
      '@keyframes bthig-fade{from{opacity:0}to{opacity:1}}' +
      '#bthig-overlay .bthig-card{position:relative;width:100%;max-width:440px;margin:0 12px calc(14px + env(safe-area-inset-bottom,0px));background:#fff;border-radius:22px;padding:22px 18px 18px;' +
        'box-shadow:0 20px 50px -14px rgba(0,0,0,.55);animation:bthig-rise .35s cubic-bezier(.2,.8,.2,1);max-height:88vh;overflow:auto}' +
      '#bthig-overlay h2{margin:0 0 4px;font:700 20px/1.2 var(--serif,Georgia,serif)}' +
      '#bthig-overlay .bthig-lead{margin:0 0 14px;font-size:14px;line-height:1.4;color:#4d587a}' +
      '#bthig-overlay ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}' +
      '#bthig-overlay li{display:flex;gap:12px;align-items:flex-start;background:#f1f5fe;border:1px solid #d9e1f4;border-radius:14px;padding:12px}' +
      '#bthig-overlay .bthig-n{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#2a55e0;color:#fff;font-family:inherit;font-weight:700;font-size:14px;line-height:26px;text-align:center}' +
      '#bthig-overlay .bthig-step{font-size:15px;line-height:1.4}' +
      '#bthig-overlay .bthig-step strong{font-weight:700}' +
      '#bthig-overlay .bthig-ico{display:inline-block;width:22px;height:22px;vertical-align:-6px;margin:0 2px;color:#2a55e0}' +
      '#bthig-overlay .bthig-opt{display:block;margin-top:8px;padding:8px 10px;background:#fff;border:1px solid #d9e1f4;border-radius:10px;font-size:14px}' +
      '#bthig-overlay .bthig-hint{margin:12px 2px 0;font-size:13px;line-height:1.4;color:#4d587a}' +
      '#bthig-overlay .bthig-done{display:block;width:100%;margin-top:14px;border:0;background:#2a55e0;color:#fff;font-family:inherit;font-weight:700;font-size:16px;line-height:1;padding:15px;border-radius:14px;cursor:pointer}' +
      '#bthig-overlay .bthig-arrow{position:fixed;left:0;right:0;text-align:center;pointer-events:none;color:#fff;font:700 14px/1.3 var(--sans,system-ui,sans-serif);text-shadow:0 1px 6px rgba(0,0,0,.6)}' +
      '#bthig-overlay .bthig-arrow.top{top:calc(10px + env(safe-area-inset-top,0px))}' +
      '#bthig-overlay .bthig-arrow.bottom{bottom:calc(8px + env(safe-area-inset-bottom,0px))}' +
      '#bthig-overlay .bthig-arrow span{display:block;font-size:26px;line-height:1;animation:bthig-bob 1.1s ease-in-out infinite}' +
      '@keyframes bthig-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
      '#bthig-overlay .bthig-arrow.bottom span{animation-name:bthig-bob-down}' +
      '@keyframes bthig-bob-down{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}' +
      '@media (prefers-reduced-motion:reduce){#bthig-overlay .bthig-arrow span,#bthig-banner,#bthig-overlay,#bthig-overlay .bthig-card{animation:none}}';
    var st = document.createElement('style');
    st.id = 'bthig-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function hideFor(days) { set(K_UNTIL, String(Date.now() + days * DAY)); }

  function stepsFor() {
    if (inApp) {
      return {
        lead: 'This in-app browser cannot save apps. Open the page in Safari first.',
        arrow: '',
        steps: [
          'Tap the <strong>&bull;&bull;&bull;</strong> or <strong>Share</strong> button in this app.',
          'Choose <strong>Open in Safari</strong>.',
          'Then follow the Safari steps: Share, then <strong>Add to Home Screen</strong>.'
        ],
        hint: ''
      };
    }
    var shareStep, arrow = '', hint = '';
    if (browser === 'chrome') {
      shareStep = 'Tap the Share icon ' + SHARE_ICON + ' at the <strong>top</strong>, in the address bar next to the web address.';
      arrow = 'top';
      hint = 'Do not see it? Tap the <strong>&bull;&bull;&bull;</strong> at the top right and look for <strong>Share</strong>.';
    } else if (browser === 'firefox' || browser === 'edge') {
      shareStep = 'Tap the Share icon ' + SHARE_ICON + ' in the address bar, or open the <strong>&bull;&bull;&bull;</strong> menu and tap <strong>Share</strong>.';
      hint = 'Safari is the most reliable browser for saving apps on iPhone.';
    } else {
      shareStep = 'Tap the <strong>&equiv;</strong> (three lines) or the <strong>&bull;&bull;&bull;</strong> (three dots) in the bottom bar, then tap <strong>Share</strong> ' + SHARE_ICON + '. Already see the Share icon? Just tap it.';
      arrow = 'bottom';
      hint = '';
    }
    return {
      lead: 'It takes a few taps, then it opens like a regular app, full screen, with its own icon.',
      arrow: arrow,
      steps: [
        shareStep,
        'Scroll down the list and tap <strong>Add to Home Screen</strong> ' + ADD_ICON + '. Do not see it? Tap <strong>View More</strong> first.',
        'Leave <strong>Open as Web App</strong> turned on, then tap <strong>Add</strong>.'
      ],
      hint: hint
    };
  }

  function openGuide() {
    if (document.getElementById('bthig-overlay')) return;
    var s = stepsFor();
    var o = document.createElement('div');
    o.id = 'bthig-overlay';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', 'Save Beyond the Highway to your Home Screen');

    var lis = '';
    for (var i = 0; i < s.steps.length; i++) {
      lis += '<li><span class="bthig-n">' + (i + 1) + '</span><div class="bthig-step">' + s.steps[i] + '</div></li>';
    }
    var arrow = '';
    if (s.arrow === 'top') arrow = '<div class="bthig-arrow top"><span>&#9650;</span>Share icon is up here</div>';
    if (s.arrow === 'bottom') arrow = '<div class="bthig-arrow bottom">Look down here<span>&#9660;</span></div>';

    o.innerHTML = arrow +
      '<div class="bthig-card">' +
        '<h2>Save to your Home Screen</h2>' +
        '<p class="bthig-lead">' + s.lead + '</p>' +
        '<ol>' + lis + '</ol>' +
        (s.hint ? '<p class="bthig-hint">' + s.hint + '</p>' : '') +
        '<button class="bthig-done" type="button">Got it</button>' +
      '</div>';
    document.body.appendChild(o);

    function close() {
      hideFor(30);
      document.removeEventListener('keydown', onKey);
      o.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    o.querySelector('.bthig-done').addEventListener('click', close);
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
  }

  function showBanner() {
    if (document.getElementById('bthig-banner')) return;
    injectStyles();
    var b = document.createElement('div');
    b.id = 'bthig-banner';
    b.innerHTML =
      '<div class="bthig-pin">' + PIN_ICON + '</div>' +
      '<div class="bthig-txt"><div class="bthig-t">Save this app to your Home Screen</div>' +
      '<div class="bthig-s">Quicker to open, works like a real app.</div></div>' +
      '<button class="bthig-go" type="button">Show me how</button>' +
      '<button class="bthig-x" type="button" aria-label="Not now">&times;</button>';
    document.body.appendChild(b);
    b.querySelector('.bthig-go').addEventListener('click', function () {
      b.remove();
      openGuide();
    });
    b.querySelector('.bthig-x').addEventListener('click', function () {
      hideFor(14);
      b.remove();
    });
  }

  function start() {
    // Pages with the push signup script already show their own Home Screen nudge
    // at the bottom of the screen, so skip ours there to avoid two cards stacking.
    if (!forced && document.querySelector('script[src*="push-signup"]')) return;
    setTimeout(showBanner, forced ? 300 : 3500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
