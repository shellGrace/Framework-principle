const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 生成内容的 hash 值
 */
function generateHash(content, algorithm = 'md5', length = 8) {
  const hash = crypto.createHash(algorithm);
  hash.update(content);
  return hash.digest('hex').substring(0, length);
}

/**
 * 生成文件的 hash 值
 */
function generateFileHash(filePath, algorithm = 'md5', length = 8) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath);
  return generateHash(content, algorithm, length);
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 递归删除目录
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * 获取文件大小（字节）
 */
function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * 检查是否为对象
 */
function isObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * 检查是否为函数
 */
function isFunction(fn) {
  return typeof fn === 'function';
}

/**
 * 检查是否为字符串
 */
function isString(str) {
  return typeof str === 'string';
}

/**
 * 检查是否为数组
 */
function isArray(arr) {
  return Array.isArray(arr);
}

/**
 * 规范化路径
 */
function normalizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * 获取相对路径
 */
function getRelativePath(from, to) {
  return normalizePath(path.relative(from, to));
}

/**
 * 解析文件扩展名
 */
function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * 获取文件名（不含扩展名）
 */
function getBasename(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * 检查目录是否存在
 */
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * 读取 JSON 文件
 */
function readJsonFile(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`JSON 文件不存在: ${filePath}`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`解析 JSON 文件失败 ${filePath}: ${error.message}`);
  }
}

/**
 * 写入 JSON 文件
 */
function writeJsonFile(filePath, data, indent = 2) {
  ensureDir(path.dirname(filePath));
  const content = JSON.stringify(data, null, indent);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 获取文件的修改时间
 */
function getModifiedTime(filePath) {
  if (!fileExists(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  return stats.mtime;
}

/**
 * 检查文件是否比另一个文件新
 */
function isNewer(file1, file2) {
  const time1 = getModifiedTime(file1);
  const time2 = getModifiedTime(file2);
  
  if (!time1 || !time2) {
    return false;
  }
  
  return time1 > time2;
}

/**
 * 创建唯一的临时文件名
 */
function createTempFilename(prefix = 'temp', suffix = '.tmp') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${prefix}_${timestamp}_${random}${suffix}`;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 异步延迟
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

/**
 * 创建进度条
 */
function createProgressBar(total, width = 40) {
  return {
    total,
    current: 0,
    width,
    
    update(current) {
      this.current = current;
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round((current / total) * width);
      const empty = width - filled;
      
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const progress = `[${bar}] ${percentage}% (${current}/${total})`;
      
      // 清除当前行并输出进度条
      process.stdout.write('\r' + progress);
      
      if (current >= total) {
        process.stdout.write('\n');
      }
    }
  };
}

/**
 * 颜色输出工具
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  colorize(text, color) {
    return `${this[color] || ''}${text}${this.reset}`;
  },
  
  red(text) { return this.colorize(text, 'red'); },
  green(text) { return this.colorize(text, 'green'); },
  yellow(text) { return this.colorize(text, 'yellow'); },
  blue(text) { return this.colorize(text, 'blue'); },
  magenta(text) { return this.colorize(text, 'magenta'); },
  cyan(text) { return this.colorize(text, 'cyan'); },
  white(text) { return this.colorize(text, 'white'); }
};

module.exports = {
  generateHash,
  generateFileHash,
  ensureDir,
  removeDir,
  copyFile,
  getFileSize,
  formatSize,
  formatTime,
  deepMerge,
  isObject,
  isFunction,
  isString,
  isArray,
  normalizePath,
  getRelativePath,
  getExtension,
  getBasename,
  fileExists,
  dirExists,
  readJsonFile,
  writeJsonFile,
  getModifiedTime,
  isNewer,
  createTempFilename,
  debounce,
  throttle,
  delay,
  retry,
  createProgressBar,
  colors
};