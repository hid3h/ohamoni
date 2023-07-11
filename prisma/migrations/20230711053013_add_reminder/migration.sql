-- CreateTable
CREATE TABLE `reminder_notification_settings` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `reminder_time` VARCHAR(191) NOT NULL,
    `registered_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_notification_setting_cancellations` (
    `id` VARCHAR(191) NOT NULL,
    `reminder_notification_setting_id` VARCHAR(191) NOT NULL,
    `cancelled_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reminder_notification_setting_cancellations_reminder_notific_key`(`reminder_notification_setting_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reminder_notification_settings` ADD CONSTRAINT `reminder_notification_settings_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_notification_setting_cancellations` ADD CONSTRAINT `reminder_notification_setting_cancellations_reminder_notifi_fkey` FOREIGN KEY (`reminder_notification_setting_id`) REFERENCES `reminder_notification_settings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
