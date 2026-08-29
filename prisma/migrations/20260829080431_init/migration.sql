-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('NOT_FOUND', 'EXTRACTED', 'MASTERED');

-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "order" INTEGER,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprite" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER,
    "imageUrl" TEXT,

    CONSTRAINT "Sprite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpriteVariant" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "variantId" INTEGER NOT NULL,
    "spriteId" INTEGER NOT NULL,

    CONSTRAINT "SpriteVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "spriteVariantId" INTEGER NOT NULL,
    "status" "CollectionStatus" NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprite" ADD CONSTRAINT "Sprite_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteVariant" ADD CONSTRAINT "SpriteVariant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteVariant" ADD CONSTRAINT "SpriteVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpriteVariant" ADD CONSTRAINT "SpriteVariant_spriteId_fkey" FOREIGN KEY ("spriteId") REFERENCES "Sprite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_spriteVariantId_fkey" FOREIGN KEY ("spriteVariantId") REFERENCES "SpriteVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
