import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Booking, Invoice, Profile } from "../types";
import { formatCurrency, formatDate, formatDateTime } from "./utils";
import { pesosToWords } from "./numberToWords";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function addLetterhead(doc: jsPDF, title: string) {
  doc.setFillColor(208, 2, 27);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LBC Express", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Booking Portal", 14, 19);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 196, 14, { align: "right" });
  doc.setTextColor(20, 20, 20);
}

export function generateLabelPdf(booking: Booking, profile: Profile): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [100, 150] });
  doc.setFillColor(208, 2, 27);
  doc.rect(0, 0, 100, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LBC Express", 6, 10);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Tracking Number", 6, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(booking.trackingNumber, 6, 31);

  doc.setDrawColor(220, 220, 220);
  doc.line(6, 36, 94, 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FROM (SHIPPER)", 6, 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(profile.name, 88), 6, 49);
  doc.text(
    doc.splitTextToSize(`${profile.address.street}, ${profile.address.barangay}, ${profile.address.city}, ${profile.address.province}`, 88),
    6,
    55
  );
  doc.text(profile.contactNumber, 6, 66);

  doc.line(6, 72, 94, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TO (CONSIGNEE)", 6, 79);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(booking.consignee.name, 88), 6, 85);
  const addr = booking.consignee.address;
  doc.text(
    doc.splitTextToSize(`${addr.houseNumber} ${addr.street}, ${addr.barangay}, ${addr.city}, ${addr.province}`, 88),
    6,
    91
  );
  doc.text(booking.consignee.contactNumber, 6, 104);

  doc.line(6, 110, 94, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Cargo Type: ${booking.consignee.cargoType}`, 6, 117);
  doc.text(`Charge: ${formatCurrency(booking.charge)}`, 6, 123);
  doc.text(`Booked: ${formatDate(booking.createdAt)}`, 6, 129);

  doc.setFont("courier", "normal");
  doc.setFontSize(24);
  doc.text(`*${booking.trackingNumber}*`, 50, 142, { align: "center" });

  return doc;
}

export function generatePodPdf(booking: Booking, profile: Profile): jsPDF {
  const doc = new jsPDF();
  addLetterhead(doc, "Proof of Delivery");

  autoTable(doc, {
    startY: 30,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      ["Tracking Number", booking.trackingNumber],
      ["Shipper", profile.name],
      ["Consignee", booking.consignee.name],
      [
        "Destination",
        `${booking.consignee.address.city}, ${booking.consignee.address.province}`,
      ],
      ["Status", booking.status],
      ["Charge", formatCurrency(booking.charge)],
      ["Date Booked", formatDateTime(booking.createdAt)],
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.text("Received in good order and condition by:", 14, finalY);
  doc.line(14, finalY + 18, 100, finalY + 18);
  doc.text("Signature over Printed Name", 14, finalY + 23);
  doc.line(120, finalY + 18, 196, finalY + 18);
  doc.text("Date / Time Received", 120, finalY + 23);

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("All information is secured in compliance with the Data Privacy Act of 2012.", 14, 285);

  return doc;
}

export function generateManifestPdf(bookings: Booking[], profile: Profile): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  addLetterhead(doc, "Shipment Manifest");
  doc.setFontSize(9);
  doc.text(`Shipper: ${profile.name}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [["Tracking #", "Consignee", "Destination", "Cargo Type", "Charge", "Status", "Date"]],
    body: bookings.map((b) => [
      b.trackingNumber,
      b.consignee.name,
      `${b.consignee.address.city}, ${b.consignee.address.province}`,
      b.consignee.cargoType,
      formatCurrency(b.charge),
      b.status,
      formatDate(b.createdAt),
    ]),
    headStyles: { fillColor: [208, 2, 27] },
    styles: { fontSize: 8 },
  });

  return doc;
}

export function generateSummarySheetPdf(bookings: Booking[], profile: Profile): jsPDF {
  const doc = new jsPDF();
  addLetterhead(doc, "Summary Sheet");
  doc.setFontSize(9);
  doc.text(`Shipper: ${profile.name}`, 14, 28);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 14, 33);

  autoTable(doc, {
    startY: 39,
    head: [["Tracking #", "Consignee", "Destination", "Charge", "Status"]],
    body: bookings.map((b) => [
      b.trackingNumber,
      b.consignee.name,
      `${b.consignee.address.city}, ${b.consignee.address.province}`,
      formatCurrency(b.charge),
      b.status,
    ]),
    headStyles: { fillColor: [208, 2, 27] },
    styles: { fontSize: 8 },
    foot: [["", "", "Total", formatCurrency(bookings.reduce((s, b) => s + b.charge, 0)), `${bookings.length} shipments`]],
    footStyles: { fillColor: [247, 247, 248], textColor: [20, 20, 20], fontStyle: "bold" },
  });

  return doc;
}

export function generatePodBatchPdf(bookings: Booking[], profile: Profile): jsPDF {
  const doc = new jsPDF();
  addLetterhead(doc, "POD Batch Report");
  doc.setFontSize(9);
  doc.text(`Shipper: ${profile.name}`, 14, 28);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 14, 33);

  autoTable(doc, {
    startY: 39,
    head: [["Tracking #", "Consignee", "Destination", "Status", "Delivered/Attempted"]],
    body: bookings.map((b) => [
      b.trackingNumber,
      b.consignee.name,
      `${b.consignee.address.city}, ${b.consignee.address.province}`,
      b.status,
      formatDate(b.createdAt),
    ]),
    headStyles: { fillColor: [208, 2, 27] },
    styles: { fontSize: 8 },
  });

  return doc;
}

