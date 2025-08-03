/**
 * Mini-React 基础功能测试
 * 这是一个简单的测试文件，用于验证核心功能
 */

import { createElement, render, useState, useEffect } from '../src/index.js';

// 简单的测试框架
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log('🧪 Running Mini-React Tests...');
    console.log('================================');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.error(`   Error: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log('================================');
    console.log(`📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
    }
  }
}

const runner = new TestRunner();

// 测试createElement
runner.test('createElement should create virtual DOM element', () => {
  const element = createElement('div', { className: 'test' }, 'Hello');
  
  if (element.type !== 'div') {
    throw new Error('Element type should be div');
  }
  
  if (element.props.className !== 'test') {
    throw new Error('Element should have className prop');
  }
  
  if (element.props.children.length !== 1) {
    throw new Error('Element should have one child');
  }
  
  if (element.props.children[0].props.nodeValue !== 'Hello') {
    throw new Error('Child should be text element with "Hello"');
  }
});

// 测试嵌套元素
runner.test('createElement should handle nested elements', () => {
  const element = createElement('div', null,
    createElement('h1', null, 'Title'),
    createElement('p', null, 'Content')
  );
  
  if (element.props.children.length !== 2) {
    throw new Error('Should have two children');
  }
  
  if (element.props.children[0].type !== 'h1') {
    throw new Error('First child should be h1');
  }
  
  if (element.props.children[1].type !== 'p') {
    throw new Error('Second child should be p');
  }
});

// 测试函数组件
runner.test('Function component should work', () => {
  function TestComponent(props) {
    return createElement('div', null, `Hello ${props.name}`);
  }
  
  const element = createElement(TestComponent, { name: 'World' });
  
  if (typeof element.type !== 'function') {
    throw new Error('Element type should be function');
  }
  
  if (element.props.name !== 'World') {
    throw new Error('Props should be passed correctly');
  }
});

// 测试渲染到DOM
runner.test('render should create DOM elements', () => {
  // 创建测试容器
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const element = createElement('div', { id: 'test' },
    createElement('h1', null, 'Test Title'),
    createElement('p', null, 'Test content')
  );
  
  render(element, container);
  
  // 检查DOM是否正确创建
  const renderedDiv = container.querySelector('#test');
  if (!renderedDiv) {
    throw new Error('Div with id "test" should be rendered');
  }
  
  const h1 = renderedDiv.querySelector('h1');
  if (!h1 || h1.textContent !== 'Test Title') {
    throw new Error('H1 element should be rendered with correct content');
  }
  
  const p = renderedDiv.querySelector('p');
  if (!p || p.textContent !== 'Test content') {
    throw new Error('P element should be rendered with correct content');
  }
  
  // 清理
  document.body.removeChild(container);
});

// 测试useState Hook
runner.test('useState should work in function component', async () => {
  let stateValue = null;
  let setStateFunction = null;
  
  function TestComponent() {
    const [state, setState] = useState('initial');
    stateValue = state;
    setStateFunction = setState;
    
    return createElement('div', null, state);
  }
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  render(createElement(TestComponent), container);
  
  if (stateValue !== 'initial') {
    throw new Error('Initial state should be "initial"');
  }
  
  if (typeof setStateFunction !== 'function') {
    throw new Error('setState should be a function');
  }
  
  // 清理
  document.body.removeChild(container);
});

// 测试useEffect Hook
runner.test('useEffect should work in function component', async () => {
  let effectCalled = false;
  
  function TestComponent() {
    useEffect(() => {
      effectCalled = true;
    }, []);
    
    return createElement('div', null, 'Effect test');
  }
  
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  render(createElement(TestComponent), container);
  
  // 等待effect执行
  await new Promise(resolve => setTimeout(resolve, 10));
  
  if (!effectCalled) {
    throw new Error('Effect should be called');
  }
  
  // 清理
  document.body.removeChild(container);
});

// 运行测试
if (typeof window !== 'undefined') {
  // 在浏览器中运行
  window.addEventListener('DOMContentLoaded', () => {
    runner.run();
  });
} else {
  // 在Node.js中运行
  runner.run();
}

export default runner;