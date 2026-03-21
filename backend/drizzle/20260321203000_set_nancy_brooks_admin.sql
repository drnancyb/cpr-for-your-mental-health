-- Data fix: Set Nancy Brooks' role to admin
-- Try to update via user_id from therapists table
UPDATE "user" SET role = 'admin' WHERE id = (SELECT user_id FROM therapists WHERE name = 'Nancy Brooks' LIMIT 1) AND id IS NOT NULL;

-- Also try direct name match for any Nancy Brooks in user table
UPDATE "user" SET role = 'admin' WHERE name = 'Nancy Brooks';
