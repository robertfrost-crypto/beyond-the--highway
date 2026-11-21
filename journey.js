/* Beyond the Highway — shared journey engine
   - Drops a slim road+bus strip into any #bth-journey element.
   - Records weighted, distinct engagements and fires 25/50/100% rewards.
   - Exposes window.BTH for pages to call: BTH.track('story', id), etc.
   - State is stored locally (per device), with an in-memory fallback. */
(function () {
  'use strict';

  // ---------- palette (kept literal so the strip works on any page) ----------
  var C = {
    ink:'#04100a', gold:'#e6b85c', g1:'#9be84a', g2:'#5bc94f', g3:'#cdfca0',
    paper:'#f5f1e7', moss:'#0f1f17', moss2:'#162a1d',
    line:'rgba(224,168,80,.22)', mist:'rgba(245,241,231,.74)'
  };
  var SANS = '"Avenir Next", system-ui, sans-serif';
  var SERIF = 'Palatino, Georgia, serif';

  var FINISH = 200;
  var BUS_IMG = 'data:image/webp;base64,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';
  var DEFAULT_TIP = 'The Snye is the best aurora-watching spot in town.';
  var WEIGHTS = { story:10, finish:5, place:5, trail:6, adventure:6, section:8, keepsake:15, event:5, return:10 };
  var BUCKET  = { story:'stories', place:'places', trail:'trails', adventure:'adventures',
                  section:'sections', keepsake:'keepsakes', event:'events' };
  var LABEL   = { stories:'stories', places:'places', trails:'trails', adventures:'adventures',
                  keepsakes:'keepsakes', events:'events' };

  // ---------- storage: localStorage primary, memory fallback ----------
  var LS = (function () {
    try { var k='__bth__'; window.localStorage.setItem(k,'1'); window.localStorage.removeItem(k); return window.localStorage; }
    catch (e) { return null; }
  })();
  var mem = {};
  function load(key, def) {
    try { if (LS) { var v = LS.getItem(key); return v ? JSON.parse(v) : def; } return (key in mem) ? mem[key] : def; }
    catch (e) { return def; }
  }
  function save(key, val) {
    try { if (LS) { LS.setItem(key, JSON.stringify(val)); } else { mem[key] = val; } }
    catch (e) { mem[key] = val; }
  }

  var J = load('bth.journey', { pts:0, disc:{}, seen:{}, fired:{}, selfie:null, lastReturn:null });
  var SET = load('bth.settings', { pin:'2005', tip25:DEFAULT_TIP });
  if (!J.disc) J.disc = {}; if (!J.seen) J.seen = {}; if (!J.fired) J.fired = {};

  function saveJourney() { save('bth.journey', J); }

  // ---------- helpers ----------
  function $(id){ return document.getElementById(id); }
  function pct(){ return Math.min(100, J.pts / FINISH * 100); }
  function today(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  function prettyDate(){
    var M=['January','February','March','April','May','June','July','August','September','October','November','December'];
    var d=new Date(); return M[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();
  }
  function discLine(){
    var p=[]; for (var k in J.disc){ if (J.disc[k]>0) p.push(J.disc[k]+' '+(LABEL[k]||k)); }
    return p.join('  \u00b7  ') || 'a whole lot';
  }

  // ---------- one-time style injection ----------
  function injectCSS(){
    if ($('bth-style')) return;
    var s=document.createElement('style'); s.id='bth-style';
    s.textContent =
    '.bthj-card{position:relative;border-radius:18px;padding:18px 18px 16px;cursor:pointer;'+
      'background:linear-gradient(160deg,'+C.moss+','+C.moss2+');'+
      'border:1px solid rgba(224,184,92,.28);box-shadow:0 10px 28px -14px rgba(0,0,0,.55)}'+
    '.bthj-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;'+
      'font-family:'+SANS+'}'+
    '.bthj-eyebrow{color:'+C.g1+';font-weight:800;font-size:12px;letter-spacing:.09em;text-transform:uppercase}'+
    '.bthj-stat{color:'+C.gold+';font-family:'+SERIF+';font-style:italic;font-size:15px}'+
    '.bthj{position:relative;height:56px;overflow:visible}'+
    '.bthj-glow{position:absolute;left:0;right:0;bottom:-6px;height:52px;opacity:.18;transition:opacity 1.1s ease;pointer-events:none;'+
      'background:radial-gradient(60% 120% at 30% 100%,rgba(155,232,74,.7),transparent 70%),radial-gradient(60% 120% at 72% 100%,rgba(45,212,191,.6),transparent 70%)}'+
    '.bthj.lit1 .bthj-glow{opacity:.36}.bthj.lit2 .bthj-glow{opacity:.6}.bthj.lit3 .bthj-glow{opacity:.92}'+
    '.bthj-road{position:absolute;left:0;right:0;bottom:15px;height:3px;border-radius:3px;'+
      'background:repeating-linear-gradient(90deg,rgba(230,184,92,.55) 0 14px,transparent 14px 26px)}'+
    '.bthj-start{position:absolute;bottom:11px;left:0;width:11px;height:11px;border-radius:50%;'+
      'background:'+C.g1+';box-shadow:0 0 9px rgba(155,232,74,.75)}'+
    '.bthj-dot{position:absolute;bottom:11px;width:11px;height:11px;border-radius:50%;transform:translateX(-50%);'+
      'background:#0f1f17;border:2px solid #3c5142;transition:.45s}'+
    '.bthj-dot.on{background:'+C.gold+';border-color:'+C.g3+';box-shadow:0 0 11px rgba(230,184,92,.85)}'+
    '.bthj-bus{position:absolute;bottom:8px;left:4%;width:104px;height:auto;transform:translateX(-50%);'+
      'transition:left .9s cubic-bezier(.34,1.1,.5,1);filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}'+
    '.bthj-bus.bump{animation:bthjbump .55s ease}'+
    '@keyframes bthjbump{0%,100%{transform:translateX(-50%) translateY(0)}28%{transform:translateX(-50%) translateY(-5px)}}'+
    '.bthj-caption{margin-top:14px;text-align:center;color:'+C.mist+';font-family:'+SERIF+';font-style:italic;font-size:14px}'+
    /* toast */
    '.bth-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%) translateY(20px);'+
      'max-width:520px;width:calc(100% - 28px);background:#fff;border:1px solid #111;'+
      'border-radius:16px;padding:14px 16px;box-shadow:0 14px 26px -8px rgba(16,26,58,.5);opacity:0;pointer-events:none;transition:.4s;z-index:60;'+
      'font-family:'+SANS+';color:#101a3a}'+
    '.bth-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}'+
    '.bth-toast b{color:#2a55e0;display:block;font-family:'+SERIF+';font-size:17px;margin-bottom:2px}'+
    '.bth-toast small{font-size:13px;color:#4d587a}'+
    /* modal */
    '.bth-modal{position:fixed;inset:0;z-index:70;background:rgba(16,26,58,.82);display:none;align-items:center;justify-content:center;'+
      'flex-direction:column;gap:16px;padding:calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 18px)}'+
    '.bth-modal.show{display:flex}'+
    '.bth-x{position:absolute;top:calc(env(safe-area-inset-top) + 12px);right:12px;width:44px;height:44px;border-radius:50%;border:1px solid #111;background:#fff;color:#101a3a;font-size:26px;line-height:1;cursor:pointer;box-shadow:0 8px 14px -6px rgba(0,0,0,.5)}'+
    '.bth-modal .bth-card{max-width:92vw;max-height:64vh;border-radius:14px;box-shadow:0 20px 50px -16px #000}'+
    '.bth-modal h3{margin:0;font-family:'+SERIF+';color:#fff;font-size:24px;text-align:center}'+
    '.bth-modal p{margin:0;color:#dbe6fb;text-align:center;font-size:15px;max-width:30ch;font-family:'+SANS+'}'+
    '.bth-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}'+
    '.bth-btn{padding:13px 20px;border-radius:12px;border:1px solid #111;cursor:pointer;font-family:'+SANS+';'+
      'font-weight:700;font-size:15px;background:#fff;color:#2a55e0}'+
    '.bth-btn.primary{background:linear-gradient(160deg,#2a55e0,#1c46b0);color:#fff}';
    document.head.appendChild(s);
  }

  // ---------- shared DOM (toast, modal, canvas, file input) ----------
  var toastEl, modalEl, bodyEl, canvas, ctx, fileInput, auroraBg, selfieImg = null;
  function ensureShared(){
    if (toastEl) return;
    toastEl = document.createElement('div'); toastEl.className='bth-toast'; toastEl.style.display='none';
    toastEl.innerHTML = '<b></b><small></small>'; document.body.appendChild(toastEl);

    modalEl = document.createElement('div'); modalEl.className='bth-modal';
    var xb=document.createElement('button'); xb.className='bth-x'; xb.setAttribute('aria-label','Close'); xb.innerHTML='&times;';
    xb.addEventListener('click', function(){ closeModal(); }); modalEl.appendChild(xb);
    modalEl.addEventListener('click', function(e){ if (e.target===modalEl) closeModal(); });
    document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeModal(); });
    bodyEl = document.createElement('div'); modalEl.appendChild(bodyEl); document.body.appendChild(modalEl);

    canvas = document.createElement('canvas'); canvas.width=1080; canvas.height=1350; canvas.style.display='none';
    document.body.appendChild(canvas); ctx = canvas.getContext('2d');

    fileInput = document.createElement('input'); fileInput.type='file';
    fileInput.accept='image/*'; fileInput.setAttribute('capture','user'); fileInput.style.display='none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', onSelfie);

    auroraBg = new Image(); auroraBg.src='assets/aurora.webp';
    if (J.selfie){ selfieImg = new Image(); selfieImg.src = J.selfie; }
  }
  function toast(t,m){
    ensureShared();
    toastEl.querySelector('b').textContent=t; toastEl.querySelector('small').textContent=m;
    clearTimeout(toastEl._t); clearTimeout(toastEl._tHide);
    // Bring it back into layout (in case a prior toast already fully hid it),
    // then let the CSS transition fade it in on the next frame.
    toastEl.style.display = 'block';
    // Fixed-position elements sometimes keep intercepting taps on iOS Safari
    // for a few seconds after their opacity/pointer-events transition ends
    // (a known WebKit quirk) — so once faded out, pull it out of the layout
    // and hit-testing entirely with display:none, rather than trusting
    // opacity + pointer-events alone to release the touch area.
    requestAnimationFrame(function(){ toastEl.classList.add('show'); });
    toastEl._t=setTimeout(function(){
      toastEl.classList.remove('show');
      toastEl._tHide = setTimeout(function(){ toastEl.style.display = 'none'; }, 450);
    }, 4400);
  }
  function closeModal(){ if (modalEl){ modalEl.classList.remove('show'); modalEl.style.display=''; } }

  // ---------- strip ----------
  var stripEl, busEl, statEl, capEl;
  var STAGE = [ [0,'Just Passing Through'], [25,'Day Tripper'], [50,'Fort Mac Explorer'], [100,'Extreme Adventurer'] ];
  function stageName(p){
    var name = STAGE[0][1];
    for (var i=0;i<STAGE.length;i++){ if (p>=STAGE[i][0]) name = STAGE[i][1]; }
    return name;
  }
  function captionFor(p){
    if (p>=100) return 'You\u2019ve gone Beyond the Highway \u2014 nice work!';
    var toNext = (p<25) ? (25-p) : (p<50) ? (50-p) : (100-p);
    return Math.ceil(toNext) + '% more to your next stamp!';
  }
  function buildStrip(host){
    host.innerHTML =
      '<div class="bthj-card">'+
        '<div class="bthj-head">'+
          '<span class="bthj-eyebrow">Your Journey</span>'+
          '<span class="bthj-stat" id="bthjStat"></span>'+
        '</div>'+
        '<div class="bthj">'+
          '<div class="bthj-glow"></div>'+
          '<div class="bthj-road"></div>'+
          '<span class="bthj-start"></span>'+
          '<span class="bthj-dot" data-m="25" style="left:26.5%"></span>'+
          '<span class="bthj-dot" data-m="50" style="left:49%"></span>'+
          '<span class="bthj-dot" data-m="100" style="left:94%"></span>'+
          '<img class="bthj-bus" alt="" src="' + BUS_IMG + '">'+
        '</div>'+
        '<div class="bthj-caption" id="bthjCap"></div>'+
      '</div>';
    stripEl = host.querySelector('.bthj');
    busEl = host.querySelector('.bthj-bus');
    statEl = host.querySelector('#bthjStat');
    capEl = host.querySelector('#bthjCap');
    host.querySelector('.bthj-card').addEventListener('click', openPassport);
    render();
  }
  function render(){
    if (!stripEl) return;
    var p = pct();
    busEl.style.left = (4 + p * 0.9) + '%';
    stripEl.classList.toggle('lit1', p>=25);
    stripEl.classList.toggle('lit2', p>=50);
    stripEl.classList.toggle('lit3', p>=100);
    var dots = stripEl.querySelectorAll('.bthj-dot');
    for (var i=0;i<dots.length;i++){
      var m = +dots[i].getAttribute('data-m');
      dots[i].classList.toggle('on', p>=m);
    }
    if (statEl) statEl.textContent = stageName(p);
    if (capEl) capEl.textContent = captionFor(p);
  }
  function bump(){ if (!busEl) return; busEl.classList.remove('bump'); void busEl.offsetWidth; busEl.classList.add('bump'); }

  // ---------- milestones ----------
  var rewardFired = false;
  function checkMilestones(){
    rewardFired = false;
    var p = pct();
    if (p>=25 && !J.fired[25]){ J.fired[25]=true; saveJourney(); rewardFired=true;
      setTimeout(function(){ toast('Day Tripper!', 'Your first stamp is in the passport. Tip: ' + (SET.tip25||DEFAULT_TIP)); }, 650); }
    if (p>=50 && !J.fired[50]){ J.fired[50]=true; saveJourney(); rewardFired=true;
      setTimeout(function(){ certificateFlow(false); }, 850); }
    if (p>=100 && !J.fired[100]){ J.fired[100]=true; saveJourney(); rewardFired=true;
      setTimeout(function(){ certificateFlow(true); }, 850); }
  }

  // ---------- certificate ----------
  var certGold = false;
  function certificateFlow(gold){
    ensureShared(); certGold = gold;
    if (selfieImg && selfieImg.complete && selfieImg.naturalWidth){ showCertificate(); return; }
    var title = gold ? 'You made it \u2014 Extreme Adventurer!' : 'You\u2019re halfway there!';
    var sub = gold ? 'Add a selfie for your gold certificate.' : 'Claim your Explorer Certificate \u2014 strike a pose.';
    bodyEl.innerHTML = '<h3>'+title+'</h3><p>'+sub+'</p>'+
      '<div class="bth-btns"><button class="bth-btn primary" id="bthTake">Take a selfie</button>'+
      '<button class="bth-btn" id="bthLater">Later</button></div>';
    modalEl.classList.add('show');
    $('bthTake').onclick=function(){ fileInput.click(); };
    $('bthLater').onclick=closeModal;
  }
  function onSelfie(e){
    var f=e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      J.selfie=r.result; saveJourney();
      selfieImg=new Image(); selfieImg.onload=showCertificate; selfieImg.src=r.result;
    };
    r.readAsDataURL(f);
  }
  function showCertificate(){
    ensureShared(); drawCertificate(certGold);
    var url=canvas.toDataURL('image/png');
    bodyEl.innerHTML='<img class="bth-card" src="'+url+'" alt="Your certificate">'+
      '<div class="bth-btns"><button class="bth-btn primary" id="bthSend">Send to a friend</button>'+
      '<button class="bth-btn" id="bthRetake">Retake</button>'+
      '<button class="bth-btn" id="bthDone">Done</button></div>';
    modalEl.classList.add('show');
    $('bthSend').onclick=sendCert; $('bthRetake').onclick=function(){ fileInput.click(); }; $('bthDone').onclick=closeModal;
  }
  function sendCert(){
    canvas.toBlob(function(blob){
      try {
        var file=new File([blob],'beyond-the-highway-certificate.png',{type:'image/png'});
        if (navigator.canShare && navigator.canShare({files:[file]})){
          navigator.share({files:[file], title:'Beyond the Highway', text:'I went Beyond the Highway in Fort McMurray!'});
          return;
        }
      } catch (e) {}
      var u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download='certificate.png';
      document.body.appendChild(a); a.click(); a.remove();
    }, 'image/png');
  }

  function rgba(hex,a){ var n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function cover(img,x,y,w,h){ var ir=img.width/img.height, br=w/h, sw,sh,sx,sy;
    if (ir>br){ sh=img.height; sw=sh*br; sx=(img.width-sw)/2; sy=0; } else { sw=img.width; sh=sw/br; sx=0; sy=(img.height-sh)/2; }
    ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h); }

  function drawCertificate(gold){
    var W=1080,H=1350,cx=W/2;
    if (auroraBg && auroraBg.complete && auroraBg.naturalWidth){ cover(auroraBg,0,0,W,H); }
    else { ctx.fillStyle='#05160e'; ctx.fillRect(0,0,W,H); }
    var sc=ctx.createLinearGradient(0,0,0,H);
    sc.addColorStop(0,'rgba(3,14,9,.80)'); sc.addColorStop(.14,'rgba(3,14,9,.28)');
    sc.addColorStop(.44,'rgba(3,14,9,.14)'); sc.addColorStop(.60,'rgba(3,14,9,.74)');
    sc.addColorStop(1,'rgba(3,14,9,.97)');
    ctx.fillStyle=sc; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=rgba(C.gold,.92); ctx.lineWidth=5; rr(26,26,W-52,H-52,22); ctx.stroke();
    ctx.strokeStyle=rgba(C.g3,.32); ctx.lineWidth=2; rr(40,40,W-80,H-80,16); ctx.stroke();
    var S=648, sx=(W-S)/2, sy=150, r=34;
    ctx.save(); rr(sx,sy,S,S,r); ctx.clip();
    if (selfieImg && selfieImg.complete && selfieImg.naturalWidth){ cover(selfieImg,sx,sy,S,S); }
    else { ctx.fillStyle='#13291d'; ctx.fillRect(sx,sy,S,S); }
    ctx.restore();
    ctx.strokeStyle=C.gold; ctx.lineWidth=9; rr(sx,sy,S,S,r); ctx.stroke();
    ctx.strokeStyle=rgba(C.g3,.45); ctx.lineWidth=2; rr(sx-9,sy-9,S+18,S+18,r+6); ctx.stroke();
    ctx.textAlign='center'; ctx.font='800 74px '+SANS;
    var hg=ctx.createLinearGradient(W*0.2,860,W*0.8,990);
    if (gold){ hg.addColorStop(0,'#f6dd95'); hg.addColorStop(1,'#d79a3a'); }
    else { hg.addColorStop(0,C.g3); hg.addColorStop(.5,C.g1); hg.addColorStop(1,C.g2); }
    ctx.fillStyle=hg; ctx.shadowColor='rgba(0,0,0,.65)'; ctx.shadowBlur=16; ctx.shadowOffsetY=3;
    ctx.fillText('I went',cx,902); ctx.fillText('Beyond the Highway',cx,980); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    ctx.fillStyle=C.gold; ctx.font='700 34px '+SERIF;
    ctx.fillText(gold?'EXTREME ADVENTURER':'CERTIFIED FORT McMURRAY EXPLORER',cx,1052);
    ctx.fillStyle=rgba(C.g3,.88); ctx.font='600 24px '+SANS; ctx.fillText('WOOD BUFFALO \u00b7 ALBERTA',cx,1092);
    ctx.fillStyle=rgba(C.paper,.94); ctx.font='italic 400 30px '+SERIF; ctx.fillText('Explored '+discLine(),cx,1168);
    ctx.fillStyle=rgba(C.paper,.74); ctx.font='400 26px '+SERIF; ctx.fillText(prettyDate(),cx,1216);
    ctx.fillStyle=rgba(C.gold,.92); ctx.font='700 24px '+SANS; ctx.fillText('beyondthehighway.ca',cx,1296);
  }

  // ---------- passport ----------
  function openPassport(){
    ensureShared();
    var s=[]; if (pct()>=25) s.push('Day Tripper'); if (pct()>=50) s.push('Fort Mac Explorer'); if (pct()>=100) s.push('Extreme Adventurer');
    bodyEl.innerHTML='<h3>Your passport</h3>'+
      '<p>'+(s.length ? ('Stamps earned: '+s.join(', ')) : 'No stamps yet \u2014 start exploring to earn your first.')+'</p>'+
      '<p style="color:'+C.paper+'">Discovered '+discLine()+'</p>'+
      '<div class="bth-btns"><button class="bth-btn" id="bthClose">Close</button></div>';
    modalEl.classList.add('show'); $('bthClose').onclick=closeModal;
  }

  // ---------- daily return fuel ----------
  function dailyReturn(){
    var t=today();
    if (J.lastReturn==null){ J.lastReturn=t; saveJourney(); return; }
    if (J.lastReturn!==t){ J.lastReturn=t; J.pts+=WEIGHTS['return']; saveJourney(); render(); checkMilestones(); }
  }

  // ---------- public API ----------
  window.BTH = {
    DEFAULT_TIP: DEFAULT_TIP,
    track: function (cat, id) {
      if (!(cat in WEIGHTS)) return;
      var key = cat + ':' + (id == null ? cat : id);
      if (J.seen[key]) return;
      J.seen[key] = 1;
      J.pts += WEIGHTS[cat];
      var b = BUCKET[cat]; if (b) { J.disc[b] = (J.disc[b] || 0) + 1; }
      saveJourney(); render(); bump(); checkMilestones();
    },
    rewardJustFired: function () { return rewardFired; },
    openPassport: openPassport,
    reset: function () {
      J = { pts:0, disc:{}, seen:{}, fired:{}, selfie:null, lastReturn:today() };
      selfieImg = null; saveJourney(); render();
    },
    getSettings: function () { return { pin: SET.pin, tip25: SET.tip25 }; },
    saveSettings: function (obj) {
      if (obj && typeof obj.tip25 === 'string') SET.tip25 = obj.tip25;
      if (obj && typeof obj.pin === 'string' && obj.pin) SET.pin = obj.pin;
      save('bth.settings', SET);
    },
    checkPin: function (pin) { return String(pin) === String(SET.pin); },
    adminUnlock: function () { save('bth.adminUnlocked', Date.now()); },
    isAdminUnlocked: function () { var t = +load('bth.adminUnlocked', 0); return !!(t && (Date.now() - t) < 1800000); },
    adminLock: function () { save('bth.adminUnlocked', 0); }
  };

  // ---------- init ----------
  function init(){
    injectCSS(); ensureShared();
    var host = $('bth-journey');
    if (host) { buildStrip(host); }
    dailyReturn();
    // surface any reward already crossed on a previous page-load
    checkMilestones();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
