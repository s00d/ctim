import { defineCommand } from 'citty';
import { sharedArgs } from './_shared';
import {execSync} from "child_process";

function runCommand(command: string) {
    try {
        return execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error running command "${command}": ${error}`);
        throw error;
    }
}

export default defineCommand({
    meta: {
        name: 'nuxt-build',
        description: 'Create a new release.',
    },
    args: {
        ...sharedArgs,
        version: {
            type: 'string',
            description: 'new version release',
        },
        force: {
            type: 'boolean',
            default: false,
            description: 'force the release creation',
        },
    },
    async run(ctx) {
        const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD').toString().trim();

        runCommand('yarn install-sublibs');
        runCommand('yarn install --immutable');

        if (currentBranch === 'main') {
            runCommand('yarn run install-locales');
        } else if (currentBranch === 'dev') {
            runCommand('yarn run install-locales virtual-test-server.on-mail.ru');
        }

        runCommand('yarn run build');
        runCommand('rm -rf node_modules');
        runCommand("sed -i '/\\/\\.nuxt/d' .gitignore && sed -i '/\\.nuxt/d' .gitignore");
        runCommand("sed -i '/\\/\\.env/d' .gitignore && sed -i '/\\.env/d' .gitignore");

        runCommand('git add -A');
        runCommand('git commit -m "Release build"');
        runCommand(`git push origin deploy-${currentBranch}`);
    },
});
