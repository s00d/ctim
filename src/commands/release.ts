import {defineCommand} from 'citty'
import {sharedArgs} from './_shared'
import {exec, ExecSyncOptionsWithStringEncoding} from 'child_process';
import { rsort, valid, inc, parse } from 'semver';
import type { ReleaseType } from 'semver';
import {promisify} from 'util';


const execAsync = promisify(exec);

async function isGitRepository(): Promise<boolean> {
    const command = 'git rev-parse --is-inside-work-tree';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        await execAsync(command, options);
        return true;
    } catch (error) {
        return false;
    }
}
// Функция для получения последних 50 тегов в Git
async function getLastTags(name: string, releaseType: ReleaseType): Promise<string> {
    const command = 'git for-each-ref --count=50 --sort=-taggerdate --format="%(refname:short)" refs/tags';
    const { stdout } = await execAsync(command, { encoding: 'utf8' });
    const tags = stdout.trim().split('\n').filter(tag => tag.startsWith(name)).map(tag => tag.slice(name.length));
    const validTags = tags.filter((tag) => valid(tag));

    if (releaseType === 'major') {
        const majorTags = validTags.filter(tag => parse(tag)?.major !== null);
        if (majorTags.length > 0) {
            rsort(majorTags);
            return majorTags[0];
        }
    } else if (releaseType === 'minor') {
        const minorTags = validTags.filter(tag => parse(tag)?.minor !== null);
        if (minorTags.length > 0) {
            rsort(minorTags);
            return minorTags[0];
        }
    } else if (releaseType === 'patch') {
        const patchTags = validTags.filter(tag => parse(tag)?.patch !== null);
        if (patchTags.length > 0) {
            rsort(patchTags);
            return patchTags[0];
        }
    }  else if (releaseType === 'prerelease') {
        const patchTags = validTags.filter(tag => parse(tag)?.prerelease !== null);
        if (patchTags.length > 0) {
            rsort(patchTags);
            return patchTags[0];
        }
    }

    rsort(validTags);
    return validTags[0];
}


// Функция для создания нового тега и пуша его в Git
function createAndPushTag(newTag: string): void {
    const createTagCommand = `git tag ${newTag}`;
    const pushTagsCommand = 'git push --tags';
    const options = { };
    execAsync(createTagCommand, options);
    execAsync(pushTagsCommand, options);
}

// Функция для обработки имени тега и добавления +1
function processTagName(tagName: string, count: number, releaseType: ReleaseType): string | undefined {
    const regex = new RegExp(`^(\\d+\\.\\d+\\.\\d+)(?:-(alpha|beta|rc)\\.(\\d+))?$`);
    const match = tagName.match(regex);

    if (match) {
        const currentVersion = match[1];
        const currentReleaseType = match[2];
        const currentReleaseNumber = match[3] ? parseInt(match[3], 10) : 0;

        const parsedVersion = parse(currentVersion);
        if (!parsedVersion) {
            console.error('Неверный формат версии.');
            return;
        }

        let incrementedVersion: string;
        let incrementedReleaseType: string;
        let incrementedReleaseNumber: number;

        if (releaseType === 'major') {
            incrementedVersion = inc(parsedVersion, 'major') || '';
            incrementedReleaseType = '';
            incrementedReleaseNumber = 0;
        } else if (releaseType === 'minor') {
            incrementedVersion = inc(parsedVersion, 'minor') || '';
            incrementedReleaseType = '';
            incrementedReleaseNumber = 0;
        } else if (releaseType === 'patch') {
            incrementedVersion = inc(parsedVersion, 'patch') || '';
            incrementedReleaseType = '';
            incrementedReleaseNumber = 0;
        } else if (releaseType === 'prerelease') {
            if (parse(currentVersion)?.prerelease.length === 0) {
                incrementedVersion = inc(currentVersion, 'patch') || '';
            } else {
                incrementedVersion = currentVersion;
            }
            incrementedReleaseType = 'alpha';
            incrementedReleaseNumber = currentReleaseType === 'alpha' ? currentReleaseNumber + count : 1;
        } else {
            console.error('Неверный тип обновления.');
            return;
        }


        if (incrementedReleaseType) {
            return `${incrementedVersion}-${incrementedReleaseType}.${incrementedReleaseNumber}`;
        } else {
            return `${incrementedVersion}`;
        }
    }

    console.error('Неверный формат имени тега.');
}




export default defineCommand({
    meta: {
        name: 'release',
        description: 'Create a new release.',
    },
    args: {
        ...sharedArgs,
        version: {
            type: 'string',
            description: 'new version release',
        },
        count: {
            type: 'string',
            default: '1',
            description: 'count release',
        },
        test: {
            type: 'boolean',
            description: 'test release',
        },
        name: {
            type: 'string',
            required: true
        },
        type: {
            type: 'string',
            default: 'patch',
            description: 'release type (major, minor, or patch)',
        },
    },
    async run(ctx) {
        if (!await isGitRepository()) {
            console.error('Текущая папка не является репозиторием Git.');
            return;
        }

        const count = parseInt(ctx.args.count)
        const test = ctx.args.test
        const version = ctx.args.version
        let name = ctx.args.name
        const type = ctx.args.type as ReleaseType;

        if (!name.endsWith('-')) {
            name += '-'
        }

        if (test) {
            name += 'test-'
        }

        try {
            let lastTag: string|null = null;
            if (version) {
                lastTag = name + version;
            } else {
                lastTag = await getLastTags(name, type);

                if (lastTag) {
                    lastTag = name + processTagName(lastTag, count, type) ?? null;
                }
            }

            if (lastTag) {
                createAndPushTag(lastTag);
                console.log(`Тег ${lastTag} успешно создан и запушен в Git.`);
            } else {
                console.log(`Не найден тег с префиксом ${name}.`);
            }
        } catch (error) {
            console.error(error);
        }
    },
})
