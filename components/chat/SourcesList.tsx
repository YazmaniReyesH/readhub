import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ChatSource } from "@/types/chat";

/** Muestra las fuentes (artículos) utilizadas por el asistente, con enlaces. */
export function SourcesList({ sources }: { sources: ChatSource[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Fuentes utilizadas
      </p>
      <ul className="space-y-1.5">
        {sources.map((source) => (
          <li key={source.articleId}>
            <Link
              href={`/article/${source.articleId}`}
              className="group flex items-center gap-2 text-sm hover:text-primary"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              <span className="line-clamp-1 flex-1 underline-offset-4 group-hover:underline">
                {source.title}
              </span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {Math.round(source.similarity * 100)}%
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
