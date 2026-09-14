import { useEffect, useState } from "react";

import AdminLayout from "../components/AdminLayout";
import api from "../services/api";

import styles from "../styles/event.module.css";

import {
  FiUpload,
  FiTrash2,
  FiSearch,
  FiCalendar,
  FiEye,
  FiHeart,
  FiMapPin,
  FiClock,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiImage,
} from "react-icons/fi";

// =====================================================
// EVENT CATEGORIES
// =====================================================

const categories = [
  "All",
  "Worship",
  "Celebration",
  "Community",
  "Youth",
  "Announcement",
];

// =====================================================
// EVENT STATUSES
// =====================================================

const statuses = ["Upcoming", "Completed", "Cancelled"];

// =====================================================
// DEFAULT EVENT IMAGE
// No image file is required.
// =====================================================

const DEFAULT_EVENT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='550' viewBox='0 0 900 550'%3E%3Crect width='900' height='550' fill='%23f5f1e8'/%3E%3Ccircle cx='450' cy='210' r='85' fill='%23d4af37'/%3E%3Cpath d='M450 100v220M370 165h160' stroke='%23ffffff' stroke-width='22' stroke-linecap='round'/%3E%3Ctext x='450' y='390' text-anchor='middle' font-family='Arial,sans-serif' font-size='42' font-weight='bold' fill='%235b4636'%3EChurch Event%3C/text%3E%3Ctext x='450' y='435' text-anchor='middle' font-family='Arial,sans-serif' font-size='22' fill='%23705c48'%3ESt. Mary %26 St. Gabriel Church%3C/text%3E%3C/svg%3E";

// =====================================================
// INITIAL FORM
// =====================================================

const initialForm = {
  title: "",
  category: "Worship",
  date: "",
  time: "",
  location: "",
  description: "",
  status: "Upcoming",
  image: null,
};

// =====================================================
// EVENT PAGE
// =====================================================

