/**
 * Usuario de prueba de E2E. Lo crea/reafirma `e2e/global-setup.ts` vía Admin API
 * antes de cada corrida (no depende del seed manual, que no autentica de forma
 * fiable en GoTrue local).
 */
export const seededUser = {
  email: "e2e@readhub.dev",
  password: "Password123!",
  displayName: "Usuario E2E",
};

export const invalidCredentials = {
  email: seededUser.email,
  password: "ContraseñaIncorrecta999",
};
