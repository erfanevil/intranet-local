"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Satellite,
  Search,
  Ruler,
  Shapes,
  MapPin,
  Undo2,
  Trash2,
  Maximize,
  Minimize,
  Crosshair,
  Copy,
  Check,
  Layers,
  X,
  Download,
  MousePointerClick,
  Loader2,
  MapPinned,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

type Tool = "none" | "area" | "distance" | "point";
interface Pt {
  lat: number;
  lng: number;
}

const LAHIJAN: [number, number] = [37.2073, 50.0038];
const EARTH_R = 6378137;

interface BaseLayerDef {
  id: string;
  label: string;
}

const BASE_LAYERS: BaseLayerDef[] = [
  { id: "ghybrid", label: "گوگل هیبرید" },
  { id: "gsat", label: "گوگل ماهواره‌ای" },
  { id: "esri", label: "Esri ماهواره‌ای" },
  { id: "osm", label: "نقشه خیابان" },
];

/* ---------- geo math ---------- */

function ringAreaSqm(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  const rad = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += (p2.lng - p1.lng) * rad * (2 + Math.sin(p1.lat * rad) + Math.sin(p2.lat * rad));
  }
  return Math.abs((area * EARTH_R * EARTH_R) / 2);
}

function pathLengthM(pts: Pt[]): number {
  if (pts.length < 2) return 0;
  const rad = Math.PI / 180;
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const lat1 = pts[i - 1].lat * rad;
    const lat2 = pts[i].lat * rad;
    const dLat = lat2 - lat1;
    const dLng = (pts[i].lng - pts[i - 1].lng) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    d += 2 * EARTH_R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return d;
}

function fmtArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} کیلومتر مربع`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} هکتار`;
  return `${m2.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} متر مربع`;
}

function fmtDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} کیلومتر`;
  return `${m.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} متر`;
}

function toDMS(value: number, isLat: boolean): string {
  const dir = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${d}°${String(m).padStart(2, "0")}′${s.toFixed(1)}″${dir}`;
}

