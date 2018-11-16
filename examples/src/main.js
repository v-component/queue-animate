import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import QueueAnim from '../../src/index'

Vue.config.productionTip = false

Vue.use(QueueAnim)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
