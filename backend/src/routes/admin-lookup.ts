import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ilike } from 'drizzle-orm';
import * as appSchema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // GET /admin/lookup/nancy-brooks - Lookup Nancy Brooks in therapists and user tables
  fastify.get(
    '/admin/lookup/nancy-brooks',
    {
      schema: {
        description: 'Lookup Nancy Brooks in therapists and user tables (no auth required)',
        tags: ['admin', 'lookup'],
        response: {
          200: {
            description: 'Lookup results',
            type: 'object',
            properties: {
              user_results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                  },
                },
              },
              therapist_results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    userId: { type: ['string', 'null'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Nancy Brooks lookup request');

      // Search therapists table
      const therapistResults = await app.db
        .select({
          id: appSchema.therapists.id,
          name: appSchema.therapists.name,
          email: appSchema.therapists.email,
          userId: appSchema.therapists.userId,
        })
        .from(appSchema.therapists)
        .where(ilike(appSchema.therapists.name, '%Nancy Brooks%'));

      app.logger.info(
        { therapistCount: therapistResults.length },
        'Therapists search completed'
      );

      // Search user table
      const userResults = await app.db
        .select({
          id: authSchema.user.id,
          name: authSchema.user.name,
          email: authSchema.user.email,
          role: authSchema.user.role,
        })
        .from(authSchema.user)
        .where(ilike(authSchema.user.name, '%Nancy Brooks%'));

      app.logger.info(
        { userCount: userResults.length },
        'User table search completed'
      );

      return {
        user_results: userResults,
        therapist_results: therapistResults,
      };
    }
  );
}
