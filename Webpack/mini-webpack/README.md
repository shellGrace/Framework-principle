# Mini-Webpack

一个简化版的 Webpack 实现，用于学习和理解 Webpack 的核心原理。

## 🚀 功能特性

- ✅ **模块解析**: 支持 ES6 模块和 CommonJS 模块
- ✅ **依赖分析**: 构建完整的模块依赖图
- ✅ **代码转换**: 使用 Babel 转换 ES6+ 代码
- ✅ **Bundle 生成**: 生成可执行的打包文件
- ✅ **Loader 系统**: 支持自定义文件处理器
- ✅ **Plugin 系统**: 支持构建过程扩展
- ✅ **开发服务器**: 内置开发服务器和热更新
- ✅ **代码分割**: 支持动态导入和代码分割

## 📁 项目结构

```
mini-webpack/
├── src/
│   ├── index.js          # 主入口文件
│   ├── compiler.js       # 编译器核心
│   ├── compilation.js    # 编译过程管理
│   ├── module.js         # 模块处理
│   ├── dependency.js     # 依赖解析
│   ├── loader.js         # Loader 系统
│   ├── plugin.js         # Plugin 系统
│   ├── chunk.js          # 代码块管理
│   ├── template.js       # 代码模板
│   └── dev-server.js     # 开发服务器
├── examples/
│   ├── basic/            # 基础示例
│   ├── loaders/          # Loader 示例
│   └── plugins/          # Plugin 示例
├── test/
│   └── test.js           # 测试文件
└── webpack.config.js     # 配置文件示例
```

## 🛠️ 使用方法

### 安装依赖

```bash
npm install
```

### 基本使用

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
};
```

### 构建项目

```bash
npm run build
```

### 开发模式

```bash
npm run dev
```

## 📚 核心概念

### 1. 模块解析

```javascript
// 支持 ES6 模块
import { add } from './math.js';

// 支持 CommonJS 模块
const { subtract } = require('./math.js');
```

### 2. Loader 系统

```javascript
// 自定义 Loader
module.exports = function(source) {
  // 处理文件内容
  return transformedSource;
};
```

### 3. Plugin 系统

```javascript
// 自定义 Plugin
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap('MyPlugin', (compilation) => {
      // 在生成文件前执行
    });
  }
}
```

## 🎯 学习目标

通过实现 Mini-Webpack，您将深入理解：

1. **模块系统**: ES6 模块和 CommonJS 的工作原理
2. **AST 解析**: 如何解析和转换 JavaScript 代码
3. **依赖图**: 如何构建和管理模块依赖关系
4. **代码生成**: 如何生成可执行的 Bundle 文件
5. **插件架构**: 如何设计可扩展的插件系统
6. **构建优化**: 代码分割、Tree Shaking 等优化技术

## 🔗 参考资源

- [Webpack 官方文档](https://webpack.js.org/)
- [Babel 官方文档](https://babeljs.io/)
- [AST Explorer](https://astexplorer.net/)
- [深入浅出 Webpack](https://webpack.wuhaolin.cn/)

## 📝 许可证

MIT License