export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }) {
  return (
    <th className={`text-xs font-medium text-gray-500 uppercase tracking-wider px-3.5 py-2.5 bg-gray-50 text-left border-b border-gray-200 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={`px-3.5 py-2.5 text-base text-gray-700 border-b border-gray-100 ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, onClick, className = "" }) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? "cursor-pointer" : ""} hover:bg-gray-50 transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}