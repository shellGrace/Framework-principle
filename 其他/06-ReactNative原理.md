# React Native 原理详解（中优先级 ⭐⭐⭐⭐）

## 1. React Native 架构概述

### 1.1 整体架构
```
JavaScript 层
    ↓
Bridge（桥接层）
    ↓
Native 层（iOS/Android）
```

### 1.2 三层架构详解
- **JavaScript 层**：React 组件、业务逻辑、状态管理
- **Bridge 层**：JS 和 Native 之间的通信桥梁
- **Native 层**：原生 UI 组件、系统 API、性能关键模块

### 1.3 新架构（Fabric + TurboModules）
```
JavaScript 层
    ↓
JSI (JavaScript Interface)
    ↓
Fabric (新渲染器) + TurboModules (新模块系统)
    ↓
Native 层
```

## 2. Bridge 通信机制

### 2.1 传统 Bridge 原理
```javascript
// JavaScript 端
class Bridge {
  constructor() {
    this.messageQueue = [];
    this.moduleConfig = {};
  }
  
  // 调用原生方法
  callNativeMethod(module, method, args, callback) {
    const callId = this.generateCallId();
    
    // 将调用信息加入队列
    this.messageQueue.push({
      moduleId: this.getModuleId(module),
      methodId: this.getMethodId(module, method),
      args: args,
      callId: callId
    });
    
    // 注册回调
    if (callback) {
      this.callbacks[callId] = callback;
    }
    
    // 触发批量传输
    this.flushQueue();
  }
  
  flushQueue() {
    if (this.messageQueue.length > 0) {
      // 序列化消息队列
      const messages = JSON.stringify(this.messageQueue);
      
      // 发送到原生端
      global.nativeFlushQueueImmediate(messages);
      
      // 清空队列
      this.messageQueue = [];
    }
  }
}
```

### 2.2 原生端处理
```objc
// iOS 端（Objective-C）
@implementation RCTBridge

- (void)handleJSCall:(NSString *)message {
    // 解析 JSON 消息
    NSArray *calls = [NSJSONSerialization JSONObjectWithData:[message dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
    
    for (NSDictionary *call in calls) {
        NSNumber *moduleId = call[@"moduleId"];
        NSNumber *methodId = call[@"methodId"];
        NSArray *args = call[@"args"];
        NSNumber *callId = call[@"callId"];
        
        // 获取模块和方法
        RCTModuleData *moduleData = self.moduleDataByID[moduleId];
        RCTModuleMethod *method = moduleData.methods[methodId.integerValue];
        
        // 执行原生方法
        [method invokeWithBridge:self module:moduleData.instance arguments:args];
    }
}

@end
```

### 2.3 Bridge 的局限性
- **异步通信**：所有调用都是异步的
- **序列化开销**：数据需要 JSON 序列化/反序列化
- **单线程瓶颈**：Bridge 通信在单线程中进行
- **内存拷贝**：数据在 JS 和 Native 间需要拷贝

## 3. 渲染机制

### 3.1 Virtual DOM 到 Native View
```javascript
// React 组件
const MyComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello RN</Text>
      <TouchableOpacity onPress={handlePress}>
        <Text>Click me</Text>
      </TouchableOpacity>
    </View>
  );
};

// Virtual DOM 表示
{
  type: 'RCTView',
  props: {
    style: { flex: 1, backgroundColor: '#fff' }
  },
  children: [
    {
      type: 'RCTText',
      props: {
        style: { fontSize: 18, color: '#000' }
      },
      children: ['Hello RN']
    },
    {
      type: 'RCTTouchableOpacity',
      props: {
        onPress: 'handlePress'
      },
      children: [/* ... */]
    }
  ]
}
```

### 3.2 Shadow Tree（影子树）
```javascript
// Shadow Node 结构
class ShadowNode {
  constructor(tag, viewName, props) {
    this.tag = tag;           // 唯一标识
    this.viewName = viewName; // 组件类型
    this.props = props;       // 属性
    this.children = [];       // 子节点
    this.parent = null;       // 父节点
    
    // 布局信息
    this.layout = {
      x: 0, y: 0,
      width: 0, height: 0
    };
  }
  
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
  }
  
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }
}
```

