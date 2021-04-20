## 简介

对传入的路径实现递归处理，如果路径是文件夹则继续深入遍历，如果路径是文件则根据文件类型触发指定的事件回调

支持以下使用方式：

- 异步回调
- 事件监听
- 同步处理
- promise

### 学习点

- 传入的 cb 赋值到指定事件监听回调函数，在触发到时候实现回调返回
- 使用 process.nextTick 来判断任务是否执行完毕，来触发结束事件

### 优化点

- 代码逻辑混乱，耦合度非常高
- 存在许多变量提升，不容易理解

## 使用

```js
const walk = require('walkdir');

//异步回调
walk('../', function (path, stat) {
  console.log('found: ', path);
});

//使用异步事件触发，获取更多的信息
const emitter = walk('../');

emitter.on('file', function (filename, stat) {
  console.log('file from emitter: ', filename);
});

//同步
walk.sync('../', function (path, stat) {
  console.log('found sync:', path);
});

//同步只需要路径地址
var paths = walk.sync('../');
console.log('found paths sync: ', paths);

// promise实现
let result = await walk.async('../', { return_object: true });
//result['path'] = {statObject}
```

支持对事件：

- maxDepth 遍历达到设定对最大深度时触发
- empty 当目标文件夹为空时触发

### 备注

```
Stats {
  dev: 16777221,
  mode: 16877,
  nlink: 6,
  uid: 501,
  gid: 20,
  rdev: 0,
  blksize: 4096,
  ino: 11991987,
  size: 192,
  blocks: 0,
  atimeMs: 1618883441167.2678,
  mtimeMs: 1618882103942.9678,
  ctimeMs: 1618882103942.9678,
  birthtimeMs: 1618810891448.8713,
  atime: 2021-04-20T01:50:41.167Z,
  mtime: 2021-04-20T01:28:23.943Z,
  ctime: 2021-04-20T01:28:23.943Z,
  birthtime: 2021-04-19T05:41:31.449Z
}
```
