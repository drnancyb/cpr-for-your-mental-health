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

      // Validate required fields
      if (!email || !password) {
        app.logger.warn({}, 'Admin login missing required fields');
        return reply.status(400).send({ success: false, error: 'Missing email or password' });
      }

      app.logger.info({ email }, 'Admin login attempt');

      try {
        // Query user table for admin with this email
        const users = await app.db
          .select()
          .from(authSchema.user)
          .where(and(
            ilike(authSchema.user.email, email),
            eq(authSchema.user.role, 'admin')
          ))
          .limit(1);

        if (users.length === 0) {
          app.logger.warn({ email }, 'Admin login failed - admin user not found');
          return reply.status(401).send({ success: false, error: 'Invalid credentials' });
        }

        const user = users[0];

        // Look up credential account for this user
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

        if (accounts.length === 0 || !accounts[0].password) {
          app.logger.warn({ userId: user.id, email }, 'Admin login failed - no credential account');
          return reply.status(401).send({ success: false, error: 'Invalid credentials' });
        }

        const account = accounts[0];

        // Verify password
        const passwordMatch = await compare(password, account.password);
        if (!passwordMatch) {
          app.logger.warn({ userId: user.id, email }, 'Admin login failed - invalid password');
          return reply.status(401).send({ success: false, error: 'Invalid credentials' });
        }

        // Create session with token
        const sessionId = randomUUID();
        const sessionToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await app.db.insert(authSchema.session).values({
          id: sessionId,
          token: sessionToken,
          userId: user.id,
          expiresAt,
        });

        app.logger.info({ userId: user.id, email }, 'Admin login successful');

        return reply.status(200).send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          },
          token: sessionToken,
        });
      } catch (err) {
        app.logger.error({ err, email }, 'Admin login error');
        return reply.status(500).send({ success: false, error: 'Internal server error' });
      }
    }
  );
}
