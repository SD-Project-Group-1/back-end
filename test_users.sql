USE co_device;

-- Cleanup previous test users
DELETE FROM password_resets;
DELETE FROM user WHERE user_id IN (1001, 1002);

-- Insert test users
INSERT INTO user (user_id, email, hash, salt, first_name, last_name, phone, street_address, city, state, zip_code, dob) VALUES
(1001, 'test1@example.com', 'hash1', 'salt1', 'Test', 'User1', '555-1001', '1 Test St', 'Orlando', 'FL', '32801', '1990-01-01'),
(1002, 'test2@example.com', 'hash2', 'salt2', 'Test', 'User2', '555-1002', '2 Test St', 'Orlando', 'FL', '32802', '1991-02-02');

-- Insert password reset tokens
INSERT INTO password_resets (user_id, token, expires_at, used) VALUES
(1001, 'token-abc123', NOW() + INTERVAL 1 DAY, false),
(1002, 'token-def456', NOW() + INTERVAL 1 DAY, false);