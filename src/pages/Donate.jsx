import { useCallback, useEffect, useMemo, useState } from "react";

import AdminLayout from "../components/AdminLayout";

import api from "../services/api";

import * as XLSX from "xlsx";

import styles from "../styles/donate.module.css";

import {
  FiHeart,
  FiSearch,
  FiRefreshCw,
  FiDollarSign,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiTrash2,
  FiCheck,
  FiX,
  FiCreditCard,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMessageCircle,
  FiImage,
  FiCopy,
  FiAlertCircle,
  FiFilter,
  FiChevronDown,
  FiPrinter,
  FiDownload,
  FiPlus,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

// Keep Square + Cash only.
const PAYMENT_OPTIONS = ["All", "square", "cash"];

const REVENUE_TYPE_OPTIONS = [
  "4010 Membership",
  "4020 Sunday Collection",
  "4030 Collection Box",
  "4040 Offering/Gift",
  "4050 Newaye Kidisat Shop",
  "4110 Back 40 Fundraising",
  "4120 Mortgage Payoff Fundraising",
  "4130 Parking Fundraising",
  "4140 Reach outs Fundraising",
  "4150 Youth Fundraising",
  "4160 St. Gabriel & St. Mary Holiday Fundraising",
  "4170 Kids & youth School Fundraising",
  "4210 International Festival",
  "4220 Travel reimbursement (Bus)",
  "4230 Other Reimbursement",
  "4260 Investment Income",
  "4270 Other Income",
  "4280 Church Purchase Fundraising",
  "4290 Raffle Ticket",
];

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Number(amount || 0));
};

const formatDate = (date) => {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name = "") => {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join("") || "?"
  );
};

