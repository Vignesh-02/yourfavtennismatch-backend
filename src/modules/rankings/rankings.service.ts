import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

const MEN_SINGLES = 'men_singles';

export async function getBestOf5Ranking(userId: string) {
  const rows = await prisma.userTop10BestOf5Match.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: { match: { include: { tournament: true, player1: true, player2: true } } },
  });
  return rows.map((r) => ({ position: r.position, match: r.match }));
}

export async function setBestOf5Ranking(userId: string, matchIds: string[]) {
  if (matchIds.length > 10) throw new AppError(400, 'At most 10 matches allowed');
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, bestOf: 5 },
    include: { tournament: true },
  });
  const foundIds = new Set(matches.map((m) => m.id));
  const missing = matchIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) throw new AppError(400, `Invalid or not best-of-5 match IDs: ${missing.join(', ')}`);
  if (matches.length !== matchIds.length) throw new AppError(400, 'Duplicate match IDs or invalid IDs');

  await prisma.$transaction([
    prisma.userTop10BestOf5Match.deleteMany({ where: { userId } }),
    ...matchIds.map((matchId, i) =>
      prisma.userTop10BestOf5Match.create({
        data: { userId, matchId, position: i + 1 },
      })
    ),
  ]);
  return getBestOf5Ranking(userId);
}

export async function getBestOf3Ranking(userId: string) {
  const rows = await prisma.userTop10BestOf3Match.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: { match: { include: { tournament: true, player1: true, player2: true } } },
  });
  return rows.map((r) => ({ position: r.position, match: r.match }));
}

export async function setBestOf3Ranking(userId: string, matchIds: string[]) {
  if (matchIds.length > 10) throw new AppError(400, 'At most 10 matches allowed');
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, bestOf: 3, category: MEN_SINGLES },
    include: { tournament: true },
  });
  const foundIds = new Set(matches.map((m) => m.id));
  const missing = matchIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) throw new AppError(400, `Invalid or not best-of-3 men's singles match IDs: ${missing.join(', ')}`);
  if (matches.length !== matchIds.length) throw new AppError(400, 'Duplicate match IDs or invalid IDs');

  await prisma.$transaction([
    prisma.userTop10BestOf3Match.deleteMany({ where: { userId } }),
    ...matchIds.map((matchId, i) =>
      prisma.userTop10BestOf3Match.create({
        data: { userId, matchId, position: i + 1 },
      })
    ),
  ]);
  return getBestOf3Ranking(userId);
}

export async function getPlayersRanking(userId: string) {
  const rows = await prisma.userTop10Player.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: { player: true },
  });
  return rows.map((r) => ({ position: r.position, player: r.player }));
}

export async function setPlayersRanking(userId: string, playerIds: string[]) {
  if (playerIds.length > 10) throw new AppError(400, 'At most 10 players allowed');
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  const foundIds = new Set(players.map((p) => p.id));
  const missing = playerIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) throw new AppError(400, `Invalid player IDs: ${missing.join(', ')}`);
  if (players.length !== playerIds.length) throw new AppError(400, 'Duplicate or invalid player IDs');

  await prisma.$transaction([
    prisma.userTop10Player.deleteMany({ where: { userId } }),
    ...playerIds.map((playerId, i) =>
      prisma.userTop10Player.create({
        data: { userId, playerId, position: i + 1 },
      })
    ),
  ]);
  return getPlayersRanking(userId);
}

export async function getGrandSlamFinalsRanking(userId: string) {
  const rows = await prisma.userTop5GrandSlamFinal.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    include: { match: { include: { tournament: true, player1: true, player2: true } } },
  });
  return rows.map((r) => ({ position: r.position, match: r.match }));
}

export async function setGrandSlamFinalsRanking(userId: string, matchIds: string[]) {
  if (matchIds.length > 5) throw new AppError(400, 'At most 5 Grand Slam finals allowed');
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, isFinal: true },
    include: { tournament: true },
  });
  const valid = matches.filter((m) => m.tournament.isGrandSlam);
  const validIds = new Set(valid.map((m) => m.id));
  const missing = matchIds.filter((id) => !validIds.has(id));
  if (missing.length > 0) throw new AppError(400, `Invalid or not Grand Slam final match IDs: ${missing.join(', ')}`);
  if (valid.length !== matchIds.length) throw new AppError(400, 'Duplicate match IDs or not all are Grand Slam finals');

  await prisma.$transaction([
    prisma.userTop5GrandSlamFinal.deleteMany({ where: { userId } }),
    ...matchIds.map((matchId, i) =>
      prisma.userTop5GrandSlamFinal.create({
        data: { userId, matchId, position: i + 1 },
      })
    ),
  ]);
  return getGrandSlamFinalsRanking(userId);
}
