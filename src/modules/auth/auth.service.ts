import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { AppError } from '../../lib/errors';
import { config } from '../../config';
import type { RegisterBody, LoginBody } from './auth.schema';
import type { User } from '@prisma/client';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function register(body: RegisterBody): Promise<{ user: User; accessToken: string; refreshToken: string; expiresIn: string }> {
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');

  const passwordHash = await argon2.hash(body.password);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      displayName: body.displayName ?? null,
    },
  });

  const accessToken = jwt.sign(
    { sub: user.id },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName, passwordHash: user.passwordHash, createdAt: user.createdAt, updatedAt: user.updatedAt },
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiresIn,
  };
}

export async function login(body: LoginBody): Promise<{ user: User; accessToken: string; refreshToken: string; expiresIn: string }> {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new AppError(401, 'Invalid email or password');
  const valid = await argon2.verify(user.passwordHash, body.password);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  const accessToken = jwt.sign(
    { sub: user.id },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName, passwordHash: user.passwordHash, createdAt: user.createdAt, updatedAt: user.updatedAt },
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiresIn,
  };
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
  const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string; type?: string };
  if (decoded.type !== 'refresh') throw new AppError(401, 'Invalid refresh token');

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, userId: decoded.sub },
    include: { user: true },
  });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = stored.user;
  const newAccessToken = jwt.sign(
    { sub: user.id },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
  const newRefreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: config.jwt.accessExpiresIn,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
