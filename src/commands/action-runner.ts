import { defineCommand } from 'citty';
import { sharedArgs } from './_shared';
import axios from "axios";
import {
    createConfirmation,
    createPasswordPromt,
    getGitOwner,
    getGitRepo,
    getGitTreeName,
    promptForWorkflowSelection
} from "./_helpers";
import chalk from "chalk";
import {existsSync, readFileSync} from "fs";
// import HttpsProxyAgent from "https-proxy-agent";

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function githubRequest(url: string, token: string, method = 'get', data: { [key: string]: any } = {}) {
    let res = await axios({
        // httpsAgent: HttpsProxyAgent({host: "127.0.0.1", port: "4034", rejectUnauthorized: false}),
        method: method,
        url: url,
        headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
        },
        data: data,
    });
    return await res.data;
}

export default defineCommand({
    meta: {
        name: 'action-runner',
        description: 'This command triggers a GitHub Action in the specified repository. ' +
            'It uses the GitHub API and requires a token for authentication. ' +
            'The token can be passed as an argument or set in the CTIM_TOKEN environment variable.',
    },
    args: {
        ...sharedArgs,
        owner: {
            type: 'string',
            description: 'The owner of the repository where the action is located.',
        },
        repo: {
            type: 'string',
            description: 'The name of the repository where the action is located.',
        },
        token: {
            type: 'string',
            required: false,
            description: 'The token used for authentication. If not provided, the CTIM_TOKEN environment variable will be used.',
        },
        workflow: {
            type: 'string',
            default: '',
            description: 'The name of the event that triggers the action.',
        },
        inputs: {
            type: 'string',
            default: '',
            description: 'The name of the event that triggers the action.',
        },
        ref: {
            description: 'The name of the ref',
        },
    },
    async run(ctx) {
        let token: string|null = ctx.args.token ?? null;
        if (existsSync('.github_token')) {
            const fileContent = readFileSync('.github_token', 'utf8');
            const lines = fileContent.split('\n');
            token = lines[0] || null;
        }
        if(!token) token = process.env.CTIM_TOKEN ?? null;
        if(!token) token = await createPasswordPromt('Enter github token') ?? null;

        const owner = ctx.args.owner || await getGitOwner();
        const repo = ctx.args.repo || await getGitRepo();
        const ref = ctx.args.ref || await getGitTreeName();
        let workflow_select = ctx.args.workflow.toString();

        if(!token) {
            throw new Error('token not found')
        }

        try {
            console.info(chalk.green('Getting workflow_id from api'))
            const response = await githubRequest(
                `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
                token
            ) as { workflows: [ { id?: string, name: string, html_url: string } ] }

            const workflows = response.workflows;

            if (workflow_select === "") {
                const choices = workflows.map((wf, index) => {
                    let title = ' ' + wf.name + ' ';
                    if (wf.name.toLowerCase().includes('prod')) {
                        title = chalk.bold.bgRedBright.white(' !!!' +  title);
                    }
                    if (wf.name.toLowerCase().includes('test')) {
                        title = chalk.bgBlue.white(' ' + title + ' ');
                    }
                    return { title: title, value: wf.name }
                });
                workflow_select = await promptForWorkflowSelection(choices);
                if (!workflow_select) {
                    console.error(`Workflow not selected`);
                    return;
                }
            }

            console.info(chalk.green(`search workflow in ${ref}`))
            const workflow = workflows.find((wf) => {
                return wf.name === workflow_select && wf.html_url.includes(`/blob/${ref}/`)
            });

            if (!workflow) {
                console.error(`Workflow with name "${ctx.args.workflow}" not found`);
                return;
            }

            const workflow_id = workflow.id ?? null;

            const result = await createConfirmation(`Run "${workflow.name}"(${workflow.html_url}) action in "${ref}" tree?`)

            if (!result) {
                console.error(`Cancel`);
                return;
            }

            await githubRequest(
                `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
                token,
                'POST',
                {
                    ref: ref, // or the branch you want to use
                    inputs: ctx.args.inputs.split("&").reduce((obj, pair) => {
                        let [key, value] = pair.split("=");
                        if (value) {
                            // @ts-ignore
                            obj[key] = value;
                        }
                        return obj;
                    }, {}),
                },
            )

            console.log(`GitHub action successfully triggered.\nActions: https://github.com/${owner}/${repo}/actions\nTree: https://github.com/${owner}/${repo}/tree/${ref}`);
        } catch (error) {
            console.error(`Error triggering GitHub action: ${error}`);
            throw error;
        }
    },
});
