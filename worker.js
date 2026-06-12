import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.freepornmovies.net';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Simple In-Memory Cache (Temporary during Worker instance life)
const cache = new Map();

const validatedStudios = [{"name":"Brazzers","slug":"brazzers2"},{"name":"Mature.nl","slug":"mature-nl"},{"name":"Wow Girls","slug":"wow-girls"},{"name":"Girls Out West","slug":"girls-out-west"},{"name":"Club Sweethearts","slug":"clubsweethearts"},{"name":"SexArt","slug":"sexart"},{"name":"SEXMEX","slug":"sexmex"},{"name":"New Sensations","slug":"new-sensations"},{"name":"Team Skeet X Series","slug":"team-skeet-x-series"},{"name":"Porn World","slug":"pornworld"},{"name":"Private","slug":"private"},{"name":"Nubile Films","slug":"nubile-films"},{"name":"Passion HD","slug":"passion-hd"},{"name":"Digital Playground","slug":"digital-playground"},{"name":"Rocco Siffredi","slug":"rocco-siffredi"},{"name":"Ersties","slug":"ersties"},{"name":"HardX","slug":"hardx"},{"name":"Oldje","slug":"oldje"},{"name":"BLACKED","slug":"blacked"},{"name":"Dorcel Club","slug":"dorcel-club"},{"name":"Fake Taxi","slug":"fake-taxi"},{"name":"Dane Jones","slug":"dane-jones"},{"name":"Family Therapy","slug":"family-therapy"},{"name":"TUSHY","slug":"tushy"},{"name":"Blacks on Blondes","slug":"blacks-on-blondes"},{"name":"VIXEN","slug":"vixen"},{"name":"Submissed","slug":"submissed"},{"name":"Pure Taboo","slug":"pure-taboo"},{"name":"Public Agent","slug":"public-agent"},{"name":"Ultra Films","slug":"ultrafilms"},{"name":"BLACKED RAW","slug":"blacked-raw"},{"name":"Girlsway","slug":"girlsway"},{"name":"Ass Parade","slug":"ass-parade"},{"name":"Exxxtra Small","slug":"exxxtra-small"},{"name":"Tiny 4K","slug":"tiny-4k"},{"name":"Bang Bus","slug":"bang-bus"},{"name":"Perv Mom","slug":"perv-mom"},{"name":"Evil Angel","slug":"evil-angel"},{"name":"My Pervy Family","slug":"my-pervy-family"},{"name":"Net Video Girls","slug":"netvideogirls"},{"name":"POVD","slug":"povd"},{"name":"Lesbea","slug":"lesbea"},{"name":"Massage Rooms","slug":"massage-rooms"},{"name":"Sinful XXX","slug":"sinfulxxx"},{"name":"Girls Only Porn","slug":"girlsonlyporn"},{"name":"Family Strokes","slug":"family-strokes"},{"name":"Deep Lush","slug":"deep-lush"},{"name":"Wake up n Fuck","slug":"wake-up-n-fuck2"},{"name":"EroticaX","slug":"eroticax"},{"name":"Bratty Sis","slug":"brattysis"},{"name":"Devil's Film","slug":"devils-film"},{"name":"Sis Loves Me","slug":"sis-loves-me"},{"name":"Elegant Raw","slug":"elegantraw"},{"name":"Young Busty","slug":"youngbusty"},{"name":"TUSHY RAW","slug":"tushyraw"},{"name":"My Friend's Hot Mom","slug":"my-friends-hot-mom"},{"name":"Scenes XXXX","slug":"scenes-xxxx"},{"name":"Pure Mature","slug":"pure-mature"},{"name":"Grandmams","slug":"grandmams"},{"name":"Monsters of Cock","slug":"monsters-of-cock"},{"name":"Brown Bunnies","slug":"brown-bunnies"},{"name":"My Sister's Hot Friend","slug":"my-sisters-hot-friend"},{"name":"Team Skeet Selects","slug":"teamskeet-selects"},{"name":"Property Sex","slug":"property-sex"},{"name":"Teens Love Huge Cocks","slug":"teens-love-huge-cocks"},{"name":"Bangbros Clips","slug":"bangbros-clips"},{"name":"She's New","slug":"shes-new"},{"name":"Dad Crush","slug":"dad-crush"},{"name":"Big Tits Round Asses","slug":"big-tits-round-asses"},{"name":"MYLF X Series","slug":"mylf-x-series2"},{"name":"Step Siblings Caught","slug":"step-siblings-caught"},{"name":"I Know That Girl","slug":"i-know-that-girl"},{"name":"Lubed","slug":"lubed"},{"name":"We Live Together","slug":"we-live-together"},{"name":"Fake Hostel","slug":"fake-hostel"},{"name":"DarkX","slug":"darkx"},{"name":"BangBros 18","slug":"bangbros-18"},{"name":"Holed","slug":"holed"},{"name":"FakeHub Originals","slug":"fakehub-originals"},{"name":"Cuckold Sessions","slug":"cuckold-sessions"},{"name":"Glory Hole","slug":"glory-hole"},{"name":"Casting Couch - X","slug":"casting-couch---x"},{"name":"This Girl Sucks","slug":"this-girl-sucks"},{"name":"Teen Pies","slug":"teen-pies"},{"name":"My Family Pies","slug":"my-family-pies"},{"name":"Fitness Rooms","slug":"fitness-rooms"},{"name":"Perfect Girlfriend","slug":"perfect-girlfriend"},{"name":"Net Girl","slug":"netgirl"},{"name":"PornForce","slug":"pornforce"},{"name":"Don't Break Me","slug":"dont-break-me"},{"name":"Spy Fam","slug":"spy-fam"},{"name":"Moms Teach Sex","slug":"moms-teach-sex"},{"name":"Big Tit Cream Pie","slug":"big-tit-cream-pie"},{"name":"Bang POV","slug":"bang-pov"},{"name":"Bad Milfs","slug":"bad-milfs"},{"name":"Milfed","slug":"milfed"},{"name":"My Dirty Maid","slug":"my-dirty-maid"},{"name":"Tonight’s Girlfriend","slug":"tonight’s-girlfriend"},{"name":"Mom Is Horny","slug":"momishorny"},{"name":"Naughty Office","slug":"naughty-office"},{"name":"Innocent High","slug":"innocent-high"},{"name":"Mom Comes First","slug":"mom-comes-first"},{"name":"I Have a Wife","slug":"i-have-a-wife"},{"name":"Daughter Swap","slug":"daughter-swap"},{"name":"Hentaied","slug":"hentaied"},{"name":"Fake Driving School","slug":"fake-driving-school"},{"name":"Casting Couch HD","slug":"casting-couch-hd"},{"name":"Exotic 4K","slug":"exotic-4k"},{"name":"Pinko Tgirls","slug":"pinko-tgirls"},{"name":"My First Sex Teacher","slug":"my-first-sex-teacher"},{"name":"My Babysitters Club","slug":"my-babysitters-club"},{"name":"Dirty Wives Club","slug":"dirty-wives-club"},{"name":"My Milfz","slug":"my-milfz"},{"name":"LesbianX","slug":"lesbianx"},{"name":"FreeUse Milf","slug":"freeusemilf"},{"name":"BBC Pie","slug":"bbcpie"},{"name":"ShopLyfter MYLF","slug":"shoplyfter-mylf"},{"name":"iLovePOV","slug":"ilovepov"},{"name":"Latina GirlX","slug":"latina-girlx"},{"name":"POV Life","slug":"pov-life"},{"name":"Anal Mom","slug":"analmom2"},{"name":"Beauty and the Senior","slug":"beauty-and-the-senior"},{"name":"Futanari XXX","slug":"futanari-xxx"},{"name":"Neighbor Affair","slug":"neighbor-affair"},{"name":"Public Bang","slug":"public-bang"},{"name":"Moms Bang Teens","slug":"moms-bang-teens"},{"name":"My Wife's Hot Friend","slug":"my-wifes-hot-friend"},{"name":"Mom Swap","slug":"momswap"},{"name":"21 Sextury","slug":"21-sextury"},{"name":"Shoplyfter","slug":"shoplyfter"},{"name":"Moms Lick Teens","slug":"moms-lick-teens"},{"name":"Fantasy Massage","slug":"fantasy-massage"},{"name":"MILFY","slug":"milfy"},{"name":"Adult Time Animation","slug":"adult-time-animation"},{"name":"Team Skeet Classics","slug":"teamskeetclassics"},{"name":"Lets Try Anal","slug":"lets-try-anal"},{"name":"Sensual Love","slug":"sensual-love"},{"name":"GenderX Films","slug":"genderx-films"},{"name":"Thundercock","slug":"thundercock"},{"name":"Slayed","slug":"slayed"},{"name":"Nubiles Porn","slug":"nubiles-porn.com"},{"name":"Princess Cum","slug":"princesscum.com"},{"name":"Modern Day Sins","slug":"moderndaysins"},{"name":"BFFs","slug":"bffs"},{"name":"Oldje 3some","slug":"oldje-3some"},{"name":"Titty Attack","slug":"titty-attack"},{"name":"intimatePOV","slug":"intimatepov"},{"name":"Oyeloca","slug":"oyeloca"},{"name":"Teens Love Anal","slug":"teens-love-anal"},{"name":"The Real Workout","slug":"the-real-workout"},{"name":"FreeUse Fantasy","slug":"freeusefantasy"},{"name":"Team Skeet Labs","slug":"teamskeetlabs"},{"name":"Petite POV","slug":"petite-pov"},{"name":"Caught Fapping","slug":"caught-fapping"},{"name":"Cum Fiesta","slug":"cum-fiesta"},{"name":"POV Dreams","slug":"pov-dreams"},{"name":"Bratty MILF","slug":"brattymilf"},{"name":"Perfect Fucking Strangers","slug":"perfect-fucking-strangers"},{"name":"Group Mams","slug":"group-mams"},{"name":"Perv Nana","slug":"pervnana"},{"name":"Mom Drips","slug":"mom-drips"},{"name":"BackdoorPOV","slug":"backdoorpov"},{"name":"My Girlfriend's Busty Friend","slug":"my-girlfriends-busty-friend"},{"name":"Milfty","slug":"milfty"},{"name":"Got Mylf","slug":"got-mylf"},{"name":"Super Private X","slug":"super-private-x"},{"name":"GrandparentsX","slug":"grandparentsx"},{"name":"Family Swap","slug":"familyswap"},{"name":"Seduced By A Cougar","slug":"seduced-by-a-cougar"},{"name":"My Friend's Hot Girl","slug":"my-friends-hot-girl"},{"name":"Lil Humpers","slug":"lil-humpers"},{"name":"Step Siblings","slug":"step-siblings"},{"name":"More POV","slug":"more-pov"},{"name":"AllBlackX","slug":"allblackx"},{"name":"Nubiles Casting","slug":"nubiles-casting.com"},{"name":"Perv Principal","slug":"perv-principal"},{"name":"Mylf Classics","slug":"mylf-classics"},{"name":"Parasited","slug":"parasited"},{"name":"Device Bondage (Kink)","slug":"device-bondage"},{"name":"Hogtied (Kink)","slug":"hogtied"},{"name":"Adult Time Pilots","slug":"adult-time-pilots"},{"name":"Housewife 1 on 1","slug":"housewife-1-on-1"},{"name":"Crazy College GFs","slug":"crazy-college-gfs"},{"name":"Dungeon Sex","slug":"dungeon-sex"},{"name":"Sex And Submission (Kink)","slug":"sex-and-submission"},{"name":"Kink Classics","slug":"kink-classics"},{"name":"Office POV","slug":"office-pov"},{"name":"Naughty Bookworms","slug":"naughty-bookworms"},{"name":"Mylf Selects","slug":"mylf-selects"},{"name":"ZeroTolerance","slug":"zerotolerance"},{"name":"Family Screw","slug":"family-screw"},{"name":"NASSTYx","slug":"nasstyx"},{"name":"MOFOS","slug":"mofos"},{"name":"Hot TS","slug":"hot-ts"},{"name":"Caprice Divas","slug":"caprice-divas"},{"name":"Look At Her Now","slug":"look-at-her-now"}];

