import { getStatusColor } from "../../utils/helpers";

export default function Badge({ status, label }) {
  const { bg, text } = getStatusColor(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label || status}
    </span>
  );
}