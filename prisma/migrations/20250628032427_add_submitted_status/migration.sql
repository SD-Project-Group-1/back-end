-- CreateTable
CREATE TABLE `admin` (
    `admin_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `hash` VARCHAR(255) NOT NULL,
    `salt` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `borrow` (
    `borrow_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `device_id` INTEGER NOT NULL,
    `borrow_date` DATE NOT NULL,
    `return_date` DATE NULL,
    `borrow_status` ENUM('Scheduled', 'Canceled', 'Checked out', 'Checked in', 'Late') NOT NULL,
    `device_return_condition` ENUM('Good', 'Fair', 'Damaged') NOT NULL,
    `user_location` VARCHAR(255) NULL,
    `device_location` VARCHAR(255) NULL,
    `reason_for_borrow` ENUM('Job Search', 'School', 'Training', 'Other') NOT NULL,

    INDEX `device_id`(`device_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`borrow_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device` (
    `device_id` INTEGER NOT NULL AUTO_INCREMENT,
    `brand` VARCHAR(255) NULL,
    `serial_number` VARCHAR(255) NOT NULL,
    `location_id` INTEGER NOT NULL,

    INDEX `location_id`(`location_id`),
    PRIMARY KEY (`device_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location` (
    `location_id` INTEGER NOT NULL AUTO_INCREMENT,
    `street_address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(255) NOT NULL,
    `state` CHAR(2) NOT NULL,
    `zip_code` CHAR(5) NOT NULL,

    PRIMARY KEY (`location_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `hash` VARCHAR(255) NOT NULL,
    `salt` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(255) NULL,
    `street_address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(255) NOT NULL,
    `state` CHAR(2) NOT NULL,
    `zip_code` CHAR(5) NOT NULL,
    `dob` DATE NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `borrow` ADD CONSTRAINT `borrow_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `borrow` ADD CONSTRAINT `borrow_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `device`(`device_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `device` ADD CONSTRAINT `device_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `location`(`location_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
