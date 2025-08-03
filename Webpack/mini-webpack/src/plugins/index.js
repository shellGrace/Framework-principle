/**
 * 基础插件集合
 */

/**
 * HTML 插件 - 生成 HTML 文件
 */
class HtmlPlugin {
  constructor(options = {}) {
    this.options = {
      template: null,
      filename: 'index.html',
      title: 'Mini Webpack App',
      inject: true,
      minify: false,
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('HtmlPlugin', (compilation, callback) => {
      try {
        const htmlContent = this.generateHtml(compilation);
        
        // 添加到资源列表
        compilation.assets[this.options.filename] = {
          source: () => htmlContent,
          size: () => htmlContent.length
        };
        
        callback();
      } catch (error) {
        callback(error);
      }
    });
  }

  generateHtml(compilation) {
    const { chunks } = compilation;
    const scripts = [];
    const styles = [];

    // 收集 JS 和 CSS 文件
    chunks.forEach(chunk => {
      chunk.files.forEach(file => {
        if (file.endsWith('.js')) {
          scripts.push(file);
        } else if (file.endsWith('.css')) {
          styles.push(file);
        }
      });
    });

    // 生成 HTML
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${this.options.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">`;

    // 添加 CSS
    styles.forEach(style => {
      html += `\n  <link rel="stylesheet" href="${style}">`;
    });

    html += '\n</head>\n<body>';

    // 添加容器
    if (this.options.inject) {
      html += '\n  <div id="app"></div>';
    }

    // 添加 JS
    scripts.forEach(script => {
      html += `\n  <script src="${script}"></script>`;
    });

    html += '\n</body>\n</html>';

    return html;
  }
}

/**
 * 清理插件 - 清理输出目录
 */
class CleanPlugin {
  constructor(options = {}) {
    this.options = {
      cleanOnceBeforeBuildPatterns: ['**/*'],
      dry: false,
      verbose: false,
      ...options
    };
  }

  apply(compiler) {
    const fs = require('fs');
    const path = require('path');
    const { removeDir, colors } = require('../utils');

    compiler.hooks.beforeRun.tap('CleanPlugin', () => {
      const outputPath = compiler.options.output.path;
      
      if (fs.existsSync(outputPath)) {
        if (this.options.verbose) {
          console.log(colors.yellow(`清理目录: ${outputPath}`));
        }
        
        if (!this.options.dry) {
          removeDir(outputPath);
        }
      }
    });
  }
}

/**
 * 复制插件 - 复制静态资源
 */
class CopyPlugin {
  constructor(patterns = []) {
    this.patterns = patterns.map(pattern => {
      if (typeof pattern === 'string') {
        return { from: pattern, to: '' };
      }
      return pattern;
    });
  }

  apply(compiler) {
    const fs = require('fs');
    const path = require('path');
    const { copyFile, ensureDir, colors } = require('../utils');

    compiler.hooks.emit.tapAsync('CopyPlugin', (compilation, callback) => {
      try {
        const outputPath = compiler.options.output.path;
        
        this.patterns.forEach(pattern => {
          const fromPath = path.resolve(process.cwd(), pattern.from);
          const toPath = path.resolve(outputPath, pattern.to);
          
          if (fs.existsSync(fromPath)) {
            const stats = fs.statSync(fromPath);
            
            if (stats.isFile()) {
              // 复制文件
              const fileName = path.basename(fromPath);
              const destFile = path.join(toPath, fileName);
              copyFile(fromPath, destFile);
              
              console.log(colors.green(`复制文件: ${pattern.from} -> ${pattern.to}`));
            } else if (stats.isDirectory()) {
              // 复制目录
              this.copyDirectory(fromPath, toPath);
              console.log(colors.green(`复制目录: ${pattern.from} -> ${pattern.to}`));
            }
          }
        });
        
        callback();
      } catch (error) {
        callback(error);
      }
    });
  }

  copyDirectory(src, dest) {
    const fs = require('fs');
    const path = require('path');
    const { ensureDir } = require('../utils');
    
    ensureDir(dest);
    
    const files = fs.readdirSync(src);
    
    files.forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      const stats = fs.statSync(srcFile);
      
      if (stats.isDirectory()) {
        this.copyDirectory(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  }
}

/**
 * 进度插件 - 显示构建进度
 */
class ProgressPlugin {
  constructor(options = {}) {
    this.options = {
      format: 'progress',
      clear: true,
      ...options
    };
    this.startTime = null;
  }

  apply(compiler) {
    const { colors, createProgressBar } = require('../utils');
    let progressBar = null;

    compiler.hooks.beforeRun.tap('ProgressPlugin', () => {
      this.startTime = Date.now();
      console.log(colors.cyan('开始构建...'));
    });

    compiler.hooks.compilation.tap('ProgressPlugin', (compilation) => {
      // 模块构建进度
      compilation.hooks.buildModule.tap('ProgressPlugin', (module) => {
        if (!progressBar) {
          progressBar = createProgressBar(100);
        }
        
        const progress = Math.min(compilation.modules.size * 10, 90);
        progressBar.update(progress);
      });

      // 优化阶段
      compilation.hooks.optimize.tap('ProgressPlugin', () => {
        if (progressBar) {
          progressBar.update(95);
        }
      });

      // 生成资源
      compilation.hooks.emit.tap('ProgressPlugin', () => {
        if (progressBar) {
          progressBar.update(100);
        }
      });
    });

    compiler.hooks.done.tap('ProgressPlugin', (stats) => {
      const duration = Date.now() - this.startTime;
      
      if (stats.errors.length === 0) {
        console.log(colors.green(`✓ 构建完成! 耗时: ${duration}ms`));
      } else {
        console.log(colors.red(`✗ 构建失败! 耗时: ${duration}ms`));
      }
    });
  }
}

/**
 * 定义插件 - 定义全局变量
 */
class DefinePlugin {
  constructor(definitions = {}) {
    this.definitions = definitions;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('DefinePlugin', (compilation) => {
      compilation.hooks.buildModule.tap('DefinePlugin', (module) => {
        // 在模块构建时替换定义的变量
        if (module.source) {
          let source = module.source;
          
          Object.keys(this.definitions).forEach(key => {
            const value = this.definitions[key];
            const replacement = typeof value === 'string' ? value : JSON.stringify(value);
            
            // 简单的字符串替换
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            source = source.replace(regex, replacement);
          });
          
          module.source = source;
        }
      });
    });
  }
}

/**
 * 环境插件 - 设置环境变量
 */
class EnvironmentPlugin {
  constructor(keys = []) {
    this.keys = Array.isArray(keys) ? keys : [keys];
  }

  apply(compiler) {
    const definitions = {};
    
    this.keys.forEach(key => {
      const value = process.env[key];
      if (value !== undefined) {
        definitions[`process.env.${key}`] = JSON.stringify(value);
      }
    });
    
    // 使用 DefinePlugin 来实现
    const definePlugin = new DefinePlugin(definitions);
    definePlugin.apply(compiler);
  }
}

/**
 * 横幅插件 - 在文件顶部添加注释
 */
class BannerPlugin {
  constructor(options) {
    if (typeof options === 'string') {
      this.options = { banner: options };
    } else {
      this.options = {
        banner: '',
        raw: false,
        entryOnly: false,
        test: /\.(js|css)$/,
        ...options
      };
    }
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('BannerPlugin', (compilation, callback) => {
      try {
        const banner = this.options.raw 
          ? this.options.banner 
          : `/*! ${this.options.banner} */`;
        
        Object.keys(compilation.assets).forEach(filename => {
          if (this.options.test.test(filename)) {
            const asset = compilation.assets[filename];
            const source = asset.source();
            const newSource = banner + '\n' + source;
            
            compilation.assets[filename] = {
              source: () => newSource,
              size: () => newSource.length
            };
          }
        });
        
        callback();
      } catch (error) {
        callback(error);
      }
    });
  }
}

/**
 * 分析插件 - 分析打包结果
 */
class AnalyzePlugin {
  constructor(options = {}) {
    this.options = {
      analyzerMode: 'static',
      reportFilename: 'report.html',
      openAnalyzer: false,
      ...options
    };
  }

  apply(compiler) {
    const { formatSize } = require('../utils');
    
    compiler.hooks.done.tap('AnalyzePlugin', (stats) => {
      const analysis = this.analyzeStats(stats);
      
      if (this.options.analyzerMode === 'static') {
        this.generateReport(analysis, compiler.options.output.path);
      } else {
        this.printAnalysis(analysis);
      }
    });
  }

  analyzeStats(stats) {
    const { modules, chunks, assets } = stats;
    
    return {
      totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
      moduleCount: modules.length,
      chunkCount: chunks.length,
      assetCount: assets.length,
      modules: modules.map(module => ({
        name: module.name,
        size: module.size,
        dependencies: module.dependencies.length
      })),
      chunks: chunks.map(chunk => ({
        name: chunk.name,
        size: chunk.size,
        modules: chunk.modules.length
      })),
      assets: assets.map(asset => ({
        name: asset.name,
        size: asset.size
      }))
    };
  }

  printAnalysis(analysis) {
    const { colors, formatSize } = require('../utils');
    
    console.log('\n' + colors.cyan('=== 打包分析 ==='));
    console.log(`总大小: ${colors.yellow(formatSize(analysis.totalSize))}`);
    console.log(`模块数量: ${colors.green(analysis.moduleCount)}`);
    console.log(`代码块数量: ${colors.green(analysis.chunkCount)}`);
    console.log(`资源数量: ${colors.green(analysis.assetCount)}`);
    
    console.log('\n' + colors.cyan('资源详情:'));
    analysis.assets.forEach(asset => {
      console.log(`  ${asset.name}: ${colors.yellow(formatSize(asset.size))}`);
    });
  }

  generateReport(analysis, outputPath) {
    const fs = require('fs');
    const path = require('path');
    const { formatSize } = require('../utils');
    
    const reportPath = path.join(outputPath, this.options.reportFilename);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>打包分析报告</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>打包分析报告</h1>
        
        <div class="summary">
          <h2>概览</h2>
          <p>总大小: ${formatSize(analysis.totalSize)}</p>
          <p>模块数量: ${analysis.moduleCount}</p>
          <p>代码块数量: ${analysis.chunkCount}</p>
          <p>资源数量: ${analysis.assetCount}</p>
        </div>
        
        <div class="section">
          <h2>资源详情</h2>
          <table>
            <tr><th>文件名</th><th>大小</th></tr>
            ${analysis.assets.map(asset => 
              `<tr><td>${asset.name}</td><td>${formatSize(asset.size)}</td></tr>`
            ).join('')}
          </table>
        </div>
        
        <div class="section">
          <h2>代码块详情</h2>
          <table>
            <tr><th>名称</th><th>大小</th><th>模块数</th></tr>
            ${analysis.chunks.map(chunk => 
              `<tr><td>${chunk.name}</td><td>${formatSize(chunk.size)}</td><td>${chunk.modules}</td></tr>`
            ).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
    
    fs.writeFileSync(reportPath, html);
    console.log(`分析报告已生成: ${reportPath}`);
  }
}

module.exports = {
  HtmlPlugin,
  CleanPlugin,
  CopyPlugin,
  ProgressPlugin,
  DefinePlugin,
  EnvironmentPlugin,
  BannerPlugin,
  AnalyzePlugin
};