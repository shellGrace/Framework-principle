const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const { transformFromAst } = require('@babel/core');
const Dependency = require('./dependency');

/**
 * 模块类
 * 表示一个单独的模块文件
 */
class Module {
  constructor(options) {
    this.request = options.request; // 原始请求路径
    this.name = options.name; // 模块名称
    this.path = options.path; // 解析后的绝对路径
    this.compilation = options.compilation;
    
    // 模块内容
    this.source = ''; // 原始源码
    this.transformedSource = ''; // 转换后的源码
    this.ast = null; // AST
    
    // 依赖关系
    this.dependencies = [];
    this.dependencyMap = new Map(); // 依赖映射
    
    // 模块信息
    this.id = null; // 模块ID
    this.size = 0; // 模块大小
    this.type = this.getModuleType();
    this.built = false; // 是否已构建
    this.buildTimestamp = 0;
    
    // 错误信息
    this.errors = [];
    this.warnings = [];
  }
  
  /**
   * 获取模块类型
   */
  getModuleType() {
    const ext = path.extname(this.path);
    switch (ext) {
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.css':
        return 'css';
      case '.json':
        return 'json';
      default:
        return 'asset';
    }
  }
  
  /**
   * 构建模块
   */
  async build() {
    if (this.built) {
      return;
    }
    
    try {
      // 读取源码
      await this.readSource();
      
      // 应用 loaders
      await this.applyLoaders();
      
      // 解析依赖
      this.parseDependencies();
      
      // 转换代码
      this.transform();
      
      this.built = true;
      this.buildTimestamp = Date.now();
      this.size = this.transformedSource.length;
      
    } catch (error) {
      this.errors.push(error.message);
      throw error;
    }
  }
  
  /**
   * 读取源码
   */
  async readSource() {
    if (!fs.existsSync(this.path)) {
      throw new Error(`模块文件不存在: ${this.path}`);
    }
    
    this.source = fs.readFileSync(this.path, 'utf-8');
  }
  
  /**
   * 应用 loaders
   */
  async applyLoaders() {
    const rules = this.compilation?.options?.module?.rules || [];
    let source = this.source;
    
    for (const rule of rules) {
      if (this.matchRule(rule)) {
        const loaders = Array.isArray(rule.use) ? rule.use : [rule.use];
        
        // 从右到左执行 loaders
        for (let i = loaders.length - 1; i >= 0; i--) {
          const loader = loaders[i];
          source = await this.applyLoader(loader, source);
        }
      }
    }
    
    this.source = source;
  }
  
  /**
   * 匹配规则
   */
  matchRule(rule) {
    if (rule.test) {
      return rule.test.test(this.path);
    }
    
    if (rule.include) {
      const include = Array.isArray(rule.include) ? rule.include : [rule.include];
      return include.some(pattern => {
        if (typeof pattern === 'string') {
          return this.path.includes(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(this.path);
        }
        return false;
      });
    }
    
    if (rule.exclude) {
      const exclude = Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude];
      return !exclude.some(pattern => {
        if (typeof pattern === 'string') {
          return this.path.includes(pattern);
        }
        if (pattern instanceof RegExp) {
          return pattern.test(this.path);
        }
        return false;
      });
    }
    
    return false;
  }
  
  /**
   * 应用单个 loader
   */
  async applyLoader(loader, source) {
    if (typeof loader === 'string') {
      // 内置 loaders
      return this.applyBuiltinLoader(loader, source);
    }
    
    if (typeof loader === 'function') {
      return loader.call(this.createLoaderContext(), source);
    }
    
    if (loader && typeof loader.loader === 'string') {
      return this.applyBuiltinLoader(loader.loader, source, loader.options);
    }
    
    return source;
  }
  
  /**
   * 应用内置 loader
   */
  applyBuiltinLoader(loaderName, source, options = {}) {
    switch (loaderName) {
      case 'babel-loader':
        return this.applyBabelLoader(source, options);
      case 'css-loader':
        return this.applyCssLoader(source, options);
      case 'style-loader':
        return this.applyStyleLoader(source, options);
      case 'json-loader':
        return this.applyJsonLoader(source, options);
      default:
        console.warn(`未知的 loader: ${loaderName}`);
        return source;
    }
  }
  
