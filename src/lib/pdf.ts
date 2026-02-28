import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Attention {
  id?: string;
  student_name: string;
  grade: string;
  date: string;
  time?: string;
  reason: string;
  observations: string;
  recommendations: string;
  psychologist_id?: string;
  psychologist_name?: string;
}

export const generateAttentionPDF = (attention: Attention) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const primaryColor: [number, number, number] = [124, 214, 222];

  // ── Constantes de layout ──────────────────────────────────────────────
  const pageW = doc.internal.pageSize.getWidth();   // 210 mm
  const pageH = doc.internal.pageSize.getHeight();  // 297 mm
  const marginL = 16;
  const marginR = 16;
  const marginB = 28; // espacio para firma al pie
  const contentW = pageW - marginL - marginR;         // ~178 mm

  let y = 0;

  // ── Helper: nueva página con mini-cabecera ────────────────────────────
  const newPage = () => {
    doc.addPage();
    y = 14;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(180, 180, 180);
    doc.text("Registro de Atención Psicológica — continuación", pageW - marginR, y, { align: "right" });
    doc.setTextColor(30, 30, 30);
    y += 8;
  };

  // ── Helper: verificar espacio disponible ─────────────────────────────
  const checkPage = (needed: number) => {
    if (y + needed > pageH - marginB) newPage();
  };

  // ── Helper: bloque de texto con salto automático ─────────────────────
  const printSection = (
    title: string,
    text: string,
    gapBefore = 8
  ) => {
    y += gapBefore;
    checkPage(12);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, marginL, y);
    doc.setTextColor(30, 30, 30);
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(text || "—", contentW);
    lines.forEach((line: string) => {
      checkPage(7);
      doc.text(line, marginL, y);
      y += 7;
    });
  };

  // ══════════════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ══════════════════════════════════════════════════════════════════════
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageW, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("I.E.P. VALORES Y CIENCIAS", pageW / 2, 17, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Área de Psicología", pageW / 2, 28, { align: "center" });

  // Título del documento
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO DE ATENCIÓN PSICOLÓGICA", pageW / 2, 52, { align: "center" });

  y = 60;

  // ══════════════════════════════════════════════════════════════════════
  // TABLA DE DATOS GENERALES (usa autoTable)
  // ══════════════════════════════════════════════════════════════════════
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: [0, 0, 0], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: contentW - 50 },
    },
    body: [
      ["Estudiante", attention.student_name || "—"],
      ["Grado y Sección", attention.grade || "—"],
      ["Fecha de Atención", format(new Date(attention.date), "dd 'de' MMMM, yyyy", { locale: es })],
      ["Hora", attention.time || "—"],
      ["Psicólogo(a)", attention.psychologist_name || "—"],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ══════════════════════════════════════════════════════════════════════
  // SECCIONES DE TEXTO
  // ══════════════════════════════════════════════════════════════════════
  printSection("Motivo de Consulta:", attention.reason, 6);
  printSection("Observaciones:", attention.observations, 8);
  printSection("Recomendaciones / Plan de Acción:", attention.recommendations, 8);

  // ══════════════════════════════════════════════════════════════════════
  // FIRMA (siempre en la última página, dentro del margen)
  // ══════════════════════════════════════════════════════════════════════
  y += 12;
  checkPage(30);
  doc.setDrawColor(132, 132, 140);
  doc.setLineWidth(0.4);
  const sigX1 = pageW / 2 - 40;
  const sigX2 = pageW / 2 + 40;
  doc.line(sigX1, y, sigX2, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Firma del Profesional", pageW / 2, y, { align: "center" });
  y += 5;
  doc.text(attention.psychologist_name || "", pageW / 2, y, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════
  // PIE DE PÁGINA en todas las páginas
  // ══════════════════════════════════════════════════════════════════════
  const totalPages: number = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(
      `I.E.P. Valores y Ciencias - Área de Psicología - Generado: ${new Date().toLocaleString("es-PE")}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
    doc.text(`Pág. ${p} / ${totalPages}`, pageW - marginR, pageH - 8, { align: "right" });
  }

  doc.save(`Atencion_${attention.student_name.replace(/\s+/g, "_")}_${attention.date}.pdf`);
};
