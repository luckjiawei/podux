import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import pb from "../../lib/pocketbase";

export function useLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page to visit before login, default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await pb.collection("fh_users").authWithPassword(email, password);
      // Redirect back to previous page after successful login
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleSubmit,
  };
}
