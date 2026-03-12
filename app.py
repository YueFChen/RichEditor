import webview
import json
import os

# 配置文件路径
CONFIG_FILE = 'config.json'

class Api:
    def __init__(self):
        self.config = self.load_config_from_file()
    
    def load_config_from_file(self):
        """从文件加载配置"""
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"加载配置文件失败: {e}")
        # 默认配置
        return {
            "colors": [],
            "customColors": [],
            "symbols": {"未分类": []},
            "colorCategories": []
        }
    
    def save_config_to_file(self):
        """保存配置到文件"""
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存配置文件失败: {e}")
            return False
    
    def load_config(self):
        """加载配置API"""
        return self.config
    
    def save_config(self, config):
        """保存配置API"""
        self.config = config
        return self.save_config_to_file()

if __name__ == '__main__':
    api = Api()
    
    # 获取项目根目录
    # 将项目根目录定位到当前脚本所在目录（同级目录）
    project_root = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(project_root, 'RichEditor.html')
    
    # 创建窗口并注册API
    window = webview.create_window(
        '富文本编辑与调色工作台',
        html_file,
        width=1200,
        height=800,
        resizable=True,
        js_api=api
    )
    
    # 启动应用
    webview.start(debug=True)