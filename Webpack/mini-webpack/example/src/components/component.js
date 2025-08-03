// 示例组件类
export class Component {
  constructor(name) {
    this.name = name;
    this.state = {
      count: 0,
      visible: true
    };
    this.element = null;
  }
  
  render() {
    if (this.element) {
      return this.element;
    }
    
    this.element = document.createElement('div');
    this.element.className = 'component';
    
    // 组件标题
    const title = document.createElement('h3');
    title.textContent = this.name;
    title.className = 'component-title';
    this.element.appendChild(title);
    
    // 状态显示
    const stateDisplay = document.createElement('div');
    stateDisplay.className = 'state-display';
    this.updateStateDisplay(stateDisplay);
    this.element.appendChild(stateDisplay);
    
    // 控制按钮
    const controls = this.createControls(stateDisplay);
    this.element.appendChild(controls);
    
    return this.element;
  }
  
  createControls(stateDisplay) {
    const controls = document.createElement('div');
    controls.className = 'component-controls';
    
    // 增加按钮
    const incrementBtn = document.createElement('button');
    incrementBtn.textContent = '增加计数';
    incrementBtn.className = 'control-button increment';
    incrementBtn.onclick = () => {
      this.setState({ count: this.state.count + 1 });
      this.updateStateDisplay(stateDisplay);
    };
    
    // 减少按钮
    const decrementBtn = document.createElement('button');
    decrementBtn.textContent = '减少计数';
    decrementBtn.className = 'control-button decrement';
    decrementBtn.onclick = () => {
      this.setState({ count: this.state.count - 1 });
      this.updateStateDisplay(stateDisplay);
    };
    
    // 重置按钮
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    resetBtn.className = 'control-button reset';
    resetBtn.onclick = () => {
      this.setState({ count: 0 });
      this.updateStateDisplay(stateDisplay);
    };
    
    // 切换可见性按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '切换显示';
    toggleBtn.className = 'control-button toggle';
    toggleBtn.onclick = () => {
      this.setState({ visible: !this.state.visible });
      this.updateStateDisplay(stateDisplay);
      this.updateVisibility();
    };
    
    controls.appendChild(incrementBtn);
    controls.appendChild(decrementBtn);
    controls.appendChild(resetBtn);
    controls.appendChild(toggleBtn);
    
    return controls;
  }
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }
  
  updateStateDisplay(stateDisplay) {
    stateDisplay.innerHTML = `
      <p>计数: <strong>${this.state.count}</strong></p>
      <p>可见: <strong>${this.state.visible ? '是' : '否'}</strong></p>
      <p>更新时间: <strong>${new Date().toLocaleTimeString()}</strong></p>
    `;
  }
  
  updateVisibility() {
    if (this.element) {
      this.element.style.opacity = this.state.visible ? '1' : '0.3';
    }
  }
  
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// 工厂函数
export function createComponent(name) {
  return new Component(name);
}

// 组件管理器
export class ComponentManager {
  constructor() {
    this.components = new Map();
  }
  
  register(id, component) {
    this.components.set(id, component);
  }
  
  unregister(id) {
    const component = this.components.get(id);
    if (component && component.destroy) {
      component.destroy();
    }
    this.components.delete(id);
  }
  
  get(id) {
    return this.components.get(id);
  }
  
  getAll() {
    return Array.from(this.components.values());
  }
  
  clear() {
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.components.clear();
  }
}

// 默认导出
export default Component;