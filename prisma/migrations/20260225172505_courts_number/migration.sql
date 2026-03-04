/*
  Warnings:

  - You are about to drop the column `name` on the `courts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[complex_id,sport,court_number]` on the table `courts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `court_number` to the `courts` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "courts_complex_id_sport_name_key";

-- AlterTable
ALTER TABLE "courts" DROP COLUMN "name",
ADD COLUMN     "court_number" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courts_complex_id_sport_court_number_key" ON "courts"("complex_id", "sport", "court_number");
