#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_ROOT = path.join(PROJECT_ROOT, 'config');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');
const MANIFEST_FILENAME = 'webp-manifest.json';
const MANIFEST_PATH = path.join(CONFIG_ROOT, MANIFEST_FILENAME);
const IMAGE_FORMATS_PATH = path.join(CONFIG_ROOT, 'image-formats.json');

let sourceExtensions;
try {
  ({ sourceExtensions } = require(IMAGE_FORMATS_PATH));
} catch (error) {
  throw new Error(`Failed to load image formats from ${IMAGE_FORMATS_PATH}: ${error.message}`);
}

if (!Array.isArray(sourceExtensions) || sourceExtensions.length === 0) {
  throw new Error('No source extensions configured for WebP conversion.');
}

const SUPPORTED_EXTENSIONS = new Set(
  sourceExtensions.map((ext) => `.${String(ext).replace(/^\./, '').toLowerCase()}`)
);

const DEFAULT_QUALITY = 80;
const DEFAULT_EFFORT = 5;

function normalizeManifestEntry(entry) {
  if (typeof entry !== 'string') {
    return null;
  }
  const trimmed = entry.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
}

async function loadManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('WebP manifest must be an array of relative paths.');
    }
    const entries = parsed
      .map(normalizeManifestEntry)
      .filter(Boolean)
      .sort();
    return { entries };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { entries: [] };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse WebP manifest: ${error.message}`);
    }
    throw error;
  }
}

async function persistManifest(manifest, previousEntries) {
  const nextEntriesSet = new Set();

  for (const entry of manifest) {
    const normalized = normalizeManifestEntry(entry);
    if (!normalized) {
      continue;
    }
    const absolutePath = path.join(PUBLIC_ROOT, normalized);
    try {
      const stats = await fs.stat(absolutePath);
      if (stats.isFile()) {
        nextEntriesSet.add(normalized);
      }
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const nextEntries = Array.from(nextEntriesSet).sort();

  if (
    previousEntries &&
    previousEntries.length === nextEntries.length &&
    previousEntries.every((entry, index) => entry === nextEntries[index])
  ) {
    return;
  }

  await fs.mkdir(CONFIG_ROOT, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(nextEntries, null, 2)}\n`);

  console.log(
    `Updated WebP manifest at ${path.relative(PROJECT_ROOT, MANIFEST_PATH)} (${nextEntries.length} entries).`
  );
}

function addManifestEntry(manifest, destinationPath) {
  if (!manifest) {
    return;
  }

  const relativeToPublic = path.relative(PUBLIC_ROOT, destinationPath);
  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    return;
  }

  const normalized = relativeToPublic.split(path.sep).join('/');
  manifest.add(normalized);
}

function printHelp() {
  const script = path.relative(process.cwd(), __filename);
  console.log(`Usage: node ${script} [options] [source] [destination]\n` +
    'Automatically convert raster images to optimized WebP files.\n\n' +
    'Positional arguments:\n' +
    '  source        Directory (or file) to process. Defaults to "public".\n' +
    '  destination   Optional output directory. Defaults to the source path.\n\n' +
    'Options:\n' +
    '  -s, --src <path>          Source directory or file to process.\n' +
    '  -d, --dest <path>         Destination directory for WebP files.\n' +
    '  -q, --quality <1-100>     Quality setting (default: 80).\n' +
    '      --alpha-quality <0-100> Quality for alpha channel (default: inherit quality).\n' +
    '      --effort <0-9>        CPU effort to spend on compression (default: 5).\n' +
    '      --lossless            Use lossless WebP compression.\n' +
    '      --near-lossless       Enable near-lossless mode (implies lossless).\n' +
    '  -f, --force               Re-create WebP files even if up to date.\n' +
    '      --dry-run             Show planned work without writing files.\n' +
    '  -v, --verbose             Print skipped files.\n' +
    `      --list-formats        Show supported source formats.\n` +
    '  -h, --help                Show this message.\n');
}

