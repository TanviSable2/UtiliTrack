import { useState, useEffect } from "react";
import { IconPlus, IconKey } from "@tabler/icons-react";
import { getTenants } from "../../api/auth";
import { registerTenant } from "../../api/auth";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLoader } from "../../components/ui/Spinner";
import { initials } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [created, setCreated] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getTenants();
      setTenants(res.data);
    } catch {
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      return toast.error("All fields are required");
    }
    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setSaving(true);
    try {
      const res = await registerTenant(form);
      setCreated({ ...res.data, password: form.password });
      setForm({ name: "", email: "", password: "" });
      load();
      toast.success("Tenant account created");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModal(false);
    setCreated(null);
    setForm({ name: "", email: "", password: "" });
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Tenants"
        subtitle={`${tenants.length} registered tenant${tenants.length !== 1 ? "s" : ""}`}
        actions={
          <Button variant="primary" icon={IconPlus} onClick={() => setModal(true)} size="sm">
            Add tenant
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? <PageLoader /> : (
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Tenant</Th>
                  <Th>Email</Th>
                  <Th>Assigned unit</Th>
                  <Th>Building</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-2xs font-medium text-navy-700 flex-shrink-0">
                          {initials(t.name)}
                        </div>
                        <span className="font-medium text-gray-900">{t.name}</span>
                      </div>
                    </Td>
                    <Td>{t.email}</Td>
                    <Td>
                      {t.unit
                        ? <span className="font-medium text-gray-900">Unit {t.unit.unit_number}</span>
                        : <span className="text-amber-600 text-sm font-medium">Not assigned — go to Units to assign</span>}
                    </Td>
                    <Td>{t.unit?.building?.name || <span className="text-gray-400">—</span>}</Td>
                    <Td>
                      {t.unit ? (
                        <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Pending assignment</span>
                      )}
                    </Td>
                  </Tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <p className="text-sm text-gray-400 mb-2">No tenants yet</p>
                      <p className="text-xs text-gray-400">Click "Add tenant" to create a tenant account and give them their login credentials</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}
      </div>

      <Modal open={modal} onClose={closeModal} title={created ? "Tenant created" : "Add tenant"}>
        {created ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <IconKey size={16} className="text-green-600" />
                <p className="text-sm font-medium text-green-800">Account created — save these credentials</p>
              </div>
              <div className="space-y-2 bg-white rounded-lg p-3 border border-green-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{created.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-mono text-gray-900">{created.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Password</span>
                  <span className="font-mono text-gray-900">{created.password}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Login URL</span>
                  <span className="font-mono text-gray-900">{window.location.origin}/login</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Share these credentials with the tenant. They will log in and see only their own bills. Next step — go to <strong>Units</strong> page and assign this tenant to a unit.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Close</Button>
              <Button variant="primary" onClick={() => { closeModal(); }}>Go to Units</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Create a login account for your tenant. They will use these credentials to view their bills.</p>
            <Input
              label="Tenant full name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Amit Kumar"
            />
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="amit@example.com"
            />
            <Input
              label="Password (share with tenant)"
              type="text"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 6 characters"
            />
            <p className="text-xs text-gray-400">Password is shown in plain text so you can share it with the tenant. They can change it later.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleCreate}>Create tenant account</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}