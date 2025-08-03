const path = require('path');
const { isObject, isString, isArray, isFunction, deepMerge } = require('./utils');

/**
 * 默认配置
 */
const defaultConfig = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: '[name].js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {},
    modules: ['node_modules']
  },
  module: {
    rules: []
  },
  plugins: [],
  devServer: {
    port: 8080,
    host: 'localhost',
    hot: true,
    open: false,
    static: {
      directory: path.resolve(process.cwd(), 'dist')
    }
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  devtool: 'source-map',
  target: 'web',
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }
};

/**
 * 配置解析器类
 */
class ConfigResolver {
  constructor(userConfig = {}) {
    this.userConfig = userConfig;
    this.resolvedConfig = null;
  }

  /**
   * 解析配置
   */
  resolve() {
    if (this.resolvedConfig) {
      return this.resolvedConfig;
    }

    // 深度合并用户配置和默认配置
    this.resolvedConfig = deepMerge(defaultConfig, this.userConfig);

    // 规范化配置
    this.normalizeConfig();

    // 验证配置
    this.validateConfig();

    return this.resolvedConfig;
  }

  /**
   * 规范化配置
   */
  normalizeConfig() {
    const config = this.resolvedConfig;

    // 规范化 entry
    config.entry = this.normalizeEntry(config.entry);

    // 规范化 output
    config.output = this.normalizeOutput(config.output);

    // 规范化 resolve
    config.resolve = this.normalizeResolve(config.resolve);

    // 规范化 module rules
    config.module.rules = this.normalizeRules(config.module.rules);

    // 规范化 plugins
    config.plugins = this.normalizePlugins(config.plugins);

    // 设置环境变量
    this.setEnvironment(config.mode);
  }

  /**
   * 规范化入口配置
   */
  normalizeEntry(entry) {
    if (isString(entry)) {
      return {
        main: path.resolve(process.cwd(), entry)
      };
    }

    if (isArray(entry)) {
      return {
        main: entry.map(e => path.resolve(process.cwd(), e))
      };
    }

    if (isObject(entry)) {
      const normalizedEntry = {};
      for (const [key, value] of Object.entries(entry)) {
        if (isString(value)) {
          normalizedEntry[key] = path.resolve(process.cwd(), value);
        } else if (isArray(value)) {
          normalizedEntry[key] = value.map(v => path.resolve(process.cwd(), v));
        } else {
          normalizedEntry[key] = value;
        }
      }
      return normalizedEntry;
    }

    throw new Error('Entry 配置必须是字符串、数组或对象');
  }

  /**
   * 规范化输出配置
   */
  normalizeOutput(output) {
    const normalized = { ...output };

    // 确保 path 是绝对路径
    if (normalized.path && !path.isAbsolute(normalized.path)) {
      normalized.path = path.resolve(process.cwd(), normalized.path);
    }

    // 确保 publicPath 以 / 结尾
    if (normalized.publicPath && !normalized.publicPath.endsWith('/')) {
      normalized.publicPath += '/';
    }

    return normalized;
  }

  /**
   * 规范化解析配置
   */
  normalizeResolve(resolve) {
    const normalized = { ...resolve };

    // 规范化 alias
    if (normalized.alias) {
      const normalizedAlias = {};
      for (const [key, value] of Object.entries(normalized.alias)) {
        normalizedAlias[key] = path.resolve(process.cwd(), value);
      }
      normalized.alias = normalizedAlias;
    }

    // 规范化 modules
    if (normalized.modules) {
      normalized.modules = normalized.modules.map(module => {
        return path.isAbsolute(module) ? module : path.resolve(process.cwd(), module);
      });
    }

    return normalized;
  }

  /**
   * 规范化模块规则
   */
  normalizeRules(rules) {
    return rules.map(rule => {
      const normalizedRule = { ...rule };

      // 规范化 test
      if (normalizedRule.test && isString(normalizedRule.test)) {
        normalizedRule.test = new RegExp(normalizedRule.test);
      }

      // 规范化 include/exclude
      ['include', 'exclude'].forEach(key => {
        if (normalizedRule[key]) {
          if (isString(normalizedRule[key])) {
            normalizedRule[key] = [path.resolve(process.cwd(), normalizedRule[key])];
          } else if (isArray(normalizedRule[key])) {
            normalizedRule[key] = normalizedRule[key].map(p => 
              path.resolve(process.cwd(), p)
            );
          }
        }
      });

      // 规范化 use
      if (normalizedRule.use) {
        if (isString(normalizedRule.use)) {
          normalizedRule.use = [{ loader: normalizedRule.use }];
        } else if (isArray(normalizedRule.use)) {
          normalizedRule.use = normalizedRule.use.map(loader => {
            if (isString(loader)) {
              return { loader };
            }
            return loader;
          });
        }
      }

      return normalizedRule;
    });
  }

