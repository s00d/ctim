CTM

```markdown
# Проект

Это проект для работы с консольными командами 

## Установка

```bash
npm install ctm
```

## Команды

### Создание нового релиза release

```bash
ctm release --name <name> [--type <type>] [--count <count>] [--test] [--version <version>]
```

- `<name>`: Префикс имени тега.
- `<type>` (опционально): Тип обновления (major, minor или patch). По умолчанию: patch.
- `<count>` (опционально): Количество обновлений. По умолчанию: 1.
- `--test` (опционально): Флаг для обозначения тестового релиза.
- `--version` (опционально): Новая версия релиза.

Примеры использования:

```bash
npm run release --name feature --type minor --count 2
npm run release --name bugfix --test
npm run release --name release --version 1.2.3
```

## Лицензия

Этот проект лицензирован под MIT License. См. файл [LICENSE](./LICENSE) для получения дополнительной информации.
```