function parseCoords(q: string): Pt | null {
  const dec = q.trim().match(/^(-?\d{1,2}(?:\.\d+)?)[\s,]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (dec) {
    const lat = Number(dec[1]);
    const lng = Number(dec[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  const dms = q.match(
    /(\d{1,2})°\s*(\d{1,2})[′']\s*(?:(\d{1,2}(?:\.\d+)?)[″"]\s*)?([NS])\s*[,\s]\s*(\d{1,3})°\s*(\d{1,2})[′']\s*(?:(\d{1,2}(?:\.\d+)?)[″"]\s*)?([EW])/i
  );
  if (dms) {
    const lat = (Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3] || 0) / 3600) * (dms[4].toUpperCase() === "S" ? -1 : 1);
    const lng = (Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7] || 0) / 3600) * (dms[8].toUpperCase() === "W" ? -1 : 1);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/* ---------- page ---------- */

export default function SatelliteMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shapeGroupRef = useRef<L.LayerGroup | null>(null);
  const vertexGroupRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.LayerGroup | null>(null);
  const locateLayerRef = useRef<L.LayerGroup | null>(null);
  const baseLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const toolRef = useRef<Tool>("none");
  const [tool, setToolState] = useState<Tool>("none");
  const [points, setPoints] = useState<Pt[]>([]);
  const [finished, setFinished] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState("ghybrid");
  const [layersOpen, setLayersOpen] = useState(false);
  const [clickedPoint, setClickedPoint] = useState<Pt | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [toast, setToast] = useState("");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);

  const latReadoutRef = useRef<HTMLSpanElement>(null);
  const lngReadoutRef = useRef<HTMLSpanElement>(null);
  const zoomReadoutRef = useRef<HTMLSpanElement>(null);

  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  /* ---------- init map ---------- */
  useEffect(() => {
    let disposed = false;

    (async () => {
      const LL = await import("leaflet");
      if (disposed || !mapElRef.current || mapRef.current) return;
      leafletRef.current = LL;

      const map = LL.map(mapElRef.current, {
        center: LAHIJAN,
        zoom: 14,
        maxZoom: 21,
        zoomControl: false,
        worldCopyJump: true,
        attributionControl: true,
      });
      mapRef.current = map;
      map.doubleClickZoom.disable();

      LL.control.zoom({ position: "bottomleft" }).addTo(map);
      LL.control.scale({ position: "bottomright", imperial: false }).addTo(map);

      const gSat = LL.tileLayer("https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        attribution: "© Google Maps",
      });
      const gHybrid = LL.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        attribution: "© Google Maps",
      });
      const esri = LL.layerGroup([
        LL.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 21, attribution: "© Esri, Maxar, Earthstar Geographics" }
        ),
        LL.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 21 }
        ),
      ]);
      const osm = LL.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      });

      const layerGroups: Record<string, L.Layer | L.LayerGroup> = {
        ghybrid: LL.layerGroup([gSat, gHybrid]),
        gsat: gSat,
        esri,
        osm,
      };
      (map as L.Map & { _baseGroups?: Record<string, L.Layer | L.LayerGroup> })._baseGroups = layerGroups;
      layerGroups.ghybrid.addTo(map);
      baseLayerGroupRef.current = LL.layerGroup().addTo(map);

      shapeGroupRef.current = LL.layerGroup().addTo(map);
      vertexGroupRef.current = LL.layerGroup().addTo(map);
      searchMarkerRef.current = LL.layerGroup().addTo(map);
      locateLayerRef.current = LL.layerGroup().addTo(map);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const t = toolRef.current;
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        if (t === "none") {
          setClickedPoint(p);
          return;
        }
        setClickedPoint(null);
        setFinished(false);
        setPoints((prev) => (t === "point" ? [p] : [...prev, p]));
      });

      map.on("dblclick", () => {
        const t = toolRef.current;
        if (t === "area" || t === "distance") {
          setFinished(true);
          setTool("none");
        }
      });

      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (latReadoutRef.current) latReadoutRef.current.textContent = e.latlng.lat.toFixed(6);
        if (lngReadoutRef.current) lngReadoutRef.current.textContent = e.latlng.lng.toFixed(6);
      });
      map.on("zoomend", () => {
        if (zoomReadoutRef.current) zoomReadoutRef.current.textContent = String(map.getZoom());
      });
      if (zoomReadoutRef.current) zoomReadoutRef.current.textContent = String(map.getZoom());

      setMapReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- base layer switching ---------- */
  const switchLayer = (id: string) => {
    const map = mapRef.current;
    if (!map) return;
    const groups = (map as L.Map & { _baseGroups?: Record<string, L.Layer | L.LayerGroup> })._baseGroups;
    if (!groups) return;
    Object.values(groups).forEach((g) => map.removeLayer(g));
    groups[id]?.addTo(map);
    setActiveLayer(id);
  };

  /* ---------- redraw shapes ---------- */
  useEffect(() => {
    const LL = leafletRef.current;
    const shapeGroup = shapeGroupRef.current;
    const vertexGroup = vertexGroupRef.current;
    if (!LL || !shapeGroup || !vertexGroup) return;

    shapeGroup.clearLayers();
    vertexGroup.clearLayers();

    const vertexIcon = (first: boolean) =>
      LL.divIcon({
        className: "",
        html: `<span class="map-vertex ${first ? "map-vertex-first" : ""}"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

    if (!points.length) return;
    const latLngs = points.map((p) => [p.lat, p.lng]) as [number, number][];

    if (tool === "area" || (finished && toolRef.current === "none" && points.length >= 3 && lastShapeRef.current === "area")) {
      LL.polygon(latLngs, { color: "#22c55e", weight: 2.5, fillColor: "#22c55e", fillOpacity: 0.18 }).addTo(shapeGroup);
      if (!finished) LL.polyline(latLngs, { color: "#22c55e", weight: 2, dashArray: "6 6" }).addTo(shapeGroup);
    } else if (tool === "distance" || (finished && lastShapeRef.current === "distance")) {
      LL.polyline(latLngs, { color: "#f59e0b", weight: 3, dashArray: finished ? undefined : "8 8" }).addTo(shapeGroup);
    } else if (tool === "point" || (points.length === 1 && lastShapeRef.current === "point")) {
      LL.circleMarker(latLngs[0], { radius: 8, color: "#fff", weight: 2.5, fillColor: "#ef4444", fillOpacity: 1 }).addTo(shapeGroup);
    }

    if (!finished) {
      points.forEach((p, i) => {
        LL.marker([p.lat, p.lng], { icon: vertexIcon(i === 0), interactive: false }).addTo(vertexGroup);
      });
    }
  }, [points, tool, finished]);

  // track which geometry the current points belong to (for when tool switches back to none)
  const lastShapeRef = useRef<"area" | "distance" | "point" | null>(null);
  useEffect(() => {
    if (tool !== "none") lastShapeRef.current = tool;
  }, [tool]);

  /* ---------- tool actions ---------- */
  const startTool = (t: "area" | "distance" | "point") => {
    setPoints([]);
    setFinished(false);
    setClickedPoint(null);
    lastShapeRef.current = t;
    if (tool === t) {
      setTool("none");
    } else {
      setTool(t);
      showToast(t === "area" ? "روی نقاط محیط منطقه کلیک کنید؛ دابل‌کلیک = پایان" : t === "distance" ? "نقاط مسیر را کلیک کنید؛ دابل‌کلیک = پایان" : "روی نقطه مورد نظر کلیک کنید");
    }
  };

  const undoPoint = () => setPoints((prev) => prev.slice(0, -1));

  const clearAll = () => {
    setPoints([]);
    setFinished(false);
    lastShapeRef.current = null;
    characterResetLayers();
  };

  const characterResetLayers = () => {
    shapeGroupRef.current?.clearLayers();
    vertexGroupRef.current?.clearLayers();
  };

  const finishDrawing = () => {
    if (points.length < 2) return;
    setFinished(true);
    setTool("none");
  };

  /* ---------- search ---------- */
  const jumpTo = (p: Pt, zoom = 16, label?: string) => {
    const map = mapRef.current;
    const LL = leafletRef.current;
    if (!map || !LL) return;
    map.flyTo([p.lat, p.lng], Math.min(zoom, 19), { duration: 1.2 });
    searchMarkerRef.current?.clearLayers();
    LL.marker([p.lat, p.lng], {
      icon: LL.divIcon({ className: "", html: '<span class="map-search-pin"></span>', iconSize: [26, 26], iconAnchor: [13, 26] }),
    })
      .addTo(searchMarkerRef.current!)
      .bindPopup(label || `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`)
      .openPopup();
    setSearchResults([]);
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    const coords = parseCoords(q);
    if (coords) {
      jumpTo(coords, 17, "مختصات جستجوشده");
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=fa&q=${encodeURIComponent(q)}`
      );
      const data: NominatimResult[] = await res.json();
      if (!data.length) {
        showToast("نتیجه‌ای یافت نشد. عبارت دقیق‌تری جستجو کنید.");
      } else {
        setSearchResults(data);
      }
    } catch {
      showToast("جستجوی مکان در دسترس نیست؛ از مختصات استفاده کنید.");
    } finally {
      setSearching(false);
    }
  };

  /* ---------- extras ---------- */
  const doCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      showToast("مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const map = mapRef.current;
        const LL = leafletRef.current;
        if (!map || !LL) return;
        const { latitude, longitude, accuracy } = pos.coords;
        locateLayerRef.current?.clearLayers();
        LL.circle([latitude, longitude], { radius: accuracy || 30, color: "#3b82f6", weight: 1.5, fillOpacity: 0.12 }).addTo(locateLayerRef.current!);
        LL.circleMarker([latitude, longitude], { radius: 8, color: "#fff", weight: 3, fillColor: "#3b82f6", fillOpacity: 1 }).addTo(locateLayerRef.current!);
        map.flyTo([latitude, longitude], 17, { duration: 1.2 });
      },
      () => {
        setLocating(false);
        showToast("دسترسی به موقعیت مکانی ممکن نشد");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const fn = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.invalidateSize(), 250);
    };
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const downloadGeoJSON = () => {
    if (!points.length) return;
    const shape = lastShapeRef.current;
    const geometry =
      shape === "area" && points.length >= 3
        ? { type: "Polygon", coordinates: [[...points, points[0]].map((p) => [p.lng, p.lat])] }
        : shape === "distance"
        ? { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) }
        : { type: "Point", coordinates: [points[0].lng, points[0].lat] };
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            tool: shape,
            area_m2: shape === "area" ? Math.round(ringAreaSqm(points)) : undefined,
            length_m: shape === "distance" ? Math.round(pathLengthM(points)) : undefined,
            created: new Date().toISOString(),
          },
          geometry,
        },
      ],
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `measurement-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---------- derived values ---------- */
  const area = lastShapeRef.current === "area" && points.length >= 3 ? ringAreaSqm(points) : 0;
  const perimeter = points.length >= 2 ? pathLengthM([...points, ...(lastShapeRef.current === "area" ? [points[0]] : [])]) : 0;
  const distance = lastShapeRef.current === "distance" && points.length >= 2 ? pathLengthM(points) : 0;
  const toolHint =
    tool === "area"
      ? "کلیک روی رئوس منطقه • دابل‌کلیک برای پایان"
      : tool === "distance"
      ? "کلیک روی نقاط مسیر • دابل‌کلیک برای پایان"
      : tool === "point"
      ? "برای ثبت مختصات کلیک کنید"
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/dashboard/tools"
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-sky-600 hover:border-sky-200 transition"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-lg">
          <Satellite className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">تصویر ماهواره‌ای</h1>
          <p className="text-xs text-slate-500">تصاویر ماهواره‌ای گوگل و Esri با ابزارهای متراژ، مختصات و موقعیت‌یاب</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <MousePointerClick className="w-4 h-4 text-sky-500" />
          کلیک روی نقشه = دریافت مختصات نقطه
        </div>
      </div>

      {/* Map shell */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden border border-slate-300 shadow-xl bg-slate-900 ${isFullscreen ? "" : "rounded-2xl"}`}
        style={{ height: isFullscreen ? "100%" : "calc(100vh - 230px)", minHeight: isFullscreen ? undefined : "480px" }}
      >
        <div ref={mapElRef} className="absolute inset-0 z-0" style={{ background: "#0b1120" }} />

        {/* Search box */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] w-[min(480px,92%)]">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 px-3 py-1.5">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="جستجوی مکان یا مختصات (مثلاً 37.2073, 50.0038)"
              className="flex-1 bg-transparent outline-none text-xs lg:text-sm text-slate-700 placeholder:text-slate-400 py-2"
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchResults([]); }} className="text-slate-300 hover:text-slate-500">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={runSearch}
              disabled={searching}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              جستجو
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.place_id}
                  onClick={() => jumpTo({ lat: Number(r.lat), lng: Number(r.lon) }, 17, r.display_name)}
                  className="w-full text-right px-4 py-2.5 hover:bg-sky-50 transition flex items-start gap-2 border-b border-slate-100 last:border-0"
                >
                  <MapPinned className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-5 text-slate-600">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tools sidebar (left) */}
        <div className="absolute top-3 left-3 z-[490] flex flex-col gap-2 max-lg:top-auto max-lg:bottom-24">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-1.5 flex flex-col gap-1">
            <ToolButton active={layersOpen} onClick={() => setLayersOpen((v) => !v)} title="لایه‌های نقشه">
              <Layers className="w-5 h-5" />
            </ToolButton>
            <div className="h-px bg-slate-200 mx-1" />
            <ToolButton active={tool === "area"} activeClass="bg-emerald-600 text-white" onClick={() => startTool("area")} title="محاسبه متراژ (مساحت)">
              <Shapes className="w-5 h-5" />
            </ToolButton>
            <ToolButton active={tool === "distance"} activeClass="bg-amber-500 text-white" onClick={() => startTool("distance")} title="اندازه‌گیری فاصله">
              <Ruler className="w-5 h-5" />
            </ToolButton>
            <ToolButton active={tool === "point"} activeClass="bg-red-500 text-white" onClick={() => startTool("point")} title="ثبت مختصات نقطه">
              <MapPin className="w-5 h-5" />
            </ToolButton>
            <div className="h-px bg-slate-200 mx-1" />
            <ToolButton onClick={undoPoint} title="حذف آخرین نقطه" disabled={!points.length || finished}>
              <Undo2 className="w-5 h-5" />
            </ToolButton>
            <ToolButton onClick={clearAll} title="پاک کردن ترسیمات" disabled={!points.length}>
              <Trash2 className="w-5 h-5" />
            </ToolButton>
            <div className="h-px bg-slate-200 mx-1" />
            <ToolButton onClick={locateMe} title="موقعیت من">
              {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
            </ToolButton>
            <ToolButton onClick={toggleFullscreen} title={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </ToolButton>
          </div>

          {layersOpen && (
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2 w-40">
              <p className="text-[10px] font-bold text-slate-500 px-2 pb-1.5">لایه پایه</p>
              {BASE_LAYERS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    switchLayer(l.id);
                    setLayersOpen(false);
                  }}
                  className={`w-full text-right text-[11px] px-3 py-2 rounded-xl transition font-medium ${
                    activeLayer === l.id ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hint bar */}
        {toolHint && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[490] bg-slate-900/85 backdrop-blur text-white text-[11px] font-medium px-4 py-2 rounded-full shadow-xl">
            {toolHint}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[490] bg-slate-900/90 backdrop-blur text-white text-[11px] px-4 py-2.5 rounded-xl shadow-xl max-w-[90%] text-center">
            {toast}
          </div>
        )}

        {/* Coordinates readout */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[490] bg-slate-900/85 backdrop-blur rounded-xl shadow-lg px-3 py-2 flex items-center gap-4 text-[10px] text-slate-300 font-mono whitespace-nowrap max-md:hidden" dir="ltr">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-400" />
            <span ref={latReadoutRef}>37.207300</span>, <span ref={lngReadoutRef}>50.003800</span>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            Zoom <span ref={zoomReadoutRef}>14</span>
          </span>
        </div>

        {/* Results panel */}
        {(points.length > 0 || clickedPoint) && (
          <div className="absolute bottom-3 right-3 z-[490] w-[min(320px,88%)] bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {clickedPoint && !points.length && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-500" /> مختصات نقطه
                  </p>
                  <button onClick={() => setClickedPoint(null)} className="text-slate-300 hover:text-slate-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-[11px] font-mono text-slate-600" dir="ltr">
                  <div className="flex items-center justify-between">
                    <span>Lat: {clickedPoint.lat.toFixed(6)}</span>
                  </div>
                  <div>Lng: {clickedPoint.lng.toFixed(6)}</div>
                  <div className="text-[10px] text-slate-400">
                    {toDMS(clickedPoint.lat, true)} {toDMS(clickedPoint.lng, false)}
                  </div>
                </div>
                <button
                  onClick={() => doCopy("clickp", `${clickedPoint.lat.toFixed(6)}, ${clickedPoint.lng.toFixed(6)}`)}
                  className="w-full py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  {copied === "clickp" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "clickp" ? "کپی شد" : "کپی مختصات"}
                </button>
              </div>
            )}

            {points.length > 0 && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    {lastShapeRef.current === "area" ? (
                      <>
                        <Shapes className="w-4 h-4 text-emerald-600" /> نتیجه متراژ
                      </>
                    ) : lastShapeRef.current === "distance" ? (
                      <>
                        <Ruler className="w-4 h-4 text-amber-500" /> نتیجه اندازه‌گیری
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 text-red-500" /> نقطه ثبت‌شده
                      </>
                    )}
                  </p>
                  <span className="text-[10px] bg-slate-100 text-slate-500 rounded-lg px-2 py-0.5">
                    {points.length.toLocaleString("fa-IR")} نقطه {finished ? "• نهایی" : ""}
                  </span>
                </div>

                {lastShapeRef.current === "area" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-emerald-600 font-medium mb-0.5">مساحت</p>
                      <p className="text-xs font-bold text-emerald-700">{area ? fmtArea(area) : "—"}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-slate-500 font-medium mb-0.5">محیط</p>
                      <p className="text-xs font-bold text-slate-700">{perimeter ? fmtDist(perimeter) : "—"}</p>
                    </div>
                    {area >= 10_000 && (
                      <div className="col-span-2 text-center text-[10px] text-slate-500 bg-slate-50 rounded-lg py-1">
                        معادل {area.toLocaleString("fa-IR", { maximumFractionDigits: 0 })} متر مربع
                      </div>
                    )}
                  </div>
                )}

                {lastShapeRef.current === "distance" && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-amber-600 font-medium mb-0.5">طول مسیر</p>
                    <p className="text-sm font-bold text-amber-700">{distance ? fmtDist(distance) : "—"}</p>
                  </div>
                )}

                {lastShapeRef.current === "point" && points[0] && (
                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1 text-[11px] font-mono text-slate-600" dir="ltr">
                    <div>Lat: {points[0].lat.toFixed(6)}</div>
                    <div>Lng: {points[0].lng.toFixed(6)}</div>
                    <div className="text-[10px] text-slate-400">
                      {toDMS(points[0].lat, true)} {toDMS(points[0].lng, false)}
                    </div>
                  </div>
                )}

                <div className="flex gap-1.5">
                  {!finished && points.length >= 2 && lastShapeRef.current !== "point" && (
                    <button onClick={finishDrawing} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition">
                      پایان
                    </button>
                  )}
                  {lastShapeRef.current === "point" && (
                    <button
                      onClick={() => doCopy("pt", `${points[0].lat.toFixed(6)}, ${points[0].lng.toFixed(6)}`)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition flex items-center justify-center gap-1"
                    >
                      {copied === "pt" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      کپی
                    </button>
                  )}
                  <button
                    onClick={downloadGeoJSON}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" /> GeoJSON
                  </button>
                  <button onClick={clearAll} className="py-2 px-3 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-bold hover:bg-red-50 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!mapReady && (
          <div className="absolute inset-0 z-[600] bg-slate-900 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-xs text-slate-300">در حال بارگذاری نقشه ماهواره‌ای...</p>
          </div>
        )}
      </div>

      {/* Feature chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Search, label: "جستجو با نام مکان یا مختصات اعشاری و درجه/دقیقه/ثانیه" },
          { icon: Shapes, label: "محاسبه متراژ (متر مربع، هکتار، کیلومتر مربع) و محیط" },
          { icon: Ruler, label: "اندازه‌گیری فاصله مسیرها و خروجی GeoJSON" },
          { icon: Layers, label: "لایه‌های گوگل هیبرید، ماهواره‌ای، Esri و نقشه خیابان" },
        ].map((f) => (
          <div key={f.label} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] leading-5 text-slate-600">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  title,
  disabled,
  activeClass = "bg-blue-600 text-white",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
        active ? activeClass : "text-slate-600 hover:bg-slate-100"
      } disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}
