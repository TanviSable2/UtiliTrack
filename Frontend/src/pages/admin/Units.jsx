import { useState, useEffect } from "react";
import { IconPlus, IconPencil, IconTrash, IconDoor } from "@tabler/icons-react";
import { getUnits, createUnit, updateUnit, deleteUnit } from "../../api/units";
import { getBuildings } from "../../api/buildings";
import { getTenants } from "../../api/auth";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLoader } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

function UnitForm({ initial, buildings, tenants, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial || { unit_number: "", floor: 1, building_id: "", tenant_id: "", monthly_rent: 0 }
  );
  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Building" value={form.building_id} onChange={(e) => set("building_id", e.target.value)}>
          <option value="">Select building</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Input label="Unit number" value={form.unit_number} onChange={(e) => set("unit_number", e.target.value)} placeholder="101" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Floor" type="number" value={form.floor} onChange={(e) => set("floor", parseInt(e.target.value))} />
        <Input label="Monthly rent (₹)" type="number" value={form.monthly_rent} onChange={(e) => set("monthly_rent", parseFloat(e.target.value))} />
      </div>
      <Select label="Assign tenant (optional)" value={form.tenant_id || ""} onChange={(e) => set("tenant_id", e.target.value)}>
        <option value="">Vacant / No tenant</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.email} {t.unit ? "(assigned)" : ""}
          </option>
        ))}
      </Select>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={loading} onClick={() => onSave(form)}>
          {initial ? "Save changes" : "Create unit"}
        </Button>
      </div>
    </div>
  );
}

export default function Units() {
  const [units, setUnits] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filterBuilding, setFilterBuilding] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadUnits(); }, [filterBuilding]);

  async function loadAll() {
    try {
      const [b, t] = await Promise.all([getBuildings(), getTenants()]);
      setBuildings(b.data);
      setTenants(t.data);
    } catch {}
  }

  async function loadUnits() {
    setLoading(true);
    try {
      const params = filterBuilding ? { building_id: filterBuilding } : {};
      const res = await getUnits(params);
      setUnits(res.data);
    } catch { toast.error("Failed to load units"); }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      const payload = {
        ...form,
        building_id: parseInt(form.building_id),
        floor: parseInt(form.floor),
        monthly_rent: parseFloat(form.monthly_rent),
        tenant_id: form.tenant_id ? parseInt(form.tenant_id) : null,
      };
      if (modal.unit) {
        await updateUnit(modal.unit.id, payload);
        toast.success("Unit updated");
      } else {
        await createUnit(payload);
        toast.success("Unit created");
      }
      setModal(null);
      loadUnits();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this unit?")) return;
    try {
      await deleteUnit(id);
      toast.success("Unit deleted");
      loadUnits();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Units"
        subtitle={`${units.length} unit${units.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="h-8 border border-gray-300 rounded-lg px-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="">All buildings</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Button variant="primary" icon={IconPlus} onClick={() => setModal({ unit: null })} size="sm">Add unit</Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Unit</Th><Th>Building</Th><Th>Floor</Th><Th>Tenant</Th><Th>Rent</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <Tr key={u.id}>
                    <Td><span className="font-medium text-gray-900">{u.unit_number}</span></Td>
                    <Td>{u.building?.name}</Td>
                    <Td>Floor {u.floor}</Td>
                    <Td>{u.tenant ? u.tenant.name : <span className="text-gray-400 italic text-sm">Vacant</span>}</Td>
                    <Td>₹{u.monthly_rent?.toLocaleString("en-IN")}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ unit: u })} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                          <IconPencil size={13} className="text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50">
                          <IconTrash size={13} className="text-red-500" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {units.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">No units found</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.unit ? "Edit unit" : "Add unit"}>
        {modal && (
          <UnitForm
            initial={modal.unit}
            buildings={buildings}
            tenants={tenants}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  );
}