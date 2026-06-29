const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendReminderEmail(to, tenantName, billDetails) {
  const daysUntilDue = Math.ceil(
    (new Date(billDetails.due_date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Payment Reminder: Utility Bill Due in ${daysUntilDue} days - ${billDetails.billing_month}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a365d; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">UtiliTrack</h1>
          <p style="color: #bee3f8; margin: 4px 0 0;">Smart Utility Billing System</p>
        </div>
        <div style="padding: 24px; background: #f7fafc;">
          <p>Dear ${tenantName},</p>
          <p>Your utility bill for <strong>${billDetails.billing_month}</strong> is due in <strong>${daysUntilDue} days</strong>.</p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #2b6cb0;">
            <p style="margin: 4px 0;"><strong>Building:</strong> ${billDetails.building_name}</p>
            <p style="margin: 4px 0;"><strong>Unit:</strong> ${billDetails.unit_number}</p>
            <p style="margin: 4px 0;"><strong>Amount Due:</strong> Rs ${billDetails.total_amount.toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Due Date:</strong> ${new Date(billDetails.due_date).toLocaleDateString("en-IN")}</p>
          </div>
          <p style="color: #718096; font-size: 12px;">Log in to the tenant portal to download your invoice.</p>
        </div>
      </div>
    `,
  });
}

async function sendOverdueEmail(to, tenantName, billDetails) {
  const daysOverdue = Math.floor(
    (new Date() - new Date(billDetails.due_date)) / (1000 * 60 * 60 * 24)
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `OVERDUE NOTICE: Utility Bill for ${billDetails.billing_month} - Action Required`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #c53030; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">UtiliTrack</h1>
          <p style="color: #fed7d7; margin: 4px 0 0;">Overdue Payment Notice</p>
        </div>
        <div style="padding: 24px; background: #fff5f5;">
          <p>Dear ${tenantName},</p>
          <p>Your bill for <strong>${billDetails.billing_month}</strong> is <strong>${daysOverdue} days overdue</strong>. Please pay immediately.</p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #e53e3e;">
            <p style="margin: 4px 0;"><strong>Building:</strong> ${billDetails.building_name}</p>
            <p style="margin: 4px 0;"><strong>Unit:</strong> ${billDetails.unit_number}</p>
            <p style="margin: 4px 0;"><strong>Amount Overdue:</strong> Rs ${billDetails.total_amount.toFixed(2)}</p>
            <p style="margin: 4px 0; color: #e53e3e;"><strong>Days Overdue: ${daysOverdue}</strong></p>
          </div>
        </div>
      </div>
    `,
  });
}

async function sendDisputeOutcomeEmail(to, tenantName, disputeDetails) {
  const isResolved = disputeDetails.status === "RESOLVED";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Dispute ${isResolved ? "Resolved" : "Rejected"}: Bill for ${disputeDetails.billing_month}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isResolved ? "#276749" : "#c53030"}; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">UtiliTrack</h1>
          <p style="color: ${isResolved ? "#c6f6d5" : "#fed7d7"}; margin: 4px 0 0;">Dispute ${isResolved ? "Resolved" : "Rejected"}</p>
        </div>
        <div style="padding: 24px; background: #f7fafc;">
          <p>Dear ${tenantName},</p>
          <p>Your billing dispute for <strong>${disputeDetails.billing_month}</strong> at <strong>${disputeDetails.building_name}, Unit ${disputeDetails.unit_number}</strong> has been <strong>${disputeDetails.status}</strong>.</p>
          ${disputeDetails.admin_response ? `
          <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${isResolved ? "#38a169" : "#e53e3e"};">
            <p style="margin: 0;"><strong>Admin Response:</strong> ${disputeDetails.admin_response}</p>
          </div>` : ""}
          <p style="color: #718096; font-size: 12px;">Log in to the tenant portal to view your updated bill.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendReminderEmail, sendOverdueEmail, sendDisputeOutcomeEmail };