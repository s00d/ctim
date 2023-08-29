import {defineCommand} from 'citty'
import {sharedArgs} from './_shared'
import {exec, ExecSyncOptionsWithStringEncoding} from 'child_process';

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
async function getLastTags(): Promise<string[]> {
    const command = 'git for-each-ref --count=50 --sort=-taggerdate --format="%(refname:short)" refs/tags';
    const { stdout } = await execAsync(command, {  encoding: 'utf8' });
    return stdout.trim().split('\n');
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
function processTagName(tagName: string, releasePrefix: string, count: number): string | undefined {
    const regex = new RegExp(`^${releasePrefix}(\\d+\\.\\d+\\.\\d+)$`);
    const match = tagName.match(regex);

    if (match) {
        const currentVersion = match[1];
        const versionParts = currentVersion.split('.');
        const incrementedVersion = versionParts.map((part) => parseInt(part, 10) + count).join('.');
        return `${releasePrefix}${incrementedVersion}`;
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
    },
    async run(ctx) {
        console.log(111, 222)

        if (!await isGitRepository()) {
            console.error('Текущая папка не является репозиторием Git.');
            return;
        }

        const count = parseInt(ctx.args.count)
        const test = ctx.args.test
        const version = ctx.args.version
        let name = ctx.args.name

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
                const tags = await getLastTags();
                lastTag = tags.find((tag) => tag.startsWith(name)) ?? null;
            }

            if (lastTag) {
                const newTag = processTagName(lastTag, name, count);
                if (newTag) {
                    createAndPushTag(newTag);
                    console.log(`Тег ${newTag} успешно создан и запушен в Git.`);
                }
            } else {
                console.log(`Не найден тег с префиксом ${name}.`);
            }
        } catch (error) {
            console.error(error);
        }
    },
})
