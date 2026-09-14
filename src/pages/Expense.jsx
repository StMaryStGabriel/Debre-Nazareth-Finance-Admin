import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import AdminLayout from "../components/AdminLayout";
import api from "../services/api";
import styles from "../styles/expense.module.css";

import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiX,
  FiXCircle,
  FiActivity,
  FiAlertCircle,
  FiCreditCard,
  FiDownload,
  FiPrinter,
} from "react-icons/fi";

/* ============================================================
   API
============================================================ */

const EXPENSE_ROUTE = "/expenses";

/* ============================================================
   EXPENSE TYPES
============================================================ */

const EXPENSE_TYPES = [
  "Mortgage",
  "Salary & Wage",
  "Payroll Taxes",
  "Motivations/Incentives",
  "Repair & Maintenance Building",
  "Travel & Allowance",
  "Insurance Building",
  "Mortgage Payoff",
  "Electricity",
  "Gas",
  "Water",
  "Sewer & Storm",
  "Waste Management",
  "Internet",
  "Telephone",
  "Other Supplies",
  "Newaye Kidisat Supplies",
  "Sunday School Supplies",
  "Office Supplies",
  "Real Estate Taxes & Penalties",
  "Payroll Processing",
  "Ground maintenance",
  "Legal & Professional Services",
  "Equipment Purchases",
  "Building & Equipment Purchases",
  "Website",
  "International Festival",
  "Alarm & Security",
  "Reach outs",
  "Youths and Kids",
  "Parking Lot Project",
  "Projector & Speaker",
  "St. Gabriel Holiday Fundraising",
  "Kids & youth School Fundraising",
  "Credit card processing",
  "Cleaning",
  "Other miscellaneous expenses",
];

/* ============================================================
   STATUS OPTIONS
============================================================ */

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected"];

/* ============================================================
   HELPERS
============================================================ */

const getArrayFromResponse = (response, keys = []) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

/* ============================================================
   USD CURRENCY
============================================================ */

