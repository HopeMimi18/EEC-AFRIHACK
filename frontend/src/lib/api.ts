const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000";

export interface ClientDemographics {
  full_name: string | null;
  id_number: string | null;
  tax_number: string | null;
  marital_status: string | null;
  employer: string | null;
  gross_monthly_income: number | null;
  net_monthly_income: number | null;
}

export interface AssetItem {
  description: string;
  current_value: number;
  institution: string | null;
}

export interface LiabilityItem {
  description: string;
  outstanding_balance: number;
  monthly_instalment: number | null;
  institution: string | null;
}

export interface ExpenseItem {
  description: string;
  monthly_amount: number;
}

export interface FnaData {
  client_demographics: ClientDemographics;

  assets: {
    properties: AssetItem[];
    vehicles: AssetItem[];
    savings: AssetItem[];
    unit_trusts: AssetItem[];
  };

  liabilities: {
    mortgages: LiabilityItem[];
    vehicle_finance: LiabilityItem[];
    personal_loans: LiabilityItem[];
    credit_cards: LiabilityItem[];
  };

  household_expenses: {
    fixed_expenses: ExpenseItem[];
    variable_expenses: ExpenseItem[];
  };
}

export interface FnaSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  total_household_expenses: number;
  monthly_disposable_income: number;
}

export interface ProcessDocumentResponse {
  status: string;
  extraction_mode: "demo" | "live";
  demo_warning: string | null;
  original_filename: string | null;
  extracted_data: FnaData;
  summary: FnaSummary;
  processed_filename: string;
  download_url: string;
}

export async function processDocument(
  file: File
): Promise<ProcessDocumentResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/process-document`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    let message = "Document processing failed.";

    try {
      const error = await response.json();

      if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export function getDownloadUrl(
  relativeUrl: string
): string {
  return `${API_BASE_URL}${relativeUrl}`;
}