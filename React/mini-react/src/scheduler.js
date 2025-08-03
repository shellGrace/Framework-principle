/**
 * 任务调度器
 * 实现时间切片和任务优先级调度
 */

// 时间切片大小（毫秒）
const TIME_SLICE = 5;

// 任务队列
let taskQueue = [];
let isSchedulerRunning = false;
let currentTask = null;

/**
 * 调度任务
 * @param {function} callback - 任务回调函数
 * @param {number} priority - 任务优先级
 */
export function scheduleCallback(callback, priority = 0) {
  const task = {
    id: Math.random(),
    callback,
    priority,
    startTime: performance.now(),
  };
  
  // 按优先级插入任务队列
  insertTask(task);
  
  // 如果调度器没有运行，启动调度器
  if (!isSchedulerRunning) {
    isSchedulerRunning = true;
    scheduleWork();
  }
  
  return task;
}

/**
 * 取消任务
 * @param {object} task - 要取消的任务
 */
export function cancelCallback(task) {
  const index = taskQueue.indexOf(task);
  if (index !== -1) {
    taskQueue.splice(index, 1);
  }
}

/**
 * 按优先级插入任务
 * @param {object} task - 任务对象
 */
function insertTask(task) {
  let index = 0;
  while (index < taskQueue.length && taskQueue[index].priority <= task.priority) {
    index++;
  }
  taskQueue.splice(index, 0, task);
}

/**
 * 调度工作
 */
function scheduleWork() {
  if (typeof MessageChannel !== 'undefined') {
    // 使用MessageChannel实现异步调度
    const channel = new MessageChannel();
    const port1 = channel.port1;
    const port2 = channel.port2;
    
    port1.onmessage = flushWork;
    port2.postMessage(null);
  } else {
    // 降级到setTimeout
    setTimeout(flushWork, 0);
  }
}

/**
 * 执行工作
 */
function flushWork() {
  const startTime = performance.now();
  
  try {
    while (taskQueue.length > 0 && !shouldYield(startTime)) {
      currentTask = taskQueue.shift();
      const callback = currentTask.callback;
      
      if (typeof callback === 'function') {
        const result = callback();
        
        // 如果任务返回了新的回调函数，说明任务还没完成
        if (typeof result === 'function') {
          currentTask.callback = result;
          insertTask(currentTask);
        }
      }
      
      currentTask = null;
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  } finally {
    currentTask = null;
    
    if (taskQueue.length > 0) {
      // 还有任务，继续调度
      scheduleWork();
    } else {
      isSchedulerRunning = false;
    }
  }
}

/**
 * 判断是否应该让出控制权
 * @param {number} startTime - 开始时间
 * @returns {boolean} 是否应该让出
 */
function shouldYield(startTime) {
  return performance.now() - startTime >= TIME_SLICE;
}

/**
 * 获取当前时间
 * @returns {number} 当前时间戳
 */
export function getCurrentTime() {
  return performance.now();
}

/**
 * 立即执行任务（同步）
 * @param {function} callback - 回调函数
 */
export function runWithPriority(callback) {
  return callback();
}

/**
 * 请求空闲回调（简化版）
 * @param {function} callback - 回调函数
 */
export function requestIdleCallback(callback) {
  return scheduleCallback(callback, 1000); // 低优先级
}