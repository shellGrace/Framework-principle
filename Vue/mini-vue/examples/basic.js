// Mini Vue 基础使用示例

const { createApp, reactive, ref, computed, h, onMounted } = require('../src/index');

// 创建一个简单的计数器组件
const Counter = {
  setup() {
    // 响应式数据
    const count = ref(0);
    const message = ref('Hello Mini Vue!');
    
    // 计算属性
    const doubleCount = computed(() => count.value * 2);
    
    // 方法
    const increment = () => {
      count.value++;
    };
    
    const decrement = () => {
      count.value--;
    };
    
    // 生命周期
    onMounted(() => {
      console.log('Counter component mounted!');
    });
    
    // 返回模板中需要的数据和方法
    return {
      count,
      message,
      doubleCount,
      increment,
      decrement
    };
  },
  
  render(ctx) {
    return h('div', { class: 'counter' }, [
      h('h1', {}, ctx.message.value),
      h('p', {}, `Count: ${ctx.count.value}`),
      h('p', {}, `Double Count: ${ctx.doubleCount.value}`),
      h('button', { 
        onClick: ctx.increment 
      }, '+'),
      h('button', { 
        onClick: ctx.decrement,
        style: 'margin-left: 10px;'
      }, '-')
    ]);
  }
};

// 创建应用
const app = createApp(Counter);

// 模拟DOM环境（在Node.js中）
if (typeof document === 'undefined') {
  // 简单的DOM模拟
  global.document = {
    createElement: (tag) => ({
      tag,
      children: [],
      attributes: {},
      textContent: '',
      appendChild: function(child) {
        this.children.push(child);
      },
      setAttribute: function(name, value) {
        this.attributes[name] = value;
      },
      removeAttribute: function(name) {
        delete this.attributes[name];
      },
      addEventListener: function(event, handler) {
        console.log(`Event listener added: ${event}`);
      },
      removeEventListener: function(event, handler) {
        console.log(`Event listener removed: ${event}`);
      },
      removeChild: function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
        }
      },
      get parentNode() {
        return this._parent;
      },
      set parentNode(parent) {
        this._parent = parent;
      },
      get childNodes() {
        return this.children;
      }
    }),
    createTextNode: (text) => ({
      textContent: text,
      nodeType: 3
    }),
    querySelector: (selector) => ({
      appendChild: function(child) {
        console.log('Mounted to container:', child);
      },
      _vnode: null
    })
  };
}

console.log('Mini Vue Example - Counter Component');
console.log('=====================================');

// 演示响应式系统
const state = reactive({ count: 0 });
const countRef = ref(10);

console.log('\n1. 响应式系统演示:');
console.log('初始状态:', state.count);
console.log('初始ref:', countRef.value);

// 演示effect
const { effect } = require('../src/index');
effect(() => {
  console.log('Effect triggered, count:', state.count);
});

state.count = 1;
state.count = 2;

countRef.value = 20;
countRef.value = 30;

console.log('\n2. 计算属性演示:');
const doubleCount = computed(() => state.count * 2);
console.log('计算属性值:', doubleCount.value);
state.count = 5;
console.log('更新后计算属性值:', doubleCount.value);

console.log('\n3. 虚拟DOM演示:');
const vnode = h('div', { class: 'test' }, [
  h('h1', {}, 'Hello'),
  h('p', {}, 'Mini Vue')
]);
console.log('创建的VNode:', JSON.stringify(vnode, null, 2));

console.log('\nMini Vue 核心功能演示完成!');