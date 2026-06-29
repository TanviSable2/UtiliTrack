const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const create = async (req, res) => {
  const { bill_id, amount_paid, payment_mode, notes } = req.body;

  if (!bill_id || !amount_paid || !payment_mode) {
    return res.status(400).json({ error: "bill_id, amount_paid and payment_mode are required" });
  }

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(bill_id) },
      include: { payments: true },
    });

    if (!bill) return res.status(404).json({ error: "Bill not found" });

    const payment = await prisma.payment.create({
      data: {
        bill_id: parseInt(bill_id),
        amount_paid: parseFloat(amount_paid),
        payment_mode,
        notes,
      },
    });

    const totalPaid =
      bill.payments.reduce((sum, p) => sum + p.amount_paid, 0) +
      parseFloat(amount_paid);

    let newStatus;
    if (totalPaid >= bill.total_amount) {
      newStatus = "PAID";
    } else if (new Date(bill.due_date) < new Date()) {
      newStatus = "OVERDUE";
    } else {
      newStatus = "PARTIAL";
    }

    await prisma.bill.update({
      where: { id: parseInt(bill_id) },
      data: { status: newStatus },
    });

    res.status(201).json({
      payment,
      new_status: newStatus,
      total_paid: totalPaid,
      balance: bill.total_amount - totalPaid,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getByBill = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { bill_id: parseInt(req.params.bill_id) },
      orderBy: { payment_date: "desc" },
    });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getTenantHistory = async (req, res) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { tenant_id: req.user.id },
    });

    if (!unit) return res.status(404).json({ error: "No unit assigned" });

    const bills = await prisma.bill.findMany({
      where: { unit_id: unit.id },
      include: {
        payments: { orderBy: { payment_date: "desc" } },
        line_items: true,
      },
      orderBy: { billing_month: "desc" },
    });

    const history = bills.map((bill) => {
      const total_paid = bill.payments.reduce((sum, p) => sum + p.amount_paid, 0);
      return {
        bill_id: bill.id,
        billing_month: bill.billing_month,
        total_amount: bill.total_amount,
        total_paid,
        balance: parseFloat((bill.total_amount - total_paid).toFixed(2)),
        status: bill.status,
        due_date: bill.due_date,
        payments: bill.payments,
      };
    });

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { create, getByBill, getTenantHistory };