### 3.3 布局计算（Yoga）
```javascript
// Yoga 布局引擎
class YogaLayout {
  calculateLayout(node, parentWidth, parentHeight) {
    // 1. 解析 Flexbox 样式
    const style = this.parseFlexStyle(node.props.style);
    
    // 2. 计算主轴和交叉轴
    const { mainAxis, crossAxis } = this.getAxes(style.flexDirection);
    
    // 3. 计算子节点布局
    this.layoutChildren(node, style, parentWidth, parentHeight);
    
    // 4. 应用布局结果
    this.applyLayout(node);
  }
  
  layoutChildren(node, style, parentWidth, parentHeight) {
    let mainAxisOffset = 0;
    
    node.children.forEach(child => {
      // 递归计算子节点
      this.calculateLayout(child, parentWidth, parentHeight);
      
      // 更新位置
      if (style.flexDirection === 'row') {
        child.layout.x = mainAxisOffset;
        mainAxisOffset += child.layout.width;
      } else {
        child.layout.y = mainAxisOffset;
        mainAxisOffset += child.layout.height;
      }
    });
  }
}
```

## 4. 新架构：Fabric

### 4.1 Fabric 渲染器
```cpp
// C++ 实现的 Fabric 渲染器
class FabricRenderer {
public:
  void render(const ShadowTree& shadowTree) {
    // 1. 计算布局
    auto layoutContext = LayoutContext{};
    shadowTree.layout(layoutContext);
    
    // 2. 生成变更指令
    auto mutations = diffTrees(previousTree_, shadowTree);
    
    // 3. 应用到原生视图
    applyMutations(mutations);
    
    previousTree_ = shadowTree;
  }
  
private:
  void applyMutations(const std::vector<Mutation>& mutations) {
    for (const auto& mutation : mutations) {
      switch (mutation.type) {
        case MutationType::Create:
          createView(mutation.newChildShadowView);
          break;
        case MutationType::Delete:
          deleteView(mutation.oldChildShadowView);
          break;
        case MutationType::Update:
          updateView(mutation.newChildShadowView);
          break;
      }
    }
  }
};
```

### 4.2 JSI (JavaScript Interface)
```cpp
// JSI 直接调用示例
class TurboModuleExample : public TurboModule {
public:
  // 同步方法调用
  jsi::Value getString(jsi::Runtime& runtime, const jsi::Value* args, size_t count) {
    std::string result = "Hello from native";
    return jsi::String::createFromUtf8(runtime, result);
  }
  
  // 异步方法调用
  jsi::Value getDataAsync(jsi::Runtime& runtime, const jsi::Value* args, size_t count) {
    auto promise = createPromise(runtime);
    
    // 在后台线程执行
    std::thread([promise]() {
      auto data = fetchDataFromNetwork();
      promise.resolve(data);
    }).detach();
    
    return promise.getPromise();
  }
};
```

### 4.3 新架构优势
- **同步调用**：支持同步的 JS-Native 调用
- **类型安全**：编译时类型检查
- **更好性能**：减少序列化开销
- **并发渲染**：支持 React 18 的并发特性

## 5. 组件系统

### 5.1 原生组件封装
```objc
// iOS 原生组件
@interface RCTCustomView : UIView
@property (nonatomic, strong) NSString *title;
@property (nonatomic, copy) RCTBubblingEventBlock onCustomEvent;
@end

@implementation RCTCustomView

- (void)setTitle:(NSString *)title {
  _title = title;
  self.titleLabel.text = title;
}

- (void)handleTap {
  if (self.onCustomEvent) {
    self.onCustomEvent(@{
      @"message": @"Button tapped",
      @"timestamp": @([[NSDate date] timeIntervalSince1970])
    });
  }
}

@end

// 组件管理器
@interface RCTCustomViewManager : RCTViewManager
@end

@implementation RCTCustomViewManager

RCT_EXPORT_MODULE()

- (UIView *)view {
  return [[RCTCustomView alloc] init];
}

// 导出属性
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(onCustomEvent, RCTBubblingEventBlock)

@end
```

