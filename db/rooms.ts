import { env } from 'cloudflare:workers';
export function roomDb(){if(!env.DB)throw Error('Game storage is temporarily unavailable. Please try again.');return env.DB;}
