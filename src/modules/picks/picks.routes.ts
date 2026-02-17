import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import * as picksService from './picks.service';

const setPicksSchema = z.object({
  favoritePlayerId: z.string().uuid().nullable().optional(),
  favoriteBestOf5MatchId: z.string().uuid().nullable().optional(),
  favoriteBestOf3MatchId: z.string().uuid().nullable().optional(),
  bestGrandSlamFinalMatchId: z.string().uuid().nullable().optional(),
});

export async function picksRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (req, reply) => {
    const userId = req.user!.id;
    const picks = await picksService.getPicks(userId);
    if (!picks) return reply.send({ data: null });
    return reply.send({ data: picks });
  });

  app.put('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          favoritePlayerId: { type: 'string', nullable: true },
          favoriteBestOf5MatchId: { type: 'string', nullable: true },
          favoriteBestOf3MatchId: { type: 'string', nullable: true },
          bestGrandSlamFinalMatchId: { type: 'string', nullable: true },
        },
      },
    },
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = setPicksSchema.parse(req.body);
      const data = await picksService.setPicks(userId, body);
      return reply.send({ data });
    },
  });
}
