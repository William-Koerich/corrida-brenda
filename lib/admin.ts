/**
 * Ponto único para o futuro PIN de administrador.
 * Hoje todas as ações são liberadas; quando o PIN existir, as telas
 * administrativas (atletas, largada) já passam por aqui.
 */
export const ADMIN_PIN_ENABLED = false;

export function isAdminUnlocked(): boolean {
  return !ADMIN_PIN_ENABLED;
}
