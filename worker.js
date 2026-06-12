const BASE_URL = 'https://www.freepornmovies.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MANIFEST = {
    id: 'org.fpm.native.worker.pro',
    version: '5.0.0',
    name: 'FPM Pro (Super Fixed)',
    description: 'Addon FPM Serverless V5 - Full Catalog & Stream',
    resources: ['catalog', 'stream', 'meta'],
    types: ['movie'],
    idPrefixes: ['fpm:'],
    catalogs: [
        { type: 'movie', id: 'fpm_latest', name: 'FPM Terbaru' },
        { type: 'movie', id: 'fpm_trending', name: 'FPM Trending' },
        { type: 'movie', id: 'fpm_popular', name: 'FPM Terpopuler' }
    ]
};

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};

async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (path === '/manifest.json' || path === '/') return new Response(JSON.stringify(MANIFEST), { headers });

    // 1. CATALOG HANDLER
    if (path.startsWith('/catalog/')) {
        const parts = path.split('/');
        const id = parts[3]; // fpm_latest, etc.
        let target = 'latest-updates';
        if (id === 'fpm_trending') target = 'most-popular/today';
        if (id === 'fpm_popular') target = 'most-popular/all-time';

        try {
            const res = await fetch(`${BASE_URL}/${target}/`, { headers: { 'User-Agent': UA } });
            const html = await res.text();
            const list = [];
            const items = html.split('class="item"');
            items.shift();
            items.forEach(item => {
                const idM = item.match(/\/videos\/([^/"]+)\//);
                const tM = item.match(/title="([^"]+)"/);
                const pM = item.match(/src="([^"]+)"/) || item.match(/data-src="([^"]+)"/);
                if (idM && tM) {
                    list.push({
                        id: 'fpm:' + idM[1],
                        name: tM[1],
                        type: 'movie',
                        poster: pM ? pM[1] : ""
                    });
                }
            });
            return new Response(JSON.stringify({ metas: list }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ metas: [] }), { headers });
        }
    }

    // 2. META HANDLER
    if (path.startsWith('/meta/')) {
        const id = path.split('/').pop().replace('.json', '').replace('fpm:', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const res = await fetch(videoUrl, { headers: { 'User-Agent': UA } });
            const html = await res.text();
            
            const titleM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/meta property="og:title" content="([^"]+)"/);
            const imageM = html.match(/meta property="og:image" content="([^"]+)"/);
            const descM = html.match(/meta property="og:description" content="([^"]+)"/);
            
            // Extract some tags for fun
            const tagsM = [...html.matchAll(/class="item"><a href="[^"]+">([^<]+)<\/a>/g)].map(m => m[1]).slice(0, 5);

            return new Response(JSON.stringify({
                meta: {
                    id: 'fpm:' + id,
                    type: 'movie',
                    name: titleM ? titleM[1].trim() : "FPM Video",
                    poster: imageM ? imageM[1] : "",
                    background: imageM ? imageM[1] : "",
                    description: (descM ? descM[1] : "No description") + (tagsM.length ? "\n\nTags: " + tagsM.join(', ') : ""),
                    runtime: html.match(/class="duration"[^>]*>([^<]+)/i)?.[1] || ""
                }
            }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ meta: { id: 'fpm:' + id, type: 'movie', name: "Error" } }), { headers });
        }
    }

    // 3. STREAM HANDLER
    if (path.startsWith('/stream/')) {
        const id = path.split('/').pop().replace('.json', '').replace('fpm:', '');
        const videoUrl = `${BASE_URL}/videos/${id}/`;
        try {
            const res = await fetch(videoUrl, { headers: { 'User-Agent': UA, 'Referer': BASE_URL } });
            const html = await res.text();
            
            const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
            const streams = [];

            for (const link of fileMatches) {
                const cleanLink = link.replace(/[",]$/, '');
                let label = "";
                if (cleanLink.includes('_2160m.mp4')) label = "4K";
                else if (cleanLink.includes('_720m.mp4')) label = "HD";
                else if (cleanLink.includes('_480m.mp4')) label = "SD";
                else continue;

                // Follow redirect to get real video URL
                const headRes = await fetch(cleanLink, {
                    method: 'GET',
                    redirect: 'manual',
                    headers: { 'User-Agent': UA, 'Referer': videoUrl }
                });
                const finalUrl = headRes.headers.get('location') || cleanLink;

                streams.push({
                    name: `FPM • ${label}`,
                    title: `Quality: ${label}\nServer: Cloudflare V5\n@Pongky.Ir`,
                    url: finalUrl,
                    behaviorHints: {
                        proxyHeaders: {
                            "request": { 
                                "User-Agent": UA, 
                                "Referer": videoUrl,
                                "Origin": "https://www.freepornmovies.net"
                            }
                        }
                    }
                });
            }
            return new Response(JSON.stringify({ streams }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ streams: [] }), { headers });
        }
    }

    return new Response('Not Found', { status: 404 });
}
