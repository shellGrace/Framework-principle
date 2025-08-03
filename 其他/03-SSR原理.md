# SSR 服务端渲染原理（高优先级 ⭐⭐⭐⭐⭐）

## 1. SSR 核心概念

### 1.1 什么是 SSR
- **定义**：Server-Side Rendering，在服务器端将组件渲染成 HTML 字符串
- **目的**：提升首屏加载速度、SEO 优化、更好的用户体验
- **对比**：CSR（客户端渲染）vs SSR（服务端渲染）

### 1.2 渲染方式对比
```
CSR 流程：
浏览器请求 → 返回空 HTML + JS Bundle → 执行 JS → 渲染页面

SSR 流程：
浏览器请求 → 服务器渲染 → 返回完整 HTML → 水合(Hydration)
```

## 2. SSR 实现原理

### 2.1 React SSR 基础实现
```javascript
// server.js
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

const server = express();

server.get('*', (req, res) => {
  // 1. 渲染组件为 HTML 字符串
  const appString = renderToString(<App />);
  
  // 2. 生成完整的 HTML 页面
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSR App</title>
      </head>
      <body>
        <div id="root">${appString}</div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `;
  
  res.send(html);
});
```

### 2.2 Vue SSR 基础实现
```javascript
// server.js
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';

const server = express();

