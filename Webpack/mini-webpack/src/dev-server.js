const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { colors, formatTime } = require('./utils');

/**
 * 开发服务器类
 */
class DevServer {
  constructor(compiler, options = {}) {
    this.compiler = compiler;
    this.options = {
      port: 8080,
      host: 'localhost',
      hot: true,
      open: false,
      static: {
        directory: path.resolve(process.cwd(), 'dist')
      },
      ...options
    };
    
    this.app = express();
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.stats = null;
    this.isCompiling = false;
    
    this.setupMiddleware();
    this.setupWebSocket();
    this.setupCompilerHooks();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 日志中间件
    this.app.use((req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;
      
      res.send = function(data) {
        const duration = Date.now() - start;
        console.log(
          colors.cyan(`[${new Date().toLocaleTimeString()}]`),
          req.method,
          req.url,
          colors.green(`${res.statusCode}`),
          colors.yellow(`${duration}ms`)
        );
        originalSend.call(this, data);
      };
      
      next();
    });

    // 热更新客户端脚本
    if (this.options.hot) {
      this.app.get('/__webpack_hmr', (req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.send(this.getHMRClientScript());
      });
    }

    // 开发中间件
    this.app.use((req, res, next) => {
      if (this.isCompiling) {
        res.setHeader('Content-Type', 'text/html');
        res.send(this.getCompilingPage());
        return;
      }
      
      next();
    });

    // 静态文件服务
    if (this.options.static) {
      this.app.use(express.static(this.options.static.directory));
    }

    // SPA 路由支持
    this.app.get('*', (req, res) => {
      const indexPath = path.join(this.options.static.directory, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf-8');
        
        // 注入热更新脚本
        if (this.options.hot) {
          const hmrScript = '<script src="/__webpack_hmr"></script>';
          content = content.replace('</body>', `${hmrScript}</body>`);
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.send(content);
      } else {
        res.status(404).send('页面未找到');
      }
    });
  }

  /**
   * 设置 WebSocket
   */
  setupWebSocket() {
    if (!this.options.hot) {
      return;
    }

    this.wss = new WebSocket.Server({ noServer: true });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      // 发送初始状态
      this.sendToClient(ws, {
        type: 'connected',
        data: {
          hot: true,
          liveReload: true
        }
      });
      
      // 如果有编译统计信息，发送给客户端
      if (this.stats) {
        this.sendToClient(ws, {
          type: 'hash',
          data: this.stats.hash
        });
        
        if (this.stats.errors.length === 0) {
          this.sendToClient(ws, { type: 'ok' });
        } else {
          this.sendToClient(ws, {
            type: 'errors',
            data: this.stats.errors
          });
        }
      }
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket 错误:', error);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * 设置编译器钩子
   */
  setupCompilerHooks() {
    // 编译开始
    this.compiler.hooks.beforeRun.tap('DevServer', () => {
      this.isCompiling = true;
      this.broadcastToClients({
        type: 'invalid',
        data: '正在编译...'
      });
    });

    // 编译完成
    this.compiler.hooks.done.tap('DevServer', (stats) => {
      this.isCompiling = false;
      this.stats = stats;
      
      // 发送编译结果
      this.broadcastToClients({
        type: 'hash',
        data: stats.hash
      });
      
      if (stats.errors.length > 0) {
        this.broadcastToClients({
          type: 'errors',
          data: stats.errors
        });
      } else if (stats.warnings.length > 0) {
        this.broadcastToClients({
          type: 'warnings',
          data: stats.warnings
        });
        this.broadcastToClients({ type: 'ok' });
      } else {
        this.broadcastToClients({ type: 'ok' });
      }
      
      // 打印编译结果
      this.printStats(stats);
    });

    // 编译失败
    this.compiler.hooks.failed.tap('DevServer', (error) => {
      this.isCompiling = false;
      
      this.broadcastToClients({
        type: 'errors',
        data: [error.message]
      });
      
      console.error(colors.red('编译失败:'), error.message);
    });
  }

  /**
   * 向客户端发送消息
   */
  sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * 向所有客户端广播消息
   */
  broadcastToClients(message) {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  /**
   * 获取热更新客户端脚本
   */
  getHMRClientScript() {
    return `
      (function() {
        var socket = new WebSocket('ws://localhost:${this.options.port}');
        var currentHash = '';
        
        socket.onopen = function() {
          console.log('[HMR] 连接到开发服务器');
        };
        
        socket.onmessage = function(event) {
          var message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('[HMR] 已连接到开发服务器');
              break;
              
            case 'hash':
              currentHash = message.data;
              break;
              
            case 'ok':
              console.log('[HMR] 编译成功，准备更新');
              if (currentHash) {
                location.reload();
              }
              break;
              
            case 'errors':
              console.error('[HMR] 编译错误:');
              message.data.forEach(function(error) {
                console.error(error);
              });
              break;
              
            case 'warnings':
              console.warn('[HMR] 编译警告:');
              message.data.forEach(function(warning) {
                console.warn(warning);
              });
              break;
              
            case 'invalid':
              console.log('[HMR] ' + message.data);
              break;
          }
        };
        
        socket.onclose = function() {
          console.log('[HMR] 与开发服务器断开连接');
        };
        
        socket.onerror = function(error) {
          console.error('[HMR] WebSocket 错误:', error);
        };
      })();
    `;
  }

  /**
   * 获取编译中页面
   */
  getCompilingPage() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>正在编译...</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h2>正在编译...</h2>
          <p>请稍候，页面将自动刷新</p>
        </div>
        <script>
          setTimeout(function() {
            location.reload();
          }, 2000);
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 打印编译统计信息
   */
  printStats(stats) {
    const { errors, warnings, modules, chunks, assets, time } = stats;
    
    console.log('\n' + colors.cyan('='.repeat(50)));
    console.log(colors.cyan('编译完成'));
    console.log(colors.cyan('='.repeat(50)));
    
    // 时间
    console.log(`编译时间: ${colors.yellow(formatTime(time))}`);
    
    // 模块数量
    console.log(`模块数量: ${colors.green(modules.length)}`);
    
    // 代码块数量
    console.log(`代码块数量: ${colors.green(chunks.length)}`);
    
    // 资源文件
    if (assets.length > 0) {
      console.log('\n生成的资源:');
      assets.forEach(asset => {
        console.log(`  ${colors.green(asset.name)} ${colors.yellow(asset.size)}`);
      });
    }
    
    // 警告
    if (warnings.length > 0) {
      console.log('\n' + colors.yellow(`警告 (${warnings.length}):`));
      warnings.forEach(warning => {
        console.log(colors.yellow(`  ${warning}`));
      });
    }
    
    // 错误
    if (errors.length > 0) {
      console.log('\n' + colors.red(`错误 (${errors.length}):`));
      errors.forEach(error => {
        console.log(colors.red(`  ${error}`));
      });
    }
    
    if (errors.length === 0) {
      console.log('\n' + colors.green('✓ 编译成功!'));
      console.log(`服务器运行在: ${colors.cyan(`http://${this.options.host}:${this.options.port}`)}`);
    } else {
      console.log('\n' + colors.red('✗ 编译失败!'));
    }
    
    console.log(colors.cyan('='.repeat(50)) + '\n');
  }

  /**
   * 启动服务器
   */
  async listen() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, this.options.host, (error) => {
        if (error) {
          reject(error);
          return;
        }
        
        // 设置 WebSocket 升级
        if (this.wss) {
          this.server.on('upgrade', (request, socket, head) => {
            this.wss.handleUpgrade(request, socket, head, (ws) => {
              this.wss.emit('connection', ws, request);
            });
          });
        }
        
        const url = `http://${this.options.host}:${this.options.port}`;
        
        console.log(colors.green('\n开发服务器启动成功!'));
        console.log(`服务器地址: ${colors.cyan(url)}`);
        console.log(`静态目录: ${colors.yellow(this.options.static.directory)}`);
        
        if (this.options.hot) {
          console.log(colors.green('热更新已启用'));
        }
        
        // 自动打开浏览器
        if (this.options.open) {
          this.openBrowser(url);
        }
        
        resolve({
          port: this.options.port,
          host: this.options.host,
          url
        });
      });
    });
  }

