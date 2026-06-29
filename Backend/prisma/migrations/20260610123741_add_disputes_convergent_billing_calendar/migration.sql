-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "convergent_pdf" TEXT,
ADD COLUMN     "is_convergent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rent_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "utility_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "bill_generation_day" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "meter_reading_day" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "payment_due_days" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "meter_readings" ADD COLUMN     "flag_reason" TEXT,
ADD COLUMN     "is_flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photo_url" TEXT;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "monthly_rent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "disputes" (
    "id" SERIAL NOT NULL,
    "bill_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "admin_response" TEXT,
    "corrected_reading" DOUBLE PRECISION,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
