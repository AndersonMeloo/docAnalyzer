"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearConversation, completeProcess, ConversationMessage, deleteDocument, DocumentSummary, fetchDocumentBlob, getConversation, getProcess, listDocuments, logout, ProcessSummary, reopenProcess, sendMessage, uploadDocuments } from "@/lib/api";

const processingLabels = { PENDING: "Aguardando processamento", PROCESSING: "Processando", COMPLETED: "Processado", FAILED: "Falhou" } as const;
const statusLabels: Record<ProcessSummary["status"], string> = { PROCESSANDO: "Processando", EM_ANALISE: "Em análise", AGUARDANDO_REVISAO: "Aguardando revisão", CONCLUIDO: "Concluído", ARQUIVADO: "Arquivado" };

function formatFileSize(sizeBytes: number): string { return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`; }

export default function ProcessDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const processId = params.id;
  const [process, setProcess] = useState<ProcessSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<{ document: DocumentSummary; url: string } | null>(null);

  useEffect(() => {
    Promise.all([getProcess(processId), listDocuments(processId), getConversation(processId)])
      .then(([loadedProcess, loadedDocuments, conversation]) => { setProcess(loadedProcess); setDocuments(loadedDocuments); setMessages(conversation.messages); })
      .catch((reason: Error) => { setError(reason.message); if (/401|403|Sessão/i.test(reason.message)) router.replace("/login"); })
      .finally(() => setIsLoading(false));
  }, [processId, router]);

  useEffect(() => {
    if (!process || !documents.some((document) => document.processingStatus === "PENDING" || document.processingStatus === "PROCESSING")) return;
    const refresh = window.setInterval(() => { listDocuments(process.id).then(setDocuments).catch(() => undefined); }, 1500);
    return () => window.clearInterval(refresh);
  }, [documents, process]);

  async function openDocument(document: DocumentSummary) {
    try { setViewer({ document, url: URL.createObjectURL(await fetchDocumentBlob(processId, document.id)) }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir o documento."); }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("documents") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length || !process || process.status === "CONCLUIDO") return;
    setIsUploading(true);
    setError("");
    try { const uploaded = await uploadDocuments(process.id, files); setDocuments((current) => [...uploaded, ...current]); input.value = ""; } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar os documentos."); } finally { setIsUploading(false); }
  }

  async function handleDelete(document: DocumentSummary) {
    if (!process || !window.confirm(`Remover o documento "${document.originalName}"?`)) return;
    setDeletingDocumentId(document.id);
    try { await deleteDocument(process.id, document.id); setDocuments((current) => current.filter((item) => item.id !== document.id)); setViewer((current) => current?.document.id === document.id ? null : current); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível remover o documento."); } finally { setDeletingDocumentId(""); }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!process || !message.trim()) return;
    const content = message.trim();
    setMessage("");
    setIsSending(true);
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "USER", content, createdAt: new Date().toISOString() }]);
    try { const response = await sendMessage(process.id, content); setMessages((current) => [...current, response]); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem."); } finally { setIsSending(false); }
  }

  async function handleClear() {
    if (!process || !messages.length || !window.confirm("Limpar toda a conversa deste processo?")) return;
    try { await clearConversation(process.id); setMessages([]); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível limpar a conversa."); }
  }

  async function handleStatus() {
    if (!process) return;
    try { setProcess(process.status === "CONCLUIDO" ? await reopenProcess(process.id) : await completeProcess(process.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o status do processo."); }
  }

  if (isLoading) return <main className="app-shell"><section className="content-area"><section className="empty-state"><div className="loading-indicator" aria-label="Carregando processo" /></section></section></main>;
  if (!process) return <main className="app-shell"><section className="content-area"><p className="feedback-error">{error || "Processo não encontrado."}</p><Link className="text-button" href="/">Voltar para processos</Link></section></main>;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal"><div className="brand-mark"><span className="brand-symbol">D</span><span>DocAnalyzer</span></div><nav className="navigation-list"><Link className="navigation-item" href="/"><span aria-hidden="true">⌂</span>Visão geral</Link><Link className="navigation-item" href="/documents"><span aria-hidden="true">□</span>Documentos</Link></nav><div className="sidebar-footer"><div className="security-note"><span className="status-dot" aria-hidden="true" /><div><strong>Ambiente protegido</strong><span>Seus documentos são privados</span></div></div><button className="user-menu" onClick={() => { void logout().finally(() => router.replace("/login")); }} type="button"><span className="avatar">AS</span><span className="user-details"><strong>Analista</strong><small>Sair da conta</small></span><span aria-hidden="true">↗</span></button></div></aside>
      <section className="content-area"><header className="topbar"><div><Link className="text-button" href="/">← Processos</Link><span className="eyebrow accent">PROCESSO</span><h1>{process.name}</h1><span className={`status-badge status-${process.status.toLowerCase()}`}>{statusLabels[process.status]}</span></div></header>
        {error && <p className="feedback-error" role="alert">{error}</p>}
        <section className="documents-panel process-detail-section"><div className="documents-heading"><div><span className="eyebrow accent">DOCUMENTOS</span><h2>Arquivos deste processo</h2></div><span>{documents.length} documento(s)</span></div><form className="upload-box" onSubmit={handleUpload}><div className="upload-symbol" aria-hidden="true">↑</div><h3>Adicione documentos ao processo</h3><p>Somente PDF, até 20 MB por arquivo.</p><label className="upload-button">{isUploading ? "Enviando..." : "Selecionar PDFs"}<input accept="application/pdf,.pdf" disabled={isUploading || process.status === "CONCLUIDO"} multiple name="documents" onChange={(event) => { if (event.target.files?.length) event.currentTarget.form?.requestSubmit(); }} type="file" /></label></form>{documents.length === 0 ? <p className="documents-empty">Este processo ainda não possui documentos.</p> : <div className="document-list">{documents.map((document) => <div className="document-item" key={document.id}><span className="pdf-icon">PDF</span><div><strong>{document.originalName}</strong><small>{formatFileSize(document.sizeBytes)} · {document.pageCount ? `${document.pageCount} página(s)` : "Páginas pendentes"} · {processingLabels[document.processingStatus]}</small></div><span className={`document-status document-status-${document.processingStatus.toLowerCase()}`}>{document.isAiProtected ? "Protegido" : processingLabels[document.processingStatus]}</span><button className="text-button" onClick={() => void openDocument(document)} type="button">Abrir ↗</button><button className="text-button danger-button" disabled={deletingDocumentId === document.id} onClick={() => void handleDelete(document)} type="button">{deletingDocumentId === document.id ? "Removendo..." : "Remover"}</button></div>)}</div>}</section>
        <section className="chat-panel process-detail-section"><div className="documents-heading"><div><span className="eyebrow accent">ASSISTENTE DO PROCESSO</span><h2>Conversa com a IA</h2></div><button className="text-button" disabled={!messages.length} onClick={() => void handleClear()} type="button">Limpar conversa</button></div><div className="chat-messages">{messages.length ? messages.map((item) => <div className={`chat-message chat-${item.role.toLowerCase()}`} key={item.id}><span>{item.role === "USER" ? "Você" : "IA"}</span><p>{item.content}</p></div>) : <p className="chat-empty">Faça uma pergunta sobre os documentos deste processo.</p>}</div><form className="chat-form" onSubmit={handleSend}><input aria-label="Mensagem para a IA" disabled={isSending} onChange={(event) => setMessage(event.target.value)} placeholder="Pergunte sobre este processo..." value={message} /><button className="primary-button" disabled={isSending || !message.trim()} type="submit">{isSending ? "Enviando..." : "Enviar"}</button></form></section>
        <section className="process-completion-panel"><div><span className="eyebrow accent">STATUS DO PROCESSO</span><h3>{process.status === "CONCLUIDO" ? "Processo finalizado" : "Processo em andamento"}</h3><p>{process.status === "CONCLUIDO" ? "Os documentos continuam disponíveis para consulta." : "Finalize quando terminar a revisão. Você poderá reabrir depois."}</p></div><button className={process.status === "CONCLUIDO" ? "outline-button" : "primary-button"} onClick={() => void handleStatus()} type="button">{process.status === "CONCLUIDO" ? "Reabrir processo" : "Finalizar processo"}</button></section>
      </section>
      {viewer && <div className="modal-backdrop" onClick={() => { URL.revokeObjectURL(viewer.url); setViewer(null); }} role="presentation"><section aria-labelledby="process-viewer-title" aria-modal="true" className="pdf-viewer-modal" onClick={(event) => event.stopPropagation()} role="dialog"><div className="pdf-viewer-heading"><h2 id="process-viewer-title">{viewer.document.originalName}</h2><button aria-label="Fechar visualizador" className="modal-close" onClick={() => { URL.revokeObjectURL(viewer.url); setViewer(null); }} type="button">×</button></div><iframe className="pdf-frame" src={viewer.url} title={`Visualização de ${viewer.document.originalName}`} /></section></div>}
    </main>
  );
}