export default function Event() {
  // ===================================================
  // STATE
  // ===================================================

  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [progress, setProgress] = useState(0);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");

  const [preview, setPreview] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [form, setForm] = useState({
    ...initialForm,
  });

  // ===================================================
  // FETCH EVENTS
  // ===================================================

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const response = await api.get("/events");

      setEvents(response.data?.events || []);
    } catch (error) {
      console.error("FETCH EVENTS ERROR:", error);

      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to load events.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // LOAD EVENTS ON PAGE LOAD
  // ===================================================

  useEffect(() => {
    fetchEvents();
  }, []);

  // ===================================================
  // CLEAR MESSAGE
  // ===================================================

  const clearMessage = () => {
    setMessage({
      type: "",
      text: "",
    });
  };

  // ===================================================
  // INPUT CHANGE
  // ===================================================

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    // =================================================
    // IMAGE INPUT
    // =================================================

    if (name === "image") {
      const file = files?.[0];

      // No file selected
      if (!file) {
        return;
      }

      // -----------------------------------------------
      // Validate image type
      // -----------------------------------------------

      if (!file.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Please select a valid image file.",
        });

        e.target.value = "";

        return;
      }

      // -----------------------------------------------
      // Validate image size
      // Maximum 10 MB
      // -----------------------------------------------

      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        setMessage({
          type: "error",
          text: "Image size must be less than 10 MB.",
        });

        e.target.value = "";

        return;
      }

      clearMessage();

      // -----------------------------------------------
      // Save image
      // -----------------------------------------------

      setForm((prev) => ({
        ...prev,
        image: file,
      }));

      // -----------------------------------------------
      // Remove previous preview URL
      // -----------------------------------------------

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      // -----------------------------------------------
      // Create new preview
      // -----------------------------------------------

      const previewUrl = URL.createObjectURL(file);

      setPreview(previewUrl);

      return;
    }

    // =================================================
    // NORMAL INPUT
    // =================================================

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ===================================================
  // REMOVE SELECTED IMAGE
  // ===================================================

  const removeImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);

    setForm((prev) => ({
      ...prev,
      image: null,
    }));

    const imageInput = document.querySelector('input[name="image"]');

    if (imageInput) {
      imageInput.value = "";
    }
  };

  // ===================================================
  // RESET FORM
  // ===================================================

  const resetForm = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setForm({
      ...initialForm,
    });

    setPreview(null);

    setProgress(0);

    const imageInput = document.querySelector('input[name="image"]');

    if (imageInput) {
      imageInput.value = "";
    }
  };

  // ===================================================
  // CREATE EVENT
  // ===================================================

  const uploadEvent = async (e) => {
    e.preventDefault();

    // Prevent duplicate submission
    if (uploading) {
      return;
    }

    // =================================================
    // VALIDATION
    // =================================================

    if (!form.title.trim()) {
      setMessage({
        type: "error",
        text: "Event title is required.",
      });

      return;
    }

    if (!form.description.trim()) {
      setMessage({
        type: "error",
        text: "Event description is required.",
      });

      return;
    }

    if (!form.date) {
      setMessage({
        type: "error",
        text: "Event date is required.",
      });

      return;
    }

    // =================================================
    // START REQUEST
    // =================================================

    try {
      setUploading(true);

      setProgress(0);

      clearMessage();

      // =================================================
      // CREATE FORM DATA
      // =================================================

      const data = new FormData();

      data.append("title", form.title.trim());

      data.append("category", form.category);

      data.append("date", form.date);

      data.append("time", form.time || "");

      data.append("location", form.location.trim() || "");

      data.append("description", form.description.trim());

      data.append("status", form.status);

      // =================================================
      // IMPORTANT:
      // IMAGE IS OPTIONAL
      // =================================================

      if (form.image) {
        data.append("image", form.image);
      }

      // =================================================
      // SEND EVENT TO BACKEND
      // =================================================

      const response = await api.post("/events", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);

            setProgress(percent);
          }
        },
      });

      console.log("EVENT CREATED:", response.data);

      // =================================================
      // SUCCESS MESSAGE
      // =================================================

      setMessage({
        type: "success",
        text: response.data?.message || "Event published successfully.",
      });

      // =================================================
      // RESET FORM
      // =================================================

      resetForm();

      // =================================================
      // REFRESH EVENTS
      // =================================================

      await fetchEvents();
    } catch (error) {
      console.error("CREATE EVENT ERROR:", error);

      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to publish event.",
      });
    } finally {
      setUploading(false);
    }
  };

  // ===================================================
  // DELETE EVENT
  // ===================================================

  const deleteEvent = async (id) => {
    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this church event?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/events/${id}`);

      setMessage({
        type: "success",
        text: "Event deleted successfully.",
      });

      // Close modal if deleting selected event
      if (selectedEvent?._id === id) {
        setSelectedEvent(null);
      }

      await fetchEvents();
    } catch (error) {
      console.error("DELETE EVENT ERROR:", error);

      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete event.",
      });
    }
  };

  // ===================================================
  // FILTER EVENTS
  // ===================================================

  const filteredEvents = events.filter((event) => {
    const text = search.trim().toLowerCase();

    const title = event.title?.toLowerCase() || "";

    const description = event.description?.toLowerCase() || "";

    const matchesSearch =
      !text || title.includes(text) || description.includes(text);

    const matchesCategory = category === "All" || event.category === category;

    return matchesSearch && matchesCategory;
  });

  // ===================================================
  // IMAGE ERROR HANDLER
  // ===================================================

  const handleImageError = (e) => {
    if (e.currentTarget.src === DEFAULT_EVENT_IMAGE) {
      return;
    }

    e.currentTarget.src = DEFAULT_EVENT_IMAGE;
  };

  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {
    setSelectedEvent(null);
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <AdminLayout title="Church Event Management">
      <div className={styles.container}>
        {/* =================================================
            HERO SECTION
        ================================================= */}

        <div className={styles.hero}>
          <div>
            <h1>⛪ Church Event Management</h1>

            <p>
              Create worship programs, celebrations, announcements and community
              activities.
            </p>
          </div>

          <div className={styles.badge}>
            <FiHeart />
            <span>{events.length}</span>
            Events
          </div>
        </div>

        {/* =================================================
            MESSAGE ALERT
        ================================================= */}

        {message.text && (
          <div
            className={
              message.type === "success" ? styles.success : styles.error
            }
          >
            {message.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}

            <span>{message.text}</span>

            <button
              type="button"
              onClick={clearMessage}
              aria-label="Close message"
            >
              <FiX />
            </button>
          </div>
        )}

        {/* =================================================
            CREATE EVENT CARD
        ================================================= */}

        <div className={styles.uploadCard}>
          <h2>
            <FiUpload />
            Upload New Church Event
          </h2>

          <form onSubmit={uploadEvent}>
            <div className={styles.formGrid}>
              {/* =========================================
                  EVENT TITLE
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-title">Event Title</label>

                <input
                  id="event-title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Sunday Holy Mass Celebration"
                  disabled={uploading}
                  required
                />
              </div>

              {/* =========================================
                  CATEGORY
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-category">Category</label>

                <select
                  id="event-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  disabled={uploading}
                >
                  {categories.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* =========================================
                  DATE
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-date">Event Date</label>

                <input
                  id="event-date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  disabled={uploading}
                  required
                />
              </div>

              {/* =========================================
                  TIME
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-time">Event Time</label>

                <input
                  id="event-time"
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  disabled={uploading}
                />
              </div>

              {/* =========================================
                  LOCATION
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-location">Location</label>

                <input
                  id="event-location"
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Church Hall"
                  disabled={uploading}
                />
              </div>

              {/* =========================================
                  STATUS
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-status">Status</label>

                <select
                  id="event-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={uploading}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* =========================================
                  EVENT IMAGE - OPTIONAL
              ========================================= */}

              <div className={styles.field}>
                <label htmlFor="event-image">
                  Event Image
                  <span
                    style={{
                      marginLeft: "6px",
                      opacity: 0.65,
                      fontWeight: "normal",
                    }}
                  >
                    (Optional)
                  </span>
                </label>

                <input
                  id="event-image"
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  disabled={uploading}
                />

                <small
                  style={{
                    display: "block",
                    marginTop: "6px",
                    opacity: 0.65,
                  }}
                >
                  You can publish the event without an image. Maximum size: 10
                  MB.
                </small>
              </div>

              {/* =========================================
                  DESCRIPTION
              ========================================= */}

              <div className={styles.fieldFull}>
                <label htmlFor="event-description">Description</label>

                <textarea
                  id="event-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Write event details..."
                  disabled={uploading}
                  required
                />
              </div>
            </div>

            {/* =================================================
                IMAGE PREVIEW
            ================================================= */}

            {preview && (
              <div className={styles.preview}>
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  <img
                    src={preview}
                    alt="Selected event preview"
                    onError={handleImageError}
                  />

                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={uploading}
                    aria-label="Remove selected image"
                    title="Remove image"
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      border: "none",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: uploading ? "not-allowed" : "pointer",
                    }}
                  >
                    <FiX />
                  </button>
                </div>
              </div>
            )}

            {/* =================================================
                UPLOAD PROGRESS
            ================================================= */}

            {uploading && (
              <div className={styles.progressBox}>
                <p>Publishing event... {progress}%</p>

                <div className={styles.progress}>
                  <span
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* =================================================
                PUBLISH BUTTON
            ================================================= */}

            <button
              type="submit"
              className={styles.uploadBtn}
              disabled={uploading}
            >
              <FiUpload />

              {uploading ? `Publishing... ${progress}%` : "Publish Event"}
            </button>
          </form>
        </div>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <div className={styles.tools}>
          <div className={styles.search}>
            <FiSearch />

            <input
              type="text"
              placeholder="Search church events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.categories}>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                className={category === cat ? styles.active : ""}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* =================================================
            EVENTS GRID
        ================================================= */}

        {loading ? (
          <div className={styles.loading}>Loading Events...</div>
        ) : (
          <div className={styles.grid}>
            {filteredEvents.length === 0 ? (
              <div className={styles.empty}>
                <FiCalendar />

                <h3>No events found</h3>

                <p>
                  {events.length === 0
                    ? "Create your first church event."
                    : "Try changing your search or category filter."}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div className={styles.card} key={event._id}>
                  {/* =====================================
                        EVENT IMAGE
                    ===================================== */}

                  <div className={styles.imageBox}>
                    <img
                      src={event.imageUrl || DEFAULT_EVENT_IMAGE}
                      alt={event.title || "Church event"}
                      onError={handleImageError}
                    />

                    <div className={styles.overlay}>
                      {/* VIEW */}

                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        aria-label="View event"
                        title="View event"
                      >
                        <FiEye />
                      </button>

                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() => deleteEvent(event._id)}
                        aria-label="Delete event"
                        title="Delete event"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {/* =====================================
                        EVENT CONTENT
                    ===================================== */}

                  <div className={styles.content}>
                    <div className={styles.titleRow}>
                      <h3>{event.title}</h3>

                      <span>{event.category}</span>
                    </div>

                    <p>{event.description}</p>

                    {/* EVENT INFORMATION */}

                    <div className={styles.info}>
                      {event.date && (
                        <div>
                          <FiCalendar />

                          <span>{event.date}</span>
                        </div>
                      )}

                      {event.time && (
                        <div>
                          <FiClock />

                          <span>{event.time}</span>
                        </div>
                      )}

                      {event.location && (
                        <div>
                          <FiMapPin />

                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* STATUS */}

                    <div
                      className={
                        event.status === "Upcoming"
                          ? styles.upcoming
                          : event.status === "Completed"
                            ? styles.completed
                            : styles.cancelled
                      }
                    >
                      {event.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* =================================================
            EVENT PREVIEW MODAL
        ================================================= */}

        {selectedEvent && (
          <div
            className={styles.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >
            {/* CLOSE BUTTON */}

            <button
              type="button"
              className={styles.close}
              onClick={closeModal}
              aria-label="Close event preview"
              title="Close"
            >
              <FiX />
            </button>

            {/* MODAL CONTENT */}

            <div className={styles.modalContent}>
              {/* =========================================
                  IMAGE OR FALLBACK
              ========================================= */}

              <img
                src={selectedEvent.imageUrl || DEFAULT_EVENT_IMAGE}
                alt={selectedEvent.title || "Church event"}
                onError={handleImageError}
              />

              <div className={styles.modalBody}>
                <h2>{selectedEvent.title}</h2>

                <div className={styles.modalMeta}>
                  <span>{selectedEvent.category}</span>

                  <span>{selectedEvent.status}</span>
                </div>

                <p>{selectedEvent.description}</p>

                {/* EVENT INFORMATION */}

                <div className={styles.info}>
                  {selectedEvent.date && (
                    <div>
                      <FiCalendar />

                      <span>{selectedEvent.date}</span>
                    </div>
                  )}

                  {selectedEvent.time && (
                    <div>
                      <FiClock />

                      <span>{selectedEvent.time}</span>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div>
                      <FiMapPin />

                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                </div>

                {/* DELETE BUTTON */}

                <button
                  type="button"
                  onClick={() => {
                    const id = selectedEvent._id;

                    setSelectedEvent(null);

                    deleteEvent(id);
                  }}
                  style={{
                    marginTop: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FiTrash2 />
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
