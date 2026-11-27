import { CONFIG } from "../core/config";
import type { QuoteState } from "../types/app";

export const QUOTE_SERVICE_LABELS: Record<string, string> = {
  video: "Edição de vídeo",
  design: "Design",
  ia: "Soluções com IA"
};

export const QUOTE_FORMATS: Record<string, readonly string[]> = {
  default: ["Reels / Shorts", "VSL", "Vídeo YouTube 16:9", "Artes / Thumbnails", "Solução com IA"],
  video: ["Reels / Shorts", "VSL", "Vídeo YouTube 16:9", "Anúncio / Criativo", "Institucional"],
  design: ["Artes Social Media", "Thumbnail YouTube", "Identidade Visual", "Grande Formato / Print"],
  ia: ["Vídeo com IA", "Imagens / Renders IA", "Landing Page", "Automação / Sistema"]
};

export function buildWhatsAppUrl(message: string = CONFIG.WHATSAPP_MESSAGE): string {
  const cleanPhone = CONFIG.WHATSAPP_NUMBER.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildQuoteMessage(answers: QuoteState): string {
  const lines: string[] = [];

  if (answers.projectTitle) {
    lines.push(`• Projeto de referência: ${answers.projectTitle}`);
  }

  if (answers.service) {
    lines.push(`• Área: ${QUOTE_SERVICE_LABELS[answers.service] || answers.service}`);
  }

  const formats = Array.isArray(answers.format)
    ? answers.format.filter(Boolean)
    : answers.format
      ? [answers.format]
      : [];

  if (formats.length > 0) {
    lines.push(`• Formato: ${formats.join(", ")}`);
  }
  if (answers.volume) {
    lines.push(`• Quantidade/recorrência: ${answers.volume}`);
  }
  if (answers.deadline) {
    lines.push(`• Prazo: ${answers.deadline}`);
  }

  const cleanNotes = String(answers.notes || "").replace(/\s+/g, " ").trim();
  if (cleanNotes) {
    lines.push(`• Detalhes: ${cleanNotes}`);
  }

  if (lines.length === 0) return CONFIG.WHATSAPP_MESSAGE;

  const header = answers.projectTitle
    ? `Olá Alan! Vi o projeto "${answers.projectTitle}" no seu portfólio e gostaria de um orçamento para um trabalho semelhante:`
    : `Olá Alan! Vi seu portfólio e gostaria de um orçamento:`;

  return `${header}\n${lines.join("\n")}`;
}
