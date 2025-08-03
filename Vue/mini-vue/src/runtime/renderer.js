// 渲染器实现

const { mount, patch } = require('./vdom');
const { mountComponent } = require('./component');

// 创建渲染器
function createRenderer() {
  const render = (vnode, container) => {
    if (vnode == null) {
      // 卸载
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 挂载或更新
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  
  const patch = (n1, n2, container) => {
    if (n1 === n2) {
      return;
    }
    
    // 如果新旧节点类型不同，直接卸载旧节点
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1);
      n1 = null;
    }
    
    const { type, shapeFlag } = n2;
    
    switch (type) {
      case 'text':
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & 1) { // ELEMENT
          processElement(n1, n2, container);
        } else if (shapeFlag & 4) { // STATEFUL_COMPONENT
          processComponent(n1, n2, container);
        }
    }
  };
  
  const processText = (n1, n2, container) => {
    if (n1 == null) {
      // 挂载文本节点
      n2.el = document.createTextNode(n2.children);
      container.appendChild(n2.el);
    } else {
      // 更新文本节点
      const el = n2.el = n1.el;
      if (n2.children !== n1.children) {
        el.textContent = n2.children;
      }
    }
  };
  
  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      // 挂载元素
      mountElement(n2, container);
    } else {
      // 更新元素
      patchElement(n1, n2);
    }
  };
  
  const mountElement = (vnode, container) => {
    mount(vnode, container);
  };
  
  const patchElement = (n1, n2) => {
    patch(n1, n2);
  };
  
  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      // 挂载组件
      mountComponent(n2, container);
    } else {
      // 更新组件
      updateComponent(n1, n2);
    }
  };
  
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };
  
  const shouldUpdateComponent = (prevVNode, nextVNode) => {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    
    if (prevProps === nextProps) {
      return false;
    }
    
    if (!prevProps) {
      return !!nextProps;
    }
    
    if (!nextProps) {
      return true;
    }
    
    return hasPropsChanged(prevProps, nextProps);
  };
  
  const hasPropsChanged = (prevProps, nextProps) => {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    
    return false;
  };
  
  const unmount = (vnode) => {
    if (vnode.el && vnode.el.parentNode) {
      vnode.el.parentNode.removeChild(vnode.el);
    }
  };
  
  const isSameVNodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key;
  };
  
  return {
    render
  };
}

// 创建应用实例
function createApp(rootComponent) {
  const renderer = createRenderer();
  
  const app = {
    mount(rootContainer) {
      if (typeof rootContainer === 'string') {
        rootContainer = document.querySelector(rootContainer);
      }
      
      const vnode = createVNode(rootComponent);
      renderer.render(vnode, rootContainer);
    }
  };
  
  return app;
}

// 创建VNode
function createVNode(type, props, children) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type),
    el: null,
    key: props && props.key
  };
  
  // 标准化children
  normalizeChildren(vnode, children);
  
  return vnode;
}

// 获取形状标志
function getShapeFlag(type) {
  return typeof type === 'string' ? 1 : 4; // ELEMENT : STATEFUL_COMPONENT
}

// 标准化children
function normalizeChildren(vnode, children) {
  let type = 0;
  const { shapeFlag } = vnode;
  
  if (children == null) {
    children = null;
  } else if (Array.isArray(children)) {
    type = 16; // ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    type = 32; // SLOTS_CHILDREN
  } else if (typeof children === 'string') {
    children = String(children);
    type = 8; // TEXT_CHILDREN
  }
  
  vnode.children = children;
  vnode.shapeFlag |= type;
}

module.exports = {
  createRenderer,
  createApp,
  createVNode
};