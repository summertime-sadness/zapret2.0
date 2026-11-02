const fs = require('fs');
const path = require('path');
const { spawn, execSync, exec } = require('child_process');
const EventEmitter = require('events');

class ZapretManager extends EventEmitter {
  constructor(options = {}) {
    super();

    let defaultRootDir = path.resolve(__dirname, '../../zapret');
    const nextToExe = path.join(path.dirname(process.execPath), 'zapret');
    const inResources = process.resourcesPath ? path.join(process.resourcesPath, 'zapret') : null;

    if (fs.existsSync(nextToExe)) {
      defaultRootDir = nextToExe;
    } else if (inResources && fs.existsSync(inResources)) {
      defaultRootDir = inResources;
    }

    this.rootDir = options.rootDir || defaultRootDir;
    this.binDir = path.join(this.rootDir, 'bin');
    this.listsDir = path.join(this.rootDir, 'lists');
    this.winwsPath = path.join(this.binDir, 'winws.exe');

    this.process = null;
    this.currentPreset = null;
    this.startTime = null;
    this.logs = [];
    this.maxLogs = 600;
    this.gameFilterEnabled = false;
    this.gameFilterTCP = '12';
    this.gameFilterUDP = '12';

    this.initEnvironment();
  }

  isElevated() {
    try {
      execSync('fltmc', { stdio: 'ignore', windowsHide: true });
      return true;
    } catch {
      try {
        execSync('fsutil dirty query %systemdrive%', { stdio: 'ignore', windowsHide: true });
        return true;
      } catch {
        return false;
      }
    }
  }

