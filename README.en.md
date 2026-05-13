# Time Logger

A local React/Electron app for time tracking.

Norwegian setup guide: [README.md](README.md)

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

## Common Issues

If `npm` or `node` is not found, install Node.js LTS and open a new PowerShell window.

If `gh` is not found after installing GitHub CLI, open a new PowerShell window or use the full path:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

If port `5173` is already in use, stop the process using that port before running `npm run dev` again.
