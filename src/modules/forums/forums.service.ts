import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function listForums(limit: number, offset: number) {
  const [data, total] = await Promise.all([
    prisma.forum.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, email: true, displayName: true } },
        _count: { select: { threads: true } },
      },
    }),
    prisma.forum.count(),
  ]);
  return { data, total };
}

export async function getForum(id: string) {
  const forum = await prisma.forum.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, email: true, displayName: true } },
      _count: { select: { threads: true } },
    },
  });
  if (!forum) throw new AppError(404, 'Forum not found');
  return forum;
}

export async function createForum(userId: string, title: string, description?: string | null, slug?: string | null) {
  const finalSlug = slug?.trim() || slugify(title);
  if (!finalSlug) throw new AppError(400, 'Slug could not be generated from title');
  const existing = await prisma.forum.findUnique({ where: { slug: finalSlug } });
  if (existing) throw new AppError(409, 'Forum slug already exists');
  return prisma.forum.create({
    data: {
      createdById: userId,
      title: title.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
    },
    include: {
      creator: { select: { id: true, email: true, displayName: true } },
    },
  });
}

export async function updateForum(forumId: string, userId: string, updates: { title?: string; description?: string | null }) {
  const forum = await prisma.forum.findUnique({ where: { id: forumId } });
  if (!forum) throw new AppError(404, 'Forum not found');
  if (forum.createdById !== userId) throw new AppError(403, 'Not allowed to update this forum');
  return prisma.forum.update({
    where: { id: forumId },
    data: {
      ...(updates.title !== undefined && { title: updates.title.trim() }),
      ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
    },
    include: {
      creator: { select: { id: true, email: true, displayName: true } },
    },
  });
}
