import apiClient from "@/lib/api-client";
import type {
  User,
  Project,
  Category,
  Subcategory,
  Transaction,
  Loan,
  LoanPayment,
  LoanDisbursement,
  DashboardSummary,
  Setting,
  PaginatedResponse,
} from "@/types";

// Auth
export const authApi = {
  login: async (email: string, password: string, remember: boolean = false) => {
    const { data } = await apiClient.post("/login", { email, password, remember });
    return data;
  },
  logout: async () => {
    await apiClient.post("/logout");
  },
  me: async (): Promise<User> => {
    const { data } = await apiClient.get("/me");
    return data;
  },
};

// Dashboard
export const dashboardApi = {
  summary: async (params?: { start_date?: string; end_date?: string; period?: string }): Promise<DashboardSummary> => {
    const { data } = await apiClient.get("/dashboard/summary", { params });
    // Laravel Resources wrap in 'data' key, but axios also extracts 'data'
    // So if data.data exists, use that, otherwise use data directly
    return data?.data || data;
  },
};

// Projects
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data } = await apiClient.get("/projects");
    // Laravel Resource collections wrap in 'data' key, but axios also extracts 'data'
    // So if data.data exists, use that, otherwise use data directly
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  },
  get: async (id: number): Promise<Project> => {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },
  create: async (project: { name: string; color: string }): Promise<Project> => {
    const { data } = await apiClient.post("/projects", project);
    return data;
  },
  update: async (id: number, project: { name?: string; color?: string; is_active?: boolean }): Promise<Project> => {
    const { data } = await apiClient.put(`/projects/${id}`, project);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};

// Categories
export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await apiClient.get("/categories");
    // Laravel Resource collections wrap in 'data' key, but axios also extracts 'data'
    // So if data.data exists, use that, otherwise use data directly
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  },
  get: async (id: number): Promise<Category> => {
    const { data } = await apiClient.get(`/categories/${id}`);
    return data;
  },
  create: async (category: { name: string; type: "income" | "expense"; icon?: string; color?: string }): Promise<Category> => {
    const { data } = await apiClient.post("/categories", category);
    return data;
  },
  update: async (id: number, category: { name?: string; icon?: string; color?: string }): Promise<Category> => {
    const { data } = await apiClient.put(`/categories/${id}`, category);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};

