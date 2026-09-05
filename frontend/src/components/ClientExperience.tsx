import {
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Flag,
  Gauge,
  Home,
  LogOut,
  MessageCircle,
  PiggyBank,
  ShieldCheck,
  Target,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

import type {
  AuthSession,
  ProcessDocumentsResponse,
} from "../lib/api";

import "./ClientExperience.css";


export type ClientProcessingStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "validating"
  | "generating"
  | "complete";


export type ClientDocumentChecklistItem = {
  key: string;
  label: string;
  hints: string[];
  matched: boolean;
};


type ClientPage =
  | "dashboard"
  | "financial-position"
  | "goals"
  | "documents";


type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: "shield" | "car" | "travel";
};


type MessageItem = {
  id: string;
  kind: "message" | "reminder" | "goal";
  title: string;
  body: string;
  time: string;
  unread: boolean;
};


type FinancialItem = {
  label: string;
  value: number;
};


type Props = {
  session: AuthSession;
  files: File[];
  result: ProcessDocumentsResponse | null;
  loading: boolean;
  error: string | null;
  stage: ClientProcessingStage;
  dragActive: boolean;
  checklist: ClientDocumentChecklistItem[];
  consent: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onProcess: () => void;
  onDragActive: (active: boolean) => void;
  onConsentChange: (value: boolean) => void;
  onLogout: () => void;
};


const DEMO_ASSETS: FinancialItem[] = [
  {
    label: "Primary Residence",
    value: 1_500_000,
  },
  {
    label: "Vehicle",
    value: 280_000,
  },
  {
    label: "Savings",
    value: 120_000,
  },
  {
    label: "Investments",
    value: 250_000,
  },
];


const DEMO_LIABILITIES: FinancialItem[] = [
  {
    label: "Mortgage",
    value: 950_000,
  },
  {
    label: "Vehicle Finance",
    value: 180_000,
  },
  {
    label: "Credit Card",
    value: 15_000,
  },
];


const DEFAULT_GOALS: Goal[] = [
  {
    id: "emergency-fund",
    title: "Emergency Fund",
    targetAmount: 60_000,
    currentAmount: 39_000,
    targetDate: "31 Dec 2026",
    icon: "shield",
  },
  {
    id: "vehicle-deposit",
    title: "New Vehicle Deposit",
    targetAmount: 150_000,
    currentAmount: 57_000,
    targetDate: "30 Jun 2027",
    icon: "car",
  },
  {
    id: "holiday-fund",
    title: "Holiday Fund",
    targetAmount: 30_000,
    currentAmount: 12_500,
    targetDate: "15 Dec 2026",
    icon: "travel",
  },
];


const DEFAULT_MESSAGES: MessageItem[] = [
  {
    id: "adviser-review",
    kind: "message",
    title: "Adviser update",
    body:
      "Your onboarding document pack is available for adviser review.",
    time: "Today",
    unread: true,
  },
  {
    id: "review-reminder",
    kind: "reminder",
    title: "Financial review reminder",
    body:
      "Your next financial wellness review is scheduled for 15 September.",
    time: "In 10 days",
    unread: true,
  },
  {
    id: "goal-progress",
    kind: "goal",
    title: "Goal progress",
    body:
      "You are more than halfway toward your Emergency Fund target.",
    time: "Today",
    unread: true,
  },
];


const DEMO_SUMMARY = {
  total_assets: 2_150_000,
  total_liabilities: 1_145_000,
  net_worth: 1_005_000,
  total_household_expenses: 13_500,
  monthly_disposable_income: 18_000,
};


function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}


function asRecord(value: unknown): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}


