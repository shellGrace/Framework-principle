# Redux 状态管理原理（高优先级 ⭐⭐⭐⭐⭐）

## 1. Redux 核心概念

### 1.1 三大原则
1. **单一数据源**：整个应用的 state 存储在一个 store 中
2. **State 只读**：唯一改变 state 的方法是触发 action
3. **纯函数修改**：使用纯函数 reducer 来描述 state 变化

### 1.2 核心组成
```javascript
// Action
const increment = () => ({
  type: 'INCREMENT'
});

// Reducer
const counter = (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    default:
      return state;
  }
};

// Store
const store = createStore(counter);
```

## 2. Redux 数据流

### 2.1 单向数据流
```
UI → Action → Reducer → Store → UI
```

### 2.2 完整流程
```javascript
// 1. 组件触发 Action
dispatch(increment());

// 2. Store 调用 Reducer
const newState = reducer(currentState, action);

// 3. Store 更新 State
store.state = newState;

// 4. 通知订阅者
listeners.forEach(listener => listener());

// 5. 组件重新渲染
component.forceUpdate();
```

## 3. Redux 源码实现

### 3.1 createStore 实现
```javascript
function createStore(reducer, preloadedState, enhancer) {
  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners = [];
  let nextListeners = currentListeners;
  let isDispatching = false;

  function getState() {
    return currentState;
  }

  function subscribe(listener) {
    nextListeners.push(listener);
    
    return function unsubscribe() {
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  function dispatch(action) {
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    const listeners = (currentListeners = nextListeners);
    listeners.forEach(listener => listener());

    return action;
  }

  // 初始化 state
  dispatch({ type: '@@redux/INIT' });

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer
  };
}
```

### 3.2 combineReducers 实现
```javascript
function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};

  // 过滤有效的 reducer
  reducerKeys.forEach(key => {
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  });

  return function combination(state = {}, action) {
    let hasChanged = false;
    const nextState = {};

    Object.keys(finalReducers).forEach(key => {
      const reducer = finalReducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    });

    return hasChanged ? nextState : state;
  };
}
```

## 4. 中间件机制

### 4.1 applyMiddleware 实现
```javascript
function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args);
    let dispatch = () => {
      throw new Error('Dispatching while constructing middleware');
    };

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    };

    const chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);

    return {
      ...store,
      dispatch
    };
  };
}
```

### 4.2 compose 函数实现
```javascript
function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
```

### 4.3 常用中间件

#### Redux-Thunk
```javascript
const thunk = ({ dispatch, getState }) => next => action => {
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }
  return next(action);
};

// 使用示例
const fetchUser = (userId) => {
  return async (dispatch, getState) => {
    dispatch({ type: 'FETCH_USER_START' });
    try {
      const user = await api.getUser(userId);
      dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'FETCH_USER_ERROR', payload: error.message });
    }
  };
};
```

#### Redux-Logger
```javascript
const logger = store => next => action => {
  console.group(action.type);
  console.info('dispatching', action);
  const result = next(action);
  console.log('next state', store.getState());
  console.groupEnd();
  return result;
};
```

## 5. React-Redux 连接

### 5.1 Provider 实现
```javascript
const ReduxContext = React.createContext();

function Provider({ store, children }) {
  return (
    <ReduxContext.Provider value={store}>
      {children}
    </ReduxContext.Provider>
  );
}
```

### 5.2 useSelector 实现
```javascript
function useSelector(selector, equalityFn = shallowEqual) {
  const store = useContext(ReduxContext);
  const [, forceRender] = useReducer(s => s + 1, 0);
  
  const selectedState = useMemo(() => {
    return selector(store.getState());
  }, [selector, store]);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newSelectedState = selector(store.getState());
      if (!equalityFn(selectedState, newSelectedState)) {
        forceRender();
      }
    });
    return unsubscribe;
  }, [store, selector, selectedState, equalityFn]);

  return selectedState;
}
```

### 5.3 useDispatch 实现
```javascript
function useDispatch() {
  const store = useContext(ReduxContext);
  return store.dispatch;
}
```

## 6. Redux Toolkit (RTK)

### 6.1 createSlice
```javascript
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: {
    value: 0
  },
  reducers: {
    increment: (state) => {
      // 使用 Immer 实现不可变更新
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    }
  }
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

### 6.2 createAsyncThunk
```javascript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// 异步 action creator
export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (userId, thunkAPI) => {
    const response = await userAPI.fetchById(userId);
    return response.data;
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: [],
    loading: 'idle'
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = 'idle';
        state.entities.push(action.payload);
      })
      .addCase(fetchUserById.rejected, (state) => {
        state.loading = 'idle';
      });
  }
});
```

## 7. 时间旅行调试

### 7.1 实现原理
```javascript
class DevToolsEnhancer {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
  }

  record(action, state) {
    // 记录每个 action 和对应的 state
    this.history.push({ action, state });
    this.currentIndex = this.history.length - 1;
  }

  jumpToAction(index) {
    // 跳转到指定的历史状态
    this.currentIndex = index;
    return this.history[index].state;
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex].state;
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex].state;
    }
  }
}
```

## 8. 性能优化

### 8.1 Selector 优化
```javascript
import { createSelector } from 'reselect';

// 使用 reselect 创建记忆化 selector
const selectTodos = state => state.todos;
const selectFilter = state => state.filter;

const selectVisibleTodos = createSelector(
  [selectTodos, selectFilter],
  (todos, filter) => {
    switch (filter) {
      case 'SHOW_ALL':
        return todos;
      case 'SHOW_COMPLETED':
        return todos.filter(todo => todo.completed);
      case 'SHOW_ACTIVE':
        return todos.filter(todo => !todo.completed);
      default:
        return todos;
    }
  }
);
```

### 8.2 组件优化
```javascript
// 使用 React.memo 避免不必要的重渲染
const TodoItem = React.memo(({ todo, onToggle }) => {
  return (
    <li onClick={() => onToggle(todo.id)}>
      {todo.text}
    </li>
  );
});

// 使用 useCallback 稳定函数引用
const TodoList = () => {
  const todos = useSelector(selectVisibleTodos);
  const dispatch = useDispatch();
  
  const handleToggle = useCallback((id) => {
    dispatch(toggleTodo(id));
  }, [dispatch]);
  
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
        />
      ))}
    </ul>
  );
};
```

## 9. 现代状态管理对比

### 9.1 Redux vs Zustand
```javascript
// Redux 方式
const store = createStore(reducer);
const Component = () => {
  const count = useSelector(state => state.count);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(increment())}>{count}</button>;
};

// Zustand 方式
const useStore = create(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}));

const Component = () => {
  const { count, increment } = useStore();
  return <button onClick={increment}>{count}</button>;
};
```

### 9.2 优缺点对比

**Redux 优点**：
- 可预测的状态管理
- 强大的调试工具
- 丰富的生态系统
- 时间旅行调试

**Redux 缺点**：
- 样板代码较多
- 学习曲线陡峭
- 小项目过度设计

## 10. 面试重点

### 10.1 核心问题
1. **Redux 三大原则**
2. **数据流向**：单向数据流
3. **中间件原理**：函数式编程，洋葱模型
4. **connect vs hooks**：HOC vs 函数式
5. **性能优化**：selector 记忆化，组件优化

### 10.2 实战场景
- 复杂状态管理
- 跨组件通信
- 异步数据处理
- 状态持久化
- 调试和测试

---

**学习建议**：
1. 理解函数式编程思想
2. 掌握不可变数据更新
3. 熟练使用 Redux DevTools
4. 对比现代状态管理方案
5. 实践中间件开发