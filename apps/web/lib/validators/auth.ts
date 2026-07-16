import { z } from "zod";

/**
 * Esquemas de validación para autenticación (registro e inicio de sesión).
 * Se usan tanto en los formularios como en los hooks antes de llamar a Supabase.
 */

export const loginSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio.").email(
    "Introduce un correo electrónico válido.",
  ),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre es demasiado largo."),
  email: z.string().trim().min(1, "El correo es obligatorio.").email(
    "Introduce un correo electrónico válido.",
  ),
  birth_date: z
    .string()
    .min(1, "La fecha de nacimiento es obligatoria.")
    .refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date < new Date();
    }, "Introduce una fecha de nacimiento válida."),
  phone: z
    .string()
    .trim()
    .min(7, "El número celular no es válido.")
    .max(20, "El número celular no es válido.")
    .regex(/^[0-9+\s()-]+$/, "El número celular solo puede contener dígitos."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
