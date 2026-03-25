import { createApplication } from "@specific-dev/framework";
import { eq, sql } from 'drizzle-orm';
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

// Enable storage for file uploads
app.withStorage();

// Seed admin users on startup with proper password hashing
async function seedAdminUser() {
  app.logger.info('Seeding admin users');
  const adminAccounts = [
    { email: 'admin@example.com', password: 'Admin@Secure123!', name: 'Admin' },
    { email: 'admin@cpr.ca', password: 'Admin1234!', name: 'CPR Admin' },
  ];

  for (const adminAccount of adminAccounts) {
    try {
      const now = new Date();

      // Hash password with bcrypt (cost factor 10 per spec)
      const hashedPassword = await hash(adminAccount.password, 10);

      // Upsert admin user
      await app.db
        .insert(authSchema.user)
        .values({
          id: `${adminAccount.email.split('@')[0]}-seed`,
          name: adminAccount.name,
          email: adminAccount.email,
          emailVerified: true,
          role: 'admin',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: authSchema.user.email,
          set: {
            role: 'admin',
            name: adminAccount.name,
            emailVerified: true,
            updatedAt: now,
          },
        });

      // Get the actual user ID for this email (may differ if email already existed)
      const adminUsers = await app.db
        .select({ id: authSchema.user.id })
        .from(authSchema.user)
        .where(eq(authSchema.user.email, adminAccount.email))
        .limit(1);

      if (adminUsers.length === 0) {
        app.logger.error({ email: adminAccount.email }, 'Failed to find admin user after upsert');
        continue;
      }

      const actualAdminId = adminUsers[0].id;

      // Try to upsert credential account with conflict on (user_id, provider_id)
      // If this fails due to missing unique constraint, fall back to delete and insert
      try {
        await app.db
          .insert(authSchema.account)
          .values({
            id: `${adminAccount.email.split('@')[0]}-account-seed`,
            accountId: actualAdminId,
            providerId: 'credential',
            userId: actualAdminId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [authSchema.account.userId, authSchema.account.providerId],
            set: {
              password: hashedPassword,
              updatedAt: now,
            },
          });
      } catch {
        // Fallback: delete existing credential account and insert fresh
        await app.db
          .delete(authSchema.account)
          .where(
            eq(authSchema.account.userId, actualAdminId)
          );

        await app.db.insert(authSchema.account).values({
          id: `${adminAccount.email.split('@')[0]}-account-seed`,
          accountId: actualAdminId,
          providerId: 'credential',
          userId: actualAdminId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });
      }

      app.logger.info({ email: adminAccount.email }, `[seed] Admin user seeded: ${adminAccount.email} / ${adminAccount.password}`);
    } catch (err) {
      app.logger.error({ err, email: adminAccount.email }, 'Failed to seed admin user');
    }
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

// Clean up invalid status values in therapist_applications
async function cleanupApplicationStatuses() {
  app.logger.info('Checking therapist_applications for invalid status values');
  try {
    // Find all rows with invalid status values (NULL, empty string, or not in valid enum)
    const invalidApps = await app.db
      .select()
      .from(appSchema.therapistApplications)
      .where(sql`${appSchema.therapistApplications.status} IS NULL OR ${appSchema.therapistApplications.status} = '' OR ${appSchema.therapistApplications.status} NOT IN ('pending', 'approved', 'rejected')`);

    if (invalidApps.length > 0) {
      // Group invalid statuses to show what values exist
      const uniqueStatuses = new Set(invalidApps.map(app => app.status));
      const statusCounts: Record<string, number> = {};
      uniqueStatuses.forEach(status => {
        statusCounts[status === null || status === '' ? 'NULL/empty' : status] = invalidApps.filter(app => app.status === status).length;
      });

      app.logger.info(
        { count: invalidApps.length, invalidStatuses: statusCounts },
        'Found invalid status values, migrating to pending'
      );

      // Update all invalid status values to 'pending'
      await app.db
        .update(appSchema.therapistApplications)
        .set({ status: 'pending' })
        .where(sql`${appSchema.therapistApplications.status} IS NULL OR ${appSchema.therapistApplications.status} = '' OR ${appSchema.therapistApplications.status} NOT IN ('pending', 'approved', 'rejected')`);

      app.logger.info(
        { count: invalidApps.length, invalidStatuses: statusCounts },
        'Invalid statuses migrated successfully'
      );
    } else {
      app.logger.info('All therapist_applications have valid status values');
    }
  } catch (err) {
    app.logger.warn({ err }, 'Application status cleanup skipped or failed');
  }
}

// Log diagnostic status counts for therapist_applications
async function logApplicationStatusCounts() {
  app.logger.info('Generating diagnostic report of therapist_applications statuses');
  try {
    const rows = await app.db.select({ status: appSchema.therapistApplications.status }).from(appSchema.therapistApplications);

    const counts: Record<string, number> = {};
    rows.forEach(row => {
      const status = row.status || 'NULL';
      counts[status] = (counts[status] || 0) + 1;
    });

    console.log('[startup] therapist_applications status counts:', counts);
    app.logger.info({ counts }, 'Therapist applications status distribution');
  } catch (err) {
    app.logger.warn({ err }, 'Failed to generate application status diagnostics');
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

cleanupApplicationStatuses().catch((err) => {
  app.logger.error({ err }, 'Failed to cleanup application statuses');
});

logApplicationStatusCounts().catch((err) => {
  app.logger.error({ err }, 'Failed to log application status counts');
});

app.logger.info('Application running');
