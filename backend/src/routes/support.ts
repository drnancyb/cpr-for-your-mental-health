import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // Helper to authenticate via Bearer token from Authorization header
  async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      app.logger.warn({}, 'No Bearer token in Authorization header');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const token = authHeader.substring(7);
    const sessions = await app.db.select().from(authSchema.session).where(eq(authSchema.session.token, token)).limit(1);
    if (sessions.length === 0) {
      app.logger.warn({}, 'Invalid session token');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const sessionRecord = sessions[0];
    if (new Date() > sessionRecord.expiresAt) {
      app.logger.warn({ userId: sessionRecord.userId }, 'Session token expired');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const users = await app.db.select({ id: authSchema.user.id, role: authSchema.user.role }).from(authSchema.user).where(eq(authSchema.user.id, sessionRecord.userId)).limit(1);
    if (users.length === 0) {
      app.logger.warn({ userId: sessionRecord.userId }, 'User not found for valid session');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    return { user: users[0], session: sessionRecord };
  }

  // Helper to try getting user session without requiring it
  async function optionalAuth(request: FastifyRequest) {
    try {
      const session = await requireAuth(request, {} as FastifyReply);
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // Support Request Endpoints
  // ============================================

  // POST /api/support - Submit support request
  fastify.post(
    '/api/support',
    {
      schema: {
        description: 'Submit a support request',
        tags: ['support'],
        body: {
          type: 'object',
          required: ['name', 'email', 'subject', 'message'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            subject: { type: 'string' },
            message: { type: 'string' },
            role: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Support request created',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              id: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          email: string;
          subject: string;
          message: string;
          role?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const userId = await optionalAuth(request);

      app.logger.info(
        { email: request.body.email, subject: request.body.subject, userId },
        'Creating support request'
      );

      const supportRequest = await app.db
        .insert(appSchema.supportRequests)
        .values({
          userId: userId ? userId : null,
          name: request.body.name,
          email: request.body.email,
          subject: request.body.subject,
          message: request.body.message,
          role: request.body.role || 'client',
        })
        .returning();

      app.logger.info(
        { supportId: supportRequest[0].id, email: request.body.email },
        'Support request created'
      );

      return reply.status(201).send({
        success: true,
        id: supportRequest[0].id,
      });
    }
  );

  // GET /api/admin/support - Get all support requests
  fastify.get(
    '/api/admin/support',
    {
      schema: {
        description: 'Get all support requests (admin only)',
        tags: ['admin', 'support'],
        response: {
          200: {
            description: 'Support requests',
            type: 'object',
            properties: {
              requests: { type: 'array', items: { type: 'object' } },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const userRole = (auth.user?.role as string) || 'user';
      if (userRole !== 'admin') {
        app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
        reply.status(403);
        return { error: 'Forbidden' };
      }

      app.logger.info({ adminId: auth.user.id }, 'Fetching all support requests');

      const requests = await app.db
        .select()
        .from(appSchema.supportRequests)
        .orderBy(desc(appSchema.supportRequests.createdAt));

      app.logger.info({ count: requests.length }, 'Support requests retrieved');

      return { requests };
    }
  );

  // PATCH /api/admin/support/:id - Update support request status
  fastify.patch(
    '/api/admin/support/:id',
    {
      schema: {
        description: 'Update support request status (admin only)',
        tags: ['admin', 'support'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['open', 'in_progress', 'resolved'] },
          },
        },
        response: {
          200: {
            description: 'Support request updated',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: 'open' | 'in_progress' | 'resolved' };
      }>,
      reply: FastifyReply
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const userRole = (auth.user?.role as string) || 'user';
      if (userRole !== 'admin') {
        app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
        reply.status(403);
        return { error: 'Forbidden' };
      }

      app.logger.info(
        { supportId: request.params.id, status: request.body.status },
        'Updating support request status'
      );

      // Check if support request exists
      const existing = await app.db
        .select()
        .from(appSchema.supportRequests)
        .where(eq(appSchema.supportRequests.id, request.params.id))
        .limit(1);

      if (existing.length === 0) {
        app.logger.info({ supportId: request.params.id }, 'Support request not found');
        return reply.status(404).send({ error: 'Support request not found' });
      }

      const updated = await app.db
        .update(appSchema.supportRequests)
        .set({ status: request.body.status })
        .where(eq(appSchema.supportRequests.id, request.params.id))
        .returning();

      app.logger.info(
        { supportId: request.params.id, status: request.body.status },
        'Support request status updated'
      );

      return { request: updated[0] };
    }
  );
}