function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    src: 'public',
    dest: null,
    quality: DEFAULT_QUALITY,
    alphaQuality: null,
    effort: DEFAULT_EFFORT,
    lossless: false,
    nearLossless: false,
    force: false,
    dryRun: false,
    verbose: false
  };
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case '-s':
      case '--src':
        if (i + 1 >= args.length) throw new Error(`${arg} requires a value`);
        options.src = args[++i];
        break;
      case '-d':
      case '--dest':
      case '--out':
      case '--output':
        if (i + 1 >= args.length) throw new Error(`${arg} requires a value`);
        options.dest = args[++i];
        break;
      case '-q':
      case '--quality': {
        if (i + 1 >= args.length) throw new Error(`${arg} requires a value`);
        const quality = Number(args[++i]);
        if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
          throw new Error('Quality must be a number between 1 and 100');
        }
        options.quality = Math.round(quality);
        break;
      }
      case '--alpha-quality': {
        if (i + 1 >= args.length) throw new Error(`${arg} requires a value`);
        const alpha = Number(args[++i]);
        if (!Number.isFinite(alpha) || alpha < 0 || alpha > 100) {
          throw new Error('Alpha quality must be a number between 0 and 100');
        }
        options.alphaQuality = Math.round(alpha);
        break;
      }
      case '--effort': {
        if (i + 1 >= args.length) throw new Error(`${arg} requires a value`);
        const effort = Number(args[++i]);
        if (!Number.isFinite(effort) || effort < 0 || effort > 9) {
          throw new Error('Effort must be a number between 0 and 9');
        }
        options.effort = Math.round(effort);
        break;
      }
      case '--lossless':
        options.lossless = true;
        break;
      case '--near-lossless':
        options.nearLossless = true;
        options.lossless = true;
        break;
      case '-f':
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '--list-formats': {
        const formats = Array.from(SUPPORTED_EXTENSIONS)
          .map((ext) => ext.replace(/^\./, ''))
          .sort()
          .join(', ');
        console.log(`Supported formats: ${formats}`);
        process.exit(0);
        break;
      }
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.src = positional[0];
  }
  if (positional.length > 1) {
    options.dest = positional[1];
  }

  const resolvedSrc = path.resolve(options.src);
  const resolvedDest = options.dest ? path.resolve(options.dest) : null;

  return {
    ...options,
    src: resolvedSrc,
    dest: resolvedDest,
    outputRoot: resolvedDest ?? resolvedSrc
  };
}

async function ensureDirectoryExists(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function shouldSkipConversion(sourcePath, targetPath, { force }) {
  if (force) return false;

  try {
    const [sourceStats, targetStats] = await Promise.all([
      fs.stat(sourcePath),
      fs.stat(targetPath)
    ]);
    return targetStats.mtimeMs >= sourceStats.mtimeMs;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function convertFile(sourcePath, relativePath, options, counters, manifest) {
  const parsed = path.parse(relativePath);
  const destinationDir = path.join(options.outputRoot, parsed.dir);
  const destinationPath = path.join(destinationDir, `${parsed.name}.webp`);

  if (await shouldSkipConversion(sourcePath, destinationPath, options)) {
    counters.skipped += 1;
    addManifestEntry(manifest, destinationPath);
    if (options.verbose) {
      console.log(`Skipping up-to-date file: ${relativePath}`);
    }
    return;
  }

  if (options.dryRun) {
    counters.converted += 1;
    console.log(`[dry-run] ${relativePath} -> ${path.relative(options.outputRoot, destinationPath)}`);
    return;
  }

  await ensureDirectoryExists(destinationDir);

  const webpOptions = {
    effort: options.effort,
    smartSubsample: true
  };

  if (!options.lossless) {
    webpOptions.quality = options.quality;
  } else {
    webpOptions.lossless = true;
    if (options.nearLossless) {
      webpOptions.nearLossless = true;
    }
  }

  if (options.alphaQuality !== null) {
    webpOptions.alphaQuality = options.alphaQuality;
  } else if (!options.lossless) {
    webpOptions.alphaQuality = Math.min(100, Math.max(0, options.quality));
  }

  try {
    await sharp(sourcePath).rotate().webp(webpOptions).toFile(destinationPath);
    counters.converted += 1;
    console.log(`Converted ${relativePath} -> ${path.relative(options.outputRoot, destinationPath)}`);
    addManifestEntry(manifest, destinationPath);
  } catch (error) {
    counters.failed += 1;
    console.error(`Failed to convert ${relativePath}:`, error.message);
  }
}

async function walkDirectory(currentPath, basePath, options, counters, manifest) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(entryPath, basePath, options, counters, manifest);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    const relativePath = path.relative(basePath, entryPath);
    await convertFile(entryPath, relativePath, options, counters, manifest);
  }
}

async function processPath(options, manifest) {
  const counters = { converted: 0, skipped: 0, failed: 0 };
  const stats = await fs.stat(options.src).catch(() => null);

  if (!stats) {
    throw new Error(`Source path not found: ${options.src}`);
  }

  if (options.dest) {
    await ensureDirectoryExists(options.outputRoot);
  }

  if (stats.isDirectory()) {
    await walkDirectory(options.src, options.src, options, counters, manifest);
  } else if (stats.isFile()) {
    const ext = path.extname(options.src).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file type: ${ext || 'unknown'}`);
    }
    await convertFile(options.src, path.basename(options.src), options, counters, manifest);
  } else {
    throw new Error('Source path must be a file or directory');
  }

  return counters;
}

async function main() {
  try {
    const options = parseArguments();
    const { entries: previousManifestEntries } = await loadManifest();
    const manifest = new Set(previousManifestEntries);
    const counters = await processPath(options, manifest);
    await persistManifest(manifest, previousManifestEntries);

    const summary = [`Converted: ${counters.converted}`];
    summary.push(`Skipped: ${counters.skipped}`);
    if (counters.failed > 0) {
      summary.push(`Failed: ${counters.failed}`);
    }

    console.log(`Done. ${summary.join(', ')}`);

    if (counters.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
