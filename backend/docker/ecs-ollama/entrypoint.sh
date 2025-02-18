#!/bin/bash

# 启动 Ollama 服务
ollama serve &

# 等待服务启动
sleep 10

# 拉取 deepseek-r1 模型
ollama pull deepseek-coder:6.7b

# 保持容器运行
tail -f /dev/null
 