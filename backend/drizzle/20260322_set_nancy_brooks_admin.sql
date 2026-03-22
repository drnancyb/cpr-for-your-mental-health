-- Set Nancy Brooks as admin
UPDATE "user" SET role = 'admin' WHERE email = 'drnancybrooks@gmail.com';

-- Verify the update
SELECT id, email, role FROM "user" WHERE email = 'drnancybrooks@gmail.com';
