import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CommentWithAuthor } from "@/types/database";
import { formatDate } from "@/lib/utils";

/** Iniciales para el avatar a partir del nombre. */
function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  return (
    <li className="flex gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback>{initials(comment.author_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">
            {comment.author_name ?? "Usuario"}
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={comment.created_at}
          >
            {formatDate(comment.created_at)}
          </time>
        </div>
        <p className="text-sm whitespace-pre-wrap text-foreground/90">
          {comment.comment}
        </p>
      </div>
    </li>
  );
}

export function CommentList({
  comments,
}: {
  comments: CommentWithAuthor[];
}) {
  if (comments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay comentarios. ¡Sé el primero en comentar!
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </ul>
  );
}
