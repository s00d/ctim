import type { CommandDef } from 'citty'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
    release: () => import('./release').then(_rDefault),
    'install-locales': () => import('./install-locales').then(_rDefault),
    'install-sublibs': () => import('./install-sublibs').then(_rDefault),
    'remove-tags': () => import('./remove-tags').then(_rDefault),
    'action-runner': () => import('./action-runner').then(_rDefault),
} as const