### 5.2 JavaScript 端使用
```javascript
// 注册原生组件
import { requireNativeComponent } from 'react-native';

const CustomView = requireNativeComponent('RCTCustomView');

// 使用组件
const MyComponent = () => {
  const handleCustomEvent = (event) => {
    console.log('Custom event:', event.nativeEvent);
  };
  
  return (
    <CustomView
      title="Hello Native"
      onCustomEvent={handleCustomEvent}
      style={{ width: 200, height: 100 }}
    />
  );
};
```

## 6. 模块系统

### 6.1 原生模块
```objc
// iOS 原生模块
@interface RCTCustomModule : NSObject <RCTBridgeModule>
@end

@implementation RCTCustomModule

RCT_EXPORT_MODULE();

// 导出方法
RCT_EXPORT_METHOD(showAlert:(NSString *)title
                  message:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    UIAlertController *alert = [UIAlertController
      alertControllerWithTitle:title
      message:message
      preferredStyle:UIAlertControllerStyleAlert];
    
    UIAlertAction *okAction = [UIAlertAction
      actionWithTitle:@"OK"
      style:UIAlertActionStyleDefault
      handler:^(UIAlertAction *action) {
        resolve(@"OK pressed");
      }];
    
    [alert addAction:okAction];
    
    UIViewController *rootVC = [UIApplication sharedApplication].keyWindow.rootViewController;
    [rootVC presentViewController:alert animated:YES completion:nil];
  });
}

// 导出常量
- (NSDictionary *)constantsToExport {
  return @{
    @"APP_VERSION": [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"],
    @"DEVICE_MODEL": [[UIDevice currentDevice] model]
  };
}

@end
```

### 6.2 JavaScript 端调用
```javascript
// 调用原生模块
import { NativeModules } from 'react-native';

const { CustomModule } = NativeModules;

// 调用原生方法
const showNativeAlert = async () => {
  try {
    const result = await CustomModule.showAlert(
      'Native Alert',
      'This is from native code'
    );
    console.log('Alert result:', result);
  } catch (error) {
    console.error('Alert error:', error);
  }
};

// 访问原生常量
console.log('App version:', CustomModule.APP_VERSION);
console.log('Device model:', CustomModule.DEVICE_MODEL);
```

## 7. 性能优化

### 7.1 渲染性能优化
```javascript
// 使用 PureComponent 避免不必要的重渲染
class OptimizedComponent extends PureComponent {
  render() {
    return (
      <View>
        <Text>{this.props.title}</Text>
      </View>
    );
  }
}

// 使用 React.memo
const MemoizedComponent = React.memo(({ title, count }) => {
  return (
    <View>
      <Text>{title}</Text>
      <Text>{count}</Text>
    </View>
  );
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.title === nextProps.title && 
         prevProps.count === nextProps.count;
});

// 使用 useMemo 和 useCallback
const ExpensiveComponent = ({ data }) => {
  const expensiveValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);
  
  const handlePress = useCallback(() => {
    console.log('Button pressed');
  }, []);
  
  return (
    <View>
      <Text>{expensiveValue}</Text>
      <TouchableOpacity onPress={handlePress}>
        <Text>Press me</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 7.2 列表性能优化
```javascript
// 使用 FlatList 而不是 ScrollView
const OptimizedList = ({ data }) => {
  const renderItem = useCallback(({ item, index }) => {
    return (
      <View style={styles.item}>
        <Text>{item.title}</Text>
      </View>
    );
  }, []);
  
  const getItemLayout = useCallback((data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);
  
  const keyExtractor = useCallback((item) => item.id.toString(), []);
  
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
    />
  );
};
```

### 7.3 图片优化
```javascript
// 图片缓存和优化
const OptimizedImage = ({ uri, style }) => {
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      // 启用缓存
      cache="force-cache"
      // 渐进式加载
      progressiveRenderingEnabled={true}
      // 预加载
      priority="high"
    />
  );
};

