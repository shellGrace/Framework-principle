/**
 * Mini-React 入口文件
 * 导出所有核心API
 */

// 导入所有模块
import { createElement, jsx, React } from './createElement.js';
import { render, createRoot, unmountComponentAtNode, unstable_batchedUpdates, flushSync } from './render.js';
import { scheduleUpdate } from './reconciler.js';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useReducer
} from './hooks.js';
import {
  scheduleCallback,
  cancelCallback,
  getCurrentTime,
  runWithPriority,
  requestIdleCallback
} from './scheduler.js';
import {
  createFiber,
  createDom,
  updateDom,
  sameType,
  EFFECT_TAGS
} from './fiber.js';

// 重新导出所有API
export {
  createElement,
  jsx,
  React,
  render,
  createRoot,
  unmountComponentAtNode,
  unstable_batchedUpdates,
  flushSync,
  scheduleUpdate,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useReducer,
  scheduleCallback,
  cancelCallback,
  getCurrentTime,
  runWithPriority,
  requestIdleCallback,
  createFiber,
  createDom,
  updateDom,
  sameType,
  EFFECT_TAGS
};

// 版本信息
export const version = '1.0.0';

// 默认导出（兼容不同的导入方式）
const MiniReact = {
  createElement,
  jsx,
  React,
  render,
  createRoot,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useReducer,
  version,
};

export default MiniReact;

// 全局暴露（用于调试）
if (typeof window !== 'undefined') {
  window.MiniReact = MiniReact;
}