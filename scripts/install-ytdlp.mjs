import { closeSync, existsSync, mkdirSync, openSync, readSync, writeFileSync } from "node:fs";
import { chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function isRealBinary(p) {
  try {
    const fd = openSync(p, "r");
    const buf = Buffer.alloc(4);
    readSync(fd, buf, 0, 4, 0);
    closeSync(fd);
    const magic = buf.toString("latin1");
    return magic.startsWith("\x7fELF") || magic.startsWith("MZ");
  } catch {
    return false;
  }
}

function platformAssetName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  if (process.arch === "x64") return "yt-dlp_linux";
  if (process.arch === "arm64" || process.arch === "aarch64") {
    return "yt-dlp_linux_aarch64";
  }
  if (process.arch === "arm") return "yt-dlp_linux_armv7l";
  return "yt-dlp_linux";
}

const assetName = platformAssetName();
const binDir = path.join(root, "node_modules", "youtube-dl-exec", "bin");
const target = path.join(binDir, assetName);

if (existsSync(target) && isRealBinary(target)) {
  console.log(`[yt-dlp] standalone binary already present: ${target}`);
  process.exit(0);
}

console.log(`[yt-dlp] downloading ${assetName}...`);
const releaseRes = await fetch(
  "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
  { headers: { "User-Agent": "tracktube", Accept: "application/vnd.github+json" } }
);
if (!releaseRes.ok) throw new Error(`Could not resolve yt-dlp release: ${releaseRes.status}`);
const release = await releaseRes.json();
const asset = (release.assets || []).find((a) => a.name === assetName);
if (!asset) throw new Error(`yt-dlp asset ${assetName} not found`);

const binRes = await fetch(asset.browser_download_url);
if (!binRes.ok) throw new Error(`Could not download yt-dlp binary: ${binRes.status}`);
const bytes = Buffer.from(await binRes.arrayBuffer());

mkdirSync(binDir, { recursive: true });
writeFileSync(target, bytes);
if (process.platform !== "win32") chmodSync(target, 0o755);
console.log(`[yt-dlp] installed standalone binary (${bytes.length} bytes) to ${target}`);