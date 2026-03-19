import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // Helper to check admin role
  async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const session = await requireAuth(request, reply);
    if (!session) return null;

    const user = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, session.user.id))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'admin') {
      app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted admin access');
      reply.status(403).send({ error: 'Forbidden' });
      return null;
    }

    return session;
  }

  // ============================================
  // Saved Therapists Endpoints
  // ============================================

  // GET /api/saved - Get all saved therapists for current user
  fastify.get(
    '/api/saved',
    {
      schema: {
        description: 'Get all saved therapists for current user',
        tags: ['saved'],
        response: {
          200: {
            description: 'List of saved therapists',
            type: 'object',
            properties: {
              saved: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching saved therapists');

      const saved = await app.db
        .select({
          id: appSchema.savedTherapists.id,
          therapistId: appSchema.savedTherapists.therapistId,
          createdAt: appSchema.savedTherapists.createdAt,
          therapist: {
            id: appSchema.therapists.id,
            name: appSchema.therapists.name,
            title: appSchema.therapists.title,
            photoUrl: appSchema.therapists.photoUrl,
            location: appSchema.therapists.location,
            acceptingNewClients: appSchema.therapists.acceptingNewClients,
          },
        })
        .from(appSchema.savedTherapists)
        .innerJoin(appSchema.therapists, eq(appSchema.savedTherapists.therapistId, appSchema.therapists.id))
        .where(eq(appSchema.savedTherapists.userId, session.user.id));

      app.logger.info({ userId: session.user.id, count: saved.length }, 'Saved therapists retrieved');

      return { saved };
    }
  );

  // POST /api/saved - Save a therapist
  fastify.post(
    '/api/saved',
    {
      schema: {
        description: 'Save a therapist',
        tags: ['saved'],
        body: {
          type: 'object',
          required: ['therapist_id'],
          properties: {
            therapist_id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            description: 'Therapist saved',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { therapist_id: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id, therapistId: request.body.therapist_id },
        'Saving therapist'
      );

      // Check if already saved before inserting
      const existing = await app.db
        .select()
        .from(appSchema.savedTherapists)
        .where(
          and(
            eq(appSchema.savedTherapists.userId, session.user.id),
            eq(appSchema.savedTherapists.therapistId, request.body.therapist_id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        app.logger.info(
          { userId: session.user.id, therapistId: request.body.therapist_id },
          'Therapist already saved'
        );
        return reply.status(409).send({ error: 'Already saved' });
      }

      try {
        const saved = await app.db
          .insert(appSchema.savedTherapists)
          .values({
            userId: session.user.id,
            therapistId: request.body.therapist_id,
          })
          .returning();

        // Fetch therapist details
        const therapist = await app.db
          .select()
          .from(appSchema.therapists)
          .where(eq(appSchema.therapists.id, request.body.therapist_id))
          .limit(1);

        const response = {
          id: saved[0].id,
          therapistId: saved[0].therapistId,
          createdAt: saved[0].createdAt,
          therapist:
            therapist.length > 0
              ? {
                  id: therapist[0].id,
                  name: therapist[0].name,
                  title: therapist[0].title,
                  photoUrl: therapist[0].photoUrl,
                  location: therapist[0].location,
                  acceptingNewClients: therapist[0].acceptingNewClients,
                }
              : null,
        };

        app.logger.info(
          { userId: session.user.id, savedId: saved[0].id },
          'Therapist saved successfully'
        );

        return reply.status(201).send(response);
      } catch (error: any) {
        app.logger.error(
          { err: error, userId: session.user.id, therapistId: request.body.therapist_id },
          'Failed to save therapist'
        );
        throw error;
      }
    }
  );

  // DELETE /api/saved/:therapistId - Remove saved therapist
  fastify.delete(
    '/api/saved/:therapistId',
    {
      schema: {
        description: 'Remove a saved therapist',
        tags: ['saved'],
        params: {
          type: 'object',
          required: ['therapistId'],
          properties: {
            therapistId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Therapist removed',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { therapistId: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id, therapistId: request.params.therapistId },
        'Removing saved therapist'
      );

      // Check if saved therapist exists
      const existingSaved = await app.db
        .select()
        .from(appSchema.savedTherapists)
        .where(
          and(
            eq(appSchema.savedTherapists.userId, session.user.id),
            eq(appSchema.savedTherapists.therapistId, request.params.therapistId)
          )
        )
        .limit(1);

      if (existingSaved.length === 0) {
        app.logger.info(
          { userId: session.user.id, therapistId: request.params.therapistId },
          'Saved therapist not found'
        );
        return reply.status(404).send({ error: 'Saved therapist not found' });
      }

      await app.db
        .delete(appSchema.savedTherapists)
        .where(
          and(
            eq(appSchema.savedTherapists.userId, session.user.id),
            eq(appSchema.savedTherapists.therapistId, request.params.therapistId)
          )
        );

      app.logger.info(
        { userId: session.user.id, therapistId: request.params.therapistId },
        'Saved therapist removed'
      );

      return { success: true };
    }
  );

  // ============================================
  // Booking Requests Endpoints
  // ============================================

  // GET /api/bookings - Get all booking requests for current user
  fastify.get(
    '/api/bookings',
    {
      schema: {
        description: 'Get all booking requests for current user',
        tags: ['bookings'],
        response: {
          200: {
            description: 'List of booking requests',
            type: 'object',
            properties: {
              bookings: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching booking requests');

      const bookings = await app.db
        .select({
          id: appSchema.bookingRequests.id,
          therapistId: appSchema.bookingRequests.therapistId,
          userId: appSchema.bookingRequests.userId,
          preferredDate: appSchema.bookingRequests.preferredDate,
          message: appSchema.bookingRequests.message,
          contactMethod: appSchema.bookingRequests.contactMethod,
          status: appSchema.bookingRequests.status,
          adminNotes: appSchema.bookingRequests.adminNotes,
          createdAt: appSchema.bookingRequests.createdAt,
          therapist: {
            id: appSchema.therapists.id,
            name: appSchema.therapists.name,
            title: appSchema.therapists.title,
            photoUrl: appSchema.therapists.photoUrl,
          },
        })
        .from(appSchema.bookingRequests)
        .innerJoin(appSchema.therapists, eq(appSchema.bookingRequests.therapistId, appSchema.therapists.id))
        .where(eq(appSchema.bookingRequests.userId, session.user.id));

      app.logger.info(
        { userId: session.user.id, count: bookings.length },
        'Booking requests retrieved'
      );

      return { bookings };
    }
  );

  // POST /api/bookings - Create booking request
  fastify.post(
    '/api/bookings',
    {
      schema: {
        description: 'Create a booking request',
        tags: ['bookings'],
        body: {
          type: 'object',
          required: ['therapist_id', 'message', 'contact_method'],
          properties: {
            therapist_id: { type: 'string', format: 'uuid' },
            preferred_date: { type: 'string', format: 'date' },
            message: { type: 'string' },
            contact_method: { type: 'string', enum: ['email', 'phone'] },
          },
        },
        response: {
          201: {
            description: 'Booking request created',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          therapist_id: string;
          preferred_date?: string;
          message: string;
          contact_method: 'email' | 'phone';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id, therapistId: request.body.therapist_id },
        'Creating booking request'
      );

      const booking = await app.db
        .insert(appSchema.bookingRequests)
        .values({
          userId: session.user.id,
          therapistId: request.body.therapist_id,
          preferredDate: request.body.preferred_date ? new Date(request.body.preferred_date).toISOString().split('T')[0] : null,
          message: request.body.message,
          contactMethod: request.body.contact_method,
        })
        .returning();

      // Fetch therapist details
      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.id, request.body.therapist_id))
        .limit(1);

      const response = {
        id: booking[0].id,
        therapistId: booking[0].therapistId,
        userId: booking[0].userId,
        preferredDate: booking[0].preferredDate,
        message: booking[0].message,
        contactMethod: booking[0].contactMethod,
        status: booking[0].status,
        adminNotes: booking[0].adminNotes,
        createdAt: booking[0].createdAt,
        therapist:
          therapist.length > 0
            ? {
                id: therapist[0].id,
                name: therapist[0].name,
                title: therapist[0].title,
                photoUrl: therapist[0].photoUrl,
              }
            : null,
      };

      app.logger.info(
        { userId: session.user.id, bookingId: booking[0].id },
        'Booking request created'
      );

      return reply.status(201).send(response);
    }
  );

  // ============================================
  // Admin Booking Endpoints
  // ============================================

  // GET /api/admin/bookings - Get all booking requests (admin only)
  fastify.get(
    '/api/admin/bookings',
    {
      schema: {
        description: 'Get all booking requests (admin only)',
        tags: ['admin', 'bookings'],
        response: {
          200: {
            description: 'List of all booking requests',
            type: 'object',
            properties: {
              bookings: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id }, 'Fetching all booking requests');

      const bookings = await app.db
        .select({
          id: appSchema.bookingRequests.id,
          therapistId: appSchema.bookingRequests.therapistId,
          userId: appSchema.bookingRequests.userId,
          preferredDate: appSchema.bookingRequests.preferredDate,
          message: appSchema.bookingRequests.message,
          contactMethod: appSchema.bookingRequests.contactMethod,
          status: appSchema.bookingRequests.status,
          adminNotes: appSchema.bookingRequests.adminNotes,
          createdAt: appSchema.bookingRequests.createdAt,
          therapist: {
            id: appSchema.therapists.id,
            name: appSchema.therapists.name,
            title: appSchema.therapists.title,
            photoUrl: appSchema.therapists.photoUrl,
          },
        })
        .from(appSchema.bookingRequests)
        .innerJoin(appSchema.therapists, eq(appSchema.bookingRequests.therapistId, appSchema.therapists.id));

      app.logger.info({ count: bookings.length }, 'All booking requests retrieved');

      return { bookings };
    }
  );

  // PATCH /api/admin/bookings/:id - Update booking request status (admin only)
  fastify.patch(
    '/api/admin/bookings/:id',
    {
      schema: {
        description: 'Update a booking request status (admin only)',
        tags: ['admin', 'bookings'],
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
            status: { type: 'string', enum: ['pending', 'confirmed', 'declined'] },
            admin_notes: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Booking request updated',
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
        Body: {
          status: 'pending' | 'confirmed' | 'declined';
          admin_notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info(
        { bookingId: request.params.id, status: request.body.status },
        'Updating booking status'
      );

      // Check if booking exists
      const existing = await app.db
        .select()
        .from(appSchema.bookingRequests)
        .where(eq(appSchema.bookingRequests.id, request.params.id))
        .limit(1);

      if (existing.length === 0) {
        app.logger.info({ bookingId: request.params.id }, 'Booking not found');
        return reply.status(404).send({ error: 'Booking not found' });
      }

      const updated = await app.db
        .update(appSchema.bookingRequests)
        .set({
          status: request.body.status,
          adminNotes: request.body.admin_notes || null,
        })
        .where(eq(appSchema.bookingRequests.id, request.params.id))
        .returning();

      // Fetch therapist details
      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.id, updated[0].therapistId))
        .limit(1);

      const response = {
        id: updated[0].id,
        therapistId: updated[0].therapistId,
        userId: updated[0].userId,
        preferredDate: updated[0].preferredDate,
        message: updated[0].message,
        contactMethod: updated[0].contactMethod,
        status: updated[0].status,
        adminNotes: updated[0].adminNotes,
        createdAt: updated[0].createdAt,
        therapist:
          therapist.length > 0
            ? {
                id: therapist[0].id,
                name: therapist[0].name,
                title: therapist[0].title,
                photoUrl: therapist[0].photoUrl,
              }
            : null,
      };

      app.logger.info(
        { bookingId: request.params.id, status: request.body.status },
        'Booking status updated'
      );

      return response;
    }
  );
}
