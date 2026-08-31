import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Sprite = {
  id: number;
  name: string;
};

type Variant = {
  id: number;
  name: string;
};

type SpriteVariant = {
  id: number;
  isReleased: boolean;
  imageStorageId: string | null;
  sprite: Pick<Sprite, "id">;
  variant: Pick<Variant, "id">;
};

type UserCollection = {
  spriteVariantId: number;
  status: string;
};

export type SpriteVariantTableSelection<
  TSprite extends Sprite,
  TVariant extends Variant,
  TSpriteVariant extends SpriteVariant,
> = {
  sprite: TSprite;
  variant: TVariant;
  spriteVariant: TSpriteVariant | undefined;
};

type SpriteVariantTableProps<
  TSprite extends Sprite,
  TVariant extends Variant,
  TSpriteVariant extends SpriteVariant,
> = {
  sprites: TSprite[];
  variants: TVariant[];
  spriteVariants: TSpriteVariant[];
  userCollections?: UserCollection[];
  hideReleasedStatus?: boolean;
  hideMissingSpriteVariantDetails?: boolean;
  onClick: (
    selection: SpriteVariantTableSelection<TSprite, TVariant, TSpriteVariant>,
  ) => void;
};

export function SpriteVariantTable<
  TSprite extends Sprite,
  TVariant extends Variant,
  TSpriteVariant extends SpriteVariant,
>({
  sprites,
  variants,
  spriteVariants,
  userCollections = [],
  hideReleasedStatus = false,
  hideMissingSpriteVariantDetails = false,
  onClick,
}: SpriteVariantTableProps<TSprite, TVariant, TSpriteVariant>) {
  const byVariantBySprite = useMemo(() => {
    return spriteVariants.reduce((bySprite, spriteVariant) => {
      const byVariant =
        bySprite.get(spriteVariant.sprite.id) ??
        new Map<number, TSpriteVariant>();
      byVariant.set(spriteVariant.variant.id, spriteVariant);
      bySprite.set(spriteVariant.sprite.id, byVariant);
      return bySprite;
    }, new Map<number, Map<number, TSpriteVariant>>());
  }, [spriteVariants]);
  const collectionStatusBySpriteVariantId = useMemo(() => {
    return new Map(
      userCollections.map((collection) => [
        collection.spriteVariantId,
        collection.status,
      ]),
    );
  }, [userCollections]);

  return (
    <div className="sprite-variant-table">
      <Table className="w-fit">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Sprite</TableHead>
            {variants.map((variant) => (
              <TableHead key={variant.id}>{variant.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sprites.map((sprite) => {
            const byVariant = byVariantBySprite.get(sprite.id);
            return (
              <TableRow key={sprite.id}>
                <TableHead className="font-medium">{sprite.name}</TableHead>
                {variants.map((variant) => {
                  const spriteVariant = byVariant?.get(variant.id);
                  const status = spriteVariant
                    ? spriteVariant.isReleased
                      ? "Released"
                      : "Unreleased"
                    : "Undefined";
                  const collectionStatus = spriteVariant
                    ? collectionStatusBySpriteVariantId.get(spriteVariant.id)
                    : undefined;

                  return (
                    <TableCell
                      key={`${sprite.id}-${variant.id}`}
                      className="p-0"
                    >
                      <button
                        type="button"
                        className={`flex min-h-10 cursor-pointer items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                          collectionStatus === "MASTERED"
                            ? "bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-400/30 dark:hover:bg-yellow-400/40"
                            : collectionStatus === "EXTRACTED"
                              ? "bg-green-200 hover:bg-green-300 dark:bg-green-400/30 dark:hover:bg-green-400/40"
                              : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          onClick({ sprite, variant, spriteVariant })
                        }
                      >
                        <SpriteVariantCell
                          imageStorageId={spriteVariant?.imageStorageId}
                          label={`${sprite.name} ${variant.name}`}
                          status={
                            (hideReleasedStatus && status === "Released") ||
                            (hideMissingSpriteVariantDetails &&
                              status === "Undefined")
                              ? undefined
                              : status
                          }
                          hideMissingSpriteVariantFallback={
                            hideMissingSpriteVariantDetails
                          }
                        />
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SpriteVariantCell({
  imageStorageId,
  label,
  status,
  hideMissingSpriteVariantFallback,
}: {
  imageStorageId: string | null | undefined;
  label: string;
  status: string | undefined;
  hideMissingSpriteVariantFallback: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const isMissingSpriteVariant = imageStorageId === undefined;
  const storedImageUrl = useQuery(
    api.storage.getUrl,
    imageStorageId ? { storageId: imageStorageId as Id<"_storage"> } : "skip",
  );
  const imageUrl =
    isMissingSpriteVariant && hideMissingSpriteVariantFallback
      ? null
      : (storedImageUrl ?? "/Default.webp");
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);

  const isImageLoading =
    imageUrl !== null &&
    ((Boolean(imageStorageId) && storedImageUrl === undefined) ||
      loadedImageUrl !== imageUrl);

  useEffect(() => {
    if (imageUrl && imageRef.current?.complete) {
      setLoadedImageUrl(imageUrl);
    }
  }, [imageUrl]);

  return (
    <div className="sprite-variant-cell relative size-24 shrink-0">
      {isImageLoading && (
        <Skeleton
          aria-hidden="true"
          className="absolute inset-0 size-full rounded-none"
        />
      )}
      {imageUrl && (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={label}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-150 ${
            isImageLoading ? "opacity-0" : "opacity-100"
          } ${imageStorageId ? "" : "brightness-0"}`}
          onLoad={() => setLoadedImageUrl(imageUrl)}
        />
      )}
      {status && (
        <span className="absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
          {status}
        </span>
      )}
    </div>
  );
}
