import { useState, useEffect } from "react";
import { IconPlus } from "@tabler/icons-react";
import { getRates, createRate } from "../../api/rates";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLoader } from "../../components/ui/Spinner";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Rates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ utility_type: "ELECTRICITY", rate_per_unit: "", fixed_charge: "0" });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await getRates();
      setRates(res.data);
    } catch { toast.error("Failed to load rates"); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.rate_per_unit) return toast.error("Rate per unit is required");
    setSaving(true);
    try {
      await createRate({ ...form, rate_per_unit: parseFloat(form.rate_per_unit), fixed_charge: parseFloat(form.fixed_charge || 0) });
      toast.success("Rate added — new bills will use this rate");
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save rate");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Utility rates"
        subtitle="Rate history — new entries apply to future bills only"
        actions={<Button variant="primary" icon={IconPlus} onClick={() => setModal(true)} size="sm">Add rate</Button>}
      />
      <div className="flex-1 overflow-auto p-6">

        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Utility type</Th><Th>Rate per unit (₹)</Th><Th>Fixed charge (₹)</Th><Th>Effective from</Th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full
                        ${r.utility_type === "ELECTRICITY" ? "bg-yellow-50 text-yellow-700" :
                          r.utility_type === "WATER" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                        {r.utility_type}
                      </span>
                    </Td>
                    <Td><span className="font-medium">₹{r.rate_per_unit}</span></Td>
                    <Td>₹{r.fixed_charge}</Td>
                    <Td>{formatDate(r.effective_from)}</Td>
                  </Tr>
                ))}
                {rates.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-400">No rates configured</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add utility rate">
        <div className="space-y-4">
          <Select label="Utility type" value={form.utility_type} onChange={(e) => setForm((p) => ({ ...p, utility_type: e.target.value }))}>
            <option value="ELECTRICITY">Electricity</option>
            <option value="WATER">Water</option>
            <option value="GAS">Gas</option>
          </Select>
          <Input label="Rate per unit (₹)" type="number" step="0.01" value={form.rate_per_unit} onChange={(e) => setForm((p) => ({ ...p, rate_per_unit: e.target.value }))} placeholder="6.50" />
          <Input label="Fixed charge per month (₹)" type="number" step="0.01" value={form.fixed_charge} onChange={(e) => setForm((p) => ({ ...p, fixed_charge: e.target.value }))} placeholder="50" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Add rate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}