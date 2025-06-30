-- CreateTable
CREATE TABLE "admins" (
    "id" INTEGER NOT NULL,
    "complex_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id","complex_id")
);

-- CreateTable
CREATE TABLE "courts" (
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
CREATE TABLE "courts_devices" (
    "court_id" INTEGER NOT NULL,
    "device_id" INTEGER NOT NULL,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "courts_devices_pkey" PRIMARY KEY ("court_id","device_id")
);

-- CreateTable
CREATE TABLE "courts_status" (
    "court_id" INTEGER NOT NULL,
    "status" VARCHAR(1) DEFAULT 'o',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "courts_status_pkey" PRIMARY KEY ("court_id","created_at")
);

-- CreateTable
CREATE TABLE "device_telemetry" (
    "device_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "device_telemetry_pkey" PRIMARY KEY ("device_id","created_at")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "complex_id" INTEGER NOT NULL,
    "type" VARCHAR(1) NOT NULL DEFAULT 'p',
    "status" VARCHAR(1) DEFAULT 'n',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "body" VARCHAR NOT NULL,
    "severity" VARCHAR(1) NOT NULL,
    "type" VARCHAR(1) NOT NULL,
    "related_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id","user_id","created_at")
);

-- CreateTable
CREATE TABLE "reservations" (
    "user_id" INTEGER NOT NULL,
    "court_id" INTEGER NOT NULL,
    "date_ini" TIMESTAMP(6) NOT NULL,
    "date_end" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(1) DEFAULT 'e',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("court_id","date_ini")
);

-- CreateTable
CREATE TABLE "system" (
    "id" SERIAL NOT NULL,
    "complex_name" VARCHAR NOT NULL,
    "time_ini" TIME(6) NOT NULL,
    "time_end" TIME(6) NOT NULL,
    "loc_longitude" DOUBLE PRECISION,
    "loc_latitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_delete" BOOLEAN DEFAULT false,

    CONSTRAINT "system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "password" VARCHAR NOT NULL,
    "refresh_token" VARCHAR,
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

-- CreateIndex
CREATE UNIQUE INDEX "courts_complex_id_sport_name_key" ON "courts"("complex_id", "sport", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_mail_key" ON "users"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_prefix_phone_number_key" ON "users"("phone_prefix", "phone_number");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "system"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "system"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courts_devices" ADD CONSTRAINT "courts_devices_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courts_devices" ADD CONSTRAINT "courts_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courts_status" ADD CONSTRAINT "courts_status_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "device_telemetry" ADD CONSTRAINT "device_telemetry_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_complex_id_fkey" FOREIGN KEY ("complex_id") REFERENCES "system"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

