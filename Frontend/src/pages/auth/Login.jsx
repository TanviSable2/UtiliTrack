import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconBuilding, IconEye, IconEyeOff } from "@tabler/icons-react";
import { login, register } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

function UtiliLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="white" />
      <path d="M16 4 L6 11 L6 28 L12 28 L12 21 L20 21 L20 28 L26 28 L26 11 Z" fill="#1e3a5f" />
      <rect x="12" y="21" width="8" height="7" rx="1" fill="#1e3a5f" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function switchMode(m) {
    setMode(m);
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === "register") {
      if (!form.name.trim()) return toast.error("Name is required");
      if (form.password !== form.confirmPassword) return toast.error("Passwords do not match");
      if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await login({ email: form.email, password: form.password });
      } else {
        res = await register({ name: form.name, email: form.email, password: form.password, role: "ADMIN" });
      }
      loginUser(res.data.token, res.data.user);
      toast.success(mode === "login" ? `Welcome back, ${res.data.user.name}` : `Account created! Welcome, ${res.data.user.name}`);
      if (res.data.user.role === "ADMIN") navigate("/admin/dashboard");
      else navigate("/tenant");
    } catch (err) {
      toast.error(err.response?.data?.error || (mode === "login" ? "Login failed" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">

        {/* Left panel */}
        <div className="w-full md:w-96 bg-navy-700 p-8 md:p-10 flex flex-col justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <UtiliLogo size={36} />
              <div>
                <span className="text-lg font-medium text-white block leading-none">UtiliTrack</span>
                <span className="text-xs text-navy-300">Billing management</span>
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-white leading-snug mb-3">
              Smart utility billing for modern properties
            </h2>
            <p className="text-sm text-navy-300 leading-relaxed hidden md:block">
              Automate meter readings, generate invoices, track payments and resolve disputes — all in one place.
            </p>
          </div>
          <div className="space-y-3 hidden md:block mt-8">
            {[
              "Auto-generate itemised PDF invoices",
              "Leak detection and anomaly alerts",
              "Automated payment reminders",
              "Full billing dispute resolution",
              "Convergent rent and utility statements",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-sm text-navy-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">

          {/* Mode tabs — only ADMIN can register */}
          <div className="flex gap-0 mb-6 border border-gray-200 rounded-lg overflow-hidden">
            {[
              { key: "login",    label: "Sign in"        },
              { key: "register", label: "Create account" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors
                  ${mode === m.key ? "bg-navy-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div className="mb-5 flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <IconBuilding size={16} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <span className="font-medium">Admin account only.</span> Tenants are added by admin from the Tenants page after you set up your buildings.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="form-label">Your full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="form-input"
                  placeholder="Rajesh Sharma"
                  required
                />
              </div>
            )}

            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="form-input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="form-label">Confirm password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-navy-700 text-white rounded-lg text-base font-medium
                hover:bg-navy-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 mt-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {mode === "login" ? "Sign in" : "Create admin account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-5 bg-gray-50 rounded-lg p-3.5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Demo credentials</p>
                <button
                  onClick={() => setForm((p) => ({ ...p, email: "admin@utilitrack.com", password: "admin123" }))}
                  className="text-xs text-navy-700 hover:underline font-medium"
                >
                  Fill admin
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Admin</span>
                  <span className="font-mono">admin@utilitrack.com / admin123</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tenant</span>
                  <span className="font-mono">amit@tenant.com / tenant123</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Tenants log in using credentials provided by their admin. They cannot self-register.
                </p>
              </div>
            </div>
          )}

          {mode === "register" && (
            <p className="mt-4 text-xs text-center text-gray-500">
              Already have an account?{" "}
              <button onClick={() => switchMode("login")} className="text-navy-700 hover:underline font-medium">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}