const formatCurrency = (amount) => {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

/* ============================================================
   DATE HELPERS
============================================================ */

const getValidDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = getValidDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  const date = getValidDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* ============================================================
   STATUS NORMALIZATION
============================================================ */

const normalizeStatus = (status) => {
  const value = String(status || "Pending")
    .trim()
    .toLowerCase();

  if (value === "approved") {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return "Pending";
};

/* ============================================================
   EXPENSE AMOUNT
============================================================ */

const getExpenseAmount = (expense) => {
  const value = Number(
    expense?.amount ?? expense?.expenseAmount ?? expense?.totalAmount ?? 0,
  );

  return Number.isFinite(value) ? value : 0;
};

/* ============================================================
   EXPENSE TYPE
============================================================ */

const getExpenseType = (expense) => {
  return (
    expense?.expenseType ||
    expense?.type ||
    expense?.category ||
    "Other miscellaneous expenses"
  );
};

/* ============================================================
   DESCRIPTION
============================================================ */

const getExpenseDescription = (expense) => {
  return (
    expense?.description ||
    expense?.note ||
    expense?.notes ||
    expense?.reason ||
    ""
  );
};

/* ============================================================
   REJECTION REASON
============================================================ */

const getRejectionReason = (expense) => {
  const reason =
    expense?.rejectionReason ??
    expense?.rejectReason ??
    expense?.rejectedReason ??
    "";

  return typeof reason === "string"
    ? reason.trim()
    : String(reason || "").trim();
};

/* ============================================================
   EXPENSE DATE
============================================================ */

const getExpenseDate = (expense) => {
  return (
    expense?.expenseDate ||
    expense?.requestedAt ||
    expense?.createdAt ||
    expense?.date
  );
};

/* ============================================================
   REQUESTED BY
============================================================ */

const getRequestedBy = (expense) => {
  const requestedBy = expense?.requestedBy;

  if (typeof requestedBy === "string" && requestedBy.trim()) {
    return requestedBy;
  }

  if (requestedBy && typeof requestedBy === "object") {
    return (
      requestedBy?.name ||
      requestedBy?.fullName ||
      requestedBy?.username ||
      requestedBy?.email ||
      "Administrator"
    );
  }

  return (
    expense?.requestedByName ||
    expense?.createdByName ||
    expense?.createdBy?.name ||
    expense?.createdBy?.fullName ||
    expense?.createdBy?.email ||
    "Administrator"
  );
};

/* ============================================================
   JWT HELPER
============================================================ */

/*
  We do NOT change Login.jsx.

  Login.jsx already stores the JWT token here:

    adminToken

  If adminName is missing or was stored as "Administrator",
  this helper checks the token for the administrator's actual
  name/fullName/username/email.

  This is only a fallback. The normal source remains the
  localStorage administrator information.
*/

const getAdminInfoFromToken = () => {
  try {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const decodedPayload = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map(
          (character) =>
            `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`,
        )
        .join(""),
    );

    const payload = JSON.parse(decodedPayload);

    const id =
      payload?._id ||
      payload?.id ||
      payload?.adminId ||
      payload?.userId ||
      null;

    const name =
      payload?.fullName ||
      payload?.name ||
      payload?.username ||
      payload?.adminName ||
      payload?.user?.fullName ||
      payload?.user?.name ||
      payload?.admin?.fullName ||
      payload?.admin?.name ||
      "";

    const email =
      payload?.email ||
      payload?.adminEmail ||
      payload?.user?.email ||
      payload?.admin?.email ||
      "";

    const role =
      payload?.role ||
      payload?.adminRole ||
      payload?.user?.role ||
      payload?.admin?.role ||
      "main";

    if (!id && !name && !email) {
      return null;
    }

    return {
      id: id ? String(id) : null,
      name: typeof name === "string" ? name.trim() : "",
      email: typeof email === "string" ? email.trim() : "",
      role,
    };
  } catch (error) {
    console.warn("Unable to read administrator information from token.", error);

    return null;
  }
};

/* ============================================================
   CURRENT ADMIN INFORMATION
============================================================ */

/*
  Login.jsx stores:

    adminToken
    adminName
    adminEmail
    adminId
    adminRole
    adminExpiry

  We first use those exact values.

  If adminName is empty or equals the generic "Administrator",
  we also check the JWT token for the real administrator name.

  Login.jsx is NOT changed.
  CreateAdmin.jsx is NOT changed.
*/

const getCurrentAdminInfo = () => {
  try {
    const adminId = localStorage.getItem("adminId");
    const adminName = localStorage.getItem("adminName");
    const adminEmail = localStorage.getItem("adminEmail");
    const adminRole = localStorage.getItem("adminRole");

    const cleanAdminName = adminName?.trim() || "";
    const cleanAdminEmail = adminEmail?.trim() || "";

    /*
      First try the values saved during Login.jsx.
    */

    const localStorageInfo = {
      id: adminId ? String(adminId) : null,
      name: cleanAdminName,
      email: cleanAdminEmail || null,
      role: adminRole || "main",
    };

    /*
      If we have a real name, use it directly.
    */

    if (
      localStorageInfo.name &&
      localStorageInfo.name.toLowerCase() !== "administrator"
    ) {
      return localStorageInfo;
    }

    /*
      If localStorage contains "Administrator", check the
      authenticated JWT for the actual administrator identity.
    */

    const tokenInfo = getAdminInfoFromToken();

    if (tokenInfo) {
      const tokenName = tokenInfo.name?.trim() || "";

      if (tokenName && tokenName.toLowerCase() !== "administrator") {
        return {
          id: localStorageInfo.id || tokenInfo.id || null,
          name: tokenName,
          email: localStorageInfo.email || tokenInfo.email || null,
          role: localStorageInfo.role || tokenInfo.role || "main",
        };
      }

      /*
        Even if the token does not contain a usable name,
        preserve useful ID/email information.
      */

      if (localStorageInfo.id || localStorageInfo.email) {
        return {
          id: localStorageInfo.id || tokenInfo.id || null,
          name: localStorageInfo.name || tokenInfo.name || "",
          email: localStorageInfo.email || tokenInfo.email || null,
          role: localStorageInfo.role || tokenInfo.role || "main",
        };
      }
    }

    /*
      If localStorage has a name but it is "Administrator",
      return it as the final fallback.

      This only happens when neither localStorage nor the
      JWT contains the actual administrator name.
    */

    if (adminId || adminName || adminEmail) {
      return {
        id: adminId ? String(adminId) : null,
        name: cleanAdminName || "Administrator",
        email: cleanAdminEmail || null,
        role: adminRole || "main",
      };
    }
  } catch (error) {
    console.warn("Unable to read current administrator information.", error);
  }

  return {
    id: null,
    name: "Administrator",
    email: null,
    role: null,
  };
};

/* ============================================================
   REQUESTED BY PAYLOAD
============================================================ */

/*
  This creates the requestedBy object sent to the backend.

  Example:

  requestedBy: {
    id: "68xxxxxxxxxxxx",
    name: "Actual Admin Name",
    email: "admin@example.com"
  }
*/

const getRequestedByPayload = () => {
  const adminInfo = getCurrentAdminInfo();

  return {
    id: adminInfo.id,
    name: adminInfo.name,
    email: adminInfo.email,
  };
};

/* ============================================================
   MONTHLY PAYMENT AMOUNT
============================================================ */

const getMonthlyPaymentAmount = (payment) => {
  const amount = Number(
    payment?.amount ??
      payment?.paymentAmount ??
      payment?.monthlyAmount ??
      payment?.paidAmount ??
      payment?.totalAmount ??
      0,
  );

  return Number.isFinite(amount) ? amount : 0;
};

/* ============================================================
   API ERROR
============================================================ */

const getApiError = (error, fallback) => {
  return (
    error?.response?.data?.message || error?.response?.data?.error || fallback
  );
};

/* ============================================================
   COMPONENT
============================================================ */

export default function Expense() {
  const [expenses, setExpenses] = useState([]);

  const [donations, setDonations] = useState([]);

  const [monthlyPayments, setMonthlyPayments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [typeFilter, setTypeFilter] = useState("All");

  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState(null);

  const [form, setForm] = useState({
    expenseType: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  /* ============================================================
     SUCCESS MESSAGE
  ============================================================ */

  const showSuccess = useCallback((message) => {
    setError("");
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }, []);

  /* ============================================================
     ERROR MESSAGE
  ============================================================ */

  const showError = useCallback((message) => {
    setSuccess("");
    setError(message);
  }, []);

  /* ============================================================
     LOAD DATA
  ============================================================ */

  const loadData = useCallback(
    async (refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [expensesResponse, donationsResponse, monthlyPaymentsResponse] =
          await Promise.all([
            api.get(`${EXPENSE_ROUTE}/admin/all`),

            api.get("/donations/admin/all"),

            api.get("/monthly-payments/admin/all"),
          ]);

        const receivedExpenses = getArrayFromResponse(expensesResponse, [
          "expenses",
          "data",
          "results",
        ]);

        const receivedDonations = getArrayFromResponse(donationsResponse, [
          "donations",
          "data",
          "results",
        ]);

        const receivedMonthlyPayments = getArrayFromResponse(
          monthlyPaymentsResponse,
          ["payments", "monthlyPayments", "data", "results"],
        );

        setExpenses(Array.isArray(receivedExpenses) ? receivedExpenses : []);

        setDonations(Array.isArray(receivedDonations) ? receivedDonations : []);

        setMonthlyPayments(
          Array.isArray(receivedMonthlyPayments) ? receivedMonthlyPayments : [],
        );
      } catch (err) {
        console.error("EXPENSE PAGE LOAD ERROR:", err);

        showError(
          getApiError(err, "Unable to load church financial information."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showError],
  );

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ============================================================
     FINANCIAL SUMMARY
  ============================================================ */

  const financialSummary = useMemo(() => {
    /* ----------------------------------------------------------
       APPROVED DONATIONS
    ---------------------------------------------------------- */

    const approvedDonations = donations.filter(
      (donation) => normalizeStatus(donation?.status) === "Approved",
    );

    const donationTotal = approvedDonations.reduce(
      (sum, donation) => sum + Number(donation?.amount || 0),
      0,
    );

    /* ----------------------------------------------------------
       APPROVED MONTHLY PAYMENTS
    ---------------------------------------------------------- */

    const approvedMonthlyPayments = monthlyPayments.filter(
      (payment) => normalizeStatus(payment?.status) === "Approved",
    );

    const monthlyTotal = approvedMonthlyPayments.reduce(
      (sum, payment) => sum + getMonthlyPaymentAmount(payment),
      0,
    );

    /* ----------------------------------------------------------
       EXPENSE STATUS
    ---------------------------------------------------------- */

    const approvedExpenses = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Approved",
    );

    const pendingExpenses = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Pending",
    );

    const rejectedExpenses = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Rejected",
    );

    /* ----------------------------------------------------------
       EXPENSE TOTALS
    ---------------------------------------------------------- */

    const approvedExpenseTotal = approvedExpenses.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    const pendingExpenseTotal = pendingExpenses.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    const rejectedExpenseTotal = rejectedExpenses.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    /* ----------------------------------------------------------
       TOTAL CHURCH MONEY
    ---------------------------------------------------------- */

    const totalChurchIncome = donationTotal + monthlyTotal;

    /* ----------------------------------------------------------
       AVAILABLE BALANCE
    ---------------------------------------------------------- */

    const availableBalance = totalChurchIncome - approvedExpenseTotal;

    return {
      donationTotal,
      monthlyTotal,
      totalChurchIncome,

      approvedExpenseTotal,
      pendingExpenseTotal,
      rejectedExpenseTotal,

      availableBalance,

      donationCount: approvedDonations.length,

      monthlyCount: approvedMonthlyPayments.length,

      approvedExpenseCount: approvedExpenses.length,

      pendingExpenseCount: pendingExpenses.length,

      rejectedExpenseCount: rejectedExpenses.length,
    };
  }, [donations, monthlyPayments, expenses]);

  /* ============================================================
     FILTER EXPENSES
  ============================================================ */

  const filteredExpenses = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const status = normalizeStatus(expense?.status);

      const type = getExpenseType(expense);

      const searchable = [
        type,
        getExpenseDescription(expense),
        getRequestedBy(expense),
        getRejectionReason(expense),
        status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchable.includes(keyword);

      const matchStatus = statusFilter === "All" || status === statusFilter;

      const matchType = typeFilter === "All" || type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [expenses, search, statusFilter, typeFilter]);

  /* ============================================================
     OPEN EXPENSE MODAL
  ============================================================ */

  const openExpenseModal = () => {
    setForm({
      expenseType: "",
      amount: "",
      description: "",
      expenseDate: new Date().toISOString().slice(0, 10),
    });

    setSelectedExpense(null);

    setError("");

    setShowExpenseModal(true);
  };

  /* ============================================================
     CLOSE EXPENSE MODAL
  ============================================================ */

  const closeExpenseModal = () => {
    if (submitting) {
      return;
    }

    setShowExpenseModal(false);

    setSelectedExpense(null);
  };

  /* ============================================================
     FORM UPDATE
  ============================================================ */

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* ============================================================
     SUBMIT EXPENSE
  ============================================================ */

  const submitExpenseRequest = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.expenseType) {
      showError("Please select an expense type.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Please enter a valid expense amount.");
      return;
    }

    if (amount > financialSummary.availableBalance) {
      showError(
        `The requested amount exceeds the available church balance of ${formatCurrency(
          financialSummary.availableBalance,
        )}.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      setError("");

      /* ==========================================================
         REQUESTED BY

         Get the actual currently logged-in administrator.

         Login.jsx stores:

           adminId
           adminName
           adminEmail
           adminRole
           adminToken

         The request sent to the backend is:

         requestedBy: {
           id,
           name,
           email
         }
      ========================================================== */

      const requestedBy = getRequestedByPayload();

      console.log("CURRENT ADMIN INFORMATION:", getCurrentAdminInfo());

      console.log("REQUESTED BY SENT TO BACKEND:", requestedBy);

      const payload = {
        expenseType: form.expenseType,

        amount,

        description: form.description.trim(),

        expenseDate: form.expenseDate,

        status: "Pending",

        requestedBy,
      };

      console.log("CREATE EXPENSE PAYLOAD:", payload);

      const response = await api.post(`${EXPENSE_ROUTE}/admin`, payload);

      const createdExpense =
        response.data?.expense || response.data?.data || response.data;

      if (createdExpense) {
        setExpenses((previous) => [createdExpense, ...previous]);
      } else {
        await loadData(true);
      }

      setShowExpenseModal(false);

      setSelectedExpense(null);

      setForm({
        expenseType: "",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().slice(0, 10),
      });

      showSuccess(
        "Expense request submitted successfully. Please wait for the Main Administration Admin to review it. The request will be approved or rejected after review.",
      );
    } catch (err) {
      console.error("CREATE EXPENSE ERROR:", err);

      showError(getApiError(err, "Unable to submit expense request."));
    } finally {
      setSubmitting(false);
    }
  };

  /* ============================================================
     UPDATE EXPENSE STATUS

     IMPORTANT:

     This page is NOT allowed to approve or reject expenses.

     The buttons remain available so the user can understand
     that the action is restricted.

     NO API request is sent.
  ============================================================ */

  const updateExpenseStatus = async (expense, status) => {
    if (!expense?._id) {
      showError("This expense does not have a database ID.");
      return;
    }

    if (!STATUS_OPTIONS.includes(status)) {
      showError("Invalid expense status.");
      return;
    }

    const action =
      status === "Approved"
        ? "approve"
        : status === "Rejected"
          ? "reject"
          : "change the status of";

    showError(
      `Action restricted — only the Main Administration Admin can ${action} expense requests. You cannot ${action} this request from this page. Please wait for the Main Administration Admin to review the request.`,
    );
  };

  /* ============================================================
     DELETE EXPENSE

     IMPORTANT:

     This page is NOT allowed to delete expenses.

     NO DELETE API request is sent.
  ============================================================ */

  const deleteExpense = async (expense) => {
    if (!expense?._id) {
      showError("This expense does not have a database ID.");
      return;
    }

    showError(
      "Action restricted — only the Main Administration Admin can delete expense requests. You cannot delete this request from this page. Please wait for the Main Administration Admin to review it.",
    );
  };

  /* ============================================================
     STATUS CLASS
  ============================================================ */

  const statusClass = (status) => {
    const value = normalizeStatus(status);

    if (value === "Approved") {
      return styles.approved;
    }

    if (value === "Rejected") {
      return styles.rejected;
    }

    return styles.pending;
  };

  /* ============================================================
     EXPENSE REPORT HELPERS
  ============================================================ */

  const getReportAdminName = () => {
    const adminInfo = getCurrentAdminInfo();
    return adminInfo?.name?.trim() || "Administrator";
  };

  const getReportId = (expense) => {
    if (!expense?._id) {
      return "N/A";
    }

    return String(expense._id);
  };

  const getReportRows = (records) =>
    records.map((expense, index) => ({
      "No.": index + 1,
      "Expense ID": getReportId(expense),
      "Expense Type": getExpenseType(expense),
      "Amount (USD)": Number(getExpenseAmount(expense).toFixed(2)),
      "Description / Reason":
        getExpenseDescription(expense) || "No description provided.",
      "Requested By": getRequestedBy(expense),
      "Expense Date": formatDate(getExpenseDate(expense)),
      Status: normalizeStatus(expense?.status),
      "Rejection Reason": getRejectionReason(expense) || "",
    }));

  const getReportTotals = (records) => {
    const approved = records.filter(
      (expense) => normalizeStatus(expense?.status) === "Approved",
    );
    const pending = records.filter(
      (expense) => normalizeStatus(expense?.status) === "Pending",
    );
    const rejected = records.filter(
      (expense) => normalizeStatus(expense?.status) === "Rejected",
    );

    return {
      total: records.reduce(
        (sum, expense) => sum + getExpenseAmount(expense),
        0,
      ),
      approved: approved.reduce(
        (sum, expense) => sum + getExpenseAmount(expense),
        0,
      ),
      pending: pending.reduce(
        (sum, expense) => sum + getExpenseAmount(expense),
        0,
      ),
      rejected: rejected.reduce(
        (sum, expense) => sum + getExpenseAmount(expense),
        0,
      ),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
    };
  };

  const buildReportTitle = (isIndividual = false) =>
    isIndividual ? "Church Expense Report" : "Church Expense Financial Report";

  const exportExpenseToExcel = (records, isIndividual = false) => {
    if (!Array.isArray(records) || records.length === 0) {
      showError("There is no expense data available to export.");
      return;
    }

    try {
      const adminName = getReportAdminName();
      const reportDate = formatDateTime(new Date());
      const rows = getReportRows(records);
      const totals = getReportTotals(records);

      const reportHeader = [
        ["ST. MARY & ST. GABRIEL ETHIOPIAN ORTHODOX TEWAHEDO CHURCH"],
        [buildReportTitle(isIndividual)],
        ["Report Prepared By", adminName],
        ["Report Date", reportDate],
        ["Records Included", records.length],
        [],
        ["FINANCIAL SUMMARY"],
        ["Total Expense Amount", totals.total],
        ["Approved Expenses", totals.approved],
        ["Pending Expenses", totals.pending],
        ["Rejected Expenses", totals.rejected],
        ["Approved Records", totals.approvedCount],
        ["Pending Records", totals.pendingCount],
        ["Rejected Records", totals.rejectedCount],
        [],
        ["EXPENSE DETAILS"],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(reportHeader);
      XLSX.utils.sheet_add_json(worksheet, rows, {
        origin: `A${reportHeader.length + 1}`,
        skipHeader: false,
      });

      worksheet["!cols"] = [
        { wch: 7 },
        { wch: 26 },
        { wch: 34 },
        { wch: 16 },
        { wch: 48 },
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
        { wch: 42 },
      ];

      const lastRow = reportHeader.length + rows.length;
      const titleRows = [1, 2, 7, reportHeader.length + 1];

      titleRows.forEach((rowNumber) => {
        const cell = worksheet[`A${rowNumber}`];
        if (cell) {
          cell.s = {
            font: { bold: true, sz: rowNumber === 1 ? 16 : 12 },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      });

      for (let row = reportHeader.length + 2; row <= lastRow; row += 1) {
        const amountCell = worksheet[`D${row}`];
        if (amountCell) {
          amountCell.z = "$#,##0.00";
        }
      }

      ["B8", "B9", "B10", "B11"].forEach((cellAddress) => {
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = "$#,##0.00";
        }
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        isIndividual ? "Expense Report" : "All Expenses",
      );

      const safeDate = new Date().toISOString().slice(0, 10);
      const filename = isIndividual
        ? `Expense_Report_${safeDate}.xlsx`
        : `Church_Expense_Report_${safeDate}.xlsx`;

      XLSX.writeFile(workbook, filename);
      showSuccess(
        isIndividual
          ? "Individual expense report exported successfully."
          : "Church expense report exported successfully.",
      );
    } catch (err) {
      console.error("EXPENSE EXCEL EXPORT ERROR:", err);
      showError("Unable to export the expense report to Excel.");
    }
  };

  const printExpenseReport = (records, isIndividual = false) => {
    if (!Array.isArray(records) || records.length === 0) {
      showError("There is no expense data available to print.");
      return;
    }

    const adminName = getReportAdminName();
    const reportDate = formatDateTime(new Date());
    const totals = getReportTotals(records);
    const title = buildReportTitle(isIndividual);

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const rowsHtml = records
      .map(
        (expense, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(getExpenseType(expense))}</td>
            <td class="amount">${escapeHtml(
              formatCurrency(getExpenseAmount(expense)),
            )}</td>
            <td>${escapeHtml(
              getExpenseDescription(expense) || "No description provided.",
            )}</td>
            <td>${escapeHtml(getRequestedBy(expense))}</td>
            <td>${escapeHtml(formatDate(getExpenseDate(expense)))}</td>
            <td><span class="status ${normalizeStatus(
              expense?.status,
            ).toLowerCase()}">${escapeHtml(
              normalizeStatus(expense?.status),
            )}</span></td>
          </tr>
        `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      showError("Please allow pop-ups in your browser to print the report.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #172033;
              background: #fff;
            }
            .report {
              max-width: 1100px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 3px solid #172033;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .eyebrow {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1.8px;
              text-transform: uppercase;
              color: #7b8494;
              margin-bottom: 8px;
            }
            h1 {
              margin: 0;
              font-size: 28px;
              color: #111827;
            }
            .subtitle {
              margin: 8px 0 0;
              color: #667085;
              font-size: 13px;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 22px;
            }
            .meta-card {
              border: 1px solid #e4e7ec;
              border-radius: 10px;
              padding: 12px 14px;
              background: #f8fafc;
            }
            .label {
              display: block;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #667085;
              margin-bottom: 4px;
              font-weight: 700;
            }
            .value {
              font-size: 14px;
              font-weight: 700;
              color: #111827;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 26px;
            }
            .summary-card {
              border: 1px solid #e4e7ec;
              border-radius: 10px;
              padding: 14px;
            }
            .summary-card strong {
              display: block;
              margin-top: 5px;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background: #172033;
              color: #fff;
              text-align: left;
              padding: 10px 8px;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: .5px;
            }
            td {
              border-bottom: 1px solid #e4e7ec;
              padding: 9px 8px;
              vertical-align: top;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .amount {
              font-weight: 700;
              white-space: nowrap;
            }
            .status {
              display: inline-block;
              border-radius: 999px;
              padding: 4px 8px;
              font-weight: 700;
              font-size: 9px;
            }
            .approved { background: #dcfce7; color: #166534; }
            .pending { background: #fef3c7; color: #92400e; }
            .rejected { background: #fee2e2; color: #991b1b; }
            .footer {
              margin-top: 28px;
              padding-top: 14px;
              border-top: 1px solid #d0d5dd;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              color: #667085;
              font-size: 10px;
            }
            @page {
              size: landscape;
              margin: 12mm;
            }
            @media print {
              body { padding: 0; }
              .report { max-width: none; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <main class="report">
            <header class="header">
              <div class="eyebrow">Church Financial Management</div>
              <h1>${escapeHtml(title)}</h1>
              <p class="subtitle">
                Professional financial record prepared for church administration.
              </p>
            </header>

            <section class="meta">
              <div class="meta-card">
                <span class="label">Requested / Reported By</span>
                <span class="value">${escapeHtml(adminName)}</span>
              </div>
              <div class="meta-card">
                <span class="label">Report Generated</span>
                <span class="value">${escapeHtml(reportDate)}</span>
              </div>
              <div class="meta-card">
                <span class="label">Records Included</span>
                <span class="value">${records.length}</span>
              </div>
              <div class="meta-card">
                <span class="label">Currency</span>
                <span class="value">USD</span>
              </div>
            </section>

            <section class="summary">
              <div class="summary-card">
                <span class="label">Total Expenses</span>
                <strong>${escapeHtml(formatCurrency(totals.total))}</strong>
              </div>
              <div class="summary-card">
                <span class="label">Approved</span>
                <strong>${escapeHtml(formatCurrency(totals.approved))}</strong>
              </div>
              <div class="summary-card">
                <span class="label">Pending</span>
                <strong>${escapeHtml(formatCurrency(totals.pending))}</strong>
              </div>
              <div class="summary-card">
                <span class="label">Rejected</span>
                <strong>${escapeHtml(formatCurrency(totals.rejected))}</strong>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Expense Type</th>
                  <th>Amount</th>
                  <th>Description / Reason</th>
                  <th>Requested By</th>
                  <th>Expense Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <footer class="footer">
              <span>Prepared by: ${escapeHtml(adminName)}</span>
              <span>Official Church Financial Record</span>
              <span>${escapeHtml(reportDate)}</span>
            </footer>
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 300);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AdminLayout title="Church Expenses">
      <div className={styles.page}>
        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className={styles.header}>
          <div>
            <div className={styles.eyebrow}>
              <FiActivity />
              Church Financial Management
            </div>

            <h1>Expenses & Church Funds</h1>

            <p>
              Monitor church funds, manage expense requests, and keep track of
              available balance.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? styles.spin : ""} />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => exportExpenseToExcel(expenses)}
              disabled={!expenses.length}
              title="Export all expense records to Excel"
            >
              <FiDownload />
              Export Excel
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => printExpenseReport(expenses)}
              disabled={!expenses.length}
              title="Print all expense records"
            >
              <FiPrinter />
              Print Report
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={openExpenseModal}
            >
              <FiPlus />
              Request Expense
            </button>
          </div>
        </section>

        {/* ======================================================
            ALERTS
        ====================================================== */}

        {error && (
          <div className={styles.errorBanner}>
            <FiAlertCircle />

            <span>{error}</span>

            <button type="button" onClick={() => setError("")}>
              <FiX />
            </button>
          </div>
        )}

        {success && (
          <div className={styles.successBanner}>
            <FiCheckCircle />

            <span>{success}</span>
          </div>
        )}

        {/* ======================================================
            BALANCE
        ====================================================== */}

        <section className={styles.balanceCard}>
          <div className={styles.balanceLeft}>
            <div className={styles.balanceIcon}>
              <FiCreditCard />
            </div>

            <div>
              <span>Available Church Balance</span>

              <strong>
                {loading
                  ? "Loading..."
                  : formatCurrency(financialSummary.availableBalance)}
              </strong>

              <p>Approved church income minus approved expenses</p>
            </div>
          </div>

          <div className={styles.balanceRight}>
            <div>
              <span>Total Church Money</span>

              <strong>
                {formatCurrency(financialSummary.totalChurchIncome)}
              </strong>
            </div>

            <div>
              <span>Approved Expenses</span>

              <strong className={styles.expenseAmount}>
                {formatCurrency(financialSummary.approvedExpenseTotal)}
              </strong>
            </div>
          </div>
        </section>

        {/* ======================================================
            STATISTICS
        ====================================================== */}

        <section className={styles.statsGrid}>
          <article className={`${styles.statCard} ${styles.incomeCard}`}>
            <div className={styles.statTop}>
              <div className={styles.statIcon}>
                <FiDollarSign />
              </div>

              <span>Donations</span>
            </div>

            <strong>{formatCurrency(financialSummary.donationTotal)}</strong>

            <small>{financialSummary.donationCount} approved records</small>
          </article>

          <article className={`${styles.statCard} ${styles.contributionCard}`}>
            <div className={styles.statTop}>
              <div className={styles.statIcon}>
                <FiTrendingUp />
              </div>

              <span>Monthly Contributions</span>
            </div>

            <strong>{formatCurrency(financialSummary.monthlyTotal)}</strong>

            <small>{financialSummary.monthlyCount} approved records</small>
          </article>

          <article className={`${styles.statCard} ${styles.expenseStatCard}`}>
            <div className={styles.statTop}>
              <div className={styles.statIcon}>
                <FiTrendingDown />
              </div>

              <span>Approved Expenses</span>
            </div>

            <strong>
              {formatCurrency(financialSummary.approvedExpenseTotal)}
            </strong>

            <small>
              {financialSummary.approvedExpenseCount} approved requests
            </small>
          </article>

          <article className={`${styles.statCard} ${styles.pendingStatCard}`}>
            <div className={styles.statTop}>
              <div className={styles.statIcon}>
                <FiClock />
              </div>

              <span>Pending Expenses</span>
            </div>

            <strong>
              {formatCurrency(financialSummary.pendingExpenseTotal)}
            </strong>

            <small>
              {financialSummary.pendingExpenseCount} requests waiting
            </small>
          </article>
        </section>

        {/* ======================================================
            FINANCIAL OVERVIEW
        ====================================================== */}

        <section className={styles.breakdownSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>Financial Overview</span>

              <h2>Church Money Summary</h2>
            </div>
          </div>

          <div className={styles.breakdownGrid}>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownIcon}>
                <FiArrowUpCircle />
              </div>

              <div>
                <span>Donations</span>

                <strong>
                  {formatCurrency(financialSummary.donationTotal)}
                </strong>
              </div>
            </div>

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownIcon}>
                <FiArrowUpCircle />
              </div>

              <div>
                <span>Monthly Contributions</span>

                <strong>{formatCurrency(financialSummary.monthlyTotal)}</strong>
              </div>
            </div>

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownIconExpense}>
                <FiArrowDownCircle />
              </div>

              <div>
                <span>Approved Expenses</span>

                <strong>
                  {formatCurrency(financialSummary.approvedExpenseTotal)}
                </strong>
              </div>
            </div>

            <div className={styles.breakdownTotal}>
              <span>Remaining Church Funds</span>

              <strong>
                {formatCurrency(financialSummary.availableBalance)}
              </strong>
            </div>
          </div>
        </section>

        {/* ======================================================
            EXPENSE REQUESTS
        ====================================================== */}

        <section className={styles.expenseSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>Expense Management</span>

              <h2>Expense Requests</h2>
            </div>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={openExpenseModal}
            >
              <FiPlus />
              New Expense
            </button>
          </div>

          {/* ====================================================
              PERMISSION NOTICE
          ==================================================== */}

          <div className={styles.requestNotice}>
            <FiAlertCircle />

            <div>
              <strong>Expense Approval Notice</strong>

              <p>
                You can submit expense requests and monitor their status here.
                Only the Main Administration Admin can approve, reject, or
                delete expense requests. Please wait for the Main Administration
                Admin to review your request.
              </p>
            </div>
          </div>

          {/* FILTERS */}

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <FiSearch />

              <input
                type="text"
                placeholder="Search expense type, description..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className={styles.selectBox}>
              <FiFilter />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All Statuses</option>

                <option value="Pending">Pending</option>

                <option value="Approved">Approved</option>

                <option value="Rejected">Rejected</option>
              </select>

              <FiChevronDown />
            </div>

            <div className={styles.selectBox}>
              <FiFileText />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All Expense Types</option>

                {EXPENSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <FiChevronDown />
            </div>
          </div>

          {/* DESKTOP TABLE */}

          <div className={styles.tableWrapper}>
            {loading ? (
              <div className={styles.loadingState}>
                <FiRefreshCw className={styles.spin} />

                <span>Loading expense information...</span>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FiFileText />
                </div>

                <h3>No expense requests found</h3>

                <p>
                  Expense requests will appear here after an administrator
                  submits one.
                </p>

                <button type="button" onClick={openExpenseModal}>
                  <FiPlus />
                  Request an Expense
                </button>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Expense Type</th>

                    <th>Amount</th>

                    <th>Description</th>

                    <th>Requested By</th>

                    <th>Date</th>

                    <th>Status</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExpenses.map((expense) => {
                    const status = normalizeStatus(expense.status);

                    return (
                      <tr
                        key={
                          expense._id ||
                          `${getExpenseType(
                            expense,
                          )}-${getExpenseDate(expense)}`
                        }
                      >
                        <td>
                          <div className={styles.typeCell}>
                            <div className={styles.typeIcon}>
                              <FiFileText />
                            </div>

                            <strong>{getExpenseType(expense)}</strong>
                          </div>
                        </td>

                        <td>
                          <strong className={styles.amountCell}>
                            {formatCurrency(getExpenseAmount(expense))}
                          </strong>
                        </td>

                        <td>
                          <span className={styles.descriptionCell}>
                            {getExpenseDescription(expense) || "No description"}
                          </span>

                          {status === "Rejected" &&
                            getRejectionReason(expense) && (
                              <div
                                style={{
                                  marginTop: "6px",
                                  fontSize: "12px",
                                  lineHeight: "1.4",
                                  color: "#b91c1c",
                                }}
                              >
                                <strong>Rejection:</strong>{" "}
                                {getRejectionReason(expense)}
                              </div>
                            )}
                        </td>

                        <td>{getRequestedBy(expense)}</td>

                        <td>
                          <div className={styles.dateCell}>
                            <FiCalendar />

                            {formatDate(getExpenseDate(expense))}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`${styles.status} ${statusClass(
                              status,
                            )}`}
                          >
                            {status === "Approved" && <FiCheckCircle />}

                            {status === "Pending" && <FiClock />}

                            {status === "Rejected" && <FiXCircle />}

                            {status}
                          </span>
                        </td>

                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.viewButton}
                              onClick={() => setSelectedExpense(expense)}
                              title="View expense"
                            >
                              <FiFileText />
                            </button>

                            <button
                              type="button"
                              className={styles.viewButton}
                              onClick={() =>
                                exportExpenseToExcel([expense], true)
                              }
                              title="Export individual expense report to Excel"
                            >
                              <FiDownload />
                            </button>

                            <button
                              type="button"
                              className={styles.viewButton}
                              onClick={() =>
                                printExpenseReport([expense], true)
                              }
                              title="Print individual expense report"
                            >
                              <FiPrinter />
                            </button>

                            {status !== "Approved" && (
                              <button
                                type="button"
                                className={styles.approveButton}
                                onClick={() =>
                                  updateExpenseStatus(expense, "Approved")
                                }
                                title="Approve expense - Main Administration Admin only"
                              >
                                <FiCheck />
                              </button>
                            )}

                            {status !== "Rejected" && (
                              <button
                                type="button"
                                className={styles.rejectButton}
                                onClick={() =>
                                  updateExpenseStatus(expense, "Rejected")
                                }
                                title="Reject expense - Main Administration Admin only"
                              >
                                <FiX />
                              </button>
                            )}

                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => deleteExpense(expense)}
                              title="Delete expense - Main Administration Admin only"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ====================================================
              MOBILE LIST
          ==================================================== */}

          {!loading && filteredExpenses.length > 0 && (
            <div className={styles.mobileList}>
              {filteredExpenses.map((expense) => {
                const status = normalizeStatus(expense.status);

                return (
                  <article
                    key={`mobile-${expense._id || getExpenseDate(expense)}`}
                    className={styles.mobileCard}
                  >
                    <div className={styles.mobileHeader}>
                      <div className={styles.mobileType}>
                        <div className={styles.typeIcon}>
                          <FiFileText />
                        </div>

                        <div>
                          <strong>{getExpenseType(expense)}</strong>

                          <span>{formatDate(getExpenseDate(expense))}</span>
                        </div>
                      </div>

                      <span
                        className={`${styles.status} ${statusClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className={styles.mobileAmount}>
                      {formatCurrency(getExpenseAmount(expense))}
                    </div>

                    <div className={styles.mobileDetails}>
                      <div>
                        <span>Description</span>

                        <strong>
                          {getExpenseDescription(expense) || "No description"}
                        </strong>
                      </div>

                      <div>
                        <span>Requested By</span>

                        <strong>{getRequestedBy(expense)}</strong>
                      </div>

                      {status === "Rejected" && getRejectionReason(expense) && (
                        <div>
                          <span>Rejection Reason</span>

                          <strong
                            style={{
                              color: "#b91c1c",
                            }}
                          >
                            {getRejectionReason(expense)}
                          </strong>
                        </div>
                      )}
                    </div>

                    <div className={styles.mobileActions}>
                      <button
                        type="button"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <FiFileText />
                        View
                      </button>

                      {status !== "Approved" && (
                        <button
                          type="button"
                          className={styles.mobileApprove}
                          onClick={() =>
                            updateExpenseStatus(expense, "Approved")
                          }
                        >
                          <FiCheck />
                          Approve
                        </button>
                      )}

                      {status !== "Rejected" && (
                        <button
                          type="button"
                          className={styles.mobileReject}
                          onClick={() =>
                            updateExpenseStatus(expense, "Rejected")
                          }
                        >
                          <FiX />
                          Reject
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================================================
            CREATE EXPENSE MODAL
        ====================================================== */}

        {showExpenseModal && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !submitting) {
                closeExpenseModal();
              }
            }}
          >
            <div className={styles.modal}>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeExpenseModal}
                disabled={submitting}
              >
                <FiX />
              </button>

              <div className={styles.modalHeader}>
                <div className={styles.modalIcon}>
                  <FiDollarSign />
                </div>

                <div>
                  <span>Church Expense</span>

                  <h2>Request an Expense</h2>

                  <p>
                    Submit an expense request for church administration review.
                  </p>
                </div>
              </div>

              {/* BALANCE */}

              <div className={styles.requestNotice}>
                <FiCreditCard />

                <div>
                  <strong>Available Church Balance</strong>

                  <p>
                    {formatCurrency(financialSummary.availableBalance)} is
                    currently available after approved expenses.
                  </p>
                </div>
              </div>

              <form className={styles.form} onSubmit={submitExpenseRequest}>
                {/* EXPENSE TYPE */}

                <div className={styles.formGroup}>
                  <label htmlFor="expenseType">Expense Type</label>

                  <div className={styles.formSelect}>
                    <select
                      id="expenseType"
                      value={form.expenseType}
                      onChange={(event) =>
                        updateForm("expenseType", event.target.value)
                      }
                      required
                    >
                      <option value="">Select expense type</option>

                      {EXPENSE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <FiChevronDown />
                  </div>
                </div>

                {/* AMOUNT + DATE */}

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="expenseAmount">Amount</label>

                    <div className={styles.amountInput}>
                      <span>$</span>

                      <input
                        id="expenseAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(event) =>
                          updateForm("amount", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="expenseDate">Expense Date</label>

                    <div className={styles.dateInput}>
                      <FiCalendar />

                      <input
                        id="expenseDate"
                        type="date"
                        value={form.expenseDate}
                        onChange={(event) =>
                          updateForm("expenseDate", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}

                <div className={styles.formGroup}>
                  <label htmlFor="expenseDescription">
                    Description / Reason
                  </label>

                  <textarea
                    id="expenseDescription"
                    rows="4"
                    placeholder="Describe what this expense is for..."
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                  />
                </div>

                {/* PENDING NOTICE */}

                <div className={styles.requestNotice}>
                  <FiClock />

                  <div>
                    <strong>Expense Request</strong>

                    <p>
                      Your request will be submitted as pending. Please wait for
                      the Main Administration Admin to review and approve or
                      reject the request.
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={closeExpenseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <FiRefreshCw className={styles.spin} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiPlus />
                        Submit Expense
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================
            DETAILS MODAL
        ====================================================== */}

        {selectedExpense && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedExpense(null);
              }
            }}
          >
            <div className={styles.detailsModal}>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedExpense(null)}
              >
                <FiX />
              </button>

              <div className={styles.detailsHeader}>
                <div className={styles.detailsIcon}>
                  <FiFileText />
                </div>

                <div>
                  <span>Expense Request</span>

                  <h2>{getExpenseType(selectedExpense)}</h2>

                  <p>{formatDateTime(getExpenseDate(selectedExpense))}</p>
                </div>
              </div>

              <div className={styles.detailAmount}>
                <span>Requested Amount</span>

                <strong>
                  {formatCurrency(getExpenseAmount(selectedExpense))}
                </strong>
              </div>

              <div className={styles.detailGrid}>
                <div>
                  <span>Expense Type</span>

                  <strong>{getExpenseType(selectedExpense)}</strong>
                </div>

                <div>
                  <span>Status</span>

                  <strong>
                    <span
                      className={`${styles.status} ${statusClass(
                        selectedExpense.status,
                      )}`}
                    >
                      {normalizeStatus(selectedExpense.status)}
                    </span>
                  </strong>
                </div>

                <div>
                  <span>Requested By</span>

                  <strong>{getRequestedBy(selectedExpense)}</strong>
                </div>

                <div>
                  <span>Expense Date</span>

                  <strong>{formatDate(getExpenseDate(selectedExpense))}</strong>
                </div>
              </div>

              <div className={styles.detailDescription}>
                <span>Description / Reason</span>

                <p>
                  {getExpenseDescription(selectedExpense) ||
                    "No description provided."}
                </p>
              </div>

              {/* ==================================================
                  REJECTION REASON
              ================================================== */}

              {normalizeStatus(selectedExpense.status) === "Rejected" &&
                getRejectionReason(selectedExpense) && (
                  <div className={styles.requestNotice}>
                    <FiXCircle />

                    <div>
                      <strong>Reason for Rejection</strong>

                      <p>{getRejectionReason(selectedExpense)}</p>
                    </div>
                  </div>
                )}

              {/* ==================================================
                  PERMISSION NOTICE
              ================================================== */}

              <div className={styles.requestNotice}>
                <FiAlertCircle />

                <div>
                  <strong>Main Administration Admin Review</strong>

                  <p>
                    Only the Main Administration Admin can approve, reject, or
                    delete this expense request. Actions from this page are
                    restricted.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "18px",
                }}
              >
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => exportExpenseToExcel([selectedExpense], true)}
                >
                  <FiDownload />
                  Export Excel Report
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => printExpenseReport([selectedExpense], true)}
                >
                  <FiPrinter />
                  Print Report
                </button>
              </div>

              <div className={styles.detailActions}>
                {normalizeStatus(selectedExpense.status) !== "Approved" && (
                  <button
                    type="button"
                    className={styles.approveLarge}
                    onClick={() =>
                      updateExpenseStatus(selectedExpense, "Approved")
                    }
                  >
                    <FiCheck />
                    Approve Expense
                  </button>
                )}

                {normalizeStatus(selectedExpense.status) !== "Rejected" && (
                  <button
                    type="button"
                    className={styles.rejectLarge}
                    onClick={() =>
                      updateExpenseStatus(selectedExpense, "Rejected")
                    }
                  >
                    <FiX />
                    Reject Expense
                  </button>
                )}

                <button
                  type="button"
                  className={styles.deleteLarge}
                  onClick={() => deleteExpense(selectedExpense)}
                >
                  <FiTrash2 />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
