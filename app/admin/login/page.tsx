"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
        <h1 className="text-2xl font-sans font-semibold text-center text-berkeley">
          Autentificare Admin
        </h1>
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
        <div>
          <Label>Email sau username</Label>
          <Input
            type="text"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label>Parola</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Se încarcă..." : "Autentificare"}
        </Button>
      </form>
    </div>
  );
};

export default LoginPage;
