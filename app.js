const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Sesuaikan path sesuai lokasi file scraper Anda
// Jika file ada di folder 'lib', ubah menjadi './lib/anichin'
const Anichin = require('./anichin'); 

const app = express();
const ani = new Anichin();

app.use(cors());
app.use(morgan('dev'));
app.set('json spaces', 2);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- ROUTE UTAMA ---
app.get('/', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  res.render('index', { base });
});

// --- ROUTE HOME (Slider, Popular, Latest) ---
app.get('/slide', async (req, res) => {
  try {
    const data = await ani.SwipperSlide();
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/popular', async (req, res) => {
  try {
    const data = await ani.popular();
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/recommend', async (req, res) => {
  try {
    // Karena Anichin tidak punya rekomendasi spesifik, kita gunakan Popular
    const data = await ani.popular();
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/latest', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await ani.latest(page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// --- ROUTE LISTING (Ongoing, Completed, Schedule) ---
app.get('/ongoing', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await ani.ongoing(page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/completed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await ani.completed(page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/schedule', async (req, res) => {
  try {
    const data = await ani.schedule();
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// --- ROUTE SEARCH & DETAIL ---
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const page = parseInt(req.query.page) || 1;
    if (!q) return res.json({ status: false, message: 'Missing query ?q=' });
    const data = await ani.search(q, page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/detail/:slug', async (req, res) => {
  try {
    const data = await ani.detail(req.params.slug);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

app.get('/episode/:slug', async (req, res) => {
  try {
    const data = await ani.episode(req.params.slug);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// --- ROUTE BARU (Genres, AZ, Year, Filter) ---

// 1. Daftar Genre (Action, Comedy, dll)
app.get('/genres', async (req, res) => {
  try {
    const data = await ani.genres();
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// 2. AZ List (Filter berdasarkan Huruf)
app.get('/az', async (req, res) => {
  try {
    const letter = req.query.letter ? req.query.letter.toLowerCase() : 'a';
    const page = parseInt(req.query.page) || 1;
    
    // Menggunakan fungsi getAnimeList dengan filter letter
    const data = await ani.getAnimeList({ letter: letter }, page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// 3. Filter by Year (Season)
app.get('/year/:year', async (req, res) => {
  try {
    const year = req.params.year;
    const page = parseInt(req.query.page) || 1;
    
    // Menggunakan fungsi getAnimeList dengan filter season (diisi tahun)
    const data = await ani.getAnimeList({ season: [year] }, page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

// 4. Advanced List Filter (Genre, Studio, Type, Status sekaligus)
app.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filters = {};

    // Parse query parameter
    if (req.query.genre) {
        // Jika genre dikirim koma, ubah ke array (misal: action,comedy)
        filters.genre = Array.isArray(req.query.genre) ? req.query.genre : req.query.genre.split(',');
    }
    if (req.query.studio) {
        filters.studio = Array.isArray(req.query.studio) ? req.query.studio : req.query.studio.split(',');
    }
    if (req.query.season) {
        filters.season = Array.isArray(req.query.season) ? req.query.season : req.query.season.split(',');
    }
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.sub) filters.sub = req.query.sub;
    if (req.query.order) filters.order = req.query.order;

    const data = await ani.getAnimeList(filters, page);
    res.json({ status: true, data });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});

const PORT = process.env.PORT || 2504;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
