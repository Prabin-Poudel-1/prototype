import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed, Layers, MapPin } from "lucide-react";
import type { ActivityView, Plan } from "./types";
import "leaflet/dist/leaflet.css";
const BASE: [number, number] = [27.6832, 84.4288];
export default function MapView({
  activities,
  plan,
  selected,
  onSelect,
}: {
  activities: ActivityView[];
  plan?: Plan;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null),
    position = useRef<L.CircleMarker | null>(null),
    watch = useRef<number | null>(null);
  const planRef = useRef(plan);
  planRef.current = plan;
  const [message, setMessage] = useState(""),
    [tracking, setTracking] = useState(false),
    [tilesError, setTilesError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const m = L.map(host.current, { zoomControl: false }).setView(BASE, 12);
    map.current = m;
    L.control.zoom({ position: "bottomright" }).addTo(m);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      },
    ).addTo(m);
    tiles.on("tileerror", () => setTilesError(true));
    tiles.on("load", () => setTilesError(false));
    layer.current = L.layerGroup().addTo(m);
    const observer = new ResizeObserver(() => {
      if (
        !host.current ||
        host.current.clientWidth === 0 ||
        host.current.clientHeight === 0
      )
        return;
      m.invalidateSize();
      const current = planRef.current;
      if (current)
        m.fitBounds(
          L.latLngBounds([
            BASE,
            ...current.stops.map(
              (s) => [s.activity.lat, s.activity.lng] as L.LatLngTuple,
            ),
          ]),
          { padding: [45, 65], maxZoom: 13 },
        );
    });
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!layer.current || !map.current) return;
    layer.current.clearLayers();
    const route = plan?.stops.map((s) => s.activity.id) || [];
    for (const { activity: a, available } of activities) {
      const index = route.indexOf(a.id);
      const icon = L.divIcon({
        className: "",
        html: `<div class="map-pin ${index >= 0 ? "in-plan" : ""} ${!available ? "unavailable" : ""} ${selected === a.id ? "selected" : ""}">${index >= 0 ? index + 1 : a.kind === "bird" ? "B" : a.kind === "culture" ? "C" : a.kind === "food" ? "F" : "N"}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const marker = L.marker([a.lat, a.lng], {
        icon,
        title: a.name,
        keyboard: true,
      }).addTo(layer.current);
      marker
        .getElement()
        ?.setAttribute(
          "aria-label",
          a.name +
            (available ? " — sample available" : " — sample unavailable"),
        );
      marker.bindTooltip(a.name, { direction: "top", offset: [0, -15] });
      marker.on("click", () => onSelect(a.id));
    }
    L.marker(BASE, {
      icon: L.divIcon({
        className: "",
        html: '<div class="base-pin">⌂</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      title: "Sample Bharatpur base",
    })
      .bindTooltip("Sample Bharatpur base")
      .addTo(layer.current);
    if (plan) {
      const points: L.LatLngTuple[] = [
        BASE,
        ...plan.stops.map(
          (s) => [s.activity.lat, s.activity.lng] as L.LatLngTuple,
        ),
        BASE,
      ];
      L.polyline(points, {
        color: "#24685f",
        weight: 3,
        dashArray: "6 8",
        opacity: 0.7,
      }).addTo(layer.current);
    }
  }, [activities, plan, selected, onSelect]);
  useEffect(() => {
    if (plan && map.current) {
      map.current.fitBounds(
        L.latLngBounds([
          BASE,
          ...plan.stops.map(
            (s) => [s.activity.lat, s.activity.lng] as L.LatLngTuple,
          ),
        ]),
        { padding: [75, 90], maxZoom: 13 },
      );
    }
  }, [plan]);
  function locate() {
    if (tracking) {
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      setTracking(false);
      setMessage("Location updates stopped.");
      return;
    }
    if (!navigator.geolocation) {
      setMessage("Location is not supported by this browser.");
      return;
    }
    setMessage("Waiting for location permission…");
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        setTracking(true);
        setMessage(
          `Location accuracy ±${Math.round(p.coords.accuracy)} m. Shared with nobody.`,
        );
        const latlng: L.LatLngTuple = [p.coords.latitude, p.coords.longitude];
        if (!position.current && map.current) {
          position.current = L.circleMarker(latlng, {
            radius: 8,
            color: "#fff",
            weight: 3,
            fillColor: "#347fea",
            fillOpacity: 1,
          }).addTo(map.current);
          map.current.setView(latlng, 13);
        } else position.current?.setLatLng(latlng);
      },
      (e) => {
        setMessage(
          e.code === 1
            ? "Location permission denied. You can still explore the map."
            : "Location is unavailable. You can still explore the map.",
        );
        setTracking(false);
        if (watch.current !== null)
          navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }
  return (
    <div className="map-shell">
      <div
        ref={host}
        className="map-canvas"
        aria-label="Interactive map of sample Bharatpur experiences"
      />
      <div className="map-label">
        <MapPin size={16} />
        <span>Bharatpur & surroundings</span>
        <span className="map-country">NEPAL</span>
      </div>
      <button className={`locate ${tracking ? "active" : ""}`} onClick={locate}>
        <LocateFixed size={17} />
        {tracking ? "Stop location" : "My location"}
      </button>
      <div className="map-legend">
        <Layers size={16} />
        <span>Sample experiences</span>
        <i /> <span>Dashed lines show stop order, not roads</span>
      </div>
      {(message || tilesError) && (
        <div className="map-message" role="status">
          {tilesError
            ? "Map tiles unavailable. The itinerary remains usable."
            : message}
        </div>
      )}
    </div>
  );
}
