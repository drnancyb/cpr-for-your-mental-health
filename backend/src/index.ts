import { createApplication } from "@specific-dev/framework";
import { eq } from 'drizzle-orm';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { hash } from 'bcryptjs';
import * as therapistsRoutes from './routes/therapists.js';
import * as applicationsRoutes from './routes/applications.js';
import * as adminTherapistsRoutes from './routes/admin-therapists.js';
import * as savedAndBookingsRoutes from './routes/saved-and-bookings.js';
import * as adminAnalyticsRoutes from './routes/admin-analytics.js';
import * as clientPreferencesRoutes from './routes/client-preferences.js';
import * as supportRoutes from './routes/support.js';
import * as adminBootstrapRoutes from './routes/admin-bootstrap.js';
import * as adminLookupRoutes from './routes/admin-lookup.js';
import * as contactRoutes from './routes/contact.js';
import * as adminApplicationsInboxRoutes from './routes/admin-applications-inbox.js';
import * as adminCleanupRoutes from './routes/admin-cleanup.js';
import * as adminLoginRoutes from './routes/admin-login.js';
import * as uploadRoutes from './routes/upload.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth with email/password and OAuth
app.withAuth();

// Seed admin user on startup with proper password hashing
async function seedAdminUser() {
  app.logger.info('Seeding admin user with correct password');
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin@Secure123!';
    const adminId = 'admin-seed-001';

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await hash(adminPassword, 10);

    // Upsert user row
    const now = new Date();
    await app.db
      .insert(authSchema.user)
      .values({
        id: adminId,
        name: 'Admin',
        email: adminEmail,
        emailVerified: true,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: authSchema.user.email,
        set: {
          role: 'admin',
          emailVerified: true,
          updatedAt: now,
        },
      });

    app.logger.info({ email: adminEmail }, 'Admin user upserted');

    // Get the actual user ID for this email (in case it existed before)
    const adminUsers = await app.db
      .select({ id: authSchema.user.id })
      .from(authSchema.user)
      .where(eq(authSchema.user.email, adminEmail))
      .limit(1);

    if (adminUsers.length === 0) {
      app.logger.error({ email: adminEmail }, 'Failed to find admin user after upsert');
      return;
    }

    const actualAdminId = adminUsers[0].id;

    // Delete any existing credential accounts for this user
    await app.db
      .delete(authSchema.account)
      .where(
        eq(authSchema.account.userId, actualAdminId)
      );

    app.logger.info({ userId: actualAdminId }, 'Deleted existing credential accounts');

    // Insert fresh credential account with hashed password
    await app.db.insert(authSchema.account).values({
      id: `${actualAdminId}-credential`,
      accountId: adminEmail,
      providerId: 'credential',
      userId: actualAdminId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    app.logger.info(
      { email: adminEmail, userId: actualAdminId },
      'Admin credential account created with proper password hash'
    );
  } catch (err) {
    app.logger.error({ err }, 'Failed to seed admin user');
  }
}

// Seed test user on startup
async function seedTestUser() {
  app.logger.info('Checking if test user exists');
  try {
    const existingTestUser = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.email, 'test@example.com'))
      .limit(1);

    if (existingTestUser.length === 0) {
      app.logger.info('Creating test user');
      // Use better-auth client to create user properly with hashed password
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      if (response.ok) {
        app.logger.info('Test user created successfully');
      } else {
        app.logger.warn({ status: response.status }, 'Failed to create test user via API');
      }
    } else {
      app.logger.info('Test user already exists');
    }
  } catch (err) {
    app.logger.warn({ err }, 'Test user seeding skipped (will be created on first startup)');
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
adminLookupRoutes.register(app, app.fastify);
contactRoutes.register(app, app.fastify);
adminApplicationsInboxRoutes.register(app, app.fastify);
adminCleanupRoutes.register(app, app.fastify);
adminLoginRoutes.register(app, app.fastify);
uploadRoutes.register(app, app.fastify);

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

// Seed test user, admin user, and app content after app is running
seedTestUser().catch((err) => {
  app.logger.error({ err }, 'Failed to seed test user');
});

seedAdminUser().catch((err) => {
  app.logger.error({ err }, 'Failed to seed admin user');
});

seedAppContent().catch((err) => {
  app.logger.error({ err }, 'Failed to seed app content');
});

app.logger.info('Application running');
