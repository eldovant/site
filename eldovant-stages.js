/* ==========================================================================
   ELDOVANT — stages & the production path
   Reads window.ELDOVANT_DATA.stages (eldovant-data.js is the only place to edit).
   Exposes window.ELDStages:
     norm(status)            -> canonical stage id, or null  ('in-production', 'in produzione' → 'production')
     label(id) / note(id)    -> text in the page language
     map()                   -> { id: label }  for badges
     ids                     -> ordered path ids (archived is outside the path)
     T(value)                -> text from a string or { en, it }
     date(iso)               -> '4 Oct 2026' / '4 ott 2026'
     mount(host, status, o)  -> renders the path into host, reveals it when it enters view
     update(list, status)    -> moves the light to another stage in place (smooth)
   No third-party code, no storage, no network.
   ========================================================================== */
(function (w) {
  'use strict';
  var d = w.document, root = d.documentElement;
  var DATA = w.ELDOVANT_DATA || {};
  var LANG = root.lang === 'it' ? 'it' : 'en';
  var RM = root.classList.contains('rm');

  var UI = {
    en: { path: 'Production path', current: 'Current stage', done: 'Completed', ahead: 'Not yet reached', archived: 'Archived' },
    it: { path: 'Percorso di produzione', current: 'Fase attuale', done: 'Completata', ahead: 'Non ancora raggiunta', archived: 'Archiviato' }
  };

  function T(v, l) {
    if (v == null) return '';
    if (typeof v === 'object' && !Array.isArray(v)) {
      l = l || LANG;
      return v[l] != null ? String(v[l]) : (v.en != null ? String(v.en) : '');
    }
    return String(v);
  }
  function slug(x) {
    return String(x == null ? '' : x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var ST = (DATA.stages || []).filter(Boolean), BY = {}, ALIAS = {};
  ST.forEach(function (s) {
    BY[s.id] = s; ALIAS[slug(s.id)] = s.id;
    (s.aliases || []).forEach(function (a) { ALIAS[slug(a)] = s.id; });
  });
  var PATH = ST.filter(function (s) { return s.path !== false; }).map(function (s) { return s.id; });

  function norm(x) { return ALIAS[slug(x)] || null; }
  function label(id, l) { return BY[id] ? T(BY[id].name, l) : ''; }
  function note(id, l) { return BY[id] ? T(BY[id].note, l) : ''; }
  function map(l) { var o = {}; ST.forEach(function (s) { o[s.id] = T(s.name, l); }); return o; }
  function date(iso, l) {
    if (!iso) return '';
    var dt = new Date(String(iso) + 'T12:00:00Z');
    if (isNaN(dt.getTime())) return '';
    try { return dt.toLocaleDateString((l || LANG) === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return String(iso); }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function el(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* where each stage sits relative to the one that is current */
  function stateAt(i, idx, archived) {
    if (archived) return 'past';
    if (idx < 0) return 'idle';
    return i < idx ? 'past' : (i === idx ? 'current' : 'future');
  }

  function update(ol, status) {
    var l = ol.__lang || LANG, id = norm(status), archived = id === 'archived';
    var idx = PATH.indexOf(id);
    ol.setAttribute('data-status', id || '');
    ol.classList.toggle('is-archived', archived);
    var weights = [];
    Array.prototype.forEach.call(ol.children, function (li, i) {
      var st = stateAt(i, idx, archived);
      li.className = 'stg-i is-' + st;
      if (st === 'current') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      var s = li.querySelector('.stg-state');
      s.textContent = st === 'current' ? UI[l].current : st === 'past' ? (archived ? UI[l].archived : UI[l].done) : st === 'future' ? UI[l].ahead : '';
      weights.push(st === 'current' ? '1.75fr' : '1fr');
    });
    ol.style.setProperty('--cols', weights.join(' '));
  }

  function build(status, o) {
    o = o || {};
    var l = o.lang || LANG;
    var ol = el('ol', 'stg');
    ol.__lang = l;
    ol.setAttribute('data-variant', o.variant || 'wide');
    ol.setAttribute('data-notes', o.notes || 'all');
    ol.setAttribute('aria-label', UI[l].path);
    PATH.forEach(function (id, i) {
      var li = el('li', 'stg-i');
      li.setAttribute('data-stage', id);
      li.style.setProperty('--i', i);
      li.append(
        el('span', 'stg-state'),
        el('span', 'stg-streak'),
        el('span', 'stg-no', pad(i + 1)),
        el('span', 'stg-name', label(id, l)),
        el('p', 'stg-note', note(id, l))
      );
      li.querySelector('.stg-no').setAttribute('aria-hidden', 'true');
      li.querySelector('.stg-streak').setAttribute('aria-hidden', 'true');
      ol.append(li);
    });
    update(ol, status);
    return ol;
  }

  function mount(host, status, o) {
    var ol = build(status, o);
    host.textContent = '';
    host.append(ol);
    if (RM || !('IntersectionObserver' in w)) { ol.classList.add('in'); return ol; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { ol.classList.add('in'); io.disconnect(); } });
    }, { threshold: 0.25, rootMargin: '0px 0px -6% 0px' });
    io.observe(ol);
    return ol;
  }

  w.ELDStages = { norm: norm, label: label, note: note, map: map, ids: PATH.slice(), all: ST.map(function (s) { return s.id; }),
    T: T, date: date, mount: mount, update: update, lang: LANG };
})(window);
