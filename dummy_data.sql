USE oc_devices;

INSERT INTO location (location_id, location_nickname, street_address, city, state, zip_code) VALUES
(1, 'Callahan Neighborhood Center', '101 N Parramore Ave #1713', 'Orlando', 'FL', '32801'),
(2, 'Hankins Park Neighborhood Center', '1340 Lake Park Ct', 'Orlando', 'FL', '32805'),
(3, 'Northwest Neighborhood Center', '3955 W D Judge Dr', 'Orlando', 'FL', '32808'),
(4, 'Rosemont Neighborhood Center', '4872 Rose Bay Dr', 'Orlando', 'FL', '32808'),
(5, 'Smith Neighborhood Center', '1723 Bruton Blvd', 'Orlando', 'FL', '32805'),
(6, 'Citrus Square Neighborhood Center', '5624 Hickey Drive', 'Orlando', 'FL', '32822'),
(7, 'Engelwood Neighborhood Center', '6123 La Costa Dr #2931', 'Orlando', 'FL', '32807'),
(8, 'Jackson Neighborhood Center', '1002 Carter St', 'Orlando', 'FL', '32805'),
(9, 'L Claudia Allen Senior Center', '1840 Mable Butler Ave #4261', 'Orlando', 'FL', '32805'),
(10, 'Grand Avenue Neighborhood Center', '800 Grand St', 'Orlando', 'FL', '32805'),
(11, 'Ivey Lane Neighborhood Center', '5151 Raleigh St Ste C', 'Orlando', 'FL', '32811'),
(12, 'Langford Park Neighborhood Center', '1808 E Central Blvd', 'Orlando', 'FL', '32803'),
(13, 'Rock Lake Neighborhood Center', '440 N Tampa Ave', 'Orlando', 'FL', '32805'),
(14, 'Wadeview Neighborhood Center', '2177 S Summerlin Ave', 'Orlando', 'FL', '32806'),
(15, 'Dover Shores Neighborhood Center', '1400 Gaston Foster Rd', 'Orlando', 'FL', '32812'),
(16, 'RISE employment training facility', '1221 West Colonial Drive', 'Orlando', 'FL', '32804'),
(17, 'Hispanic Office for Local Assistance', '595 North Primrose Drive', 'Orlando', 'FL', '32803');

INSERT INTO user (user_id, email, hash, salt, first_name, last_name, phone, street_address, city, state, zip_code, dob) VALUES
(2, 'bob.johnson2@example.com', 'hash2', 'salt2', 'Bob', 'Johnson', '555-0002', '456 Example St', 'Orlando', 'FL', '32801', '1989-08-23'),
(3, 'charlie.brown3@example.com', 'hash3', 'salt3', 'Charlie', 'Brown', '555-0003', '789 Example St', 'Orlando', 'FL', '32801', '1995-12-01'),
(4, 'diana.jones4@example.com', 'hash4', 'salt4', 'Diana', 'Jones', '555-0004', '101 Example Blvd', 'Orlando', 'FL', '32801', '1991-03-10'),
(5, 'eli.garcia5@example.com', 'hash5', 'salt5', 'Eli', 'Garcia', '555-0005', '234 Sample Way', 'Orlando', 'FL', '32801', '1994-11-30');

INSERT INTO device (device_id, brand, make, model, type, serial_number, location_id) VALUES
(1, 'Dell', 'Inspiron', '15', 'Laptop', 'S12345', 1),
(2, 'HP', 'Pavilion', '13', 'Laptop', 'S12346', 2),
(3, 'Apple', 'MacBook', 'Pro', 'Laptop', 'S12347', 3),
(4, 'Lenovo', 'ThinkPad', 'X1', 'Laptop', 'S12348', 4),
(5, 'Asus', 'VivoBook', 'Air', 'Laptop', 'S12349', 5);

INSERT INTO borrow (borrow_id, user_id, device_id, borrow_date, return_date, borrow_status, device_return_condition, user_location, device_location, reason_for_borrow) VALUES
(1, 1, 1, '2024-06-01', '2024-06-10', 'Checked in', 'Good', 'Callahan Neighborhood Center', 'Callahan Neighborhood Center', 'Job Search'),
(2, 2, 2, '2024-06-15', NULL, 'Checked out', 'Good', 'Hankins Park Neighborhood Center', 'Hankins Park Neighborhood Center', 'Training'),
(3, 3, 3, '2024-05-20', '2024-06-01', 'Checked in', 'Fair', 'Northwest Neighborhood Center', 'Northwest Neighborhood Center', 'School'),
(4, 4, 4, '2024-07-01', NULL, 'Submitted', 'Good', 'Rosemont Neighborhood Center', 'Rosemont Neighborhood Center', 'Other'),
(5, 5, 5, '2024-06-20', NULL, 'Scheduled', 'Good', 'Smith Neighborhood Center', 'Smith Neighborhood Center', 'Job Search');
