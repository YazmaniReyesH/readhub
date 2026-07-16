"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateComment } from "@/lib/validators/article";

/**
 * Formulario para escribir un comentario. La lógica de guardado la aporta el
 * contenedor mediante `onSubmit` (que a su vez usa el hook useComments).
 */
export function CommentForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (text: string) => Promise<void>;
  submitting: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateComment(text);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    setError(null);
    try {
      await onSubmit(text);
      setText("");
      toast.success("Comentario agregado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo publicar el comentario.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un comentario…"
        rows={3}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Comentar
        </Button>
      </div>
    </form>
  );
}
