import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

const MEN_SINGLES = 'men_singles';

export async function getPicks(userId: string) {
  const picks = await prisma.userPicks.findUnique({
    where: { userId },
    include: {
      favoritePlayer: true,
      favoriteBestOf5Match: { include: { tournament: true, player1: true, player2: true } },
      favoriteBestOf3Match: { include: { tournament: true, player1: true, player2: true } },
      bestGrandSlamFinal: { include: { tournament: true, player1: true, player2: true } },
    },
  });
  return picks;
}

export async function setPicks(
  userId: string,
  body: {
    favoritePlayerId?: string | null;
    favoriteBestOf5MatchId?: string | null;
    favoriteBestOf3MatchId?: string | null;
    bestGrandSlamFinalMatchId?: string | null;
  }
) {
  const updates: {
    favoritePlayerId?: string | null;
    favoriteBestOf5MatchId?: string | null;
    favoriteBestOf3MatchId?: string | null;
    bestGrandSlamFinalMatchId?: string | null;
  } = {};

  if (body.favoritePlayerId !== undefined) {
    if (body.favoritePlayerId === null) {
      updates.favoritePlayerId = null;
    } else {
      const player = await prisma.player.findUnique({ where: { id: body.favoritePlayerId } });
      if (!player) throw new AppError(400, 'Invalid favoritePlayerId');
      updates.favoritePlayerId = body.favoritePlayerId;
    }
  }

  if (body.favoriteBestOf5MatchId !== undefined) {
    if (body.favoriteBestOf5MatchId === null) {
      updates.favoriteBestOf5MatchId = null;
    } else {
      const match = await prisma.match.findUnique({ where: { id: body.favoriteBestOf5MatchId } });
      if (!match || match.bestOf !== 5) throw new AppError(400, 'Invalid or not best-of-5 match for favoriteBestOf5MatchId');
      updates.favoriteBestOf5MatchId = body.favoriteBestOf5MatchId;
    }
  }

  if (body.favoriteBestOf3MatchId !== undefined) {
    if (body.favoriteBestOf3MatchId === null) {
      updates.favoriteBestOf3MatchId = null;
    } else {
      const match = await prisma.match.findUnique({ where: { id: body.favoriteBestOf3MatchId } });
      if (!match || match.bestOf !== 3 || match.category !== MEN_SINGLES)
        throw new AppError(400, "Invalid or not best-of-3 men's singles match for favoriteBestOf3MatchId");
      updates.favoriteBestOf3MatchId = body.favoriteBestOf3MatchId;
    }
  }

  if (body.bestGrandSlamFinalMatchId !== undefined) {
    if (body.bestGrandSlamFinalMatchId === null) {
      updates.bestGrandSlamFinalMatchId = null;
    } else {
      const match = await prisma.match.findUnique({
        where: { id: body.bestGrandSlamFinalMatchId },
        include: { tournament: true },
      });
      if (!match || !match.isFinal || !match.tournament.isGrandSlam)
        throw new AppError(400, 'Invalid or not Grand Slam final for bestGrandSlamFinalMatchId');
      updates.bestGrandSlamFinalMatchId = body.bestGrandSlamFinalMatchId;
    }
  }

  const picks = await prisma.userPicks.upsert({
    where: { userId },
    create: {
      userId,
      ...updates,
    },
    update: updates,
    include: {
      favoritePlayer: true,
      favoriteBestOf5Match: { include: { tournament: true, player1: true, player2: true } },
      favoriteBestOf3Match: { include: { tournament: true, player1: true, player2: true } },
      bestGrandSlamFinal: { include: { tournament: true, player1: true, player2: true } },
    },
  });
  return picks;
}
