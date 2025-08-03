/**
 * 代码模板类
 * 用于生成最终的 bundle 代码
 */
class Template {
  constructor() {
    this.indent = '  '; // 缩进字符
  }
  
  /**
   * 渲染完整的 bundle
   */
  render(options) {
    const {
      moduleMap,
      runtime,
      entryModuleId,
      chunkName,
      runtimeRequirements
    } = options;
    
    return this.generateBundle({
      moduleMap,
      runtime,
      entryModuleId,
      chunkName,
      runtimeRequirements
    });
  }
  
  /**
   * 生成完整的 bundle 代码
   */
  generateBundle(options) {
    const {
      moduleMap,
      runtime,
      entryModuleId,
      chunkName
    } = options;
    
    return `
/******/ (() => { // webpackBootstrap
/******/ ${this.indent}"use strict";
/******/ ${this.indent}var __webpack_modules__ = (${this.generateModuleMap(moduleMap)});
/******/ 
${this.addIndent(runtime, '/******/ ')}
/******/ 
/******/ ${this.indent}// startup
/******/ ${this.indent}// Load entry module and return exports
/******/ ${this.indent}// This entry module is referenced by other modules so it can't be inlined
/******/ ${this.indent}var __webpack_exports__ = __webpack_require__(${entryModuleId || 0});
/******/ 
/******/ })();
    `.trim();
  }
  
  /**
   * 生成模块映射代码
   */
  generateModuleMap(moduleMap) {
    const modules = Object.keys(moduleMap).map(moduleId => {
      const module = moduleMap[moduleId];
      return `\n/***/ ${moduleId}:\n/***/ (${module.code})\n`;
    });
    
    return `{${modules.join(',')}/***/ }`;
  }
  
  /**
   * 生成模块函数包装器
   */
  generateModuleWrapper(moduleSource, dependencies = {}) {
    // 处理依赖映射
    let processedSource = moduleSource;
    
    // 替换 require 调用
    Object.keys(dependencies).forEach(request => {
      const moduleId = dependencies[request];
      const requireRegex = new RegExp(`require\\(['"]${this.escapeRegex(request)}['"]\\)`, 'g');
      processedSource = processedSource.replace(requireRegex, `require(${moduleId})`);
    });
    
    // 替换 import 语句
    Object.keys(dependencies).forEach(request => {
      const moduleId = dependencies[request];
      const importRegex = new RegExp(`from\\s+['"]${this.escapeRegex(request)}['"]`, 'g');
      processedSource = processedSource.replace(importRegex, `from ${moduleId}`);
    });
    
    return `function(module, exports, require) {
${this.addIndent(processedSource)}
}`;
  }
  
  /**
   * 生成 CommonJS 模块包装器
   */
  generateCommonJSWrapper(moduleSource) {
    return `function(module, exports, require) {
${this.addIndent(moduleSource)}
}`;
  }
  
  /**
   * 生成 ES6 模块包装器
   */
  generateESModuleWrapper(moduleSource) {
    return `function(module, __webpack_exports__, __webpack_require__) {
${this.addIndent('"use strict";')}
${this.addIndent('__webpack_require__.r(__webpack_exports__);')}
${this.addIndent(moduleSource)}
}`;
  }
  
  /**
   * 生成运行时代码
   */
  generateRuntime(runtimeRequirements = new Set()) {
    const runtime = [];
    
    // 基础 require 函数
    runtime.push(this.generateRequireFunction());
    
    // ES6 模块支持
    if (runtimeRequirements.has('esModule')) {
      runtime.push(this.generateESModuleRuntime());
    }
    
    // 动态导入支持
    if (runtimeRequirements.has('import')) {
      runtime.push(this.generateDynamicImportRuntime());
    }
    
    // 公共路径支持
    if (runtimeRequirements.has('publicPath')) {
      runtime.push(this.generatePublicPathRuntime());
    }
    
    return runtime.join('\n\n');
  }
  
