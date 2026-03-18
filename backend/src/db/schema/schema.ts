import { pgTable, text, timestamp, uuid, numeric, integer, boolean } from 'drizzle-orm/pg-core';

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
