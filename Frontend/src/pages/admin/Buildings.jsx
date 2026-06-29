import { useState, useEffect } from "react";
import { IconPlus, IconPencil, IconTrash, IconBuilding } from "@tabler/icons-react";
import { getBuildings, createBuilding, updateBuilding, deleteBuilding } from "../../api/buildings";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { PageLoader } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

function BuildingForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial || { name: "", address: "", meter_reading_day: 25, bill_generation_day: 1, payment_due_days: 15 }
  );

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div className="space-y-4">
      <Input label="Building name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Sunrise Apartments" />
      <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Plot 12, Sector 7, Nagpur" />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Reading day" type="number" min={1} max={28} value={form.meter_reading_day} onChange={(e) => set("meter_reading_day", parseInt(e.target.value))} />
        <Input label="Bill gen day" type="number" min={1} max={28} value={form.bill_generation_day} onChange={(e) => set("bill_generation_day", parseInt(e.target.value))} />
        <Input label="Payment days" type="number" min={1} max={60} value={form.payment_due_days} onChange={(e) => set("payment_due_days", parseInt(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={loading} onClick={() => onSave(form)}>
          {initial ? "Save changes" : "Create building"}
        </Button>
      </div>
    </div>
  );
}

export default function Buildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await getBuildings();
      setBuildings(res.data);
    } catch { toast.error("Failed to load buildings"); }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      if (modal.building) {
        await updateBuilding(modal.building.id, form);
        toast.success("Building updated");
      } else {
        await createBuilding(form);
        toast.success("Building created");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this building? All units will be removed.")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Buildings"
        subtitle={`${buildings.length} building${buildings.length !== 1 ? "s" : ""}`}
        actions={<Button variant="primary" icon={IconPlus} onClick={() => setModal({ building: null })} size="sm">Add building</Button>}
      />

      <div className="flex-1 overflow-auto p-6">
        {buildings.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <IconBuilding size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-900 mb-1">No buildings yet</p>
              <p className="text-sm text-gray-500 mb-4">Add your first building to get started</p>
              <Button variant="primary" icon={IconPlus} onClick={() => setModal({ building: null })}>Add building</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {buildings.map((b) => (
              <Card key={b.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center">
                        <IconBuilding size={20} className="text-navy-700" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{b.name}</h3>
                        <p className="text-sm text-gray-500">{b.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ building: b })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <IconPencil size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                        <IconTrash size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900">{b._count?.units || 0}</p>
                      <p className="text-2xs text-gray-500">Units</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900">{b.meter_reading_day}</p>
                      <p className="text-2xs text-gray-500">Reading day</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900">{b.payment_due_days}d</p>
                      <p className="text-2xs text-gray-500">Payment terms</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.building ? "Edit building" : "Add building"}
      >
        {modal && (
          <BuildingForm
            initial={modal.building}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  );
}