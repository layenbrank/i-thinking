# enterprise-dev.ps1 - Windows PowerShell 企业级开发环境管理脚本
# 使用 Docker Compose 管理多服务开发环境

param(
    [ValidateSet("start", "stop", "restart", "enter", "status", "logs", "cleanup", "help")]
    [string]$Command = "start",
    [string]$ProjectName = "",
    [string]$ImageVersion = "frontend-env:latest",
    [string]$Services = "",
    [switch]$Enterprise = $true,  # 默认使用企业级配置
    [switch]$Help
)

# 颜色输出函数
function Write-Info { 
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green 
}

function Write-Warn { 
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red 
}

function Write-Step { 
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Blue 
}

# 设置环境变量
function Set-Environment {
    param(
        [string]$ProjectName,
        [string]$ImageVersion
    )
    
    Write-Step "设置环境变量..."
    
    # 基础用户信息
    $env:USER = $env:USERNAME
    $env:PROJECT_NAME = if ($ProjectName) { $ProjectName } else { Split-Path -Leaf (Get-Location) }
    
    # 设置 HOME 环境变量 (Windows 下通常是 USERPROFILE)
    if (-not $env:HOME) { 
        $env:HOME = $env:USERPROFILE 
    }
    
    # Git 身份信息
    try {
        $env:GIT_AUTHOR_NAME = & git config user.name 2>$null
        if (-not $env:GIT_AUTHOR_NAME) {
            $env:GIT_AUTHOR_NAME = & git config --global user.name 2>$null
        }
        if (-not $env:GIT_AUTHOR_NAME) {
            $env:GIT_AUTHOR_NAME = $env:USER
        }
    }
    catch {
        $env:GIT_AUTHOR_NAME = $env:USER
    }
    
    try {
        $env:GIT_AUTHOR_EMAIL = & git config user.email 2>$null
        if (-not $env:GIT_AUTHOR_EMAIL) {
            $env:GIT_AUTHOR_EMAIL = & git config --global user.email 2>$null
        }
        if (-not $env:GIT_AUTHOR_EMAIL) {
            $env:GIT_AUTHOR_EMAIL = "$env:USER@company.com"
        }
    }
    catch {
        $env:GIT_AUTHOR_EMAIL = "$env:USER@company.com"
    }
    
    $env:GIT_COMMITTER_NAME = $env:GIT_AUTHOR_NAME
    $env:GIT_COMMITTER_EMAIL = $env:GIT_AUTHOR_EMAIL
    
    # 镜像配置
    $env:DEV_IMAGE = $ImageVersion
    
    # 端口配置（可自定义避免冲突）
    if (-not $env:DEV_PORT_3000) { $env:DEV_PORT_3000 = "3000" }
    if (-not $env:DEV_PORT_8080) { $env:DEV_PORT_8080 = "8080" }
    if (-not $env:DEV_PORT_5173) { $env:DEV_PORT_5173 = "5173" }
    if (-not $env:DEV_PORT_9000) { $env:DEV_PORT_9000 = "9000" }
    if (-not $env:DEV_PORT_8000) { $env:DEV_PORT_8000 = "8000" }
    
    # 数据库配置
    if (-not $env:DB_NAME) { $env:DB_NAME = "$($env:PROJECT_NAME)_dev" }
    if (-not $env:DB_USER) { $env:DB_USER = "developer" }
    if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = "dev_password_$(Get-Date -Format 'yyyyMMddHHmmss')" }
    if (-not $env:DB_PORT) { $env:DB_PORT = "5432" }
    
    # Redis 配置
    if (-not $env:REDIS_PORT) { $env:REDIS_PORT = "6379" }
    
    # MongoDB 配置
    if (-not $env:MONGO_USER) { $env:MONGO_USER = "admin" }
    if (-not $env:MONGO_PASSWORD) { $env:MONGO_PASSWORD = "admin123" }
    if (-not $env:MONGO_DB) { $env:MONGO_DB = "$($env:PROJECT_NAME)_dev" }
    if (-not $env:MONGO_PORT) { $env:MONGO_PORT = "27017" }
    
    Write-Info "环境变量设置完成"
    Write-Info "用户: $env:USER"
    Write-Info "项目: $env:PROJECT_NAME"
    Write-Info "Git: $env:GIT_AUTHOR_NAME <$env:GIT_AUTHOR_EMAIL>"
    Write-Info "镜像: $env:DEV_IMAGE"
}

