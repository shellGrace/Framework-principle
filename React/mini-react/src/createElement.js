/**
 * 创建虚拟DOM元素
 * @param {string|function} type - 元素类型或组件函数
 * @param {object} props - 属性对象
 * @param {...any} children - 子元素
 * @returns {object} 虚拟DOM对象
 */
export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object'
          ? child
          : createTextElement(child)
      ),
    },
  };
}

/**
 * 创建文本元素
 * @param {string|number} text - 文本内容
 * @returns {object} 文本虚拟DOM对象
 */
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/**
 * JSX转换函数（用于支持JSX语法）
 * @param {string|function} type - 元素类型
 * @param {object} props - 属性
 * @param {...any} children - 子元素
 * @returns {object} 虚拟DOM对象
 */
export function jsx(type, props, ...children) {
  return createElement(type, props, ...children);
}

// 为了兼容React的JSX转换
export const React = {
  createElement,
};