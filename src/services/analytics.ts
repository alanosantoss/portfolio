/**
 * Serviço de Métricas e Eventos de Conversão (Analytics)
 * Seguro, anônimo, desativado por padrão até haver provedor configurado.
 * Mede engajamento real sem coletar dados pessoais.
 */
export type AnalyticsEventType =
  | "intro_started"
  | "intro_completed"
  | "intro_skipped"
  | "welcome_gate_opened"
  | "service_selected"
  | "project_opened"
  | "case_study_viewed"
  | "showreel_played"
  | "project_link_copied"
  | "quote_modal_opened"
  | "quote_submitted"
  | "whatsapp_clicked";

export interface AnalyticsEventPayload {
  category?: string;
  projectId?: string;
  projectSlug?: string;
  projectTitle?: string;
  service?: string;
  [key: string]: unknown;
}

const isProduction = typeof window !== "undefined" && Boolean(window.location.hostname.includes("github.io"));

type GtagFunction = (...args: unknown[]) => void;

export function trackEvent(type: AnalyticsEventType, payload: AnalyticsEventPayload = {}): void {
  // Dispara evento CustomEvent para permitir integrações locais ou de terceiros
  if (typeof window !== "undefined") {
    try {
      const event = new CustomEvent("portfolio:analytics", {
        detail: { type, payload, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    } catch {}
  }

  // Se houver Google Analytics (gtag) ou dataLayer configurado
  if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: GtagFunction }).gtag === "function") {
    try {
      (window as unknown as { gtag: GtagFunction }).gtag("event", type, payload);
    } catch {}
  }

  if (!isProduction && process.env.NODE_ENV !== "test") {
    // Log informativo discreto em ambiente de desenvolvimento
    // console.debug(`[Analytics] ${type}`, payload);
  }
}
