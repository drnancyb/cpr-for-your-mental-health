import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
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
      full_name: app_record.name,
      email: app_record.email,
      phone: app_record.phone,
      title: app_record.title,
      bio: app_record.bio,
      location: app_record.location,
      gender: app_record.gender,
      specialties: app_record.specialties,
      therapy_types: app_record.therapyTypes,
      insurances: app_record.insurances,
      session_fee: app_record.sessionFee,
      languages: app_record.languages,
      years_experience: app_record.yearsExperience,
      photo_url: app_record.photoUrl,
      website_url: app_record.websiteUrl,
      admin_notes: app_record.adminNotes,
      rejection_reason: app_record.rejectionReason,
      status: app_record.status,
      created_at: app_record.createdAt,
      user_id: app_record.userId,
    };
  }

  // GET /api/admin/applications - List all applications
  fastify.get(
    '/api/admin/applications',
    {
      schema: {
        description: 'Get all therapist applications (admin only)',
        tags: ['admin', 'applications'],
        response: {
          200: {
            description: 'List of therapist applications',
            type: 'array',
            items: { type: 'object' },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching all therapist applications');

      const applications = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .orderBy(sql`${appSchema.therapistApplications.createdAt} DESC`);

      app.logger.info({ count: applications.length }, 'Applications retrieved');

      return applications.map(formatApplication);
    }
  );

  // GET /api/admin/applications/:id - Get single application
  fastify.get(
    '/api/admin/applications/:id',
    {
      schema: {
        description: 'Get a single therapist application (admin only)',
        tags: ['admin', 'applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: { type: 'object' },
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

      const { id } = request.params;
      app.logger.info({ applicationId: id }, 'Fetching application');

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      app.logger.info({ applicationId: id }, 'Application retrieved');
      return formatApplication(application[0]);
    }
  );

  // PATCH /api/admin/applications/:id/status - Update application status
  fastify.patch(
    '/api/admin/applications/:id/status',
    {
      schema: {
        description: 'Update therapist application status (admin only)',
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
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            rejection_reason: { type: 'string' },
          },
        },
        response: {
          200: { type: 'object' },
          400: { type: 'object', properties: { error: { type: 'string' } } },
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
          status: 'approved' | 'rejected';
          rejection_reason?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAdmin(request, reply);
      if (!session) return;

      const { id } = request.params;
      const { status, rejection_reason } = request.body;

      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        app.logger.warn({ status }, 'Invalid status provided');
        return reply.status(400).send({ error: 'Invalid status. Must be "approved" or "rejected"' });
      }

      app.logger.info({ applicationId: id, status }, 'Updating application status');

      // Get the application
      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const app_record = application[0];

      // If approved, create therapist if not already exists
      if (status === 'approved') {
        const existingTherapist = await app.db
          .select()
          .from(appSchema.therapists)
          .where(eq(appSchema.therapists.userId, app_record.userId))
          .limit(1);

        if (existingTherapist.length === 0) {
          app.logger.info(
            { applicationId: id, userId: app_record.userId },
            'Creating therapist from approved application'
          );

          await app.db.insert(appSchema.therapists).values({
            name: app_record.name,
            photoUrl: app_record.photoUrl || 'https://picsum.photos/seed/therapist/200/200',
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
            userId: app_record.userId,
            isPinned: false,
            licenseDocuments: app_record.licenseDocuments || [],
          });

          app.logger.info({ applicationId: id }, 'Therapist created from application');
        } else {
          // Update existing therapist with license documents from application
          await app.db
            .update(appSchema.therapists)
            .set({ licenseDocuments: app_record.licenseDocuments || [] })
            .where(eq(appSchema.therapists.userId, app_record.userId));

          app.logger.info(
            { applicationId: id, userId: app_record.userId },
            'Therapist already exists for this user, updated license documents'
          );
        }
      }

      // Update application
      const updated = await app.db
        .update(appSchema.therapistApplications)
        .set({
          status,
          rejectionReason: rejection_reason || null,
          updatedAt: sql`now()`,
        })
        .where(eq(appSchema.therapistApplications.id, id))
        .returning();

      app.logger.info({ applicationId: id, status }, 'Application updated');

      return formatApplication(updated[0]);
    }
  );
}
