import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity as PulseIcon,
  ArrowUpRight,
  ArrowRight,
  Bird,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Footprints,
  Info,
  Leaf,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
  AlertTriangle,
  BookOpen,
  Download,
  CheckCircle2,
} from "lucide-react";
import MapView from "./MapView";
import AskPulse from "./AskPulse";
import PlacePreview from "./PlacePreview";
import HelpSection, { ReportInbox } from "./HelpSection";
import {
  api,
  money,
  time,
  kindName,
  type ActivityView,
  type Preferences,
  type Trip,
  type Recovery,
} from "./types";
import "./styles.css";
function App() {
  const [view, setView] = useState<"plan" | "operator" | "about" | "help">(
    "plan",
  );
  const [activities, setActivities] = useState<ActivityView[]>([]),
    [trip, setTrip] = useState<Trip | null>(null),
    [recovery, setRecovery] = useState<Recovery | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    people: 2,
    budget: 6500,
    hours: 6,
    days: 1,
    startTime: "08:00",
    focus: "bird",
    culture: "optional",
    lowWalking: false,
  });
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [connected, setConnected] = useState(false),
    [showInfo, setShowInfo] = useState(false),
    [mobilePanel, setMobilePanel] = useState<"plan" | "map">("plan");
  const [activeDay, setActiveDay] = useState(0);
  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (showInfo) modalRef.current?.showModal();
    else modalRef.current?.close();
  }, [showInfo]);
  const tripRef = useRef<Trip | null>(null);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  const select = useCallback((id: string) => setSelected(id), []);
  useEffect(() => {
    let live = true;
    async function refresh() {
      try {
        const list = await api<ActivityView[]>("/activities");
        if (!live) return;
        setActivities((prev) =>
          JSON.stringify(prev) === JSON.stringify(list) ? prev : list,
        );
        setConnected(true);
        const id = tripRef.current?.id || localStorage.getItem("pulse-trip-id");
        if (id) {
          try {
            const t = await api<Trip>("/trips/" + id);
            if (live) {
              if (!tripRef.current)
                setPreferences({
                  ...t.preferences,
                  days: t.preferences.days ?? 1,
                  startTime: t.preferences.startTime ?? "08:00",
                });
              setTrip((prev) =>
                JSON.stringify(prev) === JSON.stringify(t) ? prev : t,
              );
            }
          } catch {
            localStorage.removeItem("pulse-trip-id");
          }
        }
      } catch {
        if (live) setConnected(false);
      }
    }
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("plan");
    setError("");
    setRecovery(null);
    try {
      const t = await api<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify(preferences),
      });
      if (
        !t.plan.days?.length ||
        t.preferences.days !== preferences.days ||
        t.preferences.startTime !== preferences.startTime
      ) {
        throw new Error(
          "Restart PulseApplication in IntelliJ to enable the updated multi-day planner, then try again.",
        );
      }
      setTrip(t);
      setActiveDay(0);
      localStorage.setItem("pulse-trip-id", t.id);
      setSelected(null);
      setNotice(
        "Your trip is ready. Prices and availability are demonstration data.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function recover() {
    if (!trip) return;
    setBusy("recover");
    setError("");
    try {
      setRecovery(
        await api<Recovery>(`/trips/${trip.id}/alternatives`, {
          method: "POST",
        }),
      );
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function accept() {
    if (!trip || !recovery) return;
    setBusy("accept");
    setError("");
    try {
      const t = await api<Trip>(`/trips/${trip.id}/accept`, {
        method: "POST",
        body: JSON.stringify({
          basedOnRevision: recovery.basedOnRevision,
          planToken: recovery.planToken,
        }),
      });
      setTrip(t);
      setRecovery(null);
      setNotice("Updated itinerary saved. This does not book any provider.");
    } catch (e) {
      setError((e as Error).message);
      setRecovery(null);
    } finally {
      setBusy("");
    }
  }
  async function toggle(id: string, value: boolean) {
    setBusy(id);
    setError("");
    try {
      setActivities(
        await api<ActivityView[]>(`/activities/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ available: value }),
        }),
      );
      if (trip) setTrip(await api<Trip>("/trips/" + trip.id));
      setRecovery(null);
      setNotice(
        "Sample activity status updated. Open tourist maps check for updates every 4 seconds.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function save() {
    if (!trip) return;
    const body = [
      "BHARATPUR PULSE — SAMPLE TRIP PLAN",
      trip.preferences.date,
      `${trip.preferences.people} travellers · NPR ${money(trip.plan.totalCost)} estimated`,
      ...(trip.plan.days?.length
        ? trip.plan.days
        : [{ day: 1, date: trip.preferences.date, plan: trip.plan }]
      ).flatMap((day) => [
        `Day ${day.day} — ${day.date} — starts ${trip.preferences.startTime ?? "08:00"}`,
        ...day.plan.stops.map(
          (s) =>
            `${time(s.arrival)}–${time(s.departure)} ${s.activity.name} | ${s.activity.area} | NPR ${money(s.activityCost)} for group`,
        ),
        `Return to sample base: ${time(day.plan.returnMinute)} | Day total NPR ${money(day.plan.totalCost)}`,
      ]),
      "",
      ...trip.plan.assumptions,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bharatpur-pulse-trip.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  const displayPlan = recovery?.plan || trip?.plan;
  const tripDays =
    displayPlan && trip
      ? displayPlan.days?.length
        ? displayPlan.days
        : [{ day: 1, date: trip.preferences.date, plan: displayPlan }]
      : [];
  const currentDay =
    tripDays[Math.min(activeDay, Math.max(0, tripDays.length - 1))];
  const dayPlan = currentDay?.plan;
  const chosen = activities.find((a) => a.activity.id === selected);
  const dirty =
    trip && JSON.stringify(preferences) !== JSON.stringify(trip.preferences);
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("plan");
          }}
        >
          <span className="brand-mark">
            <PulseIcon size={24} />
          </span>
          <span>
            bharatpur
            <span className="brand-pulse">
              pulse<span className="brand-period">.</span>
            </span>
          </span>
        </a>
        <div className="sidebar-label">YOUR JOURNEY</div>
        <nav>
          <button
            className={view === "plan" ? "nav-active" : ""}
            onClick={() => setView("plan")}
          >
            <Compass size={20} />
            Trip workspace
            <ChevronRight size={16} />
          </button>
          <button
            className={view === "operator" ? "nav-active" : ""}
            onClick={() => setView("operator")}
          >
            <Settings2 size={20} />
            Operator demo
          </button>
          <button
            className={view === "help" ? "nav-active" : ""}
            onClick={() => setView("help")}
          >
            <ShieldCheck size={20} />
            Help & contacts
          </button>
          <button
            className={view === "about" ? "nav-active" : ""}
            onClick={() => setView("about")}
          >
            <BookOpen size={20} />
            About the prototype
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="region-mark">
            <MapPin size={20} />
          </div>
          <strong>Made for discovery.</strong>
          <p>
            Bharatpur, Chitwan
            <br />
            27.68° N · 84.43° E
          </p>
          <div className="prototype">
            <span />
            LOCAL PROTOTYPE
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Your journey <ChevronRight size={14} />
            <strong>
              {view === "plan"
                ? "Trip workspace"
                : view === "operator"
                  ? "Operator demo"
                  : view === "help"
                    ? "Help & contacts"
                    : "Prototype notes"}
            </strong>
          </div>
          <div className={`connection ${connected ? "online" : ""}`}>
            <span />
            {connected
              ? "Local server connected"
              : "Connecting to local server"}
          </div>
        </header>
        {notice && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            <span>{notice}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={18} />
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {view === "plan" ? (
          <>
            <section className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="small-line" /> EXPLORE WITH INTENTION
                </div>
                <h1>
                  A trip that feels like <em>you.</em>
                </h1>
                <p>
                  Your interests. Your pace. A little room for the unexpected.
                </p>
              </div>
              <button
                className="quiet-button"
                onClick={() => setShowInfo(true)}
              >
                <Info size={16} />
                How this works
              </button>
            </section>
            <div className="sample-strip">
              <ShieldCheck size={16} />
              <span>
                <strong>Try the working prototype.</strong> Sample prices, hours
                and availability. No bookings or live weather.
              </span>
            </div>
            <div className="workspace">
              <section className="preferences-card">
                <div className="section-title">
                  <span className="icon-box">
                    <SlidersHorizontal size={18} />
                  </span>
                  <div>
                    <h2>Make it your trip</h2>
                    <p>Choose your dates and daily pace</p>
                  </div>
                </div>
                <form onSubmit={create}>
                  <label htmlFor="date">When are you visiting?</label>
                  <div className="input-icon">
                    <CalendarDays size={17} />
                    <input
                      id="date"
                      type="date"
                      required
                      value={preferences.date}
                      onChange={(e) =>
                        setPreferences({ ...preferences, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="field-row">
                    <div>
                      <label htmlFor="days">Number of days</label>
                      <div className="input-icon">
                        <CalendarDays size={17} />
                        <select
                          id="days"
                          value={preferences.days}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              days: +e.target.value,
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "day" : "days"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="start-time">Starting time</label>
                      <div className="input-icon">
                        <Clock size={17} />
                        <input
                          id="start-time"
                          type="time"
                          required
                          value={preferences.startTime}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              startTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <p className="trip-field-note">
                    Starting time and available hours apply to each day. Return
                    to the same Bharatpur base each evening.
                  </p>
                  <div className="field-row">
                    <div>
                      <label htmlFor="people">Travellers</label>
                      <div className="input-icon">
                        <Users size={17} />
                        <select
                          id="people"
                          value={preferences.people}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              people: +e.target.value,
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "person" : "people"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="hours">Time available</label>
                      <div className="input-icon">
                        <Clock size={17} />
                        <select
                          id="hours"
                          value={preferences.hours}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              hours: +e.target.value,
                            })
                          }
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} hours
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="budget-label">
                    <label htmlFor="budget">
                      Trip budget <span>all days · whole group</span>
                    </label>
                    <strong>NPR {money(preferences.budget)}</strong>
                  </div>
                  <input
                    id="budget"
                    type="range"
                    min="500"
                    max="20000"
                    step="500"
                    value={preferences.budget}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        budget: +e.target.value,
                      })
                    }
                  />
                  <div className="range-labels">
                    <span>NPR 500</span>
                    <span>NPR 20,000</span>
                  </div>
                  <p className="field-help">
                    Activities + estimated local transport. Flights and
                    accommodation are excluded.
                  </p>
                  <fieldset>
                    <legend>What brings you here?</legend>
                    <div className="interest-options">
                      {[
                        { id: "bird", name: "Birdwatching", icon: Bird },
                        { id: "nature", name: "Nature", icon: Leaf },
                        { id: "culture", name: "Culture", icon: Compass },
                      ].map(({ id, name, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={preferences.focus === id}
                          className={preferences.focus === id ? "selected" : ""}
                          onClick={() =>
                            setPreferences({
                              ...preferences,
                              focus: id,
                              culture:
                                id === "culture"
                                  ? "include"
                                  : preferences.culture,
                            })
                          }
                        >
                          <Icon size={21} />
                          <span>{name}</span>
                          {preferences.focus === id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label htmlFor="culture">Cultural experiences</label>
                  <select
                    id="culture"
                    value={preferences.culture}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        culture: e.target.value,
                      })
                    }
                  >
                    <option value="optional">Nice to have, if they fit</option>
                    <option value="include">Include one in my day</option>
                    <option value="exclude">Skip for this trip</option>
                  </select>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={preferences.lowWalking}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          lowWalking: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Keep walking light</strong>
                      <small>Use sample low-walking activities only</small>
                    </span>
                    <Footprints size={18} />
                  </label>
                  <button
                    className="primary plan-button"
                    disabled={!!busy || !connected}
                    type="submit"
                  >
                    {busy === "plan" ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <Route size={18} />
                    )}{" "}
                    {trip ? "Build a new plan" : "Plan my trip"}
                    <ArrowRight size={18} />
                  </button>
                  <div className="form-footnote">
                    Your main interest stays a priority.
                  </div>
                </form>
              </section>
              <section className="journey">
                <div className="journey-top">
                  <div>
                    <h2>
                      {recovery
                        ? "A new way forward"
                        : trip
                          ? "Your trip, mapped out"
                          : "Find your kind of Chitwan"}
                    </h2>
                    <p>
                      {trip
                        ? `${trip.preferences.date} · ${trip.preferences.days ?? 1} day(s) · ${trip.preferences.people} travellers · ${kindName[trip.preferences.focus]} first`
                        : "Explore the sample experiences, then build your trip."}
                    </p>
                  </div>
                  <span className="outline-badge">
                    {recovery
                      ? "PREVIEW"
                      : trip
                        ? `${trip.plan.stops.length} STOPS`
                        : `${activities.length} EXPERIENCES`}
                  </span>
                </div>
                {tripDays.length > 0 && (
                  <div className="trip-day-tabs" aria-label="Itinerary days">
                    {tripDays.map((day, index) => (
                      <button
                        key={day.day}
                        type="button"
                        aria-pressed={currentDay?.day === day.day}
                        onClick={() => {
                          setActiveDay(index);
                          setSelected(null);
                        }}
                      >
                        <strong>Day {day.day}</strong>
                        <span>{day.date}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mobile-switch">
                  <button
                    className={mobilePanel === "plan" ? "active" : ""}
                    onClick={() => setMobilePanel("plan")}
                  >
                    Itinerary
                  </button>
                  <button
                    className={mobilePanel === "map" ? "active" : ""}
                    onClick={() => setMobilePanel("map")}
                  >
                    Map
                  </button>
                </div>
                <div className={`map-area mobile-${mobilePanel}`}>
                  <MapView
                    activities={activities}
                    plan={dayPlan}
                    selected={selected}
                    onSelect={select}
                  />
                  {chosen && (
                    <div className="map-detail">
                      <div>
                        <span className="eyebrow">
                          {kindName[chosen.activity.kind]} · SAMPLE EXPERIENCE
                        </span>
                        <button
                          aria-label="Close experience details"
                          onClick={() => setSelected(null)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <h3>{chosen.activity.name}</h3>
                      <p>{chosen.activity.description}</p>
                      <a
                        href={chosen.activity.source}
                        target="_blank"
                        rel="noreferrer"
                        className="destination-source"
                      >
                        Destination information ↗
                      </a>
                      <div className="detail-meta">
                        <span>
                          <Clock size={14} />
                          {chosen.activity.duration} min
                        </span>
                        <span>
                          NPR {money(chosen.activity.pricePerPerson)}/person
                        </span>
                        <strong
                          className={chosen.available ? "available" : "closed"}
                        >
                          {chosen.available
                            ? "Sample: available"
                            : "Sample: unavailable"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`itinerary-content mobile-${mobilePanel}`}>
                  {trip && trip.affectedIds.length > 0 && !recovery && (
                    <div className="disruption">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>Your plan needs a small change</strong>
                        <p>
                          {trip.affectedIds.length} planned{" "}
                          {trip.affectedIds.length === 1
                            ? "activity is"
                            : "activities are"}{" "}
                          unavailable in the demo.
                        </p>
                      </div>
                      <button onClick={recover} disabled={!!busy}>
                        {busy === "recover"
                          ? "Checking…"
                          : "Find an alternative"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  {recovery && (
                    <div className="recovery-banner">
                      <RefreshCw size={21} />
                      <div>
                        <strong>Your main interest, preserved.</strong>
                        <p>
                          {recovery.retainedActivities} activities retained ·{" "}
                          {recovery.changedActivities} replaced. Review before
                          saving.
                        </p>
                      </div>
                      <button
                        className="quiet-button"
                        onClick={() => setRecovery(null)}
                      >
                        Keep original
                      </button>
                      <button
                        className="primary"
                        disabled={!!busy}
                        onClick={accept}
                      >
                        {busy === "accept" ? "Saving…" : "Use this plan"}
                        <Check size={16} />
                      </button>
                    </div>
                  )}
                  {displayPlan && trip ? (
                    <>
                      <div className="trip-metrics">
                        <div>
                          <Wallet size={18} />
                          <span>
                            Trip total
                            <strong>NPR {money(displayPlan.totalCost)}</strong>
                          </span>
                        </div>
                        <div>
                          <Clock size={18} />
                          <span>
                            Planned across all days
                            <strong>
                              {Math.floor(displayPlan.totalMinutes / 60)}h{" "}
                              {displayPlan.totalMinutes % 60}m
                            </strong>
                          </span>
                        </div>
                        <div>
                          <CheckCircle2 size={18} />
                          <span>
                            Budget remaining
                            <strong>
                              NPR{" "}
                              {money(
                                trip.preferences.budget - displayPlan.totalCost,
                              )}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="itinerary-heading">
                        <h3>
                          {`${recovery ? "Proposed itinerary" : "Your itinerary"} · Day ${currentDay?.day ?? 1}`}
                        </h3>
                        <button onClick={save} disabled={!!recovery}>
                          <Download size={15} />
                          Save a text copy
                        </button>
                      </div>
                      <div className="timeline">
                        {dayPlan?.stops.map((s, i) => (
                          <React.Fragment key={s.activity.id}>
                            <button
                              className={`stop ${selected === s.activity.id ? "selected" : ""} ${trip.affectedIds.includes(s.activity.id) ? "affected" : ""}`}
                              key={s.activity.id}
                              onClick={() => setSelected(s.activity.id)}
                            >
                              <div className="stop-time">
                                {time(s.arrival)}
                                <span>{time(s.departure)}</span>
                              </div>
                              <div className="stop-number">{i + 1}</div>
                              <div className="stop-info">
                                <span className="stop-tag">
                                  {kindName[s.activity.kind]}
                                  {s.activity.kind === trip.preferences.focus
                                    ? " · YOUR FOCUS"
                                    : ""}
                                </span>
                                <h4>{s.activity.name}</h4>
                                <p>{s.activity.area}</p>
                                <span className="stop-duration">
                                  {s.activity.duration} min experience · ~
                                  {s.travelMinutes} min transfer
                                </span>
                              </div>
                              <div className="stop-price">
                                NPR {money(s.activityCost)}
                                <span>for your group</span>
                                <ArrowUpRight size={18} />
                              </div>
                            </button>
                            <PlacePreview activity={s.activity} />
                          </React.Fragment>
                        ))}
                        <div className="return-stop">
                          <span>
                            {time(
                              dayPlan?.returnMinute ?? displayPlan.returnMinute,
                            )}
                          </span>
                          <MapPin size={15} />
                          Back at the sample Bharatpur base
                        </div>
                      </div>
                      <div className="cost-footer">
                        <span>
                          Day activities{" "}
                          <strong>
                            NPR {money(dayPlan?.activityCost ?? 0)}
                          </strong>
                        </span>
                        <span>
                          Day transport{" "}
                          <strong>
                            NPR {money(dayPlan?.transportCost ?? 0)}
                          </strong>
                        </span>
                      </div>
                      {dirty && (
                        <p className="draft-note">
                          Preferences have changed. Select “Build a new plan” to
                          apply them.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="empty-itinerary">
                      <span className="empty-icon">
                        <Bird size={26} />
                      </span>
                      <div>
                        <h3>Follow your curiosity.</h3>
                        <p>
                          Choose your interests and budget. We’ll search for a
                          day that fits both.
                        </p>
                      </div>
                      <span className="empty-arrow">
                        <ArrowUpRight size={24} />
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : view === "help" ? (
          <HelpSection />
        ) : view === "operator" ? (
          <section className="secondary-page">
            <div className="eyebrow">CONNECTED DEMONSTRATION</div>
            <h1>When things change.</h1>
            <p className="page-intro">
              Change an activity’s sample availability. Any saved itinerary
              using it will show a disruption, without being silently replaced.
            </p>
            <div className="operator-note">
              <Info size={18} />
              Local demo controls only. No real operator is connected and no
              reservation is created.
            </div>
            <ReportInbox />
            <div className="operator-grid">
              {activities.map(({ activity: a, available, updatedAt }) => (
                <article className="operator-card" key={a.id}>
                  <span className="stop-tag">{kindName[a.kind]}</span>
                  <h3>{a.name}</h3>
                  <p>
                    <MapPin size={14} />
                    {a.area}
                  </p>
                  <div className="operator-details">
                    <span>{a.duration} minutes</span>
                    <span>NPR {money(a.pricePerPerson)}/person</span>
                  </div>
                  <div className="operator-card-bottom">
                    <span className={available ? "available" : "closed"}>
                      {available ? "Available in demo" : "Unavailable in demo"}
                    </span>
                    <button
                      className={
                        available ? "status-button" : "status-button restore"
                      }
                      disabled={!!busy}
                      onClick={() => toggle(a.id, !available)}
                    >
                      {busy === a.id
                        ? "Updating…"
                        : available
                          ? "Mark unavailable"
                          : "Restore availability"}
                    </button>
                  </div>
                  <small>
                    {updatedAt === "Sample catalogue"
                      ? "Initial sample state"
                      : `Updated ${new Date(updatedAt).toLocaleTimeString()}`}
                  </small>
                </article>
              ))}
            </div>
            <button className="primary" onClick={() => setView("plan")}>
              Back to my trip
              <ArrowRight size={17} />
            </button>
          </section>
        ) : (
          <section className="secondary-page about-page">
            <div className="eyebrow">THE FIRST WORKING SLICE</div>
            <h1>Useful. Honest. In progress.</h1>
            <p className="page-intro">
              Pulse is a trip-planning prototype for Bharatpur. This version
              demonstrates constraints, a map and itinerary recovery using a
              small sample catalogue.
            </p>
            <div className="about-grid">
              <article>
                <ShieldCheck />
                <h3>What works today</h3>
                <p>
                  Budget and time checks, main-interest matching, optional
                  culture, sample low-walking filters, persistent saved trips
                  and operator availability updates.
                </p>
              </article>
              <article>
                <Route />
                <h3>How the planner works</h3>
                <p>
                  Plans one to five days, with up to three activities per day.
                  Checks opening windows and return time. Recovery gives
                  preference to activities already in your plan.
                </p>
              </article>
              <article>
                <Info />
                <h3>What is sample data</h3>
                <p>
                  All experience offerings, prices, opening hours, accessibility
                  and availability. Map positions are approximate. Dashed lines
                  show order, not road directions.
                </p>
              </article>
              <article>
                <BookOpen />
                <h3>What comes next</h3>
                <p>
                  Field-checked experiences, road routing, sourced weather,
                  provider authentication and confirmation, photo explanations
                  and verified help contacts.
                </p>
              </article>
            </div>
            <p className="source-note">
              Regional reference:{" "}
              <a
                href="https://ntb.gov.np/bharatpur"
                target="_blank"
                rel="noreferrer"
              >
                Nepal Tourism Board — Bharatpur <ArrowUpRight size={14} />
              </a>
              . This reference does not verify our sample activities or prices.
            </p>
            <button className="primary" onClick={() => setView("plan")}>
              Explore the prototype
              <ArrowRight size={17} />
            </button>
          </section>
        )}
        <footer className="footer">
          <span>
            <PulseIcon size={15} />A more thoughtful way to explore.
          </span>
          <span>Bharatpur Pulse · Prototype 0.1</span>
        </footer>
      </main>
      <dialog
        ref={modalRef}
        className="modal"
        aria-labelledby="modal-title"
        onCancel={() => setShowInfo(false)}
      >
        <button
          autoFocus
          className="modal-close"
          aria-label="Close explanation"
          onClick={() => setShowInfo(false)}
        >
          <X size={20} />
        </button>
        <span className="icon-box">
          <Compass size={24} />
        </span>
        <h2 id="modal-title">A plan with room to change.</h2>
        <p>
          Set a main interest, a whole-group budget and a time limit. Pulse
          searches the sample catalogue for a feasible day, including estimated
          transport back to the base.
        </p>
        <ol>
          <li>Build a day in the trip workspace.</li>
          <li>Open Operator demo and make a planned activity unavailable.</li>
          <li>
            Return here, preview an alternative, and choose whether to save it.
          </li>
        </ol>
        <p className="modal-note">
          The planner checks constraints deterministically. Ask Pulse uses
          Gemini when configured. No live weather, actual booking, photo
          recognition or emergency dispatch is connected.
        </p>
        <button className="primary" onClick={() => setShowInfo(false)}>
          Let’s explore
          <ArrowRight size={17} />
        </button>
      </dialog>
      <AskPulse trip={trip} />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
