#!/bin/bash
# enterprise-dev.sh - Linux/macOS 企业级开发环境管理脚本
# 使用 Docker Compose 管理多服务开发环境

set -euo pipefail

# 默认参数
COMMAND="${1:-start}"
PROJECT_NAME="${2:-}"
IMAGE_VERSION="${3:-frontend-env:latest}"
SERVICES="${4:-}"
USE_ENTERPRISE=true  # 默认使用企业级配置

# 颜色输出函数
print_info() { echo -e "\033[32m[INFO]\033[0m $1"; }
print_warn() { echo -e "\033[33m[WARN]\033[0m $1"; }
print_error() { echo -e "\033[31m[ERROR]\033[0m $1"; }
print_step() { echo -e "\033[34m[STEP]\033[0m $1"; }

# 设置环境变量
setup_environment() {
    local project_name=$1
    local image_version=$2
    
    print_step "设置环境变量..."
    
    # 基础用户信息
    export USER=$(whoami)
    export UID=$(id -u)
    export GID=$(id -g)
    export PROJECT_NAME=${project_name:-$(basename $PWD)}
    
    # Git 身份信息
    export GIT_AUTHOR_NAME=${GIT_AUTHOR_NAME:-$(git config user.name 2>/dev/null || echo $USER)}
    export GIT_AUTHOR_EMAIL=${GIT_AUTHOR_EMAIL:-$(git config user.email 2>/dev/null || echo "$USER@company.com")}
    export GIT_COMMITTER_NAME=${GIT_COMMITTER_NAME:-$GIT_AUTHOR_NAME}
    export GIT_COMMITTER_EMAIL=${GIT_COMMITTER_EMAIL:-$GIT_AUTHOR_EMAIL}
    
    # 镜像配置
    export DEV_IMAGE=${image_version}
    
    # 端口配置（可自定义避免冲突）
    export DEV_PORT_3000=${DEV_PORT_3000:-3000}
    export DEV_PORT_8080=${DEV_PORT_8080:-8080}
    export DEV_PORT_5173=${DEV_PORT_5173:-5173}
    export DEV_PORT_9000=${DEV_PORT_9000:-9000}
    export DEV_PORT_8000=${DEV_PORT_8000:-8000}
    
    # 数据库配置
    export DB_NAME=${DB_NAME:-"${PROJECT_NAME}_dev"}
    export DB_USER=${DB_USER:-developer}
    export DB_PASSWORD=${DB_PASSWORD:-"dev_password_$(date +%Y%m%d%H%M%S)"}
    export DB_PORT=${DB_PORT:-5432}
    
    # Redis 配置
    export REDIS_PORT=${REDIS_PORT:-6379}
    
    # MongoDB 配置
    export MONGO_USER=${MONGO_USER:-admin}
    export MONGO_PASSWORD=${MONGO_PASSWORD:-admin123}
    export MONGO_DB=${MONGO_DB:-"${PROJECT_NAME}_dev"}
    export MONGO_PORT=${MONGO_PORT:-27017}
    
    print_info "环境变量设置完成"
    print_info "用户: $USER"
    print_info "项目: $PROJECT_NAME"
    print_info "Git: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"
    print_info "镜像: $DEV_IMAGE"
}

# 显示配置信息
show_configuration() {
    echo ""
    echo -e "\033[36m=========================================\033[0m"
    echo -e "\033[36m 企业级开发环境配置\033[0m"
    echo -e "\033[36m=========================================\033[0m"
    echo "用户信息:"
    echo "  系统用户: $USER"
    echo "  Git 身份: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"
    echo ""
    echo "项目配置:"
    echo "  项目名称: $PROJECT_NAME"
    echo "  镜像版本: $DEV_IMAGE"
    echo ""
    echo "端口映射:"
    echo "  React/Next.js: $DEV_PORT_3000"
    echo "  Vue CLI: $DEV_PORT_8080"
    echo "  Vite: $DEV_PORT_5173"
    echo "  NestJS: $DEV_PORT_9000"
    echo "  备用端口: $DEV_PORT_8000"
    
    if [[ "$SERVICES" == *"redis"* ]]; then
        echo "  Redis: $REDIS_PORT"
    fi
    
    if [[ "$SERVICES" == *"database"* ]]; then
        echo "  PostgreSQL: $DB_PORT"
    fi
    
    if [[ "$SERVICES" == *"mongodb"* ]]; then
        echo "  MongoDB: $MONGO_PORT"
    fi
    
    echo -e "\033[36m=========================================\033[0m"
    echo ""
}

