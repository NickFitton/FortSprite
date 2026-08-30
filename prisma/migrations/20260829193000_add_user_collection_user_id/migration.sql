ALTER TABLE "UserCollection" ADD COLUMN "userId" TEXT NOT NULL;

CREATE UNIQUE INDEX "UserCollection_userId_spriteVariantId_key"
ON "UserCollection"("userId", "spriteVariantId");
