import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { prisma } from "#/db";

export const getSidebarSeasons = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.season.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        chapterNumber: true,
        seasonNumber: true,
      },
      orderBy: [{ chapterNumber: "desc" }, { seasonNumber: "desc" }],
    });
  },
);

export const getLatestSeason = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.season.findFirst({
      select: { id: true },
      orderBy: [{ chapterNumber: "desc" }, { seasonNumber: "desc" }],
    });
  },
);

export const getSeasonById = createServerFn({ method: "GET" })
  .validator(z.coerce.number().int().positive())
  .handler(async ({ data: seasonId }) => {
    const { userId } = await auth();

    return prisma.season.findUniqueOrThrow({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        chapterNumber: true,
        seasonNumber: true,
        sprites: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
          },
        },
        spriteVariants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            isReleased: true,
            imageStorageId: true,
            sprite: { select: { id: true } },
            variant: { select: { id: true } },
          },
        },
        userCollections: {
          where: { userId: userId ?? "" },
          select: {
            spriteVariantId: true,
            status: true,
          },
        },
      },
    });
  });

const advanceCollectionStatusSchema = z.object({
  seasonId: z.number().int().positive(),
  spriteVariantId: z.number().int().positive(),
});

export const advanceSpriteVariantCollection = createServerFn({ method: "POST" })
  .validator(advanceCollectionStatusSchema)
  .handler(async ({ data }) => {
    const { userId } = await auth();

    if (!userId) {
      throw new Response("Authentication required", { status: 401 });
    }

    const spriteVariant = await prisma.spriteVariant.findFirst({
      where: {
        id: data.spriteVariantId,
        seasonId: data.seasonId,
      },
      select: { id: true },
    });

    if (!spriteVariant) {
      throw new Response("Sprite variant not found in this season", {
        status: 404,
      });
    }

    const existingCollection = await prisma.userCollection.findUnique({
      where: {
        userId_spriteVariantId: {
          userId,
          spriteVariantId: spriteVariant.id,
        },
      },
      select: { id: true, status: true },
    });

    if (existingCollection) {
      if (existingCollection.status === "MASTERED") {
        await prisma.userCollection.delete({
          where: { id: existingCollection.id },
        });
        return null;
      }

      return prisma.userCollection.update({
        where: { id: existingCollection.id },
        data: {
          status:
            existingCollection.status === "EXTRACTED"
              ? "MASTERED"
              : "EXTRACTED",
        },
      });
    }

    return prisma.userCollection.create({
      data: {
        userId,
        seasonId: data.seasonId,
        spriteVariantId: spriteVariant.id,
        status: "EXTRACTED",
      },
    });
  });
