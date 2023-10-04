import { defineCommand } from 'citty';
import { sharedArgs } from './_shared';
import axios from "axios";

async function githubRequest(url: string, token: string, method = 'get', data: { [key: string]: any } = {}) {
    let res = await axios({
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
            required: true,
            description: 'The owner of the repository where the action is located.',
        },
        repo: {
            type: 'string',
            required: true,
            description: 'The name of the repository where the action is located.',
        },
        token: {
            type: 'string',
            required: false,
            description: 'The token used for authentication. If not provided, the CTIM_TOKEN environment variable will be used.',
        },
        workflow: {
            type: 'string',
            default: 'Manual Workflow',
            description: 'The name of the event that triggers the action.',
        },
        inputs: {
            type: 'string',
            default: '',
            description: 'The name of the event that triggers the action.',
        },
        ref: {
            type: 'string',
            default: 'main',
            description: 'The name of the ref',
        },
    },
    async run(ctx) {
        const token = ctx.args.token || process.env.CTIM_TOKEN;

        if(!token) {
            throw new Error('token not found')
        }

        try {
            console.log('get workflow_id')
            const response = await githubRequest(
                `https://api.github.com/repos/${ctx.args.owner}/${ctx.args.repo}/actions/workflows`,
                token
            ) as { workflows: [ { id?: string, name: string } ] }


            const workflows = response.workflows;
            const workflow = workflows.find((wf: {name: string}) => wf.name === ctx.args.workflow);

            if (!workflow) {
                throw new Error(`Workflow with name "${ctx.args.workflow}" not found`);
            }

            const workflow_id = workflow.id ?? null;

            console.log(`workflow_id - ${workflow_id}`)

            await githubRequest(
                `https://api.github.com/repos/${ctx.args.owner}/${ctx.args.repo}/actions/workflows/${workflow_id}/dispatches`,
                token,
                'POST',
                {
                    ref: ctx.args.ref, // or the branch you want to use
                    inputs: ctx.args.inputs.split("&").reduce((obj, pair) => {
                        let [key, value] = pair.split("=");
                        // @ts-ignore
                        obj[key] = value;
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