const manifest = {
    id: "org.stremio.freepornmovies",
    version: "14.0.0",
    name: "Free Porn Movies (V14 Verified)",
    description: "Stable Cloudflare Worker - Verified Streams & Cached Meta",
    resources: ["catalog", "stream", "meta"],
    types: ["movie"],
    idPrefixes: ["fpm:"],
    catalogs: [
        { type: "movie", id: "fpm_latest", name: "FPM Terbaru", extra: [{ name: "genre", options: ["Anytime", "Last 3 days", "This week", "This month"] }, { name: "skip" }] },
        { type: "movie", id: "fpm_trending", name: "FPM Trending", extra: [{ name: "genre", options: ["Today", "This Week", "This Month", "All Time"] }, { name: "skip" }] },
        { type: "movie", id: "fpm_popular", name: "FPM Populer", extra: [{ name: "skip" }] }
    ]
};

validatedStudios.forEach(studio => {
    manifest.catalogs.push({ id: `s_${studio.slug}`, name: studio.name, type: 'movie', extra: [{ name: 'skip' }] });
});

async function handleCatalog(args) {
    const metas = [];
    const skip = parseInt(args.extra.skip) || 0;
    const pageNo = Math.floor(skip / 24) + 1;
    const cacheKey = `cat_${args.id}_${args.extra.genre}_${pageNo}`;

    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        let url;
        if (args.id.startsWith('s_')) {
            const slug = args.id.replace('s_', '');
            url = pageNo === 1 ? `${BASE_URL}/sites/${slug}/` : `${BASE_URL}/sites/${slug}/${pageNo}/`;
        } else if (args.id === 'fpm_latest') {
            const genre = args.extra.genre || 'Anytime';
            let path = 'latest-updates';
            if (genre === 'Last 3 days') path = 'latest-updates/3-days';
            else if (genre === 'This week') path = 'latest-updates/this-week';
            else if (genre === 'This month') path = 'latest-updates/this-month';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_trending') {
            const genre = args.extra.genre || 'Today';
            let path = 'most-popular/today';
            if (genre === 'This Week') path = 'most-popular/week';
            else if (genre === 'This Month') path = 'most-popular/month';
            else if (genre === 'All Time') path = 'most-popular/all';
            url = pageNo === 1 ? `${BASE_URL}/${path}/` : `${BASE_URL}/${path}/${pageNo}/`;
        } else if (args.id === 'fpm_popular') {
            url = pageNo === 1 ? `${BASE_URL}/most-popular/all/` : `${BASE_URL}/most-popular/all/${pageNo}/`;
        }

        if (!url) return { metas: [] };

        const response = await fetch(url, { headers: { 'User-Agent': UA } });
        const html = await response.text();
        const $ = cheerio.load(html);

        $('.list-videos .item').each((j, el) => {
            const title = $(el).find('.title').text().trim();
            const link = $(el).find('a').attr('href');
            const thumb = $(el).find('img.thumb').attr('data-src') || $(el).find('img.thumb').attr('src') || $(el).find('img').attr('data-original');
            if (link && link.includes('/videos/')) {
                const videoIdMatch = link.match(/\/videos\/([^\/]+)/);
                if (videoIdMatch) {
                    metas.push({ id: `fpm:${videoIdMatch[1]}`, type: 'movie', name: title, poster: thumb, background: thumb });
                }
            }
        });

        const result = { metas };
        cache.set(cacheKey, result);
        return result;
    } catch (e) {
        return { metas: [] };
    }
}

