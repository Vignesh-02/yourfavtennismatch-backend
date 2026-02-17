import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth.middleware';

const createPostSchema = z.object({
  body: z.string().min(1).max(10000),
});
const updatePostSchema = z.object({
  body: z.string().min(1).max(10000),
});

export async function postsCreateRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>('/:id/posts', {
    preHandler: requireAuth,
    handler: async (req, reply) => {
      const threadId = req.params.id;
      const userId = req.user!.id;
      const thread = await prisma.thread.findUnique({ where: { id: threadId } });
      if (!thread) throw new AppError(404, 'Thread not found');
      const body = createPostSchema.parse(req.body);
      const post = await prisma.post.create({
        data: {
          threadId,
          authorId: userId,
          body: body.body.trim(),
        },
        include: {
          author: { select: { id: true, email: true, displayName: true } },
        },
      });
      return reply.code(201).send(post);
    },
  });
}

export async function postsUpdateRoutes(app: FastifyInstance): Promise<void> {
  app.patch<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
    handler: async (req, reply) => {
      const postId = req.params.id;
      const userId = req.user!.id;
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new AppError(404, 'Post not found');
      if (post.authorId !== userId) throw new AppError(403, 'Not allowed to edit this post');
      const body = updatePostSchema.parse(req.body);
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { body: body.body.trim() },
        include: {
          author: { select: { id: true, email: true, displayName: true } },
        },
      });
      return reply.send(updated);
    },
  });
}
