import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

export async function tournamentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          isGrandSlam: { type: 'string', enum: ['true', 'false'] },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          offset: { type: 'integer', minimum: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  isGrandSlam: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const q = req.query as { isGrandSlam?: string; limit?: string; offset?: string };
      const where: { isGrandSlam?: boolean } = {};
      if (q.isGrandSlam !== undefined) where.isGrandSlam = q.isGrandSlam === 'true';
      const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
      const offset = parseInt(q.offset ?? '0', 10) || 0;
      const data = await prisma.tournament.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      });
      return reply.send({ data });
    },
  });

  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            isGrandSlam: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const tournament = await prisma.tournament.findUnique({
        where: { id: req.params.id },
      });
      if (!tournament) throw new AppError(404, 'Tournament not found');
      return reply.send(tournament);
    },
  });
}
