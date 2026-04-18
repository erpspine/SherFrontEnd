import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Car,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  FileText,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react";
import { saveAuthSession } from "../utils/auth";
import { apiFetch } from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/login", {
        method: "POST",
        withAuth: false,
        body: { email, password },
      });

      const data = await response.json();

      if (!response.ok || !data?.token) {
        throw new Error(data?.message || "Login failed. Please try again.");
      }

      saveAuthSession({
        token: data.token,
        tokenType: data.token_type,
        user: data.user,
        rememberMe,
      });

      navigate("/");
    } catch (error) {
      setErrorMessage(error.message || "Unable to login at the moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Car,
      title: "Fleet Management",
      description: "Track and manage your entire vehicle fleet",
    },
    {
      icon: FileText,
      title: "Quotation & PI System",
      description: "Create quotations and proforma invoices instantly",
    },
    {
      icon: TrendingUp,
      title: "Lease Analytics",
      description: "Real-time insights into revenue and utilisation",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Enterprise-grade security for your data",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-cyan-50 flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="absolute top-10 left-10 w-40 h-40 bg-sher-gold/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-sher-teal/15 rounded-full blur-3xl" />

        <div className="w-full max-w-md rounded-3xl bg-white/90 border border-sher-gold/20 shadow-2xl shadow-sher-gold/10 p-8 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-sher-gold to-sher-gold-dark rounded-xl flex items-center justify-center shadow-lg shadow-sher-gold/25">
              <Car className="w-7 h-7 text-white" />
            </div>
            <div>
              <img
                src="/sher-logo.png"
                alt="Sher ERP"
                className="h-10 w-auto object-contain"
              />
              <p className="text-xs text-slate-500">Vehicle Leasing</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h2>
            <p className="text-slate-600">
              Enter your credentials to access your admin dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                {errorMessage}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sher-leasing.co.tz"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sher-gold focus:ring-1 focus:ring-sher-gold transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sher-gold focus:ring-1 focus:ring-sher-gold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-sher-gold focus:ring-sher-gold focus:ring-offset-0"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-sher-gold-dark hover:text-sher-gold transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #E31B24 0%, #C9A236 55%, #8B6914 100%)",
              }}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 text-white py-3.5 rounded-xl font-semibold hover:opacity-95 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-500">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-xl py-3 text-slate-700 hover:bg-amber-50 hover:border-sher-gold/50 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-xl py-3 text-slate-700 hover:bg-cyan-50 hover:border-sher-teal/40 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-sher-gold-dark hover:text-sher-gold font-medium transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-l border-slate-200/70">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-cyan-100" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-sher-gold/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-sher-teal/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-16">
          <h3 className="text-4xl font-bold text-slate-900 mb-4">
            Manage Your Fleet
            <br />
            <span
              style={{
                color: "#8B6914",
                backgroundImage:
                  "linear-gradient(90deg, #C9A236 0%, #1D4E5F 100%)",
                WebkitBackgroundClip: "text",
              }}
              className="font-extrabold"
            >
              Smarter & Faster
            </span>
          </h3>
          <p className="text-lg text-slate-600 mb-12 max-w-md">
            The most comprehensive vehicle leasing management system. Create
            quotations, issue proforma invoices, and track your entire fleet in
            one place.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-amber-50/40 backdrop-blur border border-sher-gold/20 rounded-2xl p-5 hover:border-sher-gold/35 transition-colors shadow-sm"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-sher-gold/20 to-sher-teal/20 rounded-xl flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-sher-gold-dark" />
                </div>
                <h4 className="text-slate-900 font-semibold mb-1">
                  {feature.title}
                </h4>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 flex gap-12">
            <div>
              <p className="text-3xl font-bold text-slate-900">100+</p>
              <p className="text-sm text-sher-teal">Fleet Vehicles</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">500+</p>
              <p className="text-sm text-sher-gold-dark">Leases Managed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">99.9%</p>
              <p className="text-sm text-sher-red">Uptime</p>
            </div>
          </div>
        </div>

        {/* Floating Cards Animation */}
        <div className="absolute -right-20 top-1/4 w-64 bg-gradient-to-br from-white to-amber-50/60 backdrop-blur border border-sher-gold/20 rounded-2xl p-4 transform rotate-12 animate-pulse shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sher-gold to-sher-gold-dark flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-900 font-medium text-sm">New Quote</p>
              <p className="text-xs text-slate-500">Just now</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            QT-2024-009 created for Gulf Oil Tanzania
          </p>
        </div>
      </div>
    </div>
  );
}
