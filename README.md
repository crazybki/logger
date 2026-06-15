# Time Logger

En lokal React/Electron-app for timeføring.

English setup guide: [README.en.md](README.en.md)

## Endringer 2026-06-15

- Aktiv Jira-ticket viser nå status som `Working on issue ADP-xxxxx` når en trygg issue key kan parses. Hvis ikke brukes vanlig ticket-navn.
- Ticket-søk er forbedret: resultater vises først når brukeren skriver, skjules etter valg, og kan navigeres med pil opp/ned og Enter.
- Jira-feil ved test, fetch og sync vises tydeligere som error og har mer konkrete meldinger for manglende credentials, ugyldig URL, `401/403` og nettverksfeil.
- Jira Cloud URL kan skrives som bare firmanavn, for eksempel `company`, og normaliseres til `https://company.atlassian.net`. Full URL virker fortsatt, og Server/Data Center tvinges ikke til Atlassian Cloud.
- Jira API token/PAT vises tryggere i UI: tokenet returneres ikke til renderer, og feltet viser bare at token er lagret.
- Notification Center v1 er lagt til i headeren. Toast-meldinger vises fortsatt kort, men Jira/Tempo/import/settings/update-hendelser lagres og kan leses som in-memory historikk. Meldinger lagres ikke til disk og saniteres for URL-er, e-post og token-lignende tekst.
- Toppkortet er ryddet opp slik at `Gjenstår i dag` og `Jira Sync` vises side om side ved normal appbredde. Teksten `of 07:30:00` er fjernet.
- Jira worklog update etter tidsendring er ikke implementert ennå. Eksisterende Jira create/sync-logikk er beholdt.

## Dette må installeres

Installer disse verktøyene før du starter:

