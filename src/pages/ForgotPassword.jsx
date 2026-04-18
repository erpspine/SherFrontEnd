import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { apiFetch } from "../utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setResetToken("");

    try {
      const response = await apiFetch("/forgot-password", {
        method: "POST",
        withAuth: false,
        body: { email: email.trim() },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to request password reset right now.",
        );
      }

      setSuccessMessage(
        data?.message ||
          "If that email exists, a password reset token has been generated.",
      );
      setResetToken(data?.token || data?.reset_token || "");
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to request password reset right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div>
            <img
              src="/sher-logo.png"
              alt="Sher ERP"
              className="h-10 w-auto object-contain"
            />
            <p className="text-xs text-slate-500">Password reset</p>
          </div>
        </div>

        <div className="bg-white/90 border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-300/30">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Forgot password
          </h2>
          <p className="text-slate-600 mb-6">
            Enter your email to request a reset token.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm space-y-3">
                <p>{successMessage}</p>
                {resetToken && (
                  <div className="space-y-2">
                    <p className="text-emerald-200">Reset token</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs break-all text-slate-700">
                      {resetToken}
                    </div>
                    <Link
                      to={`/reset-password?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(resetToken)}`}
                      className="inline-flex items-center gap-2 text-sher-gold-dark hover:text-sher-gold"
                    >
                      Continue to reset password
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}

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
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sher-gold focus:ring-1 focus:ring-sher-gold transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sher-gold to-sher-gold-dark text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-sher-gold/25 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send Reset Token
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
