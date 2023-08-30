import { defineCommand } from 'citty';
import { sharedArgs } from './_shared';
import type { ReleaseType } from 'semver';
import chalk from 'chalk';
import {
    createAndPushTag,
    createConfirmation, createGithubRelease,
    getGithubLastReleaseVersion,
    getGitLastReleaseVersion,
    getLastTags, isGhInstalled,
    isGitRepository, processTagName
} from "./_helpers";

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
            required: true,
            description: 'release prefix name',
        },
        type: {
            type: 'string',
            default: 'patch',
            description: 'release type (major, minor, or patch)',
        },
        'with-release': {
            type: 'string',
            description: 'create a release in GitHub',
        },
        force: {
            type: 'boolean',
            default: false,
            description: 'force the release creation',
        },
    },
    async run(ctx) {
        if (!(await isGitRepository())) {
            console.error(chalk.red('Текущая папка не является репозиторием Git.'));
            return;
        }


        const { test, version, force } = ctx.args;
        const count = parseInt(ctx.args.count);
        let name = ctx.args.name;
        const type = ctx.args.type as ReleaseType;
        const createRelease = ctx.args['with-release'];

        if (!name.endsWith('-')) {
            name += '-';
        }

        if (test) {
            name += 'test-';
        }

        try {
            let lastTag: string | null = null;
            if (version) {
                lastTag = name + version;
            } else {
                const releases = createRelease ? await getGithubLastReleaseVersion() : await getGitLastReleaseVersion();
                lastTag = await getLastTags(releases, name, type);

                if (lastTag) {
                    lastTag = name + processTagName(lastTag, count, type) ?? null;
                }
            }

            if (lastTag) {
                if (createRelease) {
                    if (await isGhInstalled()) {
                        if (await createConfirmation(`Are you sure you want to create a release ${lastTag} in GitHub?`, force)) {
                            await createGithubRelease(lastTag, createRelease, force);
                            console.log(chalk.green(`Release ${lastTag} successfully created in GitHub.`));
                        } else {
                            console.log(chalk.yellow('Release creation canceled.'));
                        }
                    } else {
                        console.error(chalk.red('The `gh` utility is not installed. Unable to create a release in GitHub.'));
                    }
                } else {
                    if (await createConfirmation(`Are you sure you want to create ${lastTag} and push the tag to Git?`, force)) {
                        await createAndPushTag(lastTag);
                        console.log(chalk.green(`Тег ${lastTag} успешно создан и запушен в Git.`));
                    } else {
                        console.log(chalk.yellow('Tag creation and push canceled.'));
                    }
                }
            } else {
                console.log(chalk.yellow(`Не найден тег с префиксом ${name}.`));
            }
        } catch (error) {
            console.error(chalk.red(error));
        }
    },
});
