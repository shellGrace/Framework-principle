# Monorepo 工具原理详解（低优先级 ⭐⭐⭐）

## 1. Monorepo 概述

### 1.1 什么是 Monorepo
- **定义**：在单个代码仓库中管理多个相关项目的开发策略
- **对比**：与 Multirepo（多仓库）相对
- **理念**：统一管理、共享代码、协调发布

### 1.2 Monorepo vs Multirepo
```
Monorepo 结构：
my-workspace/
├── packages/
│   ├── ui-components/
│   ├── utils/
│   ├── web-app/
│   └── mobile-app/
├── tools/
├── docs/
└── package.json

Multirepo 结构：
ui-components/     (独立仓库)
utils/            (独立仓库)
web-app/          (独立仓库)
mobile-app/       (独立仓库)
```

### 1.3 优势与挑战
**优势**：
- 代码共享和重用
- 统一的工具链和配置
- 原子性提交
- 简化依赖管理
- 更好的重构支持

**挑战**：
- 构建时间增长
- 权限管理复杂
- 工具链要求高
- 版本管理复杂

## 2. Lerna 原理

### 2.1 Lerna 核心概念
```json
// lerna.json
{
  "version": "independent",
  "npmClient": "npm",
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish",
      "registry": "https://registry.npmjs.org/"
    },
    "bootstrap": {
      "ignore": "component-*",
      "npmClientArgs": ["--no-package-lock"]
    }
  },
  "packages": ["packages/*"]
}

// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "devDependencies": {
    "lerna": "^6.0.0"
  },
  "workspaces": [
    "packages/*"
  ]
}
```

### 2.2 依赖管理原理
```javascript
// Lerna 依赖提升算法
class DependencyHoisting {
  constructor(packages) {
    this.packages = packages;
    this.dependencyGraph = new Map();
  }
  
  // 构建依赖图
  buildDependencyGraph() {
    this.packages.forEach(pkg => {
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      this.dependencyGraph.set(pkg.name, {
        package: pkg,
        dependencies: Object.keys(deps),
        dependents: []
      });
    });
    
    // 建立反向依赖关系
    this.dependencyGraph.forEach((node, pkgName) => {
      node.dependencies.forEach(depName => {
        const depNode = this.dependencyGraph.get(depName);
        if (depNode) {
          depNode.dependents.push(pkgName);
        }
      });
    });
  }
  
  // 提升公共依赖
  hoistCommonDependencies() {
    const dependencyCounts = new Map();
    
    // 统计依赖使用频率
    this.packages.forEach(pkg => {
      Object.entries(pkg.dependencies || {}).forEach(([name, version]) => {
        const key = `${name}@${version}`;
        dependencyCounts.set(key, (dependencyCounts.get(key) || 0) + 1);
      });
    });
    
    // 提升使用频率高的依赖
    const hoistedDeps = {};
    dependencyCounts.forEach((count, depKey) => {
      if (count > 1) {
        const [name, version] = depKey.split('@');
        hoistedDeps[name] = version;
      }
    });
    
    return hoistedDeps;
  }
  
  // 拓扑排序（用于确定构建顺序）
  topologicalSort() {
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    const visit = (pkgName) => {
      if (visiting.has(pkgName)) {
        throw new Error(`Circular dependency detected: ${pkgName}`);
      }
      
      if (visited.has(pkgName)) {
        return;
      }
      
      visiting.add(pkgName);
      
      const node = this.dependencyGraph.get(pkgName);
      if (node) {
        node.dependencies.forEach(depName => {
          if (this.dependencyGraph.has(depName)) {
            visit(depName);
          }
        });
      }
      
      visiting.delete(pkgName);
      visited.add(pkgName);
      result.push(pkgName);
    };
    
    this.dependencyGraph.forEach((_, pkgName) => {
      if (!visited.has(pkgName)) {
        visit(pkgName);
      }
    });
    
    return result;
  }
}
```

