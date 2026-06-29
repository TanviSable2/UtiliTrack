export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }) {
  return <h3 className="text-base font-medium text-gray-900">{children}</h3>;
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}