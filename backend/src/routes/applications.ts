import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
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

  // POST /api/applications - Create new therapist application
  fastify.post(
    '/api/applications',
    {
      schema: {
        description: 'Submit a therapist application for approval',
        tags: ['applications'],
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
            photo_url: { type: ['string', 'null'] },
            website_url: { type: ['string', 'null'] },
            license_documents: { type: ['array', 'null'], items: { type: 'string' } },
          },
        },
        response: {
          201: {
            description: 'Application created',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string' },
              status: { type: 'string' },
              name: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
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
          photo_url?: string | null;
          website_url?: string | null;
          license_documents?: string[] | null;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuthBearer(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id, name: request.body.name },
        'Creating therapist application'
      );

      // Check if user already has an application
      const existingApp = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.userId, session.user.id))
        .limit(1);

      if (existingApp.length > 0) {
        app.logger.warn(
          { userId: session.user.id },
          'User already has an application'
        );
        return reply.status(409).send({ error: 'User already has an application' });
      }

      const application = await app.db
        .insert(appSchema.therapistApplications)
        .values({
          userId: session.user.id,
          name: request.body.name,
          title: request.body.title,
          bio: request.body.bio,
          location: request.body.location,
          gender: request.body.gender,
          specialties: request.body.specialties,
          therapyTypes: request.body.therapy_types,
          insurances: request.body.insurances,
          sessionFee: request.body.session_fee.toString(),
          languages: request.body.languages,
          yearsExperience: request.body.years_experience,
          phone: request.body.phone,
          email: request.body.email,
          photoUrl: request.body.photo_url || null,
          websiteUrl: request.body.website_url || null,
          licenseDocuments: request.body.license_documents || [],
        })
        .returning();

      app.logger.info(
        { applicationId: application[0].id, userId: session.user.id },
        'Therapist application created'
      );

      reply.status(201).send(application[0]);
    }
  );

  // GET /api/applications/me - Get current user's application
  fastify.get(
    '/api/applications/me',
    {
      schema: {
        description: "Get current user's therapist application",
        tags: ['applications'],
        response: {
          200: {
            description: 'User application',
            type: 'object',
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuthBearer(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user application');

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.userId, session.user.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No application found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      app.logger.info({ applicationId: application[0].id }, 'Application retrieved');
      return application[0];
    }
  );

}
