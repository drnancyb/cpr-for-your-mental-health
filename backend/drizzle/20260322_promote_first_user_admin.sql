-- Promote the first (earliest created) user to admin role
UPDATE "user" SET role = 'admin' WHERE email = (SELECT email FROM "user" ORDER BY created_at ASC LIMIT 1) AND role != 'admin';

-- Log the result
SELECT id, email, role, created_at FROM "user" WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
