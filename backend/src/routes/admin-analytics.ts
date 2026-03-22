import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, isNull, not, count } from 'drizzle-orm';
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
      await reply.status(403).send({ error: 'Forbidden' });
      return null;
    }

    return session;
  }

  // Helper to optionally get user session (for analytics)
  async function optionalAuth(request: FastifyRequest) {
    try {
      const session = await requireAuth(request, {} as FastifyReply);
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  // ============================================
  // Analytics Endpoints
  // ============================================

  // POST /api/analytics/events - Track analytics event
  fastify.post(
    '/api/analytics/events',
    {
      schema: {
        description: 'Track an analytics event',
        tags: ['analytics'],
        body: {
          type: 'object',
          required: ['event_type'],
          properties: {
            event_type: { type: 'string' },
            therapist_id: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: {
            description: 'Event tracked',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          event_type: string;
          therapist_id?: string;
          metadata?: Record<string, any>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const userId = await optionalAuth(request);

      app.logger.info(
        { eventType: request.body.event_type, userId, therapistId: request.body.therapist_id },
        'Tracking analytics event'
      );

      await app.db.insert(appSchema.appAnalyticsEvents).values({
        eventType: request.body.event_type,
        therapistId: request.body.therapist_id ? request.body.therapist_id : null,
        userId: userId ? userId : null,
        metadata: request.body.metadata ? request.body.metadata : null,
      });

      return reply.status(201).send({ success: true });
    }
  );

  // GET /api/admin/analytics - Get analytics dashboard
  fastify.get(
    '/api/admin/analytics',
    {
      schema: {
        description: 'Get analytics dashboard (admin only)',
        tags: ['admin', 'analytics'],
        response: {
          200: {
            description: 'Analytics stats',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id }, 'Fetching analytics');

      // Count total users
      const [totalUsersResult] = await app.db
        .select({ count: count() })
        .from(authSchema.user);
      const totalUsers = totalUsersResult.count;

      // Count total therapists
      const [totalTherapistsResult] = await app.db
        .select({ count: count() })
        .from(appSchema.therapists);
      const totalTherapists = totalTherapistsResult.count;

      // Count active therapists
      const [activeTherapistsResult] = await app.db
        .select({ count: count() })
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.acceptingNewClients, true));
      const activeTherapists = activeTherapistsResult.count;

      // Count total bookings
      const [totalBookingsResult] = await app.db
        .select({ count: count() })
        .from(appSchema.bookingRequests);
      const totalBookings = totalBookingsResult.count;

      // Count pending applications
      const [pendingAppsResult] = await app.db
        .select({ count: count() })
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.status, 'pending'));
      const pendingApplications = pendingAppsResult.count;

      // Count profile views in last 7 days
      const [viewsResult] = await app.db
        .select({ count: count() })
        .from(appSchema.appAnalyticsEvents)
        .where(
          and(
            eq(appSchema.appAnalyticsEvents.eventType, 'profile_view'),
            sql`${appSchema.appAnalyticsEvents.createdAt} >= now() - interval '7 days'`
          )
        );
      const profileViews7d = viewsResult.count;

      // Count searches in last 7 days
      const [searchesResult] = await app.db
        .select({ count: count() })
        .from(appSchema.appAnalyticsEvents)
        .where(
          and(
            eq(appSchema.appAnalyticsEvents.eventType, 'search'),
            sql`${appSchema.appAnalyticsEvents.createdAt} >= now() - interval '7 days'`
          )
        );
      const searches7d = searchesResult.count;

      // Get top specialties
      const topSpecialties = await app.db
        .select({
          specialty: sql<string>`unnest(${appSchema.therapists.specialties})`,
          count: count(),
        })
        .from(appSchema.therapists)
        .groupBy(sql`unnest(${appSchema.therapists.specialties})`)
        .orderBy(sql`count desc`)
        .limit(5);

      // Get bookings by status
      const bookingsByStatus = await app.db
        .select({
          status: appSchema.bookingRequests.status,
          count: count(),
        })
        .from(appSchema.bookingRequests)
        .groupBy(appSchema.bookingRequests.status);

      const bookingStatusMap: Record<string, number> = {
        pending: 0,
        confirmed: 0,
        declined: 0,
      };

      bookingsByStatus.forEach((item: any) => {
        bookingStatusMap[item.status] = item.count;
      });

      const stats = {
        total_users: totalUsers,
        total_therapists: totalTherapists,
        active_therapists: activeTherapists,
        total_bookings: totalBookings,
        pending_applications: pendingApplications,
        profile_views_7d: profileViews7d,
        searches_7d: searches7d,
        top_specialties: topSpecialties.map((item: any) => ({
          specialty: item.specialty,
          count: item.count,
        })),
        bookings_by_status: bookingStatusMap,
      };

      app.logger.info({ adminId: session.user.id }, 'Analytics retrieved');

      return { stats };
    }
  );

  // ============================================
  // Subscription Management Endpoints
  // ============================================

  // GET /api/admin/subscriptions - List all subscriptions
  fastify.get(
    '/api/admin/subscriptions',
    {
      schema: {
        description: 'Get all therapist subscriptions (admin only)',
        tags: ['admin', 'subscriptions'],
        response: {
          200: {
            description: 'List of subscriptions',
            type: 'object',
            properties: {
              subscriptions: { type: 'array', items: { type: 'object' } },
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

      app.logger.info({ adminId: session.user.id }, 'Fetching subscriptions');

      const subscriptions = await app.db
        .select({
          id: appSchema.therapistSubscriptions.id,
          therapistId: appSchema.therapistSubscriptions.therapistId,
          status: appSchema.therapistSubscriptions.status,
          plan: appSchema.therapistSubscriptions.plan,
          amountPaid: appSchema.therapistSubscriptions.amountPaid,
          startedAt: appSchema.therapistSubscriptions.startedAt,
          expiresAt: appSchema.therapistSubscriptions.expiresAt,
          notes: appSchema.therapistSubscriptions.notes,
          createdAt: appSchema.therapistSubscriptions.createdAt,
          therapistName: appSchema.therapists.name,
          therapistTitle: appSchema.therapists.title,
        })
        .from(appSchema.therapistSubscriptions)
        .innerJoin(
          appSchema.therapists,
          eq(appSchema.therapistSubscriptions.therapistId, appSchema.therapists.id)
        );

      app.logger.info({ count: subscriptions.length }, 'Subscriptions retrieved');

      return { subscriptions };
    }
  );

  // POST /api/admin/subscriptions - Create subscription
  fastify.post(
    '/api/admin/subscriptions',
    {
      schema: {
        description: 'Create a therapist subscription (admin only)',
        tags: ['admin', 'subscriptions'],
        body: {
          type: 'object',
          required: ['therapist_id', 'status', 'plan'],
          properties: {
            therapist_id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            plan: { type: 'string' },
            amount_paid: { type: 'number' },
            expires_at: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Subscription created',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          therapist_id: string;
          status: string;
          plan: string;
          amount_paid?: number;
          expires_at?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info(
        { therapistId: request.body.therapist_id, plan: request.body.plan },
        'Creating subscription'
      );

      const subscription = await app.db
        .insert(appSchema.therapistSubscriptions)
        .values({
          therapistId: request.body.therapist_id,
          userId: session.user.id,
          status: request.body.status,
          plan: request.body.plan,
          amountPaid: request.body.amount_paid?.toString() || null,
          expiresAt: request.body.expires_at ? new Date(request.body.expires_at) : null,
          notes: request.body.notes || null,
        })
        .returning();

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.id, request.body.therapist_id))
        .limit(1);

      const response = {
        id: subscription[0].id,
        therapistId: subscription[0].therapistId,
        status: subscription[0].status,
        plan: subscription[0].plan,
        amountPaid: subscription[0].amountPaid,
        startedAt: subscription[0].startedAt,
        expiresAt: subscription[0].expiresAt,
        notes: subscription[0].notes,
        createdAt: subscription[0].createdAt,
        therapist:
          therapist.length > 0
            ? {
                id: therapist[0].id,
                name: therapist[0].name,
                email: therapist[0].email,
                title: therapist[0].title,
              }
            : null,
      };

      app.logger.info({ subscriptionId: subscription[0].id }, 'Subscription created');

      reply.status(201).send(response);
    }
  );

  // PATCH /api/admin/subscriptions/:id - Update subscription
  fastify.patch(
    '/api/admin/subscriptions/:id',
    {
      schema: {
        description: 'Update a therapist subscription (admin only)',
        tags: ['admin', 'subscriptions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            amount_paid: { type: 'number' },
            expires_at: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Subscription updated',
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
          status?: string;
          amount_paid?: number;
          expires_at?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ subscriptionId: request.params.id }, 'Updating subscription');

      const existing = await app.db
        .select()
        .from(appSchema.therapistSubscriptions)
        .where(eq(appSchema.therapistSubscriptions.id, request.params.id))
        .limit(1);

      if (existing.length === 0) {
        app.logger.info({ subscriptionId: request.params.id }, 'Subscription not found');
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      const updateData: Record<string, any> = {};
      if (request.body.status !== undefined) updateData.status = request.body.status;
      if (request.body.amount_paid !== undefined) updateData.amountPaid = request.body.amount_paid.toString();
      if (request.body.expires_at !== undefined)
        updateData.expiresAt = request.body.expires_at ? new Date(request.body.expires_at) : null;
      if (request.body.notes !== undefined) updateData.notes = request.body.notes;

      const updated = await app.db
        .update(appSchema.therapistSubscriptions)
        .set(updateData)
        .where(eq(appSchema.therapistSubscriptions.id, request.params.id))
        .returning();

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.id, updated[0].therapistId))
        .limit(1);

      const response = {
        id: updated[0].id,
        therapistId: updated[0].therapistId,
        status: updated[0].status,
        plan: updated[0].plan,
        amountPaid: updated[0].amountPaid,
        startedAt: updated[0].startedAt,
        expiresAt: updated[0].expiresAt,
        notes: updated[0].notes,
        createdAt: updated[0].createdAt,
        therapist:
          therapist.length > 0
            ? {
                id: therapist[0].id,
                name: therapist[0].name,
                email: therapist[0].email,
                title: therapist[0].title,
              }
            : null,
      };

      app.logger.info({ subscriptionId: request.params.id }, 'Subscription updated');

      return response;
    }
  );

  // ============================================
  // Broadcast Notification Endpoints
  // ============================================

  // GET /api/admin/notifications - List notifications
  fastify.get(
    '/api/admin/notifications',
    {
      schema: {
        description: 'Get all broadcast notifications (admin only)',
        tags: ['admin', 'notifications'],
        response: {
          200: {
            description: 'List of notifications',
            type: 'object',
            properties: {
              notifications: { type: 'array', items: { type: 'object' } },
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

      app.logger.info({ adminId: session.user.id }, 'Fetching notifications');

      const notifications = await app.db
        .select()
        .from(appSchema.broadcastNotifications)
        .orderBy(sql`${appSchema.broadcastNotifications.sentAt} desc`);

      app.logger.info({ count: notifications.length }, 'Notifications retrieved');

      return { notifications };
    }
  );

  // POST /api/admin/notifications - Create notification
  fastify.post(
    '/api/admin/notifications',
    {
      schema: {
        description: 'Send a broadcast notification (admin only)',
        tags: ['admin', 'notifications'],
        body: {
          type: 'object',
          required: ['title', 'message', 'target'],
          properties: {
            title: { type: 'string' },
            message: { type: 'string' },
            target: { type: 'string', enum: ['all', 'featured', 'free'] },
          },
        },
        response: {
          201: {
            description: 'Notification sent',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          title: string;
          message: string;
          target: 'all' | 'featured' | 'free';
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ target: request.body.target }, 'Creating notification');

      let recipientCount = 0;

      if (request.body.target === 'all') {
        // Count all therapists
        const [result] = await app.db
          .select({ count: count() })
          .from(appSchema.therapists);
        recipientCount = result.count;
      } else if (request.body.target === 'featured') {
        // Count therapists with active subscriptions
        const [result] = await app.db
          .select({
            count: count(sql`distinct ${appSchema.therapistSubscriptions.therapistId}`),
          })
          .from(appSchema.therapistSubscriptions)
          .where(eq(appSchema.therapistSubscriptions.status, 'active'));
        recipientCount = result.count || 0;
      } else if (request.body.target === 'free') {
        // Count therapists without active subscriptions
        const [allTherapists] = await app.db
          .select({ count: count() })
          .from(appSchema.therapists);

        const [activeSubscriptions] = await app.db
          .select({
            count: count(sql`distinct ${appSchema.therapistSubscriptions.therapistId}`),
          })
          .from(appSchema.therapistSubscriptions)
          .where(eq(appSchema.therapistSubscriptions.status, 'active'));

        recipientCount = allTherapists.count - (activeSubscriptions.count || 0);
      }

      const notification = await app.db
        .insert(appSchema.broadcastNotifications)
        .values({
          title: request.body.title,
          message: request.body.message,
          target: request.body.target,
          sentBy: session.user.id,
          recipientCount,
        })
        .returning();

      app.logger.info(
        { notificationId: notification[0].id, recipientCount },
        'Notification created'
      );

      reply.status(201).send({
        notification: notification[0],
        recipient_count: recipientCount,
      });
    }
  );

  // ============================================
  // App Content Endpoints
  // ============================================

  // GET /api/admin/content - List all content
  fastify.get(
    '/api/admin/content',
    {
      schema: {
        description: 'Get all app content (admin only)',
        tags: ['admin', 'content'],
        response: {
          200: {
            description: 'List of content',
            type: 'object',
            properties: {
              content: { type: 'array', items: { type: 'object' } },
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

      app.logger.info({ adminId: session.user.id }, 'Fetching all content');

      const content = await app.db
        .select({
          id: appSchema.appContent.id,
          key: appSchema.appContent.key,
          value: appSchema.appContent.value,
          updatedAt: appSchema.appContent.updatedAt,
        })
        .from(appSchema.appContent);

      app.logger.info({ count: content.length }, 'Content retrieved');

      return { content };
    }
  );

  // PATCH /api/admin/content/:key - Update content
  fastify.patch(
    '/api/admin/content/:key',
    {
      schema: {
        description: 'Update app content (admin only)',
        tags: ['admin', 'content'],
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Content updated',
            type: 'object',
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { key: string };
        Body: { value?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      // Validate value is provided
      if (!request.body.value) {
        app.logger.warn({ contentKey: request.params.key }, 'Value field is required');
        return reply.status(400).send({ error: 'Value field is required' });
      }

      app.logger.info({ contentKey: request.params.key }, 'Updating content');

      // Try to update first, if no rows affected, insert
      const existing = await app.db
        .select()
        .from(appSchema.appContent)
        .where(eq(appSchema.appContent.key, request.params.key))
        .limit(1);

      let content;

      if (existing.length > 0) {
        const updated = await app.db
          .update(appSchema.appContent)
          .set({
            value: request.body.value,
            updatedBy: session.user.id,
            updatedAt: sql`now()`,
          })
          .where(eq(appSchema.appContent.key, request.params.key))
          .returning();
        content = updated[0];
      } else {
        const inserted = await app.db
          .insert(appSchema.appContent)
          .values({
            key: request.params.key,
            value: request.body.value,
            updatedBy: session.user.id,
          })
          .returning();
        content = inserted[0];
      }

      app.logger.info({ contentKey: request.params.key }, 'Content updated');

      return {
        content: {
          id: content.id,
          key: content.key,
          value: content.value,
          updatedAt: content.updatedAt,
        },
      };
    }
  );

  // ============================================
  // Public Content Endpoints
  // ============================================

  // GET /api/content/:key - Get public content
  fastify.get(
    '/api/content/:key',
    {
      schema: {
        description: 'Get app content by key (public)',
        tags: ['content'],
        params: {
          type: 'object',
          required: ['key'],
          properties: {
            key: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Content found',
            type: 'object',
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { key: string };
      }>,
      reply: FastifyReply
    ) => {
      app.logger.info({ contentKey: request.params.key }, 'Fetching public content');

      const content = await app.db
        .select({
          id: appSchema.appContent.id,
          key: appSchema.appContent.key,
          value: appSchema.appContent.value,
          updatedAt: appSchema.appContent.updatedAt,
        })
        .from(appSchema.appContent)
        .where(eq(appSchema.appContent.key, request.params.key))
        .limit(1);

      if (content.length === 0) {
        app.logger.info({ contentKey: request.params.key }, 'Content not found');
        return reply.status(404).send({ error: 'Not found' });
      }

      app.logger.info({ contentKey: request.params.key }, 'Content retrieved');

      return { content: content[0] };
    }
  );
}
