# Mini Vue

一个简化版的 Vue.js 实现，包含 Vue 的核心功能：响应式系统、虚拟DOM、组件系统等。

## 🚀 特性

- ✅ **响应式系统**: 基于 Proxy 的响应式数据
- ✅ **虚拟DOM**: 高效的 DOM 更新机制
- ✅ **组件系统**: 支持组件化开发
- ✅ **Composition API**: 类似 Vue 3 的组合式 API
- ✅ **生命周期**: 基础的生命周期钩子
- ✅ **计算属性**: 响应式的计算属性
- ✅ **事件处理**: 支持事件绑定

## 📁 项目结构

```
mini-vue/
├── src/
│   ├── reactivity/          # 响应式系统
│   │   └── reactive.js      # reactive, ref, effect, computed
│   ├── runtime/             # 运行时
│   │   ├── vdom.js         # 虚拟DOM实现
│   │   ├── component.js    # 组件系统
│   │   └── renderer.js     # 渲染器
│   └── index.js            # 主入口文件
├── examples/               # 示例
│   ├── basic.js           # Node.js 示例
│   └── index.html         # 浏览器示例
├── package.json
└── README.md
```

## 🛠 核心 API

### 响应式 API

```javascript
const { reactive, ref, computed, effect } = require('./src/index');

// 响应式对象
const state = reactive({ count: 0 });

// 响应式引用
const count = ref(0);

// 计算属性
const doubleCount = computed(() => count.value * 2);

// 副作用函数
effect(() => {
  console.log('count changed:', count.value);
});
```

### 组件 API

```javascript
const { createApp, h } = require('./src/index');

const MyComponent = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    
    return {
      count,
      increment
    };
  },
  
  render(ctx) {
    return h('div', {}, [
      h('p', {}, `Count: ${ctx.count.value}`),
      h('button', { onClick: ctx.increment }, 'Increment')
    ]);
  }
};

const app = createApp(MyComponent);
app.mount('#app');
```

### 生命周期 API

```javascript
const { onMounted, onUpdated, onUnmounted } = require('./src/index');

const MyComponent = {
  setup() {
    onMounted(() => {
      console.log('组件已挂载');
    });
    
    onUpdated(() => {
      console.log('组件已更新');
    });
    
    onUnmounted(() => {
      console.log('组件已卸载');
    });
  }
};
```

## 🎯 使用示例

### Node.js 环境

```bash
# 运行基础示例
node examples/basic.js
```

### 浏览器环境

直接在浏览器中打开 `examples/index.html` 文件，可以看到：
或运行 `python3 -m http.server 8080` 启动一个简单的 HTTP 服务器，然后在浏览器中访问 `http://localhost:8080`。

1. **计数器应用**: 演示响应式数据和事件处理
2. **Todo应用**: 演示列表渲染和数据操作

## 🔍 核心原理

### 1. 响应式系统

使用 `Proxy` 劫持对象的读写操作：

```javascript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key); // 依赖收集
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      trigger(target, key); // 触发更新
      return result;
    }
  });
}
```

### 2. 虚拟DOM

使用 JavaScript 对象描述 DOM 结构：

```javascript
function h(tag, props, children) {
  return {
    tag,
    props,
    children,
    el: null // 对应的真实DOM
  };
}
```

### 3. Diff 算法

比较新旧虚拟DOM树，最小化DOM操作：

```javascript
function patch(oldVNode, newVNode) {
  // 1. 比较节点类型
  // 2. 更新属性
  // 3. 更新子节点
}
```

## 🎓 学习价值

这个 Mini Vue 实现帮助理解：

1. **响应式原理**: Proxy vs Object.defineProperty
2. **虚拟DOM**: 为什么需要虚拟DOM，如何实现高效更新
3. **组件系统**: 组件的生命周期和状态管理
4. **编译优化**: 模板到渲染函数的转换
5. **架构设计**: 如何设计一个前端框架

## 🔄 与 Vue.js 的对比

| 特性 | Mini Vue | Vue.js |
|------|----------|--------|
| 响应式 | ✅ Proxy | ✅ Proxy (Vue 3) |
| 虚拟DOM | ✅ 基础实现 | ✅ 高度优化 |
| 组件 | ✅ 基础功能 | ✅ 完整功能 |
| 模板编译 | ❌ | ✅ |
| 指令系统 | ❌ | ✅ |
| 插槽 | ❌ | ✅ |
| 路由 | ❌ | ✅ Vue Router |
| 状态管理 | ❌ | ✅ Vuex/Pinia |

## 🚧 限制

- 不支持模板编译，需要手写渲染函数
- 不支持指令系统 (v-if, v-for 等)
- 不支持插槽 (slots)
- 简化的生命周期
- 没有错误边界处理
- 没有服务端渲染支持

## 📚 扩展学习

1. **Vue.js 源码**: [github.com/vuejs/core](https://github.com/vuejs/core)
2. **Vue.js 设计与实现**: 深入理解 Vue.js 的设计思想
3. **现代前端框架**: React、Angular 等框架的对比学习

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License