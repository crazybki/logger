# Time Logger

A local React/Electron app for time tracking.

Norwegian setup guide: [README.md](README.md)

## Changes 2026-06-15

- Active Jira tickets now show a status such as `Working on issue ADP-xxxxx` when a safe issue key can be parsed. If no Jira issue key is found, the regular ticket title is used.
- Ticket search has improved keyboard UX: results only appear after typing, hide after a ticket is selected, and can be navigated with Arrow Up, Arrow Down, and Enter.
- Jira test, fetch, and sync errors are shown as errors and use clearer messages for missing credentials, invalid URLs, `401/403`, and network failures.
- Jira Cloud URLs can be entered as just a company name, for example `company`, and are normalized to `https://company.atlassian.net`. Full URLs still work, and Jira Server/Data Center URLs are not forced to Atlassian Cloud.
- Jira API token/PAT handling is clearer in the UI: the token is never returned to the renderer, and the field only indicates that a token is saved.
- Notification Center v1 has been added to the header. Toast messages still appear briefly, while Jira/Tempo/import/settings/update events are also kept in an in-memory history. Notifications are not written to disk and are sanitized for URLs, email addresses, and token-like text.
- The top summary card now shows `Remaining today` and `Jira Sync` side by side at normal app width. The `of 07:30:00` text was removed.
- English is now the default language for new users or users without a saved language preference. Existing saved language preferences are preserved.
- Recent Activity, notification center labels, Jira sync labels, ticket search placeholder, and related empty states now follow the selected app language.
- Known localized Jira error fragments are normalized for English UI so Jira sync notifications do not mix Norwegian and English text.
- Jira worklog update after time changes is still not implemented. The existing Jira create/sync logic is unchanged.

## Requirements

Install these tools before you start:

- [Node.js LTS](https://nodejs.org/) - includes `npm`, which is used to install and run the project.
- [Git](https://git-scm.com/downloads) - used to clone the repository and fetch updates.
- [GitHub CLI](https://cli.github.com/) - optional, but useful if you want to log in to GitHub and push from the terminal.

Check that the tools are available:

```powershell
node --version
npm --version
git --version
```

If you use GitHub CLI:

```powershell
gh auth login
gh auth status
```

## Get The Project

```powershell
git clone https://github.com/crazybki/logger.git
cd logger
```

The repository is private, so your GitHub user must have access.

## Install Dependencies

Run this the first time you open the project, and after changes to `package.json` or `package-lock.json`:

```powershell
npm install
```

## Run The Web Version Locally

```powershell
npm run dev
```

The app runs at:

```text
http://localhost:5173
```

## Run The Desktop App

```powershell
npm run desktop
```

This starts both the Vite development server and the Electron window.

## Build Production Files

```powershell
npm run build
```

The build output is written to `dist/`.

## Create A Windows Installer

```powershell
npm run dist
```

The installer and other release files are written to `release/`.

## Publish Automatic Updates

The app uses GitHub Releases as the update feed. After a user has installed the app once, new versions can be downloaded by the app automatically.

```powershell
npm version patch
git push
git push --tags
```

This triggers `.github/workflows/release.yml`, which builds the Windows installer and publishes the release files. Use `minor` or `major` instead of `patch` for larger version jumps.

## Jira Integration

The desktop app can connect to Jira Cloud to fetch tickets and sync completed time entries as Jira worklogs. Jira features only work in the Electron desktop app, not in the plain web view on `localhost`, because secure storage and Jira API calls run in the Electron main process.

In Settings, the user enters:

- Jira base URL, for example `https://company.atlassian.net`
- Jira email
- Jira API token

Available Jira features:

- `Save Jira`: securely stores the Jira URL, email, and API token.
- `Test connection`: verifies the Jira credentials.
- `Load projects`: fetches Jira projects the user can access.
- Project filter: choose one or more projects, for example `ADP`, `ITSM`, or `KAN`.
- `Ticket filter`: optional filter on Jira summary. Leave it empty to fetch recent tickets from the selected projects.
- `Fetch tickets`: fetches Jira tickets and adds them to the app's local ticket search.
- Home search: fetched Jira tickets can be searched by issue key or title.
- Manual logging: the ticket field shows suggestions from fetched Jira tickets.
- `Sync Jira`: syncs completed, unsynced ticket entries as Jira worklogs.

Recommended workflow:

1. Enter Jira base URL, email, and API token in Settings.
2. Click `Save Jira`.
3. Click `Test connection` to verify that Jira login works.
4. Click `Load projects`.
5. Select the relevant projects.
6. Clear `Ticket filter` if you want to fetch all recent tickets from the selected projects.
7. Click `Fetch tickets`.
8. Search for a Jira ticket on the home screen or in manual logging.
9. Log time.
10. Click `Sync Jira` when completed entries should be sent to Jira.

Worklog sync works like this:

- The app sends the worklog to the Jira issue key, for example `KAN-8`.
- The worklog comment includes the app's ticket display, for example `Logged from Time Logger: KAN-8 - SSO`.
- Manual entries with today's date sync with the current time.
- Manual entries with an earlier date sync to the selected date at `09:00`.
- The date selected in the app controls which date the worklog lands on in Jira.
- Entries that have already synced to Jira are skipped.

## Jira And Secure Storage

The API token is not stored permanently in React state, `localStorage`, or README configuration. When the user saves it, the token is sent once from React through preload to the Electron main process. The main process encrypts it with Electron `safeStorage` and stores it in a local `secure-store.json` file under Electron's `userData` directory.

Security mechanisms:

- `nodeIntegration` is disabled and `contextIsolation` is enabled in the Electron window.
- React only gets access to a limited API through `window.loggerAPI` in preload.
- The Jira token can be stored and used by the main process, but is never returned to the renderer.
- The UI only shows whether a Jira API token exists, not the token value.
- Jira calls such as `jira:test-connection`, `jira:list-projects`, `jira:fetch-tickets`, and `jira:sync-worklogs` run in the main process.
- React only sends project selections, search text, or entries to the main process.
- Jira results are returned as normalized app data, for example `{ id, title, favorite }`.
- The generic secure store keys that React can read do not include `jiraApiToken`.
- `secure-store.json` is written atomically through a temporary file and rename to reduce the risk of corrupt JSON.
- If the secure store file is still corrupted, the app backs it up and starts with an empty secure store.
- Synced entries are marked with `jiraWorklogId`, `jiraWorklogSelf`, and `jiraSyncedAt`, so the same entry is not synced twice.

## Common Issues

If `npm` or `node` is not found, install Node.js LTS and open a new PowerShell window.

If `gh` is not found after installing GitHub CLI, open a new PowerShell window or use the full path:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

If port `5173` is already in use, stop the process using that port before running `npm run dev` again.
