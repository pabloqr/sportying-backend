/*
  Warnings:

  - You are about to drop the column `temperature` on the `weather` table. All the data in the column will be lost.
  - Added the required column `temperature_curr` to the `weather` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "weather" DROP COLUMN "temperature",
ADD COLUMN     "surface_water_prev" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "temperature_curr" DOUBLE PRECISION NOT NULL;
