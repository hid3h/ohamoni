/*
  Warnings:

  - You are about to drop the column `line_id` on the `accounts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[line_user_id]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `line_user_id` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `accounts_line_id_key` ON `accounts`;

-- AlterTable
ALTER TABLE `accounts` DROP COLUMN `line_id`,
    ADD COLUMN `line_user_id` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `getting_ups` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `got_up_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `getting_up_deletions` (
    `id` VARCHAR(191) NOT NULL,
    `getting_up_id` VARCHAR(191) NOT NULL,
    `deleted_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `getting_up_deletions_getting_up_id_key`(`getting_up_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `accounts_line_user_id_key` ON `accounts`(`line_user_id`);

-- AddForeignKey
ALTER TABLE `getting_ups` ADD CONSTRAINT `getting_ups_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `getting_up_deletions` ADD CONSTRAINT `getting_up_deletions_getting_up_id_fkey` FOREIGN KEY (`getting_up_id`) REFERENCES `getting_ups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
