import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

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

  // PATCH /api/therapist/profile - Update therapist profile (accepting_new_clients only)
  fastify.patch(
    '/api/therapist/profile',
    {
      schema: {
        description: 'Update therapist profile (accepting_new_clients only)',
        tags: ['therapist'],
        body: {
          type: 'object',
          properties: {
            accepting_new_clients: { type: 'boolean' },
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

      // Build update object with only accepting_new_clients field
      const updateData: Record<string, any> = {};
      if (request.body.accepting_new_clients !== undefined) {
        updateData.acceptingNewClients = request.body.accepting_new_clients;
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
}
