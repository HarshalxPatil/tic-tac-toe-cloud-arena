
import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./Auth.css";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.trim() },
          },
        });

        if (error) throw error;

        if (data.session) {
          onLogin(data.session.user);
        } else {
          setMessageType("success");
          setMessage(
            "Account created! Check your email to confirm your account, then log in."
          );
          setMode("login");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        onLogin(data.user);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessageType("error");
      setMessage("Enter your email address first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: window.location.origin,
        }
      );

      if (error) throw error;

      setMessageType("success");
      setMessage("If the account exists, a password reset email will be sent.");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Unable to send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <section className="auth-shell">
        <aside className="auth-showcase">
          <div className="brand-mark">✦</div>

          <p className="auth-eyebrow">WELCOME TO THE ARENA</p>

          <h1 className="auth-brand-title">
            Tic-Tac-Toe
            <span>Cloud Arena</span>
          </h1>

          <p className="auth-tagline">
            Two players. One board.
            <br />
            Who rules the arena?
          </p>

          <div className="mini-board" aria-label="Tic-Tac-Toe illustration">
            {["X", "O", "X", "O", "X", "O", "X", "O", "X"].map(
              (symbol, index) => (
                <div
                  key={index}
                  className={`mini-cell ${
                    symbol === "X" ? "mini-x" : "mini-o"
                  }`}
                >
                  {symbol}
                </div>
              )
            )}
          </div>

          <div className="auth-benefits">
            <div>
              <span>☁</span>
              <p>Cloud-ready</p>
            </div>
            <div>
              <span>◷</span>
              <p>Game history</p>
            </div>
            <div>
              <span>♙</span>
              <p>Two-player fun</p>
            </div>
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => switchMode("login")}
            >
              Log In
            </button>

            <button
              type="button"
              className={mode === "signup" ? "auth-tab active" : "auth-tab"}
              onClick={() => switchMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-heading">
            <h2>
              {mode === "login" ? "Welcome back!" : "Join the arena"}
            </h2>
            <p>
              {mode === "login"
                ? "Log in to continue your game."
                : "Create your account and get started."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label className="auth-field">
                <span>Username</span>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={2}
                  maxLength={30}
                  autoComplete="username"
                />
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "signup"
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {mode === "login" && (
              <div className="auth-options">
                <span>Secure sign-in</span>
                <button
                  type="button"
                  className="text-action"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {message && (
              <div
                className={`auth-message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log In to Arena  →"
                  : "Create Account  →"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>YOUR NEXT MATCH AWAITS</p>
            <span />
          </div>

          <p className="auth-switch">
            {mode === "login"
              ? "New to Cloud Arena?"
              : "Already have an account?"}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "login" ? "signup" : "login")
              }
            >
              {mode === "login" ? " Create account" : " Log in"}
            </button>
          </p>

          <p className="auth-privacy">
            Powered by Supabase authentication
          </p>
        </div>
      </section>

      <p className="auth-footer">
        TIC-TAC-TOE CLOUD ARENA <span>·</span> LET THE BEST PLAYER WIN
      </p>
    </main>
  );
}
