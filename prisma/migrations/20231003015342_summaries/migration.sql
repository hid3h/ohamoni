-- CreateTable
CREATE TABLE `getting_up_daily_summaries` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `jst_date` DATE NOT NULL,
    `jst_time` TIME NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `getting_up_daily_summaries_account_id_jst_date_key`(`account_id`, `jst_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `getting_up_daily_summaries` ADD CONSTRAINT `getting_up_daily_summaries_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
