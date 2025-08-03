/**
 * 渲染模块
 * 提供简化的渲染接口
 */

import { render as reconcilerRender } from './reconciler.js';

/**
 * 渲染虚拟DOM到真实DOM
 * @param {object} element - 虚拟DOM元素
 * @param {Element} container - 容器DOM节点
 */
export function render(element, container) {
  return reconcilerRender(element, container);
}

/**
 * 创建根节点（React 18风格的API）
 * @param {Element} container - 容器DOM节点
 * @returns {object} 根节点对象
 */
export function createRoot(container) {
  return {
    render(element) {
      return render(element, container);
    },
    unmount() {
      return render(null, container);
    }
  };
}

/**
 * 卸载组件
 * @param {Element} container - 容器DOM节点
 */
export function unmountComponentAtNode(container) {
  return render(null, container);
}

/**
 * 批量更新（简化版）
 * @param {function} fn - 要执行的函数
 */
export function unstable_batchedUpdates(fn) {
  // 在真实的React中，这会批量处理状态更新
  // 这里简化为直接执行
  return fn();
}

/**
 * 刷新同步更新（简化版）
 */
export function flushSync(fn) {
  // 在真实的React中，这会同步刷新更新
  // 这里简化为直接执行
  return fn();
}