import { pgTable, text, timestamp, uuid, numeric, integer, boolean, date, foreignKey, unique, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const therapists = pgTable(
  'therapists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'),
    name: text('name').notNull(),
    photoUrl: text('photo_url').notNull(),
    title: text('title').notNull(),
    bio: text('bio').notNull(),
    location: text('location').notNull(),
    gender: text('gender').notNull(),
    specialties: text('specialties').array().notNull(),
    therapyTypes: text('therapy_types').array().notNull(),
    insurances: text('insurances').array().notNull(),
    acceptingNewClients: boolean('accepting_new_clients').notNull().default(true),
    sessionFee: numeric('session_fee').notNull(),
    languages: text('languages').array().notNull(),
    yearsExperience: integer('years_experience').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    websiteUrl: text('website_url'),
    isPinned: boolean('is_pinned').notNull().default(false),
    licenseDocuments: text('license_documents').array().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'therapists_user_id_fk',
    }).onDelete('set null'),
    unique('therapists_user_id_unique').on(table.userId),
  ]
);

export const therapistApplications = pgTable('therapist_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  title: text('title').notNull(),
  bio: text('bio').notNull(),
  location: text('location').notNull(),
  gender: text('gender').notNull(),
  specialties: text('specialties').array().notNull(),
  therapyTypes: text('therapy_types').array().notNull(),
  insurances: text('insurances').array().notNull(),
  sessionFee: numeric('session_fee').notNull(),
  languages: text('languages').array().notNull(),
  yearsExperience: integer('years_experience').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  websiteUrl: text('website_url'),
  adminNotes: text('admin_notes'),
  rejectionReason: text('rejection_reason'),
  licenseDocuments: text('license_documents').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const savedTherapists = pgTable(
  'saved_therapists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    therapistId: uuid('therapist_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'saved_therapists_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.therapistId],
      foreignColumns: [therapists.id],
      name: 'saved_therapists_therapist_id_fk',
    }).onDelete('cascade'),
    unique('saved_therapists_user_therapist_unique').on(table.userId, table.therapistId),
  ]
);

export const bookingRequests = pgTable(
  'booking_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    therapistId: uuid('therapist_id').notNull(),
    preferredDate: date('preferred_date'),
    message: text('message').notNull(),
    contactMethod: text('contact_method').notNull(),
    status: text('status').notNull().default('pending'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'booking_requests_user_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.therapistId],
      foreignColumns: [therapists.id],
      name: 'booking_requests_therapist_id_fk',
    }).onDelete('cascade'),
  ]
);

export const appAnalyticsEvents = pgTable(
  'app_analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    therapistId: uuid('therapist_id'),
    userId: text('user_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'app_analytics_events_user_id_fk',
    }).onDelete('no action'),
  ]
);

export const therapistSubscriptions = pgTable(
  'therapist_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    therapistId: uuid('therapist_id').notNull(),
    userId: text('user_id'),
    status: text('status').notNull().default('active'),
    plan: text('plan').notNull().default('featured'),
    amountPaid: numeric('amount_paid'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.therapistId],
      foreignColumns: [therapists.id],
      name: 'therapist_subscriptions_therapist_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'therapist_subscriptions_user_id_fk',
    }).onDelete('no action'),
  ]
);

export const broadcastNotifications = pgTable(
  'broadcast_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    target: text('target').notNull().default('all'),
    sentBy: text('sent_by').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    recipientCount: integer('recipient_count').default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.sentBy],
      foreignColumns: [user.id],
      name: 'broadcast_notifications_sent_by_fk',
    }).onDelete('restrict'),
  ]
);

export const appContent = pgTable(
  'app_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(),
    updatedBy: text('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [user.id],
      name: 'app_content_updated_by_fk',
    }).onDelete('no action'),
  ]
);

export const clientPreferences = pgTable(
  'client_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique(),
    preferredGender: text('preferred_gender').array(),
    preferredSpecialties: text('preferred_specialties').array(),
    preferredTherapyTypes: text('preferred_therapy_types').array(),
    preferredInsurance: text('preferred_insurance').array(),
    preferredLocation: text('preferred_location'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'client_preferences_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const supportRequests = pgTable(
  'support_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    role: text('role').notNull().default('client'),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'support_requests_user_id_fk',
    }).onDelete('no action'),
  ]
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique(),
    bookingReminders: boolean('booking_reminders').notNull().default(true),
    newMessages: boolean('new_messages').notNull().default(true),
    promotions: boolean('promotions').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'notification_preferences_user_id_fk',
    }).onDelete('cascade'),
  ]
);

export const applicationMessages = pgTable(
  'application_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull(),
    adminId: text('admin_id').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.applicationId],
      foreignColumns: [therapistApplications.id],
      name: 'application_messages_application_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [user.id],
      name: 'application_messages_admin_id_fk',
    }).onDelete('no action'),
  ]
);

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const uploadedDocuments = pgTable(
  'uploaded_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileData: text('file_data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'uploaded_documents_user_id_fk',
    }).onDelete('cascade'),
  ]
);