### 2.3 版本管理策略
```javascript
// Lerna 版本管理
class VersionManager {
  constructor(mode = 'fixed') {
    this.mode = mode; // 'fixed' or 'independent'
    this.packages = [];
  }
  
  // 固定版本模式
  fixedVersioning(newVersion) {
    return this.packages.map(pkg => ({
      ...pkg,
      version: newVersion
    }));
  }
  
  // 独立版本模式
  independentVersioning(changes) {
    return this.packages.map(pkg => {
      const change = changes.find(c => c.name === pkg.name);
      if (change) {
        return {
          ...pkg,
          version: this.bumpVersion(pkg.version, change.type)
        };
      }
      return pkg;
    });
  }
  
  bumpVersion(currentVersion, changeType) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (changeType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  }
  
  // 检测变更的包
  detectChangedPackages(since = 'HEAD~1') {
    const changedFiles = this.getChangedFiles(since);
    const changedPackages = new Set();
    
    changedFiles.forEach(file => {
      const pkg = this.getPackageByFile(file);
      if (pkg) {
        changedPackages.add(pkg.name);
        
        // 添加依赖此包的其他包
        this.getDependents(pkg.name).forEach(dependent => {
          changedPackages.add(dependent);
        });
      }
    });
    
    return Array.from(changedPackages);
  }
  
  getChangedFiles(since) {
    // 使用 git 命令获取变更文件
    const { execSync } = require('child_process');
    const output = execSync(`git diff --name-only ${since}`, { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  }
  
  getPackageByFile(filePath) {
    return this.packages.find(pkg => {
      return filePath.startsWith(pkg.location);
    });
  }
  
  getDependents(packageName) {
    const dependents = [];
    
    this.packages.forEach(pkg => {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies
      };
      
      if (allDeps[packageName]) {
        dependents.push(pkg.name);
      }
    });
    
    return dependents;
  }
}
```

### 2.4 发布流程
```javascript
// Lerna 发布流程
class PublishWorkflow {
  constructor(options = {}) {
    this.options = options;
    this.conventionalCommits = options.conventionalCommits || false;
  }
  
  async publish() {
    try {
      // 1. 检查工作区状态
      await this.checkWorkspaceStatus();
      
      // 2. 检测变更的包
      const changedPackages = await this.detectChanges();
      
      if (changedPackages.length === 0) {
        console.log('No packages to publish');
        return;
      }
      
      // 3. 确定版本号
      const versionUpdates = await this.determineVersions(changedPackages);
      
      // 4. 更新版本号
      await this.updateVersions(versionUpdates);
      
      // 5. 生成 CHANGELOG
      if (this.conventionalCommits) {
        await this.generateChangelog(changedPackages);
      }
      
      // 6. 提交变更
      await this.commitChanges(versionUpdates);
      
      // 7. 创建 Git 标签
      await this.createTags(versionUpdates);
      
      // 8. 发布到 npm
      await this.publishToNpm(changedPackages);
      
      // 9. 推送到远程仓库
      await this.pushToRemote();
      
      console.log('Publish completed successfully!');
    } catch (error) {
      console.error('Publish failed:', error);
      throw error;
    }
  }
  
  async checkWorkspaceStatus() {
    const { execSync } = require('child_process');
    
    try {
      // 检查是否有未提交的变更
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        throw new Error('Working directory is not clean');
      }
      
      // 检查是否在正确的分支
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      if (branch !== 'main' && branch !== 'master') {
        console.warn(`Publishing from branch: ${branch}`);
      }
    } catch (error) {
      throw new Error(`Workspace check failed: ${error.message}`);
    }
  }
  
  async generateChangelog(packages) {
    const conventionalChangelog = require('conventional-changelog');
    
    for (const pkg of packages) {
      const changelogPath = path.join(pkg.location, 'CHANGELOG.md');
      
      const changelog = await new Promise((resolve, reject) => {
        let content = '';
        
        conventionalChangelog({
          preset: 'angular',
          pkg: {
            path: pkg.location
          }
        })
        .on('data', (chunk) => {
          content += chunk.toString();
        })
        .on('end', () => {
          resolve(content);
        })
        .on('error', reject);
      });
      
      // 写入 CHANGELOG
      const fs = require('fs');
      const existingChangelog = fs.existsSync(changelogPath) 
        ? fs.readFileSync(changelogPath, 'utf8') 
        : '';
      
      fs.writeFileSync(changelogPath, changelog + existingChangelog);
    }
  }
  
  async publishToNpm(packages) {
    const { execSync } = require('child_process');
    
    for (const pkg of packages) {
      try {
        console.log(`Publishing ${pkg.name}@${pkg.version}...`);
        
        execSync('npm publish', {
          cwd: pkg.location,
          stdio: 'inherit'
        });
        
        console.log(`✅ Published ${pkg.name}@${pkg.version}`);
      } catch (error) {
        console.error(`❌ Failed to publish ${pkg.name}:`, error.message);
        throw error;
      }
    }
  }
}
```

