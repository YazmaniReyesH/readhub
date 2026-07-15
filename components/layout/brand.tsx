import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Logotipo + nombre de la plataforma. Enlaza al inicio por defecto. */
export function Brand({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpenText className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
