# Updating ELDOVANT

Everything is driven by **`eldovant-data.js`** (the only file you edit).

## Move a title to its next stage
In `productions`, change one word:

    status: 'production'   →   status: 'post'

Stages: `announced → development → preproduction → production → post → soon → released` (+ `archived`).
Typing `in-production`, `in produzione`, `post-production` etc. also works.
Push to `main`: the GitHub Action rebuilds the title pages, social previews and sitemap (about a minute).
The production path on Productions and on the title page moves its light to the new stage by itself.

## When the stage changes, also swap the artwork
The L01 artwork says “Now in production”. When the status moves on, replace `poster`, `image` and `og`
with the new versions, then set `artStatus` to the new stage. The build warns until they match.

## Add a title
Copy the L01 block, give it a new `id` and `slug`, set `featured: true` on the one that should lead the Index.
It gets its own EN/IT page automatically (`page: false` to skip, `visible: false` to hide).

## Announcement links
`announcement: { date: '2026-10-04', urls: [] }` — add the X / Instagram / TikTok post URLs when you have them.

## One-time GitHub setup
Settings → Actions → General → Workflow permissions → **Read and write permissions**.
Pages stays on “Deploy from a branch”.

Check locally without writing anything: `node tools/build.mjs --check`

## Link allo Shop
Menu e footer di ogni pagina puntano a `https://shop.eldovant.com/en/` (pagine EN) e `/it/` (pagine IT).
Lo Shop è un repository separato: vedi `SHOP-GUIDE.md` nello ZIP dello Shop.

## Root `/`, crawler e link esterni

- La root `/` è l'unico punto con rilevamento lingua (scelta salvata → lingua del browser → inglese), eseguito nel browser. I crawler riconosciuti dallo User-Agent (Googlebot, Bingbot, anteprime social…) non vengono reindirizzati: leggono la root statica con i link reali a `/en/` e `/it/`, che non reindirizzano mai. GitHub Pages non permette logica server-side; la geolocalizzazione IP non è attiva (richiederebbe un servizio terzo/Cloudflare Workers).
- - I canali in `eldovant-data.js` → `social` compaiono nel footer solo con il nome della piattaforma (cliccabile, mai l'URL) e nel JSON-LD `sameAs`.

## Come appaiono i risultati su Google

Titoli nel formato "ELDOVANT — Nome pagina" (generati dalla build), breadcrumb (BreadcrumbList) su tutte le pagine e `WebSite` con `name`/`alternateName` sono i segnali che controlliamo. Google decide da solo cosa mostrare sopra l'URL (nome del sito, percorso a briciole, titolo); i cambiamenti compaiono dopo una nuova scansione. Dopo la pubblicazione: Search Console → Controllo URL → "Richiedi indicizzazione" per root, /en/, /it/ e le pagine principali.
