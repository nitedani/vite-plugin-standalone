/// <reference types="vite/client" />

import { importPKCS8 } from 'jose'

async function main() {
    const key = await importPKCS8('-----BEGIN PRIVATE KEY-----...', 'ES256')
    console.log(key)
}

main().catch(console.error)