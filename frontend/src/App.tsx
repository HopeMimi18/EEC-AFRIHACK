import {
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Landmark,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  getDownloadUrl,
  processDocuments,
  type ProcessDocumentsResponse,
} from "./lib/api";

import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

type PortalRole =
  | "landing"
  | "client"
  | "adviser";

type ReviewData =
  ProcessDocumentsResponse["extracted_data"];

type FinaliseFnaResponse = {
  status: string;
  verification_status: string;
  extracted_data: ReviewData;
  summary: ProcessDocumentsResponse["summary"];
  processed_filename: string;
  download_url: string;
};

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
    hints: ["irp5", "tax certificate"],
  },
  {
    key: "address",
    label: "Proof of Address",
    hints: ["address", "proof"],
  },
];

function formatCurrency(
  value: number | null | undefined
) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function App() {
  const [role, setRole] =
    useState<PortalRole>("landing");

  const [files, setFiles] =
    useState<File[]>([]);

  const [result, setResult] =
    useState<ProcessDocumentsResponse | null>(
      null
    );

  const [reviewData, setReviewData] =
    useState<ReviewData | null>(null);

  const [finalising, setFinalising] =
    useState(false);

  const [
    reviewFinalised,
    setReviewFinalised,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [stage, setStage] =
    useState<ProcessingStage>("idle");

  const [dragActive, setDragActive] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const client =
    reviewData?.client_demographics;

  const checklist = useMemo(() => {
    return DOCUMENT_CHECKLIST.map((item) => {
      const matched = files.some((file) => {
        const name = file.name.toLowerCase();

        return item.hints.some((hint) =>
          name.includes(hint)
        );
      });

      return {
        ...item,
        matched,
      };
    });
  }, [files]);

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
      label: "Generate FNA",
    },
    {
      key: "complete",
      label: "Complete",
    },
  ];

  const stageOrder: ProcessingStage[] = [
    "idle",
    "uploading",
    "extracting",
    "validating",
    "generating",
    "complete",
  ];

  const currentStageIndex =
    stageOrder.indexOf(stage);

  function addFiles(selectedFiles: File[]) {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ];

    const validFiles: File[] = [];
    const rejected: string[] = [];

    for (const selectedFile of selectedFiles) {
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

      validFiles.push(selectedFile);
    }

    const combined = [
      ...files,
      ...validFiles,
    ];

    const uniqueFiles = combined.filter(
      (file, index, allFiles) =>
        index ===
        allFiles.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified ===
              file.lastModified
        )
    );

    if (uniqueFiles.length > 5) {
      setError(
        "A maximum of 5 documents may be uploaded."
      );
      setFiles(uniqueFiles.slice(0, 5));
      return;
    }

    setFiles(uniqueFiles);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setStage("idle");
    setError(
      rejected.length > 0
        ? rejected.join(" ")
        : null
    );
  }

  function removeFile(index: number) {
    setFiles((currentFiles) =>
      currentFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setStage("idle");
  }

  function clearFiles() {
    setFiles([]);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);
    setError(null);
    setStage("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleProcess() {
    if (files.length === 0) {
      setError(
        "Please select at least one client document."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setReviewData(null);
    setReviewFinalised(false);

    try {
      setStage("uploading");

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      setStage("extracting");

      const responsePromise =
        processDocuments(files);

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      setStage("validating");

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      setStage("generating");

      const response =
        await responsePromise;

      setResult(response);
      setReviewData(
        response.extracted_data
      );
      setStage("complete");
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

  function updateClientField<
    K extends keyof ReviewData["client_demographics"],
  >(
    field: K,
    value: ReviewData["client_demographics"][K]
  ) {
    setReviewData((current) => {
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
    });

    setReviewFinalised(false);
  }

  function formatApiError(
    detail: unknown
  ) {
    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (
            item &&
            typeof item === "object" &&
            "msg" in item
          ) {
            return String(item.msg);
          }

          return "Validation failed.";
        })
        .join(" ");
    }

    return "Final FNA generation failed.";
  }

  async function handleFinaliseFna() {
    if (!reviewData) {
      setError(
        "No adviser review data is available."
      );
      return;
    }

    setFinalising(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/finalise-fna`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(reviewData),
        }
      );

      if (!response.ok) {
        let message =
          "Final FNA generation failed.";

        try {
          const body =
            await response.json();
          message =
            formatApiError(body.detail);
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      const finalResult =
        (await response.json()) as FinaliseFnaResponse;

      setReviewData(
        finalResult.extracted_data
      );

      setResult((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          extracted_data:
            finalResult.extracted_data,
          summary:
            finalResult.summary,
          processed_filename:
            finalResult.processed_filename,
          download_url:
            finalResult.download_url,
        };
      });

      setReviewFinalised(true);
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

  function switchRole(
    nextRole: PortalRole
  ) {
    setRole(nextRole);
    setError(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (role === "landing") {
    return (
      <RoleLanding
        onSelect={switchRole}
      />
    );
  }

  if (role === "client") {
    return (
      <ClientPortal
        files={files}
        result={result}
        loading={loading}
        error={error}
        stage={stage}
        dragActive={dragActive}
        checklist={checklist}
        fileInputRef={fileInputRef}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        onClearFiles={clearFiles}
        onProcess={handleProcess}
        onDragActive={setDragActive}
        onSwitchRole={switchRole}
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
              <h2>Royal Square</h2>
              <span>
                Financial Portal
              </span>
            </div>
          </div>

          <nav className="nav">
            <button
              className="nav-item"
              onClick={() =>
                switchRole("client")
              }
            >
              <UsersRound size={19} />
              Client Intake
            </button>

            <button className="nav-item active">
              <UserRound size={19} />
              Adviser Workspace
            </button>

            <button className="nav-item">
              <WalletCards size={19} />
              FNA Records
            </button>

            <button className="nav-item">
              <ShieldCheck size={19} />
              Compliance
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="secure-label">
            <ShieldCheck size={17} />
            Adviser Workspace
          </div>

          <span>
            AfriHack 2026 Prototype
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
              Review client documents,
              validate financial information
              and prepare the final FNA.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="role-switch-button"
              onClick={() =>
                switchRole("client")
              }
            >
              <ArrowLeftRight
                size={16}
              />
              Client View
            </button>

            <div className="prototype-badge">
              PROTOTYPE
            </div>

            <div className="adviser-avatar">
              AD
            </div>
          </div>
        </header>

        <section className="notice-card">
          <AlertTriangle size={20} />

          <div>
            <strong>
              Adviser verification required
            </strong>

            <p>
              Extracted and calculated
              information must be reviewed
              before it is relied upon for a
              Financial Needs Analysis.
            </p>
          </div>
        </section>

        {result?.extraction_mode ===
          "demo" && (
          <section className="demo-banner">
            <div className="demo-icon">
              <Landmark size={20} />
            </div>

            <div>
              <strong>
                DEMO MODE — Synthetic Data
              </strong>

              <p>
                {result.demo_warning ??
                  "Synthetic demonstration information is currently enabled."}
              </p>
            </div>
          </section>
        )}

        <div className="workspace-grid">
          <section className="card upload-card">
            <div className="card-heading">
              <div>
                <span className="step-label">
                  STEP 01
                </span>

                <h2>
                  Client Document Pack
                </h2>

                <p>
                  Upload directly as an
                  adviser, or review the pack
                  submitted from the client
                  portal in this prototype
                  session.
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
              dragActive={dragActive}
              fileInputRef={fileInputRef}
              processLabel="Process"
              onAddFiles={addFiles}
              onRemoveFile={removeFile}
              onClearFiles={clearFiles}
              onProcess={handleProcess}
              onDragActive={
                setDragActive
              }
            />

            {error && (
              <div className="error-message">
                <AlertTriangle
                  size={18}
                />
                {error}
              </div>
            )}
          </section>

          <ProcessingCard
            stages={stages}
            stageOrder={stageOrder}
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
              <section className="card">
                <div className="card-heading">
                  <div>
                    <span className="step-label">
                      STEP 02
                    </span>

                    <h2>
                      Adviser Review
                    </h2>

                    <p>
                      Verify and correct the
                      structured client
                      information before
                      finalising the FNA.
                    </p>
                  </div>

                  <UserRound
                    className="heading-icon"
                    size={28}
                  />
                </div>

                <div className="document-result-summary">
                  <CheckCircle2
                    size={18}
                  />

                  <span>
                    {
                      result.document_count
                    }{" "}
                    client{" "}
                    {result.document_count ===
                    1
                      ? "document"
                      : "documents"}{" "}
                    accepted and processed.
                  </span>
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
                          : Number(value)
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
                          : Number(value)
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
                        ? "The reviewed values were validated and a final FNA workbook was generated."
                        : "Review or correct the values against the client's source documents, then generate the final FNA."}
                    </span>
                  </div>
                </div>

                <button
                  className="primary-button"
                  onClick={
                    handleFinaliseFna
                  }
                  disabled={finalising}
                  type="button"
                >
                  {finalising ? (
                    <>
                      <LoaderCircle
                        className="spin"
                        size={19}
                      />
                      Generating Final FNA
                    </>
                  ) : (
                    <>
                      <ShieldCheck
                        size={19}
                      />
                      {reviewFinalised
                        ? "Regenerate Final FNA"
                        : "Save Corrections & Generate Final FNA"}
                    </>
                  )}
                </button>
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
                    STEP 03
                  </span>

                  <h2>
                    {reviewFinalised
                      ? "Verified FNA Workbook Ready"
                      : "Draft FNA Workbook Ready"}
                  </h2>

                  <p>
                    {reviewFinalised
                      ? "The adviser-reviewed values have been validated and written to a final Royal Square FNA workbook."
                      : "A draft Royal Square FNA workbook was generated from the current extraction. Complete adviser verification above before relying on it."}
                  </p>

                  <small>
                    {
                      result.processed_filename
                    }
                  </small>
                </div>

                <a
                  className="download-button"
                  href={getDownloadUrl(
                    result.download_url
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={19} />
                  {reviewFinalised
                    ? "Download Final FNA"
                    : "Download Draft FNA"}
                </a>
              </section>

              <button
                className="secondary-button"
                onClick={() => {
                  clearFiles();
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                <RefreshCcw
                  size={17}
                />
                Process Another Client
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
    role: PortalRole
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
              Financial Onboarding Portal
            </span>
          </div>
        </div>

        <div className="landing-copy">
          <span className="step-label">
            AFRIHACK 2026 PROTOTYPE
          </span>

          <h1>
            One onboarding journey.
            <br />
            Two purpose-built experiences.
          </h1>

          <p>
            Clients submit their financial
            document pack. Advisers verify,
            correct and finalise the FNA.
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
              Start My Onboarding
            </h2>

            <p>
              Upload your financial
              documents, follow the checklist
              and submit the pack for adviser
              review.
            </p>

            <strong>
              Enter Client Portal →
            </strong>
          </button>

          <button
            className="role-card featured-role"
            onClick={() =>
              onSelect("adviser")
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
              Verify structured information,
              correct values and generate the
              final Royal Square FNA
              workbook.
            </p>

            <strong>
              Enter Adviser Portal →
            </strong>
          </button>
        </div>

        <div className="landing-footnote">
          Prototype note: the client and
          adviser views share the same browser
          session. Demo Mode uses synthetic
          financial data.
        </div>
      </div>
    </div>
  );
}

function ClientPortal({
  files,
  result,
  loading,
  error,
  stage,
  dragActive,
  checklist,
  fileInputRef,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProcess,
  onDragActive,
  onSwitchRole,
}: {
  files: File[];
  result:
    | ProcessDocumentsResponse
    | null;
  loading: boolean;
  error: string | null;
  stage: ProcessingStage;
  dragActive: boolean;
  checklist: {
    key: ChecklistKey;
    label: string;
    hints: string[];
    matched: boolean;
  }[];
  fileInputRef:
    RefObject<HTMLInputElement | null>;
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
  onSwitchRole: (
    role: PortalRole
  ) => void;
}) {
  const submitted =
    stage === "complete" &&
    result !== null;

  return (
    <div className="client-shell">
      <header className="client-nav">
        <div className="landing-brand">
          <div className="brand-mark">
            RS
          </div>

          <div>
            <strong>
              Royal Square
            </strong>
            <span>
              Client Portal
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="client-role-badge">
            CLIENT
          </span>

          <button
            className="role-switch-button"
            onClick={() =>
              onSwitchRole("adviser")
            }
          >
            <ArrowLeftRight
              size={16}
            />
            Adviser View
          </button>
        </div>
      </header>

      <main className="client-main">
        <section className="client-hero">
          <span className="step-label">
            FINANCIAL ONBOARDING
          </span>

          <h1>
            Submit your document pack
          </h1>

          <p>
            Upload the documents requested by
            your adviser. The adviser will
            verify the information before it
            is used for your Financial Needs
            Analysis.
          </p>
        </section>

        <section className="client-safety-note">
          <ShieldCheck size={19} />
          <div>
            <strong>
              Prototype demonstration
            </strong>
            <span>
              Use synthetic or test documents
              only. Do not upload real client
              information for the hackathon
              demo.
            </span>
          </div>
        </section>

        {result?.extraction_mode ===
          "demo" && (
          <section className="demo-banner">
            <div className="demo-icon">
              <Landmark size={20} />
            </div>

            <div>
              <strong>
                DEMO MODE — Synthetic Data
              </strong>

              <p>
                {result.demo_warning}
              </p>
            </div>
          </section>
        )}

        <div className="client-workspace">
          <section className="card">
            <div className="card-heading">
              <div>
                <span className="step-label">
                  DOCUMENTS
                </span>

                <h2>
                  Client Document Pack
                </h2>

                <p>
                  Upload up to five PDF, PNG,
                  JPG or JPEG documents.
                </p>
              </div>

              <Upload
                className="heading-icon"
                size={28}
              />
            </div>

            <DocumentUploader
              files={files}
              loading={loading}
              dragActive={dragActive}
              fileInputRef={fileInputRef}
              processLabel="Submit"
              onAddFiles={onAddFiles}
              onRemoveFile={
                onRemoveFile
              }
              onClearFiles={
                onClearFiles
              }
              onProcess={onProcess}
              onDragActive={
                onDragActive
              }
            />

            {error && (
              <div className="error-message">
                <AlertTriangle
                  size={18}
                />
                {error}
              </div>
            )}
          </section>

          <section className="card checklist-card">
            <div className="card-heading">
              <div>
                <span className="step-label">
                  CHECKLIST
                </span>

                <h2>
                  Requested Documents
                </h2>

                <p>
                  Filenames help the prototype
                  recognise the document type.
                </p>
              </div>

              <FileCheck2
                className="heading-icon"
                size={28}
              />
            </div>

            <div className="client-checklist">
              {checklist.map((item) => (
                <div
                  className={`checklist-row ${
                    item.matched
                      ? "matched"
                      : ""
                  }`}
                  key={item.key}
                >
                  <div className="checklist-status">
                    {item.matched ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <span />
                    )}
                  </div>

                  <strong>
                    {item.label}
                  </strong>

                  <small>
                    {item.matched
                      ? "Added"
                      : "Not added"}
                  </small>
                </div>
              ))}
            </div>

            <div className="checklist-count">
              <strong>
                {files.length} / 5
              </strong>
              <span>
                documents selected
              </span>
            </div>
          </section>
        </div>

        {loading && (
          <section className="client-progress-card">
            <LoaderCircle
              className="spin"
              size={22}
            />

            <div>
              <strong>
                Preparing your submission
              </strong>
              <span>
                The document pack is being
                validated for the adviser
                workflow.
              </span>
            </div>
          </section>
        )}

        {submitted && (
          <section className="client-submission-success">
            <div className="success-icon-large">
              <CheckCircle2
                size={34}
              />
            </div>

            <div>
              <span className="step-label">
                SUBMISSION READY
              </span>

              <h2>
                Your document pack is ready
                for adviser review
              </h2>

              <p>
                {result.document_count}{" "}
                {result.document_count === 1
                  ? "document was"
                  : "documents were"}{" "}
                accepted. In this prototype,
                the adviser can continue the
                case in the shared workspace.
              </p>
            </div>

            <button
              className="download-button"
              onClick={() =>
                onSwitchRole("adviser")
              }
            >
              <UserRound size={18} />
              Open Adviser Workspace
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function DocumentUploader({
  files,
  loading,
  dragActive,
  fileInputRef,
  processLabel,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProcess,
  onDragActive,
}: {
  files: File[];
  loading: boolean;
  dragActive: boolean;
  fileInputRef:
    RefObject<HTMLInputElement | null>;
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
                event.target.files ?? []
              )
            );

            event.target.value = "";
          }}
        />

        <div className="upload-icon">
          <Upload size={28} />
        </div>

        <strong>
          Drag & drop client documents
        </strong>

        <span>
          or click to select multiple files
        </span>

        <small>
          PDF, PNG, JPG or JPEG · Max 5
          documents · 10 MB each
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
              onClick={onClearFiles}
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
                        {file.name}
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
                    <X size={18} />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <button
        className="primary-button"
        disabled={
          files.length === 0 ||
          loading
        }
        onClick={onProcess}
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
  stageOrder: ProcessingStage[];
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
            Follow the document pack through
            the onboarding pipeline.
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
      <span>{label}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
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
        featured ? "featured" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
