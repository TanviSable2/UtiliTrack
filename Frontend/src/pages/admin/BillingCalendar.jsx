import { useState, useEffect } from "react";
import { IconCalendarStats, IconGauge, IconFileInvoice, IconCreditCard, IconBell } from "@tabler/icons-react";
import { getBillingCalendar } from "../../api/buildings";
import Topbar from "../../components/layout/Topbar";
import { Card, CardHeader, CardTitle, CardBody } from "../../components/ui/Card";
import { PageLoader } from "../../components/ui/Spinner";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function BillingCalendar() {
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillingCalendar()
      .then((r) => setCalendar(r.data))
      .catch(() => toast.error("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Billing calendar" subtitle="Deadlines and cycle dates for each building" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {calendar.length === 0 && (
          <Card><div className="py-12 text-center text-sm text-gray-400">No buildings configured</div></Card>
        )}
        {calendar.map((b) => (
          <Card key={b.building_id}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <IconCalendarStats size={18} className="text-navy-700" />
                <CardTitle>{b.building_name}</CardTitle>
                {b.reading_deadline_approaching && (
                  <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                    Reading deadline in {b.days_until_reading_deadline} day{b.days_until_reading_deadline !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">{b.unit_count} units</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: IconGauge,       label: "Meter reading deadline", date: b.meter_reading_deadline, urgent: b.reading_deadline_approaching },
                  { icon: IconFileInvoice, label: "Bill generation date",    date: b.bill_generation_date,   urgent: false },
                  { icon: IconCreditCard,  label: "Payment due date",        date: b.payment_due_date,       urgent: false },
                  { icon: IconBell,        label: "Reminder fires",          date: null,                      urgent: false },
                ].map((item) => (
                  <div key={item.label} className={`rounded-lg p-4 border ${item.urgent ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                    <item.icon size={20} className={`mb-2 ${item.urgent ? "text-red-600" : "text-gray-400"}`} />
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${item.urgent ? "text-red-700" : "text-gray-500"}`}>
                      {item.label}
                    </p>
                    <p className={`text-base font-medium ${item.urgent ? "text-red-900" : "text-gray-900"}`}>
                      {item.date ? formatDate(item.date) : "7 days before due"}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}