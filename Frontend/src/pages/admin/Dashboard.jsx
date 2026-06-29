import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconReceipt, IconCircleCheck, IconClockExclamation, IconMessageReport,
  IconDropletSearch, IconAlertTriangle, IconDownload, IconPlus,
  IconChevronRight, IconCalendarStats, IconGauge, IconFileInvoice, IconCreditCard, IconBell,
} from "@tabler/icons-react";
import { getAdminDashboard } from "../../api/dashboard";
import { generateBulk } from "../../api/bills";
import { getBuildings } from "../../api/buildings";
import { getOverdueReport } from "../../api/bills";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import { formatCurrency, formatDate, getCurrentMonth } from "../../utils/helpers";
import toast from "react-hot-toast";

function MetricCard({ label, value, sub, icon: Icon, iconBg, trend, trendLabel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} />
        </div>
        {trendLabel && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend}`}>
            {trendLabel}
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-3xl font-medium text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [month, setMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [month]);

  useEffect(() => {
    getBuildings().then((r) => setBuildings(r.data)).catch(() => {});
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await getAdminDashboard({ billing_month: month });
      setData(res.data);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkGenerate() {
    if (!buildings.length) return toast.error("No buildings found");
    setGenerating(true);
    try {
      for (const b of buildings) {
        await generateBulk({ building_id: b.id, billing_month: month });
      }
      toast.success("Bills generated for all buildings");
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const res = await getOverdueReport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `overdue-report-${month}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <PageLoader />;

  const s = data?.summary || {};

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        subtitle={`Billing overview for ${month}`}
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 border border-gray-300 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700"
            />
            <Button variant="outline" icon={IconDownload} loading={exporting} onClick={handleExportCSV} size="sm">
              Export CSV
            </Button>
            <Button variant="primary" icon={IconPlus} loading={generating} onClick={handleBulkGenerate} size="sm">
              Generate bills
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <p className="section-label">Monthly summary</p>
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              label="Total billed"
              value={formatCurrency(s.total_billed)}
              sub={`${s.total_units || 0} units total`}
              icon={IconReceipt}
              iconBg="bg-blue-50 text-blue-600"
              trendLabel={month}
              trend="bg-gray-100 text-gray-600"
            />
            <MetricCard
              label="Collected"
              value={formatCurrency(s.total_collected)}
              sub={`${s.paid_count || 0} bills fully paid`}
              icon={IconCircleCheck}
              iconBg="bg-green-50 text-green-600"
              trendLabel={`${s.paid_count || 0} paid`}
              trend="bg-green-50 text-green-700"
            />
            <MetricCard
              label="Outstanding"
              value={formatCurrency(s.total_outstanding)}
              sub={`${(s.unpaid_count || 0) + (s.partial_count || 0)} bills pending`}
              icon={IconClockExclamation}
              iconBg="bg-red-50 text-red-600"
              trendLabel={`${s.overdue_count || 0} overdue`}
              trend="bg-red-50 text-red-700"
            />
            <MetricCard
              label="Open disputes"
              value={s.open_disputes || 0}
              sub={`${s.flagged_readings || 0} flagged readings`}
              icon={IconMessageReport}
              iconBg="bg-amber-50 text-amber-600"
              trendLabel={s.open_disputes > 0 ? "Needs review" : "All clear"}
              trend={s.open_disputes > 0 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
<Card>
  <CardHeader>
    <CardTitle>Alerts</CardTitle>
    <span className="text-xs text-gray-500">This month</span>
  </CardHeader>
  <CardBody className="p-0">
   {data?.leak_alerts?.length > 0 && data.leak_alerts.map((l, i) => (
  <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
    <div>
      <p className="text-sm font-medium text-gray-900">
        Unit {l.unit_number} — water {l.excess_factor}x above average
      </p>
      <span className="text-2xs font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">
        Possible leak — inspect meter
      </span>
    </div>
  </div>
))}

{s.flagged_readings > 0 && (
  <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
    <div>
      <p className="text-sm font-medium text-gray-900">
        {s.flagged_readings} reading{s.flagged_readings > 1 ? "s" : ""} flagged
      </p>
      <button
        onClick={() => navigate("/admin/meters")}
        className="text-2xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded mt-0.5 inline-block hover:bg-amber-100"
      >
        Review before billing →
      </button>
    </div>
  </div>
)}

{s.open_disputes > 0 && (
  <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
    <div>
      <p className="text-sm font-medium text-gray-900">
        {s.open_disputes} dispute{s.open_disputes > 1 ? "s" : ""} need response
      </p>
      <button
        onClick={() => navigate("/admin/disputes")}
        className="text-2xs font-medium text-blue-700 hover:underline mt-0.5 inline-block"
      >
        Go to Disputes →
      </button>
    </div>
  </div>
)}

{!data?.leak_alerts?.length && !s.flagged_readings && !s.open_disputes && (
  <div className="px-4 py-8 text-center">
    <p className="text-sm text-gray-400">No alerts this month</p>
  </div>
)} 
  </CardBody>
</Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment status</CardTitle>
              <span className="text-xs text-gray-500">{month}</span>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {[
                { label: "Paid",    count: s.paid_count,    color: "bg-green-500", pill: "bg-green-50 text-green-700"  },
                { label: "Partial", count: s.partial_count, color: "bg-amber-500", pill: "bg-amber-50 text-amber-700"  },
                { label: "Unpaid",  count: s.unpaid_count,  color: "bg-red-500",   pill: "bg-red-50 text-red-700"      },
                { label: "Overdue", count: s.overdue_count, color: "bg-red-700",   pill: "bg-red-100 text-red-800"     },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-900">{item.count || 0}</span>
                    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${item.pill}`}>
                      {item.count || 0} unit{item.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing calendar</CardTitle>
              <span className="text-xs text-gray-500">Current cycle</span>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {buildings.slice(0, 1).map((b) => {
                const now = new Date();
                const readingDate = new Date(now.getFullYear(), now.getMonth(), b.meter_reading_day);
                const billDate = new Date(now.getFullYear(), now.getMonth() + 1, b.bill_generation_day);
                const dueDate = new Date(billDate);
                dueDate.setDate(dueDate.getDate() + b.payment_due_days);
                const reminderDate = new Date(dueDate);
                reminderDate.setDate(reminderDate.getDate() - 7);
                const daysUntil = Math.ceil((readingDate - now) / (1000 * 60 * 60 * 24));

                return (
                  <div key={b.id} className="space-y-2">
                    {[
                      { icon: IconGauge,       label: "Reading deadline", date: readingDate, urgent: daysUntil <= 3 },
                      { icon: IconFileInvoice, label: "Bill generation",  date: billDate,    urgent: false },
                      { icon: IconCreditCard,  label: "Payment due",      date: dueDate,     urgent: false },
                      { icon: IconBell,        label: "Reminder fires",   date: reminderDate,urgent: false },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <row.icon size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{row.label}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                          ${row.urgent ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {formatDate(row.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!buildings.length && <p className="text-sm text-gray-400">No buildings yet</p>}
            </CardBody>
          </Card>
        </div>

        <div>
          <p className="section-label">All units — {month}</p>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Unit", "Building", "Tenant", "Bill amount", "Paid", "Balance", "Status", "Dispute", ""].map((h) => (
                      <th key={h} className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5 bg-gray-50 text-left border-b border-gray-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.units?.map((unit) => {
                    const bill = unit.bills?.[0];
                    const paid = bill?.payments?.reduce((s, p) => s + p.amount_paid, 0) || 0;
                    const balance = bill ? bill.total_amount - paid : 0;
                    const openDispute = bill?.disputes?.find((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");

                    return (
                      <tr
                        key={unit.id}
                        onClick={() => navigate("/admin/bills")}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 border-b border-gray-100">
                          <span className="font-medium text-gray-900">{unit.unit_number}</span>
                          <span className="text-xs text-gray-400 ml-1.5">Floor {unit.floor}</span>
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-600">{unit.building?.name}</td>
                        <td className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-700">
                          {unit.tenant ? unit.tenant.name : <span className="text-gray-400 italic">Vacant</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100 text-sm font-medium text-gray-900">
                          {bill ? formatCurrency(bill.total_amount) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100 text-sm text-gray-700">
                          {bill ? formatCurrency(paid) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100 text-sm">
                          {bill ? (
                            <span className={balance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                              {formatCurrency(balance)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100">
                          {bill ? <Badge status={bill.status} /> : <Badge status="UNPAID" label="No bill" />}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100">
                          {openDispute ? (
                            <Badge status="OPEN" label="Open" />
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 border-b border-gray-100">
                          <IconChevronRight size={14} className="text-gray-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!data?.units?.length && (
                <div className="py-12 text-center text-sm text-gray-400">No units found</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}