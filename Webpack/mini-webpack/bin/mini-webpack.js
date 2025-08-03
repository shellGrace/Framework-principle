#!/usr/bin/env node

/**
 * Mini Webpack CLI 入口文件
 * 提供命令行接口来使用 Mini Webpack
 */

const path = require('path');
const { CLI } = require('../src/index');

// 设置进程标题
process.title = 'mini-webpack';

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:');
  console.error(error.stack || error.message);
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的 Promise 拒绝:');
  console.error(reason);
  process.exit(1);
});

// 处理进程退出信号
process.on('SIGINT', () => {
  console.log('\n\n👋 收到退出信号，正在清理...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 收到终止信号，正在清理...');
  process.exit(0);
});

// 主函数
async function main() {
  try {
    // 创建 CLI 实例
    const cli = new CLI();
    
    // 运行 CLI
    await cli.run(process.argv);
  } catch (error) {
    console.error('\n❌ CLI 运行失败:');
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

// 启动应用
main();