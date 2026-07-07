import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const imageSchema = z.object({
  url: z.string().url(),
  attribution: z.string(),
  license: z.string(),
  sourceUrl: z.string().url(),
});

const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: z.object({
    title: z.string(),
    shortName: z.string(),
    releaseYear: z.number(),
    platforms: z.array(z.string()),
    developer: z.string(),
    publisher: z.string(),
    era: z.enum(['arcade-classic', 'n64', 'reboot-2013', 'mobile']),
    seasons: z
      .array(
        z.object({
          number: z.number(),
          title: z.string(),
          releaseYear: z.number(),
        }),
      )
      .optional(),
    summary: z.string(),
    wikipediaUrl: z.string().url().optional(),
    wikidataId: z.string().optional(),
    coverImage: imageSchema.optional(),
    order: z.number(),
  }),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/characters' }),
  schema: z.object({
    name: z.string(),
    aliases: z.array(z.string()).optional(),
    species: z.string().optional(),
    fightingStyle: z.string().optional(),
    homeStage: z.string().optional(),
    signatureMove: z.string().optional(),
    firstAppearance: reference('games'),
    appearances: z.array(
      z.object({
        game: reference('games'),
        isPlayable: z.boolean().default(true),
        isBoss: z.boolean().default(false),
        isDlc: z.boolean().default(false),
        season: z.number().optional(),
        notes: z.string().optional(),
      }),
    ),
    wikipediaUrl: z.string().url().optional(),
    image: imageSchema.optional(),
  }),
});

const mechanics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/mechanics' }),
  schema: z.object({
    title: z.string(),
    shortSummary: z.string(),
    appliesTo: z.array(reference('games')),
    category: z.enum(['offense', 'defense', 'mode', 'presentation']),
    relatedMechanics: z.array(reference('mechanics')).optional(),
    order: z.number().optional(),
  }),
});

const trivia = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trivia' }),
  schema: z.object({
    title: z.string(),
    game: reference('games').optional(),
    character: reference('characters').optional(),
    category: z.enum(['development', 'easter-egg', 'esports', 'pop-culture', 'glitch', 'design']),
    source: z.string().url(),
  }),
});

const videos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/videos' }),
  schema: z.object({
    youtubeId: z.string().length(11),
    kind: z.enum(['ultra-combo', 'no-mercy', 'combo-showcase', 'trailer', 'interview', 'other']),
    character: reference('characters').optional(),
    game: reference('games').optional(),
    title: z.string(),
    channelTitle: z.string(),
    thumbnailUrl: z.string().url(),
    oEmbedStatus: z.enum(['valid', 'invalid', 'unchecked']).default('unchecked'),
    oEmbedValidatedAt: z.string().datetime().optional(),
    sourceNote: z.string().optional(),
  }),
});

export const collections = { games, characters, mechanics, trivia, videos };
