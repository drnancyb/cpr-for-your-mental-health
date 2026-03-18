import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import * as therapistsRoutes from './routes/therapists.js';
import * as applicationsRoutes from './routes/applications.js';

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

// Register routes
therapistsRoutes.register(app, app.fastify);
applicationsRoutes.register(app, app.fastify);

await app.run();

// Seed admin user after app is running
seedAdminUser().catch((err) => {
  app.logger.error({ err }, 'Failed to seed admin user');
});

app.logger.info('Application running');
