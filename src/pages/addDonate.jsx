import { useState } from "react";

import { useNavigate } from "react-router-dom";

import AdminLayout from "../components/AdminLayout";

import api from "../services/api";

import {
  FiArrowLeft,
  FiHeart,
  FiUser,
  FiMail,
  FiPhone,
  FiDollarSign,
  FiCreditCard,
  FiMessageCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import styles from "../styles/addDonate.module.css";

// ============================================================
// CONSTANTS
// ============================================================
//
// Admin manually enters donations.
//
// Public online donations are handled by the Square payment
// flow and are NOT created manually from this page.
//
// Admin can manually record:
// 1. Cash
// 2. Zelle
// 3. Check/Money Order
//
// ============================================================

const PAYMENT_OPTIONS = [
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "zelle",
    label: "Zelle",
  },
  {
    value: "check_money_order",
    label: "Check/Money Order",
  },
];

const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending",
  },
  {
    value: "Approved",
    label: "Approved",
  },
  {
    value: "Rejected",
    label: "Rejected",
  },
];

// ============================================================
// REVENUE TYPE OPTIONS
// ============================================================
//
// These are displayed without the accounting numbers.
// The selected name is sent to the backend as revenueType.
//
// ============================================================

const REVENUE_TYPE_OPTIONS = [
  {
    value: "Membership",
    label: "Membership",
  },

  {
    value: "Sunday Collection",
    label: "Sunday Collection",
  },

  {
    value: "Collection Box",
    label: "Collection Box",
  },

  {
    value: "Offering/Gift",
    label: "Offering/Gift",
  },

  {
    value: "Newaye Kidisat Shop",
    label: "Newaye Kidisat Shop",
  },

  {
    value: "Back 40 Fundraising",
    label: "Back 40 Fundraising",
  },

  {
    value: "Mortgage Payoff Fundraising",
    label: "Mortgage Payoff Fundraising",
  },

  {
    value: "Parking Fundraising",
    label: "Parking Fundraising",
  },

  {
    value: "Reach outs Fundraising",
    label: "Reach outs Fundraising",
  },

  {
    value: "Youth Fundraising",
    label: "Youth Fundraising",
  },

  {
    value: "St. Gabriel & St. Mary Holiday Fundraising",
    label: "St. Gabriel & St. Mary Holiday Fundraising",
  },

  {
    value: "Kids & youth School Fundraising",
    label: "Kids & youth School Fundraising",
  },

  {
    value: "International Festival",
    label: "International Festival",
  },

  {
    value: "Travel reimbursement (Bus)",
    label: "Travel reimbursement (Bus)",
  },

  {
    value: "Other Reimbursement",
    label: "Other Reimbursement",
  },

  {
    value: "Investment Income",
    label: "Investment Income",
  },

  {
    value: "Other Income",
    label: "Other Income",
  },

  {
    value: "Church Purchase Fundraising",
    label: "Church Purchase Fundraising",
  },

  {
    value: "Raffle Ticket",
    label: "Raffle Ticket",
  },
];

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

// ============================================================
// GET CURRENT ADMIN NAME
// ============================================================
//
// The current admin login stores the administrator name in
// localStorage as "adminName".
//
// We also check several older storage keys so existing login
// sessions continue to work.
//
// ============================================================

const getCurrentAdminName = () => {
  try {
    // ----------------------------------------------------------
    // Primary admin name
    // ----------------------------------------------------------

    const storedAdminName = localStorage.getItem("adminName");

    if (storedAdminName && storedAdminName.trim()) {
      return storedAdminName.trim();
    }

    // ----------------------------------------------------------
    // Compatibility with older admin storage
    // ----------------------------------------------------------

    const possibleAdminKeys = [
      "admin",
      "adminUser",
      "adminData",
      "currentAdmin",
      "user",
    ];

    for (const key of possibleAdminKeys) {
      const storedAdmin = localStorage.getItem(key);

      if (!storedAdmin) {
        continue;
      }

      try {
        const parsedAdmin = JSON.parse(storedAdmin);

        const name =
          parsedAdmin?.name || parsedAdmin?.fullName || parsedAdmin?.adminName;

        if (name && String(name).trim()) {
          return String(name).trim();
        }
      } catch {
        // Ignore invalid JSON and continue.
      }
    }

    return "Administrator";
  } catch (error) {
    console.error("Unable to get current admin name:", error);

    return "Administrator";
  }
};

