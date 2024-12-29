import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Рекурсивный поиск файлов в папке.
 * @param dirPath Путь к папке.
 * @param extensions Допустимые расширения файлов.
 * @returns Список путей к файлам.
 */
function findIconsRecursively(dirPath: string, extensions: string[]): string[] {
  let results: string[] = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Рекурсивный вызов для подпапок
      results = results.concat(findIconsRecursively(fullPath, extensions));
    } else if (stat.isFile() && extensions.includes(path.extname(file).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.showIcons', async (uri: vscode.Uri) => {
    if (!uri) {
      vscode.window.showErrorMessage('Пожалуйста, выберите папку.');
      return;
    }

    const folderPath = uri.fsPath;

    // Поддерживаемые типы файлов
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.ico'];

    // Рекурсивно ищем все файлы-иконки
    const iconFiles = findIconsRecursively(folderPath, supportedExtensions);

    if (iconFiles.length === 0) {
      vscode.window.showInformationMessage('В выбранной папке и подпапках нет иконок.');
      return;
    }

    // Создаем веб-просмотр для отображения иконок
    const panel = vscode.window.createWebviewPanel(
      'folderIcons',
      'Icons viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(folderPath)] // Разрешаем доступ к выбранной папке
      }
    );

    // Формируем HTML для отображения иконок
    const iconHTML = iconFiles
      .map(file => {
        const iconUri = panel.webview.asWebviewUri(vscode.Uri.file(file));
        const relativePath = path.relative(folderPath, file);
        return `
          <div style="margin: 10px; text-align: center;">
            <img src="${iconUri}" alt="${relativePath}" style="max-width: 100px; max-height: 100px; display: block; margin: 0 auto;" />
            <span style="display: inline-block">${relativePath}</span>
          </div>
        `;
      })
      .join('');

			panel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Icons viewer</title>
				<style>
					/* Базовые стили */
					body {
						font-family: Arial, sans-serif;
						margin: 0;
						padding: 0;
						transition: color 0.3s ease, background-color 0.3s ease;
					}
			
					header {
						position: sticky;
						top: 0;
						display: flex;
						justify-content: center;
						align-items: center;
						gap: 20px;
						padding: 10px;
						background: #f4f4f9;
						border-bottom: 1px solid #ccc;
						color: black;
					}
			
					.container {
						display: grid;
						grid-template-columns: repeat(8, 1fr);
						gap: 15px;
						padding: 20px;
						transition: background-color 0.3s ease;
					}
			
					.icon-card {
						background: #fff;
						border-radius: 8px;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
						overflow: hidden;
						text-align: center;
						padding: 10px;
						transition: transform 0.2s ease, box-shadow 0.2s ease;
					}
			
					.icon-card:hover {
						transform: translateY(-5px);
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
					}
			
					.icon-card img {
						max-width: 100px;
						max-height: 100px;
						margin: 0 auto;
						display: block;
					}
			
					.icon-card span {
						display: block;
						margin-top: 10px;
						font-size: 14px;
						color: #555;
						word-wrap: break-word;
					}
			
					.controls label {
						font-size: 16px;
					}
			
					/* Стили для светлой темы */
					.light-theme .container {
						background-color: #f4f4f9;
						color: #333;
					}
			
					/* Стили для темной темы */
					.dark-theme .container {
						background-color: #333;
						color: #fff;
					}
				</style>
			</head>
			<body class="dark-theme">
				<header>
					<label><input type="radio" name="background" value="light"> Светлый</label>
					<label><input type="radio" name="background" value="dark" checked> Темный</label>
				</header>
				<div class="container">
					${iconHTML}
				</div>
				<script>
					const radios = document.querySelectorAll('input[name="background"]');
					const body = document.querySelector('body');
			
					// Слушатель для изменения темы
					radios.forEach(radio => {
						radio.addEventListener('change', (event) => {
							if (event.target.value === 'dark') {
								body.classList.remove('light-theme');
								body.classList.add('dark-theme');
							} else {
								body.classList.remove('dark-theme');
								body.classList.add('light-theme');
							}
						});
					});
				</script>
			</body>
			</html>
			`;
			
			
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
