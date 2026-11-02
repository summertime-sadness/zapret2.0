const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const readline = require('readline');

async function main() {
  const args = process.argv.slice(2);
  let repoUrl = args[0];
  let token = args[1];

  if (!repoUrl || !token) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) => new Promise(res => rl.question(q, res));

    if (!repoUrl) {
      repoUrl = await ask('Введите URL репозитория GitHub (например, https://github.com/username/zapret-2.0.git): ');
    }
    if (!token) {
      token = await ask('Введите ваш GitHub Personal Access Token (с правами repo): ');
    }
    rl.close();
  }

  repoUrl = repoUrl.trim();
  token = token.trim();

  if (!repoUrl || !token) {
    console.error('Ошибка: Не указан URL репозитория или токен.');
    process.exit(1);
  }

  console.log(`\nПодключение к ${repoUrl}...`);

  try {
    // 1. Configure remote
    await git.setConfig({
      fs,
      dir: '.',
      path: 'remote.origin.url',
      value: repoUrl
    });

    // 2. Push to main branch
    console.log('Отправка ветки main на GitHub...');
    const result = await git.push({
      fs,
      http,
      dir: '.',
      remote: 'origin',
      ref: 'main',
      force: false,
      onAuth: () => ({ username: token, password: '' })
    });

    if (result && result.ok) {
      console.log('✓ Проект успешно опубликован на GitHub!');
      console.log(`Репозиторий доступен по адресу: ${repoUrl.replace(/\.git$/, '')}`);
    } else {
      console.log('Результат отправки:', result);
    }
  } catch (err) {
    console.error('Ошибка при отправке в репозиторий:', err.message);
    if (err.data && err.data.response) {
      console.error('Ответ сервера:', err.data.response);
    }
    process.exit(1);
  }
}

main();
