#!/usr/bin/env bun
/**
 * Data Cleanup Script: Delete all therapists except Nancy Brooks
 *
 * Usage: bun scripts/cleanup-therapists.ts
 *
 * This script deletes all therapists except Nancy Brooks and their related records
 * in a single atomic transaction across all related tables.
 */

import { createApplication } from "@specific-dev/framework";
import { eq, ne, inArray } from 'drizzle-orm';
import * as appSchema from '../src/db/schema/schema.js';
import * as authSchema from '../src/db/schema/auth-schema.js';

const schema = { ...appSchema, ...authSchema };

async function runCleanup() {
  console.log('🧹 Starting therapist cleanup...');

  const app = await createApplication(schema);

  try {
    const result = await app.db.transaction(async (trx) => {
      // Get the IDs of therapists to delete (all except Nancy Brooks)
      console.log('📋 Finding therapists to delete (excluding Nancy Brooks)...');
      const therapistsToDelete = await trx
        .select({ id: appSchema.therapists.id, name: appSchema.therapists.name })
        .from(appSchema.therapists)
        .where(ne(appSchema.therapists.name, 'Nancy Brooks'));

      const therapistIds = therapistsToDelete.map((t) => t.id);
      const therapistNames = therapistsToDelete.map((t) => t.name);

      if (therapistIds.length === 0) {
        console.log('✅ No therapists to delete. Nancy Brooks is the only therapist.');
        return {
          therapistsCount: 0,
          analyticsEventsCount: 0,
          bookingRequestsCount: 0,
          savedTherapistsCount: 0,
          subscriptionsCount: 0,
          therapistNames: [],
        };
      }

      console.log(`\n🎯 Found ${therapistIds.length} therapist(s) to delete:`);
      therapistNames.forEach(name => console.log(`   - ${name}`));

      // 1. Delete from app_analytics_events
      console.log('\n📊 Deleting from app_analytics_events...');
      const analyticsResult = await trx
        .delete(appSchema.appAnalyticsEvents)
        .where(
          inArray(appSchema.appAnalyticsEvents.therapistId, therapistIds)
        );
      const analyticsCount = Array.isArray(analyticsResult) ? analyticsResult.length : 0;
      console.log(`   ✓ Deleted ${analyticsCount} analytics event(s)`);

      // 2. Delete from booking_requests
      console.log('📅 Deleting from booking_requests...');
      const bookingsResult = await trx
        .delete(appSchema.bookingRequests)
        .where(inArray(appSchema.bookingRequests.therapistId, therapistIds));
      const bookingsCount = Array.isArray(bookingsResult) ? bookingsResult.length : 0;
      console.log(`   ✓ Deleted ${bookingsCount} booking request(s)`);

      // 3. Delete from saved_therapists
      console.log('❤️  Deleting from saved_therapists...');
      const savedResult = await trx
        .delete(appSchema.savedTherapists)
        .where(inArray(appSchema.savedTherapists.therapistId, therapistIds));
      const savedCount = Array.isArray(savedResult) ? savedResult.length : 0;
      console.log(`   ✓ Deleted ${savedCount} saved therapist record(s)`);

      // 4. Delete from therapist_subscriptions
      console.log('💳 Deleting from therapist_subscriptions...');
      const subscriptionsResult = await trx
        .delete(appSchema.therapistSubscriptions)
        .where(inArray(appSchema.therapistSubscriptions.therapistId, therapistIds));
      const subscriptionsCount = Array.isArray(subscriptionsResult) ? subscriptionsResult.length : 0;
      console.log(`   ✓ Deleted ${subscriptionsCount} subscription(s)`);

      // 5. Delete from therapists
      console.log('👥 Deleting from therapists...');
      const therapistsResult = await trx
        .delete(appSchema.therapists)
        .where(ne(appSchema.therapists.name, 'Nancy Brooks'));
      const therapistsCount = Array.isArray(therapistsResult) ? therapistsResult.length : 0;
      console.log(`   ✓ Deleted ${therapistsCount} therapist record(s)`);

      return {
        therapistsCount,
        analyticsEventsCount: analyticsCount,
        bookingRequestsCount: bookingsCount,
        savedTherapistsCount: savedCount,
        subscriptionsCount: subscriptionsCount,
        therapistNames,
      };
    });

    console.log('\n✅ Cleanup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Therapists deleted: ${result.therapistsCount}`);
    console.log(`   - Analytics events deleted: ${result.analyticsEventsCount}`);
    console.log(`   - Booking requests deleted: ${result.bookingRequestsCount}`);
    console.log(`   - Saved therapist records deleted: ${result.savedTherapistsCount}`);
    console.log(`   - Subscriptions deleted: ${result.subscriptionsCount}`);
    console.log(`\n✨ Database now contains only Nancy Brooks as the therapist.\n`);

  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

runCleanup();
