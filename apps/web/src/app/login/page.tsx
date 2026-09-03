"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível acessar sua conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark"><span className="brand-symbol">D</span><span>DocAnalyzer</span></div>
        <div className="auth-copy">
          <span className="eyebrow accent">ÁREA RESTRITA</span>
          <h1>Bem-vindo de volta.</h1>
          <p>Acesse seus processos e continue sua análise com segurança.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail<input id="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required type="email" value={email} /></label>
          <label htmlFor="password">Senha<input id="password" name="password" onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required type="password" value={password} /></label>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Aguarde..." : "Entrar"}</button>
        </form>
        <p className="auth-help">Ainda não possui uma conta? <a href="/register">Criar cadastro</a></p>
      </section>
      <aside className="auth-aside"><span className="eyebrow">DOCANALYZER</span><h2>Decisões melhores começam com contexto.</h2><p>Um espaço privado para organizar documentos e apoiar sua análise profissional.</p></aside>
    </main>
  );
}