async function handleMeta(args) {
    const cacheKey = `meta_${args.id}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const id = args.id.replace('fpm:', '').replace('fpm_', '');
    const videoUrl = `${BASE_URL}/videos/${id}/`;
    try {
        const response = await fetch(videoUrl, { headers: { 'User-Agent': UA } });
        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('.headline h1').text().trim() || $('meta[property="og:title"]').attr('content');
        const thumb = $('meta[property="og:image"]').attr('content');
        const description = $('meta[property="og:description"]').attr('content');
        const result = {
            meta: { id: args.id, type: 'movie', name: title, poster: thumb, background: thumb, description: description }
        };
        cache.set(cacheKey, result);
        return result;
    } catch (e) {
        return { meta: { id: args.id, type: 'movie', name: 'Error' } };
    }
}

async function handleStream(args) {
    const id = args.id.replace('fpm:', '').replace('fpm_', '');
    const videoUrl = `${BASE_URL}/videos/${id}/`;
    try {
        const response = await fetch(videoUrl, { headers: { 'User-Agent': UA } });
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('.headline h1').text().trim();
        const duration = $('.duration').first().text().replace('Full Video', '').trim() || 'N/A';
        const studio = $('.btn_sponsor').first().text().trim() || 'N/A';
        const models = $('.models__item').map((i, el) => $(el).text().trim()).get().join(', ') || 'N/A';
        const tags = $('.hidden_tags .item a').map((i, el) => $(el).text().trim()).get().slice(0, 5).join(', ') || 'N/A';

        const fileMatches = html.match(/https:\/\/www\.freepornmovies\.net\/get_file\/[^\s"']+/g) || [];
        const qualities = [{ label: '4K', key: '_2160m.mp4', res: '2160p' }, { label: 'HD', key: '_720m.mp4', res: '720p' }, { label: 'SD', key: '_480m.mp4', res: '480p' }];

        const uniqueLinks = [];
        const seenQualities = new Set();
        fileMatches.forEach(link => {
            const cleanLink = link.replace(/[",]$/, '');
            const q = qualities.find(qual => cleanLink.includes(qual.key));
            if (q && !seenQualities.has(q.label)) { uniqueLinks.push({ link: cleanLink, q }); seenQualities.add(q.label); }
        });

        const streamPromises = uniqueLinks.map(async ({ link, q }) => {
            const res = await fetch(link, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': UA, 'Referer': videoUrl, 'Origin': 'https://www.freepornmovies.net' } });
            const finalUrl = res.headers.get('location') || link;
            const richTitle = `${title}\n\n📺 Res: ${q.res}\n⏱️ Dur: ${duration}\n🎬 Studio: ${studio}\n👥 Models: ${models}\n🏷️ Tags: ${tags}\n\n✅ Verified Stream | @Pongky.Ir`;
            return {
                name: `✅ FPM • ${q.label}\n${q.res}`,
                title: richTitle,
                url: finalUrl,
                behaviorHints: { proxyHeaders: { "request": { "User-Agent": UA, "Referer": videoUrl, "Origin": "https://www.freepornmovies.net" } } }
            };
        });

        const streams = await Promise.all(streamPromises);
        return { streams };
    } catch (e) {
        return { streams: [] };
    }
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === '/manifest.json' || path === '/') {
            return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const parts = path.split('/');
        const resource = parts[1];
        const type = parts[2];
        const rawId = parts[3] ? parts[3].replace('.json', '') : null;
        const id = rawId ? decodeURIComponent(rawId) : null;
        let result = { metas: [] };
        if (resource === 'catalog') result = await handleCatalog({ id, type, extra: Object.fromEntries(url.searchParams) });
        else if (resource === 'meta') result = await handleMeta({ id, type });
        else if (resource === 'stream') result = await handleStream({ id, type });
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
};
