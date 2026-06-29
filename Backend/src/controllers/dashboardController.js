const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const adminDashboard = async (req, res) => {
  try {
    const { billing_month } = req.query;
    const month = billing_month || new Date().toISOString().slice(0, 7);

    const buildings = await prisma.building.findMany({
      where: { admin_id: req.user.id },
      select: { id: true },
    });
    const buildingIds = buildings.map((b) => b.id);

    const allUnits = await prisma.unit.findMany({
      where: { building_id: { in: buildingIds } },
    });
    const unitIds = allUnits.map((u) => u.id);

    const bills = await prisma.bill.findMany({
      where: { unit_id: { in: unitIds }, billing_month: month },
      include: { payments: true },
    });

    const total_billed = bills.reduce((sum, b) => sum + b.total_amount, 0);
    const total_collected = bills.reduce(
      (sum, b) => sum + b.payments.reduce((ps, p) => ps + p.amount_paid, 0),
      0
    );
    const total_outstanding = total_billed - total_collected;

    const open_disputes = await prisma.dispute.count({
      where: {
        bill: { unit_id: { in: unitIds } },
        status: { in: ["OPEN", "UNDER_REVIEW"] },
      },
    });

    const flagged_readings = await prisma.meterReading.count({
      where: { unit_id: { in: unitIds }, billing_month: month, is_flagged: true },
    });

    const unitsWithBills = await prisma.unit.findMany({
      where: { building_id: { in: buildingIds } },
      include: {
        building: { select: { name: true } },
        tenant: { select: { name: true, email: true } },
        bills: {
          where: { billing_month: month },
          include: { payments: true, disputes: true },
        },
      },
      orderBy: [{ building_id: "asc" }, { unit_number: "asc" }],
    });

    res.json({
      billing_month: month,
      summary: {
        total_billed: parseFloat(total_billed.toFixed(2)),
        total_collected: parseFloat(total_collected.toFixed(2)),
        total_outstanding: parseFloat(total_outstanding.toFixed(2)),
        paid_count: bills.filter((b) => b.status === "PAID").length,
        unpaid_count: bills.filter((b) => b.status === "UNPAID").length,
        overdue_count: bills.filter((b) => b.status === "OVERDUE").length,
        partial_count: bills.filter((b) => b.status === "PARTIAL").length,
        total_units: allUnits.length,
        open_disputes,
        flagged_readings,
      },
      units: unitsWithBills,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const tenantDashboard = async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { tenant_id: req.user.id },
      include: { building: true },
    });

    if (!unit) return res.status(404).json({ error: "No unit assigned to your account" });

    const bills = await prisma.bill.findMany({
      where: { unit_id: unit.id },
      include: { line_items: true, payments: true, disputes: true },
      orderBy: { billing_month: "desc" },
      take: 12,
    });

    const current_bill = bills[0] || null;
    const usage_history = bills.map((b) => ({
      billing_month: b.billing_month,
      total_amount: b.total_amount,
      status: b.status,
      line_items: b.line_items,
    }));

    res.json({ unit, current_bill, usage_history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { adminDashboard, tenantDashboard };