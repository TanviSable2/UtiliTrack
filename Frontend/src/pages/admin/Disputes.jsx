import { useState, useEffect } from "react";
import { getDisputes, resolveDispute, recalculateBill } from "../../api/disputes";
import Topbar from "../../components/layout/Topbar";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import { formatDate, formatCurrency } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: "RESOLVED", admin_response: "", corrected_reading: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await getDisputes();
      setDisputes(res.data);
    } catch { toast.error("Failed to load disputes"); }
    finally { setLoading(false); }
  }

  async function handleResolve() {
    if (!resolveForm.admin_response) return toast.error("Admin response is required");
    setSaving(true);
    try {
      await resolveDispute(selected.id, {
        status: resolveForm.status,
        admin_response: resolveForm.admin_response,
        corrected_reading: resolveForm.corrected_reading || undefined,
      });

      if (resolveForm.status === "RESOLVED" && resolveForm.corrected_reading) {
        await recalculateBill(selected.id, {
          corrected_reading: parseFloat(resolveForm.corrected_reading),
          utility_type: selected.bill?.line_items?.[0]?.utility_type || "ELECTRICITY",
          billing_month: selected.bill?.billing_month,
        });
        toast.success("Dispute resolved and bill recalculated");
      } else {
        toast.success(`Dispute ${resolveForm.status.toLowerCase()}`);
      }

      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resolve");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Disputes" subtitle={`${disputes.filter((d) => d.status === "OPEN").length} open disputes`} />
      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Tenant</Th><Th>Unit</Th><Th>Bill month</Th><Th>Reason</Th><Th>Raised</Th><Th>Status</Th><Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <Tr key={d.id}>
                    <Td><span className="font-medium">{d.tenant?.name}</span></Td>
                    <Td>{d.bill?.unit?.unit_number}</Td>
                    <Td>{d.bill?.billing_month}</Td>
                    <Td><p className="max-w-xs text-sm text-gray-600 truncate">{d.reason}</p></Td>
                    <Td>{formatDate(d.created_at)}</Td>
                    <Td><Badge status={d.status} /></Td>
                    <Td>
                      {(d.status === "OPEN" || d.status === "UNDER_REVIEW") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelected(d); setResolveForm({ status: "RESOLVED", admin_response: "", corrected_reading: "" }); }}
                        >
                          Review
                        </Button>
                      )}
                      {(d.status === "RESOLVED" || d.status === "REJECTED") && (
                        <span className="text-xs text-gray-400">{formatDate(d.resolved_at)}</span>
                      )}
                    </Td>
                  </Tr>
                ))}
                {disputes.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No disputes raised</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review dispute" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tenant</span>
                <span className="font-medium text-gray-900">{selected.tenant?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bill</span>
                <span className="font-medium text-gray-900">
                  Unit {selected.bill?.unit?.unit_number} · {selected.bill?.billing_month} · {formatCurrency(selected.bill?.total_amount)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 block mb-1">Tenant reason</span>
                <p className="text-gray-900 bg-white border border-gray-200 rounded p-2.5 text-sm">{selected.reason}</p>
              </div>
              {selected.bill?.line_items?.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">Bill breakdown</span>
                  <div className="bg-white border border-gray-200 rounded p-2.5 space-y-1">
                    {selected.bill.line_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.utility_type}: {item.previous_reading} → {item.current_reading} ({item.units_consumed} units)</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Select label="Resolution" value={resolveForm.status} onChange={(e) => setResolveForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="RESOLVED">Resolved — accept dispute</option>
              <option value="REJECTED">Rejected — dispute not valid</option>
              <option value="UNDER_REVIEW">Under review — needs more time</option>
            </Select>

            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">Admin response (sent to tenant)</label>
              <textarea
                value={resolveForm.admin_response}
                onChange={(e) => setResolveForm((p) => ({ ...p, admin_response: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent resize-none"
                placeholder="Explain your decision to the tenant..."
              />
            </div>

            {resolveForm.status === "RESOLVED" && (
              <Input
                label="Corrected reading (optional — triggers bill recalculation)"
                type="number"
                step="0.01"
                value={resolveForm.corrected_reading}
                onChange={(e) => setResolveForm((p) => ({ ...p, corrected_reading: e.target.value }))}
                placeholder="Enter corrected meter reading if applicable"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button
                variant={resolveForm.status === "REJECTED" ? "danger" : "primary"}
                loading={saving}
                onClick={handleResolve}
              >
                {resolveForm.status === "RESOLVED" ? "Resolve dispute" : resolveForm.status === "REJECTED" ? "Reject dispute" : "Mark under review"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}