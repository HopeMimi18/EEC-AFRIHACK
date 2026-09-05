const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

const SESSION_KEY =
  "royal-square-demo-session";


export type UserRole =
  | "client"
  | "adviser";


export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
}


export interface AuthSession {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}


export interface ClientDemographics {
  full_name: string | null;
  id_number: string | null;
  tax_number: string | null;
  marital_status: string | null;
  employer: string | null;
  gross_monthly_income:
    | number
    | null;
  net_monthly_income:
    | number
    | null;
  [key: string]: unknown;
}


export interface FNADataPayload {
  client_demographics:
    ClientDemographics;
  assets: Record<string, unknown>;
  liabilities: Record<
    string,
    unknown
  >;
  household_expenses: Record<
    string,
    unknown
  >;
}


export interface FNASummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  total_household_expenses: number;
  monthly_disposable_income: number;
}


export interface UploadedDocument {
  filename: string;
  content_type: string;
  size_bytes: number;
}


export interface ComplianceCheck {
  code: string;
  label: string;
  status: "pass" | "action";
  severity:
    | "ok"
    | "warning"
    | "blocking";
  message: string;
}


export interface ComplianceReadiness {
  label: string;
  overall_status:
    | "ready"
    | "review"
    | "blocked";
  blocking_count: number;
  warning_count: number;
  checks: ComplianceCheck[];
  disclaimer: string;
}


export interface ProcessDocumentsResponse {
  status: string;
  case_id: string;
  case_status: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  consent_recorded: boolean;
  extraction_mode:
    | "demo"
    | "live";
  demo_warning:
    | string
    | null;
  document_count: number;
  uploaded_documents:
    UploadedDocument[];
  extracted_data:
    FNADataPayload;
  summary: FNASummary;
  compliance_readiness:
    ComplianceReadiness;
  processed_filename: string;
  download_url: string;
  verified_by:
    | string
    | null;
}


export interface CaseSummary {
  case_id: string;
  case_status: string;
  owner_email: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  readiness_status:
    | "ready"
    | "review"
    | "blocked";
}


export interface AuditEvent {
  timestamp: string;
  actor_email: string;
  actor_role: UserRole;
  action: string;
  description: string;
}


function messageFromDetail(
  detail: unknown
): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (
    detail &&
    typeof detail === "object" &&
    "message" in detail
  ) {
    return String(
      (
        detail as {
          message: unknown;
        }
      ).message
    );
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "msg" in item
        ) {
          return String(
            (
              item as {
                msg: unknown;
              }
            ).msg
          );
        }

        return "Validation failed.";
      })
      .join(" ");
  }

  return "Request failed.";
}


async function parseError(
  response: Response
): Promise<Error> {
  try {
    const body =
      await response.json();

    return new Error(
      messageFromDetail(
        body.detail
      )
    );
  } catch {
    return new Error(
      `Request failed with status ${response.status}.`
    );
  }
}


async function authenticatedFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(
    init.headers
  );

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers,
    }
  );

  if (!response.ok) {
    throw await parseError(
      response
    );
  }

  return response;
}


export async function login(
  email: string,
  password: string
): Promise<AuthSession> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw await parseError(
      response
    );
  }

  const session =
    (await response.json()) as AuthSession;

  saveSession(session);

  return session;
}


export function saveSession(
  session: AuthSession
) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );
}


export function loadSession():
  | AuthSession
  | null {
  const raw =
    sessionStorage.getItem(
      SESSION_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw
    ) as AuthSession;
  } catch {
    sessionStorage.removeItem(
      SESSION_KEY
    );
    return null;
  }
}


export function clearSession() {
  sessionStorage.removeItem(
    SESSION_KEY
  );
}


export async function processDocuments(
  files: File[],
  consent: boolean,
  token: string
): Promise<ProcessDocumentsResponse> {
  const formData =
    new FormData();

  files.forEach((file) => {
    formData.append(
      "files",
      file
    );
  });

  formData.append(
    "consent",
    String(consent)
  );

  const response =
    await authenticatedFetch(
      "/api/v1/process-documents",
      token,
      {
        method: "POST",
        body: formData,
      }
    );

  return response.json();
}


export async function listCases(
  token: string
): Promise<CaseSummary[]> {
  const response =
    await authenticatedFetch(
      "/api/v1/cases",
      token
    );

  const body =
    (await response.json()) as {
      cases: CaseSummary[];
    };

  return body.cases;
}


export async function getCase(
  caseId: string,
  token: string
): Promise<ProcessDocumentsResponse> {
  const response =
    await authenticatedFetch(
      `/api/v1/cases/${encodeURIComponent(
        caseId
      )}`,
      token
    );

  return response.json();
}


export async function finaliseCase(
  caseId: string,
  payload: FNADataPayload,
  token: string
): Promise<ProcessDocumentsResponse> {
  const response =
    await authenticatedFetch(
      `/api/v1/cases/${encodeURIComponent(
        caseId
      )}/finalise`,
      token,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload
        ),
      }
    );

  return response.json();
}


export async function getAuditTrail(
  caseId: string,
  token: string
): Promise<AuditEvent[]> {
  const response =
    await authenticatedFetch(
      `/api/v1/cases/${encodeURIComponent(
        caseId
      )}/audit`,
      token
    );

  const body =
    (await response.json()) as {
      audit_trail: AuditEvent[];
    };

  return body.audit_trail;
}


export async function downloadFna(
  relativeUrl: string,
  filename: string,
  token: string
): Promise<void> {
  const response =
    await authenticatedFetch(
      relativeUrl,
      token
    );

  const blob =
    await response.blob();

  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(
    link
  );
  link.click();
  link.remove();

  URL.revokeObjectURL(
    objectUrl
  );
}
