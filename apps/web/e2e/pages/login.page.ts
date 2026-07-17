import { type Page, type Locator, expect } from "@playwright/test";

/** Page Object de la pantalla de inicio de sesión. Encapsula selectores y acciones. */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel("Correo electrónico");
    this.passwordInput = page.getByLabel("Contraseña");
    this.submitButton = page.getByRole("button", { name: "Iniciar sesión" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
