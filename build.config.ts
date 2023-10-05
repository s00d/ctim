import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    rollup: {
        inlineDependencies: true,
        resolve: {
            exportConditions: ['production', 'node'] as any,
        },
    },
    entries: ['src/index'],
    externals: [
        '@nuxt/test-utils',
        'fsevents',
        'node:url',
        'node:buffer',
        'node:path',
        'node:child_process',
        'node:string_decoder',
        'node:readable-stream',
        'node:process',
        'node:path',
        'node:os',
        'node:util',
        'node:readline',
    ],
})