## 3. Rush 原理

### 3.1 Rush 架构设计
```json
// rush.json
{
  "$schema": "https://developer.microsoft.com/json-schemas/rush/v5/rush.schema.json",
  "rushVersion": "5.82.0",
  "pnpmVersion": "7.14.0",
  "nodeSupportedVersionRange": ">=14.15.0 <19.0.0",
  
  "projectFolderMinDepth": 1,
  "projectFolderMaxDepth": 2,
  
  "projects": [
    {
      "packageName": "@my-scope/ui-components",
      "projectFolder": "packages/ui-components",
      "reviewCategory": "libraries"
    },
    {
      "packageName": "@my-scope/web-app",
      "projectFolder": "apps/web-app",
      "reviewCategory": "applications"
    }
  ],
  
  "gitPolicy": {
    "versionBumpCommitMessage": "Bump versions [skip ci]",
    "changeLogUpdateCommitMessage": "Update changelogs [skip ci]"
  }
}
```

### 3.2 增量构建原理
```javascript
// Rush 增量构建实现
class IncrementalBuild {
  constructor(rushConfiguration) {
    this.rushConfig = rushConfiguration;
    this.buildCache = new Map();
    this.dependencyGraph = this.buildDependencyGraph();
  }
  
  buildDependencyGraph() {
    const graph = new Map();
    
    this.rushConfig.projects.forEach(project => {
      const packageJson = this.readPackageJson(project.projectFolder);
      const dependencies = this.extractDependencies(packageJson);
      
      graph.set(project.packageName, {
        project,
        dependencies: dependencies.filter(dep => 
          this.rushConfig.projects.some(p => p.packageName === dep)
        ),
        hash: this.calculateProjectHash(project)
      });
    });
    
    return graph;
  }
  
  calculateProjectHash(project) {
    const crypto = require('crypto');
    const fs = require('fs');
    const path = require('path');
    
    const hash = crypto.createHash('sha256');
    
    // 包含源代码文件
    const sourceFiles = this.getSourceFiles(project.projectFolder);
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      hash.update(content);
    });
    
    // 包含 package.json
    const packageJsonPath = path.join(project.projectFolder, 'package.json');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
    hash.update(packageJson);
    
    // 包含依赖项的哈希
    const node = this.dependencyGraph.get(project.packageName);
    if (node) {
      node.dependencies.forEach(depName => {
        const depNode = this.dependencyGraph.get(depName);
        if (depNode) {
          hash.update(depNode.hash);
        }
      });
    }
    
    return hash.digest('hex');
  }
  
  async build(targetProjects = []) {
    const buildOrder = this.calculateBuildOrder(targetProjects);
    const results = new Map();
    
    for (const projectName of buildOrder) {
      const node = this.dependencyGraph.get(projectName);
      const currentHash = this.calculateProjectHash(node.project);
      
      // 检查缓存
      if (this.buildCache.has(projectName) && 
          this.buildCache.get(projectName).hash === currentHash) {
        console.log(`📦 Using cached build for ${projectName}`);
        results.set(projectName, this.buildCache.get(projectName).result);
        continue;
      }
      
      // 执行构建
      console.log(`🔨 Building ${projectName}...`);
      const buildResult = await this.executeProjectBuild(node.project);
      
      // 缓存结果
      this.buildCache.set(projectName, {
        hash: currentHash,
        result: buildResult,
        timestamp: Date.now()
      });
      
      results.set(projectName, buildResult);
    }
    
    return results;
  }
  
  calculateBuildOrder(targetProjects) {
    const visited = new Set();
    const visiting = new Set();
    const order = [];
    
    const visit = (projectName) => {
      if (visiting.has(projectName)) {
        throw new Error(`Circular dependency: ${projectName}`);
      }
      
      if (visited.has(projectName)) {
        return;
      }
      
      visiting.add(projectName);
      
      const node = this.dependencyGraph.get(projectName);
      if (node) {
        node.dependencies.forEach(depName => {
          visit(depName);
        });
      }
      
      visiting.delete(projectName);
      visited.add(projectName);
      order.push(projectName);
    };
    
    // 如果没有指定目标项目，构建所有项目
    const projects = targetProjects.length > 0 
      ? targetProjects 
      : Array.from(this.dependencyGraph.keys());
    
    projects.forEach(visit);
    
    return order;
  }
  
  async executeProjectBuild(project) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: project.projectFolder,
        stdio: 'inherit'
      });
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
      
      buildProcess.on('error', reject);
    });
  }
}
```

