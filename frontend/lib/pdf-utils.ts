import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface VoucherHeader {
    date?: string;
    client?: string;
    requested_by?: string;
    origin_warehouse_id?: number | string | null;
    destination_warehouse_id?: number | string | null;
    delivery_person?: string | null;
    receiver_person?: string | null;
}

export interface VoucherItem {
    product_code?: string;
    code?: string;
    quantity: number;
    unit?: string;
    unit_of_measure?: string;
    description?: string;
    product_label?: string;
    name?: string;
}

export interface Warehouse {
    id: number | string;
    name: string;
}

export async function generateVoucherPDF({
    folio,
    mType,
    entrySubType,
    header,
    items,
    selectedCompany,
    warehouses
}: {
    folio: string;
    mType: string;
    entrySubType?: string;
    header: VoucherHeader;
    items: VoucherItem[];
    selectedCompany: 'PROAIR' | 'AIRPIPE';
    warehouses: Warehouse[];
}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Branding Config
    const isProAir = selectedCompany === 'PROAIR';
    const primaryColor = isProAir ? [0, 173, 239] : [0, 112, 184]; // ProAir Blue vs AIRpipe Blue
    const companyName = isProAir ? "Pro Air" : "AIRpipe";
    const logoPath = isProAir ? "/logos/proair_logo.png" : "/logos/airpipe_logo.png";

    // Add Logo
    try {
        doc.addImage(logoPath, 'PNG', 15, 12, isProAir ? 25 : 35, isProAir ? 25 : 12);
    } catch (e) {
        console.warn("Logo could not be loaded for PDF", e);
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 15, 20);
    }

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("ALMACEN", 15, isProAir ? 42 : 28);

    // Folio & Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Folio: ${folio}`, pageWidth - 15, 20, { align: "right" });
    doc.text(`Fecha: ${header.date || new Date().toLocaleDateString('es-MX')}`, pageWidth - 15, 25, { align: "right" });

    // Header Info
    doc.setDrawColor(220, 220, 220);
    doc.line(15, isProAir ? 45 : 30, pageWidth - 15, isProAir ? 45 : 30);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text("CLIENTE / PROYECTO:", 15, isProAir ? 55 : 40);
    doc.setFont("helvetica", "bold");
    doc.text(header.client || "—", 55, isProAir ? 55 : 40);

    doc.setFont("helvetica", "normal");
    doc.text("MOVIMIENTO:", 15, isProAir ? 60 : 45);
    doc.setFont("helvetica", "bold");
    doc.text(mType === 'ENTRY' ? `ENTRADA (${entrySubType || 'GENERAL'})` : mType === 'EXIT' ? 'SALIDA' : 'TRASPASO', 55, isProAir ? 60 : 45);

    doc.setFont("helvetica", "normal");
    doc.text("SOLICITADO POR:", 15, isProAir ? 65 : 50);
    doc.setFont("helvetica", "bold");
    doc.text(header.requested_by || "—", 55, isProAir ? 65 : 50);

    doc.setFont("helvetica", "normal");
    doc.text("UBICACIÓN:", 15, isProAir ? 70 : 55);
    doc.setFont("helvetica", "bold");
    
    // Find warehouse names if only IDs are provided
    const getWHName = (id: number | string | null | undefined) => {
        if (!id) return "—";
        const wh = warehouses.find(w => w.id.toString() === id.toString());
        return wh ? wh.name : "Desconocido";
    };

    const originName = getWHName(header.origin_warehouse_id);
    const destName = getWHName(header.destination_warehouse_id);

    const location = mType === 'ENTRY' ? (destName) :
        mType === 'EXIT' ? (originName) :
            `${originName} -> ${destName}`;
    
    doc.text(location || "—", 55, isProAir ? 70 : 55);

    // Table
    const tableData = items.map(item => [
        item.product_code || item.code || "",
        item.quantity,
        item.unit || item.unit_of_measure || "PZA",
        item.description || item.product_label || item.name || ""
    ]);

    autoTable(doc, {
        startY: isProAir ? 85 : 65,
        head: [['Código', 'Cant.', 'Unid.', 'Descripción']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor as [number, number, number] },
        styles: { fontSize: 8 },
    });

    // Finalize table and get end position
    const tableFinalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;

    // Signatures
    doc.line(20, tableFinalY, 80, tableFinalY);
    doc.text("ENTREGÓ / DELIVERY", 50, tableFinalY + 5, { align: "center" });
    doc.setFontSize(7);
    doc.text(header.delivery_person || "MIGUEL LOMELI", 50, tableFinalY + 10, { align: "center" });

    doc.setFontSize(9);
    doc.line(130, tableFinalY, 190, tableFinalY);
    doc.text("RECIBIÓ / RECEIVE", 160, tableFinalY + 5, { align: "center" });
    doc.setFontSize(7);
    doc.text(header.receiver_person || "Firma de conformidad", 160, tableFinalY + 10, { align: "center" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = isProAir ? "Pro Air de México S.A. de C.V. — Hermosillo, Sonora" : "AIRpipe de México S.A. de C.V. — Hermosillo, Sonora";
    doc.text(footerText, pageWidth / 2, 285, { align: "center" });

    doc.save(`Vale_${folio}.pdf`);
}
