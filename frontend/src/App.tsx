import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  History,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  clearSession,
  downloadFna,
  finaliseCase,
  getAuditTrail,
  getCase,
  listCases,
  loadSession,
  login,
  processDocuments,
  type AuditEvent,
  type AuthSession,
  type CaseSummary,
  type ComplianceReadiness,
  type FNADataPayload,
  type ProcessDocumentsResponse,
  type UserRole,
} from "./lib/api";

import "./App.css";
import ClientExperience from "./components/ClientExperience";
import CaseChat from "./components/CaseChat";

type ProcessingStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "validating"
  | "generating"
  | "complete";


type ChecklistKey =
  | "id"
  | "payslip"
  | "bank"
  | "irp5"
  | "address";


const DOCUMENT_CHECKLIST: {
  key: ChecklistKey;
  label: string;
  hints: string[];
}[] = [
  {
    key: "id",
    label: "ID Document",
    hints: ["id", "identity"],
  },
  {
    key: "payslip",
    label: "Payslip",
    hints: ["payslip", "salary"],
  },
  {
    key: "bank",
    label: "Bank Statement",
    hints: ["bank", "statement"],
  },
  {
    key: "irp5",
    label: "IRP5",
    hints: [
      "irp5",
      "tax certificate",
    ],
  },
  {
    key: "address",
    label: "Proof of Address",
    hints: ["address", "proof"],
  },
];


function formatCurrency(
  value:
    | number
    | null
    | undefined
) {
  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }
  ).format(value ?? 0);
}


function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}


