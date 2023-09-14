import { defineCommand } from 'citty';
import chalk from "chalk";
import { execSync } from 'child_process';
import path from "path";

const description = " top-ips - возвращает IP-адреса с наибольшим количеством запросов.\n" +
        " site-requests - возвращает количество запросов, сделанных к каждому сайту.\n" +
        " xmlrpc-requests - возвращает количество XML-RPC-запросов, сделанных.\n" +
        " top-bots - возвращает 10 наиболее часто встречающихся User-Agent значений, связанных с ботами.\n" +
        " errors-count - возвращает количество ошибок, которые произошли.\n" +
        " successful-requests - возвращает количество успешных запросов (статусные коды 2xx).\n" +
        " failed-requests - возвращает количество неудачных запросов (статусные коды 4xx или 5xx).\n" +
        " top-referrers - возвращает 10 наиболее часто встречающихся рефереров (сайтов, с которых поступили запросы).\n" +
        " top-user-agents - возвращает 10 наиболее часто встречающихся значений User-Agent (информация о браузере или клиенте).\n" +
        " response-sizes - возвращает размеры ответов (в байтах) для каждого запроса.\n" +
        " slowest-requests - возвращает 10 самых медленных запросов на основе времени ответа.\n" +
        " request-methods - возвращает количество запросов, сделанных для каждого метода HTTP.\n" +
        " request-paths - возвращает 10 наиболее часто встречающихся путей запросов (URL).\n" +
        " request-status-codes - возвращает количество запросов, сделанных для каждого статусного кода HTTP.\n";

const parserNames = Object.keys(JSON.parse(`{ "parsers": { ${description.split("\n").filter(Boolean).map(line => {
    const [name] = line.split(" - ");
    return `"${name.trim()}": {}`;
}).join(",")} }}`).parsers);

const parserString = parserNames.join("|");

function resolveFilePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return filePath;
    } else {
        const currentDirectory = process.cwd();
        return path.join(currentDirectory, filePath);
    }
}

async function processLogs(filePath: string, parser: string, count: string) {
    const resolvedFilePath = resolveFilePath(filePath);
    let command: string;

    switch (parser) {
        case 'top-ips':
            command = `awk '{print $1}' ${resolvedFilePath} | sort | uniq -c | sort -nr | head -n ${count}`;
            // command = `grep -oE "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b" ${resolvedFilePath} | sort | uniq -c | sort -rn | head -n ${count}`;
            break;
        case 'site-requests':
            command = `grep -oE "Host: [^ ]+" ${resolvedFilePath} | awk '{print $2}' | sort | uniq -c | sort -rn | head -n ${count}`;
            break;
        case 'xmlrpc-requests':
            command = `grep -c "POST /xmlrpc.php" ${resolvedFilePath} | head -n ${count}`;
            break;
        case 'top-bots':
            command = `grep -iE "bot|crawl|spider" ${resolvedFilePath} | awk '{print $12}' | sort | uniq -c | sort -rn | head -n ${count}`;
            break;
        case 'errors-count':
            command = `grep "ERROR" ${resolvedFilePath} | wc -l | head -n ${count}`;
            break;
        case 'successful-requests':
            command = `awk '{if ($9 >= 200 && $9 < 300) print}' ${resolvedFilePath} | wc -l | head -n ${count}`;
            break;
        case 'failed-requests':
            command = `awk '{if ($9 >= 400 && $9 < 600) print}' ${resolvedFilePath} | wc -l | head -n ${count}`;
            break;
        case 'top-referrers':
            command = `awk '{print $7}' ${resolvedFilePath} | sort | uniq -c | sort -rnk1 | head -n ${count}`;
            break;
        case 'top-user-agents':
            command = `awk '{print $12}' ${resolvedFilePath} | sort | uniq -c | sort -rnk1 | head -n ${count}`;
            break;
        case 'response-sizes':
            command = `awk '{print $10}' ${resolvedFilePath} | head -n ${count}`;
            break;
        case 'slowest-requests':
            command = `awk '{print $1" "$7" "$NF}' ${resolvedFilePath} | sort -kNF3 -rn | head -n ${count}`;
            break;
        case 'request-methods':
            command = `awk '{print $8}' ${resolvedFilePath} | sort | uniq -c | sort -rnk1 | head -n ${count}`;
            break;
        case 'request-paths':
            command = `awk '{print $9}' ${resolvedFilePath} | sort | uniq -c | sort -rnk1 | head -n ${count}`;
            break;
        case 'request-status-codes':
            command = `awk '{print $10}' ${resolvedFilePath} | sort | uniq -c | sort -rnk1 | head -n ${count}`;
            break;
        default:
            console.log(chalk.red('Invalid parser specified.'));
            return;
    }

    console.log(chalk.yellow(`Executing command: ${command}`));

    try {
        const result = execSync(command, { encoding: 'utf-8' });
        console.log(chalk.green('Result:'));
        console.log(chalk.white(result));
    } catch (error: any) {
        console.error(chalk.red(`Error executing command: ${error.message}`));
    }
}

export default defineCommand({
    meta: {
        name: 'logs',
        description: 'Process log files',
    },
    args: {
        file: {
            type: 'string',
            alias: 'f',
            description: 'Path to the log file',
            default: '*.access.log',
            required: true,
        },
        parser: {
            type: 'string',
            alias: 'p',
            description: description,
            default: 'top-ips',
            valueHint: parserString,
            required: true,
        },
        count: {
            type: 'string',
            alias: 'c',
            description: 'result count',
            default: '10',
        },
    },
    async run(ctx) {
        const { file, parser, count } = ctx.args;
        await processLogs(file, parser, count);
    },
});
