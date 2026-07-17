"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, registerSchema } from "@/lib/validators/auth";

type Mode = "login" | "register";
type Errors = Record<string, string>;

export function AuthForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { login, register } = useAuth();

  /** Redirige a la home tras autenticarse (navegación soft: conserva la sesión). */
  function redirectHome() {
    router.replace("/");
  }

  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  // `mounted` es false durante el render del servidor y hasta que React hidrata
  // en el cliente. Mantenemos el botón deshabilitado hasta entonces para que un
  // click temprano no dispare un submit NATIVO del <form> (que recargaría la
  // página sin ejecutar el handler ni autenticar).
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birth_date: "",
    phone: "",
    password: "",
  });

  const isLogin = mode === "login";

  useEffect(() => {
    setMounted(true);
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setErrors({});
    setForm((prev) => ({ ...prev, password: "" }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    if (isLogin) {
      const parsed = loginSchema.safeParse({
        email: form.email,
        password: form.password,
      });
      if (!parsed.success) {
        setErrors(fieldErrors(parsed.error));
        return;
      }
      setSubmitting(true);
      try {
        await login(parsed.data);
        toast.success("Inicio de sesión exitoso.");
        redirectHome();
      } catch (err) {
        // Conserva los datos ingresados (excepto la contraseña).
        setForm((prev) => ({ ...prev, password: "" }));
        toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Registro
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      const { needsConfirmation } = await register(parsed.data);
      if (needsConfirmation) {
        toast.info(
          "Registro exitoso. Revisa tu correo para confirmar la cuenta.",
        );
        setMode("login");
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        toast.success("Registro exitoso. ¡Bienvenido a ReadHub!");
        redirectHome();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!isLogin && (
        <Field
          id="full_name"
          label="Nombre"
          value={form.full_name}
          onChange={(v) => update("full_name", v)}
          error={errors.full_name}
          autoComplete="name"
          placeholder="Tu nombre"
        />
      )}

      <Field
        id="email"
        label="Correo electrónico"
        type="email"
        value={form.email}
        onChange={(v) => update("email", v)}
        error={errors.email}
        autoComplete="email"
        placeholder="tucorreo@email.com"
      />

      {!isLogin && (
        <>
          <Field
            id="birth_date"
            label="Fecha de nacimiento"
            type="date"
            value={form.birth_date}
            onChange={(v) => update("birth_date", v)}
            error={errors.birth_date}
          />
          <Field
            id="phone"
            label="Número celular"
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
            error={errors.phone}
            autoComplete="tel"
            placeholder="3001234567"
          />
        </>
      )}

      <Field
        id="password"
        label="Contraseña"
        type="password"
        value={form.password}
        onChange={(v) => update("password", v)}
        error={errors.password}
        autoComplete={isLogin ? "current-password" : "new-password"}
        placeholder="••••••••"
      />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting || !mounted}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLogin ? "Iniciar sesión" : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button
          type="button"
          onClick={switchMode}
          className="font-medium text-primary hover:underline"
        >
          {isLogin ? "Regístrate" : "Inicia sesión"}
        </button>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Convierte los errores de zod a un mapa campo → mensaje. */
function fieldErrors(error: {
  issues: readonly { path: PropertyKey[]; message: string }[];
}): Errors {
  const result: Errors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] === undefined ? "" : String(issue.path[0]);
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}
