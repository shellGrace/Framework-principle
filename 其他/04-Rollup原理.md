# Rollup 原理详解（中优先级 ⭐⭐⭐⭐）

## 1. Rollup 核心概念

### 1.1 什么是 Rollup
- **定义**：专注于 ES 模块的 JavaScript 打包工具
- **特点**：Tree Shaking、输出更小的 bundle、适合库开发
- **设计理念**：利用 ES 模块的静态特性进行优化

### 1.2 与 Webpack 的区别
```
Webpack：
- 适合应用开发
- 强大的插件生态
- 支持多种模块格式
- 代码分割能力强

Rollup：
- 适合库开发
- 更小的 bundle 体积
- 专注 ES 模块
- 更好的 Tree Shaking
```

## 2. Tree Shaking 原理

### 2.1 静态分析基础
```javascript
// ES 模块的静态特性
// ✅ 静态导入 - 可以被分析
import { used } from './utils';

// ❌ 动态导入 - 难以静态分析
const moduleName = 'utils';
import(moduleName).then(module => {
  // ...
});

// ❌ 条件导入 - 难以静态分析
if (condition) {
  import { something } from './conditional';
}
```

### 2.2 Tree Shaking 实现
```javascript
// utils.js
export function used() {
  return 'I am used';
}

export function unused() {
  return 'I am not used';
}

export const CONSTANT = 'constant';

// main.js
import { used } from './utils';

console.log(used());

// 打包后只包含 used 函数
// unused 函数和 CONSTANT 被移除
```

### 2.3 副作用检测
```javascript
// package.json
{
  "name": "my-library",
  "sideEffects": false  // 声明无副作用
}

// 或者指定有副作用的文件
{
  "sideEffects": [
    "./src/polyfill.js",
    "*.css"
  ]
}

// 代码中的副作用标记
// 有副作用的代码
console.log('This has side effects');
window.globalVar = 'value';

// 纯函数（无副作用）
export function pure(x) {
  return x * 2;
}
```

## 3. Rollup 构建流程

### 3.1 构建阶段
```
1. Input（输入）
   ↓
2. Build（构建）
   - 解析模块
   - 构建依赖图
   - Tree Shaking
   ↓
3. Generate（生成）
   - 代码生成
   - 格式转换
   - 输出文件
```

### 3.2 模块解析过程
```javascript
// rollup 内部模块解析流程
class ModuleLoader {
  async resolveId(id, importer) {
    // 1. 解析模块 ID
    const resolved = await this.resolveIdHooks(id, importer);
    return resolved;
  }
  
  async load(id) {
    // 2. 加载模块内容
    const source = await this.loadHooks(id);
    return source;
  }
  
  async transform(source, id) {
    // 3. 转换模块代码
    const transformed = await this.transformHooks(source, id);
    return transformed;
  }
  
  parse(source) {
    // 4. 解析 AST
    return this.acornParser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module'
    });
  }
}
```

### 3.3 依赖图构建
```javascript
// 简化的依赖图构建过程
class DependencyGraph {
  constructor() {
    this.modules = new Map();
    this.dependencies = new Map();
  }
  
  async buildGraph(entryPoint) {
    const visited = new Set();
    await this.visitModule(entryPoint, visited);
  }
  
  async visitModule(id, visited) {
    if (visited.has(id)) return;
    visited.add(id);
    
    // 加载和解析模块
    const module = await this.loadModule(id);
    this.modules.set(id, module);
    
    // 递归处理依赖
    for (const dep of module.dependencies) {
      await this.visitModule(dep, visited);
      this.addDependency(id, dep);
    }
  }
  
  addDependency(from, to) {
    if (!this.dependencies.has(from)) {
      this.dependencies.set(from, new Set());
    }
    this.dependencies.get(from).add(to);
  }
}
```

## 4. 插件系统

### 4.1 插件架构
```javascript
// Rollup 插件结构
function myPlugin(options = {}) {
  return {
    name: 'my-plugin',
    
    // 构建钩子
    buildStart(opts) {
      // 构建开始时调用
    },
    
    resolveId(id, importer) {
      // 解析模块 ID
      if (id === 'virtual:my-module') {
        return id;
      }
    },
    
    load(id) {
      // 加载模块内容
      if (id === 'virtual:my-module') {
        return 'export default "Hello from virtual module"';
      }
    },
    
    transform(code, id) {
      // 转换代码
      if (id.endsWith('.special')) {
        return {
          code: transformSpecialFile(code),
          map: generateSourceMap()
        };
      }
    },
    
    // 生成钩子
    generateBundle(opts, bundle) {
      // 生成 bundle 时调用
    },
    
    writeBundle(opts, bundle) {
      // 写入文件后调用
    }
  };
}
```

### 4.2 常用插件
```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'MyLibrary'
  },
  plugins: [
    // 解析 node_modules 中的模块
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    
    // 转换 CommonJS 模块
    commonjs(),
    
    // Babel 转换
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    }),
    
    // 代码压缩
    terser()
  ]
};
```

