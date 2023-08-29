import {defineCommand} from 'citty'
import {sharedArgs} from './_shared'
import { ofetch } from "ofetch";
import path from "path";
import {promises as fs, existsSync, mkdirSync} from "fs";



async function downloadLocales(host: string) {
    console.debug(`Load available locales: https://${host}/api/v1/locales`);
    const res = await ofetch(`https://${host}/api/v1/locales`);

    console.debug('locales:', JSON.stringify(Object.keys(res)));
    return Object.keys(res);
}

async function downloadTranslation(host: string, dir: string, locale: string) {
    const filename = path.join(process.cwd(), `${dir}/${locale}.json`);
    const url = `https://${host}/ui/api/getLocales?lang=${locale}`;

    console.log(`refresh locale: ${locale}\n - URL: ${url}`);

    try {
        const response = await ofetch(url, {
            parseResponse: (txt) => txt,
            async onResponseError({ request, response, options }) {
                // Log error
                console.error(
                    "[fetch response error]",
                    request,
                    response.status,
                    response.body
                );

                throw new Error(`BAS_STATUS: ${response.status}`);
            },
        });

        const directory = path.dirname(filename);
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }

        await fs.writeFile(filename, response);

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
        ...sharedArgs,
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
    },
    async run(ctx) {
        const host = ctx.args.host
        const dir = ctx.args.dir
        const locales = await downloadLocales(host);

        for (let i = 0; i <= locales.length - 1; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await downloadTranslation(host, dir, locales[i]);
        }
    },
})
