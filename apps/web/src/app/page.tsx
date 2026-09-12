"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearConversation,
  completeProcess,
  ConversationMessage,
  createProcess,
  deleteDocument,
  deleteProcess,
  DocumentSummary,
  fetchDocumentBlob,
  FindingSummary,
  getProcessSummary,
  listDocuments,
  listProcesses,
  logout,
  ProcessSummary,
  ProcessSummaryResult,
  refreshProcessSummary,
  reopenProcess,
  sendMessage,
  updateFinding,
  uploadDocuments,
} from "@/lib/api";

const navigationItems = [
  { label: "Visão geral", icon: "⌂", href: "/", active: true },
  { label: "Processos", icon: "▤", href: "/", active: false },
  { label: "Documentos", icon: "□", href: "/documents", active: false },
];

const statusLabels: Record<ProcessSummary["status"], string> = {
  PROCESSANDO: "Processando",
  EM_ANALISE: "Em análise",
  AGUARDANDO_REVISAO: "Aguardando revisão",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado",
};

const processingLabels = {
  PENDING: "Aguardando processamento",
  PROCESSING: "Processando",
  COMPLETED: "Processado",
  FAILED: "Falhou",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number): string {
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
  const router = useRouter();
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProcessId, setDeletingProcessId] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<ProcessSummary | null>(
    null,
  );
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [processSummary, setProcessSummary] =
    useState<ProcessSummaryResult | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [findings, setFindings] = useState<FindingSummary[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<DocumentSummary | null>(
    null,
  );
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerUrl, setViewerUrl] = useState("");

  useEffect(() => {
    listProcesses()
      .then(setProcesses)
      .catch((reason: Error) => {
        setError(reason.message || "Sessão expirada. Faça login novamente.");
        router.replace("/login");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (
      !selectedProcess ||
      !documents.some(
        (document) =>
          document.processingStatus === "PENDING" ||
          document.processingStatus === "PROCESSING",
      )
    )
      return;
    const refresh = window.setInterval(() => {
      listDocuments(selectedProcess.id)
        .then(setDocuments)
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(refresh);
  }, [documents, selectedProcess]);

  useEffect(() => {
    if (!error) return;
    if (/Autenticação|Sessão inválida|E-mail ou senha|401|403/i.test(error)) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    let active = true;
    if (!viewerDocument || !selectedProcess) {
      return () => {
        active = false;
      };
    }
    fetchDocumentBlob(selectedProcess.id, viewerDocument.id)
      .then((blob) => {
        if (active) setViewerUrl(URL.createObjectURL(blob));
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [selectedProcess, viewerDocument]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const process = await createProcess(name, identifier);
      setProcesses((current) => [process, ...current]);
      setName("");
      setIdentifier("");
      setIsModalOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar o processo.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProcess(process: ProcessSummary) {
    if (
      !window.confirm(
        `Remover o processo "${process.name}" e todos os documentos associados?`,
      )
    )
      return;
    setDeletingProcessId(process.id);
    setError("");
    try {
      await deleteProcess(process.id);
      setProcesses((current) =>
        current.filter((item) => item.id !== process.id),
      );
      if (selectedProcess?.id === process.id) setSelectedProcess(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível remover o processo.",
      );
    } finally {
      setDeletingProcessId("");
    }
  }

  async function handleProcessCompletion() {
    if (
      !selectedProcess ||
      !window.confirm(
        `Finalizar o processo "${selectedProcess.name}"? Você poderá reabri-lo depois.`,
      )
    )
      return;
    setError("");
    try {
      const updated = await completeProcess(selectedProcess.id);
      setSelectedProcess(updated);
      setProcesses((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível finalizar o processo.",
      );
    }
  }

  async function handleProcessReopen() {
    if (!selectedProcess) return;
    setError("");
    try {
      const updated = await reopenProcess(selectedProcess.id);
      setSelectedProcess(updated);
      setProcesses((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível reabrir o processo.",
      );
    }
  }

  async function handleLogout() {
    setError("");
    setSelectedProcess(null);
    setProcesses([]);
    router.replace("/login");
    void logout().catch(() => undefined);
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProcess || !chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput("");
    setIsSendingMessage(true);
    setError("");
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const response = await sendMessage(selectedProcess.id, content);
      setMessages((current) => [...current, response]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar a mensagem.",
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleClearConversation() {
    if (
      !selectedProcess ||
      !messages.length ||
      !window.confirm("Limpar toda a conversa deste processo?")
    )
      return;
    setError("");
    try {
      await clearConversation(selectedProcess.id);
      setMessages([]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível limpar a conversa.",
      );
    }
  }

  function openViewer(document: DocumentSummary, page = 1) {
    setViewerDocument(document);
    setViewerPage(Math.max(1, page));
    setViewerUrl("");
  }

  async function handleDeleteDocument(document: DocumentSummary) {
    if (
      !selectedProcess ||
      !window.confirm(`Remover o documento "${document.originalName}"?`)
    )
      return;
    setDeletingDocumentId(document.id);
    setError("");
    try {
      await deleteDocument(selectedProcess.id, document.id);
      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      setProcesses((current) =>
        current.map((item) =>
          item.id === selectedProcess.id
            ? {
                ...item,
                _count: {
                  documents: Math.max(0, (item._count?.documents ?? 1) - 1),
                },
              }
            : item,
        ),
      );
      setProcessSummary(await getProcessSummary(selectedProcess.id));
      if (viewerDocument?.id === document.id) {
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        setViewerDocument(null);
        setViewerUrl("");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível remover o documento.",
      );
    } finally {
      setDeletingDocumentId("");
    }
  }

  async function handleFindingStatus(
    finding: FindingSummary,
    status: FindingSummary["status"],
  ) {
    if (!selectedProcess) return;
    try {
      const updated = await updateFinding(
        selectedProcess.id,
        finding.id,
        status,
      );
      setFindings((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o ponto de atenção.",
      );
    }
  }

  async function handleRefreshSummary() {
    if (!selectedProcess) return;
    setIsSummaryLoading(true);
    try {
      setProcessSummary(await refreshProcessSummary(selectedProcess.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar o resumo.",
      );
    } finally {
      setIsSummaryLoading(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProcess || selectedProcess.status === "CONCLUIDO") return;
    const input = event.currentTarget.elements.namedItem(
      "documents",
    ) as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    setError("");
    try {
      const uploaded = await uploadDocuments(selectedProcess.id, files);
      setDocuments((current) => [...uploaded, ...current]);
      setProcessSummary(await getProcessSummary(selectedProcess.id));
      setProcesses((current) =>
        current.map((item) =>
          item.id === selectedProcess.id
            ? {
                ...item,
                _count: {
                  documents: (item._count?.documents ?? 0) + uploaded.length,
                },
              }
            : item,
        ),
      );
      input.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível enviar os documentos.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-mark">
          <span className="brand-symbol">D</span>
          <span>DocAnalyzer</span>
        </div>
        <nav className="navigation-list">
          {navigationItems.map((item) => (
            <a
              className={`navigation-item${item.active ? " active" : ""}`}
              href={item.href}
              key={item.label}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="security-note">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>Ambiente protegido</strong>
              <span>Seus documentos são privados</span>
            </div>
          </div>
          <button className="user-menu" onClick={handleLogout} type="button">
            <span className="avatar">AS</span>
            <span className="user-details">
              <strong>Analista</strong>
              <small>Sair da conta</small>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>
      <section className="content-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">QUINTA-FEIRA, 20 DE AGOSTO</span>
            <h1>Visão geral</h1>
          </div>
          <button
            className="primary-button"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <span aria-hidden="true">+</span> Novo processo
          </button>
        </header>
        <div className="content-grid">
          <section className="welcome-panel">
            <div>
              <span className="eyebrow accent">ESPAÇO DE ANÁLISE</span>
              <h2>Clareza para cada documento.</h2>
              <p>
                Organize seus processos, acompanhe as análises e mantenha cada
                decisão baseada em evidências.
              </p>
              <button
                className="outline-button"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                Criar um processo <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="panel-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACOMPANHAMENTO</span>
              <h2>Processos em andamento</h2>
            </div>
            <Link className="text-button" href="/">
              Ver todos <span aria-hidden="true">→</span>
            </Link>
          </div>
          {error && (
            <p className="feedback-error" role="alert">
              {error}
            </p>
          )}
          {isLoading ? (
            <section className="empty-state">
              <div
                className="loading-indicator"
                aria-label="Carregando processos"
              />
              <h3>Carregando seus processos</h3>
              <p>Aguarde enquanto buscamos seus dados.</p>
            </section>
          ) : processes.length === 0 ? (
            <section className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                ◫
              </div>
              <h3>Nenhum processo em andamento</h3>
              <p>
                Comece criando um processo para reunir documentos e iniciar sua
                análise.
              </p>
              <button
                className="secondary-button"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                + Novo processo
              </button>
            </section>
          ) : (
            <section className="process-list">
              {processes.map((process) => (
                <article
                  className={`process-row${selectedProcess?.id === process.id ? " selected" : ""}`}
                  key={process.id}
                >
                  <div className="process-title">
                    <span className="process-icon" aria-hidden="true">
                      ▤
                    </span>
                    <div>
                      <h3>{process.name}</h3>
                      <small>{process.identifier || "Sem identificação"}</small>
                    </div>
                  </div>
                  <span className="document-count">
                    {process._count?.documents ?? 0} documento(s)
                  </span>
                  <span
                    className={`status-badge status-${process.status.toLowerCase()}`}
                  >
                    {statusLabels[process.status]}
                  </span>
                  <span className="process-date">
                    Atualizado em {formatDate(process.updatedAt)}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => router.push(`/processes/${process.id}`)}
                    type="button"
                  >
                    Continuar <span aria-hidden="true">→</span>
                  </button>
                  <button
                    className="text-button danger-button"
                    disabled={deletingProcessId === process.id}
                    onClick={() => void handleDeleteProcess(process)}
                    type="button"
                  >
                    {deletingProcessId === process.id
                      ? "Removendo..."
                      : "Remover"}
                  </button>
                </article>
              ))}
            </section>
          )}
          {selectedProcess && (
            <section className="documents-panel">
              <div className="documents-heading">
                <div>
                  <span className="eyebrow accent">PROCESSO SELECIONADO</span>
                  <h2>Documentos de {selectedProcess.name}</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setSelectedProcess(null)}
                  type="button"
                >
                  Fechar <span aria-hidden="true">×</span>
                </button>
              </div>
              <form className="upload-box" onSubmit={handleUpload}>
                <div className="upload-symbol" aria-hidden="true">
                  ↑
                </div>
                <h3>Adicione os documentos do processo</h3>
                <p>
                  Somente PDF, até 20 MB por arquivo. Você pode selecionar
                  vários de uma vez.
                </p>
                <label className="upload-button">
                  {isUploading ? "Enviando..." : "Selecionar PDFs"}
                  <input
                    accept="application/pdf,.pdf"
                    disabled={isUploading}
                    multiple
                    name="documents"
                    onChange={(event) => {
                      if (event.target.files?.length)
                        event.currentTarget.form?.requestSubmit();
                    }}
                    type="file"
                  />
                </label>
              </form>
              {documents.length === 0 ? (
                <p className="documents-empty">
                  Este processo ainda não possui documentos.
                </p>
              ) : (
                <div className="document-list">
                  {documents.map((document) => (
                    <div className="document-item" key={document.id}>
                      <span className="pdf-icon">PDF</span>
                      <div>
                        <strong>{document.originalName}</strong>
                        <small>
                          {formatFileSize(document.sizeBytes)} ·{" "}
                          {document.pageCount
                            ? `${document.pageCount} página(s)`
                            : "Páginas pendentes"}{" "}
                          · {processingLabels[document.processingStatus]}
                        </small>
                        {document.analysis?.summary && (
                          <p className="analysis-summary">
                            {document.analysis.summary}
                          </p>
                        )}
                      </div>
                      <span
                        className={`document-status document-status-${document.processingStatus.toLowerCase()}`}
                      >
                        {document.isAiProtected
                          ? "🔒 Documento protegido — não enviado para análise da IA"
                          : document.processingStatus === "FAILED"
                            ? "Erro no processamento"
                            : document.analysis?.status === "COMPLETED"
                              ? "Análise concluída"
                              : document.analysis?.status === "PENDING"
                                ? "Aguardando IA"
                                : document.processingStatus === "COMPLETED"
                                  ? "Processado"
                                  : "Em andamento"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        {selectedProcess && processSummary && (
          <section className="summary-panel summary-panel-bottom">
            <div className="summary-heading">
              <div>
                <span className="eyebrow accent">RESUMO DO PROCESSO</span>
                <h3>Visão consolidada</h3>
              </div>
              <button
                className="text-button"
                disabled={isSummaryLoading}
                onClick={() => void handleRefreshSummary()}
                type="button"
              >
                {isSummaryLoading ? "Atualizando..." : "Atualizar resumo"} ↻
              </button>
            </div>
            <div className="summary-metrics">
              <div>
                <strong>{processSummary.documentCount}</strong>
                <span>Documentos</span>
              </div>
              <div>
                <strong>{processSummary.pageCount}</strong>
                <span>Páginas</span>
              </div>
              <div>
                <strong>{processSummary.analyzedDocumentCount}</strong>
                <span>Analisados</span>
              </div>
              <div>
                <strong>{processSummary.pendingDocumentCount}</strong>
                <span>Pendentes</span>
              </div>
            </div>
            {processSummary.summary ? (
              <p className="summary-text">{processSummary.summary}</p>
            ) : (
              <p className="summary-pending">
                O resumo da IA ficará disponível quando houver análises
                concluídas e um provedor configurado.
              </p>
            )}
          </section>
        )}
        {isModalOpen && (
          <div className="modal-backdrop" role="presentation">
            <section
              aria-labelledby="new-process-title"
              aria-modal="true"
              className="process-modal"
              role="dialog"
            >
              <button
                aria-label="Fechar"
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                ×
              </button>
              <span className="eyebrow accent">NOVO PROCESSO</span>
              <h2 id="new-process-title">Comece uma nova análise</h2>
              <p>
                Crie um espaço privado para organizar os documentos deste
                processo.
              </p>
              <form onSubmit={handleCreate}>
                <label htmlFor="process-name">
                  Nome do processo
                  <input
                    id="process-name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: João da Silva"
                    required
                    value={name}
                  />
                </label>
                <label htmlFor="process-identifier">
                  Identificação <span>(opcional)</span>
                  <input
                    id="process-identifier"
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Ex.: PROC-2026-001"
                    value={identifier}
                  />
                </label>
                <div className="modal-actions">
                  <button
                    className="cancel-button"
                    onClick={() => setIsModalOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    disabled={isSaving}
                    type="submit"
                  >
                    {isSaving ? "Criando..." : "Criar processo"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        {selectedProcess && findings.length > 0 && (
          <section className="findings-panel">
            <div className="documents-heading">
              <div>
                <span className="eyebrow accent">REVISÃO PROFISSIONAL</span>
                <h2>Pontos de atenção</h2>
              </div>
              <span className="finding-count">
                {
                  findings.filter((finding) => finding.status === "UNREVIEWED")
                    .length
                }{" "}
                não revisado(s)
              </span>
            </div>
            <div className="finding-list">
              {findings.map((finding) => (
                <article
                  className={`finding-item finding-${finding.severity.toLowerCase()}`}
                  key={finding.id}
                >
                  <div className="finding-main">
                    <span className="finding-severity">
                      {finding.severity === "CRITICAL"
                        ? "!"
                        : finding.severity === "WARNING"
                          ? "⚠"
                          : "i"}
                    </span>
                    <div>
                      <strong>{finding.title}</strong>
                      <p>{finding.description}</p>
                      <small>
                        {finding.document?.originalName ?? "Processo"}
                        {finding.page ? ` · página ${finding.page}` : ""}
                      </small>
                    </div>
                  </div>
                  <div className="finding-actions">
                    <span>
                      {finding.status === "UNREVIEWED"
                        ? "Não revisado"
                        : finding.status === "REVIEWED"
                          ? "Revisado"
                          : finding.status === "CONFIRMED"
                            ? "Confirmado"
                            : "Ignorado"}
                    </span>
                    {finding.status === "UNREVIEWED" && (
                      <>
                        <button
                          onClick={() =>
                            void handleFindingStatus(finding, "REVIEWED")
                          }
                          type="button"
                        >
                          Revisar
                        </button>
                        <button
                          onClick={() =>
                            void handleFindingStatus(finding, "CONFIRMED")
                          }
                          type="button"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() =>
                            void handleFindingStatus(finding, "IGNORED")
                          }
                          type="button"
                        >
                          Ignorar
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {selectedProcess && (
          <section className="chat-panel">
            <div className="documents-heading">
              <div>
                <span className="eyebrow accent">ASSISTENTE DO PROCESSO</span>
                <h2>Conversa com a IA</h2>
              </div>
              <div className="chat-actions">
                <span className="chat-context">Contexto isolado</span>
                <button
                  className="text-button"
                  disabled={!messages.length}
                  onClick={() => void handleClearConversation()}
                  type="button"
                >
                  Limpar conversa
                </button>
              </div>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <p className="chat-empty">
                  Faça uma pergunta sobre os documentos e análises deste
                  processo.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    className={`chat-message chat-${message.role.toLowerCase()}`}
                    key={message.id}
                  >
                    <span>{message.role === "USER" ? "Você" : "IA"}</span>
                    <p>{message.content}</p>
                  </div>
                ))
              )}
            </div>
            <form className="chat-form" onSubmit={handleSendMessage}>
              <input
                aria-label="Mensagem para a IA"
                disabled={isSendingMessage}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Pergunte sobre este processo..."
                value={chatInput}
              />
              <button
                className="primary-button"
                disabled={isSendingMessage || !chatInput.trim()}
                type="submit"
              >
                {isSendingMessage ? "Enviando..." : "Enviar"}
              </button>
            </form>
            {documents.length > 0 && (
              <section className="document-actions-panel">
                <div className="documents-heading">
                  <div>
                    <span className="eyebrow accent">ARQUIVOS DO PROCESSO</span>
                    <h3>Abrir ou remover documento</h3>
                  </div>
                </div>
                <div className="document-actions-list">
                  {documents.map((document) => (
                    <div className="document-action-item" key={document.id}>
                      <span>{document.originalName}</span>
                      <div>
                        <button
                          className="text-button"
                          onClick={() => openViewer(document)}
                          type="button"
                        >
                          Abrir ↗
                        </button>
                        <button
                          className="text-button danger-button"
                          disabled={deletingDocumentId === document.id}
                          onClick={() => void handleDeleteDocument(document)}
                          type="button"
                        >
                          {deletingDocumentId === document.id
                            ? "Removendo..."
                            : "Remover"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {selectedProcess && (
              <section className="process-completion-panel">
                <div>
                  <span className="eyebrow accent">STATUS DO PROCESSO</span>
                  <h3>
                    {selectedProcess.status === "CONCLUIDO"
                      ? "Processo finalizado"
                      : "Processo em andamento"}
                  </h3>
                  <p>
                    {selectedProcess.status === "CONCLUIDO"
                      ? "Os documentos continuam disponíveis para consulta. Reabra quando quiser continuar a análise."
                      : "Finalize quando terminar a revisão. Você poderá reabrir este processo depois."}
                  </p>
                </div>
                {selectedProcess.status === "CONCLUIDO" ? (
                  <button
                    className="outline-button"
                    onClick={() => void handleProcessReopen()}
                    type="button"
                  >
                    Reabrir processo
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => void handleProcessCompletion()}
                    type="button"
                  >
                    Finalizar processo
                  </button>
                )}
              </section>
            )}
          </section>
        )}
      </section>

      {viewerDocument && selectedProcess && (
        <div
          className="modal-backdrop"
          onClick={() => setViewerDocument(null)}
          role="presentation"
        >
          <section
            aria-labelledby="pdf-viewer-title"
            aria-modal="true"
            className="pdf-viewer-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="pdf-viewer-heading">
              <div>
                <span className="eyebrow accent">VISUALIZADOR SEGURO</span>
                <h2 id="pdf-viewer-title">{viewerDocument.originalName}</h2>
              </div>
              <button
                aria-label="Fechar visualizador"
                className="modal-close"
                onClick={() => setViewerDocument(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="pdf-toolbar">
              <label htmlFor="viewer-page">
                Página
                <input
                  id="viewer-page"
                  min="1"
                  max={viewerDocument.pageCount ?? undefined}
                  onChange={(event) =>
                    setViewerPage(Math.max(1, Number(event.target.value) || 1))
                  }
                  type="number"
                  value={viewerPage}
                />
              </label>
              <span>
                {viewerDocument.pageCount
                  ? `de ${viewerDocument.pageCount}`
                  : "Navegação do PDF"}
              </span>
              <button
                className="text-button"
                onClick={() => setViewerPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                ← Anterior
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setViewerPage((page) =>
                    viewerDocument.pageCount
                      ? Math.min(viewerDocument.pageCount, page + 1)
                      : page + 1,
                  )
                }
                type="button"
              >
                Próxima →
              </button>
            </div>
            {viewerUrl ? (
              <iframe
                className="pdf-frame"
                src={`${viewerUrl}#page=${viewerPage}`}
                title={`Visualização de ${viewerDocument.originalName}`}
              />
            ) : (
              <div className="pdf-loading">Carregando PDF...</div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