  initEnvironment() {
    try {
      if (!fs.existsSync(this.listsDir)) {
        fs.mkdirSync(this.listsDir, { recursive: true });
      }

      // Ensure user list files exist so winws doesn't fail on missing files
      const userLists = [
        { name: 'ipset-exclude-user.txt', content: '203.0.113.113/32\r\n' },
        { name: 'list-general-user.txt', content: '# User custom domains\r\ndomain.example.abc\r\n' },
        { name: 'list-exclude-user.txt', content: '# Excluded domains\r\ndomain.example.abc\r\n' },
        { name: 'ipset-exclude.txt', content: '203.0.113.113/32\r\n' }
      ];

      for (const item of userLists) {
        const filePath = path.join(this.listsDir, item.name);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, item.content, 'utf8');
        }
      }
    } catch (e) {
      this.addLog('warn', `Ошибка инициализации списков: ${e.message}`);
    }
  }

  addLog(level, message) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message: String(message).trim()
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit('log', entry);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.emit('logs-cleared');
  }

  getPresets() {
    if (!fs.existsSync(this.rootDir)) {
      return [];
    }

    const files = fs.readdirSync(this.rootDir);
    const presets = files
      .filter(f => f.endsWith('.bat') && !f.toLowerCase().startsWith('service'))
      .sort((a, b) => {
        // Natural sort for general (ALT1), (ALT2), ... (ALT13)
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      })
      .map(filename => {
        const fullPath = path.join(this.rootDir, filename);
        const name = filename.replace(/\.bat$/i, '');
        return {
          filename,
          name,
          fullPath,
          category: this.categorizePreset(name),
          recommended: filename === 'general (ALT11).bat' || filename === 'general (FAKE TLS AUTO).bat' || filename === 'general.bat'
        };
      });

    return presets;
  }

  categorizePreset(name) {
    const lower = name.toLowerCase();
    if (lower.includes('fake tls auto')) return 'Fake TLS Auto';
    if (lower.includes('simple fake')) return 'Simple Fake';
    if (lower.includes('alt1') || lower.includes('alt2') || lower.includes('alt3') || lower.includes('alt4')) return 'Альтернативные (Медиа)';
    if (lower.includes('alt')) return 'Альтернативные (Discord/YouTube)';
    if (lower.includes('exp')) return 'Экспериментальные';
    return 'Базовые';
  }

  setGameFilter(enabled) {
    this.gameFilterEnabled = !!enabled;
    if (this.gameFilterEnabled) {
      this.gameFilterTCP = '1024-65535';
      this.gameFilterUDP = '1024-65535';
    } else {
      this.gameFilterTCP = '12';
      this.gameFilterUDP = '12';
    }
    this.addLog('info', `Игровой фильтр портов: ${this.gameFilterEnabled ? 'ВКЛ (1024-65535)' : 'ВЫКЛ (12)'}`);
  }

  parseBatFile(batPath) {
    if (!fs.existsSync(batPath)) {
      throw new Error(`Файл конфигурации не найден: ${batPath}`);
    }

    const raw = fs.readFileSync(batPath, 'utf8');
    const lines = raw.split(/\r?\n/);

    // Reconstruct multi-line command with line continuations (caret ^)
    let fullCommand = '';
    let capturing = false;

    for (let line of lines) {
      line = line.trim();
      if (!capturing && (line.includes('winws.exe') || line.startsWith('start '))) {
        capturing = true;
      }
      if (capturing) {
        let clean = line;
        if (clean.endsWith('^')) {
          clean = clean.slice(0, -1).trim();
          fullCommand += ' ' + clean;
        } else {
          fullCommand += ' ' + clean;
          break; // finished command
        }
      }
    }

    if (!fullCommand) {
      throw new Error('Не удалось найти команду запуска winws.exe в скрипте');
    }

    // Replace variable placeholders
    const binDirWithSlash = this.binDir.endsWith(path.sep) ? this.binDir : this.binDir + path.sep;
    const listsDirWithSlash = this.listsDir.endsWith(path.sep) ? this.listsDir : this.listsDir + path.sep;

    let processed = fullCommand
      .replace(/%BIN%/gi, binDirWithSlash)
      .replace(/%LISTS%/gi, listsDirWithSlash)
      .replace(/%~dp0bin\\/gi, binDirWithSlash)
      .replace(/%~dp0lists\\/gi, listsDirWithSlash)
      .replace(/%~dp0/gi, this.rootDir + path.sep)
      .replace(/%GameFilterTCP%/gi, this.gameFilterTCP)
      .replace(/%GameFilterUDP%/gi, this.gameFilterUDP);

    // Extract portion after winws.exe
    const match = processed.match(/winws(?:\.exe)?["']?\s+(.*)$/i);
    if (!match) {
      throw new Error('Ошибка разбора аргументов winws.exe');
    }

    const argsString = match[1].trim();

    // Parse arguments properly respecting quotes inside arguments (e.g. --ipset="C:\...")
    const args = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < argsString.length; i++) {
      const ch = argsString[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (/\s/.test(ch) && !inQuotes) {
        if (current.length > 0) {
          args.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current.length > 0) args.push(current);

    return args;
  }

  async start(presetName = 'general.bat') {
    if (this.isRunning()) {
      await this.stop();
    }

    const presets = this.getPresets();
    const preset = presets.find(p => p.filename.toLowerCase() === presetName.toLowerCase() || p.name.toLowerCase() === presetName.toLowerCase());

    if (!preset) {
      throw new Error(`Конфигурация "${presetName}" не найдена`);
    }

    const args = this.parseBatFile(preset.fullPath);
    this.addLog('info', `Запуск движка Zapret [${preset.filename}]...`);
    this.addLog('debug', `Параметры: ${args.slice(0, 4).join(' ')} ... (${args.length} аргументов)`);

    if (!fs.existsSync(this.winwsPath)) {
      throw new Error(`Исполняемый файл не найден: ${this.winwsPath}`);
    }

    // Check elevation
    const elevated = this.isElevated();
    if (!elevated) {
      this.addLog('warn', 'Внимание: Приложению требуются права администратора для работы драйвера WinDivert!');
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const fallbackElevated = (origError) => {
        this.addLog('warn', 'Прямой запуск заблокирован (EACCES). Запрос прав Администратора через Windows UAC...');
        const formattedArgs = args.map(arg => {
          if (arg.includes('=')) {
            const eqIdx = arg.indexOf('=');
            const k = arg.substring(0, eqIdx);
            const v = arg.substring(eqIdx + 1);
            return `${k}=\\"${v}\\"`;
          }
          if (arg.includes(' ')) {
            return `\\"${arg}\\"`;
          }
          return arg;
        }).join(' ');

        // Launch winws.exe directly with WindowStyle Hidden - no batch file, zero console windows
        const psCmd = `Start-Process -FilePath '${this.winwsPath}' -ArgumentList '${formattedArgs.replace(/'/g, "''")}' -WorkingDirectory '${this.binDir}' -WindowStyle Hidden -Verb RunAs`;
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, { windowsHide: true }, (err) => {
          if (err) {
            this.addLog('error', `Ошибка UAC: ${err.message}. Пожалуйста, запустите приложение от имени Администратора.`);
            this.cleanupState();
            this.emit('status', this.getStatus());
            if (!isSettled) {
              isSettled = true;
              return reject(origError || err);
            }
            return;
          }

          // Check if winws started within 2 seconds
          setTimeout(() => {
            if (this.isRunning()) {
              this.currentPreset = preset.filename;
              this.startTime = Date.now();
              this.addLog('success', `Zapret успешно запущен с правами Администратора [${preset.filename}]`);
              this.emit('status', this.getStatus());
              if (!isSettled) {
                isSettled = true;
                resolve(this.getStatus());
              }
            } else {
              const msg = 'Процесс winws не был запущен (UAC был отклонен или заблокирован). Перезапустите приложение от имени Администратора.';
              this.addLog('warn', msg);
              this.cleanupState();
              this.emit('status', this.getStatus());
              if (!isSettled) {
                isSettled = true;
                reject(new Error(msg));
              }
            }
          }, 1800);
        });
      };

      try {
        const proc = spawn(this.winwsPath, args, {
          cwd: this.binDir,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        this.process = proc;
        this.currentPreset = preset.filename;
        this.startTime = Date.now();

        proc.stdout.on('data', data => {
          const text = data.toString('utf8');
          for (const line of text.split(/\r?\n/)) {
            if (line.trim()) this.addLog('stdout', line.trim());
          }
        });

        proc.stderr.on('data', data => {
          const text = data.toString('utf8');
          for (const line of text.split(/\r?\n/)) {
            if (line.trim()) this.addLog('stderr', line.trim());
          }
        });

        proc.on('error', err => {
          if (this.process !== proc) return;
          if (err.code === 'EACCES') {
            this.process = null;
            fallbackElevated(err);
            return;
          }
          this.addLog('error', `Ошибка запуска процесса: ${err.message}`);
          this.cleanupState();
          this.emit('status', this.getStatus());
          if (!isSettled) {
            isSettled = true;
            reject(err);
          }
        });

        proc.on('close', code => {
          if (this.process !== proc) return;
          if (code !== 0 && code !== null && !isSettled) {
            this.addLog(code === -4092 ? 'error' : 'warn', `Процесс winws завершился с кодом ${code}`);
          }
          this.cleanupState();
          this.emit('status', this.getStatus());
        });

        // Give winws a brief moment to initialize
        setTimeout(() => {
          if (isSettled) return;
          if (this.process === proc && !proc.killed) {
            this.addLog('success', `Zapret успешно запущен (PID: ${proc.pid}) [${preset.filename}]`);
            this.emit('status', this.getStatus());
            isSettled = true;
            resolve(this.getStatus());
          } else if (!this.process && isSettled) {
            // handled by fallback
          } else {
            if (!isSettled) {
              isSettled = true;
              reject(new Error('Процесс winws завершился сразу после старта'));
            }
          }
        }, 500);

      } catch (err) {
        if (err.code === 'EACCES') {
          fallbackElevated(err);
        } else {
          this.cleanupState();
          this.addLog('error', `Исключение при старте: ${err.message}`);
          if (!isSettled) {
            isSettled = true;
            reject(err);
          }
        }
      }
    });
  }

  async stop() {
    this.addLog('info', 'Остановка Zapret...');
    if (this.process) {
      const proc = this.process;
      this.process = null;
      try {
        proc.removeAllListeners();
        proc.kill();
      } catch (e) {
        // ignore
      }
    }

    // Force kill winws and cleanup WinDivert
    try {
      execSync('taskkill /IM winws.exe /F', { stdio: 'ignore', windowsHide: true });
    } catch {
      // not running, ok
    }

    try {
      execSync('net stop WinDivert', { stdio: 'ignore', windowsHide: true });
    } catch {
      // service not running, ok
    }

    // Give kernel driver a brief 200ms moment to unbind network sockets completely
    await new Promise(r => setTimeout(r, 200));

    try {
      const runnerBat = path.join(this.rootDir, '.run_temp.bat');
      if (fs.existsSync(runnerBat)) fs.unlinkSync(runnerBat);
    } catch {
      // ignore
    }

    this.cleanupState();
    this.addLog('info', 'Zapret остановлен');
    this.emit('status', this.getStatus());
    return this.getStatus();
  }

  async restart(presetName) {
    await this.stop();
    const configToStart = presetName || this.currentPreset || 'general.bat';
    return await this.start(configToStart);
  }

  cleanupState() {
    this.process = null;
    this.currentPreset = null;
    this.startTime = null;
  }

  isRunning() {
    if (this.process && !this.process.killed) {
      return true;
    }
    // Double check via tasklist
    try {
      const out = execSync('tasklist /FI "IMAGENAME eq winws.exe" /NH', { encoding: 'utf8', stdio: 'pipe', windowsHide: true });
      return out.toLowerCase().includes('winws.exe');
    } catch {
      return false;
    }
  }

  getStatus() {
    const running = this.isRunning();
    const uptime = running && this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return {
      running,
      preset: running ? this.currentPreset : null,
      pid: this.process ? this.process.pid : null,
      uptime,
      isElevated: this.isElevated(),
      gameFilter: this.gameFilterEnabled
    };
  }

  getLists() {
    const listFiles = [
      'list-general.txt',
      'list-general-user.txt',
      'list-google.txt',
      'list-exclude.txt',
      'list-exclude-user.txt',
      'ipset-all.txt',
      'ipset-exclude.txt',
      'ipset-exclude-user.txt'
    ];

    const result = {};
    for (const file of listFiles) {
      const p = path.join(this.listsDir, file);
      if (fs.existsSync(p)) {
        try {
          result[file] = fs.readFileSync(p, 'utf8');
        } catch {
          result[file] = '';
        }
      } else {
        result[file] = '';
      }
    }
    return result;
  }

  saveList(filename, content) {
    const allowed = [
      'list-general.txt',
      'list-general-user.txt',
      'list-google.txt',
      'list-exclude.txt',
      'list-exclude-user.txt',
      'ipset-all.txt',
      'ipset-exclude.txt',
      'ipset-exclude-user.txt'
    ];

    if (!allowed.includes(filename)) {
      throw new Error(`Недопустимое имя файла списка: ${filename}`);
    }

    const p = path.join(this.listsDir, filename);
    fs.writeFileSync(p, content, 'utf8');
    this.addLog('info', `Список ${filename} сохранен (${content.length} байт)`);
    return true;
  }

  addDomainToUserList(domainInput) {
    if (!domainInput || typeof domainInput !== 'string') {
      throw new Error('Укажите доменное имя');
    }

    // Clean up domain (remove http://, https://, paths, ports)
    let clean = domainInput.trim().toLowerCase();
    clean = clean.replace(/^(?:https?:\/\/)?/i, '');
    clean = clean.split('/')[0];
    clean = clean.split(':')[0];
    clean = clean.replace(/^www\./i, '');

    if (!clean || !clean.includes('.') || clean.length < 3) {
      throw new Error(`Некорректный формат домена: "${domainInput}"`);
    }

    const filename = 'list-general-user.txt';
    const filePath = path.join(this.listsDir, filename);
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf8');
    }

    const lines = existingContent.split(/\r?\n/).map(l => l.trim().toLowerCase());
    if (lines.includes(clean)) {
      return { success: true, alreadyExists: true, domain: clean, message: `Домен ${clean} уже присутствует в списке` };
    }

    const newContent = existingContent.trim() + (existingContent.trim() ? '\r\n' : '') + clean + '\r\n';
    fs.writeFileSync(filePath, newContent, 'utf8');
    this.addLog('success', `[Списки] Домен ${clean} успешно добавлен в ${filename}`);

    return {
      success: true,
      alreadyExists: false,
      domain: clean,
      message: `Домен ${clean} успешно добавлен в пользовательский список обхода`
    };
  }

  async updateCommunityBlocklist() {
    this.addLog('info', '[Списки] Загрузка обновленного списка заблокированных доменов сообщества...');
    const url = 'https://raw.githubusercontent.com/Flowseal/zapret-discord-youtube/main/lists/list-general.txt';
    const https = require('https');

    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'ZAPRET-2.0' }, timeout: 6000 }, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Сервер вернул код ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const dest = path.join(this.listsDir, 'list-general.txt');
            fs.writeFileSync(dest, data, 'utf8');
            const lines = data.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).length;
            this.addLog('success', `[Списки] Базовый список доменов обновлен (${lines} записей)`);
            resolve({ success: true, count: lines });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }
}

module.exports = ZapretManager;
