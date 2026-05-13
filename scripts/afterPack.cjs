const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findCachedRcedit() {
  const cacheRoot = path.join(
    process.env.LOCALAPPDATA || "",
    "electron-builder",
    "Cache",
    "winCodeSign"
  );

  if (!fs.existsSync(cacheRoot)) return null;

  const candidates = fs
    .readdirSync(cacheRoot)
    .map((dir) => path.join(cacheRoot, dir, "rcedit-x64.exe"))
    .filter((file) => fs.existsSync(file));

  return candidates.at(-1) || null;
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const projectDir = context.packager.projectDir;
  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(projectDir, "build", "icon.ico");
  const rceditPath =
    findCachedRcedit() ||
    path.join(
      projectDir,
      "node_modules",
      "electron-winstaller",
      "vendor",
      "rcedit.exe"
    );

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath) || !fs.existsSync(rceditPath)) {
    return;
  }

  execFileSync(rceditPath, [exePath, "--set-icon", iconPath], {
    stdio: "inherit",
  });
};
