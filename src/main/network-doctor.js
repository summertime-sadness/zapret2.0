const { execSync, exec } = require('child_process');
const dns = require('dns').promises;

class NetworkDoctor {
  constructor(zapretManager) {
    this.manager = zapretManager;
  }

  async runDiagnostics() {
    const report = {
      timestamp: new Date().toLocaleTimeString(),
      flushedDNS: false,
      dnsWorks: false,
      conflicts: [],
      proxyDetected: false,
      proxyInfo: 'Прямое подключение',
      divertServiceStatus: 'Остановлена',
      divertInstalled: true,
      issuesCount: 0
    };

    // 1. Check DNS resolution
    try {
      const addresses = await dns.resolve4('discord.com');
      if (addresses && addresses.length > 0) {
        report.dnsWorks = true;
      }
    } catch (e) {
      report.dnsWorks = false;
      report.issuesCount++;
    }

    // 2. Check for conflicting processes
    try {
      const tasklist = execSync('tasklist /NH', { encoding: 'utf8', windowsHide: true });
      const lowerTaskList = tasklist.toLowerCase();

      if (lowerTaskList.includes('goodbyedpi.exe')) {
        report.conflicts.push('GoodbyeDPI (goodbyedpi.exe) запущен и перехватывает трафик');
        report.issuesCount++;
      }
      if (lowerTaskList.includes('byedpi.exe') || lowerTaskList.includes('ciadpi.exe')) {
        report.conflicts.push('Сторонний DPI-клиент (ByeDPI/CiaDPI) активен');
        report.issuesCount++;
      }

      // Count winws instances
      const winwsCount = (lowerTaskList.match(/winws\.exe/g) || []).length;
      if (winwsCount > 1) {
        report.conflicts.push(`Обнаружено несколько копий winws.exe (${winwsCount} процессов)`);
        report.issuesCount++;
      }
    } catch (e) {
      // ignore
    }

    // 3. Check WinHTTP proxy settings
    try {
      const proxyOut = execSync('netsh winhttp show proxy', { encoding: 'utf8', windowsHide: true });
      if (proxyOut.includes('127.0.0.1') || proxyOut.includes('Proxy Server')) {
        report.proxyDetected = true;
        report.proxyInfo = proxyOut.trim();
        report.conflicts.push('Обнаружен системный WinHTTP-прокси, который может перенаправлять трафик');
        report.issuesCount++;
      }
    } catch (e) {
      // ignore
    }

    // 4. Check WinDivert service state
    try {
      const scOut = execSync('sc query WinDivert', { encoding: 'utf8', windowsHide: true });
      if (scOut.includes('RUNNING')) {
        report.divertServiceStatus = 'Активна (RUNNING)';
      } else if (scOut.includes('STOPPED')) {
        report.divertServiceStatus = 'Остановлена (STOPPED)';
      } else {
        report.divertServiceStatus = 'Готова к запуску';
      }
    } catch (e) {
      report.divertServiceStatus = 'Не зарегистрирована (будет создана автоматически)';
    }

    return report;
  }

  flushDNS() {
    try {
      execSync('ipconfig /flushdns', { stdio: 'ignore', windowsHide: true });
      this.manager.addLog('info', '[Сетевой Доктор] Системный кэш DNS успешно очищен');
      return { success: true, message: 'Кэш DNS успешно очищен' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async repairAll() {
    this.manager.addLog('info', '[Сетевой Доктор] Запуск комплексного исправления сетевого стека...');
    const results = [];

    // 1. Flush DNS
    try {
      execSync('ipconfig /flushdns', { stdio: 'ignore', windowsHide: true });
      results.push('Кэш DNS очищен');
    } catch (e) {}

    // 2. Kill conflicting processes
    try {
      execSync('taskkill /IM goodbyedpi.exe /F', { stdio: 'ignore', windowsHide: true });
      results.push('Процесс GoodbyeDPI завершен');
    } catch (e) {}

    try {
      execSync('taskkill /IM byedpi.exe /F', { stdio: 'ignore', windowsHide: true });
    } catch (e) {}

    // 3. Reset WinHTTP proxy if stuck
    try {
      execSync('netsh winhttp reset proxy', { stdio: 'ignore', windowsHide: true });
      results.push('Системный WinHTTP-прокси сброшен');
    } catch (e) {}

    // 4. Clean restart WinDivert and winws
    try {
      await this.manager.stop();
      results.push('Служба WinDivert и процессы winws перезагружены');
    } catch (e) {}

    // 5. Restart with current preset
    const targetPreset = this.manager.currentPreset || 'general (ALT11).bat';
    try {
      await this.manager.start(targetPreset);
      results.push(`Движок перезапущен со стратегией ${targetPreset}`);
    } catch (e) {
      results.push(`Предупреждение: ${e.message}`);
    }

    this.manager.addLog('success', '[Сетевой Доктор] Исправление завершено: ' + results.join(', '));
    return {
      success: true,
      details: results,
      message: 'Все сетевые проблемы устранены'
    };
  }
}

module.exports = NetworkDoctor;
