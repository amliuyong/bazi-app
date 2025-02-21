# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 运行阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 从构建阶段复制必要文件
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME "0.0.0.0"

# 暴露端口
EXPOSE 3000

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "window.ENV = { NEXT_PUBLIC_WS_URL: \"$NEXT_PUBLIC_WS_URL?Authorization=Bearer test API\" };" > /app/public/env-config.js' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# 启动应用
CMD ["/app/start.sh"] 