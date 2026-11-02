const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const portableDir = path.join(distDir, 'ZAPRET-2.0-Portable');
const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');
const outputZip = path.join(rootDir, 'ZAPRET-2.0-Portable.zip');

console.log('=== Сборка автономной портативной версии ZAPRET 2.0 ===');

// 1. Clean previous build
if (fs.existsSync(portableDir)) {
  console.log('Очистка предыдущей сборки...');
  fs.rmSync(portableDir, { recursive: true, force: true });
}
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}
fs.mkdirSync(portableDir, { recursive: true });

// 2. Helper to copy directories recursively
function copyRecursive(src, dest, ignore = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath, ignore);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy Electron Dist (excluding default_app.asar and unnecessary heavy license dump)
console.log('Копирование среды выполнения Electron...');
copyRecursive(electronDist, portableDir, ['default_app.asar', 'LICENSES.chromium.html']);

// 4. Rename electron.exe -> ZAPRET-2.0.exe
const oldExe = path.join(portableDir, 'electron.exe');
const newExe = path.join(portableDir, 'ZAPRET-2.0.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
  console.log('Создан исполняемый файл ZAPRET-2.0.exe');
}

// 5. Clean default_app.asar from resources if present
const defaultAppAsar = path.join(portableDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAppAsar)) {
  fs.unlinkSync(defaultAppAsar);
}

// 6. Copy App source into resources/app/
console.log('Копирование исходных файлов приложения в resources/app...');
const appDest = path.join(portableDir, 'resources', 'app');
fs.mkdirSync(appDest, { recursive: true });

// Copy package.json
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appDest, 'package.json'));

// Copy src
copyRecursive(path.join(rootDir, 'src'), path.join(appDest, 'src'));

// Copy assets
copyRecursive(path.join(rootDir, 'assets'), path.join(appDest, 'assets'));

// 7. Copy zapret folder directly next to ZAPRET-2.0.exe (clean without git/junk files)
console.log('Копирование ядра Zapret (winws, WinDivert, пресеты, списки)...');
const zapretDest = path.join(portableDir, 'zapret');
copyRecursive(path.join(rootDir, 'zapret'), zapretDest, [
  '.github',
  '.git',
  '.gitignore',
  '.gitattributes',
  'utils',
  'ipset-all.txt.backup',
  '.run_temp.bat'
]);

// 8. Create silent admin launcher in portable folder (zero command prompt)
const vbsContent = `Set UAC = CreateObject("Shell.Application")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\\ZAPRET-2.0.exe"
UAC.ShellExecute exe, "", dir, "runas", 1
`;
fs.writeFileSync(path.join(portableDir, 'Запуск ZAPRET 2.0.vbs'), vbsContent, 'utf8');
fs.writeFileSync(path.join(portableDir, 'Start-Zapret.vbs'), vbsContent, 'utf8');

// Also create a README inside portable folder
const portableReadme = `# ⚡ ZAPRET 2.0 Portable

Автономная портативная версия для запуска с любого накопителя / флешки на любых компьютерах с Windows 10/11.

## Запуск:
Дважды нажмите на:
- **Запуск ZAPRET 2.0.vbs** (запуск с повышенными правами Администратора без открытия командной строки)
- или напрямую на **ZAPRET-2.0.exe**

При запуске командная строка не появляется. Сторонних программ (Node.js, npm, Python) устанавливать не требуется!
`;
fs.writeFileSync(path.join(portableDir, 'README.txt'), portableReadme, 'utf8');

// 9. Create Zip Archive
console.log('Создание портативного ZIP-архива...');
try {
  const psArchiveCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${portableDir}\\*' -DestinationPath '${outputZip}' -CompressionLevel Optimal -Force"`;
  execSync(psArchiveCmd, { stdio: 'inherit' });
  const stats = fs.statSync(outputZip);
  console.log(`ZIP-архив успешно создан: ${outputZip} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
} catch (e) {
  console.error('Ошибка создания архива:', e.message);
}

console.log('=== Сборка успешно завершена! ===');
