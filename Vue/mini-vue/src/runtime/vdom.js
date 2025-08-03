// 虚拟DOM实现

// 创建虚拟节点
function createVNode(tag, props = {}, children = []) {
  return {
    tag,
    props,
    children,
    el: null // 对应的真实DOM元素
  };
}

// h函数 - 创建VNode的辅助函数
function h(tag, props, children) {
  if (typeof children === 'string') {
    children = [children];
  }
  return createVNode(tag, props, children);
}

// 挂载虚拟节点到真实DOM
function mount(vnode, container) {
  // 创建真实DOM元素
  const el = document.createElement(vnode.tag);
  vnode.el = el;
  
  // 设置属性
  if (vnode.props) {
    for (const key in vnode.props) {
      const value = vnode.props[key];
      
      if (key.startsWith('on')) {
        // 事件处理
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
      } else {
        // 普通属性
        el.setAttribute(key, value);
      }
    }
  }
  
  // 处理子节点
  if (vnode.children) {
    vnode.children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        mount(child, el);
      }
    });
  }
  
  container.appendChild(el);
}

// 简单的diff算法
function patch(oldVNode, newVNode) {
  if (oldVNode.tag !== newVNode.tag) {
    // 标签不同，直接替换
    const newEl = document.createElement(newVNode.tag);
    newVNode.el = newEl;
    oldVNode.el.parentNode.replaceChild(newEl, oldVNode.el);
    mount(newVNode, newEl.parentNode);
    return;
  }
  
  const el = newVNode.el = oldVNode.el;
  
  // 更新属性
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  
  // 添加新属性或更新属性
  for (const key in newProps) {
    const oldValue = oldProps[key];
    const newValue = newProps[key];
    
    if (newValue !== oldValue) {
      if (key.startsWith('on')) {
        const event = key.slice(2).toLowerCase();
        if (oldValue) {
          el.removeEventListener(event, oldValue);
        }
        el.addEventListener(event, newValue);
      } else {
        el.setAttribute(key, newValue);
      }
    }
  }
  
  // 移除旧属性
  for (const key in oldProps) {
    if (!(key in newProps)) {
      if (key.startsWith('on')) {
        const event = key.slice(2).toLowerCase();
        el.removeEventListener(event, oldProps[key]);
      } else {
        el.removeAttribute(key);
      }
    }
  }
  
  // 更新子节点
  const oldChildren = oldVNode.children || [];
  const newChildren = newVNode.children || [];
  
  const commonLength = Math.min(oldChildren.length, newChildren.length);
  
  // 更新公共部分
  for (let i = 0; i < commonLength; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];
    
    if (typeof oldChild === 'string' && typeof newChild === 'string') {
      if (oldChild !== newChild) {
        el.childNodes[i].textContent = newChild;
      }
    } else if (typeof oldChild === 'object' && typeof newChild === 'object') {
      patch(oldChild, newChild);
    }
  }
  
  // 添加新子节点
  if (newChildren.length > oldChildren.length) {
    for (let i = commonLength; i < newChildren.length; i++) {
      const child = newChildren[i];
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        mount(child, el);
      }
    }
  }
  
  // 移除多余的旧子节点
  if (oldChildren.length > newChildren.length) {
    for (let i = commonLength; i < oldChildren.length; i++) {
      el.removeChild(el.childNodes[commonLength]);
    }
  }
}

module.exports = {
  createVNode,
  h,
  mount,
  patch
};