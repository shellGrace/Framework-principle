/**
 * Hooks实现
 * 提供useState、useEffect等核心Hooks功能
 */

// 当前正在工作的Fiber节点
let currentFiber = null;
let hookIndex = 0;

/**
 * 设置当前工作的Fiber
 * @param {object} fiber - Fiber节点
 */
export function setCurrentFiber(fiber) {
  currentFiber = fiber;
  hookIndex = 0;
  
  if (!fiber.hooks) {
    fiber.hooks = [];
  }
}

/**
 * useState Hook实现
 * @param {any} initial - 初始值
 * @returns {Array} [state, setState]
 */
export function useState(initial) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };
  
  // 处理状态更新队列
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = typeof action === 'function' ? action(hook.state) : action;
  });
  
  const setState = (action) => {
    hook.queue.push(action);
    
    // 触发重新渲染
    scheduleUpdate();
  };
  
  currentFiber.hooks[hookIndex] = hook;
  hookIndex++;
  
  return [hook.state, setState];
}

/**
 * useEffect Hook实现
 * @param {function} effect - 副作用函数
 * @param {Array} deps - 依赖数组
 */
export function useEffect(effect, deps) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  const hasChanged = oldHook
    ? !deps || !deps.every((dep, i) => dep === oldHook.deps[i])
    : true;
    
  const hook = {
    effect,
    deps,
    cleanup: oldHook?.cleanup,
  };
  
  if (hasChanged) {
    // 执行清理函数
    if (oldHook?.cleanup) {
      oldHook.cleanup();
    }
    
    // 安排副作用执行
    scheduleEffect(() => {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        hook.cleanup = cleanup;
      }
    });
  }
  
  currentFiber.hooks[hookIndex] = hook;
  hookIndex++;
}

/**
 * useMemo Hook实现
 * @param {function} factory - 工厂函数
 * @param {Array} deps - 依赖数组
 * @returns {any} 缓存的值
 */
export function useMemo(factory, deps) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  const hasChanged = oldHook
    ? !deps || !deps.every((dep, i) => dep === oldHook.deps[i])
    : true;
    
  const hook = {
    value: hasChanged ? factory() : oldHook.value,
    deps,
  };
  
  currentFiber.hooks[hookIndex] = hook;
  hookIndex++;
  
  return hook.value;
}

/**
 * useCallback Hook实现
 * @param {function} callback - 回调函数
 * @param {Array} deps - 依赖数组
 * @returns {function} 缓存的回调函数
 */
export function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

/**
 * useRef Hook实现
 * @param {any} initialValue - 初始值
 * @returns {object} ref对象
 */
export function useRef(initialValue) {
  const oldHook = currentFiber?.alternate?.hooks?.[hookIndex];
  
  const hook = {
    current: oldHook ? oldHook.current : initialValue,
  };
  
  currentFiber.hooks[hookIndex] = hook;
  hookIndex++;
  
  return hook;
}

/**
 * useReducer Hook实现
 * @param {function} reducer - reducer函数
 * @param {any} initialState - 初始状态
 * @returns {Array} [state, dispatch]
 */
export function useReducer(reducer, initialState) {
  const [state, setState] = useState(initialState);
  
  const dispatch = (action) => {
    setState(prevState => reducer(prevState, action));
  };
  
  return [state, dispatch];
}

// 副作用队列
let effectQueue = [];

/**
 * 安排副作用执行
 * @param {function} effect - 副作用函数
 */
function scheduleEffect(effect) {
  effectQueue.push(effect);
  
  // 在下一个事件循环中执行副作用
  Promise.resolve().then(flushEffects);
}

/**
 * 执行所有副作用
 */
function flushEffects() {
  while (effectQueue.length > 0) {
    const effect = effectQueue.shift();
    try {
      effect();
    } catch (error) {
      console.error('Effect error:', error);
    }
  }
}

/**
 * 触发更新（需要从reconciler导入）
 */
function scheduleUpdate() {
  // 这个函数会在reconciler.js中实现
  if (typeof window !== 'undefined' && window.__miniReactScheduleUpdate) {
    window.__miniReactScheduleUpdate();
  }
}