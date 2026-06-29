const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const { sendReminderEmail, sendOverdueEmail } = require("../services/emailService");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const prisma = new PrismaClient();

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function processReminders() {
  console.log(`[${new Date().toISOString()}] Running payment reminder job...`);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const upcomingBills = await prisma.bill.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        due_date: { gte: now, lte: sevenDaysFromNow },
      },
      include: {
        unit: {
          include: {
            building: { select: { name: true } },
            tenant: { select: { name: true, email: true } },
          },
        },
      },
    });

    for (const bill of upcomingBills) {
      if (!bill.unit.tenant) continue;
      try {
        await sendReminderEmail(bill.unit.tenant.email, bill.unit.tenant.name, {
          billing_month: bill.billing_month,
          building_name: bill.unit.building.name,
          unit_number: bill.unit.unit_number,
          total_amount: bill.total_amount,
          due_date: bill.due_date,
        });
        console.log(`Reminder sent to ${bill.unit.tenant.email} for bill ${bill.id}`);
      } catch (err) {
        console.error(`Failed to send reminder for bill ${bill.id}:`, err.message);
      }
    }

    // Mark overdue bills
    const overdueBills = await prisma.bill.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        due_date: { lt: now },
      },
      include: {
        unit: {
          include: {
            building: { select: { name: true } },
            tenant: { select: { name: true, email: true } },
          },
        },
        payments: true,
      },
    });

    for (const bill of overdueBills) {
      const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount_paid, 0);
      const newStatus = totalPaid > 0 ? "OVERDUE" : "OVERDUE";

      await prisma.bill.update({
        where: { id: bill.id },
        data: { status: "OVERDUE" },
      });

      if (!bill.unit.tenant) continue;
      try {
        await sendOverdueEmail(bill.unit.tenant.email, bill.unit.tenant.name, {
          billing_month: bill.billing_month,
          building_name: bill.unit.building.name,
          unit_number: bill.unit.unit_number,
          total_amount: bill.total_amount,
          due_date: bill.due_date,
        });
        console.log(`Overdue notice sent to ${bill.unit.tenant.email}`);
      } catch (err) {
        console.error(`Failed to send overdue notice for bill ${bill.id}:`, err.message);
      }
    }

    console.log(`[${new Date().toISOString()}] Payment reminder job complete`);
  } catch (err) {
    console.error("Reminder job failed:", err);
  }
}

async function processBillingCalendarAlerts() {
  console.log(`[${new Date().toISOString()}] Running billing calendar alert job...`);

  try {
    const buildings = await prisma.building.findMany({
      include: {
        admin: { select: { name: true, email: true } },
        _count: { select: { units: true } },
      },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    for (const building of buildings) {
      const readingDeadline = new Date(year, month, building.meter_reading_day);
      const daysUntil = Math.ceil((readingDeadline - now) / (1000 * 60 * 60 * 24));

      if (daysUntil === 3 || daysUntil === 1) {
        try {
          const transporter = createTransporter();
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: building.admin.email,
            subject: `Action Required: Meter readings due in ${daysUntil} day${daysUntil > 1 ? "s" : ""} — ${building.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #744210; padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">UtiliTrack</h1>
                  <p style="color: #fefcbf; margin: 6px 0 0; font-size: 13px;">Billing Calendar Alert</p>
                </div>
                <div style="padding: 24px; background: #fffff0; border: 1px solid #ecc94b;">
                  <p style="color: #2d3748; font-size: 14px;">Dear ${building.admin.name},</p>
                  <p style="color: #2d3748; font-size: 14px;">
                    Meter readings for <strong>${building.name}</strong> are due in 
                    <strong>${daysUntil} day${daysUntil > 1 ? "s" : ""}</strong> 
                    on <strong>${readingDeadline.toLocaleDateString("en-IN")}</strong>.
                  </p>
                  <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #d69e2e;">
                    <p style="margin: 4px 0; font-size: 13px; color: #4a5568;"><strong>Building:</strong> ${building.name}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #4a5568;"><strong>Units to read:</strong> ${building._count.units}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #4a5568;"><strong>Reading deadline:</strong> ${readingDeadline.toLocaleDateString("en-IN")}</p>
                  </div>
                  <p style="color: #718096; font-size: 13px;">
                    Log in to UtiliTrack and enter all meter readings before the deadline 
                    to avoid billing delays.
                  </p>
                </div>
              </div>
            `,
          });
          console.log(`Calendar alert sent to ${building.admin.email} for ${building.name}`);
        } catch (err) {
          console.error(`Failed to send calendar alert for ${building.name}:`, err.message);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Calendar alert job complete`);
  } catch (err) {
    console.error("Calendar alert job failed:", err);
  }
}

function startReminderJob() {
  // Payment reminders and overdue marking — 10 PM IST daily
  cron.schedule("0 22 * * *", processReminders, { timezone: "Asia/Kolkata" });

  // Billing calendar alerts — 9 AM IST daily
  cron.schedule("0 9 * * *", processBillingCalendarAlerts, { timezone: "Asia/Kolkata" });

  console.log("Cron jobs scheduled:");
  console.log("  Payment reminders: 10 PM IST daily");
  console.log("  Calendar alerts: 9 AM IST daily");
}

// Export for manual testing
module.exports = { startReminderJob, processReminders, processBillingCalendarAlerts };