// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: false,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/']
    }
  },
  app: {
    baseURL: '/',
    cdnURL: '',
    head: {
      title: 'four-thousand weekz',
      meta: [
        { name: 'description', content: 'your life visualized in hexagons' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '4000' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'theme-color', content: '#F7B808' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})