function numericValue(
  item: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const raw = item[key];

    if (typeof raw === "number") {
      return raw;
    }

    if (typeof raw === "string") {
      const parsed = Number(
        raw.replace(/[^\d.-]/g, "")
      );

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}


function displayLabel(
  item: Record<string, unknown>,
  fallback: string
) {
  const candidates = [
    "description",
    "name",
    "type",
    "category",
    "creditor",
  ];

  for (const key of candidates) {
    const raw = item[key];

    if (
      typeof raw === "string" &&
      raw.trim()
    ) {
      return raw;
    }
  }

  return fallback
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function flattenFinancialItems(
  container: unknown,
  valueKeys: string[]
): FinancialItem[] {
  const record = asRecord(container);

  if (!record) {
    return [];
  }

  const items: FinancialItem[] = [];

  Object.entries(record).forEach(
    ([category, raw]) => {
      if (!Array.isArray(raw)) {
        return;
      }

      raw.forEach((entry) => {
        const item = asRecord(entry);

        if (!item) {
          return;
        }

        const value = numericValue(
          item,
          valueKeys
        );

        if (value <= 0) {
          return;
        }

        items.push({
          label: displayLabel(
            item,
            category
          ),
          value,
        });
      });
    }
  );

  return items;
}


function loadGoals(email: string): Goal[] {
  try {
    const key = `rs-goals-${email}`;
    const stored =
      localStorage.getItem(key);

    if (!stored) {
      return DEFAULT_GOALS;
    }

    const parsed =
      JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}


function goalProgress(goal: Goal) {
  if (goal.targetAmount <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (goal.currentAmount /
        goal.targetAmount) *
        100
    )
  );
}


export default function ClientExperience({
  session,
  files,
  result,
  loading,
  error,
  stage,
  dragActive,
  checklist,
  consent,
  fileInputRef,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProcess,
  onDragActive,
  onConsentChange,
  onLogout,
}: Props) {
  const [page, setPage] =
    useState<ClientPage>("dashboard");

  const [messagesOpen, setMessagesOpen] =
    useState(false);

  const [messages, setMessages] =
    useState<MessageItem[]>(
      DEFAULT_MESSAGES
    );

  const [goals, setGoals] =
    useState<Goal[]>(() =>
      loadGoals(session.user.email)
    );

  const summary =
    result?.summary ?? DEMO_SUMMARY;

  const client =
    result?.extracted_data
      ?.client_demographics;

  const grossIncome =
    typeof client?.gross_monthly_income ===
    "number"
      ? client.gross_monthly_income
      : 42_000;

  const netIncome =
    typeof client?.net_monthly_income ===
    "number"
      ? client.net_monthly_income
      : 31_500;

  const assets = useMemo(() => {
    const extracted =
      flattenFinancialItems(
        result?.extracted_data?.assets,
        [
          "current_value",
          "value",
          "amount",
        ]
      );

    return extracted.length
      ? extracted
      : DEMO_ASSETS;
  }, [result]);

  const liabilities = useMemo(() => {
    const extracted =
      flattenFinancialItems(
        result?.extracted_data
          ?.liabilities,
        [
          "outstanding_balance",
          "balance",
          "amount",
        ]
      );

    return extracted.length
      ? extracted
      : DEMO_LIABILITIES;
  }, [result]);

  const unreadCount =
    messages.filter(
      (message) => message.unread
    ).length;

  const firstName =
    typeof client?.full_name === "string" &&
    client.full_name.trim()
      ? client.full_name
          .trim()
          .split(/\s+/)[0]
      : session.user.name
          .trim()
          .split(/\s+/)[0];

  const topGoal = [...goals].sort(
    (a, b) =>
      goalProgress(b) -
      goalProgress(a)
  )[0];

  const submitted =
    stage === "complete" &&
    Boolean(result);

  function saveGoals(
    nextGoals: Goal[]
  ) {
    setGoals(nextGoals);

    localStorage.setItem(
      `rs-goals-${session.user.email}`,
      JSON.stringify(nextGoals)
    );
  }

  function updateGoalAmount(
    goalId: string,
    value: string
  ) {
    const amount =
      Number(value);

    if (
      Number.isNaN(amount) ||
      amount < 0
    ) {
      return;
    }

    saveGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              currentAmount:
                amount,
            }
          : goal
      )
    );
  }

  function markMessagesRead() {
    setMessages(
      messages.map((message) => ({
        ...message,
        unread: false,
      }))
    );
  }

  return (
    <div className="client-experience">
      <header className="client-experience-header">
        <button
          className="client-brand-button"
          onClick={() =>
            setPage("dashboard")
          }
        >
          <div className="client-brand-mark">
            RS
          </div>

          <div>
            <strong>
              Royal Square
            </strong>
            <span>
              Financial Wellness
            </span>
          </div>
        </button>

        <nav className="client-main-nav">
          <NavButton
            active={page === "dashboard"}
            icon={<Home size={17} />}
            label="Dashboard"
            onClick={() =>
              setPage("dashboard")
            }
          />

          <NavButton
            active={
              page ===
              "financial-position"
            }
            icon={
              <WalletCards
                size={17}
              />
            }
            label="Financial Position"
            onClick={() =>
              setPage(
                "financial-position"
              )
            }
          />

          <NavButton
            active={page === "goals"}
            icon={<Target size={17} />}
            label="Goals"
            onClick={() =>
              setPage("goals")
            }
          />

          <NavButton
            active={
              page === "documents"
            }
            icon={<FileText size={17} />}
            label="Documents"
            onClick={() =>
              setPage("documents")
            }
          />
        </nav>

        <div className="client-header-actions">
          <button
            className="client-message-button"
            onClick={() =>
              setMessagesOpen(true)
            }
            aria-label="Open messages and reminders"
          >
            <MessageCircle
              size={19}
            />

            {unreadCount > 0 && (
              <span>
                {unreadCount}
              </span>
            )}
          </button>

          <div className="client-profile">
            <div className="client-avatar">
              {firstName
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {firstName}
              </strong>
              <span>
                Client
              </span>
            </div>
          </div>

          <button
            className="client-logout-button"
            onClick={onLogout}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <div className="client-mobile-nav">
        <NavButton
          active={page === "dashboard"}
          icon={<Home size={18} />}
          label="Home"
          onClick={() =>
            setPage("dashboard")
          }
        />

        <NavButton
          active={
            page ===
            "financial-position"
          }
          icon={
            <WalletCards size={18} />
          }
          label="Position"
          onClick={() =>
            setPage(
              "financial-position"
            )
          }
        />

        <NavButton
          active={page === "goals"}
          icon={<Target size={18} />}
          label="Goals"
          onClick={() =>
            setPage("goals")
          }
        />

        <NavButton
          active={
            page === "documents"
          }
          icon={<FileText size={18} />}
          label="Docs"
          onClick={() =>
            setPage("documents")
          }
        />
      </div>

      <main className="client-experience-main">
        {page === "dashboard" && (
          <DashboardPage
            firstName={firstName}
            summary={summary}
            netIncome={netIncome}
            goals={goals}
            topGoal={topGoal}
            messages={messages}
            onNavigate={setPage}
            onOpenMessages={() =>
              setMessagesOpen(true)
            }
          />
        )}

        {page ===
          "financial-position" && (
          <FinancialPositionPage
            summary={summary}
            grossIncome={grossIncome}
            netIncome={netIncome}
            assets={assets}
            liabilities={
              liabilities
            }
          />
        )}

        {page === "goals" && (
          <GoalsPage
            goals={goals}
            onUpdateAmount={
              updateGoalAmount
            }
          />
        )}

        {page === "documents" && (
          <DocumentsPage
            files={files}
            result={result}
            loading={loading}
            error={error}
            dragActive={dragActive}
            checklist={checklist}
            consent={consent}
            submitted={submitted}
            fileInputRef={
              fileInputRef
            }
            onAddFiles={
              onAddFiles
            }
            onRemoveFile={
              onRemoveFile
            }
            onClearFiles={
              onClearFiles
            }
            onProcess={
              onProcess
            }
            onDragActive={
              onDragActive
            }
            onConsentChange={
              onConsentChange
            }
          />
        )}
      </main>

      {messagesOpen && (
        <MessageDrawer
          messages={messages}
          onClose={() =>
            setMessagesOpen(false)
          }
          onMarkAllRead={
            markMessagesRead
          }
        />
      )}
    </div>
  );
}


