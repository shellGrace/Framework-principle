// 响应式系统核心实现

// 存储依赖的全局变量
let activeEffect = null;
const targetMap = new WeakMap();

// 依赖收集
function track(target, key) {
  if (!activeEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  
  dep.add(activeEffect);
}

// 触发更新
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const dep = depsMap.get(key);
  if (dep) {
    dep.forEach(effect => effect());
  }
}

// 创建响应式对象
function reactive(target) {
  if (typeof target !== 'object' || target === null) {
    return target;
  }
  
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      // 依赖收集
      track(target, key);
      return result;
    },
    
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      // 触发更新
      trigger(target, key);
      return result;
    }
  });
}

// 创建ref响应式引用
function ref(value) {
  return {
    _isRef: true,
    get value() {
      track(this, 'value');
      return value;
    },
    set value(newValue) {
      value = newValue;
      trigger(this, 'value');
    }
  };
}

// 副作用函数
function effect(fn) {
  const effectFn = () => {
    activeEffect = effectFn;
    fn();
    activeEffect = null;
  };
  
  effectFn();
  return effectFn;
}

// 计算属性
function computed(getter) {
  let value;
  let dirty = true;
  
  const computedRef = {
    get value() {
      if (dirty) {
        value = getter();
        dirty = false;
      }
      track(computedRef, 'value');
      return value;
    }
  };
  
  effect(() => {
    getter();
    dirty = true;
    trigger(computedRef, 'value');
  });
  
  return computedRef;
}

module.exports = {
  reactive,
  ref,
  effect,
  computed
};