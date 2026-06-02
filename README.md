# Time Logger

En lokal React/Electron-app for timeføring.

English setup guide: [README.en.md](README.en.md)

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

## Jira og sikker lagring

Appen har en Jira-integrasjon for å teste tilkobling og synkronisere ferdige time entries som worklogs i Jira.

I Innstillinger legger brukeren inn:

- Jira base URL, for eksempel `https://firma.atlassian.net`
- Jira e-post
- Jira API token

API-tokenet lagres ikke i React-state permanent, `localStorage` eller README-konfig. Når brukeren trykker lagre, sendes tokenet én gang fra React via preload til Electron main process. Der blir det kryptert med Electron `safeStorage` og lagret i en lokal `secure-store.json` under Electron sin `userData`-mappe.

Sikkerhetsmekanismene er:

- `nodeIntegration` er slått av og `contextIsolation` er slått på i Electron-vinduet.
- React får bare tilgang til et begrenset API gjennom `window.loggerAPI` i preload.
- Jira-tokenet kan lagres og brukes av main process, men hentes aldri tilbake til renderer.
- UI-et viser bare om et Jira API token finnes, ikke selve tokenet.
- Jira-kallene `jira:test-connection` og `jira:sync-worklogs` kjøres i main process, slik at tokenet ikke trengs i React.
- Den generiske secure store-listen som React kan lese inneholder ikke `jiraApiToken`.
- Synkroniserte entries merkes med `jiraWorklogId`, `jiraWorklogSelf` og `jiraSyncedAt`, slik at samme entry ikke synkes flere ganger.

Synkronisering fungerer slik:

1. Legg inn Jira base URL, e-post og API token i Innstillinger.
2. Trykk `Save Jira`.
3. Trykk `Test connection` for å kontrollere at Jira-innloggingen virker.
4. Når ferdige ticket entries finnes, trykk `Sync worklogs`.
5. Entries som allerede er synket til Jira blir hoppet over.

## Vanlige problemer

Hvis `npm` eller `node` ikke finnes, installer Node.js LTS og åpne et nytt PowerShell-vindu.

Hvis `gh` ikke finnes etter installasjon av GitHub CLI, åpne et nytt PowerShell-vindu eller bruk full sti:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Hvis port `5173` allerede er i bruk, lukk prosessen som bruker porten før du kjører `npm run dev` igjen.
