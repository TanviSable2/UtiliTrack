import { IconLoader2 } from "@tabler/icons-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  ...props
}) {
  const variants = {
    primary: "bg-navy-700 text-white border-navy-700 hover:bg-navy-800",
    outline: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
    danger:  "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost:   "bg-transparent text-gray-600 border-transparent hover:bg-gray-100",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-xs gap-1",
    md: "h-8 px-3 text-sm gap-1.5",
    lg: "h-9 px-4 text-base gap-2",
  };

  return (
    <button
      className={`inline-flex items-center font-medium rounded-lg border cursor-pointer
        transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <IconLoader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  );
}