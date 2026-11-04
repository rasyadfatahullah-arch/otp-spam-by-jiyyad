/**
 * Musicfyrik Scraper
 * Creator: IzzXd
 * Base: https://musicfyrik.web.id
 * Saluran: https://whatsapp.com/channel/0029VbDyL6d9RZAh3JjEM325
 * Note: pliss guys jangan di klaim 100% buatan lu, lu boleh kok modifikasi trs share lagi tapi tolong jangan ilangin header creator sama ch-nya
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ==================== Musicfyrik Scraper Core ==================== */

const _p = ["fJMupwGtP5IrlSHzB608x3nEdfsErTvFeMd081GnP5Ap", "w3XyVqs9w32RI6cD+GrEeJYnpgT4PsEolCOiAao8xw=="];
const _k = [0x4d, 0xa1, 0x17, 0xc3, 0x62, 0x9e, 0x0b, 0xf4];

function _ld() {
    const raw = Buffer.from(_p.join(''), 'base64');
    const out = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ _k[i % _k.length];
    return out.toString('utf8');
}

function _hd() {
    try {
        const src = fs.readFileSync(__filename, 'utf8');
        const m = src.match(/^\s*\/\*\*[\s\S]*?\*\//);
        if (!m) return '';
        const keys = ['Creator:', 'Saluran:', 'Note:'];
        const lines = m[0].split('\n').map(l => l.replace(/^\s*\*?\s*/, '').replace(/\s+/g, ''));
        const pick = keys.map(k => lines.find(l => l.startsWith(k)));
        if (pick.some(x => !x)) return '';
        return crypto.createHash('sha256').update(pick.join('')).digest('hex');
    } catch (_) {
        return '';
    }
}

function _ck() {
    const h = _hd();
    if (!h || h !== _ld()) throw new Error('ctx invalid');
}

const WM = {
    Creator: 'IzzXd',
    Saluran: 'https://whatsapp.com/channel/0029VbDyL6d9RZAh3JjEM325'
};

const BASE = 'https://musicfyrik.web.id';
const GUARD_SECRET = 'musifyrik_sec_7f9a2b1c4e8d3a6f5e0b';
const FIREBASE_API_KEY = 'AIzaSyDzVENzxvUXXv9qKveQ7XuHp4dehWU82hc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SESSION_FILE = path.join(__dirname, '.musicfyrik_session.json');

let cachedSession = null;

function loadSession() {
    if (cachedSession && cachedSession.token && cachedSession.expiresAt > Date.now()) {
        return cachedSession;
    }
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            if (data && data.token && data.expiresAt > Date.now() + 60000) {
                cachedSession = data;
                return cachedSession;
            }
            if (data && data.refreshToken) {
                cachedSession = data;
                return cachedSession;
            }
        }
    } catch (_) {}
    return null;
}

function saveSession(session) {
    cachedSession = session;
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
    } catch (_) {}
}

async function getAuthSession() {
    const existing = loadSession();
    if (existing && existing.token && existing.expiresAt > Date.now() + 60000) {
        return existing;
    }

    if (existing && existing.refreshToken) {
        try {
            const refreshRes = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
                grant_type: 'refresh_token',
                refresh_token: existing.refreshToken
            }, {
                timeout: 10000
            });
            if (refreshRes.data && refreshRes.data.id_token) {
                const refreshed = {
                    uid: refreshRes.data.user_id || existing.uid,
                    token: refreshRes.data.id_token,
                    refreshToken: refreshRes.data.refresh_token || existing.refreshToken,
                    expiresAt: Date.now() + (parseInt(refreshRes.data.expires_in, 10) || 3600) * 1000
                };
                saveSession(refreshed);
                return refreshed;
            }
        } catch (_) {}
    }

    const email = `mf_${Date.now()}_${Math.floor(Math.random() * 10000)}@gmail.com`;
    const password = `MfPass_${Date.now()}!`;
    const authRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
        email,
        password,
        returnSecureToken: true
    }, {
        timeout: 10000
    });

    if (!authRes.data || !authRes.data.idToken) {
        throw new Error('Gagal melakukan pendaftaran akun otomatis di Firebase Musicfyrik');
    }

    const newSession = {
        uid: authRes.data.localId,
        token: authRes.data.idToken,
        refreshToken: authRes.data.refreshToken,
        expiresAt: Date.now() + (parseInt(authRes.data.expiresIn, 10) || 3600) * 1000
    };
    saveSession(newSession);
    return newSession;
}

