export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full h-9 border rounded-lg px-3 text-base text-gray-900 bg-white
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-700
          focus:border-transparent transition-colors
          ${error ? "border-red-400" : "border-gray-300"}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}