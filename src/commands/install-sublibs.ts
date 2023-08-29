import { defineCommand } from 'citty';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import axios from 'axios';

async function updateSublibs() {
    const packagePath = path.resolve('package.json');
    const packageParentPath = path.resolve('..', 'package.json');
    let packageFile: { [key: string]: any } | null = null;

    if (fs.existsSync(packagePath)) {
        packageFile = JSON.parse(fs.readFileSync(packagePath).toString());
    } else if (fs.existsSync(packageParentPath)) {
        packageFile = JSON.parse(fs.readFileSync(packageParentPath).toString());
    }

    if (!packageFile) {
        throw new Error('no package.json file');
    }

    const sublibs: Array<{
        owner: string;
        repo: string;
        tag: string;
        dir: string;
        name: string;
        key: string;
    }> = packageFile.sublibs ?? [];

    for (const i in sublibs) {
        const sublib = sublibs[i];

        console.log('check component: ' + sublib.name);

        if (!sublib.tag.startsWith('v')) {
            sublib.tag = `v${sublib.tag}`;
        }

        const releasePath = path.resolve(sublib.dir);
        const zipPath = path.resolve(sublib.dir, sublib.repo + '.zip');
        const newPath = path.resolve(sublib.dir, sublib.name);
        const versionFile = path.resolve(sublib.dir, sublib.name, 'version');

        if (!fs.existsSync(releasePath)) {
            fs.mkdirSync(releasePath);
        }

        if (fs.existsSync(versionFile)) {
            const version = fs.readFileSync(versionFile).toString();
            if (sublib.tag === version) {
                console.log('current version: ' + version);
                continue;
            }
        }

        console.log('updating.. ' + sublib.tag);

        const { data } = await axios.get(`https://api.github.com/repos/${sublib.owner}/${sublib.repo}/releases/tags/${sublib.tag}`, {
            headers: {
                Authorization: `token ${sublib.key}`,
            },
        });

        console.log('get repo info.. ' + data.target_commitish);

        const zipUrl = data.zipball_url;
        const fileName = path.basename(zipUrl);
        const filePath = path.join(zipPath);
        const writer = fs.createWriteStream(filePath);
        const oldPath = path.resolve(sublib.dir, `${sublib.owner}-${sublib.repo}-${data.target_commitish}`);

        console.log('download new version.. ');

        console.log(data);

        const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
            headers: {
                Authorization: `token ${sublib.key}`,
            },
        });

        let downloadedBytes = 0;
        response.data.on('data', (chunk: string) => {
            downloadedBytes += chunk.length;
            process.stdout.write(`Downloading ${fileName}: (${downloadedBytes} bytes)\r`);
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', () => {
                process.stdout.write(`\n`);
                console.log(`${fileName} downloaded successfully!`);
                resolve(true);
            });
            writer.on('error', reject);
        });

        console.log('unzip new version.. ');
        const zip = new AdmZip(zipPath);

        if (fs.existsSync(oldPath)) {
            fs.rmSync(oldPath, { recursive: true, force: true });
        }
        if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
        }

        zip.extractAllTo(releasePath, true);

        console.log('rename new version.. ');

        console.log(oldPath, newPath);

        fs.renameSync(oldPath, newPath);

        fs.appendFileSync(versionFile, sublib.tag);

        console.log('cleanup new version.. ');

        if (fs.existsSync(zipPath)) {
            fs.rmSync(zipPath, { recursive: true, force: true });
        }

        console.log('updated...');
    }
}

export default defineCommand({
    meta: {
        name: 'update-sublibs',
        description: 'Update sublibs.',
    },
    async run() {
        await updateSublibs();
    },
});
