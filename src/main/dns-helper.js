const { execSync, exec } = require('child_process');
const https = require('https');

class DnsHelper {
  constructor(zapretManager) {
    this.manager = zapretManager;
    this.providers = {
      cloudflare: { name: 'Cloudflare DNS', primary: '1.1.1.1', secondary: '1.0.0.1', desc: 'Максимальная скорость и приватность' },
      google: { name: 'Google Public DNS', primary: '8.8.8.8', secondary: '8.8.4.4', desc: 'Глобальная стабильность Google' },
      adguard: { name: 'AdGuard DNS', primary: '94.140.14.14', secondary: '94.140.15.15', desc: 'Блокировка рекламы и трекеров' },
      quad9: { name: 'Quad9 Security', primary: '9.9.9.9', secondary: '149.112.112.112', desc: 'Защита от фишинга и вредоносных сайтов' },
      dhcp: { name: 'По умолчанию (DHCP)', primary: '', secondary: '', desc: 'Автоматически от вашего роутера / провайдера' }
    };
  }

  getProviders() {
    return this.providers;
  }

  getCurrentDNS() {
    try {
      const psCmd = `Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 } | Select-Object -First 1 -ExpandProperty ServerAddresses`;
      const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8', windowsHide: true });
      const servers = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      return {
        servers,
        primary: servers[0] || 'DHCP',
        secondary: servers[1] || null
      };
    } catch (e) {
      return { servers: [], primary: 'Авто (DHCP)', secondary: null };
    }
  }

  async setDNS(providerKey) {
    const provider = this.providers[providerKey];
    if (!provider) throw new Error('Неизвестный провайдер DNS');

    const isElevated = this.manager.isElevated();
    if (!isElevated) {
      throw new Error('Для изменения системных настроек DNS требуются права Администратора');
    }

    try {
      if (providerKey === 'dhcp') {
        // Reset to DHCP
        const psCmd = `Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ResetServerAddresses }`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'ignore', windowsHide: true });
        this.manager.addLog('info', '[DNS] Системный DNS сброшен на автоматический (DHCP)');
      } else {
        const psCmd = `Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses ('${provider.primary}', '${provider.secondary}') }`;
        execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'ignore', windowsHide: true });
        this.manager.addLog('success', `[DNS] Установлен безопасный DNS: ${provider.name} (${provider.primary}, ${provider.secondary})`);
      }

      // Flush DNS cache after change
      try { execSync('ipconfig /flushdns', { stdio: 'ignore', windowsHide: true }); } catch {}

      return {
        success: true,
        provider: provider.name,
        current: this.getCurrentDNS()
      };
    } catch (e) {
      throw new Error(`Ошибка смены DNS: ${e.message}`);
    }
  }

  // Measure DNS latency via DNS-over-HTTPS probe
  testDnsLatency(ip) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const req = https.get(`https://${ip}/dns-query?name=cloudflare.com&type=A`, {
        timeout: 2500,
        headers: { 'Accept': 'application/dns-json' },
        rejectUnauthorized: false
      }, (res) => {
        res.resume();
        resolve(Date.now() - startTime);
      });
      req.on('error', () => resolve(9999));
      req.on('timeout', () => { req.destroy(); resolve(9999); });
    });
  }

  async testAllProviders() {
    const results = {};
    const testList = [
      { key: 'cloudflare', ip: '1.1.1.1' },
      { key: 'google', ip: '8.8.8.8' },
      { key: 'adguard', ip: '94.140.14.14' },
      { key: 'quad9', ip: '9.9.9.9' }
    ];

    await Promise.all(testList.map(async (item) => {
      const ping = await this.testDnsLatency(item.ip);
      results[item.key] = ping < 9999 ? ping : null;
    }));

    return results;
  }
}

module.exports = DnsHelper;
