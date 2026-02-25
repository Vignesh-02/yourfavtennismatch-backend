/// <reference path="./types/fastify.d.ts" />
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from './config';
import { toHttpError } from './lib/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { tournamentsRoutes } from './modules/tournaments/tournaments.routes';
import { playersRoutes } from './modules/players/players.routes';
import { matchesRoutes } from './modules/matches/matches.routes';
import { rankingsRoutes } from './modules/rankings/rankings.routes';
import { picksRoutes } from './modules/picks/picks.routes';
import { forumsRoutes } from './modules/forums/forums.routes';
import { threadsRoutes } from './modules/forums/threads.routes';
import { postsCreateRoutes, postsUpdateRoutes } from './modules/forums/posts.routes';

async function build(): Promise<FastifyInstance> {
  const app = fastify({
    logger: config.nodeEnv === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z' } } }
      : true,
  });

  app.setErrorHandler((err, _request: FastifyRequest, reply: FastifyReply): void => {
    const { statusCode, message, code } = toHttpError(err);
    const error = err as Error & { validation?: unknown };
    if (error.validation) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
        code: 'VALIDATION_ERROR',
      });
      return;
    }
    reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
      message,
      ...(code && { code }),
    });
  });

  const apiPrefix = '/api/v1';
  await app.register(
    async (instance) => {
      instance.register(authRoutes, { prefix: '/auth' });
      instance.register(tournamentsRoutes, { prefix: '/tournaments' });
      instance.register(playersRoutes, { prefix: '/players' });
      instance.register(matchesRoutes, { prefix: '/matches' });
      instance.register(rankingsRoutes, { prefix: '/me/rankings' });
      instance.register(picksRoutes, { prefix: '/me/picks' });
      instance.register(forumsRoutes, { prefix: '/forums' });
      instance.register(threadsRoutes, { prefix: '/threads' });
      instance.register(postsCreateRoutes, { prefix: '/threads' });
      instance.register(postsUpdateRoutes, { prefix: '/posts' });
    },
    { prefix: apiPrefix }
  );

  app.get('/health', async (_req, reply) => {
    reply.send({ ok: true });
  });

  return app;
}

async function main() {
  const app = await build();
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
