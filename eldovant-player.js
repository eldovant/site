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
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    box.append(f, veil);

    var done = false, timer = null;
    function reveal() {
      if (done || !f.isConnected) return; done = true;
      w.removeEventListener('message', onMsg); clearTimeout(timer);
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
    f.addEventListener('load', function () {
      try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST); } catch (x) { /* ignore */ }
      // ask for state updates; repeat once in case the player was not ready yet
      setTimeout(function () { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST); } catch (x) { /* ignore */ } }, 600);
    });
    // never leave the still waiting for ever (autoplay blocked, slow network): show the player so it can be used
    timer = setTimeout(reveal, 9000);
    return true;
  }

  w.ELDPlayer = { play: play };
})(window);
