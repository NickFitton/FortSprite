import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export const Route = createFileRoute("/admin/seasons/")({
  component: RouteComponent,
  loader: () => getSeasons(),
});

function RouteComponent() {
  const navigate = useNavigate({ from: "/admin/seasons/" });
  const seasons = Route.useLoaderData();
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
                            params: { seasonId },
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
          <CreateSeasonDialog />
          <BugReportForm />
        </CardFooter>
      </Card>
    </div>
  );
}

const createSeasonFormSchema = z.object({
  name: z.string(),
  // chapter: z.number().positive(),
  // season: z.number().positive(),
});

function CreateSeasonDialog() {
  const form = useForm({
    defaultValues: {
      name: "7",
      // chapter: 6,
      // season: 5,
    },
    validators: {
      onSubmit: createSeasonFormSchema,
    },
    onSubmit: async ({ value }) => {
      toast.add({
        title: "You submitted the following values:",
        description: (
          <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
      });
    },
  });
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Create</Button>} />
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
            <form.Field
              name="name"
              children={(field) => {
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
            />
          </FieldGroup>
        </form>
        <Field orientation="horizontal">
          <Button type="submit" id="create-session-form">
            Save changes
          </Button>
        </Field>
      </DialogContent>
    </Dialog>
  );
}

const formSchema = z.object({
  title: z
    .string()
    .min(5, "Bug title must be at least 5 characters.")
    .max(32, "Bug title must be at most 32 characters."),
});

export function BugReportForm() {
  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: createSeasonFormSchema,
    },
    onSubmit: async ({ value }) => {
      toast.add({
        title: "You submitted the following values:",
        description: (
          <pre className="mt-2 w-[320px] overflow-x-auto rounded-md bg-code p-4 text-code-foreground">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Create</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bug Report</DialogTitle>
        </DialogHeader>
        <form
          id="bug-report-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Bug Title</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Login button not working on mobile"
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
        </form>
        <Field orientation="horizontal">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" form="bug-report-form">
            Submit
          </Button>
        </Field>
      </DialogContent>
    </Dialog>
  );
}

/*

            <form.Field
              name="chapter"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor="chapter">Chapter</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
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
            />
            <form.Field
              name="season"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field>
                    <FieldLabel htmlFor="season">Season</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
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
            />
*/
