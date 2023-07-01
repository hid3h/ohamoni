/*
  Warnings:

  - Added the required column `registered_at` to the `getting_ups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `getting_ups` ADD COLUMN `registered_at` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `getting_ups_account_id_got_up_at_idx` ON `getting_ups`(`account_id`, `got_up_at`);
