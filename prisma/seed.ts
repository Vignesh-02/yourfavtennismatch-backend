import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tournaments = await Promise.all([
    prisma.tournament.upsert({
      where: { slug: 'wimbledon' },
      update: {},
      create: { name: 'Wimbledon', slug: 'wimbledon', isGrandSlam: true },
    }),
    prisma.tournament.upsert({
      where: { slug: 'us-open' },
      update: {},
      create: { name: 'US Open', slug: 'us-open', isGrandSlam: true },
    }),
    prisma.tournament.upsert({
      where: { slug: 'australian-open' },
      update: {},
      create: { name: 'Australian Open', slug: 'australian-open', isGrandSlam: true },
    }),
    prisma.tournament.upsert({
      where: { slug: 'french-open' },
      update: {},
      create: { name: 'French Open', slug: 'french-open', isGrandSlam: true },
    }),
    prisma.tournament.upsert({
      where: { slug: 'indian-wells' },
      update: {},
      create: { name: 'Indian Wells', slug: 'indian-wells', isGrandSlam: false },
    }),
  ]);

  const wimbledon = tournaments[0];
  const usOpen = tournaments[1];
  const australianOpen = tournaments[2];
  const frenchOpen = tournaments[3];
  const indianWells = tournaments[4];

  const players = await Promise.all([
    prisma.player.upsert({
      where: { slug: 'roger-federer' },
      update: {},
      create: { name: 'Roger Federer', slug: 'roger-federer', countryCode: 'SUI' },
    }),
    prisma.player.upsert({
      where: { slug: 'rafael-nadal' },
      update: {},
      create: { name: 'Rafael Nadal', slug: 'rafael-nadal', countryCode: 'ESP' },
    }),
    prisma.player.upsert({
      where: { slug: 'novak-djokovic' },
      update: {},
      create: { name: 'Novak Djokovic', slug: 'novak-djokovic', countryCode: 'SRB' },
    }),
    prisma.player.upsert({
      where: { slug: 'andy-murray' },
      update: {},
      create: { name: 'Andy Murray', slug: 'andy-murray', countryCode: 'GBR' },
    }),
    prisma.player.upsert({
      where: { slug: 'stan-wawrinka' },
      update: {},
      create: { name: 'Stan Wawrinka', slug: 'stan-wawrinka', countryCode: 'SUI' },
    }),
  ]);

  const [federer, nadal, djokovic, murray, wawrinka] = players;

  await prisma.match.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tournamentId: wimbledon.id,
      year: 2008,
      round: 'Final',
      isFinal: true,
      bestOf: 5,
      category: 'men_singles',
      player1Id: federer.id,
      player2Id: nadal.id,
      score: '6-4, 6-4, 6-7(5), 6-7(8), 9-7',
      title: 'Federer vs Nadal',
    },
  });

  await prisma.match.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tournamentId: australianOpen.id,
      year: 2012,
      round: 'Final',
      isFinal: true,
      bestOf: 5,
      category: 'men_singles',
      player1Id: djokovic.id,
      player2Id: nadal.id,
      score: '5-7, 6-4, 6-2, 6-7(5), 7-5',
      title: 'Djokovic vs Nadal',
    },
  });

  await prisma.match.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      tournamentId: wimbledon.id,
      year: 2019,
      round: 'Final',
      isFinal: true,
      bestOf: 5,
      category: 'men_singles',
      player1Id: djokovic.id,
      player2Id: federer.id,
      score: '7-6(5), 1-6, 7-6(4), 4-6, 13-12(3)',
      title: 'Djokovic vs Federer',
    },
  });

  await prisma.match.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      tournamentId: indianWells.id,
      year: 2022,
      round: 'Final',
      isFinal: true,
      bestOf: 3,
      category: 'men_singles',
      player1Id: nadal.id,
      player2Id: murray.id,
      score: '6-4, 6-1',
      title: 'Nadal vs Murray',
    },
  });

  await prisma.match.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      tournamentId: frenchOpen.id,
      year: 2015,
      round: 'Final',
      isFinal: true,
      bestOf: 5,
      category: 'men_singles',
      player1Id: wawrinka.id,
      player2Id: djokovic.id,
      score: '4-6, 6-4, 6-3, 6-4',
      title: 'Wawrinka vs Djokovic',
    },
  });

  console.log('Seed completed: tournaments, players, and sample matches created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
