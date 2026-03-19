import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import * as therapistsRoutes from './routes/therapists.js';
import * as applicationsRoutes from './routes/applications.js';
import * as adminTherapistsRoutes from './routes/admin-therapists.js';
import * as savedAndBookingsRoutes from './routes/saved-and-bookings.js';
import * as adminAnalyticsRoutes from './routes/admin-analytics.js';
import * as clientPreferencesRoutes from './routes/client-preferences.js';
import * as supportRoutes from './routes/support.js';
import * as adminBootstrapRoutes from './routes/admin-bootstrap.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth with email/password and OAuth
app.withAuth();

// Seed admin user on startup
async function seedAdminUser() {
  app.logger.info('Checking if admin user exists');
  try {
    const existingAdmin = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.email, 'admin@bctherapistfinder.ca'))
      .limit(1);

    if (existingAdmin.length === 0) {
      app.logger.info('Creating admin user');
      // Use better-auth client to create user properly with hashed password
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@bctherapistfinder.ca',
          password: 'Admin1234!',
          name: 'Admin',
        }),
      });

      if (response.ok) {
        await app.db
          .update(authSchema.user)
          .set({ role: 'admin' })
          .where(eq(authSchema.user.email, 'admin@bctherapistfinder.ca'));
        app.logger.info('Admin user created successfully');
      } else {
        app.logger.warn({ status: response.status }, 'Failed to create admin user via API');
      }
    } else {
      app.logger.info('Admin user already exists');
    }
  } catch (err) {
    app.logger.warn({ err }, 'Admin user seeding skipped (will be created on first startup)');
  }
}

// Seed app content on startup
async function seedAppContent() {
  app.logger.info('Checking if app content is seeded');
  try {
    const defaultContent = [
      {
        key: 'home_banner',
        value: 'Welcome to CPR — Canadian Psychological Resources',
      },
      {
        key: 'promo_text',
        value: 'Find the right therapist for you. Browse our network of certified professionals.',
      },
      {
        key: 'faq',
        value: 'Q: How do I book a session?\nA: Browse therapists, tap Book, and submit your request.\n\nQ: Is my information private?\nA: Yes, all data is encrypted and confidential.',
      },
    ];

    for (const content of defaultContent) {
      const existing = await app.db
        .select()
        .from(appSchema.appContent)
        .where(eq(appSchema.appContent.key, content.key))
        .limit(1);

      if (existing.length === 0) {
        await app.db.insert(appSchema.appContent).values(content);
        app.logger.info({ key: content.key }, 'App content row seeded');
      }
    }
    app.logger.info('App content seeding completed');
  } catch (err) {
    app.logger.warn({ err }, 'App content seeding skipped');
  }
}

// Register routes
therapistsRoutes.register(app, app.fastify);
applicationsRoutes.register(app, app.fastify);
adminTherapistsRoutes.register(app, app.fastify);
savedAndBookingsRoutes.register(app, app.fastify);
adminAnalyticsRoutes.register(app, app.fastify);
clientPreferencesRoutes.register(app, app.fastify);
supportRoutes.register(app, app.fastify);
adminBootstrapRoutes.register(app, app.fastify);

// Health check endpoint
app.fastify.get('/', {
  schema: {
    description: 'Health check endpoint',
    tags: ['health'],
    response: {
      200: {
        description: 'Server is running',
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  app.logger.info({}, 'Health check');
  return { status: 'ok' };
});

await app.run();

// Seed admin user and app content after app is running
seedAdminUser().catch((err) => {
  app.logger.error({ err }, 'Failed to seed admin user');
});

seedAppContent().catch((err) => {
  app.logger.error({ err }, 'Failed to seed app content');
});

app.logger.info('Application running');
