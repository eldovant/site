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

## "Errore di reindirizzamento" in Search Console — cause e controlli

**Cause trovate nel codice (corrette)**: la root `/` reindirizzava via JavaScript riconoscendo male alcuni crawler (es. lo strumento di ispezione di Google non contiene "bot" nel nome). Ora l'elenco copre Google (incl. Google-InspectionTool), Bing, Yandex, Baidu, DuckDuckGo, Apple, anteprime social e strumenti di test; la build (`node tools/build.mjs`) si ferma se la root contiene un meta refresh o perde questa esclusione, così non può ripresentarsi per una modifica futura. Le pagine `/en/…` e `/it/…` non contengono alcun redirect (verificato dall'audit a ogni build).

**Causa che il codice non può né vedere né correggere**: i redirect di hosting/DNS (http→https, eldovant.com→www). Se Search Console segnala "errore" (e non "pagina con reindirizzamento") su pagine che nel repository non reindirizzano, è quasi sempre un ciclo lì. Controlla, da un terminale:

    curl -sIL -A "Googlebot" http://eldovant.com/   | grep -iE "^HTTP|^location"
    curl -sIL -A "Googlebot" https://www.eldovant.com/en/ | grep -iE "^HTTP|^location"

Risultato corretto: al massimo 2 passaggi (301 → `https://www.eldovant.com/…`) e poi `200`. Se vedi lo stesso indirizzo ripetuto, o www→apex→www, il ciclo è fuori dal repository. Verifica: (1) nessun "inoltro di dominio/URL forwarding" attivo dal registrar sull'apex o su www; (2) se usi Cloudflare, SSL/TLS in modalità **Full (strict)**, mai "Flexible", e nessuna regola che porti www→apex; (3) GitHub → Settings → Pages: dominio `www.eldovant.com` e **Enforce HTTPS** attivo; DNS apex con i 4 record A di GitHub e `www` come CNAME verso `eldovant.github.io`.

Dopo la pubblicazione: Search Console → Indicizzazione pagine → "Errore di reindirizzamento" → **Convalida correzione**.

## Nome del sito su Google ("ELDOVANT" invece di "eldovant.com")

Il nome viene dal markup `WebSite` (`name` "ELDOVANT", `alternateName`) presente nell'HTML della home (root, /en/, /it/), coerente con titolo, `og:site_name` e h1. Google lo applica solo quando riesce a scansionare la home senza errori (l'errore di reindirizzamento sulla root lo bloccava) e può impiegare settimane; non è forzabile.

## Dati strutturati video: data di caricamento

Search Console segnala "manca un fuso orario" / "valore datetime non valido" se `uploadDate` è solo una data (`2026-10-04`). Il builder (`ldDateTime` in `tools/build.mjs`) ora converte da solo una data semplice in mezzanotte di Europa/Roma con l'offset corretto (es. `2026-10-04T00:00:00+02:00`). Se vuoi l'orario reale di pubblicazione, scrivi in `eldovant-data.js`, nel campo `announcement.date`, un valore completo come `'2026-10-04T18:30:00+02:00'`: viene usato così com'è. Un valore non valido ferma la build con "DATE ERROR".
