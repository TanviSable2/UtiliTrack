import { useState, useEffect } from "react";
import { IconDownload, IconFileInvoice, IconPlus } from "@tabler/icons-react";
import { getBills, generateBill, downloadPDF, downloadConvergentPDF } from "../../api/bills";
import { getUnits } from "../../api/units";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import { formatCurrency, formatDate, formatMonth, getCurrentMonth, downloadBlob } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ unit_id: "", billing_month: getCurrentMonth() });

  useEffect(() => { loadBills(); }, [filterMonth, filterStatus]);
  useEffect(() => { getUnits().then((r) => setUnits(r.data)).catch(() => {}); }, []);

  async function loadBills() {
    setLoading(true);
    try {
      const params = { billing_month: filterMonth };
      if (filterStatus) params.status = filterStatus;
      const res = await getBills(params);
      setBills(res.data);
    } catch { toast.error("Failed to load bills"); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    if (!form.unit_id) return toast.error("Select a unit");
    setSaving(true);
    try {
      const res = await generateBill({ unit_id: parseInt(form.unit_id), billing_month: form.billing_month });
      if (res.data.already_exists) toast("Bill already exists for this month", { icon: "ℹ️" });
      else toast.success("Bill generated");
      setModal(false);
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate bill");
    } finally { setSaving(false); }
  }

  async function handleDownloadPDF(bill) {
    setDownloading(bill.id + "pdf");
    try {
      const res = await downloadPDF(bill.id);
      downloadBlob(res.data, `invoice-${bill.id}-${bill.billing_month}.pdf`);
    } catch { toast.error("Failed to download"); }
    finally { setDownloading(null); }
  }

  async function handleDownloadConvergent(bill) {
    setDownloading(bill.id + "conv");
    try {
      const res = await downloadConvergentPDF(bill.id);
      downloadBlob(res.data, `convergent-${bill.id}-${bill.billing_month}.pdf`);
    } catch { toast.error("Failed to download"); }
    finally { setDownloading(null); }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Bills"
        subtitle={`${bills.length} bill${bills.length !== 1 ? "s" : ""} for ${filterMonth}`}
        actions={
          <>
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="h-8 border border-gray-300 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 border border-gray-300 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none">
              <option value="">All statuses</option>
              {["PAID", "UNPAID", "PARTIAL", "OVERDUE"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="primary" icon={IconPlus} onClick={() => setModal(true)} size="sm">Generate bill</Button>
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th><Th>Unit</Th><Th>Tenant</Th><Th>Month</Th>
                  <Th>Rent</Th><Th>Utilities</Th><Th>Total</Th><Th>Due</Th><Th>Status</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <Tr key={b.id}>
                    <Td><span className="font-mono text-xs text-gray-500">INV-{String(b.id).padStart(5, "0")}</span></Td>
                    <Td><span className="font-medium">{b.unit?.unit_number}</span> <span className="text-gray-400 text-xs">· {b.unit?.building?.name}</span></Td>
                    <Td>{b.unit?.tenant?.name || <span className="text-gray-400 italic text-sm">Vacant</span>}</Td>
                    <Td>{formatMonth(b.billing_month)}</Td>
                    <Td>{formatCurrency(b.rent_amount)}</Td>
                    <Td>{formatCurrency(b.utility_amount)}</Td>
                    <Td><span className="font-medium">{formatCurrency(b.total_amount)}</span></Td>
                    <Td>{formatDate(b.due_date)}</Td>
                    <Td><Badge status={b.status} /></Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadPDF(b)}
                          disabled={downloading === b.id + "pdf"}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
                          title="Download invoice PDF"
                        >
                          <IconDownload size={13} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDownloadConvergent(b)}
                          disabled={downloading === b.id + "conv"}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
                          title="Download convergent PDF"
                        >
                          <IconFileInvoice size={13} className="text-gray-500" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {bills.length === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-sm text-gray-400">No bills found for {filterMonth}</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate bill">
        <div className="space-y-4">
          <Select label="Unit" value={form.unit_id} onChange={(e) => setForm((p) => ({ ...p, unit_id: e.target.value }))}>
            <option value="">Select unit</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.unit_number} — {u.tenant?.name || "Vacant"} ({u.building?.name})</option>)}
          </Select>
          <Input label="Billing month" type="month" value={form.billing_month} onChange={(e) => setForm((p) => ({ ...p, billing_month: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleGenerate}>Generate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}