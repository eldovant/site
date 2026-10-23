/* ==========================================================================
   ELDOVANT — trailer player
   The still stays on screen while YouTube loads (invisible iframe on top of it);
   only when the player reports that it is really playing does the still dissolve
   into the video. No black or white frame is ever shown.
     ELDPlayer.play(box, { id, title, poster, position })
   No storage; only youtube-nocookie.com, loaded on click.
   ========================================================================== */
(function (w) {
  'use strict';
  var d = w.document, root = d.documentElement;
  var RM = root.classList.contains('rm') || (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var HOST = 'https://www.youtube-nocookie.com';

  var css = '' +
    '.eldp{position:relative;overflow:hidden;isolation:isolate}' +
    '.eldp>img.eldp-still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;transition:opacity 1.3s cubic-bezier(.4,0,.2,1),filter 1.3s cubic-bezier(.4,0,.2,1),transform 1.6s cubic-bezier(.4,0,.2,1)}' +
    '.eldp>iframe.eldp-frame{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:1;opacity:0;background:transparent!important;transition:opacity 1.3s cubic-bezier(.4,0,.2,1) .15s}' +
    '.eldp.is-on>iframe.eldp-frame{opacity:1}' +
    '.eldp.is-loading>img.eldp-still{filter:brightness(.82) saturate(.92);transform:scale(1.015);transition:filter 1.4s ease,transform 6s ease}' +
    '.eldp.is-on>img.eldp-still{opacity:0;filter:blur(10px) brightness(.7);transform:scale(1.04)}' +
    '.eldp-veil{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;transition:opacity 1s ease;background:radial-gradient(70% 55% at 50% 50%,rgba(0,0,0,.0),rgba(0,0,0,.38))}' +
    '.eldp.is-loading .eldp-veil{opacity:1}' +
    '.eldp-veil::after{content:"";position:absolute;left:12%;right:12%;top:50%;height:1px;background:linear-gradient(90deg,transparent,rgba(241,212,143,.85),transparent);box-shadow:0 0 14px 1px rgba(255,214,140,.45);transform:scaleX(.2);opacity:.0;animation:eldp-line 2.4s cubic-bezier(.5,0,.2,1) infinite}' +
    '@keyframes eldp-line{0%{transform:scaleX(.15);opacity:0}45%{opacity:.9}100%{transform:scaleX(1);opacity:0}}' +
    '.eldp.is-on .eldp-veil{opacity:0}' +
    'html.rm .eldp *,html.rm .eldp{animation:none!important}' +
    '@media (prefers-reduced-motion:reduce){.eldp-veil::after{animation:none}.eldp>img.eldp-still{transition:opacity .3s}.eldp.is-on>img.eldp-still{filter:none;transform:none}.eldp>iframe.eldp-frame{transition:opacity .3s}}';
  var styled = false;
  function addCss() { if (styled) return; styled = true; var s = d.createElement('style'); s.textContent = css; d.head.appendChild(s); }

  function play(box, o) {
    if (!box || !o || !/^[\w-]{6,20}$/.test(o.id || '')) return false;
    addCss();
    box.classList.remove('unlit'); box.removeAttribute('aria-hidden');
    box.classList.add('eldp', 'is-loading');
    var still = box.querySelector('img');
    if (!still && o.poster) {
      still = d.createElement('img'); still.src = o.poster; still.alt = ''; still.decoding = 'async';
      if (o.position) still.style.objectPosition = o.position;
      box.insertBefore(still, box.firstChild);
    }
    if (still) still.classList.add('eldp-still');
    var veil = d.createElement('span'); veil.className = 'eldp-veil'; veil.setAttribute('aria-hidden', 'true');
    var f = d.createElement('iframe');
    f.className = 'eldp-frame';
    var q = 'autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1';
    if (/^https?:$/.test(w.location.protocol)) q += '&origin=' + encodeURIComponent(w.location.origin);
    f.src = HOST + '/embed/' + o.id + '?' + q;
    f.title = o.title || 'Video';
    f.referrerPolicy = 'strict-origin-when-cross-origin';   // YouTube embeds need the site as referrer (otherwise player error 153)
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    box.append(f, veil);

    var done = false, timer = null, tick = null, soon = null;
    function reveal() {
      if (done || !f.isConnected) return; done = true;
      w.removeEventListener('message', onMsg); clearTimeout(timer); clearTimeout(soon); clearInterval(tick);
      setTimeout(function () { box.classList.remove('is-loading'); box.classList.add('is-on'); }, RM ? 0 : 180);
    }
    function onMsg(e) {
      if (!f.isConnected) { w.removeEventListener('message', onMsg); clearTimeout(timer); return; }
      if (e.source !== f.contentWindow || String(e.origin).indexOf('youtube') < 0) return;
      var m = e.data; if (typeof m === 'string') { try { m = JSON.parse(m); } catch (x) { return; } }
      if (!m) return;
      if (m.event === 'onStateChange' && m.info === 1) reveal();
      else if (m.event === 'infoDelivery' && m.info && m.info.playerState === 1) reveal();
    }
    w.addEventListener('message', onMsg);
    function listen() { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST); } catch (x) { /* ignore */ } }
    f.addEventListener('load', function () {
      // ask for state updates, and keep asking until the player answers: it may not be ready at the first message
      listen(); var n = 0; tick = setInterval(function () { if (done || ++n > 12) { clearInterval(tick); return; } listen(); }, 400);
      // short films and announcements are only seconds long: if the player has not confirmed "playing" a moment after loading, show it anyway (it already plays, with its own controls)
      soon = setTimeout(reveal, RM ? 600 : 2200);
    });
    // never leave the still waiting for ever (blocked, slow network): show the player so it can be used
    timer = setTimeout(reveal, 6000);
    return true;
  }

  /* ---------- format detection + overlay ----------
     ELDPlayer.open({ id, title, ratio, urls, poster, image, position, opener })
     - vertical (YouTube Short, 9:16): the overlay is a tall frame sized to the screen height, no side bars
     - horizontal (standard video, 16:9): the classic wide frame sized to the screen width
     The format is recognised before anything opens, in this order:
       1. an explicit ratio  ('9:16', '16:9', '1080x1920' …)
       2. a YouTube Shorts link to the same video (youtube.com/shorts/ID) among the given urls
       3. otherwise horizontal.
     ELDPlayer.fromProduction(p, { base, opener }) builds these options from a production entry of eldovant-data.js
     (trailer.ratio, trailer.url, announcement.urls). */
  function fmt(o) {
    var m = /^\s*(\d+(?:\.\d+)?)\s*[:\/x×]\s*(\d+(?:\.\d+)?)\s*$/i.exec(String(o.ratio || ''));
    if (m) return +m[2] > +m[1] ? 'vertical' : 'horizontal';
    var urls = o.urls || [], re = new RegExp('(?:youtube\\.com|youtu\\.be)/shorts/' + o.id + '(?![\\w-])', 'i');
    for (var i = 0; i < urls.length; i++) if (re.test(String(urls[i] || ''))) return 'vertical';
    return 'horizontal';
  }
  function safe(u) { u = String(u || '').trim(); return u && !/^\s*(javascript|vbscript|data):/i.test(u) ? u : ''; }
  var modalStyled = false;
  function addModalCss() {
    if (modalStyled) return; modalStyled = true;
    var s = d.createElement('style');
    s.textContent = '' +
      'dialog.eldp-modal{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;background:transparent;color:#ece5d3;overflow:hidden}' +
      'dialog.eldp-modal[open]{display:grid;place-items:center}' +
      'dialog.eldp-modal::backdrop{background:rgba(3,2,2,.9);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
      '.eldp-modal .eldp-stage{position:relative;background:#000;box-shadow:0 30px 90px rgba(0,0,0,.6);outline:1px solid rgba(241,212,143,.22)}' +
      '.eldp-modal.is-horizontal .eldp-stage{aspect-ratio:16/9;width:min(calc(100vw - 32px),calc((100vh - 64px)*16/9));width:min(calc(100vw - 32px),calc((100dvh - 64px)*16/9))}' +
      '.eldp-modal.is-vertical .eldp-stage{aspect-ratio:9/16;height:min(calc(100vh - 64px),calc((100vw - 32px)*16/9));height:min(calc(100dvh - 64px),calc((100vw - 32px)*16/9))}' +
      '.eldp-modal .eldp-x{position:absolute;top:12px;right:12px;min-width:44px;min-height:44px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(10,8,6,.55);border:1px solid rgba(241,212,143,.4);color:#ece5d3;font:400 .78rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
      '.eldp-modal .eldp-x:hover,.eldp-modal .eldp-x:focus-visible{background:#f1d48f;color:#0a0806;outline:none}' +
      '@media (max-height:520px){.eldp-modal.is-horizontal .eldp-stage{width:min(calc(100vw - 16px),calc((100vh - 16px)*16/9));width:min(calc(100vw - 16px),calc((100dvh - 16px)*16/9))}.eldp-modal.is-vertical .eldp-stage{height:calc(100vh - 16px);height:calc(100dvh - 16px)}}' +
      '@media (max-width:560px){.eldp-modal .eldp-x span{display:none}}';
    d.head.appendChild(s);
  }
  function open(o) {
    if (!o || !/^[\w-]{6,20}$/.test(o.id || '') || !d.body) return false;
    addCss(); addModalCss();
    var vertical = fmt(o) === 'vertical';
    var it = /^it/i.test(root.lang || '');
    var dlg = d.createElement('dialog');
    dlg.className = 'eldp-modal ' + (vertical ? 'is-vertical' : 'is-horizontal');
    dlg.setAttribute('aria-label', o.title || 'Video');
    var stage = d.createElement('div'); stage.className = 'eldp-stage';
    var still = safe(vertical ? (o.poster || o.image) : (o.image || o.poster));
    if (still) {
      var img = d.createElement('img'); img.src = still; img.alt = ''; img.decoding = 'async';
      if (!vertical && o.position && /^[0-9%. a-z-]+$/i.test(o.position)) img.style.objectPosition = o.position;
      stage.appendChild(img);
    }
    var x = d.createElement('button'); x.type = 'button'; x.className = 'eldp-x';
    x.setAttribute('aria-label', it ? 'Chiudi il video' : 'Close the video');
    x.innerHTML = '<span></span><b aria-hidden="true" style="font-weight:400;font-size:1.2rem;line-height:1">×</b>';
    x.firstChild.textContent = it ? 'Chiudi' : 'Close';
    dlg.append(stage, x); d.body.appendChild(dlg);
    var prevOverflow = root.style.overflow, opener = o.opener || d.activeElement;
    function shut() { if (dlg.open) dlg.close(); else cleanup(); }
    var cleaned = false;
    function cleanup() {
      if (cleaned) return; cleaned = true;
      root.style.overflow = prevOverflow;
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);          // removing the iframe stops the video
      if (opener && opener.focus && opener.isConnected) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
    x.addEventListener('click', shut);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
    dlg.addEventListener('close', cleanup);
    root.style.overflow = 'hidden';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    play(stage, { id: o.id, title: o.title });
    return true;
  }
  function fromProduction(p, e) {
    e = e || {}; p = p || {}; var t = p.trailer || {}, base = e.base || '';
    var abs = function (u) { u = safe(u); return u && !/^(https?:|\/|data:)/i.test(u) ? base + u : u; };
    var urls = [t.url].concat(((p.announcement || {}).urls || []).map(function (u) { return typeof u === 'string' ? u : (u && u.url); }));
    return { id: t.id, title: (t.title || p.title || 'Video'), ratio: t.ratio, urls: urls, poster: abs(p.poster), image: abs(p.image),
             position: p.imagePosition ? String(p.imagePosition) : '', opener: e.opener };
  }

  w.ELDPlayer = { play: play, open: open, detect: fmt, fromProduction: fromProduction };
})(window);
