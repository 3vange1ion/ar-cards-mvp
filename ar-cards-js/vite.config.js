import { defineConfig } from 'vite'
import { ngrok } from 'vite-plugin-ngrok'
import terminal from 'vite-plugin-terminal'

export default defineConfig({
    plugins:
        [
            ngrok('30tDE3KImQP4PibcYcgPgFta9Mp_3r6tMM6ySMsgbrJjeV9NC'),
            terminal()
        ],
    server: {
        allowedHosts: ['.ngrok-free.app']
    }
})