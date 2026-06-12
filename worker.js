const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.freepornmovies.net';

// Data Mocking (Karena di Worker gak ada fs)
const validatedStudios = [
    {"name":"Evil Angel","slug":"evil-angel"},
    {"name":"Bang Bros","slug":"bang-bros"},
    {"name":"Brazzers","slug":"brazzers"},
    {"name":"Reality Kings","slug":"reality-kings"},
    {"name":"Digital Playground","slug":"digital-playground"},
    {"name":"Naughty America","slug":"naughty-america"}
];
const validatedCategories = [
    {"name":"4K","slug":"4k"},
    {"name":"POV","slug":"pov"},
    {"name":"Hardcore","slug":"hardcore"}
];

const manifest = {
    "id": "org.fpm.native.worker.pro",
    "version": "6.0.0",
    "name": "FPM Pro (Stable V6)",
    "description": "FPM Addon Serverless - Identical to Local",
    "resources": ["catalog", "stream", "meta"],
    "types": ["movie"],
    "idPrefixes": ["fpm:"],
    "catalogs": [
        { "type": "movie", "id": "fpm_latest", "name": "FPM Terbaru", "extra": [{ "name": "genre", "options": ["Anytime", "Last 3 days", "This week"] }, { "name": "skip" }] },
        { "type": "movie", "id": "fpm_trending", "name": "FPM Trending", "extra": [{ "name": "genre", "options": ["Today", "This Week", "This Month"] }, { "name": "skip" }] },
        { "type": "movie", "id": "fpm_popular", "name": "FPM Populer", "extra": [{ "name": "skip" }] }
    ]
};

// Add individual studio rows like local
validatedStudios.forEach(studio => {
    manifest.catalogs.push({
        id: `s_${studio.slug}`,
        name: studio.name,
        type: 'movie',
        extra: [{ name: 'skip' }]
    });
});

const builder = new addonBuilder(manifest);

// Logika Handler (Copy-Paste dari index.js lokal lo)
builder.defineCatalogHandler(async (args) => {
    const metas = [];
    const skip = parseInt(args.extra.skip) || 0;
    const pageNo = Math.floor(skip / 24) + 1;

    try {
        let url;
        let isListMode = false;

        if (args.id.startsWith('s_')) {
            const slug = args.id.replace('s_', '');
            url = pageNo === 1 ? `${BASE_URL}/sites/${slug}/` : `${BASE_URL}/sites/${slug}/${pageNo}/`;
        } else if (args.id === 'fpm_latest') {
            const genre = args.extra.genre || 'Anytime';
            let path = 'latest-updates';
            if (genre === 'Last 3 days') path = 'latest-updates/3-days';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_trending') {
            const genre = args.extra.genre || 'Today';
            let path = 'most-popular/today';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_popular') {
            url = pageNo === 1 ? `${BASE_URL}/most-popular/all/` : `${BASE_URL}/most-popular/all/${pageNo}/`;
        }

        if (!url) return { metas: [] };

        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        $('.list-videos .item').each((j, el) => {
            const title = $(el).find('.title').text().trim();
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src');
            
            if (link && link.includes('/videos/')) {
                const videoIdMatch = link.match(/\/videos\/([^\/]+)/);
                if (videoIdMatch) {
                    metas.push({
                        id: `fpm_${videoIdMatch[1]}`,
                        type: 'movie',
                        name: title,
                        poster: thumb,
                        background: thumb,
                    });
                }
            }
        });

        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

builder.defineMetaHandler(async (args) => {
    if (args.id.startsWith('fpm_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const response = await axios.get(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(response.data);
            const title = $('.headline h1').text().trim() || $('meta[property="og:title"]').attr('content');
            const thumb = $('meta[property="og:image"]').attr('content');
            const description = $('meta[property="og:description"]').attr('content');
            return {
                meta: {
                    id: args.id,
                    type: 'movie',
                    name: title,
                    poster: thumb,
                    background: thumb,
                    description: description
                }
            };
        } catch (e) {}
    }
    return { meta: { id: args.id, type: 'movie', name: 'Loading...' } };
});

builder.defineStreamHandler(async (args) => {
    if (args.id.startsWith('fpm_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const response = await axios.get(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(response.data);
            const html = response.data;

            const title = $('.headline h1').text().trim();
            const duration = $('.duration').first().text().trim();
            const studio = $('.btn_sponsor').first().text().trim();

            const streams = [];
            const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
            const qualities = [
                { label: '4K', key: '_2160m.mp4', res: '2160p' },
                { label: 'HD', key: '_720m.mp4', res: '720p' },
                { label: 'SD', key: '_480m.mp4', res: '480p' }
            ];

            for (const q of qualities) {
                const link = fileMatches.find(l => l.includes(q.key));
                if (link) {
                    const cleanLink = link.replace(/[",]$/, ''); 
                    const res = await axios.get(cleanLink, {
                        maxRedirects: 0,
                        validateStatus: null,
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': videoUrl }
                    });
                    const finalUrl = res.headers.location || cleanLink;

                    streams.push({
                        name: `FPM • ${q.label}\n${q.res}`,
                        title: `${title}\n\nQuality: ${q.res}\nDuration: ${duration}\nStudio: ${studio}`,
                        url: finalUrl,
                        behaviorHints: {
                            proxyHeaders: { "request": { "User-Agent": "Mozilla/5.0", "Referer": videoUrl } }
                        }
                    });
                }
            }
            return { streams };
        } catch (e) {}
    }
    return { streams: [] };
});

const addonInterface = builder.getInterface();

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === '/manifest.json' || path === '/') {
            return new Response(JSON.stringify(addonInterface.manifest), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const parts = path.split('/');
        const resource = parts[1];
        const type = parts[2];
        const id = parts[3] ? parts[3].replace('.json', '') : null;

        let result;
        if (resource === 'catalog') {
            result = await addonInterface.handleCatalog({ id, type, extra: Object.fromEntries(url.searchParams) });
        } else if (resource === 'meta') {
            result = await addonInterface.handleMeta({ id, type });
        } else if (resource === 'stream') {
            result = await addonInterface.handleStream({ id, type });
        }

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
};