- [Node.js LTS](https://nodejs.org/) - inkluderer `npm`, som brukes til å installere og kjøre prosjektet.
- [Git](https://git-scm.com/downloads) - brukes til å klone repoet og hente oppdateringer.
- [GitHub CLI](https://cli.github.com/) - valgfritt, men nyttig hvis du vil logge inn mot GitHub og pushe fra terminalen.

Sjekk at installasjonen virker:

```powershell
node --version
npm --version
git --version
```

Hvis du bruker GitHub CLI:

```powershell
gh auth login
gh auth status
```

## Hent prosjektet

```powershell
git clone https://github.com/crazybki/logger.git
cd logger
```

Repoet er privat, så GitHub-brukeren din må ha tilgang.

## Installer avhengigheter

Kjør dette første gang du åpner prosjektet, og etter endringer i `package.json` eller `package-lock.json`:

```powershell
npm install
```

## Kjør webversjonen lokalt

```powershell
npm run dev
```

Appen kjører da på:

```text
http://localhost:5173
```

## Kjør desktop-appen

```powershell
npm run desktop
```

Dette starter både Vite-utviklingsserveren og Electron-vinduet.

## Bygg produksjonsfiler

```powershell
npm run build
```

Bygget havner i `dist/`.

## Lag Windows-installer

```powershell
npm run dist
```

Installer og andre release-filer havner i `release/`.

## Jira-integrasjon

Desktop-appen kan kobles til Jira Cloud for å hente tickets og synkronisere ferdige time entries som worklogs i Jira. Jira-funksjonene virker bare i Electron-appen, ikke i ren webvisning på `localhost`, fordi sikker lagring og Jira-kall kjøres i Electron main process.

I Innstillinger legger brukeren inn:

- Jira base URL, for eksempel `https://firma.atlassian.net`
- Jira e-post
- Jira API token

Tilgjengelige Jira-funksjoner:

- `Save Jira`: lagrer Jira URL, e-post og API token sikkert.
- `Test connection`: tester innloggingen mot Jira.
- `Load projects`: henter Jira-prosjekter brukeren har tilgang til.
- Prosjektfilter: velg ett eller flere prosjekter, for eksempel `ADP`, `ITSM` eller `KAN`.
- `Ticket filter`: valgfritt filter på Jira summary. La feltet stå tomt for å hente nyeste tickets fra valgte prosjekter.
- `Fetch tickets`: henter Jira tickets og legger dem inn i appens lokale ticketsøk.
- Forsidesøk: hentede Jira tickets kan søkes opp på issue key eller tittel.
- Manuell logging: ticketfeltet viser forslag fra hentede Jira tickets.
- `Sync Jira`: synkroniserer ferdige, usynkede ticket entries som Jira worklogs.

Anbefalt bruk:

1. Legg inn Jira base URL, e-post og API token i Innstillinger.
2. Trykk `Save Jira`.
3. Trykk `Test connection` for å kontrollere at Jira-innloggingen virker.
4. Trykk `Load projects`.
5. Velg relevante prosjekter.
6. Tøm `Ticket filter` hvis alle nyeste tickets skal hentes.
7. Trykk `Fetch tickets`.
8. Søk opp en Jira ticket på forsiden eller i manuell logging.
9. Logg tid.
10. Trykk `Sync Jira` når ferdige entries skal sendes til Jira.

Worklog-synk fungerer slik:

- Appen sender worklog til Jira issue key, for eksempel `KAN-8`.
- Worklog-kommentaren inkluderer appens ticketvisning, for eksempel `Logged from Time Logger: KAN-8 - SSO`.
- Manuelle entries med dagens dato synkes med dagens klokkeslett.
- Manuelle entries med tidligere dato synkes på valgt dato kl. `09:00`.
- Datoen i appen er styrende for hvilken dato workloggen havner på i Jira.
- Entries som allerede er synket til Jira blir hoppet over.

## Jira og sikker lagring

API-tokenet lagres ikke i React-state permanent, `localStorage` eller README-konfig. Når brukeren trykker lagre, sendes tokenet én gang fra React via preload til Electron main process. Der blir det kryptert med Electron `safeStorage` og lagret i en lokal `secure-store.json` under Electron sin `userData`-mappe.

Sikkerhetsmekanismene er:

- `nodeIntegration` er slått av og `contextIsolation` er slått på i Electron-vinduet.
- React får bare tilgang til et begrenset API gjennom `window.loggerAPI` i preload.
- Jira-tokenet kan lagres og brukes av main process, men hentes aldri tilbake til renderer.
- UI-et viser bare om et Jira API token finnes, ikke selve tokenet.
- Jira-kallene `jira:test-connection`, `jira:list-projects`, `jira:fetch-tickets` og `jira:sync-worklogs` kjøres i main process.
- React sender bare prosjektvalg, søketekst eller entries til main process.
- Jira-resultater returneres som normalisert app-data, for eksempel `{ id, title, favorite }`.
- Den generiske secure store-listen som React kan lese inneholder ikke `jiraApiToken`.
- `secure-store.json` skrives atomisk via temp-fil og rename for å redusere risikoen for korrupt JSON.
- Hvis secure store-filen likevel er korrupt, tar appen backup og starter med en tom secure store.
- Synkroniserte entries merkes med `jiraWorklogId`, `jiraWorklogSelf` og `jiraSyncedAt`, slik at samme entry ikke synkes flere ganger.

- ## Jira Authentication Model

Time Logger uses Jira Cloud API tokens.

Authentication flow:

1. User creates a Jira API token in Atlassian.
2. User enters URL, email and token in Time Logger.
3. Token is transferred once to Electron main process.
4. Token is encrypted using Electron safeStorage.
5. Token is never returned to renderer.
6. Jira API calls are executed exclusively from Electron main process.

## Vanlige problemer

Hvis `npm` eller `node` ikke finnes, installer Node.js LTS og åpne et nytt PowerShell-vindu.

Hvis `gh` ikke finnes etter installasjon av GitHub CLI, åpne et nytt PowerShell-vindu eller bruk full sti:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Hvis port `5173` allerede er i bruk, lukk prosessen som bruker porten før du kjører `npm run dev` igjen.
