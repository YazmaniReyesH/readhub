---
name: readhub-automatic-validator
description: Quality gate para cambios en ReadHub — invocar antes de dar un cambio por "terminado", antes de un commit, o cuando el usuario pida "valida esto" / "¿está listo para mergear?". A diferencia de readhub-code-reviewer (que solo reporta), emite un veredicto APROBADO/RECHAZADO contra una checklist fija y BLOQUEA la aceptación si algo falla. Ejecutar primero readhub-architecture-enforcer y readhub-code-reviewer y consumir sus hallazgos.
---

# ReadHub Automatic Validator

Filtro de aceptación binario: **VALIDACIÓN APROBADA** o **VALIDACIÓN FALLIDA**. Un
solo ítem que falle hace fallar el gate. No corrige el código: reporta qué está
mal y se vuelve a correr. Fuente de verdad: `CLAUDE.md`.

## Checklist (CUMPLE / NO CUMPLE / NO VERIFICADO)

1. **Compila** — `npm run build` (o `npm run type-check`) OK desde la raíz.
2. **TypeScript** — sin `any` injustificado, sin `unknown` sin acotar, sin `@ts-ignore` sin explicar.
3. **ESLint** — `npm run lint` pasa.
4. **Arquitectura** — cumple `readhub-architecture-enforcer` (raíces, Componente→Hook→Service, IA solo en `packages/ai`, sin clientes Supabase ad hoc, MCP aislado, sin `pages/`).
5. **SOLID** — cada service/función con una responsabilidad clara.
6. **Clean Code** — nombres claros, funciones de propósito único, sin código muerto ni bloques comentados sin razón.
7. **Sin duplicación** — no reimplementar lo que ya hay en `@readhub/shared`/`@readhub/config` o un hook.
8. **Manejo de errores** — llamadas async a Supabase/IA/fetch con manejo de errores; los fallos llegan a la UI o al llamador.
9. **Seguridad** — sin secretos hardcodeados, sin `admin`/service-role en `"use client"`, sin HTML sin sanitizar, sin SQL por concatenación.
10. **Performance** — sin N+1 evidente, sin fetch/render redundante, sin `select('*')` no acotado.
11. **Tipado** — firmas públicas (exports de services, retornos de hooks) tipadas explícitamente.
12. **Documentación** — la lógica no obvia tiene un comentario breve (el POR QUÉ).
13. **RLS** — cambios de tabla/política con su migración en `supabase/migrations/*.sql` y copias `schema.sql`/`policies.sql` en sync; RLS no evadida desde código del cliente.
14. **Hooks** — solo estado/orquestación, sin lógica de negocio embebida.
15. **Services** — devuelven datos planos, sin JSX ni conciencia de React.
16. **Componentes pequeños** — sin mezclar render grande con lógica pesada inline.
17. **Imports** — por nombre de package (barrel `.`); sin import cruzado entre `apps/mcp` y `apps/web`.
18. **Naming** — consistente con el entorno (`*.service.ts`, `use*.ts`).
19. **Tests** — si el cambio toca lógica de negocio, ¿tiene/actualiza pruebas Vitest? El flujo de auth se cubre con Playwright. Un cambio de lógica sin pruebas cuando el módulo ya tiene suite es NO CUMPLE.

## Formato de salida

### Aprobado
```
## VALIDACIÓN APROBADA
Checklist: N/19 (listar NO VERIFICADO y por qué)
```

### Fallido
```
## VALIDACIÓN FALLIDA

Motivo:
- [Ítem] — [archivo:línea] — descripción concreta

Correcciones sugeridas:
- [archivo:línea] — corrección específica y accionable
```

Listar todos los ítems que fallan, no solo el primero.