// 使用 FastImage（第三方库）
import FastImage from 'react-native-fast-image';

const FastImageComponent = ({ uri, style }) => {
  return (
    <FastImage
      source={{
        uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable
      }}
      style={style}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
};
```

## 8. 调试和开发工具

### 8.1 调试工具
```javascript
// 开发模式检测
if (__DEV__) {
  console.log('Development mode');
  
  // 启用性能监控
  require('react-native').unstable_enableLogBox();
  
  // Flipper 集成
  if (global.__FLIPPER__) {
    global.__FLIPPER__.logger = console;
  }
}

// 性能监控
import { InteractionManager, PerformanceObserver } from 'react-native';

// 监控交互性能
InteractionManager.runAfterInteractions(() => {
  console.log('Interactions completed');
});

// 监控渲染性能
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Performance entry:', entry);
  });
});
observer.observe({ entryTypes: ['measure'] });
```

### 8.2 热重载机制
```javascript
// Fast Refresh 实现原理
class HotReloadManager {
  constructor() {
    this.moduleCache = new Map();
    this.componentInstances = new WeakSet();
  }
  
  updateModule(moduleId, newCode) {
    // 1. 执行新代码
    const newModule = this.executeModule(newCode);
    
    // 2. 更新模块缓存
    this.moduleCache.set(moduleId, newModule);
    
    // 3. 查找受影响的组件
    const affectedComponents = this.findAffectedComponents(moduleId);
    
    // 4. 重新渲染组件
    affectedComponents.forEach(component => {
      this.remountComponent(component);
    });
  }
  
  preserveState(component) {
    // 保存组件状态
    return {
      state: component.state,
      props: component.props
    };
  }
  
  restoreState(component, savedState) {
    // 恢复组件状态
    component.setState(savedState.state);
  }
}
```

## 9. 跨平台策略

### 9.1 平台特定代码
```javascript
// 平台检测
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      ios: {
        backgroundColor: '#f0f0f0',
        paddingTop: 20
      },
      android: {
        backgroundColor: '#ffffff',
        elevation: 4
      }
    })
  }
});

// 平台特定组件
const PlatformSpecificComponent = () => {
  if (Platform.OS === 'ios') {
    return <IOSSpecificView />;
  } else {
    return <AndroidSpecificView />;
  }
};

// 文件命名约定
// Button.ios.js
// Button.android.js
// Button.js (通用)
```

### 9.2 响应式设计
```javascript
import { Dimensions, PixelRatio } from 'react-native';

class ResponsiveUtils {
  static getScreenData() {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale()
    };
  }
  
  static isTablet() {
    const { width, height } = Dimensions.get('window');
    const aspectRatio = height / width;
    return Math.min(width, height) >= 600 && aspectRatio < 1.6;
  }
  
  static normalize(size) {
    const { width } = Dimensions.get('window');
    const scale = width / 375; // 基于 iPhone X 宽度
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  }
}
```

## 10. 面试重点

### 10.1 核心概念
1. **Bridge 通信机制**：JS 和 Native 如何通信
2. **渲染流程**：从 Virtual DOM 到原生视图
3. **新架构优势**：Fabric 和 JSI 的改进
4. **组件系统**：原生组件的封装和使用
5. **性能优化**：渲染、列表、图片优化策略

### 10.2 技术难点
1. **异步通信**：Bridge 的异步特性和解决方案
2. **内存管理**：避免内存泄漏和性能问题
3. **平台差异**：iOS 和 Android 的适配
4. **调试困难**：跨平台调试的挑战
5. **包体积**：代码分割和资源优化

### 10.3 实际应用
- 跨平台移动应用开发
- 现有原生应用的混合开发
- 快速原型开发
- 企业内部应用
- 开源项目贡献

---

**学习建议**：
1. 理解 Bridge 通信的本质和局限
2. 掌握性能优化的最佳实践
3. 熟悉原生开发基础知识
4. 关注新架构的发展和迁移
5. 实践复杂应用的开发和调试