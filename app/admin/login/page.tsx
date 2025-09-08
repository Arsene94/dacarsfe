"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.login, form.password);
      router.replace("/admin");
    } catch (err: any) {
      setError(err.message || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 shadow-md rounded w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-poppins font-semibold text-center text-berkeley">
          Autentificare Admin
        </h1>
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email sau username
          </label>
          <input
            type="text"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            className="mt-1 block w-full rounded border-gray-300 focus:border-jade focus:ring-jade"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Parola
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 block w-full rounded border-gray-300 focus:border-jade focus:ring-jade"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-jade text-white py-2 px-4 rounded hover:bg-jade/90"
        >
          {loading ? "Se încarcă..." : "Autentificare"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
