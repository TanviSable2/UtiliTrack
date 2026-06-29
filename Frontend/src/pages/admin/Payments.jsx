import { useState, useEffect } from "react";
import { IconPlus } from "@tabler/icons-react";
import { createPayment } from "../../api/payments";
import { getBills } from "../../api/bills";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import { formatCurrency, formatDate, getCurrentMonth } from "../../utils/helpers";
import toast from "react-hot-toast";

const PAYMENT_MODES = ["UPI", "CASH", "BANK_TRANSFER", "CHEQUE", "CARD"];

export default function Payments() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [form, setForm] = useState({ bill_id: "", amount_paid: "", payment_mode: "UPI", notes: "" });

  useEffect(() => { loadBills(); }, [filterMonth]);

  async function loadBills() {
    setLoading(true);
    try {
      const res = await getBills({ billing_month: filterMonth });
      setBills(res.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.bill_id || !form.amount_paid) return toast.error("Fill all required fields");
    setSaving(true);
    try {
      await createPayment({ ...form, bill_id: parseInt(form.bill_id), amount_paid: parseFloat(form.amount_paid) });
      toast.success("Payment recorded");
      setModal(false);
      setForm({ bill_id: "", amount_paid: "", payment_mode: "UPI", notes: "" });
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record payment");
    } finally { setSaving(false); }
  }

  const unpaidBills = bills.filter((b) => b.status !== "PAID");

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Payments"
        subtitle="Record and track tenant payments"
        actions={
          <>
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="h-8 border border-gray-300 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700" />
            <Button variant="primary" icon={IconPlus} onClick={() => setModal(true)} size="sm">Record payment</Button>
          </>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th><Th>Tenant</Th><Th>Total bill</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th>Payments</Th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const paid = b.payments?.reduce((s, p) => s + p.amount_paid, 0) || 0;
                  const balance = b.total_amount - paid;
                  return (
                    <Tr key={b.id}>
                      <Td><span className="font-medium">{b.unit?.unit_number}</span></Td>
                      <Td>{b.unit?.tenant?.name || <span className="text-gray-400 italic">Vacant</span>}</Td>
                      <Td>{formatCurrency(b.total_amount)}</Td>
                      <Td className="text-green-600 font-medium">{formatCurrency(paid)}</Td>
                      <Td className={balance > 0 ? "text-red-600 font-medium" : "text-gray-400"}>{formatCurrency(balance)}</Td>
                      <Td><Badge status={b.status} /></Td>
                      <Td>
                        <div className="flex flex-col gap-0.5">
                          {b.payments?.map((p) => (
                            <span key={p.id} className="text-xs text-gray-500">
                              {formatDate(p.payment_date)} · {p.payment_mode} · {formatCurrency(p.amount_paid)}
                            </span>
                          ))}
                          {!b.payments?.length && <span className="text-xs text-gray-400">No payments</span>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
                {bills.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No bills for {filterMonth}</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record payment">
        <div className="space-y-4">
          <Select label="Bill" value={form.bill_id} onChange={(e) => setForm((p) => ({ ...p, bill_id: e.target.value }))}>
            <option value="">Select bill</option>
            {unpaidBills.map((b) => (
              <option key={b.id} value={b.id}>
                Unit {b.unit?.unit_number} — {b.unit?.tenant?.name} — {formatCurrency(b.total_amount)} ({b.status})
              </option>
            ))}
          </Select>
          <Input label="Amount paid (₹)" type="number" value={form.amount_paid} onChange={(e) => setForm((p) => ({ ...p, amount_paid: e.target.value }))} placeholder="0.00" />
          <Select label="Payment mode" value={form.payment_mode} onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Record payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}