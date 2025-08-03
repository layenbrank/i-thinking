#!/bin/bash
# setup-aliases.sh - 企业级开发环境别名配置脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检测用户的 shell
detect_shell() {
    local user_shell=$(basename $SHELL)
    print_info "检测到 Shell: $user_shell"
    
    case $user_shell in
        bash)
            SHELL_RC="$HOME/.bashrc"
            SHELL_PROFILE="$HOME/.bash_profile"
            ;;
        zsh)
            SHELL_RC="$HOME/.zshrc"
            SHELL_PROFILE="$HOME/.zshrc"
            ;;
        fish)
            SHELL_RC="$HOME/.config/fish/config.fish"
            SHELL_PROFILE="$HOME/.config/fish/config.fish"
            ;;
        *)
            print_warn "未知的 Shell: $user_shell，使用默认 bash 配置"
            SHELL_RC="$HOME/.bashrc"
            SHELL_PROFILE="$HOME/.bash_profile"
            ;;
    esac
    
    export DETECTED_SHELL="$user_shell"
    export SHELL_RC_FILE="$SHELL_RC"
    print_info "配置文件: $SHELL_RC"
}

# 生成别名配置
generate_aliases() {
    print_step "生成别名配置..."
    
    cat > /tmp/dev-aliases.sh << 'EOF'
# ================================================
# 企业级前端开发环境别名配置
# 自动生成，请勿手动编辑此部分
# ================================================

# 获取脚本所在目录
DEV_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )/scripts"

# 开发容器管理
alias dev-start='bash $DEV_SCRIPTS_DIR/linux/dev-container.sh'
alias dev-stop='docker stop $(docker ps -q -f name="dev-$USER-*") 2>/dev/null || echo "没有运行的开发容器"'
alias dev-enter='docker exec -it dev-$USER-$(basename $PWD) bash 2>/dev/null || echo "容器未运行，请先启动"'
alias dev-ps='docker ps -f name="dev-$USER-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# 企业级环境管理
alias enterprise-start='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh start'
alias enterprise-stop='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh stop'
alias enterprise-enter='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh enter'
alias enterprise-status='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh status'
alias enterprise-logs='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh logs'
alias enterprise-cleanup='bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh cleanup'

# 快速项目创建
alias create-vue='dev-enter -c "pnpm create vue@latest"'
alias create-react='dev-enter -c "pnpm create react-app"'
alias create-next='dev-enter -c "pnpm create next-app"'
alias create-nest='dev-enter -c "nest new"'
alias create-vite='dev-enter -c "pnpm create vite"'

# 包管理器别名（在容器内执行）
alias dev-install='dev-enter -c "pnpm install"'
alias dev-run='dev-enter -c "pnpm run"'
alias dev-dev='dev-enter -c "pnpm dev"'
alias dev-build='dev-enter -c "pnpm build"'
alias dev-test='dev-enter -c "pnpm test"'

# Docker 管理
alias docker-clean='docker system prune -f && docker volume prune -f'
alias docker-clean-all='docker system prune -af && docker volume prune -f'
alias docker-logs='docker logs -f'

# 便捷函数
dev-project() {
    local project_name=${1:-$(basename $PWD)}
    local image_version=${2:-"frontend-env:latest"}
    
    echo "启动项目: $project_name"
    bash $DEV_SCRIPTS_DIR/linux/dev-container.sh "$project_name" "$image_version"
}

dev-compose() {
    local services=${1:-""}
    local project_name=${2:-$(basename $PWD)}
    
    echo "启动企业级环境: $project_name"
    if [ -n "$services" ]; then
        echo "包含服务: $services"
        bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh start "$project_name" "frontend-env:latest" "$services"
    else
        bash $DEV_SCRIPTS_DIR/linux/enterprise-dev.sh start "$project_name"
    fi
}

# 环境信息查看
dev-info() {
    echo "==============================================="
    echo " 开发环境信息"
    echo "==============================================="
    echo "用户: $(whoami)"
    echo "Git: $(git config user.name 2>/dev/null || echo '未配置') <$(git config user.email 2>/dev/null || echo '未配置')>"
    echo "Docker: $(docker --version 2>/dev/null || echo '未安装')"
    echo "Node.js: $(node --version 2>/dev/null || echo '未安装')"
    echo ""
    echo "运行中的容器:"
    docker ps -f name="dev-$USER-*" --format "  {{.Names}} ({{.Status}})" 2>/dev/null || echo "  无"
    echo ""
    echo "可用端口:"
    echo "  3000 - React/Next.js"
    echo "  8080 - Vue CLI"
    echo "  5173 - Vite"
    echo "  9000 - NestJS"
    echo "==============================================="
}

