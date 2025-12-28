const axios = require("axios");
const cheerio = require("cheerio");

class Anichin {
  constructor(baseUrl = "https://anichin.cafe") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (Node.js) AnichinScraper/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });
  }

  async _get(path) {
    const url = path && /^https?:\/\//.test(path) ? path : `${this.baseUrl}${path || ""}`;
    const res = await this.client.get(url);
    return res.data;
  }

  // --- 1. SWIPPER SLIDER ---
  async SwipperSlide() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const items = [];

    $("#slidertwo .swiper-slide.item").each((i, el) => {
      const slide = $(el);
      const backdrop = slide.find('.backdrop').attr('style') || '';
      const bg = backdrop.match(/url\(['"]?(.*?)['"]?\)/);
      const image = bg ? bg[1] : null;

      const titleEl = slide.find(".info h2 a");
      const title = titleEl.text().trim() || null;
      const url = titleEl.attr("href") || null;
      const watch = slide.find(".info a.watch").attr("href") || null;

      let desc = slide.find(".info .contenPlot").text().trim();
      if (!desc) desc = slide.find(".info .text").text().trim();
      if (!desc) desc = slide.find(".info > p").text().trim();
      if (desc) desc = desc.replace(/\s+/g, " ").trim();

      items.push({ title, url, watch, image, description: desc || null });
    });

    return items;
  }

  // --- 2. POPULAR ---
  async popular() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const list = [];

    $(".releases.hothome")
      .nextAll(".listupd")
      .first()
      .find("article.bs")
      .each((i, el) => {
        const a = $(el).find("a").first();
        const href = a.attr("href") || null;

        const title = a.find("h2").text().trim() || a.attr("title") || null;
        const image = a.find("img").attr("src") || null;

        const ep = a.find(".epx").text().trim() || null;
        const type = a.find(".typez").text().trim() || null;

        let status = a.find(".sb").text().trim();
        if (!status) status = a.find(".status").text().trim() || null;

        list.push({ title, href, image, ep, type, status });
      });

    return list;
  }

  // --- 3. LATEST ---
  async latest(page = 1) {
    const html = await this._get(page > 1 ? `/page/${page}/` : "/");
    const $ = cheerio.load(html);

    const items = [];
    $(".releases.latesthome")
      .nextAll(".listupd")
      .first()
      .find("article.bs")
      .each((i, el) => {
        const a = $(el).find("a").first();
        const href = a.attr("href") || null;
        const title = a.find("h2").text().trim() || a.attr("title") || null;

        const ep = a.find(".epx").text().trim() || null;
        const type = a.find(".typez").text().trim() || null;
        const status = a.find(".sb").text().trim() || null;

        const image = a.find("img").attr("src") || null;
        const desc = a.attr("title") || null;

        items.push({ title, href, image, ep, type, status, description: desc });
      });

    let next_page = null;
    let prev_page = null;

    $(".hpage a, .pagination a, .nav-links a").each((i, el) => {
      const t = $(el).text().toLowerCase();
      const h = $(el).attr("href");
      if (t.includes("next")) next_page = h;
      if (t.includes("prev")) prev_page = h;
    });

    return { page, items, pagination: { next_page, prev_page } };
  }

  // --- 4. ONGOING ---
  async ongoing(page = 1) {
    const html = await this._get(page > 1 ? `/ongoing/page/${page}/` : "/ongoing/");
    const $ = cheerio.load(html);

    const items = [];
    
    $(".listupd article.bs").each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") || null;
      
      const title = a.find("h2").text().trim() || a.attr("title") || null;

      const image = a.find("img").attr("src") || null;
      const type = a.find(".typez").text().trim() || null; // Contoh: Donghua
      
      const status = a.find(".epx").text().trim() || null; 
      const sub = a.find(".sb").text().trim() || null;

      items.push({ title, href, image, type, status, sub });
    });

    let next_page = null;
    let prev_page = null;

    $(".hpage a, .pagination a, .nav-links a").each((i, el) => {
      const t = $(el).text().toLowerCase();
      const h = $(el).attr("href");
      if (t.includes("next")) next_page = h;
      if (t.includes("prev")) prev_page = h;
    });

    return { page, items, pagination: { next_page, prev_page } };
  }

  // --- 5. ANIME LIST (FILTERS) ---
  async getAnimeList(filters = {}, page = 1) {
    let path = `/seri/`;
    if (page > 1) path = `/seri/page/${page}/`;

    const params = new URLSearchParams();

    // Checkboxes
    if (filters.genre && Array.isArray(filters.genre)) {
      filters.genre.forEach(val => params.append('genre[]', val));
    }
    if (filters.season && Array.isArray(filters.season)) {
      filters.season.forEach(val => params.append('season[]', val));
    }
    if (filters.studio && Array.isArray(filters.studio)) {
      filters.studio.forEach(val => params.append('studio[]', val));
    }
    
    // Radios & Order
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.sub) params.append('sub', filters.sub);
    if (filters.order) params.append('order', filters.order);

    // Letter Support (A-Z)
    if (filters.letter) params.append('letter', filters.letter);

    const url = params.toString() ? `${path}?${params.toString()}` : path;
    const html = await this._get(url);
    const $ = cheerio.load(html);

    const items = [];
    $(".listupd .bsx, .listupd article.bs").each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") || null;
      const title = a.find("h2").text().trim() || a.attr("title") || null;

      const image = a.find("img").attr("src") || null;
      const ep = a.find(".epx").text().trim() || null;
      const type = a.find(".typez").text().trim() || null;
      const status = a.find(".sb").text().trim() || a.find(".status").text().trim() || null;

      items.push({ title, href, image, ep, type, status });
    });

    let next_page = null;
    let prev_page = null;

    $(".hpage a, .pagination a, .nav-links a").each((i, el) => {
      const t = $(el).text().toLowerCase();
      const h = $(el).attr("href");
      if (t.includes("next")) next_page = h;
      if (t.includes("prev")) prev_page = h;
    });

    return {
      page,
      filters_applied: filters,
      items,
      pagination: { next_page, prev_page }
    };
  }

  // --- 6. AZ LIST (HURUF A-Z) ---
  async azList() {
    const html = await this._get("/");
    const $ = cheerio.load(html);

    const items = [];
    
    // Selector .footer-az .az-list li a
    $(".footer-az .az-list li a").each((i, el) => {
      const letter = $(el).text().trim();
      const href = $(el).attr("href");
      
      items.push({ letter, href });
    });

    return items;
  }

  // --- 7. GENRES LIST ---
  async genres() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const items = [];
    
    // Ambil genre dari sidebar checkbox input[name='genre[]']
    $("#sidebar .quickfilter ul.dropdown-menu li input[name='genre[]']").each((i, el) => {
      const value = $(el).attr("value");
      const label = $(el).next("label").text().trim();
      if (value && label) {
        items.push({ slug: value, name: label });
      }
    });

    return items;
  }

  // --- 8. DETAIL ---
  async detail(urlOrSlug) {
    const path = /^https?:\/\//.test(urlOrSlug) ? urlOrSlug : `/seri/${urlOrSlug.replace(/^\/+|\/+$/g, "")}/`;

    const html = await this._get(path);
    const $ = cheerio.load(html);

    const title = $(".entry-title").first().text().trim() || null;
    const thumb = $(".thumbook img").attr("src") || null;

    const alt = $(".alter").text().trim() || null;
    const synopsis = $(".synp .entry-content").text().trim() || null;

    const info = {};
    $(".infox .spe span").each((i, el) => {
      const txt = $(el).text().replace(/\s+/g, " ").trim();
      const [key, ...rest] = txt.split(":");
      if (key && rest.length > 0) info[key.trim().toLowerCase()] = rest.join(":").trim();
    });

    const tags = [];
    $(".bottom.tags a").each((i, el) => {
      tags.push({
        name: $(el).text().trim(),
        href: $(el).attr("href"),
      });
    });

    const episodes = [];
    $(".eplister ul li").each((i, el) => {
      const a = $(el).find("a");
      const num = $(el).find(".epl-num").text().trim() || null;
      const etitle = $(el).find(".epl-title").text().trim() || null;
      const date = $(el).find(".epl-date").text().trim() || null;
      episodes.push({
        num,
        etitle,
        href: a.attr("href") || null,
        date,
      });
    });

    return { title, thumb, alt, synopsis, info, tags, episodes };
  }
