# ================================
# 前端开发环境镜像 - 企业级配置
# 基于 Node.js 22 Alpine Linux
# 包含: pnpm, nrm, 常用开发工具
# ================================

# 使用官方 Node.js 22 Alpine 镜像作为基础镜像
# Alpine Linux 体积小，安全性高，适合生产环境
FROM node:22-alpine

# 设置镜像元数据
LABEL maintainer="Frontend Team"
LABEL version="1.0"
LABEL description="Frontend development environment with Node.js 22, pnpm, and development tools"

# 设置环境变量
ENV NODE_ENV=development
ENV SHELL=/bin/bash
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 设置工作目录
WORKDIR /root/app

# 安装系统依赖和开发工具
# bash: 提供更好的 shell 体验
# git: 版本控制工具
# curl: 网络请求工具
# vim: 文本编辑器
# openssh: SSH 客户端
RUN apk add --no-cache \
    bash \
    git \
    curl \
    vim \
    openssh-client \
    && rm -rf /var/cache/apk/*

# 启用 corepack 并配置 pnpm
# corepack 是 Node.js 官方的包管理器管理工具
RUN corepack enable pnpm

# 设置 pnpm 配置
# 配置 pnpm 使用淘宝镜像源以提高下载速度
RUN pnpm config set registry https://registry.npmmirror.com/ && \
    pnpm config set store-dir /root/.pnpm-store && \
    pnpm config set cache-dir /root/.pnpm-cache

# 全局安装核心开发工具（第一批）
# 包管理和源管理工具
RUN pnpm add -g \
    nrm@2.0.1 \
    cnpm@9.4.0

# 配置 nrm（检查是否已存在 taobao 源，如果不存在则添加）
RUN nrm ls | grep taobao || nrm add taobao https://registry.npmmirror.com/ && \
    nrm use taobao

# 全局安装 TypeScript 相关工具
RUN pnpm add -g \
    typescript@5.8.3 \
    ts-node@10.9.2 \
    tsx@4.19.4 \
    @types/node@22.15.29 \
    @types/react@19.1.6 \
    @types/react-dom@19.1.5

# 全局安装前端框架 CLI 工具
RUN pnpm add -g \
    @vue/cli@5.0.8 \
    @nestjs/cli@11.0.7 \
    create-react-app@5.1.0 \
    create-next-app@15.3.3 \
    create-vite@6.5.0

# 全局安装构建和打包工具
RUN pnpm add -g \
    vite@6.3.5 \
    webpack@5.99.9 \
    webpack-cli@5.1.4 \
    rollup@4.41.1 \
    gulp-cli@3.0.0

# 全局安装 CSS 处理工具
RUN pnpm add -g \
    sass@1.89.1 \
    postcss@8.5.4 \
    postcss-cli@11.0.1

# 全局安装开发和测试工具
RUN pnpm add -g \
    jest@29.7.0 \
    nodemon@3.1.10 \
    pm2 \
    eslint \
    prettier

# 设置 Git 全局配置（可选，用于容器内开发）
RUN git config --global init.defaultBranch master && \
    git config --global core.autocrlf false

# 创建 .bashrc 文件，提供更好的终端体验
RUN echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /root/.bashrc && \
    echo 'alias ll="ls -alF"' >> /root/.bashrc && \
    echo 'alias la="ls -A"' >> /root/.bashrc && \
    echo 'alias l="ls -CF"' >> /root/.bashrc && \
    echo 'alias ..="cd .."' >> /root/.bashrc && \
    echo 'alias ...="cd ../.."' >> /root/.bashrc && \
    echo 'alias pnpm-list="pnpm list -g --depth=0"' >> /root/.bashrc && \
    echo 'alias npm-check="nrm ls"' >> /root/.bashrc

# 验证安装的工具版本（可选，用于调试）
RUN echo "=== 安装的工具版本 ===" && \
    node --version && \
    pnpm --version && \
    npm --version && \
    echo "TypeScript: $(tsc --version)" && \
    echo "Vue CLI: $(vue --version)" && \
    echo "=== 安装完成 ==="

# 暴露常用的前端开发端口
# 3000: React/Next.js 默认端口
# 8080: Vue CLI 开发服务器
# 5173: Vite 默认端口
# 9000: NestJS 默认端口
EXPOSE 3000 8080 5173 9000

# 重置基础镜像的 ENTRYPOINT，解决 docker-entrypoint.sh 找不到的问题
ENTRYPOINT []

# 设置容器启动时的默认 shell
# 使用 bash 提供更好的交互体验
CMD ["/bin/bash"]

# ================================
# 构建说明:
# docker build -t frontend-env:1.0 .
# 
# 运行说明:
# docker run -it --rm -v $(pwd):/app -p 3000:3000 frontend-env:1.0
# 
# 挂载本地项目:
# docker run -it --rm -v /path/to/your/project:/app -p 3000:3000 frontend-env:1.0
# ================================