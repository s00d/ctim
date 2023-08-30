import { defineCommand } from 'citty';
import axios from 'axios';
import path from 'path';
import { promises as fs, existsSync, mkdirSync } from 'fs';

async function downloadLocales(host: string, localesRoute: string) {
    console.log(`Load available locales: https://${host}${localesRoute}`);
    const res = await axios.get(`https://${host}${localesRoute}`);

    console.log('locales:', JSON.stringify(Object.keys(res.data)));
    return Object.keys(res.data);
}

async function downloadTranslation(host: string, localeRoute: string, dir: string, locale: string) {
    const filename = path.join(process.cwd(), `${dir}/${locale}.json`);
    const url = `https://${host}${localeRoute}?lang=${locale}`;

    console.log(`refresh locale: ${locale}\n - URL: ${url}`);

    try {
        const response = await axios.get(url, {
            responseType: 'text',
            validateStatus: (status) => status >= 200 && status < 300,
        });

        const directory = path.dirname(filename);
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }

        await fs.writeFile(filename, response.data);

        const stats = await fs.stat(filename);
        const fileSizeInBytes = stats.size;
        console.log(`\nlocale size: ${fileSizeInBytes}`);

        if (fileSizeInBytes < 10000) {
            throw new Error(`BAS_SIZE: ${fileSizeInBytes}`);
        }
    } catch (error) {
        console.error(`Error fetching URL: ${url}`);
        console.error(error);
        process.exit(1);
    }
}

export default defineCommand({
    meta: {
        name: 'install-locales',
        description: 'install locales.',
    },
    args: {
        host: {
            type: 'string',
            required: true,
            description: 'The host to fetch locales from.',
        },
        dir: {
            type: 'string',
            default: '../src/lang',
            description: 'The directory to save the downloaded locales.',
        },
        localesRoute: {
            type: 'string',
            default: '/api/v1/locales',
            description: 'url to download locales',
        },
        localeRoute: {
            type: 'string',
            default: '/ui/api/getLocales',
            description: 'url to download locale',
        },
    },
    async run(ctx) {
        const { host, dir, localesRoute, localeRoute  } = ctx.args;
        const locales = await downloadLocales(host, localesRoute);

        for (let i = 0; i <= locales.length - 1; i += 1) {
            await downloadTranslation(host, localeRoute, dir, locales[i]);
        }
    },
});