# 检查依赖
check_dependencies() {
    print_step "检查依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    
    # 检查 Docker 服务
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行"
        exit 1
    fi
    
    print_info "依赖检查通过"
}

# 检查并构建镜像
check_build_image() {
    local image_version=$1
    
    print_step "检查开发环境镜像..."
    
    # 检查镜像是否存在
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image_version$"; then
        print_warn "镜像 $image_version 不存在，开始构建..."
        
        # 检查 Dockerfile 是否存在
        if [ ! -f "Dockerfile" ]; then
            print_error "未找到 Dockerfile，无法构建镜像"
            print_info "请确保在项目根目录运行脚本"
            exit 1
        fi
        
        print_step "构建前端开发环境镜像..."
        print_info "执行命令: docker build -t $image_version ."
        
        # 构建镜像
        if docker build -t "$image_version" .; then
            print_info "镜像构建成功！"
        else
            print_error "镜像构建失败"
            exit 1
        fi
    else
        print_info "镜像 $image_version 已存在"
    fi
}

# 获取 Docker Compose 配置文件
get_compose_file() {
    local services=$1
    local use_enterprise=$2
    
    if [ "$use_enterprise" = true ]; then
        local compose_file="docker-compose.enterprise.yml"
        print_info "使用企业级配置: $compose_file"
    else
        local compose_file="docker-compose.yml"
        print_info "使用基础配置: $compose_file"
    fi
    
    # 检查配置文件是否存在
    if [ ! -f "$compose_file" ]; then
        print_error "Docker Compose 配置文件不存在: $compose_file"
        print_info "请确保在项目根目录运行脚本"
        exit 1
    fi
    
    echo "$compose_file"
}

# 启动服务
start_services() {
    local compose_file=$1
    local services=$2
    
    print_step "启动开发环境..."
    
    # 构建 Docker Compose 命令
    local compose_cmd="docker-compose -f $compose_file"
    
    # 检查是否支持新版本的 docker compose 命令
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose -f $compose_file"
    fi
    
    # 添加 profiles
    if [[ "$services" == *"redis"* ]]; then
        compose_cmd+=" --profile with-redis"
    fi
    
    if [[ "$services" == *"database"* ]]; then
        compose_cmd+=" --profile with-database"
    fi
    
    if [[ "$services" == *"mongodb"* ]]; then
        compose_cmd+=" --profile with-mongodb"
    fi
    
    # 启动服务
    compose_cmd+=" up -d"
    
    print_info "执行命令: $compose_cmd"
    eval $compose_cmd
    
    # 等待服务启动
    sleep 3
    
    # 显示服务状态
    if docker compose version &> /dev/null; then
        docker compose -f $compose_file ps
    else
        docker-compose -f $compose_file ps
    fi
}

# 进入开发容器
enter_container() {
    local compose_file=$1
    
    print_step "进入开发容器..."
    
    # 获取容器服务名
    local service_name="frontend-dev"
    
    # 检查容器是否运行
    local compose_cmd="docker-compose"
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    fi
    
    if ! $compose_cmd -f $compose_file exec $service_name echo "Container is running" &> /dev/null; then
        print_error "开发容器未运行，请先启动服务"
        print_info "使用命令: $0 start"
        exit 1
    fi
    
    # 进入容器
    $compose_cmd -f $compose_file exec $service_name bash
}

# 停止服务
stop_services() {
    local compose_file=$1
    
    print_step "停止开发环境..."
    
    if docker compose version &> /dev/null; then
        docker compose -f $compose_file down
    else
        docker-compose -f $compose_file down
    fi
    
    print_info "开发环境已停止"
}

