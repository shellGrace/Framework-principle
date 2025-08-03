const fs = require('fs');
const path = require('path');
const Compilation = require('./compilation');
const { SyncHook, AsyncSeriesHook } = require('./hooks');

/**
 * Webpack 编译器核心类
 * 负责整个构建流程的协调和管理
 */
class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      // 编译开始前
      beforeRun: new AsyncSeriesHook(['compiler']),
      // 编译开始
      run: new AsyncSeriesHook(['compiler']),
      // 编译完成
      done: new SyncHook(['stats']),
      // 生成资源前
      emit: new AsyncSeriesHook(['compilation']),
      // 生成资源后
      afterEmit: new AsyncSeriesHook(['compilation']),
      // 编译失败
      failed: new SyncHook(['error'])
    };
    
    // 注册插件
    this.applyPlugins();
  }
  
  /**
   * 应用插件
   */
  applyPlugins() {
    if (this.options.plugins && Array.isArray(this.options.plugins)) {
      this.options.plugins.forEach(plugin => {
        if (typeof plugin === 'function') {
          plugin.call(this, this);
        } else if (plugin && typeof plugin.apply === 'function') {
          plugin.apply(this);
        }
      });
    }
  }
  
  /**
   * 开始编译
   */
  async run(callback) {
    try {
      // 触发 beforeRun 钩子
      await this.hooks.beforeRun.promise(this);
      
      // 触发 run 钩子
      await this.hooks.run.promise(this);
      
      // 创建编译实例
      const compilation = this.createCompilation();
      
      // 开始编译
      await this.compile(compilation);
      
      // 生成统计信息
      const stats = this.createStats(compilation);
      
      // 触发 done 钩子
      this.hooks.done.call(stats);
      
      if (callback) {
        callback(null, stats);
      }
      
      return stats;
    } catch (error) {
      // 触发 failed 钩子
      this.hooks.failed.call(error);
      
      if (callback) {
        callback(error);
      }
      
      throw error;
    }
  }
  
  /**
   * 创建编译实例
   */
  createCompilation() {
    return new Compilation(this);
  }
  
  /**
   * 执行编译
   */
  async compile(compilation) {
    // 添加入口模块
    const entry = this.options.entry;
    if (typeof entry === 'string') {
      compilation.addEntry(entry, 'main');
    } else if (typeof entry === 'object') {
      Object.keys(entry).forEach(name => {
        compilation.addEntry(entry[name], name);
      });
    }
    
    // 构建模块
    await compilation.build();
    
    // 封装编译结果
    compilation.seal();
    
    // 触发 emit 钩子
    await this.hooks.emit.promise(compilation);
    
    // 输出文件
    await this.emitAssets(compilation);
    
    // 触发 afterEmit 钩子
    await this.hooks.afterEmit.promise(compilation);
  }
  
  /**
   * 输出资源文件
   */
  async emitAssets(compilation) {
    const outputPath = this.options.output.path;
    
    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // 写入所有资源文件
    const assets = compilation.getAssets();
    for (const [filename, asset] of assets) {
      const filePath = path.join(outputPath, filename);
      const content = typeof asset.source === 'function' ? asset.source() : asset.source;
      
      fs.writeFileSync(filePath, content);
      console.log(`✓ 生成文件: ${filename}`);
    }
  }
  
  /**
   * 创建统计信息
   */
  createStats(compilation) {
    return {
      compilation,
      hash: compilation.hash,
      startTime: compilation.startTime,
      endTime: Date.now(),
      modules: compilation.modules,
      chunks: compilation.chunks,
      assets: compilation.getAssets(),
      errors: compilation.errors,
      warnings: compilation.warnings,
      
      // 获取构建时间
      get duration() {
        return this.endTime - this.startTime;
      },
      
      // 转换为 JSON
      toJson() {
        return {
          hash: this.hash,
          duration: this.duration,
          modules: this.modules.map(module => ({
            id: module.id,
            name: module.name,
            size: module.size,
            dependencies: module.dependencies.map(dep => dep.request)
          })),
          chunks: this.chunks.map(chunk => ({
            id: chunk.id,
            name: chunk.name,
            size: chunk.size,
            modules: chunk.modules.map(module => module.id)
          })),
          assets: Array.from(this.assets.entries()).map(([name, asset]) => ({
            name,
            size: asset.size
          })),
          errors: this.errors,
          warnings: this.warnings
        };
      },
      
      // 输出统计信息
      toString(options = {}) {
        const json = this.toJson();
        let output = [];
        
        output.push(`Hash: ${json.hash}`);
        output.push(`Time: ${json.duration}ms`);
        output.push('');
        
        if (json.assets.length > 0) {
          output.push('Assets:');
          json.assets.forEach(asset => {
            output.push(`  ${asset.name} ${asset.size} bytes`);
          });
          output.push('');
        }
        
        if (json.chunks.length > 0) {
          output.push('Chunks:');
          json.chunks.forEach(chunk => {
            output.push(`  ${chunk.id} ${chunk.name} ${chunk.size} bytes`);
          });
          output.push('');
        }
        
        if (json.errors.length > 0) {
          output.push('Errors:');
          json.errors.forEach(error => {
            output.push(`  ${error}`);
          });
          output.push('');
        }
        
        if (json.warnings.length > 0) {
          output.push('Warnings:');
          json.warnings.forEach(warning => {
            output.push(`  ${warning}`);
          });
          output.push('');
        }
        
        return output.join('\n');
      }
    };
  }
}

module.exports = Compiler;