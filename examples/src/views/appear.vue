<script>
import QueueAnim from '../../../src/index.js'
export default {
  render () {
    console.log(this)
    return <QueueAnim appear={false}>
      <div key="1">依次进入</div>
      <div key="2">依次进入</div>
      <div key="3">依次进入</div>
      <div key="4">依次进入</div>
      <div key="5">依次进入</div>
    </QueueAnim>
  }
}
</script>