# 显示配置信息
function Show-Configuration {
    param([string]$Services)
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host " 企业级开发环境配置" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "用户信息:"
    Write-Host "  系统用户: $env:USER"
    Write-Host "  Git 身份: $env:GIT_AUTHOR_NAME <$env:GIT_AUTHOR_EMAIL>"
    Write-Host ""
    Write-Host "项目配置:"
    Write-Host "  项目名称: $env:PROJECT_NAME"
    Write-Host "  镜像版本: $env:DEV_IMAGE"
    Write-Host ""
    Write-Host "端口映射:"
    Write-Host "  React/Next.js: $env:DEV_PORT_3000"
    Write-Host "  Vue CLI: $env:DEV_PORT_8080"
    Write-Host "  Vite: $env:DEV_PORT_5173"
    Write-Host "  NestJS: $env:DEV_PORT_9000"
    Write-Host "  备用端口: $env:DEV_PORT_8000"
    
    if ($Services -like "*redis*") {
        Write-Host "  Redis: $env:REDIS_PORT"
    }
    
    if ($Services -like "*database*") {
        Write-Host "  PostgreSQL: $env:DB_PORT"
    }
    
    if ($Services -like "*mongodb*") {
        Write-Host "  MongoDB: $env:MONGO_PORT"
    }
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

# 检查依赖
function Test-Dependencies {
    Write-Step "检查依赖..."
    
    # 检查 Docker
    try {
        $null = & docker --version 2>$null
    }
    catch {
        Write-Error "Docker 未安装"
        Write-Info "请安装 Docker Desktop for Windows"
        exit 1
    }
    
    # 检查 Docker Compose
    try {
        $null = & docker compose version 2>$null
    }
    catch {
        try {
            $null = & docker-compose --version 2>$null
        }
        catch {
            Write-Error "Docker Compose 未安装"
            exit 1
        }
    }
    
    # 检查 Docker 服务
    try {
        $null = & docker info 2>$null
    }
    catch {
        Write-Error "Docker 服务未运行"
        Write-Info "请启动 Docker Desktop"
        exit 1
    }
    
    Write-Info "依赖检查通过"
}

# 检查并构建镜像
function Test-BuildImage {
    param([string]$ImageVersion)
    
    Write-Step "检查开发环境镜像..."
    
    # 检查镜像是否存在
    try {
        $imageExists = & docker images --format "{{.Repository}}:{{.Tag}}" | Select-String -Pattern "^$([regex]::Escape($ImageVersion))$" -Quiet
        if (-not $imageExists) {
            Write-Warn "镜像 $ImageVersion 不存在，开始构建..."
            
            # 检查 Dockerfile 是否存在
            if (-not (Test-Path "Dockerfile")) {
                Write-Error "未找到 Dockerfile，无法构建镜像"
                Write-Info "请确保在项目根目录运行脚本"
                exit 1
            }
            
            Write-Step "构建前端开发环境镜像..."
            Write-Info "执行命令: docker build -t $ImageVersion ."
            
            # 构建镜像
            & docker build -t $ImageVersion .
            
            if ($LASTEXITCODE -eq 0) {
                Write-Info "镜像构建成功！"
            } else {
                Write-Error "镜像构建失败"
                exit 1
            }
        } else {
            Write-Info "镜像 $ImageVersion 已存在"
        }
    }
    catch {
        Write-Error "检查镜像时出错: $_"
        exit 1
    }
}

# 获取 Docker Compose 配置文件
function Get-ComposeFile {
    param([string]$Services, [switch]$Enterprise)
    
    if ($Enterprise) {
        $composeFile = "docker-compose.enterprise.yml"
        Write-Info "使用企业级配置: $composeFile"
    } else {
        $composeFile = "docker-compose.yml"
        Write-Info "使用基础配置: $composeFile"
    }
    
    # 检查配置文件是否存在
    if (-not (Test-Path $composeFile)) {
        Write-Error "Docker Compose 配置文件不存在: $composeFile"
        Write-Info "请确保在项目根目录运行脚本"
        exit 1
    }
    
    return $composeFile
}

# 启动服务
function Start-Services {
    param(
        [string]$ComposeFile,
        [string]$Services = ""
    )
    
    Write-Step "启动开发环境..."
    
    # 构建 Docker Compose 命令参数
    $composeArgs = @("-f", $ComposeFile)
    
    # 添加 profiles (如果需要)
    if ($Services -like "*redis*") {
        $composeArgs += "--profile", "with-redis"
    }
    
    if ($Services -like "*database*") {
        $composeArgs += "--profile", "with-database"
    }
    
    if ($Services -like "*mongodb*") {
        $composeArgs += "--profile", "with-mongodb"
    }
    
    # 添加启动命令
    $composeArgs += "up", "-d"
    
    Write-Info "执行命令: docker compose $($composeArgs -join ' ')"
    
    # 正确的 PowerShell 命令执行方式
    & docker compose @composeArgs
    
    # 等待服务启动
    Start-Sleep -Seconds 3
    
    # 显示服务状态
    & docker compose -f $ComposeFile ps
}

# 进入开发容器
function Enter-Container {
    param([string]$ComposeFile)
    
    Write-Step "进入开发容器..."
    
    # 获取容器服务名
    $serviceName = if ($ComposeFile -like "*enterprise*") { "frontend-dev" } else { "frontend-dev" }
    
    # 检查容器是否运行
    try {
        $null = & docker compose -f $ComposeFile exec $serviceName echo "Container is running" 2>$null
    }
    catch {
        Write-Error "开发容器未运行，请先启动服务"
        Write-Info "使用命令: .\enterprise-dev.ps1 start"
        exit 1
    }
    
    # 进入容器
    & docker compose -f $ComposeFile exec $serviceName bash
}

# 停止服务
function Stop-Services {
    param([string]$ComposeFile)
    
    Write-Step "停止开发环境..."
    & docker compose -f $ComposeFile down
    Write-Info "开发环境已停止"
}

# 清理数据
function Remove-Data {
    param([string]$ComposeFile)
    
    Write-Warn "这将删除所有开发数据和缓存"
    $confirmation = Read-Host "确认清理所有数据？(y/N)"
    
    if ($confirmation -match '^[Yy]$') {
        Write-Step "清理开发数据..."
        & docker compose -f $ComposeFile down -v
        Write-Info "数据清理完成"
    } else {
        Write-Info "取消清理"
    }
}

# 显示帮助
function Show-Help {
    Write-Host "企业级开发环境管理脚本 (PowerShell 版本)"
    Write-Host ""
    Write-Host "用法: .\enterprise-dev.ps1 [命令] [-ProjectName <项目名称>] [-ImageVersion <镜像版本>] [-Services <服务列表>] [-Enterprise]"
    Write-Host ""
    Write-Host "命令:"
    Write-Host "  start       启动开发环境 (默认)"
    Write-Host "  stop        停止开发环境"
    Write-Host "  restart     重启开发环境"
    Write-Host "  enter       进入开发容器"
    Write-Host "  status      查看服务状态"
    Write-Host "  logs        查看服务日志"
    Write-Host "  cleanup     清理数据和缓存"
    Write-Host "  help        显示帮助信息"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -ProjectName    可选，默认使用当前目录名"
    Write-Host "  -ImageVersion   可选，默认使用 frontend-env:latest"
    Write-Host "  -Services       可选，服务列表: redis,database,mongodb"
    Write-Host "  -Enterprise     使用企业级配置 (默认: true)"
    Write-Host ""
    Write-Host "配置文件:"
    Write-Host "  docker-compose.enterprise.yml  # 企业级配置 (默认)"
    Write-Host "  docker-compose.yml             # 基础配置"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\enterprise-dev.ps1                                    # 启动企业级环境"
    Write-Host "  .\enterprise-dev.ps1 start -ProjectName my-project     # 指定项目名"
    Write-Host "  .\enterprise-dev.ps1 start -Services redis             # 包含 Redis"
    Write-Host "  .\enterprise-dev.ps1 start -Enterprise:`$false          # 使用基础配置"
    Write-Host "  .\enterprise-dev.ps1 enter                             # 进入容器"
    Write-Host "  .\enterprise-dev.ps1 stop                              # 停止服务"
    Write-Host "  .\enterprise-dev.ps1 cleanup                           # 清理数据"
    Write-Host ""
    Write-Host "环境变量:"
    Write-Host "  `$env:DEV_PORT_3000    React/Next.js 端口 (默认: 3000)"
    Write-Host "  `$env:DEV_PORT_8080    Vue CLI 端口 (默认: 8080)"
    Write-Host "  `$env:DEV_PORT_5173    Vite 端口 (默认: 5173)"
    Write-Host "  `$env:DEV_PORT_9000    NestJS 端口 (默认: 9000)"
    Write-Host "  `$env:DB_PASSWORD      数据库密码 (自动生成)"
}

# 主函数
function Invoke-Main {
    param(
        [string]$Command,
        [string]$ProjectName,
        [string]$ImageVersion,
        [string]$Services,
        [switch]$Enterprise
    )
    
    if ($Help -or $Command -eq "help") {
        Show-Help
        return
    }
    
    # 获取配置文件
    $composeFile = Get-ComposeFile -Services $Services -Enterprise:$Enterprise
    
    switch ($Command) {
        "start" {
            Test-Dependencies
            Test-BuildImage -ImageVersion $ImageVersion
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            Show-Configuration -Services $Services
            Start-Services -ComposeFile $composeFile -Services $Services
            Write-Info "开发环境已启动，使用 '.\enterprise-dev.ps1 enter' 进入容器"
        }
        "stop" {
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            Stop-Services -ComposeFile $composeFile
        }
        "restart" {
            Test-Dependencies
            Test-BuildImage -ImageVersion $ImageVersion
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            Stop-Services -ComposeFile $composeFile
            Start-Sleep -Seconds 2
            Start-Services -ComposeFile $composeFile -Services $Services
            Write-Info "开发环境已重启，使用 '.\enterprise-dev.ps1 enter' 进入容器"
        }
        "enter" {
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            Enter-Container -ComposeFile $composeFile
        }
        "status" {
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            & docker compose -f $composeFile ps
        }
        "logs" {
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            & docker compose -f $composeFile logs -f
        }
        "cleanup" {
            Set-Environment -ProjectName $ProjectName -ImageVersion $ImageVersion
            Remove-Data -ComposeFile $composeFile
        }
        default {
            Write-Error "未知命令: $Command"
            Show-Help
            exit 1
        }
    }
}

# 执行主函数
Invoke-Main -Command $Command -ProjectName $ProjectName -ImageVersion $ImageVersion -Services $Services -Enterprise:$Enterprise 