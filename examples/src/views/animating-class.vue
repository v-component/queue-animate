<script>
import QueueAnim from '../../../src/index.js'
export default {
  data () {
    return {
      items: [{
        children: '依次进入1',
        key: 1
      }, {
        children: '依次进入2',
        key: 2
      }, {
        children: '依次进入3',
        key: 3
      }, {
        children: '依次进入4',
        key: 4
      }, {
        children: '依次进入5',
        key: 5
      }, {
        children: '依次进入6',
        key: 6
      }]
    }
  },
  methods: {
    removeAll () {
      this.items = []
    }
  },
  render () {
    return <div>
      <QueueAnim>
        {this.items.map((item) => <div key={item.key}>
          {item.children}
        </div>)}
      </QueueAnim>
      <button onClick={this.removeAll}>移出所有</button>
    </div>
  }
}
</script>
<style lang="scss" scoped>
  @import "../assets/styles/animating-class.scss";
</style>
