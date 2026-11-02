const EventEmitter = require('events');
const https = require('https');

class Watchdog extends EventEmitter {
  constructor(zapretManager, smartAnalyzer, options = {}) {
    super();
    this.manager = zapretManager;
    this.analyzer = smartAnalyzer;
    this.enabled = options.enabled ?? true;
    this.intervalMs = options.intervalMs || 75000; // 75 seconds
    this.failCount = 0;
    this.maxFails = 2; // Trigger heal after 2 consecutive failures
    this.timer = null;
    this.isHealing = false;

    // Alternative presets pool in order of reliability
    this.fallbackChain = [
      'general (ALT11).bat',
      'general (FAKE TLS AUTO).bat',
      'general (FAKE TLS AUTO ALT).bat',
      'general.bat',
      'general (ALT).bat',
      'general (ALT2).bat',
      'general (ALT6).bat',
      'general (ALT8).bat'
    ];
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), this.intervalMs);
    // Initial check after 30 seconds
    setTimeout(() => this.check(), 30000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (this.enabled && !this.timer) {
      this.start();
    } else if (!this.enabled && this.timer) {
      this.stop();
    }
  }

  checkProbe(url) {
    return new Promise((resolve) => {
      try {
        const u = new URL(url);
        const req = https.request({
          hostname: u.hostname,
          path: '/',
          method: 'HEAD',
          timeout: 3000,
          rejectUnauthorized: false
        }, (res) => {
          resolve(true);
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.on('error', () => resolve(false));
        req.end();
      } catch {
        resolve(false);
      }
    });
  }

  async check() {
    if (!this.enabled || !this.manager.isRunning() || this.isHealing || this.analyzer.isAnalyzing) {
      return;
    }

    const discordOk = await this.checkProbe('https://discord.com');
    const ytOk = await this.checkProbe('https://www.youtube.com');

    if (!discordOk && !ytOk) {
      this.failCount++;
      this.manager.addLog('warn', `[Watchdog] Сетевой сбой: Discord и YouTube недоступны (попытка ${this.failCount}/${this.maxFails})`);

      if (this.failCount >= this.maxFails) {
        await this.heal();
      }
    } else {
      if (this.failCount > 0) {
        this.manager.addLog('info', '[Watchdog] Соединение стабильно');
      }
      this.failCount = 0;
    }
  }

  async heal() {
    if (this.isHealing) return;
    this.isHealing = true;
    this.failCount = 0;

    const current = (this.manager.currentPreset || '').toLowerCase();
    this.manager.addLog('warn', `[Watchdog] Запуск авто-восстановления! Текущая стратегия ${current} заблокирована.`);

    // Pick next alternative from fallback chain
    const available = this.fallbackChain.filter(p => p.toLowerCase() !== current);
    const candidate = available[0] || 'general (ALT11).bat';

    try {
      this.manager.addLog('info', `[Watchdog] Автоматическое переключение на стратегию: ${candidate}...`);
      await this.manager.start(candidate);

      // Verify connection after switch
      await new Promise(r => setTimeout(r, 1500));
      const testDiscord = await this.checkProbe('https://discord.com');

      this.manager.addLog('success', `[Watchdog] Соединение успешно восстановлено! Активна: ${candidate}`);
      this.emit('healed', {
        previous: current,
        preset: candidate,
        success: testDiscord
      });

    } catch (err) {
      this.manager.addLog('error', `[Watchdog] Ошибка авто-восстановления: ${err.message}`);
    } finally {
      this.isHealing = false;
    }
  }
}

module.exports = Watchdog;
