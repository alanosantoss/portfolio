import { describe, expect, it } from "vitest";
import { CONFIG } from "../../src/core/config";
import { buildQuoteMessage, buildWhatsAppUrl } from "../../src/services/whatsapp";

describe("whatsapp & quote service", () => {
  it("builds WhatsApp URL with encoded message", () => {
    const url = buildWhatsAppUrl("Olá Alan!");
    expect(url).toBe(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=Ol%C3%A1%20Alan!`);
  });

  it("falls back to default message when no quote fields are filled", () => {
    expect(
      buildQuoteMessage({ service: "", format: [], volume: "", deadline: "", notes: "" })
    ).toBe(CONFIG.WHATSAPP_MESSAGE);
  });

  it("formats multi-select formats, volume, deadline and sanitized notes", () => {
    const msg = buildQuoteMessage({
      service: "video",
      format: ["Reels / Shorts", "VSL"],
      volume: "4 a 8 / mês",
      deadline: "Esta semana",
      notes: "  clínica   médica  "
    });
    expect(msg).toContain("• Área: Edição de vídeo");
    expect(msg).toContain("• Formato: Reels / Shorts, VSL");
    expect(msg).toContain("• Quantidade/recorrência: 4 a 8 / mês");
    expect(msg).toContain("• Prazo: Esta semana");
    expect(msg).toContain("• Detalhes: clínica médica");
  });
});
