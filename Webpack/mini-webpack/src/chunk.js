const Template = require('./template');

/**
 * 代码块类
 * 表示一个输出的代码块，包含多个模块
 */
class Chunk {
  constructor(name, compilation) {
    this.name = name; // 代码块名称
    this.id = null; // 代码块ID
    this.compilation = compilation;
    
    // 包含的模块
    this.modules = new Set();
    this.entryModule = null; // 入口模块
    
    // 代码块信息
    this.size = 0; // 代码块大小
    this.hash = ''; // 代码块hash
    this.rendered = false; // 是否已渲染
    this.files = []; // 生成的文件列表
    
    // 依赖关系
    this.parents = new Set(); // 父代码块
    this.children = new Set(); // 子代码块
    
    // 运行时信息
    this.runtime = new Set(); // 运行时模块
    this.runtimeRequirements = new Set(); // 运行时需求
  }
  
  /**
   * 添加模块到代码块
   */
  addModule(module) {
    if (!this.modules.has(module)) {
      this.modules.add(module);
      this.size += module.size || 0;
      
      // 设置入口模块
      if (!this.entryModule) {
        this.entryModule = module;
      }
    }
  }
  
  /**
   * 移除模块
   */
  removeModule(module) {
    if (this.modules.has(module)) {
      this.modules.delete(module);
      this.size -= module.size || 0;
      
      // 如果移除的是入口模块，重新设置
      if (this.entryModule === module) {
        this.entryModule = this.modules.values().next().value || null;
      }
    }
  }
  
  /**
   * 检查是否包含模块
   */
  hasModule(module) {
    return this.modules.has(module);
  }
  
  /**
   * 获取所有模块
   */
  getModules() {
    return Array.from(this.modules);
  }
  
  /**
   * 设置代码块ID
   */
  setId(id) {
    this.id = id;
  }
  
  /**
   * 添加父代码块
   */
  addParent(parent) {
    this.parents.add(parent);
    parent.children.add(this);
  }
  
  /**
   * 添加子代码块
   */
  addChild(child) {
    this.children.add(child);
    child.parents.add(this);
  }
  
  /**
   * 检查是否为入口代码块
   */
  isEntry() {
    return this.entryModule !== null;
  }
  
  /**
   * 检查是否为初始代码块
   */
  isInitial() {
    return this.isEntry() || this.parents.size === 0;
  }
  
  /**
   * 获取代码块的运行时需求
   */
  getRuntimeRequirements() {
    const requirements = new Set();
    
    // 分析模块的运行时需求
    for (const module of this.modules) {
      // 如果模块有依赖，需要 require 函数
      if (module.dependencies.length > 0) {
        requirements.add('require');
      }
      
      // 如果有动态导入，需要 import 函数
      const hasDynamicImport = module.dependencies.some(dep => dep.type === 'dynamic-import');
      if (hasDynamicImport) {
        requirements.add('import');
      }
      
      // 如果是入口模块，需要启动运行时
      if (module === this.entryModule) {
        requirements.add('startup');
      }
    }
    
    return requirements;
  }
  
  /**
   * 渲染代码块
   */
  render() {
    if (this.rendered) {
      return this.source;
    }
    
    // 为模块分配ID
    this.assignModuleIds();
    
    // 获取运行时需求
    this.runtimeRequirements = this.getRuntimeRequirements();
    
    // 生成模块映射
    const moduleMap = this.generateModuleMap();
    
    // 生成运行时代码
    const runtime = this.generateRuntime();
    
    // 使用模板生成最终代码
    const template = new Template();
    this.source = template.render({
      moduleMap,
      runtime,
      entryModuleId: this.entryModule ? this.entryModule.id : null,
      chunkName: this.name,
      runtimeRequirements: this.runtimeRequirements
    });
    
    this.rendered = true;
    return this.source;
  }
  
  /**
   * 为模块分配ID
   */
  assignModuleIds() {
    let id = 0;
    for (const module of this.modules) {
      if (module.id === null) {
        module.setId(id++);
      }
    }
  }
  
  /**
   * 生成模块映射
   */
  generateModuleMap() {
    const moduleMap = {};
    
    for (const module of this.modules) {
      moduleMap[module.id] = {
        code: this.wrapModule(module),
        dependencies: this.getModuleDependencyMap(module)
      };
    }
    
    return moduleMap;
  }
  
  /**
   * 包装模块代码
   */
  wrapModule(module) {
    const source = module.getSource();
    
    // 包装为函数
    return `function(module, exports, require) {
${source}
}`;
  }
  
  /**
   * 获取模块依赖映射
   */
  getModuleDependencyMap(module) {
    const dependencyMap = {};
    
    module.dependencies.forEach(dep => {
      if (dep.module && dep.module.id !== null) {
        dependencyMap[dep.request] = dep.module.id;
      }
    });
    
    return dependencyMap;
  }
  
  /**
   * 生成运行时代码
   */
  generateRuntime() {
    const runtime = [];
    
    // 基础运行时
    if (this.runtimeRequirements.has('require')) {
      runtime.push(this.generateRequireRuntime());
    }
    
    if (this.runtimeRequirements.has('import')) {
      runtime.push(this.generateImportRuntime());
    }
    
    if (this.runtimeRequirements.has('startup')) {
      runtime.push(this.generateStartupRuntime());
    }
    
    return runtime.join('\n\n');
  }
  
  /**
   * 生成 require 运行时
   */
  generateRequireRuntime() {
    return `
// require 函数实现
function __webpack_require__(moduleId) {
  // 检查模块是否已缓存
  if (__webpack_require__.cache[moduleId]) {
    return __webpack_require__.cache[moduleId].exports;
  }
  
  // 创建新模块并缓存
  var module = __webpack_require__.cache[moduleId] = {
    id: moduleId,
    exports: {}
  };
  
  // 执行模块函数
  __webpack_modules__[moduleId].call(
    module.exports,
    module,
    module.exports,
    __webpack_require__
  );
  
  return module.exports;
}

// 模块缓存
__webpack_require__.cache = {};
    `.trim();
  }
  
  /**
   * 生成动态导入运行时
   */
  generateImportRuntime() {
    return `
// 动态导入函数
__webpack_require__.import = function(chunkId) {
  return new Promise(function(resolve, reject) {
    // 简化实现：直接返回模块
    try {
      var module = __webpack_require__(chunkId);
      resolve(module);
    } catch (error) {
      reject(error);
    }
  });
};
    `.trim();
  }
  
  /**
   * 生成启动运行时
   */
  generateStartupRuntime() {
    return `
// 启动应用
__webpack_require__.startup = function() {
  return __webpack_require__(${this.entryModule ? this.entryModule.id : 0});
};
    `.trim();
  }
  
  /**
   * 获取代码块信息
   */
  toJson() {
    return {
      id: this.id,
      name: this.name,
      size: this.size,
      modules: this.getModules().map(module => module.toJson()),
      files: this.files,
      parents: Array.from(this.parents).map(parent => parent.id),
      children: Array.from(this.children).map(child => child.id),
      isEntry: this.isEntry(),
      isInitial: this.isInitial()
    };
  }
}

module.exports = Chunk;