// ============================================================
// COMPONENT
// ============================================================

export default function AddDonate() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    amount: "",
    revenueType: "",
    paymentMethod: "cash",
    status: "Approved",
    message: "",
  });

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // ==========================================================
  // INPUT CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setErrorMessage("");

    setSuccessMessage("");
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm = () => {
    const newErrors = {};

    const fullName = formData.fullName.trim();

    const email = formData.email.trim();

    const phone = formData.phone.trim();

    const amount = Number(formData.amount);

    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    if (!fullName) {
      newErrors.fullName = "Donor name is required.";
    } else if (fullName.length < 2) {
      newErrors.fullName = "Donor name must be at least 2 characters.";
    } else if (fullName.length > 120) {
      newErrors.fullName = "Donor name must not exceed 120 characters.";
    }

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    if (!email) {
      newErrors.email = "Email address is required.";
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        newErrors.email = "Please enter a valid email address.";
      } else if (email.length > 160) {
        newErrors.email = "Email address is too long.";
      }
    }

    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (!phone) {
      newErrors.phone = "Phone number is required.";
    } else if (phone.length < 7) {
      newErrors.phone = "Please enter a valid phone number.";
    } else if (phone.length > 40) {
      newErrors.phone = "Phone number is too long.";
    }

    // --------------------------------------------------------
    // AMOUNT
    // --------------------------------------------------------

    if (!formData.amount) {
      newErrors.amount = "Donation amount is required.";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      newErrors.amount = "Donation amount must be greater than 0.";
    } else if (amount > 1000000) {
      newErrors.amount = "Donation amount cannot exceed 1,000,000.";
    }

    // --------------------------------------------------------
    // REVENUE TYPE
    // --------------------------------------------------------

    if (!formData.revenueType) {
      newErrors.revenueType = "Revenue type is required.";
    } else if (
      !REVENUE_TYPE_OPTIONS.some(
        (option) => option.value === formData.revenueType,
      )
    ) {
      newErrors.revenueType = "Please select a valid revenue type.";
    }

    // --------------------------------------------------------
    // PAYMENT METHOD
    // --------------------------------------------------------

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Payment method is required.";
    } else if (
      !PAYMENT_OPTIONS.some((option) => option.value === formData.paymentMethod)
    ) {
      newErrors.paymentMethod = "Please select a valid payment method.";
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (!formData.status) {
      newErrors.status = "Please select a donation status.";
    } else if (
      !STATUS_OPTIONS.some((option) => option.value === formData.status)
    ) {
      newErrors.status = "Please select a valid donation status.";
    }

    // --------------------------------------------------------
    // MESSAGE
    // --------------------------------------------------------

    if (formData.message.trim().length > 1000) {
      newErrors.message = "Message cannot exceed 1000 characters.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      amount: "",
      revenueType: "",
      paymentMethod: "cash",
      status: "Approved",
      message: "",
    });

    setErrors({});

    setErrorMessage("");

    setSuccessMessage("");
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");

    setErrorMessage("");

    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // ------------------------------------------------------
      // GET CURRENT ADMIN
      // ------------------------------------------------------

      const adminName = getCurrentAdminName();

      // ------------------------------------------------------
      // ADMIN MANUAL DONATION PAYLOAD
      // ------------------------------------------------------
      //
      // This page NEVER sends a Square payment.
      //
      // It creates a manually entered donation using the
      // payment method selected by the administrator:
      //
      // cash
      // zelle
      // check_money_order
      //
      // ------------------------------------------------------

      const payload = {
        fullName: formData.fullName.trim(),

        email: formData.email.trim().toLowerCase(),

        phone: formData.phone.trim(),

        amount: Number(formData.amount),

        revenueType: formData.revenueType,

        paymentMethod: formData.paymentMethod,

        status: formData.status,

        message: formData.message.trim(),

        approvedByName: adminName,
      };

      console.log("ADDING ADMIN DONATION:", payload);

      console.log("DONATION ENTERED BY:", adminName);

      console.log("DONATION REVENUE TYPE:", formData.revenueType);

      console.log("DONATION PAYMENT METHOD:", formData.paymentMethod);

      // ------------------------------------------------------
      // ADMIN DONATION API
      // ------------------------------------------------------
      //
      // POST /api/donations/admin
      //
      // adminProtect is applied by the backend route.
      //
      // ------------------------------------------------------

      const response = await api.post("/donations/admin", payload);

      console.log("ADD ADMIN DONATION RESPONSE:", response.data);

      // ------------------------------------------------------
      // CHECK API RESPONSE
      // ------------------------------------------------------

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to add donation.");
      }

      const message =
        response.data?.message || "Donation has been added successfully.";

      setSuccessMessage(message);

      // ------------------------------------------------------
      // RESET FORM
      // ------------------------------------------------------

      setFormData({
        fullName: "",
        email: "",
        phone: "",
        amount: "",
        revenueType: "",
        paymentMethod: "cash",
        status: "Approved",
        message: "",
      });

      setErrors({});

      // ------------------------------------------------------
      // RETURN TO DONATION MANAGEMENT
      // ------------------------------------------------------

      setTimeout(() => {
        navigate("/admin/donate", {
          replace: true,
        });
      }, 1200);
    } catch (err) {
      console.error("ADD DONATION ERROR:", err);

      // ------------------------------------------------------
      // SERVER ERROR
      // ------------------------------------------------------

      const serverMessage =
        err.response?.data?.message || err.response?.data?.error || err.message;

      setErrorMessage(
        serverMessage || "Unable to add donation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // BACK
  // ==========================================================

  const handleBack = () => {
    navigate("/admin/donate");
  };

  // ==========================================================
  // PAYMENT METHOD LABEL
  // ==========================================================

  const getPaymentMethodLabel = (paymentMethod) => {
    const found = PAYMENT_OPTIONS.find(
      (option) => option.value === paymentMethod,
    );

    return found?.label || "Not selected";
  };

  // ==========================================================
  // RETURN
  // ==========================================================

  return (
    <AdminLayout title="Add Donation">
      <div className={styles.container}>
        {/* ==================================================
            HEADER
        ================================================== */}

        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBack}
            >
              <FiArrowLeft />

              <span>Back to Donations</span>
            </button>

            <div className={styles.heroContent}>
              <div className={styles.eyebrow}>
                <FiHeart />
                Church Giving
              </div>

              <h1>Add Donation</h1>

              <p>
                Manually add a donation to the church donation management
                system.
              </p>
            </div>
          </div>

          <div className={styles.heroIcon}>
            <FiHeart />
          </div>
        </section>

        {/* ==================================================
            ALERTS
        ================================================== */}

        {successMessage && (
          <div className={`${styles.alert} ${styles.successAlert}`}>
            <div className={styles.alertIcon}>
              <FiCheckCircle />
            </div>

            <div>
              <strong>Donation Added</strong>

              <p>{successMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Close success message"
            >
              <FiX />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className={`${styles.alert} ${styles.errorAlert}`}>
            <div className={styles.alertIcon}>
              <FiAlertCircle />
            </div>

            <div>
              <strong>Unable to Add Donation</strong>

              <p>{errorMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="Close error message"
            >
              <FiX />
            </button>
          </div>
        )}

        {/* ==================================================
            CONTENT GRID
        ================================================== */}

        <div className={styles.contentGrid}>
          {/* ==================================================
              MAIN FORM
          ================================================== */}

          <section className={styles.formCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Donation Information</h2>

                <p>Enter the donor and donation details below.</p>
              </div>

              <div className={styles.cardHeaderIcon}>
                <FiHeart />
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* ==================================================
                  DONOR INFORMATION
              ================================================== */}

              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <div className={styles.sectionIcon}>
                    <FiUser />
                  </div>

                  <div>
                    <h3>Donor Information</h3>

                    <p>Basic information about the donor.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  {/* NAME */}

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="fullName">
                      Donor Name <span>*</span>
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${
                        errors.fullName ? styles.inputError : ""
                      }`}
                    >
                      <FiUser />

                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Enter donor full name"
                        autoComplete="name"
                        maxLength={120}
                      />
                    </div>

                    {errors.fullName && (
                      <small className={styles.fieldError}>
                        {errors.fullName}
                      </small>
                    )}
                  </div>

                  {/* EMAIL */}

                  <div className={styles.formGroup}>
                    <label htmlFor="email">
                      Email Address <span>*</span>
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${
                        errors.email ? styles.inputError : ""
                      }`}
                    >
                      <FiMail />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="donor@example.com"
                        autoComplete="email"
                        maxLength={160}
                      />
                    </div>

                    {errors.email && (
                      <small className={styles.fieldError}>
                        {errors.email}
                      </small>
                    )}
                  </div>

                  {/* PHONE */}

                  <div className={styles.formGroup}>
                    <label htmlFor="phone">
                      Phone Number <span>*</span>
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${
                        errors.phone ? styles.inputError : ""
                      }`}
                    >
                      <FiPhone />

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        autoComplete="tel"
                        maxLength={40}
                      />
                    </div>

                    {errors.phone && (
                      <small className={styles.fieldError}>
                        {errors.phone}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================================================
                  PAYMENT INFORMATION
              ================================================== */}

              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <div className={styles.sectionIcon}>
                    <FiDollarSign />
                  </div>

                  <div>
                    <h3>Payment Information</h3>

                    <p>Enter the manually received donation details.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  {/* AMOUNT */}

                  <div className={styles.formGroup}>
                    <label htmlFor="amount">
                      Donation Amount <span>*</span>
                    </label>

                    <div
                      className={`${styles.inputWrapper} ${
                        styles.amountInput
                      } ${errors.amount ? styles.inputError : ""}`}
                    >
                      <FiDollarSign />

                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                      />

                      <span className={styles.currencyLabel}>USD</span>
                    </div>

                    {errors.amount && (
                      <small className={styles.fieldError}>
                        {errors.amount}
                      </small>
                    )}
                  </div>

                  {/* PAYMENT METHOD */}

                  <div className={styles.formGroup}>
                    <label htmlFor="paymentMethod">
                      Payment Method <span>*</span>
                    </label>

                    <div
                      className={`${styles.selectWrapper} ${
                        errors.paymentMethod ? styles.inputError : ""
                      }`}
                    >
                      <FiCreditCard />

                      <select
                        id="paymentMethod"
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        required
                      >
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {errors.paymentMethod && (
                      <small className={styles.fieldError}>
                        {errors.paymentMethod}
                      </small>
                    )}

                    <small className={styles.helperText}>
                      Select how this donation was received: Cash, Zelle, or
                      Check/Money Order.
                    </small>
                  </div>

                  {/* ==================================================
                      REVENUE TYPE
                  ================================================== */}

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label htmlFor="revenueType">
                      Revenue Type <span>*</span>
                    </label>

                    <div
                      className={`${styles.selectWrapper} ${
                        errors.revenueType ? styles.inputError : ""
                      }`}
                    >
                      <FiDollarSign />

                      <select
                        id="revenueType"
                        name="revenueType"
                        value={formData.revenueType}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select revenue type</option>

                        {REVENUE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {errors.revenueType && (
                      <small className={styles.fieldError}>
                        {errors.revenueType}
                      </small>
                    )}

                    <small className={styles.helperText}>
                      Select the church income account for this donation.
                    </small>
                  </div>

                  {/* STATUS */}

                  <div className={styles.formGroup}>
                    <label htmlFor="status">
                      Donation Status <span>*</span>
                    </label>

                    <div
                      className={`${styles.selectWrapper} ${
                        errors.status ? styles.inputError : ""
                      }`}
                    >
                      <FiCheckCircle />

                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {errors.status && (
                      <small className={styles.fieldError}>
                        {errors.status}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================================================
                  MESSAGE
              ================================================== */}

              <div className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <div className={styles.sectionIcon}>
                    <FiMessageCircle />
                  </div>

                  <div>
                    <h3>Donor Message</h3>

                    <p>Add an optional note or additional information.</p>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">Message</label>

                  <div
                    className={`${styles.textareaWrapper} ${
                      errors.message ? styles.inputError : ""
                    }`}
                  >
                    <FiMessageCircle />

                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Enter donor message or additional notes..."
                      rows={5}
                      maxLength={1000}
                    />
                  </div>

                  <div className={styles.characterCount}>
                    {formData.message.length}/1000
                  </div>

                  {errors.message && (
                    <small className={styles.fieldError}>
                      {errors.message}
                    </small>
                  )}
                </div>
              </div>

              {/* ==================================================
                  FORM ACTIONS
              ================================================== */}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleBack}
                  disabled={loading}
                >
                  <FiArrowLeft />
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={resetForm}
                  disabled={loading}
                >
                  <FiRefreshCw />
                  Clear Form
                </button>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FiRefreshCw className={styles.spin} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave />
                      Add Donation
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className={styles.sidebar}>
            {/* DONATION PREVIEW */}

            <section className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <div>
                  <span>Donation Preview</span>

                  <h3>New Donation</h3>
                </div>

                <div className={styles.previewIcon}>
                  <FiHeart />
                </div>
              </div>

              <div className={styles.previewAmount}>
                <span>Donation Amount</span>

                <strong>{formatCurrency(formData.amount || 0)}</strong>

                <small>USD</small>
              </div>

              <div className={styles.previewDetails}>
                <div className={styles.previewItem}>
                  <span>Donor</span>

                  <strong>{formData.fullName || "Not provided"}</strong>
                </div>

                <div className={styles.previewItem}>
                  <span>Email</span>

                  <strong>{formData.email || "Not provided"}</strong>
                </div>

                <div className={styles.previewItem}>
                  <span>Phone</span>

                  <strong>{formData.phone || "Not provided"}</strong>
                </div>

                <div className={styles.previewItem}>
                  <span>Payment</span>

                  <strong>
                    {getPaymentMethodLabel(formData.paymentMethod)}
                  </strong>
                </div>

                {/* REVENUE TYPE */}

                <div className={styles.previewItem}>
                  <span>Revenue Type</span>

                  <strong>{formData.revenueType || "Not selected"}</strong>
                </div>

                {/* STATUS */}

                <div className={styles.previewItem}>
                  <span>Status</span>

                  <span
                    className={`${styles.previewStatus} ${
                      formData.status === "Approved"
                        ? styles.previewApproved
                        : formData.status === "Rejected"
                          ? styles.previewRejected
                          : styles.previewPending
                    }`}
                  >
                    {formData.status}
                  </span>
                </div>
              </div>
            </section>

            {/* INFORMATION */}

            <section className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <FiAlertCircle />
              </div>

              <div>
                <h3>Important</h3>

                <p>
                  This donation is being entered manually by an administrator.
                  No Square payment will be processed from this page.
                </p>
              </div>
            </section>

            {/* SECURITY */}

            <section className={styles.secureCard}>
              <div className={styles.secureIcon}>
                <FiCheckCircle />
              </div>

              <div>
                <strong>Admin Donation Entry</strong>

                <span>
                  This donation is being entered manually by an administrator.
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
