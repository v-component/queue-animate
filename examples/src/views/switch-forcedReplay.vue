<script>
import QueueAnim from '../../../src/index.js'
const defaultKey = [
  { key: 1 },
  { key: 2 },
  { key: 3 },
  { key: 4 },
  { key: 5 },
  { key: 6 }
]
export default {
  data () {
    return {
      childrenKey: defaultKey
    }
  },
  methods: {
    onEnter () {
      this.childrenKey = null
      this.$forceUpdate()
    },
    onLeave () {
      this.childrenKey = defaultKey
      this.$forceUpdate()
    },

    getChildren () {
      return (this.childrenKey || []).map(item => {
        return <li key={item.key}></li>
      })
    }
  },
  render () {
    const childrenToRender = this.getChildren()
    return <div>
      <h2>鼠标经过当前区域，再移出区域查看</h2>
      <p>清除所有还在动画的参素并设置切换时的初始参数</p>
      <div class="switch" onMouseenter={this.onEnter} onMouseleave={this.onLeave}>
        <QueueAnim component="ul" leaveReverse delay={[0, 300]} type="scale" forcedReplay>
          {childrenToRender}
        </QueueAnim>
        <QueueAnim component="ul" leaveReverse delay={[300, 0]} type="scale" forcedReplay>
          {childrenToRender}
        </QueueAnim>
      </div>
    </div>
  }
}
</script>

<style lang="scss">
  @import "../assets/styles/switch.scss";
</style>
