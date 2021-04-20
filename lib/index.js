const _fs = require('fs');
const _path = require('path');
const _Event = require('events').EventEmitter;

const sep = _path.sep || '/'; //

// 参考http://nodejs.cn/api/fs.html#fs_dirent_isblockdevice
const statIs = [
  ['isFile', 'file'], // 文件
  ['isDirectory', 'directory'], // 目录
  ['isSymbolicLink', 'link'], // 描述符号链接
  ['isSocket', 'socket'], // 描述套接字
  ['isFIFO', 'fifo'], // 先进先出管道
  ['isBlockDevice', 'blockdevice'], // 对象描述块设备
  ['isCharacterDevice', 'characterdevice'], // 描述字符设备
];

/**
 *
 * @param {string} path 路径地址
 * @param {object} options 配置参数，也可以传入回调函数
 * @param {Function} cb 回调函数
 */
const walkDir = function (path, options = {}, cb) {
  if (typeof options === 'function') cb = options;

  if (options.find_links === undefined) {
    options.find_links = true;
  }

  const emitter = new _Event();
  let allPaths = options.return_object ? {} : [];
  let jobs = 0; // 正在处理的任务数量
  let tick = 0; // 是否开始处理标志
  let ended = 0; // 是否已经结束标志
  let resolved = 0; // 是否为绝对路径
  const job = function (value) {
    jobs += value;
    if (value < 1 && !tick) {
      tick = 1; // 标志，表示正在处理任务，当事件循环结束后，判断是否还有任务，否则触发结束事件
      process.nextTick(function () {
        tick = 0;
        if (jobs <= 0 && !ended) {
          ended = 1;
          emitter.emit('end');
        }
      });
    }
  };

  // 获取文件状态
  const statter = function (path, first, depth) {
    job(1); // 开始处理，增加任务数量
    const statAction = function (err, stats) {
      job(-1); // 处理完毕，减少任务数量
      if (err || !stats) {
        emitter.emit('error', path, error);
        return;
      }

      if (first && stats.isDirectory()) {
        // 开始文件夹遍历
        return emitter.emit('target_directory', path, stats, depth);
      }

      // 路径文件存在则触发对应事件
      emitter.emit('path', path, stats);

      // 判断文件类型，触发指定事件
      for (let j = 0; j < statIs.length; j++) {
        if (stats[statIs[j][0]]()) {
          // 文件状态判断，触发监听事件
          emitter.emit(statIs[j][1], path, stats);
          break; // 只可能满足一个条件
        }
      }
    };

    if (options.sync) {
      let stat, ex;
      try {
        stat = _fs[options.find_links ? 'lstatSync' : 'statSync'](path);
      } catch (e) {
        ex = e;
      }

      statAction(ex, stat);
    } else {
      _fs[options.find_links ? 'lstat' : 'stat'](path, statAction);
    }
  };

  // 读取文件夹
  const readdir = function (path, stat, depth = 0) {
    if (!resolved) {
      path = _path.resolve(path);
      resolved = 1;
    }

    // 是否达到最大深度
    if (options.max_depth && depth >= options.max_depth) {
      emitter.emit('maxDepth', path, stat, depth);
      return;
    }

    const readdirAction = function (err, files) {
      job(-1);
      if (err || !files) {
        emitter.emit('fail', path, err);
        return;
      }

      if (!files.length) {
        emitter.emit('empty', path, stat, depth);
        return;
      }

      for (let i = 0, j = files.length; i < j; i++) {
        statter(path + sep + files[i], false, depth++);
      }
    };

    job(1); // 开始处理
    if (options.sync) {
      let e, files;
      try {
        files = fs.readdirSync(path);
      } catch (_e) {
        e = _e;
      }

      readdirAction(e, files);
    } else {
      fs.readdir(path, readdirAction);
    }
  };

  //  使用回调函数
  if (cb) {
    emitter.on('path', cb);
  }

  if (options.sync) {
    if (!options.no_return) {
      emitter.on('path', function (path, stat) {
        if (options.return_object) allPaths[path] = stat;
        else allPaths.push(path);
      });
    }
  }

  emitter.once('fail', function (_path, err) {
    // 只有在一级路径报错，才会触发 error 事件
    if (path === _path) {
      emitter.emit(
        'error',
        new Error('error reading first path in the walk ' + path + '\n' + err),
        err
      );
    }
  });

  statter(path, 1);
  if (options.sync) {
    return allPaths;
  } else {
    return emitter;
  }
};

// 异步
walkDir.sync = function (path, options = {}, eventHandler) {
  const defaultSyncOption = { sync: true };
  if (typeof options === 'function') cb = options;
  return walkDir(path, Object.assign(defaultSyncOption, options), eventHandler);
};

// 同步
walkDir.async = function (path, options = {}, eventHandler) {
  return new Promise((resolve, reject) => {
    if (typeof options === 'function') cb = options;
    const emitter = walkDir(path, options, eventHandler);
    emitter.on('error', reject);
    emitter.on('fail', (path, err) => {
      err.message = 'Error walking": ' + path + ' ' + err.message;
      reject(err);
    });

    let allPaths = {};

    emitter.on('path', (path, stat) => {
      if (!options.no_return) allPaths[path] = stat;
    });

    emitter.on('end', () => {
      if (!options.no_return) {
        return resolve(options.return_object ? allPaths : Object.keys(allPaths));
      }
      resolve();
    });
  });
};

walkDir(__dirname, function (path, stat) {
  console.log('found: ', path, stat);
});
module.exports = walkDir;