### 4.3 自定义插件示例
```javascript
// 环境变量替换插件
function envPlugin(env = {}) {
  return {
    name: 'env-plugin',
    transform(code, id) {
      let transformedCode = code;
      
      // 替换环境变量
      Object.keys(env).forEach(key => {
        const regex = new RegExp(`process\.env\.${key}`, 'g');
        transformedCode = transformedCode.replace(
          regex, 
          JSON.stringify(env[key])
        );
      });
      
      return {
        code: transformedCode,
        map: null
      };
    }
  };
}

// 使用插件
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    envPlugin({
      NODE_ENV: 'production',
      API_URL: 'https://api.example.com'
    })
  ]
};
```

## 5. 输出格式

### 5.1 支持的格式
```javascript
// ES 模块格式
export default {
  output: {
    format: 'es', // 或 'esm'
    file: 'dist/bundle.esm.js'
  }
};

// CommonJS 格式
export default {
  output: {
    format: 'cjs',
    file: 'dist/bundle.cjs.js'
  }
};

// UMD 格式
export default {
  output: {
    format: 'umd',
    name: 'MyLibrary',
    file: 'dist/bundle.umd.js'
  }
};

// IIFE 格式
export default {
  output: {
    format: 'iife',
    name: 'MyLibrary',
    file: 'dist/bundle.iife.js'
  }
};
```

### 5.2 多格式输出
```javascript
export default {
  input: 'src/index.js',
  output: [
    // ES 模块
    {
      file: 'dist/index.esm.js',
      format: 'es'
    },
    // CommonJS
    {
      file: 'dist/index.cjs.js',
      format: 'cjs'
    },
    // UMD
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'MyLibrary'
    }
  ]
};
```

## 6. 代码分割

### 6.1 手动分割
```javascript
export default {
  input: {
    main: 'src/main.js',
    vendor: 'src/vendor.js'
  },
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js'
  }
};
```

### 6.2 动态导入分割
```javascript
// src/main.js
async function loadModule() {
  const { default: dynamicModule } = await import('./dynamic-module.js');
  return dynamicModule;
}

// 配置
export default {
  input: 'src/main.js',
  output: {
    dir: 'dist',
    format: 'es',
    manualChunks: {
      vendor: ['lodash', 'axios']
    }
  }
};
```

## 7. 性能优化

### 7.1 构建性能
```javascript
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  
  // 缓存配置
  cache: true,
  
  // 外部依赖
  external: ['lodash', 'react'],
  
  // 监听模式优化
  watch: {
    exclude: 'node_modules/**',
    include: 'src/**'
  }
};
```

### 7.2 输出优化
```javascript
import { terser } from 'rollup-plugin-terser';
import gzip from 'rollup-plugin-gzip';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    
    // 压缩配置
    compact: true,
    
    // 去除注释
    banner: '/* My Library v1.0.0 */',
    
    // 源码映射
    sourcemap: true
  },
  plugins: [
    // 代码压缩
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }),
    
    // Gzip 压缩
    gzip()
  ]
};
```

## 8. 与其他工具集成

### 8.1 TypeScript 集成
```javascript
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types'
    })
  ]
};
```

### 8.2 CSS 处理
```javascript
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    postcss({
      extract: true,
      minimize: true,
      plugins: [
        require('autoprefixer')
      ]
    })
  ]
};
```

### 8.3 开发服务器
```javascript
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    // 开发服务器
    serve({
      open: true,
      contentBase: 'dist',
      port: 3000
    }),
    
    // 热重载
    livereload('dist')
  ]
};
```

## 9. 实际应用场景

### 9.1 库开发配置
```javascript
// 适合库开发的完整配置
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/index.js',
  
  // 外部依赖
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ],
  
  output: [
    // ES 模块
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    // CommonJS
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    // UMD（用于浏览器）
    {
      file: pkg.browser,
      format: 'umd',
      name: 'MyLibrary',
      sourcemap: true,
      globals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
      }
    }
  ],
  
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    babel({
      babelHelpers: 'runtime',
      exclude: 'node_modules/**'
    }),
    isProduction && terser()
  ].filter(Boolean)
};
```

### 9.2 Monorepo 配置
```javascript
// packages/core/rollup.config.js
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'es'
  },
  external: ['@my-org/utils']
};

// packages/utils/rollup.config.js
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'es'
  }
};
```

## 10. 面试重点

### 10.1 核心概念
1. **Tree Shaking 原理**：基于 ES 模块静态分析
2. **与 Webpack 区别**：适用场景和优势
3. **插件系统**：钩子机制和自定义插件
4. **输出格式**：ES、CJS、UMD、IIFE
5. **代码分割**：手动分割和动态导入

### 10.2 技术细节
1. **静态分析**：如何识别未使用的代码
2. **副作用检测**：sideEffects 配置
3. **模块解析**：resolveId、load、transform 流程
4. **依赖图构建**：模块依赖关系分析
5. **性能优化**：构建和输出优化策略

### 10.3 实际应用
- 开源库开发
- 组件库构建
- 工具函数库
- Monorepo 项目
- 现代前端框架底层

---

**学习建议**：
1. 理解 ES 模块的静态特性
2. 掌握 Tree Shaking 原理
3. 实践插件开发
4. 对比不同构建工具的优劣
5. 关注现代构建工具发展趋势