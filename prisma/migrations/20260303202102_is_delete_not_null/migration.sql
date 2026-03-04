/*
  Warnings:

  - Made the column `is_delete` on table `admins` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `complexes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `courts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `courts_devices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `devices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `reservations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_delete` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "admins" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "complexes" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "courts" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "courts_devices" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "devices" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "is_delete" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "is_delete" SET NOT NULL;
