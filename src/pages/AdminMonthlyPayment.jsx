import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import api from "../services/api";
import styles from "../styles/monthlypayment.module.css";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

import {
  FaMoneyBillWave,
  FaReceipt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaFilter,
  FaChevronDown,
  FaSyncAlt,
  FaEye,
  FaTrash,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaCreditCard,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaStickyNote,
  FaExternalLinkAlt,
  FaCopy,
  FaImage,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaChartLine,
  FaIdCard,
  FaFileInvoiceDollar,
  FaBuilding,
  FaGlobe,
  FaHashtag,
  FaHistory,
  FaCalendarCheck,
  FaUserShield,
  FaArrowRight,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCommentAlt,
  FaPlus,
  FaPrint,
} from "react-icons/fa";

/* ============================================================
   API
============================================================ */

const PAYMENT_ROUTE = "/monthly-payments";

/* ============================================================
   FRONTEND STORAGE
   Rejection reasons are intentionally stored only in the
   frontend/local browser. No backend field is required.
============================================================ */

const REJECTION_REASON_STORAGE_KEY =
  "admin_monthly_payment_rejection_reasons_v1";

/* ============================================================
   OPTIONS
============================================================ */

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

const DEFAULT_SOURCE_OPTIONS = ["Square", "Cash", "Zelle", "Check/Money Order"];

/* ============================================================
   GENERAL HELPERS
============================================================ */

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
};

const formatCurrency = (amount) => {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/* ============================================================
   DATE HELPERS
============================================================ */

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split("-").map(Number);

      const date = new Date(year, month - 1, 1);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);

      const date = new Date(year, month - 1, day);

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const date = parseDate(value);

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
  const date = parseDate(value);

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

const downloadPaymentPdf = (payment) => {
  const document = new jsPDF();
  const pageWidth = document.internal.pageSize.getWidth();
  const left = 20;
  const right = pageWidth - 20;
  let y = 24;

  const addField = (label, value) => {
    document.setFont("helvetica", "bold");
    document.text(`${label}:`, left, y);
    document.setFont("helvetica", "normal");

    const lines = document.splitTextToSize(
      String(value || "Not provided"),
      110,
    );
    document.text(lines, left + 48, y);
    y += Math.max(8, lines.length * 6);
  };

  document.setFillColor(91, 26, 26);
  document.rect(0, 0, pageWidth, 13, "F");
  document.setTextColor(91, 26, 26);
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text("Monthly Payment Receipt", left, y);
  y += 8;
  document.setFontSize(10);
  document.setTextColor(90, 90, 90);
  document.setFont("helvetica", "normal");
  document.text(`Generated: ${formatDateTime(new Date())}`, left, y);
  y += 14;

  document.setDrawColor(220, 220, 220);
  document.line(left, y, right, y);
  y += 12;

  document.setTextColor(35, 35, 35);
  document.setFontSize(11);
  addField("Member", getMemberName(payment));
  addField("Member ID", getMemberId(payment));
  addField("Email", getMemberEmail(payment));
  addField("Phone", getMemberPhone(payment));
  addField("Amount", `USD ${formatCurrency(getPaymentAmount(payment))}`);
  addField("Payment source", getPaymentSource(payment));
  addField("Payment method", getPaymentMethod(payment));
  addField("Status", normalizeStatus(payment?.status));
  addField("Payment ID", getPaymentId(payment));
  addField("Paid date", formatDateTime(getPaidDate(payment)));
  addField("Due date", formatDate(getDueDate(payment)));
  addField(
    "Months covered",
    getPaidMonthObjects(payment)
      .map((month) => month.label)
      .join(", "),
  );
  addField("Next payment", getNextPaymentMonthLabel(payment));

  if (getPaymentReference(payment)) {
    addField("Reference", getPaymentReference(payment));
  }

  if (getSquarePaymentId(payment)) {
    addField("Square payment ID", getSquarePaymentId(payment));
  }

  if (getSquareOrderId(payment)) {
    addField("Square order ID", getSquareOrderId(payment));
  }

  if (getPaymentNote(payment)) {
    addField("Note", getPaymentNote(payment));
  }

  document.setFontSize(9);
  document.setTextColor(110, 110, 110);
  document.text("St Mary and St Gebriel Ethiopian Orthodox Church", left, 285);

  const safeMemberName = getMemberName(payment)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  document.save(`monthly-payment-${safeMemberName || "receipt"}.pdf`);
};

/* ============================================================
   MONTH HELPERS
============================================================ */

const dateToMonthKey = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 7);
    }
  }

  const parsed = parseDate(value);

  if (!parsed) {
    return "";
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
};

