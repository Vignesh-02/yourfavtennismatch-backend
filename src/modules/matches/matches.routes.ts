import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

export async function matchesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          tournamentId: { type: 'string' },
          year: { type: 'integer' },
          bestOf: { type: 'integer', enum: [3, 5] },
          isFinal: { type: 'string', enum: ['true', 'false'] },
          category: { type: 'string' },
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
              items: { type: 'object' },
            },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const q = req.query as {
        tournamentId?: string;
        year?: string;
        bestOf?: string;
        isFinal?: string;
        category?: string;
        limit?: string;
        offset?: string;
      };
      const where: {
        tournamentId?: string;
        year?: number;
        bestOf?: number;
        isFinal?: boolean;
        category?: string;
      } = {};
      if (q.tournamentId) where.tournamentId = q.tournamentId;
      if (q.year !== undefined) where.year = parseInt(q.year, 10);
      if (q.bestOf !== undefined) where.bestOf = parseInt(q.bestOf, 10) as 3 | 5;
      if (q.isFinal !== undefined) where.isFinal = q.isFinal === 'true';
      if (q.category) where.category = q.category;
      const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
      const offset = parseInt(q.offset ?? '0', 10) || 0;
      const data = await prisma.match.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        include: {
          tournament: { select: { id: true, name: true, slug: true, isGrandSlam: true } },
          player1: { select: { id: true, name: true, slug: true, countryCode: true } },
          player2: { select: { id: true, name: true, slug: true, countryCode: true } },
        },
      });
      return reply.send({ data });
    },
  });

  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object' } },
    },
    handler: async (req, reply) => {
      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        include: {
          tournament: true,
          player1: true,
          player2: true,
        },
      });
      if (!match) throw new AppError(404, 'Match not found');
      return reply.send(match);
    },
  });
}
