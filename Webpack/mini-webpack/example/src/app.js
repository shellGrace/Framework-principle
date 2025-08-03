// 应用主模块
import { Component } from './components/component';
import { EventBus } from './utils/event-bus';

export function createApp() {
  const app = document.createElement('div');
  app.className = 'app';
  
  // 创建标题
  const title = document.createElement('h1');
  title.textContent = 'Mini Webpack 示例应用';
  title.className = 'app-title';
  app.appendChild(title);
  
  // 创建描述
  const description = document.createElement('p');
  description.textContent = '这是一个使用 Mini Webpack 构建的示例应用，演示了模块打包、热更新、代码分割等功能。';
  description.className = 'app-description';
  app.appendChild(description);
  
  // 创建功能列表
  const features = [
    '✅ ES6 模块支持',
    '✅ CSS 样式处理',
    '✅ JSON 文件导入',
    '✅ 代码分割',
    '✅ 热更新',
    '✅ 插件系统',
    '✅ 开发服务器'
  ];
  
  const featureList = document.createElement('ul');
  featureList.className = 'feature-list';
  
  features.forEach(feature => {
    const item = document.createElement('li');
    item.textContent = feature;
    item.className = 'feature-item';
    featureList.appendChild(item);
  });
  
  app.appendChild(featureList);
  
  // 创建组件实例
  const component = new Component('示例组件');
  app.appendChild(component.render());
  
  // 创建事件总线示例
  const eventBus = new EventBus();
  
  // 添加事件监听
  eventBus.on('test-event', (data) => {
    console.log('收到事件:', data);
    
    const message = document.createElement('div');
    message.textContent = `事件触发: ${data.message}`;
    message.className = 'event-message';
    app.appendChild(message);
    
    // 3秒后移除消息
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  });
  
  // 添加触发事件的按钮
  const eventButton = document.createElement('button');
  eventButton.textContent = '触发事件';
  eventButton.className = 'event-button';
  eventButton.onclick = () => {
    eventBus.emit('test-event', {
      message: `事件在 ${new Date().toLocaleTimeString()} 触发`,
      timestamp: Date.now()
    });
  };
  
  app.appendChild(eventButton);
  
  // 添加计数器示例
  let count = 0;
  const counter = document.createElement('div');
  counter.className = 'counter';
  
  const countDisplay = document.createElement('span');
  countDisplay.textContent = `计数: ${count}`;
  countDisplay.className = 'count-display';
  
  const incrementButton = document.createElement('button');
  incrementButton.textContent = '增加';
  incrementButton.className = 'increment-button';
  incrementButton.onclick = () => {
    count++;
    countDisplay.textContent = `计数: ${count}`;
  };
  
  const decrementButton = document.createElement('button');
  decrementButton.textContent = '减少';
  decrementButton.className = 'decrement-button';
  decrementButton.onclick = () => {
    count--;
    countDisplay.textContent = `计数: ${count}`;
  };
  
  counter.appendChild(countDisplay);
  counter.appendChild(incrementButton);
  counter.appendChild(decrementButton);
  app.appendChild(counter);
  
  // 添加当前时间显示
  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  
  const updateTime = () => {
    timeDisplay.textContent = `当前时间: ${new Date().toLocaleString()}`;
  };
  
  updateTime();
  setInterval(updateTime, 1000);
  
  app.appendChild(timeDisplay);
  
  return app;
}

// 导出一些工具函数
export const appUtils = {
  createElement(tag, className, textContent) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  },
  
  formatNumber(num) {
    return num.toLocaleString();
  },
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};