### 3.3 变更检测
```javascript
// Rush 变更检测系统
class ChangeDetection {
  constructor(rushConfig) {
    this.rushConfig = rushConfig;
    this.changeFiles = new Map();
  }
  
  // 检测自上次发布以来的变更
  detectChangesSince(baseline = 'origin/main') {
    const { execSync } = require('child_process');
    
    try {
      // 获取变更的文件
      const changedFiles = execSync(
        `git diff --name-only ${baseline}...HEAD`,
        { encoding: 'utf8' }
      ).trim().split('\n').filter(Boolean);
      
      // 分析影响的项目
      const affectedProjects = this.analyzeAffectedProjects(changedFiles);
      
      // 生成变更文件
      this.generateChangeFiles(affectedProjects);
      
      return affectedProjects;
    } catch (error) {
      throw new Error(`Change detection failed: ${error.message}`);
    }
  }
  
  analyzeAffectedProjects(changedFiles) {
    const affectedProjects = new Set();
    
    changedFiles.forEach(file => {
      // 找到文件所属的项目
      const project = this.rushConfig.projects.find(p => 
        file.startsWith(p.projectFolder)
      );
      
      if (project) {
        affectedProjects.add(project.packageName);
        
        // 添加依赖此项目的其他项目
        this.findDependentProjects(project.packageName)
          .forEach(dep => affectedProjects.add(dep));
      }
    });
    
    return Array.from(affectedProjects);
  }
  
  findDependentProjects(packageName) {
    const dependents = [];
    
    this.rushConfig.projects.forEach(project => {
      const packageJson = this.readPackageJson(project.projectFolder);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
      
      if (allDeps[packageName]) {
        dependents.push(project.packageName);
      }
    });
    
    return dependents;
  }
  
  generateChangeFiles(affectedProjects) {
    const path = require('path');
    const fs = require('fs');
    
    affectedProjects.forEach(projectName => {
      const project = this.rushConfig.projects.find(p => 
        p.packageName === projectName
      );
      
      if (!project) return;
      
      const changeFilePath = path.join(
        'common/changes',
        project.packageName.replace('@', '').replace('/', '-'),
        `${Date.now()}.json`
      );
      
      const changeFile = {
        changes: [{
          packageName: project.packageName,
          comment: 'Detected changes',
          type: 'patch'
        }],
        packageName: project.packageName,
        email: 'rush@example.com'
      };
      
      // 确保目录存在
      fs.mkdirSync(path.dirname(changeFilePath), { recursive: true });
      
      // 写入变更文件
      fs.writeFileSync(
        changeFilePath, 
        JSON.stringify(changeFile, null, 2)
      );
      
      this.changeFiles.set(project.packageName, changeFilePath);
    });
  }
}
```

## 4. Nx 原理