function generateSignature(timestamp) {
    return crypto.createHash('sha256').update(`${timestamp}:${GUARD_SECRET}`).digest('hex');
}

async function request(endpoint, options = {}) {
    _ck();
    const session = await getAuthSession();
    const now = Date.now();
    const signature = generateSignature(now);

    const headers = {
        'User-Agent': USER_AGENT,
        'Referer': `${BASE}/`,
        'Origin': BASE,
        'X-Musify-Client': 'web-app',
        'X-Musify-Time': String(now),
        'X-Musify-Signature': signature,
        'X-Auth-UID': session.uid,
        'Authorization': `Bearer ${session.token}`,
        'Cookie': `mr_auth=${encodeURIComponent(session.token)}`,
        ...(options.headers || {})
    };

    const url = endpoint.startsWith('http') ? endpoint : `${BASE}${endpoint}`;
    const response = await axios({
        url,
        method: options.method || 'GET',
        headers,
        data: options.data,
        params: options.params,
        timeout: options.timeout || 25000,
        validateStatus: () => true
    });

    if (response.status === 401 && response.data && response.data.code === 'LOGIN_REQUIRED') {
        cachedSession = null;
        try {
            if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
        } catch (_) {}
        const freshSession = await getAuthSession();
        const freshTime = Date.now();
        headers['X-Musify-Time'] = String(freshTime);
        headers['X-Musify-Signature'] = generateSignature(freshTime);
        headers['X-Auth-UID'] = freshSession.uid;
        headers['Authorization'] = `Bearer ${freshSession.token}`;
        headers['Cookie'] = `mr_auth=${encodeURIComponent(freshSession.token)}`;

        const retryRes = await axios({
            url,
            method: options.method || 'GET',
            headers,
            data: options.data,
            params: options.params,
            timeout: options.timeout || 25000,
            validateStatus: () => true
        });
        return retryRes.data;
    }

    return response.data;
}

async function search(query) {
    _ck();
    const q = String(query || '').trim();
    if (!q) {
        throw new Error('Kata kunci pencarian tidak boleh kosong');
    }

    const data = await request(`/api/search?query=${encodeURIComponent(q)}`);
    if (!data || data.status === false) {
        throw new Error(data?.message || 'Gagal mencari lagu di Musicfyrik');
    }

    const result = data.result || {};
    const songs = (result.songs || []).map(song => ({
        id: song.videoId || song.id,
        videoId: song.videoId || song.id,
        title: song.title,
        artist: song.artist,
        artistId: song.artistId || null,
        album: song.album || null,
        albumId: song.albumId || null,
        duration: song.duration || null,
        thumbnail: song.thumbnail || null,
        url: song.url || `https://music.youtube.com/watch?v=${song.videoId || song.id}`
    }));

    return {
        query: result.query || q,
        total: songs.length,
        songs
    };
}

async function play(target) {
    _ck();
    let videoId = String(target || '').trim();
    if (!videoId) {
        throw new Error('Target lagu (judul, URL, atau video ID) tidak boleh kosong');
    }

    const urlMatch = videoId.match(/(?:v=|youtu\.be\/|watch\?v=|\/watch\/)([a-zA-Z0-9_-]{11})/i);
    if (urlMatch) {
        videoId = urlMatch[1];
    } else if (videoId.length !== 11 || /\s/.test(videoId)) {
        const searchResult = await search(videoId);
        if (!searchResult.songs.length) {
            throw new Error(`Lagu "${videoId}" tidak ditemukan`);
        }
        videoId = searchResult.songs[0].videoId;
    }

    const data = await request(`/api/ytplay?id=${encodeURIComponent(videoId)}`);
    if (!data || data.status === false || !data.result) {
        throw new Error(data?.message || 'Gagal memproses streaming dan link unduhan lagu');
    }

    const r = data.result;
    const downloadUrl = r.download?.audio || r.stream?.direct || null;
    const proxyUrl = r.stream?.proxy ? `${BASE}${r.stream.proxy}` : null;

    return {
        videoId: r.videoId || videoId,
        duration: r.duration || null,
        source: r.source || 'savetube',
        format: r.format || { mime: 'audio/mpeg', bitrate: 128 },
        downloadUrl,
        proxyStreamUrl: proxyUrl,
        expiresIn: r.expiresIn || 21600
    };
}