const monthKeyToDate = (monthKey) => {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return null;
  }

  const [year, month] = monthKey.split("-").map(Number);

  const date = new Date(year, month - 1, 1);

  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKeyToLabel = (monthKey) => {
  const date = monthKeyToDate(monthKey);

  if (!date) {
    return "Unknown month";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const monthKeyToShortLabel = (monthKey) => {
  const date = monthKeyToDate(monthKey);

  if (!date) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const addMonthsToMonthKey = (monthKey, amount) => {
  const date = monthKeyToDate(monthKey);

  if (!date) {
    return "";
  }

  const result = new Date(
    date.getFullYear(),
    date.getMonth() + Number(amount || 0),
    1,
  );

  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
};

/* ============================================================
   MEMBER
============================================================ */

const getMemberName = (payment) => {
  const direct = firstValue(
    payment?.fullName,
    payment?.name,
    payment?.memberName,
  );

  if (direct) {
    return String(direct).trim();
  }

  const nested = firstValue(payment?.member?.fullName, payment?.member?.name);

  if (nested) {
    return String(nested).trim();
  }

  const firstName = firstValue(payment?.member?.firstName, payment?.firstName);

  const lastName = firstValue(payment?.member?.lastName, payment?.lastName);

  return `${firstName} ${lastName}`.trim() || "Unknown Member";
};

const getInitials = (name) => {
  const value = String(name || "").trim();

  if (!value) {
    return "M";
  }

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getMemberEmail = (payment) =>
  firstValue(payment?.email, payment?.member?.email, "No email");

const getMemberPhone = (payment) =>
  firstValue(
    payment?.phone,
    payment?.member?.phone,
    payment?.member?.phoneNumber,
    "No phone",
  );

const getMemberId = (payment) =>
  firstValue(
    payment?.memberId,
    payment?.member?.memberId,
    payment?.member?.memberID,
    payment?.member?.membershipId,
    payment?.member?.membershipID,
    payment?.member?.registrationNumber,
    payment?.member?._id,
    "—",
  );

const getMemberRecordId = (member) =>
  firstValue(
    member?.memberId,
    member?.memberID,
    member?.membershipId,
    member?.membershipID,
    member?.registrationNumber,
    member?._id,
    "",
  );

const getMemberRecordName = (member) =>
  firstValue(
    member?.fullName,
    member?.name,
    [member?.firstName, member?.middleName, member?.lastName]
      .filter(Boolean)
      .join(" "),
    "Unknown Member",
  );

/* ============================================================
   MEMBER MATCHING

   Payments can identify a member using either the church member ID
   or the MongoDB member _id.  The admin page must support both.
============================================================ */
const getPaymentMemberKeys = (payment) => {
  const keys = [
    payment?.memberId,
    payment?.memberID,
    payment?.membershipId,
    payment?.membershipID,
    payment?.registrationNumber,
    payment?.member?._id,
    payment?.member?.memberId,
    payment?.member?.memberID,
    payment?.member?.membershipId,
    payment?.member?.membershipID,
    payment?.member?.registrationNumber,
  ];

  return new Set(
    keys
      .filter(
        (value) =>
          value !== undefined && value !== null && String(value).trim(),
      )
      .map((value) => String(value).trim().toLowerCase()),
  );
};

const getMemberRecordKeys = (member) => {
  const keys = [
    member?.memberId,
    member?.memberID,
    member?.membershipId,
    member?.membershipID,
    member?.registrationNumber,
    member?._id,
  ];

  return new Set(
    keys
      .filter(
        (value) =>
          value !== undefined && value !== null && String(value).trim(),
      )
      .map((value) => String(value).trim().toLowerCase()),
  );
};

const paymentBelongsToMember = (payment, member) => {
  const paymentKeys = getPaymentMemberKeys(payment);
  const memberKeys = getMemberRecordKeys(member);

  for (const key of memberKeys) {
    if (paymentKeys.has(key)) return true;
  }

  return false;
};

/* ============================================================
   PAYMENT IDS
============================================================ */

const getDatabaseId = (payment) => firstValue(payment?._id, payment?.id, "");

const getPaymentId = (payment) =>
  firstValue(
    payment?.paymentId,
    payment?.paymentID,
    payment?.paymentNumber,
    payment?.referenceId,
    payment?.receiptNumber,
    "",
  );

const getPaymentReference = (payment) =>
  firstValue(
    payment?.paymentReference,
    payment?.reference,
    payment?.transactionReference,
    payment?.transactionId,
    payment?.transactionID,
    payment?.bankReference,
    payment?.receiptNumber,
    payment?.referenceId,
    getPaymentId(payment),
    "",
  );

/* ============================================================
   SQUARE
============================================================ */

const getSquarePaymentId = (payment) =>
  firstValue(
    payment?.squarePaymentId,
    payment?.squarePaymentID,
    payment?.squareId,
    "",
  );

const getSquareOrderId = (payment) =>
  firstValue(payment?.squareOrderId, payment?.squareOrderID, "");

const getSquareStatus = (payment) => firstValue(payment?.squareStatus, "");

/* ============================================================
   PAYMENT
============================================================ */

const getPaymentAmount = (payment) => {
  const amount = Number(
    firstValue(
      payment?.amount,
      payment?.paymentAmount,
      payment?.monthlyAmount,
      payment?.paidAmount,
      0,
    ),
  );

  return Number.isFinite(amount) ? amount : 0;
};

const getPaymentMethod = (payment) =>
  firstValue(
    payment?.paymentMethod,
    payment?.method,
    payment?.paymentType,
    payment?.methodName,
    "—",
  );

const getPaymentSource = (payment) => {
  const method = String(getPaymentMethod(payment)).toLowerCase().trim();

  if (
    method.includes("square") ||
    getSquarePaymentId(payment) ||
    getSquareOrderId(payment)
  ) {
    return "Square";
  }

  if (method.includes("cash")) {
    return "Cash";
  }

  if (method.includes("zelle")) {
    return "Zelle";
  }

  if (
    method.includes("check") ||
    method.includes("money order") ||
    method.includes("check_money_order")
  ) {
    return "Check/Money Order";
  }

  const source = firstValue(
    payment?.paymentSource,
    payment?.source,
    payment?.paymentChannel,
    payment?.channel,
    "",
  );

  if (source) {
    const normalized = String(source)
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.includes("cash") || normalized.includes("office")) {
      return "Cash";
    }

    if (normalized.includes("zelle")) {
      return "Zelle";
    }

    if (normalized.includes("check") || normalized.includes("money order")) {
      return "Check/Money Order";
    }

    if (normalized.includes("square") || normalized.includes("paypal")) {
      return "Square";
    }

    return String(source).trim();
  }

  return "Cash";
};

const getSourceIcon = (source) => {
  if (source === "Square") return <FaGlobe />;
  if (source === "Zelle") return <FaCreditCard />;
  if (source === "Check/Money Order") return <FaFileInvoiceDollar />;
  return <FaMoneyBillWave />;
};

const getApprovedByName = (payment) => firstValue(payment?.approvedByName, "—");

const getPaymentNote = (payment) =>
  firstValue(
    payment?.note,
    payment?.notes,
    payment?.description,
    payment?.remarks,
    "",
  );

const getPaidDate = (payment) =>
  firstValue(
    payment?.paidAt,
    payment?.paymentDate,
    payment?.paidDate,
    payment?.transactionDate,
    payment?.recordedAt,
    payment?.createdAt,
    "",
  );

const getDueDate = (payment) =>
  firstValue(
    payment?.dueDate,
    payment?.paymentDueDate,
    payment?.monthlyDueDate,
    "",
  );

const getRecordedBy = (payment) => {
  const admin =
    payment?.recordedBy || payment?.createdBy || payment?.processedBy;

  if (typeof admin === "string") {
    return admin;
  }

  if (admin && typeof admin === "object") {
    return firstValue(
      admin?.fullName,
      admin?.name,
      admin?.email,
      admin?._id,
      "Admin",
    );
  }

  return firstValue(
    payment?.adminName,
    payment?.approvedBy,
    payment?.processedBy,
    "—",
  );
};

/* ============================================================
   RECEIPT
============================================================ */

const getReceiptUrl = (payment) =>
  firstValue(
    payment?.paymentReceipt?.url,
    payment?.paymentReceipt?.secure_url,
    payment?.paymentReceipt?.secureUrl,
    payment?.receipt?.url,
    payment?.receipt?.secure_url,
    payment?.receipt?.secureUrl,
    payment?.receiptUrl,
    payment?.receiptURL,
    typeof payment?.receipt === "string" ? payment.receipt : "",
    payment?.screenshotUrl,
    payment?.screenshot,
    "",
  );

const getReceiptPublicId = (payment) =>
  firstValue(
    payment?.paymentReceipt?.publicId,
    payment?.paymentReceipt?.public_id,
    payment?.receipt?.publicId,
    payment?.receipt?.public_id,
    payment?.receiptPublicId,
    "",
  );

/* ============================================================
   STATUS
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
   MONTHS
============================================================ */

const getPaymentMonthDate = (payment) =>
  firstValue(
    payment?.paymentMonth,
    payment?.monthDate,
    payment?.billingMonth,
    payment?.month,
    payment?.paidForMonth,
    "",
  );

const getStartingMonthKey = (payment) =>
  dateToMonthKey(getPaymentMonthDate(payment));

const getNumberOfMonths = (payment) => {
  const number = Number(
    firstValue(
      payment?.numberOfMonths,
      payment?.months,
      payment?.durationMonths,
      payment?.monthsCount,
      1,
    ),
  );

  if (!Number.isFinite(number) || number < 1) {
    return 1;
  }

  return Math.floor(number);
};

const getPaidMonthKeys = (payment) => {
  if (Array.isArray(payment?.paidMonths) && payment.paidMonths.length > 0) {
    return Array.from(
      new Set(
        payment.paidMonths
          .map((month) => dateToMonthKey(month))
          .filter(Boolean),
      ),
    ).sort();
  }

  const startingMonth = getStartingMonthKey(payment);

  if (!startingMonth) {
    return [];
  }

  return Array.from({ length: getNumberOfMonths(payment) }, (_, index) =>
    addMonthsToMonthKey(startingMonth, index),
  ).filter(Boolean);
};

const getPaidMonthObjects = (payment) =>
  getPaidMonthKeys(payment).map((monthKey, index) => ({
    monthKey,
    label: monthKeyToLabel(monthKey),
    shortLabel: monthKeyToShortLabel(monthKey),
    sequence: index + 1,
  }));

const getNextPaymentMonthKey = (payment) => {
  const months = getPaidMonthKeys(payment);

  if (months.length > 0) {
    return addMonthsToMonthKey(months[months.length - 1], 1);
  }

  const startingMonth = getStartingMonthKey(payment);

  if (startingMonth) {
    return addMonthsToMonthKey(startingMonth, getNumberOfMonths(payment));
  }

  return "";
};

const getNextPaymentMonthLabel = (payment) => {
  const month = getNextPaymentMonthKey(payment);

  return month ? monthKeyToLabel(month) : "Not available";
};

/* ============================================================
   API HELPERS
============================================================ */

const extractPayments = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.payments)) {
    return data.payments;
  }

  if (Array.isArray(data?.monthlyPayments)) {
    return data.monthlyPayments;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const extractUpdatedPayment = (response, fallbackPayment, status) => {
  const data = response?.data;

  const updated = data?.payment || data?.monthlyPayment || data?.data;

  if (updated && typeof updated === "object" && !Array.isArray(updated)) {
    return updated;
  }

  return {
    ...fallbackPayment,
    status,
  };
};

const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* ============================================================
   LOCAL REJECTION REASON HELPERS
============================================================ */

const loadStoredRejectionReasons = () => {
  try {
    const raw = window.localStorage.getItem(REJECTION_REASON_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.error("LOAD REJECTION REASONS ERROR:", error);

    return {};
  }
};

const saveStoredRejectionReasons = (reasons) => {
  try {
    window.localStorage.setItem(
      REJECTION_REASON_STORAGE_KEY,
      JSON.stringify(reasons),
    );
  } catch (error) {
    console.error("SAVE REJECTION REASONS ERROR:", error);
  }
};

/* ============================================================
   COMPONENT
============================================================ */

const AdminMonthlyPayment = () => {
  const [payments, setPayments] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [monthFilter, setMonthFilter] = useState("All");

  const [methodFilter, setMethodFilter] = useState("All");

  const [sourceFilter, setSourceFilter] = useState("All");
  const [approvedByFilter, setApprovedByFilter] = useState("All");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState(null);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [memberRecords, setMemberRecords] = useState([]);
  const [memberLookupLoading, setMemberLookupLoading] = useState(false);
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);
  const [addPaymentForm, setAddPaymentForm] = useState(() => ({
    memberId: "",
    startingMonth: dateToMonthKey(new Date()),
    months: 1,
    monthlyAmount: "",
    source: "Cash",
    note: "",
  }));

  /* ==========================================================
     DELETE CONFIRMATION
  ========================================================== */

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [deletingId, setDeletingId] = useState("");

  /* ==========================================================
     REJECTION REASON
  ========================================================== */

  const [rejectionTarget, setRejectionTarget] = useState(null);

  const [rejectionReason, setRejectionReason] = useState("");

  /* ==========================================================
     LOCAL REJECTION REASONS
  ========================================================== */

  const [rejectionReasons, setRejectionReasons] = useState(() =>
    loadStoredRejectionReasons(),
  );

  const [updatingId, setUpdatingId] = useState("");

  const [copied, setCopied] = useState(false);

  const selectedMember = useMemo(() => {
    const value = addPaymentForm.memberId.trim().toLowerCase();

    if (!value) {
      return null;
    }

    return (
      memberRecords.find((member) =>
        Array.from(getMemberRecordKeys(member)).includes(value),
      ) || null
    );
  }, [addPaymentForm.memberId, memberRecords]);

  /*
   * Calculate the latest covered month for the selected member from the
   * actual payment history.  Approved payments are authoritative.
   * Multi-month records are expanded through getPaidMonthKeys(), so an
   * approved Aug-Sep-Oct payment correctly makes November the next month.
   */
  const selectedMemberPaymentInfo = useMemo(() => {
    if (!selectedMember) {
      return {
        latestApprovedMonth: "",
        nextPayableMonth: dateToMonthKey(new Date()),
        coveredMonths: new Set(),
      };
    }

    const memberPayments = payments.filter((payment) =>
      paymentBelongsToMember(payment, selectedMember),
    );

    const coveredMonths = new Set();
    let latestApprovedMonth = "";

    memberPayments.forEach((payment) => {
      const months = getPaidMonthKeys(payment);
      const status = normalizeStatus(payment?.status);

      if (status === "Approved") {
        months.forEach((month) => coveredMonths.add(month));

        months.forEach((month) => {
          if (!latestApprovedMonth || month > latestApprovedMonth) {
            latestApprovedMonth = month;
          }
        });
      }
    });

    return {
      latestApprovedMonth,
      nextPayableMonth: latestApprovedMonth
        ? addMonthsToMonthKey(latestApprovedMonth, 1)
        : dateToMonthKey(new Date()),
      coveredMonths,
    };
  }, [selectedMember, payments]);

  const addPaymentTotal =
    Number(addPaymentForm.monthlyAmount || 0) *
    Number(addPaymentForm.months || 0);

  const openAddPayment = async () => {
    setShowAddPayment(true);
    setError("");

    // Always refresh payment data before opening the admin-entry form.
    // This prevents an old dashboard state from hiding the latest paid month.
    try {
      setRefreshing(true);
      const [paymentsResponse, membersResponse] = await Promise.all([
        api.get(`${PAYMENT_ROUTE}/admin/all`),
        memberRecords.length > 0 ? Promise.resolve(null) : api.get("/members"),
      ]);

      const receivedPayments = paymentsResponse
        ? extractPayments(paymentsResponse)
        : payments;

      if (Array.isArray(receivedPayments)) {
        setPayments(receivedPayments);
      }

      if (membersResponse) {
        setMemberRecords(membersResponse.data?.members || []);
      }
    } catch (err) {
      showError(
        getApiErrorMessage(
          err,
          "Unable to load the latest payment information.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const closeAddPayment = () => {
    if (addPaymentLoading) {
      return;
    }

    setShowAddPayment(false);
    setAddPaymentForm({
      memberId: "",
      startingMonth: dateToMonthKey(new Date()),
      months: 1,
      monthlyAmount: "",
      source: "Cash",
      note: "",
    });
  };

  const updateAddPaymentMemberId = (value) => {
    const normalized = value.trim().toLowerCase();
    const member = memberRecords.find((item) =>
      Array.from(getMemberRecordKeys(item)).includes(normalized),
    );

    const memberPayments = member
      ? payments.filter((payment) => paymentBelongsToMember(payment, member))
      : [];

    let latestApprovedMonth = "";

    memberPayments.forEach((payment) => {
      if (normalizeStatus(payment?.status) !== "Approved") return;

      getPaidMonthKeys(payment).forEach((month) => {
        if (!latestApprovedMonth || month > latestApprovedMonth) {
          latestApprovedMonth = month;
        }
      });
    });

    const nextPayableMonth = latestApprovedMonth
      ? addMonthsToMonthKey(latestApprovedMonth, 1)
      : dateToMonthKey(new Date());

    setAddPaymentForm((previous) => ({
      ...previous,
      memberId: value,
      startingMonth: nextPayableMonth,
      months: 1,
      monthlyAmount: member?.monthlyPaymentAmount ?? previous.monthlyAmount,
    }));
  };

  const submitAddPayment = async (event) => {
    event.preventDefault();

    const months = Number(addPaymentForm.months);
    const monthlyAmount = Number(addPaymentForm.monthlyAmount);

    if (!selectedMember) {
      showError("Enter a valid member ID before recording the payment.");
      return;
    }

    if (
      !addPaymentForm.startingMonth ||
      !Number.isInteger(months) ||
      months < 1
    ) {
      showError("Choose a starting month and enter at least one month.");
      return;
    }

    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      showError("Enter a valid monthly payment amount.");
      return;
    }

    const paidMonths = Array.from({ length: months }, (_, index) =>
      addMonthsToMonthKey(addPaymentForm.startingMonth, index),
    );

    const existingCoveredMonths = new Set(
      payments
        .filter((payment) => paymentBelongsToMember(payment, selectedMember))
        .flatMap((payment) => getPaidMonthKeys(payment)),
    );

    if (paidMonths.some((month) => existingCoveredMonths.has(month))) {
      showError(
        "One or more selected months are already recorded for this member.",
      );
      return;
    }

    // An admin payment must continue from the latest approved month.
    // This prevents accidentally entering a payment in an older/future gap
    // and keeps multi-month records consecutive.
    const latestApprovedMonth = paidMonths.length
      ? payments
          .filter((payment) => paymentBelongsToMember(payment, selectedMember))
          .filter((payment) => normalizeStatus(payment?.status) === "Approved")
          .flatMap((payment) => getPaidMonthKeys(payment))
          .sort()
          .pop() || ""
      : "";

    const expectedStartingMonth = latestApprovedMonth
      ? addMonthsToMonthKey(latestApprovedMonth, 1)
      : dateToMonthKey(new Date());

    if (addPaymentForm.startingMonth !== expectedStartingMonth) {
      showError(
        `The latest approved month is ${latestApprovedMonth || "none"}. ` +
          `The next payable month is ${expectedStartingMonth}.`,
      );
      return;
    }

    const payload = {
      memberId: getMemberRecordId(selectedMember),
      amount: monthlyAmount * months,
      monthlyAmount,
      paymentAmount: monthlyAmount * months,
      paymentMonth: addPaymentForm.startingMonth,
      paymentMonths: paidMonths,
      numberOfMonths: months,
      paidMonths,
      status: "Approved",
      // Payment source selected by the administrator.
      // Square remains handled by the existing Square flow.
      paymentMethod: addPaymentForm.source,
      paymentSource: addPaymentForm.source,
      currency: "USD",
      // Keep this existing field for backward compatibility with Cash records.
      cashPaymentDate: new Date().toISOString(),
      note: addPaymentForm.note.trim(),
    };

    try {
      setAddPaymentLoading(true);
      setError("");

      const response = await api.post(`${PAYMENT_ROUTE}/admin`, payload);

      const createdPayment =
        response.data?.payment ||
        response.data?.monthlyPayment ||
        response.data?.data;

      setPayments((previous) => [createdPayment || payload, ...previous]);
      setAddPaymentLoading(false);
      closeAddPayment();
      showSuccess(
        `${addPaymentForm.source} payment added successfully — USD ${formatCurrency(
          monthlyAmount * months,
        )} for ${months} month${months === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      showError(
        getApiErrorMessage(err, "Unable to record the monthly payment."),
      );
    } finally {
      setAddPaymentLoading(false);
    }
  };

  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const showSuccess = useCallback((message) => {
    setError("");
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }, []);

  const showError = useCallback((message) => {
    setSuccess("");
    setError(message);
  }, []);

  /* ==========================================================
     SAVE LOCAL REJECTION REASON
  ========================================================== */

  const saveRejectionReason = useCallback((payment, reason) => {
    const databaseId = getDatabaseId(payment);

    if (!databaseId || !reason.trim()) {
      return;
    }

    setRejectionReasons((previous) => {
      const next = {
        ...previous,
        [databaseId]: reason.trim(),
      };

      saveStoredRejectionReasons(next);

      return next;
    });
  }, []);

  /* ==========================================================
     LOAD PAYMENTS
  ========================================================== */

  const loadPayments = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await api.get(`${PAYMENT_ROUTE}/admin/all`);

        const received = extractPayments(response);

        setPayments(Array.isArray(received) ? received : []);
      } catch (err) {
        console.error("ADMIN MONTHLY PAYMENT LOAD ERROR:", err);

        showError(getApiErrorMessage(err, "Unable to load monthly payments."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  /* ==========================================================
     FILTER OPTIONS
  ========================================================== */

  const monthOptions = useMemo(() => {
    const map = new Map();

    payments.forEach((payment) => {
      getPaidMonthKeys(payment).forEach((month) => {
        if (!map.has(month)) {
          map.set(month, monthKeyToLabel(month));
        }
      });
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  const methodOptions = useMemo(() => {
    const set = new Set();

    payments.forEach((payment) => {
      const method = getPaymentMethod(payment);

      if (method && method !== "—") {
        set.add(method);
      }
    });

    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [payments]);

  const sourceOptions = useMemo(() => {
    const set = new Set(DEFAULT_SOURCE_OPTIONS);

    payments.forEach((payment) => {
      const source = getPaymentSource(payment);

      if (source) {
        set.add(source);
      }
    });

    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [payments]);

  const approvedByOptions = useMemo(() => {
    const set = new Set();

    payments.forEach((payment) => {
      const approvedBy = getApprovedByName(payment);

      if (approvedBy && approvedBy !== "—") {
        set.add(approvedBy);
      }
    });

    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [payments]);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const databaseId = getDatabaseId(payment);

      const searchable = [
        getMemberName(payment),
        getMemberEmail(payment),
        getMemberPhone(payment),
        getMemberId(payment),
        getPaymentId(payment),
        getPaymentReference(payment),
        getPaymentMethod(payment),
        getPaymentSource(payment),
        getApprovedByName(payment),
        getSquarePaymentId(payment),
        getSquareOrderId(payment),
        rejectionReasons[databaseId] || "",
        ...getPaidMonthKeys(payment).map(monthKeyToLabel),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        normalizeStatus(payment?.status) === statusFilter;

      const matchesMonth =
        monthFilter === "All" ||
        getPaidMonthKeys(payment).includes(monthFilter);

      const matchesMethod =
        methodFilter === "All" || getPaymentMethod(payment) === methodFilter;

      const matchesSource =
        sourceFilter === "All" || getPaymentSource(payment) === sourceFilter;

      const matchesApprovedBy =
        approvedByFilter === "All" ||
        getApprovedByName(payment) === approvedByFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMonth &&
        matchesMethod &&
        matchesSource &&
        matchesApprovedBy
      );
    });
  }, [
    payments,
    search,
    statusFilter,
    monthFilter,
    methodFilter,
    sourceFilter,
    approvedByFilter,
    rejectionReasons,
  ]);

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));

  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(Math.max(previousPage, 1), totalPages),
    );
  }, [totalPages]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredPayments.slice(startIndex, startIndex + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const paginationStart =
    filteredPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const paginationEnd = Math.min(
    currentPage * pageSize,
    filteredPayments.length,
  );

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);

    setCurrentPage(nextPage);

    window.requestAnimationFrame(() => {
      const table = document.querySelector("[data-payment-table]");

      if (table) {
        table.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];

    if (currentPage > 3) {
      pages.push("ellipsis-left");
    }

    const start = Math.max(2, currentPage - 1);

    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-right");
    }

    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const stats = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];

    payments.forEach((payment) => {
      const status = normalizeStatus(payment?.status);

      if (status === "Pending") pending.push(payment);
      if (status === "Approved") approved.push(payment);
      if (status === "Rejected") rejected.push(payment);
    });

    const sum = (items) =>
      items.reduce((total, payment) => total + getPaymentAmount(payment), 0);

    const sourceMap = new Map();
    payments.forEach((payment) => {
      const source = getPaymentSource(payment);
      const current = sourceMap.get(source) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += getPaymentAmount(payment);
      sourceMap.set(source, current);
    });

    const approvedByMap = new Map();
    payments.forEach((payment) => {
      const approver = getApprovedByName(payment);
      const key = approver && approver !== "—" ? approver : "Not approved yet";
      const current = approvedByMap.get(key) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += getPaymentAmount(payment);
      approvedByMap.set(key, current);
    });

    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const approvedByBreakdown = Array.from(approvedByMap.entries())
      .map(([approvedBy, data]) => ({ approvedBy, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const square = sourceMap.get("Square") || { count: 0, amount: 0 };
    const cash = sourceMap.get("Cash") || { count: 0, amount: 0 };

    return {
      total: payments.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      square: square.count,
      cash: cash.count,
      totalAmount: sum(payments),
      pendingAmount: sum(pending),
      approvedAmount: sum(approved),
      rejectedAmount: sum(rejected),
      squareAmount: square.amount,
      cashAmount: cash.amount,
      sourceBreakdown,
      approvedByBreakdown,
    };
  }, [payments]);

  const filteredInsights = useMemo(() => {
    const sourceMap = new Map();
    const approverMap = new Map();
    const approverSourceMap = new Map();

    filteredPayments.forEach((payment) => {
      const amount = getPaymentAmount(payment);
      const source = getPaymentSource(payment);
      const approver = getApprovedByName(payment);
      const approverKey =
        approver && approver !== "—" ? approver : "Not approved yet";

      const sourceData = sourceMap.get(source) || { count: 0, amount: 0 };
      sourceData.count += 1;
      sourceData.amount += amount;
      sourceMap.set(source, sourceData);

      const approverData = approverMap.get(approverKey) || {
        count: 0,
        amount: 0,
      };
      approverData.count += 1;
      approverData.amount += amount;
      approverMap.set(approverKey, approverData);

      const combinationKey = `${approverKey}|||${source}`;
      const combinationData = approverSourceMap.get(combinationKey) || {
        approvedBy: approverKey,
        source,
        count: 0,
        amount: 0,
      };
      combinationData.count += 1;
      combinationData.amount += amount;
      approverSourceMap.set(combinationKey, combinationData);
    });

    return {
      recordCount: filteredPayments.length,
      totalAmount: filteredPayments.reduce(
        (total, payment) => total + getPaymentAmount(payment),
        0,
      ),
      sourceBreakdown: Array.from(sourceMap.entries())
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.amount - a.amount),
      approvedByBreakdown: Array.from(approverMap.entries())
        .map(([approvedBy, data]) => ({ approvedBy, ...data }))
        .sort((a, b) => b.amount - a.amount),
      approverSourceBreakdown: Array.from(approverSourceMap.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
    };
  }, [filteredPayments]);

  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  const performStatusUpdate = async (payment, newStatus) => {
    if (newStatus === "Rejected") {
      showError(
        "Administrative access required: only the main administrative administrator can reject monthly payments.",
      );
      return;
    }

    const databaseId = getDatabaseId(payment);

    if (!databaseId) {
      showError("This payment does not have a valid database ID.");
      return;
    }

    const currentStatus = normalizeStatus(payment?.status);

    if (currentStatus === newStatus) {
      return;
    }

    try {
      setUpdatingId(databaseId);
      setError("");

      const response = await api.patch(`${PAYMENT_ROUTE}/admin/${databaseId}`, {
        status: newStatus,
      });

      const updatedPayment = extractUpdatedPayment(
        response,
        payment,
        newStatus,
      );

      setPayments((previous) =>
        previous.map((item) =>
          getDatabaseId(item) === databaseId
            ? {
                ...item,
                ...updatedPayment,
                status: updatedPayment?.status || newStatus,
              }
            : item,
        ),
      );

      setSelectedPayment((previous) =>
        previous && getDatabaseId(previous) === databaseId
          ? {
              ...previous,
              ...updatedPayment,
              status: updatedPayment?.status || newStatus,
            }
          : previous,
      );

      showSuccess(
        newStatus === "Approved"
          ? "Payment approved successfully."
          : "Payment moved back to pending.",
      );
    } catch (err) {
      console.error("UPDATE MONTHLY PAYMENT STATUS ERROR:", err);
      showError(getApiErrorMessage(err, "Unable to update payment status."));
    } finally {
      setUpdatingId("");
    }
  };
  /* ==========================================================
     REJECTION MODAL
  ========================================================== */

  const openRejectConfirmation = () => {
    showError(
      "Restricted action: only the main administrative administrator can reject monthly payments.",
    );
  };
  /* ==========================================================
     DELETE
  ========================================================== */

  const confirmDelete = () => {
    showError(
      "Restricted action: only the main administrative administrator can delete monthly payment records.",
    );
  };
  /* ==========================================================
     COPY
  ========================================================== */

  const copyReference = async (reference) => {
    if (!reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(reference));

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error("COPY REFERENCE ERROR:", err);

      showError("Unable to copy the payment reference.");
    }
  };

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  /* ==========================================================
     EXPORT ALL PAYMENTS TO EXCEL
  ========================================================== */

  const exportPaymentsToExcel = () => {
    try {
      if (!payments.length) {
        showError("There are no monthly payment records to export.");
        return;
      }

      // Export every payment loaded from the admin API, not only the
      // currently filtered or paginated records.
      const exportRows = payments.map((payment, index) => {
        const databaseId = getDatabaseId(payment);
        const paidMonths = getPaidMonthObjects(payment);
        const rejectionReason = databaseId
          ? rejectionReasons[databaseId] || ""
          : "";

        // Keep the amount as a real JavaScript number so Excel receives
        // an actual numeric value instead of an empty/text cell.
        const exportAmount = Number(getPaymentAmount(payment));

        return {
          "No.": index + 1,
          "Member Name": getMemberName(payment),
          "Member ID": getMemberId(payment),
          Email: getMemberEmail(payment),
          Phone: getMemberPhone(payment),
          "Amount (USD)": Number.isFinite(exportAmount) ? exportAmount : 0,
          "Payment ID": getPaymentId(payment),
          "Payment Reference": getPaymentReference(payment),
          "Payment Method": getPaymentMethod(payment),
          "Payment Source": getPaymentSource(payment),
          Status: normalizeStatus(payment?.status),
          "Starting Month": getStartingMonthKey(payment)
            ? monthKeyToLabel(getStartingMonthKey(payment))
            : "Not recorded",
          "Months Covered": paidMonths.map((month) => month.label).join(", "),
          "Number of Months": paidMonths.length || getNumberOfMonths(payment),
          "Next Payment": getNextPaymentMonthLabel(payment),
          "Paid Date": formatDateTime(getPaidDate(payment)),
          "Due Date": formatDate(getDueDate(payment)),
          "Square Payment ID": getSquarePaymentId(payment),
          "Square Order ID": getSquareOrderId(payment),
          "Square Status": getSquareStatus(payment),
          "Recorded / Processed By": getRecordedBy(payment),
          "Payment Note": getPaymentNote(payment),
          "Rejection Reason": rejectionReason,
          "Receipt ID": getReceiptPublicId(payment),
          "Receipt URL": getReceiptUrl(payment),
          "Database ID": databaseId,
          "Created At": formatDateTime(payment?.createdAt),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      /*
       * IMPORTANT:
       * Explicitly write the Amount column back into the worksheet as
       * numeric Excel cells. This prevents the amount from appearing
       * empty in Excel even when the payment object contains the value.
       */
      const amountColumnIndex = Object.keys(exportRows[0]).indexOf(
        "Amount (USD)",
      );

      if (amountColumnIndex >= 0) {
        const amountColumnLetter = XLSX.utils.encode_col(amountColumnIndex);

        exportRows.forEach((row, rowIndex) => {
          const cellAddress = `${amountColumnLetter}${rowIndex + 2}`;
          const amount = Number(row["Amount (USD)"]);

          worksheet[cellAddress] = {
            t: "n",
            v: Number.isFinite(amount) ? amount : 0,
            z: "$#,##0.00",
          };
        });
      }

      // Keep the header visible and enable Excel filtering.
      worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
      worksheet["!autofilter"] = {
        ref: worksheet["!ref"],
      };

      const columnWidths = [
        7, 24, 18, 30, 18, 15, 22, 28, 20, 16, 14, 20, 42, 16, 20, 22, 18, 28,
        28, 20, 26, 35, 35, 30, 42, 26,
      ];

      worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Payments");

      // Add a separate summary sheet so the exported workbook also
      // contains the dashboard totals.
      const summaryRows = [
        { Metric: "Total Payment Records", Value: stats.total },
        { Metric: "Approved Records", Value: stats.approved },
        { Metric: "Pending Records", Value: stats.pending },
        { Metric: "Rejected Records", Value: stats.rejected },
        { Metric: "Square Payments", Value: stats.square },
        { Metric: "Cash Payments", Value: stats.cash },
        {
          Metric: "Zelle Payments",
          Value:
            stats.sourceBreakdown.find((item) => item.source === "Zelle")
              ?.count || 0,
        },
        {
          Metric: "Check/Money Order Payments",
          Value:
            stats.sourceBreakdown.find(
              (item) => item.source === "Check/Money Order",
            )?.count || 0,
        },
        { Metric: "Total Amount (USD)", Value: stats.totalAmount },
        { Metric: "Approved Amount (USD)", Value: stats.approvedAmount },
        { Metric: "Pending Amount (USD)", Value: stats.pendingAmount },
        { Metric: "Rejected Amount (USD)", Value: stats.rejectedAmount },
        { Metric: "Square Amount (USD)", Value: stats.squareAmount },
        { Metric: "Cash Amount (USD)", Value: stats.cashAmount },
        {
          Metric: "Zelle Amount (USD)",
          Value:
            stats.sourceBreakdown.find((item) => item.source === "Zelle")
              ?.amount || 0,
        },
        {
          Metric: "Check/Money Order Amount (USD)",
          Value:
            stats.sourceBreakdown.find(
              (item) => item.source === "Check/Money Order",
            )?.amount || 0,
        },
        { Metric: "Exported At", Value: formatDateTime(new Date()) },
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);

      // Also make all summary amount cells explicit Excel numeric cells.
      const summaryAmountRows = summaryRows
        .map((row, index) => ({
          ...row,
          rowNumber: index + 2,
        }))
        .filter((row) => String(row.Metric).includes("Amount (USD)"));

      summaryAmountRows.forEach((row) => {
        const cellAddress = `B${row.rowNumber}`;
        const amount = Number(row.Value);

        summaryWorksheet[cellAddress] = {
          t: "n",
          v: Number.isFinite(amount) ? amount : 0,
          z: "$#,##0.00",
        };
      });

      summaryWorksheet["!cols"] = [{ wch: 30 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours(),
      ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

      XLSX.writeFile(workbook, `monthly-payments-${timestamp}.xlsx`);

      showSuccess(
        `Successfully exported ${payments.length} monthly payment record${
          payments.length === 1 ? "" : "s"
        } to Excel.`,
      );
    } catch (err) {
      console.error("EXPORT MONTHLY PAYMENTS ERROR:", err);
      showError("Unable to export monthly payments to Excel.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setMonthFilter("All");
    setMethodFilter("All");
    setSourceFilter("All");
    setApprovedByFilter("All");
    setCurrentPage(1);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "All" ||
    monthFilter !== "All" ||
    methodFilter !== "All" ||
    sourceFilter !== "All" ||
    approvedByFilter !== "All";

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    monthFilter,
    methodFilter,
    sourceFilter,
    approvedByFilter,
  ]);

  /* ==========================================================
     MODAL
  ========================================================== */

  const openPaymentDetails = (payment) => {
    setCopied(false);
    setSelectedPayment(payment);
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setCopied(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (rejectionTarget) {
        closeRejectConfirmation();
        return;
      }

      if (deleteTarget) {
        closeDeleteConfirmation();
        return;
      }

      if (showAddPayment) {
        closeAddPayment();
        return;
      }

      setSelectedPayment(null);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [rejectionTarget, deleteTarget, showAddPayment, updatingId, deletingId]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.container}>
          <div className={styles.loadingPage}>
            <div className={styles.loadingSpinner}>
              <FaSyncAlt />
            </div>

            <h2>Loading payments</h2>

            <p>Preparing your monthly payment dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <AdminLayout>
      <div className={styles.container}>
        {/* ====================================================
            TOASTS
        ==================================================== */}

        {success && (
          <div className={styles.successToast}>
            <div className={styles.toastIcon}>
              <FaCheckCircle />
            </div>

            <div>
              <strong>Success</strong>

              <span>{success}</span>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Close success message"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorToast}>
            <div className={styles.toastIcon}>
              <FaExclamationTriangle />
            </div>

            <div>
              <strong>Action failed</strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error message"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <div className={styles.eyebrow}>
              <FaShieldAlt />
              Secure Payment Administration
            </div>

            <h1>Monthly Payments</h1>

            <p>
              Monitor member contributions, verify online payments, review
              covered months, and manage payment records from one professional
              dashboard.
            </p>

            <div className={styles.heroBadges}>
              <span>
                <FaReceipt />
                {stats.total} records
              </span>

              <span>
                <FaCheckCircle />
                {stats.approved} approved
              </span>

              <span>
                <FaClock />
                {stats.pending} pending
              </span>
            </div>
          </div>

          <div className={styles.heroSide}>
            <div className={styles.heroIcon}>
              <FaMoneyBillWave />
            </div>

            <button
              type="button"
              className={styles.refreshHero}
              onClick={() => loadPayments(true)}
              disabled={refreshing}
            >
              <FaSyncAlt className={refreshing ? styles.spin : ""} />

              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </section>

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconBlue}>
              <FaReceipt />
            </div>

            <div>
              <span>Total Payments</span>

              <strong>{stats.total}</strong>

              <small>All payment records</small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconOrange}>
              <FaClock />
            </div>

            <div>
              <span>Pending Review</span>

              <strong>{stats.pending}</strong>

              <small>USD {formatCurrency(stats.pendingAmount)}</small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconGreen}>
              <FaCheckCircle />
            </div>

            <div>
              <span>Approved</span>

              <strong>{stats.approved}</strong>

              <small>USD {formatCurrency(stats.approvedAmount)}</small>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconGold}>
              <FaChartLine />
            </div>

            <div>
              <span>Total Amount</span>

              <strong>USD {formatCurrency(stats.totalAmount)}</strong>

              <small>{stats.rejected} rejected</small>
            </div>
          </div>
        </section>

        {/* ====================================================
            PAYMENT SOURCE SUMMARY
        ==================================================== */}

        <section className={styles.channelGrid}>
          {[
            {
              label: "Square Payments",
              source: "Square",
              icon: <FaGlobe />,
              count:
                stats.sourceBreakdown.find((item) => item.source === "Square")
                  ?.count || 0,
              amount:
                stats.sourceBreakdown.find((item) => item.source === "Square")
                  ?.amount || 0,
            },
            {
              label: "Cash Payments",
              source: "Cash",
              icon: <FaMoneyBillWave />,
              count:
                stats.sourceBreakdown.find((item) => item.source === "Cash")
                  ?.count || 0,
              amount:
                stats.sourceBreakdown.find((item) => item.source === "Cash")
                  ?.amount || 0,
            },
            {
              label: "Zelle Payments",
              source: "Zelle",
              icon: <FaCreditCard />,
              count:
                stats.sourceBreakdown.find((item) => item.source === "Zelle")
                  ?.count || 0,
              amount:
                stats.sourceBreakdown.find((item) => item.source === "Zelle")
                  ?.amount || 0,
            },
            {
              label: "Check / Money Order",
              source: "Check/Money Order",
              icon: <FaFileInvoiceDollar />,
              count:
                stats.sourceBreakdown.find(
                  (item) => item.source === "Check/Money Order",
                )?.count || 0,
              amount:
                stats.sourceBreakdown.find(
                  (item) => item.source === "Check/Money Order",
                )?.amount || 0,
            },
            {
              label: "Rejected",
              source: "Rejected",
              icon: <FaTimesCircle />,
              count: stats.rejected,
              amount: stats.rejectedAmount,
              danger: true,
            },
          ].map((item) => (
            <div className={styles.channelCard} key={item.source}>
              <div
                className={`${styles.channelIcon} ${
                  item.danger ? styles.dangerIcon : ""
                }`}
              >
                {item.icon}
              </div>

              <div>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
                <small>USD {formatCurrency(item.amount)}</small>
              </div>
            </div>
          ))}
        </section>

        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        <section className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FaSearch />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member, ID, payment, source, approver, reference..."
              aria-label="Search payments"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className={styles.toolbarButtons}>
            <button
              type="button"
              className={styles.addPaymentButton}
              onClick={openAddPayment}
            >
              <FaPlus />
              Add Monthly Payment
            </button>

            <button
              type="button"
              className={styles.filterButton}
              onClick={() => setShowFilters((previous) => !previous)}
            >
              <FaFilter />
              Filters
              <FaChevronDown className={showFilters ? styles.rotate : ""} />
            </button>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={exportPaymentsToExcel}
              disabled={refreshing || payments.length === 0}
              title="Export all monthly payment records to Excel"
            >
              <FaFileInvoiceDollar />
              Export Excel
            </button>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => loadPayments(true)}
              disabled={refreshing}
            >
              <FaSyncAlt className={refreshing ? styles.spin : ""} />
              Refresh
            </button>
          </div>
        </section>

        {/* ====================================================
            FILTER PANEL
        ==================================================== */}

        {showFilters && (
          <section className={styles.filterPanel}>
            <div className={styles.filterItem}>
              <label>Status</label>

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

            <div className={styles.filterItem}>
              <label>Paid Month</label>

              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              >
                <option value="All">All Months</option>

                {monthOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>Payment Method</label>

              <select
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value)}
              >
                <option value="All">All Methods</option>

                {methodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>Payment Source</label>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="All">All Sources</option>

                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>Approved By</label>

              <select
                value={approvedByFilter}
                onChange={(event) => setApprovedByFilter(event.target.value)}
              >
                <option value="All">All Approvers</option>

                {approvedByOptions.map((approvedBy) => (
                  <option key={approvedBy} value={approvedBy}>
                    {approvedBy}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterResult}>
              Showing <strong>{filteredPayments.length}</strong> of{" "}
              <strong>{payments.length}</strong>
            </div>

            {hasFilters && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
          </section>
        )}

        {/* ====================================================
            FILTER INSIGHTS
            Shows exactly how much is in the current filtered view,
            grouped by payment source and by approver.
        ==================================================== */}

        <section
          style={{
            marginTop: "18px",
            padding: "20px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  fontWeight: 800,
                  color: "#111827",
                  fontSize: "16px",
                }}
              >
                <FaChartLine />
                Payment Insights
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                The totals below update automatically with your filters.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                }}
              >
                <small style={{ display: "block", color: "#64748b" }}>
                  Records
                </small>
                <strong style={{ fontSize: "17px", color: "#0f172a" }}>
                  {filteredInsights.recordCount}
                </strong>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                }}
              >
                <small style={{ display: "block", color: "#64748b" }}>
                  Filtered amount
                </small>
                <strong style={{ fontSize: "17px", color: "#047857" }}>
                  USD {formatCurrency(filteredInsights.totalAmount)}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <strong style={{ color: "#0f172a" }}>By Payment Source</strong>
                <FaMoneyBillWave />
              </div>

              {filteredInsights.sourceBreakdown.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  No matching payments.
                </span>
              ) : (
                filteredInsights.sourceBreakdown.map((item) => (
                  <div
                    key={item.source}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "9px 0",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#475569",
                      }}
                    >
                      {getSourceIcon(item.source)}
                      {item.source}
                      <small>({item.count})</small>
                    </span>
                    <strong style={{ color: "#0f172a" }}>
                      USD {formatCurrency(item.amount)}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "#fff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <strong style={{ color: "#0f172a" }}>
                  By Approved / Recorded By
                </strong>
                <FaUserShield />
              </div>

              {filteredInsights.approvedByBreakdown.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  No matching payments.
                </span>
              ) : (
                filteredInsights.approvedByBreakdown.map((item) => (
                  <div
                    key={item.approvedBy}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "9px 0",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <span style={{ color: "#475569" }}>
                      {item.approvedBy} <small>({item.count})</small>
                    </span>
                    <strong style={{ color: "#0f172a" }}>
                      USD {formatCurrency(item.amount)}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {filteredInsights.approverSourceBreakdown.length > 0 && (
            <div
              style={{
                marginTop: "14px",
                padding: "16px",
                borderRadius: "16px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <strong style={{ color: "#0f172a" }}>
                    Amount by Approver &amp; Payment Source
                  </strong>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    See exactly who recorded or approved each payment source and
                    how much.
                  </p>
                </div>
                <FaChartLine />
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "560px",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Approved / Recorded By",
                      "Payment Source",
                      "Records",
                      "Amount",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          textAlign:
                            heading === "Amount" || heading === "Records"
                              ? "right"
                              : "left",
                          padding: "10px 8px",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "#64748b",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInsights.approverSourceBreakdown.map((item) => (
                    <tr key={`${item.approvedBy}-${item.source}`}>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                          color: "#334155",
                          fontWeight: 600,
                        }}
                      >
                        {item.approvedBy}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                          color: "#475569",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                          }}
                        >
                          {getSourceIcon(item.source)}
                          {item.source}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                          textAlign: "right",
                          color: "#475569",
                        }}
                      >
                        {item.count}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                          textAlign: "right",
                          color: "#0f172a",
                          fontWeight: 800,
                        }}
                      >
                        USD {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <section className={styles.tableCard} data-payment-table>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableTitle}>
                <h2>Payment Records</h2>

                <span>
                  {filteredPayments.length === 0
                    ? 0
                    : `${paginationStart}–${paginationEnd} / ${filteredPayments.length}`}
                </span>
              </div>

              <p>
                Review payment status, covered months, payment method and Square
                transaction information.
              </p>
            </div>

            <div className={styles.liveStatus}>
              <span />
              Live
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className={styles.emptyState}>
              <div>
                <FaReceipt />
              </div>

              <h3>No payment records found</h3>

              <p>
                {hasFilters
                  ? "Try changing your search or filters."
                  : "Payment records will appear here when they are created."}
              </p>

              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Payment</th>
                    <th>Months Covered</th>
                    <th>Next Payment</th>
                    <th>Paid</th>
                    <th>Method</th>
                    <th>Source</th>
                    <th>Approved By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedPayments.map((payment) => {
                    const databaseId = getDatabaseId(payment);

                    const name = getMemberName(payment);

                    const status = normalizeStatus(payment?.status);

                    const source = getPaymentSource(payment);

                    const months = getPaidMonthObjects(payment);

                    const updating = updatingId === databaseId;

                    const deleting = deletingId === databaseId;

                    return (
                      <tr key={databaseId || `${name}-${getPaidDate(payment)}`}>
                        <td>
                          <div className={styles.memberCell}>
                            <div className={styles.avatar}>
                              {getInitials(name)}
                            </div>

                            <div>
                              <strong>{name}</strong>

                              <span>{getMemberEmail(payment)}</span>

                              <small>ID: {getMemberId(payment)}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.amountCell}>
                            <FaMoneyBillWave />

                            <strong>
                              USD {formatCurrency(getPaymentAmount(payment))}
                            </strong>
                          </div>

                          <small className={styles.mutedText}>
                            {getPaymentId(payment) || "No payment ID"}
                          </small>
                        </td>

                        <td>
                          <div className={styles.monthCell}>
                            <FaCalendarCheck />

                            <div>
                              <strong>
                                {months.length
                                  ? `${months[0].shortLabel} → ${months[months.length - 1].shortLabel}`
                                  : "No months"}
                              </strong>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.nextPayment}>
                            <FaArrowRight />

                            <div>
                              <strong>
                                {getNextPaymentMonthLabel(payment)}
                              </strong>

                              <small>Next payment</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.dateCell}>
                            <FaClock />

                            {formatDate(getPaidDate(payment))}
                          </div>
                        </td>

                        <td>
                          <div className={styles.methodCell}>
                            <FaCreditCard />

                            <span>{getPaymentMethod(payment)}</span>
                          </div>
                        </td>

                        <td>
                          <span className={styles.sourceBadge}>
                            {getSourceIcon(source)}

                            {source}
                          </span>
                        </td>

                        <td>{getApprovedByName(payment)}</td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              status === "Approved"
                                ? styles.statusApproved
                                : status === "Rejected"
                                  ? styles.statusRejected
                                  : styles.statusPending
                            }`}
                          >
                            {status === "Approved" ? (
                              <FaCheckCircle />
                            ) : status === "Rejected" ? (
                              <FaTimesCircle />
                            ) : (
                              <FaHourglassHalf />
                            )}

                            {status}
                          </span>
                        </td>

                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.viewAction}
                              onClick={() => openPaymentDetails(payment)}
                              title="View details"
                            >
                              <FaEye />
                            </button>

                            <button
                              type="button"
                              className={styles.approveAction}
                              onClick={() =>
                                performStatusUpdate(payment, "Approved")
                              }
                              disabled={
                                !databaseId || updating || status === "Approved"
                              }
                              title="Approve"
                            >
                              {updating ? (
                                <FaSyncAlt className={styles.spin} />
                              ) : (
                                <FaCheck />
                              )}
                            </button>

                            <button
                              type="button"
                              className={styles.rejectAction}
                              onClick={() => openRejectConfirmation(payment)}
                              disabled={
                                !databaseId || updating || status === "Rejected"
                              }
                              title="Reject"
                            >
                              <FaTimes />
                            </button>

                            <button
                              type="button"
                              className={styles.deleteAction}
                              onClick={() => confirmDelete(payment)}
                              disabled={!databaseId || deleting}
                              title="Delete"
                            >
                              {deleting ? (
                                <FaSyncAlt className={styles.spin} />
                              ) : (
                                <FaTrash />
                              )}
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
        </section>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        {filteredPayments.length > 0 && totalPages > 1 && (
          <section
            className={styles.paginationCard}
            aria-label="Payment pagination"
          >
            <div className={styles.paginationInfo}>
              <strong>
                Showing {paginationStart}–{paginationEnd}
              </strong>

              <span>
                of {filteredPayments.length} payment
                {filteredPayments.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.paginationArrow}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>

              <div className={styles.paginationNumbers}>
                {pageNumbers.map((page) =>
                  typeof page === "string" ? (
                    <span key={page} className={styles.paginationEllipsis}>
                      …
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={page}
                      className={`${styles.paginationNumber} ${
                        currentPage === page ? styles.paginationActive : ""
                      }`}
                      onClick={() => goToPage(page)}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                className={styles.paginationArrow}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>
            </div>

            <div className={styles.paginationPageLabel}>
              Page <strong>{currentPage}</strong> of{" "}
              <strong>{totalPages}</strong>
            </div>
          </section>
        )}

        {/* ====================================================
            MOBILE CARDS
        ==================================================== */}

        <div className={styles.mobileList}>
          {paginatedPayments.map((payment) => {
            const databaseId = getDatabaseId(payment);

            const name = getMemberName(payment);

            const status = normalizeStatus(payment?.status);

            const months = getPaidMonthObjects(payment);

            const updating = updatingId === databaseId;

            return (
              <article
                className={styles.mobileCard}
                key={databaseId || `${name}-${getPaidDate(payment)}`}
              >
                <div className={styles.mobileCardHeader}>
                  <div className={styles.memberCell}>
                    <div className={styles.avatar}>{getInitials(name)}</div>

                    <div>
                      <strong>{name}</strong>

                      <span>{getMemberEmail(payment)}</span>
                    </div>
                  </div>

                  <span
                    className={`${styles.statusBadge} ${
                      status === "Approved"
                        ? styles.statusApproved
                        : status === "Rejected"
                          ? styles.statusRejected
                          : styles.statusPending
                    }`}
                  >
                    {status === "Approved" ? (
                      <FaCheckCircle />
                    ) : status === "Rejected" ? (
                      <FaTimesCircle />
                    ) : (
                      <FaHourglassHalf />
                    )}

                    {status}
                  </span>
                </div>

                <div className={styles.mobileAmount}>
                  USD {formatCurrency(getPaymentAmount(payment))}
                </div>

                <div className={styles.mobileMonthBox}>
                  <FaCalendarCheck />

                  <div>
                    <span>Months Covered</span>

                    <strong>
                      {months.length
                        ? `${months[0].shortLabel} → ${months[months.length - 1].shortLabel}`
                        : "No months"}
                    </strong>

                    <small>
                      {months.length} month
                      {months.length === 1 ? "" : "s"}
                    </small>
                  </div>
                </div>

                <div className={styles.mobileGrid}>
                  <div>
                    <span>Next Payment</span>

                    <strong>{getNextPaymentMonthLabel(payment)}</strong>
                  </div>

                  <div>
                    <span>Paid Date</span>

                    <strong>{formatDate(getPaidDate(payment))}</strong>
                  </div>

                  <div>
                    <span>Method</span>

                    <strong>{getPaymentMethod(payment)}</strong>
                  </div>

                  <div>
                    <span>Source</span>

                    <strong>{getPaymentSource(payment)}</strong>
                  </div>

                  <div>
                    <span>Approved By</span>

                    <strong>{getApprovedByName(payment)}</strong>
                  </div>
                </div>

                <div className={styles.mobileActions}>
                  <button
                    type="button"
                    onClick={() => openPaymentDetails(payment)}
                  >
                    <FaEye />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => performStatusUpdate(payment, "Approved")}
                    disabled={!databaseId || updating || status === "Approved"}
                  >
                    {updating ? (
                      <FaSyncAlt className={styles.spin} />
                    ) : (
                      <FaCheck />
                    )}
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => openRejectConfirmation(payment)}
                    disabled={!databaseId || updating || status === "Rejected"}
                  >
                    <FaTimes />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => confirmDelete(payment)}
                    disabled={!databaseId || deletingId === databaseId}
                  >
                    <FaTrash />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* ====================================================
            ADD PAYMENT MODAL
        ==================================================== */}

        {showAddPayment && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeAddPayment();
              }
            }}
          >
            <form
              className={styles.addPaymentModal}
              onSubmit={submitAddPayment}
              aria-modal="true"
              role="dialog"
            >
              <div className={styles.addPaymentHeader}>
                <div>
                  <span>Admin entry</span>
                  <h2>Add Monthly Payment</h2>
                  <p>Record a cash payment for an existing member.</p>
                </div>

                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={closeAddPayment}
                  aria-label="Close add payment form"
                >
                  <FaTimes />
                </button>
              </div>

              <div className={styles.addPaymentFormGrid}>
                <label className={styles.addPaymentField}>
                  <span>Member ID</span>
                  <input
                    value={addPaymentForm.memberId}
                    onChange={(event) =>
                      updateAddPaymentMemberId(event.target.value)
                    }
                    placeholder="Enter member ID"
                    autoComplete="off"
                    required
                  />
                  <small>
                    {memberLookupLoading
                      ? "Loading members..."
                      : selectedMember
                        ? "Member found"
                        : "The member details will appear after a valid ID is entered."}
                  </small>
                </label>

                <div className={styles.memberPreview}>
                  <span>Member information</span>
                  {selectedMember ? (
                    <>
                      <strong>{getMemberRecordName(selectedMember)}</strong>
                      <small>
                        {selectedMember.email || "No email"} ·{" "}
                        {selectedMember.phone || "No phone"}
                      </small>
                    </>
                  ) : (
                    <small>No member selected</small>
                  )}
                </div>

                <label className={styles.addPaymentField}>
                  <span>Starting month</span>
                  <input
                    type="month"
                    value={addPaymentForm.startingMonth}
                    onChange={(event) =>
                      setAddPaymentForm((previous) => ({
                        ...previous,
                        startingMonth: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className={styles.addPaymentField}>
                  <span>Months to pay</span>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    value={addPaymentForm.months}
                    onChange={(event) =>
                      setAddPaymentForm((previous) => ({
                        ...previous,
                        months: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className={styles.addPaymentField}>
                  <span>Monthly amount (USD)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={addPaymentForm.monthlyAmount}
                    onChange={(event) =>
                      setAddPaymentForm((previous) => ({
                        ...previous,
                        monthlyAmount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className={styles.addPaymentField}>
                  <span>Payment source</span>
                  <select
                    value={addPaymentForm.source}
                    onChange={(event) =>
                      setAddPaymentForm((previous) => ({
                        ...previous,
                        source: event.target.value,
                      }))
                    }
                  >
                    <option value="Cash">Cash</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Check/Money Order">Check/Money Order</option>
                  </select>
                </label>

                <label className={styles.addPaymentFieldFull}>
                  <span>Note (optional)</span>
                  <textarea
                    value={addPaymentForm.note}
                    onChange={(event) =>
                      setAddPaymentForm((previous) => ({
                        ...previous,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Add a receipt number or short note"
                    rows="3"
                  />
                </label>
              </div>

              <div className={styles.paymentTotalBox}>
                <span>Total to record</span>
                <strong>USD {formatCurrency(addPaymentTotal)}</strong>
                <small>
                  {addPaymentForm.months || 0} month
                  {Number(addPaymentForm.months) === 1 ? "" : "s"} · Approved
                  immediately
                </small>
              </div>

              <div className={styles.addPaymentActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeAddPayment}
                  disabled={addPaymentLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitPaymentButton}
                  disabled={addPaymentLoading || memberLookupLoading}
                >
                  {addPaymentLoading ? (
                    <FaSyncAlt className={styles.spin} />
                  ) : (
                    <FaCheck />
                  )}
                  {addPaymentLoading ? "Recording..." : "Mark as Paid"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ====================================================
            PAYMENT DETAILS MODAL
        ==================================================== */}

        {selectedPayment && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              style={{
                maxHeight: "calc(100vh - 32px)",
                overflowY: "auto",
              }}
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Close"
              >
                <FaTimes />
              </button>

              <button
                type="button"
                className={styles.printPaymentButton}
                onClick={() => downloadPaymentPdf(selectedPayment)}
                title="Download payment as PDF"
              >
                <FaPrint />
                Print PDF
              </button>

              <div className={styles.modalHeader}>
                <div className={styles.modalAvatar}>
                  {getInitials(getMemberName(selectedPayment))}
                </div>

                <div>
                  <span>Monthly Payment</span>

                  <h2>{getMemberName(selectedPayment)}</h2>

                  <p>Member ID: {getMemberId(selectedPayment)}</p>
                </div>
              </div>

              <div className={styles.modalHeroSummary}>
                <div>
                  <span>Amount Paid</span>

                  <strong>
                    USD {formatCurrency(getPaymentAmount(selectedPayment))}
                  </strong>
                </div>

                <div>
                  <span>Months</span>

                  <strong>{getPaidMonthKeys(selectedPayment).length}</strong>
                </div>

                <div>
                  <span>Next Payment</span>

                  <strong>{getNextPaymentMonthLabel(selectedPayment)}</strong>
                </div>
              </div>

              <div className={styles.modalStatusRow}>
                <span>Current Status</span>

                <span
                  className={`${styles.statusBadge} ${
                    normalizeStatus(selectedPayment.status) === "Approved"
                      ? styles.statusApproved
                      : normalizeStatus(selectedPayment.status) === "Rejected"
                        ? styles.statusRejected
                        : styles.statusPending
                  }`}
                >
                  {normalizeStatus(selectedPayment.status)}
                </span>
              </div>

              {/* MONTHS */}

              <section className={styles.modalSection}>
                <div className={styles.sectionTitle}>
                  <FaCalendarCheck />
                  Months Covered
                </div>

                <div className={styles.coveredMonths}>
                  {getPaidMonthObjects(selectedPayment).length > 0 ? (
                    getPaidMonthObjects(selectedPayment).map((month) => (
                      <div key={month.monthKey}>
                        <FaCheckCircle />

                        <strong>{month.label}</strong>
                      </div>
                    ))
                  ) : (
                    <p>No paid months recorded.</p>
                  )}
                </div>

                <div className={styles.nextPaymentBox}>
                  <FaArrowRight />

                  <div>
                    <span>Next payment</span>

                    <strong>{getNextPaymentMonthLabel(selectedPayment)}</strong>
                  </div>
                </div>
              </section>

              {/* PAYMENT INFORMATION */}

              <section className={styles.modalSection}>
                <div className={styles.sectionTitle}>
                  <FaFileInvoiceDollar />
                  Payment Information
                </div>

                <div className={styles.detailsGrid}>
                  <Detail
                    icon={<FaIdCard />}
                    label="Member ID"
                    value={getMemberId(selectedPayment)}
                  />

                  <Detail
                    icon={<FaUser />}
                    label="Member"
                    value={getMemberName(selectedPayment)}
                  />

                  <Detail
                    icon={<FaEnvelope />}
                    label="Email"
                    value={getMemberEmail(selectedPayment)}
                  />

                  <Detail
                    icon={<FaPhone />}
                    label="Phone"
                    value={getMemberPhone(selectedPayment)}
                  />

                  <Detail
                    icon={<FaCalendarCheck />}
                    label="Starting Month"
                    value={
                      getStartingMonthKey(selectedPayment)
                        ? monthKeyToLabel(getStartingMonthKey(selectedPayment))
                        : "Not recorded"
                    }
                  />

                  <Detail
                    icon={<FaHashtag />}
                    label="Number of Months"
                    value={
                      getPaidMonthKeys(selectedPayment).length ||
                      getNumberOfMonths(selectedPayment)
                    }
                  />

                  <Detail
                    icon={<FaCalendarAlt />}
                    label="Paid Date"
                    value={formatDateTime(getPaidDate(selectedPayment))}
                  />

                  <Detail
                    icon={<FaCalendarAlt />}
                    label="Due Date"
                    value={formatDate(getDueDate(selectedPayment))}
                  />

                  <Detail
                    icon={<FaCreditCard />}
                    label="Payment Method"
                    value={getPaymentMethod(selectedPayment)}
                  />

                  <Detail
                    icon={
                      getPaymentSource(selectedPayment) === "Square" ? (
                        <FaGlobe />
                      ) : (
                        <FaBuilding />
                      )
                    }
                    label="Payment Source"
                    value={getPaymentSource(selectedPayment)}
                  />

                  <Detail
                    icon={<FaReceipt />}
                    label="Payment ID"
                    value={getPaymentId(selectedPayment) || "Not provided"}
                  />

                  <Detail
                    icon={<FaHistory />}
                    label="Created At"
                    value={formatDateTime(selectedPayment.createdAt)}
                  />
                </div>
              </section>

              {/* SQUARE */}

              {(getSquarePaymentId(selectedPayment) ||
                getSquareOrderId(selectedPayment) ||
                getSquareStatus(selectedPayment)) && (
                <section className={styles.squareSection}>
                  <div className={styles.squareHeader}>
                    <div className={styles.squareIcon}>
                      <FaCreditCard />
                    </div>

                    <div>
                      <span>Square Transaction</span>

                      <strong>Square payment verified</strong>
                    </div>
                  </div>

                  <div className={styles.squareGrid}>
                    <Detail
                      label="Square Payment ID"
                      value={
                        getSquarePaymentId(selectedPayment) || "Not available"
                      }
                    />

                    <Detail
                      label="Square Order ID"
                      value={
                        getSquareOrderId(selectedPayment) || "Not available"
                      }
                    />

                    <Detail
                      label="Square Status"
                      value={
                        getSquareStatus(selectedPayment) || "Not available"
                      }
                    />
                  </div>
                </section>
              )}

              {/* REFERENCE */}

              <section className={styles.referenceBox}>
                <div>
                  <span>Payments Reference</span>

                  <strong>
                    {getPaymentReference(selectedPayment) ||
                      "No reference provided"}
                  </strong>
                </div>

                {getPaymentReference(selectedPayment) && (
                  <button
                    type="button"
                    onClick={() =>
                      copyReference(getPaymentReference(selectedPayment))
                    }
                  >
                    <FaCopy />

                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </section>

              {copied && (
                <div className={styles.copiedMessage}>
                  Payment reference copied.
                </div>
              )}

              {/* RECORDED BY */}

              <div className={styles.recordedByBox}>
                <FaUserShield />

                <div>
                  <span>Recorded / Processed By</span>

                  <strong>{getRecordedBy(selectedPayment)}</strong>
                </div>
              </div>

              {/* NOTE */}

              {getPaymentNote(selectedPayment) && (
                <div className={styles.noteBox}>
                  <FaStickyNote />

                  <div>
                    <span>Payment Note</span>

                    <p>{getPaymentNote(selectedPayment)}</p>
                  </div>
                </div>
              )}

              {/* FRONTEND REJECTION REASON */}

              {rejectionReasons[getDatabaseId(selectedPayment)] && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    padding: "14px 16px",
                    marginTop: "14px",
                    borderRadius: "14px",
                    background: "rgba(220, 38, 38, 0.07)",
                    border: "1px solid rgba(220, 38, 38, 0.14)",
                  }}
                >
                  <FaCommentAlt
                    style={{
                      marginTop: "3px",
                      flexShrink: 0,
                    }}
                  />

                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "5px",
                      }}
                    >
                      Rejection Reasons
                    </span>

                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {rejectionReasons[getDatabaseId(selectedPayment)]}
                    </p>

                    <small
                      style={{
                        display: "block",
                        marginTop: "6px",
                        opacity: 0.6,
                      }}
                    >
                      Stored on this admin device
                    </small>
                  </div>
                </div>
              )}

              {/* RECEIPT */}

              <section className={styles.receiptSection}>
                <div className={styles.sectionTitle}>
                  <FaImage />
                  Payment Receipt
                </div>

                {getReceiptUrl(selectedPayment) ? (
                  <a
                    href={getReceiptUrl(selectedPayment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.receiptLink}
                  >
                    <img
                      src={getReceiptUrl(selectedPayment)}
                      alt={`Payment receipt for ${getMemberName(
                        selectedPayment,
                      )}`}
                    />

                    <span>
                      <FaExternalLinkAlt />
                      Open Full Receipt
                    </span>
                  </a>
                ) : (
                  <div className={styles.noReceipt}>
                    <FaImage />

                    <strong>No Receipt Available</strong>

                    <p>
                      {getPaymentSource(selectedPayment) === "Square"
                        ? "This Square payment does not contain a receipt image."
                        : `This ${getPaymentSource(selectedPayment)} payment does not contain a receipt image.`}
                    </p>
                  </div>
                )}

                {getReceiptPublicId(selectedPayment) && (
                  <small>
                    Receipt ID: {getReceiptPublicId(selectedPayment)}
                  </small>
                )}
              </section>

              {/* ACTIONS */}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.pendingButton}
                  onClick={() =>
                    performStatusUpdate(selectedPayment, "Pending")
                  }
                  disabled={updatingId === getDatabaseId(selectedPayment)}
                >
                  <FaHourglassHalf />
                  Pending
                </button>

                <button
                  type="button"
                  className={styles.approveButton}
                  onClick={() =>
                    performStatusUpdate(selectedPayment, "Approved")
                  }
                  disabled={updatingId === getDatabaseId(selectedPayment)}
                >
                  {updatingId === getDatabaseId(selectedPayment) ? (
                    <FaSyncAlt className={styles.spin} />
                  ) : (
                    <FaCheck />
                  )}
                  Approve
                </button>

                <button
                  type="button"
                  className={styles.rejectButton}
                  onClick={() => openRejectConfirmation(selectedPayment)}
                  disabled={updatingId === getDatabaseId(selectedPayment)}
                >
                  <FaTimes />
                  Reject
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => confirmDelete(selectedPayment)}
                  disabled={deletingId === getDatabaseId(selectedPayment)}
                >
                  <FaTrash />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            REJECTION REASON MODAL
        ==================================================== */}

        {rejectionTarget && (
          <div
            className={styles.confirmOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeRejectConfirmation();
              }
            }}
          >
            <div
              className={styles.confirmModal}
              style={{
                width: "min(420px, calc(100vw - 28px))",
                maxHeight: "calc(100vh - 40px)",
                overflowY: "auto",
              }}
            >
              <div
                className={styles.confirmIcon}
                style={{
                  background: "rgba(220, 38, 38, 0.10)",
                }}
              >
                <FaTimesCircle />
              </div>

              <h2>Reject payment?</h2>

              <p>
                Please provide a short reason for rejecting the payment for{" "}
                <strong>{getMemberName(rejectionTarget)}</strong>.
              </p>

              <div
                style={{
                  marginTop: "14px",
                  textAlign: "left",
                }}
              >
                <label
                  htmlFor="rejectionReason"
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "7px",
                  }}
                >
                  Rejection reason
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Example: Payment receipt could not be verified."
                  rows={4}
                  autoFocus
                  disabled={Boolean(updatingId)}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    minHeight: "90px",
                    maxHeight: "160px",
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    padding: "11px 12px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                className={styles.confirmWarning}
                style={{
                  marginTop: "12px",
                }}
              >
                <FaExclamationTriangle />

                <span>The reason is stored only in this browser.</span>
              </div>

              <div className={styles.confirmActions}>
                <button
                  type="button"
                  onClick={closeRejectConfirmation}
                  disabled={Boolean(updatingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitRejection}
                  disabled={Boolean(updatingId) || !rejectionReason.trim()}
                >
                  {updatingId ? (
                    <FaSyncAlt className={styles.spin} />
                  ) : (
                    <FaTimes />
                  )}
                  Reject Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            DELETE CONFIRMATION
        ==================================================== */}

        {deleteTarget && (
          <div
            className={styles.confirmOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDeleteConfirmation();
              }
            }}
          >
            <div
              className={styles.confirmModal}
              style={{
                width: "min(390px, calc(100vw - 28px))",
                maxHeight: "calc(100vh - 40px)",
                overflowY: "auto",
                padding: "22px",
              }}
            >
              <div className={styles.confirmIcon}>
                <FaTrash />
              </div>

              <h2>Delete payment?</h2>

              <p>
                Delete the payment record for{" "}
                <strong>{getMemberName(deleteTarget)}</strong>?
              </p>

              <div
                className={styles.confirmWarning}
                style={{
                  marginTop: "12px",
                  marginBottom: "14px",
                }}
              >
                <FaExclamationTriangle />

                <span>This action cannot be undone.</span>
              </div>

              {/* TYPE DELETE */}

              <div
                style={{
                  textAlign: "left",
                  marginBottom: "14px",
                }}
              >
                <label
                  htmlFor="deleteConfirmation"
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: "7px",
                  }}
                >
                  Type DELETE to confirm
                </label>

                <input
                  id="deleteConfirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  placeholder="DELETE"
                  autoComplete="off"
                  autoFocus
                  disabled={Boolean(deletingId)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "11px",
                    border: "1px solid rgba(0,0,0,0.14)",
                    padding: "11px 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    outline: "none",
                    textTransform: "uppercase",
                  }}
                />
              </div>

              <div className={styles.confirmActions}>
                <button
                  type="button"
                  onClick={closeDeleteConfirmation}
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={deletePayment}
                  disabled={
                    Boolean(deletingId) ||
                    deleteConfirmation.trim() !== "DELETE"
                  }
                >
                  {deletingId ? (
                    <FaSyncAlt className={styles.spin} />
                  ) : (
                    <FaTrash />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

/* ============================================================
   DETAIL COMPONENT
============================================================ */

const Detail = ({ icon, label, value }) => (
  <div className={styles.detailItem}>
    {icon && <div className={styles.detailIcon}>{icon}</div>}

    <div>
      <span>{label}</span>

      <strong>{value || "—"}</strong>
    </div>
  </div>
);

export default AdminMonthlyPayment;
