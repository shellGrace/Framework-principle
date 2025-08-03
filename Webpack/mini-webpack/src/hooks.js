/**
 * 简化的钩子系统实现
 * 用于插件机制的事件发布订阅
 */

/**
 * 同步钩子基类
 */
class SyncHook {
  constructor(args = []) {
    this.args = args;
    this.taps = [];
  }
  
  /**
   * 注册同步监听器
   */
  tap(name, fn) {
    this.taps.push({ name, fn, type: 'sync' });
  }
  
  /**
   * 触发钩子
   */
  call(...args) {
    this.taps.forEach(tap => {
      tap.fn(...args);
    });
  }
}

/**
 * 异步串行钩子
 */
class AsyncSeriesHook {
  constructor(args = []) {
    this.args = args;
    this.taps = [];
  }
  
  /**
   * 注册同步监听器
   */
  tap(name, fn) {
    this.taps.push({ name, fn, type: 'sync' });
  }
  
  /**
   * 注册异步监听器（回调形式）
   */
  tapAsync(name, fn) {
    this.taps.push({ name, fn, type: 'async' });
  }
  
  /**
   * 注册异步监听器（Promise形式）
   */
  tapPromise(name, fn) {
    this.taps.push({ name, fn, type: 'promise' });
  }
  
  /**
   * 触发钩子（回调形式）
   */
  callAsync(...args) {
    const callback = args.pop();
    let index = 0;
    
    const next = (err) => {
      if (err) return callback(err);
      
      if (index >= this.taps.length) {
        return callback();
      }
      
      const tap = this.taps[index++];
      
      if (tap.type === 'sync') {
        try {
          tap.fn(...args);
          next();
        } catch (error) {
          next(error);
        }
      } else if (tap.type === 'async') {
        tap.fn(...args, next);
      } else if (tap.type === 'promise') {
        Promise.resolve(tap.fn(...args))
          .then(() => next())
          .catch(next);
      }
    };
    
    next();
  }
  
  /**
   * 触发钩子（Promise形式）
   */
  promise(...args) {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * 异步并行钩子
 */
class AsyncParallelHook {
  constructor(args = []) {
    this.args = args;
    this.taps = [];
  }
  
  tap(name, fn) {
    this.taps.push({ name, fn, type: 'sync' });
  }
  
  tapAsync(name, fn) {
    this.taps.push({ name, fn, type: 'async' });
  }
  
  tapPromise(name, fn) {
    this.taps.push({ name, fn, type: 'promise' });
  }
  
  callAsync(...args) {
    const callback = args.pop();
    let pending = this.taps.length;
    let hasError = false;
    
    if (pending === 0) {
      return callback();
    }
    
    const done = (err) => {
      if (hasError) return;
      
      if (err) {
        hasError = true;
        return callback(err);
      }
      
      if (--pending === 0) {
        callback();
      }
    };
    
    this.taps.forEach(tap => {
      if (tap.type === 'sync') {
        try {
          tap.fn(...args);
          done();
        } catch (error) {
          done(error);
        }
      } else if (tap.type === 'async') {
        tap.fn(...args, done);
      } else if (tap.type === 'promise') {
        Promise.resolve(tap.fn(...args))
          .then(() => done())
          .catch(done);
      }
    });
  }
  
  promise(...args) {
    return new Promise((resolve, reject) => {
      this.callAsync(...args, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * 瀑布流钩子（每个监听器的返回值会传递给下一个）
 */
class SyncWaterfallHook {
  constructor(args = []) {
    this.args = args;
    this.taps = [];
  }
  
  tap(name, fn) {
    this.taps.push({ name, fn });
  }
  
  call(value, ...args) {
    return this.taps.reduce((current, tap) => {
      return tap.fn(current, ...args);
    }, value);
  }
}

/**
 * 保释钩子（如果任何监听器返回非undefined值，则停止执行）
 */
class SyncBailHook {
  constructor(args = []) {
    this.args = args;
    this.taps = [];
  }
  
  tap(name, fn) {
    this.taps.push({ name, fn });
  }
  
  call(...args) {
    for (const tap of this.taps) {
      const result = tap.fn(...args);
      if (result !== undefined) {
        return result;
      }
    }
  }
}

module.exports = {
  SyncHook,
  AsyncSeriesHook,
  AsyncParallelHook,
  SyncWaterfallHook,
  SyncBailHook
};