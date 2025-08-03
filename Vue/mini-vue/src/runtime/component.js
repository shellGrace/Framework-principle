// 组件系统实现

const { effect } = require('../reactivity/reactive');
const { mount, patch } = require('./vdom');

// 当前活跃的组件实例
let currentInstance = null;

// 创建组件实例
function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {},
    ctx: {},
    isMounted: false,
    subTree: null,
    next: null,
    update: null
  };
  
  instance.ctx = { _: instance };
  return instance;
}

// 设置组件
function setupComponent(instance) {
  // 初始化props
  initProps(instance, instance.vnode.props);
  
  // 设置有状态组件
  setupStatefulComponent(instance);
}

// 初始化props
function initProps(instance, rawProps) {
  instance.props = rawProps || {};
}

// 设置有状态组件
function setupStatefulComponent(instance) {
  const Component = instance.type;
  
  // 设置当前实例
  currentInstance = instance;
  
  // 调用setup函数
  if (Component.setup) {
    const setupResult = Component.setup(instance.props);
    handleSetupResult(instance, setupResult);
  }
  
  currentInstance = null;
  
  // 完成组件设置
  finishComponentSetup(instance);
}

// 处理setup结果
function handleSetupResult(instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult;
  }
}

// 完成组件设置
function finishComponentSetup(instance) {
  const Component = instance.type;
  
  if (!instance.render) {
    instance.render = Component.render;
  }
}

// 渲染组件
function renderComponentRoot(instance) {
  const { type: Component, vnode, props } = instance;
  
  let result;
  currentInstance = instance;
  
  try {
    if (vnode.shapeFlag & 4) { // STATEFUL_COMPONENT
      result = instance.render.call(instance.setupState, instance.setupState, props);
    }
  } finally {
    currentInstance = null;
  }
  
  return result;
}

// 挂载组件
function mountComponent(initialVNode, container) {
  // 创建组件实例
  const instance = createComponentInstance(initialVNode);
  
  // 设置组件
  setupComponent(instance);
  
  // 设置渲染effect
  setupRenderEffect(instance, initialVNode, container);
}

// 设置渲染effect
function setupRenderEffect(instance, initialVNode, container) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 挂载
      const subTree = instance.subTree = renderComponentRoot(instance);
      mount(subTree, container);
      initialVNode.el = subTree.el;
      instance.isMounted = true;
    } else {
      // 更新
      const nextTree = renderComponentRoot(instance);
      const prevTree = instance.subTree;
      instance.subTree = nextTree;
      
      patch(prevTree, nextTree);
      initialVNode.el = nextTree.el;
    }
  };
  
  // 创建响应式effect
  const update = instance.update = effect(componentUpdateFn);
  update();
}

// 获取当前实例
function getCurrentInstance() {
  return currentInstance;
}

// 生命周期钩子
function onMounted(hook) {
  const target = currentInstance;
  if (target) {
    if (!target.mounted) {
      target.mounted = [];
    }
    target.mounted.push(hook);
  }
}

function onUpdated(hook) {
  const target = currentInstance;
  if (target) {
    if (!target.updated) {
      target.updated = [];
    }
    target.updated.push(hook);
  }
}

function onUnmounted(hook) {
  const target = currentInstance;
  if (target) {
    if (!target.unmounted) {
      target.unmounted = [];
    }
    target.unmounted.push(hook);
  }
}

module.exports = {
  createComponentInstance,
  setupComponent,
  mountComponent,
  getCurrentInstance,
  onMounted,
  onUpdated,
  onUnmounted
};