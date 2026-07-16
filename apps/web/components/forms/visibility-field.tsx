"use client";

import { Globe, Lock } from "lucide-react";

/** Control de visibilidad público/privado de un artículo (is_public). */
export function VisibilityField({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Visibilidad</span>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 accent-primary"
        />
        <span className="flex items-center gap-2 text-sm">
          {value ? (
            <>
              <Globe className="h-4 w-4 text-primary" />
              Público — visible para todos los usuarios
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-muted-foreground" />
              Privado — solo visible para ti
            </>
          )}
        </span>
      </label>
    </div>
  );
}