function App() {
  const [session, setSession] =
    useState<AuthSession | null>(
      () => loadSession()
    );

  const [
    selectedLoginRole,
    setSelectedLoginRole,
  ] = useState<UserRole | null>(
    null
  );

  const [files, setFiles] =
    useState<File[]>([]);

  const [consent, setConsent] =
    useState(false);

  const [result, setResult] =
    useState<ProcessDocumentsResponse | null>(
      null
    );

  const [
    reviewData,
    setReviewData,
  ] = useState<FNADataPayload | null>(
    null
  );

  const [
    reviewFinalised,
    setReviewFinalised,
  ] = useState(false);

  const [cases, setCases] =
    useState<CaseSummary[]>([]);

  const [audit, setAudit] =
    useState<AuditEvent[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [
    caseLoading,
    setCaseLoading,
  ] = useState(false);

  const [
    finalising,
    setFinalising,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [stage, setStage] =
    useState<ProcessingStage>(
      "idle"
    );

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const client =
    reviewData?.client_demographics;

  const checklist = useMemo(
    () =>
      DOCUMENT_CHECKLIST.map(
        (item) => {
          const matched =
            files.some((file) => {
              const name =
                file.name.toLowerCase();

              return item.hints.some(
                (hint) =>
                  name.includes(hint)
              );
            });

          return {
            ...item,
            matched,
          };
        }
      ),
    [files]
  );

  const stages = [
    {
      key: "uploading",
      label: "Upload",
    },
    {
      key: "extracting",
      label: "Extract",
    },
    {
      key: "validating",
      label: "Validate",
    },
    {
      key: "generating",
      label: "Generate Draft",
    },
    {
      key: "complete",
      label: "Complete",
    },
  ];

  const stageOrder:
    ProcessingStage[] = [
      "idle",
      "uploading",
      "extracting",
      "validating",
      "generating",
      "complete",
    ];

  const currentStageIndex =
    stageOrder.indexOf(stage);

  useEffect(() => {
    if (
      session?.user.role !==
      "adviser"
    ) {
      return;
    }

    void refreshCases(
      session
    );
  }, [session]);

  async function refreshCases(
    activeSession = session
  ) {
    if (
      !activeSession ||
      activeSession.user.role !==
        "adviser"
    ) {
      return;
    }

    try {
      const items =
        await listCases(
          activeSession.access_token
        );
      setCases(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load cases."
      );
    }
  }

  function resetWorkspace() {
    setFiles([]);
    setConsent(false);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setAudit([]);
    setError(null);
    setStage("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  function handleLogout() {
    clearSession();
    resetWorkspace();
    setCases([]);
    setSession(null);
    setSelectedLoginRole(null);
  }

  function addFiles(
    selectedFiles: File[]
  ) {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ];

    const validFiles: File[] = [];
    const rejected: string[] = [];

    for (
      const selectedFile
      of selectedFiles
    ) {
      if (
        !allowedTypes.includes(
          selectedFile.type
        )
      ) {
        rejected.push(
          `${selectedFile.name}: unsupported file type.`
        );
        continue;
      }

      if (
        selectedFile.size >
        10 * 1024 * 1024
      ) {
        rejected.push(
          `${selectedFile.name}: exceeds the 10 MB limit.`
        );
        continue;
      }

      validFiles.push(
        selectedFile
      );
    }

    const combined = [
      ...files,
      ...validFiles,
    ];

    const uniqueFiles =
      combined.filter(
        (
          file,
          index,
          allFiles
        ) =>
          index ===
          allFiles.findIndex(
            (candidate) =>
              candidate.name ===
                file.name &&
              candidate.size ===
                file.size &&
              candidate.lastModified ===
                file.lastModified
          )
      );

    if (
      uniqueFiles.length > 5
    ) {
      setFiles(
        uniqueFiles.slice(0, 5)
      );
      setError(
        "A maximum of 5 documents may be uploaded."
      );
      return;
    }

    setFiles(uniqueFiles);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setAudit([]);
    setStage("idle");

    setError(
      rejected.length
        ? rejected.join(" ")
        : null
    );
  }

  function removeFile(
    index: number
  ) {
    setFiles(
      (currentFiles) =>
        currentFiles.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );

    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setAudit([]);
    setStage("idle");
  }

  function clearFiles() {
    setFiles([]);
    setConsent(false);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setAudit([]);
    setError(null);
    setStage("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  async function handleProcess() {
    if (!session) {
      setError(
        "Please sign in first."
      );
      return;
    }

    if (!files.length) {
      setError(
        "Please select at least one client document."
      );
      return;
    }

    if (!consent) {
      setError(
        session.user.role ===
          "client"
          ? "Please confirm consent before submitting your documents."
          : "Please confirm that client consent has been obtained."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setAudit([]);

    try {
      setStage("uploading");

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      setStage("extracting");

      const request =
        processDocuments(
          files,
          consent,
          session.access_token
        );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            400
          )
      );

      setStage("validating");

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            300
          )
      );

      setStage("generating");

      const response =
        await request;

      setResult(response);
      setReviewData(
        response.extracted_data
      );
      setReviewFinalised(
        response.case_status ===
          "finalised"
      );
      setStage("complete");

      if (
        session.user.role ===
        "adviser"
      ) {
        await refreshCases();
        const events =
          await getAuditTrail(
            response.case_id,
            session.access_token
          );
        setAudit(events);
      }
    } catch (err) {
      setStage("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Document processing failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenCase(
    caseId: string
  ) {
    if (
      !session ||
      session.user.role !==
        "adviser"
    ) {
      return;
    }

    setCaseLoading(true);
    setError(null);

    try {
      const [
        caseData,
        events,
      ] = await Promise.all([
        getCase(
          caseId,
          session.access_token
        ),
        getAuditTrail(
          caseId,
          session.access_token
        ),
      ]);

      setResult(caseData);
      setReviewData(
        caseData.extracted_data
      );
      setReviewFinalised(
        caseData.case_status ===
          "finalised"
      );
      setAudit(events);
      setStage("complete");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open case."
      );
    } finally {
      setCaseLoading(false);
    }
  }

  function updateClientField<
    K extends keyof FNADataPayload["client_demographics"],
  >(
    field: K,
    value:
      FNADataPayload[
        "client_demographics"
      ][K]
  ) {
    setReviewData(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          client_demographics: {
            ...current.client_demographics,
            [field]: value,
          },
        };
      }
    );

    setReviewFinalised(false);
  }

  async function handleFinalise() {
    if (
      !session ||
      session.user.role !==
        "adviser"
    ) {
      setError(
        "Adviser access is required."
      );
      return;
    }

    if (
      !result ||
      !reviewData
    ) {
      setError(
        "Open a case before finalising."
      );
      return;
    }

    setFinalising(true);
    setError(null);

    try {
      const finalResult =
        await finaliseCase(
          result.case_id,
          reviewData,
          session.access_token
        );

      setResult(finalResult);
      setReviewData(
        finalResult.extracted_data
      );
      setReviewFinalised(true);

      await refreshCases();

      const events =
        await getAuditTrail(
          finalResult.case_id,
          session.access_token
        );

      setAudit(events);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Final FNA generation failed."
      );
    } finally {
      setFinalising(false);
    }
  }

  async function handleDownload() {
    if (
      !session ||
      session.user.role !==
        "adviser" ||
      !result
    ) {
      return;
    }

    try {
      await downloadFna(
        result.download_url,
        result.processed_filename,
        session.access_token
      );

      const events =
        await getAuditTrail(
          result.case_id,
          session.access_token
        );

      setAudit(events);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed."
      );
    }
  }

  if (!session) {
    if (!selectedLoginRole) {
      return (
        <RoleLanding
          onSelect={
            setSelectedLoginRole
          }
        />
      );
    }

    return (
      <LoginScreen
        role={
          selectedLoginRole
        }
        onBack={() =>
          setSelectedLoginRole(
            null
          )
        }
        onSuccess={
          setSession
        }
      />
    );
  }

 if (
  session.user.role ===
  "client"
) {
  return (
    <ClientExperience
      session={session}
      files={files}
      result={result}
      loading={loading}
      error={error}
      stage={stage}
      dragActive={dragActive}
      checklist={checklist}
      consent={consent}
      fileInputRef={fileInputRef}
      onAddFiles={addFiles}
      onRemoveFile={removeFile}
      onClearFiles={clearFiles}
      onProcess={handleProcess}
      onDragActive={setDragActive}
      onConsentChange={setConsent}
      onLogout={handleLogout}
    />
  );
}
  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">
              RS
            </div>

            <div>
              <h2>
                Royal Square
              </h2>
              <span>
                Financial Portal
              </span>
            </div>
          </div>

          <nav className="nav">
            <button className="nav-item active">
              <UserRound
                size={19}
              />
              Adviser Workspace
            </button>

            <button className="nav-item">
              <WalletCards
                size={19}
              />
              FNA Records
            </button>

            <button className="nav-item">
              <ShieldCheck
                size={19}
              />
              Compliance Readiness
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="secure-label">
            <LockKeyhole
              size={17}
            />
            Authenticated Adviser
          </div>

          <span>
            {session.user.email}
          </span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              ADVISER / BROKER PORTAL
            </p>

            <h1>
              Client FNA Workspace
            </h1>

            <p className="subtitle">
              Review submitted cases,
              correct financial data and
              generate adviser-verified
              FNA workbooks.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="prototype-badge">
              PROTOTYPE
            </div>

            <div className="adviser-avatar">
              AD
            </div>

            <button
              className="role-switch-button"
              onClick={
                handleLogout
              }
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </header>

        <section className="notice-card">
          <AlertTriangle
            size={20}
          />

          <div>
            <strong>
              Adviser verification required
            </strong>

            <p>
              Compliance Readiness is a
              decision-support checklist,
              not an automatic FAIS/FICA
              compliance determination.
            </p>
          </div>
        </section>

        <CaseQueue
          cases={cases}
          loading={caseLoading}
          activeCaseId={
            result?.case_id ??
            null
          }
          onOpen={
            handleOpenCase
          }
          onRefresh={() =>
            void refreshCases()
          }
        />

        <div className="workspace-grid">
          <section className="card upload-card">
            <div className="card-heading">
              <div>
                <span className="step-label">
                  NEW CASE
                </span>

                <h2>
                  Upload on behalf of a client
                </h2>

                <p>
                  Advisers may create a
                  case directly after
                  confirming client consent.
                </p>
              </div>

              <FileText
                className="heading-icon"
                size={28}
              />
            </div>

            <DocumentUploader
              files={files}
              loading={loading}
              dragActive={
                dragActive
              }
              fileInputRef={
                fileInputRef
              }
              consent={consent}
              role="adviser"
              processLabel="Process"
              onAddFiles={
                addFiles
              }
              onRemoveFile={
                removeFile
              }
              onClearFiles={
                clearFiles
              }
              onProcess={
                handleProcess
              }
              onDragActive={
                setDragActive
              }
              onConsentChange={
                setConsent
              }
            />

            {error && (
              <ErrorMessage
                message={error}
              />
            )}
          </section>

          <ProcessingCard
            stages={stages}
            stageOrder={
              stageOrder
            }
            stage={stage}
            currentStageIndex={
              currentStageIndex
            }
          />
        </div>

        {result &&
          reviewData &&
          client && (
            <div className="results-area">
              {result.extraction_mode ===
                "demo" && (
                <section className="demo-banner">
                  <div className="demo-icon">
                    <Landmark
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      DEMO MODE —
                      Synthetic Data
                    </strong>

                    <p>
                      {
                        result.demo_warning
                      }
                    </p>
                  </div>
                </section>
              )}

              <section className="case-identity-bar">
                <div>
                  <span>
                    CASE
                  </span>
                  <strong>
                    {
                      result.case_id
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    OWNER
                  </span>
                  <strong>
                    {
                      result.owner_email
                    }
                  </strong>
                </div>

                <StatusPill
                  status={
                    result.case_status
                  }
                />
              </section>

              <CompliancePanel
                readiness={
                  result.compliance_readiness
                }
              />

              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="step-label">
                      CLIENT COMMUNICATION
                    </span>

                    <h2>
                      Case Conversation
                    </h2>

                    <p>
                      Send clear updates without
                      requiring the client to
                      understand internal processes.
                    </p>
                  </div>

                  <MessageCircle
                    className="heading-icon"
                    size={28}
                  />
                </div>

                <CaseChat
                  session={session}
                  caseId={
                    result.case_id
                  }
                  title="Client ↔ Adviser"
                />
              </section>

              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="step-label">
                      ADVISER REVIEW
                    </span>

                    <h2>
                      Verify client information
                    </h2>

                    <p>
                      Correct the extracted
                      values before generating
                      the final workbook.
                    </p>
                  </div>

                  <UserRound
                    className="heading-icon"
                    size={28}
                  />
                </div>

                <div className="review-grid">
                  <EditableReviewField
                    label="Client Name"
                    value={
                      client.full_name ??
                      ""
                    }
                    onChange={(value) =>
                      updateClientField(
                        "full_name",
                        value || null
                      )
                    }
                  />

                  <EditableReviewField
                    label="ID Number"
                    value={
                      client.id_number ??
                      ""
                    }
                    placeholder="13-digit SA ID"
                    onChange={(value) =>
                      updateClientField(
                        "id_number",
                        value || null
                      )
                    }
                  />

                  <EditableReviewField
                    label="Tax Number"
                    value={
                      client.tax_number ??
                      ""
                    }
                    onChange={(value) =>
                      updateClientField(
                        "tax_number",
                        value || null
                      )
                    }
                  />

                  <EditableReviewField
                    label="Marital Status"
                    value={
                      client.marital_status ??
                      ""
                    }
                    onChange={(value) =>
                      updateClientField(
                        "marital_status",
                        value || null
                      )
                    }
                  />

                  <EditableReviewField
                    label="Employer"
                    value={
                      client.employer ??
                      ""
                    }
                    onChange={(value) =>
                      updateClientField(
                        "employer",
                        value || null
                      )
                    }
                  />

                  <EditableReviewField
                    label="Gross Monthly Income"
                    value={
                      client.gross_monthly_income ??
                      ""
                    }
                    type="number"
                    onChange={(value) =>
                      updateClientField(
                        "gross_monthly_income",
                        value === ""
                          ? null
                          : Number(
                              value
                            )
                      )
                    }
                  />

                  <EditableReviewField
                    label="Net Monthly Income"
                    value={
                      client.net_monthly_income ??
                      ""
                    }
                    type="number"
                    onChange={(value) =>
                      updateClientField(
                        "net_monthly_income",
                        value === ""
                          ? null
                          : Number(
                              value
                            )
                      )
                    }
                  />
                </div>

                <div className="verification-note">
                  <ShieldCheck
                    size={19}
                  />

                  <div>
                    <strong>
                      {reviewFinalised
                        ? "Adviser verification complete"
                        : "Human verification checkpoint"}
                    </strong>

                    <span>
                      {reviewFinalised
                        ? `Verified by ${result.verified_by ?? session.user.email}.`
                        : "Confirm the information against the source documents. Backend role checks prevent clients from finalising a case."}
                    </span>
                  </div>
                </div>

                <button
                  className="primary-button"
                  onClick={
                    handleFinalise
                  }
                  disabled={
                    finalising
                  }
                  type="button"
                >
                  {finalising ? (
                    <>
                      <LoaderCircle
                        className="spin"
                        size={19}
                      />
                      Validating & Generating
                    </>
                  ) : (
                    <>
                      <ShieldCheck
                        size={19}
                      />
                      {reviewFinalised
                        ? "Revalidate & Regenerate Final FNA"
                        : "Save Corrections & Generate Final FNA"}
                    </>
                  )}
                </button>

                {error && (
                  <ErrorMessage
                    message={
                      error
                    }
                  />
                )}
              </section>

              <section className="summary-section">
                <div className="section-title">
                  <div>
                    <span className="step-label">
                      FNA SUMMARY
                    </span>

                    <h2>
                      Financial Position
                    </h2>
                  </div>

                  <span className="validated-badge">
                    <CheckCircle2
                      size={15}
                    />
                    Schema Validated
                  </span>
                </div>

                <div className="summary-grid">
                  <SummaryCard
                    label="Total Assets"
                    value={formatCurrency(
                      result.summary
                        .total_assets
                    )}
                  />

                  <SummaryCard
                    label="Total Liabilities"
                    value={formatCurrency(
                      result.summary
                        .total_liabilities
                    )}
                  />

                  <SummaryCard
                    label="Net Worth"
                    value={formatCurrency(
                      result.summary
                        .net_worth
                    )}
                    featured
                  />

                  <SummaryCard
                    label="Household Expenses"
                    value={formatCurrency(
                      result.summary
                        .total_household_expenses
                    )}
                  />

                  <SummaryCard
                    label="Disposable Income"
                    value={formatCurrency(
                      result.summary
                        .monthly_disposable_income
                    )}
                    featured
                  />
                </div>
              </section>

              <section className="completion-card">
                <div className="completion-icon">
                  <CheckCircle2
                    size={29}
                  />
                </div>

                <div className="completion-copy">
                  <span className="step-label">
                    WORKBOOK
                  </span>

                  <h2>
                    {reviewFinalised
                      ? "Verified FNA Workbook Ready"
                      : "Draft FNA Workbook Ready"}
                  </h2>

                  <p>
                    {reviewFinalised
                      ? "The final workbook is available to authenticated advisers only."
                      : "Complete adviser verification before treating the workbook as final."}
                  </p>

                  <small>
                    {
                      result.processed_filename
                    }
                  </small>
                </div>

                <button
                  className="download-button"
                  onClick={() =>
                    void handleDownload()
                  }
                  disabled={
                    !reviewFinalised
                  }
                >
                  <Download
                    size={19}
                  />
                  Download Final FNA
                </button>
              </section>

              <AuditTrail
                events={audit}
              />

              <button
                className="secondary-button"
                onClick={
                  clearFiles
                }
              >
                <RefreshCcw
                  size={17}
                />
                Start Another Case
              </button>
            </div>
          )}
      </main>
    </div>
  );
}


