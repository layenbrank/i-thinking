# dev-container.ps1 - Windows PowerShell 企业级开发容器启动脚本
# 支持Git身份管理和SSH密钥挂载

param(
    [string]$ProjectName = "",
    [string]$ImageName = "frontend-env:latest",
    [switch]$Help,
    [switch]$Verify
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

# 检测用户身份
function Get-UserIdentity {
    Write-Step "检测用户身份..."
    
    # 系统用户信息
    $script:SystemUser = $env:USERNAME
    $script:UserHome = $env:USERPROFILE
    
    # Git 身份信息
    try {
        $script:GitAuthorName = & git config user.name 2>$null
        if (-not $script:GitAuthorName) {
            $script:GitAuthorName = & git config --global user.name 2>$null
        }
        if (-not $script:GitAuthorName) {
            $script:GitAuthorName = $script:SystemUser
        }
    }
    catch {
        $script:GitAuthorName = $script:SystemUser
    }
    
    try {
        $script:GitAuthorEmail = & git config user.email 2>$null
        if (-not $script:GitAuthorEmail) {
            $script:GitAuthorEmail = & git config --global user.email 2>$null
        }
        if (-not $script:GitAuthorEmail) {
            $script:GitAuthorEmail = "$script:SystemUser@company.com"
        }
    }
    catch {
        $script:GitAuthorEmail = "$script:SystemUser@company.com"
    }
    
    Write-Info "系统用户: $script:SystemUser"
    Write-Info "Git 身份: $script:GitAuthorName <$script:GitAuthorEmail>"
}

# 检测 SSH 密钥
function Test-SSHKeys {
    Write-Step "检测 SSH 密钥..."
    
    $script:SSHDir = Join-Path $script:UserHome ".ssh"
    
    if (-not (Test-Path $script:SSHDir)) {
        Write-Warn "SSH 目录不存在: $script:SSHDir"
        Write-Info "可以使用以下命令生成SSH密钥:"
        Write-Info "ssh-keygen -t ed25519 -C `"$script:GitAuthorEmail`""
        return $false
    }
    
    # 常见的 SSH 密钥文件
    $SSHKeys = @(
        "id_rsa",
        "id_ed25519", 
        "id_ecdsa",
        "id_rsa_company",
        "id_ed25519_company",
        "id_rsa_github",
        "id_ed25519_github"
    )
    
    $FoundKeys = @()
    
    foreach ($key in $SSHKeys) {
        $keyPath = Join-Path $script:SSHDir $key
        if (Test-Path $keyPath) {
            $FoundKeys += $key
            Write-Info "发现 SSH 密钥: $key"
        }
    }
    
    if ($FoundKeys.Count -eq 0) {
        Write-Warn "未发现常见的 SSH 密钥文件"
        Write-Info "SSH 目录内容:"
        Get-ChildItem $script:SSHDir -ErrorAction SilentlyContinue | Format-Table Name, Length, LastWriteTime
    } else {
        Write-Info "发现 $($FoundKeys.Count) 个 SSH 密钥文件"
    }
    
    return $true
}

# 生成容器名称
function New-ContainerName {
    param([string]$ProjectName)
    
    if (-not $ProjectName) {
        $ProjectName = Split-Path -Leaf (Get-Location)
    }
    
    $script:ContainerName = "dev-$script:SystemUser-$ProjectName"
    $script:ProjectName = $ProjectName
    
    Write-Info "容器名称: $script:ContainerName"
}

# 检查容器是否已存在
function Test-ExistingContainer {
    Write-Step "检查已存在的容器..."
    
    $existingContainer = & docker ps -aq -f "name=^$script:ContainerName$" 2>$null
    
    if ($existingContainer) {
        Write-Warn "容器 '$script:ContainerName' 已存在"
        
        $runningContainer = & docker ps -q -f "name=^$script:ContainerName$" 2>$null
        
        if ($runningContainer) {
            Write-Info "容器正在运行，直接进入..."
            & docker exec -it $script:ContainerName bash
            exit 0
        } else {
            Write-Info "启动已存在的容器..."
            & docker start $script:ContainerName
            & docker exec -it $script:ContainerName bash
            exit 0
        }
    }
}

# 构建 Docker 命令
function New-DockerCommand {
    param([string]$ImageName)
    
    Write-Step "构建 Docker 启动命令..."
    
    $DockerCmd = @(
        "docker", "run", "-it",
        "--name", $script:ContainerName,
        "--hostname", $script:ContainerName
    )
    
    # Windows 环境使用 root 用户
    Write-Info "Windows 环境，使用 root 用户"
    
    # 工作目录挂载 (Windows 路径处理)
    $currentPath = (Get-Location).Path
    $DockerCmd += "-v", "${currentPath}:/root/app"
    $DockerCmd += "-w", "/root/app"
    
    # SSH 配置挂载
    if (Test-Path $script:SSHDir) {
        $DockerCmd += "-v", "${script:SSHDir}:/root/.ssh:ro"
        Write-Info "挂载 SSH 目录: $script:SSHDir"
    }
    
    # Git 配置挂载
    $gitConfigPath = Join-Path $script:UserHome ".gitconfig"
    if (Test-Path $gitConfigPath) {
        $DockerCmd += "-v", "${gitConfigPath}:/root/.gitconfig:ro"
        Write-Info "挂载 Git 配置"
    }
    
    # 缓存目录挂载
    $DockerCmd += "-v", "dev-cache-$script:SystemUser:/root/.cache"
    $DockerCmd += "-v", "dev-pnpm-$script:SystemUser:/root/.pnpm-store"
    
    # 环境变量
    $DockerCmd += "-e", "USER=$script:SystemUser"
    $DockerCmd += "-e", "GIT_AUTHOR_NAME=$script:GitAuthorName"
    $DockerCmd += "-e", "GIT_AUTHOR_EMAIL=$script:GitAuthorEmail"
    $DockerCmd += "-e", "GIT_COMMITTER_NAME=$script:GitAuthorName"
    $DockerCmd += "-e", "GIT_COMMITTER_EMAIL=$script:GitAuthorEmail"
    
    # 端口映射
    $DockerCmd += "-p", "3000:3000", "-p", "8080:8080", "-p", "5173:5173", "-p", "9000:9000"
    
    # 镜像
    $DockerCmd += $ImageName
    
    return $DockerCmd
}

# 验证环境
function Test-Environment {
    Write-Step "验证环境..."
    
    # 检查 Docker
    try {
        $null = & docker --version 2>$null
    }
    catch {
        Write-Error "Docker 未安装或未在 PATH 中"
        Write-Info "请安装 Docker Desktop for Windows"
        exit 1
    }
    
    # 检查 Docker 服务
    try {
        $null = & docker info 2>$null
    }
    catch {
        Write-Error "Docker 服务未运行，请启动 Docker Desktop"
        exit 1
    }
    
    Write-Info "Docker 环境正常"
}

# 显示启动信息
function Show-StartupInfo {
    param([string]$ImageName)
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host " 企业级开发容器启动信息" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  用户: $script:SystemUser"
    Write-Host "  Git: $script:GitAuthorName <$script:GitAuthorEmail>"
    Write-Host "  SSH: 密钥文件"
    Write-Host "  项目: $script:ProjectName"
    Write-Host "  容器: $script:ContainerName"
    Write-Host "  镜像: $ImageName"
    Write-Host "  端口: 3000, 8080, 5173, 9000"
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

# 显示帮助
function Show-Help {
    Write-Host "企业级开发容器启动脚本 (PowerShell 版本)"
    Write-Host ""
    Write-Host "用法: .\dev-container.ps1 [选项] [-ProjectName <项目名称>] [-ImageName <镜像名称>]"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -ProjectName    可选，默认使用当前目录名"
    Write-Host "  -ImageName      可选，默认使用 frontend-env:latest"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Help           显示帮助信息"
    Write-Host "  -Verify         仅验证环境，不启动容器"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\dev-container.ps1                                    # 使用默认设置"
    Write-Host "  .\dev-container.ps1 -ProjectName my-project           # 指定项目名称"
    Write-Host "  .\dev-container.ps1 -ProjectName my-project -ImageName frontend-env:2.0"
    Write-Host ""
    Write-Host "环境要求:"
    Write-Host "  - Docker Desktop for Windows 已安装并运行"
    Write-Host "  - Git 已配置用户名和邮箱 (可选)"
    Write-Host "  - SSH 密钥存在于 %USERPROFILE%\.ssh\ 目录 (可选)"
    Write-Host ""
    Write-Host "功能特性:"
    Write-Host "  ✓ 自动检测 Git 身份"
    Write-Host "  ✓ 安全挂载 SSH 密钥"
    Write-Host "  ✓ 缓存目录持久化"
    Write-Host "  ✓ 多端口映射"
    Write-Host "  ✓ 容器状态检查"
}

# 仅验证环境
function Invoke-VerifyOnly {
    Write-Info "仅验证环境模式"
    Test-Environment
    Get-UserIdentity
    Test-SSHKeys
    Write-Info "环境验证完成"
}

# 主函数
function Invoke-Main {
    if ($Help) {
        Show-Help
        return
    }
    
    if ($Verify) {
        Invoke-VerifyOnly
        return
    }
    
    Write-Info "启动企业级开发容器..."
    
    # 验证环境
    Test-Environment
    
    # 检测身份和密钥
    Get-UserIdentity
    Test-SSHKeys
    
    # 生成容器配置
    New-ContainerName -ProjectName $ProjectName
    
    # 检查已存在的容器
    Test-ExistingContainer
    
    # 构建启动命令
    $DockerCommand = New-DockerCommand -ImageName $ImageName
    
    # 显示启动信息
    Show-StartupInfo -ImageName $ImageName
    
    # 确认启动
    $confirmation = Read-Host "确认启动容器？(y/N)"
    if ($confirmation -notmatch '^[Yy]$') {
        Write-Info "取消启动"
        return
    }
    
    # 执行 Docker 命令
    Write-Info "启动容器..."
    Write-Host "执行命令: $($DockerCommand -join ' ')"
    Write-Host ""
    
    # 启动容器
    & @DockerCommand bash
}

# 执行主函数
Invoke-Main 