function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`client-nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}


function DashboardPage({
  firstName,
  summary,
  netIncome,
  goals,
  topGoal,
  messages,
  onNavigate,
  onOpenMessages,
}: {
  firstName: string;
  summary: typeof DEMO_SUMMARY;
  netIncome: number;
  goals: Goal[];
  topGoal: Goal | undefined;
  messages: MessageItem[];
  onNavigate: (
    page: ClientPage
  ) => void;
  onOpenMessages: () => void;
}) {
  const firstReminder =
    messages.find(
      (item) =>
        item.kind === "reminder"
    );

  return (
    <>
      <section className="client-page-heading">
        <div>
          <span>
            CLIENT DASHBOARD
          </span>
          <h1>
            Welcome back, {firstName}
          </h1>
          <p>
            A clear view of your
            financial position, goals
            and upcoming actions.
          </p>
        </div>

        <div className="financial-health-badge">
          <Gauge size={18} />
          Financial snapshot
        </div>
      </section>

      <section className="net-worth-hero">
        <div>
          <span>
            CURRENT NET WORTH
          </span>
          <strong>
            {formatCurrency(
              summary.net_worth
            )}
          </strong>
          <p>
            Assets minus liabilities
          </p>
        </div>

        <button
          onClick={() =>
            onNavigate(
              "financial-position"
            )
          }
        >
          View financial position
          <ChevronRight
            size={17}
          />
        </button>
      </section>

      <section className="dashboard-stat-grid">
        <StatCard
          label="Net Monthly Income"
          value={formatCurrency(
            netIncome
          )}
        />

        <StatCard
          label="Monthly Expenses"
          value={formatCurrency(
            summary
              .total_household_expenses
          )}
        />

        <StatCard
          label="Disposable Income"
          value={formatCurrency(
            summary
              .monthly_disposable_income
          )}
          featured
        />

        <StatCard
          label="Total Liabilities"
          value={formatCurrency(
            summary.total_liabilities
          )}
        />
      </section>

      <section className="dashboard-two-column">
        <div className="client-panel">
          <div className="client-panel-heading">
            <div>
              <span>
                GOAL TRACKING
              </span>
              <h2>
                Your progress
              </h2>
            </div>

            <button
              onClick={() =>
                onNavigate("goals")
              }
            >
              View all
            </button>
          </div>

          {goals
            .slice(0, 2)
            .map((goal) => (
              <GoalPreview
                key={goal.id}
                goal={goal}
              />
            ))}
        </div>

        <div className="client-panel">
          <div className="client-panel-heading">
            <div>
              <span>
                REMINDERS
              </span>
              <h2>
                What needs attention
              </h2>
            </div>

            <button
              onClick={
                onOpenMessages
              }
            >
              Open inbox
            </button>
          </div>

          {firstReminder ? (
            <div className="reminder-card">
              <div className="reminder-icon">
                <Bell size={19} />
              </div>

              <div>
                <strong>
                  {
                    firstReminder.title
                  }
                </strong>
                <p>
                  {
                    firstReminder.body
                  }
                </p>
                <span>
                  {
                    firstReminder.time
                  }
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-client-state">
              No upcoming reminders.
            </div>
          )}

          {topGoal && (
            <div className="goal-nudge">
              <PiggyBank
                size={20}
              />

              <div>
                <strong>
                  Keep going
                </strong>
                <span>
                  Your{" "}
                  {topGoal.title} is{" "}
                  {goalProgress(
                    topGoal
                  )}
                  % complete.
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}


function FinancialPositionPage({
  summary,
  grossIncome,
  netIncome,
  assets,
  liabilities,
}: {
  summary: typeof DEMO_SUMMARY;
  grossIncome: number;
  netIncome: number;
  assets: FinancialItem[];
  liabilities: FinancialItem[];
}) {
  const maxValue = Math.max(
    summary.total_assets,
    summary.total_liabilities,
    1
  );

  return (
    <>
      <section className="client-page-heading">
        <div>
          <span>
            FINANCIAL POSITION
          </span>
          <h1>
            Your financial snapshot
          </h1>
          <p>
            See what you own, what you
            owe and the resulting net
            worth position.
          </p>
        </div>

        <div className="financial-health-badge">
          <ShieldCheck
            size={18}
          />
          Adviser-reviewed data
        </div>
      </section>

      <section className="position-overview-grid">
        <PositionCard
          label="Total Assets"
          value={summary.total_assets}
          icon={<WalletCards size={20} />}
        />

        <PositionCard
          label="Total Liabilities"
          value={
            summary.total_liabilities
          }
          icon={<FileText size={20} />}
        />

        <PositionCard
          label="Net Worth"
          value={summary.net_worth}
          icon={<Gauge size={20} />}
          featured
        />
      </section>

      <section className="client-panel net-worth-equation">
        <div className="equation-item">
          <span>Assets</span>
          <strong>
            {formatCurrency(
              summary.total_assets
            )}
          </strong>
        </div>

        <span className="equation-symbol">
          −
        </span>

        <div className="equation-item">
          <span>
            Liabilities
          </span>
          <strong>
            {formatCurrency(
              summary
                .total_liabilities
            )}
          </strong>
        </div>

        <span className="equation-symbol">
          =
        </span>

        <div className="equation-item result">
          <span>
            Net Worth
          </span>
          <strong>
            {formatCurrency(
              summary.net_worth
            )}
          </strong>
        </div>
      </section>

      <section className="client-panel">
        <div className="client-panel-heading">
          <div>
            <span>
              BALANCE SHEET
            </span>
            <h2>
              Assets vs liabilities
            </h2>
          </div>
        </div>

        <div className="position-bars">
          <PositionBar
            label="Assets"
            value={
              summary.total_assets
            }
            percentage={
              (summary.total_assets /
                maxValue) *
              100
            }
            kind="asset"
          />

          <PositionBar
            label="Liabilities"
            value={
              summary
                .total_liabilities
            }
            percentage={
              (summary
                .total_liabilities /
                maxValue) *
              100
            }
            kind="liability"
          />
        </div>
      </section>

      <section className="financial-breakdown-grid">
        <FinancialList
          title="Assets"
          items={assets}
          total={
            summary.total_assets
          }
          kind="asset"
        />

        <FinancialList
          title="Liabilities"
          items={liabilities}
          total={
            summary.total_liabilities
          }
          kind="liability"
        />
      </section>

      <section className="dashboard-stat-grid income-grid">
        <StatCard
          label="Gross Monthly Income"
          value={formatCurrency(
            grossIncome
          )}
        />

        <StatCard
          label="Net Monthly Income"
          value={formatCurrency(
            netIncome
          )}
        />

        <StatCard
          label="Household Expenses"
          value={formatCurrency(
            summary
              .total_household_expenses
          )}
        />

        <StatCard
          label="Monthly Disposable Income"
          value={formatCurrency(
            summary
              .monthly_disposable_income
          )}
          featured
        />
      </section>
    </>
  );
}


function GoalsPage({
  goals,
  onUpdateAmount,
}: {
  goals: Goal[];
  onUpdateAmount: (
    goalId: string,
    value: string
  ) => void;
}) {
  return (
    <>
      <section className="client-page-heading">
        <div>
          <span>
            FINANCIAL GOALS
          </span>
          <h1>
            Track the future you are building
          </h1>
          <p>
            See how much you have saved,
            what remains and how close you
            are to each target.
          </p>
        </div>

        <div className="financial-health-badge">
          <Target size={18} />
          {goals.length} active goals
        </div>
      </section>

      <section className="goal-grid">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onUpdateAmount={
              onUpdateAmount
            }
          />
        ))}
      </section>

      <section className="client-panel goal-explainer">
        <Flag size={21} />

        <div>
          <strong>
            Goal progress is personal,
            not financial advice
          </strong>
          <p>
            The tracker helps you monitor
            amounts you choose to save.
            Your adviser can help you
            assess whether a target is
            suitable for your broader
            financial plan.
          </p>
        </div>
      </section>
    </>
  );
}


function DocumentsPage({
  files,
  result,
  loading,
  error,
  dragActive,
  checklist,
  consent,
  submitted,
  fileInputRef,
  onAddFiles,
  onRemoveFile,
  onClearFiles,
  onProcess,
  onDragActive,
  onConsentChange,
}: Omit<Props, "session" | "stage" | "onLogout"> & {
  submitted: boolean;
}) {
  return (
    <>
      <section className="client-page-heading">
        <div>
          <span>
            DOCUMENT CENTRE
          </span>
          <h1>
            Manage your onboarding pack
          </h1>
          <p>
            Submit the documents required
            for adviser verification and
            your Financial Needs Analysis.
          </p>
        </div>

        {result && (
          <div className="financial-health-badge">
            <FileCheck2
              size={18}
            />
            Case {result.case_id}
          </div>
        )}
      </section>

      <section className="documents-layout">
        <div className="client-panel">
          <div className="client-panel-heading">
            <div>
              <span>
                UPLOAD
              </span>
              <h2>
                Client Document Pack
              </h2>
            </div>
          </div>

          <div
            className={`client-drop-zone ${
              dragActive
                ? "active"
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
                  event.dataTransfer
                    .files
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

            <div>
              <Upload size={27} />
            </div>

            <strong>
              Drag & drop documents
            </strong>

            <span>
              or click to browse
            </span>

            <small>
              PDF, PNG, JPG or JPEG ·
              Maximum 5 · 10 MB each
            </small>
          </div>

          {files.length > 0 && (
            <div className="client-file-list">
              <div className="client-file-list-header">
                <strong>
                  Selected files
                </strong>

                <button
                  onClick={
                    onClearFiles
                  }
                >
                  Clear all
                </button>
              </div>

              {files.map(
                (file, index) => (
                  <div
                    className="client-file-row"
                    key={`${file.name}-${file.lastModified}`}
                  >
                    <div>
                      <FileText
                        size={18}
                      />
                      <span>
                        <strong>
                          {
                            file.name
                          }
                        </strong>
                        <small>
                          {(
                            file.size /
                            1024 /
                            1024
                          ).toFixed(
                            2
                          )}{" "}
                          MB
                        </small>
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        onRemoveFile(
                          index
                        )
                      }
                    >
                      <X
                        size={17}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <label className="client-consent-box">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) =>
                onConsentChange(
                  event.target
                    .checked
                )
              }
            />

            <span>
              <strong>
                Consent confirmation
              </strong>
              I consent to these test
              documents being processed
              for this prototype
              onboarding workflow.
            </span>
          </label>

          <button
            className="client-primary-button"
            disabled={
              loading ||
              !consent ||
              files.length === 0
            }
            onClick={
              onProcess
            }
          >
            {loading
              ? "Processing..."
              : files.length
                ? `Submit ${files.length} ${
                    files.length === 1
                      ? "Document"
                      : "Documents"
                  }`
                : "Select Documents"}
          </button>

          {error && (
            <div className="client-error-box">
              <AlertTriangle
                size={18}
              />
              {error}
            </div>
          )}

          {submitted && result && (
            <div className="document-success-box">
              <CheckCircle2
                size={21}
              />

              <div>
                <strong>
                  Document pack submitted
                </strong>
                <span>
                  {
                    result.document_count
                  }{" "}
                  document(s) are
                  available for adviser
                  review.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="client-panel">
          <div className="client-panel-heading">
            <div>
              <span>
                CHECKLIST
              </span>
              <h2>
                Requested documents
              </h2>
            </div>
          </div>

          <div className="document-checklist">
            {checklist.map(
              (item) => (
                <div
                  className={
                    item.matched
                      ? "complete"
                      : ""
                  }
                  key={item.key}
                >
                  <span>
                    {item.matched ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <span className="empty-check" />
                    )}
                  </span>

                  <strong>
                    {
                      item.label
                    }
                  </strong>

                  <small>
                    {item.matched
                      ? "Added"
                      : "Not added"}
                  </small>
                </div>
              )
            )}
          </div>

          {result && (
            <div className="case-status-card">
              <span>
                CASE STATUS
              </span>
              <strong>
                {result.case_status.replaceAll(
                  "_",
                  " "
                )}
              </strong>

              <p>
                Compliance readiness:{" "}
                <b>
                  {
                    result
                      .compliance_readiness
                      .overall_status
                  }
                </b>
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}


function MessageDrawer({
  messages,
  onClose,
  onMarkAllRead,
}: {
  messages: MessageItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="message-drawer-overlay">
      <button
        className="message-drawer-backdrop"
        onClick={onClose}
        aria-label="Close messages"
      />

      <aside className="message-drawer">
        <div className="message-drawer-header">
          <div>
            <span>
              CLIENT INBOX
            </span>
            <h2>
              Messages & Reminders
            </h2>
          </div>

          <button
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <button
          className="mark-read-button"
          onClick={
            onMarkAllRead
          }
        >
          Mark all as read
        </button>

        <div className="message-list">
          {messages.map(
            (message) => (
              <div
                className={`message-item ${
                  message.unread
                    ? "unread"
                    : ""
                }`}
                key={message.id}
              >
                <div className={`message-kind ${message.kind}`}>
                  {message.kind ===
                  "message" ? (
                    <MessageCircle
                      size={18}
                    />
                  ) : message.kind ===
                    "reminder" ? (
                    <Bell
                      size={18}
                    />
                  ) : (
                    <Target
                      size={18}
                    />
                  )}
                </div>

                <div>
                  <div className="message-title-row">
                    <strong>
                      {
                        message.title
                      }
                    </strong>

                    {message.unread && (
                      <span className="unread-dot" />
                    )}
                  </div>

                  <p>
                    {
                      message.body
                    }
                  </p>

                  <small>
                    {
                      message.time
                    }
                  </small>
                </div>
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}


function GoalCard({
  goal,
  onUpdateAmount,
}: {
  goal: Goal;
  onUpdateAmount: (
    goalId: string,
    value: string
  ) => void;
}) {
  const progress =
    goalProgress(goal);

  const remaining =
    Math.max(
      0,
      goal.targetAmount -
        goal.currentAmount
    );

  return (
    <article className="goal-card">
      <div className="goal-card-top">
        <div className="goal-card-icon">
          {goal.icon ===
          "shield" ? (
            <ShieldCheck
              size={22}
            />
          ) : goal.icon ===
            "car" ? (
            <WalletCards
              size={22}
            />
          ) : (
            <Flag size={22} />
          )}
        </div>

        <span>
          {progress}% complete
        </span>
      </div>

      <h2>
        {goal.title}
      </h2>

      <div className="goal-values">
        <strong>
          {formatCurrency(
            goal.currentAmount
          )}
        </strong>

        <span>
          of{" "}
          {formatCurrency(
            goal.targetAmount
          )}
        </span>
      </div>

      <div className="goal-progress-track">
        <div
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <div className="goal-meta-grid">
        <div>
          <span>
            Remaining
          </span>
          <strong>
            {formatCurrency(
              remaining
            )}
          </strong>
        </div>

        <div>
          <span>
            Target date
          </span>
          <strong>
            {
              goal.targetDate
            }
          </strong>
        </div>
      </div>

      <label className="goal-update-field">
        <span>
          Update amount saved
        </span>
        <input
          type="number"
          min="0"
          max={
            goal.targetAmount
          }
          step="100"
          value={
            goal.currentAmount
          }
          onChange={(event) =>
            onUpdateAmount(
              goal.id,
              event.target.value
            )
          }
        />
      </label>
    </article>
  );
}


function GoalPreview({
  goal,
}: {
  goal: Goal;
}) {
  const progress =
    goalProgress(goal);

  return (
    <div className="goal-preview">
      <div className="goal-preview-top">
        <div>
          <strong>
            {goal.title}
          </strong>
          <span>
            {formatCurrency(
              goal.currentAmount
            )}{" "}
            /{" "}
            {formatCurrency(
              goal.targetAmount
            )}
          </span>
        </div>

        <b>
          {progress}%
        </b>
      </div>

      <div className="goal-progress-track">
        <div
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}


function PositionCard({
  label,
  value,
  icon,
  featured = false,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`position-card ${
        featured
          ? "featured"
          : ""
      }`}
    >
      <div>
        {icon}
      </div>

      <span>
        {label}
      </span>

      <strong>
        {formatCurrency(value)}
      </strong>
    </div>
  );
}


function PositionBar({
  label,
  value,
  percentage,
  kind,
}: {
  label: string;
  value: number;
  percentage: number;
  kind:
    | "asset"
    | "liability";
}) {
  return (
    <div className="position-bar-row">
      <div>
        <span>
          {label}
        </span>
        <strong>
          {formatCurrency(
            value
          )}
        </strong>
      </div>

      <div className="position-bar-track">
        <div
          className={kind}
          style={{
            width: `${Math.max(
              5,
              percentage
            )}%`,
          }}
        />
      </div>
    </div>
  );
}


function FinancialList({
  title,
  items,
  total,
  kind,
}: {
  title: string;
  items: FinancialItem[];
  total: number;
  kind:
    | "asset"
    | "liability";
}) {
  return (
    <section className="client-panel financial-list">
      <div className="client-panel-heading">
        <div>
          <span>
            {kind === "asset"
              ? "WHAT YOU OWN"
              : "WHAT YOU OWE"}
          </span>

          <h2>
            {title}
          </h2>
        </div>
      </div>

      <div className="financial-list-items">
        {items.map(
          (item, index) => (
            <div
              key={`${item.label}-${index}`}
            >
              <span>
                {
                  item.label
                }
              </span>
              <strong>
                {formatCurrency(
                  item.value
                )}
              </strong>
            </div>
          )
        )}
      </div>

      <div className="financial-list-total">
        <span>
          Total {title}
        </span>
        <strong>
          {formatCurrency(
            total
          )}
        </strong>
      </div>
    </section>
  );
}


function StatCard({
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
      className={`client-stat-card ${
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
