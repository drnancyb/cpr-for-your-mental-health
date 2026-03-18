import { pgTable, text, timestamp, uuid, numeric, integer, boolean, date, foreignKey, unique } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const therapists = pgTable('therapists', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
