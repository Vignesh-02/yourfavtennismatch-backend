import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import * as rankingsService from './rankings.service';

const matchIdsSchema = z.object({ matchIds: z.array(z.string().uuid()).min(1).max(10) });
const matchIdsSchema5 = z.object({ matchIds: z.array(z.string().uuid()).min(1).max(5) });
const playerIdsSchema = z.object({ playerIds: z.array(z.string().uuid()).min(1).max(10) });

export async function rankingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/best-of-5', async (req, reply) => {
    const userId = req.user!.id;
    const data = await rankingsService.getBestOf5Ranking(userId);
    return reply.send({ data });
  });

  app.put('/best-of-5', {
    schema: {
      body: { type: 'object', required: ['matchIds'], properties: { matchIds: { type: 'array', items: { type: 'string' } } } },
    },
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = matchIdsSchema.parse(req.body);
      const data = await rankingsService.setBestOf5Ranking(userId, body.matchIds);
      return reply.send({ data });
    },
  });

  app.get('/best-of-3', async (req, reply) => {
    const userId = req.user!.id;
    const data = await rankingsService.getBestOf3Ranking(userId);
    return reply.send({ data });
  });

  app.put('/best-of-3', {
    schema: {
      body: { type: 'object', required: ['matchIds'], properties: { matchIds: { type: 'array', items: { type: 'string' } } } },
    },
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = matchIdsSchema.parse(req.body);
      const data = await rankingsService.setBestOf3Ranking(userId, body.matchIds);
      return reply.send({ data });
    },
  });

  app.get('/players', async (req, reply) => {
    const userId = req.user!.id;
    const data = await rankingsService.getPlayersRanking(userId);
    return reply.send({ data });
  });

  app.put('/players', {
    schema: {
      body: { type: 'object', required: ['playerIds'], properties: { playerIds: { type: 'array', items: { type: 'string' } } } },
    },
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = playerIdsSchema.parse(req.body);
      const data = await rankingsService.setPlayersRanking(userId, body.playerIds);
      return reply.send({ data });
    },
  });

  app.get('/grand-slam-finals', async (req, reply) => {
    const userId = req.user!.id;
    const data = await rankingsService.getGrandSlamFinalsRanking(userId);
    return reply.send({ data });
  });

  app.put('/grand-slam-finals', {
    schema: {
      body: { type: 'object', required: ['matchIds'], properties: { matchIds: { type: 'array', items: { type: 'string' } } } },
    },
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = matchIdsSchema5.parse(req.body);
      const data = await rankingsService.setGrandSlamFinalsRanking(userId, body.matchIds);
      return reply.send({ data });
    },
  });
}
