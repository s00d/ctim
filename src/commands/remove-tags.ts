import { defineCommand } from 'citty';
import { promisify } from 'util';
import { exec } from 'child_process';
import { sharedArgs } from './_shared';

const execAsync = promisify(exec);

async function deleteTagsWithPrefix(prefix: string): Promise<void> {
    const command = `git ls-remote --tags origin | awk '{print $2}' | grep -e '^refs/tags/${prefix}' | xargs -I {} git push --delete origin {}`;
    const options = {};
    const result = await execAsync(command, options);
    console.log(result.stdout);
}

async function deleteAllTags(): Promise<void> {
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

async function getGithubLastReleaseVersion() {
    const command = 'gh release list -L50';
    const { stdout } = await execAsync(command, { encoding: 'utf8' });
    return stdout.trim().split('\n').map(release => release.replace(/\t.+/g, '')).filter((tag) => tag !== '');
}

async function deleteReleasesWithPrefix(prefix: string): Promise<void> {
    const releases = await getGithubLastReleaseVersion();
    for (const release of releases) {
        if (release.startsWith(prefix)) {
            const command = `gh release delete ${release} --yes`;
            await execAsync(command);
            console.log(`Deleted release: ${release}`);
        }
    }
}

async function deleteAllReleases(): Promise<void> {
    const releases = await getGithubLastReleaseVersion();
    console.log(releases)
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
    },
    async run(ctx) {
        const { prefix } = ctx.args;
        if (prefix) {
            await deleteTagsWithPrefix(prefix);
            if (ctx.args['with-release']) {
                await deleteReleasesWithPrefix(prefix);
            }
        } else {
            await deleteAllTags();
            if (ctx.args['with-release']) {
                await deleteAllReleases();
            }
        }
        await pushChanges();
    },
});
