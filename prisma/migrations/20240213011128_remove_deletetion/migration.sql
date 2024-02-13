/*
  Warnings:

  - You are about to drop the `getting_up_deletions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `getting_up_deletions` DROP FOREIGN KEY `getting_up_deletions_getting_up_id_fkey`;

-- DropTable
DROP TABLE `getting_up_deletions`;
