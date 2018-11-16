import PropTypes from 'vc-util/es/vue-types'
import { initDefaultProps } from 'vc-util/es/propsutil'
import Mixins from 'vc-util/es/BaseMixin'
import TweenOne, { ticker } from 'vc-tween-one'
import {
  findChildInChildrenByKey,
  mergeChildren,
  transformArguments,
  getChildrenFromProps
} from './utils'
import AnimTypes from './animTypes'

const noop = () => {
}

const typeDefault = ['displayName', 'propTypes', 'getDefaultProps',
  'defaultProps', 'childContextTypes', 'contextTypes']

const defaultProps = {
  children: PropTypes.any,
  component: PropTypes.any,
  componentProps: PropTypes.object,
  interval: PropTypes.any,
  duration: PropTypes.any,
  delay: PropTypes.any,
  type: PropTypes.any,
  animConfig: PropTypes.any,
  ease: PropTypes.any,
  leaveReverse: PropTypes.bool,
  forcedReplay: PropTypes.bool,
  animatingClassName: PropTypes.array,
  onEnd: PropTypes.func,
  appear: PropTypes.bool
}

export default {
  name: 'QueueAnim',
  mixins: [Mixins],
  props: initDefaultProps(defaultProps, {
    component: 'div',
    componentProps: {},
    interval: 100,
    duration: 450,
    delay: 0,
    type: 'right',
    animConfig: null,
    ease: 'easeOutQuart',
    leaveReverse: false,
    forcedReplay: false,
    animatingClassName: ['queue-anim-entering', 'queue-anim-leaving'],
    onEnd: noop,
    appear: true
  }),
  data () {
    const children = getChildrenFromProps(this)
    const childrenShow = {}
    const keysToEnter = []
    children.forEach(child => {
      if (!child || !child.key) {
        return
      }
      if (this.$props.appear) {
        keysToEnter.push(child.key)
      } else {
        childrenShow[child.key] = true
      }
    })
    return {
      /**
     * @param oneEnter
     * 记录第一次进入;
     */
      oneEnter: false,
      /**
     * @param tweenToEnter;
     * 记录强制切换时是否需要添加 animation;
     * 如 enter 后, leave -> enter，样式是没有发生变化，就不需要添加 animation 属性。
     */
      tweenToEnter: {},
      /**
     * @param leaveUnfinishedChild;
     * 记录多次切换，出场没完成动画的 key。
     */
      leaveUnfinishedChild: [],
      /**
     * @param saveTweenOneTag;
     * 记录 TweenOne 标签，在 leaveUnfinishedChild 里使用，残留的元素不需要考虑 props 的变更。
     */
      saveTweenOneTag: {},
      /**
     * @param unwantedStart;
     * 记录 animation 里是否需要 startAnim;
     * 修复进场时, 时间不准的问题；
     * -> 进: 需要；
     * -> 进 -> 进: 需要；
     * -> 进 -> 出: 不需要;
     * -> 进 -> 出 -> 进: 不需要;
     */
      unwantedStart: {},
      /**
     * @param keysToEnter;
     * 记录进场的 key;
     */
      keysToEnter,
      /**
     * @param keysToLeave;
     * 记录出场的 key;
     */
      keysToLeave: [],
      /**
     * @param keysToEnterPaused;
     * 记录在进入时是否处理暂停状态
     */
      keysToEnterPaused: {},
      /**
     * @param placeholderTimeoutIds;
     * 进场时 deley 的 timeout 记录;
     */
      placeholderTimeoutIds: {},
      keysToEnterToCallback: [...keysToEnter],
      originalChildren: getChildrenFromProps(this),
      childrens: children,
      childrenShow,
      isQueueAnim: true
    }
  },
  watch: {
    '$slots': {
      handler: function (nextProps) {
        console.log(nextProps)
      },
      deep: true
    },
    '$props': {
      handler: function (nextProps) {
        this.handleUpdate(nextProps)
      },
      deep: true
    }
  },
  created () {
    if (this.$props.appear) {
      this.componentDidUpdated()
    }
    this.oneEnter = true
  },
  updated () {
    this.componentDidUpdated()
  },
  beforeDestroy () {
    Object.keys(this.placeholderTimeoutIds).forEach(key => {
      ticker.clear(this.placeholderTimeoutIds[key])
    })
    this.keysToEnter = []
    this.keysToLeave = []
  },
  methods: {
    componentDidUpdated () {
      this.originalChildren = getChildrenFromProps(this)
      const keysToEnter = [...this.keysToEnter]
      const keysToLeave = [...this.keysToLeave]
      keysToEnter.forEach(this.performEnter)
      keysToLeave.forEach(this.performLeave)
    },
    handleUpdate (nextProps) {
      const nextChildren = getChildrenFromProps(this).filter(item => item)
      let currentChildren = this.originalChildren.filter(item => item)
      if (this.childrens.length) {
        /**
       * 多次刷新处理
       * 如果 state.children 里还有元素，元素还在动画，当前子级加回在出场的子级;
       */
        const leaveChild = this.childrens.filter(item =>
          item && this.keysToLeave.indexOf(item.key) >= 0
        )
        this.leaveUnfinishedChild = leaveChild.map(item => item.key)
        /**
       * 获取 leaveChild 在 state.children 里的序列，再将 leaveChild 和 currentChildren 的重新排序。
       * 避逸 state.children 在 leaveComplete 里没全部完成不触发，
       * leaveComplete 里如果动画完成了是会删除 keyToLeave，但 state.children 是在全部出场后才触发清除，
       * 所以这里需要处理出场完成的元素做清除。
       */
        const stateChildrens = mergeChildren(currentChildren, this.childrens)
        const currentChild = []
        const childReOrder = (child) => {
          child.forEach(item => {
            const order = stateChildrens.indexOf(item)
            // -1 不应该出现的情况，直接插入数组后面.
            if (order === -1) {
              currentChild.push(item)
            } else {
              currentChild.splice(order, 0, item)
            }
          })
        }
        childReOrder(leaveChild)
        childReOrder(currentChildren)
        currentChildren = currentChild.filter(c => c)
      }
      const newChildren = mergeChildren(
        currentChildren,
        nextChildren
      )

      const childrenShow = !newChildren.length ? {} : this.childrenShow
      this.keysToEnterPaused = {}
      const emptyBool = !nextChildren.length &&
          !currentChildren.length &&
          this.childrens.length
      /**
         * 在出场没结束时，childrenShow 里的值将不会清除。
         * 再触发进场时， childrenShow 里的值是保留着的, 设置了 forcedReplay 将重新播放进场。
         */
      if (!emptyBool) { // 空子级状态下刷新不做处理
        const nextKeys = nextChildren.map(c => c.key)
        this.keysToLeave.forEach(key => {
          // 将所有在出场里的停止掉。避免间隔性出现
          if (nextKeys.indexOf(key) >= 0) {
            this.keysToEnterPaused[key] = true
            currentChildren = currentChildren.filter(item => item.key !== key)
            if (nextProps.forcedReplay) {
              // 清掉所有出场的。
              delete childrenShow[key]
            }
          }
        })
      }

      this.keysToEnter = []
      this.keysToLeave = []

      // need render to avoid update
      this.setState({
        childrenShow,
        childrens: newChildren
      })

      nextChildren.forEach((c) => {
        if (!c) {
          return
        }
        const key = c.key
        const hasPrev = findChildInChildrenByKey(currentChildren, key)
        if (!hasPrev && key) {
          this.keysToEnter.push(key)
        }
      })

      currentChildren.forEach((c) => {
        if (!c) {
          return
        }
        const key = c.key
        const hasNext = findChildInChildrenByKey(nextChildren, key)
        if (!hasNext && key) {
          this.keysToLeave.push(key)
        }
      })
      this.keysToEnterToCallback = [...this.keysToEnter]
    },
    getTweenType (type, num) {
      const data = AnimTypes[type]
      return this.getTweenAnimConfig(data, num)
    },
    getTweenSingleConfig (data, num, enterOrLeave) {
      const obj = {}
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          obj[key] = data[key][num]
        } else if ((!enterOrLeave && !num) || (enterOrLeave && num)) {
          obj[key] = data[key]
        }
      })
      return obj
    },
    getTweenAnimConfig (data, num, enterOrLeave) {
      if (Array.isArray(data)) {
        return data.map(item => {
          return this.getTweenSingleConfig(item, num, enterOrLeave)
        })
      }
      return this.getTweenSingleConfig(data, num, enterOrLeave)
    },
    getTweenData (key, i, type) {
      const props = this.$props
      const enterOrLeave = type === 'enter' ? 0 : 1
      const start = type === 'enter' ? 1 : 0
      const end = type === 'enter' ? 0 : 1
      let startAnim = this.getAnimData(props, key, i, enterOrLeave, start)
      const animate = this.getAnimData(props, key, i, enterOrLeave, end)
      startAnim = type === 'enter' && (props.forcedReplay ||
      !this.unwantedStart[key])
        ? startAnim : null
      let ease = transformArguments(props.ease, key, i)[enterOrLeave]
      const duration = transformArguments(props.duration, key, i)[enterOrLeave]
      if (Array.isArray(ease)) {
        ease = ease.map(num => num * 100)
        ease = TweenOne.easing.path(
          `M0,100C${ease[0]},${100 - ease[1]},${ease[2]},${100 - ease[3]},100,0`,
          { lengthPixel: duration / 16.6667 })
      }
      return { startAnim, animate, ease, duration, isArray: Array.isArray(animate) }
    },
    getTweenSingleData (key, startAnim, animate, ease, duration, delay, onStart, onComplete) {
      const startLength = Object.keys(startAnim || {}).length
      const animation = {
        onStart,
        onComplete,
        duration,
        delay,
        ease,
        ...animate
      }
      const startAnimate = startLength ? { duration: 0, ...startAnim } : null
      return { animation, startAnimate }
    },
    getTweenEnterOrLeaveData (key, i, delay, type) {
      let animateData = this.getTweenData(key, i, type)
      const startAnim = animateData.startAnim
      const animate = animateData.animate
      const onStart = (type === 'enter' ? this.enterBegin : this.leaveBegin).bind(this, key)
      const onComplete = (type === 'enter' ? this.enterComplete : this.leaveComplete).bind(this, key)
      if (animateData.isArray) {
        const length = animate.length - 1
        const animation = []
        const startArray = []
        animate.forEach((leave, ii) => {
          const start = startAnim && startAnim[ii]
          const animObj = this.getTweenSingleData(key, start, leave, animateData.ease,
            animateData.duration / length, !ii ? delay : 0,
            !ii ? onStart : null,
            ii === length ? onComplete : null)
          animation.push(animObj.animation)
          if (animObj.startAnimate) {
            startArray.push(animObj.startAnimate)
          }
        })
        return startArray.concat(animation)
      }
      animateData = this.getTweenSingleData(key, startAnim, animate, animateData.ease,
        animateData.duration, delay, onStart, onComplete)
      return [animateData.startAnimate, animateData.animation].filter(item => item)
    },
    getTweenAppearData (key, i) {
      return {
        ...this.getAnimData(this.$props, key, i, 0, 0),
        duration: 0
      }
    },
    getAnimData (props, key, i, enterOrLeave, startOrEnd) {
      /**
     * transformArguments 第一个为 enter, 第二个为 leave；
     * getTweenAnimConfig or getTweenType 第一个为到达的位置， 第二个为开始的位置。
     * 用 tween-one 的数组来实现老的动画逻辑。。。
     */
      return props.animConfig
        ? this.getTweenAnimConfig(
          transformArguments(props.animConfig, key, i)[enterOrLeave], startOrEnd, enterOrLeave
        )
        : this.getTweenType(transformArguments(props.type, key, i)[enterOrLeave], startOrEnd)
    },
    getChildrenToRender (createElement, child) {
      const { forcedReplay, leaveReverse, appear, delay, interval } = this.$props
      if (!child || !child.key) {
        return child
      }
      const key = child.key
      if (!this.childrenShow[key]) {
        return null
      }
      let i = this.keysToLeave.indexOf(key)
      let animation
      const isFunc = typeof child.type === 'function'
      const forcedJudg = isFunc ? {} : null
      if (isFunc) {
        Object.keys(child.type).forEach(name => {
          if (typeDefault.indexOf(name) === -1) {
            forcedJudg[name] = child.type[name]
          }
        })
      }
      // 处理出场
      if (i >= 0) {
        if (this.leaveUnfinishedChild.indexOf(key) >= 0) {
          return this.saveTweenOneTag[key]
        }
        const $interval = transformArguments(interval, key, i)[1]
        let $delay = transformArguments(delay, key, i)[1]
        // 减掉 leaveUnfinishedChild 里的个数，因为 leaveUnfinishedChild 是旧的出场，不应该计录在队列里。
        const order = (leaveReverse ? (this.keysToLeave.length - i - 1) : i) -
        this.leaveUnfinishedChild.length
        $delay = $interval * order + $delay
        animation = this.getTweenEnterOrLeaveData(key, i, $delay, 'leave')
      } else {
      // 处理进场;
        i = this.keysToEnterToCallback.indexOf(key)
        if (!this.oneEnter && !appear) {
          animation = this.getTweenAppearData(key, i)
        } else {
          animation = this.getTweenEnterOrLeaveData(key, i, 0, 'enter')
        }
        if (this.tweenToEnter[key] && !forcedReplay) {
        // 如果是已进入的，将直接返回标签。。
          return createElement(TweenOne,
            { key, props: { component: child.tag, forcedJudg, componentProps: child.$props } }, child.children)
        }
      }
      const paused = this.keysToEnterPaused[key] && !this.keysToLeave.indexOf(key) >= 0
      animation = paused ? null : animation
      const tag = createElement(TweenOne,
        { key, props: { component: child.tag, forcedJudg, componentProps: child.$props, animation } }, child.children)
      this.saveTweenOneTag[key] = tag
      return tag
    },
    performEnter (key, i) {
      const self = this
      const interval = transformArguments(this.$props.interval, key, i)[0]
      const delay = transformArguments(this.$props.delay, key, i)[0]
      this.placeholderTimeoutIds[key] = ticker.timeout(
        self.performEnterBegin.bind(self, key),
        interval * i + delay
      )
      if (this.keysToEnter.indexOf(key) >= 0) {
        this.keysToEnter.splice(this.keysToEnter.indexOf(key), 1)
      }
    },
    performEnterBegin (key) {
      const childrenShow = this.childrenShow
      childrenShow[key] = true
      delete this.keysToEnterPaused[key]
      ticker.clear(this.placeholderTimeoutIds[key])
      delete this.placeholderTimeoutIds[key]
      this.setState({ childrenShow })
      this.$forceUpdate()
    },
    performLeave (key) {
      ticker.clear(this.placeholderTimeoutIds[key])
      delete this.placeholderTimeoutIds[key]
    },
    enterBegin (key, e) {
      const elem = e.target
      const animatingClassName = this.$props.animatingClassName
      elem.className = elem.className.replace(animatingClassName[1], '')
      if (elem.className.indexOf(animatingClassName[0]) === -1) {
        elem.className = (`${elem.className} ${animatingClassName[0]}`).trim()
      }
    },
    enterComplete (key, e) {
      if (this.keysToEnterPaused[key] || this.keysToLeave.indexOf(key) >= 0) {
        return
      }
      const elem = e.target
      elem.className = elem.className.replace(this.$props.animatingClassName[0], '').trim()
      this.tweenToEnter[key] = true
      this.unwantedStart[key] = true
      this.$props.onEnd({ key, type: 'enter' })
    },
    leaveBegin (key, e) {
      const elem = e.target
      const animatingClassName = this.$props.animatingClassName
      elem.className = elem.className.replace(animatingClassName[0], '')
      if (elem.className.indexOf(animatingClassName[1]) === -1) {
        elem.className = (`${elem.className} ${animatingClassName[1]}`).trim()
      }
      this.unwantedStart[key] = true
      delete this.tweenToEnter[key]
    },
    leaveComplete (key, e) {
      // 切换时同时触发 onComplete。 手动跳出。。。
      if (this.keysToEnterToCallback.indexOf(key) >= 0) {
        return
      }
      const childrenShow = this.childrenShow
      delete childrenShow[key]
      delete this.saveTweenOneTag[key]
      delete this.unwantedStart[key]
      if (this.keysToLeave.indexOf(key) >= 0) {
        this.keysToLeave.splice(this.keysToLeave.indexOf(key), 1)
      }
      const needLeave = this.keysToLeave.some(c => childrenShow[c])
      if (!needLeave) {
        const currentChildren = getChildrenFromProps(this)
        this.setState({
          children: currentChildren,
          childrenShow
        })
      }
      const elem = e.target
      elem.className = elem.className.replace(this.$props.animatingClassName[1], '').trim()
      this.$props.onEnd({ key, type: 'leave' })
    }
  },
  render (createElement) {
    const tagProps = { ...this.$props }
    const propKeys = [
      'component',
      'componentProps',
      'interval',
      'duration',
      'delay',
      'type',
      'animConfig',
      'ease',
      'leaveReverse',
      'animatingClassName',
      'forcedReplay',
      'onEnd',
      'appear'
    ]
    propKeys.forEach(key => delete tagProps[key])
    const childrenToRender = this.childrens.map(this.getChildrenToRender.bind(this, createElement))
    const props = { ...tagProps, ...this.$props.componentProps }
    return createElement(this.$props.component, props, childrenToRender)
  }
}
