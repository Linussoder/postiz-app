-- Manual migration: add MediaCategory model + Media.categoryId relation
-- This repo uses `prisma db push` (no migrations history tracked), so this file
-- is provided for reference / manual application against environments that use
-- `prisma migrate deploy` instead of `db push`.

-- CreateTable
CREATE TABLE "MediaCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Media" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "MediaCategory_organizationId_idx" ON "MediaCategory"("organizationId");

-- CreateIndex
CREATE INDEX "MediaCategory_deletedAt_idx" ON "MediaCategory"("deletedAt");

-- CreateIndex
CREATE INDEX "Media_categoryId_idx" ON "Media"("categoryId");

-- AddForeignKey
ALTER TABLE "MediaCategory" ADD CONSTRAINT "MediaCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MediaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
