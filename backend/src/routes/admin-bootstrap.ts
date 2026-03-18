import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // POST /api/admin/bootstrap - Grant first admin role
  fastify.post(
    '/api/admin/bootstrap',
    {
      schema: {
        description: 'Bootstrap endpoint to grant first admin role (no auth required)',
        tags: ['admin'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            description: 'Admin role granted',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          400: {
            description: 'Admin already exists',
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
        Body: { email: string };
      }>,
      reply: FastifyReply
    ) => {
      const email = request.body.email;

      app.logger.info({ email }, 'Bootstrap endpoint called');

      // Find user by email (case-insensitive)
      const users = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.email, email.toLowerCase()))
        .limit(1);

      if (users.length === 0) {
        app.logger.warn({ email }, 'Bootstrap attempt failed - user not found');
        return reply.status(404).send({
          error: 'No account found with that email. Please sign up first.',
        });
      }

      // Check if any admin exists
      const adminExists = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.role, 'admin'))
        .limit(1);

      if (adminExists.length > 0) {
        app.logger.warn({ email }, 'Bootstrap attempt failed - admin already exists');
        return reply.status(400).send({
          error: 'An admin account already exists. This endpoint is disabled.',
        });
      }

      const user = users[0];

      // Update user role to admin
      await app.db
        .update(authSchema.user)
        .set({ role: 'admin' })
        .where(eq(authSchema.user.id, user.id));

      app.logger.info({ email, userId: user.id }, 'Admin role granted via bootstrap');

      return {
        success: true,
        message: `Admin role granted to ${email}`,
      };
    }
  );
}