// Subcategories
export const subcategoriesApi = {
  list: async (categoryId?: number): Promise<Subcategory[]> => {
    const { data } = await apiClient.get("/subcategories", { params: { category_id: categoryId } });
    // Laravel Resource collections wrap in 'data' key, but axios also extracts 'data'
    // So if data.data exists, use that, otherwise use data directly
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  },
  get: async (id: number): Promise<Subcategory> => {
    const { data } = await apiClient.get(`/subcategories/${id}`);
    return data;
  },
  create: async (subcategory: { name: string; category_id: number; icon?: string; color?: string }): Promise<Subcategory> => {
    const { data } = await apiClient.post("/subcategories", subcategory);
    return data;
  },
  update: async (id: number, subcategory: { name?: string; icon?: string; color?: string }): Promise<Subcategory> => {
    const { data } = await apiClient.put(`/subcategories/${id}`, subcategory);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/subcategories/${id}`);
  },
  map: async (subcategoryId: number, categoryId: number): Promise<Subcategory> => {
    const { data } = await apiClient.post(`/subcategories/${subcategoryId}/map`, { category_id: categoryId });
    return data;
  },
  unmap: async (subcategoryId: number): Promise<void> => {
    await apiClient.post(`/subcategories/${subcategoryId}/unmap`);
  },
};

// Transactions
export const transactionsApi = {
  list: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    type?: "income" | "expense";
    category_id?: number;
    subcategory_id?: number;
    project_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get("/transactions", { params });
    const data = response.data;
    
    // Laravel Resource Collections preserve pagination metadata
    // Structure might be: { data: [...], current_page, last_page, total, ... }
    // OR: { data: [...], meta: { current_page, last_page, total, ... } }
    if (data && typeof data === 'object') {
      // If metadata is in 'meta' object, extract it
      if (data.meta && typeof data.meta === 'object') {
        return {
          data: data.data || [],
          current_page: data.meta.current_page || 1,
          last_page: data.meta.last_page || 1,
          per_page: data.meta.per_page || 15,
          total: data.meta.total || 0,
        } as PaginatedResponse<Transaction>;
      }
      // If metadata is at top level, use it directly
      if (typeof data.current_page !== 'undefined' || typeof data.total !== 'undefined') {
        return data as PaginatedResponse<Transaction>;
      }
      // If only data array exists, try to find metadata elsewhere
      if (Array.isArray(data.data) && data.data.length > 0) {
        // This shouldn't happen with Laravel pagination, but handle it
        return {
          data: data.data,
          current_page: 1,
          last_page: 1,
          per_page: data.data.length,
          total: data.data.length,
        } as PaginatedResponse<Transaction>;
      }
    }
    
    // Fallback
    return {
      data: Array.isArray(data) ? data : (data?.data || []),
      current_page: data?.current_page || 1,
      last_page: data?.last_page || 1,
      per_page: data?.per_page || 15,
      total: data?.total || 0,
    } as PaginatedResponse<Transaction>;
  },
  get: async (id: number): Promise<Transaction> => {
    const { data } = await apiClient.get(`/transactions/${id}`);
    return data;
  },
  create: async (transaction: {
    type: "income" | "expense";
    amount: number;
    paid_amount?: number;
    description?: string;
    reference?: string;
    phone_number?: string;
    date: string;
    project_id?: number;
    category_id: number;
    subcategory_id?: number;
  }): Promise<Transaction> => {
    const { data } = await apiClient.post("/transactions", { ...transaction, date: transaction.date });
    return data;
  },
  update: async (
    id: number,
    transaction: {
      type?: "income" | "expense";
      amount?: number;
      paid_amount?: number;
      description?: string;
      reference?: string;
      phone_number?: string;
      date?: string;
      project_id?: number;
      category_id?: number;
      subcategory_id?: number;
    }
  ): Promise<Transaction> => {
    const { data } = await apiClient.put(`/transactions/${id}`, transaction);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};

// Loans
export const loansApi = {
  list: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    type?: "given" | "received";
    status?: "active" | "completed";
    project_id?: number;
  }): Promise<PaginatedResponse<Loan>> => {
    const response = await apiClient.get("/loans", { params });
    const data = response.data;
    
    // Laravel Resource Collections preserve pagination metadata
    // Structure might be: { data: [...], current_page, last_page, total, ... }
    // OR: { data: [...], meta: { current_page, last_page, total, ... } }
    if (data && typeof data === 'object') {
      // If metadata is in 'meta' object, extract it
      if (data.meta && typeof data.meta === 'object') {
        return {
          data: data.data || [],
          current_page: data.meta.current_page || 1,
          last_page: data.meta.last_page || 1,
          per_page: data.meta.per_page || 15,
          total: data.meta.total || 0,
        } as PaginatedResponse<Loan>;
      }
      // If metadata is at top level, use it directly
      if (typeof data.current_page !== 'undefined' || typeof data.total !== 'undefined') {
        return data as PaginatedResponse<Loan>;
      }
      // If only data array exists, try to find metadata elsewhere
      if (Array.isArray(data.data) && data.data.length > 0) {
        // This shouldn't happen with Laravel pagination, but handle it
        return {
          data: data.data,
          current_page: 1,
          last_page: 1,
          per_page: data.data.length,
          total: data.data.length,
        } as PaginatedResponse<Loan>;
      }
    }
    
    // Fallback
    return {
      data: Array.isArray(data) ? data : (data?.data || []),
      current_page: data?.current_page || 1,
      last_page: data?.last_page || 1,
      per_page: data?.per_page || 15,
      total: data?.total || 0,
    } as PaginatedResponse<Loan>;
  },
  get: async (id: number): Promise<Loan> => {
    const { data } = await apiClient.get(`/loans/${id}`);
    // Laravel Resource responses may wrap in 'data' key
    // If data.data exists and is an object, use that, otherwise use data directly
    return (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : data;
  },
  create: async (loan: {
    type: "given" | "received";
    name: string;
    phone_number?: string;
    principal: number;
    interest_rate?: number;
    start_date?: string;
    due_date?: string;
    description?: string;
    project_id?: number;
  }): Promise<Loan> => {
    const { data } = await apiClient.post("/loans", loan);
    return data;
  },
  update: async (
    id: number,
    loan: {
      name?: string;
      phone_number?: string;
      status?: "active" | "completed";
      principal?: number;
      interest_rate?: number;
      start_date?: string;
      due_date?: string;
      description?: string;
      project_id?: number;
    }
  ): Promise<Loan> => {
    const { data } = await apiClient.put(`/loans/${id}`, loan);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/loans/${id}`);
  },
  payments: {
    list: async (loanId: number): Promise<LoanPayment[]> => {
      const { data } = await apiClient.get(`/loans/${loanId}/payments`);
      return data;
    },
    create: async (loanId: number, payment: { amount: number; paid_on: string; flow: "in" | "out"; note?: string }): Promise<LoanPayment> => {
      const { data } = await apiClient.post(`/loans/${loanId}/payments`, payment);
      return data;
    },
    update: async (loanId: number, paymentId: number, payment: { amount?: number; paid_on?: string; flow?: "in" | "out"; note?: string }): Promise<LoanPayment> => {
      const { data } = await apiClient.put(`/loans/${loanId}/payments/${paymentId}`, payment);
      return data;
    },
    delete: async (loanId: number, paymentId: number): Promise<void> => {
      await apiClient.delete(`/loans/${loanId}/payments/${paymentId}`);
    },
  },
  disbursements: {
    create: async (loanId: number, disbursement: { amount: number; disbursed_on: string; note?: string }): Promise<LoanDisbursement> => {
      const { data } = await apiClient.post(`/loans/${loanId}/disbursements`, disbursement);
      // Laravel Resource responses may wrap in 'data' key
      return (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) ? data.data : data;
    },
    update: async (loanId: number, disbursementId: number, disbursement: { amount?: number; disbursed_on?: string; note?: string }): Promise<LoanDisbursement> => {
      const { data } = await apiClient.put(`/loans/${loanId}/disbursements/${disbursementId}`, disbursement);
      return data;
    },
    delete: async (loanId: number, disbursementId: number): Promise<void> => {
      await apiClient.delete(`/loans/${loanId}/disbursements/${disbursementId}`);
    },
  },
};

