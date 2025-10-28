-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('SUPERADMIN', 'ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."court_status" AS ENUM ('OPEN', 'MAINTENANCE', 'BLOCKED', 'WEATHER');

-- CreateEnum
CREATE TYPE "public"."device_status" AS ENUM ('NORMAL', 'OFF', 'BATTERY', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."device_type" AS ENUM ('PRESENCE', 'RAIN');

-- CreateEnum
CREATE TYPE "public"."notification_severity" AS ENUM ('INFO', 'WARNING');

-- CreateEnum
CREATE TYPE "public"."notification_type" AS ENUM ('DEVICE', 'RESERVATION');

-- CreateEnum
CREATE TYPE "public"."reservation_status" AS ENUM ('EMPTY', 'OCCUPIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" INTEGER NOT NULL,
    "complex_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id","complex_id")
);

-- CreateTable
CREATE TABLE "public"."courts" (
    "id" SERIAL NOT NULL,
    "complex_id" INTEGER NOT NULL,
    "sport" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR,
    "max_people" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courts_devices" (
    "court_id" INTEGER NOT NULL,
    "device_id" INTEGER NOT NULL,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "courts_devices_pkey" PRIMARY KEY ("court_id","device_id")
);

-- CreateTable
CREATE TABLE "public"."courts_status" (
    "court_id" INTEGER NOT NULL,
    "status" "public"."court_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courts_status_pkey" PRIMARY KEY ("court_id","created_at")
);

-- CreateTable
CREATE TABLE "public"."devices" (
    "id" SERIAL NOT NULL,
    "id_key" UUID,
    "api_key" VARCHAR,
    "complex_id" INTEGER NOT NULL,
    "type" "public"."device_type" NOT NULL,
    "status" "public"."device_status" NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "body" VARCHAR NOT NULL,
    "severity" "public"."notification_severity" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "related_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id","user_id","created_at")
);

-- CreateTable
CREATE TABLE "public"."reservations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "complex_id" INTEGER NOT NULL,
    "court_id" INTEGER NOT NULL,
    "date_ini" TIMESTAMP(6) NOT NULL,
    "date_end" TIMESTAMP(6) NOT NULL,
    "date_range" tsrange DEFAULT tsrange(date_ini, date_end, '[)'::text),
    "status" "public"."reservation_status" NOT NULL DEFAULT 'EMPTY',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "password" VARCHAR NOT NULL,
    "refresh_token" VARCHAR,
    "role" "public"."user_role" NOT NULL DEFAULT 'CLIENT',
    "name" VARCHAR NOT NULL,
    "surname" VARCHAR,
    "mail" VARCHAR NOT NULL,
    "phone_prefix" INTEGER NOT NULL,
    "phone_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."complexes" (
    "id" SERIAL NOT NULL,
    "complex_name" VARCHAR NOT NULL,
    "time_ini" VARCHAR(5) NOT NULL,
    "time_end" VARCHAR(5) NOT NULL,
    "loc_longitude" DOUBLE PRECISION,
    "loc_latitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "complexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devices_telemetry" (
    "device_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_telemetry_pkey" PRIMARY KEY ("device_id","created_at")
);

-- CreateIndex
CREATE UNIQUE INDEX "courts_complex_id_sport_name_key" ON "public"."courts"("complex_id", "sport", "name");

-- CreateIndex
CREATE UNIQUE INDEX "devices_id_key_key" ON "public"."devices"("id_key");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_complex_id_court_id_date_ini_key" ON "public"."reservations"("complex_id", "court_id", "date_ini");

-- CreateIndex
CREATE UNIQUE INDEX "users_mail_key" ON "public"."users"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_prefix_phone_number_key" ON "public"."users"("phone_prefix", "phone_number");

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courts" ADD CONSTRAINT "courts_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courts_devices" ADD CONSTRAINT "courts_devices_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courts_devices" ADD CONSTRAINT "courts_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."courts_status" ADD CONSTRAINT "courts_status_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "public"."complexes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."devices_telemetry" ADD CONSTRAINT "devices_telemetry_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