  /**
   * 生成基础 require 函数
   */
  generateRequireFunction() {
    return `
// The require function
function __webpack_require__(moduleId) {
${this.indent}// Check if module is in cache
${this.indent}var cachedModule = __webpack_module_cache__[moduleId];
${this.indent}if (cachedModule !== undefined) {
${this.indent}${this.indent}return cachedModule.exports;
${this.indent}}
${this.indent}// Create a new module (and put it into the cache)
${this.indent}var module = __webpack_module_cache__[moduleId] = {
${this.indent}${this.indent}id: moduleId,
${this.indent}${this.indent}exports: {}
${this.indent}};

${this.indent}// Execute the module function
${this.indent}__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

${this.indent}// Return the exports of the module
${this.indent}return module.exports;
}

// The module cache
var __webpack_module_cache__ = {};
    `.trim();
  }
  
  /**
   * 生成 ES6 模块运行时
   */
  generateESModuleRuntime() {
    return `
// define getter functions for harmony exports
__webpack_require__.d = (exports, definition) => {
${this.indent}for(var key in definition) {
${this.indent}${this.indent}if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
${this.indent}${this.indent}${this.indent}Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
${this.indent}${this.indent}}
${this.indent}}
};

// define __esModule on exports
__webpack_require__.r = (exports) => {
${this.indent}if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
${this.indent}${this.indent}Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
${this.indent}}
${this.indent}Object.defineProperty(exports, '__esModule', { value: true });
};

// create a fake namespace object
__webpack_require__.t = (value, mode) => {
${this.indent}if(mode & 1) value = __webpack_require__(value);
${this.indent}if(mode & 8) return value;
${this.indent}if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
${this.indent}var ns = Object.create(null);
${this.indent}__webpack_require__.r(ns);
${this.indent}Object.defineProperty(ns, 'default', { enumerable: true, value: value });
${this.indent}if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, { [key]: () => value[key] });
${this.indent}return ns;
};

// Object.prototype.hasOwnProperty.call
__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
    `.trim();
  }
  
  /**
   * 生成动态导入运行时
   */
  generateDynamicImportRuntime() {
    return `
// This function allow to reference async chunks
__webpack_require__.u = (chunkId) => {
${this.indent}// return url for filenames based on template
${this.indent}return "" + chunkId + ".js";
};

// This function allow to reference all chunks
__webpack_require__.miniCssF = (chunkId) => {
${this.indent}// return url for filenames based on template
${this.indent}return "" + chunkId + ".css";
};

// object to store loaded and loading chunks
var installedChunks = {
${this.indent}0: 0
};

// __webpack_require__.e = chunk loading function for javascript
__webpack_require__.e = (chunkId) => {
${this.indent}return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
${this.indent}${this.indent}__webpack_require__.f[key](chunkId, promises);
${this.indent}${this.indent}return promises;
${this.indent}}, []));
};
    `.trim();
  }
  
  /**
   * 生成公共路径运行时
   */
  generatePublicPathRuntime() {
    return `
// __webpack_require__.p = public path
__webpack_require__.p = "";
    `.trim();
  }
  
  /**
   * 添加缩进
   */
  addIndent(code, prefix = '') {
    return code.split('\n').map(line => {
      if (line.trim() === '') return line;
      return prefix + this.indent + line;
    }).join('\n');
  }
  
  /**
   * 转义正则表达式特殊字符
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 生成注释
   */
  generateComment(text) {
    return `/* ${text} */`;
  }
  
  /**
   * 生成多行注释
   */
  generateMultilineComment(lines) {
    const commentLines = lines.map(line => ` * ${line}`);
    return `/*\n${commentLines.join('\n')}\n */`;
  }
  
  /**
   * 生成文件头注释
   */
  generateFileHeader(options = {}) {
    const {
      filename = 'bundle.js',
      version = '1.0.0',
      timestamp = new Date().toISOString()
    } = options;
    
    return this.generateMultilineComment([
      `Mini-Webpack Bundle`,
      `File: ${filename}`,
      `Version: ${version}`,
      `Generated: ${timestamp}`,
      ``,
      `This file is generated by mini-webpack.`,
      `Do not edit this file directly.`
    ]);
  }
}

module.exports = Template;