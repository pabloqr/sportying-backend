-- AlterTable
ALTER TABLE "weather" ADD COLUMN     "alert_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "alert_level_ticks" INTEGER NOT NULL DEFAULT 0;
