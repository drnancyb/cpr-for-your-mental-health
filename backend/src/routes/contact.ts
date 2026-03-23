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

  // POST /api/contact - Submit contact form
  fastify.post(
    '/api/contact',
    {
      schema: {
        description: 'Submit a contact form message',
        tags: ['contact'],
        body: {
          type: 'object',
          required: ['name', 'email', 'subject', 'message'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', minLength: 1 },
            subject: { type: 'string', minLength: 1 },
            message: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            description: 'Contact message submitted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              id: { type: 'string', format: 'uuid' },
            },
          },
          400: {
            description: 'Bad request - missing required fields',
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
        Body: {
          name: string;
          email: string;
          subject: string;
          message: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { name, email, subject, message } = request.body;

      // Validate all fields are present and non-empty
      if (!name || !email || !subject || !message) {
        app.logger.warn({ body: request.body }, 'Contact form submission with missing fields');
        return reply.status(400).send({ error: 'All fields are required' });
      }

      app.logger.info(
        { name, email, subject },
        'Creating contact message'
      );

      const result = await app.db
        .insert(appSchema.contactMessages)
        .values({
          name,
          email,
          subject,
          message,
          read: false,
        })
        .returning();

      app.logger.info({ messageId: result[0].id }, 'Contact message created successfully');

      return {
        success: true,
        id: result[0].id,
      };
    }
  );

  // GET /api/admin/contact-messages - List all contact messages (admin only)
  fastify.get(
    '/api/admin/contact-messages',
    {
      schema: {
        description: 'Get all contact messages (admin only)',
        tags: ['admin', 'contact'],
        response: {
          200: {
            description: 'List of contact messages',
            type: 'object',
            properties: {
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    subject: { type: 'string' },
                    message: { type: 'string' },
                    read: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
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
        await reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      app.logger.info({}, 'Fetching all contact messages');

      const messages = await app.db
        .select()
        .from(appSchema.contactMessages)
        .orderBy(desc(appSchema.contactMessages.createdAt));

      app.logger.info({ count: messages.length }, 'Contact messages retrieved');

      return { messages };
    }
  );

  // PATCH /api/admin/contact-messages/:id/read - Mark message as read (admin only)
  fastify.patch(
    '/api/admin/contact-messages/:id/read',
    {
      schema: {
        description: 'Mark a contact message as read (admin only)',
        tags: ['admin', 'contact'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Message marked as read',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
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
      }>,
      reply: FastifyReply
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const userRole = (auth.user?.role as string) || 'user';
      if (userRole !== 'admin') {
        app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
        await reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const { id } = request.params;
      app.logger.info({ messageId: id }, 'Marking contact message as read');

      // Check if message exists
      const message = await app.db
        .select()
        .from(appSchema.contactMessages)
        .where(eq(appSchema.contactMessages.id, id))
        .limit(1);

      if (message.length === 0) {
        app.logger.info({ messageId: id }, 'Contact message not found');
        return reply.status(404).send({ error: 'Message not found' });
      }

      // Update read status
      await app.db
        .update(appSchema.contactMessages)
        .set({ read: true })
        .where(eq(appSchema.contactMessages.id, id));

      app.logger.info({ messageId: id }, 'Contact message marked as read');

      return { success: true };
    }
  );

  // DELETE /api/admin/contact-messages/:id - Delete contact message (admin only)
  fastify.delete(
    '/api/admin/contact-messages/:id',
    {
      schema: {
        description: 'Delete a contact message (admin only)',
        tags: ['admin', 'contact'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Message deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
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
      }>,
      reply: FastifyReply
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const userRole = (auth.user?.role as string) || 'user';
      if (userRole !== 'admin') {
        app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
        await reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      const { id } = request.params;
      app.logger.info({ messageId: id }, 'Deleting contact message');

      // Check if message exists
      const message = await app.db
        .select()
        .from(appSchema.contactMessages)
        .where(eq(appSchema.contactMessages.id, id))
        .limit(1);

      if (message.length === 0) {
        app.logger.info({ messageId: id }, 'Contact message not found');
        return reply.status(404).send({ error: 'Message not found' });
      }

      // Delete the message
      await app.db
        .delete(appSchema.contactMessages)
        .where(eq(appSchema.contactMessages.id, id));

      app.logger.info({ messageId: id }, 'Contact message deleted');

      return { success: true };
    }
  );
}
