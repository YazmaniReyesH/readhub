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
    // El botón permanece deshabilitado hasta que React hidrata el formulario;
    // esperar a que esté habilitado garantiza que el click ejecute el handler de
    // React (y no un submit nativo del <form> que recargaría sin autenticar).
    await expect(this.submitButton).toBeEnabled();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // Esperamos a que termine la petición de autenticación antes de devolver el
    // control. Si no, el llamador podría navegar y ABORTAR el fetch en vuelo (la
    // cookie de sesión no se escribiría y el usuario quedaría atascado en /login).
    // El endpoint responde tanto con credenciales válidas como inválidas.
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes("/auth/v1/token")),
      this.submitButton.click(),
    ]);
  }
}
