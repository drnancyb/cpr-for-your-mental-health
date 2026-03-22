ALTER TABLE "therapists" ADD COLUMN "sliding_scale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "therapists" ADD COLUMN "sliding_scale_min_fee" numeric;