<script>
import QueueAnim from '../../../src/index.js'
export default {
  render () {
    return <div style={{ height: '500px' }}>
      <QueueAnim animConfig={{ translateX: [100, 0] }}>
        <div key="1">div 1</div>
        <div key="2">div 1</div>
        <div key="3">div 1</div>
        <div key="4">div 1</div>
        <div key="5">div 1</div>
      </QueueAnim>
      <br />
      <QueueAnim ease={[[0.42, 0, 0.58, 1], [0.42, 0, 0.58, 1]]}>
        <div key="1">div 2</div>
        <div key="2">div 2</div>
        <div key="3">div 2</div>
        <div key="4">div 2</div>
        <div key="5">div 2</div>
      </QueueAnim>
    </div>
  }
}
</script>
