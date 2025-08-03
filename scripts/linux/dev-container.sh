#!/bin/bash
# dev-container.sh - 企业级开发容器启动脚本
# 支持Git身份管理和SSH密钥挂载

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 获取用户信息
detect_user_identity() {
    print_step "检测用户身份..."
    
    # 系统用户信息
    export SYSTEM_USER=$(whoami)
    export USER_ID=$(id -u)
    export GROUP_ID=$(id -g)
    export USER_HOME=${HOME}
    
    # Git 身份信息
    export GIT_AUTHOR_NAME=$(git config user.name 2>/dev/null || git config --global user.name 2>/dev/null || echo "$SYSTEM_USER")
    export GIT_AUTHOR_EMAIL=$(git config user.email 2>/dev/null || git config --global user.email 2>/dev/null || echo "$SYSTEM_USER@company.com")
    export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
    export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
    
    print_info "系统用户: $SYSTEM_USER ($USER_ID:$GROUP_ID)"
    print_info "Git 身份: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"
}

# 检测 SSH 密钥
detect_ssh_keys() {
    print_step "检测 SSH 密钥..."
    
    SSH_DIR="${USER_HOME}/.ssh"
    
    if [ ! -d "$SSH_DIR" ]; then
        print_error "SSH 目录不存在: $SSH_DIR"
        return 1
    fi
    
    # 常见的 SSH 密钥文件
    SSH_KEYS=(
        "id_rsa"
        "id_ed25519" 
        "id_ecdsa"
        "id_rsa_company"
        "id_ed25519_company"
        "id_rsa_github"
        "id_ed25519_github"
    )
    
    FOUND_KEYS=()
    
    for key in "${SSH_KEYS[@]}"; do
        if [ -f "${SSH_DIR}/${key}" ]; then
            FOUND_KEYS+=("${key}")
            print_info "发现 SSH 密钥: ${key}"
        fi
    done
    
    if [ ${#FOUND_KEYS[@]} -eq 0 ]; then
        print_warn "未发现常见的 SSH 密钥文件"
        print_info "检查 SSH 目录内容:"
        ls -la "$SSH_DIR" 2>/dev/null || print_error "无法读取 SSH 目录"
    else
        print_info "发现 ${#FOUND_KEYS[@]} 个 SSH 密钥文件"
    fi
    
    export SSH_KEY_DIR="$SSH_DIR"
    return 0
}

# 检测 SSH Agent
detect_ssh_agent() {
    print_step "检测 SSH Agent..."
    
    if [ -n "$SSH_AUTH_SOCK" ] && [ -S "$SSH_AUTH_SOCK" ]; then
        print_info "检测到 SSH Agent: $SSH_AUTH_SOCK"
        export USE_SSH_AGENT=true
    else
        print_warn "未检测到 SSH Agent，将直接挂载密钥文件"
        print_info "可运行 'ssh-agent' 和 'ssh-add' 来启用 SSH Agent"
        export USE_SSH_AGENT=false
    fi
}

# 生成容器名称
generate_container_name() {
    local project_name=${1:-$(basename $PWD)}
    export CONTAINER_NAME="dev-${SYSTEM_USER}-${project_name}"
    export PROJECT_NAME="$project_name"
    print_info "容器名称: $CONTAINER_NAME"
}

# 检查容器是否已存在
check_existing_container() {
    if [ "$(docker ps -aq -f name="^${CONTAINER_NAME}$")" ]; then
        print_warn "容器 '$CONTAINER_NAME' 已存在"
        
        if [ "$(docker ps -q -f name="^${CONTAINER_NAME}$")" ]; then
            print_info "容器正在运行，直接进入..."
            docker exec -it $CONTAINER_NAME bash
            exit 0
        else
            print_info "启动已存在的容器..."
            docker start $CONTAINER_NAME
            docker exec -it $CONTAINER_NAME bash
            exit 0
        fi
    fi
}

# 构建 Docker 命令
build_docker_command() {
    local image_name=${1:-"frontend-env:latest"}
    
    print_step "构建 Docker 启动命令..."
    
    DOCKER_CMD="docker run -it"
    
    # 容器名称和主机名
    DOCKER_CMD+=" --name $CONTAINER_NAME"
    DOCKER_CMD+=" --hostname $CONTAINER_NAME"
    
    # 用户身份映射（Windows 环境下可能需要调整）
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        print_info "Windows 环境，使用 root 用户"
    else
        DOCKER_CMD+=" --user $USER_ID:$GROUP_ID"
    fi
    
    # 工作目录挂载
    DOCKER_CMD+=" -v \$(pwd):/root/app"
    DOCKER_CMD+=" -w /root/app"
    
    # SSH 配置挂载
    if [ -d "$SSH_KEY_DIR" ]; then
        DOCKER_CMD+=" -v \"$SSH_KEY_DIR\":/root/.ssh:ro"
        print_info "挂载 SSH 目录: $SSH_KEY_DIR"
    fi
    
    # SSH Agent 挂载（Linux/macOS）
    if [ "$USE_SSH_AGENT" = "true" ] && [[ ! "$OSTYPE" =~ ^(msys|win32) ]]; then
        DOCKER_CMD+=" -v \"$SSH_AUTH_SOCK\":/ssh-agent"
        DOCKER_CMD+=" -e SSH_AUTH_SOCK=/ssh-agent"
        print_info "挂载 SSH Agent"
    fi
    
    # Git 配置挂载
    if [ -f "$USER_HOME/.gitconfig" ]; then
        DOCKER_CMD+=" -v \"$USER_HOME/.gitconfig\":/root/.gitconfig:ro"
        print_info "挂载 Git 配置"
    fi
    
    # 缓存目录挂载
    DOCKER_CMD+=" -v dev-cache-$SYSTEM_USER:/root/.cache"
    DOCKER_CMD+=" -v dev-pnpm-$SYSTEM_USER:/root/.pnpm-store"
    
    # 环境变量
    DOCKER_CMD+=" -e USER=$SYSTEM_USER"
    DOCKER_CMD+=" -e GIT_AUTHOR_NAME='$GIT_AUTHOR_NAME'"
    DOCKER_CMD+=" -e GIT_AUTHOR_EMAIL='$GIT_AUTHOR_EMAIL'"
    DOCKER_CMD+=" -e GIT_COMMITTER_NAME='$GIT_COMMITTER_NAME'"
    DOCKER_CMD+=" -e GIT_COMMITTER_EMAIL='$GIT_COMMITTER_EMAIL'"
    
    # 端口映射
    DOCKER_CMD+=" -p 3000:3000 -p 8080:8080 -p 5173:5173 -p 9000:9000"
    
    # 镜像
    DOCKER_CMD+=" $image_name"
    
    export DOCKER_COMMAND="$DOCKER_CMD"
}

# 验证环境
verify_environment() {
    print_step "验证环境..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装或未在 PATH 中"
        exit 1
    fi
    
    # 检查 Docker 服务
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
    
    print_info "Docker 环境正常"
}

# 显示启动信息
show_startup_info() {
    echo ""
    echo "=========================================="
    echo " 企业级开发容器启动信息"
    echo "=========================================="
    echo "  用户: $SYSTEM_USER ($USER_ID:$GROUP_ID)"
    echo "  Git: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"
    echo "  SSH: $([ "$USE_SSH_AGENT" = "true" ] && echo "Agent + 密钥文件" || echo "密钥文件")"
    echo "  项目: $PROJECT_NAME"
    echo "  容器: $CONTAINER_NAME"
    echo "  镜像: ${1:-frontend-env:latest}"
    echo "  端口: 3000, 8080, 5173, 9000"
    echo "=========================================="
    echo ""
}

# 容器内验证脚本
setup_container_verification() {
    print_step "设置容器内验证..."
    
    # 创建验证脚本
    cat > /tmp/verify-container.sh << 'EOF'
#!/bin/bash
echo "=========================================="
echo " 容器内环境验证"
echo "=========================================="
echo "用户: $(whoami)"
echo "工作目录: $(pwd)"
echo "Node.js: $(node --version 2>/dev/null || echo '未安装')"
echo "pnpm: $(pnpm --version 2>/dev/null || echo '未安装')"
echo ""
echo "Git 配置:"
echo "  姓名: $(git config user.name 2>/dev/null || echo '未配置')"
echo "  邮箱: $(git config user.email 2>/dev/null || echo '未配置')"
echo ""
echo "SSH 状态:"
if [ -d ~/.ssh ]; then
    echo "  SSH 目录: $(ls -la ~/.ssh 2>/dev/null | wc -l) 个文件"
    if command -v ssh-add &> /dev/null; then
        echo "  SSH Agent: $(ssh-add -l 2>/dev/null | wc -l) 个密钥"
    fi
else
    echo "  SSH 目录: 不存在"
fi
echo ""
echo "可用命令:"
echo "  pnpm create vue@latest    # 创建 Vue 项目"
echo "  pnpm create react-app     # 创建 React 项目"
echo "  pnpm create next-app      # 创建 Next.js 项目"
echo "  nest new                  # 创建 NestJS 项目"
echo "=========================================="
EOF
    
    chmod +x /tmp/verify-container.sh
}

# 清理函数
cleanup() {
    if [ -f /tmp/verify-container.sh ]; then
        rm -f /tmp/verify-container.sh
    fi
}

# 主函数
main() {
    local project_name=${1}
    local image_name=${2:-"frontend-env:latest"}
    
    print_info "启动企业级开发容器..."
    
    # 验证环境
    verify_environment
    
    # 检测身份和密钥
    detect_user_identity
    detect_ssh_keys
    detect_ssh_agent
    
    # 生成容器配置
    generate_container_name "$project_name"
    
    # 检查已存在的容器
    check_existing_container
    
    # 构建启动命令
    build_docker_command "$image_name"
    
    # 显示启动信息
    show_startup_info "$image_name"
    
    # 设置验证脚本
    setup_container_verification
    
    # 确认启动
    read -p "确认启动容器？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "取消启动"
        exit 0
    fi
    
    # 执行 Docker 命令
    print_info "启动容器..."
    echo "执行命令: $DOCKER_COMMAND"
    echo ""
    
    # 在容器启动后运行验证
    eval $DOCKER_COMMAND bash -c "/tmp/verify-container.sh 2>/dev/null || echo '验证脚本未运行'; exec bash"
}

# 帮助信息
show_help() {
    echo "企业级开发容器启动脚本"
    echo ""
    echo "用法: $0 [选项] [项目名称] [镜像名称]"
    echo ""
    echo "参数:"
    echo "  项目名称    可选，默认使用当前目录名"
    echo "  镜像名称    可选，默认使用 frontend-env:latest"
    echo ""
    echo "选项:"
    echo "  -h, --help  显示帮助信息"
    echo "  -v, --verify 仅验证环境，不启动容器"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认设置"
    echo "  $0 my-project                        # 指定项目名称"
    echo "  $0 my-project frontend-env:2.0       # 指定项目名和镜像"
    echo ""
    echo "环境要求:"
    echo "  - Docker 已安装并运行"
    echo "  - Git 已配置用户名和邮箱 (可选)"
    echo "  - SSH 密钥存在于 ~/.ssh/ 目录 (可选)"
    echo ""
    echo "功能特性:"
    echo "  ✓ 自动检测 Git 身份"
    echo "  ✓ 安全挂载 SSH 密钥"
    echo "  ✓ 支持 SSH Agent"
    echo "  ✓ 缓存目录持久化"
    echo "  ✓ 多端口映射"
    echo "  ✓ 容器状态检查"
}

# 仅验证环境
verify_only() {
    print_info "仅验证环境模式"
    verify_environment
    detect_user_identity
    detect_ssh_keys
    detect_ssh_agent
    print_info "环境验证完成"
}

# 信号处理
trap cleanup EXIT

# 参数处理
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
    -v|--verify)
        verify_only
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 