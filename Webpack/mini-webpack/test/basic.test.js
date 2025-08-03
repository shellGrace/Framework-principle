/**
 * Mini Webpack 基础功能测试
 */

const fs = require('fs');
const path = require('path');
const { MiniWebpack, createWebpack } = require('../src/index');
const { ConfigResolver } = require('../src/config');
const Module = require('../src/module');
const { Dependency } = require('../src/dependency');
const Chunk = require('../src/chunk');
const Template = require('../src/template');
const { generateHash, formatSize, formatTime } = require('../src/utils');

// 测试配置
const testWebpackConfig = {
  entry: path.join(__dirname, 'fixtures/entry.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  mode: 'development'
};

// 创建测试文件
function createTestFiles() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const distDir = path.join(__dirname, 'dist');
  
  // 确保目录存在
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // 创建入口文件
  const entryContent = `
import { add } from './math.js';
import './style.css';
const config = require('./config.json');

console.log('Entry file loaded');
console.log('Config:', config);
console.log('2 + 3 =', add(2, 3));

// 动态导入测试
import('./dynamic.js').then(module => {
  console.log('Dynamic module loaded:', module.default);
});

export default 'Main Entry';
`;
  
  // 创建数学模块
  const mathContent = `
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export const PI = 3.14159;
`;
  
  // 创建样式文件
  const styleContent = `
body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
`;
  
  // 创建配置文件
  const configContent = JSON.stringify({
    name: 'Test App',
    version: '1.0.0',
    features: ['module-loading', 'css-processing']
  }, null, 2);
  
  // 创建动态模块
  const dynamicContent = `
console.log('Dynamic module executing');

export default {
  message: 'Hello from dynamic module!',
  timestamp: Date.now()
};
`;
  
  // 写入文件
  fs.writeFileSync(path.join(fixturesDir, 'entry.js'), entryContent);
  fs.writeFileSync(path.join(fixturesDir, 'math.js'), mathContent);
  fs.writeFileSync(path.join(fixturesDir, 'style.css'), styleContent);
  fs.writeFileSync(path.join(fixturesDir, 'config.json'), configContent);
  fs.writeFileSync(path.join(fixturesDir, 'dynamic.js'), dynamicContent);
}

// 清理测试文件
function cleanupTestFiles() {
  const testDir = path.join(__dirname, 'fixtures');
  const distDir = path.join(__dirname, 'dist');
  
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

// 测试工具函数
function testUtils() {
  console.log('\n🧪 测试工具函数...');
  
  // 测试哈希生成
  const hash1 = generateHash('test content');
  const hash2 = generateHash('test content');
  const hash3 = generateHash('different content');
  
  console.log('✅ 哈希生成:', {
    same: hash1 === hash2,
    different: hash1 !== hash3,
    length: hash1.length
  });
  
  // 测试格式化函数
  console.log('✅ 格式化函数:', {
    size: formatSize(1024 * 1024),
    time: formatTime(1500)
  });
}

// 测试配置解析
function testConfig() {
  console.log('\n🧪 测试配置解析...');
  
  const resolver = new ConfigResolver(testWebpackConfig);
  const config = resolver.resolve();
  
  console.log('✅ 配置解析成功:', {
    hasEntry: !!config.entry,
    hasOutput: !!config.output,
    mode: config.mode
  });
  
  return config;
}

// 测试模块解析
function testModule() {
  console.log('\n🧪 测试模块解析...');
  
  const entryPath = path.join(__dirname, 'fixtures/entry.js');
  const module = new Module({
    request: entryPath,
    name: 'entry',
    path: entryPath,
    compilation: null
  });
  
  try {
    module.build();
    console.log('✅ 模块构建成功:', {
      hasSource: !!module.source,
      hasDependencies: module.dependencies.length > 0,
      dependencyCount: module.dependencies.length
    });
  } catch (error) {
    console.log('❌ 模块构建失败:', error.message);
  }
}

// 测试依赖解析
function testDependency() {
  console.log('\n🧪 测试依赖解析...');
  
  const dep = new Dependency('./math.js', 'import');
  console.log('✅ 依赖创建成功:', {
    request: dep.request,
    type: dep.type,
    hasLocation: !!dep.location
  });
}

// 测试代码块
function testChunk() {
  console.log('\n🧪 测试代码块...');
  
  const chunk = new Chunk('main', null);
  const module = { id: 'test-module', source: 'console.log("test");' };
  
  chunk.addModule(module);
  
  console.log('✅ 代码块测试成功:', {
    name: chunk.name,
    hasModules: chunk.modules.size > 0,
    moduleCount: chunk.modules.size
  });
}

// 测试模板生成
function testTemplate() {
  console.log('\n🧪 测试模板生成...');
  
  const template = new Template();
  const moduleMap = {
    'test-module': {
      id: 'test-module',
      code: 'function(module, exports, __webpack_require__) { console.log("Hello from module"); }'
    }
  };
  
  const bundleCode = template.render({
    moduleMap: moduleMap,
    runtime: template.generateRuntime(),
    entryModuleId: 'test-module',
    chunkName: 'main'
  });
  
  console.log('✅ 模板生成成功:', {
    hasCode: !!bundleCode,
    codeLength: bundleCode.length,
    hasRuntime: bundleCode.includes('__webpack_require__')
  });
}

// 测试完整构建流程
async function testBuild() {
  console.log('\n🧪 测试完整构建流程...');
  
  try {
    const webpack = createWebpack(testWebpackConfig);
    const stats = await webpack.run();
    
    console.log('✅ 构建成功:', {
      hasAssets: stats.assets && stats.assets.length > 0,
      assetCount: stats.assets ? stats.assets.length : 0,
      buildTime: stats.time,
      hasErrors: stats.errors && stats.errors.length > 0
    });
    
    // 检查输出文件
    const outputPath = path.join(testWebpackConfig.output.path, testWebpackConfig.output.filename);
    if (fs.existsSync(outputPath)) {
      const bundleContent = fs.readFileSync(outputPath, 'utf-8');
      console.log('✅ 输出文件生成成功:', {
        fileExists: true,
        fileSize: formatSize(bundleContent.length),
        hasWebpackRuntime: bundleContent.includes('__webpack_require__')
      });
    } else {
      console.log('❌ 输出文件未生成');
    }
    
  } catch (error) {
    console.log('❌ 构建失败:', error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始运行 Mini Webpack 测试\n');
  
  try {
    // 创建测试文件
    createTestFiles();
    
    // 运行各项测试
    testUtils();
    testConfig();
    testDependency();
    testChunk();
    testTemplate();
    testModule();
    await testBuild();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理测试文件
    cleanupTestFiles();
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testUtils,
  testConfig,
  testModule,
  testDependency,
  testChunk,
  testTemplate,
  testBuild
};