// --- 9. EPISODE ---
async episode(urlOrSlug) {
  const path = /^https?:\/\//.test(urlOrSlug)
    ? urlOrSlug
    : `/${urlOrSlug.replace(/^\/+|\/+$/g, "")}/`;

  const html = await this._get(path);
  const $ = cheerio.load(html);

  // Judul & Nama Series
  const title = $('h1.entry-title').text().trim() || null;
  const seriesName = $('h2[itemprop="partOfSeries"]').text().trim() || null;

  // Episode Number
  const epNum =
    $('meta[itemprop="episodeNumber"]').attr("content") ||
    title.match(/Episode\s+(\d+)/i)?.[1] ||
    null;

  // Thumbnail / Poster
  const thumbnail =
    $(".single-info img").attr("src") ||
    $(".megavid .tb img").attr("src") ||
    $(".thumb img").attr("src") ||
    null;

  // Info meta (Status, Studio, dll)
  const info = {};
  $(".spe span").each((i, el) => {
    const txt = $(el).text();
    const parts = txt.split(":");
    if (parts.length > 1) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(":").trim();
      info[key] = value;
    }
  });

  // Link Download (360,480,720,1080)
  const downloads = [];
  $(".soraurlx").each((i, el) => {
    const quality = $(el).find("strong").text().trim() || null;
    const links = [];
    $(el)
      .find("a")
      .each((j, a) => {
        links.push({
          provider: $(a).text().trim(),
          url: $(a).attr("href"),
        });
      });
    if (quality) downloads.push({ quality, links });
  });

  // Server streaming (list dropdown)
  const streamingServers = [];
  $('.mirror option').each((i, el) => {
    const t = $(el).text().trim();
    if (t && t !== "Select Video Server") streamingServers.push(t);
  });

  // Iframe utama / default stream
  const embedSrc =
    $("#embed_holder iframe").attr("src") ||
    $("#pembed iframe").attr("src") ||
    null;

  // Related Anime
  const related = [];
  $(".stylefiv .bsx").each((i, el) => {
    const a = $(el).find("a");
    related.push({
      title: a.attr("title") || a.find("h2").text().trim(),
      href: a.attr("href"),
      image: a.find("img").attr("src"),
    });
  });

  // Navigation Prev / Next Episode
  const nav = {
    prev: $('.naveps .nvs a[rel="prev"]').attr("href") || null,
    next: $('.naveps .nvs a[rel="next"]').attr("href") || null,
    allEpisodes: $(".naveps .nvsc a").attr("href") || null,
  };

  return {
    title,
    series: seriesName,
    episode: epNum,
    thumbnail,
    info,
    streaming: {
      current_source: embedSrc,
      available_servers: streamingServers,
    },
    downloads,
    related,
    nav,
  };
}

  // --- 10. SEARCH ---
  async search(query, page = 1) {
    const q = encodeURIComponent(query);
    const html = await this._get(page > 1 ? `/page/${page}/?s=${q}` : `/?s=${q}`);
    const $ = cheerio.load(html);

    const results = [];

    $(".bixbox .listupd article.bs").each((i, el) => {
      const a = $(el).find("a");

      const title = a.find("h2").text().trim() || a.attr("title") || null;
      const href = a.attr("href") || null;
      const image = a.find("img").attr("src") || null;

      const ep = a.find(".epx").text().trim() || null;
      let status = a.find(".status").text().trim();
      if (!status) status = a.find(".sb").text().trim() || null;
      const type = a.find(".typez").text().trim() || null;
      const desc = a.attr("title") || null;

      results.push({ title, href, image, ep, type, status, description: desc });
    });

    let next_page = null;
    let prev_page = null;

    $(".pagination a, .wp-pagenavi a, .nav-links a").each((i, el) => {
      const t = $(el).text().toLowerCase();
      const h = $(el).attr("href");
      if (t.includes("next")) next_page = h;
      if (t.includes("prev")) prev_page = h;
    });

    return { query, page, results, pagination: { next_page, prev_page } };
  }

  // --- 11. COMPLETED ---
  async completed(page = 1) {
    const html = await this._get(page > 1 ? `/completed/page/${page}/` : "/completed/");
    const $ = cheerio.load(html);

    const items = [];
    $(".bixbox .listupd article.bs").each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") || null;
      const title = a.find("h2").text().trim() || a.attr("title") || null;

      const ep = a.find(".epx").text().trim() || null;
      const type = a.find(".typez").text().trim() || null;
      const status = a.find(".sb").text().trim() || null;

      const image = a.find("img").attr("src") || null;
      const desc = a.attr("title") || null;

      items.push({ title, href, image, ep, type, status, description: desc });
    });

    let next_page = null;
    let prev_page = null;

    $(".pagination a, .nav-links a").each((i, el) => {
      const t = $(el).text().toLowerCase();
      const h = $(el).attr("href");
      if (t.includes("next")) next_page = h;
      if (t.includes("prev")) prev_page = h;
    });

    return { page, items, pagination: { next_page, prev_page } };
  }

  // --- 12. SCHEDULE ---
  async schedule() {
    const html = await this._get("/schedule/");
    const $ = cheerio.load(html);

    const days = [];

    $(".bixbox.schedulepage").each((i, el) => {
      const day = $(el).find(".releases h3 span").text().trim() || null;
      const items = [];

      $(el)
        .find(".listupd .bsx")
        .each((j, be) => {
          const a = $(be).find("a");

          const title = a.attr("title") || $(be).find(".tt").text().trim() || null;
          const href = a.attr("href") || null;
          const image = a.find("img").attr("src") || null;

          const at = $(be).find(".epx").text().trim() || null;
          const sb = $(be).find(".sb").text().trim() || null;

          items.push({ title, href, image, at, sb });
        });

      days.push({ day, items });
    });

    return days;
  }
}

module.exports = Anichin;