export function generateBillingInvoicePdf(invoice: Invoice, bookings: Booking[], profile: Profile): jsPDF {
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BILLING INVOICE", 105, 16, { align: "center" });

  // From (LBC Express) box
  doc.setDrawColor(20, 20, 20);
  doc.rect(14, 22, 92, 42);
  doc.setFillColor(208, 2, 27);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("LBC EXPRESS, INC.", 18, 30);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize("CEBU IT PARK, V. PADRIGA ST., APAS, CEBU CITY, CEBU", 84), 18, 36);
  doc.text("TEL. NO.: -", 18, 44);
  doc.text("VAT REG TIN: 000-782-140-01569", 18, 49);
  doc.text("MIN: 0", 18, 54);
  doc.text(`SN: ${invoice.invoiceNumber.slice(-14)}`, 18, 59);

  // To (Invoice No. / customer) box
  doc.rect(108, 22, 88, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Invoice No.: ${invoice.invoiceNumber}`, 112, 29);
  doc.line(108, 32, 196, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Name:", 112, 38);
  doc.text(doc.splitTextToSize(profile.name, 62), 132, 38);
  doc.text("Address:", 112, 44);
  doc.text(
    doc.splitTextToSize(`${profile.address.street}, ${profile.address.barangay}, ${profile.address.city}, ${profile.address.province}`, 60),
    132,
    44
  );
  doc.text("TIN:", 112, 59);
  doc.text(profile.tinNumber || "—", 132, 59);

  doc.setFontSize(9);
  doc.text(`DATE: ${formatDate(invoice.createdAt)}`, 14, 72);

  // Particulars: one row per day within the billing period
  const byDate = new Map<string, { qty: number; amount: number }>();
  for (const b of bookings) {
    const key = formatDate(b.createdAt);
    const entry = byDate.get(key) || { qty: 0, amount: 0 };
    entry.qty += 1;
    entry.amount += b.charge;
    byDate.set(key, entry);
  }
  const rows = Array.from(byDate.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  autoTable(doc, {
    startY: 77,
    head: [["PARTICULARS", "QTY", "UNIT COST", "AMOUNT"]],
    body: [
      [
        {
          content: `This is to bill you for the service rendered for the period of ${MONTH_NAMES[invoice.periodMonth - 1]} ${invoice.periodYear}.`,
          colSpan: 4,
          styles: { fontStyle: "italic", textColor: [100, 100, 100] },
        },
      ],
      ...rows.map(([date, { qty, amount }]) => [date, String(qty), "N/A", amount.toFixed(2)]),
    ],
    headStyles: { fillColor: [230, 230, 230], textColor: [20, 20, 20] },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "right" } },
    styles: { fontSize: 8.5 },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("VATABLE SALES:", 16, afterTable);
  doc.text(invoice.vatableSales.toFixed(2), 70, afterTable, { align: "right" });
  doc.text("VAT:", 16, afterTable + 5);
  doc.text(invoice.vat.toFixed(2), 70, afterTable + 5, { align: "right" });
  doc.text("VAT EXEMPT:", 16, afterTable + 10);
  doc.text("0.00", 70, afterTable + 10, { align: "right" });
  doc.text("ZERO-RATED SALES:", 16, afterTable + 15);
  doc.text("0.00", 70, afterTable + 15, { align: "right" });

  doc.text("TOTAL SALES (VAT Inclusive):", 130, afterTable);
  doc.text(invoice.totalSales.toFixed(2), 196, afterTable, { align: "right" });
  doc.text("LESS VAT:", 130, afterTable + 5);
  doc.text(invoice.vat.toFixed(2), 196, afterTable + 5, { align: "right" });
  doc.text("NET OF VAT:", 130, afterTable + 10);
  doc.text(invoice.vatableSales.toFixed(2), 196, afterTable + 10, { align: "right" });
  doc.text("ADD VAT:", 130, afterTable + 15);
  doc.text(invoice.vat.toFixed(2), 196, afterTable + 15, { align: "right" });
  doc.text("LESS WITHHOLDING TAX:", 130, afterTable + 20);
  doc.text(invoice.withholdingTax.toFixed(2), 196, afterTable + 20, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.line(150, afterTable + 22, 196, afterTable + 22);
  doc.text("TOTAL AMOUNT DUE:", 130, afterTable + 27);
  doc.text(invoice.totalAmountDue.toFixed(2), 196, afterTable + 27, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Amount in Words: ${pesosToWords(invoice.totalAmountDue)}`, 105, afterTable + 37, {
    align: "center",
    maxWidth: 180,
  });

  const paymentY = afterTable + 48;
  doc.setFontSize(7.5);
  doc.text(
    "You may settle your payments directly to LBC EXPRESS, INC. bank account numbers stated below or through BDO Bills Payment System:",
    14,
    paymentY,
    { maxWidth: 182 }
  );
  doc.text("Account Name: LBC EXPRESS, INC.     Account Type: CURRENT", 14, paymentY + 7);
  doc.text("Account Number: AUB 73010000388 | PNB 151070002390", 14, paymentY + 12);

  doc.setFont("helvetica", "bold");
  doc.text("TERMS AND CONDITIONS:", 14, paymentY + 20);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Please examine your invoice and SOA immediately upon receipt. If no error is reported within 7 days, the amount will be considered " +
      "correct. Cash Payment upon presentation of this bill unless previously arranged. Interest of two percent (2%) per month will be " +
      "charged on all overdue accounts after thirty (30) days.",
    14,
    paymentY + 25,
    { maxWidth: 182 }
  );

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("NOTE: This is a system-generated document under Computerized Accounting System. Signature is not required if there is no alteration.", 14, paymentY + 45);
  doc.text(`Billed shipments: ${invoice.bookingCount} · Generated ${formatDateTime(invoice.createdAt)}`, 14, paymentY + 51);

  return doc;
}

export function printPdf(doc: jsPDF) {
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}
