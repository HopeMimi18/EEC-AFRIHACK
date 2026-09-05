import { useState } from "react";
import {
  Download,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";

import {
  getDownloadUrl,
  processDocument,
  type ProcessDocumentResponse,
} from "./lib/api";

function App() {
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] =
    useState<ProcessDocumentResponse | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleProcess() {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await processDocument(file);
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const client =
    result?.extracted_data.client_demographics;

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Royal Square Portal</h1>

      <p>
        Financial Onboarding & FNA Automation
      </p>

      {result?.extraction_mode === "demo" && (
        <div
          style={{
            padding: "12px",
            marginBottom: "24px",
            border: "1px solid #d4a017",
            borderRadius: "8px",
          }}
        >
          <strong>DEMO MODE</strong>

          <p style={{ marginBottom: 0 }}>
            {result.demo_warning}
          </p>
        </div>
      )}

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2>Upload Client Document</h2>

        <Upload size={24} />

        <br />

        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => {
            setFile(
              event.target.files?.[0] ?? null
            );
          }}
        />

        {file && (
          <p>
            <FileText size={16} /> {file.name}
          </p>
        )}

        <button
          onClick={handleProcess}
          disabled={!file || loading}
          style={{
            marginTop: "16px",
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          {loading ? (
            <>
              <LoaderCircle size={16} />
              Processing...
            </>
          ) : (
            "Process Document"
          )}
        </button>

        {error && (
          <p style={{ marginTop: "16px" }}>
            Error: {error}
          </p>
        )}
      </section>

      {result && client && (
        <>
          <section
            style={{
              marginTop: "24px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2>Adviser Review</h2>

            <p>
              <strong>Client:</strong>{" "}
              {client.full_name ?? "Not provided"}
            </p>

            <p>
              <strong>Employer:</strong>{" "}
              {client.employer ?? "Not provided"}
            </p>

            <p>
              <strong>Gross Income:</strong>{" "}
              R
              {(
                client.gross_monthly_income ?? 0
              ).toLocaleString()}
            </p>

            <p>
              <strong>Net Income:</strong>{" "}
              R
              {(
                client.net_monthly_income ?? 0
              ).toLocaleString()}
            </p>
          </section>

          <section
            style={{
              marginTop: "24px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2>Financial Summary</h2>

            <p>
              Total Assets:{" "}
              <strong>
                R
                {result.summary.total_assets.toLocaleString()}
              </strong>
            </p>

            <p>
              Total Liabilities:{" "}
              <strong>
                R
                {result.summary.total_liabilities.toLocaleString()}
              </strong>
            </p>

            <p>
              Net Worth:{" "}
              <strong>
                R
                {result.summary.net_worth.toLocaleString()}
              </strong>
            </p>

            <p>
              Household Expenses:{" "}
              <strong>
                R
                {result.summary.total_household_expenses.toLocaleString()}
              </strong>
            </p>

            <p>
              Disposable Income:{" "}
              <strong>
                R
                {result.summary.monthly_disposable_income.toLocaleString()}
              </strong>
            </p>

            <a
              href={getDownloadUrl(
                result.download_url
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} />
              Download FNA Workbook
            </a>
          </section>
        </>
      )}
    </main>
  );
}

export default App;