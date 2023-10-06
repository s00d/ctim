import {promisify} from "util";
import {exec, ExecSyncOptionsWithStringEncoding} from "child_process";
import chalk from "chalk";
import {inc, parse, ReleaseType, rsort, valid} from "semver";
import prompts from 'prompts';

export const execAsync = promisify(exec);

export async function createConfirmation(message: string, force: boolean = false): Promise<boolean> {
    if (force) {
        return true;
    }

    const response = await prompts({
        type: 'toggle',
        name: 'toggle',
        message: chalk.yellow(`${message} (y/n)`),
        initial: false,
        active: 'yes',
        inactive: 'no'
    });
    return response.toggle;
}

export async function isGitRepository(): Promise<boolean> {
    const command = 'git rev-parse --is-inside-work-tree';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        await execAsync(command, options);
        return true;
    } catch (error) {
        return false;
    }
}

export async function getGitOwner() {
    const command = 'git remote get-url origin';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        const repoUrl =  (await execAsync(command, options)).stdout.replace("\n", '');
        const match = repoUrl.match(/github\.com[/:](.*?)\/(.*?)(\.git)?$/);
        return match ? match[1] ?? null : null;
    } catch (error) {
        return null;
    }
}

export async function getGitRepo() {
    const command = 'git remote get-url origin';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        const repoUrl =  (await execAsync(command, options)).stdout.replace("\n", '');
        const match = repoUrl.match(/github\.com[/:](.*?)\/(.*?)(\.git)?$/);
        return match ? match[2] ?? null : null;
    } catch (error) {
        return null;
    }
}

export async function getGitTreeName() {
    const command = 'git rev-parse --abbrev-ref HEAD';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        return (await execAsync(command, options)).stdout.replace("\n", '');
    } catch (error) {
        return null;
    }
}

export async function isGhInstalled(): Promise<boolean> {
    const command = 'gh --version';
    const options: ExecSyncOptionsWithStringEncoding = { encoding: 'utf8' };
    try {
        await execAsync(command, options);
        return true;
    } catch (error) {
        return false;
    }
}

// Function to create a release using `gh` utility
export async function createGithubRelease(tagName: string, tree: string, force: boolean): Promise<void> {
    const command = `gh release create ${tagName} --target ${tree}${force ? ' --force' : ''}`;
    const options = {};
    try {
        const result = await execAsync(command, options);
        console.log(result.stdout);
    } catch (error: any) {
        console.error(chalk.red('Ошибка при создании релиза:'), error.message);
    }
}

export async function getGithubLastReleaseVersion() {
    const command = 'gh release list -L50';
    const { stdout } = await execAsync(command, { encoding: 'utf8' });
    return stdout.trim().split('\n').map(release => release.replace(/\t.+/g, ''));
}

export async function getGitLastReleaseVersion() {
    const command = 'git for-each-ref --count=50 --sort=-taggerdate --format="%(refname:short)" refs/tags';
    const { stdout } = await execAsync(command, { encoding: 'utf8' });
    return stdout.trim().split('\n');
}

// Функция для получения последних 50 тегов в Git
export async function getLastTags(releases: string[], name: string, releaseType: ReleaseType): Promise<string> {
    const tags = releases.filter(tag => tag.startsWith(name)).map(tag => tag.slice(name.length));
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
    } else if (releaseType === 'prerelease') {
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
export async function createAndPushTag(newTag: string): Promise<void> {
    const createTagCommand = `git tag ${newTag}`;
    const pushTagsCommand = 'git push --tags';
    const options = {};
    await execAsync(createTagCommand, options);
    await execAsync(pushTagsCommand, options);
}

// Функция для обработки имени тега и добавления +1
export function processTagName(tagName: string, count: number, releaseType: ReleaseType): string | undefined {
    const regex = new RegExp(`^(\\d+\\.\\d+\\.\\d+)(?:-(alpha|beta|rc)\\.(\\d+))?`);
    const match = tagName.match(regex);

    if (match) {
        const currentVersion = match[1];
        const currentReleaseType = match[2];
        const currentReleaseNumber = match[3] ? parseInt(match[3], 10) : 0;

        const parsedVersion = parse(currentVersion);
        if (!parsedVersion) {
            console.error(chalk.red('Неверный формат версии.'));
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
            console.error(chalk.red('Неверный тип обновления.'));
            return;
        }

        if (incrementedReleaseType) {
            return `${incrementedVersion}-${incrementedReleaseType}.${incrementedReleaseNumber}`;
        } else {
            return `${incrementedVersion}`;
        }
    }

    console.error(chalk.red('Неверный формат имени тега.'));
}

export async function promptForWorkflowSelection(choices: Array<{ title: string, value: string|number }>) {
    const response = await prompts({
        type: 'select',
        name: 'workflowIndex',
        message: 'Select a workflow:',
        choices: choices
    });

    return response.workflowIndex;
}
