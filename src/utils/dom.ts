export function getRequiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Elemento obrigatório não encontrado no DOM: #${id}`);
  }
  return el as T;
}

export function hasValidRect(el: Element | null | undefined): el is HTMLElement {
  if (!el || typeof el.getBoundingClientRect !== "function") return false;
  const r = el.getBoundingClientRect();
  return Boolean(r && r.width > 0 && r.height > 0);
}
