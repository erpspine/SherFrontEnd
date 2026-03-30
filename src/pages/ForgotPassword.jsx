import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Car, Mail } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Car className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sher ERP</h1>
            <p className="text-xs text-slate-500">Password reset</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/30">
          <h2 className="text-3xl font-bold text-white mb-2">
            Forgot password
          </h2>
          <p className="text-slate-400 mb-6">
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
                    <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs break-all text-slate-200">
                      {resetToken}
                    </div>
                    <Link
                      to={`/reset-password?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(resetToken)}`}
                      className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200"
                    >
                      Continue to reset password
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div className="mt-6 pt-6 border-t border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
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
