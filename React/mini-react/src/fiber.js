/**
 * Fiber节点结构
 * Fiber是React 16引入的新架构，用于实现可中断的渲染
 */

/**
 * 创建Fiber节点
 * @param {object} element - 虚拟DOM元素
 * @param {object} parent - 父Fiber节点
 * @param {object} alternate - 对应的旧Fiber节点
 * @returns {object} Fiber节点
 */
export function createFiber(element, parent = null, alternate = null) {
  const fiber = {
    // 基本信息
    type: element?.type,
    props: element?.props || {},
    
    // DOM相关
    dom: null,
    
    // Fiber树结构
    parent,
    child: null,
    sibling: null,
    
    // 更新相关
    alternate,
    effectTag: null,
    hooks: null,
    hookIndex: 0,
  };
  
  return fiber;
}

/**
 * 效果标签枚举
 */
export const EFFECT_TAGS = {
  PLACEMENT: 'PLACEMENT',   // 新增
  UPDATE: 'UPDATE',         // 更新
  DELETION: 'DELETION',     // 删除
};

/**
 * 创建DOM节点
 * @param {object} fiber - Fiber节点
 * @returns {Element|Text} DOM节点
 */
export function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT'
    ? document.createTextNode('')
    : document.createElement(fiber.type);
    
  updateDom(dom, {}, fiber.props);
  
  return dom;
}

/**
 * 更新DOM属性
 * @param {Element} dom - DOM节点
 * @param {object} prevProps - 旧属性
 * @param {object} nextProps - 新属性
 */
export function updateDom(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith('on');
  const isProperty = key => key !== 'children' && !isEvent(key);
  const isNew = (prev, next) => key => prev[key] !== next[key];
  const isGone = (prev, next) => key => !(key in next);
  
  // 移除旧的事件监听器
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
    
  // 移除旧属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '';
    });
    
  // 设置新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });
    
  // 添加新的事件监听器
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

/**
 * 比较两个Fiber节点是否可以复用
 * @param {object} oldFiber - 旧Fiber节点
 * @param {object} element - 新虚拟DOM元素
 * @returns {boolean} 是否可以复用
 */
export function sameType(oldFiber, element) {
  return oldFiber && element && oldFiber.type === element.type;
}