# Mini-React

一个简化版的React实现，用于学习和理解React的核心原理。

## 实现的功能

- **虚拟DOM**: 使用JavaScript对象表示DOM结构
- **Fiber架构**: 实现可中断的渲染过程
- **函数组件**: 支持函数式组件
- **Hooks**: 实现useState和useEffect等基础Hooks
- **协调算法**: 简化版的Diff算法

## 项目结构

```
src/
├── createElement.js     # 创建虚拟DOM元素
├── render.js           # 渲染虚拟DOM到真实DOM
├── reconciler.js       # 协调器，处理更新
├── fiber.js            # Fiber相关实现
├── hooks.js            # Hooks实现
├── scheduler.js        # 调度器
└── index.js            # 入口文件
```

## 使用方法

```javascript
import { createElement, render } from './mini-react';
import { useState, useEffect } from './mini-react/hooks';

// 创建元素
const element = createElement('div', { className: 'container' },
  createElement('h1', null, 'Hello Mini-React'),
  createElement('p', null, 'A simplified React implementation')
);

// 函数组件
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);
  
  return createElement('div', null,
    createElement('p', null, `Count: ${count}`),
    createElement('button', { onClick: () => setCount(count + 1) }, 'Increment')
  );
}

// 渲染到DOM
render(createElement(Counter), document.getElementById('root'));
```

## 运行项目

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev
```

## 学习资源

- [React官方文档](https://reactjs.org/docs/getting-started.html)
- [React源码](https://github.com/facebook/react)
- [React Fiber架构](https://github.com/acdlite/react-fiber-architecture)
- [Build your own React](https://pomb.us/build-your-own-react/)