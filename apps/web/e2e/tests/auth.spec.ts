import { test, expect } from "@playwright/test";

import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";
import { seededUser, invalidCredentials } from "../fixtures/users";

test.describe("Flujo de autenticación", () => {
  test("un usuario puede iniciar sesión, ver el dashboard y cerrar sesión", async ({
    page,
  }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    // 1. Abrir la app: una ruta protegida redirige al login.
    await page.goto("/");
    await login.expectLoaded();

    // 2-3. Ingresar credenciales válidas y autenticarse.
    await login.login(seededUser.email, seededUser.password);

    // 4-6. Redirección al dashboard, datos del usuario cargados y navegación disponible.
    await dashboard.expectLoaded(seededUser.displayName);

    // 7-8. Cerrar sesión y volver al login.
    await dashboard.logout(seededUser.displayName);
    await login.expectLoaded();
  });

  test("credenciales inválidas mantienen al usuario en el login", async ({
    page,
  }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.expectLoaded();
    await login.login(invalidCredentials.email, invalidCredentials.password);

    // No debe redirigir al dashboard: permanece en la pantalla de login.
    await expect(page).toHaveURL(/\/login/);
    await expect(login.submitButton).toBeVisible();
  });
});
