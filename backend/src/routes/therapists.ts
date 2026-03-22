import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, sql, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
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

  fastify.get(
    '/api/therapists',
    {
      schema: {
        description: 'List therapists with optional filters',
        tags: ['therapists'],
        querystring: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Filter by location' },
            gender: { type: 'string', description: 'Filter by gender' },
            specialty: { type: 'string', description: 'Filter by specialty (array contains)' },
            therapy_type: { type: 'string', description: 'Filter by therapy type (array contains)' },
            insurance: { type: 'string', description: 'Filter by insurance (array contains)' },
            search: { type: 'string', description: 'Search by name or bio (case-insensitive)' },
            sort: { type: 'string', enum: ['price_asc', 'price_desc'], description: 'Sort by session fee' },
            slidingScale: { type: 'boolean', description: 'Filter by sliding scale availability' },
          },
        },
        response: {
          200: {
            description: 'List of therapists with total count',
            type: 'object',
            properties: {
              therapists: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    photoUrl: { type: 'string' },
                    title: { type: 'string' },
                    bio: { type: 'string' },
                    location: { type: 'string' },
                    gender: { type: 'string' },
                    specialties: { type: 'array', items: { type: 'string' } },
                    therapyTypes: { type: 'array', items: { type: 'string' } },
                    insurances: { type: 'array', items: { type: 'string' } },
                    acceptingNewClients: { type: 'boolean' },
                    sessionFee: { type: 'string' },
                    languages: { type: 'array', items: { type: 'string' } },
                    yearsExperience: { type: 'integer' },
                    phone: { type: 'string' },
                    email: { type: 'string' },
                    websiteUrl: { type: ['string', 'null'] },
                    slidingScale: { type: 'boolean' },
                    slidingScaleMinFee: { type: ['string', 'null'] },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          location?: string;
          gender?: string;
          specialty?: string;
          therapy_type?: string;
          insurance?: string;
          search?: string;
          sort?: string;
          slidingScale?: boolean | string;
        };
      }>,
      reply: FastifyReply
    ) => {
      app.logger.info({ query: request.query }, 'Fetching therapists');

      const conditions = [];

      if (request.query.location) {
        conditions.push(ilike(schema.therapists.location, request.query.location));
      }

      if (request.query.gender) {
        conditions.push(eq(schema.therapists.gender, request.query.gender));
      }

      if (request.query.specialty) {
        conditions.push(sql`${request.query.specialty} = ANY(${schema.therapists.specialties})`);
      }

      if (request.query.therapy_type) {
        conditions.push(sql`${request.query.therapy_type} = ANY(${schema.therapists.therapyTypes})`);
      }

      if (request.query.insurance) {
        conditions.push(sql`${request.query.insurance} = ANY(${schema.therapists.insurances})`);
      }

      if (request.query.search) {
        conditions.push(
          sql`${schema.therapists.name} ILIKE ${'%' + request.query.search + '%'} OR ${schema.therapists.bio} ILIKE ${'%' + request.query.search + '%'}`
        );
      }

      if (request.query.slidingScale !== undefined) {
        const slidingScaleValue = request.query.slidingScale === 'true' || request.query.slidingScale === true;
        conditions.push(eq(schema.therapists.slidingScale, slidingScaleValue));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build query with optional sorting and default ordering by is_pinned and created_at
      const baseQuery = app.db
        .select()
        .from(schema.therapists)
        .where(whereClause);

      const therapists = await (
        request.query.sort === 'price_asc'
          ? baseQuery.orderBy(asc(schema.therapists.sessionFee))
          : request.query.sort === 'price_desc'
          ? baseQuery.orderBy(desc(schema.therapists.sessionFee))
          : baseQuery.orderBy(desc(schema.therapists.isPinned), desc(schema.therapists.createdAt))
      );

      app.logger.info({ count: therapists.length, sort: request.query.sort }, 'Therapists fetched');

      return {
        therapists,
        total: therapists.length,
      };
    }
  );

  fastify.get(
    '/api/therapists/:id',
    {
      schema: {
        description: 'Get a single therapist by ID',
        tags: ['therapists'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Therapist ID' },
          },
        },
        response: {
          200: {
            description: 'Therapist details',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              photoUrl: { type: 'string' },
              title: { type: 'string' },
              bio: { type: 'string' },
              location: { type: 'string' },
              gender: { type: 'string' },
              specialties: { type: 'array', items: { type: 'string' } },
              therapyTypes: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
              acceptingNewClients: { type: 'boolean' },
              sessionFee: { type: 'string' },
              languages: { type: 'array', items: { type: 'string' } },
              yearsExperience: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
              websiteUrl: { type: ['string', 'null'] },
              slidingScale: { type: 'boolean' },
              slidingScaleMinFee: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            description: 'Therapist not found',
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
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      app.logger.info({ id }, 'Fetching therapist by ID');

      const therapist = await app.db
        .select()
        .from(schema.therapists)
        .where(eq(schema.therapists.id, id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ id }, 'Therapist not found');
        return reply.status(404).send({ error: 'Therapist not found' });
      }

      app.logger.info({ id }, 'Therapist retrieved successfully');
      return therapist[0];
    }
  );

  fastify.get(
    '/api/filters',
    {
      schema: {
        description: 'Get available filter options',
        tags: ['therapists'],
        response: {
          200: {
            description: 'Filter options',
            type: 'object',
            properties: {
              locations: { type: 'array', items: { type: 'string' } },
              genders: { type: 'array', items: { type: 'string' } },
              specialties: { type: 'array', items: { type: 'string' } },
              therapy_types: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info('Fetching filter options');

      return {
        locations: [
          'Vancouver',
          'Victoria',
          'Kelowna',
          'Surrey',
          'Burnaby',
          'Richmond',
          'Abbotsford',
          'Kamloops',
          'Nanaimo',
          'Prince George',
        ],
        genders: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        specialties: [
          'Anxiety',
          'Depression',
          'Trauma',
          'PTSD',
          'Grief',
          'Relationships',
          'Addiction',
          'ADHD',
          'OCD',
          'Eating Disorders',
          'Anger Management',
          'Stress',
        ],
        therapy_types: [
          'CBT',
          'DBT',
          'EMDR',
          'Psychodynamic',
          'Mindfulness-Based',
          'Solution-Focused',
          'ACT',
          'Narrative Therapy',
          'Somatic Therapy',
        ],
        insurances: [
          'ICBC',
          'WorkSafeBC',
          'Blue Cross',
          'Sun Life',
          'Manulife',
          'Great-West Life',
          'Desjardins',
          'Self-pay',
        ],
      };
    }
  );

  // GET /api/therapists/me - Get authenticated therapist's own profile
  fastify.get(
    '/api/therapists/me',
    {
      schema: {
        description: 'Get current authenticated therapist profile',
        tags: ['therapists'],
        response: {
          200: {
            description: 'Therapist profile',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              photoUrl: { type: 'string' },
              title: { type: 'string' },
              bio: { type: 'string' },
              location: { type: 'string' },
              gender: { type: 'string' },
              specialties: { type: 'array', items: { type: 'string' } },
              therapyTypes: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
              acceptingNewClients: { type: 'boolean' },
              sessionFee: { type: 'string' },
              languages: { type: 'array', items: { type: 'string' } },
              yearsExperience: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
              websiteUrl: { type: ['string', 'null'] },
              slidingScale: { type: 'boolean' },
              slidingScaleMinFee: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              licenseDocuments: { type: 'array', items: { type: 'string' } },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Therapist profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching own therapist profile');

      const therapist = await app.db
        .select()
        .from(schema.therapists)
        .where(eq(schema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'Therapist profile not found');
        return reply.status(404).send({ error: 'Therapist profile not found' });
      }

      app.logger.info({ userId: session.user.id, therapistId: therapist[0].id }, 'Therapist profile retrieved');
      return therapist[0];
    }
  );

  // PUT /api/therapists/me - Update authenticated therapist's own profile
  fastify.put(
    '/api/therapists/me',
    {
      schema: {
        description: 'Update current authenticated therapist profile',
        tags: ['therapists'],
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
            accepting_new_clients: { type: 'boolean' },
            session_fee: { type: 'number' },
            languages: { type: 'array', items: { type: 'string' } },
            years_experience: { type: 'integer' },
            phone: { type: 'string' },
            email: { type: 'string' },
            website_url: { type: 'string' },
            license_documents: { type: 'array', items: { type: 'string' } },
            sliding_scale: { type: 'boolean' },
            sliding_scale_min_fee: { type: 'number' },
          },
        },
        response: {
          200: {
            description: 'Updated therapist profile',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              photoUrl: { type: 'string' },
              title: { type: 'string' },
              bio: { type: 'string' },
              location: { type: 'string' },
              gender: { type: 'string' },
              specialties: { type: 'array', items: { type: 'string' } },
              therapyTypes: { type: 'array', items: { type: 'string' } },
              insurances: { type: 'array', items: { type: 'string' } },
              acceptingNewClients: { type: 'boolean' },
              sessionFee: { type: 'string' },
              languages: { type: 'array', items: { type: 'string' } },
              yearsExperience: { type: 'integer' },
              phone: { type: 'string' },
              email: { type: 'string' },
              websiteUrl: { type: ['string', 'null'] },
              slidingScale: { type: 'boolean' },
              slidingScaleMinFee: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              licenseDocuments: { type: 'array', items: { type: 'string' } },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          404: {
            description: 'Therapist profile not found',
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
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
          accepting_new_clients?: boolean;
          session_fee?: number;
          languages?: string[];
          years_experience?: number;
          phone?: string;
          email?: string;
          website_url?: string;
          license_documents?: string[];
          sliding_scale?: boolean;
          sliding_scale_min_fee?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Updating own therapist profile');

      // Check if therapist exists
      const existing = await app.db
        .select()
        .from(schema.therapists)
        .where(eq(schema.therapists.userId, session.user.id))
        .limit(1);

      if (existing.length === 0) {
        app.logger.info({ userId: session.user.id }, 'Therapist profile not found');
        return reply.status(404).send({ error: 'Therapist profile not found' });
      }

      // Build update object from provided fields only
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
      if (request.body.accepting_new_clients !== undefined) updateData.acceptingNewClients = request.body.accepting_new_clients;
      if (request.body.session_fee !== undefined) updateData.sessionFee = request.body.session_fee.toString();
      if (request.body.languages !== undefined) updateData.languages = request.body.languages;
      if (request.body.years_experience !== undefined) updateData.yearsExperience = request.body.years_experience;
      if (request.body.phone !== undefined) updateData.phone = request.body.phone;
      if (request.body.email !== undefined) updateData.email = request.body.email;
      if (request.body.website_url !== undefined) updateData.websiteUrl = request.body.website_url;
      if (request.body.license_documents !== undefined) updateData.licenseDocuments = request.body.license_documents;
      if (request.body.sliding_scale !== undefined) updateData.slidingScale = request.body.sliding_scale;
      if (request.body.sliding_scale_min_fee !== undefined) updateData.slidingScaleMinFee = request.body.sliding_scale_min_fee.toString();

      const updated = await app.db
        .update(schema.therapists)
        .set(updateData)
        .where(eq(schema.therapists.userId, session.user.id))
        .returning();

      app.logger.info(
        { userId: session.user.id, therapistId: updated[0].id, updatedFields: Object.keys(updateData).length },
        'Therapist profile updated successfully'
      );

      return updated[0];
    }
  );
}