  /**
   * 规范化插件
   */
  normalizePlugins(plugins) {
    return plugins.filter(plugin => {
      if (!plugin || !isFunction(plugin.apply)) {
        console.warn('无效的插件:', plugin);
        return false;
      }
      return true;
    });
  }

  /**
   * 设置环境变量
   */
  setEnvironment(mode) {
    process.env.NODE_ENV = mode;
    
    // 设置全局变量
    global.__WEBPACK_MODE__ = mode;
    global.__WEBPACK_DEV__ = mode === 'development';
    global.__WEBPACK_PROD__ = mode === 'production';
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const config = this.resolvedConfig;
    const errors = [];

    // 验证 entry
    if (!config.entry || Object.keys(config.entry).length === 0) {
      errors.push('Entry 配置不能为空');
    }

    // 验证 output
    if (!config.output || !config.output.path) {
      errors.push('Output.path 配置不能为空');
    }

    // 验证 mode
    if (!['development', 'production', 'none'].includes(config.mode)) {
      errors.push('Mode 必须是 development、production 或 none');
    }

    // 验证 module rules
    config.module.rules.forEach((rule, index) => {
      if (!rule.test && !rule.include && !rule.exclude) {
        errors.push(`Module rule ${index} 必须包含 test、include 或 exclude`);
      }

      if (!rule.use && !rule.loader) {
        errors.push(`Module rule ${index} 必须包含 use 或 loader`);
      }
    });

    if (errors.length > 0) {
      throw new Error('配置验证失败:\n' + errors.join('\n'));
    }
  }

  /**
   * 获取解析后的配置
   */
  getConfig() {
    return this.resolve();
  }

  /**
   * 获取入口文件
   */
  getEntries() {
    const config = this.resolve();
    return config.entry;
  }

  /**
   * 获取输出配置
   */
  getOutput() {
    const config = this.resolve();
    return config.output;
  }

  /**
   * 获取模块规则
   */
  getRules() {
    const config = this.resolve();
    return config.module.rules;
  }

  /**
   * 获取插件列表
   */
  getPlugins() {
    const config = this.resolve();
    return config.plugins;
  }

  /**
   * 获取解析配置
   */
  getResolve() {
    const config = this.resolve();
    return config.resolve;
  }

  /**
   * 是否为开发模式
   */
  isDevelopment() {
    const config = this.resolve();
    return config.mode === 'development';
  }

  /**
   * 是否为生产模式
   */
  isProduction() {
    const config = this.resolve();
    return config.mode === 'production';
  }

  /**
   * 获取开发服务器配置
   */
  getDevServer() {
    const config = this.resolve();
    return config.devServer;
  }

  /**
   * 获取优化配置
   */
  getOptimization() {
    const config = this.resolve();
    return config.optimization;
  }

  /**
   * 获取统计信息配置
   */
  getStats() {
    const config = this.resolve();
    return config.stats;
  }
}

/**
 * 从文件加载配置
 */
function loadConfigFromFile(configPath) {
  try {
    // 清除 require 缓存
    delete require.cache[require.resolve(configPath)];
    
    const config = require(configPath);
    
    // 如果配置是函数，则调用它
    if (isFunction(config)) {
      return config(process.env, process.argv);
    }
    
    return config;
  } catch (error) {
    throw new Error(`加载配置文件失败 ${configPath}: ${error.message}`);
  }
}

/**
 * 查找配置文件
 */
function findConfigFile(cwd = process.cwd()) {
  const configFiles = [
    'webpack.config.js',
    'webpack.config.mjs',
    'webpack.config.ts',
    '.webpackrc.js',
    '.webpackrc.json'
  ];

  for (const configFile of configFiles) {
    const configPath = path.resolve(cwd, configFile);
    if (require('fs').existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * 创建配置解析器
 */
function createConfigResolver(userConfig, configPath) {
  let config = userConfig || {};

  // 如果提供了配置文件路径，则加载配置文件
  if (configPath) {
    const fileConfig = loadConfigFromFile(configPath);
    config = deepMerge(fileConfig, config);
  } else {
    // 尝试自动查找配置文件
    const foundConfigPath = findConfigFile();
    if (foundConfigPath) {
      const fileConfig = loadConfigFromFile(foundConfigPath);
      config = deepMerge(fileConfig, config);
    }
  }

  return new ConfigResolver(config);
}

module.exports = {
  ConfigResolver,
  defaultConfig,
  loadConfigFromFile,
  findConfigFile,
  createConfigResolver
};