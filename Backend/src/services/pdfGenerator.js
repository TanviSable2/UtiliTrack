const PDFDocument = require("pdfkit");

function generateInvoicePDF(bill) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const colors = {
      primary: "#1a365d",
      secondary: "#2b6cb0",
      accent: "#e53e3e",
      light: "#f7fafc",
      border: "#e2e8f0",
      text: "#2d3748",
      muted: "#718096",
    };

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // header background
    doc.rect(0, 0, pageWidth, 80).fill(colors.primary);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("UtiliTrack", margin, 20);
    doc.fontSize(10).font("Helvetica").fillColor("#bee3f8").text("Smart Utility Billing System", margin, 48);

    // status badge
    const statusColors = {
      PAID: "#38a169",
      UNPAID: "#e53e3e",
      OVERDUE: "#c05621",
      PARTIAL: "#d69e2e",
    };

    const badgeColor = statusColors[bill.status] || colors.accent;
    doc.roundedRect(pageWidth - 145, 20, 95, 26, 4).fill(badgeColor);
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
      .text(bill.status, pageWidth - 145, 28, { width: 95, align: "center" });

    // invoice meta + billed to
    let y = 105;

    doc.fillColor(colors.text).fontSize(14).font("Helvetica-Bold").text("TAX INVOICE", margin, y);
    doc.fontSize(10).font("Helvetica").fillColor(colors.muted)
      .text(`Invoice #INV-${String(bill.id).padStart(6, "0")}`, margin, y + 20)
      .text(`Billing Month: ${bill.billing_month}`, margin, y + 34)
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, margin, y + 48)
      .text(`Due Date: ${new Date(bill.due_date).toLocaleDateString("en-IN")}`, margin, y + 62);

    const billedToX = pageWidth - 260;
    doc.fillColor(colors.text).fontSize(11).font("Helvetica-Bold").text("Billed To:", billedToX, y);
    doc.fontSize(10).font("Helvetica").fillColor(colors.muted)
      .text(bill.unit.tenant?.name || "Tenant", billedToX, y + 16)
      .text(bill.unit.tenant?.email || "", billedToX, y + 30)
      .text(`Unit: ${bill.unit.unit_number}`, billedToX, y + 44)
      .text(bill.unit.building.name, billedToX, y + 58)
      .text(bill.unit.building.address, billedToX, y + 72, { width: 210 });

    // divider
    y = 235;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke(colors.border);
    y += 12;

    // table header
    const col = {
      utility: margin + 10,
      prevReading: 165,
      currReading: 265,
      units: 355,
      rate: 415,
      amount: pageWidth - margin - 10,
    };

    doc.rect(margin, y, contentWidth, 22).fill(colors.primary);
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
      .text("Utility", col.utility, y + 7)
      .text("Prev Reading", col.prevReading, y + 7)
      .text("Curr Reading", col.currReading, y + 7)
      .text("Units Used", col.units, y + 7)
      .text("Rate (Rs)", col.rate, y + 7)
      .text("Amount (Rs)", col.amount - 60, y + 7, { width: 70, align: "right" });

    y += 22;

    // table rows
    let rowAlt = false;
    for (const item of bill.line_items) {
      if (rowAlt) {
        doc.rect(margin, y, contentWidth, 20).fill("#f0f4f8");
      }
      rowAlt = !rowAlt;

      doc.fillColor(colors.text).fontSize(9).font("Helvetica")
        .text(item.utility_type, col.utility, y + 6)
        .text(item.previous_reading.toFixed(2), col.prevReading, y + 6)
        .text(item.current_reading.toFixed(2), col.currReading, y + 6)
        .text(item.units_consumed.toFixed(2), col.units, y + 6)
        .text(`Rs ${item.rate_per_unit.toFixed(2)}`, col.rate, y + 6)
        .text(
          `Rs ${(item.units_consumed * item.rate_per_unit).toFixed(2)}`,
          col.amount - 60,
          y + 6,
          { width: 70, align: "right" }
        );
      y += 20;

      if (item.fixed_charge > 0) {
        if (rowAlt) {
          doc.rect(margin, y, contentWidth, 18).fill("#f0f4f8");
        }
        rowAlt = !rowAlt;

        doc.fillColor(colors.muted).fontSize(8).font("Helvetica")
          .text(`${item.utility_type} Fixed Charge`, col.utility + 10, y + 5)
          .text(
            `Rs ${item.fixed_charge.toFixed(2)}`,
            col.amount - 60,
            y + 5,
            { width: 70, align: "right" }
          );
        y += 18;
      }
    }

    // total row
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke(colors.border);
    y += 10;

    const totalBoxX = pageWidth - margin - 220;
    doc.rect(totalBoxX, y, 220, 30).fill(colors.primary);
    doc.fillColor("white").fontSize(11).font("Helvetica-Bold")
      .text("TOTAL DUE", totalBoxX + 10, y + 9);
    doc.fontSize(12).font("Helvetica-Bold")
      .text(
        `Rs ${bill.total_amount.toFixed(2)}`,
        totalBoxX + 10,
        y + 9,
        { width: 200, align: "right" }
      );

    y += 50;

    // payment history
    if (bill.payments && bill.payments.length > 0) {
      doc.fillColor(colors.text).fontSize(11).font("Helvetica-Bold").text("Payment History", margin, y);
      y += 16;

      for (const payment of bill.payments) {
        const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount_paid, 0);
        doc.fontSize(9).font("Helvetica").fillColor(colors.muted)
          .text(
            `${new Date(payment.payment_date).toLocaleDateString("en-IN")}  —  ${payment.payment_mode}  —  Rs ${payment.amount_paid.toFixed(2)}`,
            margin,
            y
          );
        y += 14;
      }

      const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount_paid, 0);
      const balance = bill.total_amount - totalPaid;

      y += 4;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.text)
        .text(`Total Paid: Rs ${totalPaid.toFixed(2)}`, margin, y)
        .text(
          `Balance Due: Rs ${balance.toFixed(2)}`,
          margin,
          y,
          { width: contentWidth, align: "right" }
        );
    }

    // footer
    const footerY = doc.page.height - 60;
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).lineWidth(0.5).stroke(colors.border);
    doc.fillColor(colors.muted).fontSize(8).font("Helvetica")
      .text(
        "This is a computer generated invoice. For disputes contact your building admin.",
        margin,
        footerY + 8,
        { align: "center", width: contentWidth }
      )
      .text(
        "UtiliTrack — Smart Utility Billing System",
        margin,
        footerY + 20,
        { align: "center", width: contentWidth }
      );

    doc.end();
  });
}

