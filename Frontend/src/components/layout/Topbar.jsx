export default function Topbar({ title, subtitle, actions }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 h-13 flex items-center justify-between flex-shrink-0" style={{ minHeight: 52 }}>
      <div>
        <h1 className="text-xl font-medium text-gray-900 leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}