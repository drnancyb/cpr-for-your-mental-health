import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, ne, inArray } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // Helper to authenticate via Bearer token from Authorization header
  async function requireAuthBearer(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      app.logger.warn({}, 'No Bearer token in Authorization header');
      reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Look up the session by token
    const sessions = await app.db
      .select()
      .from(authSchema.session)
      .where(eq(authSchema.session.token, token))
      .limit(1);

    if (sessions.length === 0) {
      app.logger.warn({}, 'Invalid session token');
      reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const sessionRecord = sessions[0];

    // Check if session is expired
    if (new Date() > sessionRecord.expiresAt) {
      app.logger.warn({ userId: sessionRecord.userId }, 'Session token expired');
      reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    // Fetch user data
    const users = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, sessionRecord.userId))
      .limit(1);

    if (users.length === 0) {
      app.logger.warn({ userId: sessionRecord.userId }, 'User not found for valid session');
      reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    return { user: users[0], session: sessionRecord };
  }

  // Helper to check admin role
  async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    const auth = await requireAuthBearer(request, reply);
    if (!auth) return null;

    if (auth.user.role !== 'admin') {
      app.logger.warn({ userId: auth.user.id }, 'Non-admin user attempted admin access');
      reply.status(403).send({ error: 'Forbidden' });
      return null;
    }

    return auth;
  }

  // DELETE /api/admin/cleanup/therapists - Delete all therapists except Nancy Brooks
  fastify.delete(
    '/api/admin/cleanup/therapists',
    {
      schema: {
        description: 'Delete all therapists except Nancy Brooks and their related records (admin only)',
        tags: ['admin', 'cleanup'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              deleted: {
                type: 'object',
                properties: {
                  therapistsCount: { type: 'integer' },
                  analyticsEventsCount: { type: 'integer' },
                  bookingRequestsCount: { type: 'integer' },
                  savedTherapistsCount: { type: 'integer' },
                  subscriptionsCount: { type: 'integer' },
                },
              },
            },
          },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAdmin(request, reply);
      if (!auth) return;

      app.logger.info(
        { adminId: auth.user.id },
        'Starting therapist cleanup (keeping only Nancy Brooks)'
      );

      try {
        // Execute all deletions as a single transaction
        const result = await app.db.transaction(async (trx) => {
          // Get the IDs of therapists to delete (all except Nancy Brooks)
          const therapistsToDelete = await trx
            .select({ id: appSchema.therapists.id })
            .from(appSchema.therapists)
            .where(ne(appSchema.therapists.name, 'Nancy Brooks'));

          const therapistIds = therapistsToDelete.map((t) => t.id);

          if (therapistIds.length === 0) {
            return {
              therapistsCount: 0,
              analyticsEventsCount: 0,
              bookingRequestsCount: 0,
              savedTherapistsCount: 0,
              subscriptionsCount: 0,
            };
          }

          // 1. Delete from app_analytics_events
          const analyticsResult = await trx
            .delete(appSchema.appAnalyticsEvents)
            .where(
              inArray(appSchema.appAnalyticsEvents.therapistId, therapistIds)
            );

          // 2. Delete from booking_requests
          const bookingsResult = await trx
            .delete(appSchema.bookingRequests)
            .where(inArray(appSchema.bookingRequests.therapistId, therapistIds));

          // 3. Delete from saved_therapists
          const savedResult = await trx
            .delete(appSchema.savedTherapists)
            .where(inArray(appSchema.savedTherapists.therapistId, therapistIds));

          // 4. Delete from therapist_subscriptions
          const subscriptionsResult = await trx
            .delete(appSchema.therapistSubscriptions)
            .where(inArray(appSchema.therapistSubscriptions.therapistId, therapistIds));

          // 5. Delete from therapists
          const therapistsResult = await trx
            .delete(appSchema.therapists)
            .where(ne(appSchema.therapists.name, 'Nancy Brooks'));

          return {
            therapistsCount: Array.isArray(therapistsResult) ? therapistsResult.length : 0,
            analyticsEventsCount: Array.isArray(analyticsResult) ? analyticsResult.length : 0,
            bookingRequestsCount: Array.isArray(bookingsResult) ? bookingsResult.length : 0,
            savedTherapistsCount: Array.isArray(savedResult) ? savedResult.length : 0,
            subscriptionsCount: Array.isArray(subscriptionsResult) ? subscriptionsResult.length : 0,
          };
        });

        app.logger.info(
          {
            adminId: auth.user.id,
            deleted: result,
          },
          'Therapist cleanup completed successfully'
        );

        return {
          success: true,
          message: 'Successfully deleted all therapists except Nancy Brooks and their related records',
          deleted: result,
        };
      } catch (err) {
        app.logger.error(
          { err, adminId: auth.user.id },
          'Failed to cleanup therapists'
        );
        const error = new Error('Failed to cleanup therapists');
        (error as any).statusCode = 500;
        throw error;
      }
    }
  );
}
