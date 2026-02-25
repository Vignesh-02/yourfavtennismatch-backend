import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/client';
import { AppError } from '../lib/errors';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid Authorization header');
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) throw new AppError(401, 'User not found');
    req.user = user;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'Invalid or expired token');
    }
    throw err;
  }
}