server.get('*', async (req, res) => {
  // 1. 创建 Vue 应用实例
  const app = createSSRApp(App);
  
  // 2. 渲染为 HTML 字符串
  const appHtml = await renderToString(app);
  
  // 3. 生成完整页面
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Vue SSR</title>
      </head>
      <body>
        <div id="app">${appHtml}</div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `;
  
  res.send(html);
});
```

## 3. 水合（Hydration）过程

### 3.1 水合概念
- **定义**：客户端 JavaScript 接管服务器渲染的 HTML，使其变为可交互的应用
- **过程**：事件绑定、状态恢复、组件激活
- **关键**：客户端和服务端渲染结果必须一致

### 3.2 React 水合实现
```javascript
// client.js
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';

// 水合服务器渲染的内容
const container = document.getElementById('root');
const root = hydrateRoot(container, <App />);
```

### 3.3 Vue 水合实现
```javascript
// client.js
import { createSSRApp } from 'vue';
import App from './App.vue';

// 创建应用并水合
const app = createSSRApp(App);
app.mount('#app', true); // 第二个参数表示水合模式
```

### 3.4 水合不匹配问题
```javascript
// 常见的水合不匹配场景

// 1. 时间相关的内容
const TimeComponent = () => {
  const [time, setTime] = useState(new Date().toISOString());
  
  // 解决方案：使用 useEffect
  useEffect(() => {
    setTime(new Date().toISOString());
  }, []);
  
  return <div>{time}</div>;
};

// 2. 随机数
const RandomComponent = () => {
  const [random, setRandom] = useState(0);
  
  useEffect(() => {
    setRandom(Math.random());
  }, []);
  
  return <div>{random}</div>;
};

// 3. 浏览器特定 API
const BrowserComponent = () => {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    setWidth(window.innerWidth);
  }, []);
  
  return <div>Width: {width}</div>;
};
```

## 4. 数据获取策略

### 4.1 服务端数据预取
```javascript
// Next.js getServerSideProps
export async function getServerSideProps(context) {
  const { params, query, req, res } = context;
  
  // 在服务器端获取数据
  const data = await fetchData(params.id);
  
  return {
    props: {
      data
    }
  };
}

const Page = ({ data }) => {
  return <div>{data.title}</div>;
};
```

### 4.2 Nuxt.js 数据获取
```javascript
// pages/post/_id.vue
export default {
  async asyncData({ params, $axios }) {
    // 服务端和客户端都会执行
    const post = await $axios.$get(`/api/posts/${params.id}`);
    return { post };
  },
  
  async fetch() {
    // 仅在客户端执行
    this.comments = await this.$axios.$get(`/api/comments/${this.post.id}`);
  }
};
```

### 4.3 通用数据获取模式
```javascript
// 同构数据获取
class DataFetcher {
  static async getInitialProps(context) {
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
      // 服务端逻辑
      return await this.fetchFromServer(context);
    } else {
      // 客户端逻辑
      return await this.fetchFromClient(context);
    }
  }
  
  static async fetchFromServer(context) {
    // 直接访问数据库或内部 API
    return await database.query(context.params.id);
  }
  
  static async fetchFromClient(context) {
    // 通过 HTTP 请求获取数据
    return await fetch(`/api/data/${context.params.id}`).then(res => res.json());
  }
}
```

## 5. 路由处理

### 5.1 React Router SSR
```javascript
// server.js
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';

server.get('*', (req, res) => {
  const context = {};
  
  const appString = renderToString(
    <StaticRouter location={req.url} context={context}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/posts/:id" element={<Post />} />
      </Routes>
    </StaticRouter>
  );
  
  // 处理重定向
  if (context.url) {
    res.redirect(301, context.url);
    return;
  }
  
  res.send(generateHTML(appString));
});
```

### 5.2 Vue Router SSR
```javascript
// server.js
import { createRouter, createMemoryHistory } from 'vue-router';
import { createSSRApp } from 'vue';

server.get('*', async (req, res) => {
  const app = createSSRApp(App);
  
  // 创建路由实例
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  });
  
  app.use(router);
  
  // 导航到请求的路由
  await router.push(req.url);
  await router.isReady();
  
  const html = await renderToString(app);
  res.send(generateHTML(html));
});
```

## 6. 状态管理

### 6.1 Redux SSR
```javascript
// server.js
import { Provider } from 'react-redux';
import { createStore } from 'redux';

server.get('*', async (req, res) => {
  // 1. 创建新的 store 实例
  const store = createStore(reducer);
  
  // 2. 预填充数据
  await store.dispatch(fetchInitialData(req.params));
  
  // 3. 渲染应用
  const appString = renderToString(
    <Provider store={store}>
      <App />
    </Provider>
  );
  
  // 4. 序列化状态
  const preloadedState = store.getState();
  
  const html = `
    <div id="root">${appString}</div>
    <script>
      window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}
    </script>
    <script src="/bundle.js"></script>
  `;
  
  res.send(html);
});

// client.js
const preloadedState = window.__PRELOADED_STATE__;
delete window.__PRELOADED_STATE__;

const store = createStore(reducer, preloadedState);

hydrateRoot(
  document.getElementById('root'),
  <Provider store={store}>
    <App />
  </Provider>
);
```

### 6.2 Vuex SSR
```javascript
// server.js
import { createStore } from 'vuex';

server.get('*', async (req, res) => {
  const store = createStore(storeConfig);
  
  // 预填充数据
  await store.dispatch('fetchInitialData', req.params);
  
  const app = createSSRApp(App);
  app.use(store);
  
  const html = await renderToString(app);
  const state = store.state;
  
  res.send(`
    <div id="app">${html}</div>
    <script>window.__INITIAL_STATE__ = ${JSON.stringify(state)}</script>
  `);
});

// client.js
const store = createStore(storeConfig);

if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
}

const app = createSSRApp(App);
app.use(store);
app.mount('#app', true);
```

## 7. 性能优化

### 7.1 缓存策略
```javascript
// 页面级缓存
const cache = new Map();

server.get('/posts/:id', (req, res) => {
  const cacheKey = `post-${req.params.id}`;
  
  // 检查缓存
  if (cache.has(cacheKey)) {
    return res.send(cache.get(cacheKey));
  }
  
  // 渲染页面
  const html = renderPage(req);
  
  // 缓存结果
  cache.set(cacheKey, html);
  
  res.send(html);
});

// 组件级缓存
import LRU from 'lru-cache';

const componentCache = new LRU({
  max: 1000,
  ttl: 1000 * 60 * 15 // 15 分钟
});

const CacheableComponent = ({ id, data }) => {
  const cacheKey = `component-${id}`;
  
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey);
  }
  
  const rendered = renderToString(<ExpensiveComponent data={data} />);
  componentCache.set(cacheKey, rendered);
  
  return rendered;
};
```

### 7.2 流式渲染
```javascript
// React 18 流式 SSR
import { renderToPipeableStream } from 'react-dom/server';

server.get('*', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: ['/bundle.js'],
      onShellReady() {
        // 外壳准备就绪，开始流式传输
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');
        pipe(res);
      },
      onError(error) {
        console.error(error);
        res.statusCode = 500;
        res.send('Server Error');
      }
    }
  );
  
  // 超时处理
  setTimeout(abort, 10000);
});
```

### 7.3 代码分割
```javascript
// 动态导入组件
const LazyComponent = React.lazy(() => import('./LazyComponent'));

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
};

// 服务端处理
server.get('*', async (req, res) => {
  const modules = new Set();
  
  const appString = renderToString(
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>
  );
  
  // 收集需要的模块
  const scripts = Array.from(modules).map(module => 
    `<script src="${getModulePath(module)}"></script>`
  ).join('');
  
  res.send(`
    <div id="root">${appString}</div>
    ${scripts}
    <script src="/bundle.js"></script>
  `);
});
```

## 8. SSG 静态站点生成

### 8.1 Next.js SSG
```javascript
// getStaticProps - 构建时获取数据
export async function getStaticProps() {
  const posts = await fetchPosts();
  
  return {
    props: {
      posts
    },
    revalidate: 60 // ISR: 60秒后重新生成
  };
}

// getStaticPaths - 预生成路径
export async function getStaticPaths() {
  const posts = await fetchPosts();
  const paths = posts.map(post => ({
    params: { id: post.id }
  }));
  
  return {
    paths,
    fallback: 'blocking' // 或 true/false
  };
}
```

### 8.2 Nuxt.js SSG
```javascript
// nuxt.config.js
export default {
  target: 'static',
  generate: {
    async routes() {
      const posts = await fetchPosts();
      return posts.map(post => `/posts/${post.id}`);
    }
  }
};

// 页面组件
export default {
  async asyncData({ params }) {
    const post = await fetchPost(params.id);
    return { post };
  }
};
```

## 9. ISR 增量静态再生

### 9.1 Next.js ISR
```javascript
export async function getStaticProps() {
  const data = await fetchData();
  
  return {
    props: { data },
    revalidate: 10 // 10秒后在后台重新生成
  };
}

// 按需重新验证
export default function handler(req, res) {
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  try {
    await res.revalidate('/posts/1');
    return res.json({ revalidated: true });
  } catch (err) {
    return res.status(500).send('Error revalidating');
  }
}
```

## 10. 面试重点

### 10.1 核心概念
1. **SSR vs CSR vs SSG**：渲染方式对比
2. **水合过程**：客户端接管服务端渲染内容
3. **同构应用**：服务端和客户端运行相同代码
4. **SEO 优化**：搜索引擎友好
5. **首屏性能**：更快的首次内容绘制

### 10.2 技术难点
1. **状态同步**：服务端和客户端状态一致性
2. **路由处理**：服务端路由匹配
3. **数据获取**：服务端数据预取策略
4. **缓存策略**：页面和组件级缓存
5. **性能优化**：流式渲染、代码分割

### 10.3 实际应用
- 电商网站（SEO 重要）
- 新闻媒体（首屏速度）
- 企业官网（搜索优化）
- 博客系统（内容展示）

---

**学习建议**：
1. 理解不同渲染模式的适用场景
2. 掌握主流框架的 SSR 实现
3. 实践同构应用开发
4. 关注性能优化策略
5. 了解现代 SSR 框架（Next.js、Nuxt.js）