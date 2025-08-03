const fs = require('fs');
const path = require('path');
const Module = require('./module');
const Chunk = require('./chunk');
const { SyncHook, AsyncSeriesHook } = require('./hooks');
const { generateHash } = require('./utils');

/**
 * 编译过程管理类
 * 负责模块构建、依赖分析和资源生成
 */
class Compilation {
  constructor(compiler) {
    this.compiler = compiler;
    this.options = compiler.options;
    this.startTime = Date.now();
    
    // 编译状态
    this.modules = new Set();
    this.chunks = [];
    this.assets = new Map();
    this.entries = new Map();
    this.errors = [];
    this.warnings = [];
    this.hash = '';
    
    // 模块缓存
    this.moduleCache = new Map();
    
    // 钩子
    this.hooks = {
      buildModule: new SyncHook(['module']),
      succeedModule: new SyncHook(['module']),
      finishModules: new AsyncSeriesHook(['modules']),
      seal: new SyncHook([]),
      optimize: new SyncHook([]),
      optimizeModules: new SyncHook(['modules']),
      optimizeChunks: new SyncHook(['chunks']),
      additionalAssets: new AsyncSeriesHook([])
    };
  }
  
  /**
   * 添加入口模块
   */
  addEntry(request, name) {
    const entryModule = this.createModule(request, name);
    this.entries.set(name, entryModule);
    return entryModule;
  }
  
  /**
   * 创建模块
   */
  createModule(request, name, issuer = null) {
    // 解析模块路径
    const modulePath = this.resolveModule(request, issuer);
    
    // 检查缓存
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }
    
    // 创建新模块
    const module = new Module({
      request,
      name,
      path: modulePath,
      compilation: this
    });
    
    this.moduleCache.set(modulePath, module);
    this.modules.add(module);
    
    return module;
  }
  
  /**
   * 解析模块路径
   */
  resolveModule(request, issuer) {
    // 处理相对路径
    if (request.startsWith('./') || request.startsWith('../')) {
      const basePath = issuer ? path.dirname(issuer.path) : process.cwd();
      return path.resolve(basePath, request);
    }
    
    // 处理绝对路径
    if (path.isAbsolute(request)) {
      return request;
    }
    
    // 处理 node_modules
    const nodeModulesPath = path.resolve(process.cwd(), 'node_modules', request);
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }
    
    // 尝试添加扩展名
    const extensions = this.options.resolve?.extensions || ['.js', '.json'];
    for (const ext of extensions) {
      const fullPath = request + ext;
      if (fs.existsSync(fullPath)) {
        return path.resolve(fullPath);
      }
      
      // 相对路径 + 扩展名
      if (issuer) {
        const basePath = path.dirname(issuer.path);
        const relativePath = path.resolve(basePath, fullPath);
        if (fs.existsSync(relativePath)) {
          return relativePath;
        }
      }
    }
    
    throw new Error(`无法解析模块: ${request}`);
  }
  
  /**
   * 构建所有模块
   */
  async build() {
    // 构建入口模块
    const buildPromises = [];
    for (const [name, entryModule] of this.entries) {
      buildPromises.push(this.buildModule(entryModule));
    }
    
    await Promise.all(buildPromises);
    
    // 触发 finishModules 钩子
    await this.hooks.finishModules.promise(Array.from(this.modules));
  }
  
  /**
   * 构建单个模块
   */
  async buildModule(module) {
    // 触发 buildModule 钩子
    this.hooks.buildModule.call(module);
    
    try {
      // 构建模块
      await module.build();
      
      // 触发 succeedModule 钩子
      this.hooks.succeedModule.call(module);
      
      // 递归构建依赖模块
      const buildPromises = module.dependencies.map(dep => {
        const depModule = this.createModule(dep.request, null, module);
        dep.module = depModule;
        return this.buildModule(depModule);
      });
      
      await Promise.all(buildPromises);
    } catch (error) {
      this.errors.push(`构建模块失败 ${module.path}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 封装编译结果
   */
  seal() {
    // 触发 seal 钩子
    this.hooks.seal.call();
    
    // 创建 chunks
    this.createChunks();
    
    // 优化
    this.optimize();
    
    // 生成代码
    this.generateCode();
    
    // 生成 hash
    this.generateHash();
  }
  
  /**
   * 创建代码块
   */
  createChunks() {
    // 为每个入口创建一个 chunk
    for (const [name, entryModule] of this.entries) {
      const chunk = new Chunk(name, this);
      chunk.addModule(entryModule);
      
      // 添加所有依赖模块到 chunk
      this.addModuleToChunk(entryModule, chunk, new Set());
      
      this.chunks.push(chunk);
    }
  }
  
  /**
   * 递归添加模块到 chunk
   */
  addModuleToChunk(module, chunk, visited) {
    if (visited.has(module)) {
      return;
    }
    
    visited.add(module);
    
    module.dependencies.forEach(dep => {
      if (dep.module) {
        chunk.addModule(dep.module);
        this.addModuleToChunk(dep.module, chunk, visited);
      }
    });
  }
  
  /**
   * 优化
   */
  optimize() {
    // 触发 optimize 钩子
    this.hooks.optimize.call();
    
    // 优化模块
    this.hooks.optimizeModules.call(Array.from(this.modules));
    
    // 优化 chunks
    this.hooks.optimizeChunks.call(this.chunks);
  }
  
  /**
   * 生成代码
   */
  generateCode() {
    this.chunks.forEach(chunk => {
      const filename = this.getAssetFilename(chunk.name);
      const source = chunk.render();
      
      this.assets.set(filename, {
        source: () => source,
        size: source.length
      });
    });
  }
  
  /**
   * 获取资源文件名
   */
  getAssetFilename(chunkName) {
    const output = this.options.output || {};
    let filename = output.filename || '[name].js';
    
    // 替换占位符
    filename = filename.replace('[name]', chunkName);
    filename = filename.replace('[hash]', this.hash.substring(0, 8));
    
    return filename;
  }
  
  /**
   * 生成 hash
   */
  generateHash() {
    const content = Array.from(this.modules)
      .map(module => module.source)
      .join('');
    
    this.hash = generateHash(content);
  }
  
  /**
   * 获取所有资源
   */
  getAssets() {
    return this.assets;
  }
  
  /**
   * 添加资源
   */
  emitAsset(filename, source) {
    this.assets.set(filename, {
      source: typeof source === 'function' ? source : () => source,
      size: typeof source === 'function' ? source().length : source.length
    });
  }
  
  /**
   * 获取模块图
   */
  getModuleGraph() {
    const graph = new Map();
    
    for (const module of this.modules) {
      const dependencies = module.dependencies.map(dep => ({
        request: dep.request,
        module: dep.module
      }));
      
      graph.set(module, dependencies);
    }
    
    return graph;
  }
}

module.exports = Compilation;