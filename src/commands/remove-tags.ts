import { defineCommand } from 'citty';
import { promisify } from 'util';
import { exec } from 'child_process';
import { sharedArgs } from './_shared';
import {createConfirmation, getGithubLastReleaseVersion} from "./_helpers";

const execAsync = promisify(exec);

async function deleteTagsWithPrefix(prefix: string, force: boolean): Promise<void> {
    if (!await createConfirmation(`Are you sure you want to delete all tags with prefix ${prefix}?`, force)) {
        return;
    }
    const command = `git ls-remote --tags origin | awk '{print $2}' | grep -e '^refs/tags/${prefix}' | xargs -I {} git push --delete origin {}`;
    const options = {};
    const result = await execAsync(command, options);
    console.log(result.stdout);
}

async function deleteAllTags(force: boolean): Promise<void> {
    if (!await createConfirmation(`Are you sure you want to delete all tags?`, force)) {
        return;
    }
    const command = 'git ls-remote --tags origin | awk \'{print $2}\' | xargs -I {} git push --delete origin {}';
    const options = {};
    const result = await execAsync(command, options);
    console.log(result.stdout);
}

async function pushChanges(): Promise<void> {
    const command = 'git push';
    const options = {};
    const result = await execAsync(command, options);
    console.log(result.stdout);
}

async function deleteReleasesWithPrefix(prefix: string, force: boolean): Promise<void> {
    if (!await createConfirmation(`Are you sure you want to delete all releases with prefix ${prefix}?`, force)) {
        return;
    }
    const releases = await getGithubLastReleaseVersion();
    for (const release of releases) {
        if (release.startsWith(prefix)) {
            const command = `gh release delete ${release} --yes`;
            await execAsync(command);
            console.log(`Deleted release: ${release}`);
        }
    }
}

async function deleteAllReleases(force: boolean): Promise<void> {
    if (!await createConfirmation(`Are you sure you want to delete all releases?`, force)) {
        return;
    }
    const releases = await getGithubLastReleaseVersion();
    for (const release of releases) {
        const command = `gh release delete ${release} --yes`;
        await execAsync(command);
        console.log(`Deleted release: ${release}`);
    }
}

export default defineCommand({
    meta: {
        name: 'remove-tags',
        description: 'remove all git tags',
    },
    args: {
        ...sharedArgs,
        'with-release': {
            type: 'boolean',
            description: 'remove a release in GitHub',
        },
        prefix: {
            type: 'string',
            description: 'prefix for tags/releases to be deleted',
        },
        force: {
            type: 'boolean',
            default: false,
            description: 'force the release creation',
        },
    },
    async run(ctx) {
        const { prefix, force } = ctx.args;
        if (prefix) {
            await deleteTagsWithPrefix(prefix, force);
            if (ctx.args['with-release']) {
                await deleteReleasesWithPrefix(prefix, force);
            }
        } else {
            await deleteAllTags(force);
            if (ctx.args['with-release']) {
                await deleteAllReleases(force);
            }
        }
        await pushChanges();
    },
});
