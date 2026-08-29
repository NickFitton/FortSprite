import { useForm } from "@tanstack/react-form";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import * as z from "zod";
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
  ItemGroup,
  ItemTitle,
} from "#/components/ui/item";
import { toast } from "#/components/ui/toast";
import { prisma } from "#/db";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const getSeasons = createServerFn({ method: "GET" }).handler(async () => {
  return prisma.season.findMany({
    select: {
      id: true,
      name: true,
      chapterNumber: true,
      seasonNumber: true,
    },
    orderBy: [{ chapterNumber: "desc" }, { seasonNumber: "desc" }],
  });
});

const createSeasonFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a season name."),
  chapter: z.number().int().positive("Enter a positive chapter number."),
  season: z.number().int().positive("Enter a positive season number."),
});

const createSeason = createServerFn({ method: "POST" })
  .validator(createSeasonFormSchema)
  .handler(async ({ data }) => {
    return prisma.season.create({
      data: {
        name: data.name,
        chapterNumber: data.chapter,
        seasonNumber: data.season,
        isPublic: false,
      },
    });
  });

export const Route = createFileRoute("/admin/seasons/")({
  component: RouteComponent,
  loader: () => getSeasons(),
});

function RouteComponent() {
  const navigate = useNavigate({ from: "/admin/seasons/" });
  const router = useRouter();
  const seasons = Route.useLoaderData();
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center">
      <Card className="w-128">
        <CardHeader>
          <CardTitle>Seasons</CardTitle>
          <CardDescription>Manage all seasons</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemGroup>
            {seasons.map(
              ({ id: seasonId, name, chapterNumber, seasonNumber }) => {
                return (
                  <Item key={seasonId} variant="outline">
                    <ItemContent>
                      <ItemTitle>{name}</ItemTitle>
                      <ItemDescription>
                        Chapter {chapterNumber}: Season {seasonNumber}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: "/admin/seasons/$seasonId",
                            params: { seasonId: String(seasonId) },
                          })
                        }
                      >
                        Manage
                      </Button>
                    </ItemActions>
                  </Item>
                );
              },
            )}
          </ItemGroup>
        </CardContent>
        <CardFooter>
          <Button onClick={() => setOpen(true)}>Create</Button>
        </CardFooter>
      </Card>
      <CreateSeasonDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.invalidate()}
      />
    </div>
  );
}

function CreateSeasonDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      chapter: 0,
      season: 0,
    },
    validators: {
      onSubmit: createSeasonFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createSeason({ data: value });
        await onCreated();
        form.reset();
        onOpenChange(false);
        toast.add({
          title: "Season created",
          description: `${value.name.trim()} is ready to manage.`,
        });
      } catch (error) {
        console.error("Failed to create season:", error);
        toast.add({
          title: "Couldn't create season",
          description: "Please try again.",
        });
      }
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create season</DialogTitle>
        </DialogHeader>
        <form
          id="create-session-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Overdrive"
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <Field orientation="horizontal">
              <form.Field name="chapter">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field>
                      <FieldLabel htmlFor="chapter">Chapter</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={1}
                        step={1}
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? 0 : e.target.valueAsNumber,
                          )
                        }
                        aria-invalid={isInvalid}
                        placeholder="7"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="season">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field>
                      <FieldLabel htmlFor="season">Season</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min={1}
                        step={1}
                        value={field.state.value || ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? 0 : e.target.valueAsNumber,
                          )
                        }
                        aria-invalid={isInvalid}
                        placeholder="4"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Field orientation="horizontal">
            <Button type="submit" form="create-session-form">
              Save changes
            </Button>
          </Field>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/*

*/
