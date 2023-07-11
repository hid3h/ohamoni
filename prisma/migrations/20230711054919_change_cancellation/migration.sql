/*
  Warnings:

  - You are about to drop the column `reminder_notification_setting_id` on the `reminder_notification_setting_cancellations` table. All the data in the column will be lost.
  - Added the required column `account_id` to the `reminder_notification_setting_cancellations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reminder_notification_setting_cancellations` DROP FOREIGN KEY `reminder_notification_setting_cancellations_reminder_notifi_fkey`;

-- AlterTable
ALTER TABLE `reminder_notification_setting_cancellations` DROP COLUMN `reminder_notification_setting_id`,
    ADD COLUMN `account_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `reminder_notification_setting_cancellations` ADD CONSTRAINT `reminder_notification_setting_cancellations_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