### 4.1 Nx 工作空间
```json
// nx.json
{
  "npmScope": "myorg",
  "affected": {
    "defaultBase": "origin/main"
  },
  "implicitDependencies": {
    "package.json": {
      "dependencies": "*",
      "devDependencies": "*"
    },
    ".eslintrc.json": "*"
  },
  "projects": {
    "web-app": {
      "tags": ["scope:web", "type:app"]
    },
    "ui-components": {
      "tags": ["scope:shared", "type:lib"]
    }
  },
  "targetDependencies": {
    "build": [
      {
        "target": "build",
        "projects": "dependencies"
      }
    ]
  }
}

// workspace.json
{
  "version": 2,
  "projects": {
    "web-app": {
      "root": "apps/web-app",
      "sourceRoot": "apps/web-app/src",
      "projectType": "application",
      "targets": {
        "build": {
          "executor": "@nrwl/webpack:webpack",
          "options": {
            "outputPath": "dist/apps/web-app",
            "index": "apps/web-app/src/index.html",
            "main": "apps/web-app/src/main.ts"
          }
        },
        "serve": {
          "executor": "@nrwl/webpack:dev-server",
          "options": {
            "buildTarget": "web-app:build"
          }
        }
      }
    }
  }
}
```

### 4.2 依赖图分析
```javascript
// Nx 依赖图分析
class NxDependencyGraph {
  constructor(workspaceConfig) {
    this.workspace = workspaceConfig;
    this.graph = new Map();
    this.implicitDependencies = new Map();
  }
  
  // 构建项目依赖图
  buildProjectGraph() {
    // 1. 分析显式依赖（package.json）
    this.analyzeExplicitDependencies();
    
    // 2. 分析隐式依赖（配置文件、工具等）
    this.analyzeImplicitDependencies();
    
    // 3. 分析代码依赖（import/require）
    this.analyzeCodeDependencies();
    
    return this.graph;
  }
  
  analyzeExplicitDependencies() {
    Object.entries(this.workspace.projects).forEach(([projectName, config]) => {
      const packageJsonPath = path.join(config.root, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        const projectDeps = Object.keys(dependencies)
          .filter(dep => this.isWorkspaceProject(dep))
          .map(dep => this.getProjectByPackageName(dep))
          .filter(Boolean);
        
        this.addProjectNode(projectName, projectDeps);
      }
    });
  }
  
  analyzeImplicitDependencies() {
    const implicitDeps = this.workspace.implicitDependencies || {};
    
    Object.entries(implicitDeps).forEach(([file, projects]) => {
      if (projects === '*') {
        // 影响所有项目
        const allProjects = Object.keys(this.workspace.projects);
        this.implicitDependencies.set(file, allProjects);
      } else if (Array.isArray(projects)) {
        this.implicitDependencies.set(file, projects);
      }
    });
  }
  
  analyzeCodeDependencies() {
    const typescript = require('typescript');
    
    Object.entries(this.workspace.projects).forEach(([projectName, config]) => {
      const sourceFiles = this.getSourceFiles(config.sourceRoot || config.root);
      
      sourceFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const sourceFile = typescript.createSourceFile(
          filePath,
          content,
          typescript.ScriptTarget.Latest,
          true
        );
        
        const imports = this.extractImports(sourceFile);
        const projectDeps = imports
          .map(imp => this.resolveImportToProject(imp, projectName))
          .filter(Boolean);
        
        this.addProjectDependencies(projectName, projectDeps);
      });
    });
  }
  
  extractImports(sourceFile) {
    const imports = [];
    
    function visit(node) {
      if (typescript.isImportDeclaration(node) || 
          typescript.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && typescript.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      }
      
      typescript.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return imports;
  }
  
  resolveImportToProject(importPath, currentProject) {
    // 解析相对路径导入
    if (importPath.startsWith('.')) {
      return null; // 项目内部导入
    }
    
    // 解析工作空间库导入
    if (importPath.startsWith(`@${this.workspace.npmScope}/`)) {
      const libName = importPath.replace(`@${this.workspace.npmScope}/`, '');
      return this.getProjectByLibraryName(libName);
    }
    
    return null;
  }
  
  // 计算受影响的项目
  getAffectedProjects(changedFiles, base = 'HEAD~1') {
    const affectedProjects = new Set();
    
    // 1. 直接受影响的项目
    changedFiles.forEach(file => {
      const project = this.getProjectByFile(file);
      if (project) {
        affectedProjects.add(project);
      }
      
      // 2. 隐式依赖影响
      this.implicitDependencies.forEach((projects, depFile) => {
        if (file.includes(depFile)) {
          projects.forEach(p => affectedProjects.add(p));
        }
      });
    });
    
    // 3. 传播影响（依赖链）
    const initialAffected = Array.from(affectedProjects);
    initialAffected.forEach(project => {
      this.getDependents(project).forEach(dependent => {
        affectedProjects.add(dependent);
      });
    });
    
    return Array.from(affectedProjects);
  }
  
  getDependents(projectName) {
    const dependents = [];
    
    this.graph.forEach((node, name) => {
      if (node.dependencies.includes(projectName)) {
        dependents.push(name);
      }
    });
    
    return dependents;
  }
}
```

