ctim

```markdown
# Проект

Это проект для работы с консольными командами 

## Установка

```bash
npm install ctim
```

## Команды

### Создание нового релиза `release`

```bash
ctim release --name <name> [--type <type>] [--count <count>] [--test] [--version <version>]
```

- `<name>`: Префикс имени тега.
- `<type>` (опционально): Тип обновления (major, minor или patch). По умолчанию: patch.
- `<count>` (опционально): Количество обновлений. По умолчанию: 1.
- `--test` (опционально): Флаг для обозначения тестового релиза.
- `--version` (опционально): Новая версия релиза.

Примеры использования:

```bash
ctim release --name feature --type minor --count 2
ctim release --name bugfix --test
ctim release --name release --version 1.2.3
```

### Скачивание локалей `install-locales`

```bash
ctim install-locales --host example.com --dir custom/lang
```

Где:
- `<host>` - адрес хоста, с которого нужно загрузить локализации.
- `<dir>` - путь к директории, в которую будут сохранены локализации. По умолчанию, локализации сохраняются в папку `../src/lang` относительно текущей рабочей директории.


## Дополнительная информация

- Локализации загружаются с использованием API хоста, доступного по протоколу HTTPS.
- Локализации сохраняются в формате JSON с именем файла, соответствующим языковому коду локализации.
- Если размер загруженной локализации меньше 10000 байт, будет сгенерировано исключение.

### Команда `update-sublibs`


```shell
ctim update-sublibs
```

Команда `update-sublibs` автоматически анализирует файл `package.json` в текущем каталоге и проверяет наличие подмодулей, указанных в секции `sublibs`. Для каждого подмодуля она загружает новую версию из удаленного репозитория, распаковывает ее и обновляет соответствующую директорию в проекте.

#### Конфигурация

Команда `update-sublibs` использует информацию о подмодулях из файла `package.json`. В секции `sublibs` вам необходимо указать следующие поля для каждого подмодуля:

- `owner`: Имя владельца репозитория подмодуля.
- `repo`: Имя репозитория подмодуля.
- `tag`: Тег (версия) подмодуля, которую необходимо загрузить и установить.
- `dir`: Путь к директории, в которой находится подмодуль в вашем проекте.
- `name`: Имя подмодуля.
- `key`: Токен авторизации для доступа к удаленному репозиторию (если требуется).

Пример конфигурации `sublibs` в файле `package.json`:

```json
{
  "sublibs": [
    {
      "owner": "example",
      "repo": "submodule-1",
      "tag": "v1.0.0",
      "dir": "submodules",
      "name": "Submodule 1",
      "key": "your-github-token"
    },
    {
      "owner": "example",
      "repo": "submodule-2",
      "tag": "v2.1.0",
      "dir": "submodules",
      "name": "Submodule 2",
      "key": "your-github-token"
    }
  ]
}
```

Убедитесь, что указанные директории существуют в вашем проекте перед запуском команды `update-sublibs`.



## Лицензия

Этот проект лицензирован под MIT License. См. файл [LICENSE](./LICENSE) для получения дополнительной информации.
```
