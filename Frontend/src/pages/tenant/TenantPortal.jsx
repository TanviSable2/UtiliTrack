import { useState, useEffect } from "react";
import {
  IconLogout,
  IconDownload,
  IconFileDescription,
  IconMessageReport,
  IconCircleCheck,
  IconClock,
} from "@tabler/icons-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getTenantDashboard } from "../../api/dashboard";
import { getMyPaymentHistory } from "../../api/payments";
import { raiseDispute } from "../../api/disputes";
import { downloadPDF, downloadConvergentPDF } from "../../api/bills";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  downloadBlob,
  initials,
} from "../../utils/helpers";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const TABS = ["Current bill", "Payment history", "Usage trends", "Disputes"];

function UtiliLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill="white" />
      <path
        d="M16 4 L6 11 L6 28 L12 28 L12 21 L20 21 L20 28 L26 28 L26 11 Z"
        fill="#1e3a5f"
      />
      <rect x="12" y="21" width="8" height="7" rx="1" fill="#1e3a5f" />
    </svg>
  );
}

export default function TenantPortal() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    Promise.all([getTenantDashboard(), getMyPaymentHistory()])
      .then(([d, h]) => {
        setData(d.data);
        setHistory(h.data);
      })
      .catch(() => toast.error("Failed to load your portal"))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    logoutUser();
    toast.success("Signed out");
    navigate("/login");
  }

  async function handleDownloadPDF() {
    if (!data?.current_bill) return;
    setDownloading("pdf");
    try {
      const res = await downloadPDF(data.current_bill.id);
      downloadBlob(res.data, `invoice-${data.current_bill.id}.pdf`);
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadConvergent() {
    if (!data?.current_bill) return;
    setDownloading("conv");
    try {
      const res = await downloadConvergentPDF(data.current_bill.id);
      downloadBlob(res.data, `convergent-${data.current_bill.id}.pdf`);
    } catch {
      toast.error("Failed to download convergent PDF");
    } finally {
      setDownloading(null);
    }
  }

  async function handleRaiseDispute() {
    if (!disputeReason.trim()) return toast.error("Please describe the issue");
    setRaisingDispute(true);
    try {
      await raiseDispute({
        bill_id: data.current_bill.id,
        reason: disputeReason,
      });
      toast.success("Dispute raised — admin will review and respond by email");
      setDisputeModal(false);
      setDisputeReason("");
      const res = await getTenantDashboard();
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to raise dispute");
    } finally {
      setRaisingDispute(false);
    }
  }

  if (loading) return <PageLoader />;

  const bill = data?.current_bill;
  const unit = data?.unit;
  const usageHistory = data?.usage_history || [];

  const chartData = usageHistory
    .slice(0, 6)
    .reverse()
    .map((h) => ({
      month: h.billing_month,
      electricity:
        h.line_items?.find((i) => i.utility_type === "ELECTRICITY")
          ?.units_consumed || 0,
      water:
        h.line_items?.find((i) => i.utility_type === "WATER")
          ?.units_consumed || 0,
      total: h.total_amount,
    }));

  const openDispute = bill?.disputes?.find(
    (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top navbar */}
      <div className="bg-navy-700 px-4 md:px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <UtiliLogo />
          <div>
            <span className="text-base font-medium text-white leading-none block">
              UtiliTrack
            </span>
            <span className="text-2xs text-navy-300">Tenant portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-navy-600 flex items-center justify-center text-2xs font-medium text-white">
              {initials(user?.name)}
            </div>
            <span className="text-sm text-white">{user?.name}</span>
            {unit && (
              <span className="text-xs text-navy-300">
                · Unit {unit.unit_number}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-navy-300 hover:text-white transition-colors border border-white/20 rounded-lg px-2.5 py-1.5"
          >
            <IconLogout size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 flex gap-0 overflow-x-auto flex-shrink-0">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-3 md:px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0
              ${tab === i
                ? "text-navy-700 border-navy-700 font-medium"
                : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Unit info bar */}
      {unit && (
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-2 flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{unit.building?.name}</span>
            {" · "}Unit {unit.unit_number}
            {" · "}Floor {unit.floor}
          </span>
          {bill && (
            <span className="text-sm text-gray-500">
              Current bill: <span className="font-medium text-gray-900">{formatCurrency(bill.total_amount)}</span>
            </span>
          )}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

          {/* TAB 0 — Current bill */}
          {tab === 0 && (
            <div className="space-y-4">
              {!bill ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <IconClock size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-base font-medium text-gray-900 mb-1">
                    No bill generated yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Your admin will generate your bill for the current month
                    soon.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Bill main card */}
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          {formatMonth(bill.billing_month)}
                          {unit && ` · ${unit.building?.name}, Unit ${unit.unit_number}`}
                        </p>
                        <p className="text-4xl font-medium text-gray-900 mb-1.5">
                          {formatCurrency(bill.total_amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due by{" "}
                          <span
                            className={`font-medium ${
                              new Date(bill.due_date) < new Date()
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            {formatDate(bill.due_date)}
                          </span>
                        </p>
                      </div>
                      <Badge status={bill.status} />
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      <Button
                        variant="primary"
                        icon={IconDownload}
                        loading={downloading === "pdf"}
                        onClick={handleDownloadPDF}
                      >
                        Download invoice
                      </Button>
                      <Button
                        variant="outline"
                        icon={IconFileDescription}
                        loading={downloading === "conv"}
                        onClick={handleDownloadConvergent}
                      >
                        Convergent PDF
                      </Button>
                    </div>

                    {/* Breakdown */}
                    <div className="border-t border-gray-100 pt-4 space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                        Bill breakdown
                      </p>

                      {bill.rent_amount > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                          <span className="text-sm text-gray-700">Rent</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(bill.rent_amount)}
                          </span>
                        </div>
                      )}

                      {bill.line_items?.map((item) => (
                        <div key={item.id}>
                          <div className="flex items-center justify-between py-2 border-b border-gray-50">
                            <div>
                              <span className="text-sm text-gray-700">
                                {item.utility_type}
                              </span>
                              <span className="text-xs text-gray-400 ml-2">
                                {item.units_consumed.toFixed(1)} units × ₹
                                {item.rate_per_unit}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(
                                item.units_consumed * item.rate_per_unit
                              )}
                            </span>
                          </div>
                          {item.fixed_charge > 0 && (
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-50 pl-4">
                              <span className="text-xs text-gray-400">
                                {item.utility_type} fixed charge
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatCurrency(item.fixed_charge)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center justify-between py-2.5 bg-gray-50 rounded-lg px-3 mt-2">
                        <span className="text-sm font-medium text-gray-900">
                          Total payable
                        </span>
                        <span className="text-base font-medium text-navy-700">
                          {formatCurrency(bill.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-3">

                    {/* Payment status */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                        Payment status
                      </p>
                      {bill.payments?.length > 0 ? (
                        <div className="space-y-2.5">
                          {bill.payments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-start gap-2 text-sm"
                            >
                              <IconCircleCheck
                                size={14}
                                className="text-green-500 flex-shrink-0 mt-0.5"
                              />
                              <div>
                                <p className="text-gray-900 font-medium">
                                  {formatCurrency(p.amount_paid)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatDate(p.payment_date)} · {p.payment_mode}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Total paid</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(
                                  bill.payments.reduce(
                                    (s, p) => s + p.amount_paid,
                                    0
                                  )
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                              <span className="text-gray-500">Balance due</span>
                              <span className="font-medium text-red-600">
                                {formatCurrency(
                                  bill.total_amount -
                                    bill.payments.reduce(
                                      (s, p) => s + p.amount_paid,
                                      0
                                    )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No payments recorded yet
                        </p>
                      )}
                    </div>

                    {/* Dispute info if exists */}
                    {openDispute && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Active dispute
                        </p>
                        <Badge status={openDispute.status} />
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                          {openDispute.reason}
                        </p>
                        {openDispute.admin_response && (
                          <div className="mt-2.5 bg-gray-50 rounded-lg p-2.5">
                            <p className="text-2xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                              Admin response
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {openDispute.admin_response}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raise dispute button */}
                    {bill.status !== "PAID" && !openDispute && (
                      <button
                        onClick={() => setDisputeModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5
                          border border-dashed border-red-300 rounded-xl text-sm text-red-600
                          hover:bg-red-50 transition-colors"
                      >
                        <IconMessageReport size={15} />
                        Raise a dispute on this bill
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1 — Payment history */}
          {tab === 1 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-base font-medium text-gray-900">
                  Payment history
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  All bills and payments across months
                </p>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Month", "Total bill", "Paid", "Balance", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-xs font-medium text-gray-500 uppercase tracking-wider
                            px-4 py-3 bg-gray-50 text-left border-b border-gray-200"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr
                      key={h.bill_id}
                      className="hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatMonth(h.billing_month)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatCurrency(h.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">
                        {formatCurrency(h.total_paid)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            h.balance > 0
                              ? "text-red-600 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {formatCurrency(h.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={h.status} />
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-sm text-gray-400"
                      >
                        No payment history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2 — Usage trends */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      Monthly bill amount
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id="totalGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#1e3a5f"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor="#1e3a5f"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                          `₹${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        formatter={(v) => formatCurrency(v)}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#1e3a5f"
                        strokeWidth={2}
                        fill="url(#totalGrad)"
                        name="Total bill"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-10">
                    Not enough data yet — bills will appear here as they are generated
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Electricity usage
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Units consumed per month</p>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="elecGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f59e0b"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f59e0b"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="electricity"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#elecGrad)"
                          name="Units"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 py-8 text-center">
                      No data
                    </p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Water usage
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Units consumed per month</p>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="waterGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="water"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#waterGrad)"
                          name="Units"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 py-8 text-center">
                      No data
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 — Disputes */}
          {tab === 3 && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      My disputes
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      All disputes you have raised
                    </p>
                  </div>
                  {bill && bill.status !== "PAID" && !openDispute && (
                    <Button
                      variant="outline"
                      icon={IconMessageReport}
                      onClick={() => setDisputeModal(true)}
                      size="sm"
                    >
                      Raise dispute
                    </Button>
                  )}
                </div>

                <div className="divide-y divide-gray-100">
                  {usageHistory.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                      No disputes raised yet
                    </div>
                  ) : (
                    usageHistory
                      .filter((h) => h.disputes && h.disputes.length > 0)
                      .flatMap((h) =>
                        h.disputes.map((d) => ({ ...d, billing_month: h.billing_month }))
                      )
                      .map((d) => (
                        <div key={d.id} className="px-5 py-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatMonth(d.billing_month)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Raised on {formatDate(d.created_at)}
                              </p>
                            </div>
                            <Badge status={d.status} />
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mb-2">
                            {d.reason}
                          </p>
                          {d.admin_response && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-2xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                Admin response
                              </p>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {d.admin_response}
                              </p>
                              {d.resolved_at && (
                                <p className="text-xs text-gray-400 mt-1.5">
                                  Resolved on {formatDate(d.resolved_at)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                  {usageHistory.length > 0 &&
                    usageHistory.every(
                      (h) => !h.disputes || h.disputes.length === 0
                    ) && (
                      <div className="py-10 text-center text-sm text-gray-400">
                        No disputes raised yet
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raise dispute modal */}
      <Modal
        open={disputeModal}
        onClose={() => setDisputeModal(false)}
        title="Raise a dispute"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            Raising a dispute for{" "}
            <strong>Unit {unit?.unit_number}</strong>
            {bill && (
              <>
                {" · "}
                {formatMonth(bill.billing_month)}
                {" · "}
                {formatCurrency(bill.total_amount)}
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
              Describe the issue
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base
                text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700
                focus:border-transparent resize-none"
              placeholder="Explain why you think this bill is incorrect. Include any details about meter readings, dates you were away, etc."
            />
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your admin will review this and respond via email. You will be
            notified of the outcome. If the reading was incorrect, the bill
            will be recalculated.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setDisputeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={raisingDispute}
              onClick={handleRaiseDispute}
            >
              Submit dispute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}