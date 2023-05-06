import { Actor } from 'apify';
import { RequestQueue, RequestList, KeyValueStore, BasicCrawler, log, Dataset } from 'crawlee';
import Wappalyzer from 'wappalyzer';
// eslint-disable-next-line import/no-extraneous-dependencies
import proxyChain from 'proxy-chain';

const fromStartUrls = async function* (startUrls, name = 'STARTURLS') {
    const rl = await RequestList.open(name, startUrls);

    let rq;
    // eslint-disable-next-line no-cond-assign
    while (rq = await rl.fetchNextRequest()) {
        yield rq;
    }
};

Actor.main(async () => {
    const input = await KeyValueStore.getInput();
    const {
        proxyConfig = { useApifyProxy: true },
        debugLog,
    } = input;

    if (debugLog) {
        log.setLevel(log.LEVELS.DEBUG);
    }

    const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

    // support files as URL sources
    const requestQueue = await RequestQueue.open();
    for await (const req of fromStartUrls(input.startUrls)) {
        await requestQueue.addRequest(req);
    }
    
    const crawler = new BasicCrawler({
        requestQueue,
        async requestHandler({ request }) {
            const { url } = request;
            try {
                const proxy = await proxyConfiguration.newUrl();
                // pptr proxy fix
                const newProxyUrl = await proxyChain.anonymizeProxy(proxy);
                const wappalyzer = new Wappalyzer({
                    debug: false, // Output debug messages
                    delay: 0, // Wait for ms milliseconds between requests
                    headers: {}, // Extra header to send with requests
                    maxDepth: 1, // Don't analyse pages more than num levels deep
                    maxUrls: 1, // Exit when num URLs have been analysed
                    maxWait: 60000, // Wait no more than ms milliseconds for page resources to load
                    recursive: false, // Follow links on pages (crawler)
                    probe: true, // Perform a deeper scan by performing additional requests and inspecting DNS records
                    proxy: newProxyUrl,
                    htmlMaxCols: 2000, // Limit the number of HTML characters per line processed
                    htmlMaxRows: 3000, // Limit the number of HTML lines processed
                    noScripts: false, // Disabled JavaScript on web pages
                    noRedirect: false, // Disable cross-domain redirects
                });
                await wappalyzer.init();

                // Optionally set additional request headers
                const headers = {};
                const site = await wappalyzer.open(url, headers);
                // Optionally capture and output errors
                site.on('error', log.error);
                const results = await site.analyze();
                const error = Object.values(results.urls)?.[0]?.error;
                if (error) {
                    throw new Error(error);
                }
                const counter = results?.technologies?.length;
                log.info(`[DONE]: ${url} with ${counter} results`);
                await wappalyzer.destroy();
                if (!counter) {
                    return;
                }
                const saveData = results.technologies.map((x) => {
                    return {
                        url,
                        ...x,
                        slug: undefined,
                        icon: undefined,
                        version: x.version || undefined,
                        cpe: x.cpe || undefined,
                        categories: x?.categories?.map((c) => c.name) || undefined,
                    };
                });
                await Dataset.pushData(saveData);
            } catch (error) {
                log.error(error);
            }
        },
    });

    await crawler.run();
});