const normalizeStatus = (status) => {
  if (!status) {
    return "Pending";
  }

  const value = String(status).toLowerCase();

  if (value === "approved") {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return "Pending";
};

// ============================================================
// PAYMENT NORMALIZATION
// ============================================================

const normalizePayment = (method) => {
  if (!method) {
    return "square";
  }

  const value = String(method).trim().toLowerCase();

  // Square can sometimes arrive from the backend as card/square_payment.
  if (
    value === "square" ||
    value === "square_payment" ||
    value === "square payment"
  ) {
    return "square";
  }

  // Cash can sometimes arrive as cash_payment/inperson_cash.
  if (
    value === "cash" ||
    value === "cash_payment" ||
    value === "cash payment" ||
    value === "inperson_cash" ||
    value === "in-person cash" ||
    value === "in person cash"
  ) {
    return "cash";
  }

  return value;
};

const paymentLabel = (method) => {
  switch (normalizePayment(method)) {
    case "square":
      return "Square";

    case "cash":
      return "Cash";

    default:
      return method || "Unknown";
  }
};

// ============================================================
// APPROVED BY
// ============================================================
//
// Square donations are automatically authorized by Square.
// Cash donations are recorded/approved by an administrator.
//
// The backend should provide:
// donation.approvedByName
//
// For older donation records that do not have approvedByName,
// we safely show "—" instead of breaking the page.
// ============================================================

const getApprovedBy = (donation) => {
  if (!donation) {
    return "—";
  }

  const payment = normalizePayment(donation.paymentMethod);

  // Square handles its own payment authorization.
  if (payment === "square") {
    return "Square";
  }

  // Only show an approver for an approved cash donation.
  if (normalizeStatus(donation.status) !== "Approved") {
    return "—";
  }

  return (
    donation.approvedByName ||
    donation.approvedBy?.name ||
    donation.approvedBy?.fullName ||
    (typeof donation.approvedBy === "string" ? donation.approvedBy : "") ||
    "—"
  );
};

// ============================================================
// DATE FILTER HELPERS
// ============================================================

const getValidDate = (date) => {
  if (!date) {
    return null;
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
};

const getDonationDateKey = (date) => {
  const value = getValidDate(date);

  if (!value) {
    return "";
  }

  const year = value.getFullYear();

  const month = String(value.getMonth() + 1).padStart(2, "0");

  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDonationYear = (date) => {
  const value = getValidDate(date);

  return value ? String(value.getFullYear()) : "";
};

const getDonationMonth = (date) => {
  const value = getValidDate(date);

  return value ? String(value.getMonth() + 1) : "";
};

const formatMonthFilter = (month) => {
  const found = MONTH_OPTIONS.find(
    (item) => String(item.value) === String(month),
  );

  return found?.label || month;
};

// ============================================================
// PRINT HTML ESCAPE
// ============================================================

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ============================================================
// COMPONENT
// ============================================================

export default function Donate() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [donations, setDonations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [paymentFilter, setPaymentFilter] = useState("All");

  // ==========================================================
  // DATE FILTERS
  // ==========================================================

  // Exact date: YYYY-MM-DD
  const [dateFilter, setDateFilter] = useState("");

  // Month: 1 - 12
  const [monthFilter, setMonthFilter] = useState("All");

  // Year: YYYY
  const [yearFilter, setYearFilter] = useState("All");

  // ==========================================================
  // APPROVER NAME FILTER
  // ==========================================================

  // All = all approvers
  // Square = Square-authorized donations
  // Other values = administrator names
  const [approverFilter, setApproverFilter] = useState("All");

  const [selectedDonation, setSelectedDonation] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  // ============================================================
  // ADD DONATION
  // ============================================================

  const handleAddDonation = () => {
    navigate("/admin/add-donate");
  };

  // ============================================================
  // FETCH DONATIONS
  // ============================================================

  const fetchDonations = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/donations/admin/all");

      console.log("FULL API RESPONSE:", response.data);

      const list = response.data?.donations || response.data?.data || [];

      console.log("DONATION ARRAY:", list);

      setDonations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch donations error:", err);

      setError(
        err.response?.data?.message || "Unable to load donation records.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // ============================================================
  // AVAILABLE YEARS
  // ============================================================

  const availableYears = useMemo(() => {
    const years = new Set();

    donations.forEach((donation) => {
      const year = getDonationYear(donation.createdAt);

      if (year) {
        years.add(year);
      }
    });

    // Always include current year so the filter is useful
    // even if there are no donations yet for that year.
    years.add(String(new Date().getFullYear()));

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [donations]);

  // ============================================================
  // AVAILABLE APPROVERS
  // ============================================================

  const availableApprovers = useMemo(() => {
    const approvers = new Set();

    donations.forEach((donation) => {
      const approver = getApprovedBy(donation);

      if (approver && approver !== "—" && String(approver).trim() !== "") {
        approvers.add(String(approver).trim());
      }
    });

    return Array.from(approvers).sort((a, b) => {
      // Keep Square at the top because it is a system payment
      // authorization rather than an administrator.
      if (a === "Square" && b !== "Square") {
        return -1;
      }

      if (a !== "Square" && b === "Square") {
        return 1;
      }

      return a.localeCompare(b);
    });
  }, [donations]);

  // ============================================================
  // ACTIVE FILTER COUNT
  // ============================================================

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (statusFilter !== "All") {
      count += 1;
    }

    if (paymentFilter !== "All") {
      count += 1;
    }

    if (dateFilter) {
      count += 1;
    }

    if (monthFilter !== "All") {
      count += 1;
    }

    if (yearFilter !== "All") {
      count += 1;
    }

    if (approverFilter !== "All") {
      count += 1;
    }

    return count;
  }, [
    statusFilter,
    paymentFilter,
    dateFilter,
    monthFilter,
    yearFilter,
    approverFilter,
  ]);

  // ============================================================
  // FILTER DONATIONS
  // ============================================================

  const filteredDonations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return donations.filter((donation) => {
      const status = normalizeStatus(donation.status);

      const payment = normalizePayment(donation.paymentMethod);

      const approvedBy = getApprovedBy(donation);

      const searchable = [
        donation.fullName,
        donation.email,
        donation.phone,
        donation.donationId,
        donation.message,
        paymentLabel(payment),
        donation.revenueType,
        approvedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchable.includes(keyword);

      const matchStatus = statusFilter === "All" || status === statusFilter;

      const matchPayment = paymentFilter === "All" || payment === paymentFilter;

      // ========================================================
      // DATE FILTER
      // ========================================================

      const donationDateKey = getDonationDateKey(donation.createdAt);

      const matchDate = !dateFilter || donationDateKey === dateFilter;

      // ========================================================
      // MONTH FILTER
      // ========================================================

      const donationMonth = getDonationMonth(donation.createdAt);

      const matchMonth = monthFilter === "All" || donationMonth === monthFilter;

      // ========================================================
      // YEAR FILTER
      // ========================================================

      const donationYear = getDonationYear(donation.createdAt);

      const matchYear = yearFilter === "All" || donationYear === yearFilter;

      // ========================================================
      // APPROVER NAME FILTER
      // ========================================================

      const matchApprover =
        approverFilter === "All" || approvedBy === approverFilter;

      return (
        matchSearch &&
        matchStatus &&
        matchPayment &&
        matchDate &&
        matchMonth &&
        matchYear &&
        matchApprover
      );
    });
  }, [
    donations,
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
    monthFilter,
    yearFilter,
    approverFilter,
  ]);

  // ============================================================
  // FILTER DESCRIPTION
  // ============================================================

  const filterDescription = useMemo(() => {
    const filters = [];

    if (search.trim()) {
      filters.push(`Search: "${search.trim()}"`);
    }

    if (statusFilter !== "All") {
      filters.push(`Status: ${statusFilter}`);
    }

    if (paymentFilter !== "All") {
      filters.push(`Payment: ${paymentLabel(paymentFilter)}`);
    }

    if (dateFilter) {
      const date = getValidDate(`${dateFilter}T12:00:00`);

      if (date) {
        filters.push(
          `Date: ${date.toLocaleDateString("en-ZA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}`,
        );
      } else {
        filters.push(`Date: ${dateFilter}`);
      }
    }

    if (monthFilter !== "All") {
      filters.push(`Month: ${formatMonthFilter(monthFilter)}`);
    }

    if (yearFilter !== "All") {
      filters.push(`Year: ${yearFilter}`);
    }

    if (approverFilter !== "All") {
      filters.push(`Approved By: ${approverFilter}`);
    }

    return filters.join(" • ");
  }, [
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
    monthFilter,
    yearFilter,
    approverFilter,
  ]);

  // ============================================================
  // STATISTICS
  // ============================================================

  const statistics = useMemo(() => {
    const total = donations.length;

    const approved = donations.filter(
      (item) => normalizeStatus(item.status) === "Approved",
    );

    const pending = donations.filter(
      (item) => normalizeStatus(item.status) === "Pending",
    );

    const rejected = donations.filter(
      (item) => normalizeStatus(item.status) === "Rejected",
    );

    const squareDonations = donations.filter(
      (item) => normalizePayment(item.paymentMethod) === "square",
    );

    const cashDonations = donations.filter(
      (item) => normalizePayment(item.paymentMethod) === "cash",
    );

    const totalAmount = donations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const approvedAmount = approved.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const pendingAmount = pending.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const rejectedAmount = rejected.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const squareAmount = squareDonations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const cashAmount = cashDonations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    return {
      total,

      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,

      totalAmount,
      approvedAmount,
      pendingAmount,
      rejectedAmount,

      squareCount: squareDonations.length,
      cashCount: cashDonations.length,

      squareAmount,
      cashAmount,
    };
  }, [donations]);

  // ============================================================
  // FILTERED STATISTICS
  // ============================================================

  const filteredStatistics = useMemo(() => {
    const approved = filteredDonations.filter(
      (item) => normalizeStatus(item.status) === "Approved",
    );

    const pending = filteredDonations.filter(
      (item) => normalizeStatus(item.status) === "Pending",
    );

    const rejected = filteredDonations.filter(
      (item) => normalizeStatus(item.status) === "Rejected",
    );

    const totalAmount = filteredDonations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const approvedAmount = approved.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const pendingAmount = pending.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const rejectedAmount = rejected.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    return {
      total: filteredDonations.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      totalAmount,
      approvedAmount,
      pendingAmount,
      rejectedAmount,
    };
  }, [filteredDonations]);

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  const updateStatus = async (donation, status) => {
    if (!donation?._id) {
      return;
    }

    try {
      setActionLoading(`${donation._id}-${status}`);

      setError("");

      const response = await api.patch(`/donations/admin/${donation._id}`, {
        status,
      });

      // Some backend responses return { donation },
      // some may return { data: donation }.
      // Support both without changing existing behavior.
      const updatedDonation =
        response.data?.donation || response.data?.data || response.data;

      setDonations((previous) =>
        previous.map((item) => {
          if (item._id !== donation._id) {
            return item;
          }

          return {
            ...item,
            status,
            ...(updatedDonation?.approvedByName !== undefined
              ? {
                  approvedByName: updatedDonation.approvedByName,
                }
              : {}),
          };
        }),
      );

      setSelectedDonation((previous) => {
        if (!previous || previous._id !== donation._id) {
          return previous;
        }

        return {
          ...previous,
          status,
          ...(updatedDonation?.approvedByName !== undefined
            ? {
                approvedByName: updatedDonation.approvedByName,
              }
            : {}),
        };
      });
    } catch (err) {
      console.error("Status update error:", err);

      setError(
        err.response?.data?.message || "Unable to update donation status.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // APPROVE DONATION
  // ============================================================

  const approveDonation = (donation) => {
    const confirmed = window.confirm(
      `Approve donation from ${donation.fullName || "this donor"}?`,
    );

    if (!confirmed) {
      return;
    }

    updateStatus(donation, "Approved");
  };

  // ============================================================
  // REJECT DONATION
  // ============================================================

  const rejectDonation = (donation) => {
    const confirmed = window.confirm(
      `Reject donation from ${donation.fullName || "this donor"}?`,
    );

    if (!confirmed) {
      return;
    }

    updateStatus(donation, "Rejected");
  };

  // ============================================================
  // DELETE DONATION
  // ============================================================

  const deleteDonation = async (donation) => {
    if (!donation?._id) {
      return;
    }

    // ========================================================
    // EXTRA DELETE PROTECTION
    // User MUST type DELETE exactly.
    // ========================================================

    const deleteConfirmation = window.prompt(
      `Delete donation ${
        donation.donationId || ""
      }?\n\nThis action cannot be undone.\n\nType DELETE to confirm:`,
    );

    // Cancelled, empty, incorrect, lowercase, etc.
    // will all stop the deletion.
    if (deleteConfirmation !== "DELETE") {
      if (deleteConfirmation !== null) {
        window.alert(
          "Deletion cancelled.\n\nYou must type DELETE exactly to confirm.",
        );
      }

      return;
    }

    try {
      setActionLoading(`${donation._id}-delete`);

      setError("");

      await api.delete(`/donations/admin/${donation._id}`);

      setDonations((previous) =>
        previous.filter((item) => item._id !== donation._id),
      );

      if (selectedDonation?._id === donation._id) {
        setSelectedDonation(null);
      }
    } catch (err) {
      console.error("Delete donation error:", err);

      setError(err.response?.data?.message || "Unable to delete donation.");
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================
  // COPY REFERENCE
  // ============================================================

  const copyReference = async (reference) => {
    if (!reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reference);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setDateFilter("");
    setMonthFilter("All");
    setYearFilter("All");
    setApproverFilter("All");
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

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

  // ============================================================
  // PAYMENT CLASS
  // ============================================================

  const paymentClass = (method) => {
    return normalizePayment(method) === "cash"
      ? styles.cashPayment
      : styles.squarePayment;
  };

  // ============================================================
  // EXPORT EXCEL
  // ============================================================

  const exportDonations = () => {
    if (!filteredDonations.length) {
      window.alert("There are no donations to export.");
      return;
    }

    try {
      const exportRows = filteredDonations.map((donation, index) => ({
        No: index + 1,

        "Donation Reference": donation.donationId || donation._id || "",

        "Donor Name": donation.fullName || "",

        Email: donation.email || "",

        Phone: donation.phone || "",

        Amount: Number(donation.amount || 0),

        Currency: "USD",

        "Payment Method": paymentLabel(donation.paymentMethod),

        "Revenue Type":
          normalizePayment(donation.paymentMethod) === "cash"
            ? donation.revenueType || ""
            : "",

        "Approved By": getApprovedBy(donation),

        Status: normalizeStatus(donation.status),

        "Submitted Date": formatDateTime(donation.createdAt),

        Message: donation.message || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
      };

      worksheet["!autofilter"] = {
        ref: worksheet["!ref"],
      };

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 28 },
        { wch: 34 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 },
        { wch: 18 },
        { wch: 24 },
        { wch: 14 },
        { wch: 24 },
        { wch: 55 },
      ];

      const summaryRows = [
        {
          Report: "Church Donation Report",
          Value: "",
        },
        {
          Report: "Generated",
          Value: formatDateTime(new Date()),
        },
        {
          Report: "Exported Records",
          Value: filteredDonations.length,
        },
        {
          Report: "Total Amount",
          Value: filteredDonations.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0,
          ),
        },
        {
          Report: "Approved Donations",
          Value: filteredDonations.filter(
            (item) => normalizeStatus(item.status) === "Approved",
          ).length,
        },
        {
          Report: "Pending Donations",
          Value: filteredDonations.filter(
            (item) => normalizeStatus(item.status) === "Pending",
          ).length,
        },
        {
          Report: "Rejected Donations",
          Value: filteredDonations.filter(
            (item) => normalizeStatus(item.status) === "Rejected",
          ).length,
        },
        {
          Report: "Square Amount",
          Value: filteredDonations
            .filter((item) => normalizePayment(item.paymentMethod) === "square")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        },
        {
          Report: "Cash Amount",
          Value: filteredDonations
            .filter((item) => normalizePayment(item.paymentMethod) === "cash")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        },
        {
          Report: "Applied Filters",
          Value: filterDescription || "None",
        },
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);

      summaryWorksheet["!cols"] = [{ wch: 28 }, { wch: 60 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Donations");

      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

      const date = new Date().toISOString().slice(0, 10);

      const time = new Date().toTimeString().slice(0, 8).replace(/:/g, "-");

      XLSX.writeFile(workbook, `church-donations-${date}_${time}.xlsx`, {
        bookType: "xlsx",
        compression: true,
      });
    } catch (err) {
      console.error("Excel export error:", err);

      window.alert("Unable to export donations to Excel. Please try again.");
    }
  };

  // ============================================================
  // PRINT DONATIONS REPORT
  // ============================================================

  const printDonations = () => {
    if (!filteredDonations.length) {
      window.alert("There are no donations to print.");

      return;
    }

    const rows = filteredDonations
      .map((donation) => {
        const status = normalizeStatus(donation.status);

        const payment = normalizePayment(donation.paymentMethod);

        const approvedBy = getApprovedBy(donation);

        return `
          <tr>
            <td>
              ${escapeHtml(donation.donationId || donation._id || "—")}
            </td>

            <td>
              <strong>
                ${escapeHtml(donation.fullName || "Unknown Donor")}
              </strong>

              <br />

              <span class="muted">
                ${escapeHtml(donation.email || "")}
              </span>
            </td>

            <td>
              ${escapeHtml(donation.phone || "—")}
            </td>

            <td class="amount">
              ${escapeHtml(formatCurrency(donation.amount))}
            </td>

            <td>
              <span class="payment ${payment}">
                ${escapeHtml(paymentLabel(donation.paymentMethod))}
              </span>
            </td>

            <td>
              ${payment === "cash" ? escapeHtml(donation.revenueType || "—") : "—"}
            </td>

            <td>
              ${escapeHtml(approvedBy)}
            </td>

            <td>
              <span class="status ${status.toLowerCase()}">
                ${escapeHtml(status)}
              </span>
            </td>

            <td>
              ${escapeHtml(formatDateTime(donation.createdAt))}
            </td>
          </tr>
        `;
      })
      .join("");

    const filteredTotal = filteredDonations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const filteredCash = filteredDonations
      .filter((item) => normalizePayment(item.paymentMethod) === "cash")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const filteredSquare = filteredDonations
      .filter((item) => normalizePayment(item.paymentMethod) === "square")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups in your browser to print the donation report.",
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>
        <head>

          <title>
            St. Mary & St. Gabriel Church - Donation Report
          </title>

          <meta charset="UTF-8" />

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 35px;
              color: #1f2937;
              background: #ffffff;

              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;

              padding-bottom: 22px;

              border-bottom:
                3px solid #5b1a1a;
            }

            .church-name {
              margin: 0;

              color: #5b1a1a;

              font-family:
                Georgia,
                serif;

              font-size: 25px;
              font-weight: 800;
            }

            .report-title {
              margin: 7px 0 0;

              color: #334155;

              font-size: 18px;
              font-weight: 700;
            }

            .report-meta {
              text-align: right;

              color: #64748b;

              font-size: 11px;

              line-height: 1.7;
            }

            .gold-line {
              width: 75px;
              height: 4px;

              margin-top: 10px;

              background: #d4af37;
            }

            .summary {
              display: grid;

              grid-template-columns:
                repeat(5, 1fr);

              gap: 12px;

              margin: 22px 0;
            }

            .summary-card {
              padding: 14px;

              border:
                1px solid #e5e7eb;

              border-radius: 8px;

              background: #fafafa;
            }

            .summary-card span {
              display: block;

              color: #64748b;

              font-size: 10px;

              text-transform: uppercase;

              font-weight: 700;
            }

            .summary-card strong {
              display: block;

              margin-top: 5px;

              color: #111827;

              font-size: 16px;
            }

            .filters {
              margin-bottom: 18px;

              padding: 10px 12px;

              border-radius: 6px;

              background: #f8fafc;

              color: #64748b;

              font-size: 11px;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;
            }

            th {
              padding: 10px 8px;

              border-bottom:
                2px solid #5b1a1a;

              text-align: left;

              color: #475569;

              font-size: 9px;

              text-transform:
                uppercase;

              letter-spacing:
                .5px;
            }

            td {
              padding: 10px 8px;

              border-bottom:
                1px solid #e5e7eb;

              vertical-align: top;

              font-size: 10px;
            }

            tbody tr:nth-child(even) {
              background: #fafafa;
            }

            .muted {
              color: #94a3b8;

              font-size: 9px;
            }

            .amount {
              color: #5b1a1a;

              font-weight: 800;

              white-space:
                nowrap;
            }

            .payment {
              display: inline-block;

              padding: 4px 7px;

              border-radius: 999px;

              font-size: 8px;

              font-weight: 800;
            }

            .payment.square {
              background: #eff6ff;
              color: #1d4ed8;
            }

            .payment.cash {
              background: #ecfdf3;
              color: #15803d;
            }

            .status {
              display: inline-block;

              padding: 4px 7px;

              border-radius: 999px;

              font-size: 8px;

              font-weight: 800;
            }

            .status.approved {
              background: #ecfdf3;
              color: #15803d;
            }

            .status.pending {
              background: #fff7df;
              color: #a16207;
            }

            .status.rejected {
              background: #fff1f2;
              color: #be123c;
            }

            .footer {
              display: flex;

              justify-content:
                space-between;

              gap: 20px;

              margin-top: 25px;

              padding-top: 15px;

              border-top:
                1px solid #e5e7eb;

              color: #94a3b8;

              font-size: 9px;
            }

            @media print {

              body {
                padding: 15px;
              }

              @page {
                size: landscape;
                margin: 12mm;
              }

            }

          </style>

        </head>

        <body>

          <div class="header">

            <div>

              <h1 class="church-name">
                St. Mary & St. Gabriel
                Ethiopian Orthodox Tewahedo Church
              </h1>

              <div class="gold-line"></div>

              <div class="report-title">
                Donation Management Report
              </div>

            </div>

            <div class="report-meta">

              <strong>
                Generated:
              </strong>

              ${escapeHtml(formatDateTime(new Date()))}

              <br />

              <strong>
                Records:
              </strong>

              ${filteredDonations.length}

            </div>

          </div>

          <div class="summary">

            <div class="summary-card">

              <span>
                Total Records
              </span>

              <strong>
                ${filteredDonations.length}
              </strong>

            </div>

            <div class="summary-card">

              <span>
                Total Amount
              </span>

              <strong>
                ${escapeHtml(formatCurrency(filteredTotal))}
              </strong>

            </div>

            <div class="summary-card">

              <span>
                Square
              </span>

              <strong>
                ${escapeHtml(formatCurrency(filteredSquare))}
              </strong>

            </div>

            <div class="summary-card">

              <span>
                Cash
              </span>

              <strong>
                ${escapeHtml(formatCurrency(filteredCash))}
              </strong>

            </div>

            <div class="summary-card">

              <span>
                Approved
              </span>

              <strong>
                ${
                  filteredDonations.filter(
                    (item) => normalizeStatus(item.status) === "Approved",
                  ).length
                }
              </strong>

            </div>

          </div>

          ${
            filterDescription
              ? `
                <div class="filters">

                  <strong>
                    Applied filters:
                  </strong>

                  ${escapeHtml(filterDescription)}

                </div>
              `
              : ""
          }

          <table>

            <thead>

              <tr>

                <th>
                  Reference
                </th>

                <th>
                  Donor
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Payment
                </th>

                <th>
                  Revenue Type
                </th>

                <th>
                  Approved By
                </th>

                <th>
                  Status
                </th>

                <th>
                  Submitted
                </th>

              </tr>

            </thead>

            <tbody>
              ${rows}
            </tbody>

          </table>

          <div class="footer">

            <span>
              St. Mary & St. Gabriel Church
            </span>

            <span>
              Square:
              ${escapeHtml(formatCurrency(filteredSquare))}
            </span>

            <span>
              Cash:
              ${escapeHtml(formatCurrency(filteredCash))}
            </span>

            <span>
              Printed on
              ${escapeHtml(formatDateTime(new Date()))}
            </span>

          </div>

          <script>

            window.onload = function () {

              setTimeout(function () {
                window.print();
              }, 400);

            };

            window.onafterprint = function () {
              window.close();
            };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
  };

  // ============================================================
  // PRINT SINGLE DONATION
  // ============================================================

  const printSingleDonation = (donation) => {
    if (!donation) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=800");

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups in your browser to print the donation.",
      );

      return;
    }

    const status = normalizeStatus(donation.status);

    const payment = normalizePayment(donation.paymentMethod);

    const approvedBy = getApprovedBy(donation);

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Donation Receipt -
            ${escapeHtml(donation.donationId || donation._id || "")}
          </title>

          <meta charset="UTF-8" />

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 35px;

              background: #ffffff;

              color: #1f2937;

              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            .receipt {
              max-width: 760px;

              margin: 0 auto;

              border:
                1px solid #e5e7eb;

              border-radius: 12px;

              overflow: hidden;
            }

            .header {
              padding: 30px;

              background:
                #5b1a1a;

              color: white;

              text-align: center;
            }

            .church {
              margin: 0;

              font-family:
                Georgia,
                serif;

              font-size: 23px;

              line-height: 1.35;
            }

            .title {
              margin-top: 10px;

              color:
                #f5d978;

              font-size: 13px;

              font-weight: 800;

              text-transform:
                uppercase;

              letter-spacing:
                1.5px;
            }

            .content {
              padding: 28px;
            }

            .reference {
              text-align: center;

              margin-bottom: 25px;
            }

            .reference span {
              display: block;

              color:
                #94a3b8;

              font-size: 10px;

              text-transform:
                uppercase;

              font-weight: 800;
            }

            .reference strong {
              display: block;

              margin-top: 7px;

              color:
                #5b1a1a;

              font-family:
                monospace;

              font-size: 17px;
            }

            .amount {
              margin-bottom: 24px;

              padding: 20px;

              border-radius: 10px;

              background:
                #fffaf0;

              border:
                1px solid #f3e8c5;

              text-align: center;
            }

            .amount span {
              display: block;

              color:
                #64748b;

              font-size: 11px;

              font-weight: 700;
            }

            .amount strong {
              display: block;

              margin-top: 5px;

              color:
                #5b1a1a;

              font-size: 30px;
            }

            .grid {
              display: grid;

              grid-template-columns:
                repeat(2, 1fr);

              gap: 12px;
            }

            .item {
              padding: 13px;

              border:
                1px solid #e5e7eb;

              border-radius: 8px;
            }

            .item span {
              display: block;

              color:
                #94a3b8;

              font-size: 9px;

              font-weight: 800;

              text-transform:
                uppercase;
            }

            .item strong {
              display: block;

              margin-top: 5px;

              color:
                #334155;

              font-size: 12px;

              overflow-wrap:
                anywhere;
            }

            .payment {
              display: inline-block;

              margin-top: 5px;

              padding: 5px 9px;

              border-radius: 999px;

              font-size: 10px;

              font-weight: 800;
            }

            .payment.square {
              background:
                #eff6ff;

              color:
                #1d4ed8;
            }

            .payment.cash {
              background:
                #ecfdf3;

              color:
                #15803d;
            }

            .status {
              display: inline-block;

              margin-top: 5px;

              padding: 5px 9px;

              border-radius: 999px;

              font-size: 10px;

              font-weight: 800;
            }

            .approved {
              background:
                #ecfdf3;

              color:
                #15803d;
            }

            .pending {
              background:
                #fff7df;

              color:
                #a16207;
            }

            .rejected {
              background:
                #fff1f2;

              color:
                #be123c;
            }

            .message {
              margin-top: 15px;

              padding: 15px;

              border-radius: 8px;

              background:
                #f8fafc;
            }

            .message span {
              color:
                #94a3b8;

              font-size: 9px;

              font-weight: 800;

              text-transform:
                uppercase;
            }

            .message p {
              margin: 6px 0 0;

              color:
                #475569;

              font-size: 12px;

              line-height: 1.6;

              white-space:
                pre-wrap;
            }

            .footer {
              margin-top: 25px;

              padding: 18px 28px;

              border-top:
                1px solid #e5e7eb;

              color:
                #94a3b8;

              text-align: center;

              font-size: 9px;

              line-height: 1.7;
            }

            @media print {

              body {
                padding: 0;
              }

              .receipt {
                border: none;
              }

              @page {
                size: A4 portrait;

                margin: 15mm;
              }

            }

          </style>

        </head>

        <body>

          <div class="receipt">

            <div class="header">

              <h1 class="church">
                St. Mary & St. Gabriel
                Ethiopian Orthodox Tewahedo Church
              </h1>

              <div class="title">
                Donation Record
              </div>

            </div>

            <div class="content">

              <div class="reference">

                <span>
                  Donation Reference
                </span>

                <strong>
                  ${escapeHtml(donation.donationId || donation._id || "—")}
                </strong>

              </div>

              <div class="amount">

                <span>
                  Donation Amount
                </span>

                <strong>
                  ${escapeHtml(formatCurrency(donation.amount))}
                </strong>

              </div>

              <div class="grid">

                <div class="item">

                  <span>
                    Donor Name
                  </span>

                  <strong>
                    ${escapeHtml(donation.fullName || "Unknown Donor")}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Email Address
                  </span>

                  <strong>
                    ${escapeHtml(donation.email || "—")}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Phone Number
                  </span>

                  <strong>
                    ${escapeHtml(donation.phone || "—")}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Payment Method
                  </span>

                  <span class="payment ${payment}">
                    ${escapeHtml(paymentLabel(donation.paymentMethod))}
                  </span>

                </div>

                <div class="item">

                  <span>
                    Revenue Type
                  </span>

                  <strong>
                    ${payment === "cash" ? escapeHtml(donation.revenueType || "—") : "—"}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Approved By
                  </span>

                  <strong>
                    ${escapeHtml(approvedBy)}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Submitted
                  </span>

                  <strong>
                    ${escapeHtml(formatDateTime(donation.createdAt))}
                  </strong>

                </div>

                <div class="item">

                  <span>
                    Status
                  </span>

                  <span class="status ${status.toLowerCase()}">
                    ${escapeHtml(status)}
                  </span>

                </div>

              </div>

              ${
                donation.message
                  ? `
                    <div class="message">

                      <span>
                        Donor Message
                      </span>

                      <p>
                        ${escapeHtml(donation.message)}
                      </p>

                    </div>
                  `
                  : ""
              }

            </div>

            <div class="footer">

              St. Mary & St. Gabriel
              Ethiopian Orthodox Tewahedo Church

              <br />

              Payment Method:
              ${escapeHtml(paymentLabel(donation.paymentMethod))}

              <br />

              Approved By:
              ${escapeHtml(approvedBy)}

              <br />

              Donation record generated on
              ${escapeHtml(formatDateTime(new Date()))}

            </div>

          </div>

          <script>

            window.onload = function () {

              setTimeout(function () {
                window.print();
              }, 400);

            };

            window.onafterprint = function () {
              window.close();
            };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
  };

  // ============================================================
  // RETURN
  // ============================================================

  return (
    <AdminLayout title="Donation Management">
      <div className={styles.container}>
        {/* ==================================================
            HERO
        ================================================== */}

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>
              <FiHeart />
              Church Giving
            </div>

            <h1>Donation Management</h1>

            <p>Review, approve and manage church donation submissions.</p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.heroIcon}>
              <FiHeart />
            </div>

            <button
              className={styles.refreshBtn}
              onClick={() => fetchDonations(true)}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? styles.spin : ""} />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className={styles.errorBox}>
            <FiAlertCircle />

            <div>
              <strong>Donation data unavailable</strong>

              <p>{error}</p>
            </div>

            <button onClick={() => setError("")} aria-label="Close error">
              <FiX />
            </button>
          </div>
        )}

        {/* ==================================================
            MAIN STATISTICS
        ================================================== */}

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.blueIcon}`}>
              <FiUsers />
            </div>

            <div className={styles.statInfo}>
              <span>Total Donations</span>

              <strong>{statistics.total}</strong>

              <small>All submitted records</small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.goldIcon}`}>
              <FiDollarSign />
            </div>

            <div className={styles.statInfo}>
              <span>Total Amount</span>

              <strong>{formatCurrency(statistics.totalAmount)}</strong>

              <small>Total donation value</small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
              <FiClock />
            </div>

            <div className={styles.statInfo}>
              <span>Pending Review</span>

              <strong>{statistics.pending}</strong>

              <small>
                {formatCurrency(statistics.pendingAmount)} awaiting review
              </small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.greenIcon}`}>
              <FiCheckCircle />
            </div>

            <div className={styles.statInfo}>
              <span>Approved</span>

              <strong>{statistics.approved}</strong>

              <small>
                {formatCurrency(statistics.approvedAmount)} approved
              </small>
            </div>
          </div>
        </section>

        {/* ==================================================
            PAYMENT BREAKDOWN
        ================================================== */}

        <section
          className={styles.statsGrid}
          style={{
            marginTop: "16px",
          }}
        >
          {/* SQUARE */}

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.blueIcon}`}>
              <FiCreditCard />
            </div>

            <div className={styles.statInfo}>
              <span>Square Donations</span>

              <strong>{formatCurrency(statistics.squareAmount)}</strong>

              <small>
                {statistics.squareCount} Square donation
                {statistics.squareCount === 1 ? "" : "s"}
              </small>
            </div>
          </div>

          {/* CASH */}

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.greenIcon}`}>
              <FiDollarSign />
            </div>

            <div className={styles.statInfo}>
              <span>Cash Donations</span>

              <strong>{formatCurrency(statistics.cashAmount)}</strong>

              <small>
                {statistics.cashCount} cash donation
                {statistics.cashCount === 1 ? "" : "s"}
              </small>
            </div>
          </div>

          {/* REJECTED */}

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
              <FiXCircle />
            </div>

            <div className={styles.statInfo}>
              <span>Rejected</span>

              <strong>{statistics.rejected}</strong>

              <small>
                {formatCurrency(statistics.rejectedAmount)} rejected
              </small>
            </div>
          </div>
        </section>

        {/* ==================================================
            SEARCH + ACTION TOOLBAR
        ================================================== */}

        <section className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FiSearch />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search donor, email, phone, reference or approver..."
            />

            {search && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearch("")}
              >
                <FiX />
              </button>
            )}
          </div>

          <div className={styles.toolbarActions}>
            {/* ADD DONATION */}

            <button
              className={styles.addDonationButton}
              onClick={handleAddDonation}
              title="Add a new donation"
            >
              <FiPlus />

              <span>Add Donation</span>
            </button>

            {/* PRINT */}

            <button
              className={styles.printButton}
              onClick={printDonations}
              disabled={!filteredDonations.length}
              title="Print filtered donations"
            >
              <FiPrinter />

              <span>Print</span>
            </button>

            {/* EXPORT */}

            <button
              className={styles.exportButton}
              onClick={exportDonations}
              disabled={!filteredDonations.length}
              title="Export filtered donations as Excel"
            >
              <FiDownload />

              <span>Export</span>
            </button>

            {/* FILTER */}

            <button
              className={styles.filterToggle}
              onClick={() => setShowFilters((previous) => !previous)}
            >
              <FiFilter />
              Filters
              {activeFilterCount > 0 && (
                <span
                  style={{
                    minWidth: "22px",
                    height: "22px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 6px",
                    marginLeft: "4px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.18)",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
              <FiChevronDown
                className={showFilters ? styles.chevronOpen : ""}
              />
            </button>
          </div>
        </section>

        {/* ==================================================
            MODERN FILTER PANEL
        ================================================== */}

        {showFilters && (
          <section
            className={styles.filterPanel}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              alignItems: "end",
            }}
          >
            {/* STATUS */}

            <div className={styles.filterItem}>
              <label>Donation Status</label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* PAYMENT */}

            <div className={styles.filterItem}>
              <label>Payment Method</label>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
              >
                {PAYMENT_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method === "All" ? "All Methods" : paymentLabel(method)}
                  </option>
                ))}
              </select>
            </div>

            {/* ==================================================
                APPROVER NAME
            ================================================== */}

            <div className={styles.filterItem}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiUsers />
                Approved By
              </label>

              <select
                value={approverFilter}
                onChange={(event) => setApproverFilter(event.target.value)}
              >
                <option value="All">All Approvers</option>

                {availableApprovers.map((approver) => (
                  <option key={approver} value={approver}>
                    {approver === "Square" ? "Square" : approver}
                  </option>
                ))}
              </select>
            </div>

            {/* EXACT DATE */}

            <div className={styles.filterItem}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FiCalendar />
                Exact Date
              </label>

              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                style={{
                  width: "100%",
                  minHeight: "42px",
                  padding: "0 12px",
                  border: "1px solid rgba(100,116,139,0.22)",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.95)",
                  color: "#1f2937",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* MONTH */}

            <div className={styles.filterItem}>
              <label>Donation Month</label>

              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              >
                <option value="All">All Months</option>

                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* YEAR */}

            <div className={styles.filterItem}>
              <label>Donation Year</label>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="All">All Years</option>

                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* FILTER SUMMARY */}

            <div
              style={{
                minHeight: "42px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(91,26,26,0.05)",
                border: "1px solid rgba(91,26,26,0.10)",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                flexWrap: "wrap",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  color: "#64748b",
                }}
              >
                Showing
              </span>

              <strong
                style={{
                  color: "#5b1a1a",
                  fontSize: "15px",
                }}
              >
                {filteredDonations.length}
              </strong>

              <span
                style={{
                  color: "#64748b",
                }}
              >
                of
              </span>

              <strong>{donations.length}</strong>

              <span
                style={{
                  color: "#64748b",
                }}
              >
                donations
              </span>
            </div>

            {/* CLEAR */}

            <button
              className={styles.clearFilters}
              onClick={clearFilters}
              disabled={activeFilterCount === 0 && !search}
              style={{
                minHeight: "42px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
              }}
            >
              <FiX />
              Clear All Filters
            </button>
          </section>
        )}

        {/* ==================================================
            ACTIVE FILTER SUMMARY
        ================================================== */}

        {filterDescription && (
          <div
            style={{
              marginTop: "14px",
              marginBottom: "14px",
              padding: "12px 16px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, rgba(91,26,26,0.055), rgba(212,175,55,0.08))",
              border: "1px solid rgba(91,26,26,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                flexWrap: "wrap",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "30px",
                  height: "30px",
                  borderRadius: "9px",
                  background: "rgba(91,26,26,0.10)",
                  color: "#5b1a1a",
                }}
              >
                <FiFilter />
              </span>

              <strong>Active filters</strong>

              <span
                style={{
                  color: "#64748b",
                }}
              >
                {filterDescription}
              </span>
            </div>

            <button
              onClick={clearFilters}
              style={{
                border: "none",
                background: "transparent",
                color: "#5b1a1a",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 8px",
              }}
            >
              <FiX />
              Clear
            </button>
          </div>
        )}

        {/* ==================================================
            FILTERED STATISTICS
        ================================================== */}

        {(activeFilterCount > 0 || search.trim()) && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                border: "1px solid rgba(100,116,139,0.15)",
                borderRadius: "12px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Filtered Records
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "20px",
                  color: "#111827",
                }}
              >
                {filteredStatistics.total}
              </strong>
            </div>

            <div
              style={{
                padding: "14px 16px",
                border: "1px solid rgba(100,116,139,0.15)",
                borderRadius: "12px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Filtered Amount
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "20px",
                  color: "#5b1a1a",
                }}
              >
                {formatCurrency(filteredStatistics.totalAmount)}
              </strong>
            </div>

            <div
              style={{
                padding: "14px 16px",
                border: "1px solid rgba(100,116,139,0.15)",
                borderRadius: "12px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Filtered Approved
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "20px",
                  color: "#15803d",
                }}
              >
                {filteredStatistics.approved}
              </strong>
            </div>

            <div
              style={{
                padding: "14px 16px",
                border: "1px solid rgba(100,116,139,0.15)",
                borderRadius: "12px",
                background: "#fff",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Filtered Pending
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                  fontSize: "20px",
                  color: "#a16207",
                }}
              >
                {filteredStatistics.pending}
              </strong>
            </div>
          </section>
        )}

        {/* ==================================================
            TABLE CARD
        ================================================== */}

        <section className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableTitleRow}>
                <h2>Recent Donations</h2>

                <span className={styles.resultCount}>
                  {filteredDonations.length}
                </span>
              </div>

              <p>Review donor information and payment submissions.</p>
            </div>

            <div className={styles.tableHeaderRight}>
              <span className={styles.liveIndicator}>
                <span />
                Donation records
              </span>
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className={styles.loadingBox}>
              <FiRefreshCw className={styles.spin} />
              Loading donations...
            </div>
          )}

          {/* EMPTY */}

          {!loading && filteredDonations.length === 0 && (
            <div className={styles.emptyState}>
              <FiHeart />

              <h3>No donations found</h3>

              <p>Try changing your search or filter options.</p>

              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop: "10px",
                    border: "none",
                    background: "#5b1a1a",
                    color: "#fff",
                    padding: "10px 16px",
                    borderRadius: "9px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* TABLE */}

          {!loading && filteredDonations.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Donor</th>

                    <th>Amount</th>

                    <th>Payment</th>

                    <th>Revenue Type</th>

                    <th>Date</th>

                    <th>Status</th>

                    <th>Approved By</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDonations.map((donation) => {
                    const status = normalizeStatus(donation.status);

                    const payment = normalizePayment(donation.paymentMethod);

                    const approveKey = `${donation._id}-Approved`;

                    return (
                      <tr key={donation._id}>
                        <td>
                          <div className={styles.donorCell}>
                            <div className={styles.avatar}>
                              {getInitials(donation.fullName)}
                            </div>

                            <div>
                              <strong>
                                {donation.fullName || "Unknown Donor"}
                              </strong>

                              <span>{donation.email || "No email"}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.amount}>
                            <FiDollarSign />

                            <strong>{formatCurrency(donation.amount)}</strong>
                          </div>
                        </td>

                        <td>
                          <div className={styles.paymentMethod}>
                            <div
                              className={`${styles.paymentIcon} ${
                                payment === "cash"
                                  ? styles.cashPayment
                                  : styles.squarePayment
                              }`}
                            >
                              {payment === "cash" ? (
                                <FiDollarSign />
                              ) : (
                                <FiCreditCard />
                              )}
                            </div>

                            {paymentLabel(donation.paymentMethod)}
                          </div>
                        </td>

                        <td>
                          <div
                            style={{
                              maxWidth: "240px",
                              fontSize: "12px",
                              fontWeight: payment === "cash" ? 700 : 500,
                              lineHeight: 1.4,
                              color: payment === "cash" ? "#334155" : "#94a3b8",
                            }}
                          >
                            {payment === "cash"
                              ? donation.revenueType || "—"
                              : "—"}
                          </div>
                        </td>

                        <td>
                          <div className={styles.dateCell}>
                            <FiCalendar />

                            {formatDate(donation.createdAt)}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`${styles.status} ${statusClass(
                              status,
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getApprovedBy(donation)}
                          </div>
                        </td>

                        <td>
                          <div className={styles.actions}>
                            {/* VIEW */}

                            <button
                              className={`${styles.actionButton} ${styles.viewButton}`}
                              onClick={() => setSelectedDonation(donation)}
                              title="View donation"
                            >
                              <FiEye />
                            </button>

                            {/* APPROVE */}

                            {status !== "Approved" && (
                              <button
                                className={`${styles.actionButton} ${styles.approveButton}`}
                                disabled={actionLoading === approveKey}
                                onClick={() => approveDonation(donation)}
                                title="Approve donation"
                              >
                                {actionLoading === approveKey ? (
                                  <FiRefreshCw className={styles.spin} />
                                ) : (
                                  <FiCheck />
                                )}
                              </button>
                            )}

                            {/* REJECT */}

                            {status !== "Rejected" && (
                              <button
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                                onClick={() => rejectDonation(donation)}
                                title="Reject donation"
                              >
                                <FiX />
                              </button>
                            )}

                            {/* DELETE */}

                            <button
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() => deleteDonation(donation)}
                              title="Delete donation"
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
            </div>
          )}

          {/* ==================================================
              MOBILE DONATION CARDS
          ================================================== */}

          {!loading && filteredDonations.length > 0 && (
            <div className={styles.mobileList}>
              {filteredDonations.map((donation) => {
                const status = normalizeStatus(donation.status);

                const payment = normalizePayment(donation.paymentMethod);

                const approveKey = `${donation._id}-Approved`;

                const rejectKey = `${donation._id}-Rejected`;

                return (
                  <article
                    key={`mobile-${donation._id}`}
                    className={styles.mobileCard}
                  >
                    <div className={styles.mobileTop}>
                      <div className={styles.donorCell}>
                        <div className={styles.avatar}>
                          {getInitials(donation.fullName)}
                        </div>

                        <div>
                          <strong>
                            {donation.fullName || "Unknown Donor"}
                          </strong>

                          <span>{donation.email || "No email"}</span>
                        </div>
                      </div>

                      <span
                        className={`${styles.status} ${statusClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className={styles.mobileAmount}>
                      {formatCurrency(donation.amount)}
                    </div>

                    <div className={styles.mobileDetails}>
                      <div>
                        <span>Reference</span>

                        <strong>
                          {donation.donationId || donation._id || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Payment</span>

                        <strong>{paymentLabel(donation.paymentMethod)}</strong>
                      </div>

                      <div>
                        <span>Revenue Type</span>

                        <strong>
                          {payment === "cash"
                            ? donation.revenueType || "—"
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Submitted</span>

                        <strong>{formatDate(donation.createdAt)}</strong>
                      </div>

                      <div>
                        <span>Approved By</span>

                        <strong>{getApprovedBy(donation)}</strong>
                      </div>
                    </div>

                    <div className={styles.mobileActions}>
                      <button
                        className={styles.mobileView}
                        onClick={() => setSelectedDonation(donation)}
                      >
                        <FiEye />
                        View
                      </button>

                      {status !== "Approved" && (
                        <button
                          className={styles.mobileApprove}
                          disabled={actionLoading === approveKey}
                          onClick={() => approveDonation(donation)}
                        >
                          {actionLoading === approveKey ? (
                            <FiRefreshCw className={styles.spin} />
                          ) : (
                            <FiCheck />
                          )}
                          Approve
                        </button>
                      )}

                      {status !== "Rejected" && (
                        <button
                          className={styles.mobileReject}
                          disabled={actionLoading === rejectKey}
                          onClick={() => rejectDonation(donation)}
                        >
                          {actionLoading === rejectKey ? (
                            <FiRefreshCw className={styles.spin} />
                          ) : (
                            <FiX />
                          )}
                          Reject
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ==================================================
              DONATION DETAILS MODAL
          ================================================== */}

          {selectedDonation && (
            <div
              className={styles.modalOverlay}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedDonation(null);
                }
              }}
            >
              <div className={styles.modal}>
                <button
                  className={styles.modalClose}
                  onClick={() => setSelectedDonation(null)}
                >
                  <FiX />
                </button>

                {/* MODAL HEADER */}

                <div className={styles.modalHeader}>
                  <div className={styles.modalAvatar}>
                    {getInitials(selectedDonation.fullName)}
                  </div>

                  <div>
                    <span>Donation Details</span>

                    <h2>{selectedDonation.fullName || "Unknown Donor"}</h2>

                    <p>{selectedDonation.donationId || selectedDonation._id}</p>
                  </div>
                </div>

                {/* STATUS */}

                <div className={styles.modalStatusRow}>
                  <span>Current Status</span>

                  <span
                    className={`${styles.status} ${statusClass(
                      selectedDonation.status,
                    )}`}
                  >
                    {normalizeStatus(selectedDonation.status)}
                  </span>
                </div>

                {/* AMOUNT */}

                <div className={styles.modalAmount}>
                  <span>Donation Amount</span>

                  <strong>{formatCurrency(selectedDonation.amount)}</strong>
                </div>

                {/* DONOR INFORMATION */}

                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <FiMail />

                    <div>
                      <span>Email Address</span>

                      <strong>{selectedDonation.email || "—"}</strong>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiPhone />

                    <div>
                      <span>Phone Number</span>

                      <strong>{selectedDonation.phone || "—"}</strong>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    {normalizePayment(selectedDonation.paymentMethod) ===
                    "cash" ? (
                      <FiDollarSign />
                    ) : (
                      <FiCreditCard />
                    )}

                    <div>
                      <span>Payment Method</span>

                      <strong>
                        {paymentLabel(selectedDonation.paymentMethod)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiDollarSign />

                    <div>
                      <span>Revenue Type</span>

                      <strong>
                        {normalizePayment(selectedDonation.paymentMethod) ===
                        "cash"
                          ? selectedDonation.revenueType || "—"
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiCalendar />

                    <div>
                      <span>Submitted</span>

                      <strong>
                        {formatDateTime(selectedDonation.createdAt)}
                      </strong>
                    </div>
                  </div>

                  {/* APPROVED BY */}

                  <div className={styles.detailItem}>
                    {normalizePayment(selectedDonation.paymentMethod) ===
                    "square" ? (
                      <FiCreditCard />
                    ) : (
                      <FiUsers />
                    )}

                    <div>
                      <span>Approved By</span>

                      <strong>{getApprovedBy(selectedDonation)}</strong>
                    </div>
                  </div>
                </div>

                {/* CASH PAYMENT NOTICE */}

                {normalizePayment(selectedDonation.paymentMethod) ===
                  "cash" && (
                  <div className={styles.messageBox}>
                    <div className={styles.messageIcon}>
                      <FiDollarSign />
                    </div>

                    <div>
                      <span>Cash Donation</span>

                      <p>
                        This donation was recorded as a cash payment by the
                        administrator.
                      </p>
                    </div>
                  </div>
                )}

                {/* DONOR MESSAGE */}

                {selectedDonation.message && (
                  <div className={styles.messageBox}>
                    <div className={styles.messageIcon}>
                      <FiMessageCircle />
                    </div>

                    <div>
                      <span>Donor Message</span>

                      <p>{selectedDonation.message}</p>
                    </div>
                  </div>
                )}

                {/* PAYMENT SCREENSHOT */}

                {normalizePayment(selectedDonation.paymentMethod) ===
                  "square" &&
                  selectedDonation.paymentScreenshot?.url && (
                    <div className={styles.screenshotSection}>
                      <div className={styles.sectionTitle}>
                        <div>
                          <FiImage />
                        </div>

                        <span>Payment Screenshot</span>
                      </div>

                      <a
                        href={selectedDonation.paymentScreenshot.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.screenshotLink}
                      >
                        <img
                          src={selectedDonation.paymentScreenshot.url}
                          alt="Donation payment screenshot"
                        />

                        <span>Open Full Image</span>
                      </a>
                    </div>
                  )}

                {/* REFERENCE */}

                <div className={styles.referenceBox}>
                  <div>
                    <span>Donation Reference</span>

                    <strong>
                      {selectedDonation.donationId ||
                        selectedDonation._id ||
                        "—"}
                    </strong>
                  </div>

                  <button
                    onClick={() =>
                      copyReference(
                        selectedDonation.donationId || selectedDonation._id,
                      )
                    }
                    title="Copy donation reference"
                  >
                    <FiCopy />
                  </button>
                </div>

                {/* MODAL ACTIONS */}

                <div className={styles.modalActions}>
                  <button
                    className={styles.modalPrint}
                    onClick={() => printSingleDonation(selectedDonation)}
                  >
                    <FiPrinter />
                    Print Donation
                  </button>

                  {normalizeStatus(selectedDonation.status) !== "Approved" && (
                    <button
                      className={styles.modalApprove}
                      onClick={() => approveDonation(selectedDonation)}
                    >
                      <FiCheck />
                      Approve Donation
                    </button>
                  )}

                  {normalizeStatus(selectedDonation.status) !== "Rejected" && (
                    <button
                      className={styles.modalReject}
                      onClick={() => rejectDonation(selectedDonation)}
                    >
                      <FiX />
                      Reject Donation
                    </button>
                  )}

                  <button
                    className={styles.modalDelete}
                    onClick={() => deleteDonation(selectedDonation)}
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
