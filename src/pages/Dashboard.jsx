import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../components/AdminLayout";
import api from "../services/api";
import styles from "../styles/dashboard.module.css";

import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiHeart,
  FiRefreshCw,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiUserPlus,
  FiAlertCircle,
  FiShield,
  FiPieChart,
  FiMinusCircle,
} from "react-icons/fi";

/* ============================================================
   CONSTANTS
============================================================ */

const RECENT_ACTIVITY_PAGE_SIZE = 8;

/* ============================================================
   HELPERS
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

/*
|--------------------------------------------------------------------------
| USD FORMAT
|--------------------------------------------------------------------------
| All financial amounts on the dashboard use USD.
*/
const formatCurrency = (value) => {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const getInitials = (name) => {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
};

const normalizeStatus = (status) => {
  if (!status) {
    return "Pending";
  }

  const value = String(status).trim().toLowerCase();

  if (value === "approved") {
    return "Approved";
  }

  if (value === "rejected") {
    return "Rejected";
  }

  return "Pending";
};

const normalizePaymentMethod = (method) => {
  if (!method) {
    return "square";
  }

  const value = String(method).trim().toLowerCase();

  if (
    value === "square" ||
    value === "square_payment" ||
    value === "square payment"
  ) {
    return "square";
  }

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
  return normalizePaymentMethod(method) === "cash" ? "Cash" : "Square";
};

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

const getMemberFullName = (member) => {
  if (!member) {
    return "Unknown Member";
  }

  return (
    member.fullName ||
    [member.firstName, member.middleName, member.lastName]
      .filter(Boolean)
      .join(" ") ||
    member.name ||
    member.username ||
    "Unknown Member"
  );
};

const getMemberPaymentActivity = (member) => {
  const value =
    member?.paymentActivityStatus ||
    member?.memberActivityStatus ||
    member?.paymentStatus ||
    "";

  return String(value).trim().toLowerCase();
};

const isApprovedMember = (member) => {
  const membershipStatus = String(
    member?.membershipStatus || member?.status || "",
  )
    .trim()
    .toLowerCase();

  return membershipStatus === "approved";
};

const isContributionActive = (member) => {
  const paymentActivity = getMemberPaymentActivity(member);

  return (
    paymentActivity === "active" ||
    paymentActivity === "paid" ||
    paymentActivity === "current"
  );
};

const getPaymentAmount = (payment) => {
  return Number(
    payment?.amount ??
      payment?.paymentAmount ??
      payment?.totalAmount ??
      payment?.paidAmount ??
      0,
  );
};

const getDonationDate = (donation) => {
  return (
    donation?.createdAt ||
    donation?.approvedAt ||
    donation?.paymentDate ||
    donation?.updatedAt
  );
};

const getMonthlyPaymentDate = (payment) => {
  return (
    payment?.paidDate ||
    payment?.paymentDate ||
    payment?.cashPaymentDate ||
    payment?.createdAt ||
    payment?.updatedAt
  );
};

const getMonthlyPaymentName = (payment) => {
  const member = payment?.member || payment?.memberId;

  if (typeof member === "object") {
    return (
      member.fullName ||
      [member.firstName, member.middleName, member.lastName]
        .filter(Boolean)
        .join(" ") ||
      member.name ||
      "Church Member"
    );
  }

  return (
    payment?.memberName || payment?.fullName || payment?.name || "Church Member"
  );
};

const getPaidMonthsCount = (payment) => {
  if (Array.isArray(payment?.paidMonths)) {
    return payment.paidMonths.length;
  }

  if (Array.isArray(payment?.paymentMonths)) {
    return payment.paymentMonths.length;
  }

  const numberOfMonths = Number(payment?.numberOfMonths || 0);

  return numberOfMonths > 0 ? numberOfMonths : 1;
};

/* ============================================================
   EXPENSE HELPERS
============================================================ */

const getExpenseAmount = (expense) => {
  return Number(
    expense?.amount ??
      expense?.expenseAmount ??
      expense?.requestedAmount ??
      expense?.totalAmount ??
      0,
  );
};

const getExpenseDate = (expense) => {
  return (
    expense?.expenseDate ||
    expense?.approvedAt ||
    expense?.createdAt ||
    expense?.updatedAt
  );
};

const getExpenseType = (expense) => {
  return (
    expense?.expenseType ||
    expense?.type ||
    expense?.category ||
    "Other miscellaneous expenses"
  );
};

const getExpenseDescription = (expense) => {
  return (
    expense?.description ||
    expense?.notes ||
    expense?.reason ||
    "Church expense"
  );
};

/* ============================================================
   COMPONENT
============================================================ */

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    members: [],
    donations: [],
    monthlyPayments: [],
    bookings: [],
    events: [],
    expenses: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activityPage, setActivityPage] = useState(1);

  /* ============================================================
     LOAD DASHBOARD DATA
  ============================================================ */

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const responses = await Promise.allSettled([
        api.get("/members"),
        api.get("/donations/admin/all"),
        api.get("/monthly-payments/admin/all"),
        api.get("/booking"),
        api.get("/events"),
        api.get("/expenses/admin/all"),
      ]);

      const [
        membersResponse,
        donationsResponse,
        monthlyPaymentsResponse,
        bookingsResponse,
        eventsResponse,
        expensesResponse,
      ] = responses;

      const members =
        membersResponse.status === "fulfilled"
          ? getArrayFromResponse(membersResponse.value, [
              "members",
              "data",
              "results",
            ])
          : [];

      const donations =
        donationsResponse.status === "fulfilled"
          ? getArrayFromResponse(donationsResponse.value, [
              "donations",
              "data",
              "results",
            ])
          : [];

      const monthlyPayments =
        monthlyPaymentsResponse.status === "fulfilled"
          ? getArrayFromResponse(monthlyPaymentsResponse.value, [
              "payments",
              "monthlyPayments",
              "data",
              "results",
            ])
          : [];

      const bookings =
        bookingsResponse.status === "fulfilled"
          ? getArrayFromResponse(bookingsResponse.value, [
              "bookings",
              "data",
              "results",
            ])
          : [];

      const events =
        eventsResponse.status === "fulfilled"
          ? getArrayFromResponse(eventsResponse.value, [
              "events",
              "data",
              "results",
            ])
          : [];

      const expenses =
        expensesResponse.status === "fulfilled"
          ? getArrayFromResponse(expensesResponse.value, [
              "expenses",
              "data",
              "results",
            ])
          : [];

      setDashboardData({
        members,
        donations,
        monthlyPayments,
        bookings,
        events,
        expenses,
      });

      const failedServices = [];

      if (membersResponse.status === "rejected") {
        failedServices.push("members");
      }

      if (donationsResponse.status === "rejected") {
        failedServices.push("donations");
      }

      if (monthlyPaymentsResponse.status === "rejected") {
        failedServices.push("monthly contributions");
      }

      if (bookingsResponse.status === "rejected") {
        failedServices.push("bookings");
      }

      if (eventsResponse.status === "rejected") {
        failedServices.push("events");
      }

      if (expensesResponse.status === "rejected") {
        failedServices.push("expenses");
      }

      if (failedServices.length > 0) {
        setError(
          `Some dashboard data could not be loaded: ${failedServices.join(
            ", ",
          )}.`,
        );
      }
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load dashboard data. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ============================================================
     MEMBER STATISTICS
  ============================================================ */

  const memberStats = useMemo(() => {
    const members = dashboardData.members;

    const approvedMembers = members.filter(isApprovedMember);

    const contributionActiveMembers =
      approvedMembers.filter(isContributionActive);

    const membersNeedingContribution = approvedMembers.filter(
      (member) => !isContributionActive(member),
    );

    const membershipPending = members.filter((member) => {
      const status = String(member?.membershipStatus || member?.status || "")
        .trim()
        .toLowerCase();

      return status === "pending";
    });

    const membershipRejected = members.filter((member) => {
      const status = String(member?.membershipStatus || member?.status || "")
        .trim()
        .toLowerCase();

      return status === "rejected";
    });

    const coverage =
      approvedMembers.length > 0
        ? Math.round(
            (contributionActiveMembers.length / approvedMembers.length) * 100,
          )
        : 0;

    return {
      total: members.length,
      approved: approvedMembers.length,
      contributionActive: contributionActiveMembers.length,
      needingContribution: membersNeedingContribution.length,
      membershipPending: membershipPending.length,
      membershipRejected: membershipRejected.length,
      coverage,
    };
  }, [dashboardData.members]);

  /* ============================================================
     DONATION STATISTICS
  ============================================================ */

  const donationStats = useMemo(() => {
    const donations = dashboardData.donations;

    const approved = donations.filter(
      (donation) => normalizeStatus(donation.status) === "Approved",
    );

    const rejected = donations.filter(
      (donation) => normalizeStatus(donation.status) === "Rejected",
    );

    const approvedAmount = approved.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0,
    );

    const squareDonations = approved.filter(
      (donation) => normalizePaymentMethod(donation.paymentMethod) === "square",
    );

    const cashDonations = approved.filter(
      (donation) => normalizePaymentMethod(donation.paymentMethod) === "cash",
    );

    /*
     * Administrator-approved donations are specifically
     * cash donations that were approved by an administrator.
     */

    const adminApprovedDonations = cashDonations.filter((donation) => {
      return (
        donation.approvedByName ||
        donation.approvedBy?.name ||
        donation.approvedBy?.fullName ||
        typeof donation.approvedBy === "string"
      );
    });

    /*
     * If the backend records the cash donation as Approved
     * without storing approvedBy, still treat the approved
     * cash donation as an administrator cash donation.
     */

    const adminCashDonations =
      adminApprovedDonations.length > 0
        ? adminApprovedDonations
        : cashDonations;

    const squareAmount = squareDonations.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0,
    );

    const cashAmount = cashDonations.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0,
    );

    const adminApprovedAmount = adminCashDonations.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0,
    );

    return {
      total: donations.length,
      approved: approved.length,
      rejected: rejected.length,
      approvedAmount,
      squareCount: squareDonations.length,
      squareAmount,
      cashCount: cashDonations.length,
      cashAmount,
      adminApprovedCount: adminCashDonations.length,
      adminApprovedAmount,
    };
  }, [dashboardData.donations]);

  /* ============================================================
     MONTHLY PAYMENT STATISTICS
  ============================================================ */

  const monthlyPaymentStats = useMemo(() => {
    const payments = dashboardData.monthlyPayments;

    const approved = payments.filter(
      (payment) => normalizeStatus(payment?.status) === "Approved",
    );

    const rejected = payments.filter(
      (payment) => normalizeStatus(payment?.status) === "Rejected",
    );

    const approvedAmount = approved.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0,
    );

    const approvedMonths = approved.reduce(
      (sum, payment) => sum + getPaidMonthsCount(payment),
      0,
    );

    const squarePayments = approved.filter(
      (payment) =>
        normalizePaymentMethod(
          payment?.paymentMethod || payment?.method || payment?.source,
        ) === "square",
    );

    const cashPayments = approved.filter(
      (payment) =>
        normalizePaymentMethod(
          payment?.paymentMethod || payment?.method || payment?.source,
        ) === "cash",
    );

    /*
     * Administrator-approved contributions are cash
     * contribution records.
     */

    const adminApprovedPayments = cashPayments;

    const squareAmount = squarePayments.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0,
    );

    const cashAmount = cashPayments.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0,
    );

    const adminApprovedAmount = adminApprovedPayments.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0,
    );

    return {
      total: payments.length,
      approved: approved.length,
      rejected: rejected.length,
      approvedAmount,
      approvedMonths,
      squareCount: squarePayments.length,
      squareAmount,
      cashCount: cashPayments.length,
      cashAmount,
      adminApprovedCount: adminApprovedPayments.length,
      adminApprovedAmount,
    };
  }, [dashboardData.monthlyPayments]);

  /* ============================================================
     EXPENSE STATISTICS
  ============================================================ */

  const expenseStats = useMemo(() => {
    const expenses = dashboardData.expenses;

    const approved = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Approved",
    );

    const pending = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Pending",
    );

    const rejected = expenses.filter(
      (expense) => normalizeStatus(expense?.status) === "Rejected",
    );

    const approvedAmount = approved.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    const pendingAmount = pending.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    const rejectedAmount = rejected.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    return {
      total: expenses.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      approvedAmount,
      pendingAmount,
      rejectedAmount,
    };
  }, [dashboardData.expenses]);

  /* ============================================================
     FINANCIAL SUMMARY
  ============================================================ */

  const financialStats = useMemo(() => {
    const donationAmount = donationStats.approvedAmount;
    const monthlyAmount = monthlyPaymentStats.approvedAmount;

    const combinedAmount = donationAmount + monthlyAmount;

    const expenseAmount = expenseStats.approvedAmount;

    const availableBalance = combinedAmount - expenseAmount;

    return {
      donationAmount,
      monthlyAmount,
      combinedAmount,
      expenseAmount,
      availableBalance,
    };
  }, [donationStats, monthlyPaymentStats, expenseStats]);

  /* ============================================================
     CURRENT MONTH
  ============================================================ */

  const currentMonthStats = useMemo(() => {
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const approvedDonationsThisMonth = dashboardData.donations.filter(
      (donation) => {
        if (normalizeStatus(donation.status) !== "Approved") {
          return false;
        }

        const date = getValidDate(getDonationDate(donation));

        return (
          date &&
          date.getFullYear() === currentYear &&
          date.getMonth() === currentMonth
        );
      },
    );

    const approvedPaymentsThisMonth = dashboardData.monthlyPayments.filter(
      (payment) => {
        if (normalizeStatus(payment?.status) !== "Approved") {
          return false;
        }

        const date = getValidDate(getMonthlyPaymentDate(payment));

        return (
          date &&
          date.getFullYear() === currentYear &&
          date.getMonth() === currentMonth
        );
      },
    );

    const approvedExpensesThisMonth = dashboardData.expenses.filter(
      (expense) => {
        if (normalizeStatus(expense?.status) !== "Approved") {
          return false;
        }

        const date = getValidDate(getExpenseDate(expense));

        return (
          date &&
          date.getFullYear() === currentYear &&
          date.getMonth() === currentMonth
        );
      },
    );

    const donationsAmount = approvedDonationsThisMonth.reduce(
      (sum, donation) => sum + Number(donation.amount || 0),
      0,
    );

    const monthlyAmount = approvedPaymentsThisMonth.reduce(
      (sum, payment) => sum + getPaymentAmount(payment),
      0,
    );

    const expensesAmount = approvedExpensesThisMonth.reduce(
      (sum, expense) => sum + getExpenseAmount(expense),
      0,
    );

    const income = donationsAmount + monthlyAmount;
    const remaining = income - expensesAmount;

    return {
      donationsCount: approvedDonationsThisMonth.length,
      donationsAmount,
      paymentsCount: approvedPaymentsThisMonth.length,
      paymentsAmount: monthlyAmount,
      expensesCount: approvedExpensesThisMonth.length,
      expensesAmount,
      income,
      remaining,
      total: income,
    };
  }, [
    dashboardData.donations,
    dashboardData.monthlyPayments,
    dashboardData.expenses,
  ]);

  /* ============================================================
     RECENT ACTIVITY
  ============================================================ */

  const recentActivity = useMemo(() => {
    const donationActivities = dashboardData.donations.map((donation) => {
      const status = normalizeStatus(donation.status);
      const payment = normalizePaymentMethod(donation.paymentMethod);

      return {
        id: `donation-${donation._id || donation.donationId || Math.random()}`,
        type: "donation",
        title: donation.fullName || "Anonymous Donor",
        subtitle: `${paymentLabel(payment)} donation`,
        amount: Number(donation.amount || 0),
        date: getDonationDate(donation),
        status,
        approvedBy:
          payment === "cash"
            ? donation.approvedByName ||
              donation.approvedBy?.name ||
              donation.approvedBy?.fullName ||
              (typeof donation.approvedBy === "string"
                ? donation.approvedBy
                : "Administrator")
            : "Square",
        icon: payment === "cash" ? <FiDollarSign /> : <FiCreditCard />,
      };
    });

    const monthlyActivities = dashboardData.monthlyPayments.map((payment) => {
      const status = normalizeStatus(payment?.status);

      const paymentMethod = normalizePaymentMethod(
        payment?.paymentMethod || payment?.method || payment?.source,
      );

      return {
        id: `monthly-${payment._id || payment.paymentId || Math.random()}`,
        type: "monthly",
        title: getMonthlyPaymentName(payment),
        subtitle:
          paymentMethod === "cash"
            ? "Cash monthly contribution"
            : "Square monthly contribution",
        amount: getPaymentAmount(payment),
        date: getMonthlyPaymentDate(payment),
        status,
        approvedBy:
          paymentMethod === "cash"
            ? payment.approvedByName ||
              payment.approvedBy?.name ||
              payment.approvedBy?.fullName ||
              (typeof payment.approvedBy === "string"
                ? payment.approvedBy
                : "Administrator")
            : "Square",
        icon: paymentMethod === "cash" ? <FiDollarSign /> : <FiCalendar />,
      };
    });

    const expenseActivities = dashboardData.expenses.map((expense) => {
      const status = normalizeStatus(expense?.status);

      return {
        id: `expense-${expense._id || expense.expenseId || Math.random()}`,
        type: "expense",
        title: getExpenseType(expense),
        subtitle: getExpenseDescription(expense),
        amount: getExpenseAmount(expense),
        date: getExpenseDate(expense),
        status,
        approvedBy:
          expense?.approvedByName ||
          expense?.approvedBy?.name ||
          expense?.approvedBy?.fullName ||
          (typeof expense?.approvedBy === "string" ? expense.approvedBy : "—"),
        icon: <FiDollarSign />,
      };
    });

    return [...donationActivities, ...monthlyActivities, ...expenseActivities]
      .filter((activity) => getValidDate(activity.date))
      .sort((a, b) => {
        return getValidDate(b.date).getTime() - getValidDate(a.date).getTime();
      });
  }, [
    dashboardData.donations,
    dashboardData.monthlyPayments,
    dashboardData.expenses,
  ]);

  const totalActivityPages = Math.max(
    1,
    Math.ceil(recentActivity.length / RECENT_ACTIVITY_PAGE_SIZE),
  );

  const visibleRecentActivity = useMemo(() => {
    const start = (activityPage - 1) * RECENT_ACTIVITY_PAGE_SIZE;

    return recentActivity.slice(start, start + RECENT_ACTIVITY_PAGE_SIZE);
  }, [recentActivity, activityPage]);

  useEffect(() => {
    if (activityPage > totalActivityPages) {
      setActivityPage(totalActivityPages);
    }
  }, [activityPage, totalActivityPages]);

  /* ============================================================
     PAYMENT MIX
  ============================================================ */

  const paymentMix = useMemo(() => {
    const squareAmount =
      donationStats.squareAmount + monthlyPaymentStats.squareAmount;

    const cashAmount =
      donationStats.cashAmount + monthlyPaymentStats.cashAmount;

    const total = squareAmount + cashAmount;

    return {
      squareAmount,
      cashAmount,
      total,
      squarePercentage:
        total > 0 ? Math.round((squareAmount / total) * 100) : 0,
      cashPercentage: total > 0 ? Math.round((cashAmount / total) * 100) : 0,
    };
  }, [donationStats, monthlyPaymentStats]);

  /* ============================================================
     QUICK ACTIONS
  ============================================================ */

  const quickActions = [
    {
      title: "Members",
      description: "Review church members",
      link: "/admin/members",
      icon: <FiUsers />,
    },
    {
      title: "Donations",
      description: "Manage church donations",
      link: "/admin/donate",
      icon: <FiHeart />,
    },
    {
      title: "Monthly Contributions",
      description: "Review member contributions",
      link: "/admin/monthly-payment",
      icon: <FiCalendar />,
    },
    {
      title: "Expenses",
      description: "Manage church expenses",
      link: "/admin/expensesManagement",
      icon: <FiDollarSign />,
    },
    {
      title: "Appointments",
      description: "Manage service requests",
      link: "/admin/bookings",
      icon: <FiClock />,
    },
  ];

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AdminLayout title="St Mary St Gabriel Church Dashboard">
      <div className={styles.page}>
        {/* ======================================================
            TOP HEADER
        ====================================================== */}

        <section className={styles.dashboardHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerEyebrow}>
              <span className={styles.liveDot} />
              Administration Overview
            </div>

            <h1>Church Administration Dashboard</h1>

            <p>
              A clear financial and membership overview for St. Mary & St.
              Gabriel Ethiopian Orthodox Tewahedo Church.
            </p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.headerDate}>
              <FiCalendar />

              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? styles.spin : ""} />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className={styles.errorBanner}>
            <div className={styles.errorIcon}>
              <FiAlertCircle />
            </div>

            <div>
              <strong>Dashboard data warning</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close warning"
            >
              ×
            </button>
          </div>
        )}

        {/* ======================================================
            FINANCIAL HERO
        ====================================================== */}

        <section className={styles.financialHero}>
          <div className={styles.financialHeroMain}>
            <div className={styles.financialEyebrow}>
              <FiTrendingUp />
              Church Financial Position
            </div>

            <span className={styles.financialLabel}>
              Available church balance
            </span>

            <strong className={styles.financialTotal}>
              {loading
                ? "..."
                : formatCurrency(financialStats.availableBalance)}
            </strong>

            <p>
              Approved donations and monthly contributions minus approved church
              expenses.
            </p>
          </div>

          <div className={styles.financialBreakdown}>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownIcon}>
                <FiHeart />
              </div>

              <div>
                <span>Approved Income</span>

                <strong>
                  {loading
                    ? "..."
                    : formatCurrency(financialStats.combinedAmount)}
                </strong>
              </div>
            </div>

            <div className={styles.breakdownDivider} />

            <div className={styles.breakdownItem}>
              <div className={styles.breakdownIcon}>
                <FiMinusCircle />
              </div>

              <div>
                <span>Approved Expenses</span>

                <strong>
                  {loading
                    ? "..."
                    : formatCurrency(financialStats.expenseAmount)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            FINANCIAL SUMMARY
        ====================================================== */}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>Financial overview</span>

              <h2>Church Finances</h2>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {/* TOTAL INCOME */}

            <Link
              to="/admin/donate"
              className={`${styles.statCard} ${styles.statCardDonation}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiTrendingUp />
                </div>

                <span className={styles.statLink}>
                  View <FiArrowRight />
                </span>
              </div>

              <div className={styles.statBody}>
                <span>Approved Church Income</span>

                <strong>
                  {loading
                    ? "..."
                    : formatCurrency(financialStats.combinedAmount)}
                </strong>

                <small>Donations + monthly contributions</small>
              </div>
            </Link>

            {/* APPROVED EXPENSES */}

            <Link
              to="/admin/expensesManagement"
              className={`${styles.statCard} ${styles.statCardWarning}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiMinusCircle />
                </div>

                <span className={styles.warningBadge}>Expenses</span>
              </div>

              <div className={styles.statBody}>
                <span>Approved Expenses</span>

                <strong>
                  {loading
                    ? "..."
                    : formatCurrency(expenseStats.approvedAmount)}
                </strong>

                <small>{expenseStats.approved} approved expense requests</small>
              </div>
            </Link>

            {/* AVAILABLE BALANCE */}

            <Link
              to="/admin/expensesManagement"
              className={`${styles.statCard} ${styles.statCardSuccess}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiDollarSign />
                </div>

                <span className={styles.positiveBadge}>Balance</span>
              </div>

              <div className={styles.statBody}>
                <span>Available Balance</span>

                <strong>
                  {loading
                    ? "..."
                    : formatCurrency(financialStats.availableBalance)}
                </strong>

                <small>Remaining after approved expenses</small>
              </div>
            </Link>

            {/* PENDING EXPENSES */}

            <Link
              to="/admin/expensesManagement"
              className={`${styles.statCard} ${styles.statCardCurrent}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiClock />
                </div>

                <span className={styles.currentBadge}>Pending</span>
              </div>

              <div className={styles.statBody}>
                <span>Pending Expenses</span>

                <strong>{loading ? "..." : expenseStats.pending}</strong>

                <small>
                  {formatCurrency(expenseStats.pendingAmount)} awaiting review
                </small>
              </div>
            </Link>
          </div>
        </section>

        {/* ======================================================
            KEY STATISTICS
        ====================================================== */}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>At a glance</span>
              <h2>Key Statistics</h2>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {/* TOTAL MEMBERS */}

            <Link
              to="/admin/members"
              className={`${styles.statCard} ${styles.statCardMembers}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiUsers />
                </div>

                <span className={styles.statLink}>
                  View <FiArrowRight />
                </span>
              </div>

              <div className={styles.statBody}>
                <span>Total Members</span>

                <strong>{loading ? "..." : memberStats.total}</strong>

                <small>{memberStats.approved} approved members</small>
              </div>
            </Link>

            {/* APPROVED MEMBERS */}

            <Link
              to="/admin/members"
              className={`${styles.statCard} ${styles.statCardSuccess}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiUserCheck />
                </div>

                <span className={styles.positiveBadge}>
                  {memberStats.coverage}%
                </span>
              </div>

              <div className={styles.statBody}>
                <span>Contribution Active</span>

                <strong>
                  {loading ? "..." : memberStats.contributionActive}
                </strong>

                <small>Approved members currently contributing</small>
              </div>
            </Link>

            {/* NEEDING CONTRIBUTION */}

            <Link
              to="/admin/members"
              className={`${styles.statCard} ${styles.statCardWarning}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiUserPlus />
                </div>

                <span className={styles.warningBadge}>Attention</span>
              </div>

              <div className={styles.statBody}>
                <span>Members Needing Contribution</span>

                <strong>
                  {loading ? "..." : memberStats.needingContribution}
                </strong>

                <small>
                  Approved members without current contribution activity
                </small>
              </div>
            </Link>

            {/* APPROVED DONATIONS */}

            <Link
              to="/admin/donate"
              className={`${styles.statCard} ${styles.statCardDonation}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiHeart />
                </div>

                <span className={styles.statLink}>
                  Manage <FiArrowRight />
                </span>
              </div>

              <div className={styles.statBody}>
                <span>Approved Donations</span>

                <strong>{loading ? "..." : donationStats.approved}</strong>

                <small>
                  {formatCurrency(donationStats.approvedAmount)} approved
                </small>
              </div>
            </Link>

            {/* APPROVED CONTRIBUTIONS */}

            <Link
              to="/admin/monthly-payment"
              className={`${styles.statCard} ${styles.statCardContribution}`}
            >
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiCalendar />
                </div>

                <span className={styles.statLink}>
                  Manage <FiArrowRight />
                </span>
              </div>

              <div className={styles.statBody}>
                <span>Approved Contributions</span>

                <strong>
                  {loading ? "..." : monthlyPaymentStats.approved}
                </strong>

                <small>
                  {formatCurrency(monthlyPaymentStats.approvedAmount)} approved
                </small>
              </div>
            </Link>

            {/* CURRENT MONTH */}

            <div className={`${styles.statCard} ${styles.statCardCurrent}`}>
              <div className={styles.statTop}>
                <div className={styles.statIcon}>
                  <FiActivity />
                </div>

                <span className={styles.currentBadge}>This month</span>
              </div>

              <div className={styles.statBody}>
                <span>Current Month Giving</span>

                <strong>
                  {loading ? "..." : formatCurrency(currentMonthStats.total)}
                </strong>

                <small>
                  {currentMonthStats.donationsCount} donations ·{" "}
                  {currentMonthStats.paymentsCount} contributions
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            APPROVAL & PAYMENT OVERVIEW
        ====================================================== */}

        <section className={styles.twoColumn}>
          {/* CASH ADMIN APPROVAL */}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Administration</span>

                <h2>Cash Approval Overview</h2>
              </div>

              <div className={styles.panelHeaderIcon}>
                <FiShield />
              </div>
            </div>

            <div className={styles.approvalGrid}>
              {/* CASH DONATIONS */}

              <Link to="/admin/donate" className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiDollarSign />
                </div>

                <div>
                  <span>Admin Approved Donations by Cash</span>

                  <strong>
                    {loading ? "..." : donationStats.adminApprovedCount}
                  </strong>

                  <small>
                    {formatCurrency(donationStats.adminApprovedAmount)}
                  </small>

                  <small className={styles.approvalMethod}>Cash • USD</small>
                </div>
              </Link>

              {/* CASH CONTRIBUTIONS */}

              <Link to="/admin/monthly-payment" className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiDollarSign />
                </div>

                <div>
                  <span>Admin Approved Contributions by Cash</span>

                  <strong>
                    {loading ? "..." : monthlyPaymentStats.adminApprovedCount}
                  </strong>

                  <small>
                    {formatCurrency(monthlyPaymentStats.adminApprovedAmount)}
                  </small>

                  <small className={styles.approvalMethod}>Cash • USD</small>
                </div>
              </Link>

              {/* EXPENSES */}

              <Link
                to="/admin/expensesManagement"
                className={styles.approvalCard}
              >
                <div className={styles.approvalIcon}>
                  <FiMinusCircle />
                </div>

                <div>
                  <span>Approved Expenses</span>

                  <strong>{loading ? "..." : expenseStats.approved}</strong>

                  <small>{formatCurrency(expenseStats.approvedAmount)}</small>

                  <small className={styles.approvalMethod}>USD</small>
                </div>
              </Link>
            </div>

            <div className={styles.infoNote}>
              <FiCheckCircle />

              <span>
                Cash donations and cash contributions are recorded and approved
                by church administration. Square payments are processed through
                Square. All dashboard financial amounts are displayed in USD.
              </span>
            </div>
          </div>

          {/* PAYMENT MIX */}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Payment channels</span>

                <h2>Giving Mix</h2>
              </div>

              <div className={styles.panelHeaderIcon}>
                <FiPieChart />
              </div>
            </div>

            <div className={styles.mixSummary}>
              <div>
                <span>Total processed</span>

                <strong>{formatCurrency(paymentMix.total)}</strong>
              </div>

              <div className={styles.mixPercent}>
                <strong>{paymentMix.squarePercentage}%</strong>
                <span>Square</span>
              </div>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressSquare}
                style={{
                  width: `${paymentMix.squarePercentage}%`,
                }}
              />
            </div>

            <div className={styles.mixLegend}>
              <div>
                <span className={styles.legendDotSquare} />

                <div>
                  <strong>Square</strong>
                  <small>{formatCurrency(paymentMix.squareAmount)}</small>
                </div>
              </div>

              <div>
                <span className={styles.legendDotCash} />

                <div>
                  <strong>Cash</strong>
                  <small>{formatCurrency(paymentMix.cashAmount)}</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            MEMBERSHIP HEALTH
        ====================================================== */}

        <section className={styles.membershipHealth}>
          <div className={styles.membershipHealthHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Member engagement</span>

              <h2>Monthly Contribution Coverage</h2>

              <p>
                This measures approved church members who currently have active
                monthly contribution activity.
              </p>
            </div>

            <div className={styles.coverageNumber}>
              <strong>{memberStats.coverage}%</strong>
              <span>coverage</span>
            </div>
          </div>

          <div className={styles.coverageTrack}>
            <div
              className={styles.coverageFill}
              style={{
                width: `${memberStats.coverage}%`,
              }}
            />
          </div>

          <div className={styles.coverageFooter}>
            <div>
              <FiUserCheck />

              <span>
                <strong>{memberStats.contributionActive}</strong>{" "}
                contribution-active members
              </span>
            </div>

            <div>
              <FiUserPlus />

              <span>
                <strong>{memberStats.needingContribution}</strong> members need
                contribution follow-up
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================
            CURRENT MONTH FINANCIAL BREAKDOWN
        ====================================================== */}

        <section className={styles.twoColumn}>
          {/* THIS MONTH */}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>Monthly finances</span>

                <h2>This Month</h2>
              </div>

              <div className={styles.panelHeaderIcon}>
                <FiActivity />
              </div>
            </div>

            <div className={styles.approvalGrid}>
              <div className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiTrendingUp />
                </div>

                <div>
                  <span>Monthly Income</span>

                  <strong>
                    {loading ? "..." : formatCurrency(currentMonthStats.income)}
                  </strong>

                  <small>
                    {currentMonthStats.donationsCount} donations ·{" "}
                    {currentMonthStats.paymentsCount} contributions
                  </small>
                </div>
              </div>

              <div className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiMinusCircle />
                </div>

                <div>
                  <span>Monthly Expenses</span>

                  <strong>
                    {loading
                      ? "..."
                      : formatCurrency(currentMonthStats.expensesAmount)}
                  </strong>

                  <small>
                    {currentMonthStats.expensesCount} approved expenses
                  </small>
                </div>
              </div>
            </div>

            <div className={styles.infoNote}>
              <FiDollarSign />

              <span>
                Monthly remaining balance:{" "}
                <strong>{formatCurrency(currentMonthStats.remaining)}</strong>
              </span>
            </div>
          </div>

          {/* EXPENSE STATUS */}

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionEyebrow}>
                  Expense management
                </span>

                <h2>Expense Status</h2>
              </div>

              <div className={styles.panelHeaderIcon}>
                <FiDollarSign />
              </div>
            </div>

            <div className={styles.approvalGrid}>
              <div className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiCheckCircle />
                </div>

                <div>
                  <span>Approved</span>

                  <strong>{expenseStats.approved}</strong>

                  <small>{formatCurrency(expenseStats.approvedAmount)}</small>
                </div>
              </div>

              <div className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiClock />
                </div>

                <div>
                  <span>Pending</span>

                  <strong>{expenseStats.pending}</strong>

                  <small>{formatCurrency(expenseStats.pendingAmount)}</small>
                </div>
              </div>

              <div className={styles.approvalCard}>
                <div className={styles.approvalIcon}>
                  <FiAlertCircle />
                </div>

                <div>
                  <span>Rejected</span>

                  <strong>{expenseStats.rejected}</strong>

                  <small>{formatCurrency(expenseStats.rejectedAmount)}</small>
                </div>
              </div>
            </div>

            <Link to="/admin/expensesManagement" className={styles.quickAction}>
              <div className={styles.quickActionIcon}>
                <FiDollarSign />
              </div>

              <div>
                <strong>Open Expense Management</strong>

                <span>Review and approve church expense requests</span>
              </div>

              <FiArrowRight className={styles.quickActionArrow} />
            </Link>
          </div>
        </section>

        {/* ======================================================
            RECENT ACTIVITY
        ====================================================== */}

        <section className={styles.activityPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                Live administration feed
              </span>

              <h2>Recent Activity</h2>

              <p>
                Latest donations, monthly contribution records, and expense
                requests.
              </p>
            </div>

            <div className={styles.activityCount}>
              <FiActivity />
              <span>{recentActivity.length} records</span>
            </div>
          </div>

          {loading ? (
            <div className={styles.activityLoading}>
              <FiRefreshCw className={styles.spin} />

              <span>Loading recent activity...</span>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className={styles.emptyActivity}>
              <FiActivity />

              <h3>No recent activity</h3>

              <p>
                Donations, monthly contributions, and expenses will appear here
                when records are available.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.activityList}>
                {visibleRecentActivity.map((activity) => (
                  <div key={activity.id} className={styles.activityRow}>
                    <div
                      className={`${styles.activityTypeIcon} ${
                        activity.type === "donation"
                          ? styles.donationActivityIcon
                          : activity.type === "monthly"
                            ? styles.monthlyActivityIcon
                            : styles.expenseActivityIcon
                      }`}
                    >
                      {activity.icon}
                    </div>

                    <div className={styles.activityMain}>
                      <div className={styles.activityTitleRow}>
                        <strong>{activity.title}</strong>

                        <span
                          className={
                            activity.status === "Approved"
                              ? styles.statusApproved
                              : activity.status === "Rejected"
                                ? styles.statusRejected
                                : styles.statusOther
                          }
                        >
                          {activity.status}
                        </span>
                      </div>

                      <div className={styles.activityMeta}>
                        <span>{activity.subtitle}</span>

                        <span>•</span>

                        <span>{formatDateTime(activity.date)}</span>

                        {activity.status === "Approved" && (
                          <>
                            <span>•</span>

                            <span>
                              Approved by <strong>{activity.approvedBy}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.activityAmount}>
                      <strong>
                        {activity.type === "expense"
                          ? `−${formatCurrency(activity.amount)}`
                          : formatCurrency(activity.amount)}
                      </strong>

                      <small>
                        {activity.type === "donation"
                          ? "Donation"
                          : activity.type === "monthly"
                            ? "Contribution"
                            : "Expense"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              {totalActivityPages > 1 && (
                <div className={styles.pagination}>
                  <div>
                    Showing{" "}
                    <strong>
                      {(activityPage - 1) * RECENT_ACTIVITY_PAGE_SIZE + 1}
                    </strong>{" "}
                    –{" "}
                    <strong>
                      {Math.min(
                        activityPage * RECENT_ACTIVITY_PAGE_SIZE,
                        recentActivity.length,
                      )}
                    </strong>{" "}
                    of <strong>{recentActivity.length}</strong>
                  </div>

                  <div className={styles.paginationControls}>
                    <button
                      type="button"
                      onClick={() =>
                        setActivityPage((page) => Math.max(1, page - 1))
                      }
                      disabled={activityPage === 1}
                      aria-label="Previous activity page"
                    >
                      <FiChevronLeft />
                    </button>

                    <span>
                      Page {activityPage} of {totalActivityPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setActivityPage((page) =>
                          Math.min(totalActivityPages, page + 1),
                        )
                      }
                      disabled={activityPage === totalActivityPages}
                      aria-label="Next activity page"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ======================================================
            QUICK ACTIONS
        ====================================================== */}

        <section className={styles.quickActions}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>Administration</span>

              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className={styles.quickActionGrid}>
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className={styles.quickAction}
              >
                <div className={styles.quickActionIcon}>{action.icon}</div>

                <div>
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </div>

                <FiArrowRight className={styles.quickActionArrow} />
              </Link>
            ))}
          </div>
        </section>

        {/* ======================================================
            SYSTEM SUMMARY
        ====================================================== */}

        <section className={styles.systemSummary}>
          <Link to="/admin/members">
            <FiUsers />

            <div>
              <span>Registered Members</span>
              <strong>{memberStats.total}</strong>
            </div>
          </Link>

          <Link to="/admin/donate">
            <FiHeart />

            <div>
              <span>Total Donations</span>
              <strong>{donationStats.total}</strong>
            </div>
          </Link>

          <Link to="/admin/monthly-payment">
            <FiCalendar />

            <div>
              <span>Contribution Records</span>
              <strong>{monthlyPaymentStats.total}</strong>
            </div>
          </Link>

          <Link to="/admin/expensesManagement">
            <FiDollarSign />

            <div>
              <span>Expense Records</span>
              <strong>{expenseStats.total}</strong>
            </div>
          </Link>

          <Link to="/admin/bookings">
            <FiClock />

            <div>
              <span>Service Requests</span>
              <strong>{dashboardData.bookings.length}</strong>
            </div>
          </Link>
        </section>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className={styles.dashboardFooter}>
          <div className={styles.footerIcon}>
            <FiHeart />
          </div>

          <div>
            <strong>
              St. Mary & St. Gabriel Ethiopian Orthodox Tewahedo Church
            </strong>

            <span>Faith • Tradition • Service</span>
          </div>
        </footer>
      </div>
    </AdminLayout>
  );
}