async function lyrics(target, artistHint = '') {
    _ck();
    let videoId = String(target || '').trim();
    let songTitle = '';
    let songArtist = String(artistHint || '').trim();

    if (!videoId) {
        throw new Error('Target lagu untuk lirik tidak boleh kosong');
    }

    const urlMatch = videoId.match(/(?:v=|youtu\.be\/|watch\?v=|\/watch\/)([a-zA-Z0-9_-]{11})/i);
    if (urlMatch) {
        videoId = urlMatch[1];
    } else if (videoId.length !== 11 || /\s/.test(videoId)) {
        const searchResult = await search(videoId);
        if (searchResult.songs.length) {
            const s = searchResult.songs[0];
            videoId = s.videoId;
            songTitle = s.title;
            if (!songArtist) songArtist = s.artist;
        }
    }

    let queryParams = `id=${encodeURIComponent(videoId)}`;
    if (songTitle) queryParams += `&title=${encodeURIComponent(songTitle)}`;
    if (songArtist) queryParams += `&artist=${encodeURIComponent(songArtist)}`;

    const data = await request(`/api/lyrics?${queryParams}`);
    if (!data || data.status === false || !data.result) {
        throw new Error(data?.message || 'Lirik lagu tidak ditemukan');
    }

    const r = data.result;
    const lrc = r.lyrics || {};

    return {
        videoId: r.videoId || videoId,
        title: r.title || songTitle,
        artist: r.artist || songArtist,
        source: r.source || null,
        provider: r.provider || null,
        type: lrc.type || 'synced',
        lines: lrc.lines || [],
        plainLyrics: Array.isArray(lrc.lines) ? lrc.lines.map(l => l.text).join('\n') : (lrc.plain || '')
    };
}

/* ==================== API Routes ==================== */

// Search songs
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q || req.query.query || '';
        if (!q.trim()) {
            return res.status(400).json({ status: false, error: 'Query required' });
        }
        const result = await search(q);
        res.json({ status: true, ...result, ...WM });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message, ...WM });
    }
});

// Get playable stream URL
app.get('/api/play', async (req, res) => {
    try {
        const target = req.query.id || req.query.q || req.query.url || '';
        if (!target.trim()) {
            return res.status(400).json({ status: false, error: 'Target required' });
        }
        const result = await play(target);
        res.json({ status: true, ...result, ...WM });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message, ...WM });
    }
});

// Get lyrics
app.get('/api/lyrics', async (req, res) => {
    try {
        const target = req.query.id || req.query.q || '';
        const artist = req.query.artist || '';
        if (!target.trim()) {
            return res.status(400).json({ status: false, error: 'Target required' });
        }
        const result = await lyrics(target, artist);
        res.json({ status: true, ...result, ...WM });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message, ...WM });
    }
});

// Proxy audio stream with Range support
app.get('/api/proxy-audio', async (req, res) => {
    try {
        const audioUrl = req.query.url;
        if (!audioUrl) {
            return res.status(400).json({ error: 'url required' });
        }

        const range = req.headers.range;
        const headers = {
            'User-Agent': USER_AGENT,
            'Referer': BASE + '/',
            'Origin': BASE
        };
        if (range) headers['Range'] = range;

        const response = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'stream',
            headers,
            timeout: 30000,
            validateStatus: () => true
        });

        res.set({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
            'Accept-Ranges': 'bytes',
            'Content-Type': response.headers['content-type'] || 'audio/mpeg'
        });

        if (response.headers['content-length']) {
            res.set('Content-Length', response.headers['content-length']);
        }
        if (response.headers['content-range']) {
            res.set('Content-Range', response.headers['content-range']);
            res.status(206);
        } else {
            res.status(response.status || 200);
        }

        response.data.pipe(res);
    } catch (err) {
        console.error('Proxy audio error:', err.message);
        res.status(500).json({ error: 'Failed to proxy audio' });
    }
});

