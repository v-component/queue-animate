import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/animating-class',
      name: 'animating-class',
      component: () => import('./views/animating-class.vue')
    },
    {
      path: '/appear',
      name: 'appear',
      component: () => import('./views/appear.vue')
    },
    {
      path: '/custom-ease',
      name: 'custom-ease',
      component: () => import('./views/custom-ease.vue')
    },
    {
      path: '/switch-forcedReplay',
      name: 'switch-forcedReplay',
      component: () => import('./views/switch-forcedReplay.vue')
    }
  ]
})
