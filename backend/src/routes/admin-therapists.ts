import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
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

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Look up the session by token
    const sessions = await app.db
      .select()
      .from(authSchema.session)
      .where(eq(authSchema.session.token, token))
      .limit(1);

    if (sessions.length === 0) {
      app.logger.warn({}, 'Invalid session token');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    const sessionRecord = sessions[0];

    // Check if session is expired
    if (new Date() > sessionRecord.expiresAt) {
      app.logger.warn({ userId: sessionRecord.userId }, 'Session token expired');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    // Fetch fresh user data from DB to ensure role is current
    const users = await app.db
      .select({ id: authSchema.user.id, role: authSchema.user.role })
      .from(authSchema.user)
      .where(eq(authSchema.user.id, sessionRecord.userId))
      .limit(1);

    if (users.length === 0) {
      app.logger.warn({ userId: sessionRecord.userId }, 'User not found for valid session');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    return { user: users[0], session: sessionRecord };
  }

  // POST /api/admin/therapists - Create new therapist
  fastify.post(
    '/api/admin/therapists',
    {
      schema: {
        description: 'Create a new therapist (admin only)',
        tags: ['admin', 'therapists'],
        body: {
          type: 'object',
          required: [
            'name',
            'title',
            'bio',
            'location',
            'gender',
            'specialties',
            'therapy_types',
            'insurances',
            'session_fee',
            'languages',
            'years_experience',
            'phone',
            'email',
          ],
          properties: {
            name: { type: 'string' },
            photo_url: { type: 'string' },
            title: { type: 'string' },
            bio: { type: 'string' },
            location: { type: 'string' },
            gender: { type: 'string' },
            specialties: { type: 'array', items: { type: 'string' } },
            therapy_types: { type: 'array', items: { type: 'string' } },
            insurances: { type: 'array', items: { type: 'string' } },
            session_fee: { type: 'number' },
            languages: { type: 'array', items: { type: 'string' } },
            years_experience: { type: 'integer' },
            phone: { type: 'string' },
            email: { type: 'string' },
            website_url: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Therapist created',
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
          name: string;
          photo_url?: string;
          title: string;
          bio: string;
          location: string;
          gender: string;
          specialties: string[];
          therapy_types: string[];
          insurances: string[];
          session_fee: number;
          languages: string[];
          years_experience: number;
          phone: string;
          email: string;
          website_url?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const auth = await requireAuth(request, reply);
        if (!auth) return;

        const userRole = (auth.user?.role as string) || 'user';
        if (userRole !== 'admin') {
          app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
          await reply.status(403).send({ error: 'Forbidden' });
          return;
        }

        app.logger.info(
          { name: request.body.name, adminId: auth.user.id },
          'Creating therapist'
        );

        const therapist = await app.db
          .insert(appSchema.therapists)
          .values({
            name: request.body.name,
            photoUrl: request.body.photo_url || '',
            title: request.body.title,
            bio: request.body.bio,
            location: request.body.location,
            gender: request.body.gender,
            specialties: request.body.specialties,
            therapyTypes: request.body.therapy_types,
            insurances: request.body.insurances,
            acceptingNewClients: true,
            sessionFee: request.body.session_fee.toString(),
            languages: request.body.languages,
            yearsExperience: request.body.years_experience,
            phone: request.body.phone,
            email: request.body.email,
            websiteUrl: request.body.website_url || null,
          })
          .returning();

        app.logger.info(
          { therapistId: therapist[0].id, name: request.body.name },
          'Therapist created successfully'
        );

        return reply.status(201).send(therapist[0]);
      } catch (error) {
        app.logger.error({ err: error, body: request.body }, 'Failed to create therapist');
        return reply.status(500).send({ error: 'Failed to create therapist' });
      }
    }
  );

  // PATCH /api/admin/therapists/:id - Update therapist
  fastify.patch(
    '/api/admin/therapists/:id',
    {
      schema: {
        description: 'Update a therapist (admin only)',
        tags: ['admin', 'therapists'],
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
            name: { type: 'string' },
            photo_url: { type: 'string' },
            title: { type: 'string' },
            bio: { type: 'string' },
            location: { type: 'string' },
            gender: { type: 'string' },
            specialties: { type: 'array', items: { type: 'string' } },
            therapy_types: { type: 'array', items: { type: 'string' } },
            insurances: { type: 'array', items: { type: 'string' } },
            session_fee: { type: 'number' },
            languages: { type: 'array', items: { type: 'string' } },
            years_experience: { type: 'integer' },
            phone: { type: 'string' },
            email: { type: 'string' },
            website_url: { type: 'string' },
            accepting_new_clients: { type: 'boolean' },
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
        Body: {
          name?: string;
          photo_url?: string;
          title?: string;
          bio?: string;
          location?: string;
          gender?: string;
          specialties?: string[];
          therapy_types?: string[];
          insurances?: string[];
          session_fee?: number;
          languages?: string[];
          years_experience?: number;
          phone?: string;
          email?: string;
          website_url?: string;
          accepting_new_clients?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const auth = await requireAuth(request, reply);
        if (!auth) return;

        const userRole = (auth.user?.role as string) || 'user';
        if (userRole !== 'admin') {
          app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
          await reply.status(403).send({ error: 'Forbidden' });
          return;
        }

        const { id } = request.params;
        app.logger.info({ therapistId: id, adminId: auth.user.id }, 'Updating therapist');

        // Check if therapist exists
        const existing = await app.db
          .select()
          .from(appSchema.therapists)
          .where(eq(appSchema.therapists.id, id))
          .limit(1);

        if (existing.length === 0) {
          app.logger.info({ therapistId: id }, 'Therapist not found');
          await reply.status(404).send({ error: 'Therapist not found' });
          return;
        }

        // Build update object from provided fields
        const updateData: Record<string, any> = {};

        if (request.body.name !== undefined) updateData.name = request.body.name;
        if (request.body.photo_url !== undefined) updateData.photoUrl = request.body.photo_url;
        if (request.body.title !== undefined) updateData.title = request.body.title;
        if (request.body.bio !== undefined) updateData.bio = request.body.bio;
        if (request.body.location !== undefined) updateData.location = request.body.location;
        if (request.body.gender !== undefined) updateData.gender = request.body.gender;
        if (request.body.specialties !== undefined) updateData.specialties = request.body.specialties;
        if (request.body.therapy_types !== undefined) updateData.therapyTypes = request.body.therapy_types;
        if (request.body.insurances !== undefined) updateData.insurances = request.body.insurances;
        if (request.body.session_fee !== undefined)
          updateData.sessionFee = request.body.session_fee.toString();
        if (request.body.languages !== undefined) updateData.languages = request.body.languages;
        if (request.body.years_experience !== undefined)
          updateData.yearsExperience = request.body.years_experience;
        if (request.body.phone !== undefined) updateData.phone = request.body.phone;
        if (request.body.email !== undefined) updateData.email = request.body.email;
        if (request.body.website_url !== undefined) updateData.websiteUrl = request.body.website_url;
        if (request.body.accepting_new_clients !== undefined)
          updateData.acceptingNewClients = request.body.accepting_new_clients;

        const updated = await app.db
          .update(appSchema.therapists)
          .set(updateData)
          .where(eq(appSchema.therapists.id, id))
          .returning();

        app.logger.info(
          { therapistId: id, updatedFields: Object.keys(updateData).length },
          'Therapist updated successfully'
        );

        return updated[0];
      } catch (error) {
        app.logger.error({ err: error, therapistId: request.params.id, body: request.body }, 'Failed to update therapist');
        await reply.status(500).send({ error: 'Failed to update therapist' });
      }
    }
  );

  // DELETE /api/admin/therapists/:id - Delete therapist
  fastify.delete(
    '/api/admin/therapists/:id',
    {
      schema: {
        description: 'Delete a therapist (admin only)',
        tags: ['admin', 'therapists'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Therapist deleted',
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
      try {
        const auth = await requireAuth(request, reply);
        if (!auth) return;

        const userRole = (auth.user?.role as string) || 'user';
        if (userRole !== 'admin') {
          app.logger.warn({ userId: auth.user.id, userRole }, 'Non-admin user attempted admin access');
          await reply.status(403).send({ error: 'Forbidden' });
          return;
        }

        const { id } = request.params;
        app.logger.info({ therapistId: id, adminId: auth.user.id }, 'Deleting therapist');

        // Check if therapist exists
        const existing = await app.db
          .select()
          .from(appSchema.therapists)
          .where(eq(appSchema.therapists.id, id))
          .limit(1);

        if (existing.length === 0) {
          app.logger.info({ therapistId: id }, 'Therapist not found');
          await reply.status(404).send({ error: 'Therapist not found' });
          return;
        }

        // Delete the therapist
        await app.db
          .delete(appSchema.therapists)
          .where(eq(appSchema.therapists.id, id));

        app.logger.info(
          { therapistId: id, name: existing[0].name },
          'Therapist deleted successfully'
        );

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, therapistId: request.params.id }, 'Failed to delete therapist');
        await reply.status(500).send({ error: 'Failed to delete therapist' });
      }
    }
  );
}
