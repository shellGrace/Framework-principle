# Mini-React API 文档

## 核心 API

### createElement(type, props, ...children)

创建虚拟DOM元素。

**参数：**
- `type` (string|function): 元素类型或组件函数
- `props` (object): 属性对象
- `children` (...any): 子元素

**返回值：**
- 虚拟DOM对象

**示例：**
```javascript
// 创建DOM元素
const element = createElement('div', { className: 'container' }, 'Hello World');

// 创建嵌套元素
const nested = createElement('div', null,
  createElement('h1', null, 'Title'),
  createElement('p', null, 'Content')
);

// 创建组件
function MyComponent(props) {
  return createElement('div', null, `Hello ${props.name}`);
}
const component = createElement(MyComponent, { name: 'React' });
```

### render(element, container)

将虚拟DOM渲染到真实DOM容器中。

**参数：**
- `element` (object): 虚拟DOM元素
- `container` (Element): 容器DOM节点

**示例：**
```javascript
const element = createElement('h1', null, 'Hello Mini-React');
render(element, document.getElementById('root'));
```

### createRoot(container)

创建根节点（React 18风格的API）。

**参数：**
- `container` (Element): 容器DOM节点

**返回值：**
- 根节点对象，包含 `render` 和 `unmount` 方法

**示例：**
```javascript
const root = createRoot(document.getElementById('root'));
root.render(createElement('h1', null, 'Hello'));
```

## Hooks API

### useState(initialState)

状态Hook，用于在函数组件中管理状态。

**参数：**
- `initialState` (any): 初始状态值

**返回值：**
- `[state, setState]`: 当前状态和更新状态的函数

**示例：**
```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  return createElement('div', null,
    createElement('p', null, `Count: ${count}`),
    createElement('button', {
      onClick: () => setCount(count + 1)
    }, 'Increment')
  );
}
```

### useEffect(effect, dependencies)

副作用Hook，用于处理副作用操作。

**参数：**
- `effect` (function): 副作用函数
- `dependencies` (array): 依赖数组

**示例：**
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // 每次渲染都执行
  useEffect(() => {
    console.log('Component rendered');
  });
  
  // 只在挂载时执行
  useEffect(() => {
    console.log('Component mounted');
    return () => {
      console.log('Component will unmount');
    };
  }, []);
  
  // 依赖count变化时执行
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  
  return createElement('div', null, `Count: ${count}`);
}
```

### useMemo(factory, dependencies)

记忆化Hook，用于缓存计算结果。

**参数：**
- `factory` (function): 计算函数
- `dependencies` (array): 依赖数组

**返回值：**
- 缓存的计算结果

**示例：**
```javascript
function ExpensiveComponent({ items }) {
  const expensiveValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);
  
  return createElement('div', null, `Total: ${expensiveValue}`);
}
```

### useCallback(callback, dependencies)

回调函数Hook，用于缓存回调函数。

**参数：**
- `callback` (function): 回调函数
- `dependencies` (array): 依赖数组

**返回值：**
- 缓存的回调函数

**示例：**
```javascript
function Parent({ items }) {
  const [filter, setFilter] = useState('');
  
  const handleFilter = useCallback((value) => {
    setFilter(value);
  }, []);
  
  return createElement('div', null,
    createElement(Child, { onFilter: handleFilter })
  );
}
```

### useRef(initialValue)

Ref Hook，用于创建可变的引用对象。

**参数：**
- `initialValue` (any): 初始值

**返回值：**
- ref对象，包含 `current` 属性

**示例：**
```javascript
function InputComponent() {
  const inputRef = useRef(null);
  
  const focusInput = () => {
    inputRef.current.focus();
  };
  
  return createElement('div', null,
    createElement('input', { ref: inputRef }),
    createElement('button', { onClick: focusInput }, 'Focus')
  );
}
```

### useReducer(reducer, initialState)

Reducer Hook，用于管理复杂状态。

**参数：**
- `reducer` (function): reducer函数
- `initialState` (any): 初始状态

**返回值：**
- `[state, dispatch]`: 当前状态和dispatch函数

**示例：**
```javascript
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });
  
  return createElement('div', null,
    createElement('p', null, `Count: ${state.count}`),
    createElement('button', {
      onClick: () => dispatch({ type: 'increment' })
    }, '+'),
    createElement('button', {
      onClick: () => dispatch({ type: 'decrement' })
    }, '-')
  );
}
```

## 调度器 API

### scheduleCallback(callback, priority)

调度任务执行。

**参数：**
- `callback` (function): 任务回调函数
- `priority` (number): 任务优先级

**返回值：**
- 任务对象

### cancelCallback(task)

取消已调度的任务。

**参数：**
- `task` (object): 要取消的任务对象

## Fiber API

### createFiber(element, parent, alternate)

创建Fiber节点。

### createDom(fiber)

根据Fiber节点创建DOM元素。

### updateDom(dom, prevProps, nextProps)

更新DOM元素的属性。

## 工具函数

### jsx(type, props, ...children)

JSX转换函数（与createElement相同）。

### React

兼容React的对象，包含createElement方法。

## 使用注意事项

1. **组件必须返回单个元素**：函数组件必须返回一个虚拟DOM元素。

2. **Hooks规则**：
   - 只能在函数组件的顶层调用Hooks
   - 不能在循环、条件语句或嵌套函数中调用Hooks
   - Hooks的调用顺序必须保持一致

3. **事件处理**：事件处理函数会自动绑定到对应的DOM事件。

4. **性能考虑**：
   - 使用useMemo和useCallback来优化性能
   - 合理使用依赖数组
   - 避免在渲染过程中创建新的对象和函数

5. **调试**：可以通过`window.MiniReact`访问全局的Mini-React对象进行调试。