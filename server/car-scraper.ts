import * as cheerio from "cheerio";

export interface CarListing {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  year: number;
  mileage: string;
  fuel?: string;
  transmission?: string;
  location?: string;
  imageUrl?: string;
  url: string;
  source: string;
}

export interface ScrapeResult {
  listings: CarListing[];
  errors: { source: string; error: string; searchUrl: string }[];
  scannedAt: string;
  counts: Record<string, number>;
  searchLinks: Record<string, string>;
}

// Pre-configured search URLs for each portal
export const SEARCH_URLS: Record<string, string> = {
  "autoplius.lt":
    "https://autoplius.lt/skelbimai/naudoti-automobiliai?make_date_from=2009&make_date_to=2019&body_type%5B%5D=3&body_type%5B%5D=5&order_by=1&order_direction=DESC",
  "autogidas.lt":
    "https://www.autogidas.lt/skelbimai/automobiliai/?make_date%5Bfrom%5D=2009&make_date%5Bto%5D=2019&body%5B%5D=5&body%5B%5D=9",
  "skelbiu.lt":
    "https://www.skelbiu.lt/skelbimai/?category_id=49&body_type_id=5&body_type_id=6&year_min=2009&year_max=2019&orderby=1",
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "lt-LT,lt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  DNT: "1",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  if (res.status === 403 || res.status === 503) {
    throw new Error("Cloudflare anti-bot apsauga blokuoja serverio prieigą");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.includes("Luktelėkite") || text.includes("Just a moment") || text.includes("cf-browser-verification")) {
    throw new Error("Cloudflare apsauga – reikalinga naršyklės sesija");
  }
  return text;
}

function parsePrice(text: string): number {
  const num = text.replace(/[^\d]/g, "");
  return num ? parseInt(num) : 0;
}

function parseYear(text: string): number {
  const m = text.match(/\b(200[9]|201[0-9])\b/);
  return m ? parseInt(m[1]) : 0;
}

async function scrapeAutoplius(maxPages = 3): Promise<CarListing[]> {
  const listings: CarListing[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = SEARCH_URLS["autoplius.lt"] + `&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const items = $("li.announcement-item, article.announcement-item");
    if (items.length === 0) break;

    items.each((i, el) => {
      const $el = $(el);
      const linkEl = $el.find("a.announcement-item-heading, h3 a, .title a").first();
      const title = linkEl.text().trim();
      const href = linkEl.attr("href") || "";
      if (!title) return;

      const priceText = $el.find(".announcement-pricing-total, .price-total, .announcement-price").first().text().trim();
      const params: string[] = [];
      $el.find(".announcement-labels li, .label-list li").each((_, li) => { params.push($(li).text().trim()); });

      let year = 0; let mileage = "-"; let fuel = ""; let transmission = "";
      for (const p of params) {
        if (!year && /^\d{4}$/.test(p)) year = parseInt(p);
        if (mileage === "-" && /\d+\s*(km|tūkst)/i.test(p)) mileage = p;
        if (!fuel && /benzin|dyzel|elektr|hybrid|dujų|lpg/i.test(p)) fuel = p;
        if (!transmission && /automat|mechani|robot/i.test(p)) transmission = p;
      }
      const imgUrl = $el.find("img").first().attr("src");

      listings.push({ id: `ap-${page}-${i}`, title, price: priceText || "Nenurodyta", priceNum: parsePrice(priceText), year, mileage, fuel, transmission, imageUrl: imgUrl, url: href.startsWith("http") ? href : `https://autoplius.lt${href}`, source: "autoplius.lt" });
    });
  }
  return listings;
}

async function scrapeAutogidas(maxPages = 3): Promise<CarListing[]> {
  const listings: CarListing[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = SEARCH_URLS["autogidas.lt"] + `&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const items = $("article.announcement-item, li.announcement-item, .list-item");
    if (items.length === 0) break;

    items.each((i, el) => {
      const $el = $(el);
      const linkEl = $el.find("h2 a, h3 a, .announcement-title a, a.item-title").first();
      const title = linkEl.text().trim();
      const href = linkEl.attr("href") || "";
      if (!title) return;

      const priceText = $el.find(".price, .price-value, .announcement-price").first().text().trim();
      const params: string[] = [];
      $el.find(".params li, .announcement-labels li, .label-list li").each((_, li) => { params.push($(li).text().trim()); });

      let year = 0; let mileage = "-"; let fuel = "";
      for (const p of params) {
        if (!year) year = parseYear(p);
        if (mileage === "-" && /\d+\s*km/i.test(p)) mileage = p;
        if (!fuel && /benzin|dyzel|elektr|hybrid/i.test(p)) fuel = p;
      }

      listings.push({ id: `ag-${page}-${i}`, title, price: priceText || "Nenurodyta", priceNum: parsePrice(priceText), year, mileage, fuel, imageUrl: $el.find("img").first().attr("src"), url: href.startsWith("http") ? href : `https://www.autogidas.lt${href}`, source: "autogidas.lt" });
    });
  }
  return listings;
}