  /**
   * Babel Loader
   */
  applyBabelLoader(source, options) {
    try {
      const result = transformFromAst(
        parser.parse(source, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        }),
        source,
        {
          presets: options.presets || ['@babel/preset-env'],
          plugins: options.plugins || []
        }
      );
      
      return result.code;
    } catch (error) {
      console.warn(`Babel 转换失败: ${error.message}`);
      return source;
    }
  }
  
  /**
   * CSS Loader
   */
  applyCssLoader(source, options) {
    // 简单的 CSS 处理
    return `module.exports = ${JSON.stringify(source)};`;
  }
  
  /**
   * Style Loader
   */
  applyStyleLoader(source, options) {
    return `
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(source)};
      document.head.appendChild(style);
      module.exports = {};
    `;
  }
  
  /**
   * JSON Loader
   */
  applyJsonLoader(source, options) {
    return `module.exports = ${source};`;
  }
  
  /**
   * 创建 loader 上下文
   */
  createLoaderContext() {
    return {
      resource: this.path,
      resourcePath: this.path,
      request: this.request,
      query: {},
      callback: null,
      async: () => {
        return (err, result) => {
          if (err) throw err;
          return result;
        };
      },
      emitFile: (name, content) => {
        this.compilation.emitAsset(name, content);
      }
    };
  }
  
  /**
   * 解析依赖
   */
  parseDependencies() {
    if (this.type === 'json') {
      return; // JSON 文件没有依赖
    }
    
    try {
      this.ast = parser.parse(this.source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'dynamicImport']
      });
      
      traverse(this.ast, {
        // ES6 import
        ImportDeclaration: (path) => {
          const dependency = new Dependency({
            request: path.node.source.value,
            type: 'import',
            loc: path.node.loc
          });
          this.addDependency(dependency);
        },
        
        // CommonJS require
        CallExpression: (path) => {
          if (path.node.callee.name === 'require' && 
              path.node.arguments.length > 0 &&
              path.node.arguments[0].type === 'StringLiteral') {
            
            const dependency = new Dependency({
              request: path.node.arguments[0].value,
              type: 'require',
              loc: path.node.loc
            });
            this.addDependency(dependency);
          }
        },
        
        // 动态 import
        Import: (path) => {
          const parent = path.parent;
          if (parent.type === 'CallExpression' &&
              parent.arguments.length > 0 &&
              parent.arguments[0].type === 'StringLiteral') {
            
            const dependency = new Dependency({
              request: parent.arguments[0].value,
              type: 'dynamic-import',
              loc: parent.loc
            });
            this.addDependency(dependency);
          }
        }
      });
      
    } catch (error) {
      this.warnings.push(`解析依赖失败: ${error.message}`);
    }
  }
  
  /**
   * 添加依赖
   */
  addDependency(dependency) {
    this.dependencies.push(dependency);
    this.dependencyMap.set(dependency.request, dependency);
  }
  
  /**
   * 转换代码
   */
  transform() {
    if (!this.ast) {
      this.transformedSource = this.source;
      return;
    }
    
    // 替换依赖路径为模块ID
    traverse(this.ast, {
      ImportDeclaration: (path) => {
        const request = path.node.source.value;
        const dependency = this.dependencyMap.get(request);
        if (dependency && dependency.module) {
          path.node.source.value = dependency.module.id || request;
        }
      },
      
      CallExpression: (path) => {
        if (path.node.callee.name === 'require' &&
            path.node.arguments.length > 0 &&
            path.node.arguments[0].type === 'StringLiteral') {
          
          const request = path.node.arguments[0].value;
          const dependency = this.dependencyMap.get(request);
          if (dependency && dependency.module) {
            path.node.arguments[0].value = dependency.module.id || request;
          }
        }
      }
    });
    
    // 生成转换后的代码
    const result = generator(this.ast);
    this.transformedSource = result.code;
  }
  
  /**
   * 获取模块源码
   */
  getSource() {
    return this.transformedSource || this.source;
  }
  
  /**
   * 设置模块ID
   */
  setId(id) {
    this.id = id;
  }
  
  /**
   * 获取模块信息
   */
  toJson() {
    return {
      id: this.id,
      name: this.name,
      path: this.path,
      request: this.request,
      type: this.type,
      size: this.size,
      built: this.built,
      dependencies: this.dependencies.map(dep => dep.toJson()),
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

module.exports = Module;