// Proxy image with CORS
app.get('/api/proxy-image', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).json({ error: 'url required' });
        }

        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 15000,
            validateStatus: () => true
        });

        res.set({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': response.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400'
        });

        response.data.pipe(res);
    } catch (err) {
        console.error('Proxy image error:', err.message);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

// Default track: Sunday Morning - Maroon 5 with synced lyrics
app.get('/api/default-track', async (req, res) => {
    try {
        // Try to fetch real data for Sunday Morning
        let trackData = null;
        let lyricsData = null;

        try {
            const searchRes = await search('Sunday Morning Maroon 5');
            if (searchRes.songs && searchRes.songs.length > 0) {
                const song = searchRes.songs.find(s =>
                    s.title.toLowerCase().includes('sunday morning') &&
                    s.artist.toLowerCase().includes('maroon')
                ) || searchRes.songs[0];

                const playRes = await play(song.videoId);
                trackData = {
                    ...song,
                    streamUrl: playRes.downloadUrl || playRes.proxyStreamUrl,
                    duration: playRes.duration || song.duration
                };

                try {
                    lyricsData = await lyrics(song.videoId, song.artist);
                } catch (_) {}
            }
        } catch (e) {
            console.log('Fallback to static default track data');
        }

        // Fallback / enhanced default with known synced lyrics for Sunday Morning
        const defaultLyrics = [
            { time: 0, text: "Sunday morning" },
            { time: 4.2, text: "rain is falling" },
            { time: 8.5, text: "Steal some covers" },
            { time: 12.8, text: "share some skin" },
            { time: 17.0, text: "Clouds are clearing" },
            { time: 21.3, text: "and love is calling" },
            { time: 25.5, text: "Accumulatin' on the streets below" },
            { time: 30.0, text: "Gotta find a way" },
            { time: 34.2, text: "to get back home now" },
            { time: 38.5, text: "Gotta find a way" },
            { time: 42.8, text: "back home" },
            { time: 47.0, text: "" },
            { time: 48.5, text: "Driving slow" },
            { time: 52.0, text: "yeah-yeah, ah" },
            { time: 55.5, text: "yeah-yeah, ah" },
            { time: 59.0, text: "yeah-yeah" },
            { time: 62.5, text: "All I need" },
            { time: 66.0, text: "is what I had with you" },
            { time: 70.5, text: "And I know" },
            { time: 74.0, text: "that I can't go on" },
            { time: 78.0, text: "without you in my life" },
            { time: 82.5, text: "" },
            { time: 84.0, text: "It feels so wrong" },
            { time: 88.0, text: "It feels so right" },
            { time: 92.0, text: "Doesn't matter what they say" },
            { time: 96.5, text: "Don't matter what they say" },
            { time: 101.0, text: "I still believe" },
            { time: 105.0, text: "And I still believe" },
            { time: 109.5, text: "I can't do this" },
            { time: 113.5, text: "all alone" },
            { time: 117.5, text: "I'm so alone" },
            { time: 122.0, text: "" },
            { time: 124.0, text: "Sunday morning" },
            { time: 128.0, text: "rain is falling" },
            { time: 132.0, text: "And I'm calling out to you" }
        ];

        const response = {
            status: true,
            track: {
                id: trackData?.videoId || 'default-sunday-morning',
                videoId: trackData?.videoId || null,
                title: 'Sunday Morning',
                artist: 'Maroon 5',
                album: 'Songs About Jane',
                duration: trackData?.duration || '4:06',
                thumbnail: trackData?.thumbnail || 'https://i.scdn.co/image/ab67616d0000b273f154001a4a6c4a0e3b8a0b0b',
                artwork: trackData?.thumbnail || null,
                streamUrl: trackData?.streamUrl || null,
                year: 2002
            },
            lyrics: {
                type: 'synced',
                lines: (lyricsData && lyricsData.lines && lyricsData.lines.length > 0)
                    ? lyricsData.lines.map(l => ({
                        time: typeof l.time === 'number' ? l.time : (l.start || 0),
                        text: l.text || l.line || ''
                    }))
                    : defaultLyrics
            },
            ...WM
        };

        res.json(response);
    } catch (err) {
        res.status(500).json({ status: false, error: err.message, ...WM });
    }
});

// Fallback route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🎵 AdMusify by JIYYAD TOOLS running at http://localhost:${PORT}`);
    console.log(`   Music engine powered by Musicfyrik (IzzXd)\n`);
});
