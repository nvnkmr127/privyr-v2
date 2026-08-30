"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createLeadAction } from "@/lib/actions/leads"
import { listCustomFieldsAction } from "@/lib/actions/customFields"
import { CustomFieldInputs, defaultCustomValues, type CustomFieldDef } from "@/components/leads/CustomFieldInputs"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name cannot exceed 255 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50, "Phone number too long").optional().or(z.literal("")),
});

export function QuickAddLeadDrawer({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const [defs, setDefs] = React.useState<CustomFieldDef[]>([]);
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      listCustomFieldsAction()
        .then((r) => {
          const d = r as CustomFieldDef[];
          setDefs(d);
          setCustomValues(defaultCustomValues(d));
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "Custom fields unavailable",
            description: "Could not load workspace custom fields. You can still add standard contact details.",
          });
        });
    }
  }, [open, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const missing = defs.filter((d) => d.required && !(customValues[d.key] ?? "").trim());
    if (missing.length) {
      toast({
        variant: "destructive",
        title: "Required field missing",
        description: `Please fill in: ${missing.map((m) => m.label).join(", ")}`,
      });
      return;
    }
    try {
      await createLeadAction({ ...values, customData: customValues });
      toast({
        title: "Lead Created",
        description: "The lead was successfully created.",
      });
      setOpen(false);
      form.reset();
      setCustomValues({});
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Unable to create lead",
        description: e?.message || "Please check your inputs and try again.",
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children || <Button variant="outline">Quick Add</Button>}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Quick Add Lead</DrawerTitle>
            <DrawerDescription>Create a new lead instantly.</DrawerDescription>
          </DrawerHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 pb-0 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {defs.length > 0 && (
                <div className="border-t pt-3">
                  <CustomFieldInputs defs={defs} values={customValues} onChange={(k, v) => setCustomValues((s) => ({ ...s, [k]: v }))} />
                </div>
              )}

              <DrawerFooter className="px-0">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Lead"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" type="button" onClick={() => form.reset()}>Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
