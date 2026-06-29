import { useState, useEffect } from "react";
import { IconAlertTriangle, IconCircleCheck, IconCamera, IconX } from "@tabler/icons-react";
import { getReadings, validateReading, createReading, getFlaggedReadings } from "../../api/meters";
import { getBuildings } from "../../api/buildings";
import { getUnits } from "../../api/units";
import Topbar from "../../components/layout/Topbar";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { Card, CardHeader, CardTitle, CardBody } from "../../components/ui/Card";
import { Table, Th, Td, Tr } from "../../components/ui/Table";
import { PageLoader } from "../../components/ui/Spinner";
import { getCurrentMonth, formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

const UTILITY_TYPES = ["ELECTRICITY", "WATER", "GAS"];

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:8080";

function resolvePhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
}

export default function MeterReadings() {
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [readings, setReadings] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    building_id: "",
    unit_id: "",
    utility_type: "ELECTRICITY",
    reading_value: "",
    billing_month: getCurrentMonth(),
  });

  useEffect(() => {
    getBuildings().then((r) => setBuildings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.building_id) {
      setUnits([]);
      return;
    }
    getUnits({ building_id: parseInt(form.building_id) })
      .then((r) => setUnits(r.data))
      .catch(() => toast.error("Failed to load units"));
  }, [form.building_id]);

  useEffect(() => {
    loadReadings();
    getFlaggedReadings({ billing_month: form.billing_month })
      .then((r) => setFlagged(r.data))
      .catch(() => {});
  }, [form.billing_month]);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (k === "reading_value") setValidation(null);
  }

  async function loadReadings() {
    setLoading(true);
    try {
      const res = await getReadings({ billing_month: form.billing_month });
      setReadings(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
  }

  async function handleValidate() {
    if (!form.unit_id || !form.reading_value) {
      return toast.error("Select unit and enter reading first");
    }
    setValidating(true);
    try {
      const res = await validateReading({
        unit_id: parseInt(form.unit_id),
        utility_type: form.utility_type,
        reading_value: parseFloat(form.reading_value),
        billing_month: form.billing_month,
      });
      setValidation(res.data);
    } catch {
      toast.error("Validation failed");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!form.unit_id || !form.reading_value) {
      return toast.error("Fill all required fields");
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("unit_id", form.unit_id);
      fd.append("utility_type", form.utility_type);
      fd.append("reading_value", form.reading_value);
      fd.append("billing_month", form.billing_month);
      if (photo) fd.append("photo", photo);

      await createReading(fd);
      toast.success("Reading saved");
      setValidation(null);
      setPhoto(null);
      setPhotoPreview(null);
      set("reading_value", "");
      loadReadings();
      getFlaggedReadings({ billing_month: form.billing_month })
        .then((r) => setFlagged(r.data))
        .catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save reading");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Meter readings"
        subtitle={`Enter and manage readings for ${form.billing_month}`}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">

          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enter reading</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Building"
                    value={form.building_id}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, building_id: e.target.value, unit_id: "" }));
                      setValidation(null);
                    }}
                  >
                    <option value="">Select building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </Select>

                  <Select
                    label="Unit"
                    value={form.unit_id}
                    onChange={(e) => set("unit_id", e.target.value)}
                  >
                    <option value="">Select unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_number} — {u.tenant?.name || "Vacant"}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Billing month"
                    type="month"
                    value={form.billing_month}
                    onChange={(e) => set("billing_month", e.target.value)}
                  />
                  <Select
                    label="Utility type"
                    value={form.utility_type}
                    onChange={(e) => set("utility_type", e.target.value)}
                  >
                    {UTILITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
                    Meter reading value
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      step="0.01"
                      value={form.reading_value}
                      onChange={(e) => set("reading_value", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                      }}
                      placeholder="Enter current reading"
                      className="form-input flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleValidate}
                      loading={validating}
                      size="md"
                    >
                      Validate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Press Enter to save directly, or click Validate first to check for anomalies
                  </p>
                </div>

                {validation && (
                  <div
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm
                      ${validation.valid && validation.warnings.length === 0
                        ? "bg-green-50 border-green-200 text-green-800"
                        : validation.warnings.some((w) => w.severity === "ERROR")
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                  >
                    {validation.valid && validation.warnings.length === 0 ? (
                      <IconCircleCheck size={16} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      {validation.warnings.length > 0 ? (
                        validation.warnings.map((w, i) => (
                          <p key={i} className="leading-relaxed">{w.message}</p>
                        ))
                      ) : (
                        <p>
                          Reading validated — consumption within normal range.
                          {validation.previous_reading !== null && (
                            <span className="ml-1 font-medium">
                              Previous reading: {validation.previous_reading}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
                    Meter photo (optional proof)
                  </label>

                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Meter reading proof"
                        className="w-full h-52 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          Photo ready
                        </span>
                        <button
                          onClick={removePhoto}
                          className="w-6 h-6 flex items-center justify-center bg-white rounded-full shadow border border-gray-200 hover:bg-red-50 transition-colors"
                        >
                          <IconX size={12} className="text-red-500" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 truncate">{photo?.name}</p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <IconCamera size={22} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload meter photo</span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        JPG or PNG · Stored permanently as proof of reading
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  className="w-full justify-center"
                >
                  Save reading
                </Button>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-4">
            {flagged.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Flagged readings</CardTitle>
                  <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                    {flagged.length}
                  </span>
                </CardHeader>
                <CardBody className="p-0">
                  {flagged.map((r) => (
                    <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <p className="text-sm font-medium text-gray-900">
                        Unit {r.unit?.unit_number}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          {r.utility_type}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {r.flag_reason}
                      </p>
                      {r.photo_url && (
                        <a
                          href={resolvePhotoUrl(r.photo_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-navy-700 hover:underline mt-1 inline-block"
                        >
                          View meter photo →
                        </a>
                      )}
                    </div>
                  ))}
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Validation rules</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {[
                  {
                    rule: "New reading must be higher than previous",
                    detail: "If reading is lower it means meter was reset or a typo was made",
                  },
                  {
                    rule: "Consumption flagged if 50%+ above last month",
                    detail: "Compared to previous month to catch typos before billing",
                  },
                  {
                    rule: "Water usage 2x average triggers leak alert",
                    detail: "Compared to 3-month average — admin sees alert on dashboard",
                  },
                ].map((item) => (
                  <div key={item.rule} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy-400 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{item.rule}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to enter readings</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {[
                  "Select building and unit first",
                  "Set the correct billing month",
                  "Enter the number shown on the physical meter",
                  "Optionally upload a photo as proof",
                  "Click Validate to check for issues",
                  "Press Enter or click Save reading",
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <span className="text-xs font-medium text-navy-700 bg-navy-50 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-gray-600">{step}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>

        <div>
          <p className="section-label">Readings for {form.billing_month}</p>
          {loading ? (
            <PageLoader />
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <Th>Unit</Th>
                    <Th>Building</Th>
                    <Th>Utility</Th>
                    <Th>Reading</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th>Photo</Th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <Tr key={r.id}>
                      <Td>
                        <span className="font-medium">{r.unit?.unit_number}</span>
                      </Td>
                      <Td>{r.unit?.building?.name}</Td>
                      <Td>{r.utility_type}</Td>
                      <Td className="font-medium">{r.reading_value}</Td>
                      <Td>{formatDate(r.reading_date)}</Td>
                      <Td>
                        {r.is_flagged ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            <IconAlertTriangle size={11} />
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            <IconCircleCheck size={11} />
                            OK
                          </span>
                        )}
                      </Td>
                      <Td>
                        {r.photo_url ? (
                          <a
                            href={resolvePhotoUrl(r.photo_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-navy-700 hover:underline font-medium"
                          >
                            View photo
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {readings.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-sm text-gray-400"
                      >
                        No readings for {form.billing_month}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}