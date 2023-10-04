import {defineCommand} from 'citty';
import {sharedArgs} from './_shared';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as crypto from 'crypto';

const algorithm = 'md5';

interface FileChecksum {
    sum: string;
    file: string;
}

function calculateChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash(algorithm.toLowerCase()).update(content).digest('hex');
}

function readChecksumFile(filePath: string): Record<string, string> {
    const expectedSums: Record<string, string> = {};
    const sumFileContent = fs.readFileSync(filePath, 'utf-8');
    const sumLines = sumFileContent.trim().split('\n');

    for (const line of sumLines) {
        const [sum, file] = line.split(' ');
        expectedSums[file] = sum;
    }

    return expectedSums;
}

function getFilesChecksums(dir: string): FileChecksum[] {
    const fileChecksums: FileChecksum[] = [];

    function traverseDirectory(dir: string) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = `${dir}/${file}`;
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                traverseDirectory(filePath);
            } else if (stat.isFile()) {
                const sum = calculateChecksum(filePath);
                fileChecksums.push({sum, file: filePath});
            }
        }
    }

    traverseDirectory(dir);
    return fileChecksums;
}

export default defineCommand({
    meta: {
        name: 'dump',
        description: 'This command needs to backup and check types'
    },
    args: {
        ...sharedArgs,
        type: {
            type: 'string',
            default: 'backup',
            description:
                'The type of operation to perform. Available options: backup, create-hash, check-hash.',
            valueHint: 'backup|create-hash|check-hash',
        },
        database: {
            type: 'string',
            description: 'The name of the database to perform the backup operation.',
        },
        outputDir: {
            type: 'string',
            default: '/root/dump',
            description: 'The output directory for the backup files.',
        },
        outputFile: {
            type: 'string',
            default: 'sum.txt',
            description: 'The name of the output file for storing checksums.',
        },
    },
    async run(ctx) {
        const type = ctx.args.type;
        const database = ctx.args.database;
        const outputDir = ctx.args.outputDir;
        const outputFile = ctx.args.outputFile;

        switch (type) {
            case 'backup':
                if (!database) {
                    throw new Error('database parameter not found')
                }
                // Получаем список таблиц в базе данных
                const tablesOutput = execSync(`mysql -D ${database} -e "SHOW TABLES;"`).toString();
                const tables = tablesOutput
                    .split('\n')
                    .slice(1)
                    .filter(Boolean);

                fs.rmSync(`${outputDir}/*.sql.gz`);

                // Проходим по каждой таблице и создаем команду для дампа
                for (const table of tables) {
                    const outputFilePath = `${outputDir}/${table}.sql.gz`;

                    const tableSizeBytesOutput = execSync(
                        `mysql -D ${database} -e "SELECT SUM(DATA_LENGTH + INDEX_LENGTH) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${database}' AND TABLE_NAME = '${table}';"`
                    ).toString();
                    const tableSizeBytes = parseInt(tableSizeBytesOutput.split('\n')[1], 10);
                    const tableSizeMb = Math.floor(tableSizeBytes / 1024 / 1024);

                    console.log(`Начат дамп таблицы: ${table}`);
                    console.log(`Имя файла: ${outputFilePath}`);
                    console.log(`Размер таблицы: ${tableSizeMb}MB`);
                    console.log('-----------------------------');

                    const command = `mysqldump ${database} ${table} --disable-keys | gzip | pv -s ${tableSizeBytes} > ${outputFilePath}`;
                    execSync(command);

                    console.log('-----------------------------');
                    console.log(`Дамп таблицы ${table} завершен`);
                }
                return;
            case 'create-hash':
                const fileChecksums = getFilesChecksums(outputDir);

                const sumContent = fileChecksums.map(({sum, file}) => `${sum} ${file}`).join('\n');
                console.log(sumContent)
                fs.writeFileSync(outputFile, sumContent);

                console.log('Хеш-суммы файлов записаны в sum.txt');
                return;
            case 'check-hash':
                const checksums = getFilesChecksums(outputDir);
                const expectedSums = readChecksumFile(outputFile);
                for (const {sum, file} of checksums) {
                    if (expectedSums[file]) {
                        if (sum === expectedSums[file]) {
                            console.log(`Хеш-сумма для файла ${file} совпадает.`);
                        } else {
                            console.log(`Хеш-сумма для файла ${file} не совпадает.`);
                        }
                    } else {
                        console.log(`Файл ${file} не найден в sum.txt.`);
                    }
                }
                return;
            default:

        }
    }

});
