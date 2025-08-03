// 主入口文件
import './styles/main.css';
import { createApp } from './app';
import { utils } from 'utils';
import config from './config.json';

console.log('Mini Webpack 示例应用启动');
console.log('环境:', process.env.NODE_ENV);
console.log('版本:', __VERSION__);
console.log('API地址:', __API_URL__);
console.log('配置:', config);

// 创建应用
const app = createApp();

// 挂载到 DOM
const container = document.getElementById('app');
if (container) {
  container.appendChild(app);
} else {
  document.body.appendChild(app);
}

// 热更新支持
if (module.hot) {
  module.hot.accept('./app', () => {
    console.log('热更新: 应用模块已更新');
    // 重新创建应用
    const newApp = createApp();
    container.replaceChild(newApp, app);
  });
}

// 演示动态导入
const loadFeature = async () => {
  try {
    const { feature } = await import('./features/dynamic-feature');
    feature();
  } catch (error) {
    console.error('加载功能模块失败:', error);
  }
};

// 添加按钮来测试动态导入
const button = document.createElement('button');
button.textContent = '加载动态功能';
button.onclick = loadFeature;
container.appendChild(button);

// 演示工具函数
utils.log('应用初始化完成');
utils.formatDate(new Date());