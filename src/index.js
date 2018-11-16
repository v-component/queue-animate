// export this package's api
import QueueAnim from './QueueAnim'

QueueAnim.install = (Vue) => {
  Vue.component(QueueAnim.name, QueueAnim)
}

export default QueueAnim
