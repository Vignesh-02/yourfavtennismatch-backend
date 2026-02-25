import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import * as authService from './auth.service';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
          displayName: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, displayName: { type: 'string' } } },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const body = registerSchema.parse(req.body);
      const result = await authService.register(body);
      return reply.code(201).send({
        user: { id: result.user.id, email: result.user.email, displayName: result.user.displayName },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    },
  });

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, displayName: { type: 'string' } } },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body);
      return reply.send({
        user: { id: result.user.id, email: result.user.email, displayName: result.user.displayName },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    },
  });

  app.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'string' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await authService.refresh(refreshToken);
      return reply.send(result);
    },
  });

  app.post('/logout', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      response: { 204: { type: 'null' } },
    },
    handler: async (req, reply) => {
      const { refreshToken } = refreshSchema.parse(req.body);
      await authService.logout(refreshToken);
      return reply.code(204).send();
    },
  });
}
