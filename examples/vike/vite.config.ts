import react from '@vitejs/plugin-react'
import ssr from 'vike/plugin'
import { UserConfig } from 'vite'
import { vavite } from "vavite";
import {standalone} from "vite-plugin-standalone"
const config: UserConfig = {
	buildSteps: [
		{ name: "client" },
		{
			name: "server",
			config: {
				build: { ssr: true },
			},
		},
	],

	plugins: [
		vavite({
			serverEntry: "/server/index.ts",
			serveClientAssetsInDev: true,
		}),
		react(),
		ssr({ disableAutoFullBuild: true }),
    standalone()
	],
}

export default config
