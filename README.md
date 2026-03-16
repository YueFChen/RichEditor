# RichEditor - 富文本编辑器

一个功能丰富的富文本编辑器，支持文本格式化、颜色管理和符号库功能。

## 功能特性

- **文本格式化**：支持加粗、斜体、字号调整、颜色设置等
- **颜色管理**：
  - RGB颜色滑块调节
  - HEX颜色输入
  - 颜色选择器
  - 屏幕取色功能
  - 颜色库管理（分类、保存、拖拽排序）
- **符号库**：提供特殊符号的管理和插入功能
- **实时预览**：实时显示编辑内容的效果，支持自定义背景

## 项目结构

```
RichEditor/
├── RichEditor.html      # 主HTML文件
├── frontend/            # 前端资源
│   ├── css/            # 样式文件
│   │   └── style.css   # 主样式文件
│   └── js/             # JavaScript文件
│       └── app.js      # 主应用逻辑
├── .gitignore          # Git忽略文件
└── README.md           # 项目说明文件
```

## 技术栈

- **前端**：HTML5, CSS3, JavaScript
- **后端**：Python (可选，用于配置文件管理)
- **桌面应用**：PyWebView (可选，用于打包为桌面应用)

## 使用方法

### 直接在浏览器中打开

1. 克隆或下载项目到本地
2. 直接打开 `RichEditor.html` 文件即可在浏览器中使用

### 作为桌面应用运行

1. 安装依赖：`pip install pywebview`
2. 创建后端Python文件（参考示例代码）
3. 运行后端代码启动应用

## 开发说明

### 前端开发

- HTML结构：`RichEditor.html` 包含页面布局
- CSS样式：`frontend/css/style.css` 定义页面样式
- JavaScript逻辑：`frontend/js/app.js` 实现核心功能

### 后端开发

后端使用Python和PyWebView，主要负责：
- 配置文件的加载和保存
- 提供本地文件系统访问能力

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
