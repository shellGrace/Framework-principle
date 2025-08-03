# Mini-React 架构设计

## 整体架构

Mini-React 采用了与 React 16+ 类似的 Fiber 架构，实现了可中断的渲染过程和时间切片。

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JSX/元素创建   │───▶│   虚拟DOM树     │───▶│   Fiber树       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   真实DOM       │◀───│   提交阶段       │◀───│   协调阶段       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心模块

### 1. createElement.js - 虚拟DOM创建

**职责：**
- 创建虚拟DOM元素
- 处理JSX转换
- 文本节点标准化

**核心函数：**
```javascript
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object' ? child : createTextElement(child)
      ),
    },
  };
}
```

**设计要点：**
- 统一的虚拟DOM结构
- 自动处理文本节点
- 支持嵌套子元素

### 2. fiber.js - Fiber架构实现

**职责：**
- 定义Fiber节点结构
- DOM操作抽象
- 属性更新逻辑

**Fiber节点结构：**
```javascript
{
  type: 'div',           // 元素类型
  props: {...},          // 属性
  dom: DOMNode,          // 对应的DOM节点
  parent: FiberNode,     // 父Fiber
  child: FiberNode,      // 第一个子Fiber
  sibling: FiberNode,    // 兄弟Fiber
  alternate: FiberNode,  // 对应的旧Fiber
  effectTag: 'PLACEMENT',// 效果标签
  hooks: [],             // Hooks数组
  hookIndex: 0           // 当前Hook索引
}
```

**设计要点：**
- 链表结构便于遍历
- 双缓冲技术（current/workInProgress）
- 效果标签标记更新类型

### 3. scheduler.js - 任务调度器

**职责：**
- 时间切片实现
- 任务优先级管理
- 可中断渲染

**调度流程：**
```
任务入队 ──▶ 按优先级排序 ──▶ 时间切片执行 ──▶ 检查是否让出控制权
    ▲                                              │
    │                                              ▼
    └──────────── 任务未完成，重新调度 ◀─────── 时间片用完？
```

**设计要点：**
- 使用MessageChannel实现异步调度
- 5ms时间切片保证响应性
- 支持任务取消和重新调度

### 4. reconciler.js - 协调器

**职责：**
- 虚拟DOM比较（Diff算法）
- Fiber树构建
- 更新调度

**工作流程：**
```
开始渲染 ──▶ 创建根Fiber ──▶ 工作循环 ──▶ 执行工作单元
                                │           │
                                ▼           ▼
                            时间切片     ┌─函数组件─┐
                            检查         │  或      │
                                │       └─宿主组件─┘
                                ▼           │
                            提交阶段 ◀──────┘
```

**Diff算法特点：**
- 同层比较，避免跨层级移动
- 基于key的节点复用
- 三种操作：PLACEMENT、UPDATE、DELETION

### 5. hooks.js - Hooks实现

**职责：**
- 状态管理
- 副作用处理
- 记忆化优化

**Hooks链表结构：**
```
Fiber.hooks: [Hook1] ──▶ [Hook2] ──▶ [Hook3] ──▶ null
                │          │          │
                ▼          ▼          ▼
            useState   useEffect   useMemo
```

**设计要点：**
- 基于调用顺序的链表存储
- 状态更新队列机制
- 依赖数组比较优化

## 渲染流程

### 1. 渲染阶段（Render Phase）

```
1. 创建根Fiber
2. 开始工作循环
3. 执行工作单元：
   ├─ 函数组件：执行函数，处理Hooks
   ├─ 宿主组件：创建/更新DOM属性
   └─ 协调子元素：Diff算法比较
4. 构建Fiber树
5. 标记副作用
```

**特点：**
- 可中断和恢复
- 不产生副作用
- 构建新的Fiber树

### 2. 提交阶段（Commit Phase）

```
1. 处理删除操作
2. 处理新增和更新：
   ├─ PLACEMENT：插入新节点
   ├─ UPDATE：更新现有节点
   └─ DELETION：删除节点
3. 执行副作用（useEffect）
4. 更新引用
```

**特点：**
- 同步执行，不可中断
- 产生副作用
- 更新真实DOM

## 状态管理

### useState实现原理

```javascript
function useState(initial) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [], // 状态更新队列
  };
  
  // 处理状态更新队列
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = typeof action === 'function' 
      ? action(hook.state) 
      : action;
  });
  
  const setState = (action) => {
    hook.queue.push(action);
    scheduleUpdate(); // 触发重新渲染
  };
  
  return [hook.state, setState];
}
```

### useEffect实现原理

```javascript
function useEffect(effect, deps) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  // 依赖比较
  const hasChanged = oldHook
    ? !deps || !deps.every((dep, i) => dep === oldHook.deps[i])
    : true;
    
  if (hasChanged) {
    // 清理旧的副作用
    if (oldHook?.cleanup) {
      oldHook.cleanup();
    }
    
    // 安排新的副作用执行
    scheduleEffect(() => {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        hook.cleanup = cleanup;
      }
    });
  }
}
```

## 性能优化

### 1. 时间切片
- 5ms时间片，保证60fps流畅度
- 可中断渲染，优先响应用户交互
- 基于MessageChannel的异步调度

### 2. 记忆化
- useMemo缓存计算结果
- useCallback缓存函数引用
- 依赖数组精确控制更新

### 3. Diff优化
- 同层比较，O(n)复杂度
- key属性优化列表渲染
- 双端比较算法

### 4. 批量更新
- 状态更新队列
- 异步批处理
- 避免不必要的重渲染

## 与React的差异

### 简化的部分
1. **事件系统**：直接使用原生事件，未实现SyntheticEvent
2. **错误边界**：未实现错误捕获和恢复
3. **Suspense**：未实现异步组件和数据获取
4. **并发特性**：简化的调度器，未实现优先级中断
5. **服务端渲染**：仅支持客户端渲染

### 保留的核心特性
1. **Fiber架构**：完整的Fiber节点结构和工作循环
2. **Hooks系统**：主要Hooks的完整实现
3. **虚拟DOM**：完整的虚拟DOM和Diff算法
4. **时间切片**：基本的可中断渲染
5. **组件系统**：函数组件和生命周期

## 扩展性设计

### 1. 插件系统
可以通过扩展以下接口添加新功能：
- 自定义Hooks
- 自定义调度策略
- 自定义Fiber类型

### 2. 开发工具
- 暴露内部状态用于调试
- 性能监控接口
- 组件树可视化

### 3. 生态兼容
- 兼容React的API设计
- 支持现有的开发工具
- 渐进式迁移路径

## 学习价值

通过实现Mini-React，可以深入理解：

1. **Fiber架构的设计思想**
2. **虚拟DOM和Diff算法的实现**
3. **Hooks的工作原理**
4. **时间切片和任务调度**
5. **React的渲染流程**
6. **现代前端框架的架构设计**

这个实现虽然简化，但保留了React的核心思想和关键特性，是学习React原理的绝佳材料。