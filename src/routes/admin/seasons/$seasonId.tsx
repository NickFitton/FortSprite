import { useForm } from "@tanstack/react-form";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import * as z from "zod";
import { SpriteVariantTable } from "#/components/SpriteVariantTable";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "#/components/ui/item";
import { toast } from "#/components/ui/toast";
import { prisma } from "#/db";
import { requireAdmin } from "#/integrations/clerk/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const getSeasonSpriteVariables = createServerFn({ method: "GET" })
  .validator(z.coerce.number().int().positive())
  .handler(async ({ data: seasonId }) => {
    await requireAdmin();

    return prisma.season.findUniqueOrThrow({
      where: { id: seasonId },
      select: {
        sprites: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
        variants: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
        spriteVariants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            sprite: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
            isReleased: true,
            imageUrl: true,
            imageStorageId: true,
          },
        },
      },
    });
  });

const saveSpriteVariantSchema = z.object({
  id: z.number().int().positive().nullable(),
  seasonId: z.number().int().positive(),
  spriteId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  isReleased: z.boolean(),
  imageUrl: z.string().url().nullable(),
  imageStorageId: z.string().nullable(),
});

const saveSpriteVariant = createServerFn({ method: "POST" })
  .validator(saveSpriteVariantSchema)
  .handler(async ({ data }) => {
    await requireAdmin();

    const [sprite, variant] = await Promise.all([
      prisma.sprite.findFirst({
        where: { id: data.spriteId, seasonId: data.seasonId },
        select: { id: true },
      }),
      prisma.variant.findFirst({
        where: { id: data.variantId, seasonId: data.seasonId },
        select: { id: true },
      }),
    ]);

    if (!sprite || !variant) {
      throw new Error("The sprite or variant does not belong to this season.");
    }

    const values = {
      isReleased: data.isReleased,
      imageUrl: data.imageUrl,
      imageStorageId: data.imageStorageId,
    };

    if (data.id) {
      const existing = await prisma.spriteVariant.findFirst({
        where: {
          id: data.id,
          seasonId: data.seasonId,
          spriteId: data.spriteId,
          variantId: data.variantId,
        },
        select: { id: true },
      });

      if (!existing) {
        throw new Error("The sprite variant no longer exists.");
      }

      return prisma.spriteVariant.update({
        where: { id: existing.id },
        data: values,
      });
    }

    const existing = await prisma.spriteVariant.findFirst({
      where: {
        seasonId: data.seasonId,
        spriteId: data.spriteId,
        variantId: data.variantId,
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.spriteVariant.update({
        where: { id: existing.id },
        data: values,
      });
    }

    return prisma.spriteVariant.create({
      data: {
        ...values,
        seasonId: data.seasonId,
        spriteId: data.spriteId,
        variantId: data.variantId,
      },
    });
  });

export const Route = createFileRoute("/admin/seasons/$seasonId")({
  component: RouteComponent,
  loader: ({ params }) => getSeasonSpriteVariables({ data: params.seasonId }),
});

function RouteComponent() {
  const router = useRouter();
  const { seasonId } = Route.useParams();
  const { sprites, variants, spriteVariants } = Route.useLoaderData();
  const [, setOpen] = useState<"createSprite" | "editSprite" | undefined>();
  const [selectedSpriteVariant, setSelectedSpriteVariant] = useState<{
    sprite: (typeof sprites)[number];
    variant: (typeof variants)[number];
    spriteVariant: (typeof spriteVariants)[number] | undefined;
  }>();

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center p-8">
      <Tabs defaultValue="sprites" className="w-[800px]">
        <TabsList>
          <TabsTrigger value="sprites">Sprites</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="spriteVariants">Sprite Variants</TabsTrigger>
        </TabsList>
        <TabsContent value="sprites">
          <Card>
            <CardHeader>
              <CardTitle>Sprites</CardTitle>
              <CardDescription>
                Manage the available sprites in the season.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {sprites.map(({ id, name, description }) => {
                return (
                  <Item key={id} variant="outline">
                    <ItemContent>
                      <ItemTitle>{name}</ItemTitle>
                      <ItemDescription>
                        {description.split("\n").map((line) => (
                          <p key={`${id}-${line}`}>{line}</p>
                        ))}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="outline" size="sm">
                        Action
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </CardContent>
            <CardFooter>
              <Button onClick={() => setOpen("createSprite")}>Create</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Manage the available variants of sprites in the season.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {variants.map(({ id, name, effect }) => (
                <Item key={id} variant="outline">
                  <ItemContent>
                    <ItemTitle>{name}</ItemTitle>
                    <ItemDescription>{effect}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="spriteVariants">
          <Card>
            <CardHeader>
              <CardTitle>Sprite Variants</CardTitle>
              <CardDescription>
                Manage the public sprite variants and their images.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <SpriteVariantTable
                sprites={sprites}
                variants={variants}
                spriteVariants={spriteVariants}
                onClick={setSelectedSpriteVariant}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {selectedSpriteVariant && (
        <ManageSpriteVariantDialog
          key={`${selectedSpriteVariant.sprite.id}-${selectedSpriteVariant.variant.id}-${selectedSpriteVariant.spriteVariant?.id ?? "new"}`}
          open
          seasonId={Number(seasonId)}
          {...selectedSpriteVariant}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSpriteVariant(undefined);
            }
          }}
          onSaved={async () => {
            await router.invalidate();
            setSelectedSpriteVariant(undefined);
          }}
        />
      )}
    </div>
  );
}

function ManageSpriteVariantDialog({
  open,
  onOpenChange,
  onSaved,
  seasonId,
  sprite,
  variant,
  spriteVariant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  seasonId: number;
  sprite: {
    id: number;
    name: string;
  };
  variant: {
    id: number;
    name: string;
  };
  spriteVariant:
    | {
        id: number;
        isReleased: boolean;
        imageStorageId: string | null;
        imageUrl: string | null;
      }
    | undefined;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const storedImageUrl = useQuery(
    api.storage.getUrl,
    spriteVariant?.imageStorageId
      ? { storageId: spriteVariant.imageStorageId as Id<"_storage"> }
      : "skip",
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setSelectedImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setSelectedImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const form = useForm({
    defaultValues: {
      isReleased: spriteVariant?.isReleased ?? false,
      imageUrl: spriteVariant?.imageUrl ?? null,
      imageStorageId: spriteVariant?.imageStorageId ?? null,
    },
    validators: {
      onSubmit: z.object({
        isReleased: z.boolean(),
        imageUrl: z.string().url().nullable(),
        imageStorageId: z.string().nullable(),
      }),
    },
    onSubmit: async ({ value }) => {
      try {
        setIsUploading(true);
        let imageUrl = value.imageUrl;
        let imageStorageId = value.imageStorageId;

        if (imageFile) {
          const uploadUrl = await generateUploadUrl({});
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": imageFile.type },
            body: imageFile,
          });

          if (!uploadResult.ok) {
            throw new Error("Image upload failed.");
          }

          const { storageId } = (await uploadResult.json()) as {
            storageId: string;
          };
          imageUrl = null;
          imageStorageId = storageId;
        }

        if (!imageStorageId && !imageUrl) {
          toast.add({
            title: "Add an image",
            description: "Upload a sprite variant image before saving.",
          });
          return;
        }

        await saveSpriteVariant({
          data: {
            id: spriteVariant?.id ?? null,
            seasonId,
            spriteId: sprite.id,
            variantId: variant.id,
            isReleased: value.isReleased,
            imageUrl,
            imageStorageId,
          },
        });
        await onSaved();
        toast.add({
          title: spriteVariant
            ? "Sprite variant updated"
            : "Sprite variant created",
          description: `${sprite.name} · ${variant.name} is ready.`,
        });
      } catch (error) {
        console.error("Failed to save sprite variant:", error);
        toast.add({
          title: "Couldn't save sprite variant",
          description: "Please try again.",
        });
      } finally {
        setIsUploading(false);
      }
    },
  });

  const imageUrl =
    selectedImageUrl ?? storedImageUrl ?? spriteVariant?.imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {spriteVariant ? "Manage sprite variant" : "Set up sprite variant"}
          </DialogTitle>
          <DialogDescription>
            {sprite.name} · {variant.name}
          </DialogDescription>
        </DialogHeader>
        <form
          id="manage-sprite-variant-form"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sprite-variant-image">Image</FieldLabel>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`${sprite.name} ${variant.name}`}
                  className="aspect-square w-36 rounded-md border object-contain"
                />
              )}
              <Input
                id="sprite-variant-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                }}
              />
            </Field>
            <form.Field name="isReleased">
              {(field) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={field.name}>Released</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="checkbox"
                    className="size-4 p-0"
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.checked)
                    }
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="manage-sprite-variant-form"
            disabled={isUploading}
          >
            {isUploading ? "Uploading…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
