/*
  Warnings:

  - You are about to alter the column `borrow_status` on the `borrow` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `admin` ADD COLUMN `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `borrow` ADD COLUMN `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `borrow_status` ENUM('Submitted', 'Scheduled', 'Cancelled', 'Checked out', 'Checked in', 'Late') NOT NULL DEFAULT 'Submitted',
    MODIFY `device_return_condition` ENUM('Good', 'Fair', 'Damaged') NULL DEFAULT 'Good';

-- AlterTable
ALTER TABLE `device` ADD COLUMN `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `make` VARCHAR(255) NULL,
    ADD COLUMN `model` VARCHAR(255) NULL,
    ADD COLUMN `type` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `location` ADD COLUMN `location_nickname` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
