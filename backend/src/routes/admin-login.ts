import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike } from 'drizzle-orm';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';
import { compare } from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';

export function register(app: App, fastify: FastifyInstance) {
  // POST /api/admin/login - Admin login with email and password
  fastify.post(
    '/api/admin/login',
    {
      schema: {
        description: 'Admin login with email and password (role-based)',
        tags: ['admin', 'auth'],
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
            description: 'Admin login successful',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              token: { type: 'string' },
            },
          },
          401: {
            description: 'Invalid credentials',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            description: 'Not authorized - user is not an admin',
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
        Body: { email: string; password: string };
      }>,
      reply: FastifyReply
    ) => {
      const { email, password } = request.body;

      app.logger.info({ email }, 'Admin login attempt');

      try {
        // Look up user by email (case-insensitive)
        const users = await app.db
          .select()
          .from(authSchema.user)
          .where(ilike(authSchema.user.email, email))
          .limit(1);

        if (users.length === 0) {
          app.logger.warn({ email }, 'Admin login failed - user not found');
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if user is admin
        if (user.role !== 'admin') {
          app.logger.warn(
            { userId: user.id, email },
            'Non-admin user attempted admin login'
          );
          return reply.status(403).send({ error: 'Not authorized' });
        }

        // Look up credential account (email/password)
        const accounts = await app.db
          .select()
          .from(authSchema.account)
          .where(
            and(
              eq(authSchema.account.userId, user.id),
              eq(authSchema.account.providerId, 'credential')
            )
          )
          .limit(1);

        if (accounts.length === 0) {
          app.logger.warn(
            { userId: user.id, email },
            'Admin login failed - no credential account'
          );
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const account = accounts[0];

        // Verify password using bcryptjs
        const passwordMatch = await compare(password, account.password || '');
        if (!passwordMatch) {
          app.logger.warn(
            { userId: user.id, email },
            'Admin login failed - invalid password'
          );
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // Create session with token
        const sessionId = randomUUID();
        const sessionToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await app.db.insert(authSchema.session).values({
          id: sessionId,
          token: sessionToken,
          userId: user.id,
          expiresAt,
        });

        app.logger.info(
          { userId: user.id, email },
          'Admin login successful - session created'
        );

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          },
          token: sessionToken,
        };
      } catch (err) {
        app.logger.error({ err, email }, 'Admin login error');
        throw err;
      }
    }
  );
}
