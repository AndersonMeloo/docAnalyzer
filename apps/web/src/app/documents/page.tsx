"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDocument,
  DocumentSummary,
  fetchDocumentBlob,
  listDocuments,
  listProcesses,
  logout,
  ProcessSummary,
  uploadDocuments,
} from "@/lib/api";

const processingLabels = {
  PENDING: "Aguardando processamento",
  PROCESSING: "Processando",
  COMPLETED: "Processado",
  FAILED: "Falhou",
} as const;
function formatFileSize(sizeBytes: number): string {
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<{
    document: DocumentSummary;
    url: string;
  } | null>(null);

  useEffect(() => {
    listProcesses()
      .then((items) => {
        setProcesses(items);
        setSelectedProcessId(items[0]?.id ?? "");
      })
      .catch((reason: Error) => {
        setError(reason.message);
        router.replace("/login");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedProcessId) return;
    listDocuments(selectedProcessId)
      .then(setDocuments)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  }, [selectedProcessId]);

  function handleProcessChange(processId: string) {
    setIsLoading(true);
    setSelectedProcessId(processId);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      "documents",
    ) as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!selectedProcessId || !files.length) return;
    setIsUploading(true);
    setError("");
    try {
      const uploaded = await uploadDocuments(selectedProcessId, files);
      setDocuments((current) => [...uploaded, ...current]);
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

  async function openDocument(document: DocumentSummary) {
    if (!selectedProcessId) return;
    try {
      setViewer({
        document,
        url: URL.createObjectURL(
          await fetchDocumentBlob(selectedProcessId, document.id),
        ),
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível abrir o documento.",
      );
    }
  }

  async function handleDelete(document: DocumentSummary) {
    if (
      !selectedProcessId ||
      !window.confirm(`Remover o documento "${document.originalName}"?`)
    )
      return;
    setError("");
    try {
      await deleteDocument(selectedProcessId, document.id);
      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      setViewer((current) =>
        current?.document.id === document.id ? null : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível remover o documento.",
      );
    }
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
  }
  const selectedProcess = processes.find(
    (process) => process.id === selectedProcessId,
  );

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-mark">
          <span className="brand-symbol">D</span>
          <span>DocAnalyzer</span>
        </div>
        <nav className="navigation-list">
          <Link className="navigation-item" href="/">
            <span aria-hidden="true">⌂</span>Visão geral
          </Link>
          <Link className="navigation-item active" href="/documents">
            <span aria-hidden="true">□</span>Documentos
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="security-note">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>Ambiente protegido</strong>
              <span>Seus documentos são privados</span>
            </div>
          </div>
          <button
            className="user-menu"
            onClick={() => void handleLogout()}
            type="button"
          >
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
            <span className="eyebrow">BIBLIOTECA PRIVADA</span>
            <h1>Documentos</h1>
          </div>
          <Link className="primary-button" href="/">
            Voltar ao painel
          </Link>
        </header>
        <div className="content-grid documents-page-content">
          {error && (
            <p className="feedback-error" role="alert">
              {error}
            </p>
          )}
          <div className="section-heading document-filter-heading">
            <div>
              <span className="eyebrow accent">PROCESSO</span>
              <h2>{selectedProcess?.name ?? "Escolha um processo"}</h2>
            </div>
            <label className="process-select-label" htmlFor="process-select">
              Filtrar por processo
              <select
                id="process-select"
                onChange={(event) => handleProcessChange(event.target.value)}
                value={selectedProcessId}
              >
                <option value="">Selecione...</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {isLoading && !processes.length ? (
            <section className="empty-state">
              <div
                className="loading-indicator"
                aria-label="Carregando documentos"
              />
            </section>
          ) : !processes.length ? (
            <section className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                □
              </div>
              <h3>Nenhum processo criado</h3>
              <p>
                Crie um processo no painel para começar a reunir documentos.
              </p>
              <Link className="secondary-button" href="/">
                Ir para processos
              </Link>
            </section>
          ) : (
            <>
              <form className="upload-box" onSubmit={handleUpload}>
                <div className="upload-symbol" aria-hidden="true">
                  ↑
                </div>
                <h3>Adicione documentos ao processo</h3>
                <p>
                  Somente PDF, até 20 MB por arquivo. Você pode selecionar
                  vários de uma vez.
                </p>
                <label className="upload-button">
                  {isUploading ? "Enviando..." : "Selecionar PDFs"}
                  <input
                    accept="application/pdf,.pdf"
                    disabled={isUploading || !selectedProcessId}
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
              {isLoading ? (
                <p className="documents-loading">Carregando documentos...</p>
              ) : !documents.length ? (
                <p className="documents-empty">
                  Este processo ainda não possui documentos.
                </p>
              ) : (
                <div className="document-list">
                  {documents.map((document) => (
                    <article className="document-item" key={document.id}>
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
                          ? "Protegido"
                          : document.processingStatus === "FAILED"
                            ? "Erro no processamento"
                            : document.analysis?.status === "COMPLETED"
                              ? "Análise concluída"
                              : processingLabels[document.processingStatus]}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => void openDocument(document)}
                        type="button"
                      >
                        Abrir <span aria-hidden="true">↗</span>
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void handleDelete(document)}
                        type="button"
                      >
                        Remover
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {viewer && (
        <div
          className="modal-backdrop"
          onClick={() => {
            URL.revokeObjectURL(viewer.url);
            setViewer(null);
          }}
          role="presentation"
        >
          <section
            aria-labelledby="document-viewer-title"
            aria-modal="true"
            className="pdf-viewer-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="pdf-viewer-heading">
              <div>
                <span className="eyebrow accent">VISUALIZADOR SEGURO</span>
                <h2 id="document-viewer-title">
                  {viewer.document.originalName}
                </h2>
              </div>
              <button
                aria-label="Fechar visualizador"
                className="modal-close"
                onClick={() => {
                  URL.revokeObjectURL(viewer.url);
                  setViewer(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <iframe
              className="pdf-frame"
              src={viewer.url}
              title={`Visualização de ${viewer.document.originalName}`}
            />
          </section>
        </div>
      )}
    </main>
  );
}
