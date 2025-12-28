const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const Anichin = require('./anichin'); 
const app = express();
const ani = new Anichin();

/* ================================================
   MIDDLEWARE GLOBAL
================================================ */
app.use(express.json());
app.use(morgan('dev'));
app.set('json spaces', 2);
app.use(cors({ origin: "*", methods: "GET" }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


/* ================================================
   HELPER: SLUG NORMALIZER
================================================ */
const cleanSlug = (raw) => {
  if (!raw) return null;
  return decodeURIComponent(raw.replace(/\+/g, ' ')).trim().replace(/\s+/g, ' ').toLowerCase();
};


/* ================================================
   🏠 ROUTE UTAMA
================================================ */
app.get('/', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  res.render('index', { base });
});


/* ================================================
   📌 HOME DATA
================================================ */
app.get('/slide', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.SwipperSlide() });
  } catch (e) { resError(res, e); }
});

app.get('/popular', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.popular() });
  } catch (e) { resError(res, e); }
});

app.get('/recommend', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.popular() });
  } catch (e) { resError(res, e); }
});

app.get('/latest', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.latest(+req.query.page || 1) });
  } catch (e) { resError(res, e); }
});


/* ================================================
   📺 LISTING
================================================ */
app.get('/ongoing', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.ongoing(+req.query.page || 1) });
  } catch (e) { resError(res, e); }
});

app.get('/completed', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.completed(+req.query.page || 1) });
  } catch (e) { resError(res, e); }
});

app.get('/schedule', async (req, res) => {
  try {
    res.json({ status: true, data: await ani.schedule() });
  } catch (e) { resError(res, e); }
});


/* ================================================
   🔍 SEARCH
================================================ */
app.get('/search', async (req, res) => {
  try {
    let q = cleanSlug(req.query.q);
    if (!q) return res.json({ status: false, message: 'Missing query ?q=' });
    res.json({ status: true, q, data: await ani.search(q, +req.query.page || 1) });
  } catch (e) { resError(res, e); }
});


/* ================================================
   📄 DETAIL
================================================ */
app.get('/detail/:slug', async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    if (!slug) return badSlug(res);

    let data = await ani.detail(slug);

    // 📌 Recomended by genre
    try {
      const g = data.genres?.[0];
      if (g) data.recommended = (await ani.getAnimeList({ genre: g }, 1))?.items?.slice(0, 8) || null;
    } catch {}

    return res.json({ status: true, slug, data });

  } catch (e) { resError(res, e); }
});


/* ================================================
   🎬 EPISODE + MULTI FALLBACK + PAGINATION
================================================ */
app.get('/episode/:slug', async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    if (!slug) return badSlug(res);

    let result = await ani.episode(slug).catch(() => null);

    // fallback cari yang paling mirip
    if (!result) {
      let trySearch = await ani.search(slug).catch(() => null);
      let guess = trySearch?.results?.find(r => r.title?.toLowerCase().includes(slug));
      if (guess?.href) result = await ani.episode(cleanSlug(guess.href.split('/').pop()));
    }

    // Multi-server fallback
    if (!result) {
      const servers = ["server-1","server-2","mirror","backup"];
      for (const s of servers) {
        try {
          const test = await ani.episode(`${slug}-${s}`);
          if (test) return res.json({
            status: true,
            message: "Fallback ke server mirror",
            server: s,
            data: test
          });
        } catch {}
      }
    }

    if (!result) return res.json({ status: false, message: "Episode tidak ditemukan." });

    // Pagination
    result.pagination = {
      prev: result.prevEpisode ? `/episode/${encodeURIComponent(result.prevEpisode)}` : null,
      next: result.nextEpisode ? `/episode/${encodeURIComponent(result.nextEpisode)}` : null,
      watch: `/watch/${encodeURIComponent(slug)}`
    };

    return res.json({ status: true, slug, data: result });

  } catch (e) { resError(res, e); }
});


/* ================================================
   ▶️ WATCH DIRECT
================================================ */
app.get('/watch/:slug', async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    if (!slug) return badSlug(res);

    const ep = await ani.episode(slug).catch(() => null);
    if (!ep) return res.redirect(`/episode/${encodeURIComponent(slug)}`);

    return res.json({
      status: true,
      play: true,
      slug,
      iframe: ep.iframe || ep.sources || null,
      referer: ep.referer || null,
      data: ep
    });

  } catch (e) { resError(res, e); }
});


/* ================================================
   🌄 IMAGE PROXY
================================================ */
app.get('/img', async (req, res) => {
  try {
    let url = req.query.url;
    if (!url) return res.status(400).send("Missing url");

    const img = await fetch(url);
    const buffer = Buffer.from(await img.arrayBuffer());
    res.set("Content-Type", img.headers.get("content-type"));
    res.send(buffer);

  } catch {
    res.redirect("https://telegra.ph/file/7d98ba1b4dd47f4e0a819.jpg");
  }
});


/* ================================================
   FILTERING (Genre, A-Z, Tahun, etc)
================================================ */
app.get('/genres', async (req, res) => {
  try { res.json({ status: true, data: await ani.genres() }); }
  catch (e) { resError(res, e); }
});

app.get('/az', async (req, res) => {
  try {
    const letter = (req.query.letter || "a").toLowerCase();
    res.json({ status: true, letter, data: await ani.getAnimeList({ letter }, +req.query.page || 1) });
  } catch (e) { resError(res, e); }
});

app.get('/year/:year', async (req, res) => {
  try {
    res.json({ status: true, year: req.params.year, data: await ani.getAnimeList({ season: [req.params.year] }, +req.query.page || 1) });
  } catch (e) { resError(res, e); }
});

app.get('/list', async (req, res) => {
  try {
    const f = {};
    ["genre","studio","season"].forEach(key => req.query[key] && (f[key] = req.query[key].includes(",") ? req.query[key].split(",") : req.query[key]));
    ["type","status","sub","order"].forEach(k => req.query[k] && (f[k] = req.query[k]));

    res.json({ status: true, filters: f, data: await ani.getAnimeList(f, +req.query.page || 1) });
  } catch (e) { resError(res, e); }
});


/* ================================================
   ❌ 404
================================================ */
app.use("*", (req, res) => {
  res.status(404).json({
    status: false,
    message: "Endpoint Not Found",
    example: {
      detail: "/detail/soul land",
      episode: "/episode/soul land episode 26",
      watch: "/watch/soul land episode 26",
      search: "/search?q=soul land"
    }
  });
});


/* ================================================
   🔧 ERROR HELPERS
================================================ */
function resError(res, e) {
  res.status(500).json({ status: false, error: e.message });
}
function badSlug(res) {
  return res.json({ status: false, message: "Slug invalid / kosong." });
}


/* ================================================
   🚀 START SERVER
================================================ */
const PORT = process.env.PORT || 2504;
app.listen(PORT, () => {
  console.log(`⚡ Server Berjalan → http://localhost:${PORT}`);
});
