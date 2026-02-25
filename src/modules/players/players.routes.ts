import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

export async function playersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
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
                  countryCode: { type: 'string' },
                  slug: { type: 'string' },
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
      const q = req.query as { search?: string; limit?: string; offset?: string };
      const where: { OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { slug: { contains: string; mode: 'insensitive' } }> } = {};
      if (q.search?.trim()) {
        const term = q.search.trim();
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
        ];
      }
      const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
      const offset = parseInt(q.offset ?? '0', 10) || 0;
      const data = await prisma.player.findMany({
        where: where.OR?.length ? where : undefined,
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
            countryCode: { type: 'string' },
            slug: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const player = await prisma.player.findUnique({
        where: { id: req.params.id },
      });
      if (!player) throw new AppError(404, 'Player not found');
      return reply.send(player);
    },
  });
}
