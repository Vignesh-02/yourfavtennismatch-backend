import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth.middleware';

const createThreadSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(10000).optional(),
});

export async function threadsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const thread = await prisma.thread.findUnique({
      where: { id: req.params.id },
      include: {
        forum: true,
        author: { select: { id: true, email: true, displayName: true } },
      },
    });
    if (!thread) throw new AppError(404, 'Thread not found');
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
    const offset = parseInt(q.offset ?? '0', 10) || 0;
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { threadId: thread.id },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.post.count({ where: { threadId: thread.id } }),
    ]);
    return reply.send({ ...thread, posts, postsTotal: total });
  });
}
