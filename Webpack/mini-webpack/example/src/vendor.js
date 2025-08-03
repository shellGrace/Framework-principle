// 第三方库入口文件
// 这里模拟一些常用的第三方库

// 模拟 lodash 的一些工具函数
export const _ = {
  isArray(value) {
    return Array.isArray(value);
  },
  
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  },
  
  isString(value) {
    return typeof value === 'string';
  },
  
  isFunction(value) {
    return typeof value === 'function';
  },
  
  clone(obj) {
    if (this.isArray(obj)) {
      return [...obj];
    }
    if (this.isObject(obj)) {
      return { ...obj };
    }
    return obj;
  },
  
  merge(target, ...sources) {
    return Object.assign(target, ...sources);
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
  }
};

// 模拟 axios 的简单实现
export const axios = {
  async get(url, config = {}) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...config
      });
      
      const data = await response.json();
      
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`GET ${url} 失败: ${error.message}`);
    }
  },
  
  async post(url, data, config = {}) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(data),
        ...config
      });
      
      const responseData = await response.json();
      
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`POST ${url} 失败: ${error.message}`);
    }
  }
};

// 模拟 moment.js 的日期处理
export const moment = {
  format(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    
    const formatMap = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0')
    };
    
    let result = format;
    Object.keys(formatMap).forEach(key => {
      result = result.replace(new RegExp(key, 'g'), formatMap[key]);
    });
    
    return result;
  },
  
  fromNow(date) {
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
    return `${seconds}秒前`;
  },
  
  add(date, amount, unit) {
    const d = new Date(date);
    
    switch (unit) {
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
    }
    
    return d;
  }
};

// 模拟 UUID 生成器
export const uuid = {
  v4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// 模拟事件发射器
export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }
  
  off(event, listener) {
    if (!this.events[event]) return this;
    
    if (listener) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    } else {
      delete this.events[event];
    }
    
    return this;
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return false;
    
    this.events[event].forEach(listener => {
      listener.apply(this, args);
    });
    
    return true;
  }
  
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, onceWrapper);
    };
    
    return this.on(event, onceWrapper);
  }
}

// 导出所有模拟的第三方库
export default {
  _,
  axios,
  moment,
  uuid,
  EventEmitter
};

console.log('第三方库模块已加载');