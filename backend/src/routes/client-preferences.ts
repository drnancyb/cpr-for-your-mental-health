import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching therapist profile');

      const userRecord = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        return { therapist: null };
      }

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.email, userRecord[0].email))
        .limit(1);

      app.logger.info({ userId: session.user.id }, 'Therapist profile retrieved');

      return {
        therapist: therapist.length > 0 ? therapist[0] : null,
      };
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

      const userRecord = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        return { inquiries: [], total: 0, pending: 0 };
      }

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.email, userRecord[0].email))
        .limit(1);

      if (therapist.length === 0) {
        return { inquiries: [], total: 0, pending: 0 };
      }

      const inquiries = await app.db
        .select()
        .from(appSchema.bookingRequests)
        .where(eq(appSchema.bookingRequests.therapistId, therapist[0].id))
        .orderBy(desc(appSchema.bookingRequests.createdAt));

      const pendingCount = inquiries.filter((inq: any) => inq.status === 'pending').length;

      app.logger.info(
        { therapistId: therapist[0].id, total: inquiries.length, pending: pendingCount },
        'Therapist inquiries retrieved'
      );

      return {
        inquiries,
        total: inquiries.length,
        pending: pendingCount,
      };
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

      const userRecord = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, session.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        return { subscription: null };
      }

      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.email, userRecord[0].email))
        .limit(1);

      if (therapist.length === 0) {
        return { subscription: null };
      }

      const subscription = await app.db
        .select()
        .from(appSchema.therapistSubscriptions)
        .where(eq(appSchema.therapistSubscriptions.therapistId, therapist[0].id))
        .orderBy(desc(appSchema.therapistSubscriptions.createdAt))
        .limit(1);

      app.logger.info(
        { therapistId: therapist[0].id },
        'Therapist subscription retrieved'
      );

      return {
        subscription: subscription.length > 0 ? subscription[0] : null,
      };
    }
  );
}
