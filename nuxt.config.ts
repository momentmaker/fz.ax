// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'four-thousand weekz', // Global title
      meta: [
        { name: 'description', content: 'your life visualized in hexagons' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '4000' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', href: '/favicon-48x48.png', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href:'/site.webmanifest' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true }
})