function RoleLanding({
  onSelect,
}: {
  onSelect: (
    role: UserRole
  ) => void;
}) {
  return (
    <div className="role-landing">
      <div className="role-landing-inner">
        <div className="landing-brand">
          <div className="brand-mark">
            RS
          </div>

          <div>
            <strong>
              Royal Square
            </strong>
            <span>
              Secure Financial
              Onboarding Portal
            </span>
          </div>
        </div>

        <div className="landing-copy">
          <span className="step-label">
            AFRIHACK 2026 PROTOTYPE
          </span>

          <h1>
            Secure onboarding for
            clients and advisers.
          </h1>

          <p>
            Authentication and role-based
            access control now separate
            document submission from adviser
            verification and final FNA
            generation.
          </p>
        </div>

        <div className="role-grid">
          <button
            className="role-card"
            onClick={() =>
              onSelect("client")
            }
          >
            <div className="role-card-icon">
              <UsersRound
                size={27}
              />
            </div>

            <span className="role-kicker">
              CLIENT
            </span>

            <h2>
              Submit My Documents
            </h2>

            <p>
              Sign in, record consent,
              upload your financial
              document pack and submit
              it for adviser review.
            </p>

            <strong>
              Client Sign In →
            </strong>
          </button>

          <button
            className="role-card featured-role"
            onClick={() =>
              onSelect(
                "adviser"
              )
            }
          >
            <div className="role-card-icon">
              <ShieldCheck
                size={27}
              />
            </div>

            <span className="role-kicker">
              ADVISER / BROKER
            </span>

            <h2>
              Review Client Cases
            </h2>

            <p>
              Access the adviser case queue,
              correct structured data,
              review readiness checks and
              generate final FNA workbooks.
            </p>

            <strong>
              Adviser Sign In →
            </strong>
          </button>
        </div>

        <div className="landing-footnote">
          Hackathon Demo Mode: use synthetic
          or test documents only.
        </div>
      </div>
    </div>
  );
}


