import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Booking, Profile } from "../types";
import { formatCurrency, formatDate, formatDateTime } from "./utils";

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

export function printPdf(doc: jsPDF) {
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}