### 4.3 任务执行器
```javascript
// Nx 任务执行器
class NxTaskRunner {
  constructor(dependencyGraph, options = {}) {
    this.graph = dependencyGraph;
    this.parallel = options.parallel || 3;
    this.cache = new Map();
    this.runningTasks = new Map();
  }
  
  async runTarget(projects, target, options = {}) {
    const tasks = this.createTasks(projects, target);
    const taskGraph = this.buildTaskGraph(tasks);
    
    return this.executeTasks(taskGraph, options);
  }
  
  createTasks(projects, target) {
    return projects.map(project => ({
      id: `${project}:${target}`,
      project,
      target,
      configuration: 'production'
    }));
  }
  
  buildTaskGraph(tasks) {
    const taskGraph = new Map();
    
    tasks.forEach(task => {
      const projectNode = this.graph.get(task.project);
      const dependencies = projectNode ? projectNode.dependencies : [];
      
      const taskDependencies = dependencies
        .map(dep => `${dep}:${task.target}`)
        .filter(depTaskId => tasks.some(t => t.id === depTaskId));
      
      taskGraph.set(task.id, {
        task,
        dependencies: taskDependencies,
        dependents: []
      });
    });
    
    // 建立反向依赖关系
    taskGraph.forEach((node, taskId) => {
      node.dependencies.forEach(depId => {
        const depNode = taskGraph.get(depId);
        if (depNode) {
          depNode.dependents.push(taskId);
        }
      });
    });
    
    return taskGraph;
  }
  
  async executeTasks(taskGraph, options = {}) {
    const results = new Map();
    const completed = new Set();
    const failed = new Set();
    const queue = [];
    
    // 找到没有依赖的任务作为起点
    taskGraph.forEach((node, taskId) => {
      if (node.dependencies.length === 0) {
        queue.push(taskId);
      }
    });
    
    while (queue.length > 0 || this.runningTasks.size > 0) {
      // 启动新任务（并行控制）
      while (queue.length > 0 && this.runningTasks.size < this.parallel) {
        const taskId = queue.shift();
        const node = taskGraph.get(taskId);
        
        if (this.canExecuteTask(node, completed, failed)) {
          this.executeTask(node.task, options)
            .then(result => {
              results.set(taskId, result);
              completed.add(taskId);
              this.runningTasks.delete(taskId);
              
              // 检查是否可以执行依赖此任务的其他任务
              node.dependents.forEach(dependentId => {
                const dependentNode = taskGraph.get(dependentId);
                if (this.canExecuteTask(dependentNode, completed, failed)) {
                  queue.push(dependentId);
                }
              });
            })
            .catch(error => {
              console.error(`Task ${taskId} failed:`, error);
              failed.add(taskId);
              this.runningTasks.delete(taskId);
              
              // 标记所有依赖此任务的任务为失败
              this.markDependentsAsFailed(node, taskGraph, failed);
            });
          
          this.runningTasks.set(taskId, true);
        }
      }
      
      // 等待一些任务完成
      if (this.runningTasks.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      success: failed.size === 0,
      results,
      failed: Array.from(failed)
    };
  }
  
  canExecuteTask(node, completed, failed) {
    // 检查所有依赖是否已完成
    return node.dependencies.every(depId => 
      completed.has(depId) && !failed.has(depId)
    );
  }
  
  async executeTask(task, options) {
    const cacheKey = this.getCacheKey(task);
    
    // 检查缓存
    if (this.cache.has(cacheKey) && !options.skipCache) {
      console.log(`📦 Cache hit for ${task.id}`);
      return this.cache.get(cacheKey);
    }
    
    console.log(`🔨 Executing ${task.id}...`);
    
    const startTime = Date.now();
    
    try {
      const result = await this.runTaskCommand(task);
      const duration = Date.now() - startTime;
      
      const taskResult = {
        success: true,
        duration,
        output: result
      };
      
      // 缓存结果
      this.cache.set(cacheKey, taskResult);
      
      console.log(`✅ ${task.id} completed in ${duration}ms`);
      return taskResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ ${task.id} failed after ${duration}ms`);
      throw error;
    }
  }
  
  getCacheKey(task) {
    // 基于项目内容和配置生成缓存键
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    hash.update(task.project);
    hash.update(task.target);
    hash.update(task.configuration || '');
    
    // 添加项目文件哈希
    const projectHash = this.getProjectHash(task.project);
    hash.update(projectHash);
    
    return hash.digest('hex');
  }
  
  async runTaskCommand(task) {
    const { spawn } = require('child_process');
    const projectConfig = this.workspace.projects[task.project];
    const targetConfig = projectConfig.targets[task.target];
    
    return new Promise((resolve, reject) => {
      const command = this.buildCommand(targetConfig);
      const process = spawn(command.cmd, command.args, {
        cwd: projectConfig.root,
        stdio: 'pipe'
      });
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}\n${output}`));
        }
      });
    });
  }
}
```

## 5. 性能优化策略

### 5.1 构建缓存
```javascript
// 分布式构建缓存
class DistributedCache {
  constructor(options = {}) {
    this.localCache = new Map();
    this.remoteEndpoint = options.remoteEndpoint;
    this.maxLocalCacheSize = options.maxLocalCacheSize || 100;
  }
  
  async get(key) {
    // 1. 检查本地缓存
    if (this.localCache.has(key)) {
      console.log(`🎯 Local cache hit: ${key}`);
      return this.localCache.get(key);
    }
    
    // 2. 检查远程缓存
    if (this.remoteEndpoint) {
      try {
        const response = await fetch(`${this.remoteEndpoint}/cache/${key}`);
        if (response.ok) {
          const data = await response.json();
          
          // 存储到本地缓存
          this.setLocal(key, data);
          
          console.log(`🌐 Remote cache hit: ${key}`);
          return data;
        }
      } catch (error) {
        console.warn(`Remote cache error: ${error.message}`);
      }
    }
    
    return null;
  }
  
  async set(key, value) {
    // 存储到本地缓存
    this.setLocal(key, value);
    
    // 上传到远程缓存
    if (this.remoteEndpoint) {
      try {
        await fetch(`${this.remoteEndpoint}/cache/${key}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(value)
        });
        
        console.log(`📤 Uploaded to remote cache: ${key}`);
      } catch (error) {
        console.warn(`Failed to upload to remote cache: ${error.message}`);
      }
    }
  }
  
  setLocal(key, value) {
    // LRU 缓存清理
    if (this.localCache.size >= this.maxLocalCacheSize) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
    
    this.localCache.set(key, {
      ...value,
      cachedAt: Date.now()
    });
  }
  
  // 计算缓存键
  generateCacheKey(project, target, inputs) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    // 项目和目标
    hash.update(project);
    hash.update(target);
    
    // 输入文件哈希
    Object.entries(inputs).forEach(([file, content]) => {
      hash.update(file);
      hash.update(content);
    });
    
    // 环境变量
    const relevantEnvVars = ['NODE_ENV', 'BUILD_ENV'];
    relevantEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        hash.update(`${envVar}=${process.env[envVar]}`);
      }
    });
    
    return hash.digest('hex');
  }
}
```

### 5.2 并行执行
```javascript
// 智能并行执行
class ParallelExecutor {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || require('os').cpus().length;
    this.resourceLimits = options.resourceLimits || {};
    this.runningTasks = new Map();
    this.queue = [];
  }
  
  async execute(tasks) {
    return new Promise((resolve, reject) => {
      const results = new Map();
      const errors = [];
      let completed = 0;
      
      const processQueue = () => {
        while (this.queue.length > 0 && 
               this.runningTasks.size < this.maxConcurrency &&
               this.hasAvailableResources()) {
          
          const task = this.queue.shift();
          this.executeTask(task)
            .then(result => {
              results.set(task.id, result);
              completed++;
              
              if (completed === tasks.length) {
                resolve({ results, errors });
              } else {
                processQueue();
              }
            })
            .catch(error => {
              errors.push({ task: task.id, error });
              completed++;
              
              if (completed === tasks.length) {
                resolve({ results, errors });
              } else {
                processQueue();
              }
            })
            .finally(() => {
              this.runningTasks.delete(task.id);
            });
        }
      };
      
      // 按优先级排序任务
      this.queue = this.prioritizeTasks(tasks);
      processQueue();
    });
  }
  
  prioritizeTasks(tasks) {
    return tasks.sort((a, b) => {
      // 1. 优先级
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      
      // 2. 估计执行时间（短任务优先）
      const aEstimate = this.estimateExecutionTime(a);
      const bEstimate = this.estimateExecutionTime(b);
      
      return aEstimate - bEstimate;
    });
  }
  
  estimateExecutionTime(task) {
    // 基于历史数据估计执行时间
    const historicalData = this.getHistoricalData(task);
    
    if (historicalData.length > 0) {
      const avgTime = historicalData.reduce((sum, time) => sum + time, 0) / historicalData.length;
      return avgTime;
    }
    
    // 默认估计
    const estimates = {
      'build': 60000,  // 1分钟
      'test': 30000,   // 30秒
      'lint': 10000,   // 10秒
      'typecheck': 20000 // 20秒
    };
    
    return estimates[task.target] || 30000;
  }
  
  hasAvailableResources() {
    // 检查 CPU 使用率
    if (this.resourceLimits.maxCpuUsage) {
      const cpuUsage = this.getCurrentCpuUsage();
      if (cpuUsage > this.resourceLimits.maxCpuUsage) {
        return false;
      }
    }
    
    // 检查内存使用
    if (this.resourceLimits.maxMemoryUsage) {
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      if (memoryUsage > this.resourceLimits.maxMemoryUsage) {
        return false;
      }
    }
    
    return true;
  }
  
  async executeTask(task) {
    const startTime = Date.now();
    this.runningTasks.set(task.id, {
      task,
      startTime
    });
    
    try {
      const result = await this.runTask(task);
      const duration = Date.now() - startTime;
      
      // 记录执行时间用于未来估计
      this.recordExecutionTime(task, duration);
      
      return {
        success: true,
        duration,
        result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        duration,
        error: error.message
      };
    }
  }
}
```

## 6. 面试重点

### 6.1 核心概念
1. **Monorepo 定义**：单仓库管理多项目的开发策略
2. **主流工具**：Lerna、Rush、Nx、Yarn Workspaces
3. **依赖管理**：依赖提升、版本统一、循环依赖检测
4. **构建优化**：增量构建、并行执行、分布式缓存
5. **版本管理**：固定版本 vs 独立版本、变更检测

### 6.2 技术难点
1. **依赖图构建**：静态分析、动态依赖、隐式依赖
2. **增量构建**：变更检测、缓存策略、任务调度
3. **并行执行**：资源管理、任务优先级、错误处理
4. **版本协调**：语义化版本、变更日志、发布流程
5. **性能优化**：构建缓存、智能调度、资源利用

### 6.3 适用场景
- 大型企业项目
- 微服务前端
- 组件库开发
- 多应用共享代码
- 团队协作开发

---

**学习建议**：
1. 理解 Monorepo 的设计理念和适用场景
2. 掌握主流工具的使用和配置
3. 深入了解依赖管理和构建优化原理
4. 实践复杂项目的 Monorepo 改造
5. 关注性能优化和工程化最佳实践