function LoginScreen({
  role,
  onBack,
  onSuccess,
}: {
  role: UserRole;
  onBack: () => void;
  onSuccess: (
    session: AuthSession
  ) => void;
}) {
  const demoEmail =
    role === "client"
      ? "client@demo.co.za"
      : "adviser@demo.co.za";

  const demoPassword =
    role === "client"
      ? "Client123!"
      : "Adviser123!";

  const [email, setEmail] =
    useState(demoEmail);

  const [
    password,
    setPassword,
  ] = useState(demoPassword);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const auth =
        await login(
          email,
          password
        );

      if (
        auth.user.role !== role
      ) {
        throw new Error(
          `This account is registered as ${auth.user.role}, not ${role}.`
        );
      }

      onSuccess(auth);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign in failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <button
          className="login-back"
          onClick={onBack}
        >
          <ArrowLeft
            size={17}
          />
          Back
        </button>

        <div className="login-icon">
          <LockKeyhole
            size={27}
          />
        </div>

        <span className="step-label">
          {role === "client"
            ? "CLIENT ACCESS"
            : "ADVISER ACCESS"}
        </span>

        <h1>
          Sign in to Royal Square
        </h1>

        <p>
          This prototype uses signed
          bearer tokens and backend role
          checks. The credentials below are
          seeded demo accounts.
        </p>

        <form
          className="login-form"
          onSubmit={submit}
        >
          <label>
            <span>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="username"
            />
          </label>

          <label>
            <span>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
            />
          </label>

          <button
            className="primary-button"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <LoaderCircle
                  className="spin"
                  size={18}
                />
                Signing in
              </>
            ) : (
              <>
                <LockKeyhole
                  size={18}
                />
                Sign in as{" "}
                {role ===
                "client"
                  ? "Client"
                  : "Adviser"}
              </>
            )}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>
            Demo credentials
          </strong>
          <span>
            {demoEmail}
          </span>
          <span>
            {demoPassword}
          </span>
        </div>

        {error && (
          <ErrorMessage
            message={error}
          />
        )}
      </div>
    </div>
  );
}


