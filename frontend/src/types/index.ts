export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  subcategories?: Subcategory[];
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  icon?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  paid_amount?: number;
  balance_amount?: number;
  description?: string;
  reference?: string;
  phone_number?: string;
  date: string;
  project_id?: number;
  category_id: number;
  subcategory_id?: number;
  project?: Project;
  category?: Category;
  subcategory?: Subcategory;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  type: "given" | "received";
  name: string;
  phone_number?: string;
  principal: number;
  interest_rate: number;
  status: "active" | "completed";
  balance: number; // Computed: (principal + total_disbursed) - paid_total
  paid_total: number; // Computed from payments
  total_disbursed: number; // Sum of all disbursements
  start_date: string;
  due_date?: string;
  description?: string;
  project_id?: number;
  project?: Project;
  payments?: LoanPayment[];
  disbursements?: LoanDisbursement[];
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  flow: "in" | "out";
  amount: number;
  paid_on: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanDisbursement {
  id: number;
  loan_id: number;
  amount: number;
  disbursed_on: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
  quarterly_income: number;
  quarterly_expense: number;
  quarterly_net_balance: number;
  income_percentage_change: number;
  expense_percentage_change: number;
  balance_percentage_change: number;
  pending_loans_total: number;
  top_income_categories: Array<{ category: Category; total: number }>;
  top_expense_categories: Array<{ category: Category; total: number }>;
  income_vs_expense: Array<{ date: string; income: number; expense: number }>;
  net_balance_trend: Array<{ date: string; balance: number }>;
  project_breakdown: Array<{ project: Project; income: number; expense: number }>;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

