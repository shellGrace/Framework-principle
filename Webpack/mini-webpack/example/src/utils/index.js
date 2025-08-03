// 工具函数集合

/**
 * 日志工具
 */
export const logger = {
  log(message, ...args) {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`, ...args);
  },
  
  warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  },
  
  error(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
  },
  
  info(message, ...args) {
    console.info(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  }
};

/**
 * 日期格式化工具
 */
export const dateUtils = {
  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
  
  getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = now - target;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return `刚刚`;
  },
  
  isToday(date) {
    const today = new Date();
    const target = new Date(date);
    
    return today.getFullYear() === target.getFullYear() &&
           today.getMonth() === target.getMonth() &&
           today.getDate() === target.getDate();
  }
};

/**
 * 字符串工具
 */
export const stringUtils = {
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  camelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
  },
  
  kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  },
  
  truncate(str, length = 50, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },
  
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
};

/**
 * 数组工具
 */
export const arrayUtils = {
  unique(arr) {
    return [...new Set(arr)];
  },
  
  chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },
  
  shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },
  
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },
  
  sortBy(arr, key, order = 'asc') {
    return [...arr].sort((a, b) => {
      const aVal = typeof key === 'function' ? key(a) : a[key];
      const bVal = typeof key === 'function' ? key(b) : b[key];
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
};

/**
 * 对象工具
 */
export const objectUtils = {
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  },
  
  deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  },
  
  pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
  
  omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  },
  
  flatten(obj, prefix = '') {
    const result = {};
    
    Object.keys(obj).forEach(key => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(result, this.flatten(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    });
    
    return result;
  }
};

/**
 * DOM 工具
 */
export const domUtils = {
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'textContent') {
        element.textContent = attributes[key];
      } else if (key.startsWith('on')) {
        element.addEventListener(key.slice(2).toLowerCase(), attributes[key]);
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    
    return element;
  },
  
  addClass(element, className) {
    element.classList.add(className);
  },
  
  removeClass(element, className) {
    element.classList.remove(className);
  },
  
  toggleClass(element, className) {
    element.classList.toggle(className);
  },
  
  hasClass(element, className) {
    return element.classList.contains(className);
  },
  
  getStyle(element, property) {
    return window.getComputedStyle(element)[property];
  },
  
  setStyle(element, styles) {
    Object.keys(styles).forEach(property => {
      element.style[property] = styles[property];
    });
  }
};

/**
 * 性能工具
 */
export const performanceUtils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  memoize(func) {
    const cache = new Map();
    return function(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },
  
  measureTime(func, label = 'Function') {
    return function(...args) {
      const start = performance.now();
      const result = func.apply(this, args);
      const end = performance.now();
      console.log(`${label} 执行时间: ${(end - start).toFixed(2)}ms`);
      return result;
    };
  }
};

// 统一导出
export const utils = {
  log: logger.log.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  info: logger.info.bind(logger),
  formatDate: dateUtils.formatDate,
  getRelativeTime: dateUtils.getRelativeTime,
  isToday: dateUtils.isToday,
  capitalize: stringUtils.capitalize,
  camelCase: stringUtils.camelCase,
  kebabCase: stringUtils.kebabCase,
  truncate: stringUtils.truncate,
  slugify: stringUtils.slugify,
  unique: arrayUtils.unique,
  chunk: arrayUtils.chunk,
  shuffle: arrayUtils.shuffle,
  groupBy: arrayUtils.groupBy,
  sortBy: arrayUtils.sortBy,
  deepClone: objectUtils.deepClone,
  deepMerge: objectUtils.deepMerge,
  pick: objectUtils.pick,
  omit: objectUtils.omit,
  flatten: objectUtils.flatten,
  createElement: domUtils.createElement,
  addClass: domUtils.addClass,
  removeClass: domUtils.removeClass,
  toggleClass: domUtils.toggleClass,
  hasClass: domUtils.hasClass,
  getStyle: domUtils.getStyle,
  setStyle: domUtils.setStyle,
  debounce: performanceUtils.debounce,
  throttle: performanceUtils.throttle,
  memoize: performanceUtils.memoize,
  measureTime: performanceUtils.measureTime
};

export default utils;