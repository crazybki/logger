# Time Logger

En lokal React/Electron-app for timeføring.

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

## Vanlige problemer

Hvis `npm` eller `node` ikke finnes, installer Node.js LTS og åpne et nytt PowerShell-vindu.

Hvis `gh` ikke finnes etter installasjon av GitHub CLI, åpne et nytt PowerShell-vindu eller bruk full sti:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Hvis port `5173` allerede er i bruk, lukk prosessen som bruker porten før du kjører `npm run dev` igjen.
