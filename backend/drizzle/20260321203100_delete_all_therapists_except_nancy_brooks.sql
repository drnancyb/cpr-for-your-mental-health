-- Delete all therapists except Nancy Brooks and their dependent records
-- Must delete in correct order to respect foreign key constraints

-- 1. Delete saved therapist records for therapists being removed
DELETE FROM saved_therapists
WHERE therapist_id NOT IN (SELECT id FROM therapists WHERE name = 'Nancy Brooks');

-- 2. Delete booking requests for therapists being removed
DELETE FROM booking_requests
WHERE therapist_id NOT IN (SELECT id FROM therapists WHERE name = 'Nancy Brooks');

-- 3. Delete therapist subscriptions for therapists being removed
DELETE FROM therapist_subscriptions
WHERE therapist_id NOT IN (SELECT id FROM therapists WHERE name = 'Nancy Brooks');

-- 4. Delete analytics events for therapists being removed
DELETE FROM app_analytics_events
WHERE therapist_id NOT IN (SELECT id FROM therapists WHERE name = 'Nancy Brooks');

-- 5. Finally, delete all therapists except Nancy Brooks
DELETE FROM therapists
WHERE name != 'Nancy Brooks';
