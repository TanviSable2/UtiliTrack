export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(monthStr) {
  if (!monthStr) return "—";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function getStatusColor(status) {
  const map = {
    PAID:         { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
    UNPAID:       { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
    OVERDUE:      { bg: "bg-red-100",   text: "text-red-800",    border: "border-red-300"   },
    PARTIAL:      { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
    OPEN:         { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   },
    UNDER_REVIEW: { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"  },
    RESOLVED:     { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
    REJECTED:     { bg: "bg-gray-100",  text: "text-gray-600",   border: "border-gray-200"  },
  };
  return map[status] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}