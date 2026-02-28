import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding. Set it in .env');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface PlayerData {
  name: string;
  slug: string;
  countryCode: string;
}

interface TournamentData {
  name: string;
  slug: string;
  isGrandSlam: boolean;
}

interface MatchData {
  tournamentSlug: string;
  year: number;
  round: string;
  isFinal: boolean;
  bestOf: number;
  category: string;
  player1Slug: string;
  player2Slug: string;
  score: string;
  title: string;
}

const dataDir = path.join(__dirname, 'data');
const players: PlayerData[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8'));
const tournaments: TournamentData[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'tournaments.json'), 'utf-8'));
const matches: MatchData[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'matches.json'), 'utf-8'));

async function main() {
  // Delete everything in reverse dependency order
  console.log('Clearing existing data...');
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.tournament.deleteMany();

  console.log(`Seeding ${tournaments.length} tournaments...`);
  const tournamentMap = new Map<string, string>();
  for (const t of tournaments) {
    const record = await prisma.tournament.create({
      data: { name: t.name, slug: t.slug, isGrandSlam: t.isGrandSlam },
    });
    tournamentMap.set(t.slug, record.id);
  }

  console.log(`Seeding ${players.length} players...`);
  const playerMap = new Map<string, string>();
  for (const p of players) {
    const record = await prisma.player.create({
      data: { name: p.name, slug: p.slug, countryCode: p.countryCode },
    });
    playerMap.set(p.slug, record.id);
  }

  console.log(`Seeding ${matches.length} matches...`);
  let skipped = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const tournamentId = tournamentMap.get(m.tournamentSlug);
    const player1Id = playerMap.get(m.player1Slug);
    const player2Id = playerMap.get(m.player2Slug);

    if (!tournamentId || !player1Id || !player2Id) {
      console.warn(`Skipping match ${i}: missing reference (tournament=${m.tournamentSlug}, p1=${m.player1Slug}, p2=${m.player2Slug})`);
      skipped++;
      continue;
    }

    await prisma.match.create({
      data: {
        tournamentId,
        year: m.year,
        round: m.round,
        isFinal: m.isFinal,
        bestOf: m.bestOf,
        category: m.category,
        player1Id,
        player2Id,
        score: m.score,
        title: m.title,
      },
    });
  }
  console.log(`Created ${matches.length - skipped} matches (skipped ${skipped}).`);

  console.log('Seed completed: tournaments, players, and matches created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
