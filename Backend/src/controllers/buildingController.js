const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const where = req.user.role === "ADMIN" ? { admin_id: req.user.id } : {};
    const buildings = await prisma.building.findMany({
      where,
      include: {
        admin: { select: { name: true, email: true } },
        _count: { select: { units: true } },
      },
      orderBy: { created_at: "desc" },
    });
    res.json(buildings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const building = await prisma.building.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        units: {
          include: {
            tenant: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!building) return res.status(404).json({ error: "Building not found" });
    res.json(building);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const create = async (req, res) => {
  const { name, address, meter_reading_day, bill_generation_day, payment_due_days } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: "Name and address are required" });
  }

  try {
    const building = await prisma.building.create({
      data: {
        name,
        address,
        admin_id: req.user.id,
        meter_reading_day: meter_reading_day ? parseInt(meter_reading_day) : 25,
        bill_generation_day: bill_generation_day ? parseInt(bill_generation_day) : 1,
        payment_due_days: payment_due_days ? parseInt(payment_due_days) : 15,
      },
    });
    res.status(201).json(building);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const update = async (req, res) => {
  const { name, address, meter_reading_day, bill_generation_day, payment_due_days } = req.body;

  try {
    const building = await prisma.building.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        address,
        meter_reading_day: meter_reading_day ? parseInt(meter_reading_day) : undefined,
        bill_generation_day: bill_generation_day ? parseInt(bill_generation_day) : undefined,
        payment_due_days: payment_due_days ? parseInt(payment_due_days) : undefined,
      },
    });
    res.json(building);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.building.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Building deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getBillingCalendar = async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { admin_id: req.user.id },
      include: { _count: { select: { units: true } } },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const calendar = buildings.map((building) => {
      const readingDeadline = new Date(year, month - 1, building.meter_reading_day);
      const billGenerationDate = new Date(year, month, building.bill_generation_day);
      const paymentDueDate = new Date(billGenerationDate);
      paymentDueDate.setDate(paymentDueDate.getDate() + building.payment_due_days);

      const daysUntilReading = Math.ceil(
        (readingDeadline - now) / (1000 * 60 * 60 * 24)
      );

      return {
        building_id: building.id,
        building_name: building.name,
        unit_count: building._count.units,
        meter_reading_deadline: readingDeadline,
        bill_generation_date: billGenerationDate,
        payment_due_date: paymentDueDate,
        days_until_reading_deadline: daysUntilReading,
        reading_deadline_approaching: daysUntilReading <= 3 && daysUntilReading >= 0,
      };
    });

    res.json(calendar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAll, getOne, create, update, remove, getBillingCalendar };