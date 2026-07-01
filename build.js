/**
 * Midnight Club Online - Build Script
 * Minifies CSS and JS using esbuild
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cssOnly = args.includes('--css-only');
const jsOnly = args.includes('--js-only');
const watch = args.includes('--watch');

const CSS_DIR = 'assets/css';
const JS_DIR = 'assets/js';
const DIST_DIR = 'dist';

// Ensure dist directories exist
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
if (!fs.existsSync(`${DIST_DIR}/css`)) fs.mkdirSync(`${DIST_DIR}/css`, { recursive: true });
if (!fs.existsSync(`${DIST_DIR}/js`)) fs.mkdirSync(`${DIST_DIR}/js`, { recursive: true });

// CSS files to bundle
const cssFiles = [
  'tokens.css',
  'base.css',
  'layout.css',
  'components.css',
  'utils.css'
];

// JS entry points (modules)
const jsEntries = [
  'home.js',
  'members.js',
  'members-only.js',
  'accesos.js',
  'carta.js',
  'faq.js'
];

async function buildCSS() {
  console.log('📦 Building CSS...');

  // Bundle all CSS into one file
  const cssContent = cssFiles
    .map(file => {
      const filePath = path.join(CSS_DIR, file);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      console.warn(`  ⚠️ ${file} not found`);
      return '';
    })
    .join('\n');

  // Minify with esbuild
  const result = await esbuild.transform(cssContent, {
    loader: 'css',
    minify: true,
  });

  fs.writeFileSync(`${DIST_DIR}/css/bundle.min.css`, result.code);

  const originalSize = Buffer.byteLength(cssContent, 'utf8');
  const minifiedSize = Buffer.byteLength(result.code, 'utf8');
  const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

  console.log(`  ✅ bundle.min.css (${(minifiedSize / 1024).toFixed(1)}KB, ${savings}% smaller)`);
}

async function buildJS() {
  console.log('📦 Building JS...');

  for (const entry of jsEntries) {
    const entryPath = path.join(JS_DIR, entry);
    if (!fs.existsSync(entryPath)) {
      console.warn(`  ⚠️ ${entry} not found`);
      continue;
    }

    const outfile = `${DIST_DIR}/js/${entry.replace('.js', '.min.js')}`;

    try {
      await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        minify: true,
        format: 'esm',
        outfile,
        external: ['@supabase/supabase-js'], // Loaded via CDN
      });

      const originalSize = fs.statSync(entryPath).size;
      const minifiedSize = fs.statSync(outfile).size;
      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

      console.log(`  ✅ ${entry.replace('.js', '.min.js')} (${(minifiedSize / 1024).toFixed(1)}KB, ${savings}% smaller)`);
    } catch (err) {
      console.error(`  ❌ Error building ${entry}:`, err.message);
    }
  }
}

async function build() {
  console.log('\n🚀 Midnight Club Build\n');

  const startTime = Date.now();

  if (!jsOnly) await buildCSS();
  if (!cssOnly) await buildJS();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Build complete in ${elapsed}s\n`);

  if (watch) {
    console.log('👀 Watching for changes...\n');
    // Simple watch implementation
    fs.watch(CSS_DIR, { recursive: true }, async (event, filename) => {
      if (filename?.endsWith('.css')) {
        console.log(`\n🔄 CSS changed: ${filename}`);
        await buildCSS();
      }
    });
    fs.watch(JS_DIR, { recursive: true }, async (event, filename) => {
      if (filename?.endsWith('.js')) {
        console.log(`\n🔄 JS changed: ${filename}`);
        await buildJS();
      }
    });
  }
}

build().catch(console.error);
