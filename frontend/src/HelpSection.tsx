import { useEffect, useState, type FormEvent } from "react";
import { api } from "./types";

type Report = {
  id: string;
  category: string;
  location: string;
  description: string;
  createdAt: string;
};
const categories: Record<string, string> = {
  transport: "Transport problem",
  place: "Problem at a tourism spot",
  "lost-item": "Lost item",
  app: "App problem",
  other: "Other",
};

export default function HelpSection() {
  const [category, setCategory] = useState("transport");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setReceipt("");
    try {
      const report = await api<Report>("/reports", {
        method: "POST",
        body: JSON.stringify({ category, location, description }),
      });
      setReceipt(report.id);
      setDescription("");
      setLocation("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your report. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="secondary-page help-page">
      <div className="eyebrow">HELP & CONTACTS</div>
      <h1>Help when you need it.</h1>
      <p className="page-intro">
        Call a service directly, find nearby help, or tell us about a problem.
      </p>
      <div className="help-urgent">
        <strong>Need urgent help?</strong> Call directly. The report form below
        is not monitored by emergency services and cannot request rescue.
      </div>
      <div className="help-grid">
        <article className="help-card">
          <h2>Nepal Police</h2>
          <p>Police emergency control in Nepal.</p>
          <a className="help-call" href="tel:100">
            Call 100
          </a>
          <a
            href="https://www.nepalpolice.gov.np/stations/emergency-contacts/"
            target="_blank"
            rel="noreferrer"
          >
            Official contact source ↗
          </a>
        </article>
        <article className="help-card">
          <h2>Bharatpur Hospital</h2>
          <p>
            General hospital contact. Ask about the care you need; this is not a
            confirmed ambulance dispatch line.
          </p>
          <a className="help-call" href="tel:+97756597003">
            Call +977 56-597003
          </a>
          <a
            href="https://online.bharatpurhospital.gov.np/"
            target="_blank"
            rel="noreferrer"
          >
            Official contact source ↗
          </a>
        </article>
      </div>
      <p className="help-small">
        Contacts checked against official websites on 20 September 2026. Call
        links open your device’s calling app; desktop computers may need a
        calling application. The short code 100 is for use in Nepal.
      </p>
      <article className="help-card">
        <h2>Find nearby services</h2>
        <p>
          Open Google Maps to see nearby listings, directions and their listed
          phone numbers. Maps may ask for your location. Pulse does not
          determine which service is closest or available.
        </p>
        <div className="help-actions">
          <a
            className="help-link"
            href="https://www.google.com/maps/search/?api=1&query=hospitals+near+me"
            target="_blank"
            rel="noreferrer"
          >
            Find nearby hospitals ↗
          </a>
          <a
            className="help-link"
            href="https://www.google.com/maps/search/?api=1&query=police+stations+near+me"
            target="_blank"
            rel="noreferrer"
          >
            Find nearby police ↗
          </a>
          <a
            className="help-link"
            href="https://www.google.com/maps/search/?api=1&query=hospitals+in+Bharatpur+Chitwan+Nepal"
            target="_blank"
            rel="noreferrer"
          >
            Browse hospitals in Bharatpur ↗
          </a>
        </div>
      </article>
      <form className="help-card help-form" onSubmit={submit}>
        <h2>Report a non-emergency problem</h2>
        <p>
          Reports are saved in this prototype’s database and can be read in
          Operator demo. No police, hospital or municipal authority receives
          them. Avoid private medical details, passwords or identity documents.
        </p>
        <label htmlFor="report-category">Problem type</label>
        <select
          id="report-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {Object.entries(categories).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label htmlFor="report-location">Place or landmark (optional)</label>
        <input
          id="report-location"
          maxLength={200}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="For example: Narayani riverfront"
        />
        <label htmlFor="report-description">What happened?</label>
        <textarea
          id="report-description"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem and what needs attention."
        />
        <small>{description.length}/2000 characters · minimum 10</small>
        {error && <p role="alert">{error}</p>}
        {receipt && (
          <p className="help-receipt" role="status">
            Saved to the local demo inbox. Reference: {receipt}. This does not
            dispatch help.
          </p>
        )}
        <button
          className="primary"
          disabled={busy || description.trim().length < 10}
        >
          {busy ? "Saving…" : "Save report to demo inbox"}
        </button>
      </form>
    </section>
  );
}

export function ReportInbox() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setReports(await api<Report[]>("/reports"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="help-card">
      <h2>Local problem reports</h2>
      <p>
        Latest 100 reports. Demo inbox only; no emergency service receives
        these.
      </p>
      <button className="status-button" onClick={refresh} disabled={busy}>
        {busy ? "Loading…" : "Refresh reports"}
      </button>
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !reports.length && <p>No reports yet.</p>}
      {reports.map((report) => (
        <article className="help-report" key={report.id}>
          <strong>{categories[report.category] || report.category}</strong>
          <p>{report.location || "No location provided"}</p>
          <p className="help-description">{report.description}</p>
          <small>
            {new Date(report.createdAt).toLocaleString()} · {report.id}
          </small>
        </article>
      ))}
    </section>
  );
}
