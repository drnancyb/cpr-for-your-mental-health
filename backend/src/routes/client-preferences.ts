import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
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

  // ============================================
  // Notification Preferences Endpoints
  // ============================================

  // GET /api/notification-preferences - Get user notification preferences
  fastify.get(
    '/api/notification-preferences',
    {
      schema: {
        description: 'Get current user notification preferences',
        tags: ['preferences'],
        response: {
          200: {
            description: 'Notification preferences',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching notification preferences');

      const prefs = await app.db
        .select()
        .from(appSchema.notificationPreferences)
        .where(eq(appSchema.notificationPreferences.userId, session.user.id))
        .limit(1);

      if (prefs.length > 0) {
        const pref = prefs[0];
        return {
          id: pref.id,
          user_id: pref.userId,
          booking_reminders: pref.bookingReminders,
          new_messages: pref.newMessages,
          promotions: pref.promotions,
          created_at: pref.createdAt,
          updated_at: pref.updatedAt,
        };
      }

      // Create default preferences if not exists
      app.logger.info({ userId: session.user.id }, 'Creating default notification preferences');
      const created = await app.db
        .insert(appSchema.notificationPreferences)
        .values({
          userId: session.user.id,
          bookingReminders: true,
          newMessages: true,
          promotions: false,
        })
        .returning();

      const pref = created[0];
      return {
        id: pref.id,
        user_id: pref.userId,
        booking_reminders: pref.bookingReminders,
        new_messages: pref.newMessages,
        promotions: pref.promotions,
        created_at: pref.createdAt,
        updated_at: pref.updatedAt,
      };
    }
  );

  // PATCH /api/notification-preferences - Update notification preferences
  fastify.patch(
    '/api/notification-preferences',
    {
      schema: {
        description: 'Update notification preferences',
        tags: ['preferences'],
        body: {
          type: 'object',
          properties: {
            booking_reminders: { type: 'boolean' },
            new_messages: { type: 'boolean' },
            promotions: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Updated preferences',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          booking_reminders?: boolean;
          new_messages?: boolean;
          promotions?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Updating notification preferences');

      // Build update object
      const updateData: Record<string, any> = {};
      if (request.body.booking_reminders !== undefined) updateData.bookingReminders = request.body.booking_reminders;
      if (request.body.new_messages !== undefined) updateData.newMessages = request.body.new_messages;
      if (request.body.promotions !== undefined) updateData.promotions = request.body.promotions;
      updateData.updatedAt = sql`now()`;

      // Check if preferences exist
      const existing = await app.db
        .select()
        .from(appSchema.notificationPreferences)
        .where(eq(appSchema.notificationPreferences.userId, session.user.id))
        .limit(1);

      let pref;
      if (existing.length > 0) {
        const updated = await app.db
          .update(appSchema.notificationPreferences)
          .set(updateData)
          .where(eq(appSchema.notificationPreferences.userId, session.user.id))
          .returning();
        pref = updated[0];
      } else {
        // Create with defaults merged with provided values
        const inserted = await app.db
          .insert(appSchema.notificationPreferences)
          .values({
            userId: session.user.id,
            bookingReminders: request.body.booking_reminders !== undefined ? request.body.booking_reminders : true,
            newMessages: request.body.new_messages !== undefined ? request.body.new_messages : true,
            promotions: request.body.promotions !== undefined ? request.body.promotions : false,
          })
          .returning();
        pref = inserted[0];
      }

      app.logger.info({ userId: session.user.id }, 'Notification preferences updated');

      return {
        id: pref.id,
        user_id: pref.userId,
        booking_reminders: pref.bookingReminders,
        new_messages: pref.newMessages,
        promotions: pref.promotions,
        created_at: pref.createdAt,
        updated_at: pref.updatedAt,
      };
    }
  );

  // ============================================
  // Client Preferences Endpoints
  // ============================================

  // GET /api/preferences - Get user preferences
  fastify.get(
    '/api/preferences',
    {
      schema: {
        description: 'Get current user preferences',
        tags: ['preferences'],
        response: {
          200: {
            description: 'User preferences',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching preferences');

      const preferences = await app.db
        .select()
        .from(appSchema.clientPreferences)
        .where(eq(appSchema.clientPreferences.userId, session.user.id))
        .limit(1);

      if (preferences.length === 0) {
        // Return defaults
        const defaults = {
          user_id: session.user.id,
          preferred_gender: [],
          preferred_specialties: [],
          preferred_therapy_types: [],
          preferred_insurance: [],
          preferred_location: null,
          updated_at: new Date(),
        };
        return { preferences: defaults };
      }

      const pref = preferences[0];
      return {
        preferences: {
          id: pref.id,
          user_id: pref.userId,
          preferred_gender: pref.preferredGender || [],
          preferred_specialties: pref.preferredSpecialties || [],
          preferred_therapy_types: pref.preferredTherapyTypes || [],
          preferred_insurance: pref.preferredInsurance || [],
          preferred_location: pref.preferredLocation,
          updated_at: pref.updatedAt,
        },
      };
    }
  );

  // PUT /api/preferences - Update user preferences
  fastify.put(
    '/api/preferences',
    {
      schema: {
        description: 'Update current user preferences',
        tags: ['preferences'],
        body: {
          type: 'object',
          properties: {
            preferred_gender: { type: 'array', items: { type: 'string' } },
            preferred_specialties: { type: 'array', items: { type: 'string' } },
            preferred_therapy_types: { type: 'array', items: { type: 'string' } },
            preferred_insurance: { type: 'array', items: { type: 'string' } },
            preferred_location: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Updated preferences',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          preferred_gender?: string[];
          preferred_specialties?: string[];
          preferred_therapy_types?: string[];
          preferred_insurance?: string[];
          preferred_location?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Updating preferences');

      // Build update object
      const updateData: Record<string, any> = {};
      if (request.body.preferred_gender !== undefined) updateData.preferredGender = request.body.preferred_gender;
      if (request.body.preferred_specialties !== undefined) updateData.preferredSpecialties = request.body.preferred_specialties;
      if (request.body.preferred_therapy_types !== undefined) updateData.preferredTherapyTypes = request.body.preferred_therapy_types;
      if (request.body.preferred_insurance !== undefined) updateData.preferredInsurance = request.body.preferred_insurance;
      if (request.body.preferred_location !== undefined) updateData.preferredLocation = request.body.preferred_location;
      updateData.updatedAt = new Date();

      // Check if preferences exist
      const existing = await app.db
        .select()
        .from(appSchema.clientPreferences)
        .where(eq(appSchema.clientPreferences.userId, session.user.id))
        .limit(1);

      let preferences;
      if (existing.length > 0) {
        const updated = await app.db
          .update(appSchema.clientPreferences)
          .set(updateData)
          .where(eq(appSchema.clientPreferences.userId, session.user.id))
          .returning();
        preferences = updated[0];
      } else {
        const inserted = await app.db
          .insert(appSchema.clientPreferences)
          .values({
            userId: session.user.id,
            ...updateData,
          })
          .returning();
        preferences = inserted[0];
      }

      app.logger.info({ userId: session.user.id }, 'Preferences updated');

      return {
        preferences: {
          id: preferences.id,
          user_id: preferences.userId,
          preferred_gender: preferences.preferredGender || [],
          preferred_specialties: preferences.preferredSpecialties || [],
          preferred_therapy_types: preferences.preferredTherapyTypes || [],
          preferred_insurance: preferences.preferredInsurance || [],
          preferred_location: preferences.preferredLocation,
          updated_at: preferences.updatedAt,
        },
      };
    }
  );

  // ============================================
  // Therapist Profile Endpoints
  // ============================================

  // GET /api/therapist/profile - Get authenticated user's therapist profile
  fastify.get(
    '/api/therapist/profile',
    {
      schema: {
        description: 'Get authenticated user therapist profile',
        tags: ['therapist'],
        response: {
          200: {
            description: 'Therapist profile',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching therapist profile');

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No therapist profile found');
        return reply.status(404).send({ error: 'No therapist profile linked to this account' });
      }

      app.logger.info({ userId: session.user.id, therapistId: therapist[0].id }, 'Therapist profile retrieved');

      return therapist[0];
    }
  );

  // GET /api/therapist/inquiries - Get therapist's booking inquiries
  fastify.get(
    '/api/therapist/inquiries',
    {
      schema: {
        description: 'Get therapist booking inquiries',
        tags: ['therapist'],
        response: {
          200: {
            description: 'Booking inquiries',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching therapist inquiries');

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No therapist profile found');
        return { inquiries: [] };
      }

      const inquiries = await app.db
        .select()
        .from(appSchema.bookingRequests)
        .where(eq(appSchema.bookingRequests.therapistId, therapist[0].id))
        .orderBy(desc(appSchema.bookingRequests.createdAt));

      app.logger.info(
        { therapistId: therapist[0].id, count: inquiries.length },
        'Therapist inquiries retrieved'
      );

      return { inquiries };
    }
  );

  // GET /api/therapist/subscription - Get therapist's subscription
  fastify.get(
    '/api/therapist/subscription',
    {
      schema: {
        description: 'Get therapist subscription',
        tags: ['therapist'],
        response: {
          200: {
            description: 'Subscription info',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching therapist subscription');

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No therapist profile found');
        return { subscription: null };
      }

      const subscription = await app.db
        .select()
        .from(appSchema.therapistSubscriptions)
        .where(eq(appSchema.therapistSubscriptions.therapistId, therapist[0].id))
        .orderBy(desc(appSchema.therapistSubscriptions.createdAt))
        .limit(1);

      if (subscription.length === 0) {
        app.logger.info(
          { therapistId: therapist[0].id },
          'No subscription found'
        );
        return { subscription: null };
      }

      app.logger.info(
        { therapistId: therapist[0].id },
        'Therapist subscription retrieved'
      );

      return subscription[0];
    }
  );

  // PATCH /api/therapist/profile - Update therapist profile
  fastify.patch(
    '/api/therapist/profile',
    {
      schema: {
        description: 'Update therapist profile',
        tags: ['therapist'],
        body: {
          type: 'object',
          properties: {
            accepting_new_clients: { type: 'boolean' },
            is_pinned: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Updated profile',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          accepting_new_clients?: boolean;
          is_pinned?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Updating therapist profile');

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No therapist profile found');
        return reply.status(404).send({ error: 'No therapist profile linked to this account' });
      }

      // Build update object with only accepting_new_clients and is_pinned fields
      const updateData: Record<string, any> = {};
      if (request.body.accepting_new_clients !== undefined) {
        updateData.acceptingNewClients = request.body.accepting_new_clients;
      }
      if (request.body.is_pinned !== undefined) {
        updateData.isPinned = request.body.is_pinned;
      }

      // If no fields to update, return current therapist
      if (Object.keys(updateData).length === 0) {
        app.logger.info({ userId: session.user.id, therapistId: therapist[0].id }, 'No fields to update');
        return therapist[0];
      }

      const updated = await app.db
        .update(appSchema.therapists)
        .set(updateData)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .returning();

      app.logger.info({ userId: session.user.id, therapistId: updated[0].id }, 'Therapist profile updated');

      return updated[0];
    }
  );

  // PATCH /api/admin/therapists/:id/pin - Pin/unpin therapist (admin only)
  fastify.patch(
    '/api/admin/therapists/:id/pin',
    {
      schema: {
        description: 'Pin or unpin a therapist (admin only)',
        tags: ['admin', 'therapists'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Therapist ID' },
          },
        },
        body: {
          type: 'object',
          required: ['is_pinned'],
          properties: {
            is_pinned: { type: 'boolean' },
          },
        },
        response: {
          200: {
            description: 'Therapist updated',
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
        Body: { is_pinned: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      // Check admin role
      const user = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, session.user.id))
        .limit(1);

      if (user.length === 0 || user[0].role !== 'admin') {
        app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted admin access');
        await reply.code(403).send({ error: 'Forbidden' });
        return;
      }

      app.logger.info(
        { adminId: session.user.id, therapistId: request.params.id, isPinned: request.body.is_pinned },
        'Updating therapist pin status'
      );

      // Check if therapist exists
      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.id, request.params.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ therapistId: request.params.id }, 'Therapist not found');
        return reply.status(404).send({ error: 'Therapist not found' });
      }

      // Update is_pinned
      const updated = await app.db
        .update(appSchema.therapists)
        .set({ isPinned: request.body.is_pinned })
        .where(eq(appSchema.therapists.id, request.params.id))
        .returning();

      app.logger.info(
        { therapistId: request.params.id, isPinned: updated[0].isPinned },
        'Therapist pin status updated'
      );

      return updated[0];
    }
  );
}
