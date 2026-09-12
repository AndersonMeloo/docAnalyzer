const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const REQUEST_TIMEOUT_MS = 60000;
export function getDocumentUrl(processId: string, documentId: string): string { return `${apiUrl}/processes/${processId}/documents/${documentId}/view`; }

export async function fetchDocumentBlob(processId: string, documentId: string): Promise<Blob> {
  const response = await fetch(getDocumentUrl(processId, documentId), { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível carregar o PDF.");
  return response.blob();
}

export interface ProcessSummary {
  id: string;
  name: string;
  identifier: string | null;
  status: "PROCESSANDO" | "EM_ANALISE" | "AGUARDANDO_REVISAO" | "CONCLUIDO" | "ARQUIVADO";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  _count?: { documents: number };
}

export interface DocumentSummary {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  pageCount: number | null;
  processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  processingError: string | null;
  isAiProtected: boolean;
  analysis: { status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; summary: string | null; errorMessage: string | null } | null;
  createdAt: string;
}

export interface ProcessSummaryResult {
  documentCount: number;
  pageCount: number;
  analyzedDocumentCount: number;
  pendingDocumentCount: number;
  summary: string | null;
  generatedAt: string | null;
}

export interface FindingSummary {
  id: string;
  processId: string;
  documentId: string | null;
  document: { originalName: string } | null;
  page: number | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  status: "UNREVIEWED" | "REVIEWED" | "IGNORED" | "CONFIRMED";
}

export interface ConversationMessage { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: string; }
export interface ConversationSummary { id: string | null; processId: string; messages: ConversationMessage[]; }

interface ApiMessage {
  message: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const isFormData = options?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: isFormData ? options?.headers : { "Content-Type": "application/json", ...options?.headers },
    });
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === "AbortError") {
      throw new Error("A API demorou para responder. Verifique se o backend está ativo.");
    }
    throw new Error("Não foi possível conectar ao backend. Verifique se a API está em execução.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiMessage | null;
    throw new Error(error?.message ?? "Não foi possível concluir a solicitação.");
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<ApiMessage> {
  return request<ApiMessage>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function register(name: string, email: string, password: string): Promise<ApiMessage> {
  return request<ApiMessage>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

export function logout(): Promise<ApiMessage> {
  return request<ApiMessage>("/auth/logout", { method: "POST" });
}

export function listProcesses(): Promise<ProcessSummary[]> {
  return request<ProcessSummary[]>("/processes");
}

export function getProcess(processId: string): Promise<ProcessSummary> {
  return request<ProcessSummary>(`/processes/${processId}`);
}

export function createProcess(name: string, identifier?: string): Promise<ProcessSummary> {
  return request<ProcessSummary>("/processes", { method: "POST", body: JSON.stringify({ name, identifier: identifier || undefined }) });
}

export function deleteProcess(processId: string): Promise<ApiMessage> {
  return request<ApiMessage>(`/processes/${processId}`, { method: "DELETE" });
}
 
export function completeProcess(processId: string): Promise<ProcessSummary> {
  return request<ProcessSummary>(`/processes/${processId}/complete`, { method: "PATCH" });
}
 
export function reopenProcess(processId: string): Promise<ProcessSummary> {
  return request<ProcessSummary>(`/processes/${processId}/reopen`, { method: "PATCH" });
}

export function listDocuments(processId: string): Promise<DocumentSummary[]> {
  return request<DocumentSummary[]>(`/processes/${processId}/documents`);
}

export function uploadDocuments(processId: string, files: File[]): Promise<DocumentSummary[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return request<DocumentSummary[]>(`/processes/${processId}/documents/upload`, { method: "POST", body: formData });
}

export function deleteDocument(processId: string, documentId: string): Promise<ApiMessage> {
  return request<ApiMessage>(`/processes/${processId}/documents/${documentId}`, { method: "DELETE" });
}

export function reprocessDocument(processId: string, documentId: string): Promise<ApiMessage> {
  return request<ApiMessage>(`/processes/${processId}/documents/${documentId}/reprocess`, { method: "POST" });
}

export function getProcessSummary(processId: string): Promise<ProcessSummaryResult> {
  return request<ProcessSummaryResult>(`/processes/${processId}/summary`);
}

export function refreshProcessSummary(processId: string): Promise<ProcessSummaryResult> {
  return request<ProcessSummaryResult>(`/processes/${processId}/summary/refresh`, { method: "POST" });
}

export function listFindings(processId: string): Promise<FindingSummary[]> { return request<FindingSummary[]>(`/processes/${processId}/findings`); }
export function updateFinding(processId: string, findingId: string, status: FindingSummary["status"]): Promise<FindingSummary> { return request<FindingSummary>(`/processes/${processId}/findings/${findingId}`, { method: "PATCH", body: JSON.stringify({ status }) }); }
export function getConversation(processId: string): Promise<ConversationSummary> { return request<ConversationSummary>(`/processes/${processId}/conversation`); }
export function sendMessage(processId: string, content: string): Promise<ConversationMessage> { return request<ConversationMessage>(`/processes/${processId}/conversation/messages`, { method: "POST", body: JSON.stringify({ content }) }); }
export function clearConversation(processId: string): Promise<ApiMessage> { return request<ApiMessage>(`/processes/${processId}/conversation`, { method: "DELETE" }); }