# 清理数据
cleanup_data() {
    local compose_file=$1
    
    print_warn "这将删除所有开发数据和缓存"
    read -p "确认清理所有数据？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "清理开发数据..."
        
        if docker compose version &> /dev/null; then
            docker compose -f $compose_file down -v
        else
            docker-compose -f $compose_file down -v
        fi
        
        print_info "数据清理完成"
    else
        print_info "取消清理"
    fi
}

# 显示帮助
show_help() {
    echo "企业级开发环境管理脚本 (Linux/macOS 版本)"
    echo ""
    echo "用法: $0 [命令] [项目名称] [镜像版本] [服务列表] [选项]"
    echo ""
    echo "命令:"
    echo "  start       启动开发环境 (默认)"
    echo "  stop        停止开发环境"
    echo "  restart     重启开发环境"
    echo "  enter       进入开发容器"
    echo "  status      查看服务状态"
    echo "  logs        查看服务日志"
    echo "  cleanup     清理数据和缓存"
    echo "  -h, --help  显示帮助信息"
    echo ""
    echo "参数:"
    echo "  项目名称    可选，默认使用当前目录名"
    echo "  镜像版本    可选，默认使用 frontend-env:latest"
    echo "  服务列表    可选，逗号分隔: redis,database,mongodb"
    echo ""
    echo "环境变量:"
    echo "  USE_ENTERPRISE   使用企业级配置 (默认: true)"
    echo ""
    echo "配置文件:"
    echo "  docker-compose.enterprise.yml  # 企业级配置 (默认)"
    echo "  docker-compose.yml             # 基础配置"
    echo ""
    echo "示例:"
    echo "  $0                                    # 启动企业级环境"
    echo "  $0 start my-project                  # 指定项目名"
    echo "  $0 start my-project frontend-env:2.0 # 指定镜像版本"
    echo "  $0 start my-project latest redis     # 包含 Redis"
    echo "  USE_ENTERPRISE=false $0 start        # 使用基础配置"
    echo "  $0 enter                             # 进入容器"
    echo "  $0 stop                              # 停止服务"
    echo "  $0 cleanup                           # 清理数据"
    echo ""
    echo "环境变量:"
    echo "  DEV_PORT_3000    React/Next.js 端口 (默认: 3000)"
    echo "  DEV_PORT_8080    Vue CLI 端口 (默认: 8080)"
    echo "  DEV_PORT_5173    Vite 端口 (默认: 5173)"
    echo "  DEV_PORT_9000    NestJS 端口 (默认: 9000)"
    echo "  DB_PASSWORD      数据库密码 (自动生成)"
}

# 主函数
main() {
    local command=${1:-"start"}
    local project_name=${2}
    local image_version=${3}
    local services=${4:-""}
    
    # 设置全局变量
    export SERVICES="$services"
    USE_ENTERPRISE=${USE_ENTERPRISE:-true}
    
    case $command in
        start)
            check_dependencies
            check_build_image "$image_version"
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            show_configuration
            start_services "$compose_file" "$services"
            print_info "开发环境已启动，使用 '$0 enter' 进入容器"
            ;;
        stop)
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            stop_services "$compose_file"
            ;;
        restart)
            check_dependencies
            check_build_image "$image_version"
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            stop_services "$compose_file"
            sleep 2
            start_services "$compose_file" "$services"
            print_info "开发环境已重启，使用 '$0 enter' 进入容器"
            ;;
        enter)
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            enter_container "$compose_file"
            ;;
        status)
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            if docker compose version &> /dev/null; then
                docker compose -f "$compose_file" ps
            else
                docker-compose -f "$compose_file" ps
            fi
            ;;
        logs)
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            if docker compose version &> /dev/null; then
                docker compose -f "$compose_file" logs -f
            else
                docker-compose -f "$compose_file" logs -f
            fi
            ;;
        cleanup)
            setup_environment "$project_name" "$image_version"
            local compose_file=$(get_compose_file "$services" "$USE_ENTERPRISE")
            cleanup_data "$compose_file"
            ;;
        -h|--help|help)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 