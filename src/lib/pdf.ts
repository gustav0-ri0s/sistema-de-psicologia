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
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [124, 214, 222];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("I.E. VALORES Y CIENCIAS", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Área de Psicología", 105, 30, { align: "center" });

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO DE ATENCIÓN PSICOLÓGICA", 105, 55, { align: "center" });

  // Content
  autoTable(doc, {
    startY: 65,
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: [0, 0, 0] },
    body: [
      ["Estudiante", attention.student_name],
      ["Grado y Sección", attention.grade],
      ["Fecha de Atención", format(new Date(attention.date), "dd 'de' MMMM, yyyy", { locale: es })],
      ["Hora", attention.time || "N/A"],
      ["Psicólogo(a)", attention.psychologist_name || "N/A"],
    ],
  });

  const finalY = (doc as any).lastAutoTable.finalY || 100;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Motivo de Consulta:", 14, finalY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(attention.reason, 180), 14, finalY + 22);

  const reasonHeight = doc.splitTextToSize(attention.reason, 180).length * 7;

  doc.setFont("helvetica", "bold");
  doc.text("Observaciones:", 14, finalY + 25 + reasonHeight);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(attention.observations, 180), 14, finalY + 32 + reasonHeight);

  const obsHeight = doc.splitTextToSize(attention.observations, 180).length * 7;

  doc.setFont("helvetica", "bold");
  doc.text("Recomendaciones / Plan de Acción:", 14, finalY + 35 + reasonHeight + obsHeight);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(attention.recommendations, 180), 14, finalY + 42 + reasonHeight + obsHeight);

  // Footer / Signature
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(132, 132, 140);
  doc.line(60, pageHeight - 40, 150, pageHeight - 40);
  doc.setFontSize(10);
  doc.text("Firma del Profesional", 105, pageHeight - 35, { align: "center" });
  doc.text(attention.psychologist_name || "", 105, pageHeight - 30, { align: "center" });

  doc.save(`Atencion_${attention.student_name.replace(/\s+/g, "_")}_${attention.date}.pdf`);
};
