/*
  Warnings:

  - A unique constraint covering the columns `[loc_latitude,loc_longitude]` on the table `complexes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "complexes_is_delete_idx" ON "complexes"("is_delete");

-- CreateIndex
CREATE UNIQUE INDEX "complexes_loc_latitude_loc_longitude_key" ON "complexes"("loc_latitude", "loc_longitude");
