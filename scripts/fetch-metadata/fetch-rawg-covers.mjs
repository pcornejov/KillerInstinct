#!/usr/bin/env node
// Fetches game cover art from the RAWG.io public games API and writes the
// result into each game's `coverImage` frontmatter field. Requires a RAWG
// API key in the RAWG_API_KEY environment variable (never committed to the
// repo). Run manually: RAWG_API_KEY=xxx node scripts/fetch-metadata/fetch-rawg-covers.mjs
//
// Uses direct RAWG slug lookups (verified by hand against api.rawg.io) rather
// than fuzzy search, since RAWG's search ranking can match the wrong game
// when multiple Killer Instinct entries share very similar titles (e.g. the
// 1994 arcade original and the 2013 reboot are both just called "Killer
// Instinct" on RAWG).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

try {
  process.loadEnvFile(path.join(import.meta.dirname, '../../.env'));
} catch {
  // .env is optional; RAWG_API_KEY may already be set in the environment.
}

const apiKey = process.env.RAWG_API_KEY;
if (!apiKey) {
  console.error('Missing RAWG_API_KEY environment variable.');
  process.exit(1);
}

const gamesDir = path.join(import.meta.dirname, '../../src/content/games');

// Verified via `curl https://api.rawg.io/api/games/<slug>` — only include an
// entry here once you've confirmed it's the correct game and has an image.
// `null` means "no reliable free RAWG match, leave the styled placeholder".
const rawgSlugs = {
  'ki-1994': 'killer-instinct-1994',
  'ki2-1996': null,
  'ki-gold-1996': 'killer-instinct-gold',
  'ki-2013': 'killer-instinct',
};

async function fetchRawgGame(slug) {
  const url = `https://api.rawg.io/api/games/${slug}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG lookup failed for "${slug}": ${res.status}`);
  return res.json();
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter found');
  return { frontmatter: match[1], body: match[2] };
}

function removeCoverImage(frontmatter) {
  return frontmatter.replace(/coverImage:\n(?:[ \t]+.+\n?)*/m, '');
}

async function main() {
  const files = (await readdir(gamesDir)).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const filePath = path.join(gamesDir, file);
    const raw = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);

    const rawgSlug = rawgSlugs[slug];
    if (!rawgSlug) {
      console.log(`${slug}: no verified RAWG match configured, ensuring no coverImage is set.`);
      const cleaned = removeCoverImage(frontmatter);
      if (cleaned !== frontmatter) {
        await writeFile(filePath, `---\n${cleaned}\n---\n${body}`, 'utf-8');
      }
      continue;
    }

    console.log(`${slug}: fetching RAWG entry "${rawgSlug}"...`);
    const game = await fetchRawgGame(rawgSlug);

    if (!game.id || !game.background_image) {
      console.log(`  No usable image for ${slug} (RAWG id ${game.id ?? 'n/a'}), leaving placeholder.`);
      continue;
    }

    console.log(`  Matched RAWG id ${game.id} "${game.name}" (released ${game.released})`);

    const coverImageBlock = [
      'coverImage:',
      `  url: "${game.background_image}"`,
      `  attribution: "Imagen vía RAWG.io"`,
      `  license: "Cortesía de RAWG.io (API pública de videojuegos)"`,
      `  sourceUrl: "https://rawg.io/games/${game.slug}"`,
    ].join('\n');

    const withoutOld = removeCoverImage(frontmatter);
    const newFrontmatter = `${withoutOld.replace(/\n+$/, '')}\n${coverImageBlock}`;

    await writeFile(filePath, `---\n${newFrontmatter}\n---\n${body}`, 'utf-8');
    console.log(`  Updated ${file}`);

    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
