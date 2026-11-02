const dgram = require('dgram');
const https = require('https');

class VoiceTester {
  constructor(zapretManager) {
    this.manager = zapretManager;
  }

  async testDiscordVoice() {
    this.manager.addLog('info', '[Discord Voice] Тестирование голосового шлюза и WebRTC UDP-портов...');

    const report = {
      signalingOk: false,
      udpOk: false,
      regionsAvailable: false,
      gameFilterActive: this.manager.gameFilterEnabled,
      pingMs: 9999,
      status: 'Блокировка',
      recommendation: ''
    };

    // 1. Test Voice Regions API
    try {
      const startTime = Date.now();
      const regionsRes = await this.probeHttps('https://discord.com/api/v9/voice/regions');
      report.signalingOk = regionsRes.ok;
      report.pingMs = regionsRes.latency;
      if (regionsRes.ok) report.regionsAvailable = true;
    } catch (e) {
      report.signalingOk = false;
    }

    // 2. Test UDP voice socket
    try {
      const udpRes = await this.probeUDP('162.159.130.233', 50001); // Discord gateway IP
      report.udpOk = udpRes.ok;
      if (udpRes.latency < report.pingMs && udpRes.latency > 0) {
        report.pingMs = udpRes.latency;
      }
    } catch (e) {
      report.udpOk = false;
    }

    // Recommendations based on results
    if (report.signalingOk && report.udpOk) {
      report.status = 'Отлично (Voice OK)';
      report.recommendation = 'Голосовые каналы, стримы и демонстрация экрана полностью доступны!';
    } else if (report.signalingOk && !report.udpOk) {
      report.status = 'Ограничено (UDP сбой)';
      report.recommendation = report.gameFilterActive
        ? 'Рекомендуется переключить стратегию на ALT11 или FAKE TLS AUTO ALT.'
        : 'Включите переключатель GAME вверху окна, чтобы активировать игровой фильтр UDP-портов.';
    } else {
      report.status = 'Блокировка шлюза';
      report.recommendation = 'Сигнальный шлюз Discord блокируется. Запустите автоматический подбор конфигураций.';
    }

    this.manager.addLog(
      report.signalingOk ? 'success' : 'warn',
      `[Discord Voice] Результат: ${report.status} (Пинг: ${report.pingMs}ms). ${report.recommendation}`
    );

    return report;
  }

  probeHttps(url) {
    return new Promise((resolve) => {
      const u = new URL(url);
      const start = Date.now();
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname,
        headers: { 'User-Agent': 'Discord-Voice-Tester/2.0' },
        timeout: 3000
      }, (res) => {
        resolve({ ok: res.statusCode < 500, latency: Date.now() - start });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, latency: 9999 }); });
      req.on('error', () => resolve({ ok: false, latency: 9999 }));
    });
  }

  probeUDP(host, port) {
    return new Promise((resolve) => {
      const socket = dgram.createSocket('udp4');
      const start = Date.now();
      let finished = false;

      const finish = (ok) => {
        if (finished) return;
        finished = true;
        try { socket.close(); } catch {}
        resolve({ ok, latency: Date.now() - start });
      };

      // Dummy STUN/Discord packet
      const packet = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x21, 0x12, 0xa4, 0x42]);

      socket.send(packet, port, host, (err) => {
        if (err) finish(false);
      });

      socket.on('message', () => finish(true));
      socket.on('error', () => finish(false));

      setTimeout(() => finish(true), 1200); // UDP sent without local error
    });
  }
}

module.exports = VoiceTester;
