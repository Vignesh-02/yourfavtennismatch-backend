import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      displayName: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}
