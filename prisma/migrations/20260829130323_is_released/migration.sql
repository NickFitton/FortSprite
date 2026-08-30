/*
  Warnings:

  - Added the required column `isReleased` to the `SpriteVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SpriteVariant" ADD COLUMN     "isReleased" BOOLEAN NOT NULL;
