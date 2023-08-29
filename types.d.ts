/* eslint-disable no-var */

declare global {
    var __ctm_cli__:
        | undefined
        | {
        entry: string
        startTime: number
    }
}

export {}
