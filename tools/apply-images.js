#!/usr/bin/env node
/* =========================================================================
   apply-images.js — swap screenshot placeholders for real <img> tags
   =========================================================================

   Every placeholder in the site carries the exact <img> tag it should become,
   in an HTML comment directly above it. This script finds those comments,
   checks whether the referenced file actually exists, and if it does, swaps
   the placeholder for the real tag.

   Run it from the project root:

       node tools/apply-images.js          # show what would change
       node tools/apply-images.js --write  # actually change the files

   It is safe to run repeatedly. Placeholders whose image is missing are left
   exactly as they are and reported, so you can add files a few at a time.
   ========================================================================= */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');

const PAGES = [
  'index.html',
  'work/index.html',
  'work/permanent-guru/index.html',
  'work/massage4you/index.html',
  'work/stin-tattoo-studio/index.html',
  'work/beauty-massage/index.html',
  'work/migrona/index.html'
];

// <!-- Replace with: <img src="..." ...> -->  followed by the placeholder span
const PATTERN =
  /([ \t]*)<!--\s*Replace with:\s*(<img\s+[^>]*?>)\s*-->\s*\r?\n[ \t]*<span class="mono"[^>]*>\[[^\]]*\]<\/span>/g;

let applied = 0, missing = 0, already = 0;
const missingList = [];

PAGES.forEach(rel => {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(PATTERN, (match, indent, imgTag) => {
    const src = (imgTag.match(/src="([^"]+)"/) || [])[1];
    if (!src) return match;

    // Resolve the image path relative to the page that references it
    const pageDir = path.dirname(file);
    const abs = path.resolve(pageDir, src);

    if (!fs.existsSync(abs)) {
      missing++;
      missingList.push('  ' + rel + '  ->  ' + src);
      return match; // leave the placeholder untouched
    }
    applied++;
    return indent + imgTag;
  });

  // Count placeholders already converted (an <img> inside a .shot)
  already += (html.match(/<div class="shot"[^>]*>\s*<img/g) || []).length;

  if (html !== before) {
    if (WRITE) {
      fs.writeFileSync(file, html);
      console.log('updated  ' + rel);
    } else {
      console.log('would update  ' + rel);
    }
  }
});

console.log('');
console.log('images found and applied : ' + applied);
console.log('placeholders still empty : ' + missing);
if (missingList.length) {
  console.log('\nStill waiting on these files:');
  console.log([...new Set(missingList)].join('\n'));
}
if (!WRITE && applied > 0) {
  console.log('\nDry run. Re-run with --write to apply.');
}
if (applied === 0 && missing > 0) {
  console.log('\nNothing to do yet — drop the files into images/work/ first.');
  console.log('Naming: <slug>-cover.jpg, <slug>-hero.jpg, <slug>-01/02/03.jpg');
  console.log('Slugs:  permanent-guru, massage4you, stin-tattoo, beauty-massage, migrona');
}
