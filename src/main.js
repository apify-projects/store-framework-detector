import { Actor } from 'apify';
import { KeyValueStore, BasicCrawler, log, Dataset } from 'crawlee';
import Wappalyzer from 'wappalyzer';
// eslint-disable-next-line import/no-extraneous-dependencies
import proxyChain from 'proxy-chain';

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

    const crawler = new BasicCrawler({
        async requestHandler({ request }) {
            const { url } = request;
            try {
                const proxy = await proxyConfiguration.newUrl();
                // pptr proxy fix
                const newProxyUrl = await proxyChain.anonymizeProxy(proxy);
                const wappalyzer = new Wappalyzer({ proxy: newProxyUrl });
                await wappalyzer.init({ timeout: 60000 });

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

    await crawler.run(input.startUrls);
});
