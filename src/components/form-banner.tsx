import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormBanner({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const isError = kind === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-snug",
        isError
          ? "border-destructive/40 bg-destructive/10 text-[#ffb3bb]"
          : "border-success/40 bg-success/10 text-[#9fe8c4]"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
