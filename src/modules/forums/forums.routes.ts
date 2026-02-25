import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth.middleware';
import * as forumsService from './forums.service';

const createForumSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});
const updateForumSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});
const createThreadSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(10000).optional(),
});

export async function forumsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req, reply) => {
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
    const offset = parseInt(q.offset ?? '0', 10) || 0;
    const result = await forumsService.listForums(limit, offset);
    return reply.send(result);
  });

  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const forum = await forumsService.getForum(req.params.id);
    return reply.send(forum);
  });

  app.post('/', {
    preHandler: requireAuth,
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = createForumSchema.parse(req.body);
      const forum = await forumsService.createForum(
        userId,
        body.title,
        body.description,
        body.slug
      );
      return reply.code(201).send(forum);
    },
  });

  app.patch<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
    handler: async (req, reply) => {
      const userId = req.user!.id;
      const body = updateForumSchema.parse(req.body);
      const forum = await forumsService.updateForum(req.params.id, userId, body);
      return reply.send(forum);
    },
  });

  app.get<{ Params: { id: string } }>('/:id/threads', async (req, reply) => {
    const forumId = req.params.id;
    const forum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!forum) throw new AppError(404, 'Forum not found');
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.min(100, parseInt(q.limit ?? '20', 10) || 20);
    const offset = parseInt(q.offset ?? '0', 10) || 0;
    const [data, total] = await Promise.all([
      prisma.thread.findMany({
        where: { forumId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, email: true, displayName: true } },
          _count: { select: { posts: true } },
        },
      }),
      prisma.thread.count({ where: { forumId } }),
    ]);
    return reply.send({ data, total });
  });

  app.post<{ Params: { id: string } }>('/:id/threads', {
    preHandler: requireAuth,
    handler: async (req, reply) => {
      const forumId = req.params.id;
      const userId = req.user!.id;
      const forum = await prisma.forum.findUnique({ where: { id: forumId } });
      if (!forum) throw new AppError(404, 'Forum not found');
      const body = createThreadSchema.parse(req.body);
      const thread = await prisma.thread.create({
        data: {
          forumId,
          authorId: userId,
          title: body.title.trim(),
          body: body.body?.trim() || null,
        },
        include: {
          author: { select: { id: true, email: true, displayName: true } },
        },
      });
      if (body.body?.trim()) {
        await prisma.post.create({
          data: {
            threadId: thread.id,
            authorId: userId,
            body: body.body.trim(),
          },
        });
      }
      return reply.code(201).send(thread);
    },
  });
}