// Reports
export interface ReportSummary {
  kpis: {
    income: number;
    expense: number;
    net: number;
    count: number;
  };
  filters: {
    type?: string;
    project_id?: number;
    category_id?: number;
    from?: string;
    to?: string;
  };
  transactions: Transaction[];
}

export const reportsApi = {
  summary: async (params?: {
    from?: string;
    to?: string;
    type?: "income" | "expense";
    category_id?: number;
    project_id?: number;
  }): Promise<ReportSummary> => {
    const { data } = await apiClient.get("/reports/summary", { params });
    return data;
  },
  exportCsv: async (params?: {
    from?: string;
    to?: string;
    type?: "income" | "expense";
    category_id?: number;
    project_id?: number;
  }): Promise<Blob> => {
    const { data } = await apiClient.get("/reports/export/csv", {
      params,
      responseType: "blob",
    });
    return data;
  },
  exportPdf: async (params?: {
    from?: string;
    to?: string;
    type?: "income" | "expense";
    category_id?: number;
    project_id?: number;
  }): Promise<Blob> => {
    const { data } = await apiClient.get("/reports/export/pdf", {
      params,
      responseType: "blob",
    });
    return data;
  },
};

// Settings
export const settingsApi = {
  list: async (): Promise<Setting[]> => {
    const { data } = await apiClient.get("/settings");
    return data;
  },
  update: async (settings: Array<{ key: string; value: string; group?: string }>): Promise<Setting[]> => {
    const { data } = await apiClient.put("/settings", { settings });
    return data;
  },
  clearAllData: async (): Promise<{ message: string; transactions_deleted: boolean; loans_deleted: boolean }> => {
    const { data } = await apiClient.post("/settings/clear-all-data");
    return data;
  },
};

// Bulk Import
export interface BulkImportResult {
  successful: number;
  failed: number;
  all_valid: boolean;
  errors: Array<{
    row: number;
    data: any;
    row_data?: any[];
    errors: string[];
  }>;
}

export const bulkImportApi = {
  importTransactions: async (file: File): Promise<BulkImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post("/bulk-import/transactions", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  importLoans: async (file: File): Promise<BulkImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post("/bulk-import/loans", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  downloadTransactionTemplate: () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/bulk-import/transactions/template`, '_blank');
  },
  downloadLoanTemplate: () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    window.open(`${apiUrl}/bulk-import/loans/template`, '_blank');
  },
};

