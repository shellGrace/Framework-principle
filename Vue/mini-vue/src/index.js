// Mini Vue 主入口文件

// 响应式系统
const { reactive, ref, effect, computed } = require('./reactivity/reactive');

// 虚拟DOM
const { h } = require('./runtime/vdom');

// 渲染器
const { createApp } = require('./runtime/renderer');

// 组件系统
const { getCurrentInstance, onMounted, onUpdated, onUnmounted } = require('./runtime/component');

// 导出所有API
module.exports = {
  // 响应式API
  reactive,
  ref,
  effect,
  computed,
  
  // 渲染API
  h,
  createApp,
  
  // 组件API
  getCurrentInstance,
  onMounted,
  onUpdated,
  onUnmounted
};