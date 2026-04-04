/*
  Warnings:

  - You are about to drop the column `sport` on the `courts` table. All the data in the column will be lost.
  - Added the required column `sport_key` to the `courts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courts" DROP COLUMN "sport",
ADD COLUMN     "sport_key" VARCHAR NOT NULL;

-- CreateTable
CREATE TABLE "sports" (
    "key" VARCHAR NOT NULL,
    "min_people" INTEGER NOT NULL DEFAULT 1,
    "max_people" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_sport_key_fkey" FOREIGN KEY ("sport_key") REFERENCES "sports"("key") ON DELETE NO ACTION ON UPDATE NO ACTION;
