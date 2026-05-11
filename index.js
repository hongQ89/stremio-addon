const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.freepornmovies.net';

// Load Validated Studio Mapping
const validatedStudios = JSON.parse(fs.readFileSync('./validated_studios.json', 'utf8'));

const builder = new addonBuilder(require('./manifest.json'));

// 1. Catalog Handler
builder.defineCatalogHandler(async (args) => {
    const metas = [];
    const skip = parseInt(args.extra.skip) || 0;
    const pageNo = Math.floor(skip / 24) + 1;

    try {
        let url;
        let isListMode = false;

        if (args.id === 'fpm_latest') {
            if (args.extra && args.extra.search) {
                url = `${BASE_URL}/search/?q=${encodeURIComponent(args.extra.search)}`;
            } else {
                const genre = args.extra.genre || 'Anytime';
                let path = 'latest-updates';
                if (genre === 'Last 3 days') path = 'latest-updates/3-days';
                else if (genre === 'This week') path = 'latest-updates/this-week';
                else if (genre === 'This month') path = 'latest-updates/this-month';
                else if (genre === 'Last 3 months') path = 'latest-updates/3-months';
                else if (genre === 'Last 6 months') path = 'latest-updates/6-months';
                url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
            }
        } else if (args.id === 'fpm_top_rated') {
            const genre = args.extra.genre || 'This Week';
            let path = 'top-rated/week';
            if (genre === 'All Time') path = 'top-rated/all';
            else if (genre === 'This Month') path = 'top-rated/month';
            else if (genre === 'Today') path = 'top-rated/today';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_most_viewed') {
            const genre = args.extra.genre || 'All Time';
            let path = 'most-popular/all';
            if (genre === 'This Month') path = 'most-popular/month';
            else if (genre === 'This Week') path = 'most-popular/week';
            else if (genre === 'Today') path = 'most-popular/today';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_categories') {
            const genre = args.extra.genre || 'Anytime';
            let path = 'categories';
            if (genre === 'Last 3 days') path = 'categories/3-days';
            else if (genre === 'This week') path = 'categories/this-week';
            else if (genre === 'This month') path = 'categories/this-month';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
            isListMode = true;
        } else if (args.id === 'fpm_studios') {
            const genre = args.extra.genre;
            if (!genre || genre === 'All') {
                url = pageNo === 1 ? `${BASE_URL}/sites/` : `${BASE_URL}/sites/${pageNo}/`;
                isListMode = true;
            } else {
                // SINKRONISASI ID MAPPING: Cari slug berdasarkan nama filter
                const studio = validatedStudios.find(s => s.name === genre);
                const slug = studio ? studio.slug : genre.toLowerCase().replace(/ /g, '-').replace(/'/g, '');
                url = pageNo === 1 ? `${BASE_URL}/sites/${slug}/` : `${BASE_URL}/sites/${slug}/${pageNo}/`;
            }
        }

        if (!url) return { metas: [] };

        const response = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);

        if (isListMode) {
            $('.list-categories .item, .list-sponsors .item, .list-models .item').each((i, el) => {
                let title = $(el).find('.title, strong, h2').text().trim();
                let thumb = $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
                if (!thumb && args.id === 'fpm_studios') thumb = 'https://www.freepornmovies.net/img/logo.dark.svg';
                if (title) {
                    metas.push({
                        id: `fpm_browse_${args.id}_${i}_${skip}`,
                        type: 'movie',
                        name: title,
                        poster: thumb
                    });
                }
            });
        } else {
            $('.list-videos .item').each((j, el) => {
                const title = $(el).find('.title').text().trim();
                const link = $(el).find('a').attr('href');
                const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src') || $(el).find('img').attr('data-original');
                
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
        }

        return { metas };
    } catch (e) {
        console.error('Catalog Error:', e.message);
        return { metas: [] };
    }
});

// 2. Meta Handler
builder.defineMetaHandler(async (args) => {
    if (args.id.startsWith('fpm_') && !args.id.includes('_browse_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const response = await axios.get(videoUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
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

// 3. Stream Handler
builder.defineStreamHandler(async (args) => {
    if (args.id.startsWith('fpm_')) {
        const id = args.id.replace('fpm_', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const response = await axios.get(videoUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
            });
            const html = response.data;
            const streams = [];
            const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
            const qualities = [
                { label: '4K/2160p', key: '_2160m.mp4' },
                { label: '720p', key: '_720m.mp4' },
                { label: '480p', key: '_480m.mp4' }
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
                        title: `FPM - ${q.label}`,
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

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon started on port ${PORT}`);
