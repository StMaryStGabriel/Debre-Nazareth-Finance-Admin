import { useEffect, useState } from "react";

import AdminLayout from "../components/AdminLayout";

import api from "../services/api";
import { downloadExcel } from "../utils/exportExcel";

import styles from "../styles/announcement.module.css";

import {
  FiBell,
  FiSend,
  FiMail,
  FiUsers,
  FiCalendar,
  FiAlertCircle,
  FiPlusCircle,
  FiTrash2,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiDownload,
  FiFileText,
} from "react-icons/fi";

export default function AdminAnnouncement() {
  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const [expanded, setExpanded] = useState(null);

  const [notification, setNotification] = useState({
    type: "",
    text: "",
  });

  const [form, setForm] = useState({
    title: "",
    category: "General",
    audience: "Approved Members",
    message: "",
    sendEmail: true,
  });

  const [announcements, setAnnouncements] = useState([]);

  // ==========================================
  // CHURCH INFORMATION
  // ==========================================

  const churchName =
    "St. Mary & St. Gabriel Ethiopian Orthodox Tewahedo Church";

  const churchShortName = "St. Mary & St. Gabriel Church";

  // ==========================================
  // NOTIFICATION
  // ==========================================

  const showNotification = (type, text) => {
    setNotification({
      type,
      text,
    });

    setTimeout(() => {
      setNotification({
        type: "",
        text: "",
      });
    }, 4000);
  };

  // ==========================================
  // FETCH ANNOUNCEMENTS
  // ==========================================

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const res = await api.get("/announcements");

      setAnnouncements(res.data.announcements || []);
    } catch (error) {
      console.error(error);

      showNotification("error", "Unable to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ==========================================
  // CREATE ANNOUNCEMENT
  // ==========================================

  const createAnnouncement = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showNotification("error", "Title and message are required");

      return;
    }

    try {
      setSending(true);

      await api.post("/announcements", form);

      showNotification("success", "Announcement published successfully 🎉");

      setForm({
        title: "",
        category: "General",
        audience: "Approved Members",
        message: "",
        sendEmail: true,
      });

      fetchAnnouncements();
    } catch (error) {
      console.error(error);

      showNotification(
        "error",
        error.response?.data?.message || "Publishing failed",
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // DELETE ANNOUNCEMENT
  // ==========================================

  const deleteAnnouncement = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this announcement?",
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/announcements/${id}`);

      showNotification("success", "Announcement deleted successfully");

      if (expanded === id) {
        setExpanded(null);
      }

      fetchAnnouncements();
    } catch (error) {
      console.error(error);

      showNotification("error", "Delete failed");
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "N/A";

    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // ==========================================
  // ESCAPE HTML
  // ==========================================

  const escapeHtml = (value = "") => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // ==========================================
  // CLEAN FILE NAME
  // ==========================================

  const cleanFileName = (value = "announcement") => {
    return String(value)
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 100);
  };

  // ==========================================
  // DOWNLOAD WORD DOCUMENT
  // ==========================================

  const downloadAnnouncementExcel = (announcement) => {
    if (!announcement) return;

    downloadExcel(
      [
        {
          Title: announcement.title || "Church Announcement",
          Category: announcement.category || "General",
          Audience: announcement.audience || "N/A",
          Published: formatDate(announcement.createdAt),
          Notification: announcement.sendEmail
            ? "Email Notification Sent"
            : "Email Notification Disabled",
          Message: announcement.message || "",
        },
      ],
      `${cleanFileName(announcement.title || "announcement")}.xlsx`,
      "Announcement",
    );
    showNotification(
      "success",
      "Announcement Excel file downloaded successfully.",
    );
    return;

    // eslint-disable-next-line no-unreachable
    const title = announcement.title || "Church Announcement";

    const date = formatDate(announcement.createdAt);

    const emailStatus = announcement.sendEmail
      ? "Email Notification Sent"
      : "Email Notification Disabled";

    const message = escapeHtml(announcement.message || "").replace(
      /\n/g,
      "<br/>",
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>${escapeHtml(title)}</title>

          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #333333;
              margin: 45px;
              line-height: 1.6;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #5b1a1a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            .church {
              font-size: 24px;
              font-weight: bold;
              color: #5b1a1a;
              margin-bottom: 8px;
            }

            .subtitle {
              font-size: 14px;
              color: #666666;
            }

            h1 {
              font-size: 28px;
              color: #5b1a1a;
              margin-bottom: 25px;
            }

            .information {
              background: #f8f4f4;
              border: 1px solid #e2d2d2;
              padding: 18px;
              margin-bottom: 30px;
            }

            .information p {
              margin: 7px 0;
            }

            .label {
              font-weight: bold;
              color: #5b1a1a;
            }

            .message {
              font-size: 16px;
              margin-top: 20px;
              white-space: normal;
            }

            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #dddddd;
              text-align: center;
              font-size: 12px;
              color: #777777;
            }
          </style>
        </head>

        <body>

          <div class="header">
            <div class="church">
              ${escapeHtml(churchName)}
            </div>

            <div class="subtitle">
              ${escapeHtml(churchShortName)}
            </div>
          </div>

          <h1>
            ${escapeHtml(title)}
          </h1>

          <div class="information">

            <p>
              <span class="label">Category:</span>
              ${escapeHtml(announcement.category || "General")}
            </p>

            <p>
              <span class="label">Audience:</span>
              ${escapeHtml(announcement.audience || "N/A")}
            </p>

            <p>
              <span class="label">Published:</span>
              ${escapeHtml(date)}
            </p>

            <p>
              <span class="label">Notification:</span>
              ${escapeHtml(emailStatus)}
            </p>

          </div>

          <div class="message">
            ${message}
          </div>

          <div class="footer">
            ${escapeHtml(churchName)}
            <br/>
            Official Church Announcement
          </div>

        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `${cleanFileName(title)}.doc`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showNotification(
      "success",
      "Announcement Word document downloaded successfully.",
    );
  };

  // ==========================================
  // PRINT SINGLE ANNOUNCEMENT
  // ==========================================

  const printAnnouncement = (announcement) => {
    if (!announcement) return;

    const title = announcement.title || "Church Announcement";

    const date = formatDate(announcement.createdAt);

    const emailStatus = announcement.sendEmail
      ? "Email Notification Sent"
      : "Email Notification Disabled";

    const message = escapeHtml(announcement.message || "").replace(
      /\n/g,
      "<br/>",
    );

    const printWindow = window.open("", "_blank", "width=900,height=800");

    if (!printWindow) {
      showNotification(
        "error",
        "Unable to open print window. Please allow pop-ups for this website.",
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>

          <title>${escapeHtml(title)}</title>

          <style>

            @page {
              margin: 20mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #222;

              line-height: 1.7;

              margin: 0;

              padding: 0;
            }

            .header {
              text-align: center;

              border-bottom:
                3px solid #5b1a1a;

              padding-bottom: 20px;

              margin-bottom: 30px;
            }

            .church {
              font-size: 24px;

              font-weight: 800;

              color: #5b1a1a;
            }

            .short {
              margin-top: 5px;

              font-size: 14px;

              color: #666;
            }

            h1 {
              color: #5b1a1a;

              font-size: 28px;

              margin-bottom: 25px;
            }

            .info {
              background: #f8f4f4;

              border:
                1px solid #dfcaca;

              padding: 18px;

              border-radius: 10px;

              margin-bottom: 30px;
            }

            .info p {
              margin: 6px 0;
            }

            .label {
              font-weight: 700;

              color: #5b1a1a;
            }

            .message {
              font-size: 16px;

              margin-top: 25px;
            }

            .footer {
              border-top:
                1px solid #ddd;

              margin-top: 50px;

              padding-top: 15px;

              text-align: center;

              color: #777;

              font-size: 12px;
            }

          </style>

        </head>

        <body>

          <div class="header">

            <div class="church">
              ${escapeHtml(churchName)}
            </div>

            <div class="short">
              ${escapeHtml(churchShortName)}
            </div>

          </div>

          <h1>
            ${escapeHtml(title)}
          </h1>

          <div class="info">

            <p>
              <span class="label">Category:</span>
              ${escapeHtml(announcement.category || "General")}
            </p>

            <p>
              <span class="label">Audience:</span>
              ${escapeHtml(announcement.audience || "N/A")}
            </p>

            <p>
              <span class="label">Published:</span>
              ${escapeHtml(date)}
            </p>

            <p>
              <span class="label">Notification:</span>
              ${escapeHtml(emailStatus)}
            </p>

          </div>

          <div class="message">
            ${message}
          </div>

          <div class="footer">
            ${escapeHtml(churchName)}
            <br/>
            Official Church Announcement
          </div>

        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();

      printWindow.close();
    }, 300);
  };

  // ==========================================
  // DOWNLOAD ALL ANNOUNCEMENTS AS WORD
  // ==========================================

  const downloadAllAnnouncements = () => {
    if (!announcements || announcements.length === 0) {
      showNotification("error", "There are no announcements to export.");

      return;
    }

    downloadExcel(
      announcements.map((announcement) => ({
        Title: announcement.title || "",
        Category: announcement.category || "General",
        Audience: announcement.audience || "N/A",
        Published: formatDate(announcement.createdAt),
        Notification: announcement.sendEmail
          ? "Email Notification Sent"
          : "Email Notification Disabled",
        Message: announcement.message || "",
      })),
      `Church_Announcements_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Announcements",
    );
    showNotification(
      "success",
      "All announcements exported to Excel successfully.",
    );
    return;

    // eslint-disable-next-line no-unreachable
    const announcementSections = announcements
      .map((announcement, index) => {
        const title = announcement.title || `Announcement ${index + 1}`;

        const date = formatDate(announcement.createdAt);

        const emailStatus = announcement.sendEmail
          ? "Email Notification Sent"
          : "Email Notification Disabled";

        const message = escapeHtml(announcement.message || "").replace(
          /\n/g,
          "<br/>",
        );

        return `
          <div class="announcement">

            <div class="number">
              Announcement ${index + 1}
            </div>

            <h2>
              ${escapeHtml(title)}
            </h2>

            <div class="information">

              <p>
                <strong>Category:</strong>
                ${escapeHtml(announcement.category || "General")}
              </p>

              <p>
                <strong>Audience:</strong>
                ${escapeHtml(announcement.audience || "N/A")}
              </p>

              <p>
                <strong>Published:</strong>
                ${escapeHtml(date)}
              </p>

              <p>
                <strong>Notification:</strong>
                ${escapeHtml(emailStatus)}
              </p>

            </div>

            <div class="message">
              ${message}
            </div>

          </div>
        `;
      })
      .join("");

    // eslint-disable-next-line no-unreachable
    const html = `
      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8" />

          <title>
            Church Announcements
          </title>

          <style>

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #333;

              margin: 45px;

              line-height: 1.6;
            }

            .header {
              text-align: center;

              border-bottom:
                3px solid #5b1a1a;

              padding-bottom: 20px;

              margin-bottom: 35px;
            }

            .church {
              color: #5b1a1a;

              font-size: 25px;

              font-weight: bold;
            }

            .subtitle {
              color: #666;

              font-size: 14px;

              margin-top: 6px;
            }

            .documentTitle {
              text-align: center;

              color: #5b1a1a;

              font-size: 26px;

              margin-bottom: 35px;
            }

            .announcement {
              margin-bottom: 45px;

              padding-bottom: 35px;

              border-bottom:
                2px solid #ddd;
            }

            .number {
              color: #777;

              font-size: 13px;

              font-weight: bold;

              text-transform: uppercase;

              margin-bottom: 8px;
            }

            h2 {
              color: #5b1a1a;

              font-size: 23px;

              margin-bottom: 20px;
            }

            .information {
              background: #f8f4f4;

              border:
                1px solid #dfd1d1;

              padding: 15px;

              margin-bottom: 20px;
            }

            .information p {
              margin: 6px 0;
            }

            .information strong {
              color: #5b1a1a;
            }

            .message {
              font-size: 15px;

              line-height: 1.8;
            }

            .footer {
              text-align: center;

              border-top:
                1px solid #ddd;

              padding-top: 20px;

              margin-top: 40px;

              color: #777;

              font-size: 12px;
            }

          </style>

        </head>

        <body>

          <div class="header">

            <div class="church">
              ${escapeHtml(churchName)}
            </div>

            <div class="subtitle">
              ${escapeHtml(churchShortName)}
            </div>

          </div>

          <div class="documentTitle">
            Church Announcements
          </div>

          ${announcementSections}

          <div class="footer">

            ${escapeHtml(churchName)}

            <br/>

            Official Church Announcement Records

            <br/>

            Generated on ${escapeHtml(formatDate(new Date()))}

          </div>

        </body>

      </html>
    `;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `Church_Announcements_${
      new Date().toISOString().split("T")[0]
    }.doc`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showNotification("success", "All announcements exported successfully.");
  };

  // ==========================================
  // PRINT ALL ANNOUNCEMENTS
  // ==========================================

  const printAllAnnouncements = () => {
    if (!announcements || announcements.length === 0) {
      showNotification("error", "There are no announcements to print.");

      return;
    }

    const sections = announcements
      .map((announcement, index) => {
        const title = announcement.title || `Announcement ${index + 1}`;

        const date = formatDate(announcement.createdAt);

        const emailStatus = announcement.sendEmail
          ? "Email Notification Sent"
          : "Email Notification Disabled";

        const message = escapeHtml(announcement.message || "").replace(
          /\n/g,
          "<br/>",
        );

        return `
          <section class="announcement">

            <div class="number">
              Announcement ${index + 1}
            </div>

            <h2>
              ${escapeHtml(title)}
            </h2>

            <div class="info">

              <p>
                <strong>Category:</strong>
                ${escapeHtml(announcement.category || "General")}
              </p>

              <p>
                <strong>Audience:</strong>
                ${escapeHtml(announcement.audience || "N/A")}
              </p>

              <p>
                <strong>Published:</strong>
                ${escapeHtml(date)}
              </p>

              <p>
                <strong>Notification:</strong>
                ${escapeHtml(emailStatus)}
              </p>

            </div>

            <div class="message">
              ${message}
            </div>

          </section>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=800");

    if (!printWindow) {
      showNotification(
        "error",
        "Unable to open print window. Please allow pop-ups for this website.",
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            Church Announcements
          </title>

          <style>

            @page {
              margin: 20mm;
            }

            body {
              font-family:
                Arial,
                Helvetica,
                sans-serif;

              color: #222;

              line-height: 1.6;
            }

            .header {
              text-align: center;

              border-bottom:
                3px solid #5b1a1a;

              padding-bottom: 20px;

              margin-bottom: 35px;
            }

            .church {
              color: #5b1a1a;

              font-size: 25px;

              font-weight: bold;
            }

            .short {
              color: #666;

              font-size: 14px;

              margin-top: 5px;
            }

            .title {
              text-align: center;

              color: #5b1a1a;

              font-size: 26px;

              margin-bottom: 35px;
            }

            .announcement {
              page-break-inside: avoid;

              margin-bottom: 40px;

              padding-bottom: 30px;

              border-bottom:
                1px solid #ddd;
            }

            .number {
              color: #777;

              font-size: 12px;

              font-weight: bold;

              text-transform: uppercase;
            }

            h2 {
              color: #5b1a1a;

              font-size: 23px;
            }

            .info {
              background: #f8f4f4;

              border:
                1px solid #ddd;

              padding: 15px;

              margin: 20px 0;
            }

            .info p {
              margin: 6px 0;
            }

            .info strong {
              color: #5b1a1a;
            }

            .message {
              font-size: 15px;

              line-height: 1.8;
            }

            .footer {
              text-align: center;

              margin-top: 50px;

              border-top:
                1px solid #ddd;

              padding-top: 15px;

              color: #777;

              font-size: 12px;
            }

          </style>

        </head>

        <body>

          <div class="header">

            <div class="church">
              ${escapeHtml(churchName)}
            </div>

            <div class="short">
              ${escapeHtml(churchShortName)}
            </div>

          </div>

          <div class="title">
            Church Announcements
          </div>

          ${sections}

          <div class="footer">

            ${escapeHtml(churchName)}

            <br/>

            Official Church Announcement Records

          </div>

        </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();

      printWindow.close();
    }, 300);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AdminLayout title="Church Announcement Management">
      <div className={styles.container}>
        {/* =====================================
            HERO
        ====================================== */}

        <div className={styles.hero}>
          <div>
            <h1>
              <FiBell />
              Church Announcements
            </h1>

            <p>
              Share important church updates, events and spiritual messages with
              members.
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.badge}>
              <FiUsers />
              Approved Members
            </div>
          </div>
        </div>

        {/* =====================================
            NOTIFICATION
        ====================================== */}

        {notification.text && (
          <div
            className={
              notification.type === "success" ? styles.success : styles.error
            }
          >
            {notification.type === "success" ? (
              <FiCheckCircle />
            ) : (
              <FiAlertCircle />
            )}

            <span>{notification.text}</span>
          </div>
        )}

        {/* =====================================
            CREATE CARD
        ====================================== */}

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <FiPlusCircle />

            <h2>Create New Announcement</h2>
          </div>

          <form onSubmit={createAnnouncement}>
            <div className={styles.grid}>
              {/* TITLE */}

              <div>
                <label>Announcement Title</label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Sunday worship update"
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label>Category</label>

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option>General</option>

                  <option>Worship</option>

                  <option>Event</option>

                  <option>Emergency</option>

                  <option>Important</option>
                </select>
              </div>

              {/* AUDIENCE */}

              <div>
                <label>Audience</label>

                <select
                  name="audience"
                  value={form.audience}
                  onChange={handleChange}
                >
                  <option>Approved Members</option>

                  <option>All</option>
                </select>
              </div>

              {/* EMAIL CHECKBOX */}

              <div className={styles.checkboxBox}>
                <input
                  id="email"
                  type="checkbox"
                  name="sendEmail"
                  checked={form.sendEmail}
                  onChange={handleChange}
                />

                <label htmlFor="email">
                  <strong>Email Notification</strong>

                  <span>Members will receive this announcement by email.</span>
                </label>
              </div>
            </div>

            {/* MESSAGE */}

            <div className={styles.messageBox}>
              <label>Announcement Message</label>

              <textarea
                rows="6"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Write church announcement..."
              />
            </div>

            {/* EMAIL PREVIEW */}

            <div className={styles.preview}>
              <FiMail />

              <div>
                <strong>Email Notification</strong>

                <p>
                  {form.sendEmail
                    ? "Members will receive this announcement by email."
                    : "Email notification is currently disabled."}
                </p>
              </div>
            </div>

            {/* PUBLISH */}

            <button disabled={sending} className={styles.sendBtn}>
              <FiSend />

              {sending ? "Publishing..." : "Publish Announcement"}
            </button>
          </form>
        </div>

        {/* =====================================
            HISTORY HEADER
        ====================================== */}

        <div className={styles.historyHeader}>
          <div>
            <h2>
              <FiFileText />
              Previous Announcements
            </h2>

            <p>View, print, or download church announcement records.</p>
          </div>

          {announcements.length > 0 && (
            <div className={styles.exportAllButtons}>
              <button
                type="button"
                className={styles.exportAllBtn}
                onClick={downloadAllAnnouncements}
              >
                <FiDownload />
                Export Excel
              </button>

              <button
                type="button"
                className={styles.printAllBtn}
                onClick={printAllAnnouncements}
              >
                <FiPrinter />
                Print All
              </button>
            </div>
          )}
        </div>

        {/* =====================================
            HISTORY
        ====================================== */}

        <div className={styles.history}>
          {loading ? (
            <div className={styles.loading}>Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className={styles.empty}>
              <FiAlertCircle />

              <p>No announcements created yet</p>
            </div>
          ) : (
            announcements.map((item) => (
              <div className={styles.item} key={item._id}>
                {/* CONTENT */}

                <div className={styles.content}>
                  <h3>{item.title}</h3>

                  <p>
                    {expanded === item._id
                      ? item.message
                      : item.message.length > 120
                        ? item.message.substring(0, 120) + "..."
                        : item.message}
                  </p>

                  {item.message && item.message.length > 120 && (
                    <button
                      type="button"
                      className={styles.expand}
                      onClick={() =>
                        setExpanded(expanded === item._id ? null : item._id)
                      }
                    >
                      {expanded === item._id ? (
                        <>
                          Hide
                          <FiChevronUp />
                        </>
                      ) : (
                        <>
                          Read More
                          <FiChevronDown />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* META */}

                <div className={styles.meta}>
                  <span>{item.category}</span>

                  <span>{item.audience}</span>

                  <small>
                    <FiCalendar />

                    {formatDate(item.createdAt)}
                  </small>

                  {item.sendEmail && (
                    <small>
                      <FiMail />
                      Email Sent
                    </small>
                  )}

                  {/* =================================
                      DOCUMENT ACTIONS
                  ================================== */}

                  <div className={styles.documentActions}>
                    <button
                      type="button"
                      className={styles.wordBtn}
                      title="Download Excel file"
                      onClick={() => downloadAnnouncementExcel(item)}
                    >
                      <FiDownload />
                      Excel
                    </button>

                    <button
                      type="button"
                      className={styles.printBtn}
                      title="Print Announcement"
                      onClick={() => printAnnouncement(item)}
                    >
                      <FiPrinter />
                      Print
                    </button>

                    <button
                      type="button"
                      className={styles.deleteBtn}
                      title="Delete Announcement"
                      onClick={() => deleteAnnouncement(item._id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
