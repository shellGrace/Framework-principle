/**
 * 协调器（Reconciler）
 * 负责虚拟DOM的比较、更新和调度
 */

import { createFiber, createDom, updateDom, sameType, EFFECT_TAGS } from './fiber.js';
import { setCurrentFiber } from './hooks.js';
import { scheduleCallback } from './scheduler.js';

// 全局状态
let wipRoot = null;           // 正在工作的根Fiber
let currentRoot = null;       // 当前根Fiber
let nextUnitOfWork = null;    // 下一个工作单元
let deletions = null;         // 待删除的节点

/**
 * 渲染函数
 * @param {object} element - 虚拟DOM元素
 * @param {Element} container - 容器DOM节点
 */
export function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  
  deletions = [];
  nextUnitOfWork = wipRoot;
  
  // 开始工作循环
  scheduleCallback(workLoop);
}

/**
 * 工作循环
 * 实现时间切片，可中断的渲染
 */
function workLoop() {
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  
  // 如果没有下一个工作单元且有根节点，提交更改
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
}

/**
 * 执行工作单元
 * @param {object} fiber - 当前Fiber节点
 * @returns {object|null} 下一个工作单元
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  
  // 返回下一个工作单元
  if (fiber.child) {
    return fiber.child;
  }
  
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  
  return null;
}

/**
 * 更新函数组件
 * @param {object} fiber - Fiber节点
 */
function updateFunctionComponent(fiber) {
  setCurrentFiber(fiber);
  
  // 执行函数组件，获取子元素
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

/**
 * 更新宿主组件（DOM元素）
 * @param {object} fiber - Fiber节点
 */
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  
  reconcileChildren(fiber, fiber.props.children);
}

/**
 * 协调子元素
 * @param {object} wipFiber - 正在工作的Fiber节点
 * @param {Array} elements - 子元素数组
 */
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    
    const sameTypeFlag = sameType(oldFiber, element);
    
    if (sameTypeFlag) {
      // 更新节点
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: EFFECT_TAGS.UPDATE,
      };
    }
    
    if (element && !sameTypeFlag) {
      // 新增节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: EFFECT_TAGS.PLACEMENT,
      };
    }
    
    if (oldFiber && !sameTypeFlag) {
      // 删除节点
      oldFiber.effectTag = EFFECT_TAGS.DELETION;
      deletions.push(oldFiber);
    }
    
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }
    
    prevSibling = newFiber;
    index++;
  }
}

/**
 * 提交根节点
 */
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * 提交工作
 * @param {object} fiber - Fiber节点
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;
  
  if (fiber.effectTag === EFFECT_TAGS.PLACEMENT && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === EFFECT_TAGS.UPDATE && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === EFFECT_TAGS.DELETION) {
    commitDeletion(fiber, domParent);
  }
  
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 提交删除操作
 * @param {object} fiber - 要删除的Fiber节点
 * @param {Element} domParent - 父DOM节点
 */
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

/**
 * 调度更新
 */
export function scheduleUpdate() {
  if (currentRoot) {
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    
    nextUnitOfWork = wipRoot;
    deletions = [];
    
    scheduleCallback(workLoop);
  }
}

// 将scheduleUpdate暴露给hooks使用
if (typeof window !== 'undefined') {
  window.__miniReactScheduleUpdate = scheduleUpdate;
}