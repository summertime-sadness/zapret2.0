const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const EventEmitter = require('events');

class OtaUpdater extends EventEmitter {
  constructor(options = {}) {
    super();
    this.repoOwner = options.repoOwner || 'Flowseal';
    this.repoName = options.repoName || 'zapret-discord-youtube';
    this.repoUrl = `https://github.com/${this.repoOwner}/${this.repoName}.git`;
    this.zapretDir = options.zapretDir || path.resolve(__dirname, '../../zapret');
    this.versionFilePath = path.join(this.zapretDir, '.service', 'ota-version.json');
    this.isUpdating = false;
  }

  getLocalVersionInfo() {
    let localVersion = '1.10.4';
    let localSha = 'main';
    let lastUpdated = null;

    // Check version file
    if (fs.existsSync(this.versionFilePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.versionFilePath, 'utf8'));
        if (data.version) localVersion = data.version;
        if (data.commitSha) localSha = data.commitSha;
        if (data.lastUpdated) lastUpdated = data.lastUpdated;
      } catch (e) {
        // ignore
      }
    } else {
      // Check zapret/service.bat
      const serviceBat = path.join(this.zapretDir, 'service.bat');
      if (fs.existsSync(serviceBat)) {
        try {
          const content = fs.readFileSync(serviceBat, 'utf8');
          const m = content.match(/LOCAL_VERSION=([^\r\n"]+)/);
          if (m) localVersion = m[1].trim();
        } catch (e) {
          // ignore
        }
      }
    }

    return {
      version: localVersion,
      commitSha: localSha,
      lastUpdated
    };
  }

  saveLocalVersionInfo(info) {
    try {
      fs.writeFileSync(this.versionFilePath, JSON.stringify(info, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save version info', e);
    }
  }

  fetchJson(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        headers: {
          'User-Agent': 'Zapret-Glass-Discord-GUI/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 8000
      }, (res) => {
        // Handle redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.fetchJson(res.headers.location));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API returned HTTP ${res.statusCode}`));
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Превышен таймаут соединения с GitHub API'));
      });
      req.on('error', reject);
    });
  }

  async checkForUpdates() {
    const localInfo = this.getLocalVersionInfo();
    this.emit('progress', { stage: 'checking', message: 'Проверка обновлений на GitHub...' });

    try {
      let latestSha = null;
      let commitMessage = 'Новые исправления и обновления';
      let commitDate = new Date().toISOString();

      // Try 1: Atom Feed (bulletproof, zero rate limits)
      try {
        const atomUrl = `https://github.com/${this.repoOwner}/${this.repoName}/commits/main.atom`;
        const atomXml = await this.fetchText(atomUrl);
        const matchSha = atomXml.match(/<id>tag:github\.com,\d+:Grit::Commit\/([a-f0-9]{40})<\/id>/);
        const matchTitle = atomXml.match(/<title>([^<]+)<\/title>/g);
        const matchUpdated = atomXml.match(/<updated>([^<]+)<\/updated>/);

        if (matchSha) {
          latestSha = matchSha[1];
        }
        if (matchTitle && matchTitle.length > 1) {
          commitMessage = matchTitle[1].replace(/<\/?title>/g, '').trim();
        }
        if (matchUpdated) {
          commitDate = matchUpdated[1].trim();
        }
      } catch (atomErr) {
        // Try 2: GitHub REST API
        const commitUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits/main`;
        const commitData = await this.fetchJson(commitUrl);
        latestSha = commitData.sha;
        commitMessage = commitData.commit?.message?.split('\n')[0] || commitMessage;
        commitDate = commitData.commit?.author?.date || commitDate;
      }

      if (!latestSha) {
        throw new Error('Не удалось получить информацию о последнем коммите');
      }

      const shortSha = latestSha.substring(0, 7);
      const isUpToDate = (localInfo.commitSha && localInfo.commitSha === latestSha);
      const updateAvailable = !isUpToDate;

      const result = {
        updateAvailable,
        localVersion: localInfo.version,
        localSha: localInfo.commitSha ? localInfo.commitSha.substring(0, 7) : 'исходная',
        latestSha: shortSha,
        fullLatestSha: latestSha,
        commitMessage,
        commitDate,
        repoUrl: this.repoUrl
      };

      this.emit('progress', {
        stage: 'check_complete',
        result,
        message: updateAvailable ? `Доступно обновление: [${shortSha}] ${commitMessage}` : 'У вас установлена актуальная версия'
      });

      return result;
    } catch (err) {
      this.emit('progress', {
        stage: 'check_error',
        error: err.message,
        message: `Ошибка проверки обновлений: ${err.message}`
      });
      throw err;
    }
  }

  fetchText(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        timeout: 8000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.fetchText(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Превышен таймаут'));
      });
      req.on('error', reject);
    });
  }

  downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const u = new URL(url);

      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        headers: {
          'User-Agent': 'Zapret-Glass-Discord-GUI/1.0'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return resolve(this.downloadFile(res.headers.location, destPath));
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;

        res.on('data', chunk => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round((receivedBytes / totalBytes) * 100);
            this.emit('progress', {
              stage: 'downloading',
              percent,
              message: `Загрузка обновления: ${percent}% (${Math.round(receivedBytes / 1024)} KB)`
            });
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(destPath));
        });
      });

      req.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    });
  }

  async performOTAUpdate(latestSha = null) {
    if (this.isUpdating) {
      throw new Error('Обновление уже выполняется');
    }

    this.isUpdating = true;
    const tempZip = path.join(__dirname, '../../zapret_update.zip');
    const tempExtractDir = path.join(__dirname, '../../zapret_update_tmp');

    try {
      this.emit('progress', { stage: 'starting', message: 'Подготовка к установке OTA-обновления...' });

      // 1. Download zipball from GitHub
      const zipUrl = `https://github.com/${this.repoOwner}/${this.repoName}/archive/refs/heads/main.zip`;
      this.emit('progress', { stage: 'downloading', percent: 0, message: 'Загрузка архива обновления...' });

      await this.downloadFile(zipUrl, tempZip);

      // 2. Backup user custom lists
      this.emit('progress', { stage: 'backing_up', message: 'Резервное копирование пользовательских списков...' });
      const listsDir = path.join(this.zapretDir, 'lists');
      const backupDir = path.join(__dirname, '../../zapret_user_backup');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const userFiles = ['list-general-user.txt', 'list-exclude-user.txt', 'ipset-exclude-user.txt'];
      for (const uFile of userFiles) {
        const orig = path.join(listsDir, uFile);
        if (fs.existsSync(orig)) {
          fs.copyFileSync(orig, path.join(backupDir, uFile));
        }
      }

      // 3. Extract downloaded archive
      this.emit('progress', { stage: 'extracting', message: 'Распаковка файлов обновления...' });
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtractDir, { recursive: true });

      // Use PowerShell Expand-Archive
      execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZip}' -DestinationPath '${tempExtractDir}' -Force"`, {
        stdio: 'ignore',
        windowsHide: true
      });

      // 4. Find root directory inside extracted zip (typically 'zapret-discord-youtube-main')
      const extractedSubdirs = fs.readdirSync(tempExtractDir);
      let sourceDir = tempExtractDir;
      for (const sub of extractedSubdirs) {
        const full = path.join(tempExtractDir, sub);
        if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'bin'))) {
          sourceDir = full;
          break;
        }
      }

      // 5. Copy new files into zapretDir
      this.emit('progress', { stage: 'installing', message: 'Установка обновленных компонентов...' });

      // Recursively copy files from sourceDir to zapretDir
      this.copyDirRecursive(sourceDir, this.zapretDir);

      // 6. Restore user custom lists
      for (const uFile of userFiles) {
        const backupPath = path.join(backupDir, uFile);
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, path.join(listsDir, uFile));
        }
      }

      // 7. Cleanup
      try {
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
        if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
      } catch {}

      // 8. Update stored version info
      let newVersion = '1.10.4';
      try {
        const serviceBat = path.join(this.zapretDir, 'service.bat');
        if (fs.existsSync(serviceBat)) {
          const content = fs.readFileSync(serviceBat, 'utf8');
          const m = content.match(/LOCAL_VERSION=([^\r\n"]+)/);
          if (m) newVersion = m[1].trim();
        }
      } catch {}

      this.saveLocalVersionInfo({
        version: newVersion,
        commitSha: latestSha || 'updated',
        lastUpdated: new Date().toISOString()
      });

      this.emit('progress', {
        stage: 'completed',
        version: newVersion,
        commitSha: latestSha,
        message: `Обновление успешно установлено! Версия: ${newVersion}`
      });

      return { success: true, version: newVersion };
    } catch (err) {
      this.emit('progress', {
        stage: 'error',
        error: err.message,
        message: `Ошибка при установке обновления: ${err.message}`
      });
      throw err;
    } finally {
      this.isUpdating = false;
    }
  }

  copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

module.exports = OtaUpdater;
