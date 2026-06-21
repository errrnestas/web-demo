import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Car,
  RefreshCw,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  Search,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CarListing {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  year: number;
  mileage: string;
  fuel?: string;
  transmission?: string;
  imageUrl?: string;
  url: string;
  source: string;
}

interface ScrapeError {
  source: string;
  error: string;
  searchUrl: string;
}

interface ScanResult {
  listings: CarListing[];
  errors: ScrapeError[];
  scannedAt: string;
  counts: Record<string, number>;
  searchLinks: Record<string, string>;
  cached: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  "autoplius.lt": "bg-blue-100 text-blue-800",
  "autogidas.lt": "bg-green-100 text-green-800",
  "skelbiu.lt": "bg-orange-100 text-orange-800",
};

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {source}
    </span>
  );
}

function CarCard({ car }: { car: CarListing }) {
  return (
    <a
      href={car.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 bg-white"
    >
      {car.imageUrl && (
        <div className="h-44 overflow-hidden bg-gray-100">
          <img
            src={car.imageUrl}
            alt={car.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-gray-900 group-hover:text-blue-700 transition-colors">
            {car.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 mt-0.5" />
        </div>
        <div className="text-xl font-bold text-green-700">{car.price}</div>
        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
          {car.year > 0 && (
            <span className="bg-gray-100 rounded-md px-2 py-0.5">📅 {car.year}</span>
          )}
          {car.mileage && car.mileage !== "-" && (
            <span className="bg-gray-100 rounded-md px-2 py-0.5">🛣 {car.mileage}</span>
          )}
          {car.fuel && (
            <span className="bg-gray-100 rounded-md px-2 py-0.5">⛽ {car.fuel}</span>
          )}
          {car.transmission && (
            <span className="bg-gray-100 rounded-md px-2 py-0.5">⚙️ {car.transmission}</span>
          )}
        </div>
        <SourceBadge source={car.source} />
      </div>
    </a>
  );
}

function DirectSearchCard({ source, url }: { source: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 border rounded-xl bg-white hover:bg-blue-50 hover:border-blue-300 transition-all group"
    >
      <div>
        <p className="font-semibold text-gray-800 group-hover:text-blue-700">{source}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Combi / Mikroautobusas · 2009–2019 · Rikiuota pagal kainą
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
          Atidaryti →
        </span>
        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
      </div>
    </a>
  );
}

export default function CarScanner() {
  const [triggered, setTriggered] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxYear, setMaxYear] = useState("2019");
  const [minYear, setMinYear] = useState("2009");
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSource, setActiveSource] = useState("Visi");

  const { data, isFetching, isError, error, refetch } = useQuery<ScanResult>({
    queryKey: ["cars-scan", refreshKey],
    queryFn: async () => {
      const res = await fetch(`/api/cars/scan${refreshKey > 0 ? "?force=true" : ""}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: triggered,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const handleScan = useCallback(() => {
    if (!triggered) {
      setTriggered(true);
    } else {
      setRefreshKey((k) => k + 1);
      refetch();
    }
  }, [triggered, refetch]);

  const filtered = (data?.listings ?? []).filter((c) => {
    if (activeSource !== "Visi" && c.source !== activeSource) return false;
    if (filterText) {
      const q = filterText.toLowerCase();
      if (!c.title.toLowerCase().includes(q)) return false;
    }
    if (maxPrice && c.priceNum > 0 && c.priceNum > parseInt(maxPrice)) return false;
    if (minYear && c.year > 0 && c.year < parseInt(minYear)) return false;
    if (maxYear && c.year > 0 && c.year > parseInt(maxYear)) return false;
    return true;
  });

  const copyReport = async () => {
    try {
      const res = await fetch(`/api/cars/report?maxPrice=${maxPrice}&minYear=${minYear}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const openEmailClient = async () => {
    const res = await fetch(`/api/cars/report?maxPrice=${maxPrice}&minYear=${minYear}`);
    const text = await res.text();
    const subject = encodeURIComponent("Automobilių paieška: Combi / Mikroautobusas 2009–2019");
    const body = encodeURIComponent(text.substring(0, 1800)); // mailto body limit
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const allErrors = data?.errors ?? [];
  const hasListings = filtered.length > 0;
  const allBlocked = triggered && !isFetching && data && data.listings.length === 0 && allErrors.length > 0;
  const sources = ["Visi", ...Object.keys(data?.counts ?? {}).filter((k) => (data?.counts[k] ?? 0) > 0)];

  return (
    <>
      <Helmet>
        <title>Automobilių Skeneris — Combi & Mikroautobusai 2009–2019</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero header */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-2">
              <Car className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Automobilių Skeneris</h1>
            </div>
            <p className="text-blue-200 text-sm mt-1">
              Ieško{" "}
              <strong className="text-white">Combi / Keleivinio mikroautobuso</strong>{" "}
              visuose lietuviškuose portaluose ·{" "}
              <strong className="text-white">2009–2019 m.</strong> ·{" "}
              <strong className="text-white">Vidus 3m+</strong>
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
          {/* Controls card */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  onClick={handleScan}
                  disabled={isFetching}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6"
                  size="lg"
                >
                  {isFetching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Skenuojama…</>
                  ) : (
                    <><Search className="w-4 h-4" />{triggered ? "Atnaujinti" : "Pradėti skenavimą"}</>
                  )}
                </Button>

                {data && (
                  <>
                    <Button variant="outline" onClick={copyReport} className="gap-2">
                      {copied
                        ? <><Check className="w-4 h-4 text-green-600" />Nukopijuota!</>
                        : <><Copy className="w-4 h-4" />Kopijuoti ataskaitą</>}
                    </Button>
                    <Button variant="outline" onClick={openEmailClient} className="gap-2">
                      <Mail className="w-4 h-4" />
                      Siųsti el. paštu
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((s) => !s)}
                  className="ml-auto gap-1.5 text-gray-600"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtrai
                  {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Ieškoti tekste</label>
                    <Input placeholder="pvz. VW, Ford, Sprinter…" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Maks. kaina (€)</label>
                    <Input type="number" placeholder="pvz. 12000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Metai nuo</label>
                    <Input type="number" placeholder="2009" value={minYear} onChange={(e) => setMinYear(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Metai iki</label>
                    <Input type="number" placeholder="2019" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API error */}
          {isError && (
            <div className="flex gap-2 items-start p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Serverio klaida: {(error as Error)?.message}</span>
            </div>
          )}

          {/* Cloudflare warning + direct links */}
          {allErrors.length > 0 && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">
                    {allBlocked
                      ? "Portalai apsaugoti nuo automatinio skenavimo (Cloudflare)"
                      : "Kai kurie portalai nepasiekiami"}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    autoplius.lt, autogidas.lt ir skelbiu.lt naudoja anti-bot apsaugą.
                    Naudokite tiesiogines nuorodas žemiau – filtrai jau sukonfigūruoti.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {allErrors.map((e) => (
                  <DirectSearchCard key={e.source} source={e.source} url={e.searchUrl} />
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {data && data.listings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.counts)
                .filter(([, v]) => v > 0)
                .map(([src, count]) => (
                  <Card key={src} className="text-center shadow-sm">
                    <CardHeader className="pb-1 pt-4">
                      <CardTitle className="text-2xl font-bold text-blue-600">{count}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0">
                      <p className="text-xs text-gray-500">{src}</p>
                    </CardContent>
                  </Card>
                ))}
              {filtered.length !== data.listings.length && (
                <Card className="text-center bg-blue-50 border-blue-200 shadow-sm">
                  <CardHeader className="pb-1 pt-4">
                    <CardTitle className="text-2xl font-bold text-blue-700">{filtered.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <p className="text-xs text-blue-600">Rodoma (filtruota)</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Source tabs */}
          {sources.length > 2 && (
            <div className="flex gap-2 flex-wrap">
              {sources.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSource(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeSource === s
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border hover:bg-gray-50"
                  }`}
                >
                  {s}
                  {s !== "Visi" && data?.counts[s] !== undefined && (
                    <span className="ml-1.5 opacity-75">({data.counts[s]})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {isFetching && (
            <div className="text-center py-24 space-y-3">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
              <p className="text-gray-600 font-medium">Skenuojami portalai… ~30 sek.</p>
              <p className="text-xs text-gray-400">autoplius.lt · autogidas.lt · skelbiu.lt</p>
            </div>
          )}

          {/* Empty state */}
          {!isFetching && !triggered && (
            <div className="text-center py-28 space-y-3">
              <Car className="w-16 h-16 text-gray-200 mx-auto" />
              <p className="text-gray-500 font-medium text-lg">Paspauskite „Pradėti skenavimą"</p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Bus tikrinami visi lietuviški automobilių portalai ir ieškoma Combi / Mikroautobusų 2009–2019
              </p>
            </div>
          )}

          {!isFetching && triggered && !hasListings && !allBlocked && data && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nieko nerasta pagal filtrus. Pabandykite išplėsti paieškos kriterijus.</p>
            </div>
          )}

          {/* Results grid */}
          {hasListings && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 text-lg">
                  Rasta:{" "}
                  <span className="text-blue-600">{filtered.length}</span> skelbimų
                </h2>
                {data?.scannedAt && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    {new Date(data.scannedAt).toLocaleTimeString("lt-LT")}
                    {data.cached && " (talpykla)"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
