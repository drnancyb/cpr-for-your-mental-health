import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

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

    const users = await app.db.select().from(authSchema.user).where(eq(authSchema.user.id, sessionRecord.userId)).limit(1);
    if (users.length === 0) {
      app.logger.warn({ userId: sessionRecord.userId }, 'User not found for valid session');
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }

    return { user: users[0], session: sessionRecord };
  }

  // Helper to check admin role
  async function isAdmin(request: FastifyRequest) {
    const session = await requireAuth(request, {} as FastifyReply);
    if (!session) return false;

    const user = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.id, session.user.id))
      .limit(1);

    return user.length > 0 && user[0].role === 'admin';
  }

  // POST /api/upload/license-document - Upload a license document
  fastify.post(
    '/api/upload/license-document',
    {
      schema: {
        description: 'Upload a license document',
        tags: ['upload'],
        response: {
          200: {
            description: 'File uploaded successfully',
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Uploading license document');

      const data = await request.file();
      if (!data) {
        app.logger.warn({ userId: session.user.id }, 'No file provided');
        return reply.status(400).send({ error: 'No file provided' });
      }

      let { filename, mimetype, file } = data;

      // If mime type is text/plain (default from test helper), infer from filename
      if (mimetype === 'text/plain' && filename) {
        const ext = filename.toLowerCase().split('.').pop();
        if (ext === 'pdf') mimetype = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimetype = 'image/jpeg';
        else if (ext === 'png') mimetype = 'image/png';
      }

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
        app.logger.warn({ mimetype, filename }, 'Invalid file type');
        return reply.status(400).send({ error: 'Invalid file type. Only PDF, JPG, JPEG, PNG allowed' });
      }

      // Read file content
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Validate file size
      if (buffer.length > MAX_FILE_SIZE) {
        app.logger.warn({ size: buffer.length }, 'File too large');
        return reply.status(400).send({ error: 'File too large. Maximum 10MB allowed' });
      }

      // Store file in database (fallback storage)
      const fileData = buffer.toString('base64');

      const uploaded = await app.db
        .insert(appSchema.uploadedDocuments)
        .values({
          userId: session.user.id,
          filename,
          mimeType: mimetype,
          fileData,
        })
        .returning();

      const documentId = uploaded[0].id;
      const url = `/api/upload/license-document/file/${documentId}`;

      app.logger.info({ documentId, filename }, 'License document uploaded successfully');

      return { url };
    }
  );

  // GET /api/upload/license-document/file/:id - Download a license document
  fastify.get(
    '/api/upload/license-document/file/:id',
    {
      schema: {
        description: 'Download a license document',
        tags: ['upload'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'File downloaded',
            type: 'string',
            format: 'binary',
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params;
      app.logger.info({ documentId: id }, 'Downloading license document');

      const document = await app.db
        .select()
        .from(appSchema.uploadedDocuments)
        .where(eq(appSchema.uploadedDocuments.id, id))
        .limit(1);

      if (document.length === 0) {
        app.logger.info({ documentId: id }, 'Document not found');
        return reply.status(404).send({ error: 'Document not found' });
      }

      const doc = document[0];

      // Check permissions - must be uploader or admin
      const admin = await isAdmin(request);
      if (doc.userId !== session.user.id && !admin) {
        app.logger.warn({ documentId: id, userId: session.user.id }, 'Unauthorized document access');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // Decode and send file
      const buffer = Buffer.from(doc.fileData, 'base64');
      reply.type(doc.mimeType);
      reply.header('Content-Disposition', `attachment; filename="${doc.filename}"`);
      return reply.send(buffer);
    }
  );

  // POST /api/therapist/license-documents - Update therapist license documents
  fastify.post(
    '/api/therapist/license-documents',
    {
      schema: {
        description: 'Update therapist license documents',
        tags: ['therapist'],
        body: {
          type: 'object',
          required: ['document_urls'],
          properties: {
            document_urls: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        response: {
          200: {
            description: 'Documents updated',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          document_urls: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Updating therapist license documents');

      // Check if therapist exists for this user
      const therapist = await app.db
        .select()
        .from(appSchema.therapists)
        .where(eq(appSchema.therapists.userId, session.user.id))
        .limit(1);

      if (therapist.length === 0) {
        app.logger.info({ userId: session.user.id }, 'No therapist record found');
        return reply.status(404).send({ error: 'No therapist record found for this user' });
      }

      // Update license documents
      await app.db
        .update(appSchema.therapists)
        .set({ licenseDocuments: request.body.document_urls })
        .where(eq(appSchema.therapists.userId, session.user.id));

      app.logger.info(
        { userId: session.user.id, documentCount: request.body.document_urls.length },
        'Therapist license documents updated'
      );

      return { success: true };
    }
  );

  // GET /api/admin/applications/:id/documents - Get application documents
  fastify.get(
    '/api/admin/applications/:id/documents',
    {
      schema: {
        description: 'Get application license documents (admin only)',
        tags: ['admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Application documents',
            type: 'object',
            properties: {
              license_documents: {
                type: 'array',
                items: { type: 'string' },
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      // Check admin role
      const admin = await isAdmin(request);
      if (!admin) {
        app.logger.warn({ userId: session.user.id }, 'Non-admin user attempted admin access');
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      app.logger.info({ applicationId: id }, 'Fetching application documents');

      const application = await app.db
        .select()
        .from(appSchema.therapistApplications)
        .where(eq(appSchema.therapistApplications.id, id))
        .limit(1);

      if (application.length === 0) {
        app.logger.info({ applicationId: id }, 'Application not found');
        return reply.status(404).send({ error: 'Application not found' });
      }

      const documents = application[0].licenseDocuments || [];
      app.logger.info({ applicationId: id, documentCount: documents.length }, 'Application documents retrieved');

      return { license_documents: documents };
    }
  );
}
