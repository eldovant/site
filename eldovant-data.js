/* ==========================================================================
   ELDOVANT — shared data. This is the ONLY file you edit for content.
   Every page (index, productions, studio, contact, privacy, cookies, terms)
   reads it on load. Leave a field empty and the pages say so honestly;
   nothing here is invented. Keep this file in the same folder as the .html
   pages, wherever you publish them (GitHub Pages included).
   ========================================================================== */
window.ELDOVANT_DATA = {

  /* CONTACT
     email        : the general address shown as the fallback and on the sidebar.
     formEndpoint : leave empty — no form service is configured yet (see note below).
                    If you ever set one up, put its https URL here and the form
                    switches to sending directly instead of opening email.
     routing      : optional — send each inquiry type from the Contact form to a
                    more specific address instead of the general one. Keys must
                    match the form's inquiry labels exactly.
     addresses    : optional — listed on the Contact page's "Elsewhere" section
                    so a visitor can see all official addresses at a glance,
                    not only the one the form happens to use. */
  contact: {
    email: 'contact@eldovant.com',
    formEndpoint: '',
    routing: {
      'Collaboration': 'partnerships@eldovant.com',
      'Licensing & distribution': 'partnerships@eldovant.com',
      'Music & scoring': 'productions@eldovant.com',
      'Press': 'contact@eldovant.com',
      'Something else': 'contact@eldovant.com'
    },
    addresses: [
      { label: 'General & press', email: 'contact@eldovant.com' },
      { label: 'Productions & music', email: 'productions@eldovant.com' },
      { label: 'Partnerships & licensing', email: 'partnerships@eldovant.com' }
    ]
  },

  /* Official channels — all four confirmed live under the @eldovant handle,
     plus YouTube. Fill href only for profiles that are really live. */
  social: [
    { name: 'YouTube',   href: 'https://www.youtube.com/@eldovant' },
    { name: 'Instagram', href: 'https://www.instagram.com/eldovant' },
    { name: 'TikTok',    href: 'https://www.tiktok.com/@eldovant' },
    { name: 'Facebook',  href: 'https://www.facebook.com/eldovant' },
    { name: 'X',         href: 'https://x.com/eldovant' },
    { name: 'LinkedIn',  href: '' }
  ],

  /* LEGAL PAGES — the facts Privacy Policy and Terms of Service must state.
     ELDOVANT is not currently a registered company and has no registered
     office (confirmed 22 Sept 2026), so noCompany is set to true: the pages
     say this plainly instead of showing a "to be added" placeholder for an
     address that doesn't exist. Flip it to false the day ELDOVANT
     incorporates, and fill controller/address then.

     controller  : leave empty for now (no company name exists to give).
                   If you ever want your own name named as the person behind
                   ELDOVANT, put it here — entirely your call, not required.
     address     : leave empty — there is no registered office to publish.
     email       : privacy-specific contact; leave empty to reuse contact.email.
     hosting     : leave empty until the site is actually live somewhere
                   (you mentioned GitHub Pages, but only once it's published there).
     formService : only needed if contact.formEndpoint above is used.
     authority   : optional. Left empty on purpose — the default text points
                   each visitor to the data-protection authority of their own
                   country via the EDPB, which is more accurate than naming
                   only Italy's Garante for every visitor worldwide.
     retention   : optional, replaces the default retention sentence.
     law         : NOT set — see the message below for the three options and
                   what each one means before you choose.
     updated     : the date of the current text. */
  privacy: {
    noCompany: true,
    controller: '', address: '', email: '', hosting: 'GitHub Pages (GitHub, Inc., USA)', formService: '',
    authority: '', retention: '',
    law: {
      it: 'Questi termini sono regolati dalla legge italiana. Se usi il sito come consumatore, restano salvi i diritti inderogabili che la legge del tuo paese di residenza ti riconosce.',
      en: 'These terms are governed by Italian law. If you use the site as a consumer, the mandatory consumer rights granted by the law of your country of residence remain unaffected.'
    },
    updated: '22 September 2026'
  },

  /* Optional legal line for the footer — a registered company name, once one
     exists. Leave empty: ELDOVANT is not a registered company today, and the
     footer simply omits the line when this is blank. */
  entity: '',

  /* Optional named credits on the Studio/Contact pages: [{ name: '…', role: '…' }] */
  people: [],

  /* STAGES — the one ordered path every title travels. This is what drives the status badge,
     the production path (timeline) and the labels on every page, in English and Italian.
     path:false  = a state that sits outside the path (archived).
     aliases     = other spellings you may type in `status` (accents, spaces and hyphens are ignored),
                   so  status: 'in-production'  or  status: 'in produzione'  both mean 'production'. */
  stages: [
    { id: 'announced',  path: true,
      name: { en: 'Announced',          it: 'Annunciato' },
      note: { en: 'Confirmed by ELDOVANT. No work is shown yet.',
              it: 'Confermato da ELDOVANT. Nessuna opera è ancora mostrata.' },
      aliases: ['announce', 'annunciato', 'annunciata', 'annunciato ufficialmente'] },
    { id: 'development', path: true,
      name: { en: 'In development',    it: 'In sviluppo' },
      note: { en: 'Being written or designed. The idea exists; the work is not finished.',
              it: 'In fase di scrittura o progettazione. L’idea esiste; l’opera non è finita.' },
      aliases: ['in-development', 'dev', 'in sviluppo', 'sviluppo'] },
    { id: 'preproduction', path: true,
      name: { en: 'In pre-production', it: 'In pre-produzione' },
      note: { en: 'Being prepared to be made: script, design and plan are locked before the work begins.',
              it: 'In preparazione: sceneggiatura, design e piano di lavoro vengono definiti prima che il lavoro cominci.' },
      aliases: ['pre-production', 'in-pre-production', 'pre production', 'pre-produzione', 'in pre-produzione', 'preproduzione'] },
    { id: 'production', path: true,
      name: { en: 'In production',     it: 'In produzione' },
      note: { en: 'Being made: shots, scenes or recordings are underway.',
              it: 'In lavorazione: inquadrature, scene o registrazioni sono in corso.' },
      aliases: ['in-production', 'in production', 'in produzione', 'produzione'] },
    { id: 'post', path: true,
      name: { en: 'In post-production', it: 'In post-produzione' },
      note: { en: 'Made, and being edited, scored and finished.',
              it: 'Realizzata, ed è in fase di montaggio, musica e finishing.' },
      aliases: ['postproduction', 'post-production', 'in-post-production', 'in post-produzione', 'post-produzione'] },
    { id: 'soon', path: true,
      name: { en: 'Coming soon',       it: 'In arrivo' },
      note: { en: 'Finished, with a release date that is reliable.',
              it: 'Finita, con una data di uscita affidabile.' },
      aliases: ['coming-soon', 'coming soon', 'in arrivo', 'prossimamente'] },
    { id: 'released', path: true,
      name: { en: 'Released',          it: 'Pubblicato' },
      note: { en: 'Complete and public. The only status that carries a Watch link.',
              it: 'Completa e pubblica. L’unico stato che porta un link Guarda.' },
      aliases: ['release', 'rilasciato', 'pubblicato', 'uscito'] },
    { id: 'archived', path: false,
      name: { en: 'Archived',          it: 'Archiviato' },
      note: { en: 'Kept on record. No longer active.',
              it: 'Conservato negli archivi. Non più attivo.' },
      aliases: ['archive', 'archiviato', 'archiviata'] }
  ],

  /* PRODUCTIONS — one entry per title, in the order you want them shown. Change `status` and
     everything else follows: badge, production path, call to action, home, Productions,
     the title's own page, search and social previews.
       status    : see `stages` above (announced → … → released, or archived)
       format    : 'feature' | 'short' | 'series' | 'trailer' | 'music'
       featured  : true on ONE title to lead the Index and Productions
       visible   : false hides a title everywhere without deleting it
       page      : false means no dedicated page (default: every visible title gets one)
       Texts that differ by language are written { en: '…', it: '…' }.
       Dates are 'YYYY-MM-DD'. Leave a field out and the site simply does not show it —
       nothing is ever invented. A “Watch” button needs status 'released' AND watchUrl.        */
  productions: [
    {
      id: 'l01',
      slug: 'l01',
      title: 'L01',
      format: 'short',
      status: 'production',
      featured: true,
      visible: true,
      tagline: { en: 'An ELDOVANT Original Short Film', it: 'Un cortometraggio originale ELDOVANT' },
      logline: {
        en: 'When the last reliable light begins to fail, a woman follows a mysterious signal into a darkness where people can disappear — and even the memory of them can be erased.',
        it: 'Quando l’ultima luce sicura inizia a cedere, una donna segue un misterioso segnale dentro un’oscurità in cui le persone possono scomparire — e persino il loro ricordo può essere cancellato.'
      },
      announcedAt: '2026-10-04',
      // releaseDate: '',                       // only when it is reliable
      image: 'assets/l01/l01-keyart.jpg',
      imagePosition: '50% 0%',                  // keeps the title lockup inside the wide cinematic crop
      imageAlt: {
        en: 'L01 key art: a woman in a rain-soaked dark jacket glances back on a harbour quay at night, storm clouds above, cranes and lights across the water.',
        it: 'Key art di L01: una donna con una giacca scura bagnata dalla pioggia si volta su una banchina del porto di notte, nuvole di tempesta in alto, gru e luci oltre l’acqua.'
      },
      poster: 'assets/l01/l01-poster.jpg',
      og: 'assets/l01/l01-og.jpg',
      artStatus: 'production',   // the status the artwork was made for (the art says “Now in production”): the build warns when status moves on
      trailer: {
        type: 'youtube', id: 'aVIyeqjxBNw',
        label: { en: 'Watch the announcement', it: 'Guarda l’annuncio' },
        title: 'L01 — Official Announcement',
        duration: 'PT15S', ratio: '9:16'
      },
      announcement: { date: '2026-10-04', urls: [          // where the announcement was published, in this order
        'https://x.com/eldovant/status/2106715971780002075',
        'https://youtube.com/shorts/aVIyeqjxBNw'
      ] },   // add Instagram / TikTok here when they are live
      credits: [
        { role: { en: 'Production',   it: 'Produzione' },  name: 'ELDOVANT' },
        { role: { en: 'Presented by', it: 'Presentato da' }, name: 'ELDOVANT' }
      ]
    }
  ],

  /* Beyond the Frame (Index) — confirmed items only: { date: '2026-10-01', title: '', text: '', href: '' }
     Text can be written { en: '…', it: '…' }. */
  dispatches: [
    {
      date: '2026-10-04',
      title: { en: 'L01 is now in production', it: 'L01 è in produzione' },
      text:  { en: 'ELDOVANT announces L01, its first original short film.',
               it: 'ELDOVANT annuncia L01, il suo primo cortometraggio originale.' },
      href: 'https://x.com/eldovant/status/2106715971780002075'
    }
  ]
};
