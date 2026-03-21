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

  // Helper to format application response
  function formatApplication(app_record: any) {
    return {
      id: app_record.id,
      name: app_record.name,
      email: app_record.email,
      city: app_record.location,
      status: app_record.status,
      submitted_at: app_record.createdAt,
      bio: app_record.bio,
      specialties: app_record.specialties || [],
      therapy_types: app_record.therapyTypes || [],
      languages: app_record.languages || [],
      years_experience: app_record.yearsExperience,
      session_fee: app_record.sessionFee,
      accepting_new_clients: true,
      insurance_accepted: app_record.insurances || [],
      phone: app_record.phone,
      website: app_record.websiteUrl,
    };
  }

  // GET /api/admin/applications - List all applications
  fastify.get(
    '/api/admin/applications',
    {
      schema: {
        description: 'List all therapist applications (admin only)',
        tags: ['admin', 'applications'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status (pending, approved, rejected)' },
          },
        },
        response: {
          200: {
            description: 'List of applications',
            type: 'object',
            properties: {
              applications: {
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
    async (
      request: FastifyRequest<{
        Querystring: { status?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id, status: request.query.status }, 'Fetching applications');

      const conditions = [];
      if (request.query.status) {
        conditions.push(eq(appSchema.therapistApplications.status, request.query.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const applications = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(whereClause)
        .orderBy(sql`${appSchema.therapistApplications.createdAt} DESC`);

      app.logger.info({ count: applications.length }, 'Applications retrieved');

      return {
        applications: applications.map(formatApplication),
      };
    }
  );

  // GET /api/admin/applications/:id - Get application with messages
  fastify.get(
    '/api/admin/applications/:id',
    {
      schema: {
        description: 'Get single application with messages (admin only)',
        tags: ['admin', 'applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Application with messages',
            type: 'object',
            properties: {
              application: { type: 'object' },
              messages: { type: 'array', items: { type: 'object' } },
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
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id, applicationId: request.params.id }, 'Fetching application detail');

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, request.params.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: request.params.id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const messages = await app.db
        .select()
        .from(appSchema.applicationMessages)
        .where(eq(appSchema.applicationMessages.applicationId, request.params.id))
        .orderBy(appSchema.applicationMessages.createdAt);

      app.logger.info({ applicationId: request.params.id, messageCount: messages.length }, 'Application retrieved');

      return {
        application: formatApplication(application[0]),
        messages: messages.map((msg) => ({
          id: msg.id,
          admin_id: msg.adminId,
          message: msg.message,
          created_at: msg.createdAt,
        })),
      };
    }
  );

  // POST /api/admin/applications/:id/approve - Approve application
  fastify.post(
    '/api/admin/applications/:id/approve',
    {
      schema: {
        description: 'Approve a therapist application (admin only)',
        tags: ['admin', 'applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Application approved',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              therapist_id: { type: 'string', format: 'uuid' },
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
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id, applicationId: request.params.id }, 'Approving application');

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, request.params.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: request.params.id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const app_record = application[0];

      // Create therapist
      const therapist = await app.db
        .insert(appSchema.therapists)
        .values({
          name: app_record.name,
          photoUrl: app_record.photoUrl || '',
          title: app_record.title,
          bio: app_record.bio,
          location: app_record.location,
          gender: app_record.gender,
          specialties: app_record.specialties,
          therapyTypes: app_record.therapyTypes,
          insurances: app_record.insurances,
          acceptingNewClients: true,
          sessionFee: app_record.sessionFee,
          languages: app_record.languages,
          yearsExperience: app_record.yearsExperience,
          phone: app_record.phone,
          email: app_record.email,
          websiteUrl: app_record.websiteUrl,
          isPinned: false,
          userId: app_record.userId,
        })
        .returning();

      // Update application status
      await app.db
        .update(appSchema.therapistApplications)
        .set({
          status: 'approved',
          updatedAt: sql`now()`,
        })
        .where(eq(appSchema.therapistApplications.id, request.params.id));

      app.logger.info(
        { applicationId: request.params.id, therapistId: therapist[0].id },
        'Application approved and therapist created'
      );

      return {
        success: true,
        therapist_id: therapist[0].id,
      };
    }
  );

  // POST /api/admin/applications/:id/reject - Reject application
  fastify.post(
    '/api/admin/applications/:id/reject',
    {
      schema: {
        description: 'Reject a therapist application (admin only)',
        tags: ['admin', 'applications'],
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
            reason: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Application rejected',
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
        Body: { reason?: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info(
        { adminId: session.user.id, applicationId: request.params.id, reason: request.body.reason },
        'Rejecting application'
      );

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, request.params.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: request.params.id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const updateData: any = {
        status: 'rejected',
        updatedAt: sql`now()`,
      };

      if (request.body.reason) {
        updateData.adminNotes = request.body.reason;
      }

      await app.db
        .update(appSchema.therapistApplications)
        .set(updateData)
        .where(eq(appSchema.therapistApplications.id, request.params.id));

      app.logger.info({ applicationId: request.params.id }, 'Application rejected');

      return { success: true };
    }
  );

  // POST /api/admin/applications/:id/messages - Add message
  fastify.post(
    '/api/admin/applications/:id/messages',
    {
      schema: {
        description: 'Add a message to an application (admin only)',
        tags: ['admin', 'applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Message created',
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
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
        Body: { message: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info(
        { adminId: session.user.id, applicationId: request.params.id },
        'Adding message to application'
      );

      // Verify application exists
      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, request.params.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: request.params.id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const message = await app.db
        .insert(appSchema.applicationMessages)
        .values({
          applicationId: request.params.id,
          adminId: session.user.id,
          message: request.body.message,
        })
        .returning();

      app.logger.info(
        { messageId: message[0].id, applicationId: request.params.id },
        'Message added to application'
      );

      return reply.status(201).send({
        id: message[0].id,
        message: message[0].message,
        created_at: message[0].createdAt,
      });
    }
  );

  // GET /api/admin/applications/:id/messages - Get application messages
  fastify.get(
    '/api/admin/applications/:id/messages',
    {
      schema: {
        description: 'Get all messages for an application (admin only)',
        tags: ['admin', 'applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Application messages',
            type: 'object',
            properties: {
              messages: {
                type: 'array',
                items: { type: 'object' },
              },
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
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({ adminId: session.user.id, applicationId: request.params.id }, 'Fetching application messages');

      // Verify application exists
      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, request.params.id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: request.params.id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const messages = await app.db
        .select()
        .from(appSchema.applicationMessages)
        .where(eq(appSchema.applicationMessages.applicationId, request.params.id))
        .orderBy(appSchema.applicationMessages.createdAt);

      app.logger.info({ applicationId: request.params.id, count: messages.length }, 'Messages retrieved');

      return {
        messages: messages.map((msg) => ({
          id: msg.id,
          admin_id: msg.adminId,
          message: msg.message,
          created_at: msg.createdAt,
        })),
      };
    }
  );
}