async function scrapeSkelbiu(maxPages = 3): Promise<CarListing[]> {
  const listings: CarListing[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = SEARCH_URLS["skelbiu.lt"] + `&page=${page}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const items = $("li.standard-list-item, .item-row, article.item, .items-list li");
    if (items.length === 0) break;

    items.each((i, el) => {
      const $el = $(el);
      const linkEl = $el.find("a.item-title, h3 a, .title a, a[href*='/skelbimai/']").first();
      const title = linkEl.text().trim() || linkEl.attr("title") || "";
      const href = linkEl.attr("href") || "";
      if (!title || !href) return;

      const priceText = $el.find(".price, .item-price").first().text().trim();
      const year = parseYear($el.find(".year, [class*='year']").first().text());

      listings.push({ id: `sk-${page}-${i}`, title, price: priceText || "Nenurodyta", priceNum: parsePrice(priceText), year, mileage: $el.find(".mileage, [class*='km']").first().text().trim() || "-", imageUrl: $el.find("img").first().attr("src"), url: href.startsWith("http") ? href : `https://www.skelbiu.lt${href}`, source: "skelbiu.lt" });
    });
  }
  return listings;
}

export async function scrapeAllPortals(): Promise<ScrapeResult> {
  const scrapers: [string, () => Promise<CarListing[]>][] = [
    ["autoplius.lt", scrapeAutoplius],
    ["autogidas.lt", scrapeAutogidas],
    ["skelbiu.lt", scrapeSkelbiu],
  ];

  const settled = await Promise.allSettled(scrapers.map(([, fn]) => fn()));

  const listings: CarListing[] = [];
  const errors: { source: string; error: string; searchUrl: string }[] = [];
  const counts: Record<string, number> = {};

  scrapers.forEach(([name], i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      counts[name] = result.value.length;
      listings.push(...result.value);
    } else {
      counts[name] = 0;
      errors.push({
        source: name,
        error: String(result.reason?.message ?? result.reason),
        searchUrl: SEARCH_URLS[name] ?? "",
      });
    }
  });

  // Sort by price asc
  listings.sort((a, b) => {
    if (a.priceNum === 0) return 1;
    if (b.priceNum === 0) return -1;
    return a.priceNum - b.priceNum;
  });

  return { listings, errors, scannedAt: new Date().toISOString(), counts, searchLinks: SEARCH_URLS };
}

export function formatEmailReport(result: ScrapeResult, filters: { maxPrice?: number; minYear?: number }): string {
  const filtered = result.listings.filter((c) => {
    if (filters.maxPrice && c.priceNum > 0 && c.priceNum > filters.maxPrice) return false;
    if (filters.minYear && c.year > 0 && c.year < filters.minYear) return false;
    return true;
  });

  const lines = [
    `AUTOMOBILIŲ PAIEŠKOS ATASKAITA`,
    `Skenuota: ${new Date(result.scannedAt).toLocaleString("lt-LT")}`,
    ``,
    `FILTRAI: Combi / Mikroautobusas | 2009–2019 | Vidus 3m+`,
    ``,
    `REZULTATAI PAGAL PORTALĄ:`,
    ...Object.entries(result.counts).map(([k, v]) => `  • ${k}: ${v} skelbimai`),
    result.errors.length > 0
      ? `\nKLAIDOS (Cloudflare apsauga):\n${result.errors.map((e) => `  • ${e.source}: ${e.error}\n    Nuoroda: ${e.searchUrl}`).join("\n")}`
      : "",
    ``,
    `TIESIOGINĖS PAIEŠKOS NUORODOS:`,
    ...Object.entries(result.searchLinks).map(([k, v]) => `  • ${k}:\n    ${v}`),
    ``,
    `─────────────────────────────────────────`,
    filtered.length > 0
      ? `TOP ${Math.min(filtered.length, 30)} SKELBIMAI (pigiausi pirmiau):\n\n${filtered.slice(0, 30).map((c, i) => `${i + 1}. ${c.title}\n   Kaina: ${c.price}  Metai: ${c.year || "?"}  Rida: ${c.mileage}\n   URL: ${c.url}\n   Šaltinis: ${c.source}\n`).join("\n")}`
      : "Skelbimai nerasti. Žiūrėkite nuorodas aukščiau.",
  ];

  return lines.join("\n");
}
