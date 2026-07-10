"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Invalid password");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Decorative background */}
      <div className="login-bg-pattern" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle--1" />
        <div className="login-bg-circle login-bg-circle--2" />
        <div className="login-bg-circle login-bg-circle--3" />
      </div>

      <div className="login-card">
        {/* Logo & Brand */}
        <div className="login-header">
          <div className="login-logo-ring">
            <Image
              src="/logo.svg"
              alt="OMM ECO BUILDTECH logo"
              width={56}
              height={56}
              className="login-logo"
              priority
            />
          </div>
          <h1 className="login-title">OMM ECO BUILDTECH</h1>
          <p className="login-subtitle">Invoice System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="password" className="login-label">
              <Lock className="login-label-icon" aria-hidden="true" />
              Password
            </label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                className={`login-input ${error ? "login-input--error" : ""}`}
                autoFocus
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error" role="alert">
              <AlertCircle className="login-error-icon" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="login-submit"
          >
            {loading ? (
              <span className="login-spinner" aria-hidden="true" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          Protected access · Internal use only
        </p>
      </div>
    </div>
  );
}
