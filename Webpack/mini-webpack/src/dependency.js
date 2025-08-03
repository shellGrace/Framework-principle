/**
 * 依赖类
 * 表示模块之间的依赖关系
 */
class Dependency {
  constructor(options) {
    this.request = options.request; // 依赖请求路径
    this.type = options.type; // 依赖类型: import, require, dynamic-import
    this.loc = options.loc; // 源码位置信息
    this.module = null; // 关联的模块实例
    this.optional = options.optional || false; // 是否为可选依赖
    this.weak = options.weak || false; // 是否为弱依赖
  }
  
  /**
   * 获取依赖的模块ID
   */
  getModuleId() {
    return this.module ? this.module.id : null;
  }
  
  /**
   * 检查依赖是否已解析
   */
  isResolved() {
    return this.module !== null;
  }
  
  /**
   * 获取依赖信息
   */
  toJson() {
    return {
      request: this.request,
      type: this.type,
      moduleId: this.getModuleId(),
      optional: this.optional,
      weak: this.weak,
      loc: this.loc
    };
  }
  
  /**
   * 克隆依赖
   */
  clone() {
    const cloned = new Dependency({
      request: this.request,
      type: this.type,
      loc: this.loc,
      optional: this.optional,
      weak: this.weak
    });
    cloned.module = this.module;
    return cloned;
  }
}

/**
 * ES6 Import 依赖
 */
class ImportDependency extends Dependency {
  constructor(options) {
    super({ ...options, type: 'import' });
    this.specifiers = options.specifiers || []; // 导入的具体内容
    this.importKind = options.importKind || 'value'; // 导入类型: value, type
  }
  
  toJson() {
    return {
      ...super.toJson(),
      specifiers: this.specifiers,
      importKind: this.importKind
    };
  }
}

/**
 * CommonJS Require 依赖
 */
class RequireDependency extends Dependency {
  constructor(options) {
    super({ ...options, type: 'require' });
    this.range = options.range; // 在源码中的范围
  }
  
  toJson() {
    return {
      ...super.toJson(),
      range: this.range
    };
  }
}

/**
 * 动态 Import 依赖
 */
class DynamicImportDependency extends Dependency {
  constructor(options) {
    super({ ...options, type: 'dynamic-import' });
    this.chunkName = options.chunkName; // 代码块名称
    this.mode = options.mode || 'lazy'; // 加载模式: lazy, eager
  }
  
  toJson() {
    return {
      ...super.toJson(),
      chunkName: this.chunkName,
      mode: this.mode
    };
  }
}

/**
 * 资源依赖（如图片、字体等）
 */
class AssetDependency extends Dependency {
  constructor(options) {
    super({ ...options, type: 'asset' });
    this.mimeType = options.mimeType; // MIME 类型
    this.size = options.size; // 文件大小
  }
  
  toJson() {
    return {
      ...super.toJson(),
      mimeType: this.mimeType,
      size: this.size
    };
  }
}

/**
 * CSS 依赖
 */
class CssDependency extends Dependency {
  constructor(options) {
    super({ ...options, type: 'css' });
    this.media = options.media; // 媒体查询
  }
  
  toJson() {
    return {
      ...super.toJson(),
      media: this.media
    };
  }
}

/**
 * 依赖工厂类
 * 用于创建不同类型的依赖
 */
class DependencyFactory {
  static create(type, options) {
    switch (type) {
      case 'import':
        return new ImportDependency(options);
      case 'require':
        return new RequireDependency(options);
      case 'dynamic-import':
        return new DynamicImportDependency(options);
      case 'asset':
        return new AssetDependency(options);
      case 'css':
        return new CssDependency(options);
      default:
        return new Dependency({ ...options, type });
    }
  }
}

module.exports = {
  Dependency,
  ImportDependency,
  RequireDependency,
  DynamicImportDependency,
  AssetDependency,
  CssDependency,
  DependencyFactory
};

// 默认导出基础依赖类
module.exports.default = Dependency;