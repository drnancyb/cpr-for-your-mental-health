import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, ilike } from 'drizzle-orm';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

const ADMIN_SECRET = 'CPR-ADMIN-2024';

export function register(app: App, fastify: FastifyInstance) {
  // POST /api/admin/force-promote - Promote user to admin with secret
  fastify.post(
    '/api/admin/force-promote',
    {
      schema: {
        description: 'Force promote a user to admin role with secret authentication',
        tags: ['admin'],
        body: {
          type: 'object',
          required: ['email', 'secret'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            secret: { type: 'string', description: 'Admin secret token' },
          },
        },
        response: {
          200: {
            description: 'User promoted to admin',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              userId: { type: 'string' },
              email: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden - invalid secret',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { email: string; secret: string };
      }>,
      reply: FastifyReply
    ) => {
      const { email, secret } = request.body;

      app.logger.info({ email }, 'Force-promote endpoint called');

      // Check secret
      if (secret !== ADMIN_SECRET) {
        app.logger.warn({ email }, 'Force-promote rejected - invalid secret');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Find user by email (case-insensitive)
      const users = await app.db
        .select()
        .from(authSchema.user)
        .where(ilike(authSchema.user.email, email))
        .limit(1);

      if (users.length === 0) {
        app.logger.warn({ email }, 'Force-promote failed - user not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      const user = users[0];

      // Update user role to admin
      await app.db
        .update(authSchema.user)
        .set({ role: 'admin' })
        .where(eq(authSchema.user.id, user.id));

      app.logger.info({ email, userId: user.id }, 'User promoted to admin via force-promote');

      return {
        success: true,
        message: 'User promoted to admin',
        userId: user.id,
        email: user.email,
      };
    }
  );

  // POST /api/admin/bootstrap - Promote user to admin with secret (can be called multiple times)
  fastify.post(
    '/api/admin/bootstrap',
    {
      schema: {
        description: 'Bootstrap endpoint to grant admin role with secret authentication',
        tags: ['admin'],
        body: {
          type: 'object',
          required: ['email', 'secret'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email address' },
            secret: { type: 'string', description: 'Admin secret token' },
          },
        },
        response: {
          200: {
            description: 'Admin role granted',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              userId: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden - invalid secret',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            description: 'User not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { email: string; secret: string };
      }>,
      reply: FastifyReply
    ) => {
      const { email, secret } = request.body;

      app.logger.info({ email }, 'Bootstrap endpoint called');

      // Check secret
      if (secret !== ADMIN_SECRET) {
        app.logger.warn({ email }, 'Bootstrap rejected - invalid secret');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Find user by email (case-insensitive)
      const users = await app.db
        .select()
        .from(authSchema.user)
        .where(ilike(authSchema.user.email, email))
        .limit(1);

      if (users.length === 0) {
        app.logger.warn({ email }, 'Bootstrap failed - user not found');
        return reply.status(404).send({ error: 'User not found' });
      }

      const user = users[0];

      // Update user role to admin (always safe, can be called multiple times)
      await app.db
        .update(authSchema.user)
        .set({ role: 'admin' })
        .where(eq(authSchema.user.id, user.id));

      app.logger.info({ email, userId: user.id }, 'Admin role granted via bootstrap');

      return {
        success: true,
        userId: user.id,
        email: user.email,
        role: 'admin',
      };
    }
  );
}
