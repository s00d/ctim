import { defineCommand } from 'citty';
import { sharedArgs } from './_shared';
import axios from "axios";
import {getGitOwner, getGitRepo, getGitTreeName, promptForWorkflowSelection} from "./_helpers";
import HttpsProxyAgent from "https-proxy-agent";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function githubRequest(url: string, token: string, method = 'get', data: { [key: string]: any } = {}) {
    let res = await axios({
        httpsAgent: HttpsProxyAgent({host: "127.0.0.1", port: "4034", rejectUnauthorized: false}),
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
        const token = ctx.args.token || process.env.CTIM_TOKEN;
        const owner = ctx.args.owner || await getGitOwner();
        const repo = ctx.args.repo || await getGitRepo();
        const ref = ctx.args.ref || await getGitTreeName();
        let workflow_select = ctx.args.workflow.toString();

        if(!token) {
            throw new Error('token not found')
        }

        try {
            console.log('get workflow_id')
            const response = await githubRequest(
                `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
                token
            ) as { workflows: [ { id?: string, name: string, html_url: string } ] }

            const workflows = response.workflows;

            if (workflow_select === "") {
                const choices = workflows.map((wf, index) => {
                    return { title: wf.name, value: wf.name }
                });
                workflow_select = await promptForWorkflowSelection(choices);
            }


            const workflow = workflows.find((wf) => {
                return wf.name === workflow_select && wf.html_url.includes(`/blob/${ref}/`)
            });

            if (!workflow) {
                throw new Error(`Workflow with name "${ctx.args.workflow}" not found`);
            }

            const workflow_id = workflow.id ?? null;

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

            console.log('GitHub action successfully triggered.');
        } catch (error) {
            console.error(`Error triggering GitHub action: ${error}`);
            throw error;
        }
    },
});
