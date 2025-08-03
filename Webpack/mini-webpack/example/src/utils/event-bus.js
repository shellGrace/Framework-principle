// 事件总线实现
export class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 10;
  }
  
  /**
   * 添加事件监听器
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listeners = this.events.get(event);
    
    // 检查监听器数量限制
    if (listeners.length >= this.maxListeners) {
      console.warn(`事件 "${event}" 的监听器数量已达到最大值 ${this.maxListeners}`);
    }
    
    listeners.push(listener);
    
    return this;
  }
  
  /**
   * 添加一次性事件监听器
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, onceWrapper);
    };
    
    return this.on(event, onceWrapper);
  }
  
  /**
   * 移除事件监听器
   */
  off(event, listener) {
    if (!this.events.has(event)) {
      return this;
    }
    
    const listeners = this.events.get(event);
    
    if (listener) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      
      // 如果没有监听器了，删除事件
      if (listeners.length === 0) {
        this.events.delete(event);
      }
    } else {
      // 移除所有监听器
      this.events.delete(event);
    }
    
    return this;
  }
  
  /**
   * 触发事件
   */
  emit(event, ...args) {
    if (!this.events.has(event)) {
      return false;
    }
    
    const listeners = this.events.get(event).slice(); // 复制数组避免在遍历时修改
    
    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`事件 "${event}" 的监听器执行出错:`, error);
      }
    });
    
    return true;
  }
  
  /**
   * 异步触发事件
   */
  async emitAsync(event, ...args) {
    if (!this.events.has(event)) {
      return false;
    }
    
    const listeners = this.events.get(event).slice();
    
    for (const listener of listeners) {
      try {
        await listener.apply(this, args);
      } catch (error) {
        console.error(`事件 "${event}" 的异步监听器执行出错:`, error);
      }
    }
    
    return true;
  }
  
  /**
   * 获取事件的监听器数量
   */
  listenerCount(event) {
    if (!this.events.has(event)) {
      return 0;
    }
    return this.events.get(event).length;
  }
  
  /**
   * 获取所有事件名称
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
  
  /**
   * 获取事件的所有监听器
   */
  listeners(event) {
    if (!this.events.has(event)) {
      return [];
    }
    return this.events.get(event).slice();
  }
  
  /**
   * 移除所有事件监听器
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
  
  /**
   * 设置最大监听器数量
   */
  setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0) {
      throw new TypeError('最大监听器数量必须是非负数');
    }
    this.maxListeners = n;
    return this;
  }
  
  /**
   * 获取最大监听器数量
   */
  getMaxListeners() {
    return this.maxListeners;
  }
  
  /**
   * 在事件前添加监听器
   */
  prependListener(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('监听器必须是函数');
    }
    
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const listeners = this.events.get(event);
    listeners.unshift(listener);
    
    return this;
  }
  
  /**
   * 在事件前添加一次性监听器
   */
  prependOnceListener(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, onceWrapper);
    };
    
    return this.prependListener(event, onceWrapper);
  }
}

// 创建全局事件总线实例
export const globalEventBus = new EventBus();

// 事件总线工厂函数
export function createEventBus() {
  return new EventBus();
}

// 默认导出
export default EventBus;