// 动态导入的功能模块
import { utils } from '../utils';

/**
 * 动态功能实现
 */
export function feature() {
  utils.log('动态功能模块已加载');
  
  // 创建功能面板
  const panel = createFeaturePanel();
  
  // 添加到页面
  const container = document.getElementById('app') || document.body;
  container.appendChild(panel);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
      utils.log('动态功能面板已移除');
    }
  }, 5000);
}

/**
 * 创建功能面板
 */
function createFeaturePanel() {
  const panel = document.createElement('div');
  panel.className = 'dynamic-feature-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  // 添加动画样式
  if (!document.getElementById('dynamic-feature-styles')) {
    const style = document.createElement('style');
    style.id = 'dynamic-feature-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .dynamic-feature-panel.closing {
        animation: slideOut 0.3s ease-in;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 标题
  const title = document.createElement('h3');
  title.textContent = '🚀 动态功能';
  title.style.cssText = 'margin: 0 0 15px 0; font-size: 18px;';
  panel.appendChild(title);
  
  // 描述
  const description = document.createElement('p');
  description.textContent = '这是一个通过动态导入加载的功能模块，演示了代码分割的能力。';
  description.style.cssText = 'margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;';
  panel.appendChild(description);
  
  // 功能列表
  const features = [
    '✨ 动态导入',
    '📦 代码分割',
    '⚡ 按需加载',
    '🎯 性能优化'
  ];
  
  const featureList = document.createElement('ul');
  featureList.style.cssText = 'margin: 0 0 15px 0; padding-left: 20px;';
  
  features.forEach(feature => {
    const item = document.createElement('li');
    item.textContent = feature;
    item.style.cssText = 'margin: 5px 0; font-size: 14px;';
    featureList.appendChild(item);
  });
  
  panel.appendChild(featureList);
  
  // 交互按钮
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 10px;';
  
  // 随机颜色按钮
  const colorButton = document.createElement('button');
  colorButton.textContent = '随机颜色';
  colorButton.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background: rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s;
  `;
  
  colorButton.onmouseover = () => {
    colorButton.style.background = 'rgba(255,255,255,0.3)';
  };
  
  colorButton.onmouseout = () => {
    colorButton.style.background = 'rgba(255,255,255,0.2)';
  };
  
  colorButton.onclick = () => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    panel.style.background = randomColor;
    
    utils.log('面板颜色已更改');
  };
  
  // 关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '关闭';
  closeButton.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background: rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s;
  `;
  
  closeButton.onmouseover = () => {
    closeButton.style.background = 'rgba(255,255,255,0.3)';
  };
  
  closeButton.onmouseout = () => {
    closeButton.style.background = 'rgba(255,255,255,0.2)';
  };
  
  closeButton.onclick = () => {
    panel.classList.add('closing');
    setTimeout(() => {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
        utils.log('动态功能面板已手动关闭');
      }
    }, 300);
  };
  
  buttonContainer.appendChild(colorButton);
  buttonContainer.appendChild(closeButton);
  panel.appendChild(buttonContainer);
  
  // 进度条
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    margin-top: 15px;
    height: 4px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    overflow: hidden;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    background: rgba(255,255,255,0.8);
    border-radius: 2px;
    width: 0%;
    transition: width 0.1s ease;
  `;
  
  progressContainer.appendChild(progressBar);
  panel.appendChild(progressContainer);
  
  // 进度条动画
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 2;
    progressBar.style.width = `${progress}%`;
    
    if (progress >= 100) {
      clearInterval(progressInterval);
      setTimeout(() => {
        progressBar.style.background = '#4CAF50';
      }, 100);
    }
  }, 100);
  
  return panel;
}

/**
 * 异步功能
 */
export async function asyncFeature() {
  utils.log('开始执行异步功能');
  
  // 模拟异步操作
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  utils.log('异步功能执行完成');
  
  return {
    success: true,
    message: '异步功能执行成功',
    timestamp: new Date().toISOString()
  };
}

/**
 * 数据处理功能
 */
export function processData(data) {
  utils.log('开始处理数据', data);
  
  const processed = {
    original: data,
    processed: {
      count: Array.isArray(data) ? data.length : Object.keys(data).length,
      type: Array.isArray(data) ? 'array' : typeof data,
      timestamp: Date.now()
    }
  };
  
  utils.log('数据处理完成', processed);
  
  return processed;
}

// 默认导出
export default {
  feature,
  asyncFeature,
  processData
};