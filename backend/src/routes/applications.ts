import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, sql, inArray } from 'drizzle-orm';
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

  // Helper for optional authentication (doesn't fail if not authenticated)
  async function optionalAuth(request: FastifyRequest) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const sessions = await app.db.select().from(authSchema.session).where(eq(authSchema.session.token, token)).limit(1);
    if (sessions.length === 0) {
      return null;
    }

    const sessionRecord = sessions[0];
    if (new Date() > sessionRecord.expiresAt) {
      return null;
    }

    const users = await app.db.select({ id: authSchema.user.id, role: authSchema.user.role }).from(authSchema.user).where(eq(authSchema.user.id, sessionRecord.userId)).limit(1);
    if (users.length === 0) {
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
            profile_photo_url: { type: ['string', 'null'] },
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
              userId: { type: ['string', 'null'] },
              status: { type: 'string' },
              name: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
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
          profile_photo_url?: string | null;
          website_url?: string | null;
          license_documents?: string[] | null;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Optionally authenticate user, but application can be submitted without authentication
        const auth = await optionalAuth(request);
        const userId = auth?.user?.id || null;

        app.logger.info(
          { userId, name: request.body.name },
          'Creating therapist application'
        );

        // Check if authenticated user already has an active application (pending or approved)
        // Users with rejected or withdrawn applications can resubmit
        if (userId) {
          const existingActiveApp = await app.db
            .select()
            .from(appSchema.therapistApplications)
            .where(
              and(
                eq(appSchema.therapistApplications.userId, userId),
                inArray(appSchema.therapistApplications.status, ['pending', 'approved'])
              )
            )
            .limit(1);

          if (existingActiveApp.length > 0) {
            app.logger.warn(
              { userId },
              'User already has an active application'
            );
            await reply.status(409).send({ error: 'User already has an active application' });
            return;
          }
        }

        const application = await app.db
          .insert(appSchema.therapistApplications)
          .values({
            userId,
            status: 'pending',
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
            photoUrl: request.body.profile_photo_url || request.body.photo_url || null,
            websiteUrl: request.body.website_url || null,
            licenseDocuments: request.body.license_documents || [],
          })
          .returning();

        app.logger.info(
          { applicationId: application[0].id, userId },
          'Therapist application created'
        );

        reply.status(201);
        return application[0];
      } catch (error) {
        app.logger.error({ err: error, body: request.body }, 'Failed to create application');
        await reply.status(500).send({ error: 'Failed to create application' });
      }
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
      try {
        const auth = await requireAuth(request, reply);
        if (!auth) return;

        app.logger.info({ userId: auth.user.id }, 'Fetching user application');

        const application = await app.db
          .select()
          .from(appSchema.therapistApplications)
          .where(eq(appSchema.therapistApplications.userId, auth.user.id))
          .limit(1);

        if (application.length === 0) {
          app.logger.info({ userId: auth.user.id }, 'No application found');
          return reply.status(404).send({ error: 'Application not found' });
        }

        app.logger.info({ applicationId: application[0].id }, 'Application retrieved');
        return application[0];
      } catch (error) {
        app.logger.error({ err: error, userId: request.headers.authorization }, 'Failed to fetch application');
        await reply.status(500).send({ error: 'Failed to fetch application' });
      }
    }
  );

  // POST /api/applications/upload-photo - Upload therapist photo
  fastify.post(
    '/api/applications/upload-photo',
    {
      schema: {
        description: 'Upload a photo for therapist application',
        tags: ['applications'],
        response: {
          201: {
            description: 'Photo uploaded successfully',
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          413: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const auth = await requireAuth(request, reply);
        if (!auth) return;

        app.logger.info({ userId: auth.user.id }, 'Uploading application photo');

        // Get the file upload
        const data = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
        if (!data) {
          app.logger.warn({ userId: auth.user.id }, 'No file provided for photo upload');
          await reply.status(400).send({ error: 'No file provided' });
          return;
        }

        // Validate MIME type or file extension
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const fileExtension = data.filename.split('.').pop()?.toLowerCase() || '';

        const isValidMimeType = allowedMimes.includes(data.mimetype);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (!isValidMimeType && !isValidExtension) {
          app.logger.warn({ userId: auth.user.id, mimeType: data.mimetype, extension: fileExtension }, 'Invalid file type for photo upload');
          await reply.status(400).send({ error: 'Only JPEG, PNG, and WebP images are allowed' });
          return;
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.error({ userId: auth.user.id, err }, 'Failed to read file buffer');
          await reply.status(413).send({ error: 'File too large' });
          return;
        }

        // Generate storage key
        const storageKey = `applications/photos/${Date.now()}-${data.filename}`;

        // Upload to storage
        let uploadedKey: string;
        try {
          uploadedKey = await app.storage.upload(storageKey, buffer);
          app.logger.info({ userId: auth.user.id, storageKey: uploadedKey }, 'Photo uploaded to storage');
        } catch (err) {
          app.logger.error({ userId: auth.user.id, err }, 'Failed to upload photo to storage');
          await reply.status(500).send({ error: 'Failed to upload photo' });
          return;
        }

        // Record metadata in database
        let document;
        try {
          const inserted = await app.db
            .insert(appSchema.uploadedDocuments)
            .values({
              userId: auth.user.id,
              filename: data.filename,
              mimeType: data.mimetype,
              fileData: '', // Keep empty since we're using S3
              storageKey: uploadedKey,
            })
            .returning();
          document = inserted[0];
          app.logger.info({ userId: auth.user.id, documentId: document.id }, 'Photo metadata recorded in database');
        } catch (err) {
          app.logger.error({ userId: auth.user.id, err }, 'Failed to record photo metadata');
          await reply.status(500).send({ error: 'Failed to save photo metadata' });
          return;
        }

        // Generate public URL
        const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost';
        const protocol = request.headers['x-forwarded-proto'] || 'http';
        const url = `${protocol}://${host}/api/applications/photo/${document.id}`;

        app.logger.info({ userId: auth.user.id, url }, 'Photo upload completed');
        await reply.status(201).send({ url });
      } catch (error) {
        app.logger.error({ err: error, userId: request.headers.authorization }, 'Failed to upload photo');
        await reply.status(500).send({ error: 'Failed to upload photo' });
      }
    }
  );

  // GET /api/applications/photo/:id - Get uploaded photo
  fastify.get(
    '/api/applications/photo/:id',
    {
      schema: {
        description: 'Get an uploaded application photo',
        tags: ['applications'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Photo image',
            type: 'string',
            format: 'binary',
          },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        app.logger.info({ photoId: id }, 'Fetching application photo');

        // Look up document by ID
        const document = await app.db
          .select()
          .from(appSchema.uploadedDocuments)
          .where(eq(appSchema.uploadedDocuments.id, id))
          .limit(1);

        if (document.length === 0) {
          app.logger.info({ photoId: id }, 'Photo not found');
          await reply.status(404).send({ error: 'Photo not found' });
          return;
        }

        const doc = document[0];
        if (!doc.storageKey) {
          app.logger.warn({ photoId: id }, 'Photo has no storage key');
          await reply.status(404).send({ error: 'Photo not found' });
          return;
        }

        // Download from storage
        let buffer: Buffer;
        try {
          buffer = await app.storage.download(doc.storageKey);
          app.logger.info({ photoId: id, storageKey: doc.storageKey }, 'Photo downloaded from storage');
        } catch (err) {
          app.logger.error({ photoId: id, err }, 'Failed to download photo from storage');
          await reply.status(404).send({ error: 'Photo not found' });
          return;
        }

        // Set content type and return image
        reply.header('Content-Type', doc.mimeType);
        return reply.send(buffer);
      } catch (error) {
        app.logger.error({ err: error, photoId: request.params.id }, 'Failed to fetch photo');
        await reply.status(500).send({ error: 'Failed to fetch photo' });
      }
    }
  );

}
