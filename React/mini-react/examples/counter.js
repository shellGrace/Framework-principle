/**
 * 计数器示例
 * 展示useState和useEffect的使用
 */

import { createElement, render, useState, useEffect } from '../src/index.js';

// 计数器组件
function Counter() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hello Mini-React!');
  
  // 副作用：监听count变化
  useEffect(() => {
    console.log('Count changed:', count);
    document.title = `Count: ${count}`;
  }, [count]);
  
  // 副作用：组件挂载时执行
  useEffect(() => {
    console.log('Counter component mounted');
    return () => {
      console.log('Counter component will unmount');
    };
  }, []);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);
  const updateMessage = () => setMessage(`Updated at ${new Date().toLocaleTimeString()}`);
  
  return createElement('div', { className: 'counter' },
    createElement('h1', null, message),
    createElement('div', { className: 'count-display' },
      createElement('h2', null, `Count: ${count}`)
    ),
    createElement('div', { className: 'buttons' },
      createElement('button', { onClick: decrement }, '-'),
      createElement('button', { onClick: reset }, 'Reset'),
      createElement('button', { onClick: increment }, '+'),
      createElement('button', { onClick: updateMessage }, 'Update Message')
    )
  );
}

// 待办事项组件
function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn Mini-React', completed: false },
    { id: 2, text: 'Build something awesome', completed: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue,
        completed: false
      }]);
      setInputValue('');
    }
  };
  
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };
  
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  return createElement('div', { className: 'todo-app' },
    createElement('h2', null, 'Todo List'),
    createElement('div', { className: 'todo-input' },
      createElement('input', {
        type: 'text',
        value: inputValue,
        onChange: (e) => setInputValue(e.target.value),
        placeholder: 'Add a new todo...'
      }),
      createElement('button', { onClick: addTodo }, 'Add')
    ),
    createElement('ul', { className: 'todo-list' },
      ...todos.map(todo =>
        createElement('li', {
          key: todo.id,
          className: todo.completed ? 'completed' : ''
        },
          createElement('span', {
            onClick: () => toggleTodo(todo.id),
            style: {
              textDecoration: todo.completed ? 'line-through' : 'none',
              cursor: 'pointer'
            }
          }, todo.text),
          createElement('button', {
            onClick: () => deleteTodo(todo.id),
            style: { marginLeft: '10px' }
          }, 'Delete')
        )
      )
    )
  );
}

// 主应用组件
function App() {
  const [currentView, setCurrentView] = useState('counter');
  
  return createElement('div', { className: 'app' },
    createElement('nav', null,
      createElement('button', {
        onClick: () => setCurrentView('counter'),
        className: currentView === 'counter' ? 'active' : ''
      }, 'Counter'),
      createElement('button', {
        onClick: () => setCurrentView('todo'),
        className: currentView === 'todo' ? 'active' : ''
      }, 'Todo')
    ),
    createElement('main', null,
      currentView === 'counter'
        ? createElement(Counter)
        : createElement(TodoApp)
    )
  );
}

// 导出组件供HTML文件使用
if (typeof window !== 'undefined') {
  window.App = App;
  window.Counter = Counter;
  window.TodoApp = TodoApp;
}

export { App, Counter, TodoApp };