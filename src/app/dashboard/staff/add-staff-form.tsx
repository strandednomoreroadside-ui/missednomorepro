"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addStaffContact } from "./actions";

export function AddStaffForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const r = await addStaffContact(formData);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong. Please try again.");
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <form ref={formRef} action={onSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex-1 space-y-2 sm:max-w-56">
          <Label htmlFor="staff-name">Name *</Label>
          <Input id="staff-name" name="name" placeholder="Stran" required />
        </div>
        <div className="flex-1 space-y-2 sm:max-w-56">
          <Label htmlFor="staff-phone">Mobile number *</Label>
          <Input
            id="staff-phone"
            name="phone"
            type="tel"
            placeholder="(440) 555-0123"
            required
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
          Add
        </Button>
      </form>
      {error && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm text-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
