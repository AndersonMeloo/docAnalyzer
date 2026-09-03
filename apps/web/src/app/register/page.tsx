"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar sua conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark"><span className="brand-symbol">D</span><span>DocAnalyzer</span></div>
        <div className="auth-copy"><span className="eyebrow accent">NOVO ESPAÇO</span><h1>Crie seu espaço de análise.</h1><p>Configure sua conta para organizar processos e analisar documentos com segurança.</p></div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Nome<input id="name" name="name" onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required value={name} /></label>
          <label htmlFor="email">E-mail<input id="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required type="email" value={email} /></label>
          <label htmlFor="password">Senha<input id="password" name="password" onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required type="password" value={password} /></label>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Criando..." : "Criar conta"}</button>
        </form>
        <p className="auth-help">Já possui uma conta? <Link href="/login">Entrar</Link></p>
      </section>
      <aside className="auth-aside"><span className="eyebrow">DOCANALYZER</span><h2>Decisões melhores começam com contexto.</h2><p>Um espaço privado para organizar documentos e apoiar sua análise profissional.</p></aside>
    </main>
  );
}