function DocumentUploader({
  files,
  loading,
  dragActive,
  fileInputRef,
  consent,
  role,
  processLabel,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProcess,
  onDragActive,
  onConsentChange,
}: {
  files: File[];
  loading: boolean;
  dragActive: boolean;
  fileInputRef:
    RefObject<HTMLInputElement | null>;
  consent: boolean;
  role: UserRole;
  processLabel: string;
  onAddFiles: (
    files: File[]
  ) => void;
  onRemoveFile: (
    index: number
  ) => void;
  onClearFiles: () => void;
  onProcess: () => void;
  onDragActive: (
    active: boolean
  ) => void;
  onConsentChange: (
    value: boolean
  ) => void;
}) {
  return (
    <>
      <div
        className={`drop-zone ${
          dragActive
            ? "drag-active"
            : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          onDragActive(true);
        }}
        onDragLeave={() =>
          onDragActive(false)
        }
        onDrop={(event) => {
          event.preventDefault();
          onDragActive(false);

          onAddFiles(
            Array.from(
              event.dataTransfer.files
            )
          );
        }}
        onClick={() =>
          fileInputRef.current?.click()
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          hidden
          onChange={(event) => {
            onAddFiles(
              Array.from(
                event.target.files ??
                  []
              )
            );

            event.target.value =
              "";
          }}
        />

        <div className="upload-icon">
          <Upload
            size={28}
          />
        </div>

        <strong>
          Drag & drop client
          documents
        </strong>

        <span>
          or click to select
          multiple files
        </span>

        <small>
          PDF, PNG, JPG or JPEG ·
          Max 5 documents · 10 MB each
        </small>
      </div>

      {files.length > 0 && (
        <div className="document-pack">
          <div className="document-pack-header">
            <div>
              <strong>
                Client Document Pack
              </strong>

              <span>
                {files.length} of 5
                documents selected
              </span>
            </div>

            <button
              type="button"
              className="icon-button clear-all-button"
              onClick={
                onClearFiles
              }
            >
              Clear all
            </button>
          </div>

          <div className="document-list">
            {files.map(
              (file, index) => (
                <div
                  className="selected-file"
                  key={`${file.name}-${file.lastModified}`}
                >
                  <div className="file-details">
                    <div className="file-icon">
                      <FileCheck2
                        size={21}
                      />
                    </div>

                    <div>
                      <strong>
                        {
                          file.name
                        }
                      </strong>

                      <span>
                        {(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </span>
                    </div>
                  </div>

                  <button
                    className="icon-button"
                    onClick={() =>
                      onRemoveFile(
                        index
                      )
                    }
                    type="button"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <label className="consent-box">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) =>
            onConsentChange(
              event.target.checked
            )
          }
        />

        <span>
          <strong>
            Consent confirmation
          </strong>

          {role === "client"
            ? "I consent to these test documents being processed for this prototype onboarding workflow."
            : "I confirm that client consent has been obtained before processing this document pack."}
        </span>
      </label>

      <button
        className="primary-button"
        disabled={
          files.length === 0 ||
          loading ||
          !consent
        }
        onClick={
          onProcess
        }
      >
        {loading ? (
          <>
            <LoaderCircle
              className="spin"
              size={19}
            />
            Processing Document Pack
          </>
        ) : (
          <>
            <FileCheck2
              size={19}
            />

            {files.length === 0
              ? "Select Documents"
              : `${processLabel} ${
                  files.length === 1
                    ? "1 Document"
                    : `${files.length} Documents`
                }`}
          </>
        )}
      </button>
    </>
  );
}


function ProcessingCard({
  stages,
  stageOrder,
  stage,
  currentStageIndex,
}: {
  stages: {
    key: string;
    label: string;
  }[];
  stageOrder:
    ProcessingStage[];
  stage: ProcessingStage;
  currentStageIndex: number;
}) {
  return (
    <section className="card status-card">
      <div className="card-heading">
        <div>
          <span className="step-label">
            WORKFLOW
          </span>

          <h2>
            Processing Status
          </h2>

          <p>
            Follow the document pack
            through the onboarding
            pipeline.
          </p>
        </div>
      </div>

      <div className="processing-list">
        {stages.map(
          (
            processingStage,
            index
          ) => {
            const stageIndex =
              stageOrder.indexOf(
                processingStage.key as ProcessingStage
              );

            const completed =
              currentStageIndex >
                stageIndex ||
              stage === "complete";

            const active =
              stage ===
              processingStage.key;

            return (
              <div
                className={`processing-row ${
                  completed
                    ? "completed"
                    : ""
                } ${
                  active
                    ? "current"
                    : ""
                }`}
                key={
                  processingStage.key
                }
              >
                <div className="stage-marker">
                  {completed ? (
                    <CheckCircle2
                      size={19}
                    />
                  ) : active ? (
                    <LoaderCircle
                      className="spin"
                      size={19}
                    />
                  ) : (
                    <span>
                      {index + 1}
                    </span>
                  )}
                </div>

                <div>
                  <strong>
                    {
                      processingStage.label
                    }
                  </strong>

                  <span>
                    {completed
                      ? "Completed"
                      : active
                        ? "In progress"
                        : "Waiting"}
                  </span>
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}


function CaseQueue({
  cases,
  loading,
  activeCaseId,
  onOpen,
  onRefresh,
}: {
  cases: CaseSummary[];
  loading: boolean;
  activeCaseId:
    | string
    | null;
  onOpen: (
    caseId: string
  ) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="card case-queue-card">
      <div className="card-heading">
        <div>
          <span className="step-label">
            ADVISER CASE QUEUE
          </span>

          <h2>
            Submitted Cases
          </h2>

          <p>
            Client cases are visible to
            authenticated advisers. Clients
            can only access their own cases.
          </p>
        </div>

        <button
          className="role-switch-button"
          onClick={onRefresh}
        >
          <RefreshCcw
            size={15}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <LoaderCircle
            className="spin"
            size={20}
          />
          Loading case...
        </div>
      ) : cases.length === 0 ? (
        <div className="empty-state">
          No submitted cases yet.
        </div>
      ) : (
        <div className="case-list">
          {cases.map(
            (item) => (
              <button
                className={`case-row ${
                  activeCaseId ===
                  item.case_id
                    ? "active"
                    : ""
                }`}
                key={
                  item.case_id
                }
                onClick={() =>
                  onOpen(
                    item.case_id
                  )
                }
              >
                <div>
                  <strong>
                    {
                      item.case_id
                    }
                  </strong>
                  <span>
                    {
                      item.owner_email
                    }
                  </span>
                </div>

                <div className="case-row-meta">
                  <small>
                    {
                      item.document_count
                    }{" "}
                    docs
                  </small>

                  <StatusPill
                    status={
                      item.case_status
                    }
                  />
                </div>
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}


function CompliancePanel({
  readiness,
  clientView = false,
}: {
  readiness:
    ComplianceReadiness;
  clientView?: boolean;
}) {
  const visibleChecks =
    clientView
      ? readiness.checks.filter(
          (item) =>
            item.code.startsWith(
              "document_"
            ) ||
            item.code ===
              "consent_recorded"
        )
      : readiness.checks;

  return (
    <section className="card compliance-card">
      <div className="compliance-header">
        <div>
          <span className="step-label">
            COMPLIANCE READINESS
          </span>

          <h2>
            {readiness.overall_status ===
            "ready"
              ? "Ready for adviser review"
              : readiness.overall_status ===
                  "blocked"
                ? "Action required"
                : "Review items detected"}
          </h2>
        </div>

        <ReadinessBadge
          status={
            readiness.overall_status
          }
        />
      </div>

      <div className="readiness-stats">
        <div>
          <strong>
            {
              readiness.blocking_count
            }
          </strong>
          <span>
            blocking
          </span>
        </div>

        <div>
          <strong>
            {
              readiness.warning_count
            }
          </strong>
          <span>
            warnings
          </span>
        </div>
      </div>

      <div className="compliance-checks">
        {visibleChecks.map(
          (item) => (
            <div
              className={`compliance-check ${item.severity}`}
              key={
                item.code
              }
            >
              <div className="compliance-check-icon">
                {item.status ===
                "pass" ? (
                  <CheckCircle2
                    size={18}
                  />
                ) : (
                  <AlertTriangle
                    size={18}
                  />
                )}
              </div>

              <div>
                <strong>
                  {
                    item.label
                  }
                </strong>
                <span>
                  {
                    item.message
                  }
                </span>
              </div>
            </div>
          )
        )}
      </div>

      <p className="compliance-disclaimer">
        {readiness.disclaimer}
      </p>
    </section>
  );
}


function AuditTrail({
  events,
}: {
  events: AuditEvent[];
}) {
  return (
    <section className="card audit-card">
      <div className="card-heading">
        <div>
          <span className="step-label">
            AUDIT TRAIL
          </span>

          <h2>
            Case Activity
          </h2>

          <p>
            Actions are logged without
            storing document contents in
            the audit event.
          </p>
        </div>

        <History
          className="heading-icon"
          size={27}
        />
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          No audit events available.
        </div>
      ) : (
        <div className="audit-list">
          {events.map(
            (
              event,
              index
            ) => (
              <div
                className="audit-row"
                key={`${event.timestamp}-${index}`}
              >
                <div className="audit-dot" />

                <div>
                  <strong>
                    {
                      event.action
                    }
                  </strong>

                  <span>
                    {
                      event.description
                    }
                  </span>

                  <small>
                    {
                      event.actor_email
                    }{" "}
                    ·{" "}
                    {formatDate(
                      event.timestamp
                    )}
                  </small>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}


function EditableReviewField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (
    value: string
  ) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="review-field editable-review-field">
      <span>
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={
          placeholder
        }
        min={
          type === "number"
            ? 0
            : undefined
        }
        step={
          type === "number"
            ? "0.01"
            : undefined
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />
    </label>
  );
}


function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalized =
    status
      .toLowerCase()
      .replaceAll("_", "-");

  return (
    <span
      className={`status-pill ${normalized}`}
    >
      {status.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}


function ReadinessBadge({
  status,
}: {
  status:
    | "ready"
    | "review"
    | "blocked";
}) {
  return (
    <span
      className={`readiness-badge ${status}`}
    >
      <ClipboardCheck
        size={15}
      />
      {status}
    </span>
  );
}


function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="error-message">
      <AlertTriangle
        size={18}
      />
      {message}
    </div>
  );
}


function SummaryCard({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`summary-card ${
        featured
          ? "featured"
          : ""
      }`}
    >
      <span>
        {label}
      </span>
      <strong>
        {value}
      </strong>
    </div>
  );
}


export default App;