# 帮助信息
dev-help() {
    echo "企业级前端开发环境 - 命令参考"
    echo ""
    echo "容器管理:"
    echo "  dev-start           启动开发容器"
    echo "  dev-stop            停止所有开发容器"
    echo "  dev-enter           进入当前项目容器"
    echo "  dev-ps              查看开发容器状态"
    echo ""
    echo "企业级环境:"
    echo "  enterprise-start    启动企业级环境"
    echo "  enterprise-stop     停止企业级环境"
    echo "  enterprise-enter    进入企业级容器"
    echo "  enterprise-status   查看服务状态"
    echo "  enterprise-logs     查看服务日志"
    echo ""
    echo "项目创建:"
    echo "  create-vue          创建 Vue 项目"
    echo "  create-react        创建 React 项目"
    echo "  create-next         创建 Next.js 项目"
    echo "  create-nest         创建 NestJS 项目"
    echo ""
    echo "包管理:"
    echo "  dev-install         安装依赖"
    echo "  dev-run             运行脚本"
    echo "  dev-dev             启动开发服务器"
    echo "  dev-build           构建项目"
    echo "  dev-test            运行测试"
    echo ""
    echo "便捷函数:"
    echo "  dev-project [名称] [镜像]   启动指定项目"
    echo "  dev-compose [服务]          启动企业级环境"
    echo "  dev-info                    显示环境信息"
    echo ""
    echo "示例:"
    echo "  dev-project my-app                      # 启动项目"
    echo "  dev-compose \"redis,database\"           # 启动完整环境"
    echo "  enterprise-start my-app frontend-env:2.0 # 企业级启动"
}

# 导出函数
export -f dev-project dev-compose dev-info dev-help

echo "✅ 企业级开发环境别名已加载"
echo "💡 输入 'dev-help' 查看所有可用命令"

# ================================================
# 企业级前端开发环境别名配置结束
# ================================================
EOF

    print_info "别名配置已生成: /tmp/dev-aliases.sh"
}

# 配置到 shell RC 文件
install_to_shell() {
    local target_file="$1"
    
    print_step "安装别名到 $target_file..."
    
    # 检查是否已经配置过
    if grep -q "企业级前端开发环境别名配置" "$target_file" 2>/dev/null; then
        print_warn "别名配置已存在，正在更新..."
        
        # 删除旧配置
        sed -i '/# 企业级前端开发环境别名配置/,/# 企业级前端开发环境别名配置结束/d' "$target_file"
    fi
    
    # 添加新配置
    echo "" >> "$target_file"
    cat /tmp/dev-aliases.sh >> "$target_file"
    
    print_info "别名配置已添加到 $target_file"
}

# Fish shell 特殊处理
install_fish_config() {
    print_step "配置 Fish shell 别名..."
    
    # 创建 Fish 配置目录
    mkdir -p "$HOME/.config/fish/functions"
    
    # 生成 Fish 函数
    cat > "$HOME/.config/fish/functions/dev-start.fish" << 'EOF'
function dev-start
    bash (dirname (status -f))/../../scripts/linux/dev-container.sh $argv
end
EOF

    cat > "$HOME/.config/fish/functions/enterprise-start.fish" << 'EOF'
function enterprise-start
    bash (dirname (status -f))/../../scripts/linux/enterprise-dev.sh start $argv
end
EOF

    print_info "Fish shell 函数已创建"
}

# 主安装函数
main() {
    print_info "开始配置企业级开发环境别名..."
    
    # 检测 shell
    detect_shell
    
    # 生成别名配置
    generate_aliases
    
    # 根据不同 shell 进行配置
    case $DETECTED_SHELL in
        fish)
            install_fish_config
            install_to_shell "$SHELL_RC_FILE"
            ;;
        *)
            install_to_shell "$SHELL_RC_FILE"
            ;;
    esac
    
    # 清理临时文件
    rm -f /tmp/dev-aliases.sh
    
    print_info "✅ 别名配置完成！"
    print_warn "请重新加载 shell 配置或重新打开终端："
    
    case $DETECTED_SHELL in
        bash)
            echo "  source ~/.bashrc"
            ;;
        zsh)
            echo "  source ~/.zshrc"
            ;;
        fish)
            echo "  重新打开终端"
            ;;
        *)
            echo "  source $SHELL_RC_FILE"
            ;;
    esac
    
    echo ""
    print_info "配置完成后，输入 'dev-help' 查看所有可用命令"
}

# 显示帮助
show_help() {
    echo "企业级开发环境别名配置脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help  显示帮助信息"
    echo ""
    echo "功能:"
    echo "  ✓ 自动检测用户 shell (bash/zsh/fish)"
    echo "  ✓ 生成开发环境别名和函数"
    echo "  ✓ 配置到用户的 shell 配置文件"
    echo "  ✓ 提供便捷的开发命令"
    echo ""
    echo "将会添加的别名:"
    echo "  dev-start           启动开发容器"
    echo "  enterprise-start    启动企业级环境"
    echo "  create-vue          创建 Vue 项目"
    echo "  dev-info            显示环境信息"
    echo "  dev-help            显示帮助信息"
    echo ""
    echo "安装后重新加载 shell 配置即可使用。"
}

# 参数处理
case "${1:-}" in
    -h|--help|help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac 