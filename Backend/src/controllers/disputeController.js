const { PrismaClient } = require("@prisma/client");
const { sendDisputeOutcomeEmail } = require("../services/emailService");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    if (req.user.role === "TENANT") {
      const disputes = await prisma.dispute.findMany({
        where: { tenant_id: req.user.id },
        include: {
          bill: {
            include: {
              unit: { include: { building: { select: { name: true } } } },
              line_items: true,
            },
          },
          tenant: { select: { name: true, email: true } },
        },
        orderBy: { created_at: "desc" },
      });
      return res.json(disputes);
    }

    // Admin — only see disputes for their own buildings
    const adminBuildings = await prisma.building.findMany({
      where: { admin_id: req.user.id },
      select: { id: true },
    });
    const buildingIds = adminBuildings.map((b) => b.id);

    const units = await prisma.unit.findMany({
      where: { building_id: { in: buildingIds } },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    const disputes = await prisma.dispute.findMany({
      where: {
        bill: { unit_id: { in: unitIds } },
      },
      include: {
        bill: {
          include: {
            unit: {
              include: { building: { select: { name: true } } },
            },
            line_items: true,
          },
        },
        tenant: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(disputes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        bill: {
          include: {
            unit: { include: { building: true } },
            line_items: true,
            payments: true,
          },
        },
        tenant: { select: { name: true, email: true } },
      },
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    res.json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const raise = async (req, res) => {
  const { bill_id, reason } = req.body;

  if (!bill_id || !reason) {
    return res.status(400).json({ error: "bill_id and reason are required" });
  }

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(bill_id) },
      include: { disputes: true },
    });

    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const openDispute = bill.disputes.find(
      (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
    );
    if (openDispute) {
      return res.status(409).json({ error: "An open dispute already exists for this bill" });
    }

    const dispute = await prisma.dispute.create({
      data: {
        bill_id: parseInt(bill_id),
        tenant_id: req.user.id,
        reason,
        status: "OPEN",
      },
    });

    res.status(201).json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const resolve = async (req, res) => {
  const { status, admin_response, corrected_reading } = req.body;
  const validStatuses = ["RESOLVED", "REJECTED", "UNDER_REVIEW"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Valid status is required: RESOLVED, REJECTED, or UNDER_REVIEW" });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        tenant: { select: { name: true, email: true } },
        bill: {
          include: {
            unit: { include: { building: true } },
          },
        },
      },
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });

    const updated = await prisma.dispute.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status,
        admin_response,
        corrected_reading: corrected_reading ? parseFloat(corrected_reading) : null,
        resolved_at: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
      },
    });

    if (status === "RESOLVED" || status === "REJECTED") {
      try {
        await sendDisputeOutcomeEmail(
          dispute.tenant.email,
          dispute.tenant.name,
          {
            status,
            admin_response,
            billing_month: dispute.bill.billing_month,
            building_name: dispute.bill.unit.building.name,
            unit_number: dispute.bill.unit.unit_number,
          }
        );
      } catch (emailErr) {
        console.error("Failed to send dispute outcome email:", emailErr.message);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
const recalculateBill = async (req, res) => {
  const { corrected_reading, utility_type, billing_month } = req.body;

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        bill: {
          include: {
            unit: true,
            line_items: true,
            payments: true,
          },
        },
      },
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    if (dispute.status !== "RESOLVED") {
      return res.status(400).json({ error: "Dispute must be resolved before recalculating" });
    }

    await prisma.meterReading.updateMany({
      where: {
        unit_id: dispute.bill.unit_id,
        utility_type,
        billing_month: dispute.bill.billing_month,
      },
      data: {
        reading_value: parseFloat(corrected_reading),
        is_flagged: false,
        flag_reason: "Corrected after dispute resolution",
      },
    });

    await prisma.billItem.deleteMany({ where: { bill_id: dispute.bill.id } });

    const { calculateBillForUnit } = require("../services/billingEngine");
    const { lineItems, total_amount } = await calculateBillForUnit(
      dispute.bill.unit_id,
      dispute.bill.billing_month
    );

    const unit = await prisma.unit.findUnique({ where: { id: dispute.bill.unit_id } });

    const newTotal = total_amount + (unit.monthly_rent || 0);

    // Check existing payments to set correct status
    const totalPaid = dispute.bill.payments.reduce((sum, p) => sum + p.amount_paid, 0);
    let newStatus;
    if (totalPaid >= newTotal) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    } else if (new Date(dispute.bill.due_date) < new Date()) {
      newStatus = "OVERDUE";
    } else {
      newStatus = "UNPAID";
    }

    await prisma.bill.update({
      where: { id: dispute.bill.id },
      data: {
        utility_amount: total_amount,
        total_amount: newTotal,
        status: newStatus,
        line_items: { create: lineItems },
      },
    });

    const updatedBill = await prisma.bill.findUnique({
      where: { id: dispute.bill.id },
      include: { line_items: true, payments: true },
    });

    res.json({
      message: "Bill recalculated successfully",
      bill: updatedBill,
      total_paid: totalPaid,
      new_total: newTotal,
      balance: newTotal - totalPaid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAll, getOne, raise, resolve, recalculateBill };