function generateConvergentPDF(bill) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // header
    doc.rect(0, 0, pageWidth, 80).fill("#1a365d");
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("UtiliTrack", margin, 20);
    doc.fontSize(10).font("Helvetica").fillColor("#bee3f8").text("Combined Monthly Statement", margin, 48);

    let y = 105;

    // statement info
    doc.fillColor("#2d3748").fontSize(14).font("Helvetica-Bold").text("COMBINED MONTHLY STATEMENT", margin, y);
    y += 22;

    doc.fontSize(10).font("Helvetica").fillColor("#718096")
      .text(`Statement Month: ${bill.billing_month}`, margin, y)
      .text(`Due Date: ${new Date(bill.due_date).toLocaleDateString("en-IN")}`, margin, y + 14)
      .text(`Tenant: ${bill.unit.tenant?.name || "Tenant"}`, margin, y + 28)
      .text(`Unit: ${bill.unit.unit_number} — ${bill.unit.building.name}`, margin, y + 42)
      .text(bill.unit.building.address, margin, y + 56, { width: 300 });

    y += 80;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke("#e2e8f0");
    y += 16;

    // rent section
    doc.rect(margin, y, contentWidth, 24).fill("#edf2f7");
    doc.fillColor("#2d3748").fontSize(11).font("Helvetica-Bold")
      .text("RENT", margin + 10, y + 7);
    doc.fontSize(11).font("Helvetica-Bold")
      .text(
        `Rs ${(bill.rent_amount || 0).toFixed(2)}`,
        margin + 10,
        y + 7,
        { width: contentWidth - 20, align: "right" }
      );
    y += 32;

    // utilities section header
    doc.rect(margin, y, contentWidth, 24).fill("#edf2f7");
    doc.fillColor("#2d3748").fontSize(11).font("Helvetica-Bold")
      .text("UTILITIES", margin + 10, y + 7);
    y += 32;

    // utility line items
    for (const item of bill.line_items) {
      doc.fillColor("#4a5568").fontSize(10).font("Helvetica")
        .text(
          `${item.utility_type}  (${item.units_consumed.toFixed(2)} units × Rs ${item.rate_per_unit.toFixed(2)})`,
          margin + 20,
          y
        )
        .text(
          `Rs ${(item.units_consumed * item.rate_per_unit).toFixed(2)}`,
          margin + 20,
          y,
          { width: contentWidth - 40, align: "right" }
        );
      y += 18;

      if (item.fixed_charge > 0) {
        doc.fillColor("#718096").fontSize(9).font("Helvetica")
          .text(`${item.utility_type} Fixed Charge`, margin + 20, y)
          .text(
            `Rs ${item.fixed_charge.toFixed(2)}`,
            margin + 20,
            y,
            { width: contentWidth - 40, align: "right" }
          );
        y += 16;
      }
    }

    // utility subtotal
    y += 6;
    doc.moveTo(margin + 20, y).lineTo(pageWidth - margin - 20, y).lineWidth(0.5).stroke("#e2e8f0");
    y += 8;

    const utilityTotal = bill.utility_amount || bill.line_items.reduce((sum, item) => {
      return sum + (item.units_consumed * item.rate_per_unit) + item.fixed_charge;
    }, 0);

    doc.fillColor("#4a5568").fontSize(10).font("Helvetica-Bold")
      .text("Utility Subtotal", margin + 20, y)
      .text(
        `Rs ${utilityTotal.toFixed(2)}`,
        margin + 20,
        y,
        { width: contentWidth - 40, align: "right" }
      );
    y += 20;

    // total payable box
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke("#e2e8f0");
    y += 12;

    doc.rect(margin, y, contentWidth, 34).fill("#1a365d");
    doc.fillColor("white").fontSize(13).font("Helvetica-Bold")
      .text("TOTAL PAYABLE", margin + 12, y + 10);
    doc.fontSize(14).font("Helvetica-Bold")
      .text(
        `Rs ${bill.total_amount.toFixed(2)}`,
        margin + 12,
        y + 10,
        { width: contentWidth - 24, align: "right" }
      );

    y += 50;

    // payment history if any
    if (bill.payments && bill.payments.length > 0) {
      doc.fillColor("#2d3748").fontSize(10).font("Helvetica-Bold").text("Payment History", margin, y);
      y += 14;

      for (const payment of bill.payments) {
        doc.fillColor("#718096").fontSize(9).font("Helvetica")
          .text(
            `${new Date(payment.payment_date).toLocaleDateString("en-IN")}  —  ${payment.payment_mode}  —  Rs ${payment.amount_paid.toFixed(2)}`,
            margin,
            y
          );
        y += 13;
      }
    }

    // footer
    const footerY = doc.page.height - 60;
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).lineWidth(0.5).stroke("#e2e8f0");
    doc.fillColor("#718096").fontSize(8).font("Helvetica")
      .text(
        "This is a computer generated combined statement. For disputes contact your building admin.",
        margin,
        footerY + 8,
        { align: "center", width: contentWidth }
      )
      .text(
        "UtiliTrack — Smart Utility Billing System",
        margin,
        footerY + 20,
        { align: "center", width: contentWidth }
      );

    doc.end();
  });
}

module.exports = { generateInvoicePDF, generateConvergentPDF };