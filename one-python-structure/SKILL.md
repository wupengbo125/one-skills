---
name: one-python-structure
description: 创建标准的 Python 工具子项目。采用 YAML 配置驱动与三件套结构 (<script.py> + config.yaml + readme.md)。
argument-hint: "子项目名称，以及要实现的 Python 功能描述"
disable-model-invocation: true
---

# Build Python Project (one-python-structure)

根据用户指令，在指定目录下初始化或构建标准的 Python 工具子项目。

## 架构规范（标准三件套）

每一个 Python 工具项目必须遵循以下三件套结构：
1. **`<script.py>`**（脚本逻辑主程序）：核心逻辑代码。默认读取当前目录下的 `config.yaml`，同时必须支持通过 `--config` 参数指定其他配置文件路径（如 `--config custom.yaml`，未指定时自动回退为默认 `config.yaml`），且保留 CLI 参数覆盖能力。
2. **`config.yaml`**（核心驱动配置）：默认配置文件，存放项目的所有运行参数、路径配置与默认值。
3. **`readme.md`**（项目说明文档）：**文件名必须严格全小写 `readme.md`**（严禁使用 `README.md`）。记录项目定位、配置项说明与 `uv run` 运行指令。

## 核心开发准则

- **包管理与运行**：优先使用 `uv`，运行与测试统一使用 `uv run <script.py>` 代替直接调用 `python`。
- **配置驱动**：以 `config.yaml` 为核心驱动，代码默认读取 YAML 配置，并提供 CLI 参数重载。
- **临时文件控制**：临时文件与目录必须在当前项目路径内部创建（如 `./.tmp/`），并在使用完毕后立即清理删除。
- **代码至简**：拒绝兜底方案与投机性防御代码，用最少的代码精准解决问题。

## 流程

1. **前置实施准则**：调用 `/one-minimal-implement`，在整个项目构建过程中贯彻极简代码与 0->1 精准交付规范。
2. **结构初始化**：在目标路径下创建项目文件夹，建立标准三件套：`<script.py>`、`config.yaml`、全小写 `readme.md`。
3. **构建 YAML 配置**：编写 `config.yaml`，将核心运行参数与默认值结构化写入。
4. **实现脚本逻辑**：编写 `<script.py>`，核心逻辑由 `config.yaml` 驱动，同时暴露 `--config` 参数接口。
5. **编写说明文档**：编写全小写 `readme.md`，记录配置说明与 `uv run <script.py>` 运行范例。
6. **验证运行**：
   - **完成标准**：运行 `uv run <script.py>` 成功执行并产生预期输出，三件套文件均已就绪且格式符合规范。
