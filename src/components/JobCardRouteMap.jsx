import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [-3.3869, 36.683];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const makeWaypointIcon = (index) =>
  L.divIcon({
    className: "job-route-waypoint-icon",
    html: `<span>${index + 1}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

function MapClickHandler({ enabled, onMapClick }) {
  useMapEvents({
    click(event) {
      if (enabled) onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function FitRouteBounds({ points }) {
  const map = useMap();
  const pointsKey = JSON.stringify(points);

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(
        points.map(({ lat, lng }) => [lat, lng]),
        { padding: [32, 32] },
      );
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 9));
    }
  }, [map, pointsKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

export default function JobCardRouteMap({
  routePoints = [],
  routeDistanceKm = null,
  onRouteChange,
  readOnly = false,
}) {
  const points = useMemo(
    () =>
      (Array.isArray(routePoints) ? routePoints : [])
        .filter(
          (point) =>
            Number.isFinite(Number(point?.lat)) &&
            Number.isFinite(Number(point?.lng)),
        )
        .map((point) => ({
          lat: Number(point.lat),
          lng: Number(point.lng),
          label: String(point.label || "Route stop"),
        })),
    [routePoints],
  );
  const pointsKey = JSON.stringify(points);
  const onRouteChangeRef = useRef(onRouteChange);
  const [roadGeometry, setRoadGeometry] = useState([]);
  const [distanceKm, setDistanceKm] = useState(
    routeDistanceKm == null ? null : Number(routeDistanceKm),
  );
  const [routeStatus, setRouteStatus] = useState("");
  const [isRouting, setIsRouting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
  }, [onRouteChange]);

  useEffect(() => {
    let active = true;

    if (points.length < 2) {
      setRoadGeometry(points.map(({ lat, lng }) => [lat, lng]));
      setDistanceKm(null);
      setRouteStatus(
        points.length
          ? "Add another stop to estimate road distance."
          : "Click the map or search for a place to add route stops.",
      );
      onRouteChangeRef.current?.(points, null);
      return () => {
        active = false;
      };
    }

    const loadRoute = async () => {
      setIsRouting(true);
      setRouteStatus("Calculating road route…");
      const coordinates = points
        .map(({ lng, lat }) => `${lng},${lat}`)
        .join(";");
      try {
        const response = await fetch(
          `${OSRM_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`,
        );
        const payload = await response.json();
        if (!response.ok || payload.code !== "Ok" || !payload.routes?.[0]) {
          throw new Error("Road route is unavailable for these stops.");
        }
        if (!active) return;
        const route = payload.routes[0];
        const km = Math.round((Number(route.distance) / 1000) * 10) / 10;
        const geometry = route.geometry.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        setRoadGeometry(geometry);
        setDistanceKm(km);
        setRouteStatus("Road distance estimate from OpenStreetMap routing.");
        onRouteChangeRef.current?.(points, km);
      } catch (error) {
        if (!active) return;
        setRoadGeometry(points.map(({ lat, lng }) => [lat, lng]));
        setDistanceKm(null);
        setRouteStatus(
          error.message ||
            "Unable to calculate road distance. Try again shortly.",
        );
        onRouteChangeRef.current?.(points, null);
      } finally {
        if (active) setIsRouting(false);
      }
    };

    loadRoute();
    return () => {
      active = false;
    };
  }, [pointsKey]);

  const addWaypoint = (lat, lng, label) => {
    if (readOnly) return;
    const next = [
      ...points,
      {
        lat: Number(lat),
        lng: Number(lng),
        label: label || `Stop ${points.length + 1}`,
      },
    ];
    onRouteChangeRef.current?.(next, distanceKm);
  };

  const searchPlaces = async (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "5");
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error("Place search is temporarily unavailable.");
      const results = await response.json();
      setSearchResults(results);
      if (results.length === 0)
        setSearchError("No places found. Try a more specific search.");
    } catch (error) {
      setSearchError(error.message || "Unable to search for that place.");
    } finally {
      setIsSearching(false);
    }
  };

  const clearRoute = () => onRouteChangeRef.current?.([], null);
  const undoWaypoint = () =>
    onRouteChangeRef.current?.(points.slice(0, -1), null);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Route map & estimated KM{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {readOnly
              ? "Saved route"
              : "Click the map to add stops, or search for a place."}
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wide text-amber-900">
            Estimated road distance
          </div>
          <div className="text-lg font-bold leading-tight text-amber-950">
            {distanceKm != null && Number.isFinite(distanceKm)
              ? `${distanceKm.toLocaleString()} km`
              : "—"}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="space-y-3 border-b border-slate-700 px-4 py-3">
          <form onSubmit={searchPlaces} className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a town, park or address"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500/60"
            />
            <button
              type="submit"
              disabled={isSearching || !search.trim()}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="job-route-search-results max-h-36 overflow-y-auto rounded-lg border border-slate-300">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={result.place_id}
                  onClick={() => {
                    addWaypoint(
                      result.lat,
                      result.lon,
                      result.display_name.split(",").slice(0, 2).join(","),
                    );
                    setSearchResults([]);
                    setSearch("");
                  }}
                  className="job-route-search-result block w-full border-b border-slate-200 px-3 py-2 text-left text-xs last:border-0"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
          {searchError && (
            <p className="text-xs text-rose-300">{searchError}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Stops: {points.length} · drag map markers to adjust their
              position.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={undoWaypoint}
                disabled={points.length === 0}
                className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 disabled:opacity-40"
              >
                Undo stop
              </button>
              <button
                type="button"
                onClick={clearRoute}
                disabled={points.length === 0}
                className="rounded-md border border-rose-400/40 px-2.5 py-1.5 text-xs text-rose-300 disabled:opacity-40"
              >
                Clear route
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[320px] w-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={6}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            enabled={!readOnly}
            onMapClick={(lat, lng) => addWaypoint(lat, lng)}
          />
          <FitRouteBounds points={points} />
          {roadGeometry.length > 1 && (
            <Polyline
              positions={roadGeometry}
              pathOptions={{ color: "#f59e0b", weight: 5, opacity: 0.9 }}
            />
          )}
          {points.map((point, index) => (
            <Marker
              key={`${index}-${point.lat}-${point.lng}`}
              position={[point.lat, point.lng]}
              icon={makeWaypointIcon(index)}
              draggable={!readOnly}
              eventHandlers={
                readOnly
                  ? undefined
                  : {
                      dragend(event) {
                        const { lat, lng } = event.target.getLatLng();
                        const next = points.map((item, pointIndex) =>
                          pointIndex === index ? { ...item, lat, lng } : item,
                        );
                        onRouteChangeRef.current?.(next, null);
                      },
                    }
              }
            />
          ))}
        </MapContainer>
      </div>
      <p className="px-4 py-2 text-xs text-slate-400">
        {isRouting ? "Calculating route… " : ""}
        {routeStatus} Route results depend on OpenStreetMap road coverage and
        may not match actual driving conditions.
      </p>
    </section>
  );
}