  /**
   * 打开浏览器
   */
  openBrowser(url) {
    const { exec } = require('child_process');
    const platform = process.platform;
    
    let command;
    
    switch (platform) {
      case 'darwin':
        command = `open ${url}`;
        break;
      case 'win32':
        command = `start ${url}`;
        break;
      default:
        command = `xdg-open ${url}`;
    }
    
    exec(command, (error) => {
      if (error) {
        console.warn(colors.yellow('无法自动打开浏览器:'), error.message);
      }
    });
  }

  /**
   * 关闭服务器
   */
  close() {
    return new Promise((resolve) => {
      // 关闭 WebSocket 服务器
      if (this.wss) {
        this.wss.close();
      }
      
      // 关闭 HTTP 服务器
      if (this.server) {
        this.server.close(() => {
          console.log(colors.yellow('开发服务器已关闭'));
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 重新编译
   */
  async rebuild() {
    console.log(colors.cyan('检测到文件变化，重新编译...'));
    
    try {
      await this.compiler.run();
    } catch (error) {
      console.error(colors.red('重新编译失败:'), error.message);
    }
  }
}

/**
 * 创建开发服务器
 */
function createDevServer(compiler, options) {
  return new DevServer(compiler, options);
}

module.exports = {
  DevServer,
  createDevServer
};