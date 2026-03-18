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
    const contentCount = await app.db
      .select()
      .from(appSchema.appContent);

    if (contentCount.length === 0) {
      app.logger.info('Seeding app content');
      await app.db.insert(appSchema.appContent).values([
        {
          key: 'home_banner',
          value: '{"title":"Find a Mental Health Professional in BC","subtitle":"Browse our directory of licensed providers"}',
        },
        {
          key: 'faq',
          value: '[{"q":"Is this a referral service?","a":"No. This is an independent advertising directory. We do not refer or assign clients."},{"q":"How do I contact a therapist?","a":"Browse the directory and use the contact details on each provider profile."},{"q":"Are therapists verified?","a":"Therapists are responsible for maintaining their own licensure. We encourage users to verify credentials independently."}]',
        },
        {
          key: 'promo_text',
          value: '{"text":"Founding Member Offer: List your practice for $29.99/month — valid through June 30, 2026"}',
        },
      ]);
      app.logger.info('App content seeded successfully');
    } else {
      app.logger.info('App content already seeded');
    }
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

await app.run();

// Seed admin user and app content after app is running
seedAdminUser().catch((err) => {
  app.logger.error({ err }, 'Failed to seed admin user');
});

seedAppContent().catch((err) => {
  app.logger.error({ err }, 'Failed to seed app content');
});

app.logger.info('Application running');
