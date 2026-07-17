import { type Page, type Locator, expect } from "@playwright/test";

/** Page Object de la página principal (dashboard) y la barra de navegación. */
export class DashboardPage {
  readonly heading: Locator;
  readonly homeLink: Locator;
  readonly uploadLink: Locator;

  private readonly nav: Locator;

  constructor(private readonly page: Page) {
    // Los enlaces se acotan a la barra de navegación (el home también tiene un
    // enlace "Cargar artículo", lo que haría ambiguo un selector global).
    this.nav = page.getByRole("navigation");
    this.heading = page.getByRole("heading", { name: "Artículos" });
    this.homeLink = this.nav.getByRole("link", { name: "Inicio" });
    this.uploadLink = this.nav.getByRole("link", { name: "Cargar artículo" });
  }

  /** El menú de usuario muestra el nombre visible del usuario autenticado. */
  private userMenu(displayName: string): Locator {
    return this.nav.getByRole("button", { name: new RegExp(displayName) });
  }

  /** Verifica que el dashboard cargó: heading, datos del usuario y navegación. */
  async expectLoaded(displayName: string) {
    // La redirección tras el login depende de la latencia de auth; margen amplio.
    await this.page.waitForURL(/\/$/, { timeout: 30_000 });
    await expect(this.heading).toBeVisible();
    await expect(this.userMenu(displayName)).toBeVisible();
    await expect(this.homeLink).toBeVisible();
    await expect(this.uploadLink).toBeVisible();
  }

  async logout(displayName: string) {
    await this.userMenu(displayName).click();
    await this.page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  }
}
