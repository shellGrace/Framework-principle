const Compiler = require('./compiler');
const { createConfigResolver } = require('./config');
const { createDevServer } = require('./dev-server');
const { colors } = require('./utils');

/**
 * Mini Webpack 主类
 */
class MiniWebpack {
  constructor(config, configPath) {
    this.configResolver = createConfigResolver(config, configPath);
    this.config = this.configResolver.getConfig();
    this.compiler = new Compiler(this.config);
    this.devServer = null;
  }

  /**
   * 运行构建
   */
  async run() {
    try {
      console.log(colors.cyan('开始构建...'));
      const startTime = Date.now();
      
      const stats = await this.compiler.run();
      
      const buildTime = Date.now() - startTime;
      console.log(colors.green(`构建完成! 耗时: ${buildTime}ms`));
      
      return stats;
    } catch (error) {
      console.error(colors.red('构建失败:'), error.message);
      throw error;
    }
  }

  /**
   * 监听模式构建
   */
  async watch(options = {}) {
    try {
      console.log(colors.cyan('启动监听模式...'));
      
      const stats = await this.compiler.watch({
        aggregateTimeout: 300,
        poll: false,
        ...options
      });
      
      return stats;
    } catch (error) {
      console.error(colors.red('监听模式启动失败:'), error.message);
      throw error;
    }
  }

  /**
   * 启动开发服务器
   */
  async serve(options = {}) {
    try {
      const devServerConfig = {
        ...this.config.devServer,
        ...options
      };
      
      this.devServer = createDevServer(this.compiler, devServerConfig);
      
      // 启动服务器
      const serverInfo = await this.devServer.listen();
      
      // 运行初始构建
      await this.compiler.run();
      
      return serverInfo;
    } catch (error) {
      console.error(colors.red('开发服务器启动失败:'), error.message);
      throw error;
    }
  }

  /**
   * 关闭开发服务器
   */
  async close() {
    if (this.devServer) {
      await this.devServer.close();
      this.devServer = null;
    }
  }

  /**
   * 获取配置
   */
  getConfig() {
    return this.config;
  }

  /**
   * 获取编译器
   */
  getCompiler() {
    return this.compiler;
  }

  /**
   * 获取开发服务器
   */
  getDevServer() {
    return this.devServer;
  }
}

/**
 * 创建 Mini Webpack 实例
 */
function createWebpack(config, configPath) {
  return new MiniWebpack(config, configPath);
}

/**
 * 快速构建函数
 */
async function build(config, configPath) {
  const webpack = createWebpack(config, configPath);
  return await webpack.run();
}

/**
 * 快速启动开发服务器
 */
async function serve(config, configPath, serverOptions) {
  const webpack = createWebpack(config, configPath);
  return await webpack.serve(serverOptions);
}

/**
 * 快速启动监听模式
 */
async function watch(config, configPath, watchOptions) {
  const webpack = createWebpack(config, configPath);
  return await webpack.watch(watchOptions);
}

/**
 * 命令行接口
 */
class CLI {
  constructor() {
    this.webpack = null;
  }

  /**
   * 解析命令行参数
   */
  parseArgs(args = process.argv.slice(2)) {
    const options = {
      mode: 'development',
      config: null,
      watch: false,
      serve: false,
      port: 8080,
      host: 'localhost',
      open: false,
      hot: true
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--mode':
          options.mode = nextArg;
          i++;
          break;
        case '--config':
          options.config = nextArg;
          i++;
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--serve':
        case '-s':
          options.serve = true;
          break;
        case '--port':
        case '-p':
          options.port = parseInt(nextArg, 10);
          i++;
          break;
        case '--host':
          options.host = nextArg;
          i++;
          break;
        case '--open':
        case '-o':
          options.open = true;
          break;
        case '--no-hot':
          options.hot = false;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        case '--version':
        case '-v':
          this.showVersion();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
${colors.cyan('Mini Webpack')} - 轻量级 Webpack 实现
`);
    console.log('用法:');
    console.log('  mini-webpack [选项]\n');
    console.log('选项:');
    console.log('  --mode <mode>        设置模式 (development|production)');
    console.log('  --config <path>      指定配置文件路径');
    console.log('  --watch, -w          启用监听模式');
    console.log('  --serve, -s          启动开发服务器');
    console.log('  --port <port>        设置服务器端口 (默认: 8080)');
    console.log('  --host <host>        设置服务器主机 (默认: localhost)');
    console.log('  --open, -o           自动打开浏览器');
    console.log('  --no-hot             禁用热更新');
    console.log('  --help, -h           显示帮助信息');
    console.log('  --version, -v        显示版本信息\n');
    console.log('示例:');
    console.log('  mini-webpack                           # 运行构建');
    console.log('  mini-webpack --mode production         # 生产模式构建');
    console.log('  mini-webpack --watch                   # 监听模式');
    console.log('  mini-webpack --serve --port 3000       # 启动开发服务器');
    console.log('  mini-webpack --config webpack.dev.js   # 使用指定配置文件');
  }

  /**
   * 显示版本信息
   */
  showVersion() {
    const packageJson = require('../package.json');
    console.log(`Mini Webpack v${packageJson.version}`);
  }

  /**
   * 运行 CLI
   */
  async run(args) {
    try {
      const options = this.parseArgs(args);
      
      // 创建配置
      const config = {
        mode: options.mode
      };
      
      // 创建 webpack 实例
      this.webpack = createWebpack(config, options.config);
      
      // 设置进程退出处理
      this.setupExitHandlers();
      
      if (options.serve) {
        // 启动开发服务器
        const serverOptions = {
          port: options.port,
          host: options.host,
          open: options.open,
          hot: options.hot
        };
        
        await this.webpack.serve(serverOptions);
        
        // 保持进程运行
        console.log(colors.green('开发服务器正在运行，按 Ctrl+C 退出'));
        
      } else if (options.watch) {
        // 启动监听模式
        await this.webpack.watch();
        
        console.log(colors.green('监听模式已启动，按 Ctrl+C 退出'));
        
      } else {
        // 运行构建
        await this.webpack.run();
        process.exit(0);
      }
      
    } catch (error) {
      console.error(colors.red('CLI 运行失败:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 设置退出处理
   */
  setupExitHandlers() {
    const cleanup = async () => {
      console.log(colors.yellow('\n正在关闭...'));
      
      if (this.webpack) {
        await this.webpack.close();
      }
      
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }
}

/**
 * 创建 CLI 实例
 */
function createCLI() {
  return new CLI();
}

// 导出所有 API
module.exports = {
  MiniWebpack,
  CLI,
  createWebpack,
  createCLI,
  build,
  serve,
  watch,
  
  // 重新导出核心模块
  Compiler: require('./compiler'),
  Compilation: require('./compilation'),
  Module: require('./module'),
  Chunk: require('./chunk'),
  Template: require('./template'),
  
  // 重新导出工具模块
  utils: require('./utils'),
  config: require('./config'),
  devServer: require('./dev-server')
};

// 如果直接运行此文件，启动 CLI
if (require.main === module) {
  const cli = createCLI();
  cli.run().catch(error => {
    console.error(colors.red('启动失败:'), error.message);
    process.exit(1);
  });
}